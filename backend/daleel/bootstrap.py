"""Provision checkpoint tables with owner credentials, then grant runtime access."""
import asyncio
import os
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from sqlalchemy import create_engine, text


async def main():
    url = os.environ["DALEEL_MIGRATION_DATABASE_URL"]
    async with AsyncPostgresSaver.from_conn_string(url.replace("postgresql+psycopg://", "postgresql://")) as saver:
        await saver.setup()
    engine = create_engine(url)
    with engine.begin() as db:
        for table in ("checkpoints", "checkpoint_blobs", "checkpoint_writes", "checkpoint_migrations"):
            db.execute(text(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO daleel_app"))
    engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
