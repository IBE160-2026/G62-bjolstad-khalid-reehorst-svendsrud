---
title: 'Story 3.2: Register my own food'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: 'f8cc8a038691cfee6eff4272aee21b901f0f2eac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-3-1-search-for-a-basic-food-and-log-it.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** When a food is not in the database, the user cannot log it at all.

**Approach:** Enable the "Manuelt" tab and add a "Registrer selv" link to the search's "Ingen treff" message. Both open a form for name and kcal per 100 g (required) and protein, carbs, fat and serving size (optional). Saving creates the user's own food item (`source="user"`, `owner_id` = the user) and opens the amount picker for it, so it can be logged right away. Other users never see it.

## Boundaries & Constraints

**Always:** `POST /api/food/items` (`ConsentedUser`, `operation_id="create_food_item"`) → 201 with the item; the server sets `source` and `owner_id` (never from the client). New nullable column `food_items.serving_size_g` (migration `0009`, `down_revision='0008'`). Validation with Norwegian field messages starting with the fix: name trimmed, 1–200 chars ("Skriv navnet på matvaren."); kcal per 100 g 0–900 ("Kalorier per 100 g må være mellom 0 og 900."); protein, carbs, fat each 0–100 g and together ≤ 100 g ("Protein, karbohydrater og fett kan til sammen ikke være mer enn 100 g."); serving size 1–2 000 g; one decimal; decimal comma accepted in the form. The search link text: "Registrer selv". Opening the form from "Ingen treff" prefills the name with the search text. After save: the sheet shows the amount picker for the new item with the same Meal; search already includes the user's own items (3.1). Form uses the 3.1 sheet, field styles, focus-first-invalid and the backend `fields` envelope.

**Never:** No editing or deleting own items (later). No barcode field (story 3.3). No sharing items between users. No servings in the amount picker yet (story 3.5).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | "Mormors lefse", 320 kcal | 201, `source=user`, `owner_id`=user; amount picker opens | N/A |
| Optional values | protein 8, carbs 50, fat 10, serving 60 | stored | N/A |
| Bad values | empty name, kcal 901, protein+carbs+fat 120 | 422 with one field error each | Nothing stored |
| Client sends owner/source | `owner_id`/`source` in body | ignored | N/A |
| Own search | creator searches "lefse" | item found | N/A |
| Isolation | user B searches or logs A's item | not in results; logging gives 404 `food_item_not_found` | N/A |
| From no match | "xyzq" → "Registrer selv" | form opens with name "xyzq" | N/A |
| No consent | POST | 403 `consent_required` | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/food/{models,schemas,repository,service,router}.py` -- add `serving_size_g`; `FoodItemCreate` schema; `create_own_item`; route. Reuse `ConsentedUser`, field-error mapping, existing search visibility rule and `food_item_not_found`.
- `backend/migrations/versions/0009_food_serving_size.py` (new); `tests/test_health.py` expects `0009`.
- `backend/tests/food/test_own_items.py` (new) -- every backend row.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/food/` -- `own-food-form.tsx` (new), `api.ts` (`useCreateFoodItem`), `add-food-sheet.tsx` (enable Manuelt tab; "Registrer selv" link; route to the amount picker after create), `meals.ts` validation helpers if shared.

## Tasks & Acceptance

**Execution:**
- [x] backend food files, `0009_food_serving_size.py`, tests -- FR12, FR3, AD-4.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend form, tab, link, flow -- Vitest for validation, prefill from search, create → amount picker → save.

**Acceptance Criteria:**
- Given the running stack, when a user searches "xyzq", presses "Registrer selv", saves "Mormors lefse" at 320 kcal and logs 80 g in Middag, then Middag shows 256 kcal; another user searching "lefse" never gets "Mormors lefse" (shared items such as Matvaretabellen's potetlefse may still appear).
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- The macro-sum error is reported on `fat_g` (a `field_validator` with `validate_default`, so it also runs when fat is left out); the form shows it under Fett. Protein/carbs that fail their own range check are left out of the sum.
- Extra keys (`owner_id`, `source`) are ignored by pydantic's default; the service always sets `source="user"` and the current user.
- Own-food validation helpers live in `meals.ts` (`validateOwnFood`); the form is `own-food-form.tsx`. "Registrer selv" sits under "Prøv et annet ord." in the no-match status.
- After create, the sheet sets the search query to the new name and shows the amount picker, so "Tilbake til søket" shows the new item; `useCreateFoodItem` invalidates `["food-search"]`.
- Acceptance check on the running stack: user B searching "lefse" does not see A's item, but does see the shared Matvaretabellen item "Potetlompe, potetlefse, kjøpt", so "finds nothing" holds only for A's item.

## Spec Change Log

- 2026-11-16: AC reworded after implementation — the seed contains "Potetlompe, potetlefse, kjøpt", so "finds nothing" was wrong; the intent (other users never see A's own item) is unchanged.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | "2.000" read as 2; ",5" and "5," rejected | medium | `parseNumberField` turns the dot into a decimal point; regex needs digits on both sides | patch |
| BH | Editing protein/carbs clears a real fat range error | low | `handleChange` deletes `fat_g` unconditionally | patch |
| EC | Double submit can create duplicate items | low | `isPending` not yet re-rendered on a second submit in the same tick | patch |
| EC | Re-clicking the selected Manuelt tab resets the prefill | low | `onSelect` does not return early | patch |
| VG, BH | Post-create "Tilbake til søket" and non-field error untested | medium | No test clicks it or asserts the alert | patch |
| BH | Isolation test cannot catch over-filtering | low | Empty DB; a shared "lefse" item proves shared items stay visible | patch |
| BH | Regenerated API files missing; `meals.ts` import unclear | false | Excluded from the review diff on purpose; build and typecheck pass | rejected |
| BH | Missing required fields get the generic backend text | low | Frontend validates first with specific messages | rejected |
| BH, EC | Name length counted in UTF-16 vs code points | low | Only for emoji-heavy names near 200 chars | rejected |
| BH | Validation limits duplicated as literals | low | Mirrors backend; covered by tests on both sides | rejected |
| BH | Redundant tail in `validateOwnFood` | low | Cosmetic | rejected |
| BH | Macro-sum decimal boundary untested | low | Tolerance exists; rare input | rejected |
| BH, EC | Form values lost when switching tabs | low | Rare; form is short | rejected |
| BH, EC | Tablist lacks arrow-key pattern | low | Two tabs, each reachable with Tab | rejected |
| BH | No duplicate guard, rate limit or DB CHECKs | low | Private items; validated write path only | rejected |
| EC | Esc while create is pending | low | Item is saved and appears in search | rejected |
| EC | Short created name gives no results after going back | low | Names under 2 chars are rare | rejected |
| EC | Prefill uses typed text, not the debounced query | low | Differs only while typing fast | rejected |
| EC | NUL in name, booleans coerced to numbers | low | Hand-crafted requests only | rejected |
| BH | Status differs; triage log empty | false | Written at close; step 5 syncs status | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
