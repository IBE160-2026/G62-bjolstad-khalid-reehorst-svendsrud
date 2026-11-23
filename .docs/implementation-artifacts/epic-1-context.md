# Epic 1 Context: Account and safe login

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give Prompt Force its foundation: the whole app (Postgres, FastAPI backend, Next.js frontend) starts with one Docker Compose command on a clean machine, has its app shell and design tokens, and lets a visitor create an account, give consent, log in and out, reset a forgotten password, deactivate or delete the account. Every later epic builds on the auth, consent, ownership and configuration patterns set here, so they must be right and consistent from the start.

## Stories

- Story 1.1: Run the app with one command
- Story 1.2: App shell with navigation and design tokens
- Story 1.3: Create an account
- Story 1.4: Log in and log out
- Story 1.5: Give consent before health data
- Story 1.6: Delete my account
- Story 1.7: Reset a forgotten password (Should)
- Story 1.8: Deactivate my account (Should)

## Requirements & Constraints

- **Register/login/logout:** email + password (min 8 chars), Argon2id hash only. Wrong email and wrong password give the identical message "E-post eller passord er feil." (no account enumeration).
- **Lockout:** 5 failed logins for one account within 15 minutes locks that account for 15 minutes ("For mange forsøk. Prøv igjen om litt."), even with the right password. Counter lives in PostgreSQL; a backend test must prove lockout and expiry.
- **Password reset (Should):** request on `/glemt-passord` always answers "Hvis e-posten har en konto, har vi sendt deg en lenke." whether or not the account exists (no email for deleted accounts). The link to `/nytt-passord` is single-use, expires after 60 minutes, and only a hash of its token is stored. Setting a new password (min 8, new Argon2id hash) invalidates the link, deletes all the user's sessions (logged out everywhere) and clears the login lockout, then redirects to `/logg-inn` with "Passordet er endret. Logg inn med det nye passordet." Expired/used/unknown links show "Lenken er utløpt eller allerede brukt. Be om en ny." with a link back, and change nothing. At most 3 reset emails per account per hour; over the limit, nothing is sent and the visitor sees the same standard message.
- **Email delivery:** locally and for the examiner, mail goes to a local mail catcher in Docker Compose (web inbox on its own port) and is never really sent; real sending only when SMTP settings are configured; automated tests use the mock adapter. Must stay free and keyless.
- **Consent:** before any health data, a plain-language screen lists what is stored (body data, food logs, workout logs) and why, with an unticked checkbox and "Godta og fortsett" (disabled until ticked). `consent_at` stored in UTC.
- **Own data only:** a user can never read or change another user's data; backend test required.
- **Delete account:** confirmation dialog; soft-delete at once, sessions deleted, cannot log in; purge script hard-deletes after 30 days.
- **Deactivate (Should):** confirmation, sessions deleted, no data deleted; correct-password login reactivates with "Velkommen tilbake! Kontoen din er aktiv igjen."; wrong password follows normal lockout rules; never purged.
- **Run/config:** one `docker compose up`, no team keys or paid services, under 20 minutes on a clean machine; secrets only in git-ignored `.env`; README "Kom i gang" section.
- **Shell/UX baseline:** Norwegian bokmål UI, usable at 360 px without horizontal scroll, WCAG 2.1 AA basics, light/dark mode (light default, remembered in browser).

## Technical Decisions

- **Layout:** monorepo with `backend/` (FastAPI, Python 3.14) and `frontend/` (Next.js 16.4, Node 24); Compose services `db` (postgres:18), `backend` (internal only), `frontend` (port 3000). Backend feature modules router → service → repository; shared code in `app/core/`; no module imports another's repository or models.
- **Frontend is UI only:** no DB access, no business rules. Browser talks only to Next.js, which rewrites `/api/*` to the backend (single origin, no CORS).
- **Sessions (auth):** random opaque token stored hashed in `sessions`, cookie `HttpOnly`, `Secure`, `SameSite=Lax`; no JWT. Every mutating request must carry an `Origin` matching the app URL (else 403 with error envelope). Logout, account deletion, deactivation and password reset delete the user's sessions. Endpoints authenticated by default; public ones (register, login, health, and the reset request/confirm endpoints) explicitly marked.
- **Consent guard:** a `require_consent` dependency owned by `identity` guards every health-data endpoint; no other module checks consent itself.
- **Ownership:** every user-owned table has `user_id`; no endpoint accepts a user id; repositories always filter by it.
- **External services behind ports:** each is an interface in `backend/app/ports/` (`email.py` alongside `off.py`, `image.py`) with live and mock adapters chosen by env. Email uses `EMAIL_MODE=smtp|mock`; in Compose SMTP points at the local mail catcher. Tests always use mock. Password reset lives in `identity` + `ports/email`. No background job system; send synchronously via the port.
- **Settings:** pydantic-settings; every variable (including SMTP/email settings and mail-catcher host/port) listed in `.env.example` with a safe local default. With `APP_ENV=production` the backend refuses to start if `SESSION_SECRET` is empty/default and never seeds demo users. No secret prefixed `NEXT_PUBLIC_`.
- **Data/schema:** PostgreSQL only; schema changes only via Alembic; startup runs `alembic upgrade head`, then `seed_if_empty` when `APP_ENV=local`. UUIDv4 ids, UTC ISO-8601 timestamps. Soft delete via `users.deleted_at` (all user queries exclude it); deactivation via `users.deactivated_at`; purge via `python -m app.cli purge`. Sync SQLAlchemy 2 + psycopg 3, one session per request, plain `def` endpoints.
- **Errors:** one envelope `{"error": {"code": "<snake_case>", "message": "<norsk>"}}`; frontend shows `message` and branches only on `code`.
- **API contract:** Pydantic → OpenAPI → `openapi-typescript` types + `openapi-fetch`; generated files committed and regenerated when the API changes. Paths `/api/<module>/...`.
- **Logging:** never log passwords, session tokens, reset tokens or request bodies.
- **Default equipment profiles** are created by the `exercises` service, called once by `identity` right after registration.
- **Tests:** backend pytest against the Compose Postgres (separate test DB), external services mocked; frontend Vitest; Playwright e2e in `frontend/e2e/`.

## UX & Interaction Patterns

- App shell: sidebar at ≥1024 px (I dag, Mat, Trening, Historikk, Profil), icon-only at 768–1023 px, bottom tab bar under 768 px; one outline icon set, no emoji. Components use design tokens only (Tailwind theme + shadcn/ui variables), never raw hex.
- Validation errors inline under the field, starting with the fix, focus to the first invalid field. Visible 2 px focus ring; page title "<side> · Prompt Force".
- Voice: warm, short, du-form, verbs on buttons, no jargon or shaming.
- Account actions ("Slett konto", "Deaktiver konto") live on Profil and use a confirmation dialog. "Glemt passord?" is a link on the login page.

## Cross-Story Dependencies

- 1.1 (Compose, settings, error envelope, OpenAPI pipeline) precedes all; Story 1.7 adds a mail-catcher service to Compose and email settings to `.env.example`.
- 1.3/1.4 establish users, sessions, Argon2id and the lockout counter that 1.6, 1.7 and 1.8 reuse: reset must clear the 1.4 lockout and delete sessions the same way logout does; reset must skip soft-deleted accounts (1.6).
- 1.8 deactivation interacts with login (1.4) and purge (1.6).
- 1.5's `require_consent` and the ownership rule are relied on by every later epic; registration triggers default equipment profiles from Epic 4's `exercises` service.
