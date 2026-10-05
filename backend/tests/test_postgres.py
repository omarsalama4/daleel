"""Real PostgreSQL policy checks. CI owns a disposable database for this suite."""
import os
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError

from daleel.db import uid

OWNER_URL = os.environ.get("DALEEL_TEST_POSTGRES_URL")
pytestmark = pytest.mark.skipif(not OWNER_URL, reason="Disposable PostgreSQL not configured")


@pytest.fixture(scope="module")
def engine():
    env = {**os.environ, "DALEEL_MIGRATION_DATABASE_URL": OWNER_URL}
    config = Path(__file__).resolve().parents[1] / "alembic.ini"
    subprocess.run([sys.executable, "-m", "alembic", "-c", str(config), "upgrade", "head"],
                   env=env, check=True, capture_output=True)
    result = create_engine(OWNER_URL, hide_parameters=True)
    yield result
    result.dispose()


@pytest.fixture
def tenants(engine):
    first, second = uid(), uid()
    with engine.begin() as db:
        for wid in (first, second):
            db.execute(text("INSERT INTO workspaces (id,subject,email,data) VALUES (:id,:id,:email,'{}')"),
                       {"id": wid, "email": wid + "@test.invalid"})
            db.execute(text("INSERT INTO resources (id,workspace_id,kind,data,created_at) "
                            "VALUES (:id,:wid,'run','{}','2026-10-06')"), {"id": uid(), "wid": wid})
    yield first, second
    with engine.begin() as db:
        for wid in (first, second):
            db.execute(text("DELETE FROM resources WHERE workspace_id=:wid"), {"wid": wid})
            db.execute(text("DELETE FROM workspaces WHERE id=:wid"), {"wid": wid})


def test_unscoped_runtime_cannot_read_tenant_rows(engine, tenants):
    with engine.begin() as db:
        db.execute(text("SET LOCAL ROLE daleel_app"))
        assert db.scalar(text("SELECT count(*) FROM resources")) == 0
        assert not db.scalar(text("SELECT rolbypassrls OR rolsuper FROM pg_roles WHERE rolname=current_user"))


def test_workspace_read_write_isolation(engine, tenants):
    first, second = tenants
    with engine.begin() as db:
        db.execute(text("SET LOCAL ROLE daleel_app"))
        db.execute(text("SELECT set_config('daleel.workspace_id', :wid, true)"), {"wid": first})
        assert db.execute(text("SELECT workspace_id FROM resources")).scalars().all() == [first]
        assert db.execute(text("UPDATE resources SET kind='finding' WHERE workspace_id=:wid"),
                          {"wid": second}).rowcount == 0
        assert db.execute(text("DELETE FROM resources WHERE workspace_id=:wid"), {"wid": second}).rowcount == 0
    with pytest.raises(DBAPIError):
        with engine.begin() as db:
            db.execute(text("SET LOCAL ROLE daleel_app"))
            db.execute(text("SELECT set_config('daleel.workspace_id', :wid, true)"), {"wid": first})
            db.execute(text("INSERT INTO resources(id,workspace_id,kind,data,created_at) "
                            "VALUES (:id,:wid,'run','{}','2026-10-06')"), {"id": uid(), "wid": second})


def test_context_resets_and_audit_is_append_only(engine, tenants):
    with engine.begin() as db:
        db.execute(text("SET LOCAL ROLE daleel_app"))
        db.execute(text("SELECT set_config('daleel.workspace_id', :wid, true)"), {"wid": tenants[0]})
    with engine.begin() as db:
        db.execute(text("SET LOCAL ROLE daleel_app"))
        assert db.scalar(text("SELECT count(*) FROM resources")) == 0
    with pytest.raises(DBAPIError):
        with engine.begin() as db:
            db.execute(text("SET LOCAL ROLE daleel_app"))
            db.execute(text("DELETE FROM audit"))


@pytest.mark.parametrize("table", ["resources", "tasks", "spend", "session_secrets", "idempotency", "run_leases"])
def test_every_tenant_table_enforces_policy(engine, table):
    with engine.begin() as db:
        assert db.scalar(text("SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass(:table)"), {"table": table})
        policy = db.execute(text("SELECT qual,with_check FROM pg_policies WHERE tablename=:table"), {"table": table}).one()
        assert "daleel.workspace_id" in policy.qual
        assert "daleel.workspace_id" in policy.with_check
        db.execute(text("SET LOCAL ROLE daleel_app"))
        assert db.scalar(text(f"SELECT count(*) FROM {table}")) == 0
