---
title: 'Story 6.4 (part 1 of 3): Demo data for the examiner'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '9e2ef35522318a7539248a6963ce7a91dfdd3bd2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-6-1-see-my-day-at-a-glance.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A fresh install has no data, so the examiner must log weeks of food and workouts by hand before Historikk-like views, "Sist" and the day overview show anything meaningful.

**Approach:** Story 6.4 is split in three (1: demo data, 2: Playwright suite, 3: help button and sheet focus checks). This part: on `APP_ENV=local`, `seed_if_empty` also creates two fictional demo users with consent, profiles, the default equipment profiles, food logs and finished workouts over the last 14 days before today (Europe/Oslo), plus today's breakfast, and the README lists their logins. Demo users are never created outside `APP_ENV=local` (AD-16).

## Boundaries & Constraints

**Always:** Users `sara@demo.test` / `Demo-passord-1` (female, 29 y, 168 cm, 64 kg, moderate activity, home training: Hjemme + Manualer profile) and `jonas@demo.test` / `Demo-passord-2` (male, 35 y, 182 cm, 84 kg, light activity, gym); created through the identity, profile, exercises, food and workouts services (never other modules' repositories), with `consent_at` and `intro_dismissed_at` set so the examiner lands on I dag. Food: 3–4 entries per day on most of the 14 earlier days, from seeded Matvaretabellen items by name, spread over the four Meals; one day over target for Sara; Sara has today's Frokost. Workouts: Sara 3 per week (Armhevinger, Kroppsvektknebøy, a dumbbell exercise), Jonas 3 per week (Benkpress, Knebøy med stang, Markløft), with reps/kg that rise slightly week to week so "Sist" shows progress; all finished, all sets done. Dates are relative to the Oslo date at seed time. Idempotent: if `sara@demo.test` exists, nothing is added. Runs after the food and exercise seeds; a missing food item is skipped with a log line, never a crash. README "Kom i gang" gets a "Demobrukere" table (e-post, passord, hva de viser) and a note that they exist only locally. Logged: "Seeded demo users (N food entries, M workouts)."

**Never:** No demo users outside `APP_ENV=local`. No real names or real e-mail domains. No data for today's workouts (the examiner starts one).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh local start | empty DB | 2 users, ≥ 30 entries and ≥ 10 finished workouts each over 14 days | N/A |
| Second start | demo users exist | nothing added | N/A |
| Production | `APP_ENV=production` | no demo users | N/A |
| Login | sara@demo.test | I dag shows today's Frokost and the remaining kcal | N/A |
| "Sist" | Sara adds Armhevinger today | "Sist: …" from her latest earlier workout | N/A |
| Missing item | a food name not in the seed | skipped, logged | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/seed/demo.py` (new) -- demo data built through the module services; called from `seed_if_empty` after the reference seeds.
- `backend/tests/test_seed_demo.py` (new) -- counts, idempotency, non-local skip, consent, a "Sist" check through the API, Oslo-relative dates.
- `README.md` -- "Demobrukere".

## Tasks & Acceptance

**Execution:**
- [x] demo seed through services, tests -- NFR4, AD-16.
- [x] README "Demobrukere".

**Acceptance Criteria:**
- Given a fresh `docker compose up --build`, when the examiner logs in as `sara@demo.test`, then I dag shows today's breakfast, Trening lists earlier workouts, and adding Armhevinger shows "Sist: …".
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass.

## Implementation Notes

- `seed_if_empty` commits the reference seeds, then calls `app.seed.demo.seed_demo_users` and commits again. Skipped when `sara@demo.test` exists (new `identity.service.is_registered`); each user is also skipped if its own email exists; an `AppError` (e.g. a soft-deleted demo account holding the email) rolls back the demo part only and is logged.
- Food: 12 of the 14 earlier days (offsets 6 and 13 empty), 3 entries on odd offsets and 4 (with a snack) on even ones; Sara's offset 3 is the over-target day; Sara gets two Frokost entries today. Items are found by exact name through `food.service.search_items`.
- Workouts: offsets 12, 10, 8, 5, 3, 1 (three per week, 6 per user, 12 in total — the matrix's "≥ 10 finished workouts" is read as the total, since "3 per week" over 14 days gives 6 each). Reps/kg rise per workout. Sara's "Hjemme" profile gets Manualer via `exercises.service.update_profile`; goal is "maintain" for both (Sara 2 145 kcal, Jonas 2 485 kcal).

## Spec Change Log

- 2026-11-18: "≥ 10 finished workouts each" conflicted with "3 per week" over 14 days; 6 per user (12 in total) built, following the per-week rule. Osman chose this (option A) on 2026-11-17; the matrix row "≥ 10 finished workouts each" is superseded.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Non-AppError in the demo seed stops the backend starting | medium | Only `AppError` caught; startup runs the seed first | patch |
| BH | Soft-deleted Sara makes every start retry | low | Existence check sees active users only | patch |
| BH | Today's entries can be timestamped after the seed | low | Fixed hour | patch |
| BH | Unused session per demo user | low | `register` always starts one | patch |
| BH | README overstates data; equipment and lifts untested; real clock in API test | low | Docs and test gaps | patch |
| BH | "≥ 10 workouts each" vs "3 per week" in the frozen matrix | medium | Conflict inside the approved intent | rejected — Osman chose option A (3 per week, 6 each) |
| BH | Compose defaults `APP_ENV` to local | false | Compose is the local examiner setup; production refuses unsafe config (AD-16) | rejected |
| BH | Unrelated sprint-status changes and dates | false | Epic 5 closed when #46 merged; date is after midnight | rejected |
| BH | DST-boundary test | low | Covered by Oslo-date helper tests | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `docker compose down -v && docker compose up --build -d`, then log in as sara@demo.test -- expected: data shown
