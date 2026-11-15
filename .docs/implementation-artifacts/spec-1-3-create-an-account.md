---
title: 'Story 1.3: Create an account'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: '6fc2129639b7bd5ddd1b655c3d0d45d778308152'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way to create an account, so no data can be kept private to a user, and no backend endpoint writes to the database yet.

**Approach:** Add the `identity` module: `users` and `sessions` tables, `POST /api/identity/register` (Argon2id hash, opaque session cookie, user logged in at once), an Origin check on every mutating request, and a Norwegian registration page at `/opprett-konto` that sends the user to a placeholder consent page `/samtykke` (filled in story 1.5). Settle the three story-1.1 deferred items that the first writing endpoint needs.

## Boundaries & Constraints

**Always:** Email trimmed and lower-cased before storing; unique per account (DB unique index). Password 8–128 characters, hashed with argon2-cffi 25.1.0 `PasswordHasher` defaults; never logged or returned. Session token = `secrets.token_urlsafe(32)`; only `HMAC-SHA256(SESSION_SECRET, token)` is stored; cookie `pf_session`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, 30-day max age matching `sessions.expires_at`. Origin check is middleware for POST/PUT/PATCH/DELETE: `Origin` must equal `APP_URL` (scheme+host+port), else 403 envelope `origin_mismatch`; missing Origin also rejected. Register is explicitly public. Validation errors keep the envelope and add optional `error.fields: [{field, message}]` with Norwegian messages starting with what to fix. Router → service → repository; UUIDv4 ids; UTC timestamps. Form follows DESIGN.md inputs/buttons and VOICE.md; tokens only, no raw hex.

**Never:** No login/logout/lockout/`/me` endpoint (story 1.4), no consent logic (1.5), no default equipment profiles (Epic 4 service does not exist yet). No JWT, no token in localStorage, no `NEXT_PUBLIC_` secrets. No new email-validation dependency (simple check: one `@`, non-empty local part, domain with a dot, ≤ 254 chars). No changes to the app shell beyond what the new pages need.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Register | new `Ola@Eksempel.no `, 8+ char password, matching Origin | 201, `users` row with lower-cased email and Argon2id hash, `sessions` row, `Set-Cookie: pf_session` | N/A |
| Duplicate | email already registered (any case) | 409 `email_unavailable` "Denne e-posten kan ikke brukes. Prøv å logge inn i stedet."; no second user, no session | Concurrent insert → unique violation → same 409 |
| Bad email | `ola@` | 422 `validation_error`, `fields: [{field: "email", message: "Skriv inn en gyldig e-postadresse."}]` | No row |
| Short password | 7 chars | 422 with `fields: [{field: "password", message: "Velg et passord på minst 8 tegn."}]` | No row |
| Wrong Origin | POST with `Origin: https://evil.example` or none | 403 `origin_mismatch` envelope; handler never runs | GET/HEAD unaffected |
| Commit fails | DB error at commit | 500 envelope, no `Set-Cookie`, nothing stored | Commit happens before the response |
| Form | invalid fields | Inline message under each field, focus on first invalid field, nothing sent | Server `fields` shown the same way |

</frozen-after-approval>

## Code Map

