---
title: 'Story 6.3: Move between days with the week strip (Should)'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'd8bdf96b8c04f239c06f14ab2d6bc03092141db8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/EXPERIENCE.md'
  - '{project-root}/.docs/implementation-artifacts/spec-6-1-see-my-day-at-a-glance.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** I dag reads `?dato=`, but there is no way to move between days, and Mat always logs to today, so earlier days cannot be seen or fixed.

**Approach:** Add a week strip (Monday–Sunday) to I dag, Mat and Trening that switches the page to the chosen date via `?dato=`, with ‹ › for whole weeks, a calendar button for any earlier date, and per-day marks for "mat logget"/"trening logget" from a small week summary endpoint. Mat shows and logs to the chosen date; "Start økt" on Trening starts a workout for the chosen date.

## Boundaries & Constraints

**Always:** Backend: `GET /api/overview/week?start=YYYY-MM-DD` (`ConsentedUser`; `start` must be a Monday, else 422; any day after Oslo today is reported as future) → 7 items `{date, has_food, has_workout, future}` where has_workout means a workout with ≥ 1 done set; composed through the food and workouts services (AD-5), filtered by user (AD-4). Frontend: one shared `WeekStrip` component above the page content on I dag, Mat and Trening; seven day buttons ("ma 16", weekday short + day number), selected day outlined (no fill colour, no magnets), today marked with text "i dag" under it; future days `disabled`; each button's accessible name: "{ukedag} {d}. {måned}, mat logget, trening logget" (only the parts that apply, else "ingenting logget"); ‹ "Forrige uke" and › "Neste uke" (› disabled when the week contains today); a calendar button "Velg dato" opens a native `<input type="date">` with `max` = today; strip is a toolbar where ← → move focus and selection one day (crossing weeks), Home/End go to Monday/Sunday. Selecting a date sets `?dato=` (omitted for today) and keeps it when moving between I dag, Mat and Trening via the strip's links context (nav links keep `?dato=` if present). A future `?dato=` falls back to today with the message "Du kan ikke velge en dag fram i tid." shown once. Mat: reads `?dato=`, shows that date's meals and logs new entries to it (add/edit/delete/undo already take the entry's date); the page heading names the date when it is not today. Trening: "Start økt" starts a workout for the chosen date when no workout is in progress; the 5.1 "one unfinished workout" rule is unchanged. I dag's 6.1 "+ Legg til"/"Start en økt" prompts, previously today-only, now show on earlier dates too and act on that date. The overview and week queries are invalidated by the same mutations as in 6.1 (week key `["overview-week", start]`).

**Never:** No future logging, no month view, no swipe gestures, no changes to Historikk beyond the calendar button target.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pick yesterday | tap Mandag | URL `?dato=…`, I dag shows yesterday only | N/A |
| Log past | Mat on yesterday, log havregryn | entry dated yesterday; today unchanged | N/A |
| Marks | Sara's demo week | days with food/workout named in the label | N/A |
| Keys | → on Sunday | next week's Monday selected (if not future) | Future → stays |
| Future URL | `?dato=` tomorrow | today + message | API `start` not Monday → 422 |
| Start økt | Trening on yesterday, none in progress | workout dated yesterday | One in progress → "Fortsett økt" |

</frozen-after-approval>

## Code Map

- `backend/app/modules/overview/{schemas,service,router}.py` -- week summary; `food`/`workouts` service helpers for date ranges; tests in `backend/tests/overview/`.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/components/week-strip.tsx` (new) + test; `frontend/src/lib/selected-date.ts` (parse `?dato=`, shared by pages); I dag, `food/food-day.tsx`, Trening `suggestions.tsx`/`start-workout.tsx`; nav links keep `?dato=`.

## Tasks & Acceptance

**Execution:**
- [x] backend week summary and tests -- FR27.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend week strip, date on Mat and Trening, keyboard, future handling -- Vitest; extend the Playwright suite with one "pick yesterday, log food, today unchanged" test.

**Acceptance Criteria:**
- Given sara@demo.test, when she taps yesterday in the strip, then I dag shows yesterday's meals and workout; on Mat she logs havregryn to yesterday, and today's numbers are unchanged.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint`, `npm run build` and `npm run test:e2e` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `food.service.dates_with_food` and `workouts.service.dates_with_workouts` (one DISTINCT date query each, filtered by user; deleted entries excluded; done sets only) feed the pure `overview.service.compose_week`. `GET /api/overview/week?start=` returns a plain list of 7 `WeekDayResponse`; a non-Monday is 422 `week_start_not_monday`; a later week is allowed and reported all `future`.
- **Frontend:** `src/lib/selected-date.ts` now owns `DATE_PARAM`, `parseDateParam` (re-exported from `overview/api.ts`), `useOsloToday` (moved from `food-day.tsx`), `mondayOf`/`addDays`/`datedHref` and `useSelectedDate`. `/mat` and `/trening` render inside `<Suspense>`. Nav links to `/`, `/mat`, `/trening` keep `?dato=` via `components/shell/nav-link.tsx`. Arrows ‹ › select the same weekday a week away (› clamps to today). "Velg dato" opens an inline native date field (max today) submitted with "Vis dagen", so typing a date segment by segment does not navigate early. A future `?dato=` shows the message in the strip and is removed with `router.replace`. Trening's "Start økt" shows "Økta lagres på {dato}." on earlier dates. Week invalidation: food entry writes and workout writes/finish → `["overview-week", monday]`; workout delete → `["overview-week"]`.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | `start=9999-12-27` gives 500 | low | Date overflow | patch |
| BH | API `future` flag ignored; browser clock decides | low | Strip uses local date | patch |
| BH | Keys step from the selected date; stale focus ref | low | Pending navigation | patch |
| BH | Accessible names lack visible text and "i dag" | medium | WCAG 2.5.3 | patch |
| BH | Future-date notice not announced | low | Live region created filled | patch |
| BH | Dates from another year have no year | low | Ambiguous labels | patch |
| BH | Nav links copy invalid `?dato=`; "I dag" keeps old date | low | Unvalidated param | patch |
| BH | Chosen date lost after starting a workout | low | Økt route drops `?dato=` | patch |
| BH | Workout isolation and week invalidation untested; Trening with `?dato=` untested | medium | Test gaps | patch |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build && npm run test:e2e` -- expected: pass
