# Epic 1 Context: Account and safe login

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Lay the foundation every later epic builds on: the whole app (Postgres, FastAPI backend, Next.js frontend) starts with one Docker Compose command, the frontend has its app shell (navigation, final design tokens, light/dark mode), and a visitor can register, give explicit consent before any health data, log in and out safely, reset a forgotten password and delete their account. Security (Argon2id, server-side sessions, Origin check, lockout, per-user data isolation) and consent are built once, in the `identity` module, so no later module reinvents them.

## Stories

- Story 1.1: Run the app with one command (done)
- Story 1.2: App shell with navigation and design tokens (done)
- Story 1.3: Create an account (done)
- Story 1.4: Log in and log out (done)
- Story 1.5: Give consent before health data (next)
- Story 1.6: Delete my account
- Story 1.7: Reset a forgotten password (Should)

## Requirements & Constraints

- **Registration/login (built):** email + password (min 8), Argon2id hash only; registration logs the user in and sends them to the consent screen; no account enumeration ("E-post eller passord er feil."); 5 failed logins in 15 min lock the account for 15 min ("For mange forsøk. Prøv igjen om litt."), counter in Postgres; logout deletes the session row and clears the cookie. Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, never localStorage.
- **Consent (1.5):** a logged-in user without consent who opens the app gets the consent screen. It lists in plain language what is stored (body data, food logs, workout logs) and why, has an **unticked** checkbox with a programmatically associated label, and the button "Godta og fortsett", **disabled until the box is ticked**. Ticking + pressing stores `consent_at` as a UTC timestamp, then the user continues into the app (next: intro → profile setup, Epic 2). No Profile or other health data can be created without consent. The planning docs give no exact body copy beyond that list; write it in the app's voice.
- **Isolation:** a user only reads/changes their own Profile, Equipment Profiles, Food Log Entries and Workouts; other users' data returns nothing.
- **Deletion (1.6):** "Slett konto" on Profil with a confirmation dialog saying it cannot be undone → `deleted_at` set at once, all sessions deleted, logged out, cannot log in; soft-deleted users and their data excluded from every query; `python -m app.cli purge` hard-deletes users soft-deleted > 30 days ago and their rows, reporting how many were purged.
- **Password reset (1.7, Should):** "Glemt passord?" on login → `/glemt-passord`; always answers "Hvis e-posten har en konto, har vi sendt deg en lenke." If the account exists and is not deleted, email a single-use link to `/nytt-passord`, valid 60 min, only the token hash stored. Max 3 reset emails per account per hour (excess silently not sent, same message). New password (min 8) → new Argon2id hash, link invalidated, all sessions deleted, lockout cleared, redirect to `/logg-inn` with "Passordet er endret. Logg inn med det nye passordet." Expired/used/unknown link: "Lenken er utløpt eller allerede brukt. Be om en ny." with a link to `/glemt-passord`, nothing changes.
- **Browser/UI:** Chrome on PC primary; current Safari, Firefox, Edge; no horizontal scroll at 360 px. UI text Norwegian bokmål. WCAG 2.1 AA basics: labelled fields, tap targets ≥ 44×44 px, body contrast ≥ 4.5:1 in light and dark.
- **Tests:** backend tests for lockout + expiry and cross-user isolation (done); tests never call real external services (email uses the mock adapter).
- **Secrets:** only in git-ignored `.env`; never `NEXT_PUBLIC_`; never logged.

## Technical Decisions

