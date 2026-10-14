"""Bounded read-only browser tools. Human authentication is a separate service."""
import asyncio
import time
from weakref import WeakKeyDictionary
from contextlib import asynccontextmanager
from typing import Literal
from playwright.async_api import async_playwright, TimeoutError as BrowserTimeout
from pydantic import BaseModel, ConfigDict, Field
from opentelemetry import trace
from .browser_cookies import response_cookies
from .errors import Problem
from .network import canonical, hostname

tracer = trace.get_tracer("daleel.browser")
_browser_slots = WeakKeyDictionary()


class BrowserAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["navigate", "observe", "click", "fill", "select", "scroll", "wait", "extract", "back", "screenshot"]
    url: str | None = Field(None, max_length=2048)
    ref: str | None = Field(None, max_length=32)
    selector: str | None = Field(None, max_length=500)
    text: str | None = Field(None, max_length=1000)
    pixels: int = Field(600, ge=-900, le=900)


OBSERVE = """() => {
 const visible=e=>!!(e.getClientRects().length && getComputedStyle(e).visibility!=='hidden');
 if([...document.querySelectorAll('input[type=password],input[autocomplete=one-time-code],iframe[src*="captcha"],iframe[title*="challenge" i]')].some(visible)) return {barrier:true};
 const text=(document.body?.innerText||'').slice(0,80000);
 if(/verify you are human|complete the captcha|checking your browser|enter (your |the )?(verification|authentication) code/i.test(text.slice(0,3000))) return {barrier:true};
 const elements=[...document.querySelectorAll('a[href],button,input,select,[role=button]')].filter(visible).slice(0,100);
 return {text,elements:elements.map((e,i)=>{
   const ref='e'+i; e.setAttribute('data-daleel-ref',ref);
   return {ref,name:(e.getAttribute('aria-label')||e.labels?.[0]?.innerText||e.innerText||e.getAttribute('placeholder')||'').trim().slice(0,160),
     tag:e.tagName.toLowerCase(),type:e.getAttribute('type')||'',selector:e.id?'#'+CSS.escape(e.id):null,
     href:e.tagName==='A'?e.href:null,disabled:!!e.disabled};
 })};
}"""


