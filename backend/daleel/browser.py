"""Optional JavaScript rendering through the same DNS-pinned, scoped HTTP transport."""
from playwright.async_api import async_playwright
from .network import canonical, hostname
from .errors import Problem
from .browser_cookies import response_cookies


async def render_page(fetcher, initial, domains, cookies=None, storage_state=None):
    failure = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        try:
            context = await browser.new_context(service_workers="block", accept_downloads=False,
                                                storage_state=storage_state)
            if cookies:
                await context.add_cookies(cookies)
            async def handle(route):
                request = route.request
                try:
                    url = canonical(request.url)
                    if request.method not in ("GET", "HEAD") or hostname(url) not in domains:
                        return await route.abort()
                    if request.resource_type in ("image", "media", "font"):
                        return await route.abort()
                    if not await fetcher.permitted(url):
                        return await route.abort()
                    # Interception prevents Chromium from performing independent DNS resolution.
                    headers = {k: v for k, v in request.headers.items()
                               if k.lower() in ("cookie", "accept", "accept-language")}
                    status, response_headers, body = await fetcher.raw(url, headers=headers)
                    await response_cookies(context, response_headers, url)
                    clean = {k: v for k, v in response_headers.items()
                             if k.lower() not in ("content-encoding", "content-length", "transfer-encoding", "set-cookie")}
                    await route.fulfill(status=status, headers=clean, body=body)
                except Problem as exc:
                    failure.append(exc)
                    await route.abort()
                except Exception:
                    await route.abort()
            await context.route("**/*", handle)
            await context.route_web_socket("**/*", lambda ws: ws.close())
            page = await context.new_page()
            try:
                await page.goto(initial["url"], wait_until="domcontentloaded", timeout=25000)
                await page.wait_for_timeout(1500)
                html = await page.content()
                if len(html.encode()) > fetcher.settings.max_page_bytes:
                    raise Problem(413, "PAGE_BYTE_LIMIT", "Rendered document exceeds page size allowance")
                if failure:
                    raise failure[0]
                return {**initial, "html": html, "title": await page.title(), "rendered": True}
            except Problem:
                raise
            except Exception:
                if failure:
                    raise failure[0]
                raise Problem(409, "RENDER_FAILED", "JavaScript rendering could not complete", True) from None
        finally:
            await browser.close()
