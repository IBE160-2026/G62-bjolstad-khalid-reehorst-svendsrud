# Epic 4 Context: Exercises and equipment

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A consented user saves Equipment Profiles (what they have at home or at the gym) and gets exercise suggestions that fit that equipment, with name search, muscle-group and level filters, and an exercise detail with a technique description, an embedded video, a safety note and a simple body figure showing the muscles worked. The epic adds the backend `exercises` module with read-only reference data (equipment, muscle groups, exercises) and per-user Equipment Profiles. Suggestions are the training half of the core loop: Epic 5 adds exercises from this list to a workout.

## Stories

- Story 4.1: See an exercise and how to do it (next)
- Story 4.2: Save my equipment
- Story 4.3: Get exercises that fit my equipment
- Story 4.4: Search exercises by name
- Story 4.5: Choose exercises by muscle group and level (Should)
- Story 4.6: See which muscles an exercise works (Should)

## Requirements & Constraints

- **Equipment (nine fixed types):** Kroppsvekt (bodyweight), Manualer (dumbbells), Stang og skiver (barbell and plates), Benk (bench), Kettlebell, Strikk (resistance band), Trekkestang (pull-up bar), Kabelmaskin (cable machine), Beinpress/maskiner (leg press/machines). Bodyweight is in every Equipment Profile and cannot be removed.
- **Muscle Groups (six):** Ben, Rygg, Bryst, Skuldre, Armer, Mage/kjerne (Legs, Back, Chest, Shoulders, Arms, Core). Each exercise has exactly one primary and 0–2 secondary groups (e.g. deadlift: primary Rygg, secondary Ben).
- **Exercise:** Norwegian name (English in brackets where helpful), one or more required Equipment, muscle groups, Level (Nybegynner / Middels / Øvet), Exercise Type (reps or time; plank is time), short technique description, video id. Every field filled. Seed holds 30–50 exercises; users cannot add, change or delete exercises.
- **Source list:** `planning-artifacts/ovelsesliste.md`, 34 exercises (#1–34). Its table gives name, equipment, one muscle group, level and a YouTube `watch?v=` link for every exercise, so a video id exists for all 34 (oEmbed-verified that they exist and are embeddable; not yet watched by a human, issue #6 open). The list does **not** give Exercise Type, secondary muscle groups or descriptions; those must be written for the seed. It also uses labels outside the six groups that must be mapped to one primary: "Kjerne" = Mage/kjerne; "Hele kroppen" (#6 burpees, #18 kettlebell swing) and "Rygg / hele kroppen" (#13 deadlift: Rygg + Ben). "Manualer + benk" / "Stang og skiver + benk" (#7, #10, #15) means two required Equipment.
- **#35–39 are NOT approved.** `ovelsesliste-gjennomgang-2026-11-11.md` proposes pike push-up (Kroppsvekt/Skuldre), diamond push-up (Kroppsvekt/Armer, Middels), kettlebell press, kettlebell curl and negative chin-ups, each with a verified video id, but GitHub issue #8 is still open and they have not been added to `ovelsesliste.md`. Seed the 34; keep the five easy to add later. Until then Kroppsvekt + Skuldre gives no match (used as the empty-filter example).
- **Video:** embed from `youtube-nocookie.com` with the stored id; no autoplay. If it cannot load, text and data stay and the video area says "Videoen kan ikke vises nå" with a link to the YouTube video. The description is the text alternative, so the video is never required.
- **Safety note** on every detail page: the content is general guidance, does not replace a doctor or physiotherapist, and beginners should start light.
- **Equipment Profiles (per user):** create, rename, edit (tick equipment), delete. New users get "Hjemme" (bodyweight only) and "Treningssenter" (all equipment). Another user's profile returns no data. Seeded test users also need Equipment Profiles.
- **Suggestions:** show only exercises whose required equipment is all in the chosen profile; order Nybegynner, Middels, Øvet. A dumbbell-only profile never gets barbell deadlift. Tests must cover each profile in the coverage table (bodyweight only 8, dumbbells 13, dumbbells + bench 14, band 11, kettlebell 11, pull-up bar 10, all 34; dumbbells/band/kettlebell/pull-up bar each include bodyweight).
- **Search (Must):** case-insensitive "contains" on name across the whole list, like food search; exercises whose equipment does not fit the chosen profile are marked. No match: message saying nothing matched and to check the spelling.
- **Filters (Should):** muscle group matches primary or secondary; Level chips; combined with the chosen profile. Empty result names the excluding filters and what to change ("Ingen øvelser passer med Kroppsvekt og Skuldre. Prøv en annen muskelgruppe eller legg til utstyr."), never an empty list. Backend tests cover primary and secondary matching.
- **Muscle figure (Should):** simple, non-clickable body figure (front and back) beside or under the video; primary group dark red, secondary lighter red, with a legend; muscles also written as text ("Hovedmuskel: bryst · Hjelper til: skuldre, triceps"). Push-ups: chest dark, shoulders and triceps light on the front. Colours from tokens in light and dark mode, ≥ 3:1 for non-text marks.

## Technical Decisions

- **Module `exercises`** (router → service → repository, `models.py`, `schemas.py`; paths `/api/exercises/...`); frontend mirror `frontend/src/modules/exercises/`. Health-data endpoints depend on `require_consent` (`ConsentedUser`); mutations pass the Origin check; errors use the envelope with field errors and Norwegian messages; regenerate the committed OpenAPI types after API changes.
- **AD-9 read-only reference data:** exercises, equipment types and muscle groups come only from seed files in `backend/app/seed/`, loaded by `seed_if_empty` (`APP_ENV=local`); the API has no create/update/delete for them. Tables via Alembic: equipment, muscle groups, exercises, exercise↔equipment join, exercise↔muscle-group join with a `role` column (primary/secondary; exactly one primary, 0–2 secondary). The 30–50 count and the one-primary rule should be checked by a test.
- **Equipment Profiles:** user-owned table with `user_id` plus a profile↔equipment join; no endpoint accepts a user id; repositories always filter by the current user (AD-4). Bodyweight enforced server-side, not only in the UI.
- **Default profiles:** created by the `exercises` service, called once by `identity` right after registration. `identity` calls the service, never the repository. Account deletion/purge must also remove Equipment Profiles.
- **AD-5:** the suggestion rule (equipment subset, level order, muscle/level filters) is a pure, unit-tested function in the `exercises` service; the frontend does not reimplement it.
- **Data model link for Epic 5:** WorkoutExercise → Exercise (N:1); `Exercise.type` (reps | time) decides whether sets log reps + kg or seconds.
- UUIDv4 ids, UTC timestamps; code in English, UI text in Norwegian.

## UX & Interaction Patterns

- **Trening** is a full page with its own URL: Equipment Profile segmented control ("Hjemme" · "Treningssenter" · …) that refreshes suggestions at once; suggestion list grouped by level, Nybegynner first; beside it the plain muscle-group pill list (Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg; selected style like the food method picker, `aria-pressed`), Level chips and a name search field. Each row: name, muscle group, equipment icons, and (from Epic 5) a "+" that adds it to today's workout.
- **Øvelse (detail):** opened from a suggestion row; name, equipment, muscle groups, level, description, embedded video, safety note, muscle figure (4.6) and later "Legg til i økt". Use a page with its own URL so Back works.
- **Utstyr:** Equipment Profiles are edited from Profil (and chosen on Trening); a sheet may be used for quick edits, reusing the native `<dialog>` pattern (one level deep, focus in/out, Esc closes).
- **Design:** tokens only, never raw hex. Plum only for actions; the single mauve `mark` colour for the Trening dumbbell icon disc and selected rows (`mark-tint`); Mat and Trening differ by icon and label. The error red is reserved for validation and destructive actions, so the figure's dark/light red needs its own token pair (light and dark mode, ≥ 3:1), documented in the contrast file. Skeleton rows while loading; no auto-playing video; no infinite scroll.
- **Voice:** follow `frontend/VOICE.md`: warm, short, "du"-form; labels: Equipment Profile = "Utstyr", Workout = "Økt".

## Cross-Story Dependencies

- Builds on Epics 1–3: `ConsentedUser`/`require_consent`, `Now`, Origin check, error envelope, `seed_if_empty`, tokens incl. `mark`, VOICE.md, dialog pattern; registration in `identity` gains the call to the `exercises` service (4.2).
- 4.1 creates the reference tables, seed, list and detail endpoints, and the Trening list/detail pages. 4.2 adds Equipment Profiles and default creation. 4.3 adds the profile switch and suggestion rule on top of 4.1 + 4.2. 4.4 and 4.5 extend the same list. 4.6 extends the 4.1 detail page using the muscle-group roles.
- Epic 5 adds exercises to a workout from this list and reads Exercise Type; adding #35–39 later is a seed-only change once issue #8 is approved.
