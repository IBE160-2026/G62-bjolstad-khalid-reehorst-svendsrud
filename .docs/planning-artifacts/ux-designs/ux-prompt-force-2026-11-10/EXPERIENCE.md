---
name: Prompt Force
status: final
updated: 2026-11-10
sources:
  - ../../prds/prd-prompt-force-2026-11-02/prd.md
  - ../../briefs/brief-prompt-force-2026-09-16/brief.md
  - ../../../../PRODUCT.md
  - ../../ux/konsepter/decisions.md
  - ./DESIGN.md
---

# Prompt Force — Experience Spine

## Foundation

A responsive web app in the browser: desktop first, because the examiner runs it on a PC, and usable down to 360 px. It is not a native app, a PWA or offline-capable (PRD §7). It must still feel like an app: persistent navigation, authored icons and tappable cards (`../../ux/konsepter/decisions.md`).

`DESIGN.md` is the visual identity. This file owns structure and behaviour and references tokens by name, for example `{colors.food}`. No UI component library has been chosen; the stack is decided in the architecture phase `[ASSUMPTION]`. If a library is picked, this spine specifies the behaviour on top of its defaults.

All UI text is Norwegian bokmål (NFR-2). Requirement IDs refer to the PRD. Terms such as Daily Overview, Meal, Food Log Entry, Equipment Profile, Exercise Suggestion, Workout and Set are used exactly as defined in PRD §3. Their Norwegian UI labels are listed under Voice and Tone.

## Information Architecture

Primary navigation is the sidebar on desktop and the bottom tab bar on mobile. Historikk is in the sidebar only; on mobile, history is reached from the week strip and the date picker.

| Surface (UI name) | Reached from | Purpose | PRD |
|---|---|---|---|
| Logg inn / Opprett konto | App open while logged out | Email and password, register or log in | FR-1 |
| Samtykke | After first registration | Says what is stored and why; unticked checkbox plus button | FR-2 |
| Kom i gang (intro) | After consent, first time only | Three short steps (profil → logg → tren); can be skipped and never returns | FR-28 |
| Profiloppsett | After the intro | Weight, height, age, sex, activity level (with an example for each), goal; shows the calorie target | FR-5, FR-6, FR-7 |
| **I dag** (Daily Overview) | Default after login; sidebar or tab "I dag" | Week strip, day note with kcal remaining, Mat card, Trening card, Logg mat and Start økt | FR-26, FR-27, FR-28 |
| Mat | Sidebar or tab "Mat"; Mat card | The chosen date's four Meals with their entries and totals | FR-13, FR-15 |
| Legg til mat (sheet) | "Logg mat", or "+ Legg til" on a Meal | Recently used, search, type a barcode, scan (if available), register manually | FR-8 to FR-12, FR-14 |
| Matvare | A search, barcode or recent result | Amount in grams or servings, Meal, live kcal before saving | FR-13, FR-16 |
| Registrer matvare | "Not found" or "Registrer selv" | Name and kcal per 100 g (macros optional); barcode prefilled when known | FR-10, FR-12 |
| Trening | Sidebar or tab "Trening"; Trening card | Equipment Profile picker, Exercise Suggestions with filters and search, today's workout | FR-18 to FR-20 |
| Øvelse | A suggestion row | Technique text, embedded video, equipment and level, "Legg til i økt" | FR-21 |
| Økt (active workout) | "Start økt" or "Legg til i økt" | Workout Exercises with Sets, last-time values, finish | FR-22 to FR-25 |
| Historikk | Sidebar "Historikk"; date picker | Pick any earlier date; opens I dag for that date | FR-27 |
| Profil | Sidebar or tab "Profil" | Edit body data and calorie target, Equipment Profiles, log out, delete account | FR-4, FR-5, FR-18 |

Sheets and dialogs are one level deep: a sheet never opens another sheet. Every surface has a journey below that lands on it.

→ Composition reference: `imports/valgt-konsept-a1-dagsoversikt.svg` (I dag, desktop and mobile). Other surfaces are built from this spine. The spine wins on conflict.

