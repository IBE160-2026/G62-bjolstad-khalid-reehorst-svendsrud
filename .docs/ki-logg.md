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

- **Regneeksemplene:** Kontrollert av Claude Code (2026-10-28) ved uavhengig utregning av Mifflin-St Jeor-formelen for alle fire profiler. Alle fire stemmer nøyaktig med tallene i briefen (BMR og kaloriemål, standard avrunding til nærmeste heltall):
  - Profil 1 (M, 80 kg, 180 cm, 25 år, 1,55): BMR = 1805, kaloriemål = 1805 × 1,55 = 2797,75 → 2798. Stemmer.
  - Profil 2 (K, 65 kg, 165 cm, 30 år, 1,375): BMR = 1370,25, kaloriemål = 1370,25 × 1,375 = 1884,09 → 1884. Stemmer.
  - Profil 3 (M, 95 kg, 178 cm, 50 år, 1,2): BMR = 1817,5, kaloriemål = 1817,5 × 1,2 = 2181,0 → 2181. Stemmer.
  - Profil 4 (K, 55 kg, 160 cm, 22 år, 1,725): BMR = 1279, kaloriemål = 1279 × 1,725 = 2206,275 → 2206. Stemmer.
  - Noter til PRD-en: tallene er trygge å bruke som akseptansekriterier. Det er ikke verifisert om appen skal avrunde til nærmeste heltall eller runde ned/opp konsekvent — avklar dette som en del av akseptansekriteriet, siden det kan gi ±1 kcal avvik i grensetilfeller (f.eks. profil 2 og 4, som begge har desimaldel over ,0).
- **Øvelseslista:** Utstyrskrav og nivå må gjennomgås av gruppen. Videolenkene er funnet med søk og ikke sett gjennom av KI. Hver lenke må åpnes og godkjennes av en i gruppen.
- **Briefen:** Utkastet behandles på gruppemøtet. Viktige beslutninger som gruppen må stå inne for:
  - Primærbruker endret fra erfarne til nybegynnere og lett øvede (følger tilbakemeldingen)
  - Bildeestimering og gratis/pro flyttet til trinn 2
  - Open Food Facts som matvaredatabase, og mock-modus som standard for bilde-API
- **Motsigelse oppdaget:** KI fant at den gamle briefen lovet tilpassede treningsprogrammer i pro, samtidig som det samme var satt utenfor v1. Dette er rettet i utkastet.

### Status

- [x] Regneeksempler kontrollert
- [ ] Videolenker gjennomgått
- [x] Brief godkjent av gruppen på møtet
- [x] Oppdatert `brief.md` committet i repoet

**Oppdatering 2026-10-28:** `ovelsesliste.xlsx` nevnt over ble aldri funnet i repoet eller git-historikken — den ble tilsynelatende aldri committet etter Claude.ai-sesjonen. Se egen oppføring under for hva som er gjort med dette.

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

## 2026-10-28 – Kontroll av regneeksempler og ny øvelsesliste

**Verktøy:** Claude Code
**Hvem:** Karianne
**Bakgrunn:** Fortsatt del av forberedelsene før PRD-møtet torsdag. To punkter fra forberedelsesdokumentet (seksjon 6) ble valgt ut for oppfølging: regneeksemplene for kaloriberegningen, og øvelseslista/videolenkene.

### Hva vi ba KI om
1. Kontroller de fire regneeksemplene for Mifflin-St Jeor-formelen i briefen for hånd/uavhengig.
2. Kontroller øvelseslista (`ovelsesliste.xlsx`) og videolenkene nevnt i oppføringen fra 2026-10-13.

### Hva KI produserte
- Uavhengig utregning (Python) av alle fire testprofilenes BMR og kaloriemål — se oppdatert status i oppføringen over.
- **Oppdaget at `ovelsesliste.xlsx` ikke finnes noe sted i repoet eller git-historikken** — søkt på filnavn, innhold og i alle commits på alle branches, uten treff. Filen ble tilsynelatende aldri lastet opp etter Claude.ai-sesjonen 2026-10-13.
- Etter avklaring med Karianne: laget en **ny** øvelsesliste med 30 øvelser fra bunnen (ikke en gjenoppretting av den gamle, siden innholdet i den ikke er kjent). Hver video er individuelt kontrollert mot YouTubes oEmbed-API (bekrefter at videoen finnes og at tittelen stemmer med øvelsen) — ikke bare funnet med søk og antatt riktig.

