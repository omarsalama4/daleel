"""Public URL validation and DNS-pinned requests; all redirects are revalidated."""
import asyncio
import ipaddress
import socket
import time
from urllib.parse import urlsplit, urlunsplit, urljoin, parse_qsl, urlencode
from urllib.robotparser import RobotFileParser
import httpx
from bs4 import BeautifulSoup
from .errors import Problem

USER_AGENT = "DaleelResearchBot/0.1 (+read-only; respects robots.txt)"


def canonical(url):
    p = urlsplit(url)
    if p.scheme not in ("http", "https") or not p.hostname or p.username or p.password:
        raise Problem(422, "UNSAFE_URL", "Only public HTTP/HTTPS URLs without credentials are allowed")
    if p.port not in (None, 443 if p.scheme == "https" else 80):
        raise Problem(422, "UNSAFE_URL", "Only standard web ports are allowed")
    host = p.hostname.encode("idna").decode().lower()
    if ":" in host:
        host = f"[{host}]"
    query = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True)
             if not k.lower().startswith("utm_") and k.lower() not in {"fbclid", "gclid"}]
    return urlunsplit((p.scheme, host, p.path or "/", urlencode(query), ""))


def hostname(url):
    return urlsplit(url).hostname


async def resolve_public(url, settings):
    url = canonical(url)
    host = hostname(url)
    try:
        rows = await asyncio.to_thread(socket.getaddrinfo, host, None, type=socket.SOCK_STREAM)
        addresses = sorted({r[4][0] for r in rows})
    except socket.gaierror:
        raise Problem(422, "DNS_FAILURE", "The hostname could not be resolved", True) from None
    allowed_test = settings.env == "test" and host in settings.allow_test_hosts
    if not addresses or (not allowed_test and any(not ipaddress.ip_address(a).is_global for a in addresses)):
        raise Problem(422, "SSRF_BLOCKED", "Private, local, reserved, and metadata addresses are blocked")
    return addresses


