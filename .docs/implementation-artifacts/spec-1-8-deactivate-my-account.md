---
title: 'Story 1.8: Deactivate my account (Should)'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'ae1bb920d240e1e00f1dabc191367afc96ed011b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-1-6-delete-my-account.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user who wants a break can only delete the account and lose everything.

**Approach:** Add "Deaktiver konto" under Profil → Konto, next to "Slett konto": after a confirmation dialog it sets `users.deactivated_at`, deletes all the user's sessions and sends them to `/logg-inn`; no data is deleted. Logging in again with the right password clears `deactivated_at` and shows "Velkommen tilbake! Kontoen din er aktiv igjen." Deactivated accounts are never purged.

## Boundaries & Constraints

**Always:** Migration `0016` adds nullable `users.deactivated_at`. `POST /api/identity/deactivate` (`CurrentUser`, Origin-checked) → sets it, deletes every session of the user, clears the session cookie, 204. Login (`POST /api/identity/login`): right password on a deactivated account clears `deactivated_at`, creates a session as usual and the response includes `reactivated: true` (false otherwise); wrong password → the usual "E-post eller passord er feil." with the same lockout counting (FR1); an unknown e-mail is indistinguishable. Purge only removes soft-deleted accounts (`deleted_at`), never deactivated ones. A deactivated account has no sessions, so every protected endpoint already returns 401. Registering with the e-mail of a deactivated account behaves like an existing account (no hint). UI: Profil → Konto gets a secondary button "Deaktiver konto" above "Slett konto"; native `<dialog>`: title "Deaktivere kontoen?", text "Du logges ut, og ingen data slettes. Logg inn igjen når du vil fortsette.", buttons "Deaktiver" and "Avbryt" (focus starts on "Avbryt"; Esc closes; pending text "Deaktiverer …"; error shown as alert in the dialog). On success: clear the query cache, go to `/logg-inn`. After a login with `reactivated: true`, the first signed-in page shows "Velkommen tilbake! Kontoen din er aktiv igjen." in a polite status message once.

**Never:** No automatic reactivation by any other route, no deletion of data, no e-mail.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deactivate | logged in, confirm | `deactivated_at` set, all sessions gone, at `/logg-inn` | Avbryt → nothing |
| Old session | another browser's cookie | 401 | N/A |
| Reactivate | right password | `deactivated_at` cleared, `reactivated: true`, welcome message | N/A |
| Wrong password | deactivated account | usual error; lockout counts | N/A |
| Purge | deactivated for 30+ days | kept | N/A |
| Data | food, workouts, profile | unchanged after deactivate + login | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/identity/{models,schemas,repository,service,router}.py`; `backend/migrations/versions/0016_user_deactivated_at.py`; `tests/test_health.py` expects `0016`; `backend/tests/identity/test_deactivate.py` (new); purge test.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/identity/{api.ts,deactivate-account.tsx}` (new, dialog like `delete-account.tsx`), Profil page, login flow welcome message; Vitest; sheet-a11y helper for the dialog.

## Tasks & Acceptance

**Execution:**
- [x] backend deactivate, reactivate on login, purge rule, tests -- FR32, FR1, AD-3, AD-14.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend dialog, redirect, welcome message -- Vitest.

**Acceptance Criteria:**
- Given a logged-in user, when they deactivate and log in again, then they see "Velkommen tilbake! Kontoen din er aktiv igjen." and all their data is still there.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint`, `npm run build` and `npm run test:e2e` run, then all pass.

## Implementation Notes

- **Backend:** `User.deactivated_at` (migration `0016`). `service.deactivate_account` locks the user, sets `deactivated_at` (keeps an earlier value), deletes all sessions; `POST /api/identity/deactivate` (`operation_id="deactivate_account"`) clears the cookie. Deactivated users stay visible to `_active_users()`, so register gives the normal 409 and login runs the usual lockout path; only after a correct password does `login` clear `deactivated_at` and return `reactivated`. The response model is `LoginResponse(UserResponse)` with `reactivated: bool`. Purge is unchanged (filters on `deleted_at` only) and has a test that a deactivated account survives.
- **Frontend:** `useDeactivateAccount` mirrors `useDeleteAccount` (401 counts as success; navigate to `/logg-inn` before clearing the cache). `useLogin` strips `reactivated` from the cached user and sets `REACTIVATED_QUERY_KEY`. `ReactivatedStatus` sits in `AppShell` beside `IntroDialog` (survives gate ↔ full layout switches), reads and removes the flag once in a timeout after mount (so the text enters an existing `aria-live="polite"` region, and Strict Mode's double effect does not lose it), and hides after 8 s.
- **E2E:** new "Story 1.8" test in `core-loop.spec.ts` (deactivate → login → welcome → same target).

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Sessions not rejected for deactivated users (login race) | medium | `resolve_session` ignores `deactivated_at` | patch |
| BH | 401 treated as successful deactivation | medium | Expired session shows success | patch |
| BH | Purge test passes even if purge is broken; access only tested on `/me`; counter reset untested | low | Test gaps | patch |
| BH | No busy feedback; focus lost on error | low | Accessibility | patch |
| BH | Welcome message auto-hides and cannot be dismissed | low | WCAG 2.2.1 | patch |
| BH | `role="alertdialog"` | low | Native dialog with heading is enough; same as delete dialog | rejected |
| BH | Guard against reactivation by password reset (1.7) | low | 1.7 not built; note for its spec | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
