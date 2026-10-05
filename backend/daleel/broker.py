"""Optional human-operated remote browser. Run separately from the product API.

Signed-in conditions and login domains are operator configuration, never model output.
The user controls clicks and typing; the broker does not automate authentication.
"""
import asyncio
import hmac
import secrets
import time
from contextlib import asynccontextmanager
from urllib.parse import urlsplit
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from playwright.async_api import async_playwright
from .config import BrokerSettings
from .network import Fetcher, canonical, hostname, resolve_public
from .browser_cookies import response_cookies

settings = BrokerSettings()
connections = {}
lock = asyncio.Lock()


async def dispose(item):
    await item['browser'].close()
    await item['fetcher'].close()


@asynccontextmanager
async def lifespan(app):
    if len(settings.session_broker_token) < 32:
        raise RuntimeError('Browser broker requires a service token of at least 32 characters')
    async with async_playwright() as playwright:
        app.state.playwright = playwright
        async def reap():
            while True:
                await asyncio.sleep(15)
                for key, item in list(connections.items()):
                    if item['expires'] < time.time():
                        connections.pop(key, None)
                        await dispose(item)
        reaper = asyncio.create_task(reap())
        yield
        reaper.cancel()
        await asyncio.gather(reaper, return_exceptions=True)
        for item in list(connections.values()):
            await dispose(item)


app = FastAPI(title='Daleel human browser broker', lifespan=lifespan, docs_url=None, openapi_url=None)


def service(request):
    expected = 'Bearer ' + settings.session_broker_token
    if not hmac.compare_digest(request.headers.get('authorization', ''), expected):
        raise HTTPException(401, 'Broker service authentication required')


def viewer(capability):
    item = next((i for i in connections.values() if hmac.compare_digest(i['cap'], capability)), None)
    if not item or item['expires'] < time.time():
        raise HTTPException(410, 'Connection expired')
    return item


class Connection(BaseModel):
    id: str = Field(max_length=36)
    workspaceId: str = Field(max_length=36)
    url: str = Field(max_length=4096)


class Finish(BaseModel):
    workspaceId: str


class Control(BaseModel):
    action: str = Field(pattern='^(click|type|key|scroll)$')
    x: float = Field(0, ge=0, le=1280)
    y: float = Field(0, ge=0, le=900)
    text: str = Field('', max_length=4096)


