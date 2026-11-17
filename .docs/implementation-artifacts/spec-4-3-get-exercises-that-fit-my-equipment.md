---
title: 'Story 4.3: Get exercises that fit my equipment'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '38bbf22a424731d8a0c60a10eff1b85cb245b0cd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-4-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-4-2-save-my-equipment.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Trening page lists all 34 exercises, so a beginner with little equipment sees many they cannot do.

**Approach:** Add the suggestion rule as one pure, unit-tested function in the `exercises` service (AD-5): an exercise is suggested when all its required equipment is in the chosen Equipment Profile; order Nybegynner, Middels, Øvet, then muscle group order, then name. Add `GET /api/exercises/suggestions?profile_id=` and replace the Trening list with a profile switch ("Hjemme" · "Treningssenter" · …) and suggestions grouped by level that refresh at once when the profile changes. An empty result explains why and what to change.

## Boundaries & Constraints

**Always:** The rule takes the profile's equipment slugs and the exercises and returns the ordered subset; it never reads the DB. Endpoint `GET /api/exercises/suggestions?profile_id={uuid}` (`CurrentUser`, `operation_id="get_suggestions"`): the profile must be the user's own (otherwise 404 `equipment_profile_not_found`, also for a non-UUID); response = profile id + name + list items as in `GET /api/exercises` (id, name, level, primary muscle, equipment). Coverage tests over the real seed (each profile includes Kroppsvekt): Kroppsvekt only 8; + Manualer 13; + Manualer + Benk 16; + Strikk 11; + Kettlebell 11; + Trekkestang 10; all nine 34; Manualer profile never contains Markløft. The PRD addendum's table said 14 for "dumbbells + bench"; it predates story 4.1's rule that "Manualer + benk" needs both, which adds Manual benkpress, Manual roing and Hevinger på benk — update the addendum table to 16 with a one-line note. Trening UI: a segmented control (radio group, ≥ 44 px, plum selected) of the user's profiles in their order; the default is the last chosen profile (remembered per browser in `localStorage` key `pf-trening-profile`, guarded with try/catch) or else the first; the list is grouped under "Nybegynner", "Middels", "Øvet" (empty groups hidden), each row linking to the existing detail page; a count line "{N} øvelser passer med {profil}". Empty result: "Ingen øvelser passer med utstyret i «{profil}». Legg til utstyr under Profil → Utstyr." with a link to `/profil`. While loading: skeleton rows; on error: message + "Prøv igjen".

**Never:** No name search (4.4), no muscle/level filters (4.5), no frontend copy of the rule, no new tables.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Coverage | each profile in the table above | exactly the stated counts | N/A |
| Never deadlift | Kroppsvekt + Manualer | no Markløft | N/A |
| Order | mixed levels | Nybegynner, then Middels, then Øvet | N/A |
| Other user | B's profile id as A | 404 | Non-UUID → 404 |
| Switch | pick "Treningssenter" | list shows 34 at once, grouped | N/A |
| Remembered | reload | last chosen profile selected | Storage blocked → first profile |
| Empty | profile whose equipment matches nothing (test with a stub rule input) | message + link to Profil | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/exercises/{service,schemas,router}.py` -- pure `suggest_exercises(exercises, equipment_slugs)`; endpoint; reuse list-item schema and `get_profile` ownership check from 4.2.
- `backend/tests/exercises/test_suggestions.py` (new) -- pure-function tests (coverage over the seed JSON, order, deadlift) and API tests (ownership, 404).
- `.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/addendum.md` -- section G table: 14 → 16 with note.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/exercises/{api.ts,suggestions.tsx,profile-switch.tsx}`; `frontend/src/app/trening/page.tsx` -- use suggestions instead of the 4.1 full list (keep `exercise-list.tsx` only if still used).

## Tasks & Acceptance

**Execution:**
- [x] backend rule, endpoint, tests -- FR19, NFR8, SM-5, AD-5.
- [x] addendum table fix.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend switch, grouped list, remembered choice, empty/error states -- Vitest.

**Acceptance Criteria:**
- Given a new user on Trening, when "Hjemme" is selected, then 8 bodyweight exercises show grouped by level; switching to "Treningssenter" shows 34 at once.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Rule shape:** `suggest_exercises(exercises, equipment_slugs)` takes `SuggestionCandidate`s (name, level, primary muscle position, required equipment slugs, plus an opaque `item` carried through), so the same pure function runs over ORM rows in the endpoint and over the seed JSON in the tests. Name order ignores case.
- **Endpoint:** `profile_id` is taken as a string and parsed in the service, so a non-UUID is 404 `equipment_profile_not_found` like a missing or foreign one; a missing `profile_id` is FastAPI's 422. The endpoint repairs a profile without Kroppsvekt the same way the profile list does.
- **Frontend:** suggestions are cached under the `equipment-profiles` query key prefix, so editing a profile on Profil also refreshes Trening. The remembered choice is stored per user as `pf-trening-profile:{userId}` (user id from `["me"]`), so users sharing a browser do not share it. A stored or chosen profile id that no longer exists falls back to the first profile; a 404 on suggestions refetches the profile list so this happens without a reload. The previous list stays (`keepPreviousData`) while a newly chosen profile loads. No profiles at all shows a short message with a link to Profil → Utstyr. The count line uses "1 øvelse passer" in the singular. `exercise-list.tsx`, its tests and `useExercises` were removed (no longer used); `GET /api/exercises` stays in the backend.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | Deleted selected profile → endless 404 retry | medium | Retry refetches only suggestions; cached profile list still has the id | patch |
| BH | Switching profile blanks the list (not "at once") | medium | New query key per profile, no placeholder data | patch |
| EC | Empty profile list renders nothing | low | `selected` undefined; direct guard | patch |
| BH | Remembered profile key shared by all users in a browser | low | Scope by user id | patch |
| BH | Fieldset with `role="radiogroup"` and double label | low | Native semantics overridden | patch |
| BH | Intro sentence awkward | low | Copy | patch |
| VG, BH | Endpoint order tie-breaks and bodyweight repair untested | medium | Only level order asserted; repair path unpinned | patch |
| BH | Regenerated API files missing; status mismatch | false | Excluded from the review diff on purpose; step 5 syncs status | rejected |
| BH, EC | Unknown level → KeyError | false | DB CHECK constraint limits level to three values (4.1) | rejected |
| EC | Exercise without equipment suggested everywhere | false | Seed test requires ≥ 1 equipment per exercise | rejected |
| EC | Empty catalogue shown as "no match" | low | Seed always loads exercises locally | rejected |
| BH | GET can repair (write) profiles | low | Same accepted behaviour as 4.2 | rejected |
| BH | Possible lazy loads per exercise | maybe-false | 34 rows; check query count if it grows | rejected |
| BH | Missing `profile_id` 422 untested; mock fixtures simplified | low | Test polish | rejected |
| EC | Unused `within` import | false | Lint passes | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