## Voice and Tone

Plain, warm and short, like a friendly coach who does not lecture. Address the user as "du". No exclamation-mark hype, no shaming and no jargon such as BMR or TDEE on main screens (FR-7).

| Do | Don't |
|---|---|
| "220 kcal igjen av dagens mål på 1 640" | "Gjenværende kaloribudsjett: 220" |
| "Du er 120 kcal over målet i dag. Det går fint, i morgen er en ny dag." | "Advarsel! Du har overskredet målet!" |
| "Vi fant ikke denne varen. Vil du registrere den selv?" | "Feil 404: produkt ikke funnet" |
| "Ingen øvelser passer med Hjemme og Skuldre. Prøv en annen muskelgruppe eller legg til utstyr." | "Ingen resultater." |
| "Logg ditt første måltid" | "Du har ikke logget noe ennå :(" |
| "Sist: 8 kg × 10 (3. nov)" | "Forrige PR: 8kg" |

UI labels for PRD terms: Daily Overview = "I dag"; Meal = "Frokost", "Lunsj", "Middag", "Mellommåltid"; Equipment Profile = "Utstyr" (for example "Hjemme", "Treningssenter"); Workout = "Økt"; Set = "Sett"; Calorie Target = "dagens mål". Buttons name their action with a verb: "Logg mat", "Start økt", "Lagre", "Fullfør økt".

## Component Patterns

Behavioural rules only. Visual specs are in `DESIGN.md` → Components.

| Component | Use | Behaviour |
|---|---|---|
| Week strip | I dag, Mat, Trening | Click or tap a day to switch the whole surface to that date. Future days are disabled. Arrows (‹ ›) step a week; a calendar icon opens the date picker (FR-27). Magnets update as soon as something is logged or deleted (NFR-9). |
| Day note | I dag | Shows kcal remaining for the chosen date. Not clickable. It says when the safety floor was used (FR-6) and shows a "grovt anslag" note for ages 16 to 17. |
| Section card | I dag | The whole header row is a link to Mat or Trening for the same date. Rows are links to the entry. The "+ Legg til" action on an empty Meal opens Legg til mat with that Meal preselected. |
| Legg til mat sheet | Mat, I dag | Opens with the search field focused and **Nylig brukt** listed under it. Tapping a recent item logs it with last time's amount (FR-14; three taps or fewer from I dag, SM-6). Tabs: Søk · Strekkode · Registrer selv. The Strekkode tab shows a number field first; "Skann med kamera" appears only when the browser supports it (FR-8, FR-9). Search filters the local database as you type and never calls Open Food Facts (FR-11). |
| Amount picker | Matvare | Grams by default, or servings when the item has a serving size. kcal updates live before saving (FR-13). "Lagre" closes the sheet and returns to where it opened. |
| Equipment switch | Trening | A segmented control of the user's Equipment Profiles ("Hjemme" · "Treningssenter" · …). Switching refreshes the suggestions at once (FR-19). |
| Suggestion list | Trening | Grouped by level (Nybegynner first). Filter chips for Muscle Group and Level, plus a search field (FR-20). Each row: name, muscle group, equipment icons and a "+" that adds it to today's workout. |
| Set row | Økt | Reps and kg fields (or seconds for time exercises), a check to mark it done and a delete action. A new exercise starts with three empty sets suggesting 10 reps (FR-23). "Sist: …" sits under the exercise name (FR-24). |
| Delete | Entries, Sets, Workouts | Deleting a Food Log Entry or Set happens at once, with an "Angre" toast for 5 seconds. Deleting a whole Workout or the account asks for confirmation (FR-4). |
| Toast | Global | Bottom centre on desktop and above the tab bar on mobile. One at a time; disappears after 5 s; never covers the primary button. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First visit, nothing logged | I dag | The note shows the full target ("1 640 kcal igjen"). The Mat card shows "Logg ditt første måltid" with "Logg mat"; the Trening card shows "Start en økt" (FR-28). No empty tables. |
| Earlier date with nothing logged | I dag | "Ingenting logget denne dagen." Logging is still allowed for past dates. |
| Over target | Day note | Shows "120 kcal over" in `{colors.ink}` with the supportive sentence from Voice and Tone. Not red and no warning icon. |
| Safety floor used | Day note | Supporting line: "Målet er satt til minst 1 200 kcal for å være trygt." |
| Age 16 to 17 | Day note, Profiloppsett | "Dette er et grovt anslag. Formelen er laget for voksne." |
| Barcode not found / no kcal | Legg til mat | Message plus the "Registrer selv" button with the barcode prefilled (FR-10). Never an empty result. |
| Open Food Facts unreachable | Legg til mat | "Vi får ikke kontakt med Open Food Facts nå. Du kan registrere varen selv." |
| No matching exercises | Trening | Explains which filter excluded everything and what to change (FR-20). |
| Video cannot load | Øvelse | Text and data stay; the video area says "Videoen kan ikke vises nå" with a link to YouTube (FR-21). |
| No previous sets | Økt | The "Sist" line is hidden; no "0 kg" placeholder. |
| Loading | Any list | Skeleton rows in the shape of the content for at most about 1 second; no spinners over the whole page. |
| Validation error | Forms | Inline under the field, starting with the fix: "Vekt må være mellom 30 og 300 kg." Focus moves to the first field with an error. |
| Wrong login | Logg inn | One generic message: "E-post eller passord er feil." Rate limiting says "For mange forsøk. Prøv igjen om litt." (FR-1). |

