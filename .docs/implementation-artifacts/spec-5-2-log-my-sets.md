---
title: 'Story 5.2: Log my sets'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '7eef92f1ba427bed749de6949204bd1e7962806d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-5-1-start-a-workout-and-add-exercises.md'
  - '{project-root}/.docs/implementation-artifacts/spec-3-6-edit-or-delete-a-food-entry.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Økt page lists exercises, but the user cannot record what they actually did.

**Approach:** Add Sets to Workout Exercises. A newly added exercise gets 3 empty sets suggesting 10 reps (FR23). Each set row has reps + kg (or seconds for time exercises), a done check and delete. Values save when a field loses focus. Delete is immediate with an "Angre" toast for 5 seconds (UX-DR11).

## Boundaries & Constraints

**Always:** Table `sets` (id, `workout_exercise_id` FK CASCADE, `position`, `reps` int null, `weight_kg` numeric(5,2) null, `seconds` int null, `done` bool default false, `created_at`); migration `0015`. Adding an exercise (5.1 endpoint) also creates 3 empty sets. Endpoints under the user's unfinished workout (`ConsentedUser`, Origin-checked, AD-4, same 404 rules as 5.1; set of another workout/user → 404 `set_not_found`): `POST /api/workouts/{id}/exercises/{workout_exercise_id}/sets` (body optional values + optional `position`; added last when no position) — at most 20 sets per exercise (422 "Du kan ha opptil 20 sett per øvelse."); `PATCH /api/workouts/{id}/sets/{set_id}` (`reps?`, `weight_kg?`, `seconds?`, `done?`; null clears a value); `DELETE /api/workouts/{id}/sets/{set_id}` (hard delete, positions renumbered). Every write returns the whole workout; the workout response gains each exercise's `type` (`reps|time`) and its sets in order. Validation (422 field errors, Norwegian, starting with the fix): reps whole number 1–100; kg 0–500 with at most 2 decimals; seconds whole number 1–3600; `reps`/`weight_kg` on a time exercise or `seconds` on a reps exercise → 422; `done: true` needs reps (reps type) or seconds (time type) — "Fyll inn repetisjoner." / "Fyll inn sekunder.". UI (Økt page, under each exercise): rows "Sett {n}" with number inputs ("Repetisjoner", placeholder "10"; "Kg", placeholder "Kroppsvekt"; or "Sekunder"), each with an `aria-label` including the set number; kg accepts comma decimals ("12,5"); a done checkbox "Ferdig" ≥ 44 px; ticking done on a reps set with empty reps saves 10 (the suggestion); delete icon button "Slett sett {n}" ≥ 44 px; "Legg til sett" under the rows (new set empty). Values save on blur/Enter; field errors show under the field and the value stays; done rows are visibly marked (check plus text style, not colour only). Delete: row disappears at once; toast "Sett {n} er slettet." + "Angre" (5 s, one toast at a time, never over a primary button) — Angre re-creates the set with the same values and position. Reuse the food `undo-toast` (move it to `frontend/src/components/` if both modules need it). Removing an exercise removes its sets (CASCADE).

**Never:** No "Sist" (5.3), no finish/delete workout (5.4), no rest timer, no Daily Overview changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add exercise | Armhevinger | 3 empty sets, placeholder 10 | N/A |
| Fill reps | 12 reps, kg empty | saved, kg null (bodyweight) | 0, 101, 2.5 → 422 |
| Kg | "12,5" | 12.5 saved | 501, 1.255 → 422 |
| Time | Planke 45 s | seconds 45 | reps on Planke → 422 |
| Done empty | tick done, reps empty | reps 10, done | Time with no seconds → 422 "Fyll inn sekunder." |
| Delete + undo | delete set 2, Angre | set back at position 2 with same values | 21st set → 422 |
| Remove exercise | exercise with sets | sets gone | N/A |
| Isolation | B patches A's set | 404, A unchanged | Finished workout → 404 |

</frozen-after-approval>

## Code Map

- `backend/app/modules/workouts/{models,schemas,repository,service,router}.py` -- `Set` model, 3 default sets in `add_exercise`, set endpoints, validation, `type` in the response.
- `backend/migrations/versions/0015_sets.py`; `tests/test_health.py` expects `0015`; CASCADE test passes.
- `backend/tests/workouts/test_sets.py` (new) -- every matrix row.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/workouts/{api.ts,workout-page.tsx,set-row.tsx}`; `undo-toast` shared.

## Tasks & Acceptance

**Execution:**
- [x] backend sets, migration, tests -- FR23, FR4.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend set rows, save on blur, done, delete + Angre -- Vitest.

**Acceptance Criteria:**
- Given Armhevinger in the workout, when the user types 12 in set 1 and ticks done on sets 1–3 (2 and 3 empty), then the sets read 12, 10, 10, all done, after a reload; deleting set 3 and pressing "Angre" brings it back.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `Set` model (`sets`, migration `0015`), `WorkoutExercise.sets` (selectin, ordered, delete-orphan + DB CASCADE). `add_exercise` now takes `now` and creates 3 empty sets. Exercise type comes from a new `exercises.service.get_types` (never the repository). Positions are 0-based and gapless; `POST .../sets` takes optional `reps`, `weight_kg`, `seconds`, `done` (default false) and `position` (0–19, clamped to the end). Number fields use a `BeforeValidator`, so 2.5, `"12"` and `true` get the Norwegian message. Wrong-type values (only non-null ones) and done-without-value are 422 `validation_error` with `fields`; the done rule is checked on the resulting set, so clearing reps on a done set is also 422. Limit code `set_limit`; missing/foreign set `set_not_found`; unknown workout exercise on add `workout_exercise_not_found`.
- **Frontend:** `undo-toast.tsx` moved to `src/components/`. `set-row.tsx` holds one row; inputs are `type="text"` with `inputMode` numeric/decimal (a `type="number"` input drops "12,5" in some browsers). Typed text is kept as a draft until saved, so a field error never wipes it. Set writes run through one serial queue so a late answer cannot overwrite a newer one; field errors do not refetch. Delete is optimistic (`onMutate`), focus moves to the row now in that place (else "Legg til sett"). Angre posts the deleted set's values with its old position.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Parallel set writes can pass the limit and break positions | false | Set writes already lock the workout row via `_get_unfinished` (made explicit) | rejected |
| BH | Late save response brings a deleted set back; exercise writes not serialised | medium | `onMutate` without `cancelQueries`; separate queues | patch |
| BH | Failed delete still offers Angre (duplicate set) | medium | Toast kept on error | patch |
| BH | Double tap deletes two sets; no guard on "Legg til sett" | low | Next row's button under the pointer | patch |
| BH | Field errors not announced; names repeat across exercises; focus lost after Angre; unsaved draft looks saved | low | Accessibility and feedback | patch |
| BH | Loose `done`/`position` types; POST validation untested | low | Pydantic coercion | patch |
| BH | Three exercise lookups per write | low | Small catalogue | rejected |
| BH | DB CHECK constraints on ranges | low | Service validates; only writer | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
