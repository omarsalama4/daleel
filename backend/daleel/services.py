import copy
import hashlib
import json
from datetime import datetime, timezone
from sqlalchemy import select
from .db import Workspace, Task, Idempotency, resource, resources, put, uid, now
from .schemas import Limits
from .errors import Problem

TERMINAL = {"complete", "partial", "failed", "cancelled"}


def need(db, wid, rid, kind, lock=False):
    item = resource(db, wid, rid, kind, lock)
    if not item or item.data.get("deletionRequestedAt"):
        raise Problem(404, "NOT_FOUND", "The requested item is unavailable in this workspace")
    return item


def settings_payload(settings, workspace, is_operator=False):
    return {"workspace": {"id": workspace.id, "name": "Personal Workspace", "role": "operator" if is_operator else "owner",
                          "dataRegion": settings.data_region},
            "limits": Limits().model_dump(), "ceilings": Limits().model_dump(),
            "authenticatedContentAllowed": workspace.data.get("authenticatedContentAllowed", False),
            "providers": {"primary": "groq", "secondary": "openrouter_free", "paidRoutesEnabled": False,
                          "status": "available" if ((settings.groq_api_key and settings.groq_model) or (settings.openrouter_api_key and settings.openrouter_model)) else "unavailable"},
            "aiCaps": {"perRunUsd": .25, "monthlyUsd": workspace.data.get("monthlyAiUsd", 5)}}


def account_payload(settings, workspace, is_operator=False):
    return {"account": {"id": workspace.id, "email": workspace.email, "displayName": workspace.email.split("@")[0]},
            "workspace": settings_payload(settings, workspace, is_operator)["workspace"]}


def active_seconds(data):
    elapsed = data.get("activeSeconds", 0)
    if data.get("activeSince"):
        elapsed += max(0, (datetime.now(timezone.utc) - datetime.fromisoformat(data["activeSince"])).total_seconds())
    return elapsed


def event(db, run, event_type, message, page_url=None):
    data = copy.deepcopy(run.data)
    if data["status"] != "running" and data.get("activeSince"):
        data["activeSeconds"] = active_seconds(data)
        data["activeSince"] = None
        data["usage"] = {**data["usage"], "elapsedSeconds": data["activeSeconds"]}
    data["sequence"] += 1
    data["updatedAt"] = now()
    run.data = data
    put(db, run.workspace_id, "event", {"sequence": data["sequence"], "type": event_type,
        "message": message, "pageUrl": page_url, "occurredAt": now()}, parent=run.id)


def snapshot(db, run, budget):
    data = copy.deepcopy(run.data)
    findings = resources(db, run.workspace_id, "finding", run.id)
    data["findingCounts"] = {"total": len(findings), "relevant": sum(f.data["status"] == "relevant" for f in findings),
        "incomplete": sum(f.data["status"] == "incomplete" for f in findings),
        "duplicate": sum(f.data["status"] == "duplicate" for f in findings)}
    reserved, actual = budget.totals(db, run.workspace_id, run.id)
    data["usage"]["elapsedSeconds"] = active_seconds(data)
    data["usage"]["aiSpendUsd"] = actual
    data["usage"]["aiReservedUsd"] = reserved
    data.pop("selectedSessionDomain", None)
    data.pop("filterNotes", None)
    return data


def paginate(items, cursor=None, page_size=50):
    page_size = min(100, max(1, page_size))
    try:
        offset = int(cursor or 0)
        if offset < 0:
            raise ValueError()
    except ValueError:
        raise Problem(422, "INVALID_CURSOR", "Invalid pagination cursor") from None
    return {"items": items[offset:offset + page_size],
            "nextCursor": str(offset + page_size) if offset + page_size < len(items) else None}


def add_task(db, wid, run_id, kind, payload, dependencies=None):
    identity = {"url": payload["url"]} if kind == "page" else payload
    key = hashlib.sha256((kind + json.dumps(identity, sort_keys=True)).encode()).hexdigest()
    existing = db.scalar(select(Task).where(Task.workspace_id == wid, Task.run_id == run_id, Task.key == key))
    if existing:
        if kind == "page" and payload.get("fromUrl"):
            sources = list(existing.payload.get("sources", []))
            if payload["fromUrl"] not in sources and len(sources) < 20:
                existing.payload = {**existing.payload, "sources": sources + [payload["fromUrl"]]}
        if kind == "page" and payload["depth"] < existing.payload["depth"]:
            existing.payload = {**existing.payload, **payload}
            if existing.state == "skipped" and existing.result.get("reason") == "Depth limit reached":
                existing.state = "ready"
        return existing
    task = Task(id=uid(), workspace_id=wid, run_id=run_id, key=key, kind=kind, payload=payload,
                dependencies=dependencies or [], state="ready", result={})
    if kind == "page" and payload.get("fromUrl"):
        task.payload = {**payload, "sources": [payload["fromUrl"]]}
    db.add(task)
    db.flush()
    return task


