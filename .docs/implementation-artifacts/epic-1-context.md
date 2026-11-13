# Epic 1 Context: Account and safe login

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every other epic builds on: the whole app (database, FastAPI backend, Next.js frontend) starts with one Docker Compose command on a clean machine, has a calm app shell with navigation and design tokens, and lets a visitor create an account, log in and out safely, give explicit consent before any health data is stored, and delete the account. Because weight, food and training logs count as health data under GDPR, consent, strict per-user data isolation and reliable deletion are core requirements, not polish. The examiner grades the project by running it locally from the README, so a reproducible one-command setup is equally critical.

## Stories

- Story 1.1: Run the app with one command
- Story 1.2: App shell with navigation and design tokens
- Story 1.3: Create an account
- Story 1.4: Log in and log out
- Story 1.5: Give consent before health data
- Story 1.6: Delete my account

## Requirements & Constraints

- Register with email and password (min. 8 characters); log in; log out. Passwords stored only as Argon2id hashes.
- Wrong email and wrong password give the identical message "E-post eller passord er feil." (no account enumeration). Registering an existing email must not reveal more than necessary and must not create a duplicate.
- After 5 failed logins for an account within 15 minutes, further attempts are rejected for 15 minutes (even with the right password) with "For mange forsøk. Prøv igjen om litt."; the counter lives in PostgreSQL and a test proves lockout and expiry.
- Session cookie is HttpOnly, Secure, SameSite=Lax; never localStorage.
- Consent: before any Profile/health data, the user sees what is stored (body data, food logs, workout logs) and why, ticks an unticked checkbox and presses "Godta og fortsett" (disabled until ticked). Consent time is stored (UTC). No Profile without consent.
- Users can only read or change their own data; requests for others' data return nothing. Must be proven by an automated access-control test.
- Account deletion: soft-delete immediately, user can no longer log in, all user data excluded from queries; hard-delete by script within 30 days.
- Runnable from the README with `.env.example`, no team keys or paid services, one `docker compose up`, target under 20 minutes on a clean machine. Secrets never committed; `.env` is git-ignored.
- UI text in Norwegian bokmål; works in Chrome (primary), Safari, Firefox, Edge; usable at 360 px without horizontal scroll; WCAG 2.1 AA basics (labelled fields, ≥ 44 px tap targets, sufficient contrast).
- Automated tests never call real external services.

## Technical Decisions

- **Monorepo:** `backend/` (FastAPI, Python 3.14) and `frontend/` (Next.js 16.4.6, React 19.3.1, Node 24), scaffolded with official generators (no third-party starter). Root `docker-compose.yml` with `db` (postgres:18, volume), `backend` (internal port 8000 only), `frontend` (port 3000, the only public port).
- **Single origin:** browser talks only to Next.js, which rewrites `/api/*` to the backend in the Docker network. No CORS.
- **Frontend is UI-only:** no DB access, no business rules; all truth comes from the API.
- **Backend layering:** feature modules under `backend/app/modules/<module>/` with `router.py → service.py → repository.py` (+ `models.py`, `schemas.py`); a layer only calls the one to its right; no module imports another's repository or models. Cross-cutting code (settings, DB session, auth dependency, errors) in `backend/app/core/`. This epic owns the `identity` module (account, session, consent).
- **Sessions, not JWT:** random opaque token, stored hashed in a `sessions` table. Logout and account deletion delete the user's sessions.
- **CSRF:** every POST/PUT/PATCH/DELETE must carry an `Origin` matching the app URL, else 403 with the error envelope.
- **Consent guard:** a `require_consent` dependency owned by `identity` guards every health-data endpoint; no other module checks consent itself. Later epics rely on it.
- **Ownership:** every user-owned table has `user_id`; no endpoint accepts a user id from the client; repositories always filter by the current user. Endpoints are authenticated by default; public ones (register, login, health) are explicitly marked.
- **Data model (identity):** `users` with `consent_at`, `deleted_at` (and later `is_pro`); `sessions`. UUIDv4 ids, UTC ISO-8601 timestamps, plural snake_case table names.
- **Soft delete:** `users.deleted_at`; all user queries exclude soft-deleted users; `python -m app.cli purge` hard-deletes users and all user-owned rows 30+ days after deletion and reports the count.
- **Default equipment profiles** ("Hjemme", "Treningssenter") are created by the `exercises` service, called once by `identity` right after registration (hook point for Epic 4).
- **Persistence:** PostgreSQL only; synchronous SQLAlchemy 2 + psycopg 3, one session per request committed once; plain `def` endpoints. Schema changes only via Alembic; on startup `alembic upgrade head`, then `seed_if_empty` only when `APP_ENV=local`.
- **Config:** pydantic-settings; every variable in `.env.example` with a safe local default; with `APP_ENV=production` the backend refuses to start on an empty/default `SESSION_SECRET` and never seeds demo users; no secret prefixed `NEXT_PUBLIC_`.
- **Errors:** every error (including 404 on unknown routes) is `{"error": {"code": "<snake_case>", "message": "<norsk>"}}`; the frontend shows `message` and branches only on `code`.
- **API contract:** Pydantic schemas → OpenAPI → frontend types via `openapi-typescript`, called with `openapi-fetch`; one documented regeneration command; generated files committed. Paths `/api/<module>/...`; `GET /api/health` returns `{"status": "ok"}`.
- **Frontend data:** TanStack Query 5. Styling: Tailwind 4.3.5 + shadcn/ui (CLI 4.23.0).
- **Source tree to create:** `backend/app/{core,modules,ports,seed}/`, `backend/app/cli.py`, `backend/migrations/`, `backend/tests/` (mirrors modules); `frontend/src/{app,modules,lib/api}/`, `frontend/e2e/`.
- **Tests:** backend pytest against the Compose Postgres (separate test DB), external services mocked; frontend Vitest; Playwright e2e.
- **Conventions:** code/identifiers in English, UI text in Norwegian; never log passwords, session tokens or request bodies; one branch + PR per story, commits reference the issue.
- Pinned versions: argon2-cffi 25.1.0, FastAPI 0.162.5, Uvicorn 0.54.0, SQLAlchemy 2.1.8, Alembic 1.20.1, psycopg 3.3.9, Pydantic 2.14.3, pydantic-settings 2.16.2, pytest 9.2.0, openapi-typescript 7.13.0, openapi-fetch 0.17.0, Vitest 5.1.0, Playwright 1.65.0.

