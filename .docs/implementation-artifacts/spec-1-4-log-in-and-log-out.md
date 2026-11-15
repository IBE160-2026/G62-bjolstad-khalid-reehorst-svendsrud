---
title: 'Story 1.4: Log in and log out'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: 'f9b3616c0682c9ccf7287be2b2395faa0ccc50a1'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-1-3-create-an-account.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A registered user cannot log in again, log out, or be recognised on later requests, and nothing stops guessing passwords or keeps logged-out visitors out of the app.

**Approach:** Add login, logout and "who am I" endpoints to `identity`, an auth dependency that resolves the current user from `pf_session`, a per-account lockout stored in Postgres, a `/logg-inn` page, a "Logg ut" button on Profil, and routing: logged-out visitors only reach `/logg-inn` and `/opprett-konto`; logged-in users are sent away from those to `/`.

## Boundaries & Constraints

**Always:** `POST /api/identity/login` (public), `POST /api/identity/logout` and `GET /api/identity/me` (authenticated). Auth dependency `CurrentUser` in `app/core/auth.py`: reads `pf_session`, looks up the HMAC hash, rejects missing/unknown/expired sessions with 401 `unauthorized` and a `Set-Cookie` that clears `pf_session`; expired rows are deleted. Wrong email and wrong password give the same 401 `invalid_credentials` "E-post eller passord er feil."; unknown emails still run one Argon2 verify against a fixed dummy hash. Lockout per account in `users` columns: 5 failures within 15 min → `locked_until = now + 15 min`; while locked, every attempt (even the right password) gets 429 `too_many_attempts` "For mange forsøk. Prøv igjen om litt." and does not extend the lock; a successful login resets the counter. Login creates a new session and deletes the session of any `pf_session` cookie it replaced. Logout deletes only the session of the presented token and clears the cookie. Service takes `now` as a parameter so tests control time. `/logg-inn` and `/opprett-konto` render without sidebar/tab bar (brand, theme toggle, form) and link to each other. Frontend never decides auth from anything but the backend and the cookie's presence.

**Never:** No consent logic (1.5), no account deletion (1.6), no password reset, no "remember me", no counting attempts for emails without an account, no client-readable token.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Login ok | right email (any case) + password | 200 `{id,email}`, new `sessions` row, `Set-Cookie: pf_session`; counter reset | N/A |
| Wrong password / unknown email | either | 401 `invalid_credentials`, identical body | Unknown email: no counter change |
| Lockout | 5 wrong within 15 min, then any 6th | 429 `too_many_attempts`, no session | After 15 min the right password works |
| Old failures | 4 wrong, then 16 min pass, then 1 wrong | Not locked (window restarted) | N/A |
| Me | valid cookie | 200 `{id,email}` | Missing/unknown/expired → 401 + cookie cleared |
| Logout | valid cookie | 204, session row deleted, cookie cleared; old token → 401 on `/me` | No/unknown cookie → 401 |
| Isolation | user A's cookie | `/me` returns A only; A's logout leaves B's session valid | N/A |
| Routing | no cookie on `/`, `/mat`, `/samtykke` … | Redirect to `/logg-inn` | Stale cookie: `/me` 401 → client goes to `/logg-inn` |
| Routing | cookie on `/logg-inn` or `/opprett-konto` | Redirect to `/` | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/identity/{models,repository,service,router,schemas}.py` -- extend; reuse `hash_session_token`, `SESSION_LIFETIME`, `set_session_cookie`, `SESSION_COOKIE`, `normalize_email`, `_password_hasher`. Add `failed_login_count`, `first_failed_at`, `locked_until` to `User`.
- `backend/migrations/versions/0003_login_lockout.py` (new, `down_revision='0002'`).
- `backend/app/core/auth.py` (new) -- `CurrentUser` annotated dependency; calls the identity service, never its repository.
- `backend/app/core/errors.py` -- 401/429 codes via `AppError`; a 401 from `CurrentUser` must also carry the clearing `Set-Cookie` (raise `HTTPException` with headers, already supported by `_handle_http_exception`).
- `backend/tests/conftest.py` -- reuse `client`, `bare_client`; add a helper to register and return a logged-in client.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/proxy.ts` (new) -- Next 16 Proxy (see `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`); presence-only check of `pf_session`; matcher excludes `/api`, `_next`, static files.
- `frontend/src/modules/identity/{api.ts,login-form.tsx,logout-button.tsx}` -- reuse `ApiError`, `useRegister` patterns and `validation.ts` email check; `useMe` query (key `["me"]`), `useLogin`, `useLogout` (clear query cache, `router.replace("/logg-inn")`).
- `frontend/src/components/shell/app-shell.tsx` -- auth routes render the minimal layout; reuse `ThemeToggle`.
- `frontend/src/app/logg-inn/page.tsx` (new), `frontend/src/app/profil/page.tsx` (add `LogoutButton`), `nav-items.ts` (`pageTitle` for `/logg-inn`).

