# Daleel backend and agent runtime

FastAPI control plane, SQLAlchemy resource/task/spend ledgers, LangGraph durable stages, Groq/OpenRouter structured output adapters, scoped HTTP crawling, optional Playwright rendering, evidence validation, and reviewed declarative recipe reuse.

## Run locally

From `F:\Daleel`:

```powershell
backend/scripts/start-local.ps1
```

In a second terminal:

```powershell
cd frontend
npm run dev
```

The setup script creates ignored local configuration files with a random development credential. API: `http://127.0.0.1:8000`; schema and API documentation: `http://127.0.0.1:8000/api/docs`. The frontend uses the live API by default. Mock demo mode requires `VITE_DEMO_MODE=true` in a development environment. Production disables local authentication and mock defaults.

Without cloud keys, use seed URLs. The planner and extractor disclose deterministic fallback behavior; they do not pretend an LLM ran. Add server-side keys and explicit models to the root `.env` to enable AI. Enable optional rendering with `DALEEL_BROWSER_ENABLED=true` after `python -m playwright install chromium`.

## Execution and human decisions

1. The user supplies a query, scope, relevance setting, and bounded limits. The planner produces an editable schema specific to the query. Job search is a template, not a hard-coded output format.
2. Approval mode waits for approval of that plan; Autonomous mode queues it immediately. Neither mode permits write actions, permission expansion, credential bypass or arbitrary recipe code execution.
3. Discovery uses seeds or the configured search provider. Durable page tasks record dependencies, leases, fencing and bounded retry attempts. The worker follows in-scope detail links and enriches each visited page.
4. Extraction is deterministic or structured model output. A separate verifier rejects fields without exact supporting excerpts. Unknown fields remain empty. Findings expose evidence, relevance reasoning, source URLs and conservative duplicate groups.
5. Human gates require the user to connect an authorized session, review a drifted recipe, skip the blocked task, or stop while retaining completed findings. A normal Resume action cannot resolve a gate.
6. Workflow saving is explicit. Recipe generation creates a draft; preview, approval and evidence-supported replay are required before reuse. Reuse validates selectors and pauses when they drift. Exported Python is for inspection; the worker executes declarative steps only.

## Implemented scope and limits

- HTML and plain text crawling, text evidence, query-specific fields, list and detail page discovery, JSON-LD job extraction, multilingual content preservation.
- Optional JavaScript rendering routes all requests through scoped DNS-pinned GET transport; submissions, downloads, service workers and WebSockets are blocked.
- HTTP robots enforcement, private-address rejection, revalidated redirects, per-host delay, download accounting, page/depth/time/retry ceilings.
- Runs, coverage, feedback, CSV/JSON/text/URL exports, workflow versions, recipe lifecycle, workspace settings, usage, shares, invitations, operator exact-item support and access audit.
- Encrypted authorized cookie reuse requires the hosted browser broker described in the deployment guide. A separate human browser broker is bundled with screenshot/click/type controls; each target needs a reviewed signed-in selector. Arbitrary site-specific autonomous click/pagination automation is not enabled.
- No PDF/media extraction, raw HTML archive, schedules, direct database access from the browser or arbitrary LLM-generated code execution in this release.

See [deployment guide](../deploy/README.md) for new project setup and the remaining hosted release gates.
