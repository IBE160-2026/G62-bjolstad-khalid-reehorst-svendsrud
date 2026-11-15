---
title: 'Story 1.6: Delete my account'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: '0318f0e51521868261ba453cb4a7d86d657bf9d8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-1-5-give-consent-before-health-data.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user cannot delete their account, so their health data would stay in the app after they stop using it (FR-4, GDPR).

**Approach:** Add "Slett konto" on Profil with a confirmation dialog. Deleting soft-deletes the account at once (AD-14): `users.deleted_at` is set, all sessions are deleted, the user is logged out and can no longer log in. Every user query excludes soft-deleted users. `python -m app.cli purge` hard-deletes accounts soft-deleted more than 30 days ago and reports how many.

## Boundaries & Constraints

**Always:** `DELETE /api/identity/me` (authenticated, consent not required, Origin-checked) → 204, sets `deleted_at = now` (from `Now`), deletes all the user's sessions, clears `pf_session`. All identity repository reads (`get_user_by_email`, `get_user_by_email_for_update`, `get_user`, `get_user_for_update`, session lookup) skip users with `deleted_at`; a soft-deleted user's login gives the normal `invalid_credentials`. The email unique index becomes partial (`WHERE deleted_at IS NULL`), so the same email can register again. Purge removes users with `deleted_at <= now - 30 days`; user-owned rows go with them through `ON DELETE CASCADE` (rule for every later user-owned table, noted in code). Purge logs and prints `Purged N accounts.` and never logs emails. Dialog: title "Slette kontoen?", text "Profilen, maten og treningsøktene dine slettes. Dette kan ikke angres.", buttons "Slett konto" (destructive fill) and "Avbryt"; focus moves into the dialog and back to the trigger on close; Esc closes. After deletion: clear the query cache and go to `/logg-inn?konto=slettet`, where the login page shows "Kontoen din er slettet." as a status line.

**Never:** No undo or restore. No password re-entry. No email confirmation. No deleting single logs (later epics). Do not change lockout or consent behaviour.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Delete | logged in (with or without consent) | 204, `deleted_at` set, every session of the user gone, cookie cleared | N/A |
| Other devices | user had two sessions | both stop working (`/me` → 401) | N/A |
| Login after | right password of a deleted account | 401 `invalid_credentials` | Same answer as unknown email |
| Re-register | same email after deletion | 201, new user; old row untouched | N/A |
| Not logged in | no cookie | 401 `unauthorized` | Wrong Origin → 403 |
| Purge | users deleted 31 days ago, 29 days ago, and active | only the 31-day user removed, with sessions; prints `Purged 1 accounts.` | 0 → `Purged 0 accounts.` |
| Dialog | "Slett konto" then "Avbryt" or Esc | dialog closes, nothing sent, focus back on trigger | N/A |
| Dialog | confirm | request sent; on success `/logg-inn?konto=slettet` with the status line | Error → `role="alert"` in the dialog, stays open |

</frozen-after-approval>

## Code Map

