import hashlib
import hmac
from dataclasses import dataclass
import jwt
from sqlalchemy import select
from fastapi import Request
from .db import Workspace, now, uid
from .errors import Problem


@dataclass
class Actor:
    subject: str
    email: str
    workspace_id: str | None
    operator: bool


class Auth:
    def __init__(self, settings, database):
        self.settings, self.database = settings, database
        self.jwks = jwt.PyJWKClient(settings.jwks_url, cache_keys=True) if settings.jwks_url else None

    def verify(self, token):
        s = self.settings
        if s.auth_mode == "development":
            if not token or not hmac.compare_digest(token, s.dev_token):
                raise Problem(401, "UNAUTHENTICATED", "A valid development bearer token is required")
            email = s.dev_email.lower()
            subject = "dev:" + hashlib.sha256(email.encode()).hexdigest()
        else:
            try:
                if not self.jwks:
                    raise ValueError("JWKS not configured")
                key = self.jwks.get_signing_key_from_jwt(token).key
                claims = jwt.decode(token, key, algorithms=["RS256", "ES256", "EdDSA"],
                                    audience=s.jwt_audience, issuer=s.jwt_issuer,
                                    options={"require": ["exp", "sub", "iss", "aud"]})
                if claims.get("email_verified") is not True and claims.get("emailVerified") is not True:
                    raise ValueError("Verified email required")
                subject, email = claims["sub"], claims["email"].lower()
            except (jwt.PyJWTError, ValueError, KeyError):
                raise Problem(401, "UNAUTHENTICATED", "Sign in with a verified invited account") from None
        with self.database.session() as db:
            workspace = db.scalar(select(Workspace).where(Workspace.subject == subject))
            if not workspace and s.auth_mode == "development":
                workspace = Workspace(id=uid(), subject=subject, email=email,
                                      data={"createdAt": now(), "authenticatedContentAllowed": False,
                                            "monthlyAiUsd": 5.0})
                db.add(workspace)
                db.flush()
            operator = email in {x.strip().lower() for x in s.operator_emails.split(",") if x.strip()}
            return Actor(subject, email, workspace.id if workspace else None, operator)


def identity(request: Request):
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer "):
        raise Problem(401, "UNAUTHENTICATED", "Sign in to Daleel")
    return request.app.state.auth.verify(header[7:])


def actor(request: Request):
    result = identity(request)
    if not result.workspace_id:
        raise Problem(403, "INVITATION_REQUIRED", "Claim your invitation to create a workspace")
    return result


def operator(request: Request):
    result = actor(request)
    if not result.operator:
        raise Problem(403, "OPERATOR_REQUIRED", "Platform operator access is required")
    return result
