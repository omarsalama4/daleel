import importlib
import sys
import time

from fastapi.testclient import TestClient


def test_viewer_policy_allows_generated_blob_images(monkeypatch):
    monkeypatch.setenv("DALEEL_SESSION_BROKER_TOKEN", "synthetic-test-token-" + "x" * 32)
    monkeypatch.delenv("DALEEL_CONFIG_FILE", raising=False)
    sys.modules.pop("daleel.broker", None)
    broker = importlib.import_module("daleel.broker")
    monkeypatch.setitem(broker.connections, "synthetic", {
        "cap": "synthetic-viewer", "expires": time.time() + 60})
    # No lifespan/browser launch is needed to inspect the viewer response.
    response = TestClient(broker.app).get("/viewer/synthetic-viewer")
    assert response.status_code == 200
    assert "img-src 'self' blob:" in response.headers["Content-Security-Policy"]
    assert "URL.createObjectURL" in response.text
    assert "Browser image could not load" in response.text
    assert response.headers["Cache-Control"] == "no-store"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]
