# Docker-local dependencies

Task T005 provides the free, local-only dependency profile required by the FixMyFeed bootstrap architecture. The application itself continues to run through the workspace tooling; this Compose project starts only PostgreSQL, S3-compatible object storage, and an SMTP capture service.

## Prerequisites

- Docker Engine or Docker Desktop with Docker Compose v2
- Enough local disk for the two named data volumes
- Three developer-chosen values entered into the current shell session; no values are stored by this repository

## Services

| Service    | Pinned image                | Host endpoint                                     | Purpose                                                            |
| ---------- | --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| PostgreSQL | `postgres:17.10-alpine3.23` | `127.0.0.1:5432`                                  | PostgreSQL 17 application database and later pg-boss queue storage |
| SeaweedFS  | `chrislusf/seaweedfs:4.29`  | `http://127.0.0.1:8333`                           | S3-compatible object storage with the `fixmyfeed-local` bucket     |
| Mailpit    | `axllent/mailpit:v1.30.0`   | SMTP `127.0.0.1:1025`; UI `http://127.0.0.1:8025` | Captures development email without external delivery               |

Every published port binds to loopback. The internal Compose network has no outbound route, and no service is suitable for production use.

## Start

Set the required inputs interactively in PowerShell so they remain only in the current process and its children:

```powershell
$env:FIXMYFEED_POSTGRES_PASSWORD = Read-Host "Local PostgreSQL password"
$env:OBJECT_STORAGE_ACCESS_KEY = Read-Host "Local object-storage access key"
$env:OBJECT_STORAGE_SECRET_KEY = Read-Host "Local object-storage secret key"

docker compose config --quiet
docker compose up --detach --wait
docker compose ps
```

For a POSIX shell:

```sh
read -r -s -p "Local PostgreSQL password: " FIXMYFEED_POSTGRES_PASSWORD && export FIXMYFEED_POSTGRES_PASSWORD
read -r -s -p "Local object-storage access key: " OBJECT_STORAGE_ACCESS_KEY && export OBJECT_STORAGE_ACCESS_KEY
read -r -s -p "Local object-storage secret key: " OBJECT_STORAGE_SECRET_KEY && export OBJECT_STORAGE_SECRET_KEY

docker compose config --quiet
docker compose up --detach --wait
docker compose ps
```

Compose rejects a missing input before creating containers. It does not supply convenience passwords, anonymous object-storage access, paid services, or vendor credentials.

## Application configuration

Use the existing application configuration catalog. The developer-selected object-storage credentials above are the values for the corresponding application variables; do not copy them into a tracked file.

| Application variable        | Local setting                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | PostgreSQL DSN for user/database `fixmyfeed` at `127.0.0.1:5432`, using the interactively supplied password |
| `OBJECT_STORAGE_DRIVER`     | `s3` when exercising this dependency; `filesystem` remains the documented default                           |
| `OBJECT_STORAGE_ENDPOINT`   | `http://127.0.0.1:8333`                                                                                     |
| `OBJECT_STORAGE_BUCKET`     | `fixmyfeed-local`                                                                                           |
| `OBJECT_STORAGE_ACCESS_KEY` | The interactively supplied access key                                                                       |
| `OBJECT_STORAGE_SECRET_KEY` | The interactively supplied secret key                                                                       |
| `SMTP_HOST`                 | `127.0.0.1` from a host process, or `mailpit` from another Compose service                                  |
| `SMTP_PORT`                 | `1025`                                                                                                      |
| `SMTP_FROM`                 | A developer-selected non-production sender address                                                          |

Mailpit authentication and TLS remain disabled for this loopback-only development sink. It does not relay captured messages unless an operator explicitly adds an external relay configuration, which this project does not provide.

## Verify

After `docker compose up --detach --wait` succeeds, run:

```powershell
docker compose ps
docker compose exec postgres pg_isready -U fixmyfeed -d fixmyfeed
docker compose exec object-storage wget --spider -q http://127.0.0.1:9333/healthz
Invoke-WebRequest http://127.0.0.1:8025/readyz
node --test tests/docker-local.test.mjs
```

All three containers must report `healthy`. The PostgreSQL probe must accept connections, the SeaweedFS health endpoint must respond successfully, and Mailpit `/readyz` must return HTTP 200.

Useful diagnostics:

```powershell
docker compose ps --all
docker compose logs postgres object-storage mailpit
docker compose config
```

## Stop, recovery, and reset

Stop containers while preserving database and object data:

```powershell
docker compose down
```

Restarting with the same inputs reuses both named volumes. If a container is unhealthy, inspect its logs, correct the input or port conflict, then run `docker compose up --detach --wait` again.

The following reset is destructive: it removes all local PostgreSQL and object-storage data managed by this Compose project. The data cannot be recovered unless the developer made a separate backup.

```powershell
docker compose down --volumes
```

Image rollback is a normal Git revert of `compose.yaml`; start the reverted pinned versions only after checking their data-format compatibility. Do not change a tag to `latest` or `edge`.

## Dependency governance

| Dependency    | Owner and purpose                                        | License / maintenance                         | Exposure and cost                                               | Fallback / removal                                                                                        |
| ------------- | -------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| PostgreSQL 17 | Platform Engineering; local relational database          | PostgreSQL License; maintained official image | Loopback-only; free and local                                   | Use a developer-managed PostgreSQL 17 instance, or remove when the database adapter no longer requires it |
| SeaweedFS 4   | Platform Engineering; local S3-compatible adapter target | Apache-2.0; maintained upstream               | Loopback-only; free and local                                   | Use the documented filesystem driver or another S3-compatible endpoint behind the object-storage adapter  |
| Mailpit 1     | Platform Engineering; local SMTP capture target          | MIT; maintained upstream                      | Loopback-only; free and local; external relay is not configured | Use another standard SMTP test server behind the SMTP adapter                                             |

The versions are pinned to reviewed releases. Upgrade pull requests must review upstream release notes and security advisories, update the structural test, and repeat the live startup checks. These development implementations do not replace the approved PostgreSQL, S3-compatible object-storage, or SMTP architecture and therefore introduce no new production provider contract.
