---
title: 'Story 6.4 (part 3 of 3): Help button and sheet focus'
type: 'feature'
created: '2026-11-17'
status: 'done'
baseline_commit: 'fb3579935df8087b8a403e6f60940e1dcca02648'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/EXPERIENCE.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A first-time user (or the examiner) has no in-app explanation of a screen, and keyboard/screen-reader behaviour of the sheets has never been checked as a whole (UX-DR15, UX-DR16, UX-DR17).

**Approach:** Add a "?" help button to the top bar on every signed-in screen that opens a short sheet explaining the current screen. Then check every existing sheet/dialog against one shared Vitest suite: focus moves in on open, Esc closes, focus returns to the opener, and toasts are announced; fix any that fail.

## Boundaries & Constraints

**Always:** Top bar button: icon "?" with `aria-label="Hjelp for denne siden"`, ≥ 44 px, visible focus ring; opens a native `<dialog>` sheet titled "Hjelp: {side}" with the text below and a "Lukk" button; Esc or "Lukk" closes and returns focus to the "?" button. Help text by route (longest prefix wins):
- `/` I dag: "Her ser du dagen din: hvor mange kalorier du har igjen, hva du har spist og hvordan økta gikk. Trykk «Logg mat» eller «Start økt» for å legge til noe. Tallene oppdateres med en gang."
- `/mat` Mat: "Her logger du det du spiser. Søk etter en matvare, skann eller skriv inn strekkoden, eller velg noe du har spist før. Trykk på en logget matvare for å endre eller slette den."
- `/trening` Trening: "Her finner du øvelser som passer utstyret ditt. Bytt utstyrsprofil øverst, eller søk etter en øvelse. Trykk «Start økt» når du vil trene."
- `/trening/okt` Økt: "Her logger du økta. Fyll inn repetisjoner og kg for hvert sett og huk av når settet er ferdig. «Sist» viser hva du gjorde forrige gang. Trykk «Fullfør økt» når du er ferdig."
- `/trening/ovelser` Øvelse: "Her ser du hvordan du gjør øvelsen, med video og steg. «Legg til i økt» legger den i dagens økt. Start med lav vekt og øk rolig."
- `/profil` Profil: "Her endrer du kroppsdata, aktivitetsnivå og mål. Dagens kalorimål regnes ut på nytt når du lagrer. Under «Utstyr» lager du utstyrsprofiler."
- `/historikk` Historikk: "Her kommer en oversikt over tidligere dager."
- any other signed-in route: "Bruk menyen for å gå mellom I dag, Mat, Trening og Profil."
Not shown on signed-out pages (logg inn, opprett konto, samtykke, profiloppsett). Shared test helper that, for each sheet/dialog (add-food sheet, equipment-profile sheet, delete-workout dialog, delete-account dialog, intro dialog, help sheet), asserts: focus inside after open, Esc closes, focus back on the opener; undo toasts (food, sets) are inside an `aria-live="polite"` region. Fix only what fails. Loading states keep skeletons (no full-page spinners); add a test that I dag, Mat and Trening render skeleton rows while loading.

**Never:** No help on signed-out pages, no tours or tooltips, no new pages, no changes to sheet content.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Help on Økt | `/trening/okt/123`, press "?" | sheet "Hjelp: Økt" with the Økt text | N/A |
| Close | Esc | sheet closes, focus on "?" | N/A |
| Signed out | `/logg-inn` | no "?" | N/A |
| Sheets | each listed sheet | focus in, Esc closes, focus back | Failing sheet fixed |
| Toast | delete a set | toast in an aria-live region | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/components/shell/{top-bar.tsx,help-button.tsx,help-texts.ts}` -- button, sheet, route → text.
- `frontend/src/test/sheet-a11y.ts` (new helper) and `frontend/src/components/shell/help-button.test.tsx`; per-module tests reuse the helper.
- Fixes in the listed sheet components only where the shared test fails.

## Tasks & Acceptance

**Execution:**
- [ ] help button, texts, sheet -- UX-DR15.
- [ ] shared sheet/toast accessibility tests and fixes; skeleton tests -- UX-DR16, UX-DR17.

**Acceptance Criteria:**
- Given any signed-in page, when the user presses "?", then a sheet explains that page; Esc returns focus to "?"; every listed sheet passes the shared focus/Esc test.
- Given the change, when `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH | Help button has a `title` tooltip | low | Spec forbids tooltips | patch |
| BH | Help text changes under an open sheet on navigation | low | Recomputed from pathname | patch |
| BH | Fallback title "Hjelp: Prompt Force"; fixed ids; route edge cases untested | low | Copy and tests | patch |
| BH | Shared helper focuses the opener itself | medium | Safari/Firefox don't focus on click | patch |
| BH | Mat skeleton test does not check status/progressbar | low | Test gap | patch |
| BH | Polyfill and Esc helper differ from real browsers | medium | jsdom limits | defer — covered by the Playwright part (6.4 del 2) |
| BH | Local dialog polyfills in older tests not replaced | low | Cleanup only | rejected |
| BH | Live region present before the toast | low | Regions are mounted with the page | rejected |

## Verification

**Commands:**
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