| Resultat | Fil |
|---|---|
| Ny øvelsesliste, 30 øvelser med utstyr, muskelgruppe, nivå og verifiserte videolenker | `.docs/planning-artifacts/ovelsesliste.md` |

### Hva vi selv vurderte og kontrollerte
- **Regneeksemplene:** Se fullstendig kontroll i oppføringen fra 2026-10-13 over.
- **Øvelseslista:** Alle 30 videolenker er maskinelt bekreftet til å eksistere og ha en tittel som matcher øvelsen (oEmbed-sjekk), men **ingen av dem er sett gjennom av et menneske ennå** — det gjenstår fortsatt, per regelen i denne loggen om at alt KI lager er et utkast. Utstyrskategoriene (de samme ni som i forberedelsesdokumentet) og nivåmerkingen (nybegynner/middels/øvet) er heller ikke gruppegjennomgått.

### Status
- [x] Regneeksempler kontrollert (se 2026-10-13-oppføringen)
- [x] Ny øvelsesliste laget med verifiserte videolenker
- [ ] Øvelseslista gjennomgått av gruppen (utstyr, nivå, og at videoene faktisk er pedagogisk gode — ikke bare at de finnes)

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

## 2026-10-28 – Research på treningsdelen

**Verktøy:** Claude Code
**Hvem:** Osman Khalid
**Bakgrunn:** Gruppen delte researchen før PRD-en mellom mat og trening. Osman tok treningsdelen.

### Hva vi ba KI om

1. Lage et research-dokument for treningsdelen uten å gjenta det som allerede er dekket (lisenser for wger og free-exercise-db).

### Hva KI produserte

| Resultat | Fil |
|---|---|
| Research på treningsdelen: andre apper, nybegynneranbefalinger, dekningsanalyse, regler for forslag, datamodell og spørsmål | `.docs/planning-artifacts/research/research-trening-2026-10-28.md` |

Det viktigste funnet: Dekningsanalysen er regnet ut fra øvelseslista og viser at brukere med bare kroppsvekt, bare kettlebell eller bare trekkestang ikke får noen skulder- eller armøvelse. Planke måles i sekunder, og det må datamodellen ta høyde for.

### Hva vi selv vurderte og kontrollerte

- Dekningsanalysen er regnet ut av et skript direkte fra `ovelsesliste.md`, ikke anslått av KI.
- ACSM-tallet for reps (8–12) kommer fra en sekundærkilde og må sjekkes mot originaldokumentet før det brukes i appen.
- Dokumentet tas opp med gruppen på møtet torsdag.

### Status

- [x] Research-dokumentet for trening committet og pushet
- [ ] Gjennomgått av gruppen
- [ ] Avklart om vi skal legge til øvelser for å tette hullene

---

## 2026-11-02 – Utkast til PRD

**Verktøy:** Claude Code (`bmad-prd`, rask vei)
**Hvem:** Osman Khalid
**Bakgrunn:** Faglærer ba alle bli ferdige med PRD-en innen torsdag 5. november. Møtet torsdag 29.10 bestemte ingenting, så Osman tok på seg å skrive hele utkastet.

### Hva vi ba KI om

1. Lage et komplett PRD-utkast ut fra briefen, tilbakemeldingen og all researchen i `.docs/planning-artifacts/research/`.
2. Stille de viktigste spørsmålene samlet, og merke resten som antakelser.

### Hva KI produserte

| Resultat | Fil |
|---|---|
| PRD med 30 funksjonskrav (FR-1–30), 10 ikke-funksjonelle krav, 5 brukerreiser, ordliste, åpne spørsmål og antakelser | `.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md` |
| Teknisk underlag til arkitekturen (datamodell, strekkode, OFF, Matvaretabellen, innlogging, personvern) | `addendum.md` i samme mappe |
| Beslutningslogg | `.memlog.md` i samme mappe |
| Kvalitetssjekk mot BMAD-sjekklista | `review-rubric.md` i samme mappe |

### Hva vi selv vurderte og kontrollerte

- **Osman bestemte:** kaloriemålet tar hensyn til mål (−500 / 0 / +300 kcal), matloggen har måltider og gram, utstyret velges med lagrede utstyrsprofiler, appen er på norsk, og aldersgrensen er 16 år (KI foreslo 18).
- **Antakelser** som KI har gjort, står samlet i §12 i PRD-en. Gruppen må godta eller endre dem.
- **Regneeksemplene** i FR-6 er de samme som i briefen. Mål-justeringen for profil 1 (2298 / 3098 kcal) er ny og må kontrolleres.

