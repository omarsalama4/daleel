from contextlib import contextmanager
from datetime import datetime, timezone
import uuid
from pathlib import Path
from sqlalchemy import (create_engine, String, Integer, JSON, Text, ForeignKey, UniqueConstraint,
                        Index, select, text, event)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


def now():
    return datetime.now(timezone.utc).isoformat()


def uid():
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Workspace(Base):
    __tablename__ = "workspaces"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    subject: Mapped[str] = mapped_column(String(255), unique=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class Resource(Base):
    __tablename__ = "resources"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), index=True, nullable=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[str] = mapped_column(String(40), default=now, index=True)


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (UniqueConstraint("run_id", "key"), Index("task_ready", "run_id", "state", "lease_until"))
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    run_id: Mapped[str] = mapped_column(String(36), index=True)
    key: Mapped[str] = mapped_column(String(64))
    kind: Mapped[str] = mapped_column(String(40))
    payload: Mapped[dict] = mapped_column(JSON)
    dependencies: Mapped[list] = mapped_column(JSON, default=list)
    state: Mapped[str] = mapped_column(String(20), default="ready")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    fencing_token: Mapped[int] = mapped_column(Integer, default=0)
    lease_until: Mapped[str | None] = mapped_column(String(40), nullable=True)
    result: Mapped[dict] = mapped_column(JSON, default=dict)


class Spend(Base):
    __tablename__ = "spend"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    run_id: Mapped[str] = mapped_column(String(36), index=True)
    period: Mapped[str] = mapped_column(String(7), index=True)
    reserved_micros: Mapped[int] = mapped_column(Integer)
    actual_micros: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[str] = mapped_column(String(20), default="reserved")
    provider: Mapped[str] = mapped_column(String(40))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class Invitation(Base):
    __tablename__ = "invitations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str] = mapped_column(String(320), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    data: Mapped[dict] = mapped_column(JSON)


class Share(Base):
    __tablename__ = "shares"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    recipient_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    resource_id: Mapped[str] = mapped_column(String(36))
    data: Mapped[dict] = mapped_column(JSON)


class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(String(36))
    data: Mapped[dict] = mapped_column(JSON)


class Idempotency(Base):
    __tablename__ = "idempotency"
    __table_args__ = (UniqueConstraint("workspace_id", "key", "operation"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"))
    key: Mapped[str] = mapped_column(String(200))
    operation: Mapped[str] = mapped_column(String(100))
    fingerprint: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str] = mapped_column(String(36))


class Secret(Base):
    __tablename__ = "session_secrets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"))
    ciphertext: Mapped[str] = mapped_column(Text)


class RunLease(Base):
    __tablename__ = "run_leases"
    run_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    owner: Mapped[str] = mapped_column(String(36))
    expires_at: Mapped[str] = mapped_column(String(40))


class Database:
    def __init__(self, settings):
        self.settings = settings
        if settings.database_url.startswith("sqlite"):
            Path("data").mkdir(exist_ok=True)
        args = {"check_same_thread": False, "timeout": 30} if settings.database_url.startswith("sqlite") else {}
        self.engine = create_engine(settings.database_url, connect_args=args, pool_pre_ping=True, hide_parameters=True)
        if self.engine.dialect.name == "sqlite":
            @event.listens_for(self.engine, "connect")
            def sqlite_config(connection, _):
                connection.execute("PRAGMA foreign_keys=ON")
                connection.execute("PRAGMA journal_mode=WAL")
        self.Session = sessionmaker(self.engine, expire_on_commit=False)

    def init(self):
        if self.settings.env != "production":
            Base.metadata.create_all(self.engine)
        else:
            with self.engine.connect() as db:
                unsafe = db.scalar(text("""SELECT rolsuper OR rolbypassrls OR EXISTS (
                  SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename IN
                  ('resources','tasks','spend','session_secrets','idempotency','run_leases')
                  AND pg_has_role(current_user,tableowner,'MEMBER'))
                  FROM pg_roles WHERE rolname=current_user"""))
                if unsafe:
                    raise RuntimeError("Production database connection must be a non-owner NOBYPASSRLS role")
                for table in ("resources", "tasks", "spend", "session_secrets", "idempotency", "run_leases"):
                    if not db.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(:table)"), {"table": table}):
                        raise RuntimeError("Workspace RLS migration is required for every tenant table")

    @contextmanager
    def session(self, workspace_id=None):
        with self.Session() as db:
            if workspace_id and self.engine.dialect.name == "postgresql":
                db.execute(text("SELECT set_config('daleel.workspace_id', :wid, true)"), {"wid": workspace_id})
            try:
                yield db
                db.commit()
            except BaseException:
                db.rollback()
                raise


def resource(db, wid, rid, kind=None, lock=False):
    if lock:
        db.scalar(select(Workspace).where(Workspace.id == wid).with_for_update())
    query = select(Resource).where(Resource.id == rid, Resource.workspace_id == wid)
    if kind:
        query = query.where(Resource.kind == kind)
    if lock:
        query = query.with_for_update()
    return db.scalar(query)


def resources(db, wid, kind, parent=None):
    query = select(Resource).where(Resource.workspace_id == wid, Resource.kind == kind)
    if parent is not None:
        query = query.where(Resource.parent_id == parent)
    return [r for r in db.scalars(query.order_by(Resource.created_at.desc(), Resource.id)) if not r.data.get("deletionRequestedAt")]


def put(db, wid, kind, data, parent=None, rid=None):
    rid = rid or uid()
    item = Resource(id=rid, workspace_id=wid, kind=kind, parent_id=parent,
                    data={**data, "id": rid})
    db.add(item)
    db.flush()
    return item
