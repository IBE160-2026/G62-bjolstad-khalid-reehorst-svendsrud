# KI-logg – Prompt Force (G62)

Denne loggen viser hvordan gruppen bruker KI i prosjektet: hva vi har bedt om, hva KI har produsert, og hva vi selv har vurdert, kontrollert og bestemt. Den oppdateres fortløpende.

**Regel for gruppen:** Alt KI lager er et utkast. Ingenting går inn i repoet før minst én i gruppen har kontrollert det, og større endringer (brief, PRD, arkitektur) godkjennes av hele gruppen.

---

## 2026-10-13 – Oppfølging av tilbakemelding på product brief

**Verktøy:** Claude (claude.ai)
**Hvem:** Osman Khalid
**Bakgrunn:** Vi fikk tilbakemelding fra faglærer 2026-10-06. Briefen var et godt utgangspunkt, men v1 hadde for stort omfang, primærbrukeren passet ikke med funksjonene, og det manglet en plan for eksterne tjenester og hvordan sensor kan kjøre appen.

### Hva vi ba KI om

1. Tolke tilbakemeldingen og foreslå konkrete neste steg for en gruppe på fire.
2. Finne alle `[ASSUMPTION]`-merkene i briefen og foreslå en avklaring for hvert av dem.
3. Lage regneeksempler med fasit for kaloriberegningen (Mifflin-St Jeor).
4. Lage en øvelsesliste med 30 øvelser, utstyrskrav, muskelgruppe og nivå.
5. Finne en instruksjonsvideo (YouTube) til hver øvelse.
6. Skrive et utkast til oppdatert brief som innarbeider tilbakemeldingen.

### Hva KI produserte

| Resultat | Fil |
|---|---|
| Plan for neste steg og agenda til gruppemøtet | (i chatten) |
| Liste over de sju `[ASSUMPTION]`-punktene med forslag | (i chatten) |
| Fire testprofiler med utregnet BMR og kaloriemål | Word-dokument med regneeksempler |
| Øvelsesliste med 30 øvelser og videolenker | `ovelsesliste.xlsx` |
| Utkast til oppdatert brief | `brief.md` |

### Hva vi selv vurderte og kontrollerte

- **Regneeksemplene:** [Kontroller utregningene for hånd eller i kalkulator, og skriv resultatet her, f.eks. «Alle fire profiler kontrollert av Osman Khalid, stemmer.»]
- **Øvelseslista:** Utstyrskrav og nivå må gjennomgås av gruppen. Videolenkene er funnet med søk og ikke sett gjennom av KI. Hver lenke må åpnes og godkjennes av en i gruppen.
- **Briefen:** Utkastet behandles på gruppemøtet. Viktige beslutninger som gruppen må stå inne for:
  - Primærbruker endret fra erfarne til nybegynnere og lett øvede (følger tilbakemeldingen)
  - Bildeestimering og gratis/pro flyttet til trinn 2
  - Open Food Facts som matvaredatabase, og mock-modus som standard for bilde-API
- **Motsigelse oppdaget:** KI fant at den gamle briefen lovet tilpassede treningsprogrammer i pro, samtidig som det samme var satt utenfor v1. Dette er rettet i utkastet.

### Status

- [ ] Regneeksempler kontrollert
- [ ] Videolenker gjennomgått
- [x] Brief godkjent av gruppen på møtet
- [x] Oppdatert `brief.md` committet i repoet

---

## Mal for nye oppføringer

```markdown
## ÅÅÅÅ-MM-DD – [Kort tittel]

**Verktøy:** [Claude / Claude Code / BMAD-agent]
**Hvem:** [navn]
**Bakgrunn:** [Hvorfor vi brukte KI her]

### Hva vi ba KI om
- ...

### Hva KI produserte
- ...

### Hva vi selv vurderte og kontrollerte
- [Hva vi godtok, hva vi endret, hva vi forkastet, og hvorfor]
- [Hvordan vi testet eller sjekket resultatet]

### Status
- [ ] ...
```
