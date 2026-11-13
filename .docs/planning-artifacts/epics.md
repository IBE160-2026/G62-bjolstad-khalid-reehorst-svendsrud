---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - .docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md
  - .docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/addendum.md
  - .docs/planning-artifacts/architecture/architecture-prompt-force-2026-11-13/ARCHITECTURE-SPINE.md
  - .docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/DESIGN.md
  - .docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/EXPERIENCE.md
  - .docs/planning-artifacts/ux/runde-3/DESIGN.md
  - .docs/planning-artifacts/ux/runde-3/EXPERIENCE.md
  - .docs/planning-artifacts/ux/runde-3/mockups/
---

# Prompt Force - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Prompt Force, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

**UX input.** The group voted on 2026-11-12 to merge UX proposal A1 (`ux-designs/ux-prompt-force-2026-11-10/`) and round 3 (`ux/runde-3/`). The merged design does not exist yet. Stories therefore take structure and behaviour from A1's EXPERIENCE.md (which follows the final PRD), take the food-logging method picker, the muscle-group list and the state handling from round 3's mockups, and leave colours and fonts to one design-token story that uses whichever token set the group confirms.

## Requirements Inventory

### Functional Requirements

FR1 (Must): A visitor can register with email and password, log in and log out. Passwords hashed (Argon2id/bcrypt); one generic error for wrong email or password; after 5 failed logins in 15 minutes the account is locked for 15 minutes; session in an HttpOnly, Secure, SameSite cookie.
FR2 (Must): Before first entering Profile data, the user sees a consent screen naming what is stored and why, and must actively tick an unticked box and press a button. No Profile without consent; consent time is stored.
FR3 (Must): A user can only read and change their own Profile, Equipment Profiles, Food Log Entries and Workouts; requests for other users' data return no data.
FR4 (Must): A user can delete a single Food Log Entry, a single Set, a whole Workout and their whole account. Account deletion: soft-delete at once, hard-delete by script within 30 days; a deleted account cannot log in.
FR5 (Must): A user can enter and edit weight, height, age, sex, Activity Level and Goal. Each Activity Level has an everyday example. Valid ranges: weight 30–300 kg, height 100–250 cm, age 16–100.
FR6 (Must): Calorie Target = Mifflin-St Jeor BMR × activity factor + goal adjustment (−500/0/+300), rounded to whole kcal, floor 1 200 (female) / 1 500 (male) with a note when the floor is used. Four test profiles must give exact results (2798, 1884, 2181, 2206 kcal). Ages 16–17 get a "rough estimate" note. Sex is required, with an explanation. Profile change recalculates at once.
FR7 (Must): The Calorie Target is shown as one number with one or two plain sentences; the words BMR, TDEE and Mifflin never appear on the Daily Overview or the profile result.
FR8 (Should): Log food by scanning a barcode with the camera (HTTPS or localhost). Lookup order: shared Food Items and the user's own, then Open Food Facts, saving the result as a shared Food Item.
FR9 (Must): The user can type the barcode number by hand and get the same result as a scan.
FR10 (Must): When a barcode is not found or has no kcal value, or Open Food Facts cannot be reached, the user gets a clear message and a button to register the food manually with the barcode prefilled. Never a crash or an empty result.
FR11 (Must): Search Food Items by name (case-insensitive, contains), covering seeded Matvaretabellen items (at least 100), cached Open Food Facts items and the user's own items; recently used first; never calls Open Food Facts while typing. "mel" finds "Havremel"; no match shows the manual option.
FR12 (Must): A user can create their own Food Item (name and kcal per 100 g required; protein, carbs, fat and serving size optional) and log it. Visible only to that user.
FR13 (Must): When logging, the user picks the Meal and the amount in grams, or servings if the item has a serving size; kcal is shown before saving (150 g × 63 kcal/100 g = 94.5 → shown 95). Amounts ≤ 0 g or > 5 000 g are rejected [ASSUMPTION: upper limit].
FR14 (Must): When adding food, the user sees their 10 most recently logged distinct Food Items, newest first, and can log one again with one tap (last amount and Meal prefilled). New users see no list and are pointed to search.
FR15 (Must): A user can change the amount or Meal of a Food Log Entry or delete it; the Daily Overview updates at once without reload.
FR16 (Must): Where Open Food Facts or Matvaretabellen data is shown, the required attribution text is shown.
FR17 (Must): A fixed list of 30–50 Exercises (start: ovelsesliste.md), each with name, required Equipment, a primary and 0–2 secondary Muscle Groups, Level, Exercise Type (reps/time), short description and video link. Users cannot add Exercises.
FR18 (Must): A user can create, rename, edit and delete Equipment Profiles from the nine fixed Equipment types. New users get "Hjemme" (bodyweight only) and "Treningssenter" (all equipment). Bodyweight is always included.
FR19 (Must): For the chosen Equipment Profile, the app shows only Exercises whose required Equipment is all in that profile; Beginner first, then Intermediate, then Advanced. A dumbbell-only user is not suggested barbell deadlift.
FR20 (Should for filters, Must for name search): Filter suggestions by Muscle Group (primary or secondary) and Level; search the Exercise list by name. No match gives a message explaining why and what to change.
FR21 (Must): Exercise detail shows the technique description and an embedded youtube-nocookie video; if the video fails, the text still shows.
FR22 (Must): A user can start a Workout for a date, add Exercises from suggestions or the full list, reorder and remove them; removing an Exercise removes its Sets; a Workout without Sets is not shown on the Daily Overview.
FR23 (Must): For each Workout Exercise the user can add, edit and delete Sets: reps (required) and kg (optional; empty = bodyweight) for reps exercises, seconds for time exercises. A new Exercise starts with 3 empty Sets suggesting 10 reps.
FR24 (Must): While logging, the user sees the Sets from the latest earlier Workout with the same Exercise (date, reps × weight or seconds); "Første gang" if none; today's Sets are never shown as last time.
FR25 (Must): A user can finish a Workout and later edit or delete its Sets, Exercises or the whole Workout; deleting the Workout asks for confirmation; edits update the Daily Overview and future last-time values.
FR26 (Must): For a chosen date (today by default), the Daily Overview shows Calorie Target, kcal eaten, kcal remaining (negative shown as "over"), Food Log Entries grouped by Meal with totals, and that date's Workouts with Exercises and Sets. Training adds no kcal.
FR27 (Should): The user can move to earlier dates (previous day or date picker); future dates cannot be chosen; logging on a past date counts toward that date.
FR28 (Must): A new user, or a date without logs, sees short prompts ("Logg ditt første måltid", "Start en økt") instead of empty tables. A first-time user sees a short, dismissible introduction to the three steps that never reappears once dismissed.
FR29 (Phase 2): A Pro user can photograph one food item and get an estimated name and kcal, always labelled as an estimate and editable. Mock Mode returns "Egg, 1 stk, 78 kcal (estimat)"; failures, missing kcal or >15 s fall back to manual registration; max 20 calls per day; the user is told before sending that the photo goes to an external service.
FR30 (Phase 2): Users have a Pro Flag (default off) set in Seed Data or by a developer; non-Pro users opening FR29 see it is a Pro feature and nothing is sent.

