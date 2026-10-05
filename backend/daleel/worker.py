"""One run per Cloud Run Job; --recover scans the durable ledger for local development."""
import argparse
import asyncio
import time
from .app import make_app


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id")
    parser.add_argument("--workspace-id")
    parser.add_argument("--recover", action="store_true")
    args = parser.parse_args()
    app = make_app()
    app.state.database.init()
    if args.recover:
        await app.state.runtime.recover()
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
