# Brief og PRD: nye detaljer fra opprinnelig pitch

## 2026-11-10 kl. 20:57 — Karianne

### Oppgave
Karianne limte inn den opprinnelige, uformelle pitchen for appen (målgruppe, designvisjon, anatomisk figur, søk, gratis treningsprogram/oppskrifter m.m.) og ba om at `brief.md` og `prd.md` oppdateres med detaljene som manglet.

### Plan
- Les begge dokumentene og sammenlign mot pitchen for å finne nye vs. motstridende punkter.
- Fant to reelle konflikter mot allerede bekreftede beslutninger i PRD-en: (1) pitchen sier 18+, PRD har bekreftet 16 år som minimumsalder; (2) pitchen ber om gratis treningsprogram/oppskrifter og en anatomisk øvelsesvelger, som grenser mot et eksplisitt non-goal («no training-programme generator … no planned workouts or schedules»).
- Spurte brukeren via AskUserQuestion om disse to konfliktene i stedet for å avgjøre dem selv.
- Svar: behold 16 år som minimumsalder; legg alle tre nye idéene (anatomisk figur, gratis treningsprogram, gratis oppskrifter) i Vision/Phase 2, ikke v1-krav.
- Implementerte resten av detaljene direkte (ikke-motstridende): designprinsipp («få knapper», ren forside), øvelsessøk på navn, kort valgfri førstegangsintro.

### Resultat
- `brief.md`: ny revisjonslinje (2026-11-10), designintensjon-avsnitt, bredere målgruppeformulering + behov for enkel introduksjon, ny bullet «Exercise search», utvidet Vision-avsnitt med anatomisk figur / gratis treningsprogram / gratis oppskrifter.
- `prd.md`: FR-20 utvidet til «Filter and search suggestions» (søk på navn), FR-28 utvidet med valgfri, avviselig førstegangsintro (ny `[ASSUMPTION]`, lagt i §12), ny NFR-11 (enkel forside med få knapper), §9.3 Vision utvidet med de tre nye idéene, ny endringslogg-linje nederst i dokumentet.
- Minimumsalder 16 år (§8.1 i PRD-en) er **ikke** endret — pitchens «18 år» er bevisst holdt som beskrivende tekst, ikke krav.
- Ingen kode er endret; kun de to dokumentene i `.docs/planning-artifacts/`.

### Åpne punkter
Ingen.
