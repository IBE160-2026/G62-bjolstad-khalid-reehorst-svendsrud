# Designbeslutninger

Her skriver vi ned hva vi velger etter hver runde, slik at prosessen kan følges (se forelesning IBE160 9. november).

## Etter runde 1 (2026-11-10, Osman)

- **Hovedkonsept: A · Kjøleskapstavla.** Rolig og ryddig. Ukestripa med magneter (grønn = mat, oransje = trening) og den gule lappen med «kcal igjen» beholdes.
- **Det må føles som en app, ikke en nettside.** Prompt Force er fortsatt en webapp i nettleseren (PRD §7), men skal ha appens kjennetegn:
  - fast navigasjon: sidemeny på PC og faner nederst på mobil,
  - egne ikoner (ikke emoji),
  - trykkbare kort som leder videre til Mat og Trening (briefen: «hver sin seksjon som leder brukeren steg for steg»).
- B og C går ikke videre. Fra B kan budsjettlinja for kcal vurderes som et alternativ til det store tallet.

**Runde 2:** tre app-varianter av A. Hver viser Dagsoversikten på PC og mobil.

## Etter runde 2 (2026-11-10, Osman)

- **Valgt: A1 · Sidemeny.** Den var renest: fast sidemeny på PC, faner nederst på mobil, Mat og Trening som kort side om side under ukestripa og den gule lappen.
- A2 (smal kolonne) ga for mye tom plass på PC, der sensor tester appen. A3 (to fliser) skjulte for mye bak et ekstra trykk.
- Det valgte konseptet ligger i `../valgt-konsept/`. Runde 1 og 2 beholdes for å vise prosessen.

## Felles design (2026-11-13, Osman etter gruppens avstemning)

- Gruppen stemte 12.11 for å slå sammen A1 og runde 3 (Karianne, `../runde-3/`).
- **Utseende fra runde 3:** papirfarge, Fraunces i overskrifter, Inter i brødtekst, plomme som knappefarge og tape på kortene.
- **Fargekoder og struktur fra A1:** grønn = mat, oransje = trening, sidemeny, ukestripe med magneter og den gule lappen med ett tall.
- **Fra runde 3 i tillegg:** metodevalg for mat (Søk · Skriv strekkode · Nylig brukt · Manuelt), muskelgruppelista og hjelpeknappen.
- **Tatt ut:** teal fra runde 3, fordi den er nesten lik den grønne (kontrast 1,04 mellom dem). Kaloriringen fra runde 3, fordi PRD-en ber om ett tall med en setning (FR-7).
- Resultatet står i `../../ux-designs/ux-prompt-force-2026-11-10/DESIGN.md` og `EXPERIENCE.md`.

## Revisjon 2 (2026-11-13, tilbakemelding fra Karianne på PR #17)

- **Notatbok-stilen tilbake:** linjer i bakgrunnen hver 38px som i runde 3, og dagens lapp er et linjert notatark med marg.
- **Roligere farger:** plomme er eneste fylte farge (knapp og aktiv meny). Grønn og oransje bare som magneter og ikoner; tallene står i vanlig tekstfarge.
- **Font:** Inter overalt. Fraunces ble for lite stilren (runde 3-mockupen viste egentlig Georgia, fordi Fraunces ikke var lastet inn).
- **Oppskriftssidene** fra runde 3 beholdes som design for fase 2. Oppskrifter er utenfor v1 (gruppens beslutning 12.11).
- Mockup: `../../ux-designs/ux-prompt-force-2026-11-10/imports/felles-design-v2-i-dag.html`.

