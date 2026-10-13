# Daleel production readiness — 2026-10-13

**Status: hosted application deployed; end-to-end production verification remains incomplete.**

## Verified infrastructure

- Google Cloud project `daleel-prod-20261006-c719`, approved owner and billing account, private Artifact Registry and build source bucket. `.gcloudignore` excludes credentials, local data and environment files from uploaded sources.
- Dedicated free Neon organization and PostgreSQL 17 project `bold-fog-96164252` in Frankfurt. Schema revision `0001`, checkpoint tables and non-owner runtime role are installed.
- Live Neon isolation passed using two synthetic workspaces: all six tenant RLS policies enabled, cross-workspace reads/updates/deletes hidden, cross-workspace inserts rejected, transaction context reset. Fixtures were deleted.
- Neon Auth requires email verification using OTP. Live Ed25519 JWKS retrieval passed; frontend supports verification and resend. Real owner sign-in, invitation claim and password reset still need verification.
- Private Neon evidence bucket: application write/read/delete and anonymous access denial passed. S3 signing region is explicitly configured. Credentials are project/branch scoped and protected locally; separate runtime/migration cloud secrets are pinned to version 1.
- Point-in-time recovery passed: an isolated branch recovered an earlier synthetic value and schema while main retained its later value. The temporary branch and canary were deleted. Free-plan recovery window is six hours; live data retention remains until manual deletion. No broad backup guarantee is inferred from this exercise.
- GitHub beta environment accepts main only. Google federation pins repository/owner IDs, exact main ref, deploy workflow and beta subject. No service account JSON keys are used.
- Native OTLP trace export and Cloud Trace readback passed with a synthetic span. Export-time privacy tests cover late-added URLs, prompts, authorization headers, exceptions, resource secrets and client trace state. API and worker activation uses runtime secret version 2 in the next release.
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

[Deployment run 38317886520](https://github.com/omarsalama4/daleel/actions/runs/38317886520) initially exposed two permission/configuration errors: GitHub's subject includes immutable IDs, and source submission needs bucket metadata access. Both were corrected with repository-specific federation and a role on the existing private bucket. The image build passed. Migration and checkpoint bootstrap also passed in Cloud Run. Release `38320098367` then exposed first-service traffic handling and a mounted secret directory hiding `/app`. The workflow now keeps the first usable revision private, authenticates smoke checks with the canonical service audience, and mounts configuration under `/var/secrets/daleel/` using `DALEEL_CONFIG_FILE`. S3 storage no longer requires a local artifact directory. The corrected release is pending execution.

The release runs migration/bootstrap, deploys API/worker/recovery jobs, verifies candidate health and authentication boundaries, installs scheduled recovery, and promotes traffic only after smoke checks.

## Remaining release gates

1. Finish deployment and verify hosted API, static UI, worker dispatch, interruption/recovery and storage cleanup.
2. Create/configure free Groq/OpenRouter and search credentials; verify real provider outputs, grounding, quota failures and cost reservations. Approval to use the specific Google account with these providers is pending after automatic review rejected the initial sign-in.
3. Verify actual operator invitation, verified-email JWT, sign-in and password reset. Human ownership challenges must be completed by the account owner.
4. Deploy the separate browser broker with minimal secrets/permissions, expiry and interruption handling; configure and verify domain-specific authenticated selectors. No domain adapters are pre-approved or enabled. The existing broker uses in-memory connections and requires one instance; multi-instance routing remains unimplemented.
5. Verify monitoring alert delivery and add deployed uptime coverage. Native trace ingestion/readback passed; verify the deployed runtime exporter after version 2 is activated.
6. Run hosted extraction-quality and multilingual evaluations, authenticated recipe replay, deletion/export recovery and resource-limit checks.

Detailed provider records and verification reports are in an ignored, ACL-protected local directory. No credentials or personal page content are committed. Passing source checks and individual provider tests do not establish complete production readiness.

Latest local regression results: **46 passed, 10 PostgreSQL checks skipped locally**; Python lint and release YAML/Bash syntax passed. The five new checks cover tracing privacy/authentication and mounted-secret/S3 behavior. Disposable PostgreSQL checks continue to run in GitHub CI.

## Hosted rollout and crawler verification

- Release [38321342628](https://github.com/omarsalama4/daleel/actions/runs/38321342628) passed. API revision `daleel-api-00002-cif` serves 100% of traffic at https://daleel-api-530191092817.europe-west1.run.app . `/health`, `/ready` and the real sign-in bundle passed; protected account/run endpoints return 401 without credentials and unknown API routes return 404.
- Recovery is enabled every five minutes. A synthetic queued run was dispatched through the real scheduler/runtime identity. Its HTTPS page failed because the SNI extension used bytes where the installed transport requires text. Corrected this without weakening DNS pinning or certificate validation; transport regression and a real local HTTPS fetch passed. Hosted repeat is pending the corrected image.
- Isolated browser broker is deployed after explicit public-exposure approval. Live service authentication, unsupported-domain denial and invalid-viewer expiry checks passed. No domain adapters are enabled.
- Workload identity integration replaces static broker credential sharing, which automatic review rejected. New pinned configuration versions are runtime 3 and broker 2. Real workload-token verification remains pending deployment.
- Five-minute HTTPS liveness checks, a multi-location failure alert, an error alert, native metrics dashboard and the project-only $10 hosting warning are configured. Routine probes use `/health`; `/ready` is checked during deployment and manually, avoiding continuous database queries that would prevent free Neon compute from suspending. Alert delivery has not been tested.
- Latest local suite: **53 passed, 10 PostgreSQL checks skipped locally**. New source CI and hosted crawler verification remain pending. Provider sign-in/account challenges, AI/search credentials, domain adapters and authenticated recipe evaluation remain release gates.
