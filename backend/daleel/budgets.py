import math
from datetime import datetime, timezone
from sqlalchemy import select
from .db import Spend, Workspace, resource, uid
from .errors import Problem


class Budget:
    def __init__(self, database):
        self.database = database

    def reserve(self, wid, run_id, provider, amount, purpose):
        micros = math.ceil(amount * 1_000_000)
        period = datetime.now(timezone.utc).strftime("%Y-%m")
        with self.database.session(wid) as db:
            # All cost admissions lock the workspace first, then the run, in the same order.
            if self.database.engine.dialect.name == "sqlite":
                db.connection().exec_driver_sql("BEGIN IMMEDIATE")
            workspace = db.scalar(select(Workspace).where(Workspace.id == wid).with_for_update())
            run = resource(db, wid, run_id, "run", lock=True)
            entries = list(db.scalars(select(Spend).where(Spend.workspace_id == wid)))
            def charge(entry):
                return entry.reserved_micros if entry.state in ("reserved", "uncertain") else entry.actual_micros
            monthly = sum(charge(e) for e in entries if e.period == period)
            per_run = sum(charge(e) for e in entries if e.run_id == run_id)
            cap_run = int(run.data["aiUsageCapUsd"] * 1_000_000)
            cap_month = int(workspace.data.get("monthlyAiUsd", 5) * 1_000_000)
            if micros + per_run > cap_run or micros + monthly > cap_month:
                raise Problem(409, "AI_CAP_REACHED", "Remaining run or monthly AI allowance cannot cover this call")
            entry = Spend(id=uid(), workspace_id=wid, run_id=run_id, period=period,
                          provider=provider, reserved_micros=micros, actual_micros=0,
                          state="reserved", metadata_json={"purpose": purpose})
            db.add(entry)
            return entry.id

    def settle(self, wid, entry_id, actual=None, metadata=None, rejected=False):
        with self.database.session(wid) as db:
            entry = db.scalar(select(Spend).where(Spend.id == entry_id, Spend.workspace_id == wid).with_for_update())
            if entry.state != "reserved":
                return
            entry.state = "uncertain" if actual is None and not rejected else "settled"
            entry.actual_micros = math.ceil((actual or 0) * 1_000_000)
            entry.metadata_json = {**entry.metadata_json, **(metadata or {}),
                                   "overrun": entry.actual_micros > entry.reserved_micros}

    def totals(self, db, wid, run_id=None):
        query = select(Spend).where(Spend.workspace_id == wid)
        if run_id:
            query = query.where(Spend.run_id == run_id)
        else:
            query = query.where(Spend.period == datetime.now(timezone.utc).strftime("%Y-%m"))
        entries = list(db.scalars(query))
        return (sum(e.reserved_micros for e in entries if e.state in ("reserved", "uncertain")) / 1e6,
                sum(e.actual_micros for e in entries) / 1e6)
