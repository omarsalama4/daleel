# Frontend validation — 2026-10-06

## Verdict

**Suitable as a UI prototype; not ready for a private beta launch.** All 22 specified routes are present and the mock research flow renders. The live integration, generic planning behavior, hosted login, and several API contracts still need work.

## Checks performed

| Check | Result |
|---|---|
| TypeScript `tsc -b` | Pass |
| Vitest | Pass: 9 tests in 1 file |
| Vite production build | Pass |
| Oxlint | Exit 0 with warnings, including React hook dependency and render purity warnings |
| Browser: AI Engineer query → plan → approve → run → results | Renders in mock mode |
| Browser: scholarship query → plan | Fails the general-purpose expectation: mock plan still names job sites and job fields |

The machine's npm launcher is broken, so these checks used the installed Node tool entry points directly. The browser review used the local Vite server.

## Release blockers and corrections

| Priority | Finding | Required correction |
|---|---|---|
| P0 | Mock auth and mock API are the default in `AuthContext` and `ApiProvider`; data is in memory. | Select live adapters by environment for beta, remove runtime mock/role switches from production, and use real identity and server authorization. |
| P0 | `NeonAuthAdapter` contains a placeholder token flow and calls auth routes absent from `api/openapi.yaml`. | Integrate Neon Managed Better Auth using its supported client flow; have FastAPI validate issued tokens and derive workspace role server side. |
| P0 | Hosted site sign-in is a visual simulation. The sessions page fabricates a connection ID; the mock client assigns `wellfound.com` to every finished connection. | Implement the actual `connectSite` → returned connection ID/browser URL → user login → validation → `finishSiteSessionConnection` flow. Never claim a session was established before server confirmation. |
| P0 | General-purpose query is not demonstrated: the scholarship plan still uses Greenhouse/Lever and job fields. Mock results also do not prove relevance to the query. | Make mock fixtures visibly illustrative, and implement query-specific typed planning, schema and discovery in the backend before beta. |
| P0 | Human-gate “Skip task” was wired to `resume`; recipe review routed by plan ID. | The unsafe skip wiring was removed. Add a scoped gate-resolution API with task/gate ID, chosen action, and idempotency key; link to the exact recipe version. |
| P1 | Frontend types differ from OpenAPI, including session expiry enum, connection state, export state, invitation delivery state, and support grant access. | Resolve contract decisions, generate client types from OpenAPI, and add contract checks in CI. |
| P1 | Plan review previously relied on transient router state and fell back to a hardcoded mock run. | Corrected: URL now carries the run ID. Refresh still needs persistent backend data. |
| P1 | Failed plan/run loads showed skeletons indefinitely. | Corrected for plan review and run activity; audit the same pattern in finding, recipe, settings, and coverage screens. |
| P1 | Results display job-specific title/employer/location and filter only the current page. | Render arbitrary plan fields, add server-side filters and pagination, and clearly show incomplete, duplicate, and coverage states. |
| P1 | `traceparent` is assembled with `Math.random()` and fallback error handling places the full header in `traceId`. | Use a compliant trace context library or secure random IDs; parse structured Problem responses and propagate request/run IDs. |
| P1 | The frontend README describes security and crawler capabilities as implemented. | Corrected at the repository root; keep feature documentation explicit about prototype versus live capability. |
| P2 | Lint warnings remain, including hook dependency and `Date.now()` in render. | Clear warnings and add a zero-warning CI gate before release. |

## Fixes included in this review

- Plan URLs use the run ID, so they can be loaded directly once server persistence exists.
- Plan review and run activity show error states on failed fetches.
- Query limits now validate retries per page and cent-based AI caps.
- Run cancellation toast uses the correct wording.
- The misleading “Skip task” → “Resume” mapping is removed; recipe review opens the library until an exact recipe reference exists.

## Acceptance gate for frontend integration

Run a real query against a deployed FastAPI backend and verify: authenticated invitation/sign-in; per-workspace isolation; approval and autonomous run modes; one arbitrary non-job query; a completed job opportunity with detail-page fields and citations; partial and failed outcomes; pause/resume/cancel and human-gate resolution; real session connection; recipe preview/approve/replay; export, feedback, sharing, deletion, and operator audit. Repeat on desktop and mobile, with English and Arabic evidence.

