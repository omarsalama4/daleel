# Daleel production readiness — 2026-10-13

**Status: hosted beta deployed; full production verification is incomplete.**

Application: https://daleel-api-530191092817.europe-west1.run.app

## Verified hosted behavior

- [Release 38428114052](https://github.com/omarsalama4/daleel/actions/runs/38428114052) succeeded at `5cf08f7`, including literal-evidence extraction, viewer image policy, stricter recipe validation, conservative duplicate grouping and actionable connection errors. API, migration, worker, recovery and isolated browser broker are deployed through the restricted GitHub beta workflow. Runtime secret version 4 configures the approved AI/search providers.
- Actual operator registration, verified-email Neon identity and invitation claim completed. The signed-in workspace and operator navigation were inspected.
- HTTPS health/readiness and the real frontend bundle passed. Protected account/run endpoints reject unauthenticated requests; unknown API routes remain 404.
- Live Neon runtime role has no administrative/RLS-bypass privileges. Six tenant policies, cross-workspace read/write denial and transaction context reset passed with synthetic fixtures removed.
- Point-in-time restore recovered an earlier synthetic value in an isolated branch while main retained the later value. Test branch and records were deleted. Free-plan recovery history is six hours, subject to provider quotas; live records remain until manual deletion.
- Real scheduler recovery dispatched a bounded one-page HTTPS crawl. After correcting SNI from bytes to text, the hosted worker fetched the page and saved one finding with source and supporting evidence. The run correctly reported partial coverage under its one-page frontier limit.
- A real export was written to private Neon storage and downloaded over the hosted capability endpoint. Deletion immediately revoked the capability, then removed the private object, records and LangGraph checkpoint. Exact synthetic workspace and manifests were removed.
- Runtime-to-broker authentication passed using an audience-bound, short-lived Google-signed token and the exact runtime service account. No permanent broker credential is shared. The old static broker secret version is disabled. Missing service authentication, unsupported domains and invalid viewer capabilities fail closed.
- Synthetic OTLP export and Cloud Trace readback passed. Actual hosted crawl and model-extraction spans were also read back, with run IDs, provider and service metadata only. Export filtering removes URLs, prompts, headers, exception text, events, links and client trace state. Trace list responses require pagination even when fewer entries than the requested page size are returned.
- A real worker execution was deliberately cancelled in a separate synthetic workspace. Recovery detected its expired lease, re-dispatched it, retried the unfinished task and reached a terminal state. The verification workspace, runs and checkpoints were subsequently removed with exact identity guards.
- The deployed extraction fix returned five evidence-supported fields from a current job detail page: title, employer, location, description and skills. Accounted AI usage was $0.008873 with no unresolved reservation. A one-page limit correctly produced partial coverage.
- Live-provider evaluations with synthetic English, Arabic and French opportunity content passed literal field grounding. These checks do not establish equal quality for every language or site.
- The signed-in production AI settings show both routes configured, private-content AI processing off, commercial fallback disabled and the $5 monthly cap.

## Infrastructure and controls

- Dedicated GCP project `daleel-prod-20261006-c719`, Europe region, approved billing account, private image/source repositories and pinned configuration secrets. Federation pins exact repository/owner IDs, main branch, deploy workflow and beta environment.
- Dedicated free Neon PostgreSQL 17 project `bold-fog-96164252` in Frankfurt; schema revision `0001`, checkpoint bootstrap, verified-email Auth and private evidence storage are provisioned.
- Runtime secret version 4; broker configuration version 3; migration secret version 1. Broker has its own identity and no database, model or evidence-storage permissions. The first configured adapter is GitHub, using an observed signed-in navigation control and restricted login asset hosts; end-to-end human login remains pending.
- Managed API/broker access logs are excluded to avoid retaining capability/reset URLs. Application errors and audit records remain available.
- API availability checks, multi-location/error alerts and native metrics dashboard are configured. An existing Daleel error alert was visible in the operator's Gmail browser title. One explicitly approved synthetic alert event was submitted on 2026-10-13; receipt of that test remains to be confirmed.
- Hosting warning budget is $10 USD/month for Daleel only, at 50%, 90% and 100%. It is an alert, not a hard cap. AI caps remain $0.25/run and $5/workspace/month.
- Recovery polls every fifteen minutes to permit free Neon compute to suspend; normal API dispatch remains immediate. The deployed schedule and workflow default were verified. A five-minute recovery poll would risk keeping compute continuously active.

## Provider setup

The approved Groq/OpenRouter/Tavily keys are configured in the designated runtime secret and ignored ACL-protected local configuration. No provider credentials are committed or printed.

- Groq: dedicated Daleel project, `openai/gpt-oss-120b`; current catalog and structured Arabic output passed. Conservative accounting ceilings remain $1 input/$3 output per million tokens, above the observed published $0.15/$0.60 rates. Free account allowances still apply.
- OpenRouter: explicit `apodex/apodex-1.1-mini:free`, key paid-credit limit $0, free-tier status verified. Structured output passed with `data_collection=deny` and provider fallbacks disabled. Other free endpoints returned upstream 429 or no privacy-compatible endpoint; free availability is not guaranteed.
- Tavily: dedicated Daleel key, 1,000-credit monthly limit and pay-as-you-go disabled. Live discovery passed locally and in the hosted worker.
- A bounded hosted query performed search and three model extractions, respected robots policy and rejected unrelated marketing pages. Ledger charges settled without uncertain reservations. It reported partial frontier coverage, not successful job discovery.
- Current job detail pages produced supported title, employer, location, description and skills after the literal-extraction prompt correction. Full hosted evidence and reconciled test usage were checked; all synthetic cloud fixtures were removed.

## Prepared release changes

- Provider cards, authentication initialization cleanup and PostgreSQL 400 MB admission guard were released at `51fee30`. CI passed including the disposable PostgreSQL checks; local frontend verification passed 18 tests and the production build.
- Extraction prompt correction was deployed and verified. The subsequent viewer image fix was initially blocked by a CI test lacking a production HTTPS broker URL; this is corrected at `30fd6e5`.
- Recipe replay now fails review when required fields are unsupported or the query relevance setting is unmet. Conservative deduplication includes tracking-URL normalization and one stable group root, with an API-to-worker regression. Broker errors distinguish expired connections, service authentication and missing signed-in controls without forwarding private upstream messages. These fixes are deployed at `5cf08f7`.
- A Chromium container check loads the real viewer HTML/CSP and verifies a generated screenshot appears; CI passed at `6a62ce5`. Container build exclusions cover all environment-file variants and local agent/cloud configuration directories. Live viewer image endpoint returned a valid JPEG; the user supplied a screenshot showing the remote page rendered.
- Recurrence safeguards at `245c20e` passed [release 38429678337](https://github.com/omarsalama4/daleel/actions/runs/38429678337). **73 backend passed, 11 disposable PostgreSQL checks skipped locally**; CI also passed its PostgreSQL, frontend and container jobs. Three-attempt retries cover transient database startup disconnections only; security and authentication failures remain fatal. A local injected shutdown was followed by successful real Neon role/RLS validation, without restarting the database. Deployment validates numeric secret pins and build resource access, then runs the full container smoke test before changing live services. Post-deployment recovery execution `daleel-recovery-w2hmt` succeeded against Neon, and live health/readiness/authentication checks passed.

## Observed incidents and explanations

- Historical deployment `a49b7b7`, attempt 2, failed during Cloud Build source upload because the deployment identity could not access the dedicated source bucket. Approved bucket metadata/object and service-usage permissions were subsequently corrected; later releases passed. New access preflight detects missing bucket/repository access before upload, without widening privileges.
- Recovery failure at 2026-10-13 01:15 UTC: PostgreSQL reported `57P01 AdminShutdown`, terminating the connection during the read-only role/RLS startup check. The exact provider-side administrative trigger is not established by the log. Pool pre-ping could not prevent a termination after checkout. Bounded retries now repeat only the read-only validation with a fresh connection; a persistent outage still fails and alerts.
- Google Cloud alerts are triggered by matching ERROR logs, not necessarily a frontend outage. The old email's “No severity” is an unset incident classification. Alert instructions were corrected from five-minute recovery to the actual fifteen-minute schedule and distinguish the single user-approved synthetic delivery test. Historical emails retain their original text.

## Remaining gates

1. The viewer image correction passed live rendering, but GitHub human login validation still failed on an account-security page. GitHub target-site login is optional and separate from deployment federation; no changes to account MFA are required. Authenticated extraction/session revocation remain unverified. The Computer Use skill prohibits automating authentication.
2. Verify real password-reset email, completion and sign-in; confirm receipt of the single approved monitoring test alert.
3. Validate strict recipe replay after deployment, including complete required fields and drift. Prior preview/approval/replay passed under the older permissive success check; that alone does not establish complete extraction.
4. Extend opportunity quality evaluation to discovery-to-detail enrichment, duplicate opportunities and representative sites. Current live detail extraction and multilingual grounding checks are bounded evidence, not a broad quality benchmark.
5. Free provider capacity has no guaranteed availability. Neon recovery history is six hours subject to quotas. Broker connections are ephemeral across revisions/restarts, with max one instance; users must reconnect after interruption. Wider production scale and longer recovery guarantees need separately tested infrastructure and a chosen service-level target.

Detailed reports and credentials remain in an ignored, ACL-protected local directory. Individual passing checks do not establish complete production readiness.
