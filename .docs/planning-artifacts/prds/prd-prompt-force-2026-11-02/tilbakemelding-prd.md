# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G62 – G62-bjolstad-khalid-reehorst-svendsrud |
| **PRD vurdert** | `.docs/planning-artifacts/prds/prd-prompt-force-2026-11-02/prd.md` (status `draft`, sist endret 2026-11-10, commit 4f6cafc), lest sammen med `addendum.md` |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en sterk PRD med egen tese («færre funksjoner, ikke flere»), en tydelig kjerneløype og et godt glossar. De viktigste risikoene er at «Should»-listen kutter det som bærer teseen, at mange FR-er mangler testbare konsekvenser, og at plattform og personvern ikke er helt konsekvent beskrevet for testing med ekte brukere.

## 2. Dette fungerer godt

1. **Regneeksempler med fasit.** §4.2 FR-6 har en tabell med fire profiler («Profile 1 … 2798 kcal»), mål for Lose/Gain og et gulv-eksempel («612 kcal … the Calorie Target is 1 200 kcal»). Tallene stemmer med Mifflin-St Jeor, og kan brukes som automatiske tester slik de står.
2. **Ærlig avgrensning.** §8 Non-Goals, §8.1 («Out of scope for v1 within features»), §9.3 og prioriteringen i §9.1 viser tydelig hva som ikke bygges. Fase 2 (FR-29/FR-30) er skilt fra v1 med «only after the core loop is stable».
3. **Kjørbarhet og kvalitetssikring er krav, ikke ettertanke.** UJ-5 (sensor kjører appen), NFR-3, NFR-4, NFR-5 og NFR-8 gjør Seed Data, mock og testbare regler til eksplisitte krav. Tellere som SM-C1 til SM-C3 viser at dere har tenkt på hva som ikke skal optimaliseres.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | god | Valg og avveininger er synlige (addendum H, endringslogg i §12), men Q4 og Q6 er fortsatt åpne og påvirker datamodellen. |
| Substans | sterk | Persona og UJ-er styrer faktiske krav (utstyrsprofiler, tomtilstander, feilveier). NFR-ene har produktspesifikke terskler. |
| Strategisk sammenheng | god | Teseen er klar, men «Speed matters most» og «last time» er Should i §9.1. |
| Testbarhet | god | FR-3, FR-6 og FR-26 er svært gode. Mange andre FR-er har ingen eller tynne konsekvenser. |
| Scope og avgrensning | god | Eksplisitt og ærlig. Omfanget (28 FR, to domener, innlogging, samtykke, sletting) er stort for fire personer, men Should-listen gir en kuttplan. |
| Brukbarhet for neste fase | god | Glossar, ID-er og kryssreferanser er ryddige. Flere punkter må avklares før datamodell og stories. |
| Formtilpasning | sterk | UJ-er med navngitt hovedperson passer en forbrukerapp, og addendum skiller teknikk fra krav. |

## 4. Viktigste forbedringer

### 4.1 Should-listen kutter det som bærer teseen
- **Alvorlighet:** høy
- **Hvor:** §9.1 «cut first if time runs out: FR-8, FR-14 (recent foods), FR-20, FR-24 (show last time), FR-27»; §4.3 «Speed matters most»; §2.1 «Show me what I lifted last time»
- **Problem og hvorfor det betyr noe:** FR-14 og FR-24 er billige, men bærer to av tre JTBD-er, klimakset i UJ-3 og SM-6. Hvis de kuttes, mister dere det som skiller dere fra «et skjema». Samtidig er FR-27 (bla mellom datoer) og FR-20 (filtre) mindre sentrale for beginneren. Prioriteringen følger ikke teseen. Epic-rekkefølgen vil følge Must/Should.
- **Forslag:** Flytt FR-14 og FR-24 til Must, og la FR-27 og FR-20 (filter, ikke navnesøk) og FR-8 være kuttkandidater. Sett prioritet direkte på hver FR (f.eks. «FR-24 – Must – realizes UJ-3, UJ-4»), slik at stories kan hente den derfra.

### 4.2 Mange FR-er kan ikke bli testtilfeller
- **Alvorlighet:** høy
- **Hvor:** FR-7, FR-13, FR-14, FR-15, FR-17, FR-22, FR-24, FR-25, FR-27; FR-1 «Repeated failed logins … are rate-limited»; FR-11 «a seeded selection of common Norwegian foods»
- **Problem og hvorfor det betyr noe:** Disse har bare en beskrivelse, ikke «Consequences (testable)». Uten dem blir stories og tester gjetting. «Repeated» og «selection» er uten tall.
- **Forslag:** Eksempel for FR-24: «Når en Workout Exercise åpnes og Brukeren har logget samme Exercise tidligere, vises Sets fra siste Workout før dagens dato (dato, reps × vekt eller sekunder). Finnes ingen tidligere, vises «Første gang». Sets fra dagens Workout vises ikke som «last time».» For FR-1: «Etter 5 mislykkede innlogginger på 15 minutter avvises videre forsøk i 15 minutter.» For FR-11: «Seed Data inneholder minst 100 Food Items fra Matvaretabellen; søk på «mel» finner «Havremel».»