- **Paradigm:** modular monolith. `identity` (account, session, consent, password reset) uses router → service → repository (+ `models.py`, `schemas.py`); a layer only calls the one below; no module imports another's repository or models. Shared code in `app/core/` (settings, db, auth dependency incl. `CurrentUser`, `Now` clock dependency, errors). Frontend mirror in `frontend/src/modules/identity/`.
- **Frontend is UI-only:** no DB, no business rules. Browser talks only to Next.js, which rewrites `/api/*` to the backend. Types from OpenAPI via `openapi-typescript` + `openapi-fetch`, generated files committed and regenerated on API change. Server data via TanStack Query.
- **Sessions (not JWT):** random opaque token, only its hash in `sessions`; logout deletes that session; account deletion and password reset delete all the user's sessions.
- **Origin check:** every POST/PUT/PATCH/DELETE needs an `Origin` matching the app URL, else 403 in the error envelope. Applies to the consent and reset endpoints too.
- **Auth by default:** endpoints require the auth dependency; only register, login, health (and the two reset endpoints, which must be public) are explicitly public.
- **`require_consent` rule:** one dependency, owned by `identity`, guards **every** endpoint that reads or writes health data (Profile, food logs, workouts, overview in later epics). It builds on the current-user dependency and rejects a user whose `consent_at` is null with the error envelope and one clear snake_case code (code name/status not fixed by planning; pick one and keep it stable, the frontend branches on it). No other module checks consent itself; they just depend on `require_consent`. The endpoint that records consent and the identity endpoints (me, logout, delete account) must not require consent. `consent_at` is a new nullable UTC column on `users` via an Alembic migration; set it with the `Now` dependency.
- **Email port (AD-7):** interface in `backend/app/ports/email.py` with `smtp` and `mock` adapters chosen by `EMAIL_MODE=smtp|mock`. In Docker Compose SMTP points to a local mail catcher (web inbox on its own port), so nothing is really sent unless real SMTP settings are configured; automated tests always use mock. New variables go in `.env.example`.
- **Ownership:** every user-owned table has `user_id`; no endpoint accepts a user id from the client; repositories always filter by the current user.
- **Data model:** `users` holds email, password hash, `consent_at`, `deleted_at`, later `is_pro`. Columns/indexes owned by models + Alembic.
- **Registration side effect:** `identity` calls the `exercises` service once to create default Equipment Profiles "Hjemme" and "Treningssenter"; that service arrives in Epic 4.
- **Database:** PostgreSQL only; Alembic only; sync SQLAlchemy 2 + psycopg 3, one session per request committed once; endpoints plain `def`.
- **Errors:** `{"error": {"code": "<snake_case>", "message": "<norsk>"}}`, with per-field details for inline validation errors; frontend shows `message` and branches only on `code`.
- **Conventions:** UUIDv4; UTC ISO-8601; plural `snake_case` tables; `snake_case` JSON; paths `/api/identity/...`; code English, UI Norwegian; never log passwords, tokens or bodies. Production refuses an empty/default `SESSION_SECRET` and never seeds demo users. One branch and PR per story, commits reference the issue.
- **Design tokens:** use tokens only, never raw hex; plum `accent` is the only action colour; `error` red only for validation and destructive actions; Manrope; dark-mode plum text on tints uses `accent-text`.

## UX & Interaction Patterns

- **Flow:** logged out → "Logg inn / Opprett konto" → after first registration `/samtykke` → (Epic 2: intro → profile setup) → I dag. Routing is handled by the frontend proxy and `SessionGuard`; a logged-in user without consent must be sent to `/samtykke`, and a consented user should not get stuck there. `/samtykke` currently has a placeholder page.
- **Consent screen:** one view, plain warm text (what is stored + why), the unticked checkbox with its label, and a single primary plum button "Godta og fortsett" (disabled until ticked). Document title "Samtykke · Prompt Force".
- **Forms:** 48 px inputs, visible label above, error 2 px `error` border with the message below starting with the fix; focus moves to the first invalid field; Enter submits.
- **Buttons:** verbs; primary plum pill, secondary surface pill; 50 px high; at most one primary per view. Account deletion uses a confirmation dialog.
- **Accessibility:** 2 px focus ring with offset; tab order follows reading order; title "<side> · Prompt Force"; Esc closes the top dialog.
- **Voice:** warm, short, "du"-form Norwegian; no jargon, streaks or shaming.

## Cross-Story Dependencies

- 1.1–1.4 provide compose, settings, error envelope (with field errors), API type generation, shell, tokens, `users`/`sessions`, Origin check, `CurrentUser`, `Now`, lockout, proxy routing and `SessionGuard`.
- 1.5 adds `consent_at` and `require_consent`; Epics 2–6 depend on it for every health-data endpoint, and Epic 2's intro/profile setup follows the consent screen.
- 1.6 depends on sessions and must exclude soft-deleted users everywhere (including reset requests in 1.7).
- 1.7 depends on login/lockout (1.4) and adds the email port plus a mail-catcher service in Compose.
- Default Equipment Profiles on registration depend on the Epic 4 `exercises` service.
