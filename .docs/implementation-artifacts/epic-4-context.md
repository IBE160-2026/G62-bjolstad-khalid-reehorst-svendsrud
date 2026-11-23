# Epic 4 Context: Exercises and equipment

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A consented user saves Equipment Profiles and gets exercise suggestions that fit that equipment, with name search, muscle-group and level filters, and an exercise detail page with technique text, an embedded video, a safety note and a simple body figure showing which muscles the exercise works. The epic owns the backend `exercises` module (read-only reference data for equipment, muscle groups and exercises, plus per-user Equipment Profiles). It is the training half of the core loop: Epic 5 adds exercises from this list to a workout. Stories 4.1–4.5 are done; only Story 4.6 (body figure, Should) remains.

## Stories

- Story 4.1: See an exercise and how to do it
- Story 4.2: Save my equipment
- Story 4.3: Get exercises that fit my equipment
- Story 4.4: Search exercises by name
- Story 4.5: Choose exercises by muscle group and level (Should)
- Story 4.6: See which muscles an exercise works (Should)

## Requirements & Constraints

- **Muscle Groups (fixed vocabulary, six):** Ben, Rygg, Bryst, Skuldre, Armer, Mage/kjerne (Legs, Back, Chest, Shoulders, Arms, Core). UI order in lists: Skuldre, Bryst, Mage/kjerne, Armer, Ben, Rygg. Every exercise has exactly one primary and 0–2 secondary groups (e.g. deadlift: primary Rygg, secondary Ben). There are no finer muscles in the data model; the source list's "Kjerne" = Mage/kjerne, and "Hele kroppen" was mapped to one primary plus secondaries.
- **Exercise data:** 34 seeded exercises (#35–39 still unapproved), each with Norwegian name, required Equipment (one or more of nine fixed types), Level (Nybegynner/Middels/Øvet), Exercise Type (reps/time), description, video id and a `video_short` flag (Shorts play in a 9:16 player). Users can never create, change or delete exercises.
- **Exercise detail (Must):** description and embedded youtube-nocookie video, no autoplay; if the video fails, text and data still show with "Videoen kan ikke vises nå" and a YouTube link. A safety note (general guidance, not a substitute for a doctor or physiotherapist, start light) is on every detail page.
- **Body figure (Should, Story 4.6):**
  - Simple body figure, front and back, next to or under the video; display only, **not clickable** and not focusable (a clickable muscle picker is out of scope).
  - Primary Muscle Group in dark red, secondary groups in a lighter red, with a legend for the two colours.
  - Muscles also written as text so nothing depends on colour alone, e.g. "Hovedmuskel: bryst · Hjelper til: skuldre, triceps". Note: the example says "triceps" while the data only knows "Armer"; settle the wording (group names vs. finer labels) in the story spec rather than inventing new data.
  - Push-ups (primary Bryst; secondary Skuldre, Armer): chest dark red; shoulders and triceps light red on the front view.
  - Colours come from design tokens in both light and dark mode and meet ≥ 3:1 contrast for non-text marks against the figure background.
- **Accessibility:** WCAG 2.1 AA basics: labelled fields, phone-sized tap targets (≥ 44 × 44 px), text ≥ 4.5:1, non-text marks ≥ 3:1. Since the figure is decorative next to the text, it should be hidden from or given a short label for screen readers without duplicating the text.
- **Light and dark mode:** light is the default; a top-bar button switches mode and the choice is remembered in the browser. Every colour pair must pass contrast in both modes.

## Technical Decisions

- **Module `exercises`:** router → service → repository; paths `/api/exercises/...`; frontend mirror `frontend/src/modules/exercises/`. Endpoints require consent; errors use the shared envelope with Norwegian messages; regenerate the committed OpenAPI types after any API change.
- **Read-only reference data:** exercises, equipment and muscle groups only come from seed files in `backend/app/seed/` (`exercises.json`); schema changes only through Alembic. Muscle groups link to exercises via a join table with a `role` column (primary/secondary). The detail endpoint already exposes muscle groups with roles; Story 4.6 should need little or no backend work, and must not add muscle data the model lacks.
- **Business rules stay in the backend** (pure, unit-tested functions in the service); the frontend is a UI client only and does not reimplement suggestion or filter rules.
- **Frontend:** Next.js + Tailwind + shadcn/ui; components use tokens only, never raw hex values. A figure is best built as inline SVG with region shapes coloured through CSS variables (token classes), so light/dark switching works without separate assets.
- Code in English, UI text in Norwegian bokmål.

## UX & Interaction Patterns

- **Øvelse (detail page):** own URL so Back works; name, equipment, muscle groups, level, description, video, safety note, the muscle figure, and "Legg til i økt" (from Epic 5).
- **Trening:** Equipment Profile segmented control, suggestion list grouped by level (Nybegynner first), plain muscle-group pill list with `aria-pressed`, Level chips and a name search field. Empty results name the excluding filters and what to change.
- **Design tokens (final palette):**
  - Light: paper `#F7F2E9`, surface `#FFFDF7`, ink `#3A322B`, ink-secondary `#6B6056`, rule `#E4D9C6`, accent (plum) `#7A3B69`, mark `#9C5E87`, mark-text `#7D3F5E`, mark-tint `#F2E7EE`, error `#B42318`.
  - Dark: paper `#221A1F`, surface `#2B2229`, ink `#F3E9EE`, ink-secondary `#B9A3AE`, rule `#453640`, accent `#A86CC0`, accent-text `#D8B2E3`, mark `#B383C3`, mark-text `#D8B2E3`, mark-tint `#372D3C`, error `#F28B7F`.
  - Every colour has one job: plum only for actions and active navigation; mauve `mark` for icon discs and selected rows; `error` only for validation and destructive actions. The figure's dark/light red is therefore a **new dedicated token pair** (light and dark values), not a reuse of `error`, plum or mauve, and must be added to the contrast documentation (`frontend/src/styles/CONTRAST.md`).
  - No gradients or glass; cards are surface with 1 px rule border and 18 px radius; Manrope for all text, never below 13 px; sentence case.
- **Voice:** warm, short, "du"-form Norwegian, per `frontend/VOICE.md`.

## Cross-Story Dependencies

- 4.6 extends the 4.1 detail page (including the 16:9 / 9:16 video player) and reads the muscle-group roles seeded in 4.1; it depends on the light/dark token system and contrast file from Epic 1.
- Epic 5 uses this exercise list and Exercise Type for set logging; adding #35–39 later is a seed-only change, and the figure must handle any of the six groups as primary or secondary.