- `backend/app/main.py` -- add Origin middleware and identity router; `ERROR_RESPONSES` gets a `422` entry so OpenAPI stops emitting `HTTPValidationError`.
- `backend/app/core/errors.py` -- `ErrorBody` gains optional `fields`; `_handle_validation_error` maps pydantic errors to field messages; `AppError` may carry fields.
- `backend/app/core/db.py` -- `get_db` must commit before the response: use `Depends(get_db, scope="function")` (FastAPI ≥ 0.121) via an exported `DbSession` annotated alias; `tests/conftest.py` must override the real dependency's factory, not copy it.
- `backend/app/core/settings.py` -- reuse `session_secret`, `app_url`; no new settings.
- `backend/app/modules/identity/` (new) -- `models.py` (`User`, `Session`), `repository.py`, `service.py` (hashing, token, register), `schemas.py`, `router.py` (`/api/identity/register`, `operation_id="register"`).
- `backend/migrations/env.py` -- import identity models; new `migrations/versions/0002_users_sessions.py` (hand-written, `down_revision='0001'`).
- `backend/pyproject.toml`, `uv.lock` -- add `argon2-cffi==25.1.0`.
- `backend/openapi.json` via `scripts/export_openapi.py`; `frontend/src/lib/api/schema.d.ts` via `npm run gen:api`.
- `frontend/src/lib/api/client.ts` -- reuse `api`; do not change.
- `frontend/src/app/providers.tsx` -- TanStack provider exists; reuse.
- `frontend/src/modules/identity/` (new) -- `register-form.tsx`, `validation.ts`, `api.ts` (mutation hook).
- `frontend/src/app/opprett-konto/page.tsx`, `frontend/src/app/samtykke/page.tsx` (new) -- titles "Opprett konto", "Samtykke".
- `frontend/src/components/shell/nav-items.ts` -- `pageTitle` must return the right title for the new routes; nav items unchanged.

## Tasks & Acceptance

