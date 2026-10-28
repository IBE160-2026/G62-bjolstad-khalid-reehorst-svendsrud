# Digest: hosted auth-as-a-service — round 1

**Bottom line:** Category does NOT fail the hard gate outright, but only Supabase clears it comfortably, Firebase clears it with caveats, and Clerk/Auth0 fail it.

- **Supabase**: genuinely viable. `supabase start` via Docker runs the full stack (incl. Auth) fully locally, generates its own throwaway local keys (not live secrets), markets "offline work" as a feature. Setup: install Docker + Supabase CLI, run two commands — realistic for a 15-20 min README, though Docker Desktop's own install/first-run time can eat into that budget on a cold machine.
- **Firebase**: genuinely viable via "demo projects" in the Local Emulator Suite — official docs say you can run emulators "without ever creating a Firebase project." Lighter than Supabase (no Docker, just Node-based firebase-tools). Caveat: if a client isn't explicitly pointed at the emulator, it silently falls back to hitting live production.
- **Clerk**: does NOT have a genuine local/offline mode — its "accountless" flow still calls Clerk's servers once to provision dev keys and routes all auth traffic through Clerk's hosted API even in "development." Fails the "no network call to vendor" constraint.
- **Auth0**: no official local/offline mode found at all; only unofficial third-party simulators/mocks exist.

## Q1: Genuine local/offline mode?

1. claim: Supabase's CLI local-dev stack lists "Offline work: You can continue development even without an internet connection" as a feature; a container manager (Docker Desktop/OrbStack/Rancher/Podman) is the prerequisite for `supabase start`, which spins up the whole stack (incl. Auth/GoTrue) via Docker Compose.
   source: supabase.com/docs/guides/local-development — confidence: high — class: primary/official docs
2. claim: `supabase start` generates its own local anon/service_role (or publishable) API keys on the fly — not live production secrets, safe for a git-ignored `.env.local`.
   source: supabase.com/docs/guides/local-development + corroborating third-party guides — confidence: medium — class: mixed
3. claim: Firebase's Local Emulator Suite supports "demo" projects with "no real Firebase configuration and no live resources," explicitly to allow "easier setup, since you can run the emulators without ever creating a Firebase project." Demo project IDs use a fixed `demo-` prefix.
   source: firebase.google.com/docs/emulator-suite/connect_auth — confidence: high — class: primary/official docs
4. claim: Firebase's own docs warn "your app will still continue to communicate with production Firebase services when emulators are not available or configured" — local mode is opt-in per-SDK-call (`connectAuthEmulator`), not a hard offline guarantee; a misconfigured client silently falls back to live cloud.
   source: firebase.google.com/docs/emulator-suite — confidence: high — class: primary/official docs
5. claim: Clerk has an "accountless" quick-start (`npx clerk@latest init`) for Next.js that skips manual dashboard signup and writes dev keys automatically — but this command itself calls Clerk's servers to provision keys, and Clerk's SDKs always talk to Clerk's hosted API (api.clerk.com) even in development. No official fully-offline mode found.
   source: clerk.com/blog/accountless-setup-clerk-init-nextjs — confidence: medium — class: primary (vendor blog, not a dedicated "local mode" doc)
6. claim: Auth0 has no official offline/local development mode. Auth0 Community threads show users asking for this with no confirmed official answer; only unofficial third-party tools (@simulacrum/auth0-simulator npm package, localauth0 Docker-based mock tenant) exist.
   source: community.auth0.com thread; github.com/primait/localauth0 — confidence: medium — class: secondary, community/unofficial, no official Auth0 doc found

## Q2: Setup cost/complexity for a 15-20 min grader README

7. claim: Supabase local requires Docker-compatible container runtime (Docker Desktop, OrbStack, Rancher Desktop, or Podman) plus the Supabase CLI, then `supabase start`, orchestrating multiple containers.
   source: supabase.com/docs/guides/local-development — confidence: high — class: primary
