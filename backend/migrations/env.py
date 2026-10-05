from alembic import context
from sqlalchemy import create_engine
from daleel.db import Base
import os

config = context.config
url = os.environ.get("DALEEL_MIGRATION_DATABASE_URL") or os.environ.get("DALEEL_DATABASE_URL")
if not url:
    raise RuntimeError("Set DALEEL_MIGRATION_DATABASE_URL to the schema owner connection")
engine = create_engine(url)
with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
