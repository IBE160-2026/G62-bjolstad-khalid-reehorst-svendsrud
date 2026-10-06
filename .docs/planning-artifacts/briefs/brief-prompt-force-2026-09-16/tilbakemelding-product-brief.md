# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G62 – G62-bjolstad-khalid-reehorst-svendsrud |
| **Product brief** | `.docs/planning-artifacts/briefs/brief-prompt-force-2026-09-16/brief.md` (commit 1ab657d), lest sammen med `addendum.md` i samme mappe |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Dere har allerede gjort en god avgrensning: Body Battery-lignende restitusjon, KI-basert formkontroll på video og automatisk progresjon er flyttet til visjonen, med begrunnelse og betingelser for å ta dem inn igjen. Det viser god vurdering av hva som er realistisk.
2. Suksesskriteriene er funksjonelle og konkrete («en bruker kan sette opp profil og få et kaloriemål», «logge en økt og få øvelsesforslag ut fra utstyret»). De kan nesten direkte bli testtilfeller.

**De viktigste endringene:**

1. V1 har fortsatt mange funksjonsområder: profil og kaloriberegning, strekkodeskanning, bildebasert kaloriestimering, manuell matlogging, treningslogg, utstyrsbaserte forslag, øvelsesvideoer og gratis/pro-skille. Det er mer enn 3–4 store områder. Prioriter og flytt noe ut.
2. Bildebasert kaloriestimering krever en språkmodell med bildeforståelse og en API-nøkkel, og strekkodeskanning krever en matvaredatabase. Briefen sier ikke hvilke tjenester dere bruker, hva de koster, eller hvordan sensor kan kjøre appen uten deres nøkler.
3. Primærbrukeren beskrives som erfarne treningsentusiaster, men øvelsesvideoene og utstyrsforslagene er mest nyttige for nybegynnere. Bestem hvem appen først og fremst er for, og fjern `[ASSUMPTION]`-merkene når dere har avklart.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Middels**

**Sammenlignbart med:** 2) AI CV- og søknadsassistent (middels) – flere sammenhengende funksjoner, én KI-funksjon der kvaliteten på svaret betyr mye (kaloriestimering fra bilde), og personopplysninger (vekt, høyde, alder).

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | Middels | Kaloribehov fra vekt, høyde, alder og aktivitetsnivå følger kjente formler (f.eks. Mifflin-St Jeor) og kan kontrolleres. Utstyrsbaserte forslag krever en regelstyrt kobling mellom øvelser og utstyr. |
| Datamodell – antall entiteter og relasjoner mellom dem | Middels | Bruker/profil, matvare, matlogg, øvelse, utstyr, treningsøkt, sett og abonnementsnivå. Overkommelig, men to domener (mat og trening) dobler arbeidet. |
| Brukere, roller og innlogging | Middels | Innlogging og to nivåer (gratis/pro). Uten betaling blir pro bare et flagg på brukeren – det bør stå i briefen. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | Middels | Én tydelig KI-funksjon (kalorier fra bilde av én matvare). Usikre svar må vises som estimat, og brukeren bør kunne rette dem. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | Middels | Matvaredatabase for strekkoder (f.eks. Open Food Facts, som er gratis), bilde-API og innebygde videoer. Betaling er heldigvis ikke nevnt for v1. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | Lav | Brukerne påvirker ikke hverandre. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | Middels | Bildeopplasting og strekkodeskanning med kamera i nettleseren, som kan være krevende å få til å virke på alle enheter. |
| Sikkerhet og personvern | Middels | Vekt, kosthold og trening er helseopplysninger. Beskriv hva som lagres, og hvordan brukeren kan slette det. |

**Hva vanskelighetsgraden betyr for dere:**

