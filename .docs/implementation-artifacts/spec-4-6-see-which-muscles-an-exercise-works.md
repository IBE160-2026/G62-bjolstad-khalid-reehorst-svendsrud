---
title: 'Story 4.6: See which muscles an exercise works (Should)'
type: 'feature'
created: '2026-11-23'
status: 'done'
baseline_commit: '18889d6918fa8fd5a892e4ddc877ee48d33cd1fd'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-4-context.md'
  - '{project-root}/frontend/src/styles/CONTRAST.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The exercise page lists the muscles only as text ("Hovedmuskel: bryst · Hjelper til: skuldre, armer"), which a beginner has to read and translate into a body.

**Approach:** Add a simple body figure (front and back, side by side) to the "Muskler som jobber" section of the exercise page, with the primary muscle group in a strong colour and the secondary groups in a lighter one, plus a two-item legend. The text line stays. This is a trial: the group decides in the PR whether it stays.

## Boundaries & Constraints

**Always:** Frontend only; the API already returns `primary_muscle_group` and `secondary_muscle_groups` with the six values `bryst`, `rygg`, `skuldre`, `armer`, `ben`, `mage-kjerne`. One inline SVG component (no image files, no external assets or libraries, no copied anatomy art), drawn in code as simple rounded shapes. Region mapping: front view — `bryst` (chest), `skuldre` (front delts), `armer` (upper and lower arms), `mage-kjerne` (abdomen), `ben` (thighs and shins); back view — `rygg` (upper and lower back), `skuldre` (rear delts), `armer` (upper and lower arms), `ben` (glutes, hamstrings, calves). A group shown in both views is coloured in both. Unused regions use a neutral body fill. Colours come from two new tokens `--muscle-primary` and `--muscle-secondary` in `tokens.css` for light and dark, each at least 3:1 against `--card` and against the neutral body fill, with rows added to `CONTRAST.md`. The figure is decorative for screen readers (`aria-hidden`), since the text line says the same; it is not clickable or focusable; labels "Forfra" and "Bakfra" under each view. Legend: a swatch + "Hovedmuskel" and a swatch + "Hjelper til" (the second only when there are secondary groups). Fits 360 px wide with no horizontal scroll.

**Decision (Osman, 2026-11-23): red.** `--muscle-primary` is a strong red and `--muscle-secondary` a light red, as in `epics.md` 4.6; both distinct from `--destructive` so a muscle never reads as an error state.

**Never:** No change to the backend, data or the muscle text. No finer muscles than the six groups (e.g. no separate biceps/triceps). No animation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Push-up | primary `bryst`, secondary `skuldre`, `armer` | chest strong; shoulders and arms light (front and back) | N/A |
| Squat | primary `ben`, secondary `mage-kjerne` | legs strong in both views; abdomen light on front | N/A |
| No secondary | e.g. primary `rygg`, `[]` | back strong; legend shows only "Hovedmuskel" | N/A |
| Dark mode | `data-theme="dark"` | dark token values, still ≥ 3:1 | N/A |
| Unknown group | value outside the six | ignored by the figure; text line still shows it | no crash |

</frozen-after-approval>

## Code Map

- `frontend/src/modules/exercises/exercise-detail.tsx:85-90` -- the "Muskler som jobber" section; add the figure and legend under the heading, keep `musclesText`.
- `frontend/src/modules/exercises/muscle-figure.tsx` (new) + `muscle-figure.test.tsx` (new) -- the SVG component; test which regions get which fill class for the matrix rows.
- `frontend/src/styles/tokens.css` -- add `--muscle-primary`, `--muscle-secondary`, and a neutral `--muscle-base` if no existing token fits, in `:root` and `[data-theme="dark"]`, and map them under `@theme` like `--color-mark`.
- `frontend/src/styles/CONTRAST.md` -- add the new non-text rows for light and dark.
- `frontend/src/modules/exercises/exercises.test.tsx` -- check the figure renders on the detail page.
- `frontend/e2e/core-loop.spec.ts` -- the existing 360 px no-scroll test should cover an exercise page; extend it if it does not.

## Tasks & Acceptance

**Execution:**
- [x] tokens + CONTRAST.md rows.
- [x] `muscle-figure.tsx` with region mapping, legend, Vitest for the matrix.
- [x] wire into `exercise-detail.tsx`; detail test; 360 px check.

**Acceptance Criteria:**
- Given Armhevinger in light and dark mode, when its page opens, then the chest is strong and shoulders and arms light, with "Forfra"/"Bakfra" labels and the legend, and the text line is unchanged.
- Given the change, when `npm run test -- --run`, `npm run lint`, `npm run build` and `npm run test:e2e` run, then all pass.

## Implementation Notes

- The detail endpoint returns muscle group **names** ("Bryst", "Mage/kjerne"), not the slugs the Boundaries list. `toMuscleSlug` in `muscle-figure.tsx` accepts either (via `MUSCLE_GROUPS`), so no backend change was needed; anything else is ignored by the figure.
- Tokens: light `--muscle-primary` #8E1116, `--muscle-secondary` #D4564B, `--muscle-base` #EEE7DA; dark #FF6B6B, #CC5049, #352B32. All ≥ 3:1 against `--card` and `--muscle-base` (rows in CONTRAST.md). The primary has the highest contrast in both modes; the legend's "Hovedmuskel" shows only when the primary maps to one of the six groups.
- The whole block (figure, "Forfra"/"Bakfra", legend) sits in a card inside the "Muskler som jobber" section, above the unchanged text line, and is `aria-hidden`. Shapes get `data-region`/`data-role` for tests. Shoulders and arms are drawn last so the delts sit on top of chest/upper back.
- The 360 px e2e test now also opens Armhevinger and checks the figure is visible with no horizontal scroll.

## Spec Change Log

## Review Triage Log

Lighter process: one reviewer (Edge Case Hunter); Blind Hunter and Verification Gap skipped to save the usage limit.

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| ECH | Dark mode: secondary red (6.78:1) stands out more than primary (3.47:1) | medium | Token values in `tokens.css`; also seen in the dark screenshot | patch |
| ECH | "Hovedmuskel" legend shows when the primary is not one of the six groups | low | Legend is unconditional; direct correction | patch |
| ECH | Unknown-primary test does not assert the legend | low | Same root as above; added with the fix | patch |
| ECH | 360 px e2e opens the exercise assuming the page is still /trening | low | Depends on loop order; one `goto` fixes it | patch |
| ECH | Primary vs secondary differ by only 2.33:1 (light) | low | Spec requires 3:1 against card and base only; the legend and the text line carry the difference | rejected |
| ECH | Other spellings like "Mage / kjerne" are not recognised | false | The API returns the six fixed names from seed data; no other spelling reaches the component | rejected |
| ECH | Dark mode not covered by automated tests | low | Checked manually with screenshots, as the spec's manual checks say; a test would need a rendered colour check | rejected |

## Verification

**Commands:**
- `cd frontend && npm run test -- --run && npm run lint && npm run build && npm run test:e2e` -- expected: all pass

**Manual checks:**
- Screenshot Armhevinger, Knebøy and Planke at 390 px in light and dark mode and look at them.