@app.middleware('http')
async def headers(request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Content-Security-Policy'] = "default-src 'self'; img-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'"
    return response


@app.post('/connections')
async def create(body: Connection, request: Request):
    service(request)
    url = canonical(body.url)
    site = settings.broker_sites.get(hostname(url))
    if not site or not site.get('authenticatedSelector'):
        raise HTTPException(409, 'This domain needs an operator-configured signed-in condition')
    domains = [hostname(url)] + site.get('allowedHosts', [])
    login_url = canonical(site.get('loginUrl', url))
    if hostname(login_url) not in domains:
        raise HTTPException(409, 'Login URL is outside configured scope')
    await resolve_public(login_url, settings)
    async with lock:
        if len(connections) >= settings.broker_max_connections or body.id in connections:
            raise HTTPException(409, 'Browser capacity reached or connection already exists')
        browser = await app.state.playwright.chromium.launch(headless=True)
        fetcher = Fetcher(settings)
        transferred = 0
        def consume(size):
            nonlocal transferred
            transferred += size
            if transferred > 50_000_000:
                raise HTTPException(413, 'Connection transfer allowance reached')
        fetcher.consume = consume
        try:
            context = await browser.new_context(viewport={'width': 1280, 'height': 900},
                                                service_workers='block', accept_downloads=False)
            async def route_handler(route):
                req = route.request
                try:
                    target = canonical(req.url)
                    if hostname(target) not in domains or req.method not in ('GET', 'HEAD', 'POST'):
                        return await route.abort()
                    # POST is available only in this user-controlled login browser.
                    # No model or crawler can access its control capability.
                    request_headers = {k: v for k, v in req.headers.items()
                        if k.lower() in ('cookie', 'accept', 'content-type', 'origin', 'referer', 'authorization')}
                    status, response_headers, content = await fetcher.raw(target, headers=request_headers,
                        method=req.method, content=req.post_data_buffer)
                    await response_cookies(context, response_headers, target)
                    clean = {k: v for k, v in response_headers.items()
                             if k.lower() not in ('content-length', 'content-encoding', 'transfer-encoding', 'set-cookie')}
                    await route.fulfill(status=status, headers=clean, body=content)
                except Exception:
                    await route.abort()
            await context.route('**/*', route_handler)
            await context.route_web_socket('**/*', lambda ws: ws.close())
            page = await context.new_page()
            # Popup-based OAuth needs a purpose-built adapter. Block unreviewed extra pages.
            context.on('page', lambda p: asyncio.create_task(p.close()) if p != page else None)
            await page.goto(login_url, wait_until='domcontentloaded', timeout=25000)
            cap = secrets.token_urlsafe(40)
            connections[body.id] = {'workspace': body.workspaceId, 'domain': hostname(url), 'site': site,
                'browser': browser, 'context': context, 'page': page, 'fetcher': fetcher,
                'cap': cap, 'expires': time.time() + 1800, 'control_lock': asyncio.Lock()}
            return {'browserUrl': settings.broker_public_url.rstrip('/') + '/viewer/' + cap}
        except Exception:
            await browser.close()
            await fetcher.close()
            raise HTTPException(409, 'Could not open the configured login page') from None


@app.post('/connections/{connection_id}/finish')
async def finish(connection_id: str, body: Finish, request: Request):
    service(request)
    item = connections.get(connection_id)
    if not item or item['workspace'] != body.workspaceId or item['expires'] < time.time():
        raise HTTPException(410, 'Connection unavailable')
    async with item['control_lock']:
        page = item['page']
        if hostname(page.url) != item['domain']:
            raise HTTPException(409, 'Return to the authorized target site after login')
        # The condition is defined by a reviewed site adapter. Cookie presence is never proof.
        if not await page.locator(item['site']['authenticatedSelector']).first.is_visible():
            raise HTTPException(409, 'The site has not confirmed an authenticated session')
        state = await item['context'].storage_state()
        state['cookies'] = [c for c in state['cookies'] if item['domain'] == c['domain'].lstrip('.')
                             or item['domain'].endswith('.' + c['domain'].lstrip('.'))]
        state['origins'] = [o for o in state.get('origins', []) if urlsplit(o['origin']).hostname == item['domain']]
        connections.pop(connection_id, None)
        await dispose(item)
        return {'authenticated': True, 'storageState': state}


@app.get('/viewer/{capability}', response_class=HTMLResponse)
async def view(capability: str):
    viewer(capability)
    return '''<!doctype html><html><meta name="viewport" content="width=device-width"><title>Daleel authorized sign-in</title>
    <style>body{font:16px system-ui;background:#f7f7f7;margin:20px}img{max-width:100%;border:1px solid #ddd}button,input{padding:10px;margin:5px}p{max-width:75ch}</style>
    <h1>Authorized site sign-in</h1><p>Click the remote page, then type into its focused field using the control below. Complete MFA personally. Return to Daleel and choose Finish connection.</p>
    <img id="screen" alt="Isolated browser viewport" width="1280" height="900">
    <form id="typing"><input id="text" type="password" autocomplete="off" placeholder="Type into the focused remote field"><button>Send text</button></form>
    <button onclick="control({action:'key',text:'Tab'})">Tab</button><button onclick="control({action:'key',text:'Enter'})">Enter</button>
    <button onclick="control({action:'key',text:'Backspace'})">Backspace</button>
    <button onclick="control({action:'scroll',y:600})">Scroll down</button><p id="status"></p>
    <script>
    const base=location.pathname;let current;
    async function refresh(){try{const r=await fetch(base+'/screen');if(!r.ok)throw Error('Connection unavailable');const b=await r.blob();const next=URL.createObjectURL(b);document.getElementById('screen').src=next;if(current)URL.revokeObjectURL(current);current=next;}catch(e){document.getElementById('status').textContent=e.message;}}
    async function control(body){const r=await fetch(base+'/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)document.getElementById('status').textContent='Control unavailable';await refresh();}
    document.getElementById('screen').onclick=e=>{const r=e.target.getBoundingClientRect();control({action:'click',x:(e.clientX-r.left)*1280/r.width,y:(e.clientY-r.top)*900/r.height});};
    document.getElementById('typing').onsubmit=e=>{e.preventDefault();const el=document.getElementById('text');const text=el.value;el.value='';control({action:'type',text});};
    refresh();setInterval(refresh,1500);
    </script></html>'''


@app.get('/viewer/{capability}/screen')
async def screenshot(capability: str):
    item = viewer(capability)
    async with item['control_lock']:
        return Response(await item['page'].screenshot(type='jpeg', quality=75), media_type='image/jpeg')


@app.post('/viewer/{capability}/control')
async def control(capability: str, body: Control, request: Request):
    item = viewer(capability)
    # Viewer capabilities stay in one origin. Reject cross-site requests and don't allow CORS.
    origin = request.headers.get('origin')
    if origin and origin.rstrip('/') != settings.broker_public_url.rstrip('/'):
        raise HTTPException(403, 'Viewer origin mismatch')
    async with item['control_lock']:
        page = item['page']
        if body.action == 'click':
            await page.mouse.click(body.x, body.y)
        elif body.action == 'type':
            await page.keyboard.insert_text(body.text)
        elif body.action == 'scroll':
            await page.mouse.wheel(0, body.y)
        elif body.text in ('Tab', 'Enter', 'Backspace', 'Escape', 'ArrowDown', 'ArrowUp'):
            await page.keyboard.press(body.text)
        else:
            raise HTTPException(422, 'Unsupported key')
    return {'ok': True}
