# Daleel production readiness — 2026-10-06

**Status: release blocked; not yet production ready.**

## Completed this pass

- Created GCP project `daleel-prod-20261006-c719` under the approved account; linked the approved billing account.
- Enabled Run, Build, Artifact Registry, Secret Manager, IAM Credentials and Scheduler APIs; created private registry in europe-west1.
- Durable dispatch retries and scheduled recovery; stale planning is surfaced as failed.
- Database transaction fencing for worker ownership, heartbeat cancellation and active execution deadlines.
- Human pauses excluded from crawl time; workspace admission limits and request-size bounds.
- AI accounting rejects negative/non-finite usage; cancelled model requests retain uncertain charges.
- Separate broker settings, existing-account invitation flow, password-reset completion and support-view expiry.
- Combined frontend/API production image; migration, pinned secret versions, candidate smoke gate and recovery schedule in release workflow.
- Added real PostgreSQL RLS verification to CI and real HTTP client checks to the frontend suite.

## Observed verification

| Check | Result |
|---|---|
| Backend pytest | 26 passed; 3 PostgreSQL checks skipped locally |
| Frontend Vitest | 11 passed |
| TypeScript compilation | Passed |
| Python lint | Passed |
| Production Vite bundle | Passed |
| PostgreSQL migrations and RLS policies | Passed in GitHub CI on PostgreSQL 17 |
| PostgreSQL checkpoint recovery | Pending hosted execution |
| Container build | Pending Docker engine or cloud build |
| Real Neon invite, JWT, reset, storage | Pending provider setup |
| Live AI/search and cost reconciliation | Pending keys and model selection |
| Cloud Run deployment smoke / worker restart | Pending deployment |
| Backup restore | Pending provider configuration and restore exercise |

## External blockers

Browser automation failed to start because its sandbox helper reports setup refresh errors; the user is restoring browser access. Docker Desktop did not expose its Linux engine despite starting its UI and CLI. PostgreSQL migration/RLS checks passed on GitHub’s disposable PostgreSQL 17 service. Frontend CI failed at clean installation on Node 22; the pipeline and image builder are being aligned to the locally verified Node 24 runtime. No secrets were requested in chat or added to Git.

## Remaining release work

1. Create/configure Neon database/auth/object storage and separate runtime role; verify actual JWT claims, issuer and audience.
2. Configure Groq/OpenRouter/search credentials and routes in ignored files/Secret Manager.
3. Provision scoped deployment/runtime/migration/scheduler accounts, GitHub workload identity and environment variables.
4. Execute PostgreSQL/container/provider/cloud smoke and recovery checks; fix failures.
5. Configure alerts, billing limits where available and database/object retention; perform and record a backup restore.
6. Configure and verify domain-specific browser adapters and broker deployment. Current in-memory broker needs one instance and can lose connections during restarts; a durable routing/session design is required before claiming resilient hosted sign-in.
7. Review deletion failure recovery, artifact orphan cleanup, recipe repair for drift, authenticated recipe replay and extraction quality evaluation before claiming every requested workflow production-ready.

The passing tests establish specific local behavior; they do not establish live provider compatibility, deployment reliability or complete production readiness.
