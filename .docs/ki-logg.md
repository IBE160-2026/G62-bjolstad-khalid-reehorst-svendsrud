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

## 2026-11-10 – BMAD UX: DESIGN.md og EXPERIENCE.md

**Verktøy:** Claude Code (BMAD `bmad-ux`, rask vei)
**Hvem:** Osman Khalid
**Bakgrunn:** Når konseptet var valgt (A1), var neste steg å gjøre det om til BMAD sine to UX-filer, slik foreleseren viste 9. november.

### Hva vi ba KI om

1. Kjøre BMAD UX på rask vei ut fra PRD-en, briefen, `PRODUCT.md` og det valgte konseptet A1.

### Hva KI produserte

- `DESIGN.md`: farger, typografi, avstander, hjørner, skygger og komponenter.
- `EXPERIENCE.md`: alle skjermer, tekstene i appen, feil- og tomtilstander, tastatur og tilgjengelighet, og fem brukerreiser med Sara.
- Begge ligger i `.docs/planning-artifacts/ux-designs/ux-prompt-force-2026-11-10/`, med beslutningslogg i `.memlog.md`.

### Hva vi selv vurderte og kontrollerte

- Osman valgte rask vei, at fargene fra A1 låses, og at v1 bare får lys modus.
- KI målte kontrasten: oransje #D9542B ga 4.0:1 på hvitt og er for svak til tekst. Det ble lagt til en mørkere nyanse (#B9471F, 5.3:1) for oransje tekst.
- KI kontrollerte at eksempelprofilen til Sara gir nøyaktig 1 640 kcal med formelen i FR-6. Den første versjonen ga 1 491 og ble rettet.
- Ingen kvalitetskontrollører ble kjørt (valgt bort for å spare tid).

### Status

- [x] DESIGN.md og EXPERIENCE.md skrevet
- [ ] Gruppen bekrefter fonten (Atkinson Hyperlegible)
- [ ] Komponentbibliotek velges i arkitekturfasen

---

## 2026-11-10 – Open Food Facts-test og ACSM-sjekk

**Verktøy:** Claude Code
**Hvem:** Osman Khalid
**Bakgrunn:** To åpne punkter før arkitekturen: hvor godt OFF dekker norske varer (PRD §11 Q3), og om ACSM-tallet 8–12 reps stemmer med originalkilden (PRD §11 Q5). Ingen andre i gruppen hadde startet på dem.

### Hva vi ba KI om

1. Teste 15 vanlige norske varer mot Open Food Facts og kontrollere kcal mot Oda.
2. Sjekke ACSM-anbefalingen mot originaldokumentet.

### Hva KI produserte

- `.docs/planning-artifacts/research/off-dekning-og-acsm-2026-11-10.md` med tabell, metode, begrensninger og kilder.
- Oppdatert `research-trening-2026-10-28.md`: 8–12 reps er bekreftet.

### Hva vi selv vurderte og kontrollerte

- Varelisten ble laget før søket, så OFF ikke styrte utvalget. Resultat: 9 av 15 funnet med norsk oppføring og kcal, 4 delvis, 2 ikke funnet.
- Testen er et navnesøk, ikke et strekkodeoppslag. Det står som begrensning i dokumentet.
- PubMed-siden kunne ikke leses direkte (cookie-side). Sammendraget ble hentet fra NCBI sitt offisielle API i stedet. 8–12 reps og 2–3 dager i uka er bekreftet, men antall sett står ikke i sammendraget og er derfor fortsatt ubekreftet.

### Status

- [x] OFF-dekning testet med navnesøk
- [x] ACSM 8–12 reps bekreftet
- [ ] Teste strekkodeoppslag med strekkodene fra tabellen (SM-4)
- [ ] Gruppen tar stilling til kcal-kontroll og manuell registrering i arkitekturen

---

## 2026-11-13 – PRD oppdatert og satt til «final»

**Verktøy:** Claude Code (BMAD `bmad-prd`, update)
**Hvem:** Osman Khalid, etter godkjenning fra gruppen
**Bakgrunn:** Gruppen godkjente alle forslagene i `gjennomgang-torsdag-2026-11-12.md` i Discord 12.11, og faglærer la inn formativ tilbakemelding på PRD-en samme dag.

### Hva vi ba KI om

1. Oppdatere PRD-en med gruppens beslutninger og faglærers fem forbedringspunkter, og sette den til «final».

### Hva KI produserte

- Oppdatert `prd.md`: prioritet på alle FR-er, FR-14 og FR-24 til «Must», testbare konsekvenser på elleve FR-er, PC som primær testenhet, oppdiktede profiler i brukertester, regler for bildefunksjonen i fase 2, og rettede småfeil. §11 og §12 er skrevet om etter hva som er besvart.
- Nye linjer i `.memlog.md` og i endringsloggen nederst i PRD-en.

### Hva vi selv vurderte og kontrollerte

- Gruppen bestemte kjønn (påkrevd), at oppskrifter og treningsprogram kommer etter v1, og at UX-designene slås sammen. Teknologi er ikke avklart.
- Faglærer pekte på muskelgrupper som blokkerende før arkitekturen, og gruppen hadde ikke svart. Osman bestemte én primær og 0–2 sekundære muskelgrupper; gruppen kan protestere i issue #7.
- KI la inn en ny antakelse (maks 5 000 g per matlogg i FR-13). Den er merket `[ASSUMPTION]`, ikke skjult.
- Kaloriegulvet på 1 200 / 1 500 kcal er godtatt, men mangler fortsatt en kilde. Det står som `[NOTE FOR PM]`.
- BMAD sine kvalitetskontrollører ble ikke kjørt på denne oppdateringen.

### Status

- [x] PRD satt til «final»
- [ ] Finne kilde for kaloriegulvet
- [ ] Lage felles UX-design (A1 + runde 3)

---

## 2026-11-13 – Arkitektur (BMAD architecture)

