---
title: 'Story 1.5: Give consent before health data'
type: 'feature'
created: '2026-11-15'
status: 'done'
baseline_commit: '654717491e48fec4eb58573ec1bd8b623c90bb77'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-1-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-1-4-log-in-and-log-out.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Health data (GDPR art. 9) needs an explicit, recorded choice before it is stored, and no endpoint can yet tell whether a user has given it; `/samtykke` is a placeholder.

**Approach:** Add `users.consent_at`, a consent endpoint, a `require_consent` dependency owned by `identity` for all later health-data endpoints, and the real consent screen. A logged-in user without consent is kept on `/samtykke`; after consenting they continue to `/` (the Epic 2 intro does not exist yet).

## Boundaries & Constraints

**Always:** `POST /api/identity/consent` (authenticated, consent not required) sets `consent_at = now` (from `Now`, UTC) only if it is empty — repeating it keeps the first time — and returns the user. `UserResponse` (register, login, me, consent) gains `consent_at: datetime | null`. `SessionUser` carries `consent_at`. `ConsentedUser` (annotated dependency, `app/modules/identity/consent.py`) wraps `CurrentUser` and rejects users without consent with 403 `consent_required` "Du må godta samtykket før du kan legge inn helsedata."; no other module checks consent. `me`, `logout` and `consent` never require consent. Consent screen in Norwegian bokmål, du-form, per VOICE.md: heading "Samtykke"; what is stored — body data (vekt, høyde, alder, kjønn, aktivitetsnivå og mål), food logs, workout logs; why — to calculate your calorie target and show what you have logged; only you can see it; you can delete your account at any time on Profil. Unticked checkbox with a linked label "Jeg har lest dette og godtar at Prompt Force lagrer disse opplysningene."; primary button "Godta og fortsett" disabled until ticked; a secondary "Logg ut" for users who do not want to go on. `/samtykke` uses the minimal layout (no navigation) but requires login and runs `SessionGuard`.

**Never:** No profile, intro or health-data endpoints (Epic 2+). No withdrawing consent (deleting the account is the way out, story 1.6). No consent check in the Next proxy (it only sees the cookie). No pre-ticked box.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Give consent | logged in, `consent_at` null | 200, `consent_at` = now (UTC) in body and DB | N/A |
| Repeat | `consent_at` already set | 200, `consent_at` unchanged | N/A |
| Not logged in | no cookie | 401 `unauthorized` | N/A |
| Guarded endpoint | test route with `ConsentedUser`, no consent | 403 `consent_required` envelope | With consent → 200 |
| Me | after register | `consent_at: null` | N/A |
| Routing | logged in, no consent, on `/`, `/mat`, `/profil` … | `SessionGuard` replaces to `/samtykke` | N/A |
| Routing | consent given, on `/samtykke` | replaced to `/` | N/A |
| Routing | no cookie on `/samtykke` | proxy → `/logg-inn` | N/A |
| Screen | box unticked | button disabled; ticking enables it; submit → `/` | Server error → `role="alert"` message, box stays ticked |

</frozen-after-approval>

## Code Map

- `backend/app/modules/identity/{models,schemas,service,repository,router}.py` -- add `consent_at` to `User`, `UserResponse`, `SessionUser`; `give_consent(db, user_id, now)`; route `operation_id="give_consent"`. Reuse `CurrentUser`, `Now`, `AppError`.
- `backend/app/modules/identity/consent.py` (new) -- `require_consent`, `ConsentedUser`.
- `backend/migrations/versions/0004_consent_at.py` (new, `down_revision='0003'`); `tests/test_health.py` expects `0004`.
- `backend/tests/identity/test_consent.py` (new) -- every backend row; the guard via a route added to the app in the test only.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/identity/routes.ts` -- add `CONSENT_PATH`; a "gate" path list for the minimal layout with guard.
- `frontend/src/modules/identity/session-guard.tsx` -- consent redirects; keep the stale-401 rule from 1.4.
- `frontend/src/modules/identity/{api.ts,consent-form.tsx}` -- `useGiveConsent` (update `["me"]`, then `router.replace("/")`); reuse `LogoutButton`, `ApiError`, `styles.ts`.
- `frontend/src/components/shell/app-shell.tsx` -- `/samtykke` gets the minimal layout plus `SessionGuard`.
- `frontend/src/app/samtykke/page.tsx` -- replace the placeholder.

## Tasks & Acceptance

**Execution:**
- [x] backend identity files, `consent.py`, `0004_consent_at.py` -- consent column, endpoint, guard.
- [x] `backend/tests/identity/test_consent.py`, `test_health.py` -- matrix backend rows.
- [x] `backend/openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend `routes.ts`, `session-guard.tsx`, `api.ts`, `consent-form.tsx`, `app-shell.tsx`, `samtykke/page.tsx` -- screen and routing; Vitest for the form (disabled → enabled → submit → `/`, error alert) and the guard's consent redirects, and the shell on `/samtykke` (no navigation, guard active).

