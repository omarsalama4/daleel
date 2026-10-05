# Daleel hosted beta deployment

No cloud resources have been created or deployed. New Neon, Google Cloud, Groq and OpenRouter projects are required. Local development runs without cloud credentials; without model keys extraction uses a clearly labelled deterministic fallback, and without search keys the user must supply seed URLs.

## Accounts and projects

1. Create a Neon project and database. Choose its region alongside the Cloud Run region. Enable Neon Auth, verified email, and your frontend origin. Record the Auth URL, JWT issuer, audience and JWKS URL from the project's actual configuration. JWTs must include the verified email claim; do not relax server verification to compensate for missing claims.
2. Create a separate database login for runtime, with membership in `daleel_app`, `NOSUPERUSER` and `NOBYPASSRLS`. Never give runtime the schema owner connection. Use direct PostgreSQL connections for migrations and checkpoint bootstrap. Create the role membership after running the initial migration. Runtime startup rejects a table owner or a role that bypasses RLS.
3. Create a Google Cloud project, enable Cloud Run, Cloud Build, Artifact Registry, Secret Manager and IAM Credentials. Create the `daleel` Docker repository in your selected region. Cloud billing may be required even when usage fits free allowances.
4. Create a runtime service account. Grant it Secret Manager access to its runtime configuration and Cloud Run permission to execute `daleel-worker` with overrides (`roles/run.jobsExecutorWithOverrides`). Use Workload Identity Federation for GitHub deployment; do not upload long-lived service account JSON to this public repository.
5. Configure Groq and optionally OpenRouter credentials and explicit model IDs. The OpenRouter model must have `:free`. Check route pricing and quota in provider consoles; model names and free allowances change. Configure conservative pricing ceilings before admitting calls. Configure Tavily for query discovery or use seed URLs.
6. Configure a durable S3-compatible bucket and credentials (Neon Object Storage if available for your project). Local filesystem storage is rejected in production. Set bucket lifecycle/backups deliberately; the application retains findings until manual deletion.

## Database preparation

Use the schema owner connection only in a trusted terminal:

```powershell
$env:DALEEL_MIGRATION_DATABASE_URL = 'postgresql+psycopg://OWNER:SECRET@DIRECT_HOST/DB?sslmode=require'
backend/.venv/Scripts/python -m alembic -c backend/alembic.ini upgrade head
backend/.venv/Scripts/python -m daleel.bootstrap
```

Then grant `daleel_app` membership to the separate runtime login. Keep the runtime login non-owner. Tenant tables enforce workspace policies; global account, invitation and share metadata is controlled by verified server authorization. Checkpoint tables are accessible only to backend database roles and contain run identifiers and gate metadata, not page content or session secrets. RLS is a defense within the server boundary, not a direct client database API.

## Runtime secret

Create Secret Manager secret `daleel-runtime-env` containing environment configuration based on `backend/.env.example`:

- `DALEEL_ENV=production`, `DALEEL_AUTH_MODE=jwt`.
- Runtime PostgreSQL URL, actual Neon JWT configuration, HTTPS frontend URL, exact CORS origins.
- `DALEEL_WORKER_MODE=cloud_run` and full worker job resource name.
- S3 configuration, explicit model IDs and server-side provider keys.
- Operator email allowlist and a region label.
- Optional OTLP/Langfuse configuration. Tracing records stages, run IDs and costs; prompts, page content, passwords and session cookies are not exported.

Never put secrets in a `VITE_` variable. The only public frontend configuration is the API base URL and Neon Auth URL. Local development token support is excluded from production builds.

Set repository variables `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT`, and `GCP_RUNTIME_SERVICE_ACCOUNT`. Run the manual **Deploy beta** workflow after configuring the GitHub `beta` environment. Deployment updates the API and worker images. API endpoints still require bearer authorization, except health, invitation previews and exact export capabilities. Do not expose unrestricted Cloud Run job invocation.

## Frontend and operator onboarding

