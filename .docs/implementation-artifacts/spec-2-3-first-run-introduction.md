---
title: 'Story 2.3: First-run introduction'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: 'b672a096cf239bbc901a80449fbe43e02820437c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-2-1-get-my-calorie-target.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A first-time user goes straight from consent into a form with no idea what the app does or what comes next.

**Approach:** Show a short "Kom i gang" dialog once, right after consent, with the three steps (profil → logg → tren) and two buttons. Dismissing it (either button or Esc) is stored on the user in the backend, so it never comes back on any device.

## Boundaries & Constraints

**Always:** `users.intro_dismissed_at` (nullable UTC, set from `Now`); `POST /api/identity/intro/dismiss` (authenticated, Origin-checked, consent not required) sets it only if empty and returns the user; every `UserResponse` includes `intro_dismissed_at`. Dialog shown by the shell for a consented user whose `intro_dismissed_at` is null, on any page except `/samtykke`; never for logged-out or unconsented users. Content: title "Slik kommer du i gang"; three numbered steps — "Sett opp profilen" / "Du får ett tall: hvor mye du kan spise om dagen.", "Logg maten" / "Søk, skann strekkoden eller skriv inn selv.", "Tren" / "Start en økt og se hva du løftet sist."; buttons "Sett opp profilen" (primary) and "Hopp over" (secondary). "Sett opp profilen" dismisses and goes to `/profiloppsett` (no navigation if already there); "Hopp over" and Esc dismiss and close; with no profile the existing guard still keeps the user on `/profiloppsett`. Native `<dialog>` with `showModal()`: focus moves to the title or first button, Esc closes, focus returns to the page's main heading or `#innhold`. The dialog closes at once and the `["me"]` cache is updated optimistically; a failed dismiss does not reopen it in this session (it may show again next login).

**Never:** No dismissal only in localStorage. No intro for users who already dismissed it. No changes to the profile calculation or Profiloppsett form. No images or animation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dismiss | logged in, `intro_dismissed_at` null | 200, time set; `/me` returns it | N/A |
| Repeat | already set | 200, time unchanged | N/A |
| Not logged in | no cookie | 401 | Wrong Origin → 403 |
| First visit | consented, not dismissed, on `/profiloppsett` | dialog open, focus inside | N/A |
| Unconsented | on `/samtykke` | no dialog | N/A |
| Sett opp profilen | press | dismiss sent, dialog closed, on `/profiloppsett` | N/A |
| Hopp over / Esc | press | dismiss sent, dialog closed, focus back on the page | Request fails → stays closed this session |
| Later visit | dismissed | no dialog on any page, any device | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/identity/{models,schemas,service,repository,router}.py` -- `intro_dismissed_at` on `User`, `UserResponse`, `SessionUser`; `dismiss_intro(db, user_id, now)` with the same locked read as `give_consent`; route `operation_id="dismiss_intro"`.
- `backend/migrations/versions/0007_intro_dismissed.py` (new, `down_revision='0006'`); `tests/test_health.py` expects `0007`.
- `backend/tests/identity/test_intro.py` (new) -- backend matrix rows.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/identity/{api.ts,intro-dialog.tsx}` -- `useDismissIntro` (optimistic `["me"]` update); dialog pattern like `delete-account.tsx`; buttons from `styles.ts`.
- `frontend/src/components/shell/app-shell.tsx` -- render `IntroDialog` in both the gate layout and the full shell when the conditions hold.
- `frontend/src/modules/identity/session-guard.tsx` -- unchanged routing order (consent → profile); the intro is a dialog, not a route.

## Tasks & Acceptance

**Execution:**
- [x] backend identity files, `0007_intro_dismissed.py` -- field, endpoint.
- [x] `backend/tests/identity/test_intro.py`, `test_health.py` -- backend rows.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend `api.ts`, `intro-dialog.tsx`, `app-shell.tsx` -- dialog; Vitest for open conditions, both buttons, Esc, focus in/out, no dialog when dismissed or unconsented.

**Acceptance Criteria:**
- Given the running stack, when a new user registers and consents, then "Slik kommer du i gang" opens; after "Sett opp profilen" they are on Profiloppsett, and after logging out and in again (or in another browser) the dialog does not return.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- `dismiss_intro` locks the user row like `give_consent` and keeps the first time on repeat; the route sits under `CurrentUser` (not `ConsentedUser`), and the global Origin middleware covers it.
- Migration 0007 marks users who already have a profile as dismissed (`now()`), so existing users never get the first-run intro.
- `IntroDialog` is rendered once by `AppShell`, after either layout at a stable position, so moving between the gate layout and the full shell does not remount or reopen it; `shouldShowIntro` requires `consent_at` set, `intro_dismissed_at === null` and a path other than `/samtykke`. Older cached `["me"]` data without the field (undefined) never shows it.
- "Not again this session" after a failed dismiss: a module-level set of user ids in `intro-dialog.tsx`, so a later `/me` refetch that still says null does not reopen it; a full reload clears it.
- Dismissal is sent from the buttons and from `onClose` (Esc, including Chrome's close watcher that may skip `cancel`), once per opening. A close because the user changed (`show` turned false) sends nothing and leaves focus alone.
- Focus: the title (`tabIndex=-1`) on open; `#innhold` after "Hopp over" or Esc, not before navigating (the page `h1` in the full shell is in the top bar, outside `main`, and not focusable).
- "Sett opp profilen" uses `router.push` (user action), skipped on `/profiloppsett`.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| EC, BH | Esc can close the dialog without `cancel`, so the dismissal is lost; focus moves on programmatic closes | medium | Dismiss only in `onCancel`; Chrome's close watcher may skip `cancel`; `handleClose` always focuses `#innhold` | patch |
| BH | Dialog mounts in two layout branches and opens twice on `/` → `/profiloppsett` | low | Two `<IntroDialog />` in `AppShell`; double focus and announcement | patch |
| BH | Users who finished onboarding before this change get the "first-run" intro | low | Nullable column, no backfill | patch |
| VG, BH | Optimistic `["me"]` update untested; server value replacing it untested | medium | `postMock` resolves at once; removing `onMutate` passes every test | patch |
| BH | Return focus not checked in the gate layout | false | `AuthLayout`'s `<main id="innhold" tabIndex={-1}>` (story 1.4) | rejected |
| BH | Focused title has no visible ring | low | Programmatic focus on a heading; buttons keep the ring | rejected |
| BH | No test for cached `me` without the field | low | Strict `=== null` already handles it | rejected |
| BH | Status differs; 2-1 marked done here | false | Step 5 syncs status; 2-1 was merged (PR #25) | rejected |
| BH | User→response mapping written three times | low | Refactor; behaviour tested | rejected |
| BH | OpenAPI lists 422, not 401/403 | low | `default` types every error | rejected |
| BH | Manual check lacks the cross-device step | low | Fix would edit this spec; backend test covers persistence across logins | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass

**Manual checks (if no CLI):**
- In Chrome: register → consent → dialog → Esc; reload: no dialog.