**Verktøy:** Claude Code (BMAD `bmad-architecture`, rask vei)
**Hvem:** Osman Khalid
**Bakgrunn:** PRD-en var ferdig, og gruppen (Osman og CoolMellon) godtok teknologiforslaget: faglærers oppsett, forenklet. Faglærer sa 12.11 at sensor kjører appen med Docker.

### Hva vi ba KI om

1. Lage arkitekturen (BMAD sin «architecture spine») ut fra PRD-en, UX, research og faglærers technology.md.

### Hva KI produserte

- `ARCHITECTURE-SPINE.md` med 17 arkitekturbeslutninger (AD-1 til AD-17), konvensjoner, versjoner, diagrammer (avhengigheter, Docker Compose, datamodell, mappestruktur) og en tabell som kobler hvert krav i PRD-en til modul og beslutning.
- Beslutningslogg i `.memlog.md`.

### Hva vi selv vurderte og kontrollerte

- Versjonene er sjekket direkte i npm, PyPI og Docker Hub 13.11, ikke tatt fra KI-ens hukommelse. Websøkene ga sprikende svar, så registrene ble brukt i stedet.
- BMAD sin lint-sjekk fant én feil (beslutningene sto i feil rekkefølge), som ble rettet.
- En gjennomgang der vi lette etter steder to utviklere kan bygge ting som ikke passer sammen, fant fire hull. De ble tettet: hvilken modul som eier hvert regnestykke, hvem som sjekker samtykke, hvem som lager standard utstyrsprofiler, og hvordan kalorimålet lagres.
- To antakelser er merket: TypeScript-versjon, og at kalorimålet ikke har historikk.
- BMAD sine kontrollører som subagenter ble ikke kjørt; gjennomgangen ble gjort i samme økt.

### Status

- [x] Arkitektur ferdig
- [ ] Epics og stories

---

## 2026-11-13 – Epics og stories (BMAD)

**Verktøy:** Claude Code (BMAD `bmad-create-epics-and-stories`)
**Hvem:** Osman Khalid
**Bakgrunn:** PRD og arkitektur var ferdige. Neste steg er å dele kravene opp i epics og stories, slik at hver story kan bygges i et eget kontekstvindu (forelesning 12.11).

### Hva vi ba KI om

1. Hente ut alle krav fra PRD, arkitektur og UX, og foreslå epics.
2. Skrive stories med akseptansekriterier, én epic om gangen, og kontrollere dekning og avhengigheter.

### Hva KI produserte

- `.docs/planning-artifacts/epics.md`: 30 FR, 11 NFR, krav fra arkitekturen og 18 UX-krav, 7 epics og 32 stories med Given/When/Then-kriterier og en «Covers:»-linje som peker tilbake til kravene.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente hvert steg og hver epic underveis.
- UX: gruppen stemte for å slå sammen A1 og runde 3. Osman valgte at stories bygger på A1 sin struktur og henter metodevalg, muskelgruppeliste og hjelpeknapp fra runde 3. Farger og fonter tas i én story når det felles designet er valgt.
- Osmans idé om Open Food Facts (no.openfoodfacts.org) ble story 3.7: import av norske varer til lokal database.
- CoolMellon fant 10 norske strekkoder. Alle ble funnet, men honning hadde feil kcal i Open Food Facts (95 i stedet for rundt 300). Det er dokumentert, og grensene i issue #13 hadde ikke fanget det.
- Sluttkontrollen fant én avhengighet til en senere story (3.1 → 3.2), som ble rettet. Alle krav er dekket av minst én story (sjekket med skript).

### Status

- [x] Epics og stories
- [ ] Felles UX-design (A1 + runde 3)
- [ ] Starte implementasjon med story 1.1

---

## 2026-11-13 – Strekkodetest med varer hjemme (SM-4)

