"""Durable, idempotent cleanup of artifacts, checkpoints and tenant records."""
import asyncio
import copy
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, delete

from .db import Resource, Share, Task, Idempotency, RunLease, resource, put, now, uid
from .errors import Problem
from .services import TERMINAL


class Deletions:
    def __init__(self, database, artifacts, purge_checkpoint, settings):
        self.database, self.artifacts = database, artifacts
        self.purge_checkpoint, self.settings = purge_checkpoint, settings

    def request(self, wid, rid, kind):
        with self.database.session(wid) as db:
            target = resource(db, wid, rid, kind, lock=True)
            if not target:
                raise Problem(404, "NOT_FOUND", "Deletion target unavailable")
            if target.data.get("deletionJobId"):
                return target.data["deletionJobId"]
            if kind == "run":
                if target.data["status"] not in TERMINAL | {"awaiting_approval", "paused"}:
                    raise Problem(409, "RUN_ACTIVE", "Cancel the run before deleting it")
                lease = db.get(RunLease, rid)
                if lease and lease.expires_at > now():
                    raise Problem(409, "WORKER_DRAINING", "Worker is still stopping; retry deletion", True)
            items = {rid: target}
            frontier = [rid]
            while frontier:
                children = list(db.scalars(select(Resource).where(Resource.workspace_id == wid,
                    Resource.parent_id.in_(frontier))))
                frontier = [r.id for r in children if r.id not in items]
                items.update({r.id: r for r in children})
            job_id = uid()
            put(db, wid, "deletion", {"state": "queued", "requestedAt": now(), "completedAt": None,
                "scope": [kind, rid], "recordIds": list(items),
                "artifactIds": [r.id for r in items.values() if r.kind == "export"],
                "checkpointPending": kind == "run", "attempts": 0, "claimUntil": None,
                "claimOwner": None, "retryAt": None, "backupExpiryAt": None,
                "tracePurgeState": "provider_limited" if self.settings.otlp_endpoint else "not_applicable"}, rid=job_id)
            # Remove live capabilities immediately; retain a durable cleanup manifest.
            for item in items.values():
                item.data = {**item.data, "deletionRequestedAt": now(), "deletionJobId": job_id}
                if item.kind == "export":
                    item.data = {**item.data, "downloadTokenHash": "", "expiresAt": now()}
            db.execute(delete(Share).where(Share.owner_id == wid, Share.resource_id.in_(list(items))))
            return job_id

    async def process(self, wid, job_id):
        owner = uid()
        with self.database.session(wid) as db:
            job = resource(db, wid, job_id, "deletion", lock=True)
            if not job:
                raise Problem(404, "NOT_FOUND", "Deletion job unavailable")
            if job.data["state"] == "complete" or (job.data.get("claimUntil") or "") > now():
                return self.public(job.data)
            if (job.data.get("retryAt") or "") > now():
                return self.public(job.data)
            job.data = {**job.data, "state": "in_progress", "attempts": job.data["attempts"] + 1,
                "claimOwner": owner, "claimUntil": self.expiry()}
            data = copy.deepcopy(job.data)
        try:
            if data["checkpointPending"]:
                await self.purge_checkpoint(wid, data["scope"][1])
                with self.database.session(wid) as db:
                    job = self.owned(db, wid, job_id, owner)
                    job.data = {**job.data, "checkpointPending": False, "claimUntil": self.expiry()}
            for artifact_id in data["artifactIds"]:
                await asyncio.to_thread(self.artifacts.delete, wid, artifact_id)
                with self.database.session(wid) as db:
                    job = self.owned(db, wid, job_id, owner)
                    job.data = {**job.data, "artifactIds": [i for i in job.data["artifactIds"] if i != artifact_id],
                        "claimUntil": self.expiry()}
            with self.database.session(wid) as db:
                job = self.owned(db, wid, job_id, owner)
                if job.data["scope"][0] == "run":
                    rid = job.data["scope"][1]
                    db.execute(delete(Task).where(Task.workspace_id == wid, Task.run_id == rid))
                    db.execute(delete(RunLease).where(RunLease.workspace_id == wid, RunLease.run_id == rid))
                db.execute(delete(Idempotency).where(Idempotency.workspace_id == wid,
                    Idempotency.resource_id.in_(job.data["recordIds"])))
                db.execute(delete(Resource).where(Resource.workspace_id == wid, Resource.id.in_(job.data["recordIds"])))
                job.data = {**job.data, "state": "complete", "completedAt": now(), "claimOwner": None,
                    "claimUntil": None, "recordIds": [], "lastError": None}
                return self.public(job.data)
        except asyncio.CancelledError:
            # A crashed/cancelled processor is reclaimed after its claim expires.
            raise
        except Exception as exc:
            with self.database.session(wid) as db:
                job = resource(db, wid, job_id, "deletion", lock=True)
                if job and job.data.get("claimOwner") == owner:
                    job.data = {**job.data, "state": "queued", "claimOwner": None, "claimUntil": None,
                        "retryAt": (datetime.now(timezone.utc) + timedelta(seconds=60)).isoformat(),
                        "lastError": "Cleanup interrupted; retry scheduled (" + type(exc).__name__ + ")"}
                    return self.public(job.data)
            raise

    def owned(self, db, wid, job_id, owner):
        job = resource(db, wid, job_id, "deletion", lock=True)
        if not job or job.data.get("claimOwner") != owner:
            raise Problem(409, "DELETION_LEASE_LOST", "Another processor owns cleanup")
        return job

    @staticmethod
    def expiry():
        return (datetime.now(timezone.utc) + timedelta(minutes=3)).isoformat()

    @staticmethod
    def public(data):
        return {k: v for k, v in data.items() if k not in ("claimOwner", "claimUntil", "recordIds", "artifactIds", "checkpointPending")}

    async def recover(self, wid):
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        with self.database.session(wid) as db:
            abandoned = [r.id for r in db.scalars(select(Resource).where(Resource.workspace_id == wid,
                Resource.kind == "export")) if r.data.get("state") == "uploading"
                and not r.data.get("deletionJobId") and r.data.get("createdAt", "") < cutoff]
        for export_id in abandoned:
            self.request(wid, export_id, "export")
        with self.database.session(wid) as db:
            ids = [r.id for r in db.scalars(select(Resource).where(Resource.workspace_id == wid,
                Resource.kind == "deletion")) if r.data["state"] in ("queued", "in_progress")][:50]
        for job_id in ids:
            await self.process(wid, job_id)
