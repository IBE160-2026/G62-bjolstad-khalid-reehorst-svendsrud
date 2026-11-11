# G62 — Prompt Force

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Applikasjon

Appen publiseres på Vercel: <https://g62promptforce.vercel.app>

Siden viser 404 til den første versjonen av appen er pushet til `main`. Vercel-prosjektet ligger på kontoen til Muhammad O Khalid.

## Medlemmer

- Karianne A Bjolstad
- Muhammad O Khalid
- Gustav Åbyholm Reehorst
- Fernando A Svendsrud

## Status

Planleggingsfasen (BMAD) pågår. Appen er ikke bygget ennå, så installasjon og kjøring beskrives her når koden finnes.

| Steg | Status |
|---|---|
| Product brief | Godkjent av faglærer |
| Research | Ferdig |
| PRD | Utkast, gjennomgås 12.11 ([issue #2](https://github.com/IBE160-2026/G62-bjolstad-khalid-reehorst-svendsrud/issues/2)) |
| UX-design | To forslag, gruppen velger ett ([issue #9](https://github.com/IBE160-2026/G62-bjolstad-khalid-reehorst-svendsrud/issues/9)) |
| Arkitektur, epics og stories | Neste |
| Kode og tester | Ikke startet |

Oppgaver og åpne spørsmål følges opp i [GitHub Issues](https://github.com/IBE160-2026/G62-bjolstad-khalid-reehorst-svendsrud/issues).

## Dokumentasjon

**Planlegging (BMAD)**
- [Product brief](.docs/planning-artifacts/briefs/brief-prompt-force-2026-09-16/) med tilbakemelding fra faglærer
- [PRD](.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md), med [tillegg](.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/addendum.md) (datamodell og tekniske detaljer)
- [Research](.docs/planning-artifacts/research/): trening, GDPR, datalisenser, strekkode, innlogging, Open Food Facts-dekning og forslag til teknologivalg
- [Øvelsesliste](.docs/planning-artifacts/ovelsesliste.md) og [gjennomgang med forslag til nye øvelser](.docs/planning-artifacts/ovelsesliste-gjennomgang-2026-11-11.md)

**UX-design**
- [Produktbeskrivelse for design](PRODUCT.md)
- Forslag A1: [konseptrunder og beslutninger](.docs/planning-artifacts/ux/konsepter/decisions.md), [valgt konsept](.docs/planning-artifacts/ux/valgt-konsept/), [DESIGN.md og EXPERIENCE.md](.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/)
- Forslag runde 3: [DESIGN.md, EXPERIENCE.md og mockups](.docs/planning-artifacts/ux/runde-3/)

**Prosess og KI-bruk**
- [KI-logg](.docs/ki-logg.md): hva vi ba KI om, hva den laget, og hva vi selv kontrollerte og endret
- [Sesjonslogger](.logs/): én mappe per gruppemedlem, med åpne punkter i `issues.md`

**Emnet**
- [Sensorveiledning del 1 – applikasjon og prosess](.docs/course/sensorveiledning-del1-applikasjon-og-prosess.pdf): vurderingskriteriene repoet skal oppfylle

## Mappestruktur

| Mappe | Innhold |
|---|---|
| `.docs/planning-artifacts/` | Brief, PRD, research, UX-design og øvelsesliste |
| `.docs/course/` | Dokumenter fra emnet |
| `.logs/` | Sesjonslogger per gruppemedlem |
| `_bmad/`, `.claude/` | BMAD-rammeverket og KI-skills som brukes i prosjektet |
