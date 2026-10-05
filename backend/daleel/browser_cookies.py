from email.utils import parsedate_to_datetime
from http.cookies import SimpleCookie
from .network import hostname


async def response_cookies(context, headers, url):
    host = hostname(url)
    for line in headers.get_list('set-cookie') if hasattr(headers, 'get_list') else []:
        parsed = SimpleCookie()
        try:
            parsed.load(line)
            for name, morsel in parsed.items():
                domain = morsel['domain'].lstrip('.') or host
                if host != domain and not host.endswith('.' + domain):
                    continue
                cookie = {'name': name, 'value': morsel.value, 'domain': morsel['domain'] or host,
                          'path': morsel['path'] or '/', 'secure': bool(morsel['secure']),
                          'httpOnly': bool(morsel['httponly'])}
                if morsel['expires']:
                    cookie['expires'] = parsedate_to_datetime(morsel['expires']).timestamp()
                if morsel['samesite'].lower() in ('strict', 'lax', 'none'):
                    cookie['sameSite'] = morsel['samesite'].capitalize()
                await context.add_cookies([cookie])
        except (ValueError, TypeError):
            continue
