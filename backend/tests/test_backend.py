import asyncio
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from daleel.app import make_app
from daleel.config import Settings
from daleel.db import Workspace, uid, resource
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
    with app.state.database.session(wid) as db:
        stored = resource(db, wid, run["id"], "run", lock=True)
        stored.data = {**stored.data, "status": "planning"}
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


@pytest.mark.parametrize("amount", [-1, float("inf"), float("nan")])
def test_budget_rejects_invalid_cost(client, app, amount):
    run = new_run(client, aiUsageCapUsd=.25)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with pytest.raises(ValueError):
        app.state.budget.reserve(wid, run["id"], "test", amount, "test")
    with app.state.database.session(wid) as db:
        stored = resource(db, wid, run["id"], "run", lock=True)
        stored.data = {**stored.data, "status": "planning"}
    reservation = app.state.budget.reserve(wid, run["id"], "test", .01, "test")
    with pytest.raises(ValueError):
        app.state.budget.settle(wid, reservation, amount)
    assert client.get("/api/v1/usage").json()["aiReservedUsd"] == .01


def test_pause_stops_active_clock(client, app):
    from datetime import datetime, timedelta, timezone
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    client.post(f"/api/v1/runs/{run['id']}/approve")
    with app.state.database.session(wid) as db:
        stored = resource(db, wid, run["id"], "run", lock=True)
        stored.data = {**stored.data, "status": "running", "activeSeconds": 10,
            "activeSince": (datetime.now(timezone.utc) - timedelta(seconds=5)).isoformat()}
    paused = client.post(f"/api/v1/runs/{run['id']}/actions", json={"action": "pause"}).json()
    assert paused["activeSince"] is None
    assert 15 <= paused["usage"]["elapsedSeconds"] < 17


def test_failed_dispatch_remains_durable(client, app, monkeypatch):
    from google.cloud import run_v2
    class FailedClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def run_job(self, **kwargs):
            raise OSError("simulated transport failure")
    monkeypatch.setattr(run_v2, "JobsAsyncClient", FailedClient)
    app.state.settings.worker_mode = "cloud_run"
    app.state.settings.cloud_run_job = "projects/test/locations/test/jobs/test"
    run = new_run(client)
    assert client.post(f"/api/v1/runs/{run['id']}/approve").status_code == 202
    stored = client.get(f"/api/v1/runs/{run['id']}").json()
    assert stored["status"] == "queued"
    assert stored["dispatch"]["state"] == "uncertain"
    assert stored["dispatch"]["attempts"] == 1
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    asyncio.run(app.state.runtime.dispatch(wid, run["id"]))
    assert client.get(f"/api/v1/runs/{run['id']}").json()["dispatch"]["attempts"] == 1


def test_recovery_fails_stale_planning_without_execution(client, app):
    from datetime import datetime, timedelta, timezone
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with app.state.database.session(wid) as db:
        stored = resource(db, wid, run["id"], "run", lock=True)
        stored.data = {**stored.data, "status": "planning",
            "createdAt": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()}
    asyncio.run(app.state.runtime.recover())
    assert client.get(f"/api/v1/runs/{run['id']}").json()["status"] == "failed"


def test_frontend_routes_and_api_boundary(tmp_path):
    root = tmp_path / "static"
    root.mkdir()
    (root / "index.html").write_text("<html>Daleel production app</html>")
    settings = Settings(env="test", auth_mode="development", dev_token=TOKEN,
        database_url=f"sqlite:///{tmp_path / 'ui.sqlite'}", worker_mode="external", frontend_dist=root)
    with TestClient(make_app(settings)) as client:
        assert "Daleel production app" in client.get("/sign-in").text
        assert client.get("/api/v1/missing").status_code == 404
        assert client.get("/api/v1/me").status_code == 401


def test_broker_configuration_has_no_runtime_secrets():
    from daleel.config import BrokerSettings
    broker = BrokerSettings(_env_file=None, session_broker_token="x" * 32,
        broker_public_url="https://broker.example.org")
    assert not hasattr(broker, "database_url")
    assert not hasattr(broker, "groq_api_key")


def test_production_fails_closed():
    with pytest.raises(ValueError):
        Settings(_env_file=None, env="production", auth_mode="development", dev_token=TOKEN)


