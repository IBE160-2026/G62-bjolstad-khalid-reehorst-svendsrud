# Digest: self-hosted auth library/middleware — round 1

**Bottom line:** NOT clearly a meaningfully easier/safer default for this scope. Every library examined (Flask-Login, Devise, Auth.js/Better Auth) explicitly leaves CSRF protection to the developer, and the "library tax" (config model, adapters, required fields like Devise's confirmed_at) is paid regardless. Strongest outside signal: Lucia Auth's own author deprecated the library in Oct 2024, concluding teaching roll-your-own was better than maintaining a thin library for this kind of scope. Framework not being chosen yet cuts against pre-committing to a specific library now — but the CATEGORY (self-hosted library, free, local) does satisfy the no-paid-account/local-run constraint across every ecosystem checked.

## Q1: What libraries handle vs. leave to you

1. claim: Flask-Login handles login/logout/remember-me/session-protection and `login_required`, but is explicitly "not bound to any particular database system or permissions model" — no registration, account recovery, or fine-grained permissions.
   source: flask-login.readthedocs.io (official docs) — confidence: high — class: primary
2. claim: Flask-Login provides no CSRF protection; Flask itself has none built-in either — commonly added via Flask-WTF's CSRFProtect.
   source: drdroid.io + Flask-WTF docs — confidence: medium — class: secondary (official doc's silence on CSRF is itself evidence of the gap)
3. claim: Devise (Rails) handles hashing/storage, session helpers via Warden, inactivity timeout, lockout, and email confirmation/password-reset flows — but email confirmation (Confirmable) is NOT active by default, requires explicit model/migration changes.
   source: github.com/heartcombo/devise README — confidence: high — class: primary
4. claim: Devise's README doesn't describe CSRF protection as its own feature; that comes from Rails itself.
   source: github.com/heartcombo/devise README — confidence: medium — class: primary, absence-of-claim finding
5. claim: Auth.js's Credentials provider only wires a developer's own `authorize` function; it explicitly does NOT persist credential-authenticated users, and leaves password management/security and abuse detection to the developer ("gives you full control to do so").
   source: authjs.dev/getting-started/providers/credentials — confidence: high — class: primary
6. claim: Better Auth (Auth.js's actively maintained successor) hashes with scrypt by default (overridable), stores sessions as HTTP-only cookies with session data in the developer's own database by default; optional stateless mode exists.
   source: better-auth.com/docs/reference/security — confidence: high — class: primary

## Q2: Learning-curve/setup cost

7. claim: Lucia Auth (comparable thin TS library) was deprecated by its maintainer starting Oct 2024 specifically because trying to handle every use case created friction; the project pivoted to being a from-scratch implementation guide rather than a library to adopt.
   source: DEV Community + Reddit r/nextjs threads on the deprecation; v3.lucia-auth.com/upgrade-v3 migration guide — confidence: medium (community reporting, corroborated by the official migration guide) — **strongest signal in this dimension**
8. claim: Lucia v3's own migration guide states the library no longer provides strict CSRF protection — teams must implement it themselves regardless.
   source: v3.lucia-auth.com/upgrade-v3 — confidence: medium — class: primary
9. claim: Vendor estimate (Clerk, a commercial auth vendor with incentive to favor "buy"): basic email+password auth takes ~2-4 weeks for one senior developer to build from scratch; same source concedes a learning project/throwaway prototype is where building can be justified.
   source: clerk.com/articles/build-vs-buy-authentication — confidence: low-medium, vendor bias flagged — class: secondary
10. claim: Community consensus: for toy/educational/small projects, rolling your own is commonly recommended specifically because it has no extra learning curve beyond what's needed, whereas general-purpose library abstractions (adapters, provider configs, lifecycle hooks) must be learned regardless of project size.
    source: aggregated Reddit/forum/blog commentary (logto.io, hackernoon, forum.codeigniter.com) — confidence: low, aggregated opinion not a controlled study

## Q3: External paid services / API keys required by default?

11. claim: Auth.js's Credentials provider needs no third-party API keys for email+password; the only required secret is a self-generated AUTH_SECRET. Provider-specific secrets only apply if OAuth providers are added.
    source: authjs.dev — confidence: high — class: primary
12. claim: Auth.js docs now carry a banner stating the project "is now part of Better Auth" (footer: "Better Auth Inc. - 2026") — long-term maintenance status is in flux; adopting it today means adopting a project mid-transition to a commercial entity's ecosystem, though no paid tier is required for self-hosted basic use.
    source: authjs.dev page banner/footer — confidence: high — class: primary
13. claim: Better Auth can run fully against a self-hosted database (e.g. Postgres via Drizzle/Prisma) with no external network calls required for basic email+password; a stateless mode exists but isn't required.
    source: better-auth.com (via search snippet, not full direct fetch) — confidence: medium — recommend direct verification before relying on it
14. claim: Flask-Login and Devise require no external service by design — in-process libraries operating against whatever DB/session store the app already uses. No evidence of API keys or paid accounts needed for core login/session functionality.
    source: flask-login.readthedocs.io; github.com/heartcombo/devise README — confidence: high — class: primary, absence-of-requirement

## Q4: Seeding test users — easier or harder through a library?

15. claim: Devise's README doesn't document a seeding/programmatic-creation path at all (no db/seeds.rb, User.create, or Rails console mentioned) — only sign_in/sign_out test helpers for use inside tests, not for provisioning known credentials before grading.
    source: github.com/heartcombo/devise README — confidence: high — class: primary, absence-of-documentation finding
16. claim: Real risk seeding through Devise: if Confirmable (email verification) is enabled, directly created users may not be auto-confirmed; the README doesn't clarify whether validations/confirmation apply to directly-created records — teams commonly resolve this via community (non-official) guidance.
    source: inferred from gaps in the Devise README — confidence: medium — class: gap identification
17. claim: Django's ecosystem (comparison point, built-in not 3rd-party) commonly seeds test users via fixtures or scripted createsuperuser calls reading DJANGO_SUPERUSER_* env vars; factory_boy recommended for frequently-changing test data.
    source: aggregated community tutorials + pytest-django docs — confidence: low-medium, practitioner consensus not Django's own official tutorial
18. claim: A hand-rolled auth system has no library-imposed user-creation flow (no confirmation flags, no required validations beyond what's written) — a team can insert known test credentials directly or via a trivial seed script with full control over hashing.
    source: inferred from Q1 findings on Devise's Confirmable requirements — confidence: medium — class: inference, flagged as reasoned conclusion not independently verified

## Catch to flag
Whichever framework is picked, verify the CSRF story specifically (the one gap common to every library found); if a library with email-confirmation is adopted, either seed users with confirmation pre-set or disable that feature for v1 to avoid seeded test accounts silently failing login during grading.

## Could not find
- Django's own official docs directly (relied on community tutorials for the seeding comparison).
- A controlled/empirical study comparing actual developer-hours for library vs. roll-your-own on a small v1 scope — all estimates are vendor-sourced (incentive to favor "buy") or informal opinion.
- Direct fetch of Better Auth's database/adapters page (only via search summary) — recommend verifying directly before committing.
- Any primary source describing a RECOMMENDED/sanctioned seeding pattern from any library's own docs — this absence is itself a finding.