### NonFunctional Requirements

NFR1: Primary test device is Chrome on a PC; all screens also work in current Safari, Firefox and Edge and are usable at 360 px width without horizontal scrolling. No native app. Camera needs HTTPS or localhost.
NFR2: All UI text in Norwegian bokmål; exercise names Norwegian with the English name in brackets where helpful.
NFR3: Runnable from the README with `.env.example` and no team keys or paid services; the examiner runs it with Docker, so one Docker Compose command starts the whole app; under 20 minutes on a clean machine.
NFR4: A seed script creates fictional test users with Profiles, Equipment Profiles, Food Log Entries and Workouts across several dates (one Pro user in phase 2).
NFR5: Open Food Facts and the phase-2 image model sit behind separate replaceable modules; automated tests never call a real external service.
NFR6: Open Food Facts rules: own User-Agent, under 15 product lookups per minute, cache every product looked up, show the ODbL attribution.
NFR7: Passwords, API keys and connection strings are never committed; only in `.env` (git-ignored) and the host's environment variables.
NFR8: Automated tests cover the calorie calculation (FR6), Exercise Suggestions (FR19, FR20), kcal sums (FR13, FR26), access control (FR3) and the not-found barcode path (FR10).
NFR9: A saved Food Log Entry or Set appears in the Daily Overview without a manual page reload.
NFR10: WCAG 2.1 AA basics: labelled fields, tap targets large enough on a phone, sufficient contrast.
NFR11: The Daily Overview has at most two primary actions (log food, start a workout) and favours few, clear actions.

### Additional Requirements

From the architecture spine (`ARCHITECTURE-SPINE.md`, final 2026-11-13). No third-party starter template; the project is scaffolded with the official generators (`create-next-app` for the frontend, a FastAPI project skeleton for the backend) inside one monorepo. This shapes Epic 1, Story 1.

- Monorepo with `backend/` (FastAPI) and `frontend/` (Next.js) and a root `docker-compose.yml` with three services: `db` (postgres:18), `backend` (python:3.14-slim) and `frontend` (node:24). One `docker compose up` starts everything (AD-8, NFR3).
- Backend layered feature modules `identity`, `profile`, `food`, `exercises`, `workouts`, `overview`, each with router → service → repository; shared code in `app/core/`. `overview` composes other modules' services and never their repositories (paradigm, AD-5).
- The frontend is a UI client only: no database access, no business rules (AD-1). The browser only talks to Next.js, which rewrites `/api/*` to the backend inside the Docker network (AD-2).
- Server-side sessions: hashed opaque token in a `sessions` table, HttpOnly/Secure/SameSite=Lax cookie, Argon2id, failed-login counter in Postgres (5 per 15 min), Origin check on every mutating request, sessions deleted on logout and account deletion (AD-3).
- A `require_consent` dependency in `identity` guards every health-data endpoint (AD-3, FR2).
- Every user-owned table has `user_id`; no endpoint accepts a user id; repositories always filter by it. Shared food items have `owner_id = NULL` (AD-4).
- Business rules as pure, unit-tested backend functions, each owned by one module: `profile` calorie target, `food` kcal sums, `exercises` suggestions, `workouts` last time (AD-5).
- Food Log Entries store `grams` and `kcal_per_100g_snapshot` (AD-6).
- External services behind ports in `backend/app/ports/` with live and mock adapters (`OFF_MODE`, `IMAGE_MODE`); the Open Food Facts adapter validates EAN-8/13, checks the cache first, sends its own User-Agent, stays under 15 lookups per minute, caches every product, and treats HTTP 404 as "not found" (AD-7).
- PostgreSQL only; schema changes only through Alembic; on startup `alembic upgrade head` then `seed_if_empty` when `APP_ENV=local` (AD-8).
- Exercises, Equipment and Muscle Groups are read-only seed data; primary + 0–2 secondary muscle groups via a join table with a role; default Equipment Profiles created by the `exercises` service right after registration (AD-9).
- API contract: Pydantic schemas → OpenAPI → frontend types generated with `openapi-typescript`, called with `openapi-fetch`; generated files committed (AD-10).
- One error envelope `{"error": {"code", "message"}}` with Norwegian messages (AD-11).
- Logs belong to a calendar date (`YYYY-MM-DD`, Europe/Oslo, sent by the client); timestamps UTC; UUIDv4 ids (AD-12).
- Synchronous SQLAlchemy 2 with psycopg 3, one session per request (AD-13).
- Soft-delete accounts with `deleted_at`; `python -m app.cli purge` hard-deletes after 30 days (AD-14).
- TanStack Query on the frontend; every food or workout mutation invalidates the overview query for its date (AD-15).
- Settings via pydantic-settings; `.env.example` lists every variable; production refuses to start with an empty/default `SESSION_SECRET` and never seeds demo users (AD-16).
- The calorie target is computed on profile save and stored; all dates use the current target (AD-17).
- Conventions: API paths `/api/<module>/...`; code in English, UI text in Norwegian; endpoints authenticated by default; never log passwords, tokens or body data; one branch and pull request per story, commits reference the issue.
- Tests: backend pytest against the Compose Postgres (separate test database) with external services mocked; frontend Vitest; Playwright e2e for UJ-1 to UJ-4.
- Pinned versions (verified 2026-11-13): Next.js 16.4.6, React 19.3.1, Tailwind 4.3.5, shadcn CLI 4.23.0, TanStack Query 5.107.1, FastAPI 0.162.5, SQLAlchemy 2.1.8, Alembic 1.20.1, psycopg 3.3.9, PostgreSQL 18, Python 3.14, Node 24.
- From the PRD addendum: data model (User–Profile, Equipment Profiles ↔ Equipment, Food Log Entry → Food Item with source OFF/Matvaretabellen/user, Workout → Workout Exercise → Set); seed 100–200 common Matvaretabellen foods with attribution "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no"; Open Food Facts limits (15 lookups and 10 searches per minute per IP, no search-as-you-type, many products lack serving size).

