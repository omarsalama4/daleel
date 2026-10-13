import importlib
import sys
import time
import asyncio
from types import SimpleNamespace

from fastapi.testclient import TestClient


def test_viewer_policy_allows_generated_blob_images(monkeypatch):
    monkeypatch.setenv("DALEEL_BROKER_PUBLIC_URL", "https://broker.example.org")
    monkeypatch.setenv("DALEEL_SESSION_BROKER_AUTH_MODE", "token")
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


def test_viewer_status_scroll_and_close_are_scoped_and_do_not_expose_session_state(monkeypatch):
    monkeypatch.setenv("DALEEL_BROKER_PUBLIC_URL", "https://broker.example.org")
    monkeypatch.setenv("DALEEL_SESSION_BROKER_AUTH_MODE", "token")
    token = "synthetic-test-token-" + "x" * 32
    monkeypatch.setenv("DALEEL_SESSION_BROKER_TOKEN", token)
    sys.modules.pop("daleel.broker", None)
    broker = importlib.import_module("daleel.broker")
    actions = []

    async def visible():
        return True

    async def wheel(x, y):
        actions.append((x, y))

    async def close():
        actions.append('closed')

    locator = SimpleNamespace(is_visible=visible)
    locator.first = locator
    page = SimpleNamespace(url='https://research.example/home', locator=lambda s: locator,
                           mouse=SimpleNamespace(wheel=wheel))
    item = {'cap': 'status-viewer', 'expires': time.time() + 60, 'domain': 'research.example',
            'workspace': 'workspace-a', 'site': {'authenticatedSelector': '#signed-in'},
            'page': page, 'control_lock': asyncio.Lock(),
            'browser': SimpleNamespace(close=close), 'fetcher': SimpleNamespace(close=close)}
    monkeypatch.setitem(broker.connections, 'connection-a', item)
    client = TestClient(broker.app)
    status = client.get('/viewer/status-viewer/status')
    assert status.status_code == 200
    assert set(status.json()) == {'domain', 'authenticated', 'remainingSeconds'}
    assert status.json()['authenticated'] is True
    assert client.post('/viewer/status-viewer/control', json={'action': 'scroll', 'y': -600}).status_code == 200
    assert actions == [(0, -600)]
    assert client.post('/viewer/status-viewer/control', json={'action': 'click', 'y': -2}).status_code == 422
    assert client.post('/viewer/status-viewer/close', headers={'Origin': 'https://outside.example'}).status_code == 403
    assert client.post('/connections/connection-a/cancel', json={'workspaceId': 'workspace-b'}, headers={'Authorization': 'Bearer ' + token}).status_code == 410
    assert client.post('/viewer/status-viewer/close').status_code == 200
    assert client.get('/viewer/status-viewer/status').status_code == 410
    assert 'connection-a' not in broker.connections