@pytest.mark.asyncio
async def test_lost_worker_cannot_mutate(client, app):
    from daleel.engine import worker_owner
    from daleel.db import RunLease
    from datetime import datetime, timedelta, timezone
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with app.state.database.session(wid) as db:
        db.add(RunLease(run_id=run["id"], workspace_id=wid, owner="new-owner",
            expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()))
    token = worker_owner.set((wid, run["id"], "old-owner"))
    try:
        with pytest.raises(asyncio.CancelledError):
            with app.state.runtime.session(wid):
                pytest.fail("Stale worker admitted")
    finally:
        worker_owner.reset(token)


def test_run_admission_is_bounded(client, app):
    app.state.settings.max_daily_runs_per_workspace = 1
    new_run(client)
    rejected = client.post("/api/v1/runs", json={"query": "Another query", "aiUsageCapUsd": 0})
    assert rejected.status_code == 429
    assert rejected.json()["code"] == "RUN_ADMISSION_LIMIT"


@pytest.mark.parametrize("changes,accepted", [({}, True), ({"email_verified": False}, False),
    ({"aud": "wrong"}, False), ({"iss": "https://wrong.invalid"}, False),
    ({"exp": 1}, False), ({"email": None}, False)])
def test_jwt_security_boundary(app, changes, accepted):
    import time
    import jwt
    from types import SimpleNamespace
    from cryptography.hazmat.primitives.asymmetric import rsa
    from daleel.auth import Auth
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    settings = app.state.settings.model_copy(update={"auth_mode": "jwt", "jwt_issuer": "https://auth.invalid",
        "jwt_audience": "daleel", "jwks_url": "https://auth.invalid/jwks"})
    auth = Auth(settings, app.state.database)
    auth.jwks = SimpleNamespace(get_signing_key_from_jwt=lambda token: SimpleNamespace(key=key.public_key()))
    claims = {"sub": "invited-user", "email": "invited@test.invalid", "email_verified": True,
        "iss": settings.jwt_issuer, "aud": settings.jwt_audience, "exp": int(time.time()) + 600, **changes}
    token = jwt.encode(claims, key, algorithm="RS256")
    if accepted:
        result = auth.verify(token)
        assert result.workspace_id is None
        assert result.email == "invited@test.invalid"
    else:
        with pytest.raises(Problem) as error:
            auth.verify(token)
        assert error.value.status == 401



def test_request_size_and_security_headers(client):
    oversized = client.post("/api/v1/runs", content=b"x" * 64_001,
        headers={"Content-Type": "application/json"})
    assert oversized.status_code == 413
    response = client.get("/health")
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "frame-ancestors 'none'" in response.headers["Content-Security-Policy"]