async def create_run(app, actor, body, idempotency_key=None, plan_override=None):
    from .network import canonical, resolve_public
    from .agents import plan_run
    from .storage import require_storage
    payload = body.model_dump(mode="json")
    payload["aiUsageCapUsd"] = float(body.aiUsageCapUsd)
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    wid = actor.workspace_id
    with app.database.session(wid) as db:
        workspace = db.scalar(select(Workspace).where(Workspace.id == wid).with_for_update())
        if idempotency_key:
            prior = db.scalar(select(Idempotency).where(Idempotency.workspace_id == wid,
                              Idempotency.key == idempotency_key, Idempotency.operation == "create_run"))
            if prior:
                if prior.fingerprint != fingerprint:
                    raise Problem(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was used with another request")
                return snapshot(db, need(db, wid, prior.resource_id, "run"), app.budget)
        require_storage(db, wid, 10_000)
        if payload.get("selectedSessionDomain"):
            matching = [s for s in resources(db, wid, "session") if s.data["domain"] == payload["selectedSessionDomain"]
                        and s.data["status"] == "active"]
            if not matching:
                raise Problem(409, "SESSION_UNAVAILABLE", "Connect an active session for the selected domain")
        # Admission is also checked per call, including concurrent jobs.
        reserved, actual = app.budget.totals(db, wid)
        if payload["aiUsageCapUsd"] > 0 and reserved + actual >= workspace.data.get("monthlyAiUsd", 5):
            payload["aiUsageCapUsd"] = 0
        payload["seedUrls"] = list(dict.fromkeys(canonical(u) for u in payload["seedUrls"]))
    for url in payload["seedUrls"]:
        await resolve_public(url, app.settings)
    run_id = uid()
    run_data = {**payload, "id": run_id, "status": "planning", "createdAt": now(), "updatedAt": now(),
        "sequence": 0, "activeGate": None, "stopReason": None,
        "usage": {"domainsReached": 0, "pagesFetched": 0, "pagesDiscovered": 0, "pagesSkipped": 0,
                  "pagesBlocked": 0, "pagesFailed": 0, "elapsedSeconds": 0, "downloadMb": 0,
                  "aiSpendUsd": 0, "searchCreditsUsed": 0}}
    with app.database.session(wid) as db:
        if app.database.engine.dialect.name == "sqlite":
            db.connection().exec_driver_sql("BEGIN IMMEDIATE")
        db.scalar(select(Workspace).where(Workspace.id == wid).with_for_update())
        if idempotency_key:
            prior = db.scalar(select(Idempotency).where(Idempotency.workspace_id == wid,
                              Idempotency.key == idempotency_key, Idempotency.operation == "create_run"))
            if prior:
                if prior.fingerprint != fingerprint:
                    raise Problem(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was used with another request")
                return snapshot(db, need(db, wid, prior.resource_id, "run"), app.budget)
        existing_runs = resources(db, wid, "run")
        active = sum(r.data["status"] in ("planning", "queued", "running") for r in existing_runs)
        daily = sum(r.data["createdAt"][:10] == now()[:10] for r in existing_runs)
        if active >= app.settings.max_active_runs_per_workspace or daily >= app.settings.max_daily_runs_per_workspace:
            raise Problem(429, "RUN_ADMISSION_LIMIT", "Workspace concurrent or daily run limit reached", True)
        put(db, wid, "run", run_data, rid=run_id)
        if idempotency_key:
            db.add(Idempotency(workspace_id=wid, key=idempotency_key, operation="create_run",
                               fingerprint=fingerprint, resource_id=run_id))
    plan = copy.deepcopy(plan_override) if plan_override else await plan_run(app.models, wid, run_data)
    plan.update({"id": uid(), "query": payload["query"], "mode": payload["mode"], "limits": payload["limits"],
                 "relevance": payload["relevance"], "createdAt": now(), "state": "ready"})
    with app.database.session(wid) as db:
        run = need(db, wid, run_id, "run", lock=True)
        run.data = {**run.data, "plan": plan, "status": "awaiting_approval" if payload["mode"] == "approval" else "queued"}
        event(db, run, "planning", "Research plan generated; awaiting approval" if payload["mode"] == "approval" else "Research plan generated; execution queued")
        add_task(db, wid, run_id, "discovery", {"seedUrls": payload["seedUrls"]})
        result = snapshot(db, run, app.budget)
    if payload["mode"] == "autonomous":
        await app.dispatch(wid, run_id)
    return result


def transition(db, run, action):
    status = run.data["status"]
    allowed = {"pause": {"queued", "running"}, "resume": {"paused"},
               "cancel": {"planning", "awaiting_approval", "queued", "running", "paused", "needs_attention"}}
    if status not in allowed[action]:
        raise Problem(409, "INVALID_TRANSITION", f"Cannot {action} a {status} run")
    target = {"pause": "paused", "resume": "queued", "cancel": "cancelled"}[action]
    data = {**run.data, "status": target}
    if action == "cancel":
        data.update({"finishedAt": now(), "stopReason": "Cancelled by user", "activeGate": None})
        for task in db.scalars(select(Task).where(Task.workspace_id == run.workspace_id, Task.run_id == run.id,
                                               Task.state.in_(["ready", "leased", "blocked"]))):
            task.state = "cancelled"
            task.fencing_token += 1
    run.data = data
    event(db, run, "run_action", f"Run {target} by user")
