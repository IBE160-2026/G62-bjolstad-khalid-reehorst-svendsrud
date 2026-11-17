# Story 3.7: Norske merkevarer i søket

## Oppgave
Få søket til å finne norske pakkevarer (FR11, FR16, NFR6).

## Plan
1. Importkommando som henter de mest skannede norske produktene fra Open Food Facts og lagrer dem som seed-fil (Osman godkjente nedlastingen, først 2 000 og så 1 000 produkter).
2. Review med tre kontrollører, PR.

## Resultat
- `python -m app.cli import-off-norway`: maks 10 søk i minuttet, 3 forsøk per side, og husker hentede sider så en ny kjøring etter «503» fortsetter der den stoppet.
- Open Food Facts svarte «503» store deler av 16.11; med hurtigbufferen gikk det 17.11: 1 000 hentet, 941 beholdt (`backend/app/seed/data/off_norway.json`, 170 kB) med ODbL-lisensfil.
- Søk på «lettmelk» finner TINE og Q (sjekket gjennom den ekte appen).
- Tester: 337 backend og 305 frontend.
- Review: 21 funn – 7 grupper rettet (blant annet at en avbrutt kjøring kunne ødelegge hurtigbufferen), 7 avvist.

## Åpne punkter
- Pushe og lage PR for story 3.7 (venter på Osmans godkjenning).