class Fetcher:
    def __init__(self, settings):
        self.settings = settings
        self.client = httpx.AsyncClient(timeout=httpx.Timeout(25, connect=10), trust_env=False,
                                        follow_redirects=False, headers={"User-Agent": USER_AGENT})
        self.robots = {}
        self.locks = {}
        self.last_request = {}
        self.consume = None

    async def close(self):
        await self.client.aclose()

    async def raw(self, url, limit=None, headers=None, method="GET", content=None):
        original = httpx.URL(canonical(url))
        addresses = await resolve_public(str(original), self.settings)
        pinned = original.copy_with(host=addresses[0])
        request_headers = {"Host": original.host, **(headers or {}), "Accept-Encoding": "identity"}
        async with self.client.stream(method, pinned, headers=request_headers, content=content,
                                      extensions={"sni_hostname": original.host.encode()}) as response:
            # Avoid unbounded decoder allocation before the page cap is checked.
            if response.headers.get("content-encoding", "identity").lower() not in ("", "identity"):
                raise Problem(415, "UNSUPPORTED_CONTENT", "Source ignored the bounded identity encoding request")
            body = bytearray()
            max_bytes = limit or self.settings.max_page_bytes
            async for chunk in response.aiter_bytes():
                if self.consume:
                    self.consume(len(chunk))
                body.extend(chunk)
                if len(body) > max_bytes:
                    raise Problem(413, "PAGE_BYTE_LIMIT", "Page exceeded the allowed download size")
            return response.status_code, response.headers, bytes(body)

    async def permitted(self, url):
        origin = f"{urlsplit(url).scheme}://{hostname(url)}"
        if origin not in self.robots:
            parser = RobotFileParser()
            try:
                status, _, body = await self.raw(origin + "/robots.txt", 256_000)
                if status in (401, 403, 429) or status >= 500 or 300 <= status < 400:
                    return False
                parser.parse(body.decode("utf-8", "replace").splitlines() if status == 200 else [])
            except Problem as exc:
                if exc.code == "DOWNLOAD_CAP":
                    raise
                return False
            except httpx.HTTPError:
                return False
            self.robots[origin] = parser
        return self.robots[origin].can_fetch(USER_AGENT, url)

    async def fetch(self, url, allowed_domains, cookies=None, remaining_bytes=None):
        url = canonical(url)
        total_bytes = 0
        for _ in range(6):
            host = hostname(url)
            if host not in allowed_domains:
                raise Problem(403, "REDIRECT_SCOPE", "Redirect target requires scope approval")
            if not await self.permitted(url):
                raise Problem(403, "ROBOTS_DISALLOWED", "robots.txt or host availability prevents crawling")
            lock = self.locks.setdefault(host, asyncio.Lock())
            async with lock:
                await asyncio.sleep(max(0, self.settings.host_delay_seconds -
                                        (time.monotonic() - self.last_request.get(host, 0))))
                extra = {}
                if cookies:
                    pairs = []
                    for c in cookies:
                        domain = c.get("domain", "").lstrip(".")
                        if (host == domain or host.endswith("." + domain)) and urlsplit(url).path.startswith(c.get("path", "/")):
                            if not c.get("secure") or url.startswith("https:"):
                                if c.get("expires", -1) in (-1, 0) or c.get("expires", 0) > time.time():
                                    pairs.append(f"{c['name']}={c['value']}")
                    if pairs:
                        extra["Cookie"] = "; ".join(pairs)
                limit = min(self.settings.max_page_bytes, max(1, remaining_bytes - total_bytes) if remaining_bytes is not None else self.settings.max_page_bytes)
                status, headers, body = await self.raw(url, limit, extra)
                self.last_request[host] = time.monotonic()
                total_bytes += len(body)
            if 300 <= status < 400:
                url = canonical(urljoin(url, headers.get("location", "")))
                await resolve_public(url, self.settings)
                continue
            if status == 429:
                raise Problem(429, "RATE_LIMIT", "Host rate limit reached", True)
            if status in (401, 403):
                raise Problem(status, "ACCESS_BARRIER", "Site requires access or blocks automated requests")
            if status >= 400:
                raise Problem(status, "FETCH_FAILED", f"Page returned HTTP {status}", status >= 500)
            content_type = headers.get("content-type", "")
            if "text/html" not in content_type and "text/plain" not in content_type:
                raise Problem(415, "UNSUPPORTED_CONTENT", "This release extracts HTML and plain text pages")
            encoding = httpx.Response(200, headers=headers, content=body).encoding or "utf-8"
            html = str(BeautifulSoup(body, "html.parser", from_encoding=encoding))
            soup = BeautifulSoup(html, "html.parser")
            title = soup.title.get_text(" ", strip=True) if soup.title else ""
            # Detect visible challenge pages rather than keywords inside ordinary articles.
            visible = soup.get_text(" ", strip=True)
            challenge = (title + " " + visible[:1800]).lower()
            if any(x in challenge for x in ("verify you are human", "checking your browser", "just a moment...",
                                            "complete the captcha", "unusual traffic")):
                raise Problem(403, "BOT_BARRIER", "A CAPTCHA or bot detector requires human attention")
            return {"url": url, "html": html, "bytes": total_bytes, "status": status, "title": title}
        raise Problem(422, "REDIRECT_LIMIT", "Too many redirects")


def parse_page(page):
    soup = BeautifulSoup(page["html"], "html.parser")
    structured = []
    import json
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            obj = json.loads(script.string or script.get_text())
            structured.extend(obj if isinstance(obj, list) else [obj])
        except (ValueError, TypeError):
            pass
    links = []
    for a in soup.find_all("a", href=True):
        try:
            target = canonical(urljoin(page["url"], a["href"]))
            links.append({"url": target, "text": a.get_text(" ", strip=True)[:300]})
        except (Problem, ValueError):
            continue
    for el in soup(["script", "style", "noscript", "nav", "footer"]):
        el.decompose()
    content = soup.get_text(" ", strip=True)
    lang = (soup.html.get("lang", "") if soup.html else "")
    direction = (soup.html.get("dir") if soup.html else None) or (
        "rtl" if any("\u0590" <= c <= "\u08ff" for c in content[:1000]) else "ltr")
    return {**page, "text": content[:80_000], "structured": structured,
            "links": list({x["url"]: x for x in links}.values()), "language": lang or None, "direction": direction}
