# FixMyFeed

Multi-tenant SaaS for Shopify, WooCommerce, file-feed, and Google Merchant Center
product-feed **diagnostics and repair**. (Previously code-named "Feed Doctor" —
that name still appears throughout the specification documents and internal
identifiers pending a separate rename task.)

## Repository layout

This repository is a controlled-execution monorepo. Work is performed one task at
a time against the specifications, on a dedicated branch, and merged only after the
task's acceptance gates pass.

```
/                                   ← repository root
├── apps/                           ← deployable applications (added by T000)
│   ├── web/                        ← Next.js: public SEO + authenticated app + bounded APIs
│   ├── worker/                     ← pg-boss durable jobs (imports, diagnostics, repairs, ...)
│   └── maintenance/                ← recurring scheduler (enqueues work only)
├── packages/                       ← shared packages (added by T000)
│   ├── domain/ contracts/ config/ observability/
│   ├── database/ auth/ connectors/ diagnostics/ repairs/ jobs/
│   └── analytics/ seo/ ui/ testing/
└── feed-doctor-implementation-specifications-v1.0.0/
        feed-doctor-specifications-implementation-v1.0.0/   ← authoritative specifications
        ├── AGENTS.md               ← controlling agent contract (READ FIRST)
        ├── AGENT_BOOTSTRAP_PROMPT.md
        ├── IMPLEMENTATION_BASELINE.md
        ├── docs/                   ← product, architecture, security, data, API, ... specs
        └── implementation/         ← epics, tasks, WORKSTREAM_REGISTRY.md
    feed-doctor-specifications-foundation-v0.1.0/           ← earlier foundation snapshot (reference)
```

## Where to start (agents & engineers)

1. Read [`AGENTS.md`](feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/AGENTS.md)
   — the controlling contract for all implementation work.
2. Read [`IMPLEMENTATION_BASELINE.md`](feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/IMPLEMENTATION_BASELINE.md)
   — the frozen production stack.
3. Take the earliest unblocked task from
   [`implementation/WORKSTREAM_REGISTRY.md`](feed-doctor-implementation-specifications-v1.0.0/feed-doctor-specifications-implementation-v1.0.0/implementation/WORKSTREAM_REGISTRY.md).
4. Implement **only** that task on its own branch, run the required gates, open one
   pull request, and stop.

## Stack (frozen baseline)

TypeScript monorepo · Next.js 16 (App Router) · Node.js 24 LTS · PostgreSQL 17+ ·
Drizzle ORM · Better Auth · pg-boss · S3-compatible object storage · SMTP ·
PostgreSQL full-text search. Web deployment is Vercel-compatible and Docker-portable;
durable workers deploy separately from request-serving web processes.

No mandatory paid AI API. Billing, automated writeback, and optional intelligence
remain feature-flagged until owner credentials and explicit approval are present.

## Branching model

- `main` — reviewed, stable.
- `develop` — integration branch; task branches merge here via PR.
- `task/T<id>-<slug>` — one task per branch, one PR per task.