### UX Design Requirements

Merged from A1 (`ux-designs/ux-prompt-force-2026-11-10/`) and round 3 (`ux/runde-3/`). Where they disagree, the requirement follows the final PRD.

UX-DR1: Design tokens: implement one token set (colours, typography, radii, spacing, shadows) as Tailwind theme and shadcn/ui CSS variables, from the token set the group confirms after merging A1 and round 3. Components use tokens only, never raw hex values. All text/background pairs meet WCAG AA (body ≥ 4.5:1), checked and documented.
UX-DR2: App shell: persistent sidebar on ≥ 1024 px (I dag, Mat, Trening, Historikk, Profil) that collapses to icons at 768–1023 px, and a bottom tab bar under 768 px (I dag, Mat, Trening, Profil). Active item clearly marked. One outline icon set (house, bowl, dumbbell, calendar, person), no emoji.
UX-DR3: Week strip: seven day cells (Monday–Sunday) with weekday and date; the selected day outlined; up to two magnets per past/current day (food logged, workout logged); future days disabled; ‹ › steps a week; a calendar icon opens a date picker; each cell has an accessible name such as "tirsdag 10. november, mat logget, trening logget".
UX-DR4: Day note: one per screen, showing kcal remaining as the single large number, one plain sentence ("igjen av dagens mål på 1 640"), and optional supporting lines for floor used, ages 16–17, and "over" (shown in normal ink with supportive text, never red).
UX-DR5: Section cards for Mat and Trening on the Daily Overview: header with category icon disc, title, summary and chevron that links to the section for the same date; rows per Meal with totals (and "+ Legg til" on empty meals) and per exercise with sets and "Sist: …"; the whole header row is clickable.
UX-DR6: Food logging method picker (from round 3): four equal choices Søk · Skriv strekkode · Nylig brukt · Manuelt, opened as a sheet with the chosen Meal preselected when started from a Meal row; "Skann med kamera" appears inside Skriv strekkode only when the browser supports it.
UX-DR7: Amount picker: grams by default, servings when the item has a serving size, live kcal preview before saving, "Lagre" closes the sheet and returns to where it was opened.
UX-DR8: Muscle-group list (from round 3) on Trening: plain text list (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg) plus a name search field, combined with the Equipment Profile segmented control and Level filter chips; Beginner exercises first.
UX-DR9: Active workout screen: each Workout Exercise with set rows (reps and kg, or seconds), a done check per set, delete per set, "Sist: …" under the exercise name, and "Fullfør økt".
UX-DR10: Empty and error states with the exact copy from EXPERIENCE.md: first visit, past date without logs, barcode not found (with "Registrer selv" and barcode prefilled), Open Food Facts unreachable, no matching exercises (explains which filter), video unavailable, no previous sets (hide "Sist"), validation errors inline under the field starting with the fix, generic login error, rate-limit message.
UX-DR11: Delete with undo: deleting a Food Log Entry or Set happens at once with an "Angre" toast for 5 seconds; deleting a whole Workout or the account asks for confirmation. One toast at a time, never covering the primary button.
UX-DR12: First-run introduction: three short steps (profil → logg → tren), skippable, never shown again once dismissed.
UX-DR13: Consent screen: plain language listing what is stored and why, unticked checkbox plus "Godta og fortsett".
UX-DR14: Profile setup: each Activity Level shows its everyday example; the result shows one number "1 640 kcal om dagen" with one sentence.
UX-DR15: Help button (from round 3): a "?" in the top bar that opens a short explanation of the current screen.
UX-DR16: Keyboard and screen reader: visible focus ring (2 px, offset); focus moves into an opened sheet and back on close; Esc closes the top sheet; ← → move a day when the week strip has focus; page title updates per page ("I dag, 10. november · Prompt Force"); toasts announced via aria-live; labels on every input.
UX-DR17: Loading: skeleton rows in the shape of the content for at most about one second; no full-page spinners.
UX-DR18: Voice: Norwegian, warm and short, "du"-form, verbs on buttons ("Logg mat", "Start økt", "Lagre", "Fullfør økt"), no BMR/TDEE jargon, no streaks, confetti or shaming.

### FR Coverage Map

FR1: Epic 1 - Register, log in, log out, lockout after 5 failed logins
FR2: Epic 1 - Consent screen before any health data
FR3: Epic 1 - Users see only their own data (enforced for every later epic)
FR4: Epic 1 (account deletion), Epic 3 (Food Log Entry), Epic 5 (Set, Workout)
FR5: Epic 2 - Create and edit Profile
FR6: Epic 2 - Calculate Calorie Target
FR7: Epic 2 - Explain the Calorie Target
FR8: Epic 3 - Camera barcode scanning (Should)
FR9: Epic 3 - Type the barcode
FR10: Epic 3 - Barcode not found path
FR11: Epic 3 - Search for food
FR12: Epic 3 - Register a food manually
FR13: Epic 3 - Amount and Meal with kcal preview
FR14: Epic 3 - Recently used foods
FR15: Epic 3 - Edit and delete Food Log Entries
FR16: Epic 3 - Data source attribution
FR17: Epic 4 - Fixed exercise list
FR18: Epic 4 - Equipment Profiles
FR19: Epic 4 - Exercise Suggestions
FR20: Epic 4 - Filters (Should) and name search
FR21: Epic 4 - Exercise detail with video
FR22: Epic 5 - Start and build a Workout
FR23: Epic 5 - Log Sets
FR24: Epic 5 - Show last time
FR25: Epic 5 - Finish and edit Workouts
FR26: Epic 6 - Daily Overview
FR27: Epic 6 - Move between dates (Should)
FR28: Epic 2 (first-run introduction), Epic 6 (empty states on the overview); Epics 3 and 5 own empty states in their own sections
FR29: Epic 7 - Photo-based calorie estimate (phase 2)
FR30: Epic 7 - Pro Flag (phase 2)

## Epic List

### Epic 1: Account and safe login
A visitor can create an account, give consent, log in and out, and delete the account; the app runs with one Docker Compose command and has its shell (navigation, design tokens). Every later epic builds on this.
**FRs covered:** FR1, FR2, FR3, FR4 (account)

### Epic 2: Profile and calorie target
A logged-in user enters body data and gets one calorie target explained in plain Norwegian, after a short first-run introduction.
**FRs covered:** FR5, FR6, FR7, FR28 (introduction)

