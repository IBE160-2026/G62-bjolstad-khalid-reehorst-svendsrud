---
title: 'Story 4.2: Save my equipment'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: '194da3b27b02b6ca3f264b0a4c7edb0f0e4911b6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-4-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-4-1-see-an-exercise-and-how-to-do-it.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Users train in different places with different equipment, but the app has no way to know what they own, so it cannot suggest exercises they can actually do.

**Approach:** Add Equipment Profiles ("Utstyr") to the `exercises` module: named sets of equipment per user. Registration calls the `exercises` service once to create "Hjemme" (bodyweight only) and "Treningssenter" (all nine types). The Profil page gets an "Utstyr" section to create, rename, tick equipment and delete profiles. Bodyweight is always included. Users who registered before this story get the two defaults the first time their profiles are read.

## Boundaries & Constraints

**Always:** Tables `equipment_profiles` (`user_id` FK CASCADE, name, created_at) and `equipment_profile_items` (profile FK CASCADE, equipment FK RESTRICT); migration `0013` (`down_revision='0012'`). Endpoints (`CurrentUser`, Origin-checked writes): `GET /api/exercises/equipment` (the nine types in seed order), `GET /api/exercises/equipment-profiles`, `POST` (name + equipment slugs), `PATCH /{id}` (name and/or equipment), `DELETE /{id}`. Every repository read/write filters by `user_id` (AD-4); another user's or a missing profile → 404 `equipment_profile_not_found`. Server always adds `kroppsvekt` to a profile's equipment, whatever the client sends. Name trimmed, 1–40 chars, unique per user ignoring case ("Du har allerede en profil som heter det."); at most 10 profiles ("Du kan ha opptil 10 utstyrsprofiler."); unknown equipment slug → 422 field error. The last profile cannot be deleted (409 `last_equipment_profile` "Du må ha minst én utstyrsprofil."). `identity.service.register` calls `exercises.service.create_default_profiles(db, user_id)` once (service, never repository). `list_profiles` creates the two defaults if the user has none (users from before this story). Profiles listed in creation order. UI on Profil: section "Utstyr" listing each profile (name + equipment names) with "Endre"; "Ny utstyrsprofil" button; a `<dialog>` sheet with "Navn" and nine checkboxes (Kroppsvekt checked and disabled with "Alltid med"), "Lagre", and in edit mode "Slett profil" which asks "Slette «{navn}»?" with "Ja, slett" / "Avbryt" inside the sheet.

**Never:** No suggestions or profile switch on Trening (4.3). No sharing profiles between users. No custom equipment types.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Register | new user | exactly "Hjemme" (kroppsvekt) and "Treningssenter" (all 9) | N/A |
| Old user | no profiles, GET | the two defaults created and returned | Second GET creates nothing |
| Create | "Hytta", [manualer] | 201, equipment = kroppsvekt + manualer | N/A |
| Untick bodyweight | PATCH equipment [manualer] | kroppsvekt still included | N/A |
| Bad input | empty name, duplicate "hjemme", unknown slug, 11th profile | 422 field errors / limit message | Nothing changed |
| Delete last | only one profile left | 409 `last_equipment_profile` | Profile kept |
| Isolation | B reads/changes/deletes A's profile | 404, A unchanged | N/A |
| Purge | user purged | profiles and items gone (CASCADE) | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/modules/exercises/{models,schemas,repository,service,router}.py` -- profile models, CRUD, `create_default_profiles`, lazy defaults; reuse `CurrentUser`, `AppError`, field errors, equipment seed.
- `backend/app/modules/identity/service.py` -- call `exercises.service.create_default_profiles` after the user is added.
- `backend/migrations/versions/0013_equipment_profiles.py`; `tests/test_health.py` expects `0013`; CASCADE test must pass.
- `backend/tests/exercises/test_equipment_profiles.py` (new) -- every backend row; registration test checks the defaults.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/exercises/{api.ts,equipment-profiles.tsx,equipment-profile-sheet.tsx}` (new parts); `frontend/src/app/profil/page.tsx` -- add the "Utstyr" section between the profile editor and "Konto". Reuse dialog pattern, `styles.ts`, field-error handling.

## Tasks & Acceptance

**Execution:**
- [x] backend models, migration, service, routes, registration hook, tests -- FR18, FR3, AD-9.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend Utstyr section and sheet -- Vitest for list, create, edit (bodyweight locked), delete confirm, last-profile message, field errors.

**Acceptance Criteria:**
- Given a new user, when they open Profil, then "Utstyr" shows "Hjemme" (Kroppsvekt) and "Treningssenter" (all nine); they can add "Hytta" with Manualer and it shows Kroppsvekt and Manualer.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Ordering:** profiles are listed by `created_at, id`; the defaults are created one microsecond apart so "Hjemme" always comes first.
- **Concurrency:** create/update/delete and the lazy defaults take a per-user `pg_advisory_xact_lock`, so two requests cannot both create the defaults, pass the 10-profile limit or delete the last profile. A unique index on `(user_id, lower(name))` backs the name rule.
- **Errors:** duplicate name and unknown slug are 422 `validation_error` with a field error (`name` / `equipment`, unknown slug: "Velg utstyr fra listen."); the limit is 422 `equipment_profile_limit` without fields.
- **Defaults without seed:** if the equipment table is empty (tests that do not seed), the defaults are created with the equipment that exists (none); once Kroppsvekt exists, reading the profiles (list or update) adds it to any profile that lacks it.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC, VG | Profiles created without seeded equipment never get Kroppsvekt | medium | Defaults built from whatever equipment exists; lazy path skips users with profiles | patch |
| BH | Registration test counts after the GET | low | Cannot tell the hook from lazy creation | patch |
| VG | Per-user filters in limit/name/last-profile untested | medium | Every test has one user | patch |
| BH | Missing Origin/401/PATCH-bound/DELETE-404 tests | low | Test gaps | patch |
| BH | Advisory lock key has no namespace | low | One-argument form could collide later | patch |
| EC | No cap on equipment list size | low | Direct fix | patch |
| BH, EC | Save possible before equipment loads; no limit hint at 10; focus lost after failed delete; stale row after 404 | low | UI gaps | patch |
| VG | Concurrency of the advisory lock untested | medium (unverified) | No concurrency harness yet | defer |
| BH | Regenerated API files missing | false | Excluded from the review diff on purpose | rejected |
| BH | GET writes defaults without Origin check | low | Only creates the user's own two defaults once | rejected |
| BH | Empty PATCH returns 200 | low | Harmless no-op | rejected |
| BH | Status differs; 3.7 marked done | false | Step 5 syncs; 3.7 was merged (PR #37) | rejected |
| BH | "Treningssenter" fixed at registration | low | Equipment types are fixed (nine) | rejected |
| BH | Edit test stops after the request | low | Create test covers close and refresh | rejected |
| EC | Same created_at ordering; control characters in names | low | Rare | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
