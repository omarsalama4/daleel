# Daleel production permission plan

Project: `daleel-prod-20261006-c719` (project number `530191092817`).
Region: `europe-west1`. No bindings apply to other projects.

## Identities and exact access

All service account emails below end in `@daleel-prod-20261006-c719.iam.gserviceaccount.com`.

| Identity | Resource | Role |
|---|---|---|
| daleel-runtime | Secret `daleel-runtime-env` | roles/secretmanager.secretAccessor |
| daleel-runtime | Cloud Run job `daleel-worker` only | roles/run.jobsExecutorWithOverrides |
| daleel-migration | Secret `daleel-migration-database` | roles/secretmanager.secretAccessor |
| daleel-scheduler | Cloud Run job `daleel-recovery` only | roles/run.invoker |
| daleel-build | Artifact Registry repository `daleel` | roles/artifactregistry.writer |
| daleel-build | Bucket `daleel-prod-20261006-c719-build-source` | roles/storage.objectViewer |
| daleel-build | Dedicated project | roles/logging.logWriter |
| daleel-deploy | Dedicated project | roles/run.admin |
| daleel-deploy | Dedicated project | roles/cloudbuild.builds.editor |
| daleel-deploy | Dedicated project | roles/cloudscheduler.admin |
| daleel-deploy | Dedicated project | roles/logging.viewer |
| daleel-deploy | Dedicated project | roles/serviceusage.serviceUsageConsumer |
| daleel-deploy | Bucket `daleel-prod-20261006-c719-build-source` | roles/storage.objectAdmin |
| daleel-deploy | Service accounts runtime, migration, scheduler and build only | roles/iam.serviceAccountUser |

## Resources to create

- Empty Secret Manager containers `daleel-runtime-env` and `daleel-migration-database`; values are configured separately without logging them.
- Service account `daleel-build` for image building.
- Private source bucket `daleel-prod-20261006-c719-build-source` with uniform access and public access prevention. This stores uploaded build sources, excluding secrets, dependencies and local data through `.gcloudignore`.
- Worker, migration and recovery jobs plus API service during the verified release; worker/scheduler IAM applies only after the corresponding jobs exist.

## Deployment trust and implications

The user already approved GitHub impersonation of `daleel-deploy`. The OIDC provider condition requires repository `omarsalama4/daleel`, ref `refs/heads/main`, workflow `omarsalama4/daleel/.github/workflows/deploy.yml@refs/heads/main`, and subject `repo:omarsalama4/daleel:environment:beta`.

Deployment is privileged: its Cloud Run admin and account-user access can replace the application and run code as the listed runtime/migration accounts. Those accounts can read their designated secrets. Protect the main branch and beta deployment environment accordingly. Runtime cannot execute the migration job through a project-wide jobs override grant. No service account JSON keys are created.

## Current approval state

The user approved this complete plan after automatic review requested exact recipient authorization. GitHub impersonation, project/account/bucket/registry bindings and both empty secret containers are applied. No secret values are configured. Worker execution and recovery invocation bindings are applied by the release workflow only when their corresponding jobs exist.
