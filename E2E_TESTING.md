# Daleel end-to-end testing

## Setup

Requires Node 24.8+ (or 22.22.3+), Python 3.11+, and unused local ports 80, 8000 and 5173.

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock
backend/.venv/Scripts/python.exe -m pip install -e 'backend[dev]'
npm ci
npm --prefix frontend ci
npx @e2e-dev/web install chromium
npx e2e login openai
```

On Linux use `backend/.venv/bin/python` and install Chromium with `--with-deps`. The synthetic source binds port 80 to exercise the production standard-port policy. CI permits that port on its disposable runner; never change production networking to run these tests.

Read `npx e2e guide` and the relevant topic before modifying tests. The canonical installed skill lives in `.agents/skills/e2e`.

## Run

```powershell
npx e2e run --exclude-tag agent --trace
npx e2e run --tag agent --trace
npx e2e run --exclude-tag agent --repeat-each 3 --retries 0
```

The first command makes no model calls. The second uses the saved ChatGPT subscription login with GPT-6.1-Sol. Subscription credentials stay outside Git and are never uploaded to CI. Agent tests fail when the provider is unavailable; they are not converted into passing tests.

The runner starts Vite preview, a real FastAPI/LangGraph inline worker, an isolated SQLite database and a synthetic crawl site. It waits for backend readiness before opening the frontend. Application AI/search keys are blank and production backend environment files are not loaded. Authentication uses a random per-run development token. A read-only snapshot route exists only in the disposable harness; it is absent from the production application. The runner stops its processes on completion.

The test-only UI bundle is written to ignored `data/e2e/ui`, excluded from Docker. Its compiler defines development authentication for the local harness. Production builds use the unchanged frontend Vite configuration, which strips the development token. Bundling reduces browser connections and avoids the Windows `ERR_NO_BUFFER_SPACE` failure observed in an initial 72-case repetition run. Neither that transport failure nor model quota failures count as passes.

## Coverage

| Area | Browser checks |
| --- | --- |
| Research | Approval before crawling, opportunity detail enrichment, verified excerpts, source links, duplicates, JSON export/download |
| Execution | Autonomous start, no implicit workflow saving, page/depth/retry limits, zero AI budget, pause/resume/queued cancellation |
| Reuse | Explicit workflow save, saved query/sources/schema restoration, linked rerun |
| Recipes | Preview before approval, grounded replay, activation, repaired version, drift rejection |
| Policy | Robots specificity, prohibited page never fetched, SSRF rejection, malformed URL, partial coverage |
| UX | Workspace pages, mobile navigation, persisted monthly AI budget, private-content consent default off, invalid reset link, missing broker error |
| Languages | Arabic details, Unicode and verified source evidence |
| Retention | Confirmation, cancelled-run deletion and removal from persisted resources |

Read failure traces under `.e2e/results/<test>/trace.md` first. Reports include JSON, JUnit, Markdown and screenshots/downloads. They are ignored by Git and Docker. CI retains evidence for seven days.

## Release gate and limits

`Browser E2E` runs deterministic checks on pushes and PRs. `Deploy beta` calls it before any cloud deployment changes. CI uses synthetic records and no provider or production secrets.

These checks do not prove every third-party website or every language works. They do not exercise real Neon email/reset delivery, MFA/CAPTCHA, or live authenticated-site adapters; those require separate provider checks and human account challenges. Real PostgreSQL RLS/recovery tests are in `backend/tests/test_postgres.py` and run in Build/Deploy against a disposable PostgreSQL service. Hosted AI/search integration is separate from the E2E testing agent's ChatGPT subscription.

## Verification on 13 October 2026

The initial 22 deterministic browser cases passed; autonomous and Arabic cases also passed. Repetition and final CI results are recorded in `E2E_VERIFICATION.md`.

ChatGPT rejected agent calls for both GPT-6-Luna and GPT-6.1-Sol with `MODEL_PROVIDER_FAILED: The usage limit has been reached`, despite a completed login. The agent-assisted case remains unverified until subscription quota becomes available; rerun `npx e2e run --tag agent --trace` then. Deterministic browser checks verify the same research flow without model calls.
