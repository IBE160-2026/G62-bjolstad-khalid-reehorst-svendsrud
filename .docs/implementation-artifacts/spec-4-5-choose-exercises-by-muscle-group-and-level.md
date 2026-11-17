---
title: 'Story 4.5: Choose exercises by muscle group and level (Should)'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'a721663ae16f082e152f411afc2201eb60735038'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-4-3-get-exercises-that-fit-my-equipment.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Suggestions show every exercise that fits the equipment, so a user who wants to train one body part or level must scan the whole list.

**Approach:** Extend the 4.3 suggestion rule (AD-5) with optional filters: muscle group (primary or secondary) and level. Trening gets a plain muscle-group list and three level chips above the suggestions; the empty message names the filters that excluded everything.

## Boundaries & Constraints

**Always:** `GET /api/exercises/suggestions` gains optional `muscle_group` (slug of one of the six) and `level` (`beginner|intermediate|advanced`); unknown values → 422 field error. The pure `suggest_exercises` takes the filters; muscle group matches primary or secondary; level is exact; equipment rule and order unchanged. UI (Trening, between the profile switch and the list): muscle groups as plain text buttons in seed order (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg) with `aria-pressed` and the selected style of the food method picker; level chips "Nybegynner", "Middels", "Øvet" with `aria-pressed`; one of each at a time, pressing the selected one clears it; ≥ 44 px. Filters apply at once and also while name search (4.4) is not active; when search is active the filters are hidden (search covers the whole list). Count line adds the filters ("3 øvelser passer med Hjemme · Bryst · Nybegynner"). Empty: "Ingen øvelser passer med {profil} og {filtre}. Prøv en annen muskelgruppe eller legg til utstyr." (filters joined with " og "). Filters stay when the profile changes and are not remembered across reloads.

**Never:** No anatomical figure (4.6), no multi-select, no frontend copy of the rule.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Secondary | Treningssenter + Armer | includes exercises with Armer as secondary (e.g. Benkpress) | N/A |
| Level | Hjemme + Nybegynner | only beginner, still equipment-filtered | N/A |
| Both | Treningssenter + Ben + Øvet | intersection | N/A |
| Empty | Hjemme (kroppsvekt) + Skuldre | "Ingen øvelser passer med Hjemme og Skuldre. Prøv en annen muskelgruppe eller legg til utstyr." | N/A |
| Clear | press selected chip again | filter removed | N/A |
| Bad value | `muscle_group=nakke` | 422 | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/exercises/{service,router,schemas}.py` -- filter params in the pure rule and endpoint; tests in `test_suggestions.py`.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/exercises/{api.ts,suggestions.tsx,filters.tsx}` -- filter UI, query key includes filters; Vitest.

## Tasks & Acceptance

**Execution:**
- [x] backend filters and tests -- FR20.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend filters, count line, empty message -- Vitest.

**Acceptance Criteria:**
- Given Hjemme on Trening, when the user picks Skuldre, then the message names Hjemme and Skuldre; with Treningssenter + Bryst + Nybegynner, only matching exercises show.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Rule:** `SuggestionCandidate` gained `muscle_slugs` (primary + secondary, default empty so existing callers and stubs still work); `suggest_exercises(..., muscle_group=None, level=None)`. The endpoint takes `muscle_group: MuscleGroupSlug | None` (new six-value enum in `schemas.py`) and `level: Level | None`, so an unknown value is FastAPI's 422 `validation_error` with a field error on that parameter.
- **Matrix conflict:** with "primary or secondary", Hjemme + Skuldre is not empty (Push-up and Planke have Skuldre as secondary). The backend follows the Always rule; the empty message is tested in Vitest with a stubbed empty response, and the backend tests an empty result with Hjemme + Øvet and a stub.
- **Order conflict:** "seed order" vs. the listed order — the seed is Ben, Rygg, Bryst, Skuldre, Armer, Mage/kjerne. The UI uses the explicitly listed order (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg).
- **Frontend:** filters live in `filters.tsx` (`SuggestionFilterBar`), state in `Suggestions` (not stored). Placed below the search field and above the count line; hidden while search is active. The query key includes both filters; the query result carries the filters it was asked with, so a list kept by `keepPreviousData` is labelled by its own filters. With no filters the 4.3 empty message (with the Profil link) is unchanged.

## Spec Change Log

- 2026-11-18: the empty-state example (Hjemme + Skuldre) is not empty under the spec's own "primary or secondary" rule (Armhevinger and Planke have Skuldre as secondary); Osman chose option A on 2026-11-18: keep the primary-or-secondary rule (as in the epic) and use an example that is really empty; the acceptance example is superseded. Muscle groups are shown in the listed order (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg), not seed order. Intent unchanged.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Test mock matches primary only | medium | Empty test passed only because of the mock | patch |
| BH | Empty hint wrong for level-only; "X og Y og Z"; no Profil link; not announced | low | Copy and accessibility | patch |
| BH | List and pressed buttons disagree while loading | low | `isPlaceholderData` ignored | patch |
| BH | Fixed label ids; `muscle_slugs` default hides wiring mistakes; missing endpoint tests | low | Robustness and tests | patch |
| BH | Frozen acceptance example (Hjemme + Skuldre) cannot be empty | medium | Secondary-group rule from the epic | rejected — Osman chose A: keep primary-or-secondary, use an example that is empty |
| BH | Status mismatch | false | Step 5 syncs | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
