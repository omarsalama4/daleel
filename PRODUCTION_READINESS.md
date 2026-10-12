# Daleel production readiness — 2026-10-13

**Status: production release verification in progress; not yet production ready.**

## Verified infrastructure

- Google Cloud project `daleel-prod-20261006-c719`, approved owner and billing account, private Artifact Registry and build source bucket. `.gcloudignore` excludes credentials, local data and environment files from uploaded sources.
- Dedicated free Neon organization and PostgreSQL 17 project `bold-fog-96164252` in Frankfurt. Schema revision `0001`, checkpoint tables and non-owner runtime role are installed.
- Live Neon isolation passed using two synthetic workspaces: all six tenant RLS policies enabled, cross-workspace reads/updates/deletes hidden, cross-workspace inserts rejected, transaction context reset. Fixtures were deleted.
- Neon Auth requires email verification using OTP. Live Ed25519 JWKS retrieval passed; frontend supports verification and resend. Real owner sign-in, invitation claim and password reset still need verification.
- Private Neon evidence bucket: application write/read/delete and anonymous access denial passed. S3 signing region is explicitly configured. Credentials are project/branch scoped and protected locally; separate runtime/migration cloud secrets are pinned to version 1.
- Point-in-time recovery passed: an isolated branch recovered an earlier synthetic value and schema while main retained its later value. The temporary branch and canary were deleted. Free-plan recovery window is six hours; live data retention remains until manual deletion. No broad backup guarantee is inferred from this exercise.
- GitHub beta environment accepts main only. Google federation pins repository/owner IDs, exact main ref, deploy workflow and beta subject. No service account JSON keys are used.
- Cloud Run error alert created for Daleel API, migration, worker and recovery jobs, with the operator's email channel. Delivery has not been tested.
- Project-only hosting warning budget: **$10 USD/month**, thresholds 50%, 90%, 100%. This alerts; it does not cap spending. Separate AI caps remain $0.25/run and $5/workspace/month.

## Verified source

[CI run 38317885313](https://github.com/omarsalama4/daleel/actions/runs/38317885313) passed backend, frontend and container jobs at commit `a49b7b7`:

| Check | Result |
|---|---|
| Backend | 51 checks including 10 disposable PostgreSQL checks |
| Frontend | 15 checks |
| Python lint, TypeScript and production bundle | Passed |
| Pinned backend and frontend dependency audits | Passed |
| Container and Chromium smoke | Passed |
| Live Neon storage and runtime startup | Passed |
| Live workspace isolation and recovery | Passed with synthetic fixtures removed |

## Release execution

[Deployment run 38317886520](https://github.com/omarsalama4/daleel/actions/runs/38317886520) initially exposed two permission/configuration errors: GitHub's subject includes immutable IDs, and source submission needs bucket metadata access. Both were corrected with repository-specific federation and a role on the existing private bucket. The retry passed identity authentication and started Cloud Build `2a7dbb29-b0c4-488c-b750-79fd2be66f36`.

The release runs migration/bootstrap, deploys API/worker/recovery jobs, verifies candidate health and authentication boundaries, installs scheduled recovery, and promotes traffic only after smoke checks.

## Remaining release gates

1. Finish deployment and verify hosted API, static UI, worker dispatch, interruption/recovery and storage cleanup.
2. Create/configure free Groq/OpenRouter and search credentials; verify real provider outputs, grounding, quota failures and cost reservations. Approval to use the specific Google account with these providers is pending after automatic review rejected the initial sign-in.
3. Verify actual operator invitation, verified-email JWT, sign-in and password reset. Human ownership challenges must be completed by the account owner.
4. Deploy the separate browser broker with minimal secrets/permissions, expiry and interruption handling; configure and verify domain-specific authenticated selectors. No domain adapters are pre-approved or enabled. The existing broker uses in-memory connections and requires one instance; multi-instance routing remains unimplemented.
5. Verify monitoring alert delivery and add deployed uptime coverage. Tracing integration supports OTLP/Langfuse but no live exporter is configured yet.
6. Run hosted extraction-quality and multilingual evaluations, authenticated recipe replay, deletion/export recovery and resource-limit checks.

Detailed provider records and verification reports are in an ignored, ACL-protected local directory. No credentials or personal page content are committed. Passing source checks and individual provider tests do not establish complete production readiness.
