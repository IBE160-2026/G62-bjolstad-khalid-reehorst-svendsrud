---
title: 'Story 3.1: Search for a basic food and log it'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '6874fe3ea27a362eb159f0e727cb5e9bbb445438'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no food data and no way to log a meal, so the app cannot count a day's calories.

**Approach:** Add the `food` module: a shared Matvaretabellen seed (about 150 common Norwegian foods), food search, food log entries per date and Meal with a kcal snapshot, and sums computed by the `food` service. Replace the Mat placeholder with today's four Meals, their entries and totals, and a sheet where the user searches a food, enters grams with a live kcal preview and saves.

## Boundaries & Constraints

**Always:** Seed data comes from Matvaretabellen 2026 (downloaded 2026-11-16 from `https://www.matvaretabellen.no/api/nb/foods.json`, saved at `/private/tmp/claude-501/-Users-osmankhalid/745f5a22-f502-4a64-b4ba-da1a967246ce/scratchpad/mvt-download/foods.json`). A script `backend/scripts/build_matvaretabellen_seed.py` reads that file and a curated list of food names and writes `backend/app/seed/data/matvaretabellen.json` (fields: `food_id`, `name`, `kcal_per_100g` from `calories.quantity`, `protein_g`/`carbs_g`/`fat_g` from constituents `Protein`/`Karbo`/`Fett` when present); only the small JSON is committed, never the 13.7 MB file. The list is ≥ 100 everyday foods across groups (dairy, bread/grain, fruit, vegetables, meat, fish, eggs, spreads, drinks) and includes "Havremel"; no baby food or brand items. `seed_if_empty` (local only) inserts them as `food_items` (`source="matvaretabellen"`, `owner_id` NULL) when none exist. Meals are `breakfast|lunch|dinner|snack` shown as Frokost, Lunsj, Middag, Mellommåltid. Entry kcal = grams × snapshot / 100, unrounded; Meal and day totals sum unrounded values; display rounds to whole kcal with a thousands space. Search: case-insensitive "contains" on name, shared items plus the user's own (never others'), names starting with the query first, then shorter names, max 20; empty or 1-char query returns nothing; never calls Open Food Facts. Grams > 0 and ≤ 5 000, one decimal. All food endpoints use `ConsentedUser`; every repository query on entries filters by `user_id` (AD-4). The Mat page shows today (Europe/Oslo) in 3.1. The sheet is a native `<dialog>`: method picker with four tabs where only Søk is enabled (others visibly disabled "Kommer snart"), search focused on open, Meal preselected from the row ("Logg mat" defaults to the Meal by time of day: before 10 Frokost, before 15 Lunsj, before 20 Middag, else Mellommåltid, editable). Attribution "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no" on the Mat page and in the sheet.

**Never:** No barcode, manual registration, recent foods, servings, edit/delete, week strip or Open Food Facts calls (later stories). No frontend kcal sums beyond the live preview. No food data in logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed | fresh local DB | ≥ 100 Matvaretabellen items; second start adds nothing | Non-local env: no seed |
| Search | "mel" | includes "Havremel" | "MEL" same result |
| No match | "xyzq" | 200 `[]`; UI shows "Ingen treff" + "Prøv et annet ord." | N/A |
| Own vs others | user B's own item | never in A's results | N/A |
| Preview | 150 g, 63 kcal/100 g | "95 kcal" | N/A |
| Save | valid entry | 201; entry has snapshot; Mat page updates Meal and day totals without reload | N/A |
| Bad grams | 0, −5, 5000.1 | 422 field error on `grams` | Nothing stored |
| Sums | entries 31.5 + 63 kcal in Lunsj | Lunsj 94.5 (shows 95), day total sums all Meals | N/A |
| Other user's day | A requests entries | only A's entries | N/A |
| No consent | any food endpoint | 403 `consent_required` | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/food/` (new) -- `models.py` (`FoodItem`, `FoodLogEntry` with `user_id` FK CASCADE), `schemas.py`, `repository.py`, `service.py` (pure `entry_kcal`, `sum_kcal`; search; add entry; day summary), `router.py`: `GET /api/food/items?q=` (`search_food_items`), `GET /api/food/entries?date=` (`get_food_day` → entries grouped by Meal, Meal totals, day total), `POST /api/food/entries` (`add_food_entry`). Reuse `ConsentedUser`, `AppError`, field errors.
- `backend/app/seed/seed.py`, `backend/app/seed/data/matvaretabellen.json`, `backend/scripts/build_matvaretabellen_seed.py`.
- `backend/app/main.py`, `backend/migrations/env.py`, `migrations/versions/0008_food.py` (`down_revision='0007'`, index on `lower(name)`); `tests/test_health.py` expects `0008`; CASCADE test from 1.6 must pass.
- `backend/tests/food/` (new) -- every backend row; seed test against the JSON.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/food/` (new) -- `api.ts` (`useFoodDay(date)` key `["food-day", date]`, `useFoodSearch`, `useAddFoodEntry` invalidates the day), `meals.ts`, `food-day.tsx`, `add-food-sheet.tsx`, `amount-picker.tsx`. Reuse dialog/focus pattern of `delete-account.tsx`, `styles.ts`, `formatKcal` from `profile/target-result.tsx`, `mark` colour tokens for Meal icons.
- `frontend/src/app/mat/page.tsx` -- replace placeholder.