- _Middels:_ Et godt balansert valg. Pass på at kjerneflyten blir ferdig og stabil før dere legger til mer. For dere betyr det: profil → kaloriemål → logg mat (manuelt og med strekkode) → logg trening → se dagsoversikt, før bildeestimering og pro-skillet.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | Risiko | Med fire personer er kjerneflyten realistisk, men åtte punkter i v1 er mye. Fordel arbeidet på mat og trening, og prioriter hardt. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | OK | Funksjonene er tydelig listet, og addendumet har god research. Avklar `[ASSUMPTION]`-punktene (primærbruker, videoer, gratis/pro) før PRD. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En vanlig webapp med skjemaer, database og API-kall passer godt. Strekkodeskanning i nettleseren finnes det ferdige biblioteker for; velg ett tidlig og test det på mobil. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | Risiko | Kaloriformler og treningslogg kan dere kontrollere selv. Bildeestimering er vanskelig å vurdere; bruk noen få testbilder med kjent kaloriinnhold som referanse, og vis tydelig at det er et estimat. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | OK | Kaloriberegning, logging, utstyrsfiltrering og pro-sperre gir gode automatiske tester. Bildeestimering testes med mock-svar. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | Risiko | Ikke beskrevet. Sensor trenger testbrukere (gratis og pro), og appen bør virke uten bilde-API-nøkkel (mock eller manuell registrering). |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | Risiko | Bilde-API koster per kall. Ingen plan for modell, kostnad eller mock er beskrevet. En gratis matvaredatabase og en mock for bildeestimering løser mye av dette. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart med justert omfang.** Se forslagene under.

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. V1: profil og kaloriemål, matlogg (manuell + strekkode), treningslogg og utstyrsbaserte øvelsesforslag. Legg bildeestimering og pro-skillet i trinn 2 når kjerneflyten er stabil.
2. Gjør øvelsesvideoene til lenker eller innebygde videoer knyttet til hver øvelse i en fast øvelsesliste, så det ikke blir en egen innholdsoppgave.
3. Lag en fast øvelsesdatabase med utstyrskrav (f.eks. 30–50 øvelser) som grunnlag for forslagene, slik at reglene er tydelige og testbare.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Klart: trening og kosthold i én app, inspirert av Hevy og Lifesum, med en tydelig kjernesløyfe. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Fragmenterte verktøy, tungvint matlogging og usikkerhet om hvilke øvelser man skal gjøre med utstyret man har, er konkrete problemer. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | Juster | Funksjonene er listet, men ikke hvordan de henger sammen for brukeren. Beskriv en typisk dag i appen i 3–5 steg, og hva brukeren ser i dagsoversikten. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig om at Bevel og Cora allerede kombinerer trening og kosthold, og en realistisk posisjonering som enklere alternativ. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | Juster | Primærbruker (erfarne) og funksjonene (videoer, utstyrsforslag) peker i ulike retninger. Velg én, og beskriv situasjonen konkret. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | OK | Funksjonelle og sjekkbare. Legg gjerne til et kriterium for riktig kaloriberegning (f.eks. «profil X gir kaloriemål Y ± 1 %») og for hva som skjer når en strekkode ikke finnes. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | Tydelig «In» og «Out», og gode avgrensninger (enkeltmatvarer på bilde, kuraterte videoer). «In» er likevel for stor; se forslagene. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Henger sammen med de utsatte funksjonene og holdes utenfor v1. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | Juster | Godt grunnlag, og addendumet sikrer sporbarhet fra den opprinnelige idélisten. Briefen ble laget uten tilgang til emnets krav; sjekk den mot sensorveiledningen og avklar `[ASSUMPTION]`-punktene. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | Juster | Nok funksjonalitet for et middels prosjekt, men prioriter kjerneflyten og legg bildeestimering og pro i trinn 2. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | OK | Gode funksjonelle kriterier. Legg til regneeksempler med fasit for kaloriberegningen. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | Juster | Når primærbrukeren er avklart, skisser dagsoversikten, matloggingen og treningsloggen. Strekkodeskanning brukes mest på mobil, så designet bør være mobilvennlig. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | OK | Ingen teknologivalg ennå, og det er riktig for en brief. Velg en enkel stakk og samle eksterne kall (matvaredatabase, bilde-API) i egne moduler som kan mockes. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg `.env.example`, testbrukere og en modus uten bilde-API. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | API-nøkler i `.env` (ikke committet), fiktive testprofiler og testbilder i en egen mappe. |

## 3. Neste steg for gruppen

1. Avklar primærbruker og `[ASSUMPTION]`-punktene, og skriv en kort beskrivelse av kjerneflyten.
2. Del «In» i v1 (kjerneflyt) og trinn 2 (bildeestimering, pro-skille), og fordel arbeidet i gruppen.
3. Velg matvaredatabase og bilde-API, og beskriv kostnad, mock-modus og hvordan sensor kjører appen uten nøkler.
4. Gå videre til PRD med en fast øvelsesliste og regneeksempler for kaloriberegningen.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
