"""One run per Cloud Run Job; --recover scans the durable ledger for local development."""
import argparse
import asyncio
import time
from sqlalchemy import select
from .app import make_app
from .db import Workspace, resources


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id")
    parser.add_argument("--workspace-id")
    parser.add_argument("--recover", action="store_true")
    args = parser.parse_args()
    app = make_app()
    app.state.database.init()
    if args.recover:
        with app.state.database.session() as db:
            workspaces = [w.id for w in db.scalars(select(Workspace))]
        for wid in workspaces:
            with app.state.database.session(wid) as db:
                run_ids = [r.id for r in resources(db, wid, "run") if r.data["status"] in ("queued", "running")]
            for rid in run_ids:
                await app.state.runtime.execute(wid, rid)
    elif args.run_id and args.workspace_id:
        deadline = time.monotonic() + 90
        while await app.state.runtime.execute(args.workspace_id, args.run_id) is False:
            if time.monotonic() > deadline:
                raise RuntimeError("Another worker still owns the run; recovery dispatch required")
            await asyncio.sleep(3)
    else:
        parser.error("Provide both --workspace-id and --run-id, or --recover")


if __name__ == "__main__":
    asyncio.run(main())
