# Epic 1 Context: Account and safe login

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every later epic builds on: the whole app (Postgres, FastAPI backend, Next.js frontend) starts with one Docker Compose command on a clean machine, the frontend has its app shell (navigation, final design tokens, light/dark mode), and a visitor can register, give explicit consent before any health data, log in and out safely, and delete their account. Security (Argon2id passwords, server-side sessions, Origin check, lockout, per-user data isolation) and consent are built here once, in the `identity` module, so no later module reinvents them.

## Stories

- Story 1.1: Run the app with one command (done)
- Story 1.2: App shell with navigation and design tokens (done)
- Story 1.3: Create an account
- Story 1.4: Log in and log out
- Story 1.5: Give consent before health data
- Story 1.6: Delete my account

## Requirements & Constraints

- **Registration:** email + password (min 8 characters). Password stored only as an Argon2id hash, never plain text. On success the user is logged in at once and sent to the consent screen. Registering with an existing email must not create a second account and must not reveal more about the email than registration requires.
- **Login:** wrong email and wrong password give the identical message "E-post eller passord er feil." (no account enumeration). 5 failed logins for one account within 15 minutes lock it for 15 minutes ("For mange forsøk. Prøv igjen om litt."), even with the right password; the counter lives in Postgres. Logout deletes the session row and clears the cookie; the old token then counts as logged out.
- **Session cookie:** never in localStorage; `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Consent:** before any Profile/health data, a screen lists what is stored (body data, food logs, workout logs) and why, with an unticked checkbox and "Godta og fortsett" (disabled until ticked). Store `consent_at` (UTC). No health data without consent.
- **Isolation:** a user can only read/change their own Profile, Equipment Profiles, Food Log Entries and Workouts; requests for another user's data return no data.
- **Deletion:** "Slett konto" with a confirmation dialog stating it cannot be undone → soft-delete at once, all sessions removed, cannot log in; soft-deleted users and their data excluded from every query; hard-delete after 30 days via CLI, reporting how many accounts were purged.
- **Browser/UI:** Chrome on PC primary; current Safari, Firefox, Edge; no horizontal scroll at 360 px. All UI text Norwegian bokmål. WCAG 2.1 AA basics: labelled fields, tap targets ≥ 44×44 px, body text contrast ≥ 4.5:1 in both light and dark mode.
- **Required backend tests in this epic:** login lockout and its expiry; one user cannot read or change another user's data. Tests never call real external services.
- **Secrets:** only in git-ignored `.env`; never `NEXT_PUBLIC_`-prefixed; never logged.

## Technical Decisions

- **Paradigm:** modular monolith. Backend module `identity` (account, session, consent) uses router → service → repository (+ `models.py`, `schemas.py`); a layer only calls the one below; no module imports another module's repository or models. Shared code in `app/core/` (settings, db session, auth dependency, errors). Same module name in `frontend/src/modules/identity/`.
- **Frontend is UI-only:** no DB access, never decides a stored value. Browser talks only to Next.js, which rewrites `/api/*` to the internal backend (single origin, no CORS). Types generated from backend OpenAPI with `openapi-typescript`, called via `openapi-fetch`; generated files committed and regenerated when the API changes. Server data via TanStack Query.
- **Sessions (not JWT):** login and registration create a random opaque token; only its hash is stored in a `sessions` table (user ↔ many sessions). Logout deletes that session; account deletion deletes all the user's sessions.
- **CSRF / Origin check:** every POST, PUT, PATCH, DELETE must carry an `Origin` header matching the app URL, otherwise 403 with the error envelope.
- **Lockout:** failed logins counted per account in the database (5 in 15 min → 15 min lock), one generic message.
- **Auth by default:** endpoints require the auth dependency; only register, login and health are explicitly public. Services get the current user from the auth dependency.
- **Consent guard:** one `require_consent` dependency owned by `identity` guards every endpoint that reads or writes health data and rejects users without `consent_at` with a clear error code. No other module checks consent itself.
- **Ownership (AD-4):** every user-owned table has `user_id`; no endpoint accepts a user id from the client; every repository read/write of user-owned data filters by the current user's id. Shared food items have `owner_id = NULL`; user-created ones are visible only to their owner.
- **User data model:** `users` holds email, password hash, `consent_at`, `deleted_at` (soft delete), later `is_pro` (phase 2). User 1:1 Profile, 1:N sessions, Equipment Profiles, Food Log Entries, Workouts, own Food Items. Exact columns/indexes are owned by models and Alembic migrations.
- **Registration side effect:** right after registration `identity` calls the `exercises` service once to create default Equipment Profiles "Hjemme" (bodyweight) and "Treningssenter" (all equipment); that service arrives in Epic 4.
- **Database:** PostgreSQL only; schema changes only via Alembic; sync SQLAlchemy 2 + psycopg 3, one session per request committed once at the end of a successful request; endpoints plain `def`.
- **Errors:** every error is `{"error": {"code": "<snake_case>", "message": "<norsk>"}}` with a fitting status; frontend shows `message` and branches only on `code`.
- **Conventions:** UUIDv4 ids; UTC ISO-8601 timestamps; tables plural `snake_case`; JSON `snake_case`; paths `/api/<module>/...` (here `/api/identity/...`); code in English, UI text Norwegian; never log passwords, tokens or request bodies. Purge: `python -m app.cli purge`. Production refuses an empty/default `SESSION_SECRET` and never seeds demo users. One branch and PR per story, commits reference the issue.
- **Stack (security-relevant pins):** FastAPI 0.162.5, SQLAlchemy 2.1.8, Alembic 1.20.1, psycopg 3.3.9, Pydantic 2.14.3 / pydantic-settings 2.16.2, argon2-cffi 25.1.0, pytest 9.2.0; Next.js 16.4.6, React 19.3.1, TanStack Query 5.107.1, openapi-typescript 7.13.0 / openapi-fetch 0.17.0, Vitest 5.1.0, Playwright 1.65.0.
- **Design tokens (final, DESIGN.md revision 3):** one token set exposed as Tailwind theme values and shadcn/ui CSS variables, light default plus `colors-dark` for dark mode; components use tokens only, never raw hex. Warm paper background with notebook lines, surface cards, ink text; plum `accent` is the only action colour (primary buttons, active nav, links); one mauve `mark` colour shared by Mat and Trening, used only as small marks and told apart by icon and label; `error` red only for validation and destructive actions; Manrope as the single typeface (hierarchy by size/weight). In dark mode, plum text on tints uses `accent-text`. Text/background contrast pairs are documented in the frontend contrast file.

## UX & Interaction Patterns

- **Screens and flow:** "Logg inn / Opprett konto" when logged out (email + password) → after first registration, Samtykke → (Epic 2: intro → profile setup) → I dag. A logged-in user without consent is sent to the consent screen.
- **Forms:** inputs 48 px, visible label above (never placeholder-only), 1.5 px rule border; error state 2 px `error` border with the message below, starting with what to fix; focus moves to the first invalid field. Enter submits.
- **Buttons:** verbs; primary is a plum pill, secondary a surface pill with rule border; 50 px high; at most one primary button per view. Account deletion uses a confirmation dialog.
- **Accessibility:** visible 2 px focus ring with offset; tab order follows reading order; document title "<side> · Prompt Force"; Esc closes the top dialog.
- **Voice:** warm, short, "du"-form, Norwegian; follow the frontend voice guide from story 1.2 (no jargon, streaks or shaming).

## Cross-Story Dependencies

- 1.1 provided compose, layout, settings, error envelope and API type generation; 1.2 provided the shell, final tokens and voice guide. Auth screens render inside the shell.
- Open items from 1.1 to settle with the first writing endpoint (1.3): make the per-request DB session commit before the response is sent (and test the real dependency); make the generated OpenAPI 422 schema match the error envelope; decide whether validation errors carry per-field details for inline messages.
- 1.3 creates `users`, `sessions`, password hashing, the session cookie and the Origin check; 1.4 adds login/logout, lockout and the cross-user isolation test; 1.5 adds `consent_at` and `require_consent`, which Epics 2–6 depend on for all health-data endpoints; 1.6 depends on sessions and must exclude soft-deleted users everywhere.
- Default Equipment Profiles on registration depend on the Epic 4 `exercises` service.
