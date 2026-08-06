# T005 — Completion Report

**Task:** T005 — Create Docker-local dependency environment (Epic E00)

**Branch:** `codex/T005-docker-local-dependencies` → PR into `develop`

**Base:** `origin/develop` at `93b2959` (T004 merged and owner-verified)

**Commit:** Pending final task commit

**State transition:** `Not Started` → `In Review`

## Specifications read

- `/AGENTS.md` — repository agent contract and scope controls.
- `/IMPLEMENTATION_BASELINE.md` and `/IMPLEMENTATION_SEQUENCE.md` — frozen stack and task ordering.
- `/implementation/WORKSTREAM_REGISTRY.md` and `/implementation/epics/E00-repository-and-quality-foundation.md` — ownership, dependency, and epic gates.
- `/implementation/tasks/T005-create-docker-local-dependency-environment.md` — task authority, deliverables, acceptance criteria, and completion-report contract.
- `/DEPLOYMENT_PROFILES.md` — bootstrap profile: PostgreSQL, pg-boss, S3-compatible/local object storage, and SMTP.
- `/COST_GUARDRAILS.md` — free local development dependencies and no surprise spend.
- `/THIRD_PARTY_DEPENDENCY_REGISTER.md` — dependency documentation, licensing, maintenance, exposure, cost, and fallback requirements.
- `/ENVIRONMENT_VARIABLE_CATALOG.md` — closed application configuration names for database, object storage, and SMTP.
- `/docs/04-system-architecture/container-architecture.md` and `/docs/04-system-architecture/object-storage-architecture.md` — container and object-storage boundaries.
- `/docs/20-devops-sre-and-platform-engineering/development-environment.md`, `local-development-environment.md`, `object-storage-platform.md`, and `platform-reference.md` — local platform and operational requirements.
- `/docs/25-architecture-decisions/ADR-004-postgresql-17.md` — PostgreSQL 17 or later is binding.
- `/docs/25-architecture-decisions/ADR-009-smtp-email.md` — standard SMTP abstraction is binding; provider APIs are optional adapters only.
- Upstream primary sources for reviewed pins and health contracts: [PostgreSQL official image](https://hub.docker.com/_/postgres), [SeaweedFS releases and Docker S3 quick start](https://github.com/seaweedfs/seaweedfs), and [Mailpit releases, Docker images, and health endpoints](https://mailpit.axllent.org/docs/integration/healthcheck/).

## Files changed

- Added `compose.yaml` — pinned PostgreSQL 17, SeaweedFS S3-compatible storage, and Mailpit SMTP capture services.
- Added `docker/README.md` — setup, configuration mapping, verification, diagnostics, lifecycle, destructive reset, rollback, dependency governance, and limitations.
- Added `tests/docker-local.test.mjs` — deterministic primary- and failure-path contract tests.
- Modified `.github/workflows/ci.yml` — appended the T005 test to T004's explicit CI test list; no workflow permissions or behavior changed otherwise.
- Modified only the T005 row in `implementation/WORKSTREAM_REGISTRY.md`.
- Added this completion report.

No root package manifest, lockfile, application package, T004 traceability tool, T003 configuration implementation, schema, or migration is changed.

## Requirements implemented

1. A single local Compose project provides the three approved bootstrap dependencies:
   - PostgreSQL `17.10` for relational persistence and later pg-boss use.
   - SeaweedFS `4.29` for the documented S3-compatible object-storage adapter.
   - Mailpit `1.30.0` for the documented standard SMTP adapter and safe local capture.
2. Every image uses an exact release tag; `latest` and `edge` are rejected by an automated test.
3. Every host port binds to `127.0.0.1`. The Compose dependency network is internal and provides no outbound route.
4. PostgreSQL and object-storage data use named volumes. Reset and non-destructive stop paths are documented separately.
5. Each service has a health check and bounded startup retry behavior.
6. Compose requires developer-supplied PostgreSQL and S3-compatible credentials at interpolation time. No secret, credential value, anonymous object-storage default, paid API, or external relay is committed.
7. The object-storage bucket is created deterministically as `fixmyfeed-local`.
8. The runbook maps the services to the already-approved application variable catalog without adding application runtime variables.
9. Mailpit captures email locally; no external SMTP relay or production delivery path is configured.
10. CI invokes the T005 structural test alongside the existing repository tests.

## Domain, schema, API, event, migration, and environment changes

- **Domain/schema/API/event:** None.
- **Database migrations:** None. PostgreSQL starts with an empty local database; schema ownership begins in T010.
- **Application environment-variable catalog:** No change. Existing `DATABASE_URL`, `OBJECT_STORAGE_*`, and `SMTP_*` variables cover the application boundary.
- **Compose-only bootstrap input:** `FIXMYFEED_POSTGRES_PASSWORD` is documented in `docker/README.md` and is consumed only by the official PostgreSQL container. It is not client-readable or part of the application configuration schema.
- **External credentials:** None. Three values must be chosen interactively by each developer for the local session; they are local credentials, not owner-supplied provider credentials.

## Tests and exact results

TDD red evidence before implementation:

```text
node --test tests/docker-local.test.mjs
tests 3; pass 1; fail 2
Expected failures: compose.yaml and docker/README.md did not exist.
```

Task test after implementation and formatting:

```text
node --test tests/docker-local.test.mjs
tests 3; pass 3; fail 0
```

The primary tests verify the approved services, exact version pins, loopback ports, required secret interpolation, named volumes, health checks, deterministic bucket, internal network, and runbook lifecycle commands. The failure test proves floating tags, public host bindings, missing services, missing required secrets, and missing health checks are rejected.

Repository checks after rebasing onto T004:

```text
ESLint: pass
TypeScript build/typecheck: pass
node --test tests/boundaries.test.mjs tests/tooling.test.mjs tests/config.test.mjs tests/traceability.test.mjs tests/docker-local.test.mjs
tests 39; pass 39; fail 0
node tools/traceability/check.mjs
pass — 100 registry rows, 100 task docs, 15 epic docs, 43 catalog variables
Prettier on all T005-owned files and the CI workflow: pass
git diff --check: pass
```

The test count above combines the 27-test full baseline run and the 15-test traceability/T005 run without double-counting the three T005 tests. A final clean-checkout verification is required after the task commit so `.gitattributes` can normalize all pre-existing Windows checkout files.

Runtime acceptance commands are documented but were not executed in this agent environment because the Docker CLI/daemon is not installed:

```text
docker compose config --quiet
docker compose up --detach --wait
docker compose ps
```

No runtime-start success is claimed without that evidence.

## Security and privacy analysis

- All published ports are loopback-only and the dependency network is internal.
- Missing PostgreSQL or object-storage credentials fail before container creation. Secrets have no committed defaults and the test guards required interpolation.
- SeaweedFS authentication is enabled through required access and secret keys; its anonymous development mode is not used.
- Mailpit has no relay configuration and therefore cannot send captured development messages externally through this project.
- Pinned images make upgrades reviewable and reproducible. Maintained SeaweedFS is used instead of archived MinIO.
- No tenant, catalog, personal, or production data is introduced. Developers must not load production data into this local profile.
- No telemetry, logs, URLs, or client-readable configuration are added that could expose credentials.

## Accessibility analysis

No application user interface is changed. Mailpit's bundled development UI is third-party operational tooling and is not a FixMyFeed product surface.

## Performance and cost analysis

- All three dependencies are open source and run locally with no recurring external charge.
- One process per dependency keeps the bootstrap profile bounded; no production clustering, replication, search, cache, or paid provider is added.
- Health checks use five-second intervals and bounded retry/start periods. They do not add application runtime traffic.
- Named volumes avoid full database/object-store recreation on every developer restart.

## External credentials, approvals, and environment requirements

- Docker Engine or Docker Desktop with Docker Compose v2 is required for live startup.
- No marketplace approval, cloud account, API key, paid subscription, or production credential is required.
- Developers must enter local values for `FIXMYFEED_POSTGRES_PASSWORD`, `OBJECT_STORAGE_ACCESS_KEY`, and `OBJECT_STORAGE_SECRET_KEY` in their current shell. The repository provides no values.

## Rollback and recovery

1. Preserve local data with `docker compose down`.
2. Revert the T005 commit to remove the Compose file, runbook, test, report, CI-list entry, and registry transition.
3. If the local dependency data must also be erased, the developer may explicitly run `docker compose down --volumes`. This is destructive and cannot be recovered without a separate backup.
4. Image rollback requires reverting to a previously reviewed exact tag and checking upstream data-format compatibility before restart.

No schema migration or external side effect must be rolled back.

## Known limitations

1. Docker is unavailable in the implementation-agent host, so image pull, Compose schema rendering, container health, port access, persistence across restart, and destructive reset were not live-tested here. The exact acceptance commands are in `docker/README.md` and should be run by the PR owner or CI host with Docker.
2. Local verification used Node `22.20.0`; the repository requires Node 24 and the GitHub Actions workflow runs Node 24. PR CI is therefore the authoritative target-runtime result.
3. T004 deliberately retains an explicit CI test list until T002 supplies the shared test harness. T005 appends its test to that list; T002 should later consolidate discovery without dropping this file.
4. This profile starts dependencies only. Application processes, database migrations, seed data, production deployment, TLS, backup automation, and high availability are outside T005.
5. SeaweedFS and Mailpit health checks rely on utilities included by their pinned images; live startup evidence is required before owner verification.

## Traceability entries

- `implementation/WORKSTREAM_REGISTRY.md`: T005 → `In Review`.
- `tests/docker-local.test.mjs`: primary and failure evidence for T005 service, security, persistence, health, and operations contracts.
- `.github/workflows/ci.yml`: repository execution path for the T005 test.
- `docker/README.md`: operational, rollback, dependency, variable, cost, and acceptance evidence.
- `reports/T005-completion-report.md`: task-level audit and known-limitations record.