## Tasks & Acceptance

**Execution:**
- [x] `backend/app/modules/identity/*`, `0003_login_lockout.py` -- lockout columns, login/logout/me service + routes.
- [x] `backend/app/core/auth.py` -- `CurrentUser`.
- [x] `backend/tests/identity/test_login.py`, `test_lockout.py`, `test_isolation.py` -- every I/O row; lockout and its expiry with controlled `now` (NFR-8).
- [x] `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- [x] `frontend/src/proxy.ts` + test of its redirect decision -- routing rows.
- [x] `frontend/src/modules/identity/*`, `app/logg-inn/page.tsx`, `app/profil/page.tsx`, `app-shell.tsx`, `nav-items.ts` -- login form (inline field errors as in register, credential/lockout message as `role="alert"`), logout button, minimal auth layout; Vitest tests for login form and logout.

**Acceptance Criteria:**
- Given the running stack, when a user logs in at `/logg-inn`, then they land on `/`; when they press "Logg ut" on Profil, then they land on `/logg-inn` and `/` redirects back there.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Commits on failure:** a failed login and an expired session call `db.commit()` before raising, so the failure count and the deletion survive the per-request rollback.
- **Structure:** `CurrentUser` returns a `SessionUser` dataclass (not the ORM model); cookie helpers moved to `app/core/auth.py`; `app/core/clock.py` provides the `Now` dependency used by register, login and sessions. Login reads the user row `FOR UPDATE` so parallel attempts cannot lose a count.
- **Frontend:** `routes.ts` and `styles.ts` are shared by both forms; `SessionGuard` (in the shell only) sends a stale cookie to `/logg-inn`; register/login clear the query cache and seed `["me"]`.
- **Tests:** `client` uses `https://testserver` so the `Secure` cookie is sent; `test_health.py` expects migration `0003`.
- **Known risks (accepted by intent):** the lockout shows which emails have accounts, and someone who knows an email can keep it locked; no per-IP limit yet.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| EC, BH | Stale `["me"]` 401 bounces a newly registered user from `/samtykke`; old user's cache survives a new login | medium | SessionGuard reads the cached error while refetching; login/register never clear the cache | patch |
| EC, BH | `register` uses the real clock, not `Now` | low | Spec says service takes `now`; direct correction | patch |
| VG | Nothing renders `AppShell` (auth layout vs. shell + SessionGuard) | medium | No test imports AppShell; dropping SessionGuard would pass | patch |
| EC, BH | 429 only for real accounts reveals registered emails; locked path skips Argon2 | medium | Real, but intent says lock per account and never count unknown emails; recorded as known risk | rejected |
| BH | No per-IP/global limit; someone who knows an email can keep it locked | medium | Real, but intent chose per-account lockout; known risk for a later story | rejected |
| BH | OpenAPI lacks 401/429 entries; `me`/`logout` list 422 | low | `default` types every error as `ErrorResponse`; frontend branches on `code` | rejected |
| BH | Requested page lost after login redirect | low | Feature beyond intent (`?neste=`); user lands on I dag | rejected |
| EC, BH | Login rejects >128-char passwords with the registration message; client lacks the max | low | Only for passwords nobody can have registered | rejected |
| BH | No Argon2 rehash on login | low | Defaults have not changed; adds branch | rejected |
| BH | Expired/replaced sessions pile up | low | Rows are tiny; purge CLI comes with story 1.6 | rejected |
| EC, BH | Session whose user is gone stays | false | `sessions.user_id` is `ON DELETE CASCADE` | rejected |
| BH | No `Cache-Control: no-store` on `/me` | low | No caching headers are sent, so browsers do not store it | rejected |
| BH | Row lock held during Argon2 | low | Serialises only one account's concurrent logins | rejected |
| BH | Spec/sprint status mismatch, empty notes | false | Step 5 syncs status; notes written at close | rejected |
| BH | Naming (`RegisterValues` for login), duplicated test constants | low | Cosmetic | rejected |
| EC, BH | Proxy matcher skips paths containing a dot | low | No page route has a dot; SessionGuard still applies | rejected |
| EC | SessionGuard silent on network/5xx | low | Backend down affects every page anyway | rejected |
| VG | Matcher test uses JS RegExp, `validateLogin` lacks unit test | low | Build validates the matcher; login form tests cover validation | rejected |

## Design Notes

Proxy only checks that the cookie exists (fast, optimistic, per Next docs); the backend stays the authority, so a stale cookie is caught by `/me` returning 401 and clearing it. The lock is per account, not per IP: a user on a shared network is not locked out by others, and attackers cannot lock accounts without knowing the email.

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass

**Manual checks (if no CLI):**
- In Chrome: register, log out on Profil, log in again; wrong password six times shows the lockout message; `/` without cookie redirects to `/logg-inn`.
