---
title: 'Story 3.6: Edit or delete a food entry'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '76f71eea716b417d969c435a4a68ead64fed4f09'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-3-5-choose-servings-instead-of-grams.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A wrongly logged food cannot be fixed or removed, so the day's numbers stay wrong.

**Approach:** Tapping an entry on the Mat page opens the amount picker in edit mode (grams/servings and Meal prefilled) with "Lagre endringene" and "Slett". Edits change grams or Meal only, never the kcal snapshot (AD-6). Delete is immediate: the entry disappears and an "Angre" toast shows for 5 seconds; "Angre" restores the same entry. To make undo exact, delete is a soft delete on the entry; soft-deleted entries are hidden everywhere and removed for good by `purge`.

## Boundaries & Constraints

**Always:** `PATCH /api/food/entries/{id}` (`update_food_entry`; body `grams?`, `meal?`, same validation as create) → 200 entry; `DELETE /api/food/entries/{id}` (`delete_food_entry`) → 204, sets `food_log_entries.deleted_at = now`; `POST /api/food/entries/{id}/restore` (`restore_food_entry`) → 200, clears `deleted_at` only if it was deleted within the last 10 minutes, else 404. All with `ConsentedUser`; another user's or a missing entry → 404 `food_entry_not_found` with no data (FR3). New nullable column `deleted_at` (migration `0011`, `down_revision='0010'`); every entry read (day, sums, recent foods) excludes soft-deleted entries; `purge` also hard-deletes entries soft-deleted more than 1 day ago and reports them ("Purged N accounts and M deleted entries."). Entry `date` cannot be edited. UI: each entry row is a button (name, grams, kcal) ≥ 44 px opening the sheet in edit mode titled "Endre"; "Slett" is a secondary destructive-text button (no confirm, per UX: immediate with undo); after save or delete the sheet closes and day totals, Meal totals and recent foods refresh without reload (NFR9). Toast: "{Navn} er slettet." + "Angre", in a `role="status"` `aria-live="polite"` region at the bottom above the tab bar, never over the primary "Logg mat" button; disappears after 5 s or on Angre; a second delete replaces it; Angre restores and refreshes. Edit in servings mode works like 3.5 (grams sent).

**Never:** No confirmation dialog for single entries. No changing the food item or date of an entry. No snapshot changes. No undo after the toast is gone.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edit grams | 150 g of 63 kcal/100 g → 200 g | entry 126 kcal; Meal and day totals +31.5; snapshot unchanged | N/A |
| Edit Meal | Lunsj → Middag | moves to Middag; totals move | N/A |
| Bad grams | 0 or 5000.1 | 422 field error | Nothing changed |
| Delete | entry | 204; gone from day, sums and recent foods | N/A |
| Undo | restore within 10 min | entry back with same id, grams, Meal, snapshot | After 10 min or never deleted → 404 |
| Other user | PATCH/DELETE/restore A's entry as B | 404 `food_entry_not_found`, A's entry unchanged | N/A |
| Purge | entry soft-deleted 2 days ago / 1 hour ago | old one removed, recent one kept | N/A |
| Toast | delete in UI | "Havremel er slettet." + Angre for 5 s; Angre brings it back | Restore fails → alert message |

</frozen-after-approval>

## Code Map

- `backend/app/modules/food/{models,schemas,repository,service,router}.py` -- `deleted_at`; `FoodEntryUpdate`; update/delete/restore; add `deleted_at IS NULL` to every entry query (day, sums, recent); reuse grams validation and `Now`.
- `backend/app/cli.py`, identity/food purge service -- extra purge of old soft-deleted entries.
- `backend/migrations/versions/0011_food_entry_soft_delete.py`; `tests/test_health.py` expects `0011`.
- `backend/tests/food/test_edit_delete.py` (new), `tests/test_cli_purge.py` -- every backend row.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/food/` -- `api.ts` (`useUpdateFoodEntry`, `useDeleteFoodEntry`, `useRestoreFoodEntry`; invalidate `["food-day", date]` and `["food-recent"]`), `food-day.tsx` (entry rows as buttons; toast), `add-food-sheet.tsx` + `amount-picker.tsx` (edit mode: title, prefill, "Lagre endringene", "Slett"), `undo-toast.tsx` (new).

## Tasks & Acceptance

**Execution:**
- [x] backend soft delete, update, restore, purge, migration, tests -- FR15, FR4, FR3, AD-6.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend edit mode, delete, toast -- Vitest for edit totals, delete + toast + Angre, 5 s timeout, aria-live.

**Acceptance Criteria:**
- Given a 150 g Helmelk entry in Lunsj, when the user taps it, changes to 200 g and saves, then Lunsj and the day total rise by 31.5 kcal (shown rounded) without reload; when they delete it and press "Angre" within 5 s, it is back unchanged.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Entry response gained `source` and `serving_size_g`** (from the item) so "Endre" can offer servings (3.5) and show the OFF attribution; the edit preview uses the entry's `kcal_per_100g_snapshot`, never the item's current value (AD-6).
- **Backend:** `FoodEntryUpdate` (`grams?`, `meal?`; null or missing = unchanged; extra keys such as `date`/`food_item_id` are ignored). Live entry reads lock the row (`FOR UPDATE`). Restore window `RESTORE_WINDOW = 10 min` (strictly within; exactly 10 min → 404); purge cutoff `ENTRY_PURGE_AFTER = 1 day`. A soft-deleted entry gives 404 on PATCH/DELETE. Recent foods fall back to the latest *live* entry of an item.
- **Frontend:** `callNoContent` added beside `call` in `identity/api.ts` for the 204 delete. Entry rows are buttons with `aria-label="Endre {navn}, {g} g, {kcal} kcal"`. After save focus returns to the row (wherever it moved); after delete to "+ Legg til" in the entry's Meal. A failed "Angre" shows a `role="alert"` with "Vi fikk ikke hentet tilbake {Navn}. Legg den til på nytt med Logg mat." and a "Lukk" button.

## Spec Change Log

- 2026-11-16: `FoodEntryResponse` gained `source` and `serving_size_g` (needed for edit in servings and OFF attribution); update/delete/restore lock the entry row (`FOR UPDATE`). Intent unchanged.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | Closing the sheet during a pending delete loses the toast and Angre | medium | Per-call `onSuccess` does not run after unmount; close controls stay enabled | patch |
| BH | Toast and sheet close wait for a full day refetch | low | `onSuccess` returns the awaited invalidation | patch |
| BH, EC | 5 s timer ignores hover/focus and runs while the toast is inert behind a sheet | medium | Fixed `setTimeout` (WCAG 2.2.1) | patch |
| BH, EC | Focus lost after Angre or on expiry; restore not announced; no pending state | medium | Toast unmounts at once; no status message | patch |
| BH | "Slett" class built by string replace | low | Silently breaks if the shared class changes | patch |
| VG | `callNoContent` error branch untested | medium | A refused delete could show "slettet" with no failing test | patch |
| BH | Regenerated API files missing | false | Excluded from the review diff on purpose | rejected |
| BH | Empty PATCH returns 200 with no change | low | Harmless; UI always sends values | rejected |
| BH | No index for `deleted_at` | low | Small tables | rejected |
| BH, VG | Purge cutoff inclusive vs "more than" | low | Differs only at the exact instant | rejected |
| BH | Spec does not log the response change | false | Recorded in the Spec Change Log now | rejected |
| BH | Edit mode blanks macros/barcode | low | The picker shows neither | rejected |
| EC | Restore race with another delete or date change | low | Rare; error message still shown | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