## UX & Interaction Patterns

- **Flow:** logged-out visitor → Logg inn / Opprett konto → (after first registration) Samtykke → first-run intro (Epic 2) → I dag. Logout and "Slett konto" live on the Profil page.
- **Shell:** ≥ 1024 px persistent sidebar (I dag, Mat, Trening, Historikk, Profil, 230 px wide); 768–1023 px collapses to icons (72 px); < 768 px bottom tab bar (I dag, Mat, Trening, Profil). Active item ink + bold on the nav-active tint. One outline icon set (house, bowl, dumbbell, calendar, person), 24 px, 2 px stroke; no emoji.
- **Design tokens:** one token set exposed as Tailwind theme values and shadcn/ui CSS variables; components never use raw hex. Use the A1 tokens (ink `#1E2A2F`, muted `#5B6B70`, board `#F7F8F6`, card `#FFFFFF`, line `#DCE2E0`, food `#2F7D55`, training `#D9542B` never as text / training-text `#B9471F`, error `#B42318`, Atkinson Hyperlegible) until the group confirms the merged A1 + round-3 set; swapping the set must not change component code. Document each text/background contrast ratio; body text ≥ 4.5:1. No dark mode or gradients in v1. Red is reserved for validation errors and destructive confirmations.
- **Forms:** 48 px inputs with a visible label above (never placeholder-only); errors inline under the field, starting with the fix, 2 px error border; focus moves to the first invalid field; Enter submits.
- **Accessibility:** visible 2 px focus ring with offset; tab order follows reading order; page title "<side> · Prompt Force"; dialogs take focus and return it on close; Esc closes; toasts via `aria-live="polite"`; 200% zoom without horizontal scroll.
- **Delete account:** confirmation dialog stating it cannot be undone (one modal level only).
- **Voice:** Norwegian, warm, short, du-form, verbs on buttons; no BMR/TDEE jargon, streaks, confetti or shaming. Write a short voice guide in the frontend for later stories to follow.

## Cross-Story Dependencies

- 1.1 is the base for everything (compose, settings, error envelope, Alembic, OpenAPI generation); 1.2 builds the shell all pages render in.
- 1.3 creates `users`/`sessions`, Argon2id hashing and the Origin check; 1.4 adds login/lockout/logout and the auth dependency plus the cross-user access test; 1.5 adds `consent_at` and `require_consent`; 1.6 adds soft delete, session removal and the purge CLI.
- Later epics depend on: the auth dependency and ownership filtering (all user data), `require_consent` (Epics 2–6), the post-registration call to the `exercises` service for default equipment profiles (Epic 4), the first-run intro after consent (Epic 2), the shell and tokens (all UI), and seed-on-startup for demo users (NFR-4).
- Purge must remove all user-owned rows added by later epics (profile, equipment profiles, food log entries, user-created food items, workouts).
