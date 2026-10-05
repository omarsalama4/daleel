# Backend and AI implementation status

Date: 2026-10-06. This report supersedes the earlier statement that Daleel has no backend.

## Delivered

| Area | Implementation |
| --- | --- |
| API | FastAPI endpoints for runs, plans, gates, activity, findings, feedback, coverage, exports, workflows, recipes, sessions, shares, settings, invitations and operator support |
| Persistence | SQLAlchemy tables for workspace resources, durable tasks, spend reservations, invitations, shares, append-only audit permissions, encrypted sessions, idempotency and run leases |
| PostgreSQL | Alembic schema, workspace RLS policies, separate runtime role, metadata-only storage/export/support functions, checkpoint bootstrap |
| Execution | LangGraph discovery → bounded crawl/extraction → human interrupt or coverage report, with checkpoint persistence and task fencing |
| AI | Explicit Groq/OpenRouter adapters, structured Pydantic outputs, uncertain billing reservation retention, per-run and monthly admission |
| Crawling | DNS-pinned HTTP, robots enforcement, scoped redirects, multilingual HTML/plain text, bounded retries and quotas, relevance-prioritized detail link traversal |
| Browser | Optional scoped read-only JavaScript renderer; separate user-operated browser broker with expiring viewer and reviewed signed-in selectors |
| Findings | Query-specific schema, evidence excerpts and digests, Unknown fields, relevance signal, conservative duplicate groups and source preservation |
| Reuse | Explicit workflow saving/versioning; declarative recipe draft → preview → approval → successful replay → reuse; selector drift creates a human gate |
| Frontend | Live API default, Neon SDK sign-in, local development auth, real session protocol, exact gate resolution, actual export downloads, generic result columns, full findings/coverage pagination |
| Operations | Docker image, pinned Python dependencies, build CI, manual Cloud Run deployment workflow, new-project setup guide |

## Architecture boundaries

The implementation uses role-specific planning and extraction calls inside a deterministic LangGraph control plane. The task ledger schedules dependencies and parallel page execution. Evidence verification and recipe reuse supply bounded reflection and reviewed memory. This is not an unrestricted swarm or an implementation of every named research architecture: general ReAct tool loops, LLMCompiler plan compilation and automatic Reflexion memory promotion are not enabled.

The worker owns limits and permissions. Models cannot issue requests or execute exported source code. Recipe reuse skips a model call when deterministic extraction already yields a relevant, supported result; otherwise extraction uses the configured model within the remaining allowance.

Approval mode requires a reviewed plan. Autonomous mode starts its bounded plan immediately. Both modes stop for access barriers and required human decisions. Only the user operates login/MFA, approves recipes, enables AI on authenticated content, chooses skip/stop, explicitly saves workflows, and authorizes sharing or deletion. Operator support is limited to an exact item and purpose with an audit record.

## Checks performed

- The initial backend implementation passed its 8 unit/integration cases before subsequent browser and frontend integration changes.
- Final Python lint and compilation checks passed.
- TypeScript compilation and the production frontend build passed after live API integration.
- Local development settings and generated credentials are ignored by Git. Production builds explicitly exclude the development token.
- The local FastAPI service started successfully on port 8000.

The final browser broker, PostgreSQL migration/role configuration, live JWT claims, S3 storage, paid/free provider behavior and Cloud Run deployment have not been exercised against real accounts. Existing test coverage does not establish those paths as validated.

## Remaining hosted setup and release validation

1. Create/configure Neon and Google Cloud projects; the user confirmed new projects are needed. No projects have been created in this implementation session.
2. Configure real JWT issuer/audience/JWKS claims, verified email, frontend origin, operator invitation bootstrap and runtime database role; run migrations and checkpoint bootstrap.
3. Configure object storage, Groq/OpenRouter model IDs and credentials, and search credentials or seed-only operation. No live AI provider calls have been made.
4. Deploy API/worker and frontend. Configure billing alerts for non-AI costs. Configure recovery dispatch for abandoned jobs before unattended use.
5. Deploy the optional browser broker separately and review real-domain signed-in selectors/dependencies. Popup OAuth/passkeys and arbitrary autonomous click flows need further site adapters.
6. Perform hosted acceptance/security/isolation checks and representative query quality evaluation before inviting friends.

Supported extraction is HTML and plain text with inline evidence. PDF/media extraction, raw HTML archival, workflow schedules, automatic recipe revisions, arbitrary generated code execution and direct client database access are outside this implementation. Download limits account for decoded content admitted by the transport, including robots and failed page attempts; they are not a network billing meter. Time limits include wall time since worker start, so long pauses can exhaust the time allowance on resume.

Live application deletion purges run checkpoints, findings and export artifacts. Provider backups and external trace retention require provider configuration; saved workflows and approved recipe definitions are independent resources and remain until separately deleted.

See [backend setup](backend/README.md) and [hosted deployment](deploy/README.md).