8. claim: Firebase emulator setup for a demo project needs the Firebase CLI (Node-based, no Docker) and `firebase emulators:start`; whether `firebase login` (a Google account) is strictly required even for demo-only use was NOT confirmed from official docs this session — community guides list it as routine but don't explain if it's technically mandatory.
   source: firebase.google.com/docs/emulator-suite/connect_auth + gap — confidence: low, unresolved gap flagged
9. claim: Supabase's Docker-based stack is heavier (multiple containers, ~1-2GB+ download, Docker required on all 3 OSes) vs. Firebase's Node-CLI-only emulator (no Docker). Neither vendor gives a time estimate for a grader README.
   source: unverified belief / inference from setup steps, not a sourced claim — confidence: low

## Q3: Risks of using the live cloud free tier for a graded submission

10. claim: Supabase's official docs state a Free-plan project "is considered inactive if it does not receive sufficient user database activity over the past week" and will be paused; paused projects can be restored "for up to 1 year after it was paused," tied to backup retention — exact permanent-deletion timeline after that window not stated on the page retrieved.
    source: supabase.com/docs/guides/platform/free-project-pausing — confidence: high (pause mechanism) / low (deletion timeline, not found)
11. claim: A paused Supabase project freezes the database volume (no reads/writes/connections) until manually restored from the dashboard — a direct failure mode for a grader trying to log in if the project went inactive over a weekend/break.
    source: simplebackups.com/blog/recover-paused-supabase-project (secondary, corroborating official pause page) — confidence: medium
12. claim: Committing live API keys/secrets to a public repo (vs. `.env`/`.env.example` patterns) is a standard, vendor-agnostic risk for any cloud-only service.
    source: unverified belief / general security practice, not vendor-specific — confidence: low

## Q4: Seeding known test users for grading

13. claim: Supabase's CLI runs `supabase/seed.sql` automatically on `supabase db reset`; third-party guides show two patterns — a minimal insert directly into `auth.users` (bypasses real auth, "test users" only) or a full pattern using pgcrypto to hash passwords plus a matching row in `auth.identities` so the seeded user can actually log in via email+password.
    source: dev.to/paullaros seeding guide (secondary) + supabase.com/docs/guides/local-development/cli-workflows (official, confirms seed.sql mechanism) — confidence: medium — class: mixed
14. claim: A Supabase GitHub discussion ("Can't seed or signup auth users locally," #9251) reports real friction/errors seeding auth users locally; resolution status not visible in the search snippet retrieved.
    source: github.com/orgs/supabase/discussions/9251 — confidence: low — class: primary but unresolved, flagged as risk
15. claim: Firebase's emulator supports `--import=<dir>` / `--export-on-exit` to persist/reload a full Auth-emulator data snapshot (incl. users) across restarts; `firebase emulators:exec` can run a Node seed script using the Admin SDK against running emulators.
    source: egghead.io lesson (secondary), corroborated generally by official emulator docs' import/export mention — confidence: medium, not fully pinned to one official page
16. claim: `firebase auth:import users.json` is documented in general guides as a live-project operation, not confirmed as emulator-only (`--import` at emulator start is the emulator-specific mechanism, distinct command).
    source: search synthesis, no single official doc page confirming the distinction fetched directly — confidence: low, gap

## Could not find
- Official Firebase statement on whether `firebase login` is mandatory before `firebase emulators:start` against a demo project.
- An official Firebase doc directly contrasting `auth:import` (live) vs. emulator `--import`/`--export-on-exit` (emulator-only) in one place.
- Any official Auth0 statement acknowledging or ruling out a local/offline dev mode — only unanswered community-forum questions and third-party simulators.
- Supabase's exact "permanently deleted after X" timeline beyond the 1-year paused-project restore window.
- Vendor-specific (vs. generic) data on these 4 services' keys/secrets actually leaking in public student repos.
