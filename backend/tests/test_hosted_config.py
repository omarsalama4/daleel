from types import SimpleNamespace
from pathlib import Path
from daleel.config import get_settings
from daleel.storage import Artifacts


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
