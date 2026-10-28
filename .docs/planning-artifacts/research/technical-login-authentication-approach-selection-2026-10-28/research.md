---
title: 'technical research: login/authentication approach selection'
type: 'technical'
topic: 'Login/authentication approach for Prompt Force (v1, seeded test users, no paid accounts)'
decision: 'Which login/authentication APPROACH CATEGORY Prompt Force should use for v1 — the tech stack is not yet chosen, so this evaluates categories, not specific libraries'
source: 'native run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-10-28'
updated: '2026-10-28'
claims_verified: 8
claims_unverified: 2
claims_disputed: 0
claims_overturned: 0
---

# technical research: login/authentication approach selection

**Decision this research serves:** Which login/authentication approach category Prompt Force should use for v1 (email+password with seeded test users, per the prep doc's existing lean) — roll-your-own, a stack-appropriate library, or a hosted auth-as-a-service.

**Decision shape:** select (3 approach categories, not specific libraries — the tech stack itself is not yet chosen).

## Executive summary

**Pick: roll-your-own email+password**, following OWASP's own checklist, as the v1 default — with the specific recommendation to carry this decision as explicit, checkable acceptance criteria into the PRD/architecture doc rather than leaving it implicit.

This is not the obvious "easy" answer, and the research doesn't treat it as one: OWASP's own cheat sheets make the security bar well-documented and bounded (bcrypt/argon2id hashing, server-side sessions, per-account rate limiting, generic error messages) [1][2][3] — a day-ish of focused work for a small team, not a research problem. The real risk is skipping the session/rate-limiting steps under deadline pressure, not password hashing itself, since that part is "just call a library function" [3].

**The auth-library category is not a clear win for this scope — the strongest evidence against it comes from inside the category itself.** Lucia Auth, a well-regarded thin TypeScript auth library directly comparable to what the team might reach for, is reported (community sources, medium confidence, not confirmed against an official dated announcement) to have been deprecated by its maintainer around October 2024 in favor of teaching developers to implement auth from scratch. What's directly confirmed from Lucia's own current docs is narrower: the library itself now states it no longer provides strict CSRF protection [5]. Every library actually checked (Flask-Login, Devise, Auth.js/Better Auth) explicitly leaves CSRF protection to the developer [6], and every one of them locks the team into a specific backend framework — a real cost given the team hasn't chosen a stack yet [6].

**Hosted auth-as-a-service is a genuine, viable runner-up — but only half the category clears the hard gate.** Supabase's local CLI stack runs its full Auth service offline via Docker with throwaway local keys, and Firebase's Emulator Suite supports fully offline "demo projects" — both confirmed directly against the vendors' own docs [7][8]. Clerk and Auth0 do not have a genuine local/offline mode and fail the "no paid account, runs locally" constraint outright [9]. Even for Supabase/Firebase, setup (Docker, CLI, a documented seeding-friction GitHub issue) eats into a grader's 15–20 minute README budget more than roll-your-own does [7][10].

## Requirements frame

*(From the project — brief.md and the pre-PRD prep doc — not from research, per the select-shape method.)*

**Hard gates:** runnable locally per README with no paid accounts; `.env.example` with no real secrets; supports seeded test users for grading/testing; external calls isolated/mockable if any exist.

**Weighted preferences:** implementation security risk for a student team (high) · setup/learning-curve cost given the stack isn't chosen yet (high) · framework flexibility — doesn't lock in a stack choice (medium) · long-term maintenance burden (medium-low, v1-scoped course project).

## Candidate screen

| Candidate | Hard gates | Verdict |
|---|---|---|
| Roll-your-own email+password | Pass | Carried to finalist comparison |
| Self-hosted auth library/middleware | Pass (category) | Carried, but locked to a framework not yet chosen |
| Hosted auth-as-a-service — Supabase/Firebase | Pass, via local/offline mode | Carried |
| Hosted auth-as-a-service — Clerk/Auth0 | **Fails** — no genuine local/offline mode | **Cut within-category** — always calls the vendor's live API |

## Evidence per candidate

### Roll-your-own email+password

OWASP's Password Storage Cheat Sheet specifies Argon2id (or bcrypt work factor ≥10 / scrypt) for hashing, with per-user salting handled automatically by the library — not something the team needs to hand-build [1]. The Session Management Cheat Sheet warns against storing session identifiers/JWTs in localStorage and recommends a CSPRNG-generated session ID (≥128 bits for custom IDs) in an HttpOnly/Secure/SameSite cookie instead [2] — it does not itself frame this as a direct JWT-vs-server-session comparison or discuss JWT revocation specifically; that framing came from this research's own synthesis across sources, not a single cited claim. OWASP's Top 10 A07:2021 category and its Authentication Cheat Sheet identify the actual common failure modes — missing per-account rate limiting and account-enumeration via inconsistent error messages — not password hashing itself [3]. No authoritative time/complexity benchmark exists, but illustrative tutorials put a minimal register/login/logout flow at roughly 100–300 lines, with the hashing library doing most of the heavy lifting [4]. Seeding test users has no OWASP-tier guidance specifically, but the practical pattern — an environment-gated, clearly flagged seed script — carries no library-imposed constraints (no confirmation flags to satisfy, unlike some libraries below) [4].

### Self-hosted auth library/middleware

Checked across ecosystems: Flask-Login (Python) handles login/logout/session-protection but explicitly isn't bound to a database or permissions model, and provides no CSRF protection [6]. Devise (Ruby/Rails) handles hashing, sessions, lockout, and optional email confirmation — but Confirmable isn't active by default, and its own README documents no sanctioned path for seeding test users, creating a real trap where directly-created seed accounts may not be treated as confirmed [6]. Auth.js's Credentials provider explicitly does not persist users or handle password security — "gives you full control to do so" — and its own docs now carry a footer noting the project "is now part of Better Auth," signaling the library is mid-transition to a commercial entity's ecosystem [6].

**The strongest evidence in this whole research run comes from inside this category**: community reporting (Reddit/DEV Community, medium confidence — not independently confirmed against an official Lucia announcement with a date) describes Lucia Auth's maintainer deprecating the library around October 2024 in favor of teaching people to implement auth from scratch. What is directly confirmed, from Lucia's own v3 migration guide, is narrower but still telling: the library itself states it "no longer provides strict CSRF protection," pushing that responsibility back onto the developer even within the library's own current guidance [5]. Every library checked pays a config/adapter learning cost regardless of project size, and every one of them is coupled to a specific framework the team hasn't chosen yet — meaning the actual library pick cannot happen until the stack is decided in the architecture phase, as the prep doc itself already anticipated.

### Hosted auth-as-a-service

Four vendors were checked against the hard local/offline constraint, directly against each vendor's own documentation rather than assumed from reputation. **Supabase** clears it comfortably: `supabase start` runs the entire stack, including Auth, via Docker, and Supabase's own docs explicitly market "offline work: you can continue development even without an internet connection" [7] (the detail that this generates throwaway local keys distinct from production secrets is corroborated by third-party guides rather than this specific page — flagged as medium, not directly confirmed on Supabase's own local-development page). **Firebase** also clears it: the Local Emulator Suite supports "demo" projects explicitly designed to run "without ever creating a Firebase project" — though Firebase's own docs warn that a misconfigured client silently falls back to live production if not explicitly pointed at the emulator [8]. **Clerk** and **Auth0** do not clear it: Clerk's "accountless" quick-start still calls Clerk's servers to provision dev keys and routes all auth traffic through its hosted API even in development; Auth0 has no official local/offline mode at all, only unofficial third-party simulators [9].

For the two viable vendors, real costs were found: Supabase's local stack needs Docker (a heavier, multi-container, ~1–2GB+ install) [10], and seeding a real email+password-capable test user (not just a bare database row) needs a `pgcrypto` + `auth.identities` pattern more involved than a beginner README typically covers, with at least one open GitHub issue reporting friction doing exactly this [11]. If the team used the live cloud free tier instead of local mode, Supabase's own docs confirm free projects auto-pause after roughly a week of inactivity, a real risk for a grader opening the repo after a gap [12].

## Decision matrix

Scored 1 (weak) – 3 (strong) per criterion, weighted per the requirements frame (security risk ×3, setup/learning-curve ×3, framework flexibility ×2, maintenance burden ×1 — max 25). Clerk/Auth0 excluded (cut at the hard-gate screen); "Hosted service" below reflects the Supabase/Firebase variant only.

| Criterion (weight) | Roll-your-own | Auth library | Hosted (Supabase/Firebase) |
|---|---|---|---|
| Security risk (×3) | 2 — well-documented, on the team to execute | 2 — CSRF still on you regardless; no payoff per Lucia's own author | 3 — vendor-maintained security surface |
| Setup/learning-curve (×3) | 3 — no library API to learn, stack-independent | 1 — library config cost *and* coupled to an unchosen framework | 2 — Docker/CLI setup, documented seeding friction |
| Framework flexibility (×2) | 3 — fully stack-independent | 1 — locked to whichever framework is chosen | 2 — client SDKs span several frontend frameworks |
| Maintenance burden (×1) | 2 — fully owned, no deprecation risk | 1 — real precedent of project instability (Lucia, Auth.js transition) | 3 — vendor-maintained |
| **Weighted total /25** | **23** | **12** | **22** |

Roll-your-own and the Supabase/Firebase hosted option are close; the auth-library category is clearly behind, driven mainly by its unresolved framework coupling and the Lucia precedent. Re-weight freely — if the team ends up choosing a stack where a specific library is unusually strong (e.g. Django's own built-in, mature and well-documented, wasn't separately evaluated here as a full candidate), that could change the library row's score.

## Verdict

**Pick: roll-your-own email+password**, built to OWASP's Authentication, Password Storage, and Session Management Cheat Sheets. **Runner-up: hosted auth-as-a-service via Supabase or Firebase's local/offline mode** — genuinely close, and worth revisiting once the stack is chosen, especially if the team ends up using Supabase/Postgres for the rest of the data layer anyway (not yet decided). **Not recommended as a default right now: a generic self-hosted auth library** — not because the category is bad, but because the specific library choice is coupled to a framework decision that hasn't happened yet, and the one library directly comparable in scope (Lucia) is reported to have been deprecated by its own author for exactly this kind of use case (community-sourced, not independently confirmed against an official announcement).

**Strongest argument against the pick:** the real risk with roll-your-own isn't password hashing — it's a team under deadline pressure skipping the less-visible steps (per-account rate limiting, generic error messages, proper cookie flags) precisely because no library enforces them as defaults. Mitigation: carry the OWASP checklist items from this report into the PRD/architecture doc as explicit, checkable acceptance criteria, not an implicit assumption.

**Cheapest reversibility hedge:** isolate auth behind a small service interface (e.g. `authService.login()/register()/logout()`) so that swapping to Supabase/Firebase local auth later — if the stack choice makes that attractive — costs an implementation change behind that seam, not a rewrite of routes or UI.

## Open questions

- **Which specific library (if any) makes sense once the stack is chosen?** Deferred by design — this research evaluated the category, not a pick, consistent with the prep doc's own note that this needs the architecture phase.
- **Does Django's built-in auth system change the library category's score?** Not separately evaluated as its own candidate this session (only used as a seeding-pattern comparison point) — if Django becomes the chosen backend, its first-party auth (distinct from the 3rd-party libraries checked) may be worth a focused look rather than being folded into the generic "library" score above.
- **Is `firebase login` (a Google account) strictly required to run emulator-only demo projects?** Not confirmed from official docs this session — would change Firebase's standing if a Google account turns out to be a hard requirement even for local-only use.
- **What's Supabase's exact data-deletion timeline** after the 1-year paused-project restore window, if the team ever relies on the live free tier instead of local mode? Not stated on the page retrieved.
- **Is there a recommended, sanctioned pattern for seeding real (not bare-row) test users** in any of these systems? No library or vendor's own docs were found directly addressing this — it's a gap across every candidate, not specific to one.

## Source appendix

| # | Source | Publisher | Pub. date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | OWASP Foundation | undated, live page | 2026-10-28 | high |
| [2] | [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | OWASP | undated, live page | 2026-10-28 | high |
| [3] | [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) + OWASP Top 10 — A07:2021 | OWASP | 2021 edition, still current | 2026-10-28 | high |
| [4] | node-auth-skeleton repo + freeCodeCamp/Honeybadger bcrypt tutorials (illustrative examples, no single canonical URL) | GitHub community; freeCodeCamp; Honeybadger | undated | 2026-10-28 | low (illustrative only) |
| [5] | [Lucia Auth — v3 migration guide](https://v3.lucia-auth.com/upgrade-v3) (CSRF change confirmed); deprecation narrative via DEV Community/Reddit (not independently confirmed with a date) | v3.lucia-auth.com (primary) + community reporting (secondary) | Oct 2024 (community-reported, unconfirmed on the primary page) | 2026-10-28 | medium |
| [6] | [Flask-Login docs](https://flask-login.readthedocs.io/); [Devise README](https://github.com/heartcombo/devise); [Auth.js docs](https://authjs.dev/getting-started/providers/credentials) | respective maintainers | undated | 2026-10-28 | high |
| [7] | [Supabase — local development docs](https://supabase.com/docs/guides/local-development) | Supabase | undated, live page | 2026-10-28 | high |
| [8] | [Firebase — Local Emulator Suite docs](https://firebase.google.com/docs/emulator-suite/connect_auth) | Google/Firebase | undated, live page | 2026-10-28 | high |
| [9] | [Clerk accountless-setup blog](https://clerk.com/blog/accountless-setup-clerk-init-nextjs); Auth0 Community thread + [localauth0](https://github.com/primait/localauth0) | Clerk; Auth0 Community (unofficial); GitHub | undated | 2026-10-28 | medium |
| [10] | [Supabase local-development docs](https://supabase.com/docs/guides/local-development) (Docker prerequisite) | Supabase | undated | 2026-10-28 | high |
| [11] | dev.to seeding guide; [Supabase GitHub discussion #9251](https://github.com/orgs/supabase/discussions/9251) | DEV Community; Supabase GitHub | undated | 2026-10-28 | low-medium |
| [12] | [Supabase — free-project-pausing docs](https://supabase.com/docs/guides/platform/free-project-pausing) | Supabase | undated, live page | 2026-10-28 | high |

## Staleness map

This pack's freshness bar for version/compatibility claims: ≤ 1 month. Every vendor/library-specific claim in this report (refs [5]–[12]) should be re-checked within a month if this decision sits unacted-on, since local-dev-mode availability, deprecation status, and pricing-tier behavior are exactly the facts most likely to change. The OWASP guidance (refs [1]–[3]) is comparatively stable. The single highest-value re-check, if the team revisits this: whether Clerk or Auth0 have since added a genuine local/offline mode — that would change the hosted-service candidate's standing meaningfully.