## Interaction Primitives

- **Click or tap first.** Every action is a visible button or row; there are no hover-only actions, no swipe-only actions and no drag in v1.
- **Keyboard:** Tab order follows reading order. Enter submits forms and adds the highlighted search result. Esc closes the topmost sheet or dialog. ← and → move one day while the week strip has focus.
- **Saving:** logging updates the Daily Overview immediately without a page reload (NFR-9).
- **Sheets vs pages:** quick tasks (add food, pick amount) are sheets over the current page; places (Mat, Trening, Økt, Profil) are full pages with their own URL so the browser back button works.

**Banned in v1:** modal stacks deeper than one, infinite scroll, auto-playing video, confetti or streak celebrations, notifications (PRD §8).

## Accessibility Floor

Behavioural rules; contrast lives in `DESIGN.md`. Target: WCAG 2.1 AA basics (NFR-10).

- Every input has a visible label; placeholder text is never the only label.
- Tap targets are at least 44 × 44 px; the week-strip cells meet this on mobile.
- Magnets are never the only signal: each day cell has an accessible name, for example "tirsdag 10. november, mat logget, trening logget".
- Focus is always visible (2 px `{colors.focus-ring}` outline with offset). Opening a sheet moves focus into it; closing returns focus to the button that opened it.
- Page changes update the document title ("I dag, 10. november · Prompt Force"); toasts are announced through `aria-live="polite"`.
- The embedded video has a text alternative (the technique description), so it is never required.
- Zoom to 200% keeps all content reachable without horizontal scrolling.

## Responsive & Platform

| Width | Behaviour |
|---|---|
| ≥ 1024 px | Sidebar visible. I dag shows the note and actions next to the Mat and Trening cards. |
| 768 to 1023 px | Sidebar collapses to icons. The cards stack under the note. |
| < 768 px | Bottom tab bar (I dag, Mat, Trening, Profil). Single column. "Logg mat" and "Start økt" sit under the note. Sheets become full-height. |

Camera scanning is offered only where the browser supports it and the page runs on HTTPS or localhost (FR-8); otherwise the barcode number field is the path.

## Inspiration & Anti-patterns

- **From Hevy:** set-by-set logging with last time's numbers in view (FR-24).
- **From Lifesum:** an approachable food log grouped by Meal, with recently used items one tap away.
- **From the fridge planner board (concept A1):** the week at a glance with magnets for what is done.
- **Rejected: MyFitnessPal-style density.** Sara found it "too much"; the front page stays at one number, two cards and two buttons (NFR-11).
- **Rejected: macro rings and charts in v1.** Only kcal is shown (PRD §8.1).
- **Rejected: streaks, badges and red warnings.** The app guides; it does not judge.

