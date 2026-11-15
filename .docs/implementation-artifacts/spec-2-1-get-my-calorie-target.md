---
title: 'Story 2.1: Get my calorie target'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: 'c68d11c92f8b3279d4b28fafe089b690917c2992'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-2-context.md'
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user who has given consent has nowhere to enter body data, so the app cannot tell them how much to eat.

**Approach:** Add the `profile` module: a `profiles` table (one per user), a pure tested calorie function (formula, factors, goal adjustment, rounding and floors exactly as in epic-2-context.md), `GET`/`PUT /api/profile` guarded by `ConsentedUser`, and a Profiloppsett page at `/profiloppsett` that saves the profile and shows one number with one or two plain sentences. A consented user without a profile is sent to `/profiloppsett`; after saving they continue to `/`.

## Boundaries & Constraints

**Always:** The calculation is one pure function in `profile` (no I/O) that returns `target_kcal` and `floor_applied`; the service stores both on the profile on every save (AD-17); the frontend never computes it. `profiles.user_id` is unique with `ON DELETE CASCADE`. All six fields required; ranges weight 30–300 kg, height 100–250 cm (whole numbers), age 16–100 (whole years); weight may have one decimal. Field errors use the envelope's `fields` with messages starting with the fix, e.g. "Vekt må være mellom 30 og 300 kg.". Norwegian labels: Kjønn (Kvinne/Mann) with "Formelen regner litt ulikt for kvinner og menn."; Aktivitetsnivå — Stillesittende ("lite bevegelse i hverdagen, for eksempel kontorjobb"), Lett aktiv ("trener 1–3 dager i uka"), Moderat ("trener 3–5 dager i uka"), Veldig aktiv ("trener 6–7 dager i uka"), Ekstremt aktiv ("hard trening hver dag eller fysisk tungt arbeid"); Mål — Gå ned i vekt / Holde vekten / Gå opp i vekt. Result: "{N} kcal om dagen" (Norwegian thousands space) plus one goal sentence; floor line "Målet er satt til minst {1 200|1 500} kcal for å være trygt."; age 16–17 line "Dette er et grovt anslag. Formelen er laget for voksne." The words BMR, TDEE and Mifflin never appear in UI text. `/profiloppsett` uses the minimal gate layout with `SessionGuard`; guard order: no session → `/logg-inn`, no consent → `/samtykke`, no profile → `/profiloppsett`.

**Never:** No editing on the Profil page (story 2.2), no intro (2.3), no target history, no macros, no frontend copy of the formula, no profile data in logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Examples | every profile in epic-2-context.md's table | exact `target_kcal` (e.g. 2798/2298/3098, 1884, 2181, 2206, Sara 1640) | No tolerance |
| Floor | female, 45 kg, 150 cm, 60, Sedentary, Lose | 1200, `floor_applied=true` (male floor 1500) | N/A |
| Save | valid body, consented | 200 profile with `target_kcal`, `floor_applied`; second PUT replaces | N/A |
| Out of range | weight 29, height 251, age 15 | 422 with one `fields` entry per field | Nothing stored |
| No consent | logged in, no `consent_at` | 403 `consent_required` | N/A |
| No profile | GET | 404 `profile_not_found` | N/A |
| Routing | consented, no profile, on `/` | replaced to `/profiloppsett` | Profile exists → stays |
| Result | 17-year-old | number + rough-estimate line | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/profile/` (new) -- `calculator.py` (pure), `models.py`, `schemas.py`, `repository.py` (always filters by `user_id`, AD-4), `service.py`, `router.py` (`/api/profile`, `operation_id`s `get_profile`, `save_profile`). Reuse `ConsentedUser` from `app/modules/identity/consent.py`, `AppError`, field-error mapping from 1.3.
- `backend/app/main.py`, `backend/migrations/env.py` -- include router, import models; `migrations/versions/0006_profiles.py` (`down_revision='0005'`); `tests/test_health.py` expects `0006`.
- `backend/tests/profile/test_calculator.py`, `test_profile_api.py` (new) -- every matrix row; the CASCADE test from 1.6 must still pass.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/profile/` (new) -- `api.ts` (`useProfile` key `["profile"]`, `useSaveProfile`), `validation.ts` (mirrors ranges), `profile-form.tsx` (48 px inputs, radio groups with visible examples, focus first invalid, one primary button), `target-result.tsx`.
- `frontend/src/app/profiloppsett/page.tsx` (new); `frontend/src/modules/identity/{routes.ts,session-guard.tsx}` and `components/shell/app-shell.tsx` -- add the gate path and the profile step; `nav-items.ts` title.

