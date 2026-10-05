# Daleel production readiness — 2026-10-06

**Status: release blocked; not yet production ready.**

## Latest continuation

- Neon CLI authorization succeeded using an ignored directory with restricted Windows permissions. The available organization is Vercel-managed; Neon rejected creating the dedicated Daleel project there. A directly managed free Neon organization/project is required.
- Added durable deletion manifests, immediate capability revocation, cleanup retries and recovery of abandoned export uploads.
- Added recipe repair versions, renewed preview/approval, explicitly selected authenticated replay, actual history comparison and Python script downloads.
- Local verification: 40 backend checks passed (10 PostgreSQL checks require CI), 12 frontend checks passed, lint/type checks and production build passed. Live-provider and deployed checks remain pending.

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
| Backend pytest | 32 passed locally; all 42 passed in CI including 10 real PostgreSQL checks |
| Frontend Vitest | 11 passed |
| Dependency advisories | npm audit and pinned backend pip-audit found no known vulnerabilities |
| TypeScript compilation | Passed |
| Python lint | Passed |
| Production Vite bundle | Passed |
| PostgreSQL migrations and RLS policies | Passed in GitHub CI on PostgreSQL 17 |
| PostgreSQL checkpoint recovery | Pending hosted execution |
| Container build and Chromium smoke | Passed in GitHub CI |
| Real Neon invite, JWT, reset, storage | Pending provider setup |
| Live AI/search and cost reconciliation | Pending keys and model selection |
| Cloud Run deployment smoke / worker restart | Pending deployment |
| Backup restore | Pending provider configuration and restore exercise |

Separate runtime, migration, scheduler and deployment service accounts were created in the project. Restricted GitHub workload identity is created and its deployment impersonation binding is approved/applied. The user approved deploy/IAM_PLAN.md. Secret, build, bucket, registry, deployment and account-user bindings are applied. Job-specific bindings are prepared in the release workflow; jobs do not exist yet. Empty secret containers exist without values.

## External blockers

Browser automation failed to start because its sandbox helper reports setup refresh errors; the user is restoring browser access. Docker Desktop did not expose its Linux engine despite starting its UI and CLI. PostgreSQL migration/RLS checks passed on GitHub’s disposable PostgreSQL 17 service. Frontend clean installation, production build and tests now pass in CI after aligning to the locally verified Node 24 runtime. CI run 37386497753 (commit 089e445) passed backend, frontend and container jobs, including dependency audit gates, including PostgreSQL 17 policy/runtime-role checks and Chromium smoke. No secrets were requested in chat or added to Git.

## Remaining release work

1. Create/configure Neon database/auth/object storage and separate runtime role; verify actual JWT claims, issuer and audience.
2. Configure Groq/OpenRouter/search credentials and routes in ignored files/Secret Manager.
3. Configure GitHub beta environment variables using deploy/github-variables.example.json; project-level IAM is applied and job-specific bindings are automated in release.
4. Execute live-provider and deployed cloud smoke/recovery checks; fix failures. PostgreSQL policy and container checks already pass in CI.
5. Configure alerts, billing limits where available and database/object retention; perform and record a backup restore.
6. Configure and verify domain-specific browser adapters and broker deployment. Current in-memory broker needs one instance and can lose connections during restarts; a durable routing/session design is required before claiming resilient hosted sign-in.
7. Verify deletion/upload recovery and authenticated recipe replay against hosted services; run extraction quality evaluations. Local failure recovery and recipe repair checks now pass.

The passing tests establish specific local behavior; they do not establish live provider compatibility, deployment reliability or complete production readiness.

Final code verification: https://github.com/omarsalama4/daleel/actions/runs/37386497753
