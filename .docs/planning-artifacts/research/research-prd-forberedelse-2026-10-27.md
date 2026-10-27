---
title: "Research og brainstorming før PRD – Prompt Force"
status: utkast
created: 2026-10-27
grunnlag: brief.md (rev. 2026-10-13), addendum.md, tilbakemelding-product-brief.md
---

# Research og brainstorming før PRD – Prompt Force

Forberedelse til PRD-arbeidet torsdag. Dokumentet samler det vi bør undersøke, det som fortsatt er uklart, funksjoner vi bør diskutere, brukerbehov, lignende løsninger og områder der vi trenger mer informasjon før vi bestemmer oss.

> **KI-utkast.** Laget med Claude Code 2026-10-27 ut fra briefen, addendumet, tilbakemeldingen og et kort nettsøk. Punktene merket **[sjekk]** er ikke verifisert ennå, og noen i gruppen må teste dem selv.

---

## 1. Hva vi bør undersøke nærmere (research topics)

### 1.1 Strekkodeskanning i nettleseren
- **Biblioteker:** `html5-qrcode` (rask start, bygger på zxing-js), `@zxing/library` (zxing-js, ikke lenger aktivt vedlikeholdt) og `zxing-wasm` (raskere WASM-variant). Det innebygde `BarcodeDetector`-API-et i nettleseren virker ikke pålitelig på iOS Safari, og kildene er uenige om støtten. Det bør derfor bare være en valgfri «rask vei» med reserveløsning.
- **Oppgave:** Lag en liten spike med det valgte biblioteket og test EAN-13 på **ekte iPhone og Android** før arkitekturen bestemmes. (Tilbakemeldingen sier: «velg ett tidlig og test det på mobil».)
- Kameratilgang krever **HTTPS** (eller `localhost`). **[sjekk]** Hvordan tester vi på mobil mot lokal utviklingsserver? Alternativer er en tunnel (f.eks. ngrok) eller et selvsignert sertifikat.
- Reserveløsning: Brukeren skal kunne **skrive inn strekkoden manuelt** hvis kameraet ikke virker.

### 1.2 Open Food Facts (OFF)
- Gratis og uten API-nøkkel, men med regler:
  - **15 produktoppslag per minutt per IP** og 10 søk per minutt. Brudd kan gi IP-blokkering.
  - OFF ber eksplisitt om **ikke** å bruke søk-API-et til «søk mens du skriver».
  - Klienten skal sende en **egen User-Agent** som identifiserer appen.
  - Dataene har **ODbL-lisens**, som krever kildehenvisning («Data fra Open Food Facts») i appen.
- **Konsekvens for PRD-en:** Lagre (cache) produkter vi allerede har slått opp i vår egen database. Manuelt matvaresøk bør gå mot **vår egen** matvaretabell, ikke OFF-søk.
- **[sjekk] Dekning av norske varer:** Skann 10–15 vanlige varer fra Rema, Kiwi og Coop (melk, yoghurt, brød, pålegg, Grandiosa, proteinbar) og noter hvor mange som finnes, og om kcal per 100 g er fylt ut. Dette avgjør hvor viktig manuell registrering blir.
- Mange OFF-produkter mangler porsjonsstørrelse. Hvordan oppgir brukeren mengde: gram, porsjon eller stk?

### 1.3 Matvaredata til manuell registrering
- **Matvaretabellen** (Mattilsynet) er den offisielle norske matvaretabellen med næringsinnhold for basisvarer (egg, ris, kyllingfilet, banan). **[sjekk]** Lisens, nedlastingsformat og om vi kan seede et utvalg (f.eks. 100–200 vanlige matvarer) inn i databasen.
- **Kassalapp** (kassal.app) er et norsk API, hovedsakelig for priser. Det krever API-nøkkel. **[sjekk]** om det har næringsinnhold. Det er antakelig ikke aktuelt for v1, fordi kravet er «kjørbar uten våre nøkler».

### 1.4 Øvelsesdatabasen
- Vi har allerede `ovelsesliste.xlsx` med 30 øvelser (se KI-loggen). Denne må gjennomgås av gruppen: utstyrskrav, nivå og videolenker.
- **Utstyrsliste (forslag):** kroppsvekt (ingen), manualer, stang og skiver, benk, kettlebell, strikk, trekkestang, kabelmaskin, beinpress/maskiner. Bestem en **fast liste**, fordi den blir en tabell i datamodellen.
- Åpne alternativer å se på: **wger** (åpen trenings-API/database med utstyr og muskelgrupper) og **free-exercise-db** (JSON-datasett). **[sjekk]** lisens. Disse kan brukes som kontroll av utstyrstaggene våre, men vi bør beholde vår egen faste liste med 30–50 øvelser.
- **Videoer:** YouTube-embed (`youtube-nocookie.com` gir mindre sporing). Hva skjer hvis en video blir fjernet? Øvelsen skal fortsatt vise tekstbeskrivelse.

