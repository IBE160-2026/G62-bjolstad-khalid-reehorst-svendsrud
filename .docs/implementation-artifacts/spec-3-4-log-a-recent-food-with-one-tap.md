---
title: 'Story 3.4: Log a recent food with one tap'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '183a634dc7b30fe4dcee3cce157e616bd635f7ae'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-3-3-type-a-barcode.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** People eat the same things often, but every log starts with a search, which makes daily logging slow (SM-6: at most 3 taps).

**Approach:** Add a "recent foods" list (the user's 10 most recently logged distinct items, newest first, each with the last amount and Meal) and enable the "Nylig brukt" tab. Tapping an item opens the amount picker prefilled with the last grams and Meal (editable), so a repeat log is "+ Legg til" → item → "Lagre".

## Boundaries & Constraints

**Always:** `GET /api/food/recent` (`ConsentedUser`, `operation_id="get_recent_foods"`) returns up to 10 items: for each distinct `food_item_id` among the user's entries, the most recent entry (by `date` then `created_at`) with item fields, `last_grams` and `last_meal`; ordered newest first; only the user's own entries (AD-4), and only items the user can still see. **Decision (Osman, 2026-11-16):** when the user has at least one recent food, the sheet opens on "Nylig brukt" (overriding story 3.1's Søk default); a user with none opens on Søk as before. Meal in the picker: the Meal row the sheet was opened from if any, otherwise the item's last Meal. Grams: the last grams. A new user who opens "Nylig brukt" sees "Du har ikke logget noe ennå." and a button "Søk etter mat" that switches to Søk. Saving a log refreshes the recent list. Each row shows name, last grams and Meal ("200 g · Lunsj"); rows are buttons ≥ 44 px.

**Never:** No logging without the amount picker (no auto-save on tap). No editing or removing items from the list. No change to search ordering (recent-first search is out of scope).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New user | no entries | `[]`; sheet opens on Søk; Nylig brukt shows the empty message + "Søk etter mat" | N/A |
| Distinct | Havremel logged 3×, Lettmelk 1× | each once; newest log first; Havremel shows its latest grams and Meal | N/A |
| Limit | 12 distinct items logged | 10 newest | N/A |
| Ordering | entries on earlier dates logged later | ordered by entry `date` then `created_at`, newest first | N/A |
| Isolation | user B's entries | never in A's list | N/A |
| Tap | tap Havremel (last 150 g, Lunsj) from "+ Legg til" on Middag | picker with 150 g and Middag; Lagre logs it | N/A |
| Tap from "Logg mat" | same item | picker with 150 g and Lunsj | N/A |
| No consent | GET | 403 `consent_required` | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/food/{schemas,repository,service,router}.py` -- `RecentFoodResponse` (item fields + `last_grams`, `last_meal`); repository query (distinct per item, latest by `date, created_at`, limit 10, `user_id` filter); route.
- `backend/tests/food/test_recent.py` (new) -- every backend row.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/food/` -- `api.ts` (`useRecentFoods`, key `["food-recent"]`; `useAddFoodEntry` also invalidates it), `recent-panel.tsx` (new), `add-food-sheet.tsx` (enable tab; initial tab rule; pass grams/Meal into `amount-picker.tsx`), `amount-picker.tsx` (accept initial grams).

## Tasks & Acceptance

**Execution:**
- [x] backend recent query, schema, route, tests -- FR14.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend tab, panel, initial-tab rule, prefill -- Vitest for empty state, list, tap prefill (row Meal vs last Meal), 3-tap path.

**Acceptance Criteria:**
- Given a user who logged 150 g Havremel in Lunsj, when they press "+ Legg til" on Lunsj, tap Havremel and press "Lagre", then a second 150 g Havremel entry is in Lunsj (3 taps).
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- Repository `list_recent_items()` ranks the user's entries per `food_item_id` with `row_number()` over `date desc, created_at desc, id desc`, keeps rank 1, filters `_visible_to(user_id)` after ranking (an invisible item is skipped and the next one fills the 10), and orders by the same keys. `RecentFoodResponse` extends `FoodItemResponse` with `last_grams` and `last_meal`.
- The sheet loads `useRecentFoods()` with the Mat page, so the first tab is known when it opens. Until the user picks a tab, the tab is "Nylig brukt" when the list is non-empty, else Søk; typing in Søk settles the tab so a late list never switches away. On open the first recent row gets focus (Søk field otherwise).
- `FoodDay` passes `mealFromRow` (true for "+ Legg til", false for "Logg mat"); a recent item's Meal is the row's Meal when true, else its `last_meal`. `AmountPicker` takes `initialGrams` (default 100, shown with `formatGrams`). Back button reads "Tilbake til nylig brukt".
- `useAddFoodEntry` also invalidates `["food-recent"]`.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC, VG | Late recent list switches the tab after the user focused Søk; focus lost; untested | medium | Only typing settles `chosenMethod`; search input unmounts | patch |
| EC, BH | Cached items hidden on refetch error; no retry; no focus target in empty/error states | low | Error branch checked before data; no "Prøv igjen" | patch |
| BH | Same-time entries make the 10-item test flaky; limit-after-filter untested | medium | Fixed clock → `created_at` ties → UUID order | patch |
| VG | Reopen does not test the initial-tab rule | medium | Only reopen test uses an empty list | patch |
| BH | 1 000 g prefill untested | low | `parseGrams` strips spaces (3.1), but no test pins the one-tap path | patch |
| BH | Regenerated API files missing | false | Excluded from the review diff on purpose; present in the working tree | rejected |
| BH | Status differs | false | Step 5 syncs status | rejected |
| BH | Ordering by entry date, not logging time | low | Frozen intent pins date then created_at | rejected |
| BH | Edits/deletes (3.6) must invalidate the recent list | low | Not this story's write path | defer |
| BH | No index for the recent query | low | Small per-user histories | rejected |
| EC | Dead disabled-tab branch | low | Kept for the camera option in 3.8 | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
