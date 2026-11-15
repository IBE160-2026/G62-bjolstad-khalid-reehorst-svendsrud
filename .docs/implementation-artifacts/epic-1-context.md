# Epic 1 Context: Account and safe login

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every later epic builds on: the whole app (Postgres, FastAPI backend, Next.js frontend) starts with one Docker Compose command on a clean machine, the frontend has its app shell (navigation, design tokens, light/dark mode), and a visitor can register, give explicit consent before any health data, log in and out safely, and delete their account. Security (hashed passwords, server-side sessions, lockout, per-user data isolation) and consent are set up here once, so no later module reinvents them.

## Stories

- Story 1.1: Run the app with one command
- Story 1.2: App shell with navigation and design tokens
- Story 1.3: Create an account
- Story 1.4: Log in and log out
- Story 1.5: Give consent before health data
- Story 1.6: Delete my account

## Requirements & Constraints

- **Run it:** one `docker compose up` after copying `.env.example` to `.env`; no team keys or paid services; under 20 minutes on a clean machine. README "Kom i gang" lists prerequisites with versions and exact start/test commands. Secrets only in git-ignored `.env`, never `NEXT_PUBLIC_`-prefixed, never committed.
- **Accounts:** email + password (min 8 chars), Argon2id hashing. Wrong email and wrong password give the identical message "E-post eller passord er feil.". 5 failed logins within 15 minutes lock the account for 15 minutes ("For mange forsøk. Prøv igjen om litt."), even with the right password; counter stored in Postgres. Duplicate-email registration must not leak more than necessary and must not create a second account.
- **Consent:** before any Profile data, a screen lists what is stored (body data, food logs, workout logs) and why, with an unticked checkbox and "Godta og fortsett" (disabled until ticked). Store `consent_at` (UTC). No health data without consent.
- **Isolation:** a user can only read/change their own data; requests for another user's data return nothing. Must be proven by a backend test.
- **Deletion:** "Slett konto" with an irreversible-action confirmation dialog → soft-delete at once, sessions removed, cannot log in; soft-deleted users and their data excluded from all queries; hard-delete after 30 days via a CLI command that reports how many accounts were purged.
- **Browser/UI:** Chrome on PC is primary; also current Safari, Firefox, Edge; no horizontal scrolling at 360 px. All UI text Norwegian bokmål. WCAG 2.1 AA basics: labelled fields, ≥ 44×44 px tap targets, body text contrast ≥ 4.5:1.
- **Light and dark mode (Should):** light is the default; a top-bar button switches mode without a page reload and the choice is remembered in the browser after it is closed and reopened; both modes meet the contrast rules.
- **Tests required in this epic:** login lockout and its expiry; cross-user access control.

## Technical Decisions