- `backend/app/modules/identity/{models,repository,service,router}.py` -- `deleted_at` on `User`; filter `User.deleted_at.is_(None)` in every user lookup and in session resolution (join or check); `delete_account(db, user_id, now)`; `delete_all_sessions(db, user_id)`; `purge_deleted(db, now) -> int`. Reuse `CurrentUser`, `Now`, `clear_session_cookie` from `app/core/auth.py`.
- `backend/migrations/versions/0005_soft_delete.py` (new, `down_revision='0004'`) -- add column; replace `ix_users_email` with a partial unique index; `test_health.py` expects `0005`.
- `backend/app/cli.py` -- add `purge` to `COMMANDS`; opens its own session from `get_session_factory()`, commits, returns 0.
- `backend/tests/identity/test_delete_account.py`, `backend/tests/test_cli_purge.py` (new) -- every backend row; purge with a fixed `now`.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/identity/{api.ts,delete-account.tsx}` -- `useDeleteAccount`; dialog with native `<dialog>` + `showModal()` (focus trap and Esc built in) or an equivalent accessible dialog; destructive button uses `bg-destructive text-destructive-foreground`.
- `frontend/src/modules/identity/login-form.tsx` or `app/logg-inn/page.tsx` -- status line when `konto=slettet`.
- `frontend/src/app/profil/page.tsx` -- add the delete section under `LogoutButton`.

## Tasks & Acceptance

**Execution:**
- [x] backend identity files, `0005_soft_delete.py`, `cli.py` -- soft delete, filters, purge.
- [x] backend tests -- matrix backend rows, including that a deleted user is invisible to `/me`, login and session resolution.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend `api.ts`, `delete-account.tsx`, `profil/page.tsx`, login status line -- Vitest for cancel/Esc, confirm → redirect, error stays in dialog, focus return, and the status line.

**Acceptance Criteria:**
- Given the running stack, when a user deletes their account on Profil and confirms, then they land on `/logg-inn` with "Kontoen din er slettet.", and logging in with the old password fails.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `repository._active_users()` (`deleted_at IS NULL`) starts every user query; `get_session_by_token_hash` joins `users` and skips deleted users, so a stray session row can never resolve. `service.delete_account` locks the user (`get_user_for_update`), sets `deleted_at`, deletes all sessions; `DELETE /api/identity/me` (`operation_id="delete_account"`) clears the cookie. `service.purge_deleted(db, now)` deletes users with `deleted_at <= now - 30 days`; the CASCADE rule for user-owned tables is noted in `models.py`. `cli.purge` prints and logs only the count.
- **Migration 0005:** adds `deleted_at`, recreates `ix_users_email` as a partial unique index; the model declares the same index in `__table_args__`. Downgrade fails if a deleted and an active account share an email.
- **Frontend:** `DeleteAccount` uses native `<dialog>` + `showModal()`; focus starts on "Avbryt" and returns to the trigger in `onClose`; Esc is blocked only while the request is pending. `useDeleteAccount` clears the query cache and replaces to `ACCOUNT_DELETED_PATH`. The login status line is the client component `AccountDeletedStatus` (`useSearchParams`) inside `Suspense`, because awaiting `searchParams` in the page breaks the static prerender (Cache Components).
- **Tests:** jsdom has no `showModal`, so `delete-account.test.tsx` stubs `showModal`/`close` and simulates Esc via the `cancel` event; the real focus trap is browser behaviour. `test_cli_purge.py` patches `get_session_factory` and `utc_now` and calls `cli.main(["purge"])`.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | Downgrade of 0005 revives soft-deleted accounts and fails on any duplicate email | medium | `downgrade()` only drops the column; deleted users become active again | patch |
| BH, EC | Cache clear before redirect lets SessionGuard win the race; a 401 on delete leaves the dialog stuck | medium | `clear()` then `replace`; no 401 branch, unlike `useLogout` | patch |
| VG, BH | Pending state (Esc, disabled Avbryt, error after) untested | medium | All tests resolve `deleteMock` at once; removing the guard passes | patch |
| BH | Failed-login test on a deleted account ignores the responses | low | Responses discarded; direct test fix | patch |
| BH | CASCADE rule for user-owned FKs is only a comment | medium | A later table without CASCADE would make purge fail or leave rows | patch |
| VG | Page wiring (status line on `/logg-inn`, button on Profil) untested | low | Pure composition; no page tests or e2e harness yet; manual check covers it | defer |
| VG | Migration downgrade never run in tests | low | No earlier migration tests its downgrade | defer |
| BH | Nothing schedules `purge` | medium | Real, but intent and AD-14 make it a CLI command; recorded as an open item | rejected |
| BH | "more than 30 days" vs `<=` | low | Differs only at the exact instant | rejected |
| BH | Focus/announcement while pending | low | Buttons disabled for a short moment; label changes to "Sletter …" | rejected |
| BH | Status line announcement and lingering query parameter | low | Cosmetic; the line is static text | rejected |
| BH | OpenAPI lists a 422, hides 401/403 | low | `default` types every error | rejected |
| BH | No purge test beside a re-registered email | low | Purge filters on `deleted_at` only; partial index is tested | rejected |
| BH | Cookie clearing on the other device untested | low | `CurrentUser` clears the cookie on every 401 (tested in 1.4) | rejected |
| EC | Second concurrent delete gets 401 without clearing the cookie | low | The frontend 401 patch handles it; the next request clears the cookie | rejected |
| EC | Repeated Esc in Chrome may close a pending dialog | low | Rare; the pending request still completes and redirects | rejected |
| VG | Soft-delete filter applied twice in session resolution | low | Defence in depth; behaviour is tested | rejected |
| BH | Spec and sprint status differ | false | Step 5 syncs status | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `docker compose exec backend python -m app.cli purge` -- expected: `Purged 0 accounts.` (nothing older than 30 days)
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass

**Manual checks (if no CLI):**
- In Chrome: Profil → Slett konto → Esc closes; confirm → `/logg-inn` with the status line; old login fails.
