"""Initial control plane schema, tenant policies, and metadata-only functions."""
from alembic import op
from daleel.db import Base

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    Base.metadata.create_all(bind)
    if bind.dialect.name != "postgresql":
        return
    op.execute("""DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='daleel_app') THEN
        CREATE ROLE daleel_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
      END IF;
    END $$""")
    for table in ("resources", "tasks", "spend", "session_secrets", "idempotency", "run_leases"):
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
        op.execute(f"""CREATE POLICY workspace_isolation ON {table}
          USING (workspace_id = nullif(current_setting('daleel.workspace_id', true), ''))
          WITH CHECK (workspace_id = nullif(current_setting('daleel.workspace_id', true), ''))""")
    # Runtime connections use a non-owner role. The schema owner can access aggregate
    # metadata in the narrowly scoped functions below; its credentials stay out of runtime.
    op.execute("GRANT USAGE ON SCHEMA public TO daleel_app")
    op.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
    for table in Base.metadata.tables:
        if table != "audit":
            op.execute(f'GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO daleel_app')
    op.execute("GRANT SELECT, INSERT ON audit TO daleel_app")
    op.execute("""CREATE FUNCTION daleel_storage_bytes() RETURNS bigint
      LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
      SELECT coalesce(sum(octet_length(data::text) + coalesce((data->>'artifactBytes')::bigint,0)),0)::bigint
      FROM resources $$""")
    op.execute("""CREATE FUNCTION daleel_export_workspace(rid text, digest text) RETURNS text
      LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
      SELECT workspace_id FROM resources WHERE id=rid AND kind='export'
        AND data->>'downloadTokenHash'=digest AND data->>'expiresAt'>to_char(now() AT TIME ZONE 'UTC',
        'YYYY-MM-DD\"T\"HH24:MI:SS') LIMIT 1 $$""")
    op.execute("""CREATE FUNCTION daleel_workspace_metadata(wid text) RETURNS json
      LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
      SELECT json_build_object('activeRuns',count(*) FILTER(WHERE kind='run' AND data->>'status' IN ('queued','running')),
        'pausedRuns',count(*) FILTER(WHERE kind='run' AND data->>'status' IN ('paused','needs_attention')),
        'lastRunAt',max(created_at) FILTER(WHERE kind='run'),
        'storageUsedMb',coalesce(sum(octet_length(data::text)+coalesce((data->>'artifactBytes')::bigint,0)),0)/1000000.0)
      FROM resources WHERE workspace_id=wid $$""")
    for signature in ('daleel_storage_bytes()', 'daleel_export_workspace(text,text)', 'daleel_workspace_metadata(text)'):
        op.execute(f'REVOKE ALL ON FUNCTION {signature} FROM PUBLIC')
        op.execute(f'GRANT EXECUTE ON FUNCTION {signature} TO daleel_app')


def downgrade():
    raise RuntimeError("Destructive schema downgrade is disabled. Restore a backup instead.")
