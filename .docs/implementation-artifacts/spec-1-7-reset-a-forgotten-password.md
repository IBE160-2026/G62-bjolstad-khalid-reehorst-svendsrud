---
title: 'Story 1.7: Reset a forgotten password (Should)'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_commit: '453027534c7923431a21b2fbecf7f913fc671267'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-1-8-deactivate-my-account.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user who forgets the password has no way back into the account.

**Approach:** "Glemt passord?" on `/logg-inn` leads to `/glemt-passord`, where the user enters an e-mail. If an active account exists, a single-use link to `/nytt-passord?token=…` is "sent" through an e-mail port; the link lets the user set a new password, which ends every session and clears the lockout.

## Boundaries & Constraints

**Always:** Migration `0018` adds table `password_resets` (id, user_id FK `ondelete=CASCADE`, token_hash unique, created_at, expires_at, used_at). Token: random, only its hash stored (same hashing as session tokens), valid 60 min, single use; a new request does not invalidate older unused links. `POST /api/identity/password-reset` (public, Origin-checked, body `{email}`) → always 204 with the same timing work whether or not the account exists; sends only for a non-deleted account and at most 3 requests per account per rolling hour (the 4th sends nothing, still 204). `POST /api/identity/password-reset/confirm` (public, Origin-checked, body `{token, password}`) → password ≥ 8 chars (same rule as register, `fields` on 422); valid token → new Argon2id hash, token `used_at` set, all the user's sessions deleted, lockout cleared, 204; expired/used/unknown token or deleted user → 400 `reset_link_invalid` "Lenken er utløpt eller allerede brukt. Be om en ny.", nothing changes. A reset does **not** clear `deactivated_at`: the next login with the new password reactivates as in 1.8. E-mail goes through `app/ports/email.py` (AD-7) with `EMAIL_MODE`; tests always use the mock adapter, which records sent mails. Mail text in Norwegian: subject "Nytt passord til Prompt Force", body with the link built from `APP_URL`. UI: `/glemt-passord` and `/nytt-passord` are logged-out pages (add to `AUTH_PATHS`); login page gets the link "Glemt passord?"; after request always "Hvis e-posten har en konto, har vi sendt deg en lenke."; after confirm go to `/logg-inn` with the status line "Passordet er endret. Logg inn med det nye passordet."; an invalid link shows the error with a link to `/glemt-passord`. README explains how to find the reset mail locally. Should a production config lack a working mail setup, the backend refuses to start (AD-16) instead of silently dropping mails.

**Decision (Osman, 2026-11-23): Mailpit.** A `mailpit` service in Compose (image `axllent/mailpit`, pinned version) catches every mail; web inbox at `http://localhost:8025`, no auth, nothing leaves the machine. `EMAIL_MODE=smtp` (default in `.env.example`) sends to it via `SMTP_HOST=mailpit`, `SMTP_PORT=1025`; `EMAIL_MODE=mock` in tests. A Playwright test reads the link through the Mailpit API.

**Never:** No hint whether an e-mail has an account (message, status code or response time). No login straight after reset. No real e-mail service, account or API key needed to run the app.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Request, account exists | active email | 204, one mail with link | N/A |
| Request, unknown/deleted email | — | 204, no mail, same message | N/A |
| 4th request in an hour | same account | 204, no mail | N/A |
| Confirm, valid | token + 8+ chars | password changed, sessions gone, lockout cleared, `/logg-inn` status | N/A |
| Confirm, short password | 7 chars | 422 with `fields.password`, token still valid | inline error |
| Confirm, expired/used/unknown | token | 400 `reset_link_invalid`, nothing changes | message + link |
| Deactivated account | reset, then login | reset works; login returns `reactivated: true` | N/A |
| Locked account | locked, then reset | lock cleared, new password works at once | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/identity/service.py` -- reuse `hash_password`, `new_session_token`/`hash_session_token`, `normalize_email`, `_DUMMY_PASSWORD_HASH` timing trick, `_reset_failures`, `end_all_sessions`; `login` already reactivates (do not touch).
- `backend/app/modules/identity/{models,repository,schemas,router}.py` -- new `PasswordReset` model, repo functions (`_active_users()` excludes deleted), schemas, two public routes with the Origin check used by login/register.
- `backend/app/ports/off.py` -- pattern for a port: Protocol + adapters + `get_*_port()` with `lru_cache`, overridable in tests.
- `backend/app/core/settings.py`, `.env.example` -- add `EMAIL_MODE` (and mail settings for option A); production refusal like `refuse_unsafe_production`.
- `backend/migrations/versions/0018_password_resets.py`; `backend/tests/test_health.py` expects `0018`.
- `backend/tests/identity/test_password_reset.py` (new).
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/identity/{routes.ts,api.ts,login-form.tsx,account-deleted-status.tsx}` -- add paths, hooks, the link, and a status line like the deleted-account one.
- `frontend/src/app/glemt-passord/page.tsx`, `frontend/src/app/nytt-passord/page.tsx`, `frontend/src/modules/identity/{forgot-password-form,new-password-form}.tsx` (new) -- reuse `validation.ts`, `styles.ts`, form patterns from `register-form.tsx`.
- `frontend/e2e/core-loop.spec.ts` -- one Story 1.7 test if the mail can be read from the test (option A: Mailpit API; option B: skip e2e, rely on backend + Vitest).
- `docker-compose.yml`, `README.md` -- option A service; README section and remove 1.7 from "Endret fra planen" if PR #63 is merged first.

