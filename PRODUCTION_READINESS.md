# Daleel production readiness — 2026-10-13

**Status: hosted beta deployed; full production verification is incomplete.**

Application: https://daleel-api-530191092817.europe-west1.run.app

## Verified hosted behavior

- [Release 38380430671](https://github.com/omarsalama4/daleel/actions/runs/38380430671) succeeded at `d403185`. API, migration, worker, recovery and isolated browser broker are deployed through the restricted GitHub beta workflow.
- Actual operator registration, verified-email Neon identity and invitation claim completed. The signed-in workspace and operator navigation were inspected.
- HTTPS health/readiness and the real frontend bundle passed. Protected account/run endpoints reject unauthenticated requests; unknown API routes remain 404.
- Live Neon runtime role has no administrative/RLS-bypass privileges. Six tenant policies, cross-workspace read/write denial and transaction context reset passed with synthetic fixtures removed.
- Point-in-time restore recovered an earlier synthetic value in an isolated branch while main retained the later value. Test branch and records were deleted. Free-plan recovery history is six hours, subject to provider quotas; live records remain until manual deletion.
- Real scheduler recovery dispatched a bounded one-page HTTPS crawl. After correcting SNI from bytes to text, the hosted worker fetched the page and saved one finding with source and supporting evidence. The run correctly reported partial coverage under its one-page frontier limit.
- A real export was written to private Neon storage and downloaded over the hosted capability endpoint. Deletion immediately revoked the capability, then removed the private object, records and LangGraph checkpoint. Exact synthetic workspace and manifests were removed.
- Runtime-to-broker authentication passed using an audience-bound, short-lived Google-signed token and the exact runtime service account. No permanent broker credential is shared. The old static broker secret version is disabled. Missing service authentication, unsupported domains and invalid viewer capabilities fail closed.
- Synthetic OTLP export and Cloud Trace readback passed. Export filtering removes URLs, prompts, headers, exception text, events, links and client trace state. Readback of the actual crawl span remains pending.

## Infrastructure and controls

- Dedicated GCP project `daleel-prod-20261006-c719`, Europe region, approved billing account, private image/source repositories and pinned configuration secrets. Federation pins exact repository/owner IDs, main branch, deploy workflow and beta environment.
- Dedicated free Neon PostgreSQL 17 project `bold-fog-96164252` in Frankfurt; schema revision `0001`, checkpoint bootstrap, verified-email Auth and private evidence storage are provisioned.
- Runtime secret version 3; broker configuration version 2; migration secret version 1. Broker has its own identity and no database, model or evidence-storage permissions.
- Managed API/broker access logs are excluded to avoid retaining capability/reset URLs. Application errors and audit records remain available.
- API availability checks, multi-location/error alerts and native metrics dashboard are configured. Delivery of alert email remains unverified.
- Hosting warning budget is $10 USD/month for Daleel only, at 50%, 90% and 100%. It is an alert, not a hard cap. AI caps remain $0.25/run and $5/workspace/month.
- Recovery now polls every fifteen minutes to permit free Neon compute to suspend; normal API dispatch remains immediate. Workflow default is updated in the prepared release. A five-minute recovery poll would risk keeping compute continuously active.

## Provider setup

The user approved mefoomar4@gmail.com and free Groq/OpenRouter/Tavily keys, and completed provider sign-in. A dedicated Groq Daleel project is created. Tavily's Daleel key is saved in ignored ACL-protected configuration with a 1,000-credit monthly limit and pay-as-you-go disabled. Groq/OpenRouter key creation, model selection, cloud configuration and live AI/search tests remain in progress. No provider credentials are committed or printed.

## Prepared release changes

- Provider cards report configuration per route instead of hardcoded Active/Standby labels. Settings load failures have an explicit retry state; AI consent is labelled for accessibility.
- Failed authentication initialization clears account/cache state; hook dependencies include the actual adapter and query client.
- PostgreSQL admission checks database size below a configurable 400 MB default, leaving headroom below the free provider allowance. Existing workspace/artifact admission controls remain. Provider limits and metadata overhead still require monitoring.
- Local verification: **57 backend passed, 11 disposable PostgreSQL checks skipped locally; 18 frontend passed**. Python lint, TypeScript and production bundle passed. The new PostgreSQL capacity test must run in CI before release.

## Remaining gates

1. Finish free AI/search provider setup; verify structured outputs, multilingual grounding, quota handling and cost reconciliation through hosted runs.
2. Deploy the prepared UI/storage-admission release and verify the live result.
3. Configure and verify actual domain-specific browser adapters, human login/MFA, authenticated extraction and reusable recipe replay. No adapters are enabled yet. Live broker viewers are ephemeral across restarts; multi-instance routing is not implemented.
4. Verify actual worker interruption/recovery, alert delivery, password reset and real crawl trace readback.
5. Run extraction-quality evaluations for the AI Engineer opportunity template, including detail-page enrichment and duplicate opportunities.

Detailed reports and credentials remain in an ignored, ACL-protected local directory. Individual passing checks do not establish complete production readiness.