### Epic 3: Food logging
A user logs food by searching, typing a barcode, re-logging a recent food or registering it manually, picks amount and Meal, and edits or deletes entries. Includes the Open Food Facts port with mock, the Matvaretabellen seed, and an import of Norwegian Open Food Facts products into the local food table.
**FRs covered:** FR4 (Food Log Entry), FR8 – FR16

### Epic 4: Exercises and equipment
A user saves Equipment Profiles and gets exercise suggestions that fit their equipment, with name search, filters and an exercise detail with video.
**FRs covered:** FR17 – FR21

### Epic 5: Workout logging
A user starts a workout, logs set by set while seeing what they did last time, and finishes, edits or deletes it.
**FRs covered:** FR4 (Set, Workout), FR22 – FR25

### Epic 6: Daily overview and history
A user sees their day at a glance (kcal remaining, meals, workout) and moves back through earlier days with the week strip.
**FRs covered:** FR26, FR27, FR28 (empty states)

### Epic 7: Photo calorie estimate (phase 2, only when the core loop is stable)
A Pro user photographs one food item and gets an editable kcal estimate.
**FRs covered:** FR29, FR30

## Epic 1: Account and safe login

A visitor can create an account, give consent, log in and out, and delete the account; the app runs with one Docker Compose command and has its shell (navigation, design tokens). Every later epic builds on this.

### Story 1.1: Run the app with one command

As a developer or examiner,
I want to start the whole app with one Docker Compose command,
So that I can run and test Prompt Force on a clean machine without the team's keys.

**Covers:** NFR3, NFR7, AD-1, AD-2, AD-8, AD-10, AD-11, AD-16

**Acceptance Criteria:**

**Given** a clean machine with Docker and the repository cloned
**When** I copy `.env.example` to `.env` and run `docker compose up`
**Then** three services start: `db` (postgres:18), `backend` (FastAPI on Python 3.14, internal only) and `frontend` (Next.js 16.4 on Node 24, port 3000)
**And** the backend runs `alembic upgrade head` on startup, and `GET /api/health` through the frontend returns `{"status": "ok"}`

**Given** the monorepo layout in the architecture spine
**When** I open the repository
**Then** `backend/app/core/`, `backend/app/modules/`, `backend/app/ports/`, `backend/app/seed/`, `backend/migrations/`, `backend/tests/` and `frontend/src/app/`, `frontend/src/modules/`, `frontend/src/lib/api/`, `frontend/e2e/` exist
**And** the frontend API types are generated from the backend OpenAPI schema with one documented command, and the generated files are committed

**Given** `APP_ENV=production` and an empty or default `SESSION_SECRET`
**When** the backend starts
**Then** it refuses to start with a clear log message
**And** every environment variable is listed in `.env.example` with a safe local default, `.env` is git-ignored, and no secret is prefixed `NEXT_PUBLIC_`

**Given** the README
**When** a new person follows its "Kom i gang" section
**Then** it lists prerequisites with versions, the exact commands to start the app and run the tests, and the error envelope `{"error": {"code", "message"}}` is used for any backend error, including 404 on unknown routes

### Story 1.2: App shell with navigation and design tokens

As a user,
I want a calm app frame with clear navigation,
So that I always know where I am and where Mat and Trening are.

**Covers:** NFR1, NFR2, NFR10, UX-DR1, UX-DR2, UX-DR16, UX-DR18

**Acceptance Criteria:**

**Given** a screen at least 1024 px wide
**When** any page loads
**Then** a persistent sidebar shows I dag, Mat, Trening, Historikk and Profil with outline icons from one icon set, and the active item is marked
**And** at 768–1023 px the sidebar collapses to icons, and below 768 px a bottom tab bar shows I dag, Mat, Trening and Profil

**Given** the design tokens
**When** the frontend is styled
**Then** colours, typography, radii and spacing come only from one token set exposed as Tailwind theme values and shadcn/ui CSS variables (A1 tokens until the group confirms the merged set; swapping the set changes no component code)
**And** every text/background pair in the token set is documented with its contrast ratio, and body text is at least 4.5:1

**Given** a keyboard user
**When** they tab through the shell
**Then** a visible 2 px focus ring is shown, the tab order follows the reading order, and the page title reads "<side> · Prompt Force"
**And** all shell text is Norwegian bokmål, with no emoji used as icons, and a short voice guide in the frontend (du-form, verbs on buttons, no BMR/TDEE jargon, no streaks or shaming) is followed by every later story (UX-DR18)

**Given** a 360 px wide screen
**When** any shell page is shown
**Then** there is no horizontal scrolling

### Story 1.3: Create an account

As a visitor,
I want to register with my email and a password,
So that my data is kept private to me.

**Covers:** FR1, FR3, AD-3, AD-4

**Acceptance Criteria:**

**Given** the registration page
**When** I submit a valid email and a password of at least 8 characters
**Then** a `users` row is created with the password hashed with Argon2id (never stored in plain text), I am logged in, and I am sent to the consent screen
**And** the session is a random opaque token stored hashed in a `sessions` table and sent as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie

**Given** an email that already has an account
**When** I try to register with it
**Then** I see a message that does not reveal whether the email exists beyond what registration requires, and no second account is created

**Given** an invalid email or a too-short password
**When** I submit
**Then** an inline Norwegian error appears under the field, starting with what to fix, and focus moves to the first invalid field

**Given** any mutating request (POST, PUT, PATCH, DELETE)
**When** its `Origin` header does not match the app URL
**Then** the backend rejects it with the error envelope and status 403

### Story 1.4: Log in and log out

As a returning user,
I want to log in and log out,
So that I reach my own data and can leave safely on a shared computer.

**Covers:** FR1, FR3, NFR8, AD-3

**Acceptance Criteria:**

**Given** a registered account
**When** I log in with the right email and password
**Then** a new session cookie is set and I reach the app

**Given** a wrong email or a wrong password
**When** I try to log in
**Then** I see exactly the same message, "E-post eller passord er feil.", in both cases

**Given** 5 failed logins for one account within 15 minutes
**When** a sixth attempt is made within the lockout
**Then** it is rejected for 15 minutes with "For mange forsøk. Prøv igjen om litt.", even if the password is right
**And** the counter is stored in PostgreSQL, and a backend test proves the lockout and its expiry

**Given** I am logged in
**When** I log out
**Then** my session row is deleted, the cookie is cleared, and any later request with the old token is treated as logged out

**Given** a request for data owned by another user (FR3)
**When** it reaches any endpoint
**Then** no data is returned, and a backend test proves that one user cannot read or change another user's data

### Story 1.5: Give consent before health data

