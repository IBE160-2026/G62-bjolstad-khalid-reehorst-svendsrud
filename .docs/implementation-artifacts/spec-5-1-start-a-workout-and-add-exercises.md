---
title: 'Story 5.1: Start a workout and add exercises'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'f01db37f648aeb3dcc99a0c59cb56a52f149dd6a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/planning-artifacts/architecture/architecture-prompt-force-2026-11-13/ARCHITECTURE-SPINE.md'
  - '{project-root}/.docs/implementation-artifacts/spec-4-3-get-exercises-that-fit-my-equipment.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user can find exercises but cannot put together a workout to do today.

**Approach:** Add the `workouts` module. "Start økt" creates a Workout for today's date (or resumes the one already in progress) and opens the Økt page at `/trening/okt`. Exercises are added with "Legg til i økt" on the exercise detail page; on the Økt page they can be moved up/down and removed. Sets (5.2), "Sist" (5.3) and finishing/deleting (5.4) come later.

## Boundaries & Constraints

**Always:** Tables `workouts` (id, `user_id` FK CASCADE, `date` YYYY-MM-DD chosen by the client (AD-12), `finished_at` nullable, `created_at`) with at most one unfinished workout per user (partial unique index), and `workout_exercises` (id, `workout_id` FK CASCADE, `exercise_id` FK RESTRICT, `position`); migration `0014`. Endpoints (`ConsentedUser`, Origin-checked writes, every query filtered by `user_id` (AD-4), another user's or a missing workout → 404 `workout_not_found` with no data (FR3)): `GET /api/workouts/active` → `{workout: Workout | null}`; `POST /api/workouts` `{date}` → 201 new, or 200 with the existing unfinished workout (date unchanged); `GET /api/workouts/{id}`; `POST /api/workouts/{id}/exercises` `{exercise_id}` → added last; `DELETE /api/workouts/{id}/exercises/{workout_exercise_id}`; `PUT /api/workouts/{id}/exercises/order` `{ids}` (must be exactly the workout's ids, else 422). Every write returns the whole workout: id, date, exercises in order (workout_exercise id, exercise id, name, level, primary muscle, equipment). Same exercise twice → 409 `exercise_already_in_workout` "Øvelsen er allerede i økta."; at most 20 exercises → 422 "Du kan ha opptil 20 øvelser i én økt."; unknown exercise → 404 `exercise_not_found`; non-UUID ids → 404. UI: Trening page gets "Start økt" (plum primary) above the profile switch, or "Fortsett økt · {N} øvelser" when one is in progress; both go to `/trening/okt`. Økt page (own URL, nav title "Økt"): heading with the date ("tirsdag 17. november"), the exercises in order, each linking to its detail, with "Flytt opp"/"Flytt ned" (hidden at the ends) and "Fjern" (≥ 44 px, `aria-label` with the exercise name); focus stays on the moved row's button; "Legg til øvelse" links to `/trening`. Empty: "Økta er tom. Legg til øvelser fra Trening." Detail page: "Legg til i økt" starts a workout for today if none is in progress, then adds; afterwards shows "Lagt til i økta." with a "Gå til økta" link; already added → disabled "Allerede i økta". Today's date uses the existing Europe/Oslo helper.

**Never:** No sets, "Sist", finish, delete-workout or Daily Overview changes (5.2–5.4, 6.x). No adding exercises from the suggestion rows (detail page only).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | no workout in progress, date 2026-11-17 | 201, empty workout for that date | Bad date → 422 |
| Resume | one in progress | 200 same workout, nothing created | N/A |
| Add | Armhevinger, then Knebøy | order Armhevinger, Knebøy | Twice → 409; 21st → 422 |
| Reorder | ids reversed | new order saved | Missing/extra/foreign id → 422 |
| Remove | one exercise | gone, others keep order | Unknown id → 404 |
| Isolation | B reads/changes A's workout | 404, A unchanged | N/A |
| Purge | user purged | workouts and exercises gone (CASCADE) | N/A |
| Detail | no workout, "Legg til i økt" | workout started for today, exercise added, "Gå til økta" | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/workouts/` (new) -- models, schemas, repository, service, router; reuse `ConsentedUser`, `AppError`, exercises service for exercise lookup (service, never its repository).
- `backend/app/main.py`, `backend/migrations/env.py`, `migrations/versions/0014_workouts.py`; `tests/test_health.py` expects `0014`; CASCADE test must pass.
- `backend/tests/workouts/` (new) -- every matrix row.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/workouts/` (new) -- `api.ts`, `workout-page.tsx`; `frontend/src/app/trening/okt/page.tsx`; start/continue button on Trening (`suggestions.tsx`), "Legg til i økt" in `exercise-detail.tsx`; nav title for the route.

## Tasks & Acceptance

**Execution:**
- [x] backend module, migration, tests -- FR22, FR3, AD-12.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend Økt page, start/continue on Trening, "Legg til i økt" on detail -- Vitest.

**Acceptance Criteria:**
- Given a new user, when they press "Start økt" on Trening, open Armhevinger, press "Legg til i økt", then add Kroppsvektknebøy and move it up, then the Økt page shows Kroppsvektknebøy then Armhevinger for today's date, and Trening shows "Fortsett økt · 2 øvelser".
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `workouts` module (models, schemas, repository, service, router). Exercise data comes from a new `exercises.service.get_list_items` (and `get_exercise` for the 404); workouts never touch the exercises repository. Starting is serialised per user with an advisory lock (namespace 5101); add/remove/reorder lock the workout row (`FOR UPDATE`). A unique `(workout_id, exercise_id)` backs the 409. Path ids and the body `exercise_id` are strings parsed in the service, so non-UUIDs are 404; reorder `ids` are UUIDs (a non-UUID is 422). Codes: `workout_not_found`, `workout_exercise_not_found`, `exercise_already_in_workout` (409), `workout_exercise_limit` (422), `invalid_workout_order` (422). `GET /api/workouts/{id}` returns finished workouts too.
- **Frontend:** the Økt page (`/trening/okt`) always shows the active workout; with none in progress it says so and links to Trening. "Start økt"/"Fortsett økt" sits at the top of Trening (`StartWorkout`, rendered by `suggestions.tsx`); "Fortsett økt · 1 øvelse" in the singular. Writes store the returned workout as the active-workout query; errors refetch it. Move/remove buttons are 44 px icon buttons with `aria-label`s ("Flytt opp: {navn}", "Fjern {navn}"); focus returns to the moved row's button (the other arrow at an end), after a removal to the next row's "Fjern" (else the heading), once the server's order has rendered. "Allerede i økta" also shows a "Gå til økta" link.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Writes allowed on a finished workout | medium | `_get_workout` ignores `finished_at` | patch |
| BH | Concurrent duplicate add gives 500 | low | Unique index raises IntegrityError | patch |
| BH | Any date accepted | low | Sanity window of one year | patch |
| BH | Stale error alert; focus lost on failed move/remove; no move announcement; remove focus differs from spec | low | Økt page accessibility | patch |
| BH | Focus lost after "Legg til i økt"; no recovery when the workout is gone | low | Button unmounts; cached id may be stale | patch |
| BH | Lifecycle and error-path tests missing | medium | `/active` vs finished, empty reorder, 409 UI path | patch |
| BH | Active-workout cache key not scoped by user | false | Login, logout and delete call `queryClient.clear()` | rejected |
| BH | Parallel start/add tests | low | No concurrency harness (deferred in 4.2) | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