**Verktøy:** Claude Code
**Hvem:** Gustav Åbyholm Reehorst
**Bakgrunn:** Ossi04 ba i Discord om strekkodene fra 10 varer hjemme, så vi kunne kjøre den ekte strekkodetesten (issue #14).

### Hva vi ba KI om

1. Finne strekkodene til 10 norske varer på Open Food Facts.
2. Slå dem opp i OFF-API-et og legge resultatet i en egen mappe i repoet, med bilder.

### Hva KI produserte

- `.docs/planning-artifacts/research/strekkodetest-fysiske-varer-2026-11-13/research.md` med tabell, funn og begrensninger.
- `bilder/` med en generert EAN-13-strekkode per vare.

### Hva vi selv vurderte og kontrollerte

- Gustav bekreftet at alle 10 varene finnes hjemme.
- Kontrollsifrene ble sjekket, og alle bildene ble lest tilbake med strekkodeleseren zxing-cpp. Alle ga riktig tall.
- kcal ble kontrollert mot kJ i samme oppføring. Akasiehonning har feil kcal (95 i stedet for 329). Det er et funn for arkitekturen.
- Utvalget kom fra OFF sin liste over populære varer, så 10 av 10 overvurderer dekningen. Derfor ble det gjort en del 2.

### Del 2: 10 tilfeldige varer, fotografert

- Gustav fotograferte 10 tilfeldige varer og ga bildene til ChatGPT, som leste av strekkodene.
- Claude Code kontrollerte tallene med kontrollsiffer, nettleserens strekkodeleser og manuell avlesning. **ChatGPT hadde lest 2 av 10 feil** (én kode som ikke finnes, én med feil kontrollsiffer), og gjettet feil navn på tre varer. Med de rettede tallene ble alle 10 funnet.
- Fant en ny datafeil i OFF: Carlsberg har 0,146 kJ i stedet for rundt 146.
- Metadata (EXIF) ble fjernet fra bildene før de ble lagt i repoet.

### Status

- [x] Strekkodeoppslag testet med 10 varer hjemme
- [x] SM-4: 10 tilfeldige varer testet, 10 av 10 funnet
- [ ] Gruppen tar stilling til kcal-kontroll mot kJ og håndtering av HTTP 429

---

## 2026-11-13 – Felles UX-design (A1 + runde 3)

**Verktøy:** Claude Code (BMAD `bmad-ux`, oppdatering)
**Hvem:** Osman Khalid, etter gruppens avstemning 12.11
**Bakgrunn:** Osman (A1) og Karianne (runde 3) laget hvert sitt UX-design. Gruppen stemte for å slå dem sammen. Det felles designet trengs før story 1.2 (meny og design).

### Hva vi ba KI om

1. Slå sammen designene: utseendet fra runde 3, fargekodene og strukturen fra A1 (Osmans valg).

### Hva KI produserte

- Ny `DESIGN.md` og oppdatert `EXPERIENCE.md` i `ux-designs/ux-prompt-force-2026-11-10/`, med beslutningene i `.memlog.md` og `ux/konsepter/decisions.md`.

### Hva vi selv vurderte og kontrollerte

- KI målte kontrasten for alle fargepar. Teal fra runde 3 og grønn fra A1 hadde kontrast 1,04 mot hverandre, altså nesten like, og ville gjort «fullført» og «mat» forvekslbare. Teal ble tatt ut.
- Grønn tekst ble gjort mørkere (#2A7350), fordi den opprinnelige grønne bare så vidt nådde 4,5:1 på papirbakgrunnen.
- Kaloriringen fra runde 3 ble ikke tatt med, fordi PRD-en (FR-7) ber om ett tall med en forklarende setning.
- Gruppen har ikke sett det ferdige resultatet ennå.

### Status

- [x] Felles DESIGN.md og EXPERIENCE.md
- [ ] Gruppen ser over det felles designet (issue #9)

---

## 2026-11-13 – Felles UX-design, revisjon 2

**Verktøy:** Claude Code
**Hvem:** Osman Khalid, etter tilbakemelding fra Karianne på PR #17
**Bakgrunn:** Karianne syntes fargene var i ubalanse, savnet notatbok-stilen fra runde 3 og ville ha en mer stilren font.

### Hva vi ba KI om

1. Rette designet etter Kariannes tilbakemelding. Osman valgte Inter som eneste font.

### Hva KI produserte

- Ny mockup `imports/felles-design-v2-i-dag.html` (PC og mobil) og oppdatert `DESIGN.md`, `.memlog.md` og `ux/konsepter/decisions.md`.

### Hva vi selv vurderte og kontrollerte

- KI fant at runde 3-mockupen egentlig viste Georgia, fordi Fraunces aldri ble lastet inn. Derfor så det felles designet annerledes ut enn Karianne forventet.
- Oppskriftssidene ble ikke tatt inn i v1, fordi gruppen 12.11 bestemte at oppskrifter kommer etter v1. De beholdes som design for fase 2.
- Karianne må godkjenne revisjonen.

### Status

- [x] Notatbok-linjer, roligere farger og Inter
- [ ] Karianne godkjenner PR #17

---

## 2026-11-15 – Sprint planning og story 1.2 (app-skall)

**Verktøy:** Claude Code (BMAD `bmad-sprint-planning` og `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Vi trengte en oversikt over alle stories, og app-skallet (meny, farger, lys/mørk modus) som alle senere skjermer bygger på.

### Hva vi ba KI om

1. Lage `sprint-status.yaml` fra epics.md.
2. Bygge story 1.2 med midlertidige designverdier, siden det endelige designet venter i PR #17.

### Hva KI produserte

- `sprint-status.yaml` med 7 epics og 32 stories.
- Spec, meny for PC/nettbrett/mobil, tokenfil med lys og mørk variant, kontrasttabell, stilguide (VOICE.md) og 19 tester.

### Hva vi selv vurderte og kontrollerte

- Osman så planen som visuell mockup og godkjente den før koding.
- Tre KI-kontrollører gikk gjennom koden; 5 funn ble rettet, 3 utsatt og 7 avvist med begrunnelse (se spec-fila).
- Oransje tekst på oransje bakgrunn var under kontrastkravet (4,35:1); fargen ble gjort litt mørkere.
- Tester, lint og build passerer. Gruppen må se over PR-en.

### Status

- [x] Sprint planning
- [x] Story 1.2 bygget og testet
- [x] Review av PR fra gruppen (PR #18 flettet)

---

## 2026-11-15 – Design revisjon 3 (Karianne sitt endelige design)

**Verktøy:** Claude Code
**Hvem:** Osman Khalid
**Bakgrunn:** Karianne delte sitt endelige design i Claude Design (font, farger og mørk modus). Det skulle inn i DESIGN.md (PR #17) og i appen (PR #18).

### Hva vi ba KI om

1. Lese designet hennes og sammenligne det med DESIGN.md og appen.
2. Ta inn det som var avklart (Manrope og mørk modus) og beholde grønt og oransje til gruppa bestemmer seg.

### Hva KI produserte

- DESIGN.md revisjon 3: Manrope, mørke farger (`colors-dark`), sidemeny 210 px, kort 18 px, knapper 50 px.
- Nye verdier i `tokens.css`, ny kontrasttabell og Manrope i appen.

### Hva vi selv vurderte og kontrollerte

- To av de mørke fargene var under kravet 4,5:1 (lilla tekst på aktivt menypunkt 3,4:1 og knappetekst 4,47:1). KI foreslo små justeringer, og alle par passerer nå.
- Tynn skrift (300) brukes bare på store tall og titler, så brødteksten er lett å lese.
- Tester, lint og build passerer, og lys og mørk modus ble sjekket i nettleseren.

### Status

- [x] DESIGN.md og appen oppdatert
- [x] Én lilla farge for Mat og Trening (Osman valgte Karianne sitt forslag)
- [x] Magnetene i ukestripen fjernet, som i Karianne sitt design

---

## 2026-11-15 – Story 1.3 (opprett konto)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukerne må kunne lage en konto før vi kan lagre data som bare de ser.

### Hva vi ba KI om

1. Bygge registrering etter arkitekturen: sikre passord, innlogging med server-sesjon og beskyttelse mot falske skjema fra andre nettsider.

### Hva KI produserte

- Spec, tabellene `users` og `sessions`, registrerings-endepunkt, Origin-sjekk, siden «Opprett konto» og 21 nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Tre KI-kontrollører fant 24 punkter: 4 ble rettet (blant annet at en tom APP_URL kunne slå av sikkerhetssjekken), 2 utsatt og 18 avvist med begrunnelse (se spec-fila).
- Registrering ble testet gjennom den ekte appen: riktig cookie og passord lagret som Argon2id-hash.

### Status

- [x] Story 1.3 bygget og testet
- [x] Review av PR fra gruppen (PR #19 flettet)

---

## 2026-11-15 – Story 1.4 (logg inn og ut)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukerne må kunne logge inn igjen, logge ut på en delt PC, og være beskyttet mot passordgjetting.

### Hva vi ba KI om

1. Bygge innlogging, utlogging, sperre etter 5 feil og omdirigering etter arkitekturen.

### Hva KI produserte

- Spec, endepunkter for innlogging/utlogging/«hvem er jeg», sperre i databasen, siden «Logg inn», «Logg ut» på Profil og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Tre KI-kontrollører fant 18 punkter: 3 rettet (blant annet at en ny bruker kunne bli sendt feil etter en gammel utløpt innlogging), 15 avvist med begrunnelse.
- To kjente risikoer er bevisst godtatt: sperren viser hvilke e-poster som har konto, og noen som kjenner e-posten kan holde kontoen låst.
- Tester viser sperren, at den går ut, og at én bruker ikke ser en annens data.

### Status

- [x] Story 1.4 bygget og testet
- [x] Review av PR fra gruppen (PR #20 flettet)

---

## 2026-11-15 – Glemt passord i planen (FR-31)

**Verktøy:** Claude Code
**Hvem:** Osman Khalid, etter forslag fra Karianne i Discord
**Bakgrunn:** Gruppa ville at brukere som glemmer passordet kan få en lenke på e-post.

### Hva vi ba KI om

1. Legge «glemt passord» inn i PRD, epics, arkitektur og sprint-status.

### Hva KI produserte

- FR-31 (Should) i PRD-en, Story 1.7 i epics.md, e-post som port i arkitekturen og ny linje i sprint-status.

### Hva vi selv vurderte og kontrollerte

- Kravet om bare gratis tjenester gjelder fortsatt: lokalt havner e-postene i en lokal e-postfanger, så ingen nøkler eller betalte tjenester trengs.
- Samme svar uansett om e-posten finnes, så funksjonen ikke avslører hvem som har konto.
- Satt som Should, så den kuttes før Must-kravene hvis tiden blir knapp.

### Status

- [x] Lagt inn i planen
- [ ] Story 1.7 bygget

---

## 2026-11-15 – Story 1.5 (samtykke før helsedata)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Vekt, mat og trening er helsedata (GDPR art. 9), så brukeren må aktivt samtykke før noe lagres.

### Hva vi ba KI om

1. Bygge samtykkeskjermen og en felles sjekk som stopper helsedata uten samtykke.

### Hva KI produserte

- Spec, `consent_at` i databasen, samtykke-endepunkt, `require_consent`-sjekken, samtykkeskjermen og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Tre KI-kontrollører fant 17 punkter: 4 rettet (blant annet at avkrysningsboksen var for liten å trykke på mobil), 13 avvist med begrunnelse.
- Samtykketeksten er skrevet av KI ut fra PRD-en; gruppa bør lese den.

### Status

- [x] Story 1.5 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-15 – Story 1.6 (slett konto)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukerne må kunne slette kontoen sin, så helsedata ikke blir liggende (FR-4, GDPR).

### Hva vi ba KI om

1. Bygge sletting med bekreftelse, myk sletting med en gang og hard sletting etter 30 dager.

### Hva KI produserte

- Spec, slette-endepunkt, filtrering av slettede kontoer i alle oppslag, `purge`-kommando, bekreftelsesboks på Profil og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Tre KI-kontrollører fant 18 punkter: 5 rettet (blant annet at tilbakerulling av databasen ville gjort slettede kontoer aktive igjen), 2 utsatt, 11 avvist med begrunnelse.
- `purge` må kjøres for hånd (slik arkitekturen sier); hvordan det skal skje jevnlig er et åpent punkt.

### Status

- [x] Story 1.6 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-15 – Deaktiver konto i planen (FR-32)

**Verktøy:** Claude Code
**Hvem:** Osman Khalid, etter forslag fra Karianne i Discord
**Bakgrunn:** Gruppa ville at brukere kan ta en pause uten å slette dataene sine, slik mange andre apper har.

### Hva vi ba KI om

1. Legge «deaktiver konto» inn i PRD, epics, arkitektur og sprint-status.

### Hva KI produserte

- FR-32 (Should) i PRD-en, Story 1.8 i epics.md, linje i arkitekturtabellen og sprint-status.

### Hva vi selv vurderte og kontrollerte

- Deaktivering sletter ingenting, og innlogging aktiverer kontoen igjen – enkelt å forstå for nybegynnere.
- Deaktiverte kontoer slettes aldri automatisk; vil man bli kvitt dataene, sletter man kontoen (FR-4).
- Satt som Should, så den kuttes før Must-kravene hvis tiden blir knapp.

### Status

- [x] Lagt inn i planen
- [ ] Story 1.8 bygget

---

## 2026-11-15 – Story 2.1 (kaloriemål)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Nybegynnere skal få ett kaloritall forklart på vanlig norsk, uten å lære formler.

### Hva vi ba KI om

1. Bygge Profiloppsett og utregningen av kaloriemålet etter PRD-en og arkitekturen.

### Hva KI produserte

- Spec, `profile`-modul med utregningsfunksjon, profiltabell, API, siden Profiloppsett og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Testene sjekker at alle eksempelprofilene i PRD-en gir nøyaktig riktig tall (blant annet Sara: 1 640 kcal).
- Tre KI-kontrollører fant 17 punkter: 5 rettet (blant annet at feilmeldinger på valgknapper ikke ble lest opp av skjermleser), 12 avvist med begrunnelse.
- Kilden for minstegrensen 1 200/1 500 kcal mangler fortsatt.

### Status

- [x] Story 2.1 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-15 – Story 2.2 (endre profilen)

**Verktøy:** Claude Code (BMAD `bmad-build`, hurtigrute)
**Hvem:** Osman Khalid
**Bakgrunn:** Når vekten eller målet endrer seg, må kaloriemålet følge med.

### Hva vi ba KI om

1. La brukeren endre profilen på Profil-siden og se det nye målet med en gang.

### Hva KI produserte

- Kort spec, profilredigering på Profil-siden og nye tester. Ingen endring i backend.

### Hva vi selv vurderte og kontrollerte

- Liten endring, så hurtigruten med én kontrollør ble brukt.
- Kontrolløren fant 10 punkter: 5 rettet (blant annet at en feil ved henting i bakgrunnen skjulte skjemaet), 5 avvist med begrunnelse.

### Status

- [x] Story 2.2 bygget og testet

---

## 2026-11-16 – Story 2.3 (kom i gang-intro)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Nye brukere skal forstå hva appen gjør før de møter skjemaet.

### Hva vi ba KI om

1. Lage en kort intro som vises én gang etter samtykke og aldri igjen.

### Hva KI produserte

- Spec, dialogen «Slik kommer du i gang», lagring av at den er lukket på brukeren og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Tre KI-kontrollører fant 15 punkter: 4 grupper rettet (blant annet at Esc i Chrome kunne lukke dialogen uten å lagre valget), 7 avvist med begrunnelse.
- Brukere som allerede hadde profil, får ikke introen (migreringen fyller inn feltet for dem).

### Status

- [x] Story 2.3 bygget og testet
- [x] Review av PR fra gruppen (PR #26 flettet)

---

## 2026-11-16 – Story 3.1 (søk etter mat og logg den)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Første del av matloggingen: finne vanlig mat og logge hvor mye man spiste.

### Hva vi ba KI om

1. Lage startdata fra Matvaretabellen og bygge søk, logging og Mat-siden.

### Hva KI produserte

- Utvalg av 181 matvarer fra Matvaretabellen 2026 (med skript som lager fila), `food`-modul, Mat-siden med måltider og summer, og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente nedlastingen fra Matvaretabellens åpne API og spec-en før koding.
- Kildeteksten «Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no» vises der dataene brukes (lisenskrav).
- Tre KI-kontrollører fant 30 punkter: 8 grupper rettet (blant annet at sletting av en matvare kunne fjerne logghistorikk, og at datoen ikke skiftet ved midnatt), 12 avvist med begrunnelse.

### Status

- [x] Story 3.1 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-16 – Story 3.2 (registrer egen mat)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Når en matvare mangler i databasen, må brukeren likevel kunne logge den.

### Hva vi ba KI om

1. Bygge skjemaet for egen matvare og koble det til søket og gram-valget.

### Hva KI produserte

- Spec, endepunkt for egne matvarer, «Manuelt»-fanen, «Registrer selv»-lenken og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Et akseptansekriterium var formulert feil (felles «potetlefse» skal fortsatt vises for andre); vi rettet ordlyden, ikke koden.
- Tre KI-kontrollører fant 20 punkter: 6 rettet (blant annet at «2.000» ble lest som 2 g), 14 avvist med begrunnelse.

### Status

- [x] Story 3.2 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-16 – Story 3.3 (skriv inn strekkode)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Pakkevarer logges raskest med strekkode, uten å skrive inn næringsverdier selv.

### Hva vi ba KI om

1. Koble appen til Open Food Facts bak en port med ekte og falsk variant (AD-7), og lage strekkode-fanen.

### Hva KI produserte

- Spec, OFF-port, EAN-kontroll, strekkodeoppslag, migrering, «Skriv strekkode»-fanen og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Testene bruker faste svar med ekte norske strekkoder fra vår egen research (13.11), og kaller aldri Open Food Facts.
- Appen holder seg under OFF sin grense (maks 14 oppslag i minuttet) og sender egen User-Agent.
- Tre KI-kontrollører fant 16 punkter: 5 grupper rettet (blant annet at en kode med linjeskift ga serverfeil), 1 utsatt, 10 avvist med begrunnelse.

### Status

- [x] Story 3.3 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-16 – Story 3.4 (nylig brukt)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Folk spiser ofte det samme; logging skal ta maks 3 trykk (SM-6).

### Hva vi ba KI om

1. Lage «Nylig brukt» der en tidligere logget matvare kan logges igjen raskt.

### Hva KI produserte

- Spec, endepunkt for nylig brukte matvarer, «Nylig brukt»-fanen og nye tester.

### Hva vi selv vurderte og kontrollerte

- KI fant en motsetning i planen (3.1 sier Søk først, 3.4 krever 3 trykk). Osman valgte at boksen åpner på «Nylig brukt» når brukeren har historikk.
- Tre KI-kontrollører fant 11 punkter: 5 grupper rettet (blant annet at fanen kunne bytte seg selv mens brukeren var i Søk), 1 utsatt, 4 avvist med begrunnelse.

### Status

- [x] Story 3.4 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-16 – Story 3.5 (porsjoner i stedet for gram)

**Verktøy:** Claude Code (BMAD `bmad-build`, hurtigrute)
**Hvem:** Osman Khalid
**Bakgrunn:** Pakkevarer med kjent porsjonsstørrelse skal kunne logges uten å veie.

### Hva vi ba KI om

1. Legge til valget «Porsjoner» i gram-valget.

### Hva KI produserte

- Kort spec, enhetsvalg, omregning til gram og nye tester. Ingen endring i backend.

### Hva vi selv vurderte og kontrollerte

- Testene fant en avrundingsfeil (1,5 × 33,3 g ble 49,9 i stedet for 50,0); rettet ved å regne i hele tideler.
- Kontrolløren fant 11 punkter: 4 rettet (blant annet at piltaster ikke kunne bytte enhet), 7 avvist med begrunnelse.

### Status

- [x] Story 3.5 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-16 – Story 3.6 (endre eller slette matoppføring)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Feil logget mat må kunne rettes eller fjernes, så dagens tall blir riktige.

### Hva vi ba KI om

1. Bygge endring og sletting med «Angre», uten at kaloritallet fra da maten ble logget endres.

### Hva KI produserte

- Spec, endepunkter for endre/slette/gjenopprette, myk sletting, «Angre»-melding og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Myk sletting ble valgt så «Angre» henter tilbake nøyaktig samme oppføring; `purge` rydder etter ett døgn.
- Tre KI-kontrollører fant 13 punkter: 6 rettet (blant annet at «Angre»-meldingen nå pauses når man holder musen over eller har fokus på den, for tilgjengelighet), 7 avvist med begrunnelse.

### Status

- [x] Story 3.6 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-16 – Muskelfigur i planen (FR-33)

**Verktøy:** Claude Code
**Hvem:** Osman Khalid, etter forslag fra Fernando Svendsrud (ungefernando) og Karianne i Discord
**Bakgrunn:** Gruppa ville at øvelsessiden viser hvilke muskler som jobber på en kroppsfigur.

### Hva vi ba KI om

1. Legge en enkel muskelfigur inn i PRD, epics, arkitektur og sprint-status.

### Hva KI produserte

- FR-33 (Should) i PRD-en og Story 4.6 i epics.md.

### Hva vi selv vurderte og kontrollerte

- Karianne prøvde en anatomisk modell før og gikk bort fra den; derfor er figuren nå bare visning, ikke klikkbar.
- Musklene står også som tekst, så informasjonen ikke bare avhenger av farge (tilgjengelighet).

### Status

- [x] Lagt inn i planen
- [ ] Story 4.6 bygget

---

## 2026-11-16 – Story 4.1 (øvelser med video)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Nybegynnere må kunne se hva en øvelse er og hvordan den gjøres trygt.

### Hva vi ba KI om

1. Lage øvelsesdataene fra øvelseslista og sidene for liste og øvelse med video.

### Hva KI produserte

- Spec, `exercises`-modul, startdata for 34 øvelser, Trening-siden, øvelsessiden og nye tester.
- KI skrev type, hjelpemuskler og tre steg per øvelse – merket som utkast.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Navn, utstyr, nivå og video-ID-er kommer fra gruppas egen øvelsesliste; en test sjekker alle 34 video-ID-er.
- Tre KI-kontrollører fant 14 punkter: 8 grupper rettet, 6 avvist med begrunnelse.
- Gruppa må lese KI-utkastet og se gjennom videoene (issue #6).

### Status

- [x] Story 4.1 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 3.7 (norske merkevarer i søket)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Søket fant bare råvarer; brukere vil finne for eksempel «Tine Lettmelk» uten å skrive strekkode.

### Hva vi ba KI om

1. Lage en importkommando som henter populære norske produkter fra Open Food Facts og lagrer dem i repoet.

### Hva KI produserte

- Importkommando, innlasting ved oppstart, lisensfil (ODbL), README-avsnitt og tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente nedlastingen og valgte de mest populære produktene (først 2 000, så 1 000 da Open Food Facts var ustabil).
- Open Food Facts svarte «503» store deler av en dag; KI la til nye forsøk og en hurtigbuffer så importen kunne fortsette der den stoppet.
- Søk på «lettmelk» ble sjekket i den ekte appen og finner TINE og Q.
- Tre KI-kontrollører fant 21 punkter: 7 grupper rettet, 7 avvist med begrunnelse.

### Status

- [x] Story 3.7 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 4.2 (lagre utstyret mitt)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Appen må vite hvilket utstyr brukeren har for å foreslå øvelser de faktisk kan gjøre.

### Hva vi ba KI om

1. Lage utstyrsprofiler med standardprofilene «Hjemme» og «Treningssenter».

### Hva KI produserte

- Spec, tabeller og endepunkter for utstyrsprofiler, standardprofiler ved registrering, «Utstyr» på Profil-siden og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Kroppsvekt er alltid med, og dette håndheves av serveren, ikke bare i skjermbildet.
- Tre KI-kontrollører fant 22 punkter: 7 grupper rettet, 1 utsatt, 7 avvist med begrunnelse.

### Status

- [x] Story 4.2 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 4.3 (øvelser som passer utstyret)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Nybegynnere med lite utstyr skal bare se øvelser de faktisk kan gjøre.

### Hva vi ba KI om

1. Lage forslagsregelen som en testet funksjon og profilvelgeren på Trening-siden.

### Hva KI produserte

- Spec, forslagsfunksjon, endepunkt, profilvelger, gruppert forslagsliste og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- KI fant at dekningstabellen i PRD-tillegget (14 øvelser for manualer + benk) ikke stemte med dataene (16); tabellen var eldre enn regelen fra 4.1 og ble rettet.
- Tre KI-kontrollører fant 15 punkter: 7 rettet, 8 avvist med begrunnelse.

### Status

- [x] Story 4.3 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 4.4 (søk etter øvelser)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukere som vet hvilken øvelse de vil gjøre, skal finne den raskt.

### Hva vi ba KI om

1. Lage navnesøk på Trening som også viser øvelser profilen ikke passer til, merket med hva som mangler.

### Hva KI produserte

- Spec, søkeendepunkt, søkefelt med «Mangler»-merking og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- KI oppdaget at spec-en feilaktig sa at matsøket bruker 300 ms ventetid (det er 200 ms); avviket er logget i spec-en.
- Tre KI-kontrollører fant 21 punkter: 8 grupper rettet, 3 avvist med begrunnelse.

### Status

- [x] Story 4.4 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 5.1 (starte økt og legge til øvelser)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Første del av treningsloggen: brukeren skal kunne sette opp dagens økt.

### Hva vi ba KI om

1. Lage økt-modulen med start/fortsett, legge til, sortere og fjerne øvelser.

### Hva KI produserte

- Spec, ny backend-modul med migrering, Økt-side, «Legg til i økt» og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- For å spare bruksgrensen valgte Osman én kontrollør i stedet for tre. Den fant 10 punkter: 6 grupper rettet, 2 avvist med begrunnelse.

### Status

- [x] Story 5.1 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 5.2 (logge sett)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukeren skal kunne registrere nøyaktig hva hun gjorde i hvert sett.

### Hva vi ba KI om

1. Lage settrader med repetisjoner/kg eller sekunder, «Ferdig»-hake og sletting med angre.

### Hva KI produserte

- Spec, ny tabell og endepunkter for sett, settrader på Økt-siden og nye tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- Én KI-kontrollør fant 12 punkter: 5 grupper rettet, 3 avvist med begrunnelse (ett fordi låsen allerede fantes).

### Status

- [x] Story 5.2 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 5.3 (se hva jeg gjorde sist)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukeren skal se forrige økts sett for å vite hva hun skal slå.

### Hva vi ba KI om

1. Lage regelen for «sist» som en testet funksjon og vise den under hver øvelse.

### Hva KI produserte

- Spec, regelfunksjon med tester, utvidet økt-svar og «Sist»/«Første gang» på Økt-siden.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding.
- KI fant at UX-dokumentet (skjul linja) og PRD-en («Første gang») var uenige; PRD-en ble fulgt.
- Én KI-kontrollør fant 11 punkter: 3 grupper rettet, 5 avvist med begrunnelse.

### Status

- [x] Story 5.3 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 5.1–5.4 (treningsloggen)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Epic 5 gjør at brukeren kan logge en hel treningsøkt.

### Hva vi ba KI om

1. Story 5.4: fullføre, endre og slette økter (5.1–5.3 er logget over).

### Hva KI produserte

- Spec, endepunkter for fullfør/slett/liste, bekreftelsesdialog, «Tidligere økter» og side for gamle økter, med tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en før koding, og stoppet byggingen ved 87 % bruksgrense for å fortsette senere.
- Én KI-kontrollør fant 11 punkter: 6 grupper rettet, 2 avvist med begrunnelse.
- #44 ble flettet inn i feil branch (5.2 i stedet for main) fordi den var stablet; ny PR #45 rettet det.

### Status

- [x] Epic 5 bygget og testet
- [ ] Review av PR for 5.4 fra gruppen

---

## 2026-11-17 – Story 6.1 + 6.2 (I dag-siden)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Brukeren skal se på ett sted hvordan dagen går: kalorier igjen, måltider og trening.

### Hva vi ba KI om

1. Lage dagsoversikten og de tomme tilstandene i én story (6.1 og 6.2 slått sammen for å spare bruksgrensen).

### Hva KI produserte

- Spec, ny `overview`-modul i backend, I dag-siden med dagsnotat, Mat- og Trenings-kort, og tester.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente sammenslåingen og spec-en før koding.
- Én KI-kontrollør fant 12 punkter: 6 grupper rettet (blant annet feil tekst på tidligere dager og UTC i stedet for norsk dato), 4 avvist med begrunnelse.

### Status

- [x] Story 6.1 og 6.2 bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-17 – Story 6.4 del 1 (demodata for sensor)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Sensor skal kunne se alle funksjonene med en gang, uten å logge uker med data selv.

### Hva vi ba KI om

1. Dele 6.4 i tre mindre deler, og først lage to oppdiktede demobrukere med 14 dagers data.

### Hva KI produserte

- Spec, demo-seed gjennom modulenes tjenester, tester og en «Demobrukere»-tabell i README.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente oppdelingen og spec-en, og valgte 3 økter i uka da spec-en motsa seg selv.
- Én KI-kontrollør fant 11 punkter: 5 grupper rettet, 4 avvist med begrunnelse.

### Status

- [x] Demodata bygget og testet
- [ ] 6.4 del 2 og 3

---

## 2026-11-17 – 11 øvelsesvideoer byttet til YouTube Shorts (issue #6)

**Verktøy:** Claude Code
**Hvem:** Fernando Svendsrud
**Bakgrunn:** Gruppa godkjente å bytte lange øvelsesvideoer til korte YouTube Shorts som passer bedre for nybegynnere.

### Hva vi ba KI om

1. Bytte video-ID for 11 øvelser (#5, 8, 9, 13, 14, 15, 16, 24, 26, 27, 29) i seed-data, testfiksturen, øvelseslista og gjennomgangsskjemaet.

### Hva KI produserte

- Byttet ID-ene i `exercises.json`, `video_ids.json`, `ovelsesliste.md` og `ovelsesliste-gjennomgang-2026-11-11.md`, uten å endre steg eller muskler.

### Hva vi selv vurderte og kontrollerte

- Fernando valgte og så alle de 11 videoene selv. De er ikke sjekket med oEmbed.
- Fernando sjekket stegene og musklene i `exercises.json` mot de nye videoene.
- Lenkene i `ovelsesliste.md` står som `watch?v=`, fordi testen leser ID-ene derfra. Alle 579 backend-tester er kjørt i Docker og passerer. Seed oppdaterer nå også video_id for eksisterende databaser.

### Status

- [x] 11 videoer byttet
- [ ] Finne Shorts til de 23 øvelsene som er igjen
- [ ] Videospilleren må tilpasses stående video

---

## 2026-11-18 – Story 6.4 del 3 (hjelpeknapp og fokus i ark)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Nye brukere og sensor skal få en kort forklaring på hver skjerm, og arkene skal virke med tastatur og skjermleser.

### Hva vi ba KI om

1. Lage «?»-hjelp og en felles test for fokus og Esc i alle ark.

### Hva KI produserte

- Spec med hjelpetekstene, hjelpeknapp, felles testhjelper og rettinger der testen feilet.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-en og hjelpetekstene før koding.
- Fellestesten fant en ekte feil (utstyrsarket flyttet ikke fokus).
- Én KI-kontrollør fant 11 punkter: 5 grupper rettet, 1 utsatt til Playwright, 2 avvist.

### Status

- [x] Del 3 bygget og testet
- [ ] 6.4 del 2 (Playwright)

---

## 2026-11-18 – Story 4.5 og 6.4 del 2 (filtre og Playwright)

**Verktøy:** Claude Code (BMAD `bmad-build`)
**Hvem:** Osman Khalid
**Bakgrunn:** 4.5 gir filtre på Trening (Should); 6.4 del 2 er siste Must: ende-til-ende-tester sensor kan kjøre med én kommando.

### Hva vi ba KI om

1. Filtre på muskelgruppe og nivå.
2. Playwright-tester for hele løkka i en ekte nettleser.

### Hva KI produserte

- Filterregel og -knapper med tester; Playwright-oppsett og 8 ende-til-ende-tester; README-kommando.

### Hva vi selv vurderte og kontrollerte

- Osman godkjente begge spec-ene og nedlastingen av Playwright og Chromium.
- 4.5: Osman valgte at hjelpemuskler skal telle (spec-eksempelet var feil). Én KI-kontrollør, 4 grupper rettet.
- 6.4 del 2: testen som skrev til demobrukeren ble skrevet om, og testene kjøres én om gangen etter ustabilitet. Ingen feil i appen funnet.
- Karianne meldte at «I dag» sto to ganger; rettet.

### Status

- [x] Alle Must-stories bygget og testet
- [ ] Review av PR fra gruppen

---

## 2026-11-18 – Story 6.3 og 1.8 (ukestripe og deaktivere konto)

**Verktøy:** Claude Code (BMAD `bmad-build`, lettere prosess med én kontrollør)
**Hvem:** Osman Khalid
**Bakgrunn:** Should-stories etter at alle Must-krav var ferdige.

### Hva vi ba KI om

1. Ukestripe for å bla mellom dager og rette tidligere dager (6.3).
2. Deaktivere konto uten å slette data (1.8).

### Hva KI produserte

- Spec-er, ny uke-oversikt i backend, ukestripe på tre sider, deaktivering med reaktivering ved innlogging, og tester (også Playwright).

### Hva vi selv vurderte og kontrollerte

- Osman godkjente spec-ene før koding.
- 6.3: én KI-kontrollør, 9 grupper rettet. Kariannes retting av e2e-testen (#53) ble tatt med.
- 1.8: kontrolløren fant at en deaktivert konto kunne beholde en innlogging i sjeldne tilfeller; rettet. En Playwright-test som avhang av datoen demodataen ble laget, ble gjort robust.

### Status

- [x] 6.3 flettet (#54); 1.8 bygget og testet
- [ ] Review av PR for 1.8 fra gruppen

---

## 2026-11-22 – README mot sensorveiledningen (skjermbilder og avvik fra planen)

### Hva vi ba KI om
- Sjekke README mot sensorveiledningen for del 1 og fylle hullene: skjermbilder, hva som ble droppet fra planen, og forklaring av filene i rotmappen.

### Hva KI produserte
- `frontend/scripts/screenshots.mjs`: logger inn som demobrukeren Sara og tar fem skjermbilder på 390 px med Playwright, uten å endre data.
- README: seksjonene «Skjermbilder» og «Endret fra planen», oppdatert status (1.8, 4.5, 6.3, Shorts), fjernet den døde Vercel-lenken, flere rader i Mappestruktur og lenker til retro og rapportutkast.

### Hva vi selv vurderte og kontrollerte
- Første runde med bilder hadde Next.js-utviklermerket synlig og en tom «i dag» (demodataene regnes fra dagen databasen ble laget). Skriptet skjuler nå merket og tar en dato med data som argument.
- Storynumrene under bildene er sjekket mot `epics.md`. Begrunnelsene for 1.7, 3.8, 4.6 og epic 7 er gruppens egne.
- Vercel-lenken ga 404. Publisering er ikke et krav i emnet, så den er fjernet.

### Status
- [x] Ferdig, venter på review i PR.
## 2026-11-23 – Story 1.7 (glemt passord)

### Hva vi ba KI om
- Bygge «Glemt passord?» med bmad-build: lenke på e-post, nytt passord, uten ekte e-posttjeneste.

### Hva KI produserte
- Spec, backend (e-postport, tabell `password_resets`, to offentlige endepunkter), to nye sider, Mailpit i Docker Compose, tester (backend, Vitest, Playwright som leser e-posten i Mailpit).

### Hva vi selv vurderte og kontrollerte
- Osman valgte Mailpit (alternativ A) framfor å skrive lenken i backend-loggen, slik planen sa.
- Én reviewer (Edge Case Hunter) fant 10 punkter: 3 rettet (lenken forsvant for nettlesere med cookie, TLS uten sertifikatsjekk, uhåndterte feil ved sending), 1 utsatt, 6 avvist med begrunnelse.
- Alle tester kjørt: 613 backend, 504 Vitest, lint, build og Playwright 11/11. To Playwright-kjøringer feilet på ulike tester mens Macen var overbelastet (load 10–18); hver test besto alene, og neste fulle kjøring besto.

### Status
- [x] Ferdig lokalt, venter på PR.

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