**Acceptance Criteria:**
- Given the running stack, when a new user registers, then they land on `/samtykke`, cannot reach `/` before consenting, and after ticking and pressing "Godta og fortsett" they land on `/` with `consent_at` stored.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- **Backend:** `service.give_consent` locks the user row (`repository.get_user_for_update`) so two parallel requests cannot both write a time; `require_consent` raises `AppError(403, "consent_required", ...)`. Router builds every `UserResponse` through `_user_response`.
- **Frontend:** `CONSENT_PATH` moved from `register-form.tsx` to `routes.ts`; `GATE_PATHS`/`isGatePath` mark logged-in pages that use the minimal layout with `SessionGuard`. The guard's decision is the pure `guardRedirect(pathname, unauthorized, consentAt)`: a gone session wins, an unknown user (loading/network error) stays put. The proxy is unchanged (`/samtykke` already redirects to `/logg-inn` without a cookie).
- **Tests:** the guarded route in `test_consent.py` is added to the test's app instance only.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| EC | Parallel `POST /consent` can overwrite the first time | low | `get_user_for_update` returns the identity-map User loaded by `resolve_session` without refreshing; direct fix `populate_existing` | patch |
| VG | No test that login returns a consented user's `consent_at` | medium | Login test compares with a registration body where `consent_at` is null; a regression would push users back to `/samtykke` | patch |
| BH | Checkbox hit area 24 px, below the 44 px rule | medium | `size-6` input beside the label; epic requires tap targets ≥ 44×44 px | patch |
| BH | Shell test checks only half its name; guard test uses a fixed wait | low | Missing `/samtykke` no-redirect assertion; `setTimeout(20)` is timing-dependent; test-only fix | patch |
| EC | Consent 401 while on `/samtykke` leaves the user on an error message | low | Session must expire during the screen; fix adds an error branch | rejected |
| EC, BH | 401 from `give_consent` does not clear the cookie | low | Path is unreachable: sessions cascade-delete with their user | rejected |
| EC, BH | App pages render briefly before the consent redirect | low | Only while `/me` loads; health endpoints will reject via `ConsentedUser` anyway | rejected |
| EC | `/me` network error leaves a non-consented user on app pages | low | Backend down affects every page; no data can be written without consent | rejected |
| BH | No Origin test for `/consent` | low | The middleware covers every POST and has its own tests | rejected |
| BH | Implementation Notes say every response uses `_user_response` | false | Fix would edit this spec | rejected |
| BH | Status differs across spec, sprint-status and epic context | false | Step 5 syncs status at close | rejected |
| BH | No consent text version stored | low | Not in intent; revisit if the stored data list changes | rejected |
| BH | No end-to-end test of the AC | low | Already deferred (Playwright smoke test, story 1.3) | rejected |
| BH | OpenAPI lists a 422 for `/consent` | low | Cosmetic; `default` types every error | rejected |
| BH | Soft-deleted users can record consent | false | `deleted_at` does not exist until story 1.6 | rejected |
| BH | Epic context dropped reference detail | low | Remaining details live in the architecture spine and DESIGN.md | rejected |
| BH | `isGatePath`/`isConsentPath` overlap | low | Only one gate exists; Epic 2 will extend it | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass

**Manual checks (if no CLI):**
- In Chrome at 1280 and 360 px, both themes: register → `/samtykke`; button disabled until ticked; Tab reaches checkbox then button; consent → `/`; reload stays in the app.
