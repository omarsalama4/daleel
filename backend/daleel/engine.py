import asyncio
import copy
import hashlib
import json
import logging
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import datetime, timedelta, timezone
from typing import TypedDict
from sqlalchemy import select
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from opentelemetry import trace
from .db import Task, Workspace, Secret, RunLease, now, uid, resource, resources, put
from .services import need, event, add_task, TERMINAL, active_seconds
from .network import Fetcher, canonical, hostname, parse_page, resolve_public
from .agents import extract_page
from .errors import Problem
from .storage import require_storage

logger = logging.getLogger("daleel.worker")
tracer = trace.get_tracer("daleel.worker")
worker_owner = ContextVar("daleel_worker_owner", default=None)


class RunState(TypedDict, total=False):
    workspace_id: str
    run_id: str
    gate: dict | None


class Runtime:
    def __init__(self, settings, database, models, search, budget):
        self.settings, self.database, self.models, self.search, self.budget = settings, database, models, search, budget
        self.running = {}

    @contextmanager
    def session(self, wid):
        with self.database.session(wid) as db:
            ownership = worker_owner.get()
            if ownership and ownership[0] == wid:
                _, rid, owner = ownership
                # Use the same workspace-first lock order as run claims and page commits.
                db.scalar(select(Workspace).where(Workspace.id == wid).with_for_update())
                lease = db.scalar(select(RunLease).where(RunLease.run_id == rid,
                    RunLease.workspace_id == wid).with_for_update())
                if not lease or lease.owner != owner or lease.expires_at <= now():
                    raise asyncio.CancelledError("Worker lease lost")
            yield db

    async def dispatch(self, wid, rid):
        if self.settings.worker_mode == "inline":
            if (wid, rid) not in self.running or self.running[(wid, rid)].done():
                task = asyncio.create_task(self.execute(wid, rid))
                self.running[(wid, rid)] = task
                task.add_done_callback(lambda t: logger.error("Run worker failed", exc_info=t.exception())
                                       if not t.cancelled() and t.exception() else None)
            else:
                existing = self.running[(wid, rid)]
                existing.add_done_callback(lambda t: asyncio.create_task(self.redispatch_queued(wid, rid))
                    if not t.cancelled() else None)
        elif self.settings.worker_mode == "cloud_run":
            # The queued run itself is the durable dispatch ledger. A timed claim prevents
            # repeated scheduler/API launches; uncertain launches are safe under RunLease.
            with self.session(wid) as db:
                run = resource(db, wid, rid, "run", lock=True)
                if not run or run.data["status"] != "queued":
                    return
                dispatch = run.data.get("dispatch", {})
                if dispatch.get("retryAt", "") > now():
                    return
                run.data = {**run.data, "dispatch": {"attempts": dispatch.get("attempts", 0) + 1,
                    "retryAt": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(), "state": "pending"}}
            try:
                from google.cloud import run_v2
                async with run_v2.JobsAsyncClient() as client:
                    await asyncio.wait_for(client.run_job(request={"name": self.settings.cloud_run_job,
                        "overrides": {"container_overrides": [{"args": ["-m", "daleel.worker", "--workspace-id", wid, "--run-id", rid]}]}}), 30)
            except Exception as exc:
                logger.warning("Dispatch deferred for run %s (%s)", rid, type(exc).__name__)
                # Keep queued state: recovery retries after the durable retry timestamp.
                with self.session(wid) as db:
                    run = resource(db, wid, rid, "run", lock=True)
                    if run and run.data["status"] == "queued":
                        run.data = {**run.data, "dispatch": {**run.data["dispatch"], "state": "uncertain"}}

        # External mode is consumed by the durable worker CLI, not an API process task.

    async def recover(self):
        """Bounded scan; scheduled recovery dispatches jobs rather than doing every crawl."""
        with self.database.session() as db:
            workspaces = list(db.scalars(select(Workspace.id)))
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        recovered = 0
        for wid in workspaces:
            if hasattr(self, "deletions"):
                await self.deletions.recover(wid)
            with self.session(wid) as db:
                ids = [r.id for r in resources(db, wid, "run") if r.data["status"] in ("planning", "queued", "running")]
            for rid in ids:
                launch = False
                with self.session(wid) as db:
                    run = resource(db, wid, rid, "run", lock=True)
                    if not run:
                        continue
                    lease = db.get(RunLease, rid)
                    if lease and lease.expires_at > now():
                        continue
                    if run.data["status"] == "planning":
                        if run.data["createdAt"] < cutoff:
                            run.data = {**run.data, "status": "failed", "finishedAt": now(),
                                "stopReason": "Planning interrupted; submit a new query"}
                            event(db, run, "planning_failed", "Interrupted planning recovered without executing an unapproved plan")
                        continue
                    if run.data["status"] == "running":
                        run.data = {**run.data, "status": "queued", "dispatch": {}}
                        event(db, run, "worker_recovery", "Expired worker scheduled for recovery")
                    launch = run.data["status"] == "queued"
                if launch:
                    if self.settings.worker_mode == "external":
                        await self.execute(wid, rid)
                    else:
                        await self.dispatch(wid, rid)
                    recovered += 1
                if recovered >= 100:
                    return recovered
        return recovered

    async def redispatch_queued(self, wid, rid):
        with self.session(wid) as db:
            run = resource(db, wid, rid, "run")
            queued = run and run.data["status"] == "queued"
        if queued:
            await self.dispatch(wid, rid)

    async def purge_checkpoint(self, wid, rid):
        thread_id = f"{wid}:{rid}"
        if self.database.engine.dialect.name == "postgresql":
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            conn = self.settings.database_url.replace("postgresql+psycopg://", "postgresql://")
            async with AsyncPostgresSaver.from_conn_string(conn) as saver:
                await saver.adelete_thread(thread_id)
        else:
            from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
            async with AsyncSqliteSaver.from_conn_string("data/checkpoints.sqlite") as saver:
                await saver.setup()
                await saver.adelete_thread(thread_id)

    async def close(self):
        tasks = list(self.running.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    def graph(self, saver):
        graph = StateGraph(RunState)
        graph.add_node("discover", self.discover)
        graph.add_node("crawl", self.crawl)
        graph.add_node("human_review", self.human_review)
        graph.add_node("report", self.report)
        graph.add_edge(START, "discover")
        graph.add_edge("discover", "crawl")
        graph.add_conditional_edges("crawl", lambda s: "human_review" if s.get("gate") else "report")
        graph.add_edge("human_review", "crawl")
        graph.add_edge("report", END)
        return graph.compile(checkpointer=saver)

    async def execute(self, wid, rid):
        owner = uid()
        with self.session(wid) as db:
            need(db, wid, rid, "run", lock=True)
            lease = db.get(RunLease, rid)
            if lease and lease.expires_at > now():
                return False
            if lease:
                lease.owner = owner
                lease.expires_at = (datetime.now(timezone.utc) + timedelta(seconds=self.settings.lease_seconds)).isoformat()
                # Fence tasks of a crashed or expired worker before reclaiming its graph.
                for task in db.scalars(select(Task).where(Task.workspace_id == wid, Task.run_id == rid, Task.state == "leased")):
                    task.state = "ready"
                    task.fencing_token += 1
            else:
                db.add(RunLease(run_id=rid, workspace_id=wid, owner=owner,
                    expires_at=(datetime.now(timezone.utc) + timedelta(seconds=self.settings.lease_seconds)).isoformat()))
        ownership_token = worker_owner.set((wid, rid, owner))
        pulse = asyncio.create_task(self.run_heartbeat(wid, rid, owner, asyncio.current_task()))
        # Checkpoints contain identifiers and gate metadata; no passwords, cookies, or HTML.
        config = {"configurable": {"thread_id": f"{wid}:{rid}"}, "recursion_limit": 100}
        try:
            if self.database.engine.dialect.name == "postgresql":
                from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
                conn = self.settings.database_url.replace("postgresql+psycopg://", "postgresql://")
                async with AsyncPostgresSaver.from_conn_string(conn) as saver:
                    # Saver schema setup is done by the migration/bootstrap command.
                    graph = self.graph(saver)
                    await self.invoke(graph, config, wid, rid)
            else:
                from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
                from pathlib import Path
                Path("data").mkdir(exist_ok=True)
                async with AsyncSqliteSaver.from_conn_string("data/checkpoints.sqlite") as saver:
                    graph = self.graph(saver)
                    await self.invoke(graph, config, wid, rid)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Worker error for run %s (%s)", rid, type(exc).__name__)
            with self.session(wid) as db:
                run = resource(db, wid, rid, "run", lock=True)
                if run and (lease := db.get(RunLease, rid)) and lease.owner == owner and run.data["status"] not in TERMINAL and run.data["status"] not in ("paused", "needs_attention"):
                    run.data = {**run.data, "status": "partial", "finishedAt": now(),
                                "stopReason": "Worker interrupted; completed findings retained"}
                    event(db, run, "worker_error", "Worker could not complete the run; retry unfinished tasks")
        finally:
            worker_owner.reset(ownership_token)
            pulse.cancel()
            await asyncio.gather(pulse, return_exceptions=True)
            with self.session(wid) as db:
                lease = db.get(RunLease, rid)
                if lease and lease.owner == owner:
                    for task in db.scalars(select(Task).where(Task.workspace_id == wid, Task.run_id == rid, Task.state == "leased")):
                        task.state = "ready"
                        task.fencing_token += 1
                    db.delete(lease)

    async def run_heartbeat(self, wid, rid, owner, execution):
        while True:
            await asyncio.sleep(max(2, self.settings.lease_seconds / 3))
            with self.session(wid) as db:
                lease = db.get(RunLease, rid)
                if not lease or lease.owner != owner:
                    execution.cancel()
                    return
                lease.expires_at = (datetime.now(timezone.utc) + timedelta(seconds=self.settings.lease_seconds)).isoformat()

    async def invoke(self, graph, config, wid, rid):
        with self.session(wid) as db:
            run = need(db, wid, rid, "run", lock=True)
            if run.data["status"] not in ("queued", "running"):
                return
            run.data = {**run.data, "status": "running", "startedAt": run.data.get("startedAt") or now(),
                        "activeSince": run.data.get("activeSince") or now()}
            event(db, run, "stage_start", "Discovery and crawl worker started")
        saved = await graph.aget_state(config)
        initial = Command(resume={"resolved": True}) if "human_review" in saved.next else {"workspace_id": wid, "run_id": rid, "gate": None}
        with self.session(wid) as db:
            run = need(db, wid, rid, "run")
            remaining = max(0.01, run.data["limits"]["minutes"] * 60 - active_seconds(run.data))
        try:
            await asyncio.wait_for(graph.ainvoke(initial, config, durability="sync"), remaining)
        except TimeoutError:
            with self.session(wid) as db:
                run = resource(db, wid, rid, "run", lock=True)
                if run and run.data["status"] == "running":
                    run.data = {**run.data, "status": "partial", "finishedAt": now(),
                        "stopReason": "Time limit reached"}
                    event(db, run, "time_limit", "Active execution deadline reached; completed findings retained")

    async def human_review(self, state):
        interrupt(state.get("gate"))
        return {"gate": None}

    async def discover(self, state):
        wid, rid = state["workspace_id"], state["run_id"]
        with self.session(wid) as db:
            run = need(db, wid, rid, "run")
            seeds = run.data["seedUrls"]
            done = db.scalar(select(Task).where(Task.workspace_id == wid, Task.run_id == rid,
                                               Task.kind == "discovery", Task.state == "succeeded"))
            if done:
                return {"gate": None}
            query = run.data["plan"].get("searchQuery", run.data["query"])
            configured_domains = run.data["plan"].get("candidateDomains", [])
        if not seeds:
            try:
                seeds = await self.search.discover(query)
            except (Problem, Exception) as exc:
                code = exc.code if isinstance(exc, Problem) else "SEARCH_UNAVAILABLE"
                with self.session(wid) as db:
                    run = need(db, wid, rid, "run", lock=True)
                    run.data = {**run.data, "status": "partial", "stopReason": code,
                                "finishedAt": now()}
                    event(db, run, "discovery_failed", "Discovery unavailable; add seed URLs or configure search")
                return {"gate": None}
        safe_seeds = []
        for url in seeds:
            try:
                url = canonical(url)
                if configured_domains and hostname(url) not in configured_domains:
                    continue
                await resolve_public(url, self.settings)
                safe_seeds.append(url)
            except (Problem, ValueError):
                continue
        with self.session(wid) as db:
            run = need(db, wid, rid, "run", lock=True)
            if run.data["status"] != "running":
                return {"gate": None}
            task = db.scalar(select(Task).where(Task.workspace_id == wid, Task.run_id == rid, Task.kind == "discovery"))
            task.state = "succeeded"
            domains = []
            for url in safe_seeds[:run.data["limits"]["pages"]]:
                host = hostname(url)
                if host not in domains:
                    if len(domains) >= run.data["limits"]["domains"]:
                        continue
                    domains.append(host)
                add_task(db, wid, rid, "page", {"url": url, "depth": 0}, [task.id])
            run.data = {**run.data, "allowedDomains": domains,
                        "usage": {**run.data["usage"], "pagesDiscovered": len(safe_seeds),
                                  "searchCreditsUsed": 0 if run.data["seedUrls"] else 1}}
            event(db, run, "discovery", f"Discovered {len(safe_seeds)} initial URLs")
        return {"gate": None}

    def claim(self, wid, rid):
        with self.session(wid) as db:
            run = need(db, wid, rid, "run", lock=True)
            if run.data["status"] != "running":
                return None
            elapsed = active_seconds(run.data)
            usage = run.data["usage"]
            if elapsed >= run.data["limits"]["minutes"] * 60 or usage["downloadMb"] >= run.data["limits"]["downloadMb"]:
                run.data = {**run.data, "stopReason": "Time or download limit reached"}
                return None
            leased = list(db.scalars(select(Task).where(Task.workspace_id == wid, Task.run_id == rid, Task.state == "leased")))
            for task in leased:
                if task.lease_until and task.lease_until < now():
                    task.state = "ready"
                    task.fencing_token += 1
            active_count = sum(t.state == "leased" for t in leased)
            if usage["pagesFetched"] + active_count >= run.data["limits"]["pages"]:
                if not active_count:
                    run.data = {**run.data, "stopReason": "Page limit reached"}
                return None
            tasks = db.scalars(select(Task).where(Task.workspace_id == wid, Task.run_id == rid,
                Task.kind == "page", Task.state == "ready").order_by(Task.id).with_for_update(skip_locked=True))
            terminal = {t.id for t in db.scalars(select(Task).where(Task.workspace_id == wid, Task.run_id == rid,
                                                                 Task.state.in_(["succeeded", "skipped"]))) }
            eligible = []
            for task in tasks:
                if task.attempts > run.data["limits"]["retriesPerPage"]:
                    task.state = "failed"
                    task.result = {"reason": "Retry limit reached after worker recovery"}
                elif all(d in terminal for d in task.dependencies):
                    eligible.append(task)
            eligible.sort(key=lambda t: (t.payload.get("depth", 0), -t.payload.get("priority", 0)))
            task = eligible[0] if eligible else None
            if not task:
                return None
            task.state = "leased"
            task.attempts += 1
            task.fencing_token += 1
            task.lease_until = (datetime.now(timezone.utc) + timedelta(seconds=self.settings.lease_seconds)).isoformat()
            return {"id": task.id, "payload": copy.deepcopy(task.payload), "fence": task.fencing_token,
                    "attempts": task.attempts, "run": copy.deepcopy(run.data)}

    async def heartbeat(self, wid, claimed):
        while True:
            await asyncio.sleep(max(2, self.settings.lease_seconds / 3))
            with self.session(wid) as db:
                task = db.scalar(select(Task).where(Task.id == claimed["id"], Task.workspace_id == wid).with_for_update())
                if not task or task.state != "leased" or task.fencing_token != claimed["fence"]:
                    return
                task.lease_until = (datetime.now(timezone.utc) + timedelta(seconds=self.settings.lease_seconds)).isoformat()

    async def crawl(self, state):
        wid, rid = state["workspace_id"], state["run_id"]
        fetcher = Fetcher(self.settings)
        def consume(size):
            with self.session(wid) as db:
                run = need(db, wid, rid, "run", lock=True)
                used = run.data["usage"].get("downloadBytes", 0) + size
                if used > run.data["limits"]["downloadMb"] * 1_000_000:
                    run.data = {**run.data, "stopReason": "Download limit reached"}
                    # Raising rolls back the transaction, so the error handler records the stop reason.
                    raise Problem(413, "DOWNLOAD_CAP", "Run download allowance is exhausted")
                run.data = {**run.data, "usage": {**run.data["usage"], "downloadBytes": used, "downloadMb": used / 1e6}}
        fetcher.consume = consume
        try:
            while True:
                claimed = [self.claim(wid, rid) for _ in range(self.settings.worker_concurrency)]
                batch = [x for x in claimed if x]
                if not batch:
                    break
                await asyncio.gather(*(self.process(wid, rid, item, fetcher) for item in batch))
                with self.session(wid) as db:
                    run = need(db, wid, rid, "run")
                    if run.data["status"] != "running":
                        break
            with self.session(wid) as db:
                run = need(db, wid, rid, "run", lock=True)
                if not run.data.get("activeGate") and run.data["status"] == "running":
                    blocked = db.scalar(select(Task).where(Task.workspace_id == wid, Task.run_id == rid,
                                                          Task.state == "blocked"))
                    if blocked and blocked.result.get("gate"):
                        run.data = {**run.data, "status": "needs_attention", "activeGate": blocked.result["gate"]}
                return {"gate": run.data.get("activeGate")}
        finally:
            await fetcher.close()

    async def process(self, wid, rid, claimed, fetcher):
        heartbeat = asyncio.create_task(self.heartbeat(wid, claimed))
        page = None
        recipe = None
        try:
            run = claimed["run"]
            cookies, authenticated, allowed_ai = None, False, False
            session_state = None
            with self.session(wid) as db:
                workspace = db.get(Workspace, wid)
                allowed_ai = workspace.data.get("authenticatedContentAllowed", False)
                for session in resources(db, wid, "session"):
                    if session.data["status"] == "active" and session.data["domain"] == hostname(claimed["payload"]["url"]) and run.get("selectedSessionDomain") == session.data["domain"]:
                        if session.data.get("expiresAt") and session.data["expiresAt"] < now():
                            raise Problem(401, "ACCESS_BARRIER", "Authorized session expired")
                        from cryptography.fernet import Fernet
                        secret = db.scalar(select(Secret).where(Secret.id == session.id, Secret.workspace_id == wid))
                        session_state = json.loads(Fernet(self.settings.session_encryption_key.encode()).decrypt(secret.ciphertext.encode()))
                        cookies = session_state["cookies"]
                        authenticated = True
            with tracer.start_as_current_span("crawl.page") as span:
                span.set_attribute("run.id", rid)
                span.set_attribute("host", hostname(claimed["payload"]["url"]))
                remaining = int((run["limits"]["downloadMb"] - run["usage"]["downloadMb"]) * 1e6)
                fetched = await fetcher.fetch(claimed["payload"]["url"], run.get("allowedDomains", []), cookies, remaining)
                page = parse_page(fetched)
                if self.settings.browser_enabled and len(page["text"]) < 200 and "<script" in fetched["html"]:
                    from .browser import render_page
                    page = parse_page(await render_page(fetcher, fetched, run.get("allowedDomains", []), cookies, session_state))
                with self.session(wid) as db:
                    approved = next((r for r in resources(db, wid, "recipe")
                        if r.data["status"] == "active" and r.data["site"] == hostname(page["url"])
                        and r.data["task"] == run["query"]), None)
                    recipe = copy.deepcopy(approved.data) if approved else None
                if recipe:
                    from .recipes import apply_recipe
                    page = apply_recipe(recipe, page)
                finding = await extract_page(self.models, wid, run, page,
                                             authenticated=authenticated and not allowed_ai)
            with self.session(wid) as db:
                current = need(db, wid, rid, "run", lock=True)
                task = db.scalar(select(Task).where(Task.id == claimed["id"], Task.workspace_id == wid).with_for_update())
                if not task or task.fencing_token != claimed["fence"] or task.state != "leased" or current.data["status"] == "cancelled":
                    return
                usage = copy.deepcopy(current.data["usage"])
                already_accounted = usage.get("downloadBytes", 0) > 0
                if not already_accounted and usage["downloadMb"] + page["bytes"] / 1e6 > current.data["limits"]["downloadMb"]:
                    task.state = "skipped"
                    task.result = {"reason": "Run download limit reached", "httpStatus": page["status"]}
                    current.data = {**current.data, "stopReason": "Run download limit reached"}
                    return
                require_storage(db, wid, len(json.dumps(finding, ensure_ascii=False).encode()))
                # Deduplicate by title/employer/location and retain all corroborating source links.
                key_fields = [finding["values"].get(k, {}).get("value", "").strip().casefold()
                              for k in ("title", "employer", "location")]
                duplicate_key = hashlib.sha256("|".join(key_fields).encode()).hexdigest()
                application = finding["values"].get("applicationUrl", {}).get("value", "")
                description = finding["values"].get("description", {}).get("value", "")
                prior = next((f for f in resources(db, wid, "finding", rid)
                              if f.data.get("dedupKey") == duplicate_key and all(key_fields)
                              and "unknown" not in key_fields and (
                                  application and application == f.data["values"].get("applicationUrl", {}).get("value")
                                  or not application and description and description == f.data["values"].get("description", {}).get("value"))), None)
                finding["dedupKey"] = duplicate_key
                if prior:
                    finding["status"] = "duplicate"
                    finding["duplicateGroupId"] = prior.id
                    prior.data = {**prior.data, "duplicateSources": list(set(prior.data.get("duplicateSources", []) + [page["url"]]))}
                put(db, wid, "finding", finding, parent=rid, rid=finding["id"])
                task.state = "succeeded"
                task.result = {"httpStatus": page["status"], "findingId": finding["id"], "bytes": page["bytes"], "finalUrl": page["url"]}
                usage["pagesFetched"] += 1
                if not already_accounted:
                    usage["downloadMb"] += page["bytes"] / 1e6
                domains = list(current.data.get("allowedDomains", []))
                reached = {hostname(t.payload["url"]) for t in db.scalars(select(Task).where(
                    Task.workspace_id == wid, Task.run_id == rid, Task.kind == "page", Task.state == "succeeded"))}
                usage["domainsReached"] = len(reached)
                depth = claimed["payload"]["depth"] + 1
                for link in page["links"]:
                    # Page count bounds the durable frontier, even when a site exposes thousands of URLs.
                    count = len(list(db.scalars(select(Task.id).where(Task.workspace_id == wid, Task.run_id == rid, Task.kind == "page"))))
                    if count >= current.data["limits"]["pages"]:
                        current.data = {**current.data, "stopReason": "Frontier page limit reached"}
                        break
                    url = link["url"]
                    target_host = hostname(url)
                    if target_host not in domains:
                        configured_domains = run["plan"].get("candidateDomains", [])
                        if configured_domains and target_host not in configured_domains:
                            continue
                        terms = [w.lower() for w in run["query"].split() if len(w) > 3]
                        relevant_link = any(w in (link["text"] + " " + url).lower() for w in terms)
                        if not relevant_link or len(domains) >= run["limits"]["domains"]:
                            continue
                        domains.append(target_host)
                    terms = [w.lower() for w in run["query"].split() if len(w) > 2]
                    priority = sum(w in (link["text"] + " " + url).lower() for w in terms)
                    new_task = add_task(db, wid, rid, "page", {"url": url, "depth": depth, "priority": priority,
                                                             "fromUrl": claimed["payload"]["url"]})
                    if depth > run["limits"]["depth"] and new_task.state == "ready":
                        new_task.state = "skipped"
                        new_task.result = {"reason": "Depth limit reached"}
                usage["pagesDiscovered"] = len(list(db.scalars(select(Task.id).where(Task.workspace_id == wid, Task.run_id == rid, Task.kind == "page"))))
                current.data = {**current.data, "usage": usage, "allowedDomains": domains}
                event(db, current, "page_fetched", f"Extracted {finding['evidenceCount']} supported fields", page["url"])
                if recipe:
                    event(db, current, "recipe_reused", "Approved structured recipe reused", page["url"])
                if finding["status"] in ("relevant", "incomplete"):
                    self.propose_recipe(db, wid, current, page)
        except Problem as exc:
            with self.session(wid) as db:
                run = need(db, wid, rid, "run", lock=True)
                task = db.scalar(select(Task).where(Task.id == claimed["id"], Task.workspace_id == wid).with_for_update())
                if not task or task.fencing_token != claimed["fence"] or task.state != "leased":
                    return
                task.result = {"reason": exc.code, "httpStatus": exc.status}
                if exc.code == "DOWNLOAD_CAP":
                    run.data = {**run.data, "stopReason": "Download limit reached"}
                gates = {"ACCESS_BARRIER": "login_mfa", "BOT_BARRIER": "captcha_bot_detector",
                         "AI_CAP_REACHED": "ai_cap_reached", "STORAGE_QUOTA": "storage_quota",
                         "RECIPE_DRIFT": "recipe_drift"}
                if exc.code in gates:
                    task.state = "blocked"
                    gate = {"id": uid(), "taskId": task.id, "blocker": gates[exc.code],
                            "title": "Your attention is needed", "reason": exc.detail,
                            "targetSite": hostname(task.payload["url"]),
                            "safeActions": (["connect_site"] if exc.code == "ACCESS_BARRIER" else []) + ["skip_task", "stop"]}
                    if exc.code == "RECIPE_DRIFT" and recipe:
                        saved_recipe = need(db, wid, recipe["id"], "recipe", lock=True)
                        saved_recipe.data = {**saved_recipe.data, "status": "needs_review",
                            "validation": {**saved_recipe.data["validation"], "driftDetected": True, "outcome": "failed", "driftReason": exc.detail}}
                        gate["recipeId"] = recipe["id"]
                        gate["safeActions"].insert(0, "review_recipe")
                    task.result = {**task.result, "gate": gate}
                    run.data = {**run.data, "status": "needs_attention", "activeGate": run.data.get("activeGate") or gate}
                    event(db, run, "human_gate", exc.detail)
                elif exc.retryable and task.attempts <= run.data["limits"]["retriesPerPage"]:
                    task.state = "ready"
                    event(db, run, "retry", f"Page retry scheduled ({task.attempts})", task.payload["url"])
                else:
                    task.state = "skipped" if exc.code in ("ROBOTS_DISALLOWED", "UNSUPPORTED_CONTENT", "SSRF_BLOCKED", "REDIRECT_SCOPE") else "failed"
                    event(db, run, "page_skipped" if task.state == "skipped" else "page_failed", exc.detail, task.payload["url"])
        except Exception as exc:
            with self.session(wid) as db:
                run = need(db, wid, rid, "run", lock=True)
                task = db.scalar(select(Task).where(Task.id == claimed["id"], Task.workspace_id == wid).with_for_update())
                if task and task.fencing_token == claimed["fence"] and task.state == "leased":
                    task.state = "ready" if task.attempts <= run.data["limits"]["retriesPerPage"] else "failed"
                    task.result = {"reason": "NETWORK_OR_WORKER_ERROR"}
                    event(db, run, "page_failed", f"Page attempt failed ({type(exc).__name__}); bounded retry policy applied")
        finally:
            heartbeat.cancel()
            await asyncio.gather(heartbeat, return_exceptions=True)

    def propose_recipe(self, db, wid, run, page):
        site = hostname(page["url"])
        existing = next((r for r in resources(db, wid, "recipe") if r.data["site"] == site and r.data["task"] == run.data["query"]), None)
        if existing:
            return
        selector = 'script[type="application/ld+json"]' if page["structured"] else "body"
        code = "# Read-only Playwright recipe; execute only after scope and robots checks.\n" + \
               "await page.goto(" + repr(page["url"]) + ")\n" + \
               "content = await page.locator(" + repr(selector) + ").all_text_contents()\n"
        put(db, wid, "recipe", {"site": site, "task": run.data["query"], "version": 1, "status": "draft",
             "fields": run.data["plan"]["fields"], "relevance": run.data["relevance"],
             "actions": [{"order": 1, "type": "navigate", "target": page["url"], "description": "Open scoped source page"},
                         {"order": 2, "type": "extract", "target": selector, "description": "Read source text without submitting forms"}],
             "validation": {"samplePages": [page["url"]], "outcome": "pending", "driftDetected": False},
             "codeExportAvailable": True, "codeSnippet": code, "sourceRunId": run.id,
             "sourceDigest": hashlib.sha256(page["text"].encode()).hexdigest()})

    async def report(self, state):
        wid, rid = state["workspace_id"], state["run_id"]
        with self.session(wid) as db:
            run = need(db, wid, rid, "run", lock=True)
            if run.data["status"] != "running":
                return {}
            tasks = list(db.scalars(select(Task).where(Task.workspace_id == wid, Task.run_id == rid, Task.kind == "page")))
            pending = any(t.state in ("ready", "leased", "blocked") for t in tasks)
            failed = any(t.state == "failed" for t in tasks)
            status = "partial" if pending or failed or run.data.get("stopReason") else "complete"
            if not tasks:
                status = "partial"
            usage = {**run.data["usage"], "pagesSkipped": sum(t.state == "skipped" for t in tasks),
                     "pagesFailed": sum(t.state == "failed" for t in tasks),
                     "pagesBlocked": sum(t.state == "blocked" for t in tasks),
                     "elapsedSeconds": active_seconds(run.data)}
            for task in tasks:
                if task.state == "ready":
                    task.state = "skipped"
                    task.result = {"reason": run.data.get("stopReason") or "Run ended before task execution"}
            usage["pagesSkipped"] = sum(t.state == "skipped" for t in tasks)
            run.data = {**run.data, "status": status, "finishedAt": now(), "usage": usage,
                        "stopReason": run.data.get("stopReason") or ("Some pages failed" if failed else None)}
            event(db, run, "completion", f"Run {status}; coverage and completed findings retained")
        return {}