**Execution:**
- [x] `backend/pyproject.toml`, `backend/uv.lock` -- add argon2-cffi 25.1.0 -- AD-3.
- [x] `backend/app/core/db.py`, `backend/tests/conftest.py` -- function-scoped commit, test the real dependency -- deferred item 1.
- [x] `backend/app/core/errors.py`, `backend/app/main.py` -- `fields` in envelope, 422 schema, Origin middleware -- deferred items 2–3, AD-3.
- [x] `backend/app/modules/identity/*`, `backend/migrations/env.py`, `backend/migrations/versions/0002_users_sessions.py` -- models, migration, repository, service, router -- FR1.
- [x] `backend/tests/identity/test_register.py`, `backend/tests/test_origin.py`, `backend/tests/test_db.py` -- every I/O row, hash is Argon2id, stored token ≠ cookie value, commit-before-response.
- [x] `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- [x] `frontend/src/modules/identity/*`, `frontend/src/app/opprett-konto/page.tsx`, `frontend/src/app/samtykke/page.tsx`, `nav-items.ts` -- form, client validation, server field errors, redirect to `/samtykke`; Vitest tests for validation and the form's inline errors/focus.

**Acceptance Criteria:**
- Given the running stack, when a visitor registers at `/opprett-konto`, then they land on `/samtykke` and the browser holds an `HttpOnly` `pf_session` cookie.
- Given any shell or auth page, when `npm run build`, `npm run lint` and `docker compose exec backend pytest -q` run, then all pass and no raw hex appears in `src/**/*.tsx`.

## Implementation Notes

- **Tests:** the `client` fixture now sends a matching `Origin`; a new `bare_client` sends none (the old 405 test would otherwise get 403). `test_health.py` expects migration `0002`. `conftest.py` overrides `get_session_factory`, so tests run the real `get_db`.
- **Envelope:** `fields` is omitted when empty (`exclude_none`), so earlier error responses are unchanged. Pydantic `field_message` errors pass their Norwegian text through; `missing` → "Fyll ut dette feltet."; anything else → "Sjekk verdien i dette feltet."; input values are never echoed.
- **Origin:** `make_origin_check` refuses a schemeless or empty `APP_URL`, so the app will not start with a broken value.
- **Form:** changing a field clears that field's error; label and button weights follow DESIGN.md rev 3 (500).
- **Not done here:** default equipment profiles (Epic 4); the dev database holds a few throwaway test accounts from verification.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| EC, BH | Empty/schemeless `APP_URL` lets an empty `Origin` pass | medium | `origin_of("")` is `"://"`; nothing validates `APP_URL`, so a misconfig silently disables CSRF protection | patch |
| BH | Inline error stays after the user fixes the field | low | `errors` only changes on submit; every user who mistypes meets it; fix is one onChange | patch |
| VG, BH | `fields` fallback branch, prefix stripping and malformed-body case untested | medium | No test reads `fields` for the generic branch; a regression would leak English pydantic text | patch |
| BH | `last_updated` format changed in sprint-status | low | Was `MM-DD-YYYY HH:MM` like `generated`; direct correction | patch |
| VG | Browser → Next.js proxy → backend path (Origin, `Set-Cookie`) has no automated test | medium | Backend tests use TestClient; Vitest mocks the client; Playwright not installed | defer |
| BH | `Secure` cookie on `http://localhost` may be dropped by Safari | maybe-false | Chrome verified; settle by registering in current Safari against localhost | defer |
| EC, BH | NUL or lone surrogate in email gives 500, not 422 | low | Real (Postgres rejects NUL) but only reachable by hand-crafted requests; fix adds guards | rejected |
| EC | Default port / `127.0.0.1` vs `localhost` gets 403 | low | Only if the user types another host than `APP_URL`; normalising adds branches | rejected |
| EC | Registering while logged in leaves the old session row for 30 days | low | Rare; logout and session handling arrive in story 1.4 | rejected |
| EC | Leftover rows from an aborted test run | false | `test_engine` drops and recreates the schema at session start (`conftest.py:53`) | rejected |
| EC | Email length counted in UTF-16 (client) vs code points (server) | low | Only for emails near 254 chars with astral characters | rejected |
| BH | `uv.lock` missing from the diff | false | `uv.lock` is modified (39 argon2 lines); it was excluded from the review diff on purpose | rejected |
| BH | No rate limit; Argon2 memory per request; 409 enables enumeration | low | Local course app; intent allows what registration must reveal; throttling adds new surface | rejected |
| BH | Duplicate path answers faster than signup (timing) | low | 409 already states the email cannot be used; timing reveals nothing more | rejected |
| BH | Plain unique email index blocks re-registration after soft delete | false | `deleted_at` does not exist yet; story 1.6 owns that migration | rejected |
| BH | 409 says "Prøv å logge inn" but no login link exists | low | Message is in the frozen matrix; story 1.4 adds the login page and link | rejected |
| BH | Non-JSON error shown as "fikk ikke kontakt" | low | Proxy 502/504 means the backend was unreachable, so the text is accurate | rejected |
| BH | `_truncate_tables` hard-codes `users, sessions` | low | Correct today; later user-owned tables cascade from `users` | rejected |
| BH | Missing tests: multi-byte password, logging, `/samtykke` nav | low | Low risk; non-string case is covered by the VG patch | rejected |
| BH | OpenAPI lacks 409/403 entries | low | `default` already types every error as `ErrorResponse`; frontend branches on `code` | rejected |
| BH | Epic context dropped requirements of done stories | low | Dropped items belong to finished stories 1.1–1.2; remaining stories are covered | rejected |
| BH | Spec Implementation Notes empty | false | Fix would edit this spec; notes are written at close-out | rejected |
| BH | 2 px error border shifts layout by 0.5 px | low | Cosmetic; DESIGN.md prescribes the 2 px border | rejected |
| BH | Password hint hidden in error state | low | The error repeats the rule | rejected |

## Design Notes

Session hashing uses HMAC with `SESSION_SECRET` so a leaked `sessions` table cannot be replayed without the secret. `Secure` cookies are accepted on `http://localhost` by Chrome and Firefox (secure context); the examiner uses Chrome. The registration page renders inside the shell for now; story 1.4 adds the logged-out/logged-in routing.

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
- `curl -si -X POST localhost:3000/api/identity/register -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' -d '{"email":"a@b.no","password":"hemmelig1"}'` -- expected: 201 with `Set-Cookie: pf_session=…; HttpOnly; Secure; SameSite=lax`

**Manual checks (if no CLI):**
- Register in Chrome at 1280 and 360 px in both themes; submit empty form → focus on email with inline message.
