# T024 — Completion Report

**Task:** T024 — Implement SMTP notification adapter (Epic E02)
**Branch:** `task/T024-implement-smtp-notification-adapter` → PR into `develop`
**Depends on:** T000 (monorepo boundaries), T003 (config) — merged.
**State transition:** `Not Started` → `In Review`

## Specifications read

- `implementation/tasks/T024-implement-smtp-notification-adapter.md` (authority)
- `docs/25-architecture-decisions/ADR-009-smtp-email.md` — **SMTP is the mandatory email abstraction; vendor APIs are optional adapters** (binding decision)
- `docs/04-system-architecture/notification-architecture.md`, `docs/03-domain-model/notification-domain.md`
- `docs/04-system-architecture/monorepo-architecture.md` + `boundaries.json` (package/boundary graph)
- `packages/config/src/{schema,load}.ts` — the pre-existing `SMTP_*` variables, the `smtp` config block, and the derived `email` feature flag (`host && from`)

## What was built

A new **`@fixmyfeed/notifications`** package — the notification-delivery abstraction, with a provider-neutral **SMTP email adapter** as its first channel (owner-chosen name, future-proof for the webhook/in-app/digest channels in notification-architecture.md).

- **`EmailNotifier` port** — the contract consumers code against: `send(EmailMessage) → EmailReceipt`.
- **Trust-boundary validation (`email.ts`, pure)** — `validateEmailMessage` checks recipients (non-empty, valid, bounded to `MAX_RECIPIENTS`=50 across to/cc/bcc), subject (non-empty, ≤998), a required plain-text body, optional HTML, `replyTo`, and resolves/validates the From address. `assertEmailAddress` is exported for reuse.
- **SMTP adapter (`smtp-notifier.ts`)** — `createSmtpNotifier(transport, defaultFrom)` over a **minimal injected `SmtpTransportLike` port** (nodemailer-shaped). The application constructs the transport with owner-supplied SMTP credentials + TLS and injects it, so this package holds **no mail SDK and no credentials**. Transport failures become a **retryable `NOTIFICATION_UPSTREAM_ERROR`**; the returned receipt lists accepted/rejected recipients so a partial delivery preserves successful work.
- **Channel selector (`email.ts`)** — `createEmailNotifier(settings, deps)` throws `NOTIFICATION_UNAVAILABLE` when the channel is disabled (no host/from — matching config's `email` flag) or unwired, so the app degrades safely with a truthful disabled state.
- **Canonical errors (`errors.ts`)** — `NotificationError` with stable codes `NOTIFICATION_INVALID_MESSAGE / UNAVAILABLE / UPSTREAM_ERROR` and a `retryable` flag; messages are secret-free.

## Files changed

- **Added:** `packages/notifications/{package.json,tsconfig.json}`, `packages/notifications/src/{index,errors,email,smtp-notifier}.ts`, `tests/notifications.test.mjs`, `reports/T024-completion-report.md`.
- **Modified (shared, additive):** `boundaries.json` (new `notifications` package + layer `2-infrastructure` + allow-lists for notifications/web/worker/maintenance); `docs/04-system-architecture/monorepo-architecture.md` (package list); root `tsconfig.json` (project reference); `.github/workflows/ci.yml` (test list); `WORKSTREAM_REGISTRY.md` (T024 → In Review); `pnpm-lock.yaml` (new workspace link only).

## Domain / schema / API / event changes

None. No database table, no migration, no new environment variable (the five `SMTP_*` variables already exist in the catalog), no new runtime dependency, no new event.

## Tests and exact results

Full CI gate **locally**: `node --test` over all 17 test files → **177 pass, 0 fail**; `tsc -b` clean; `prettier --check .` clean; `eslint .` clean; `check:traceability` 100/100.

`tests/notifications.test.mjs` (9): address validation (valid accepted, malformed rejected); default-From resolution + explicit-From override; rejection of empty recipients/subject/body/bad-from/bad-cc; recipient bound; selector `UNAVAILABLE` (disabled/unwired) + correct default-From forwarding; SMTP send returns a receipt; **partial-success receipt (accepted + rejected preserved)**; transport-throw → **retryable UPSTREAM** and missing-message-id → UPSTREAM; invalid messages rejected **before** the transport is called.

**Verification limits (no live mail server):** the adapter runs against an in-memory fake transport. A live SMTP integration (e.g. Mailpit/MailHog) needs owner-supplied SMTP settings and is a reasonable follow-up; the abstraction, validation, and failure paths are exercised deterministically here.

## Security & privacy analysis

- **No secrets in this package** — SMTP credentials live in the app-constructed transport; error messages never include the password, host, or message body.
- **Bounded fan-out** — `MAX_RECIPIENTS` caps recipients per message, limiting abuse/accidental mass-send.
- **Deny-by-default validation** — malformed input is rejected at the trust boundary before any transport call.
- **Safe degradation** — a disabled/unconfigured channel yields a truthful `UNAVAILABLE` rather than a silent drop.
- Privacy note: callers are responsible for not placing customer catalog/personal data in bodies beyond what a notification requires (consistent with the privacy spec); the adapter neither logs nor persists message content.

## Accessibility analysis

N/A (backend infrastructure, no UI). Email content authored by later notification-template tasks must meet the content specs; not in this adapter's scope.

## Performance & cost analysis

Cost $0 (no new services/deps). One `sendMail` call per message; no unbounded loops; recipient count is bounded. Long-running/retry semantics are delegated to the caller (e.g. the T021 queue / T022 outbox), which the `retryable` flag informs.

## External credentials or approvals still required

Production email requires owner-supplied `SMTP_{HOST,PORT,USERNAME,PASSWORD,FROM}` and an app-wired SMTP transport (e.g. nodemailer). None required for CI or for the disabled/bootstrap state.

## Rollback procedure

Revert the PR merge commit, or: delete `packages/notifications/` and `tests/notifications.test.mjs`; remove `notifications` from `boundaries.json` (package list, layer, allow-lists), the `monorepo-architecture.md` package line, the root `tsconfig.json` reference, and the ci.yml test entry; set the T024 registry row to `Not Started`; run `pnpm install`. Non-destructive: no schema, no data.

## Known limitations / follow-ups

1. **Live SMTP integration test** (Mailpit/MailHog via owner settings) — deferred.
2. **App wiring** — a later task adapts nodemailer (or equivalent) to `SmtpTransportLike` in the worker/web app and calls `createEmailNotifier(config.smtp, deps)`.
3. **Additional channels** (webhook, in-app, digests) and **notification domain/tables** (deliveries, preferences, routes, suppressions from notification-architecture.md) are separate tasks that will extend this package / the domain layer.

## Traceability entries

- `WORKSTREAM_REGISTRY.md`: T024 → `In Review`.
- `packages/notifications/src/*` trace to `ADR-009-smtp-email.md`, `notification-architecture.md`, `notification-domain.md`, and `monorepo-architecture.md` (new `notifications` package boundary).
- `tests/notifications.test.mjs` provides validation, selector, and SMTP send/partial-success/failure evidence.
