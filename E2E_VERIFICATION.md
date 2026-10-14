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
| GitHub Browser E2E | Passed on commit `6813124` |
| GitHub Build: frontend, backend and production container verification | All passed on commit `6813124` |
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

Browser checks run on pushes and PRs and gate `Deploy beta` before cloud changes. [Browser E2E](https://github.com/omarsalama4/daleel/actions/runs/38448726791) and [Build](https://github.com/omarsalama4/daleel/actions/runs/38448726572) both passed for `6813124`. Build verified frontend, backend and the production container. These fixes have been pushed; this test-setup task did not trigger a production rollout.

The ChatGPT subscription login was completed, but both available model attempts returned `MODEL_PROVIDER_FAILED: The usage limit has been reached`. The agent test remains configured and fails visibly until quota becomes available. This historical quota block was resolved on 14 October: both the agent action and evidence judgment passed with live model calls. See the new results below.

This suite uses a real local backend with synthetic sources and application AI/search disabled. Live provider AI/search calls, Neon email/password-reset delivery, and authenticated website login/MFA/CAPTCHA challenges remain separate checks. Human account challenges cannot be replaced by synthetic E2E coverage. The Arabic test verifies one language example, not universal language or website compatibility.


## Browser toolkit and sign-in enhancement — 14 October 2026

Implemented the scoped browser toolkit, planner callback adapter, reviewed multi-step recipe replay/code export, action tracing and redesigned human sign-in viewer/modal. Added Chromium policy tests and UI E2E coverage; see [architecture and limits](BROWSER_TOOLKIT.md).

- Full product E2E passed all 30 cases with replay cache disabled, including real ChatGPT action and evidence judgment (run `01a13720-f334-7e81-8ff5-de6dda12ba20`).
- The four new browser recipe/sign-in flows passed three repetitions each: 12/12, no retries.
- PostgreSQL/backend regression suite passed 100 cases; frontend unit suite passed 18 and the production build passed.
- Subsequent refinement made mobile remote pages readable by default, collapsed keyboard controls and added operator-page coverage. Final verification/CI results are recorded below after completion.

Real third-party sign-in, email verification and MFA are human steps. Synthetic sign-in fixtures do not certify every live site adapter. The toolkit exposes controlled tools and a planner adapter; fully autonomous generation of arbitrary browser workflows remains future work.

### Final local results, 14 October

- **33/33 product E2E cases passed**, with action replay cache disabled and live ChatGPT calls (run `01a13725-bfb1-7d09-8ff3-a777f28a1bf6`). Includes all workspace/operator pages and the new browser/sign-in flows.
- New feature stability: **12/12** passes across three repetitions with no retries.
- **101/101 backend tests passed** against disposable PostgreSQL; **18/18 frontend tests passed**. Production frontend build, backend lint, patch and YAML checks passed.
- Mobile viewer screenshots were inspected; controls were simplified and the remote page made readable at actual size by default on small screens.
- Real account/MFA challenges and arbitrary site compatibility remain outside synthetic coverage. No production password or verification code was entered by automation.

### Release verification repair

The first cloud release (`38471031953`) stopped before migration/service updates: Cloud Build's image verification used `wait_for_function` string evaluation, which Chromium rejected under the viewer's CSP without `unsafe-eval`. The application image built successfully. The check now polls the image's natural width through a Playwright locator assertion, preserving CSP. The repaired API/frontend/Chromium smoke script passed locally. Release retry results are recorded after completion.

### Successful hosted release

- Release commit: `9f04283555857586af8053a21197d3ea93850bbb`.
- [Build](https://github.com/omarsalama4/daleel/actions/runs/38472768139), [Browser E2E](https://github.com/omarsalama4/daleel/actions/runs/38472768153), and [Deploy beta](https://github.com/omarsalama4/daleel/actions/runs/38473447087) all completed successfully.
- API revision `daleel-api-00017-bag` and broker revision `daleel-broker-00009-qbz` serve the release. The worker and scheduled recovery jobs also use the same release image.
- All **10 hosted smoke checks passed**: API readiness, API authentication, absence of both test-only routes, rejection of unknown viewer capabilities/status, broker service authentication, sign-in shell, deployed recipe browser controls, and deployed sign-in guidance.
- The production image smoke check also passed locally with a 512 MB memory limit and one CPU. The CSP remains unchanged.

Hosted checks were read-only and did not enter credentials or trigger paid research. The local machine-readable evidence is in ignored `data/browser-toolkit-hosted-verification.json`. Production smoke checks establish readiness and expected boundaries; they do not replace the human sign-in checks described above.

## Production gap closure — 15 October 2026

- Connected production dynamic-page reasoning to the structured model route with atomic cost accounting, private-content consent, cancellation checks and at most four decisions per page. New controls create a draft recipe and review gate; approval/replay are required before execution. Navigation stays in the durable page frontier.
- Authentication and state-changing controls are rejected during proposal and execution. Rendered evidence uses actual visible text; static hidden content is excluded. Worker recipe reuse now detects missing required evidence/relevance and returns to review. Completed connections no longer retain viewer capability URLs.
- Final full local run: **34/34 E2E passed**, no action replay and no retries, including live ChatGPT agent action and evidence judgment. Run `01a13c6f-0b1c-7708-aea0-6b4d22f3306e`, duration 105.93 seconds, three model calls.
- New planner review/approval/replay/resume flow passed **3/3 repetitions**, no retries. Run `01a13c71-8d0c-7a44-b916-b2c1e26c4c08`.
- **115/115 backend tests passed** with disposable PostgreSQL, including tenant isolation and recovery; **18/18 frontend tests passed** and the production build passed. Backend lint, patch checks, npm audits and the pinned Python audit passed with no known vulnerabilities reported.
- Groq accepted the new browser decision schema in a live synthetic check; accounted cost was $0.000822, with no unresolved reservation. The old OpenRouter route returned 404. The replacement `dots-studio/dots-3-note-preview:free` passed the same browser decision and synthetic English/Arabic/French literal-grounding checks, with zero accounted cost and no unresolved reservations. Deployment overrides only the non-secret model name; runtime secret version 4, privacy restrictions and paid-credit restrictions stay unchanged.
- The owner confirmed real password reset/sign-in and receipt of the approved monitoring test alert. Five recent scheduled recovery executions succeeded.

CI, release and hosted checks for this change are recorded below when complete. Real third-party authenticated extraction/revocation and representative-site capacity/quality remain separate certification checks; this release does not claim universal site compatibility or a production availability SLA.