Build the frontend with `VITE_NEON_AUTH_URL` and `VITE_API_BASE_URL` configured. Host the static bundle on your chosen HTTPS host and add a fallback to `index.html` for application routes. The deployment workflow currently deploys the API and worker, not a static host.

Create the first operator invitation using `python -m daleel.invite --email OPERATOR_EMAIL` with production runtime configuration in a trusted terminal. Create and verify the Neon account using that link, then claim the invitation. Further invitations can be created in Daleel's operator interface. Configure Resend if invitations should be delivered by email; otherwise the operator copies the link returned by the API.

## Recovery and operations

- One run per worker job, no automatic Cloud Run retries. The durable task ledger owns retries and fencing. Duplicate jobs are guarded by a run lease.
- `python -m daleel.worker --recover` recovers queued/running runs locally. Add a scheduled recovery dispatcher before unattended hosted operation; the deployment workflow does not configure Cloud Scheduler yet.
- AI limits are $0.25 per run and $5 per workspace per month. They exclude hosting, browser, storage, search, and email costs. Reservations remain charged when provider billing is uncertain.
- Watch `worker_error`, expired leases, search quota, storage quota, API error rate and provider cost overruns. Limit max Cloud Run instances and set billing alerts independently of AI caps.
- Application deletion removes live findings and export artifacts. Database backup expiry and external trace retention are provider-managed and require explicit provider configuration. Excerpts are inline evidence; raw HTML snapshots are intentionally not retained by this implementation.

## Hosted sign-in integration prerequisite

The UI and API implement the connection protocol, encrypted session storage, scoped cookie reuse and revocation. An optional broker is bundled as `daleel.broker:app`. It starts a separate Chromium process per connection and exposes an expiring screenshot/control viewer. Run it as a separate protected service, with no access logs, using `uvicorn daleel.broker:app --host 0.0.0.0 --port 8001 --no-access-log`. The automated Playwright renderer is a separate component.

The bundled broker isolates every connection by workspace and browser process. Any replacement broker must also isolate every connection by workspace, require backend authentication, serve an expiring HTTPS viewer link, let the user personally complete login/MFA, and validate authentication using a domain-specific signed-in condition. Cookie presence alone is insufficient. It must destroy its browser after finish/expiry and never retain raw passwords or expose storage state to the frontend.

Configure `DALEEL_BROKER_PUBLIC_URL` and `DALEEL_BROKER_SITES` as JSON, keyed by target hostname. Each adapter supplies `loginUrl`, `authenticatedSelector` (a visible, site-specific signed-in control), and optional `allowedHosts` for login dependencies. No adapters are pre-enabled; selectors must be reviewed against the real site. A domain without a condition fails clearly. The viewer supports user clicks, typing, Tab/Enter, and scrolling; passkeys, downloads, WebSocket sites and popup OAuth need a separate reviewed adapter. Set `DALEEL_BROWSER_ENABLED=true` for JavaScript-dependent research pages.

Keep broker max instances at one while connections are in memory, allocate Chromium memory, and configure instance CPU/lifetime so its expiry reaper can run. Scaling the broker across instances requires external connection routing; it is not covered by the API/worker deployment workflow. Its viewer is a secret capability; restrict service routes with a strong broker token and keep all access logs disabled.

Required broker routes:

- `POST /connections`: `{id, workspaceId, url}` → `{browserUrl}`.
- `POST /connections/{id}/finish`: `{workspaceId}` → `{authenticated: true, storageState: {cookies, origins}}` only after validated login.

Keep that broker on a protected service-to-service endpoint. Configure `DALEEL_SESSION_BROKER_URL`, `DALEEL_SESSION_BROKER_TOKEN` and a Fernet encryption key through secrets. Never bypass MFA, CAPTCHA, robots policy or a site's explicit restriction.

## Release gate

Hosted beta remains pending real-account sign-in and invite validation, PostgreSQL migrations and isolation verification, Cloud Run worker execution/recovery, object storage, model/search credentials, and configured/verified browser adapters. Build success alone does not establish hosted readiness.