### 4.3 Plattformen er beskrevet ulikt tre steder
- **Alvorlighet:** medium
- **Hvor:** SM-1 «on a real phone», SM-7 «on their own phone», §9.1 «Mobile-friendly» mot §7 «mainly on a PC or laptop» og NFR-1
- **Problem og hvorfor det betyr noe:** UX, tester og SM-er trenger én primær enhet. Nå er mobil både påkrevd og «ekstra». Kameraskanning (Should) krever HTTPS, så mobiltest uten tunnel er ikke realistisk.
- **Forslag:** Skriv: «Primær testenhet er Chrome på PC. På 360 px bredde skal alle skjermer være brukbare uten horisontal scrolling.» Omformuler SM-1 til «kan fullføre UJ-1 til UJ-4 i nettleser med Seed Data uten feil», og la SM-7 bruke samme enhet som dere faktisk kan teste på.

### 4.4 Testing med ekte brukere mot «all data er fiktiv»
- **Alvorlighet:** medium
- **Hvor:** §6.1 «All data in the repo and in Seed Data is fictional»; SM-7 «3–5 beginners outside the group … on their own phone»; §11 Q1 (Sikt)
- **Problem og hvorfor det betyr noe:** Utenforstående som oppretter profil med vekt, høyde og matlogg gir ekte helseopplysninger. Q1 er ubesvart, og FR-2 gjelder bare for samtykke i appen. Dette bør avklares før SM-7 kan kjøres.
- **Forslag:** Legg til: «Brukertester bruker oppdiktede profiler (testpersoner får en fiktiv profil å legge inn). Ekte data testes først etter svar på Q1.» Alternativt: oppgi at testpersoner får samtykkeinformasjon og at data slettes etter testen.

### 4.5 KI-funksjonen i fase 2 mangler kontroll av usikre svar og kostnad
- **Alvorlighet:** medium
- **Hvor:** §4.7 FR-29 «Mock Mode is the default» og «always labelled as an estimate»; §6.2 Cost
- **Problem og hvorfor det betyr noe:** Mock-modus og estimat-merking er bra (og følger opp briefen). Men det står ikke hva som skjer når modellen svarer uten kcal, feiler eller tar for lang tid, eller hvor mange kall en Pro-bruker kan gjøre. Dette er akkurat det emnet vektlegger ved KI i appen. Det står heller ikke at bildet sendes til en tredjepart.
- **Forslag:** Legg til konsekvenser: «Mock Mode returnerer alltid «Egg, 1 stk, 78 kcal (estimat)». Hvis kallet feiler, mangler kcal eller tar over 15 sekunder, vises en melding og brukeren kan registrere manuelt (FR-12). Maks 20 bildekall per Pro-bruker per dag. Brukeren ser før sending at bildet sendes til en ekstern tjeneste. Referansetest: 3 testbilder med kjent kaloriinnhold.»

## 5. Mekaniske funn

- ID-er (FR-1 til FR-30, UJ-1 til UJ-5, SM-1 til SM-7, SM-C1 til SM-C3, NFR-1 til NFR-11) er sammenhengende, og kryssreferansene løser seg. Assumptions Index stemmer med de innebygde `[ASSUMPTION]`-merkene.
- **Lav:** §9.1 refererer til «NFR-1 – NFR-10», men NFR-11 finnes.
- **Lav:** UJ-3 bruker utstyrsprofilen «Home (dumbbells)», mens FR-18 definerer «Home» som bare kroppsvekt. Skriv i UJ-3 at Sara har redigert profilen.
- **Lav:** «examiner» og «sensor» brukes om samme rolle og står ikke i glossaret. NFR-11 («few, clear actions») har ingen grense; la UX-fasen sette den.
- PRD-en har fortsatt status `draft` og en «AI draft»-merknad øverst. Oppdater når punktene er avklart.

## 6. Før dere går videre

**Må avklares før UX, arkitektur og epics:**
- Q4: kan en øvelse ha flere muskelgrupper? Glossaret sier én. Dette styrer datamodellen og FR-20.
- Q6: sex er påkrevd som «interim answer». Bekreft eller velg alternativ.
- Endelig MoSCoW (4.1) og primær enhet (4.3).
- Q1 (Sikt) før SM-7 eller ekte brukere.

**Kan vente:** Q2 (strekkodebibliotek, ikke blokkerende), Q3 (dekning i Open Food Facts, før SM-4), Q5 (ACSM-kilde), Q8 (videogjennomgang), Q7 (stakk og arbeidsfordeling avgjøres i arkitekturfasen).

**Oppfølging av briefen: ja.** Fase 2 for bildeestimering og pro er skilt ut, primærbruker er nybegynner, øvelseslisten er fast, mock og kjøring uten nøkler er beskrevet, og regneeksempler og strekkode-ikke-funnet er med.

## 7. Refleksjonsspørsmål

1. Teksten øverst sier at PRD-en er en KI-skisse som dere skulle bekrefte. Hvilke `[ASSUMPTION]`-punkter har dere faktisk kontrollert mot research, og hvordan sjekket dere at tallene i FR-6-tabellen stemmer?
2. Da dere valgte hva som er «Should», var det innsats eller tese som avgjorde? Hva sier svaret om hva appen deres egentlig handler om?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