## Tasks & Acceptance

**Execution:**
- [x] backend `profile` module, migration, wiring -- FR5, FR6, AD-5, AD-17.
- [x] backend tests -- calculator examples and floor (NFR-8), API rows, isolation via `user_id`.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend `profile` module, `/profiloppsett`, guard step -- Vitest for validation, form errors/focus, result text (floor and 16–17 lines, no BMR/TDEE/Mifflin), guard redirect.

**Acceptance Criteria:**
- Given the running stack, when a newly consented user fills Profiloppsett with Sara's values, then the page shows "1 640 kcal om dagen" and "Videre" goes to `/`.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- Calculator uses `Decimal` with `ROUND_HALF_UP`, so halves (e.g. 3429.5) round up instead of to even.
- `PUT /api/profile` is an `INSERT … ON CONFLICT (user_id) DO UPDATE`, so two concurrent first saves cannot hit the unique constraint.
- Backend messages for non-whole height/age ("Skriv høyden i hele centimeter.", "Skriv alderen i hele år.") and >1 weight decimal ("Skriv vekten med høyst én desimal."); missing fields and bad enum values use the generic envelope messages. The frontend has field-specific missing messages ("Skriv inn vekten din.", "Velg kjønn." …).
- `/profiloppsett` shows the form while GET answers 404 and the stored result once a profile exists (a user with a profile may stay there). The guard asks for the profile only after consent. Consent still navigates to `/`; the guard then forwards to `/profiloppsett`.
- The floor line formats the stored `target_kcal` (equal to the floor when `floor_applied`); the 16–17 line uses the stored `age`. No formula in the frontend.
- `call` in `modules/identity/api.ts` is now exported for reuse by `modules/profile/api.ts`.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | I dag flashes after consent before the guard forwards to `/profiloppsett`; consented user leaves `/samtykke` while profile state is unknown | medium | `useGiveConsent` replaces to `/`; `guardRedirect` sends to `/` with `hasProfile` undefined | patch |
| EC | `/profiloppsett` fetches the profile before consent (403 alert flash) | low | `useProfile()` has no `enabled` gate; direct fix | patch |
| BH | Radio-group errors not announced on the focused radio | medium | `aria-invalid`/`aria-describedby` on `<fieldset>` only; NFR-10 | patch |
| VG, BH | Purge with a profile untested; migration FK drift would pass | medium | Metadata test reads the model only; no purge test creates a profile | patch |
| VG | `/profiloppsett` gate layout untested | medium | Shell tests cover `/samtykke` only | patch |
| BH | Cached profile survives logout/login/delete | false | `useStartSession`, `useLogout`, `useDeleteAccount` call `queryClient.clear()` (`api.ts:59,109,149`) | rejected |
| BH | `identity` and `profile` frontend modules import each other | low | Works; moving shared helpers to `lib/` is a refactor | rejected |
| BH, EC | Failed profile fetch (5xx/network) has no retry | low | Backend down affects every page | rejected |
| BH | Non-numeric input shows the range message | low | Message still tells the valid range; fix adds a message | rejected |
| BH | "Videre" vs "Til I dag" | low | Fix would edit this spec's AC | rejected |
| BH | Status differs across files | false | Step 5 syncs status | rejected |
| BH | No DB CHECK constraints for profile values | low | Only one write path, validated by Pydantic | rejected |
| BH | Redundant refetch after save; no `staleTime` | low | One extra GET | rejected |
| BH | Floor value has no cited source | low | Tracked as an open item in the PRD | rejected |
| BH | Trivial assertion in Origin test | low | Cosmetic | rejected |
| EC | Frontend rejects "82.50" that the backend accepts | low | Rare input; message tells the fix | rejected |
| EC | NaN/Infinity height/age gives the wrong message | low | Browsers never send them | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass

**Manual checks (if no CLI):**
- In Chrome at 1280 and 360 px: register → consent → Profiloppsett → Sara's values → 1 640 kcal → I dag.
