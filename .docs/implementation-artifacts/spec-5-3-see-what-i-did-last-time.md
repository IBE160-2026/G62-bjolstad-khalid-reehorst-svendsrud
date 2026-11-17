---
title: 'Story 5.3: See what I did last time'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'b22d85a6601129fb650fa39ab1b9a6ef4c06a7e3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-5-2-log-my-sets.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** While logging, the user cannot see what they lifted last time, so they don't know what to beat.

**Approach:** The workout response gives each Workout Exercise a `last_time`: the done sets of that exercise from the user's latest earlier workout (date before this workout's date), computed by a pure, unit-tested function in the `workouts` service (AD-5). The Økt page shows "Sist: 8 kg × 10, 8 kg × 8 (3. nov)" under the exercise name, or "Første gang" when there is none.

## Boundaries & Constraints

**Always:** Pure function `last_time(history, exercise_id, before_date)` (no I/O) over rows (workout id, date, created_at, exercise id, set position, reps, weight_kg, seconds) returns `{date, sets}` or None: only workouts with `date < before_date`; only done sets with a value; workouts where the exercise has no such set are skipped; the latest date wins; on the same date the later-created workout wins; sets in position order. The endpoint loads history in one query for all exercises in the workout, filtered by `user_id` (AD-4), finished or not. `last_time` is part of every workout response (5.1/5.2 endpoints). UI: under the exercise name, muted text: "Sist: {sett} ({dato})" where a set is "8 kg × 10", "10 rep" (no kg = bodyweight; kg shown with comma decimals, e.g. "12,5 kg × 8") or "45 s", joined with ", "; date "3. nov" (Norwegian short month; add the year if it differs from the workout's year, "3. nov 2025"). None → "Første gang". PRD FR-24 ("Første gang") wins over the older UX note that hid the line.

**Never:** No progress charts, no personal records, no suggestions of what to lift.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Today excluded | sets for the exercise only in today's workout | None → "Første gang" | N/A |
| Latest wins | done sets on 3. nov and 1. nov, workout 17. nov | 3. nov sets | N/A |
| Same date | two workouts on 3. nov | the later-created one | N/A |
| Not done | earlier sets not ticked | ignored; older done ones used if any | N/A |
| Later date | workout dated 20. nov exists, today's is 17. nov | not used | N/A |
| Other user | B has done sets on the exercise | never shown to A | N/A |
| Format | 8 kg × 10, bodyweight 10, 45 s, 12.5 kg | "8 kg × 10", "10 rep", "45 s", "12,5 kg × 8" | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/workouts/{service,repository,schemas}.py` -- pure `last_time`, one history query, `last_time` in the response.
- `backend/tests/workouts/test_last_time.py` (new) -- pure-function tests for every matrix row plus one API test (isolation, today excluded).
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/workouts/{workout-page.tsx,api.ts}` -- format and show the line; Vitest for the format and "Første gang".

## Tasks & Acceptance

**Execution:**
- [x] backend rule, query, response, tests -- FR24, NFR8, AD-5.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend "Sist"/"Første gang" -- Vitest.

**Acceptance Criteria:**
- Given a finished-or-earlier workout on 3. nov with Armhevinger 2 done sets of 10, when the user adds Armhevinger to a workout dated 17. nov, then the Økt page shows "Sist: 10 rep, 10 rep (3. nov)"; a never-logged exercise shows "Første gang".
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `service.last_time(history, exercise_id, before_date)` is pure over `HistoryRow` (the spec's row fields plus `done`, so the "Not done" rule is in the function too); ties on date and `created_at` fall back to the workout id so the result is deterministic. `repository.get_history` is one query (sets ⨝ workout_exercises ⨝ workouts) filtered by `user_id`, `date < workout.date`, the workout's exercise ids and `done`; skipped for an empty workout. `_response` adds `last_time` (`{date, sets: [{reps, weight_kg, seconds}]}` or null) to every exercise, so all 5.1/5.2 endpoints return it.
- **Frontend:** `lastTimeText`, `lastSetText`, `shortDateText` in `api.ts` (own month list "jan … des", since `Intl` short months end with a period); the line sits as muted small text in the exercise link under the muscle group/equipment line.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | "Sist" inside the exercise link makes the link name long | low | Accessibility | patch |
| BH | Formatter drops kg on timed sets and can print "null" | low | No guards | patch |
| BH | API boundaries (undone fallback, later date), date months, setup asserts untested; misnamed test | low | Test gaps | patch |
| BH | Same exercise twice in one workout mixes sets | false | 5.1 forbids duplicates (unique index) | rejected |
| BH | An earlier workout on the same day is skipped | false | FR-24 says "before today's date" (frozen intent) | rejected |
| BH | History query unbounded | low | Small per-user data; revisit if slow | rejected |
| BH | Same-date tie by random id when created_at equal | low | Needs identical timestamps | rejected |
| BH | Status mismatch | false | Step 5 syncs | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
