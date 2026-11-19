---
title: 'Vertical player for YouTube Shorts'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '702d2fbbec665480e87e807babda495e326fc166'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/spec-4-1-see-an-exercise-and-how-to-do-it.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PR #52 swapped 11 exercise videos to YouTube Shorts (portrait), but the player is a fixed 16:9 box, so Shorts show small with black bars.

**Approach:** Mark each video as a Short or not in the seed data and show Shorts in a 9:16 player; other videos keep 16:9.

## Boundaries & Constraints

**Always:** `exercises.json` gets `"video_short": true` on the 11 Shorts from #52 (#5, 8, 9, 13, 14, 15, 16, 24, 26, 27, 29) and `false` elsewhere; migration `0017` adds `exercises.video_short` (bool, default false); the seed sets it for new exercises and updates it on existing ones together with `video_id` (as #52 does for `video_id`); `GET /api/exercises/{id}` returns `video_short`. Frontend `VideoEmbed` takes `short`: Shorts use a 9:16 box with max height about 70 % of the viewport (`max-h-[70vh]`) and centred, width following the ratio; others keep `aspect-video`. Offline fallback and "Se videoen på YouTube" link work the same for both. A seed integrity test checks the field exists on every exercise. README/`ovelsesliste.md`: one line telling Fernando to set `video_short` when he adds Shorts.

**Never:** No autoplay, no detecting Shorts at runtime, no change to video ids.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Short | Markløft (#13) | 9:16 player, centred, ≤ 70 vh | Offline → same fallback |
| Wide | Armhevinger | 16:9 as before | N/A |
| Existing DB | started before this change | Shorts flagged after restart | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/seed/data/exercises.json`, `backend/app/seed/seed.py`, `backend/app/modules/exercises/{models,schemas,service}.py`, `backend/migrations/versions/0017_exercise_video_short.py`, `tests/test_health.py` (0017), `backend/tests/exercises/`.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/exercises/{video-embed.tsx,exercise-detail.tsx}` + tests.

## Tasks & Acceptance

**Execution:**
- [x] data flag, migration, seed update, API field, tests.
- [x] regenerate API types.
- [x] 9:16 player for Shorts -- Vitest.

**Acceptance Criteria:**
- Given Markløft, when the detail opens, then the video is a centred 9:16 player; Armhevinger stays 16:9.
- Given the change, when backend tests, Vitest, lint (with typecheck), build and Playwright run, then all pass.

## Implementation Notes

- **Player box:** Shorts use `aspect-[9/16] max-h-[70vh] w-full max-w-[calc(70vh*9/16)] self-center`; the `max-w` cap keeps the ratio when the height limit applies. Offline fallback uses the same box. Measured in the running app: 315×560 at 1280×800 and 332×591 at 390×844 (ratio 0.563, 70 vh, centred).
- **Seed:** an existing exercise gets `video_short` updated together with `video_id`; nothing else changes. The running DB went to 11 of 34 flagged after restart.
- **Outside the code map:** `frontend/src/modules/identity/api.ts` `useRegister` passed the mutation variables to `startSession` as `reactivated`. This type error already existed and broke `tsc`/`next build`; it is fixed with `onSuccess: (user) => startSession(user)`.

## Spec Change Log

## Review Triage Log

No separate reviewer subagent (small change; sizes measured in the real app at 1280×800 and 390×844). Orchestrator note: the `useRegister` fix the implementer also made is the same as in PR #59; the file was aligned with #59 to avoid a merge conflict.

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q`
- `cd frontend && npm run test -- --run && npm run lint && npm run build && npm run test:e2e`
