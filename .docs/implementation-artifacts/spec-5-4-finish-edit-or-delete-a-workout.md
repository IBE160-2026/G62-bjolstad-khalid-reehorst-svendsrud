---
title: 'Story 5.4: Finish, edit or delete a workout'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'baad63f9e1ab253a5a23d99f23af8af49b1ad900'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-5-2-log-my-sets.md'
  - '{project-root}/.docs/implementation-artifacts/spec-5-3-see-what-i-did-last-time.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A workout can never be finished, and mistakes in an earlier workout cannot be fixed or removed.

**Approach:** "Fullfør økt" marks the active workout finished and returns the user to I dag. Finished workouts are listed on Trening under "Tidligere økter" and open at `/trening/okt/{id}`, where sets can be edited, added and deleted and exercises removed or reordered, with the same controls as the active workout. "Slett økt" deletes a whole workout (active or finished) after a confirmation dialog.

## Boundaries & Constraints

**Always:** Endpoints (`ConsentedUser`, Origin-checked, AD-4, 404 `workout_not_found` for another user's/missing): `POST /api/workouts/{id}/finish` → sets `finished_at` (already finished → 409 `workout_already_finished`); `DELETE /api/workouts/{id}` → 204, deletes workout, exercises and sets (CASCADE); `GET /api/workouts?limit=` → the user's finished workouts, newest date first (then newest created), default 10, max 50, each with id, date, finished_at, exercise count and done-set count. Set writes (add/edit/delete) and remove/reorder of exercises now work on finished workouts too; adding a new exercise still needs the unfinished workout (finished → 404). "Sist" (5.3) automatically uses edited sets. UI: Økt page (active) gets "Fullfør økt" (plum primary, at the bottom) → finish, then navigate to `/` (I dag); and "Slett økt" (secondary destructive text). `/trening/okt/{id}` shows any of the user's workouts with the same component: for a finished one the heading adds "Fullført", there is no "Fullfør økt" and no "Legg til øvelse"; it uses its own query key so it never replaces the active-workout cache. Delete opens a native `<dialog>`: "Slette økta {dato}?", text "Øvelser og sett i økta blir slettet. Dette kan ikke angres.", buttons "Ja, slett" and "Avbryt" (focus starts on "Avbryt"; Esc closes); after delete navigate to `/trening`. Trening page: under the start button, "Tidligere økter" lists the latest 10 finished workouts ("tirsdag 3. nov · 2 øvelser · 6 sett"), each a link ≥ 44 px to its page; hidden when there are none. Errors show as an alert near the action and keep the user on the page.

**Never:** No Daily Overview changes (6.x), no reopening a finished workout as active, no undo for workout delete (confirmation instead, FR4).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Finish | active workout | `finished_at` set; `/active` → null; UI goes to I dag | Twice → 409 |
| List | 12 finished, 1 active | 10 newest finished; active not listed | limit 51 → 422 |
| Edit finished | change reps in a finished workout | saved; "Sist" in a later workout shows the new value | N/A |
| Add exercise | to finished workout | 404 | N/A |
| Delete | confirm | 204; workout, exercises, sets gone; not listed | Avbryt → nothing deleted |
| Isolation | B finishes/deletes/lists A's | 404 / A's not listed | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/workouts/{repository,service,schemas,router}.py` -- finish, delete, list; set/exercise writes accept finished workouts except add-exercise.
- `backend/tests/workouts/test_finish_delete.py` (new); update the 5.1 test that expected 404 for writes on finished workouts.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/workouts/{api.ts,workout-page.tsx,recent-workouts.tsx,delete-workout-dialog.tsx}`; `frontend/src/app/trening/okt/[id]/page.tsx` (`export const instant = false` like the exercise detail route); Trening page section.

## Tasks & Acceptance

**Execution:**
- [x] backend finish, delete, list, write rules, tests -- FR25, FR4.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend Fullfør, Slett with dialog, Tidligere økter, finished workout page -- Vitest.

**Acceptance Criteria:**
- Given an active workout with logged sets, when the user presses "Fullfør økt", then they land on I dag and Trening lists it under "Tidligere økter"; opening it and changing a set's reps saves; "Slett økt" → "Ja, slett" removes it from the list.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `WorkoutResponse` gains `finished_at` (null while in progress) so the page knows a workout is finished. Set writes, remove and reorder lock the workout with `_get_workout(for_update=True)`; only `add_exercise` keeps `_get_unfinished`. `repository.list_finished` is one query with correlated counts (exercises, done sets), ordered date desc, created_at desc, id desc. `GET /api/workouts` returns a plain list of `WorkoutSummary` (`limit` 1–50 via `Query`, 422 otherwise). Finish/delete lock the row; delete relies on ORM + DB CASCADE.
- **Frontend:** set/exercise hooks take a `queryKey` (default the active key); `WorkoutView` gets `queryKey`, so `/trening/okt/{id}` writes to `["workouts","detail",id]` only. Finish and delete run through the same serial write queue, so a pending blur save lands first. Finish sets the active cache to null; delete clears it when it was the active one; both refetch "Tidligere økter" (as does any write to a finished workout). `RecentWorkouts` sits under `StartWorkout` in `suggestions.tsx`; hidden while loading, on error and when empty.

## Spec Change Log

- 2026-11-17: `WorkoutResponse` gained `finished_at` so the page can tell finished from active; writes on finished workouts (set edits, remove, reorder) are now allowed, replacing the 5.1 rule that blocked them (FR-25). Intent unchanged.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Late write puts a finished workout back in the active cache | medium | `useStoreWorkout` stores any workout | patch |
| BH | Navigation after finish/delete can be skipped | medium | Cache cleared first unmounts the page | patch |
| BH | "Sist" on the active workout stale after editing a finished one | medium | Only detail/list keys refreshed | patch |
| BH | Active workout opened by id gets a second cache; deleted workout stays cached | low | Separate keys | patch |
| BH | No not-found state or way back to Trening; no pending feedback in dialog/finish | low | UX and accessibility | patch |
| BH | Isolation of writes on finished workouts and fake-server ids untested | medium | Test gaps | patch |
| BH | List/detail keys not scoped by user | false | Login, logout and delete clear the QueryClient | rejected |
| BH | Remaining UI test ideas (Esc while pending, list refetch) | low | Covered by invalidation; minor | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
