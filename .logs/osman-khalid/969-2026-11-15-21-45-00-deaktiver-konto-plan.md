# Deaktiver konto lagt inn i planen

## Oppgave
Gruppa (Karianne, Discord 15.11) ville ha «deaktiver konto» i tillegg til «slett konto». Legge det inn i planen.

## Plan
1. Ny FR-32 (Should) i PRD-en, Story 1.8 i Epic 1, arkitektur-tabell og sprint-status.

## Resultat
- PRD: FR-32 – deaktivering med bekreftelse logger ut overalt og sletter ingenting; innlogging med riktig passord aktiverer kontoen igjen og sier fra; deaktiverte kontoer blir aldri slettet av `purge`.
- epics.md: FR32 og Story 1.8 med akseptansekriterier. Arkitektur: FR-32 → `identity`. sprint-status: `1-8-deactivate-my-account: backlog`.

## Åpne punkter
- Pushe og lage PR for planendringen (venter på Osmans godkjenning).
- Bygge Story 1.8 (Should) etter 1.6.
