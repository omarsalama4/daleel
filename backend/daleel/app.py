import asyncio
import copy
import csv
import hashlib
import io
import json
import logging
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
import httpx
from cryptography.fernet import Fernet
from fastapi import FastAPI, Depends, Header, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, delete
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from .config import get_settings
from .db import Database, Resource, Workspace, Task, Invitation, Share, Audit, Secret, Idempotency, RunLease, uid, now, put, resource, resources
from .auth import Auth, actor, operator, identity
from .errors import Problem
from .schemas import (CreateRun, PlanPatch, RunAction, GateAction, SettingsPatch, FeedbackRequest,
                      ExportRequest, SaveWorkflow, WorkflowPatch, RunWorkflow, RecipeAction,
                      ConnectSite, SessionPatch, CreateShare, InviteUser, SupportAccess, Limits)
from .services import need, snapshot, event, transition, paginate, settings_payload, account_payload, create_run, TERMINAL
from .budgets import Budget
from .providers import Models, Search
from .engine import Runtime
from .storage import Artifacts, storage_usage, require_storage
from .network import canonical, hostname, resolve_public, Fetcher, parse_page

logger = logging.getLogger("daleel.api")


def make_app(settings=None):
    settings = settings or get_settings()
    database = Database(settings)
    budget = Budget(database)
    models, search = Models(settings, budget), Search(settings)
    runtime = Runtime(settings, database, models, search, budget)

    @asynccontextmanager
    async def lifespan(app):
        database.init()
        yield
        await runtime.close()
        database.engine.dispose()

    app = FastAPI(title="Daleel Research API", version="0.1.0", lifespan=lifespan,
                  docs_url="/api/docs", openapi_url="/api/openapi.json")
    app.state.settings, app.state.database = settings, database
    app.state.auth, app.state.budget = Auth(settings, database), budget
    app.state.models, app.state.runtime, app.state.dispatch = models, runtime, runtime.dispatch
    app.state.artifacts = Artifacts(settings)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["GET", "POST", "PATCH", "DELETE"],
                       allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "traceparent"],
                       expose_headers=["X-Trace-Id"], allow_credentials=False)
    FastAPIInstrumentor.instrument_app(app, excluded_urls=".*invitations/.*,.*exports/.*/download")

    @app.middleware("http")
    async def request_context(request, call_next):
        span_context = trace.get_current_span().get_span_context()
        request.state.trace_id = f"{span_context.trace_id:032x}" if span_context.is_valid else secrets.token_hex(16)
        if request.method in ("POST", "PATCH", "PUT"):
            body = bytearray()
            async for chunk in request.stream():
                if len(body) + len(chunk) > 64_000:
                    return JSONResponse({"code": "BODY_TOO_LARGE", "detail": "Request exceeds 64 KB", "status": 413}, status_code=413)
                body.extend(chunk)
            request._body = bytes(body)
        response = await call_next(request)
        response.headers["X-Trace-Id"] = request.state.trace_id
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        if settings.env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000"
        return response

    @app.exception_handler(Problem)
    async def problem_handler(request, exc):
        return JSONResponse({"type": "https://daleel.local/problems/" + exc.code.lower(),
            "title": exc.code.replace("_", " ").title(), "status": exc.status, "detail": exc.detail,
            "code": exc.code, "traceId": getattr(request.state, "trace_id", ""), "retryable": exc.retryable},
            status_code=exc.status, media_type="application/problem+json")

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request, exc):
        fields = {".".join(str(x) for x in e["loc"][1:]): e["msg"] for e in exc.errors()}
        return JSONResponse({"type": "https://daleel.local/problems/validation", "title": "Invalid input",
            "status": 422, "code": "VALIDATION_ERROR", "detail": "Correct the highlighted inputs",
            "traceId": request.state.trace_id, "fieldErrors": fields}, status_code=422,
            media_type="application/problem+json")

    @app.exception_handler(Exception)
    async def unexpected_handler(request, exc):
        logger.error("Request failed (%s), trace=%s", type(exc).__name__, getattr(request.state, "trace_id", ""))
        return JSONResponse({"type": "https://daleel.local/problems/internal", "title": "Request failed",
            "status": 500, "code": "INTERNAL_ERROR", "detail": "The request failed; use the trace ID for support",
            "traceId": getattr(request.state, "trace_id", "")}, status_code=500)

    prefix = "/api/v1"

    @app.get("/health")
    def health():
        return {"status": "ok", "environment": settings.env}

    @app.get("/ready")
    def ready():
        with database.session() as db:
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
        return {"status": "ready"}

    @app.get(prefix + "/me")
    def me(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return account_payload(settings, db.get(Workspace, a.workspace_id), a.operator)

    @app.get(prefix + "/settings")
    def get_settings_route(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return settings_payload(settings, db.get(Workspace, a.workspace_id), a.operator)

    @app.patch(prefix + "/settings")
    def update_settings(body: SettingsPatch, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            workspace = db.scalar(select(Workspace).where(Workspace.id == a.workspace_id).with_for_update())
            values = body.model_dump(exclude_none=True, mode="json")
            if "monthlyAiUsd" in values:
                values["monthlyAiUsd"] = float(values["monthlyAiUsd"])
            workspace.data = {**workspace.data, **values}
            return settings_payload(settings, workspace, a.operator)

    @app.get(prefix + "/usage")
    def usage(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            reserved, actual = budget.totals(db, a.workspace_id)
            storage = storage_usage(list(db.scalars(select(Resource).where(Resource.workspace_id == a.workspace_id))))
            workspace = db.get(Workspace, a.workspace_id)
            return {"period": datetime.now(timezone.utc).strftime("%Y-%m"), "aiReservedUsd": reserved,
                    "aiActualUsd": actual, "aiCapUsd": workspace.data.get("monthlyAiUsd", 5),
                    "searchCredits": None, "storageUsedMb": storage["usedMb"], "storageQuotaMb": 500,
                    "nonAiCostNotice": "Hosting, search, email, and storage costs are tracked separately from AI caps"}

    @app.post(prefix + "/runs", status_code=201)
    async def post_run(body: CreateRun, a=Depends(actor), idempotency_key: str | None = Header(None, max_length=200)):
        return await create_run(app.state, a, body, idempotency_key)

    @app.get(prefix + "/runs")
    def list_runs(cursor: str | None = None, pageSize: int = Query(50, ge=1, le=100),
                  status: str | None = None, q: str | None = None, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            items = [r for r in resources(db, a.workspace_id, "run")
                     if (not status or r.data["status"] == status) and (not q or q.lower() in r.data["query"].lower())]
            return paginate([snapshot(db, r, budget) for r in items], cursor, pageSize)

    @app.get(prefix + "/runs/{run_id}")
    def get_run(run_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return snapshot(db, need(db, a.workspace_id, run_id, "run"), budget)

    @app.get(prefix + "/runs/{run_id}/plan")
    def get_plan(run_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run")
            if "plan" not in run.data:
                raise Problem(409, "PLAN_GENERATING", "Plan generation is in progress")
            return run.data["plan"]

    @app.patch(prefix + "/runs/{run_id}/plan")
    async def edit_plan(run_id: str, body: PlanPatch, a=Depends(actor)):
        patch = body.model_dump(exclude_none=True)
        if patch.get("candidateDomains"):
            for domain in patch["candidateDomains"]:
                await resolve_public("https://" + domain, settings)
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run", lock=True)
            if run.data["status"] != "awaiting_approval":
                raise Problem(409, "PLAN_LOCKED", "Only a plan awaiting approval can be edited")
            plan = {**run.data["plan"], **patch}
            keys = [f["key"] for f in plan["fields"]]
            if len(keys) != len(set(keys)):
                raise Problem(422, "DUPLICATE_FIELD", "Plan field keys must be unique")
            run.data = {**run.data, "plan": plan, "limits": plan["limits"], "relevance": plan["relevance"]}
            event(db, run, "plan_edited", "Research plan updated before approval")
            return plan

    @app.post(prefix + "/runs/{run_id}/approve", status_code=202)
    async def approve(run_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run", lock=True)
            if run.data["status"] == "awaiting_approval":
                run.data = {**run.data, "status": "queued", "plan": {**run.data["plan"], "state": "approved"}}
                event(db, run, "approved", "User approved the plan and scope")
            elif run.data["status"] not in ("queued", "running"):
                raise Problem(409, "INVALID_TRANSITION", "The run cannot be approved in its current state")
            result = snapshot(db, run, budget)
        await runtime.dispatch(a.workspace_id, run_id)
        return result

    @app.post(prefix + "/runs/{run_id}/actions", status_code=202)
    async def run_action(run_id: str, body: RunAction, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run", lock=True)
            transition(db, run, body.action)
            result = snapshot(db, run, budget)
        if body.action == "resume":
            await runtime.dispatch(a.workspace_id, run_id)
        return result

    @app.post(prefix + "/runs/{run_id}/gates/{gate_id}/resolve", status_code=202)
    async def resolve_gate(run_id: str, gate_id: str, body: GateAction, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run", lock=True)
            gate = run.data.get("activeGate")
            if not gate or gate["id"] != gate_id or body.action not in gate["safeActions"]:
                raise Problem(409, "GATE_CHANGED", "This gate or action is no longer available")
            task = db.scalar(select(Task).where(Task.id == gate["taskId"], Task.workspace_id == a.workspace_id,
                                               Task.run_id == run_id).with_for_update())
            if body.action == "stop":
                transition(db, run, "cancel")
            else:
                if body.action == "connect_site":
                    valid = next((s for s in resources(db, a.workspace_id, "session")
                                  if s.data["domain"] == gate["targetSite"] and s.data["status"] == "active"), None)
                    if not valid:
                        raise Problem(409, "SESSION_UNAVAILABLE", "Finish an authorized connection before resolving this gate")
                    run.data = {**run.data, "selectedSessionDomain": valid.data["domain"]}
                elif body.action == "review_recipe":
                    recipe = need(db, a.workspace_id, gate["recipeId"], "recipe")
                    if recipe.data["status"] != "active":
                        raise Problem(409, "RECIPE_UNAPPROVED", "Approve and replay the recipe before continuing")
                task.state = "skipped" if body.action == "skip_task" else "ready"
                if body.action in ("connect_site", "review_recipe"):
                    task.attempts = 0
                if body.action == "skip_task":
                    task.result = {"reason": "User skipped the blocked task"}
                task.fencing_token += 1
                run.data = {**run.data, "status": "queued", "activeGate": None}
                event(db, run, "gate_resolved", f"Human gate resolved: {body.action}")
            result = snapshot(db, run, budget)
        if body.action != "stop":
            await runtime.dispatch(a.workspace_id, run_id)
        return result

    @app.get(prefix + "/runs/{run_id}/activity")
    def activity(run_id: str, afterSequence: int = 0, cursor: int | None = None, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run")
            events = sorted([r.data for r in resources(db, a.workspace_id, "event", run_id)
                             if r.data["sequence"] > (cursor if cursor is not None else afterSequence)], key=lambda e: e["sequence"])
            return {"events": events, "latestSequence": run.data["sequence"], "run": snapshot(db, run, budget)}

    @app.get(prefix + "/runs/{run_id}/findings")
    def findings(run_id: str, cursor: str | None = None, pageSize: int = Query(50, ge=1, le=100),
                 status: str | None = None, minRelevance: str | None = None, q: str | None = None, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run")
            items = [f.data for f in resources(db, a.workspace_id, "finding", run_id)]
            if status:
                items = [f for f in items if f["status"] == status]
            if minRelevance:
                items = [f for f in items if f["relevance"]["label"] == minRelevance]
            if q:
                items = [f for f in items if q.lower() in json.dumps(f["values"], ensure_ascii=False).lower()]
            return {**paginate(items, cursor, pageSize), "fieldDefinitions": run.data.get("plan", {}).get("fields", []),
                    "runStatus": run.data["status"]}

    @app.get(prefix + "/runs/{run_id}/findings/{finding_id}")
    def finding(run_id: str, finding_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            need(db, a.workspace_id, run_id, "run")
            item = need(db, a.workspace_id, finding_id, "finding")
            if item.parent_id != run_id:
                raise Problem(404, "NOT_FOUND", "Finding does not belong to this run")
            return item.data

    @app.post(prefix + "/runs/{run_id}/findings/{finding_id}/feedback", status_code=201)
    def feedback(run_id: str, finding_id: str, body: FeedbackRequest, a=Depends(actor)):
        finding(run_id, finding_id, a)
        with database.session(a.workspace_id) as db:
            return put(db, a.workspace_id, "feedback", {**body.model_dump(), "findingId": finding_id,
                       "submittedAt": now(), "createdAt": now()}, parent=finding_id).data

    @app.get(prefix + "/runs/{run_id}/coverage")
    def coverage(run_id: str, cursor: str | None = None, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            need(db, a.workspace_id, run_id, "run")
            tasks = list(db.scalars(select(Task).where(Task.workspace_id == a.workspace_id, Task.run_id == run_id, Task.kind == "page").order_by(Task.id)))
            outcomes = {"succeeded": "fetched", "skipped": "skipped", "failed": "failed", "blocked": "blocked",
                        "ready": "unprocessed", "leased": "discovered", "cancelled": "skipped"}
            urls = [{"url": t.payload["url"], "depth": t.payload["depth"], "attempts": t.attempts,
                     "outcome": outcomes[t.state], "reason": t.result.get("reason"), "httpStatus": t.result.get("httpStatus")} for t in tasks]
            counts = {s: sum(u["outcome"] == s for u in urls) for s in set(outcomes.values())}
            page = paginate(urls, cursor)
            domains = sorted({hostname(u["url"]) for u in urls})
            nodes = [{"id": "domain:" + d, "label": d, "type": "domain", "depth": 0, "status": "discovered"} for d in domains]
            nodes += [{"id": u["url"], "label": u["url"], "type": "seed" if u["depth"] == 0 else "page",
                       "depth": u["depth"], "status": u["outcome"]} for u in urls]
            links = [{"source": "domain:" + hostname(u["url"]), "target": u["url"]} for u in urls]
            known = {u["url"] for u in urls}
            links += [{"source": source, "target": task.payload["url"]} for task in tasks
                      for source in task.payload.get("sources", []) if source in known]
            return {"counts": counts, "urls": page["items"], "nextCursor": page["nextCursor"],
                    "graph": {"nodes": nodes, "links": links}}

    @app.post(prefix + "/runs/{run_id}/exports", status_code=202)
    def export(run_id: str, body: ExportRequest, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run")
            items = [r.data for r in resources(db, a.workspace_id, "finding", run_id)]
            if body.scope == "selected":
                items = [f for f in items if f["id"] in body.findingIds]
            elif body.scope == "filtered":
                items = [f for f in items if f["id"] in body.findingIds]
            if body.includeRawArtifacts:
                raise Problem(422, "RAW_ARTIFACTS_UNAVAILABLE", "Raw HTML is not retained by the beta")
            if not body.includeEvidence:
                items = [{k: v for k, v in f.items() if k != "evidence"} for f in items]
            extension = {"json": "json", "csv": "csv", "clean_text": "txt", "url_ledger": "csv"}[body.format]
            mime = {"json": "application/json", "csv": "text/csv", "txt": "text/plain"}[extension]
            if body.format == "json":
                content = json.dumps(items, ensure_ascii=False, indent=2)
            elif body.format in ("csv", "url_ledger"):
                output = io.StringIO()
                keys = [f["key"] for f in run.data["plan"]["fields"]] if body.format == "csv" else []
                writer = csv.writer(output)
                writer.writerow(keys + ["sourceUrl", "status", "evidence"])
                for f in items:
                    # Prevent spreadsheet formula injection in exported cells.
                    cells = [str(f["values"].get(k, {}).get("value", "")) for k in keys] + [f["sourceUrl"], f["status"], json.dumps(f.get("evidence", []), ensure_ascii=False)]
                    writer.writerow(["'" + c if c[:1] in ("=", "+", "-", "@", "\t", "\r") else c for c in cells])
                content = output.getvalue()
            else:
                content = "\n\n".join("\n".join(f"{k}: {v['value']}" for k, v in f["values"].items()) +
                                      "\nSource: " + f["sourceUrl"] + "\nEvidence: " + json.dumps(f.get("evidence", []), ensure_ascii=False) for f in items)
            rid, token = uid(), secrets.token_urlsafe(32)
            encoded = content.encode("utf-8")
            require_storage(db, a.workspace_id, len(encoded))
            app.state.artifacts.write(a.workspace_id, rid, encoded, mime)
            data = {"state": "complete", "createdAt": now(),
                    "expiresAt": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                    "downloadUrl": f"{prefix}/exports/{rid}/download?token={token}",
                    "downloadTokenHash": hashlib.sha256(token.encode()).hexdigest(),
                    "contentType": mime, "extension": extension, "artifactBytes": len(encoded)}
            result = put(db, a.workspace_id, "export", data, parent=run_id, rid=rid)
            return {k: v for k, v in result.data.items() if k != "downloadTokenHash"}

    @app.get(prefix + "/exports/{export_id}")
    def get_export(export_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return {k: v for k, v in need(db, a.workspace_id, export_id, "export").data.items() if k != "downloadTokenHash"}

    @app.get(prefix + "/exports/{export_id}/download")
    def download(export_id: str, token: str):
        # Capability grants access to one export only; token never enters logs or traces.
        with database.session() as db:
            # PostgreSQL security-definer lookup returns only matching capability metadata.
            if database.engine.dialect.name == "postgresql":
                from sqlalchemy import text
                wid = db.scalar(text("SELECT daleel_export_workspace(:rid, :digest)"),
                                {"rid": export_id, "digest": hashlib.sha256(token.encode()).hexdigest()})
            else:
                r = db.scalar(select(Resource).where(Resource.id == export_id, Resource.kind == "export"))
                wid = r.workspace_id if r and secrets.compare_digest(r.data.get("downloadTokenHash", ""), hashlib.sha256(token.encode()).hexdigest()) else None
        if not wid:
            raise Problem(404, "NOT_FOUND", "Export download is unavailable")
        with database.session(wid) as db:
            r = need(db, wid, export_id, "export")
            if r.data["expiresAt"] < now():
                raise Problem(410, "EXPORT_EXPIRED", "Create a new export; this link has expired")
            return Response(app.state.artifacts.read(wid, export_id), media_type=r.data["contentType"],
                            headers={"Content-Disposition": f'attachment; filename="daleel-{export_id}.{r.data["extension"]}"'})

    def delete_item(wid, rid, kind):
        with database.session(wid) as db:
            item = need(db, wid, rid, kind, lock=True)
            if kind == "run" and item.data["status"] not in TERMINAL | {"awaiting_approval", "paused"}:
                raise Problem(409, "RUN_ACTIVE", "Cancel the run before deleting it")
            children = list(db.scalars(select(Resource).where(Resource.workspace_id == wid, Resource.parent_id == rid)))
            ids = [rid] + [r.id for r in children]
            grandchildren = list(db.scalars(select(Resource).where(Resource.workspace_id == wid, Resource.parent_id.in_(ids))))
            for r in {r.id: r for r in [item] + children + grandchildren}.values():
                if r.kind == "export":
                    app.state.artifacts.delete(wid, r.id)
                db.execute(delete(Share).where(Share.owner_id == wid, Share.resource_id == r.id))
                db.delete(r)
            if kind == "run":
                db.execute(delete(Task).where(Task.workspace_id == wid, Task.run_id == rid))
                db.execute(delete(Idempotency).where(Idempotency.workspace_id == wid, Idempotency.resource_id == rid))
            return put(db, wid, "deletion", {"state": "complete", "requestedAt": now(), "completedAt": now(),
                       "scope": [kind, rid], "backupExpiryAt": None,
                       "tracePurgeState": "provider_limited" if settings.otlp_endpoint else "not_applicable"}).data

    @app.post(prefix + "/runs/{run_id}/deletion", status_code=202)
    async def delete_run(run_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, run_id, "run")
            if run.data["status"] not in TERMINAL | {"awaiting_approval", "paused"}:
                raise Problem(409, "RUN_ACTIVE", "Cancel the run before deleting it")
        running = runtime.running.get((a.workspace_id, run_id))
        if running and not running.done():
            running.cancel()
            await asyncio.gather(running, return_exceptions=True)
        with database.session(a.workspace_id) as db:
            need(db, a.workspace_id, run_id, "run", lock=True)
            lease = db.get(RunLease, run_id)
            if lease and lease.expires_at > now():
                raise Problem(409, "WORKER_DRAINING", "Worker is still stopping; retry deletion after it releases the run", True)
        await runtime.purge_checkpoint(a.workspace_id, run_id)
        return delete_item(a.workspace_id, run_id, "run")

    @app.post(prefix + "/runs/{run_id}/findings/{finding_id}/deletion", status_code=202)
    def delete_finding(run_id: str, finding_id: str, a=Depends(actor)):
        finding(run_id, finding_id, a)
        return delete_item(a.workspace_id, finding_id, "finding")

    @app.get(prefix + "/deletions/{deletion_id}")
    def deletion(deletion_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return need(db, a.workspace_id, deletion_id, "deletion").data

    @app.get(prefix + "/storage")
    def storage(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return storage_usage(list(db.scalars(select(Resource).where(Resource.workspace_id == a.workspace_id))))

    @app.get(prefix + "/workflows")
    def workflows(cursor: str | None = None, q: str | None = None, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return paginate([w.data for w in resources(db, a.workspace_id, "workflow")
                             if not q or q.lower() in w.data["name"].lower()], cursor)

    @app.post(prefix + "/workflows", status_code=201)
    def save_workflow(body: SaveWorkflow, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            run = need(db, a.workspace_id, body.runId, "run")
            data = {"name": body.name, "currentVersion": 1, "updatedAt": now(), "versions": [
                {"version": 1, "savedAt": now(), "author": a.email, "changeSummary": "Explicitly saved from a run",
                 "plan": run.data["plan"], "seedUrls": run.data["seedUrls"]}]}
            require_storage(db, a.workspace_id, len(json.dumps(data).encode()))
            return put(db, a.workspace_id, "workflow", data).data

    @app.get(prefix + "/workflows/{workflow_id}")
    def workflow(workflow_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return need(db, a.workspace_id, workflow_id, "workflow").data

    @app.patch(prefix + "/workflows/{workflow_id}")
    def edit_workflow(workflow_id: str, body: WorkflowPatch, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            w = need(db, a.workspace_id, workflow_id, "workflow", lock=True)
            version = w.data["currentVersion"] + 1
            prior = w.data["versions"][-1]
            patch = PlanPatch.model_validate({k: v for k, v in body.plan.items() if k in PlanPatch.model_fields}).model_dump(exclude_none=True)
            plan = {**prior["plan"], **patch}
            w.data = {**w.data, "name": body.name or w.data["name"], "currentVersion": version, "updatedAt": now(),
                      "versions": w.data["versions"] + [{"version": version, "savedAt": now(), "author": a.email,
                           "changeSummary": body.changeSummary, "plan": plan, "seedUrls": prior.get("seedUrls", [])}]}
            require_storage(db, a.workspace_id, len(json.dumps(w.data).encode()))
            return w.data

    @app.delete(prefix + "/workflows/{workflow_id}", status_code=202)
    def delete_workflow(workflow_id: str, a=Depends(actor)):
        return delete_item(a.workspace_id, workflow_id, "workflow")

    @app.post(prefix + "/workflows/{workflow_id}/duplicate", status_code=201)
    def duplicate_workflow(workflow_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            w = need(db, a.workspace_id, workflow_id, "workflow")
            data = copy.deepcopy(w.data)
            data.pop("id", None)
            data["name"] += " (copy)"
            require_storage(db, a.workspace_id, len(json.dumps(data).encode()))
            return put(db, a.workspace_id, "workflow", data).data

    @app.post(prefix + "/workflows/{workflow_id}/runs", status_code=201)
    async def run_workflow(workflow_id: str, body: RunWorkflow, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            w = need(db, a.workspace_id, workflow_id, "workflow")
            version = copy.deepcopy(w.data["versions"][-1])
        plan = version["plan"]
        return await create_run(app.state, a, CreateRun(query=plan["query"], mode=body.mode,
            relevance=plan["relevance"], limits=body.limits or Limits(**plan["limits"]),
            seedUrls=version.get("seedUrls", []), aiUsageCapUsd=body.aiUsageCapUsd, workflowId=workflow_id), plan_override=plan)

    @app.get(prefix + "/recipes")
    def recipes(cursor: str | None = None, site: str | None = None, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return paginate([r.data for r in resources(db, a.workspace_id, "recipe") if not site or site in r.data["site"]], cursor)

    @app.get(prefix + "/recipes/{recipe_id}")
    def recipe(recipe_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return need(db, a.workspace_id, recipe_id, "recipe").data

    @app.post(prefix + "/recipes/{recipe_id}/actions")
    async def recipe_action(recipe_id: str, body: RecipeAction, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            r = need(db, a.workspace_id, recipe_id, "recipe", lock=True)
            data = copy.deepcopy(r.data)
            if body.action == "preview":
                if data["status"] not in ("draft", "needs_review", "previewed"):
                    raise Problem(409, "INVALID_TRANSITION", "Recipe cannot be previewed in this state")
                data["status"] = "previewed"
            elif body.action == "approve":
                if data["status"] != "previewed":
                    raise Problem(409, "PREVIEW_REQUIRED", "Preview the recipe before approval")
                data["status"] = "approved"
            elif body.action == "retire":
                data["status"] = "retired"
            elif data["status"] not in ("approved", "active"):
                raise Problem(409, "APPROVAL_REQUIRED", "Approve the recipe before replay")
            r.data = data
        if body.action == "replay":
            fetcher = Fetcher(settings)
            try:
                # Replay the structured read-only steps; never evaluate exported Python text.
                url = data["actions"][0]["target"]
                fetched = await fetcher.fetch(url, [data["site"]])
                page = parse_page(fetched)
                from .recipes import apply_recipe
                from .agents import deterministic_extract, verify_result
                page = apply_recipe(data, page)
                validation_run = {"id": data["sourceRunId"], "relevance": data.get("relevance", "balanced"),
                                  "plan": {"fields": data["fields"]}}
                checked = verify_result(deterministic_extract(page, validation_run["plan"]["fields"], data["task"]),
                                        page, validation_run["plan"]["fields"], validation_run)
                if checked["evidenceCount"] == 0:
                    raise Problem(409, "RECIPE_DRIFT", "Replay did not yield any evidence-supported field")
                data["status"] = "active"
                data["validation"] = {**data["validation"], "outcome": "passed", "lastValidatedAt": now(),
                    "driftDetected": False, "stepResults": [{"stepOrder": 1, "success": True}, {"stepOrder": 2, "success": True}]}
            except (Problem, httpx.HTTPError) as exc:
                data["status"] = "needs_review"
                data["validation"] = {**data["validation"], "outcome": "failed", "lastValidatedAt": now(),
                    "driftDetected": True, "driftReason": exc.detail if isinstance(exc, Problem) else "Source unavailable"}
            finally:
                await fetcher.close()
            with database.session(a.workspace_id) as db:
                r = need(db, a.workspace_id, recipe_id, "recipe", lock=True)
                r.data = data
        return data

    async def broker(method, path, data=None):
        if not settings.session_broker_url or not settings.session_encryption_key:
            raise Problem(503, "SESSION_SERVICE_UNAVAILABLE", "Hosted sign-in requires a configured isolated browser broker")
        async with httpx.AsyncClient(timeout=30, trust_env=False) as client:
            res = await client.request(method, settings.session_broker_url.rstrip("/") + path,
                                       headers={"Authorization": "Bearer " + settings.session_broker_token}, json=data)
        if res.status_code >= 400:
            raise Problem(409, "SESSION_NOT_VALIDATED", "Complete sign-in in the hosted browser before connecting")
        return res.json()

    @app.get(prefix + "/sessions")
    def sessions(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return [s.data for s in resources(db, a.workspace_id, "session")]

    @app.post(prefix + "/sessions", status_code=201)
    async def connect_site(body: ConnectSite, a=Depends(actor)):
        url = canonical("https://" + body.domain)
        await resolve_public(url, settings)
        rid = uid()
        result = await broker("POST", "/connections", {"id": rid, "workspaceId": a.workspace_id, "url": url})
        if not result.get("browserUrl", "").startswith("https://") and settings.env == "production":
            raise Problem(503, "SESSION_SERVICE_UNAVAILABLE", "Hosted browser must use HTTPS")
        with database.session(a.workspace_id) as db:
            return put(db, a.workspace_id, "connection", {"domain": hostname(url), "browserUrl": result["browserUrl"],
                "state": "connecting", "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()}, rid=rid).data

    @app.post(prefix + "/sessions/connections/{connection_id}/finish")
    async def finish_connection(connection_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            connection = need(db, a.workspace_id, connection_id, "connection")
            if connection.data["expiresAt"] < now():
                raise Problem(410, "CONNECTION_EXPIRED", "Start a new hosted sign-in connection")
            if connection.data.get("sessionId"):
                return need(db, a.workspace_id, connection.data["sessionId"], "session").data
            domain = connection.data["domain"]
        result = await broker("POST", f"/connections/{connection_id}/finish", {"workspaceId": a.workspace_id})
        if not result.get("authenticated") or not isinstance(result.get("storageState"), dict):
            raise Problem(409, "SESSION_NOT_VALIDATED", "The hosted browser did not validate an authenticated session")
        state = result["storageState"]
        # Reject sessions with cookie domains outside the authorized target domain.
        if any(c.get("domain", "").lstrip(".") != domain and not domain.endswith("." + c.get("domain", "").lstrip(".")) for c in state.get("cookies", [])):
            raise Problem(409, "SESSION_SCOPE", "Session contains cookies outside the authorized domain")
        encrypted = Fernet(settings.session_encryption_key.encode()).encrypt(json.dumps(state).encode()).decode()
        with database.session(a.workspace_id) as db:
            rid = uid()
            session = put(db, a.workspace_id, "session", {"domain": domain, "status": "active", "expiryMode": "no_expiry",
                "expiresAt": None, "connectedAt": now(), "lastValidatedAt": now()}, rid=rid)
            db.add(Secret(id=rid, workspace_id=a.workspace_id, ciphertext=encrypted))
            connection = need(db, a.workspace_id, connection_id, "connection", lock=True)
            connection.data = {**connection.data, "state": "ready", "sessionId": rid}
            return session.data

    @app.patch(prefix + "/sessions/{session_id}")
    def edit_session(session_id: str, body: SessionPatch, a=Depends(actor)):
        expiry_mode = "custom" if body.expiryMode == "date" else body.expiryMode
        if expiry_mode == "custom":
            if not body.expiresAt:
                raise Problem(422, "EXPIRY_REQUIRED", "Choose the expiry date")
            try:
                expiry = datetime.fromisoformat(body.expiresAt.replace("Z", "+00:00"))
                if expiry.tzinfo is None or expiry <= datetime.now(timezone.utc):
                    raise ValueError()
            except ValueError:
                raise Problem(422, "INVALID_EXPIRY", "Expiry must be a future date with timezone") from None
        with database.session(a.workspace_id) as db:
            s = need(db, a.workspace_id, session_id, "session", lock=True)
            s.data = {**s.data, "expiryMode": expiry_mode, "expiresAt": body.expiresAt if expiry_mode == "custom" else None}
            return s.data

    @app.delete(prefix + "/sessions/{session_id}", status_code=204)
    def revoke_session(session_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            s = need(db, a.workspace_id, session_id, "session", lock=True)
            s.data = {**s.data, "status": "revoked"}
            db.execute(delete(Secret).where(Secret.id == session_id, Secret.workspace_id == a.workspace_id))
            for r in resources(db, a.workspace_id, "run"):
                if r.data.get("selectedSessionDomain") == s.data["domain"] and r.data["status"] in ("queued", "running"):
                    r.data = {**r.data, "status": "paused", "stopReason": "Authorized session revoked"}
                    event(db, r, "session_revoked", "User revoked the session; run paused")
        return Response(status_code=204)

    @app.get(prefix + "/shares")
    def sent_shares(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return [s.data for s in db.scalars(select(Share).where(Share.owner_id == a.workspace_id))]

    @app.post(prefix + "/shares", status_code=201)
    def create_share(body: CreateShare, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            item = need(db, a.workspace_id, body.resourceId, body.resourceType)
            recipient = db.get(Workspace, body.recipientUserId)
            if not recipient or recipient.id == a.workspace_id:
                raise Problem(422, "RECIPIENT_UNAVAILABLE", "Choose another invited user")
            rid = uid()
            data = {"id": rid, **body.model_dump(), "recipientEmail": recipient.email, "access": "read_only",
                "state": "active", "createdAt": now(), "resourceTitle": item.data.get("name", "Shared finding")}
            db.add(Share(id=rid, owner_id=a.workspace_id, recipient_id=recipient.id, resource_id=item.id, data=data))
            return data

    @app.delete(prefix + "/shares/{share_id}", status_code=204)
    def revoke_share(share_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            s = db.scalar(select(Share).where(Share.id == share_id, Share.owner_id == a.workspace_id).with_for_update())
            if not s:
                raise Problem(404, "NOT_FOUND", "Share unavailable")
            s.data = {**s.data, "state": "revoked", "revokedAt": now()}
        return Response(status_code=204)

    @app.get(prefix + "/shared")
    def shared(a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            return {"items": [{**s.data, "shareId": s.id, "sharedAt": s.data["createdAt"], "senderDisplayName": "Daleel user",
                               "viewOnly": True} for s in db.scalars(select(Share).where(Share.recipient_id == a.workspace_id)) if s.data["state"] == "active"], "nextCursor": None}

    @app.get(prefix + "/shared/{share_id}")
    def shared_item(share_id: str, a=Depends(actor)):
        with database.session(a.workspace_id) as db:
            s = db.scalar(select(Share).where(Share.id == share_id, Share.recipient_id == a.workspace_id))
            if not s or s.data["state"] != "active":
                raise Problem(404, "NOT_FOUND", "Share unavailable or revoked")
            owner_id, rid, kind = s.owner_id, s.resource_id, s.data["resourceType"]
        with database.session(owner_id) as db:
            item = need(db, owner_id, rid, kind)
            return {"shareId": share_id, "resourceId": rid, "resourceType": kind, "payload": item.data,
                    "viewOnly": True, "sessionStateIncluded": False, "privateRunHistoryIncluded": False}

    @app.get(prefix + "/invitations/{invite_token}")
    def invitation_preview(invite_token: str):
        digest = hashlib.sha256(invite_token.encode()).hexdigest()
        with database.session() as db:
            inv = db.scalar(select(Invitation).where(Invitation.token_hash == digest))
            if not inv:
                return {"email": "", "status": "invalid", "expiresAt": None}
            status = inv.data["status"]
            if status == "pending":
                status = "expired" if inv.data["expiresAt"] < now() else "valid"
            return {"email": inv.email, "status": status, "expiresAt": inv.data["expiresAt"]}

    @app.post(prefix + "/invitations/{invite_token}/claim", status_code=201)
    def claim_invitation(invite_token: str, a=Depends(identity)):
        with database.session() as db:
            inv = db.scalar(select(Invitation).where(Invitation.token_hash == hashlib.sha256(invite_token.encode()).hexdigest()).with_for_update())
            if not inv or inv.email != a.email or inv.data["expiresAt"] < now() or inv.data["status"] == "revoked":
                raise Problem(403, "INVITATION_INVALID", "This invitation is unavailable for the signed-in account")
            workspace = db.scalar(select(Workspace).where(Workspace.subject == a.subject))
            if not workspace:
                if inv.data["status"] != "pending":
                    raise Problem(409, "INVITATION_USED", "This invitation has already been claimed")
                workspace = Workspace(id=uid(), subject=a.subject, email=a.email,
                                      data={"createdAt": now(), "monthlyAiUsd": 5, "authenticatedContentAllowed": False})
                db.add(workspace)
                db.flush()
            inv.data = {**inv.data, "status": "accepted"}
            return account_payload(settings, workspace, a.operator)

    async def issue_invitation(body, previous_id=None):
        token = secrets.token_urlsafe(32)
        rid = previous_id or uid()
        data = {"id": rid, "email": str(body.email).lower(), "status": "pending", "createdAt": now(),
                "expiresAt": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(), "deliveryState": "queued", "note": body.note}
        link = settings.frontend_url.rstrip("/") + "/invite/" + token
        if settings.resend_api_key and settings.email_from:
            async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
                res = await client.post("https://api.resend.com/emails", headers={"Authorization": "Bearer " + settings.resend_api_key},
                    json={"from": settings.email_from, "to": [data["email"]], "subject": "Your Daleel invitation",
                          "text": "Join Daleel using this private invitation link: " + link})
            data["deliveryState"] = "sent" if res.is_success else "quota_paused" if res.status_code == 429 else "failed"
        with database.session() as db:
            inv = db.get(Invitation, rid) if previous_id else None
            if inv:
                inv.token_hash, inv.data = hashlib.sha256(token.encode()).hexdigest(), data
            else:
                db.add(Invitation(id=rid, email=data["email"], token_hash=hashlib.sha256(token.encode()).hexdigest(), data=data))
        return {**data, "invitationUrl": link}

    @app.get(prefix + "/admin/invitations")
    def invitations(a=Depends(operator)):
        with database.session() as db:
            return [i.data for i in db.scalars(select(Invitation))]

    @app.post(prefix + "/admin/invitations", status_code=201)
    async def invite(body: InviteUser, a=Depends(operator)):
        return await issue_invitation(body)

    @app.post(prefix + "/admin/invitations/{invitation_id}/resend")
    async def resend(invitation_id: str, a=Depends(operator)):
        with database.session() as db:
            inv = db.get(Invitation, invitation_id)
            if not inv or inv.data["status"] == "accepted":
                raise Problem(409, "INVITATION_UNAVAILABLE", "Invitation cannot be resent")
            email = inv.email
        return await issue_invitation(InviteUser(email=email), invitation_id)

    @app.delete(prefix + "/admin/invitations/{invitation_id}", status_code=204)
    def revoke_invite(invitation_id: str, a=Depends(operator)):
        with database.session() as db:
            inv = db.get(Invitation, invitation_id)
            if not inv:
                raise Problem(404, "NOT_FOUND", "Invitation unavailable")
            inv.data = {**inv.data, "status": "revoked"}
        return Response(status_code=204)

    def operational_metadata(db, wid):
        if database.engine.dialect.name == "postgresql":
            from sqlalchemy import text
            return db.scalar(text("SELECT daleel_workspace_metadata(:wid)"), {"wid": wid})
        items = list(db.scalars(select(Resource).where(Resource.workspace_id == wid)))
        runs = [r for r in items if r.kind == "run"]
        return {"activeRuns": sum(r.data["status"] in ("queued", "running") for r in runs),
                "pausedRuns": sum(r.data["status"] in ("paused", "needs_attention") for r in runs),
                "lastRunAt": max((r.created_at for r in runs), default=None),
                "storageUsedMb": storage_usage(items)["usedMb"]}

    @app.get(prefix + "/admin/workspaces")
    def admin_workspaces(a=Depends(operator)):
        with database.session() as db:
            return [{"id": w.id, "ownerEmail": w.email, "operationalState": "healthy",
                     **operational_metadata(db, w.id), "privateContentReturned": False} for w in db.scalars(select(Workspace))]

    @app.get(prefix + "/admin/workspaces/{workspace_id}")
    def admin_workspace(workspace_id: str, a=Depends(operator)):
        with database.session() as db:
            w = db.get(Workspace, workspace_id)
            if not w:
                raise Problem(404, "NOT_FOUND", "Workspace unavailable")
            return {"id": w.id, "ownerEmail": w.email, "operationalState": "healthy",
                    **operational_metadata(db, w.id), "privateContentReturned": False}

    @app.post(prefix + "/admin/support-access", status_code=201)
    def support_access(body: SupportAccess, a=Depends(operator)):
        # A grant binds to one exact item and purpose; no workspace-wide secret/content access.
        with database.session(body.workspaceId) as db:
            r = resource(db, body.workspaceId, body.itemId)
            if not r or r.kind not in ("run", "finding", "workflow", "recipe"):
                raise Problem(404, "NOT_FOUND", "Support item unavailable")
        with database.session() as db:
            rid, audit_id = uid(), uid()
            data = {"id": rid, "auditEventId": audit_id, **body.model_dump(), "operatorEmail": a.email,
                    "expiresAt": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
                    "access": "read_only", "secretsAccessible": False}
            db.add(Audit(id=audit_id, actor_id=a.workspace_id, data={"id": audit_id, "actorId": a.workspace_id,
                "actorEmail": a.email, **body.model_dump(), "purpose": body.purpose, "outcome": "granted", "occurredAt": now(), "grant": data}))
            return data

    @app.get(prefix + "/admin/support-access/{grant_id}/items/{item_id}")
    def support_item(grant_id: str, item_id: str, a=Depends(operator)):
        with database.session() as db:
            record = next((e for e in db.scalars(select(Audit).where(Audit.actor_id == a.workspace_id)) if e.data.get("grant", {}).get("id") == grant_id), None)
            grant = record.data["grant"] if record else None
            if not grant or grant["itemId"] != item_id or grant["expiresAt"] < now():
                raise Problem(403, "SUPPORT_GRANT_INVALID", "The support grant is expired or does not cover this item")
            audit_id = uid()
            db.add(Audit(id=audit_id, actor_id=a.workspace_id, data={"id": audit_id, "actorId": a.workspace_id,
                "actorEmail": a.email, "workspaceId": grant["workspaceId"], "itemId": item_id, "purpose": grant["purpose"],
                "outcome": "granted", "occurredAt": now(), "operation": "view"}))
        with database.session(grant["workspaceId"]) as db:
            r = resource(db, grant["workspaceId"], item_id)
            if not r or r.kind not in ("run", "finding", "workflow", "recipe"):
                raise Problem(404, "NOT_FOUND", "Support item unavailable")
            return r.data

    @app.get(prefix + "/admin/access-audit")
    def access_audit(a=Depends(operator)):
        with database.session() as db:
            return {"items": [{k: v for k, v in e.data.items() if k != "grant"} for e in db.scalars(select(Audit))], "nextCursor": None}

    if settings.frontend_dist.is_dir():
        static_root = settings.frontend_dist.resolve()
        if (static_root / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=static_root / "assets"), name="frontend-assets")

        @app.get("/{path:path}", include_in_schema=False)
        def frontend(path: str):
            if path == "api" or path.startswith("api/"):
                raise Problem(404, "NOT_FOUND", "API route unavailable")
            target = (static_root / path).resolve()
            if target.is_relative_to(static_root) and target.is_file():
                return FileResponse(target)
            return FileResponse(static_root / "index.html")

    return app
