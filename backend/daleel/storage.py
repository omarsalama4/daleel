import json
import boto3
from .errors import Problem


class Artifacts:
    def __init__(self, settings):
        self.settings = settings
        self.root = settings.storage_root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.s3 = None
        if settings.storage_mode == "s3":
            self.s3 = boto3.client("s3", endpoint_url=settings.s3_endpoint or None,
                                   aws_access_key_id=settings.s3_access_key or None,
                                   aws_secret_access_key=settings.s3_secret_key or None)

    def key(self, wid, rid):
        import uuid
        # Artifact keys are generated identifiers, never user-controlled filesystem paths.
        return f"{uuid.UUID(wid)}/{uuid.UUID(rid)}"

    def write(self, wid, rid, content: bytes, content_type):
        key = self.key(wid, rid)
        if self.s3:
            self.s3.put_object(Bucket=self.settings.s3_bucket, Key=key, Body=content, ContentType=content_type)
        else:
            path = self.root / key
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        return len(content)

    def read(self, wid, rid):
        key = self.key(wid, rid)
        if self.s3:
            return self.s3.get_object(Bucket=self.settings.s3_bucket, Key=key)["Body"].read()
        return (self.root / key).read_bytes()

    def delete(self, wid, rid):
        key = self.key(wid, rid)
        if self.s3:
            self.s3.delete_object(Bucket=self.settings.s3_bucket, Key=key)
        else:
            (self.root / key).unlink(missing_ok=True)


def storage_usage(items):
    categories = {"resultsMb": 0, "evidenceArtifactsMb": 0, "workflowsMb": 0,
                  "runHistoryMb": 0, "sessionsMb": 0}
    for item in items:
        size = len(json.dumps(item.data, ensure_ascii=False).encode()) + item.data.get("artifactBytes", 0)
        category = ("resultsMb" if item.kind == "finding" else "workflowsMb" if item.kind in ("workflow", "recipe")
                    else "sessionsMb" if item.kind in ("session", "connection") else "evidenceArtifactsMb"
                    if item.kind == "export" else "runHistoryMb")
        categories[category] += size / 1_000_000
    return {"usedMb": sum(categories.values()), "quotaMb": 500, "warningAtPercent": 80, "categories": categories}


def require_storage(db, wid, additional=0):
    from sqlalchemy import select
    from .db import Workspace, Resource
    db.scalar(select(Workspace).where(Workspace.id == wid).with_for_update())
    own = list(db.scalars(select(Resource).where(Resource.workspace_id == wid)))
    if storage_usage(own)["usedMb"] + additional / 1_000_000 > 500:
        raise Problem(409, "STORAGE_QUOTA", "Workspace storage quota is reached; delete data to continue")
    # Global quota is checked using a separate metadata-only aggregate in PostgreSQL migrations.
    if db.bind.dialect.name == "postgresql":
        from sqlalchemy import text
        db.execute(text("SELECT pg_advisory_xact_lock(7316452)"))
        used = db.scalar(text("SELECT daleel_storage_bytes()"))
        if used + additional > 4_000_000_000:
            raise Problem(409, "STORAGE_QUOTA", "The beta evidence storage capacity is reached")
    else:
        all_items = list(db.scalars(select(Resource)))
        if storage_usage(all_items)["usedMb"] + additional / 1_000_000 > 4000:
            raise Problem(409, "STORAGE_QUOTA", "The beta evidence storage capacity is reached")