### 1.5 Kaloriberegning
- Mifflin-St Jeor med de fire testprofilene i briefen. **KI-loggen sier at regneeksemplene ikke er kontrollert ennå.** Dette bør gjøres før PRD-en, fordi de blir akseptansekriterier.
- Bestem aktivitetsfaktorene (1,2 / 1,375 / 1,55 / 1,725 / 1,9?) og hvordan de forklares for en nybegynner. «Moderat aktiv» er vanskelig å tolke selv.
- Skal kaloriemålet ta hensyn til **mål** (ned i vekt / holde vekt / opp i vekt, f.eks. −500 / 0 / +300 kcal)? Det står ikke i briefen.
- Hvordan håndterer vi kjønn i formelen hvis brukeren ikke vil oppgi det?

### 1.6 Personvern (helseopplysninger)
- Vekt, kosthold og trening kan regnes som **helseopplysninger**, som er en særlig kategori etter GDPR art. 9. **[sjekk]** Hva krever det i praksis for en studentprototype med fiktive testdata? Mest sannsynlig holder samtykke ved registrering, dataminimering og «slett kontoen min».
- PRD-en bør ha konkrete krav: hva lagres, hvem ser det, og hvordan sletter brukeren data (alt eller enkeltlogger).

### 1.7 Teknologistakk (forberedelse til arkitektur)
- Velg en enkel og godt dokumentert stakk som Claude Code håndterer godt. Den bør gi en **mobilvennlig** frontend, innlogging, database og seed-data.
- Krav fra tilbakemeldingen som påvirker valget: kjørbar lokalt etter README, `.env.example`, ingen betalte kontoer, og eksterne kall i egne moduler som kan mockes.
- **Til diskusjon:** Hvilke språk og rammeverk kan gruppen fra før? Det veier tyngre enn hva som er «best».

---

## 2. Spørsmål som fortsatt er uklare

| # | Spørsmål | Hvorfor det betyr noe | Forslag |
|---|---|---|---|
| 1 | Trengs innlogging i v1, og i så fall hvilken type? | Det påvirker datamodell, testbrukere og sikkerhet | E-post og passord med seedede testbrukere |
| 2 | Hvordan oppgis mengde ved matlogging: gram, porsjon eller stk? | OFF gir kcal per 100 g, og brukeren tenker i porsjoner | Gram som standard, porsjon hvis OFF har det |
| 3 | Skal vi ha måltider (frokost/lunsj/middag) eller bare en liste per dag? | Påvirker UX og datamodell | Måltider er lett å legge til og kjent fra Lifesum |
| 4 | Skal makroer (protein/fett/karbo) vises, eller bare kcal? | Suksesskriteriene nevner bare kcal | Lagre makroer hvis OFF har dem, vis kcal i v1 |
| 5 | Planlagt økt eller bare logget økt? | Briefen sier «om en økt er planlagt» i dagsoversikten | Avklar, eller fjern «planlagt» fra v1 |
| 6 | Kan brukeren lage egne øvelser? | Øker omfanget | Nei i v1, bare den faste listen |
| 7 | Lagres utstyret i profilen, eller velges det per økt? | Hjemme og på senteret er forskjellig | Lagrede «utstyrsprofiler» (Hjemme/Senter), eller valg per økt |
| 8 | Hvor lang historikk skal vises? | Briefen sier «over time», men oversikten er per dag | En enkel historikkside per dato |
| 9 | Hvordan regnes «kalorier forbrent» ved trening? | Påvirker «kalorier igjen» | Ikke med i v1, fordi målet allerede inkluderer aktivitetsfaktor |
| 10 | Språk i appen: norsk eller engelsk? | Påvirker UI-tekster og øvelsesnavn | Bestem på torsdag |
| 11 | Arbeidsfordeling: hvem tar mat og hvem tar trening? | Tilbakemeldingen ber om fordeling | To og to per domene |

---

## 3. Ideer og funksjoner som bør diskuteres

**Kjerneflyt v1 (allerede bestemt):** profil → kaloriemål → logg mat (strekkode + manuelt) → logg trening → dagsoversikt.

Mulige små tillegg som gjør v1 bedre uten å øke omfanget mye:
- **«Nylig brukt» / favoritter i matloggen.** Dette er den største tidsbesparelsen i Lifesum og MyFitnessPal, og dekker brukerbehovet «rask logging».
- **Kopier gårsdagens måltid / forrige økt.** Hevy lar deg gjenta en økt med ett trykk.
- **Vis forrige vekt og reps** på øvelsen når man logger, slik Hevy gjør. Det er en enkel spørring og veldig nyttig for nybegynnere.
- **Filtrer øvelsesforslag** på muskelgruppe og nivå, i tillegg til utstyr.
- **Onboarding** som forklarer kaloriemålet med vanlige ord.

