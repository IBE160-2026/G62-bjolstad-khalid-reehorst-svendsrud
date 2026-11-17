---
title: 'Story 4.4: Search exercises by name'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '3d19c915f4b9232d59db1f441177ef3f4b949048'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-4-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-4-3-get-exercises-that-fit-my-equipment.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user who knows the exercise they want ("knebøy") must scroll the suggestion list, and cannot find an exercise their chosen profile does not fit.

**Approach:** Add a search field on Trening. Typing at least 2 characters searches the whole exercise list by name (case-insensitive "contains"), not only the suggestions; each result shows whether it fits the chosen Equipment Profile and, if not, which equipment is missing. Clearing the field shows the 4.3 suggestions again.

## Boundaries & Constraints

**Always:** Backend: `GET /api/exercises/search?profile_id={uuid}&q={text}` (`CurrentUser`, `operation_id="search_exercises"`), same profile ownership/404 rule as 4.3; `q` trimmed, 2–50 characters (else 422 field error on `q`); match is case-insensitive "contains" on the Norwegian name (the stored name, including the English part in parentheses); result items = the 4.3 list item plus `fits: bool` and `missing_equipment: list[str]` (Norwegian names, seed order); ordered fitting first, then the 4.3 order (level, muscle group, name). The fit check reuses the 4.3 rule (AD-5) — no second copy. Frontend: a search field labelled "Søk etter øvelse" above the list, below the profile switch; debounce 300 ms (same as food search); under 2 characters the 4.3 suggestions show unchanged; while searching, the list shows results flat (not grouped) with a count line "{N} treff"; non-fitting rows are marked with a muted line "Mangler: Stang og skiver" (text, not colour only) and still link to the detail; switching profile re-runs the search; no match: "Ingen øvelser heter det. Sjekk stavemåten, eller prøv et kortere ord." in a `role="status"` region. A clear button "Tøm søket" (≥ 44 px) appears when the field has text.

**Never:** No muscle/level filters (4.5), no fuzzy or spelling-tolerant matching, no frontend copy of the fit rule, no new tables.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Contains | "knebøy" with Hjemme | every exercise whose name contains "knebøy"; Kroppsvektknebøy fits; Knebøy med stang marked "Mangler: Stang og skiver" | N/A |
| Case | "KNEBØY" | same as "knebøy" | N/A |
| Whole list | "markløft" with Hjemme | Markløft ("Mangler: Stang og skiver") and Rumensk markløft med manualer ("Mangler: Manualer"), both not fitting | N/A |
| Order | mixed fit | fitting results first | N/A |
| Too short | "k" | API 422 on `q`; UI shows suggestions, no request | N/A |
| No match | "zzz" | empty list + spelling message | N/A |
| Other user | B's profile | 404 | N/A |
| Clear | "Tøm søket" | field empty, focus in field, suggestions back | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/exercises/{repository,service,schemas,router}.py` -- name filter (`ilike` with escaped `%`/`_`), `search_exercises` reusing the 4.3 rule for `fits`/missing equipment; endpoint.
- `backend/tests/exercises/test_search.py` (new) -- matrix rows over the seed.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/exercises/{api.ts,suggestions.tsx}` (+ a small `exercise-search.tsx` if cleaner) -- search field, debounce, results, empty state; reuse food search's debounce pattern and row styles.

## Tasks & Acceptance

**Execution:**
- [x] backend search endpoint and tests -- FR20.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend search field, results with "Mangler", empty state, clear -- Vitest.

**Acceptance Criteria:**
- Given Hjemme selected on Trening, when the user types "knebøy", then Kroppsvektknebøy shows as fitting and Knebøy med stang shows "Mangler: Stang og skiver"; typing "zzz" shows the spelling message; clearing shows the suggestions again.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **One fit check:** `missing_equipment(candidate, available)` in the service is the single fit test; `suggest_exercises` (4.3) and the new pure `rank_search_matches` (fitting first, then the 4.3 order) both use it. Candidates now carry the ORM `Exercise` and are built by one `_candidate` helper shared by suggestions and search; profile parsing/ownership/bodyweight repair is shared in `_owned_profile`.
- **Endpoint:** `GET /api/exercises/search` returns `profile_id`, `profile_name`, `exercises` (like 4.3). Profile ownership is checked first (404 wins over 422); then `q` is NFC-normalised, trimmed and checked in the service (422 field error on `q`, "Skriv mellom 2 og 50 tegn."); a missing `q` or `profile_id` is FastAPI's 422. Name filter is `ilike` with `\`, `%`, `_` escaped. `missing_equipment` lists Norwegian names in seed order.
- **Frontend:** `exercise-search.tsx` (field, clear button, results), `list-parts.tsx` (skeleton, error, row shared with suggestions). Food search's `useDebounced` moved to `src/lib/use-debounced.ts` and is used by both; the spec's 300 ms is used for exercises (food keeps its existing 200 ms). Search queries are keyed under the `equipment-profiles` prefix so profile edits refresh the marks, and share 4.3's 404 → refetch-profiles handling. Under 2 characters (counted in code points) the suggestions show at once; otherwise the view only switches once the debounced and typed queries match, so old results never flash back. Results kept from a previous profile/query are dimmed with `aria-busy`, and the single `role="status"` line names the profile ("{N} treff for {profil}"). The field is `type="text"` + `inputMode="search"` with the hint "Skriv minst 2 bokstaver." (`aria-describedby`). Several missing items are joined with ", ".

## Spec Change Log

- 2026-11-17: debounce stays 300 ms for exercise search as written; the "same as food search" note was wrong (food uses 200 ms) and food search is unchanged. Intent unchanged.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | Old profile's marks shown after a switch | medium | `keepPreviousData` with no busy state | patch |
| BH, EC | Two live regions; stale count with an error | low | Separate count and status elements | patch |
| BH | Browser's own clear button beside "Tøm søket"; no 2-character hint | low | `type="search"`; silent minimum | patch |
| EC | Old results flash after quick retyping | low | Shown before the debounce catches up | patch |
| EC | Emoji length, NFD input, cache key casing | low | JS and Python count differently | patch |
| BH, EC | 422 before 404 for a foreign profile | low | Order of checks | patch |
| BH | No eager loading in search | low | Lazy loads per row | patch |
| VG, BH | Seed order of several missing items, 404 fallback, error state, missing params untested | medium | No multi-item result; search mock never fails | patch |
| BH | Regenerated API files missing; status mismatch | false | Excluded from the review diff on purpose; step 5 syncs status | rejected |
| BH | Debounce differs from food search | low | Logged in Spec Change Log | rejected |
| BH | `_primary` called twice per exercise | low | 34 rows | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
