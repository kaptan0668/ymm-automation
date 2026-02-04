# YMM Automation Mono Repo

This repository contains a Django + DRF backend and a Next.js (App Router) frontend, orchestrated via Docker Compose.

## Stack

Backend:
- Django + DRF
- PostgreSQL
- JWT (SimpleJWT)
- Celery + Redis
- MinIO (S3-compatible)

Frontend:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Table

## Services

- `db` (Postgres)
- `redis`
- `minio`
- `backend`
- `worker` (Celery)
- `frontend`

All ports are bound to 127.0.0.1 for local-only exposure.

## Running

```bash
docker compose up --build
```

Backend API:
- http://127.0.0.1:8000/api/

Frontend:
- http://127.0.0.1:3000/

MinIO Console:
- http://127.0.0.1:9001/

## Auth

Uses JWT via `djangorestframework-simplejwt`.

## Domain Rules

Document types:
- `GLE`, `GDE`, `KIT`, `DGR`
Each type has its own yearly counter.
Format: `TUR-YYYY-001`

Report types:
- `TT`, `KDV`, `OAR`, `DGR`

Report number:
`YMM-06105087-{type_cumulative}/{year}-{year_serial_all_types:03d}`

Counters are stored in Postgres and locked with `select_for_update` to avoid collisions.

## Models

- Customer
- Document
- DocumentCounter
- Report
- ReportCounterYearAll
- ReportCounterTypeCum
- File
- AuditLog
- ContractJob

## GitHub Actions

Two workflows build and push Docker images to GHCR on every push:
- `ghcr.io/<GITHUB_USERNAME>/ymm-backend:latest`
- `ghcr.io/<GITHUB_USERNAME>/ymm-frontend:latest`

`GITHUB_TOKEN` is used with `packages: write` permission.
