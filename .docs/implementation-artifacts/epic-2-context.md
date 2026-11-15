# Epic 2 Context: Profile and calorie target

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A consented user enters their body data, activity level and goal and gets one daily calorie target ("dagens mål"), explained in plain Norwegian without formula jargon, after a short first-run introduction. The target is computed once by the backend `profile` module and stored on the profile, so the Daily Overview (Epic 6) and every later date read the same number. This is the first health-data feature, so it is the first real user of `require_consent` from Epic 1.

## Stories

- Story 2.1: Get my calorie target (next)
- Story 2.2: Edit my profile
- Story 2.3: First-run introduction

## Requirements & Constraints

- **Profile fields (all required):** weight (kg), height (cm), age (years), sex (male/female), Activity Level, Goal. Valid ranges: weight 30–300 kg, height 100–250 cm, age 16–100. Out-of-range values are rejected with an inline Norwegian message starting with the fix, e.g. "Vekt må være mellom 30 og 300 kg." Sex is required in v1 and shown with a short explanation that the formula needs it.
- **Formula (exact):**
  - Base = 10 × weight + 6.25 × height − 5 × age, then **+5 for male**, **−161 for female**.
  - Activity factors: Sedentary 1.2, Light 1.375, Moderate 1.55, Very active 1.725, Extremely active 1.9.
  - Goal adjustment: Lose −500, Maintain 0, Gain +300.
  - Target = base × factor + goal adjustment, **rounded to the nearest whole kcal**, then raised to the floor if below it: **1 200 (female) / 1 500 (male)**. The floor is applied after the goal adjustment and sets a floor flag.
- **Expected results (unit tests must match exactly, no tolerance):**

  | Profile | Sex | Weight | Height | Age | Activity | Goal | Target |
  |---|---|---|---|---|---|---|---|
  | 1 | M | 80 | 180 | 25 | Moderate | Maintain / Lose / Gain | 2798 / 2298 / 3098 (base 1805) |
  | 2 | F | 65 | 165 | 30 | Light | Maintain | 1884 (base 1370.25) |
  | 3 | M | 95 | 178 | 50 | Sedentary | Maintain | 2181 (base 1817.5) |
  | 4 | F | 55 | 160 | 22 | Very active | Maintain | 2206 (base 1279) |
  | Floor | F | 45 | 150 | 60 | Sedentary | Lose | 1200, floor flag set (formula gives 612) |
  | Sara (UX example) | F | 82 | 162 | 23 | Light | Lose | 1640 (base 1556.5) |

- **Explanation rules:** the result shows one number ("1 640 kcal om dagen") plus one or two plain sentences. The words BMR, TDEE and Mifflin never appear on the profile result or the Daily Overview; say "dagens mål". If the floor was used, add a line saying the target is set to at least the safe minimum (UX copy: "Målet er satt til minst 1 200 kcal for å være trygt.", using 1 500 for male). Ages 16–17 get "Dette er et grovt anslag. Formelen er laget for voksne." on Profiloppsett and the day note.
- **Recalculation:** any profile change recomputes and stores the target at once; the new number shows without a page reload.
- **Isolation:** a user can only read/change their own profile; a backend test proves another user's profile returns no data.
- **Intro (2.3):** shown once to a first-time user after consent; dismissal (either button) is stored **on the user in the backend**, not only in the browser, so it never reappears on any device.
- **Tests:** the calorie calculation is a required automated test area; tests never call real external services.
- **Open item:** the 1 200 / 1 500 floor was accepted by the group but still lacks a cited source; no source is given in the planning docs.

## Technical Decisions

- **Ownership:** new backend module `profile` (router → service → repository, `models.py`, `schemas.py`, paths `/api/profile/...`) and frontend mirror `frontend/src/modules/profile/`. It must not import another module's repository or models.
- **Pure function (AD-5):** the calorie target is a function with no I/O in the `profile` service, unit-tested with the table above. Only the `profile` module computes it; `overview` (Epic 6) reads it through the `profile` service and never recomputes. The frontend never computes or decides the target; it shows what the API returns.
- **Stored, not historical (AD-17):** on every profile save the service computes the target (whole kcal) and a floor flag and stores both on the profile row. Every date, including past dates, uses the current stored target; no target history in v1.
- **Data model:** User 1:1 Profile; profile table has `user_id` (never accepted from the client; repository filters by current user). Schema via Alembic only. UUIDv4 ids, UTC timestamps, `snake_case` JSON. Intro dismissal is a field on the user (the planning docs do not name it).
- **Guards:** every profile endpoint depends on `require_consent` (which builds on `CurrentUser`); mutating requests pass the existing Origin check. Validation errors use the existing envelope with per-field details so the frontend can show inline messages; branch only on `code`.
- **API types:** regenerate the committed OpenAPI client types after adding endpoints; server data through TanStack Query; invalidate the profile query (and later the overview query) after saving.
- **Training adds no kcal to the target**; the activity level already covers it.

## UX & Interaction Patterns

- **Flow:** register → `/samtykke` → Kom i gang (intro, first time only) → Profiloppsett → "Til I dag" → I dag. A consented user without a profile should land on Profiloppsett. Profil (sidebar/tab) is where the profile is later edited, alongside existing items such as log out and delete account.
- **Profiloppsett:** labelled 48 px inputs for weight, height, age; sex choice with its short explanation; Activity Level as five choices, each with an everyday example (given example: "Moderat: trener 3–5 dager i uka"; write the rest in the same style); Goal choice (e.g. "Gå ned i vekt"). Focus moves to the first invalid field; Enter submits; one primary plum button.
- **Result:** one large number "N kcal om dagen", one or two warm sentences, plus the floor and/or 16–17 lines when relevant, then "Til I dag".
- **Intro (Kom i gang):** three short steps (profil → logg → tren) with "Hopp over" and "Sett opp profilen"; focus moves into it, Esc closes it, focus returns afterwards.
- **Voice and tokens:** follow `frontend/VOICE.md` (warm, short, "du"-form, verbs on buttons, no jargon or shaming); tokens only, plum accent as the sole action colour, `error` red only for validation. Page titles "<side> · Prompt Force". Numbers use a space as thousands separator ("1 640").

## Cross-Story Dependencies

- Builds on Epic 1: `require_consent`, `CurrentUser`, `Now`, error envelope with field errors, Origin check, `SessionGuard`/proxy routing (extend it so consented users without a profile, or who have not dismissed the intro, are routed correctly), design tokens and VOICE.md.
- 2.1 creates the `profile` module, table and calorie function; 2.2 reuses the same validation and calculation for editing on Profil.
- 2.3 sits between consent and Profiloppsett; its "Sett opp profilen" button leads to 2.1's screen.
- Epic 6's day note and overview read the stored target and floor flag via the `profile` service and show the floor and 16–17 lines; account deletion (1.6) must cover the profile row.
