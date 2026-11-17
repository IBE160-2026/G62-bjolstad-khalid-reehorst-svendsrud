---
title: 'Story 4.1: See an exercise and how to do it'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: 'cbab90722fb9240179cd50d72007fb093356206f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-4-context.md'
  - '{project-root}/.docs/planning-artifacts/ovelsesliste.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There are no exercises in the app, so a beginner cannot see what to do or how to do it safely.

**Approach:** Add the `exercises` module with read-only seed data (AD-9): the nine Equipment types, the six Muscle Groups and the 34 exercises from `ovelsesliste.md` (#35–39 wait for issue #8). Fields missing from the list — Exercise Type (reps/time), 0–2 secondary Muscle Groups and a short Norwegian technique description (3 numbered steps) — are written as part of this story and marked in the seed file as a draft for the group to review. The Trening page lists all exercises; each opens a detail page with name, equipment, muscles, level, the steps, a youtube-nocookie video and the safety note.

## Boundaries & Constraints

**Always:** Seed file `backend/app/seed/data/exercises.json` (with a top-level `"review_status": "utkast – gruppen må lese beskrivelser og hjelpemuskler"`), loaded by `seed_if_empty` (local only, skips if exercises exist). Tables: `equipment`, `muscle_groups`, `exercises` (slug, Norwegian name, level `beginner|intermediate|advanced` shown as Nybegynner/Middels/Øvet, type `reps|time`, description steps, `video_id`), `exercise_equipment` (all required), `exercise_muscle_groups` (`role` primary|secondary, exactly one primary, 0–2 secondary). Label mapping: "Kjerne" → Mage/kjerne; "Hele kroppen" and "Rygg / hele kroppen" get one primary from the six (#13 Rygg primary, Ben secondary); "Manualer + benk" etc. become two required Equipment. API read-only: `GET /api/exercises` (list: id, name, level, primary muscle, equipment names) and `GET /api/exercises/{id}` (detail incl. secondary muscles, steps, video id); `CurrentUser`; no POST/PUT/PATCH/DELETE (AD-9). Seed holds 30–50 exercises. Detail page `/trening/ovelser/[id]`: video first via `https://www.youtube-nocookie.com/embed/{id}` in a 16:9 iframe with a title; if it cannot load (iframe error or offline), show "Videoen kan ikke vises nå" and a link "Se videoen på YouTube"; then "Slik gjør du det" (numbered steps), "Muskler som jobber" as text ("Hovedmuskel: Bryst · Hjelper til: Skuldre, Armer"), equipment and level; and the note "Dette er generelle råd, ikke en erstatning for lege eller fysioterapeut. Start med lav vekt og øk rolig." Trening page: list grouped by primary Muscle Group, each row name + level + equipment, linking to the detail; Trening keeps its nav title.

**Never:** No equipment profiles, suggestions, filters or search (4.2–4.5), no muscle figure (4.6), no workout logging (Epic 5), no #35–39 until issue #8 is approved.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed | fresh local DB | 9 equipment, 6 muscle groups, 34 exercises; second start adds nothing | Non-local: none |
| Integrity | every exercise | exactly 1 primary, 0–2 secondary, ≥ 1 equipment, video id, ≥ 1 step | Test fails otherwise |
| Mapping | #13 Markløft | primary Rygg, secondary Ben; #7 needs Manualer and Benk | N/A |
| List | GET list | 34 items | 401 without login |
| Detail | GET Armhevinger | name, Kroppsvekt, primary Bryst, secondary, steps, video id | Unknown id → 404 `exercise_not_found` |
| Read-only | POST/PUT/DELETE on `/api/exercises` | 405 | N/A |
| Video fails | iframe error | "Videoen kan ikke vises nå" + YouTube link; text still shown | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/exercises/` (new) -- `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py` (`list_exercises`, `get_exercise`); reuse `CurrentUser`, `AppError`.
- `backend/app/seed/data/exercises.json` (new), `backend/app/seed/seed.py` (load after food seeds).
- `backend/app/main.py`, `backend/migrations/env.py`, `migrations/versions/0012_exercises.py` (`down_revision` = current head on main); `tests/test_health.py` expects `0012`.
- `backend/tests/exercises/` (new) -- matrix rows, seed integrity over the whole JSON.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/exercises/` (new) -- `api.ts`, `exercise-list.tsx`, `exercise-detail.tsx`, `video-embed.tsx`; `frontend/src/app/trening/page.tsx`, `frontend/src/app/trening/ovelser/[id]/page.tsx`; `nav-items.ts` title for the detail route.

## Tasks & Acceptance

**Execution:**
- [x] seed JSON (with draft fields), exercises module, migration, tests -- FR17, AD-9.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] Trening list, detail page, video embed with fallback, safety note -- FR21; Vitest for list, detail and video fallback.

**Acceptance Criteria:**
- Given the running stack, when a user opens Trening and taps Armhevinger, then the detail shows the steps, "Hovedmuskel: Bryst", the youtube-nocookie video and the safety note.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Seed:** `backend/app/seed/data/exercises.json` has 9 equipment, 6 muscle groups and 34 exercises from `ovelsesliste.md` (names, equipment, level, video ids). Exercise type (only Planke is time-based), secondary muscles and the 3 steps per exercise are AI-written and marked `review_status: utkast` for the group. Seeding inserts missing slugs only, so #35–39 can be added later.
- **Mapping:** #13 Markløft primary Rygg (secondary Ben); #6 Burpees and #18 Kettlebell sving primary Ben; two-item equipment split into two required rows.
- **Video ids:** `backend/tests/exercises/video_ids.json` pins all 34 ids so the check runs in Docker too.
- **Detail page:** `export const instant = false` on `/trening/ovelser/[id]` because the shell needs the path at request time. Video uses youtube-nocookie with an always-visible "Se videoen på YouTube" link; offline shows "Videoen kan ikke vises nå".
- **Access:** `CurrentUser`; a non-UUID id gives 404. Reference links use RESTRICT.

## Spec Change Log

- 2026-11-16: exercise endpoints use `CurrentUser`, not `ConsentedUser` — exercises are reference data, not health data.

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | Non-UUID id → 422 and a dead-end "Prøv igjen" | medium | `exercise_id: uuid.UUID`; frontend test mocks 404 instead | patch |
| BH, EC | Video fallback never shows when online | medium | Cross-origin iframes rarely fire `error`; only offline triggers it | patch |
| BH, EC | Seed never adds new exercises to an existing DB | medium | Early return when any exercise exists; #35–39 are planned | patch |
| VG, BH | Video-id check always skips in Docker | medium | `.docs` not in the image; swapped ids would pass | patch |
| BH | CASCADE on equipment/muscle links silently changes requirements | low | Reference rows are read-only; RESTRICT is safer | patch |
| BH, EC | Missing primary raises StopIteration (500) | low | `next(...)` without default | patch |
| BH | "Hele kroppen" mappings unasserted; consent test uses a consented user | low | Test gaps | patch |
| BH, EC | Hover uses selection colour; steps keyed by text; empty list silent | low | Direct corrections | patch |
| BH | Seed JSON and regenerated API files missing | false | Excluded from the review diff on purpose | rejected |
| EC | Seed does not update names/positions of existing reference rows | low | Reference names are fixed | rejected |
| EC | Partial index needs Postgres | false | PostgreSQL is the only store (AD-8) | rejected |
| BH | DB does not enforce 0–2 secondary | low | Seed is the only writer; tests check it | rejected |
| BH | Tab title static "Øvelse" | low | Cosmetic | rejected |
| BH | Tracking inconsistencies | false | Fixed at close | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
