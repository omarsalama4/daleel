# Daleel production readiness — 2026-10-13

**Status: hosted beta deployed; full production verification is incomplete.**

Application: https://daleel-api-530191092817.europe-west1.run.app

## Verified hosted behavior

- [Release 38385631304](https://github.com/omarsalama4/daleel/actions/runs/38385631304) succeeded at `51fee30`. API, migration, worker, recovery and isolated browser broker are deployed through the restricted GitHub beta workflow. Provider configuration was subsequently rolled out as runtime secret version 4, API revision `daleel-api-00006-xit`.
- Actual operator registration, verified-email Neon identity and invitation claim completed. The signed-in workspace and operator navigation were inspected.
- HTTPS health/readiness and the real frontend bundle passed. Protected account/run endpoints reject unauthenticated requests; unknown API routes remain 404.
- Live Neon runtime role has no administrative/RLS-bypass privileges. Six tenant policies, cross-workspace read/write denial and transaction context reset passed with synthetic fixtures removed.
- Point-in-time restore recovered an earlier synthetic value in an isolated branch while main retained the later value. Test branch and records were deleted. Free-plan recovery history is six hours, subject to provider quotas; live records remain until manual deletion.
- Real scheduler recovery dispatched a bounded one-page HTTPS crawl. After correcting SNI from bytes to text, the hosted worker fetched the page and saved one finding with source and supporting evidence. The run correctly reported partial coverage under its one-page frontier limit.
- A real export was written to private Neon storage and downloaded over the hosted capability endpoint. Deletion immediately revoked the capability, then removed the private object, records and LangGraph checkpoint. Exact synthetic workspace and manifests were removed.
- Runtime-to-broker authentication passed using an audience-bound, short-lived Google-signed token and the exact runtime service account. No permanent broker credential is shared. The old static broker secret version is disabled. Missing service authentication, unsupported domains and invalid viewer capabilities fail closed.
- Synthetic OTLP export and Cloud Trace readback passed. Actual hosted crawl and model-extraction spans were also read back, with run IDs, provider and service metadata only. Export filtering removes URLs, prompts, headers, exception text, events, links and client trace state. Trace list responses require pagination even when fewer entries than the requested page size are returned.

## Infrastructure and controls

- Dedicated GCP project `daleel-prod-20261006-c719`, Europe region, approved billing account, private image/source repositories and pinned configuration secrets. Federation pins exact repository/owner IDs, main branch, deploy workflow and beta environment.
- Dedicated free Neon PostgreSQL 17 project `bold-fog-96164252` in Frankfurt; schema revision `0001`, checkpoint bootstrap, verified-email Auth and private evidence storage are provisioned.
- Runtime secret version 4; broker configuration version 2; migration secret version 1. Broker has its own identity and no database, model or evidence-storage permissions.
- Managed API/broker access logs are excluded to avoid retaining capability/reset URLs. Application errors and audit records remain available.
- API availability checks, multi-location/error alerts and native metrics dashboard are configured. Delivery of alert email remains unverified.
- Hosting warning budget is $10 USD/month for Daleel only, at 50%, 90% and 100%. It is an alert, not a hard cap. AI caps remain $0.25/run and $5/workspace/month.
- Recovery polls every fifteen minutes to permit free Neon compute to suspend; normal API dispatch remains immediate. The deployed schedule and workflow default were verified. A five-minute recovery poll would risk keeping compute continuously active.

## Provider setup

The approved Groq/OpenRouter/Tavily keys are configured in the designated runtime secret and ignored ACL-protected local configuration. No provider credentials are committed or printed.

- Groq: dedicated Daleel project, `openai/gpt-oss-120b`; current catalog and structured Arabic output passed. Conservative accounting ceilings remain $1 input/$3 output per million tokens, above the observed published $0.15/$0.60 rates. Free account allowances still apply.
- OpenRouter: explicit `apodex/apodex-1.1-mini:free`, key paid-credit limit $0, free-tier status verified. Structured output passed with `data_collection=deny` and provider fallbacks disabled. Other free endpoints returned upstream 429 or no privacy-compatible endpoint; free availability is not guaranteed.
- Tavily: dedicated Daleel key, 1,000-credit monthly limit and pay-as-you-go disabled. Live discovery passed locally and in the hosted worker.
- A bounded hosted query performed search and three model extractions, respected robots policy and rejected unrelated marketing pages. Ledger charges settled without uncertain reservations. It reported partial frontier coverage, not successful job discovery.
- Current job detail pages produced supported title, employer and location. Description grounding exposed an ambiguous prompt; the prepared fix explicitly requires contiguous verbatim values/excerpts. A live retest returned a supported description paragraph. Hosted verification of the revised prompt remains pending.

## Prepared release changes

- Provider cards, authentication initialization cleanup and PostgreSQL 400 MB admission guard were released at `51fee30`. CI passed including the disposable PostgreSQL checks; local frontend verification passed 18 tests and the production build.
- Prepared extraction prompt clarification and regression test: **58 backend passed, 11 disposable PostgreSQL checks skipped locally**; lint passed. This change still needs CI, deployment and a fresh hosted detail extraction.

## Remaining gates

1. Verify the prepared extraction fix in a fresh hosted run, multilingual field grounding, fallback/quota behavior and final cost reconciliation. Provider setup is complete; free capacity is variable.
2. Inspect the live signed-in provider settings and verify opportunity detail enrichment, duplicates and reusable recipe replay.
3. Configure and verify actual domain-specific browser adapters, human login/MFA, authenticated extraction and reusable recipe replay. No adapters are enabled yet. Live broker viewers are ephemeral across restarts; multi-instance routing is not implemented.
4. Finish the active synthetic worker interruption/recovery check; verify alert delivery and password reset. Actual crawl trace readback passed.
5. Run extraction-quality evaluations for the AI Engineer opportunity template, including detail-page enrichment and duplicate opportunities.

Detailed reports and credentials remain in an ignored, ACL-protected local directory. Individual passing checks do not establish complete production readiness.
