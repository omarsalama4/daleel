import asyncio
import copy
import json
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from daleel.app import make_app
from daleel.config import Settings
from daleel.db import Workspace, Task, Resource, uid, now, resource
from daleel.errors import Problem
from daleel.network import canonical, resolve_public, parse_page
from daleel.agents import Extracted, verify_result

TOKEN = "test-token-only-for-local-testing-12345"


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    settings = Settings(env="test", auth_mode="development", dev_token=TOKEN,
                        database_url=f"sqlite:///{tmp_path / 'test.sqlite'}", storage_root=tmp_path / "artifacts",
                        worker_mode="external", operator_emails="owner@daleel.local")
    result = make_app(settings)
    result.state.database.init()
    return result


@pytest.fixture
def client(app):
    with TestClient(app) as c:
        c.headers["Authorization"] = "Bearer " + TOKEN
        yield c


def new_run(client, **kwargs):
    result = client.post("/api/v1/runs", json={"query": "Find AI Engineer", "mode": "approval",
                "seedUrls": [], "aiUsageCapUsd": 0, **kwargs})
    assert result.status_code == 201, result.text
    return result.json()


def test_auth_and_isolation(client, app):
    assert client.get("/api/v1/me").status_code == 200
    assert client.get("/api/v1/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
    run = new_run(client)
    with app.state.database.session() as db:
        other = Workspace(id=uid(), subject="other", email="other@test.local", data={})
        db.add(other)
        db.flush()
        from daleel.db import put
        hidden = put(db, other.id, "run", {"secret": "private"})
        hidden_id = hidden.id
    assert client.get(f"/api/v1/runs/{hidden_id}").status_code == 404
    assert client.get(f"/api/v1/runs/{run['id']}").status_code == 200


def test_query_specific_plans_and_idempotency(client):
    body = {"query": "Find scholarship programs including eligibility, deadlines and funding", "mode": "approval", "aiUsageCapUsd": 0}
    first = client.post("/api/v1/runs", json=body, headers={"Idempotency-Key": "same-query"})
    second = client.post("/api/v1/runs", json=body, headers={"Idempotency-Key": "same-query"})
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert "eligibility" in {f["key"] for f in first.json()["plan"]["fields"]}
    assert "employer" not in {f["key"] for f in first.json()["plan"]["fields"]}
    assert client.post("/api/v1/runs", json={**body, "query": "different"}, headers={"Idempotency-Key": "same-query"}).status_code == 409


def test_state_transitions_and_validation(client):
    run = new_run(client)
    rid = run["id"]
    assert client.post(f"/api/v1/runs/{rid}/actions", json={"action": "resume"}).status_code == 409
    assert client.post(f"/api/v1/runs/{rid}/approve").status_code == 202
    assert client.post(f"/api/v1/runs/{rid}/actions", json={"action": "pause"}).json()["status"] == "paused"
    assert client.post(f"/api/v1/runs/{rid}/actions", json={"action": "resume"}).json()["status"] == "queued"
    assert client.post(f"/api/v1/runs/{rid}/actions", json={"action": "cancel"}).json()["status"] == "cancelled"
    bad = client.post("/api/v1/runs", json={"query": "x", "limits": {"pages": 501}, "aiUsageCapUsd": .251})
    assert bad.status_code == 422 and bad.json()["code"] == "VALIDATION_ERROR"


def test_public_url_policy(app, monkeypatch):
    assert canonical("https://example.org/a?utm_source=x&q=1#x") == "https://example.org/a?q=1"
    for bad in ("file:///etc/passwd", "http://user:pass@example.org/", "http://example.org:8080/"):
        with pytest.raises(Problem):
            canonical(bad)
    monkeypatch.setattr("socket.getaddrinfo", lambda *a, **k: [(2, 1, 6, "", ("127.0.0.1", 0))])
    with pytest.raises(Problem, match="Private"):
        asyncio.run(resolve_public("https://example.org", app.state.settings))


def test_evidence_rejects_fabricated_values():
    page = parse_page({"html": "<html><title>AI Engineer</title><body>Salary is not disclosed.</body></html>",
                       "url": "https://example.org/job", "title": "AI Engineer", "bytes": 100, "status": 200})
    result = Extracted(fields={"salary": {"value": "$100,000", "excerpt": "Salary is not disclosed."}},
                       relevance="strong", reason="Example")
    finding = verify_result(result, page, [{"key": "salary", "required": True}], {"id": uid(), "relevance": "balanced"})
    assert finding["values"]["salary"]["evidenceState"] == "unknown"
    assert finding["evidence"] == [] and finding["status"] == "incomplete"


def test_budget_admission_is_atomic(client, app):
    run = new_run(client, aiUsageCapUsd=.25)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    def reserve():
        try:
            return app.state.budget.reserve(wid, run["id"], "test", .20, "test")
        except Problem:
            return None
    with ThreadPoolExecutor(2) as pool:
        ids = list(pool.map(lambda _: reserve(), range(2)))
    assert sum(x is not None for x in ids) == 1
    app.state.budget.settle(wid, next(x for x in ids if x), None)
    assert client.get("/api/v1/usage").json()["aiReservedUsd"] == .20


def test_research_end_to_end_and_export(client, app, monkeypatch):
    async def public(*args):
        return ["93.184.216.34"]
    monkeypatch.setattr("daleel.services.resolve_public" if hasattr(__import__('daleel.services', fromlist=['x']), 'resolve_public') else "daleel.network.resolve_public", public)
    html = {"https://example.org/": "<title>AI Engineer opportunities</title><h1>AI Engineer opportunities</h1><a href='/job'>AI Engineer role details</a>",
            "https://example.org/job": "<title>AI Engineer</title><h1>AI Engineer</h1><p>Build AI models and deploy engineering systems.</p>"}
    async def fetch(self, url, *args, **kwargs):
        return {"url": url, "html": html[url], "bytes": len(html[url]), "status": 200,
                "title": "AI Engineer" if url.endswith('/job') else "AI Engineer opportunities"}
    monkeypatch.setattr("daleel.engine.Fetcher.fetch", fetch)
    run = new_run(client, seedUrls=["https://example.org/"], limits={"pages": 5, "depth": 1})
    rid = run["id"]
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    client.post(f"/api/v1/runs/{rid}/approve")
    asyncio.run(app.state.runtime.execute(wid, rid))
    done = client.get(f"/api/v1/runs/{rid}").json()
    assert done["status"] == "complete", done
    result = client.get(f"/api/v1/runs/{rid}/findings").json()
    assert len(result["items"]) == 2
    assert any(f["sourceUrl"].endswith("/job") and f["evidenceCount"] >= 2 for f in result["items"])
    recipes = client.get("/api/v1/recipes").json()["items"]
    assert recipes and recipes[0]["status"] == "draft"
    export = client.post(f"/api/v1/runs/{rid}/exports", json={"format": "json", "scope": "all"}).json()
    assert export["state"] == "complete"
    assert client.get(export["downloadUrl"]).status_code == 200
    assert client.get(export["downloadUrl"].split("?")[0] + "?token=invalid").status_code == 404
    wf = client.post("/api/v1/workflows", json={"runId": rid, "name": "AI Engineer search"}).json()
    assert wf["currentVersion"] == 1
    assert client.post(f"/api/v1/runs/{rid}/deletion").status_code == 202
    assert client.get(f"/api/v1/runs/{rid}").status_code == 404


def test_session_unavailable_fails_closed(client):
    response = client.post("/api/v1/sessions", json={"domain": "example.org"})
    assert response.status_code == 503
    assert response.json()["code"] == "SESSION_SERVICE_UNAVAILABLE"
