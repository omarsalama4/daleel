# Daleel production permission plan

Project: `daleel-prod-20261006-c719` (project number `530191092817`).
Region: `europe-west1`. No bindings apply to other projects.

## Identities and exact access

All service account emails below end in `@daleel-prod-20261006-c719.iam.gserviceaccount.com`.

| Identity | Resource | Role |
|---|---|---|
| daleel-runtime | Secret `daleel-runtime-env` | roles/secretmanager.secretAccessor |
| daleel-runtime | Dedicated project | roles/telemetry.tracesWriter; roles/serviceusage.serviceUsageConsumer |
| daleel-runtime | Cloud Run job `daleel-worker` only | roles/run.jobsExecutorWithOverrides |
| daleel-migration | Secret `daleel-migration-database` | roles/secretmanager.secretAccessor |
| daleel-scheduler | Cloud Run job `daleel-recovery` only | roles/run.invoker |
| daleel-build | Artifact Registry repository `daleel` | roles/artifactregistry.writer |
| daleel-deploy | Artifact Registry repository `daleel` only | roles/artifactregistry.reader |
| daleel-build | Bucket `daleel-prod-20261006-c719-build-source` | roles/storage.objectViewer |
| daleel-build | Dedicated project | roles/logging.logWriter |
| daleel-deploy | Dedicated project | roles/run.admin |
| daleel-deploy | Dedicated project | roles/cloudbuild.builds.editor |
| daleel-deploy | Dedicated project | roles/cloudscheduler.admin |
| daleel-deploy | Dedicated project | roles/logging.viewer |
| daleel-deploy | Dedicated project | roles/serviceusage.serviceUsageConsumer |
| daleel-deploy | Bucket `daleel-prod-20261006-c719-build-source` | roles/storage.objectAdmin |
| daleel-deploy | Same dedicated source bucket | roles/storage.legacyBucketReader (bucket metadata; object listing already granted by objectAdmin) |
| daleel-deploy | Service accounts runtime, migration, scheduler and build only | roles/iam.serviceAccountUser |

## Resources to create

- Empty Secret Manager containers `daleel-runtime-env` and `daleel-migration-database`; values are configured separately without logging them.
- Service account `daleel-build` for image building.
- Private source bucket `daleel-prod-20261006-c719-build-source` with uniform access and public access prevention. This stores uploaded build sources, excluding secrets, dependencies and local data through `.gcloudignore`.
- Worker, migration and recovery jobs plus API service during the verified release; worker/scheduler IAM applies only after the corresponding jobs exist.

## Deployment trust and implications

The user already approved GitHub impersonation of `daleel-deploy`. The OIDC provider condition requires repository `omarsalama4/daleel`, ref `refs/heads/main`, workflow `omarsalama4/daleel/.github/workflows/deploy.yml@refs/heads/main`, and the exact immutable-ID subject documented below.

Deployment is privileged: its Cloud Run admin and account-user access can replace the application and run code as the listed runtime/migration accounts. Those accounts can read their designated secrets. Protect the main branch and beta deployment environment accordingly. Runtime cannot execute the migration job through a project-wide jobs override grant. No service account JSON keys are created.

## Current approval state

The user approved this complete plan after automatic review requested exact recipient authorization. GitHub impersonation, project/account/bucket/registry bindings and both secret containers are applied. Separate runtime and migration values are configured as pinned version 1. Worker execution and recovery invocation bindings are applied by the release workflow only when their corresponding jobs exist.


## Verified GitHub subject format — 2026-10-13

GitHub emitted `repo:omarsalama4@129695169/daleel@1406398630:environment:beta` for the approved workflow. The provider now matches that exact subject, repository ID `1406398630` and owner ID `129695169`, plus the existing repository, main ref and exact deploy workflow. This corrects the subject-format mismatch without expanding access. Diagnostic logs contain only public identity claims, never bearer tokens.

## Verified source bucket requirement — 2026-10-13

Cloud Build submission also checks bucket metadata. The deployment account now has `roles/storage.legacyBucketReader` on the same private source bucket. This adds bucket inspection; its object listing/access was already covered by `roles/storage.objectAdmin`. No project-wide storage role was added.

## Native operational tracing

Runtime can write operational traces and consume the dedicated project API quota. It receives no additional read, secret or database privileges. The exporter uses short-lived workload credentials and removes URLs, query strings, prompts, headers, exception payloads and client trace state at export time. Google integration follows https://docs.cloud.google.com/stackdriver/docs/instrumentation/migrate-to-otlp-endpoints .

## Separate hosted browser broker

The broker is deployed as `daleel-broker` in the same region and project, using `daleel-broker@daleel-prod-20261006-c719.iam.gserviceaccount.com`. It reads only `daleel-broker-env`, containing its public URL, expected workload caller, connection limit and reviewed domain adapters. It receives no database, model or storage credentials. `daleel-deploy` receives account-user access on this broker account only, in addition to the previously listed accounts. API runtime obtains a short-lived Google-signed identity token bound to the broker URL; no permanent broker credential is copied into its runtime secret. The public viewer uses expiring capabilities; service operations require a Google-signed token for the exact `daleel-runtime` email, issuer and audience. Managed HTTP access logs are excluded for this service to prevent viewer URL retention. Initial domain-adapter configuration is empty until actual signed-in conditions are verified. Beta runs with one instance and at most two active connections; restarts invalidate live browser viewers and require reconnection.

Automatic review rejected permanent bearer-token sharing with the API. The deployed integration instead uses workload identity with no persistent broker credential. Public broker exposure was explicitly approved by the user.
