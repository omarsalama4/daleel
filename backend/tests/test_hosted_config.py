from types import SimpleNamespace
from pathlib import Path
from daleel.config import get_settings
from daleel.storage import Artifacts
import pytest


def test_hosted_secret_file_can_live_outside_application_directory(tmp_path, monkeypatch):
    config = tmp_path / "secrets" / "runtime.env"
    config.parent.mkdir()
    config.write_text("DALEEL_ENV=test\nDALEEL_AUTH_MODE=jwt\nDALEEL_DATA_REGION=mounted-secret\n")
    monkeypatch.setenv("DALEEL_CONFIG_FILE", str(config))
    monkeypatch.delenv("DALEEL_DATA_REGION", raising=False)
    get_settings.cache_clear()
    try:
        assert get_settings().data_region == "mounted-secret"
    finally:
        get_settings.cache_clear()


def test_s3_artifacts_do_not_require_local_writable_storage(tmp_path, monkeypatch):
    import daleel.storage as storage
    client = object()
    monkeypatch.setattr(storage.boto3, "client", lambda *args, **kwargs: client)

    def forbidden(*args, **kwargs):
        raise AssertionError("S3 storage must not create local artifact directories")

    monkeypatch.setattr(Path, "mkdir", forbidden)
    settings = SimpleNamespace(storage_root=tmp_path / "artifacts", storage_mode="s3",
                               s3_endpoint="https://storage.invalid", s3_region="eu-central-1",
                               s3_access_key="test", s3_secret_key="test")
    assert Artifacts(settings).s3 is client


@pytest.mark.parametrize("setting", ["google_trace_project", "langfuse_public_key", "otlp_endpoint"])
def test_deletion_reports_provider_retention_for_each_trace_exporter(tmp_path, setting):
    from daleel.config import Settings
    from daleel.db import Database, Workspace, put, resource
    from daleel.deletions import Deletions
    settings = Settings(env="test", auth_mode="jwt", database_url=f"sqlite:///{tmp_path / 'db.sqlite'}",
                        storage_root=tmp_path / "artifacts", **{setting: "configured"})
    db = Database(settings)
    db.init()
    with db.session() as session:
        session.add(Workspace(id="test", subject="test", email="test@example.invalid", data={}))
        session.flush()
        run = put(session, "test", "run", {"status": "awaiting_approval"})
        run_id = run.id
    deletions = Deletions(db, Artifacts(settings), None, settings)
    job_id = deletions.request("test", run_id, "run")
    with db.session("test") as session:
        assert resource(session, "test", job_id, "deletion").data["tracePurgeState"] == "provider_limited"
    db.engine.dispose()


@pytest.mark.parametrize("values,primary,secondary", [
    ({}, False, False),
    ({"groq_api_key": "test-key"}, False, False),
    ({"groq_api_key": "test-key", "groq_model": "test-model"}, True, False),
    ({"openrouter_api_key": "test-key", "openrouter_model": "test/model:free"}, False, True),
])
def test_provider_configuration_reports_each_route_without_keys(values, primary, secondary):
    from daleel.config import Settings
    from daleel.services import settings_payload
    settings = Settings(_env_file=None, env="test", auth_mode="jwt", **values)
    result = settings_payload(settings, SimpleNamespace(id="test", data={}))
    assert result["providers"]["primaryConfigured"] is primary
    assert result["providers"]["secondaryConfigured"] is secondary
    assert "test-key" not in str(result)


def test_nonsecret_model_environment_overrides_pinned_file(tmp_path, monkeypatch):
    from daleel.config import Settings
    path = tmp_path / 'runtime.env'
    path.write_text('DALEEL_OPENROUTER_MODEL=previous/model:free\n')
    monkeypatch.setenv('DALEEL_OPENROUTER_MODEL', 'dots-studio/dots-3-note-preview:free')
    settings = Settings(_env_file=path, env='test')
    assert settings.openrouter_model == 'dots-studio/dots-3-note-preview:free'


@pytest.mark.parametrize('model,accepted', [
    ('dots-studio/dots-3-note-preview:free', True),
    ('provider/paid-model', False),
    ('provider/model:free,OTHER_SETTING=value', False),
])
def test_release_preflight_rejects_nonfree_or_injected_model_override(model, accepted):
    import os
    import subprocess
    import sys
    import textwrap
    workflow = Path(__file__).resolve().parents[2] / '.github/workflows/deploy.yml'
    section = workflow.read_text().split('name: Validate deployment configuration before cloud changes', 1)[1]
    script = textwrap.dedent(section.split("python - <<'PY'\n", 1)[1].split('\n          PY', 1)[0])
    result = subprocess.run([sys.executable, '-c', script], capture_output=True, text=True,
        env={**os.environ, 'PROJECT': 'synthetic', 'REGION': 'europe-west1', 'RUNTIME_SECRET_VERSION': '4',
             'MIGRATION_SECRET_VERSION': '1', 'BROKER_SECRET_VERSION': '3', 'AUTH_URL': 'https://auth.invalid',
             'OPENROUTER_FREE_MODEL': model})
    assert (result.returncode == 0) is accepted
