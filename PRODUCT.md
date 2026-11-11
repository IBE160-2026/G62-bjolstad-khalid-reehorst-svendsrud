# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Undecided. Chosen with the group in the architecture phase (PRD §11 Q7). Hosting is the group's Vercel project (<https://g62promptforce.vercel.app>); grading relies on running the app locally from the README.

## Users

**Primary:** beginners and lightly experienced exercisers in Norway who want to start training regularly and keep track of what they eat, and who find tools like MyFitnessPal "too much". Typical situation: a few dumbbells at home or a new gym membership, unsure where to start, and finding calorie tracking tedious. More broadly, any adult who wants a better lifestyle through training and food.

**Secondary:** more experienced exercisers who want training and food in one place. They can use v1, but it is not designed around them.

**Also uses the app:** the course examiner (sensor), who clones the repo, runs it locally from the README and logs in as a seeded test user.

Jobs to be done: "Tell me which exercises I can do with what I have, and show me how." "Give me one calorie number I understand." "Let me log a meal in a few taps." "Show me what I lifted last time." Emotionally: "Help me feel I'm doing it right" and "Don't overwhelm me."

## Product Purpose

Prompt Force puts training and nutrition in one simple web app for people new to structured training. V1 is the core loop: **profile → calorie target → log food → log training → daily overview**. Success means the loop works end to end without errors, the calorie target is correct, the examiner can run it in under 20 minutes, and beginners outside the group can use it without help.

## Positioning

Takes the best of Hevy (set-by-set workout logging) and Lifesum (approachable food logging) and keeps only what a beginner needs. The difference from broader platforms (Bevel, Cora) is fewer features, not more: one simple app, honest guidance, and exercise suggestions based on the equipment the user actually owns.

## Operating Context

- Used mainly in a desktop browser on a PC or laptop; the layout must also adapt down to 360 px.
- Food is logged by typing a barcode or searching by name (main path); camera scanning is an optional extra.
- Workouts are logged set by set, often at home or in the gym.
- The Daily Overview is checked during and at the end of the day.

## Capabilities and Constraints

- Full requirements live in `.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md` (FR-1 – FR-30, NFR-1 – NFR-11). Terms in its glossary (Profile, Calorie Target, Meal, Food Log Entry, Equipment Profile, Exercise Suggestion, Workout, Set, Daily Overview) are used exactly as defined.
- All UI text is Norwegian bokmål.
- Explicit consent screen before any health data (GDPR art. 9); the user can delete logs and the account.
- Only kcal is shown in v1 (macros stored, not shown). No calories burned from training.
- Fixed list of 30–50 exercises with YouTube (nocookie) videos; nine fixed equipment types.
- Required data attributions: "Data from Open Food Facts" and "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no".
- Non-goals: no medical advice, no programme generator, no social features, no wearables, no payment, no notifications.
- Phase 2 only: photo calorie estimate and a Pro flag.

## Brand Commitments

- Name: **Prompt Force**.
- Design intent from the group's pitch (brief, 2026-11-10): motivating and calm, not cluttered; a clean front page with few buttons; training and food each get their own section that leads the user forward step by step; the front page shows the day's log at a glance.
- No logo, colours or typography have been decided.

## Evidence on Hand

- Product brief, PRD, research and exercise list in `.docs/planning-artifacts/`.
- No real users, testimonials or metrics exist. All seed data is fictional; do not fabricate users or results.

## Product Principles

1. **Fewer, clearer actions.** Every screen favours one obvious next step over many options.
2. **One number, explained.** Show the calorie target as a single number in plain Norwegian, never formula jargon.
3. **Never a dead end.** Empty states and not-found results always say what happened and what to do next.
4. **Honest guidance.** General advice only, clearly labelled; start light and stay safe.
5. **Fast logging.** Logging a recent food or a set should take as few steps as possible.

## Accessibility & Inclusion

Aim for WCAG 2.1 AA basics: labelled form fields, tap targets large enough on a phone, sufficient text contrast. Users aged 16–17 get a "rough estimate" note on the calorie target.
