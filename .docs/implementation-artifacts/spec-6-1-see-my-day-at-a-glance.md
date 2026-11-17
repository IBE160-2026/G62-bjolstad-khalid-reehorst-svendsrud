---
title: 'Story 6.1 + 6.2: See my day at a glance, with clear prompts when nothing is logged'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '6fe76da95c13b3d2cbca4ce08ebe34b777bb07a3'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/EXPERIENCE.md'
  - '{project-root}/.docs/implementation-artifacts/spec-5-4-finish-edit-or-delete-a-workout.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The I dag page is a placeholder, so the user cannot see how the day is going in one place.

**Approach:** Add the read-only `overview` module: `GET /api/overview?date=` composes, through the owning services only (AD-5), the stored Calorie Target, kcal eaten, kcal remaining, the day's Meals with entries and totals, and the day's workouts with done sets. The I dag page shows the day note, a Mat card and a Trening card, with "Logg mat" and "Start økt" as the only primary actions. Story 6.2 (empty-state prompts) is built in the same change because it is copy on the same cards. Every food and workout change refreshes the overview (AD-15).

## Boundaries & Constraints

**Always:** `overview` calls `profile`, `food` and `workouts` services, never their repositories. `GET /api/overview?date=YYYY-MM-DD` (`ConsentedUser`; date required; a future date beyond today + 1 day → 422; read-only) → `{date, calorie_target, kcal_eaten, kcal_remaining, meals, workouts}`: target = the stored profile target (current target for every date, AD-17); eaten = food's day sum; remaining = target − eaten (may be negative); meals = food's day response (four meals with entries and totals); workouts = that date's workouts (finished or not) that have at least one done set, each with only its exercises that have done sets, done sets only, and "last time" (5.3). Training adds no kcal. kcal shown as whole numbers (round half up) with a space thousands separator ("1 640"). Frontend: I dag (`/`) reads `?dato=YYYY-MM-DD` (default today, Europe/Oslo); heading "I dag" for today, else the weekday and date ("mandag 16. november"). Day note: one large number and one sentence — "{rest} kcal igjen av dagens mål på {mål}"; over target: large "{n} kcal over" in normal ink plus "Du er {n} kcal over målet i dag. Det går fint, i morgen er en ny dag." (never red, no warning icon). Mat card: header link "Mat" to `/mat`; each meal with total, its entries (name, grams, kcal) and "+ Legg til" when empty. Trening card: header link "Trening" to `/trening`; each workout's exercises with sets ("3 × 10 · 10 kg" when all sets match, else listed) and the exercise's "Sist: …" line; each workout links to `/trening/okt/{id}`. Exactly two primary actions under the note: "Logg mat" (→ `/mat`) and "Start økt" (→ `/trening`; "Fortsett økt" when one is in progress). 6.2 empty states: no food today → Mat card "Logg ditt første måltid" (the note then shows the full target as remaining); no workout → Trening card "Start en økt"; an earlier date with neither → "Ingenting logget denne dagen." above the cards, and the actions still work. No profile yet → note says "Fyll inn profilen for å få dagens mål." with a link to `/profiloppsett`. Loading: skeleton; error: message + "Prøv igjen". AD-15: every food entry and workout/set mutation invalidates `["overview", date]` for its date. Replace the "Backend: ok" placeholder.

**Never:** No week strip or date picker (6.3), no charts, no kcal from training, no editing on I dag.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Sums | target 1640, entries 900 + 520 kcal | eaten 1420, remaining 220; "220 kcal igjen av dagens mål på 1 640" | N/A |
| Over | eaten 1760 | remaining −120; "120 kcal over" + supportive sentence | N/A |
| Workouts | one with done sets, one empty | only the first shown; only done sets | N/A |
| Empty today | nothing logged | full target remaining; "Logg ditt første måltid"; "Start en økt" | N/A |
| Earlier empty | `?dato=` yesterday, nothing | "Ingenting logget denne dagen." | Future date → 422 |
| No profile | consented user without profile | target null; profile prompt | N/A |
| Refresh | log food on Mat, return | new numbers without reload | N/A |
| Isolation | B's data | never in A's overview | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/overview/` (new) -- schemas, service (pure `compose_day` with unit tests), router; `food.service.get_day`/`day_kcal`, `profile.service.get_profile`, a new `workouts.service.day_workouts(db, user_id, date)`.
- `backend/app/main.py`; `backend/tests/overview/` (new) -- sums, over, workouts filter, empty, no profile, isolation, future date.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/overview/` (new) -- `api.ts`, `day-note.tsx`, `food-card.tsx`, `training-card.tsx`, `today-page.tsx`; `frontend/src/app/page.tsx`; invalidation in `food/api.ts` and `workouts/api.ts`.

## Tasks & Acceptance

**Execution:**
- [x] backend overview module and tests -- FR26, FR28, NFR8, AD-5.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend I dag page, cards, empty states, invalidation -- Vitest.

**Acceptance Criteria:**
- Given a user with target 1 640 who logged 1 420 kcal and a workout with 3 done sets of Armhevinger, when they open I dag, then the note says "220 kcal igjen av dagens mål på 1 640", the Mat card lists the meals and the Trening card shows "Armhevinger 3 × 10"; a new user sees "Logg ditt første måltid" and "Start en økt".
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `profile.service.find_profile` (None before setup) was added so overview does not catch a 404; `get_profile` uses it. `workouts.service.day_workouts` returns all of the date's workouts (oldest created first, via `repository.list_for_date`); the pure `overview.service.compose_day` does the done-set filter and the sums (eaten = food's `get_day` total, so food is read once). Future = after today in Europe/Oslo (`ZoneInfo`) → 422 `date_in_future`. kcal stay unrounded in the API; the UI rounds half up.
- **Frontend:** `TodayPage` (in `<Suspense>` for `useSearchParams`) reuses `useOsloToday` (now exported from `food-day.tsx`); a malformed or future `?dato=` falls back to today. Add links ("Logg ditt første måltid i dag", "+ Legg til", "Start en økt") show only for today, since Mat and Trening log to today; earlier dates get "målet"/"denne dagen" wording in the note. Sets: "3 × 10 · 10 kg" when all match, else listed like "Sist" ("10 kg × 10, 8 kg × 8"). Invalidation: food entry add/edit/delete/restore → `["overview", date]`; workout writes and finish → `["overview", workout.date]`; workout delete (date unknown) and profile save → `["overview"]`. The health-status placeholder and its test are removed.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Day note copy says "dagens"/"i dag" on earlier dates | medium | No date awareness | patch |
| BH | Add links on earlier dates log to today | medium | Mat/Trening work on today only | patch |
| BH | Future `?dato=` gives an endless retry; UTC instead of Oslo date | low | UTC + 1 day slack | patch |
| BH | Rounding is half away from zero, not half up | low | Test asserts the wrong rule | patch |
| BH | Repeated profile link text, capitalised meal in aria-label, duplicate "Økt" links, silent loading | low | Copy and accessibility | patch |
| BH | Empty set summary; cross-user test on the same date | low | Test and fallback gaps | patch |
| BH | Invalidation tests for every mutation path | low | One path tested; invalidation shared | rejected |
| BH | `find_profile` returns the ORM model across modules | low | Service call per AD-5; small module | rejected |
| BH | Story 1.1 check for "Backend: ok" | false | Only in the old story 1.1 spec; README updated in #41 | rejected |
| BH | Per-workout "last time" lookups | low | Few workouts per day | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