As a new user,
I want a short, plain explanation of what the app stores and why,
So that I can choose actively before sharing any health data.

**Covers:** FR2, UX-DR13, AD-3

**Acceptance Criteria:**

**Given** a logged-in user without consent
**When** they open the app
**Then** the consent screen lists what is stored (body data, food logs, workout logs) and why, with an unticked checkbox and the button "Godta og fortsett"
**And** the button is disabled until the box is ticked

**Given** the user ticks the box and presses the button
**When** the request completes
**Then** `consent_at` is stored as a UTC timestamp, and the user continues into the app

**Given** a user without `consent_at`
**When** they call any endpoint that reads or writes health data
**Then** the `require_consent` dependency in `identity` rejects the call with a clear error code, and no other module checks consent on its own

### Story 1.6: Delete my account

As a user,
I want to delete my account,
So that my health data does not stay in the app after I stop using it.

**Covers:** FR4, AD-14

**Acceptance Criteria:**

**Given** a logged-in user on the Profil page
**When** they choose "Slett konto" and confirm in a dialog that states the deletion cannot be undone
**Then** `users.deleted_at` is set, all their sessions are deleted, they are logged out, and they can no longer log in

**Given** a soft-deleted user
**When** any query for users or user-owned data runs
**Then** the soft-deleted user and their data are excluded

**Given** users soft-deleted more than 30 days ago
**When** `python -m app.cli purge` runs
**Then** those users and all their user-owned rows are removed for good, and the command reports how many accounts were purged

## Epic 2: Profile and calorie target

A logged-in user enters body data and gets one calorie target explained in plain Norwegian, after a short first-run introduction.

### Story 2.1: Get my calorie target

As a beginner who has just given consent,
I want to enter my body data and goal and get one daily calorie number,
So that I know how much to eat without learning formulas.

**Covers:** FR5, FR6, FR7, NFR8, UX-DR14, AD-5, AD-17

**Acceptance Criteria:**

**Given** a consented user without a profile
**When** they open Profiloppsett
**Then** they can enter weight (kg), height (cm), age, sex, Activity Level and Goal; each Activity Level shows an everyday example (e.g. "Moderat: trener 3–5 dager i uka"); sex has a short explanation that the formula needs it
**And** values outside weight 30–300 kg, height 100–250 cm or age 16–100 are rejected with an inline Norwegian message

**Given** a valid profile is saved
**When** the `profile` service computes the target
**Then** it uses Mifflin-St Jeor × activity factor + goal adjustment (−500 / 0 / +300), rounds to whole kcal, applies the floor of 1 200 (female) / 1 500 (male), and stores the target and a floor flag on the profile (AD-17)
**And** unit tests prove: profile 1 → 2798 kcal (Lose 2298, Gain 3098), profile 2 → 1884, profile 3 → 2181, profile 4 → 2206, and the floor example (female, 45 kg, 150 cm, 60 years, Sedentary, Lose → 1 200 with the floor flag set)

**Given** the target is computed
**When** the result is shown
**Then** it shows one number ("1 640 kcal om dagen") and one or two plain sentences; the words BMR, TDEE and Mifflin do not appear
**And** if the floor was used, a line says the target is set to at least the safe minimum; if the user is 16–17, a line says it is a rough estimate because the formula is made for adults

### Story 2.2: Edit my profile

As a user whose weight or goal has changed,
I want to edit my profile,
So that my calorie target stays right.

**Covers:** FR5, FR6, FR3, AD-17

**Acceptance Criteria:**

**Given** a user with a profile
**When** they change any field on the Profil page and save
**Then** the target is recomputed and stored at once, and the new number is shown without reloading the page
**And** the same validation and messages as in Story 2.1 apply

**Given** another user's profile
**When** a request tries to read or change it
**Then** no data is returned (FR3), proven by a backend test

### Story 2.3: First-run introduction

As someone who has never used an app like this,
I want a very short introduction to how it works,
So that I am not lost on the first screen.

**Covers:** FR28, UX-DR12

**Acceptance Criteria:**

**Given** a user logging in for the first time after consent
**When** they reach the app
**Then** a short introduction shows the three steps (profil → logg → tren) with "Hopp over" and "Sett opp profilen" buttons

**Given** the user dismisses the introduction (either button)
**When** they come back later, on any device
**Then** the introduction is never shown again (the dismissal is stored on the user, not only in the browser)

**Given** a keyboard or screen-reader user
**When** the introduction opens
**Then** focus moves into it, Esc closes it, and focus returns afterwards

## Epic 3: Food logging

A user logs food by searching, typing a barcode, re-logging a recent food or registering it manually, picks amount and Meal, and edits or deletes entries. Includes the Open Food Facts port with mock, the Matvaretabellen seed, and an import of Norwegian Open Food Facts products into the local food table.

### Story 3.1: Search for a basic food and log it

As a user,
I want to search for a common food and log how much I ate in a meal,
So that my day's calories are counted.

**Covers:** FR11, FR13, FR16, NFR4, NFR8, UX-DR6, UX-DR7, AD-5, AD-6, AD-12

**Acceptance Criteria:**

**Given** a fresh database with `APP_ENV=local`
**When** the backend starts
**Then** `seed_if_empty` loads at least 100 common Norwegian foods from Matvaretabellen into `food_items` (source Matvaretabellen, `owner_id` NULL, kcal per 100 g required, protein/carbs/fat when available)

**Given** the Mat page for a date
**When** the user presses "+ Legg til" on a Meal (Frokost, Lunsj, Middag, Mellommåltid) or "Logg mat"
**Then** a sheet opens with the method picker (Søk · Skriv strekkode · Nylig brukt · Manuelt; only Søk is active in this story), the Meal preselected when opened from a Meal row, and the search field focused

**Given** the search field
**When** the user types "mel"
**Then** results include "Havremel"; matching is case-insensitive and "contains"; the user's own and shared items are searched, never other users' items; Open Food Facts is never called while typing
**And** a search with no match shows the message "Ingen treff" with a hint to try another word, never an empty list

**Given** a chosen food item
**When** the user enters an amount in grams
**Then** a live kcal preview is shown (150 g × 63 kcal/100 g → 95 kcal), amounts ≤ 0 g or > 5 000 g are rejected, and "Lagre" stores a `food_log_entries` row with user, date (YYYY-MM-DD), Meal, grams and `kcal_per_100g_snapshot` (AD-6, AD-12)
**And** the sheet closes and the Mat page shows the entry under its Meal with the Meal total and the day total computed by the `food` service, without a page reload