Tillegg vi bør **si nei til** i v1 (for å beskytte omfanget): vannlogging, kroppsmål og bilder, sosiale funksjoner, egne treningsprogrammer, varsler og PWA/offline.

---

## 4. Brukerbehov (primærbruker: nybegynner)

Persona-skisse: *Sara, 23, har nettopp kjøpt treningskort, og har to manualer hjemme. Hun vet ikke hvilke øvelser hun skal gjøre, og hun syntes MyFitnessPal var for mye styr.*

| Behov | Hva det betyr for designet |
|---|---|
| Vite hva hun skal gjøre med utstyret hun har | Utstyrsvalg → kort liste med øvelser og en tydelig video |
| Forstå kaloriemålet | Ett tall, forklart med vanlige ord, uten fagbegreper |
| Logge mat raskt | Skann først, «nylig brukt», få trykk |
| Ikke bli overveldet | Få valg per skjerm, mobil først |
| Gjøre øvelser trygt | Video og kort teknikkbeskrivelse på hver øvelse |
| Se fremgang | Forrige vekt og reps, enkel historikk |

**[sjekk] Forslag til research:** Ta 5–10 korte samtaler med medstudenter og venner som er nybegynnere. Spør hvilke apper de har prøvd, hvorfor de sluttet, og hva som var vanskeligst. Noter svarene her, fordi det gir PRD-en ekte brukerinnsikt.

---

## 5. Lignende løsninger vi kan lære av

(Se også research digest i `addendum.md`.)

| App | Hva vi kan lære | Hva vi gjør annerledes |
|---|---|---|
| **Hevy** | Rask settlogging, forrige vekt og reps synlig, gjenta økt | Har ikke mat, og hjelper ikke med øvelsesvalg ut fra utstyr |
| **Lifesum** | Enkel matlogging, strekkode gratis, måltider, vennlig tone | Ingen treningslogg med dybde |
| **MyFitnessPal** | Stor matdatabase, «nylig brukt», kopier måltid | Oppleves som tungt og fullt av reklame for nybegynnere |
| **Bevel / Cora** | Viser at kombinasjonen trening og mat er etterspurt | Bredere og dyrere. Vi skal være enklere |
| **Fitbod / JEFIT** | Øvelsesforslag basert på utstyr (Fitbod har utstyrsprofiler) | Vi bruker faste regler, ikke en algoritme |

**[sjekk] Oppgave til torsdag:** Hver i gruppen installerer én av appene (Hevy, Lifesum, Fitbod, MyFitnessPal). Logg ett måltid og én økt, og ta skjermbilder av dagsoversikt, matlogging og treningslogging. Det gir direkte grunnlag for skissene som tilbakemeldingen etterlyser.

---

## 6. Områder der vi trenger mer informasjon før beslutninger

1. **Strekkodebibliotek.** Vi trenger spike-resultat på iPhone og Android før arkitekturen.
2. **OFF-dekning av norske varer.** Testresultatet avgjør hvor mye innsats manuell registrering og en egen matvaretabell krever.
3. **Teknologistakk.** Vi trenger en oversikt over gruppens kompetanse.
4. **Innlogging.** Gjør vi det selv eller med et bibliotek? Det må avklares i arkitekturfasen.
5. **Personvernkrav.** Hva krever emnet eller sensor? Sjekk sensorveiledningen (`.docs/course/`).
6. **Regneeksemplene.** De er ikke kontrollert ennå (se KI-loggen).
7. **Øvelseslista og videolenkene.** De er ikke gjennomgått ennå (se KI-loggen).

---

## 7. Forslag til agenda torsdag

1. Gå gjennom spørsmålene i seksjon 2, og bestem eller utsett hvert punkt (20 min).
2. Del resultatene fra app-testingen og strekkode-spiken (15 min).
3. Bestem kjerneflyt og skjermbilder: dagsoversikt, matlogg, treningslogg og øvelsesforslag (20 min).
4. Fordel arbeidet og start PRD-en med `bmad-prd` (resten).

---

## Kilder

- [Open Food Facts – API-dokumentasjon](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/)
- [Open Food Facts – vilkår for bruk av API-et](https://support.openfoodfacts.org/help/en-gb/12-api-data-reuse/94-are-there-conditions-to-use-the-api)
- [zxing-js/library (GitHub)](https://github.com/zxing-js/library)
- [Barcode scanning on iOS (Substack)](https://eringen.substack.com/p/barcode-scanning-on-ios-the-missing)
- [Kassalapp API – Node.js-guide](https://kassal.app/api/guides/nodejs)
- Briefens addendum (research digest 2026-09-16)
