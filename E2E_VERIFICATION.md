# E2E verification — 13 October 2026

## Results

| Check | Result |
| --- | --- |
| Deterministic browser E2E | 25 unique cases, each repeated three times: **75 passed**, zero retries |
| Backend including disposable PostgreSQL | **89 passed**, no skips |
| Frontend unit suite | **18 passed** |
| Production frontend build | Passed |
| Backend lint and patch whitespace | Passed |
| Root npm and pinned Python dependency audits | No known vulnerabilities |
| ChatGPT agent-assisted research | **Blocked by provider quota**, both GPT-6-Luna and GPT-6.1-Sol |

Final browser run: `01a13686-89b2-70cd-bb8c-4e25269e34fb`. Duration 4m23s. All 25 cases passed every repetition. The initial development-module repetition run had 71/72 passes and one Windows `ERR_NO_BUFFER_SPACE` failure; the bundled harness subsequently passed 72/72, then 75/75 after adding the decimal-budget case. Initial failures were investigated, not suppressed with retries.

See [testing instructions and coverage](E2E_TESTING.md). Local evidence is in ignored `.e2e/summary.md`, `.e2e/report.json`, `.e2e/junit.xml` and `.e2e/results/`. Generated artifacts are not committed. GitHub CI uploads synthetic test evidence with seven-day retention.

## Product issues repaired

| Finding | Change |
| --- | --- |
| Setting AI cap to zero reset it to $0.25 | Preserve zero and persist it in the plan/run |
| Crawl depth zero reset it to five | Preserve seed-only depth |
| Valid $0.07 cap failed validation | Compare cent-normalized values without multiplying into an integer assertion |
| Saved workflow rerun opened an empty composer | Restore current saved query, seeds, limits and relevance; run through the workflow endpoint to preserve its schema |
| Optional preferences were discarded | Include them in new research queries; saved-workflow criteria stay explicit |
| Cancel disappeared while a resumed run was queued | Offer cancellation for all backend-supported nonterminal states |
| Generic robots Allow overrode a specific exclusion | Use the maintained [Protego parser](https://github.com/scrapy/protego) and test specificity/wildcards plus zero prohibited-page requests |
| Partial results claimed complete coverage | Render status-specific coverage wording |

The test harness also gained backend readiness sequencing and a separate ignored UI bundle to reduce browser connection pressure. Production development-token stripping is unchanged. Test snapshot routes, test data and compiled test credentials are excluded from deployment artifacts.

## Release and remaining verification

Browser checks run on pushes and PRs and gate `Deploy beta` before cloud changes. Repository CI and production rollout results must be checked separately; these local results do not claim that a new release has deployed.

The ChatGPT subscription login was completed, but both available model attempts returned `MODEL_PROVIDER_FAILED: The usage limit has been reached`. The agent test remains configured and fails visibly until quota becomes available. Rerun `npx e2e run --tag agent --trace` after reset; its model-based UI judgment has not passed.

This suite uses a real local backend with synthetic sources and application AI/search disabled. Live provider AI/search calls, Neon email/password-reset delivery, and authenticated website login/MFA/CAPTCHA challenges remain separate checks. Human account challenges cannot be replaced by synthetic E2E coverage. The Arabic test verifies one language example, not universal language or website compatibility.