class BrowserToolkit:
    def __init__(self, page, context, fetcher, domains, *, max_actions=30, seconds=60,
                 max_bytes=5_000_000, search_selectors=(), click_selectors=(), allow_screenshots=False):
        self.page, self.context, self.fetcher = page, context, fetcher
        self.domains = frozenset(domains)
        self.max_actions, self.deadline = max_actions, time.monotonic() + seconds
        self.max_bytes, self.bytes, self.count = max_bytes, 0, 0
        self.search_selectors = frozenset(search_selectors)
        self.click_selectors = frozenset(click_selectors)
        self.allow_screenshots = allow_screenshots
        self.refs, self.records, self.failures, self.replay_steps = {}, [], [], []
        self.mutex = asyncio.Lock()

    @staticmethod
    def tool_definition():
        return {"name": "browser", "description": "Observe and interact with scoped read-only research pages. Authentication requires a human.",
                "parameters": BrowserAction.model_json_schema()}

    def check(self):
        if time.monotonic() >= self.deadline or self.count >= self.max_actions:
            raise Problem(409, "BROWSER_LIMIT", "Browser action or time allowance reached")

    def scoped(self, url):
        url = canonical(url)
        if hostname(url) not in self.domains:
            raise Problem(403, "REDIRECT_SCOPE", "Browser navigation requires approved site scope")
        return url

    async def intercept(self, route):
        req = route.request
        try:
            if time.monotonic() >= self.deadline:
                raise Problem(409, "BROWSER_LIMIT", "Browser time allowance reached")
            if hostname(req.url) not in self.domains and not req.is_navigation_request():
                return await route.abort()
            url = self.scoped(req.url)
            if req.method not in ("GET", "HEAD"):
                raise Problem(403, "BROWSER_WRITE_BLOCKED", "Browser tools cannot submit state-changing requests")
            if req.resource_type in ("image", "media", "font"):
                return await route.abort()
            if not await self.fetcher.permitted(url):
                raise Problem(403, "ROBOTS_DISALLOWED", "robots.txt prevents browser access")
            headers = {k: v for k, v in req.headers.items() if k.lower() in ("cookie", "accept", "accept-language")}
            status, response_headers, body = await self.fetcher.raw(url, limit=max(1, self.max_bytes-self.bytes), headers=headers, method=req.method)
            self.bytes += len(body)
            if self.bytes > self.max_bytes:
                raise Problem(413, "DOWNLOAD_CAP", "Browser transfer allowance reached")
            if status in (401, 403, 429):
                raise Problem(status, "ACCESS_BARRIER", "Site access requires human attention")
            if status >= 400:
                raise Problem(status, "FETCH_FAILED", "Browser source returned an error", status >= 500)
            await response_cookies(self.context, response_headers, url)
            clean = {k: v for k, v in response_headers.items() if k.lower() not in
                     ("content-encoding", "content-length", "transfer-encoding", "set-cookie")}
            await route.fulfill(status=status, headers=clean, body=body)
        except Problem as exc:
            self.failures.append(exc)
            await route.abort()
        except Exception:
            self.failures.append(Problem(409, "BROWSER_NETWORK", "Browser request failed", True))
            await route.abort()

    async def observe(self):
        self.scoped(self.page.url)
        data = await self.page.evaluate(OBSERVE)
        if data.get("barrier"):
            raise Problem(403, "ACCESS_BARRIER", "Complete sign-in, MFA or CAPTCHA personally in the hosted sign-in browser")
        self.refs = {e["ref"]: e for e in data["elements"]}
        return {"url": self.page.url, "title": await self.page.title(), "text": data["text"],
                "elements": data["elements"], "remainingActions": self.max_actions-self.count}

    async def target(self, action):
        if action.ref:
            if action.ref not in self.refs:
                raise Problem(409, "BROWSER_STALE_REF", "Observe the current page before selecting a target")
            locator = self.page.locator(f'[data-daleel-ref="{action.ref}"]')
            if action.selector and not await locator.evaluate("(e, selector) => e.matches(selector)", action.selector):
                raise Problem(409, "BROWSER_STALE_REF", "Element reference does not match the reviewed selector")
        elif action.selector:
            locator = self.page.locator(action.selector)
        else:
            raise Problem(422, "BROWSER_TARGET", "A current element reference or reviewed selector is required")
        if action.action == "wait":
            await locator.wait_for(state="visible", timeout=5000)
        if await locator.count() != 1 or not await locator.is_visible():
            raise Problem(409, "RECIPE_DRIFT", "Browser target is absent, ambiguous or hidden")
        return locator

    async def execute(self, payload):
        action = BrowserAction.model_validate(payload)
        async with self.mutex:
            self.check()
            self.count += 1
            try:
                with tracer.start_as_current_span("browser.action", record_exception=False, set_status_on_exception=False) as span:
                    span.set_attribute("browser.action", action.action)
                    async with asyncio.timeout(max(0.01, self.deadline-time.monotonic())):
                        result = await self._execute(action)
                if self.failures:
                    raise self.failures[0]
                # Trace metadata excludes input values, cookies and arbitrary page text.
                self.records.append({"action": action.action, "selector": action.selector, "outcome": "succeeded"})
                if action.action in ("click", "wait", "extract", "scroll") and (action.selector or action.action == "scroll"):
                    self.replay_steps.append(action.model_dump(exclude_none=True, exclude={"ref", "text"}))
                return result
            except (BrowserTimeout, TimeoutError):
                raise Problem(409, "BROWSER_TIMEOUT", "Browser action timed out; observe before retrying", True) from None
            except Problem as exc:
                self.records.append({"action": action.action, "outcome": "failed", "code": exc.code})
                raise
            except Exception:
                if self.failures:
                    raise self.failures[0]
                raise Problem(409, "BROWSER_ACTION_FAILED", "Browser action failed; observe before retrying", True) from None

    async def call(self, arguments):
        """Structured tool result for a planner; never returns raw exception text."""
        from pydantic import ValidationError
        try:
            return {"ok": True, "result": await self.execute(arguments)}
        except Problem as exc:
            return {"ok": False, "error": {"code": exc.code, "message": exc.detail, "retryable": exc.retryable}}
        except ValidationError:
            return {"ok": False, "error": {"code": "BROWSER_ARGUMENTS", "message": "Invalid browser tool arguments", "retryable": False}}

    async def validate_control(self, action, target, *, require_approval=True):
        """Shared policy for both proposed and executed controls; proposals grant no authority."""
        if action.action in ("fill", "select"):
            sensitive = await target.evaluate("e => e.matches('input[type=password],input[type=email],input[autocomplete=one-time-code]') || /password|otp|token|verification|authenticat/i.test([e.id,e.name,e.autocomplete,e.getAttribute('aria-label')].join(' ')) || !!e.closest('form[action*=login],form[action*=signin]')")
            if sensitive:
                raise Problem(403, "ACCESS_BARRIER", "Authentication input is human-only")
            if require_approval and action.selector not in self.search_selectors:
                raise Problem(403, "BROWSER_INPUT_APPROVAL", "Search/filter input requires a reviewed selector")
        elif action.action == "click":
            unsafe = await target.evaluate("e => {const f=e.closest('form');const name=e.getAttribute('aria-label')||e.innerText||'';return /delete|purchase|checkout|subscribe|send message|apply now|sign.?in|log.?in|password|verify code/i.test(name) || e.matches('input[type=submit],input[type=file]') || !!(f && (e.type==='submit' || e.tagName==='BUTTON') && (f.method||'get').toLowerCase()!=='get')}")
            if unsafe:
                raise Problem(403, "BROWSER_WRITE_BLOCKED", "This control may change site data")
            safe_link = await target.evaluate("e => e.tagName==='A' && !!e.getAttribute('href')")
            if require_approval and not safe_link and action.selector not in self.click_selectors:
                raise Problem(403, "BROWSER_CLICK_APPROVAL", "This interactive control requires a reviewed selector")

    async def run(self, url, decide):
        """Planner adapter: decide(observation, last_result) returns an action or None.

        Decisions are validated tool calls; None finishes. The caller owns model cost
        admission and private-content consent. Page text is untrusted input.
        """
        observation = await self.execute({"action": "navigate", "url": url})
        last_result = None
        while True:
            self.check()
            try:
                async with asyncio.timeout(max(0.01, self.deadline-time.monotonic())):
                    decision = await decide(observation, last_result)
            except TimeoutError:
                raise Problem(409, "BROWSER_TIMEOUT", "Browser planning time allowance reached") from None
            if decision is None:
                return {**await self.snapshot(), "proposedSteps": list(self.replay_steps)}
            last_result = await self.call(decision)
            if not last_result["ok"] and last_result["error"]["code"] in (
                "ACCESS_BARRIER", "ROBOTS_DISALLOWED", "REDIRECT_SCOPE", "BROWSER_LIMIT", "DOWNLOAD_CAP"):
                error = last_result["error"]
                raise Problem(409, error["code"], error["message"])
            observation = await self.observe()

    async def _execute(self, action):
        if action.action == "screenshot":
            await self.observe()
            if not self.allow_screenshots:
                raise Problem(403, "BROWSER_VISION_CONSENT", "Screenshots require explicit caller consent")
            import base64
            data = await self.page.screenshot(type="jpeg", quality=50)
            if len(data) > 500_000:
                raise Problem(413, "PAGE_BYTE_LIMIT", "Screenshot exceeds the tool output allowance")
            return {"mimeType": "image/jpeg", "base64": base64.b64encode(data).decode()}
        elif action.action == "navigate":
            if not action.url:
                raise Problem(422, "BROWSER_TARGET", "Navigation requires a URL")
            await self.page.goto(self.scoped(action.url), wait_until="domcontentloaded", timeout=15000)
            try:
                await self.page.wait_for_load_state("networkidle", timeout=3000)
            except BrowserTimeout:
                # Streaming pages may never idle; callers can use a bounded wait tool.
                pass
        elif action.action == "back":
            await self.page.go_back(wait_until="domcontentloaded", timeout=15000)
        elif action.action == "scroll":
            await self.observe()
            await self.page.mouse.wheel(0, action.pixels)
        elif action.action != "observe":
            # Barrier inspection occurs before any interaction, including recipe replay.
            previous_refs = dict(self.refs)
            await self.observe()
            if action.ref and previous_refs.get(action.ref) != self.refs.get(action.ref):
                raise Problem(409, "BROWSER_STALE_REF", "Page changed; observe before choosing an action")
            target = await self.target(action)
            await self.validate_control(action, target)
            if action.action in ("fill", "select"):
                if action.action == "fill":
                    await target.fill(action.text or "", timeout=5000)
                else:
                    await target.select_option(action.text or "", timeout=5000)
            elif action.action == "click":
                await target.click(timeout=5000)
            elif action.action == "wait":
                await target.wait_for(state="visible", timeout=5000)
            elif action.action == "extract":
                return {"url": self.page.url, "text": (await target.inner_text(timeout=5000))[:80000]}
        self.refs = {}
        return await self.observe()

    async def snapshot(self):
        observation = await self.observe()
        html = await self.page.content()
        if len(html.encode()) > self.fetcher.settings.max_page_bytes:
            raise Problem(413, "PAGE_BYTE_LIMIT", "Rendered document exceeds page size allowance")
        return {"url": self.page.url, "html": html, "title": await self.page.title(), "rendered": True,
                "visibleText": observation["text"], "bytes": self.bytes, "status": 200, "browserTrace": list(self.records)}


