from pathlib import Path
from functools import lru_cache
from typing import Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DALEEL_", env_file=".env", extra="ignore")
    env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./data/daleel.db"
    auth_mode: Literal["development", "jwt"] = "jwt"
    dev_token: str = ""
    dev_email: str = "owner@daleel.local"
    operator_emails: str = ""
    jwks_url: str = ""
    jwt_issuer: str = ""
    jwt_audience: str = ""
    frontend_url: str = "http://localhost:5173"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    worker_mode: Literal["inline", "external", "cloud_run"] = "inline"
    cloud_run_job: str = ""
    groq_api_key: str = ""
    groq_model: str = ""
    openrouter_api_key: str = ""
    openrouter_model: str = ""
    tavily_api_key: str = ""
    ai_input_usd_per_million: float = 1.0
    ai_output_usd_per_million: float = 3.0
    browser_enabled: bool = False
    session_broker_url: str = ""
    session_broker_token: str = ""
    session_encryption_key: str = ""
    broker_sites: dict[str, dict] = {}
    broker_public_url: str = "http://127.0.0.1:8001"
    broker_max_connections: int = 2
    storage_mode: Literal["local", "s3"] = "local"
    storage_root: Path = Path("data/artifacts")
    s3_endpoint: str = ""
    s3_bucket: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    otlp_endpoint: str = ""
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_endpoint: str = "https://cloud.langfuse.com"
    resend_api_key: str = ""
    email_from: str = ""
    data_region: str = "local-development"
    host_delay_seconds: float = 1.0
    max_page_bytes: int = 2_000_000
    lease_seconds: int = 180
    worker_concurrency: int = 2
    allow_test_hosts: list[str] = []

    @model_validator(mode="after")
    def production_boundary(self):
        if self.env == "production":
            if self.auth_mode != "jwt" or not all([self.jwks_url, self.jwt_issuer, self.jwt_audience]):
                raise ValueError("Production requires verified JWT authentication, issuer, audience, and JWKS")
            if not self.database_url.startswith("postgresql"):
                raise ValueError("Production requires PostgreSQL")
            if self.allow_test_hosts or self.worker_mode == "inline":
                raise ValueError("Test network exceptions and inline workers are not allowed in production")
            if self.storage_mode != "s3":
                raise ValueError("Production requires durable object storage")
            if not self.jwks_url.startswith("https://") or not self.frontend_url.startswith("https://"):
                raise ValueError("Production authentication and frontend endpoints require HTTPS")
            if not self.s3_bucket:
                raise ValueError("Production requires an object storage bucket")
            if self.worker_mode == "cloud_run" and not self.cloud_run_job:
                raise ValueError("Cloud Run worker job must be configured")
            if self.session_broker_url and (not self.session_broker_url.startswith("https://") or not self.session_broker_token or not self.session_encryption_key):
                raise ValueError("Hosted sign-in requires HTTPS, broker authentication, and an encryption key")
        if self.auth_mode == "development" and len(self.dev_token) < 24:
            raise ValueError("Development auth requires a local token of at least 24 characters")
        if self.openrouter_model and not self.openrouter_model.endswith(":free"):
            raise ValueError("The beta OpenRouter route must use an explicit :free model")
        if self.ai_input_usd_per_million < 0 or self.ai_output_usd_per_million < 0:
            raise ValueError("Model price ceilings must be nonnegative")
        return self


@lru_cache
def get_settings():
    return Settings()