## Key Flows

### Flow 1 — Sara's first calorie target (UJ-1)

Sara, 23, has just bought a gym membership and has two dumbbells at home. It is Sunday evening on her laptop.

1. She opens Prompt Force and chooses "Opprett konto" with email and password.
2. Samtykke explains what is stored and why. She ticks the box and taps "Godta og fortsett".
3. Kom i gang shows the three steps. She taps "Sett opp profilen".
4. Profiloppsett: she enters 82 kg, 162 cm, 23 years and female. Under activity level she is unsure, reads the example "Moderat: trener 3–5 dager i uka", and picks Lett. Goal: "Gå ned i vekt".
5. **Climax:** one number appears, "1 640 kcal om dagen", with one sentence about what it means. She taps "Til I dag" and lands on an empty Daily Overview whose Mat card says "Logg ditt første måltid".

Failure: she types 680 kg by mistake → "Vekt må være mellom 30 og 300 kg." under the field; nothing is lost.

### Flow 2 — Sara logs her breakfast yoghurt (UJ-2)

1. On her laptop, I dag, she clicks "+ Legg til" next to Frokost. The sheet opens with Frokost preselected.
2. She opens the Strekkode tab and types the number from the cup.
3. The product appears with kcal per 100 g. She sets 150 g; the kcal updates live.
4. **Climax:** she clicks "Lagre". The sheet closes, the Frokost row shows the yoghurt, the day note drops to the new remaining number, and a green magnet appears under today in the week strip.

Failure: the barcode is unknown → "Vi fant ikke denne varen. Vil du registrere den selv?" → Registrer matvare opens with the barcode filled in.

### Flow 3 — Sara trains at home (UJ-3)

1. From I dag she clicks "Start økt". Trening opens with Utstyr "Hjemme" (dumbbells) selected.
2. The suggestions show only exercises that fit, Nybegynner first. She opens "Goblet squat", reads the description and watches the video.
3. "Legg til i økt" adds it with three sets suggesting 10 reps. Under the name: "Sist: 8 kg × 10 (3. nov)".
4. She logs 3 × 10 at 10 kg, ticking each set.
5. **Climax:** she clicks "Fullfør økt" and returns to I dag. The Trening card lists the exercise with 3 × 10 · 10 kg, and an orange magnet sits next to the green one under today.

Failure: travelling with bodyweight only, she filters on Skuldre → "Ingen øvelser passer med Kroppsvekt og Skuldre. Prøv en annen muskelgruppe eller legg til utstyr."

### Flow 4 — Sara checks her day (UJ-4)

1. In the evening she opens I dag on her phone.
2. The note says "220 kcal igjen av dagens mål på 1 640"; the Mat card lists her three Meals and the Trening card her workout.
3. **Climax:** she taps Mandag in the week strip; the whole page shows yesterday, with both magnets and yesterday's numbers, without leaving the screen.

### Flow 5 — The examiner runs the app (UJ-5)

1. The examiner starts the app from the README and logs in with the seeded test user.
2. **Climax:** I dag opens on a day full of fictional data, with magnets on several earlier days, so every surface can be tested at once without typing anything.

## Open Items

- `[ASSUMPTION]` Typeface Atkinson Hyperlegible (DESIGN.md → Typography).
- `[ASSUMPTION]` No UI component library chosen; decided in the architecture phase.
- `[ASSUMPTION]` Sara's example profile (82 kg, 162 cm, 23, female, Lett, Gå ned i vekt) is illustrative; it gives exactly the PRD's 1 640 kcal with the FR-6 formula (BMR 1 556.5 × 1.375 − 500).
- `[NOTE FOR UX]` Only I dag has a visual reference; the other surfaces are built from this spine alone unless the group wants more mockups.
