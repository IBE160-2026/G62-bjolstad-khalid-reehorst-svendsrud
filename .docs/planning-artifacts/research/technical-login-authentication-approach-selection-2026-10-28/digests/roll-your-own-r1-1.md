# Digest: Roll-your-own email+password auth — round 1

**Bottom line:** Reasonable choice given the hard constraints (local-only, no paid services) — a well-documented, boundable problem per OWASP's own cheat sheets, not exotic. Minimum safe bar: bcrypt/argon2id hashing (library-handled salting), server-side sessions with CSPRNG IDs + HttpOnly/Secure/SameSite cookies (not JWT-in-localStorage), generic error messages + per-account rate limiting, environment-gated seed script. Bounded day-ish of work for a small team — the real risk is skipping sessions/rate-limiting (OWASP A07), not password hashing itself.

## Q1: Minimal competent requirements

1. claim: OWASP's preferred password-hashing algorithm is Argon2id (m=19MiB, t=2, p=1 or equivalent); scrypt and bcrypt (work factor ≥10) are acceptable fallbacks; fast hashes like plain SHA-256 are unsuitable.
   source: OWASP Password Storage Cheat Sheet — confidence: high — class: primary
2. claim: bcrypt silently truncates passwords at 72 bytes (must cap input length); feeding a fast pre-hash into bcrypt is discouraged ("password shucking" risk) unless via HMAC with a pepper.
   source: OWASP Password Storage Cheat Sheet — confidence: high
3. claim: Every password needs a unique random per-user salt; modern hashing libraries (bcrypt/argon2) handle this automatically — no need to hand-build salting.
   source: OWASP Password Storage Cheat Sheet — confidence: high
4. claim: Server-side sessions: session ID should be a meaningless random identifier ≥64 bits entropy (≥128 bits recommended) from a CSPRNG, stored only as a hash server-side; all session meaning lives server-side, enabling real invalidation on logout/privilege change.
   source: OWASP Session Management Cheat Sheet — confidence: high
5. claim: JWTs/session tokens must not be stored in localStorage/sessionStorage (XSS-readable); prefer HttpOnly+Secure+SameSite cookies. OWASP doesn't present JWT as a recommended alternative to server-side sessions and flags revocation as an open problem for stateless tokens.
   source: OWASP Session Management Cheat Sheet — confidence: medium-high
6. claim: Session cookies need Secure, HttpOnly, SameSite=Strict (or Lax); use __Host- prefix, no Domain attribute, Path=/.
   source: OWASP Session Management Cheat Sheet — confidence: high

## Q2: Common student/hobbyist mistakes

7. claim: OWASP Top 10 A07:2021 "Identification and Authentication Failures" covers weak password storage, missing rate limiting/brute-force protection, session IDs not rotated after login or not invalidated on logout, credential stuffing, account enumeration via differing responses.
   source: OWASP Top 10 — A07:2021 — pub_date: 2021 edition, still current — confidence: high
8. claim: Login throttling should count failures per-account not per-IP (IP-only is trivially evaded); exponential backoff capped after 2-3 escalations; lockouts must never block the password-reset path; log/review auth failures.
   source: OWASP Authentication Cheat Sheet — confidence: high
9. claim: Use one generic error message for bad username/password/disabled-account, identical HTTP status and timing, to avoid account enumeration.
   source: OWASP Authentication Cheat Sheet — confidence: high
10. claim: Practitioner consensus: "temporary" hand-rolled auth tends to stay in production for years; most common real-world failures are no rate limiting, predictable password resets, sessions that never expire.
    source: CloudBees blog / dev.to pitfalls writeup — confidence: medium — class: secondary, corroborates OWASP A07

## Q3: Code/complexity for a minimal lift

- No authoritative LOC/time-estimate source found (gap).
11. claim: A register/login/logout flow using bcrypt + a user table + server-side sessions is commonly implemented as a short, self-contained module (tutorials/skeletons ~100-300 lines), bcrypt handling salting/hashing so app code is mostly plumbing.
    source: node-auth-skeleton repo, freeCodeCamp/Honeybadger bcrypt tutorials — confidence: low — illustrative examples only, not a measured benchmark
- Unverified belief (not sourced): for a 1-2 week course sprint, hashing+sessions+rate-limiting+cookie-flags correctly is bounded (roughly a day of focused work), not a multi-week sink — the assistant's own estimate, flagged as such.

## Q4: Seeding test users

12. claim: Seed scripts/accounts should be gated so they only run in dev/local/test environments, never invoked in production deploys.
    source: Rails seeding guidance / test-account-safety pages (MITRE Vulcan, community Rails docs) — confidence: medium
13. claim: Dev/test seed accounts should be clearly flagged (e.g. an is_test_user column) for audit/removal, use generated or env-var-sourced passwords rather than hardcoded production-shaped secrets, and a pre-production checklist should delete test users, change default passwords, strip the seed script from production builds.
    source: community dev.to writeups on test-account management — confidence: medium — only one corroborating source class, not independently double-sourced
- No OWASP-tier primary source specifically on "seeded test users for grading" found — gap, practitioner consensus only.

## Could not find
- Authoritative LOC/time-complexity benchmark for minimal roll-your-own auth.
- OWASP-tier primary source specifically on seeding test/grading credentials.
- The OWASP JWT Cheat Sheet's own current text directly (site fetch didn't surface it) — JWT pitfalls sourced from Session Management Cheat Sheet's cookie/storage guidance plus secondary pentest writeups instead.
