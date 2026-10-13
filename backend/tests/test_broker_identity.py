import time
from types import SimpleNamespace
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from daleel.broker_auth import BrokerIdentity, authorization
from daleel.config import BrokerSettings


def test_workload_broker_accepts_only_signed_expected_caller_and_audience(monkeypatch):
    caller = "daleel-runtime@daleel-project.iam.gserviceaccount.com"
    settings = BrokerSettings(_env_file=None, session_broker_auth_mode="google_identity",
                              broker_caller_email=caller, broker_public_url="https://broker.example.com")
    identity = BrokerIdentity(settings)
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    monkeypatch.setattr(identity.jwks, "get_signing_key_from_jwt", lambda token: SimpleNamespace(key=key.public_key()))
    claims = {"sub": "123", "iss": "https://accounts.google.com", "aud": settings.broker_public_url,
              "iat": int(time.time()), "exp": int(time.time()) + 120, "email": caller, "email_verified": True}

    def token(**overrides):
        return "Bearer " + jwt.encode({**claims, **overrides}, key, algorithm="RS256")

    assert identity.valid(token())
    assert not identity.valid(token(email="someone@example.com"))
    assert not identity.valid(token(aud="https://other.example.com"))
    assert not identity.valid(token(exp=int(time.time()) - 60))
    assert not identity.valid(token(email_verified=False))
    assert not identity.valid(token(iss="https://other.example.com"))
    assert not identity.valid("Bearer static-secret")
    assert not identity.valid("")
    assert not hasattr(settings, "database_url")


@pytest.mark.asyncio
async def test_api_gets_ephemeral_token_bound_to_broker_audience(monkeypatch):
    import google.oauth2.id_token
    called = []

    def fetch(request, audience):
        called.append(audience)
        return "ephemeral-token"

    monkeypatch.setattr(google.oauth2.id_token, "fetch_id_token", fetch)
    settings = SimpleNamespace(session_broker_auth_mode="google_identity", session_broker_url="https://broker.example.com")
    assert await authorization(settings) == "Bearer ephemeral-token"
    assert called == [settings.session_broker_url]


def test_identity_mode_requires_explicit_service_account():
    with pytest.raises(ValueError):
        BrokerSettings(_env_file=None, session_broker_auth_mode="google_identity", broker_public_url="https://broker.example.com")