def test_run_deletion_waits_for_worker_drain(client, app):
    from daleel.db import RunLease
    from datetime import datetime, timedelta, timezone
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    client.post(f"/api/v1/runs/{run['id']}/actions", json={"action": "cancel"})
    with app.state.database.session(wid) as db:
        db.add(RunLease(run_id=run["id"], workspace_id=wid, owner="worker",
            expires_at=(datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()))
    response = client.post(f"/api/v1/runs/{run['id']}/deletion")
    assert response.status_code == 409
    assert response.json()["code"] == "WORKER_DRAINING"
    assert client.get(f"/api/v1/runs/{run['id']}").status_code == 200


@pytest.mark.parametrize("status", ["paused", "cancelled", "needs_attention", "complete", "awaiting_approval"])
def test_stopped_queries_cannot_admit_model_calls(client, app, status):
    run = new_run(client, aiUsageCapUsd=.25)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with app.state.database.session(wid) as db:
        stored = resource(db, wid, run["id"], "run", lock=True)
        stored.data = {**stored.data, "status": status}
    with pytest.raises(Problem) as error:
        app.state.budget.reserve(wid, run["id"], "test", .01, "test")
    assert error.value.code == "RUN_NOT_EXECUTING"


def test_deletion_retry_hides_data_and_revokes_export(client, app, monkeypatch):
    from daleel.db import put
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with app.state.database.session(wid) as db:
        finding = put(db, wid, "finding", {"sourceUrl": "https://example.org", "values": {},
            "status": "complete", "evidence": []}, parent=run["id"])
        finding_id = finding.id
    export = client.post(f"/api/v1/runs/{run['id']}/exports", json={"format": "json", "scope": "all"}).json()
    original_delete = app.state.artifacts.delete
    def interrupted(*args):
        raise OSError("private provider diagnostic")
    monkeypatch.setattr(app.state.artifacts, "delete", interrupted)
    deleted = client.post(f"/api/v1/runs/{run['id']}/deletion")
    assert deleted.status_code == 202
    job = deleted.json()
    assert job["state"] == "queued" and job["attempts"] == 1
    assert "private provider diagnostic" not in str(job)
    assert not {"artifactIds", "recordIds", "claimOwner"} & job.keys()
    assert client.get(f"/api/v1/runs/{run['id']}").status_code == 404
    assert client.get(export["downloadUrl"]).status_code == 404
    assert not client.get("/api/v1/runs").json()["items"]
    with app.state.database.session(wid) as db:
        pending = resource(db, wid, job["id"], "deletion")
        pending.data = {**pending.data, "retryAt": None}
        assert resource(db, wid, finding_id).data["deletionRequestedAt"]
    monkeypatch.setattr(app.state.artifacts, "delete", original_delete)
    asyncio.run(app.state.deletions.recover(wid))
    assert client.get(f"/api/v1/deletions/{job['id']}").json()["state"] == "complete"
    with app.state.database.session(wid) as db:
        assert resource(db, wid, run["id"]) is None
        assert resource(db, wid, finding_id) is None
    # Cleanup remains idempotent after success.
    assert asyncio.run(app.state.deletions.process(wid, job["id"]))["state"] == "complete"


def test_failed_export_has_durable_cleanup(client, app, monkeypatch):
    from daleel.db import resources
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    original_write = app.state.artifacts.write
    def partial_upload(*args):
        original_write(*args)
        raise OSError("upload response lost")
    monkeypatch.setattr(app.state.artifacts, "write", partial_upload)
    result = client.post(f"/api/v1/runs/{run['id']}/exports", json={"format": "json", "scope": "all"})
    assert result.status_code == 503 and result.json()["code"] == "EXPORT_FAILED"
    with app.state.database.session(wid) as db:
        jobs = resources(db, wid, "deletion")
        assert len(jobs) == 1
        export_id = jobs[0].data["artifactIds"][0]
    assert app.state.artifacts.read(wid, export_id)
    asyncio.run(app.state.deletions.recover(wid))
    with pytest.raises(FileNotFoundError):
        app.state.artifacts.read(wid, export_id)


def test_recipe_repair_requires_fresh_approval(client, app, monkeypatch):
    from daleel.db import put
    async def public(*args):
        return ["93.184.216.34"]
    monkeypatch.setattr("daleel.app.resolve_public", public)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with app.state.database.session(wid) as db:
        recipe = put(db, wid, "recipe", {"version": 1, "site": "example.org", "status": "active",
            "actions": [{"order": 1, "type": "navigate", "target": "https://example.org/job"},
                {"order": 2, "type": "extract", "target": "main"}],
            "validation": {"outcome": "passed"}, "sourceRunId": uid(),
            "fields": [{"key": "title", "required": True}], "task": "Find AI Engineer"})
        rid = recipe.id
    url = f"/api/v1/recipes/{rid}"
    body = {"sampleUrl": "https://example.org/job", "selector": "article", "changeSummary": "Source layout changed"}
    changed = client.patch(url, json=body)
    assert changed.status_code == 200, changed.text
    data = changed.json()
    assert data["version"] == 2 and data["status"] == "draft"
    assert data["versions"][0]["version"] == 1
    assert client.post(url + "/actions", json={"action": "replay"}).status_code == 409
    assert client.post(url + "/actions", json={"action": "approve"}).status_code == 409
    assert client.patch(url, json={**body, "selector": "["}).status_code == 422
    assert client.patch(url, json={**body, "sampleUrl": "https://other.org/job"}).status_code == 422
    assert client.post(url + "/actions", json={"action": "preview"}).json()["status"] == "previewed"
    assert client.post(url + "/actions", json={"action": "approve"}).json()["status"] == "approved"
    async def missing(self, *args, **kwargs):
        return {"url": body["sampleUrl"], "html": "<main>AI Engineer</main>", "bytes": 28, "status": 200}
    monkeypatch.setattr("daleel.app.Fetcher.fetch", missing)
    replay = client.post(url + "/actions", json={"action": "replay"})
    assert replay.status_code == 200, replay.text
    assert replay.json()["status"] == "needs_review"
    assert replay.json()["validation"]["driftDetected"] is True


def test_authenticated_recipe_replay_uses_only_selected_workspace_session(client, app, monkeypatch):
    import json
    from cryptography.fernet import Fernet
    from daleel.db import put, Secret
    key = Fernet.generate_key()
    app.state.settings.session_encryption_key = key.decode()
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    cookies = [{"name": "session", "value": "synthetic-test-only", "domain": "example.org", "path": "/"}]
    with app.state.database.session(wid) as db:
        session = put(db, wid, "session", {"domain": "example.org", "status": "active", "expiresAt": None})
        db.add(Secret(id=session.id, workspace_id=wid, ciphertext=Fernet(key).encrypt(json.dumps({"cookies": cookies}).encode()).decode()))
        recipe = put(db, wid, "recipe", {"version": 1, "site": "example.org", "status": "approved",
            "actions": [{"order": 1, "type": "navigate", "target": "https://example.org/job"},
                {"order": 2, "type": "extract", "target": "body"}],
            "validation": {"outcome": "pending"}, "sourceRunId": uid(),
            "fields": [{"key": "title", "required": True}], "task": "Find AI Engineer"})
        rid = recipe.id
    seen = []
    async def fetch(self, url, domains, selected):
        seen.append(selected)
        return {"url": url, "html": "<html><title>AI Engineer</title><body>AI Engineer opportunity</body></html>", "bytes": 75, "status": 200, "title": "AI Engineer"}
    monkeypatch.setattr("daleel.app.Fetcher.fetch", fetch)
    url = f"/api/v1/recipes/{rid}/actions"
    assert client.post(url, json={"action": "replay"}).json()["status"] == "active"
    assert seen == [None]
    replay = client.post(url, json={"action": "replay", "selectedSessionDomain": "example.org"})
    assert replay.json()["status"] == "active", replay.text
    assert seen[-1] == cookies
    wrong = client.post(url, json={"action": "replay", "selectedSessionDomain": "other.org"})
    assert wrong.json()["status"] == "needs_review"
    assert len(seen) == 2


@pytest.mark.parametrize("title,description,language,direction", [
    ("AI Engineer", "Build models for reliable search", "en", "ltr"),
    ("مهندس ذكاء اصطناعي", "تطوير نماذج بحث موثوقة", "ar", "rtl"),
    ("Ingénieur intelligence artificielle", "Développer des modèles fiables", "fr", "ltr"),
])
def test_unicode_evidence_preserves_source_and_missing_fields(title, description, language, direction):
    from daleel.agents import deterministic_extract
    page = parse_page({"url": "https://example.org/job", "title": title,
        "html": f'<html lang="{language}"><body><h1>{title}</h1><p>{description}</p></body></html>',
        "bytes": 200, "status": 200})
    fields = [{"key": "title", "required": True}, {"key": "description", "required": True},
        {"key": "salary", "required": False}]
    result = verify_result(deterministic_extract(page, fields, title), page, fields,
        {"id": uid(), "relevance": "balanced"})
    assert result["values"]["title"]["value"] == title
    assert description in result["values"]["description"]["value"]
    assert result["values"]["salary"]["evidenceState"] == "unknown"
    assert result["language"] == language and result["direction"] == direction
    assert result["sourceUrl"] == page["url"] and result["evidenceCount"] == 2


def test_recovery_removes_abandoned_upload_after_process_crash(client, app):
    from daleel.db import put
    run = new_run(client)
    wid = client.get("/api/v1/me").json()["workspace"]["id"]
    with app.state.database.session(wid) as db:
        pending = put(db, wid, "export", {"state": "uploading", "createdAt": "2000-01-01T00:00:00+00:00",
            "artifactBytes": 7, "downloadTokenHash": "", "expiresAt": "2000-01-01T00:00:00+00:00"}, parent=run["id"])
        export_id = pending.id
    app.state.artifacts.write(wid, export_id, b"partial", "text/plain")
    asyncio.run(app.state.runtime.recover())
    with app.state.database.session(wid) as db:
        assert resource(db, wid, export_id) is None
    with pytest.raises(FileNotFoundError):
        app.state.artifacts.read(wid, export_id)