### Status

- [x] PRD-utkast skrevet og lest av Osman
- [ ] Gjennomgått av hele gruppen før torsdag 5. november
- [ ] Antakelsene i §12 godtatt eller endret
- [ ] Sikt-spørsmålet sendt til faglærer

---

## 2026-11-03 – PRD: strekkodeskanning blir «Should»

**Verktøy:** Claude Code
**Hvem:** Gustav Åbyholm Reehorst
**Bakgrunn:** Gjennomlesing av PRD-utkastet før torsdag 5. november. Innleveringen krever at appen kjøres i en nettleser, og sensor kjører den lokalt på en PC. PRD-en var bygget rundt mobil og kameraskanning på iPhone og Android.

### Hva vi ba KI om

1. Lese PRD-en og researchen, og foreslå hva vi bør godta eller endre i §11 og §12.
2. Endre PRD-en slik at appen er en nettapp for PC, med kameraskanning som et tillegg.

### Hva KI produserte

- Forslag til svar på alle punktene i §11 og §12 (godta 11 antakelser, endre FR-8).
- Endringer i `prd.md`: §1, UJ-2, FR-8, NFR-1, §7, §9.1, SM-4, §11 Q2 og §12.

### Hva vi selv vurderte og kontrollerte

- Gustav kom med kravet om at appen bare skal kjøres i nettleser. KI sjekket sensorveiledningen: den krever ikke bare PC, men sier at sensor kjører appen selv og gjerne prøver ulike skjermstørrelser. Vi beholder derfor tilpasning til små skjermer, men mobil er ikke hovedfokus.
- Kameraskanning (FR-8) er nå «Should». Å skrive inn strekkoden (FR-9) og søk (FR-11) er hovedveien, fordi sensor kan teste dem på PC.
- Kjønn i kaloriformelen (§11 Q6) diskuteres fortsatt i gruppen og er ikke endret.

### Status

- [x] FR-8-antakelsen i §12 endret
- [ ] Gruppen godtar endringen på møtet torsdag
- [ ] Kjønnsspørsmålet (§11 Q6) avklart

---

## 2026-11-10 – UX-konsepter: to runder og valgt konsept

**Verktøy:** Claude Code (Impeccable-skillen, Claude in Chrome)
**Hvem:** Osman Khalid
**Bakgrunn:** Neste steg etter PRD-en er UX-design. Vi fulgte arbeidsmåten fra forelesningen 9. november: generere konsepter som SVG, velge, slå sammen og kjøre nye runder. Designet er en del av vurderingen, og sensor skal se at vi har styrt prosessen selv.

### Hva vi ba KI om

1. Lese forelesningene fra 9. november (Panopto-transkripsjon via Claude in Chrome) og oppsummere arbeidsmåten.
2. Skrive `PRODUCT.md` fra PRD-en og briefen, og lage tre ulike konsepter for Dagsoversikten (PC og mobil).
3. Etter valget: lage tre app-varianter av konseptet vi likte best.

### Hva KI produserte

- `PRODUCT.md` (produktbeskrivelse for Impeccable).
- Runde 1: konsept A (Kjøleskapstavla), B (Treningsdagboka) og C (Kartlobene), som SVG generert med Python.
- Runde 2: A1 (Sidemeny), A2 (Mobil først) og A3 (To store fliser).
- `decisions.md` og `valgt-konsept/` under `.docs/planning-artifacts/ux/`.

### Hva vi selv vurderte og kontrollerte

- Osman valgte A etter runde 1, men påpekte at det burde føles mer som en app. Runde 2 la derfor til sidemeny, faner nederst på mobil, egne ikoner og trykkbare kort.
- Osman valgte A1 fordi den var renest. KI anbefalte A3, men det ble ikke fulgt.
- Svarene om produkt, stack (ikke bestemt) og merkevare (fritt frem) ble gitt av Osman før konseptene ble laget.
- Alle tall i skissene er fiktive og bygger på eksempelet med Sara i PRD-en.

### Status

- [x] Konsept valgt (A1)
- [ ] Gruppen ser over det valgte konseptet
- [ ] BMAD UX: `DESIGN.md` og `EXPERIENCE.md`

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