**Given** food data from Matvaretabellen or Open Food Facts is shown
**When** the page renders
**Then** the attribution "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no" and/or "Data fra Open Food Facts" is visible (FR16)
**And** backend tests cover the kcal per entry, per Meal and per date sums (NFR8)

### Story 3.2: Register my own food

As a user whose food is not in the database,
I want to register it myself,
So that I can still log what I ate.

**Covers:** FR12, FR3, AD-4

**Acceptance Criteria:**

**Given** the method picker
**When** the user chooses "Manuelt"
**Then** the "Manuelt" tab in the method picker becomes active, and the no-match message from search (Story 3.1) gains a "Registrer selv" link to the same form

**Given** the "Manuelt" form is opened
**When** it renders
**Then** a form asks for name and kcal per 100 g (required) and protein, carbs, fat and serving size (optional)

**Given** valid values
**When** the user saves
**Then** a `food_items` row is created with source "user" and `owner_id` = the user, and the amount picker opens so the food can be logged right away

**Given** another user
**When** they search or request that food item
**Then** it is never returned (AD-4), proven by a backend test

### Story 3.3: Type a barcode

As a user with a packaged product,
I want to type its barcode and get the product,
So that I do not have to type its nutrition values.

**Covers:** FR9, FR10, NFR5, NFR6, NFR8, UX-DR10, AD-7

**Acceptance Criteria:**

**Given** the `ports/off` interface with a live and a mock adapter selected by `OFF_MODE`
**When** the backend runs tests
**Then** the mock adapter is always used, and it returns fixed answers for at least: a found product, a product without kcal, a not-found code, and an unreachable service
**And** the mock fixtures use real Norwegian barcodes verified on 2026-11-13 (e.g. 7038010000980 TINE Lettmelk, 7039010132435 Stabburet Leverpostei, 7044416013141 AXA Havregryn; see `research/off-dekning-og-acsm-2026-11-10.md`), including 7026450051051 Akasiehonning, whose Open Food Facts value (95 kcal/100 g) is wrong, as an example of bad source data

**Given** the "Skriv strekkode" tab
**When** the user types a code
**Then** codes that are not valid EAN-8 or EAN-13 (length and check digit) get the message to check the number, without calling Open Food Facts

**Given** a valid code
**When** it is looked up
**Then** the `food` service first checks shared items and the user's own items; only if not found does it call Open Food Facts with the app's own User-Agent, staying under 15 lookups per minute, and caches the result as a shared food item
**And** a found product with kcal opens the amount picker

**Given** HTTP 404 from Open Food Facts, a product without kcal, or Open Food Facts unreachable
**When** the lookup finishes
**Then** the user sees "Vi fant ikke denne varen. Vil du registrere den selv?" (or the unreachable message) and a "Registrer selv" button that opens Story 3.2's form with the barcode prefilled; never an empty result or a crash
**And** backend tests cover the not-found path (NFR8)

### Story 3.4: Log a recent food with one tap

As a user who eats the same things often,
I want to re-log a recent food in one tap,
So that logging takes seconds.

**Covers:** FR14, SM-6

**Acceptance Criteria:**

**Given** a user with earlier food logs
**When** they open the sheet
**Then** "Nylig brukt" lists their 10 most recently logged distinct food items, newest first

**Given** the list
**When** the user taps an item
**Then** it is logged with the same amount and Meal as last time (both editable before saving), and logging a recent food takes at most 3 taps from the Daily Overview (SM-6)

**Given** a new user with no logs
**When** they open "Nylig brukt"
**Then** no list is shown, and they are pointed to search

### Story 3.5: Choose servings instead of grams

As a user logging a packaged product,
I want to pick the number of servings,
So that I don't have to weigh it.

**Covers:** FR13, UX-DR7

**Acceptance Criteria:**

**Given** a food item with a serving size
**When** the amount picker opens
**Then** the user can switch between grams and servings, and the preview converts servings to grams and kcal

**Given** a saved entry made with servings
**When** it is stored
**Then** it is stored in grams (servings × serving size), so sums are unchanged

### Story 3.6: Edit or delete a food entry

As a user who made a mistake,
I want to change or remove a logged food,
So that my day's numbers are right.

**Covers:** FR15, FR4, FR3, NFR9, UX-DR11, AD-6

**Acceptance Criteria:**

**Given** a logged entry
**When** the user changes its grams or Meal and saves
**Then** the Meal total and day total update at once without reload (a 63 kcal/100 g item from 150 g to 200 g adds 31.5 kcal); the snapshot is never changed

**Given** a logged entry
**When** the user deletes it
**Then** it disappears at once and an "Angre" toast shows for 5 seconds; pressing it restores the entry; the toast is announced via aria-live and never covers the primary button

**Given** another user's entry
**When** a request tries to change or delete it
**Then** it is rejected with no data returned (FR3)

### Story 3.7: Find Norwegian brand products in search

As a user searching for brand products such as "Tine Lettmelk",
I want search to find Norwegian packaged products too,
So that I don't have to type the barcode for common products.

**Covers:** FR11, FR16, NFR6

**Acceptance Criteria:**

**Given** a documented import command (`python -m app.cli import-off-norway`)
**When** it runs
**Then** it loads Norwegian products from Open Food Facts that have a name and kcal per 100 g into `food_items` as shared items with source Open Food Facts, skipping products already cached, and reports how many were added
**And** the imported data is committed as a seed file so the examiner never needs network access, and the import respects Open Food Facts' terms and attribution

**Given** the imported items
**When** the user searches for "lettmelk"
**Then** Tine and Q products appear among the results

### Story 3.8: Scan a barcode with the camera (Should)

As a user on a device with a camera,
I want to scan a barcode instead of typing it,
So that logging packaged food is faster.

**Covers:** FR8 (Should)

**Acceptance Criteria:**

**Given** a browser that supports camera access on HTTPS or localhost
**When** the user opens "Skriv strekkode"
**Then** a "Skann med kamera" button is shown; otherwise it is hidden and typing remains the path

**Given** a successful scan with Quagga2
**When** a code is read
**Then** it follows exactly the same lookup and not-found path as Story 3.3

**Given** the camera is denied or fails
**When** the user tries to scan
**Then** a message explains it and the number field is shown

## Epic 4: Exercises and equipment

A user saves Equipment Profiles and gets exercise suggestions that fit their equipment, with name search, filters and an exercise detail with video.

### Story 4.1: See an exercise and how to do it

As a beginner,
I want to open an exercise and see a short description and a video,
So that I know how to do it safely.