## Tasks & Acceptance

**Execution:**
- [x] seed script, seed JSON, `seed.py` -- data.
- [x] backend `food` module, migration, wiring, tests -- FR11, FR13, NFR8, AD-4/5/6/12.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend `food` module and Mat page -- Vitest for meal default by time, preview, search states, save → totals update, grams validation.

**Acceptance Criteria:**
- Given the running stack with a fresh DB, when a consented user with a profile opens Mat, presses "+ Legg til" on Lunsj, searches "mel", picks Havremel, enters 150 g and saves, then Lunsj and the day total show the entry's kcal without a reload, and the attribution line is visible.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- Migration 0008 needs 0007 (story 2.3, PR #27, not yet on main), so `story/2-3-intro` was merged into this branch.
- Seed: 181 curated foods. Stored as `Numeric` (kcal 7,2; grams 6,1); the API returns floats, sums are computed on `Decimal`.
- Logging an item the user cannot see (another user's own item, unknown id) returns 404 `food_item_not_found`.
- The Mat page reads today's Oslo date in the browser only (`useSyncExternalStore`), because Cache Components forbids `new Date()` while prerendering; skeleton rows show until then.
- The amount picker starts at 100 g; "Enter" in search picks the highlighted result (arrow keys move it).

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| VG | Old seed test writes food items into the dev DB | medium | `test_seed_runs_only_locally` calls the real `seed_if_empty` without patching the session factory | patch |
| BH, EC | `food_item_id` ON DELETE CASCADE erases logged history | medium | Deleting an item (story 3.6) would delete entries, against AD-6 | patch |
| BH, EC | Date never rolls over at Oslo midnight | medium | `useSyncExternalStore` subscribe never fires; entries go to yesterday | patch |
| BH | Search list not exposed to screen readers | medium | No combobox/listbox roles; `aria-current` on buttons; dangling `aria-controls` (NFR-10) | patch |
| BH, EC | Results flicker; Enter can pick stale results; no `maxLength` | low | Skeleton on every keystroke; Enter uses previous results while debouncing; backend max 100 | patch |
| VG | Arrow-key navigation untested | medium | Only a one-result Enter test exists | patch |
| EC | Non-`grams` field errors hidden, save fails silently | low | `serverError` hidden when `fields` non-empty | patch |
| EC | "1 000" grams rejected; grams shown without thousands space | low | Parser keeps spaces; display uses raw number | patch |
| BH | Seed JSON and regenerated API files missing | false | Excluded from the review diff on purpose; present in the working tree | rejected |
| BH | Spec names a machine-local path | low | Fix would edit this spec; the script documents the public URL | rejected |
| BH | Item name not snapshotted | low | Names of shared items do not change; own-item edits are story 3.6 | rejected |
| BH, EC | No DB CHECK constraints on meal/source/grams | low | Only validated write paths exist | rejected |
| BH | Seed skips when any item exists; duplicate risk with many workers | low | One worker; new foods can be added with a later migration | rejected |
| BH, EC | Entry date unbounded | low | UI only sends today | rejected |
| BH | POST login/Origin and `day_kcal` untested | low | Origin is global middleware with its own tests; `day_kcal` is tested through `get_day` sums | rejected |
| BH | No `aria-live` save confirmation | low | Focus returns and totals update | rejected |
| BH | 404 `food_item_not_found` has no way back | low | Rare race | rejected |
| BH | Recency ordering from the epic not recorded | low | Fix would edit this spec; story 3.4 owns recent foods | rejected |
| EC | NUL in `q` gives 500 | low | Hand-crafted request only | rejected |
| EC | Æ/Ø/Å lowercasing under a C locale | maybe-false | postgres:18 image defaults to a UTF-8 locale; settle by searching "ØL" | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass; seed loaded into the existing dev DB (it has no food items yet), no volume reset needed
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass

**Manual checks (if no CLI):**
- In Chrome at 1280 and 360 px: Mat → + Legg til (Lunsj) → "mel" → Havremel → 150 g → Lagre.