@asynccontextmanager
async def browser_tools(fetcher, domains, *, cookies=None, storage_state=None, admission_seconds=5, **limits):
    # Each API instance has 512 MB: overlapping Chromium launches can exhaust it.
    # Loop-local admission also keeps isolated test event loops independent.
    loop = asyncio.get_running_loop()
    slot = _browser_slots.setdefault(loop, asyncio.Semaphore(1))
    try:
        async with asyncio.timeout(admission_seconds):
            await slot.acquire()
    except TimeoutError:
        raise Problem(503, "BROWSER_CAPACITY", "Browser is busy; retry shortly", True) from None
    try:
        async with _browser_context(fetcher, domains, cookies=cookies, storage_state=storage_state, **limits) as tools:
            yield tools
    finally:
        slot.release()


@asynccontextmanager
async def _browser_context(fetcher, domains, *, cookies=None, storage_state=None, **limits):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            context = await browser.new_context(service_workers="block", accept_downloads=False, storage_state=storage_state)
            if cookies:
                await context.add_cookies(cookies)
            page = await context.new_page()
            page.set_default_timeout(5000)
            tools = BrowserToolkit(page, context, fetcher, domains, **limits)
            await context.route("**/*", tools.intercept)
            await context.route_web_socket("**/*", lambda ws: ws.close())
            context.on("page", lambda p: asyncio.create_task(p.close()) if p != page else None)
            yield tools
        finally:
            await browser.close()