- **Monorepo:** `backend/` (FastAPI, Python 3.14) and `frontend/` (Next.js 16.4, React 19, Node 24), root `docker-compose.yml` with `db` (postgres:18), `backend` (internal only), `frontend` (port 3000). Scaffolded with official generators, no third-party starter. Pinned: Tailwind 4.3.5, shadcn CLI 4.23.0, TanStack Query 5.107.1, FastAPI 0.162.5, SQLAlchemy 2.1.8 (sync) + psycopg 3.3.9, Alembic 1.20.1.
- **Layout:** backend `app/core/` (config, db session, auth dependency, errors), `app/modules/<module>/` (router → service → repository; a layer only calls the one below; no module imports another's repository/models), `app/ports/`, `app/seed/`, `migrations/`, `tests/` (mirrors modules); frontend `src/app/`, `src/modules/<module>/`, `src/lib/api/`, `e2e/`. Same module names on both sides; this epic owns `identity`.
- **Frontend is UI-only:** no DB, no business rules. The browser talks only to Next.js, which rewrites `/api/*` to the backend in the Docker network. Types generated from the backend OpenAPI with `openapi-typescript` via one documented command, called with `openapi-fetch`; generated files committed.
- **Startup:** backend runs `alembic upgrade head` (schema only via Alembic), then seeds if empty when `APP_ENV=local`. `GET /api/health` → `{"status": "ok"}`. Settings via pydantic-settings; every variable in `.env.example` with a safe local default; with `APP_ENV=production`, an empty/default `SESSION_SECRET` aborts startup with a clear log message, and demo users are never seeded.
- **Errors:** one envelope `{"error": {"code", "message"}}` with Norwegian messages for every backend error, including 404 on unknown routes.
- **Sessions (not JWT):** random opaque token stored hashed in a `sessions` table; cookie `HttpOnly`, `Secure`, `SameSite=Lax`. Logout and account deletion delete the sessions. Every POST/PUT/PATCH/DELETE must have an `Origin` matching the app URL, else 403 with the envelope.
- **Consent guard:** a single `require_consent` dependency in `identity` protects every health-data endpoint; no other module checks consent itself.
- **Data ownership:** every user-owned table has `user_id`; no endpoint accepts a user id; repositories always filter by the current user. Endpoints are authenticated by default.
- **Conventions:** UUIDv4 ids; UTC ISO-8601 timestamps; tables plural `snake_case`; API paths `/api/<module>/...`; code in English, UI text Norwegian; never log passwords, tokens or request bodies. Soft delete via `users.deleted_at`; purge with `python -m app.cli purge`. Right after registration, `identity` calls the `exercises` service once to create default Equipment Profiles (the service itself arrives in Epic 4). One branch and PR per story.
- **Design tokens (not final):** colours, typography, radii, spacing and shadows live in one token set exposed as Tailwind theme values and shadcn/ui CSS variables, with a light and a dark variant. Components use tokens only, never raw hex. The group (Karianne) is still finalizing colours and font in PR #17 (`ux/felles-design`), so Story 1.2 must keep all token values in one place so that swapping them changes no component code. Current starting point from that branch: warm paper background with notebook lines, surface cards, ink text, plum `accent` as the only action colour, food green / training orange as small marks only, error red only for validation/destructive actions, Inter as the single typeface. Dark-mode values are not yet specified in the design doc. Document each text/background pair with its contrast ratio.

## UX & Interaction Patterns

- **Shell:** ≥ 1024 px persistent sidebar (I dag, Mat, Trening, Historikk, Profil); 768–1023 px sidebar collapses to icons; < 768 px bottom tab bar (I dag, Mat, Trening, Profil). Active item marked (plum on accent tint, pill). One outline icon set (house, bowl, dumbbell, calendar, person), no emoji. Top bar holds the help "?" button and the light/dark toggle.
- **Keyboard/screen reader:** visible 2 px focus ring with offset; tab order follows reading order; document title "<side> · Prompt Force"; every input has a visible label (never placeholder-only).
- **Forms:** inline errors under the field, starting with what to fix; focus moves to the first invalid field. Buttons are verbs; one primary (plum) button per view; buttons ≥ 52 px high.
- **Voice:** warm, short, "du"-form, verbs on buttons, no BMR/TDEE jargon, no streaks, confetti or shaming. Story 1.2 writes a short voice guide in the frontend that all later stories follow.
- **Flow:** register → consent → (Epic 2: intro → profile setup) → I dag. A logged-in user without consent is sent to the consent screen.

## Cross-Story Dependencies

- 1.1 is the base for everything (compose, layout, error envelope, settings, API type generation).
- 1.2 shell and tokens are used by every later UI story; 1.3–1.6 screens render inside it.
- 1.3 creates users, sessions and the Origin check; 1.4 adds login/logout, lockout and the isolation test; 1.5 adds `consent_at` and `require_consent`, which Epics 2–6 depend on for all health-data endpoints; 1.6 depends on sessions and must exclude soft-deleted users everywhere.
- Default Equipment Profiles on registration depend on the Epic 4 `exercises` service.
