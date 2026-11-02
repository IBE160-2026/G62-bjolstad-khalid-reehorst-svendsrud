# Addendum: Prompt Force PRD

Technical detail and background that the architecture and stories need, but that does not belong in the PRD itself. Sources are the research documents in `.docs/planning-artifacts/research/`.

## A. Suggested data model (input to architecture)

```
User ─1:1─ Profile
User ─1:N─ EquipmentProfile >─N:M─< Equipment
User ─1:N─ FoodLogEntry >─N:1─ FoodItem   (FoodItem: source = OFF | Matvaretabellen | user; owner_id only for user-created)
User ─1:N─ Workout ─1:N─ WorkoutExercise >─N:1─ Exercise ─N:M─ Equipment
                         WorkoutExercise ─1:N─ Set (set_no, reps, weight_kg, seconds)
```

- `Exercise.type` = reps | time, so plank can be logged in seconds.
- "Last time" (FR-24) = latest Set rows for the same user and exercise before the current workout.
- `User.consent_at` (FR-2), `User.deleted_at` for soft delete (FR-4), `User.is_pro` (phase 2).

## B. Barcode scanning

- Recommended library: **Quagga2** (`@ericblade/quagga2`): actively maintained, has a camera pipeline. Not proven on iOS Safari, so the mobile spike decides.
- Cut: native `BarcodeDetector` (off by default in iOS Safari). html5-qrcode has a confirmed iOS accuracy problem.
- Camera needs HTTPS or localhost; testing on a phone against a dev server needs a tunnel or a self-signed certificate.
- Source: `technical-barcode-scanning-library-selection-2026-10-28/research.md`.

## C. Open Food Facts

- Product lookup by barcode, no key. Limits: 15 product lookups and 10 searches a minute per IP; do not use search for search-as-you-type.
- Send a User-Agent like `PromptForce/0.1 (IBE160 student project; contact email)`.
- Cache every product in our own `FoodItem` table.
- Many products lack serving size; kcal per 100 g may be missing → FR-10 path.

## D. Matvaretabellen

- Free download (XLSX/ODS) or JSON API, no key. Licence CC BY 4.0 per Mattilsynet (data.norge.no says NLOD 2.0; both allow use with attribution).
- Suggestion: seed 100–200 common basic foods (egg, rice, chicken fillet, banana, milk, bread …).

## E. Login

- Recommended: own email + password per the OWASP checklist: Argon2id/bcrypt, server-side session in an HttpOnly/Secure/SameSite cookie, per-account rate limiting, generic error messages, CSRF protection.
- Runner-up: Supabase or Firebase in local/emulator mode. Clerk/Auth0 are ruled out (no local mode).
- Source: `technical-login-authentication-approach-selection-2026-10-28/research.md`.

## F. Privacy

- GDPR applies even to a course project once others use the app; fictional data is not personal data.
- Pattern: short consent screen with an active choice, minimal fields, soft delete followed by a hard delete within a bounded time.
- Sikt reporting is for research; whether course projects are covered is decided by the institution, so ask.
- Source: `domain-gdpr-helseopplysninger-studentprosjekt-2026-10-28/research.md`.

## G. Exercise list coverage (from research-trening)

| Equipment profile | Exercises | Missing |
|---|---|---|
| Bodyweight only | 8 | Shoulders, arms |
| Home: dumbbells | 13 | – |
| Home: dumbbells + bench | 14 | – |
| Home: band | 11 | – |
| Home: kettlebell | 11 | Shoulders, arms |
| Home: pull-up bar | 10 | Shoulders, arms |
| Gym (all) | 34 | – |

Candidates to close the gaps: pike push-up, diamond push-up, kettlebell press, negative pull-ups, knee push-ups.

## H. Options considered

| Question | Chosen | Alternative | Why |
|---|---|---|---|
| Equipment choice | Saved Equipment Profiles | Tick equipment every time | Fewer taps for the typical user who trains in the same places (Fitbod pattern) |
| Food log shape | Meals + grams | One list per day | Familiar from Lifesum; small extra cost |
| Calorie Target | With Goal (−500/0/+300) | Maintenance only | Beginners usually have a goal; easy to test |
| UI language | Norwegian | English | Norwegian users and Norwegian food data |
