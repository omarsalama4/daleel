"""Audience-bound workload identity for API-to-browser-broker calls."""
import asyncio
import hmac
import jwt
from .errors import Problem


async def authorization(settings):
    if settings.session_broker_auth_mode == "token":
        return "Bearer " + settings.session_broker_token
    from google.auth.transport.requests import Request
    from google.oauth2.id_token import fetch_id_token
    try:
        token = await asyncio.wait_for(asyncio.to_thread(fetch_id_token, Request(), settings.session_broker_url), 10)
    except Exception:
        raise Problem(503, "SESSION_SERVICE_UNAVAILABLE", "Broker workload identity is unavailable", True) from None
    return "Bearer " + token


class BrokerIdentity:
    def __init__(self, settings):
        self.settings = settings
        self.jwks = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True)

    def valid(self, header):
        s = self.settings
        if s.session_broker_auth_mode == "token":
            return hmac.compare_digest(header, "Bearer " + s.session_broker_token)
        if not header.startswith("Bearer ") or len(header) > 16384:
            return False
        token = header[7:]
        try:
            key = self.jwks.get_signing_key_from_jwt(token).key
            claims = jwt.decode(token, key, algorithms=["RS256"], audience=s.broker_public_url,
                                issuer="https://accounts.google.com", options={"require": ["exp", "iat", "sub", "aud", "iss"]})
            return claims.get("email_verified") is True and claims.get("email") == s.broker_caller_email
        except Exception:
            return False
