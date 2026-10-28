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

## 2026-10-27 – Research og brainstorming før PRD

**Verktøy:** Claude Code
**Hvem:** Osman Khalid
**Bakgrunn:** Faglærer ba oss gjøre så mye relevant research som mulig før torsdag, slik at vi er klare til å starte på PRD-en. Vi skulle også kjøre `git pull` før vi jobbet videre.

### Hva vi ba KI om

1. Sjekke om repoet var oppdatert mot GitHub, og kjøre `git pull`.
2. Lage et research-dokument ut fra briefen, addendumet og tilbakemeldingen. Det skulle dekke: hva vi bør undersøke, hvilke spørsmål som er uklare, hvilke funksjoner vi bør diskutere, hva brukerne trenger, lignende løsninger, og hvor vi trenger mer informasjon.

### Hva KI produserte

| Resultat | Fil |
|---|---|
| Oppdatert `main` (2 nye commits fra GitHub) | – |
| Research- og brainstormdokument med agenda for torsdag | `.docs/planning-artifacts/research/research-prd-forberedelse-2026-10-27.md` |

KI gjorde også et kort nettsøk. Det viktigste funnet: Open Food Facts har en grense på 15 produktoppslag i minuttet, krever egen User-Agent og kildehenvisning (ODbL), og skal ikke brukes til «søk mens du skriver». Det innebygde `BarcodeDetector`-API-et virker ikke pålitelig på iOS Safari, så vi bør bruke et zxing-basert bibliotek.

### Hva vi selv vurderte og kontrollerte

- **Research-dokumentet:** Skumlest av Osman Khalid før commit. Grundig gjennomgang gjøres av hele gruppen på møtet torsdag.
- **Punkter merket [sjekk]** i dokumentet er ikke verifisert av KI, og må testes av gruppen. Det gjelder blant annet hvor godt Open Food Facts dekker norske varer, og strekkodeskanning på ekte mobiler.
- **Kildene** er delvis tredjepartssider. Grensene for Open Food Facts er hentet fra den offisielle dokumentasjonen.

### Status

- [x] `git pull` kjørt, `main` oppdatert
- [x] Research-dokumentet committet og pushet
- [ ] Research-dokumentet gjennomgått av gruppen
- [ ] [sjekk]-punktene testet (OFF-dekning, strekkode på mobil)

---

## 2026-10-28 – Gjennomgang og utbedring av øvelseslista

**Verktøy:** Claude Code
**Hvem:** Osman Khalid
**Bakgrunn:** Øvelseslista (`.docs/planning-artifacts/ovelsesliste.md`) ble lagt inn 2026-10-28. Vi ba KI gå gjennom den før PRD-en.

### Hva vi ba KI om

1. Gå gjennom øvelseslista og finne feil og hull.
2. Fikse det som måtte fikses.

### Hva KI produserte

- Kontrollerte at alle tall i oppsummeringen stemte, og at alle videolenkene finnes (oEmbed).
- Fant at en hjemmebruker med bare manualer eller bare kroppsvekt ikke fikk noen ryggøvelse. Sete og baksiden av lårene manglet også.
- La til fire øvelser (#31–34), og byttet video på tre øvelser (#16, #17, #29) der videoen passet dårlig til øvelsen eller til nybegynnere.

### Hva vi selv vurderte og kontrollerte

- Vi godtok forslagene om nye øvelser og nye videoer.
- KI har bare sjekket at videoene finnes og at titlene stemmer. KI har ikke sett innholdet.
- Spørsmålet om én eller flere muskelgrupper per øvelse (#13) tas opp på møtet.

### Status

- [x] Øvelseslista utbedret og pushet
- [ ] Alle 34 videoer sett gjennom av gruppen
- [ ] Avklart om en øvelse kan ha flere muskelgrupper

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
