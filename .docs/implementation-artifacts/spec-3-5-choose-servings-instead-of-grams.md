---
title: 'Story 3.5: Choose servings instead of grams'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: 'a744f51334721ccd57ff8ce3ae8e18c2f3f3b3e7'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-3-4-log-a-recent-food-with-one-tap.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** For a packaged product with a known serving size, weighing it in grams is a needless step.

**Approach:** When the chosen item has `serving_size_g`, the amount picker offers a switch between "Gram" and "Porsjoner". In servings mode the user types a number of servings (one decimal, e.g. "1,5"); the preview shows the grams it equals and the kcal; saving sends grams (servings × serving size, rounded to one decimal), so the backend, sums and recent foods are unchanged. Items without a serving size show grams only, as before. Frontend only.

</frozen-after-approval>

## Implementation Notes

- **Frontend only** (`amount-picker.tsx`, `meals.ts`, tests). Unit switch "Mål i: Gram / Porsjoner" shows only when `serving_size_g` is set; grams is the default (recent foods keep their last grams).
- **Servings:** one decimal, 0.1–50 (`SERVINGS_MAX`); leading/trailing comma accepted; grams = servings × size rounded to one decimal using whole tenths (1.5 × 33.3 → 50.0, not 49.9); over 5 000 g → "Det blir mer enn 5 000 g. Velg færre porsjoner."
- **Switching unit keeps the amount** (60 g ↔ 3 servings of 20 g). A pointer click moves focus to the amount field; arrow keys stay in the radio group; the pills have a visible focus ring.
- **Preview** shows "= N g" under the kcal in servings mode; saving sends grams.

## Review Triage Log

| Finding | Verdict | Evidence | Route |
|---|---|---|---|
| Arrow keys leave the unit group (focus jumps to the field) | medium | Focus effect ran on every unit change | patch |
| No visible focus on the unit pills | medium | `sr-only` radios without a focus style | patch |
| Switching unit drops the amount | low | Separate texts never synced | patch |
| `parseServings` comment claims the same rules as grams; dead `grams <= 0` branch | low | Comment wrong; branch unreachable | patch |
| Recent foods never open in servings | low | Opens in grams with the last amount, which is correct; one tap converts | rejected |
| 50-serving cap undocumented; message hard-codes 50 | low | Recorded in these notes | rejected |
| Backend `grams` error shown under the servings field | low | Frontend blocks > 5 000 g first | rejected |
| Serving size with two decimals | false | Backend stores `Numeric(6,1)` | rejected |
| Spec lacks AC/tasks; notes empty | false | One-shot route; notes written here | rejected |
| More UI tests (decimals message, Nylig brukt entry) | low | Parser rules are unit-tested | rejected |

