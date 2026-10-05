# Daleel frontend implementation readiness

**Status:** Ready to begin frontend implementation against the current private-beta baseline. The PRD and UX specification define the product behavior; the OpenAPI file defines the frontend/backend boundary. No frontend application code has been scaffolded yet.

## Source of truth

- Product scope and release criteria: `Daleel_Product_Requirements_Document.docx` (PRD v1.4).
- Page behavior, roles, flows, states, responsive rules, accessibility, language handling, and beta defaults: `Daleel_UI_UX_Specification.md` (v1.1).
- Shared visual tokens and component style: `DESIGN.md`.
- API operations and payloads: `api/openapi.yaml` (OpenAPI 3.1).
- Visual references: [Daleel Stitch project](https://stitch.withgoogle.com/projects/13131008490585482138?pli=1).

If these sources conflict, follow the PRD for product decisions, the UX specification for page behavior, and the API contract for request/response shape; update the relevant source before changing implementation behavior.

## Confirmed product behavior

- Private hosted beta for the owner and invited friends; each account has an isolated personal workspace.
- Approval mode is the default for every new query. Autonomous mode must be selected for that query.
- Standard beta ceilings: 20 domains, 500 pages, depth 5, 20 minutes, 2 retries per page, 100 MB per run, $0.25 AI usage per run, and $5 AI usage per workspace per month. Server values are authoritative.
- Per-query limits accept domains 1–20, pages 1–500, depth 0–5, minutes 1–20, retries per page 0–2, and 1–100 MB. Dollar caps use $0.01 increments; $0.00 disables model calls while deterministic work may continue where supported.
- A saved workflow requires the user's explicit Save action. Shared workflows are read-only and must be duplicated into the recipient's workspace before use.
- Authenticated-content AI processing is off by default. MFA/CAPTCHA and bot-detection gates pause for the user; the interface offers sign-in, resume, skip where valid, or stop. It must not promise to bypass those controls.
- Results expose evidence, source URLs, relevance reasons, duplicates, incomplete details, and crawl coverage. Missing or unsupported fields stay Unknown/Unavailable.
- The application UI is English; source excerpts retain their language and use automatic text direction for Arabic and other RTL content.

## Frontend baseline

- React + TypeScript + Vite; React Router; TanStack Query for server state.
- Serve the built SPA and FastAPI `/api/v1` from the same Cloud Run origin. Keep cross-origin Neon Auth behavior inside an `AuthAdapter`.
- Generate API types from `api/openapi.yaml`; keep HTTP and authentication behind `ApiClient` and `AuthAdapter`. Page components should consume app-level models and never authorize using browser-supplied workspace IDs.
- Use the official `@neondatabase/auth` client. Attach its short-lived JWT as a bearer token. FastAPI verifies signature, issuer, expiry, and subject using Neon Auth JWKS, then checks current account/workspace membership server-side. Do not store tokens in local storage or telemetry.
- Poll persisted run state every 3 seconds in the foreground and every 15 seconds in the background; stop at terminal status and ignore stale event sequences.
- Carry W3C trace context to FastAPI when supported. Show the API `Problem.traceId` as a support reference; client spans are limited to operation, route, status, duration, release, and opaque trace ID. Never capture query text, page HTML, evidence, invite tokens, bearer tokens, or browser session values.
- Implement all documented loading, empty, partial, blocked, forbidden, not-found, retryable-error, and destructive-confirmation states. Target WCAG 2.2 AA.

## CI/CD handoff

The implementation should build the SPA into the same deployable Cloud Run image/origin as FastAPI. CI should run formatting, lint, TypeScript checking, API-contract validation, frontend tests, and a production build on each change; deployment should promote a reviewed build and pass health checks before beta traffic. Store provider credentials and deployment secrets in server-side secret management, never in `VITE_*` client variables. The current workspace has no frontend scaffold or CI workflow, and it is not currently a Git checkout; connect it to the chosen source host as part of the first implementation setup.

## Delivery order

1. **Integration proof:** verify Neon Auth token refresh and FastAPI JWT/JWKS validation, invite claim, active membership checks, and same-origin routing in the selected Cloud Run setup. This is a first-sprint integration gate, not an unresolved product choice.
2. **Core journey:** app shell, P03–P10, mockable API client, Approval plan, run updates, evidence-grounded results, detail enrichment, and coverage.
3. **Identity and reuse:** P01–P02 and P11–P19, including invite expiry, workflow duplication, recipes, sessions, sharing, AI policy, limits, and deletion.
4. **Restricted operations:** P20–P22 behind server-enforced operator permissions and audited support access.
5. **Release gate:** run the PRD benchmark and security checks in PRD §31.1 before beta release; frontend completion alone does not satisfy these gates.

## Contract and design checks completed

- `api/openapi.yaml` parses as YAML and declares OpenAPI 3.1.0, 43 paths, and 47 schemas.
- Structural inspection found 53 operations with unique `operationId` values, all 205 local `$ref` references resolved, and all path placeholders declared.
- The UX specification maps P01–P22 and documents page states and interactions. This contract check does not replace an OpenAPI validator or implementation-level integration testing.
- Stitch contains the quiet core research screens. New screen resources have been generated and retrieved for Workflows (P11), Recipes (P13), Shared with me (P15), Account & Workspace (P17), Limits & Storage (P19), Invitations (P20), Workspace Operations (P21), and Access Audit (P22). Their resource IDs are `edcb411a34144f92b3c3735b685b2dba`, `4896f845b7904cd0bf2a4146ea656f02`, `6ca8af46fd7146b0a4cba2558b6a2b04`, `c7e4ab806ea847779c58441256228b80`, `df1f8f32a79a44b0a99d0bbf63b50a2c`, `88ede4c5893b4435919c76dcd1b7542c`, `abc4bdced05a43969eb1ab5e43b01691`, and `360e2e56331642c885d8d92b6a81e84b` in that order. Stitch's `get_screen` confirms these resources, but its project screen list does not include them yet. The P01/P02/P06 written interaction specs are complete; there is no verified saved visual resource for those three routes, so use the UX spec as their implementation source of truth.

## Suggested first frontend pull request

Scaffold the SPA, app shell, route guards, generated API types, mock `ApiClient`, `AuthAdapter` interface, design tokens, error/status primitives, and an initial P04→P05→P07→P08→P09 journey. Keep live Neon integration behind the adapter until the integration proof passes. Do not wire live crawling or autonomous execution from the browser; the API owns scope enforcement, approvals, execution, and audit records.