## Tasks & Acceptance

**Execution:**
- [x] backend: model, migration 0018, e-mail port, service, routes, settings, pytest for the matrix -- FR31, FR1, AD-3, AD-7, AD-16.
- [x] regenerate `openapi.json` and `schema.d.ts`.
- [x] frontend: two pages, forms, login link, status line, Vitest.
- [x] Compose/README per the mail decision; Playwright test if option A.

**Acceptance Criteria:**
- Given a user who forgot the password, when they request a link, open it and choose a new one, then they can log in with the new password and not with the old.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint`, `npm run build` and `npm run test:e2e` run, then all pass.

## Implementation Notes

- **Backend:** `PasswordReset` model + migration `0018`. `service.request_password_reset` makes a token and its HMAC hash and runs the hourly count query for every request (a random id for unknown e-mails), locks the user row, and returns the mail to send or None (unknown/deleted e-mail, or 3 links in the rolling hour). Deactivated accounts get mails. The router sends the mail with FastAPI `BackgroundTasks`, i.e. after the commit and after the 204 is written, so SMTP time does not show in the response time; it is still in-process through the port, no job system. `confirm_password_reset` locks the reset row (only for non-deleted users) and the user, sets a new Argon2id hash, clears the lockout, deletes every session and marks **all** the user's unused links as used (older links stay valid until a password change, not after). `deactivated_at` is not touched. Bad/empty/over-long tokens give the same 400.
- **E-mail port:** `app/ports/email.py` with `SmtpEmailAdapter` (stdlib smtplib, optional STARTTLS/login; failures logged by exception type only, never raised) and `MockEmailAdapter` (records `sent`). Tests override `get_email_port` with the `mailbox` fixture. Settings: `EMAIL_MODE` (default smtp), `SMTP_HOST` (mailpit), `SMTP_PORT` (1025), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_STARTTLS`, `EMAIL_FROM`; production refuses `EMAIL_MODE=mock` or empty `SMTP_HOST`.
- **Compose:** `mailpit` (`axllent/mailpit:v1.27.11`), inbox published on `127.0.0.1:8025` only.
- **Frontend:** `/glemt-passord` and `/nytt-passord` in `AUTH_PATHS` (so a browser with a session cookie is sent to `/` from them, like the other auth pages). `PasswordChangedStatus` on `/logg-inn?passord=endret`. A link without `token` shows the invalid-link message at once.
- **E2E:** "Story 1.7" test registers through the API, requests the link in the UI, reads it via the Mailpit API (`E2E_MAILPIT_URL`, default `http://localhost:8025`), sets a new password, checks old/new login and single use.

## Spec Change Log

## Review Triage Log

Lighter process: one reviewer (Edge Case Hunter); Blind Hunter and Verification Gap skipped to save the usage limit.

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| ECH | Reset link opened with any session cookie is redirected to `/` and the token is lost | medium | `/nytt-passord` is in `AUTH_PATHS`; the proxy sends cookie holders to `/` | patch |
| ECH | `starttls()` without an SSL context skips certificate checks | medium | `smtplib.starttls(context=None)` uses an unverified stdlib context | patch |
| ECH | Only SMTPException/OSError caught; other errors escape the background task | low | Traceback may include the address; direct correction | patch |
| ECH | Production allows SMTP login without STARTTLS / implicit-TLS port | low | Needs a deliberately odd production config; fix adds validation | rejected |
| ECH | Lone surrogate in token gives 500 instead of 400 | low | Needs a hand-crafted request; fix adds a guard | rejected |
| ECH | Insert only for real accounts leaves a small timing difference | low | Mail is sent after the response; the remaining difference is one indexed insert (a few ms); closing it adds dummy writes | rejected |
| ECH | Empty `APP_URL` gives a relative link | low | Default and `.env.example` set it; fix adds validation | rejected |
| ECH | Mock adapter keeps every mail in memory outside tests | low | Production refuses `mock`; local use is short-lived | rejected |
| ECH | Used/expired `password_resets` rows are never purged | low | Real but slow growth (max 3 rows/account/hour) | defer |
| ECH | Deactivated accounts get reset mails, against "active account" | false | Frozen matrix row "Deactivated account: reset works"; only soft-deleted are excluded | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build && npm run test:e2e` -- expected: all pass