**Covers:** FR17, FR21, AD-9

**Acceptance Criteria:**

**Given** a fresh database with `APP_ENV=local`
**When** the backend starts
**Then** the seed loads the nine fixed Equipment types, the six Muscle Groups and the exercises from `ovelsesliste.md` (34, plus #35–39 if the group has approved them), each with required Equipment, one primary and 0–2 secondary Muscle Groups (join table with role), Level, Exercise Type (reps/time), Norwegian name, short description and video id
**And** the API offers no way to create, change or delete exercises (AD-9), and the seed has between 30 and 50 exercises

**Given** the exercise list on Trening
**When** the user opens an exercise
**Then** the detail shows name, equipment, muscle groups, level, description and the video embedded from youtube-nocookie.com
**And** if the video cannot load, the text and data still show with "Videoen kan ikke vises nå" and a link to YouTube

**Given** the detail page
**When** it is shown
**Then** a short note says the content is general guidance, not a replacement for a doctor or physiotherapist, and recommends starting light (PRD §6.4)

### Story 4.2: Save my equipment

As a user who trains at home and at the gym,
I want to save my equipment as profiles,
So that I only see exercises I can actually do.

**Covers:** FR18, FR3, AD-9

**Acceptance Criteria:**

**Given** a new user registers
**When** registration completes
**Then** `identity` calls the `exercises` service once, which creates "Hjemme" (bodyweight only) and "Treningssenter" (all equipment) for that user (AD-9)

**Given** the Utstyr section
**When** the user creates, renames, edits (ticks equipment) or deletes an Equipment Profile
**Then** the change is saved, and bodyweight is always included and cannot be unticked

**Given** another user's Equipment Profile
**When** a request tries to read or change it
**Then** no data is returned (FR3)

### Story 4.3: Get exercises that fit my equipment

As a beginner with only some equipment,
I want to see only the exercises I can do with it,
So that I don't waste time on exercises I can't do.

**Covers:** FR19, NFR8, SM-5, UX-DR10

**Acceptance Criteria:**

**Given** the Trening page
**When** the user picks an Equipment Profile in the segmented control
**Then** the list shows only exercises whose required equipment is all in that profile, Beginner first, then Intermediate, then Advanced, and it refreshes at once when the profile changes

**Given** the suggestion rule in the `exercises` service
**When** the unit tests run
**Then** a dumbbell-only profile is not suggested barbell deadlift, and each Equipment Profile in the PRD addendum's coverage table gives exactly the expected exercises (SM-5, NFR8)

**Given** a profile that matches no exercise
**When** the list is empty
**Then** the user sees a message explaining why and what to change, never an empty list

### Story 4.4: Search exercises by name

As a user who knows what they want to do,
I want to search the exercise list by name,
So that I find it quickly.

**Covers:** FR20 (name search)

**Acceptance Criteria:**

**Given** the search field on Trening
**When** the user types part of a name (e.g. "knebøy")
**Then** matching exercises are shown, case-insensitive and "contains", across the whole list, with equipment that does not fit the chosen profile marked

**Given** a search with no match
**When** results are empty
**Then** a message says nothing matched and suggests checking the spelling

### Story 4.5: Choose exercises by muscle group and level (Should)

As a user who wants to train a specific body part,
I want to pick a muscle group from a simple list and filter by level,
So that I find suitable exercises without browsing everything.

**Covers:** FR20 (filters, Should), UX-DR8, UX-DR10

**Acceptance Criteria:**

**Given** the Trening page
**When** the user picks a muscle group from the plain text list (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg) and/or a Level chip
**Then** the suggestions are filtered to exercises where that group is primary or secondary, within the chosen Equipment Profile

**Given** a filter combination with no match (e.g. Kroppsvekt + Skuldre before #35 is approved)
**When** the list would be empty
**Then** the message names the filters that excluded everything and what to change ("Ingen øvelser passer med Kroppsvekt og Skuldre. Prøv en annen muskelgruppe eller legg til utstyr.")
**And** backend tests cover the filter rule with primary and secondary groups

## Epic 5: Workout logging

A user starts a workout, logs set by set while seeing what they did last time, and finishes, edits or deletes it.

### Story 5.1: Start a workout and add exercises

As a user ready to train,
I want to start a workout and add the exercises I will do,
So that I have today's plan in front of me.

**Covers:** FR22, FR3, AD-12

**Acceptance Criteria:**

**Given** the Trening page or "Start økt"
**When** the user starts a workout
**Then** a `workouts` row is created for the chosen date (YYYY-MM-DD, AD-12) and the active workout screen opens

**Given** an active workout
**When** the user adds exercises from the suggestions or from the full list
**Then** each becomes a `workout_exercises` row in the chosen order; the user can reorder and remove them

**Given** another user's workout
**When** a request tries to read or change it
**Then** no data is returned (FR3)

### Story 5.2: Log my sets

As a user doing an exercise,
I want to log each set's reps and weight (or seconds),
So that I have an exact record of what I did.

**Covers:** FR23, FR4, UX-DR9, UX-DR11

**Acceptance Criteria:**

**Given** an exercise is added to the workout
**When** it appears on the active workout screen
**Then** it starts with 3 empty sets suggesting 10 reps (FR23)

**Given** a reps exercise
**When** the user fills in a set
**Then** reps are required and kg is optional (empty means bodyweight); for a time exercise (e.g. planke) seconds are required instead; each set has a done check and is saved as a `sets` row

**Given** a set
**When** the user deletes it
**Then** it is removed at once with an "Angre" toast for 5 seconds (UX-DR11)
**And** removing a whole exercise from the workout removes its sets

### Story 5.3: See what I did last time

As a user trying to progress,
I want to see my sets from the last time I did the same exercise,
So that I know what to beat.

**Covers:** FR24, NFR8, AD-5

**Acceptance Criteria:**

**Given** an exercise the user has logged in an earlier workout
**When** it is shown in today's workout
**Then** "Sist: …" under the name shows the sets from the latest workout before today's date (date, reps × kg or seconds), computed by the `workouts` service

**Given** an exercise never logged before
**When** it is shown
**Then** "Første gang" is shown instead

**Given** the rule's unit tests
**When** they run
**Then** they prove that sets from today's workout are never shown as last time, and that the latest earlier date wins

### Story 5.4: Finish, edit or delete a workout

As a user who has finished training,
I want to finish the workout and fix mistakes later,
So that my training log stays correct.

**Covers:** FR25, FR4

**Acceptance Criteria:**

**Given** an active workout
**When** the user presses "Fullfør økt"
**Then** the workout is marked finished and the user returns to I dag

**Given** a finished workout
**When** the user opens it and edits or deletes sets or exercises
**Then** the changes are saved and later "last time" values use the edited sets

**Given** a finished workout
**When** the user chooses to delete the whole workout
**Then** a confirmation dialog appears first; after confirming, the workout, its exercises and sets are deleted (FR4)

## Epic 6: Daily overview and history

A user sees their day at a glance (kcal remaining, meals, workout) and moves back through earlier days with the week strip.

### Story 6.1: See my day at a glance

As a user checking my day,
I want one screen that shows my calories left, my meals and my workout,
So that I know how the day is going.

**Covers:** FR26, NFR9, NFR11, NFR8, UX-DR4, UX-DR5, AD-5, AD-15

**Acceptance Criteria:**

**Given** the I dag page for a date (today by default)
**When** it loads
**Then** the `overview` service composes, through the owning services only: the stored Calorie Target, kcal eaten, kcal remaining, Food Log Entries grouped by Meal with totals, and that date's workouts with exercises and sets (AD-5)
**And** training adds no kcal to the target, and workouts without sets are not shown

**Given** the day note
**When** kcal remaining is shown
**Then** it is the single large number with one plain sentence ("220 kcal igjen av dagens mål på 1 640"); when negative it shows "120 kcal over" in normal ink with supportive text, never red (UX-DR4)

**Given** the Mat and Trening cards
**When** they render
**Then** each header links to the section for the same date, empty meals show "+ Legg til", exercises show sets and "Sist: …", and the page has at most two primary actions, "Logg mat" and "Start økt" (NFR11, UX-DR5)

**Given** the user logs, edits or deletes food or sets anywhere
**When** the mutation succeeds
**Then** the overview query for that date is invalidated and the numbers update without a page reload (AD-15, NFR9)
**And** backend tests cover kcal eaten and remaining for a date (NFR8)

### Story 6.2: Clear prompts when nothing is logged

As a new user or someone looking at an empty day,
I want short prompts instead of empty tables,
So that I know what to do next.

**Covers:** FR28, UX-DR10

**Acceptance Criteria:**

**Given** a date with no food logged
**When** I dag shows
**Then** the Mat card says "Logg ditt første måltid" with "Logg mat", and the day note shows the full target as remaining

**Given** a date with no workout
**When** I dag shows
**Then** the Trening card says "Start en økt"

**Given** an earlier date with no logs
**When** it is shown
**Then** "Ingenting logget denne dagen." is shown, and logging is still possible

### Story 6.3: Move between days with the week strip (Should)

As a user who wants to look back,
I want to switch days with a week strip and a date picker,
So that I can see and fix earlier days.

**Covers:** FR27 (Should), UX-DR3, UX-DR16

**Acceptance Criteria:**

**Given** the week strip on I dag, Mat and Trening
**When** it renders
**Then** it shows Monday–Sunday with weekday and date, the selected day outlined, and up to two magnets under each past or current day (food logged, workout logged); future days are disabled; ‹ › step a week (UX-DR3)
**And** each day cell has an accessible name such as "tirsdag 10. november, mat logget, trening logget", and ← → move a day when the strip has focus

**Given** the user picks yesterday (or any earlier date from the date picker on Historikk)
**When** the page updates
**Then** it shows only that date's entries and workouts, and anything logged now counts toward that date, not today

**Given** a future date in the URL or a request
**When** it is requested
**Then** it is rejected with a clear message

### Story 6.4: The examiner can test the whole core loop

As the examiner (sensor),
I want seeded demo data and tests for the core loop,
So that I can see every feature working within minutes.

**Covers:** NFR1, NFR3, NFR4, SM-1, UX-DR15, UX-DR16, UX-DR17, AD-16

**Acceptance Criteria:**

**Given** `APP_ENV=local` and an empty database
**When** the app starts
**Then** `seed_if_empty` creates fictional demo users with profiles, equipment profiles, food logs and workouts spread over several earlier dates, and their login details are in the README (NFR4); demo users are never created in production (AD-16)

**Given** the README
**When** the examiner follows it
**Then** one documented command runs all backend tests and one runs the Playwright tests, and both pass

**Given** the Playwright suite
**When** it runs against the Compose stack
**Then** it covers UJ-1 to UJ-4 in Chrome on a desktop viewport: register, consent, profile with target, log food by search and by barcode (mock), start a workout with last time shown, and check the day overview (SM-1)
**And** a check at 360 px width shows no horizontal scrolling on I dag, Mat and Trening

**Given** every page
**When** it loads or opens a sheet
**Then** loading shows skeleton rows for at most about a second (UX-DR17), a "?" help button in the top bar explains the current screen (UX-DR15), focus moves into opened sheets and back on close, Esc closes the top sheet, and toasts are announced via aria-live (UX-DR16)

## Epic 7: Photo calorie estimate (phase 2, only when the core loop is stable)

A Pro user photographs one food item and gets an editable kcal estimate.

### Story 7.1: Pro flag

As a developer preparing phase 2,
I want users to have a Pro flag,
So that the photo feature can be limited to Pro users without any payment.

**Covers:** FR30

**Acceptance Criteria:**

**Given** the `users` table
**When** the migration runs
**Then** each user has `is_pro` (default false); it can only be set in seed data or by a developer, never through the API
**And** the seed creates one fictional Pro demo user

**Given** a user without the Pro flag
**When** they open the photo feature
**Then** they see that it is a Pro feature, and no image is sent anywhere

### Story 7.2: Estimate calories from a photo

As a Pro user,
I want to photograph one food item and get an estimated name and kcal,
So that logging is faster when I don't know the product.

**Covers:** FR29, NFR5, AD-7

**Acceptance Criteria:**

**Given** the `ports/image` interface with a mock and a live adapter selected by `IMAGE_MODE` (default mock)
**When** a photo is sent in mock mode
**Then** the answer is always "Egg, 1 stk, 78 kcal (estimat)", and automated tests only use the mock

**Given** live mode
**When** the user is about to send a photo
**Then** they are told first that the photo is sent to an external service; the photo is not stored after the estimate
**And** each Pro user can make at most 20 photo calls per day

**Given** an estimate
**When** it is shown
**Then** it is always labelled "estimat", and the user can correct name, amount and kcal before saving it as a normal food log entry

**Given** the call fails, returns no kcal, or takes more than 15 seconds
**When** the user waits
**Then** a message is shown and the user can register the food manually (Story 3.2)
**And** a reference test with 3 test photos of known kcal content is documented
