---
title: "Research: treningsdelen – Prompt Force"
status: utkast
created: 2026-10-28
ansvarlig: Osman Khalid
grunnlag: brief.md, ovelsesliste.md (34 øvelser), research-prd-forberedelse-2026-10-27.md
---

# Research: treningsdelen – Prompt Force

Treningsdelen av researchen før PRD-en. Matdelen dekkes av en annen i gruppen. Lisensene for wger og free-exercise-db er allerede dekket i `domain-matvaretabellen-wger-free-exercise-db-li-2026-10-28/`, så de gjentas ikke her.

> **KI-utkast.** Laget med Claude Code 2026-10-28. Dekningsanalysen i seksjon 3 er regnet direkte ut fra `ovelsesliste.md`. Resten bygger på nettsøk, og kildene står nederst.

**Kort oppsummert:**
- Øvelseslista dekker alle muskelgrupper på treningssenteret og for brukere med manualer eller strikk hjemme. Brukere med **bare kroppsvekt, bare kettlebell eller bare trekkestang** får ingen skulder- eller armøvelser (seksjon 3).
- **Planke måles i sekunder, ikke i reps.** Datamodellen for sett må derfor støtte tid i tillegg til reps og vekt (seksjon 5).
- Å vise **forrige vekt og reps** under logging er den enkleste funksjonen fra Hevy med størst nytte for nybegynnere (seksjon 1).

---

## 1. Hvordan andre apper gjør det

### Hevy (treningslogging)
- Brukeren logger **sett for sett** med vekt og reps, og huker av hvert sett når det er ferdig.
- **Forrige vekt og reps vises** mens man logger, så man vet hva man skal prøve å slå.
- **Pausetimer** starter automatisk når et sett hukes av. Standardtiden kan settes per øvelse.
- Har også oppvarmingssett, RPE (opplevd anstrengelse), supersett og en kalkulator for oppvarming. RPE må slås på i innstillingene og er altså ikke standard.

**Lærdom for oss:** Logging per sett med avhuking og visning av forrige gang er kjernen. RPE, supersett og oppvarmingssett er for erfarne brukere og bør ikke være med i v1.

### Fitbod (øvelsesforslag ut fra utstyr)
- Brukeren lager **«gym-profiler»**, f.eks. *Hjemme*, *Treningssenter* og *Reise*, hver med en liste over utstyr.
- Utstyret fungerer som et **filter**: bare øvelser brukeren har utstyr til, blir foreslått.
- Fitbod bruker i tillegg treningshistorikk og restitusjon for å velge øvelser. Det er en algoritme vi **ikke** skal lage, fordi briefen sier at forslagene skal være regelstyrte.
- Har en hurtigbryter for **«kun kroppsvekt»**.

**Lærdom for oss:** Lagrede utstyrsprofiler (Hjemme/Senter) er bedre enn å krysse av utstyr hver gang. Det er enkelt å lage: en tabell med koblingen bruker–profil–utstyr.

---

## 2. Anbefalinger for nybegynnere

ACSMs posisjonsdokument om styrketrening (2009) anbefaler for nybegynnere:
- **2–3 treningsdager i uka**
- **1–3 sett** per øvelse
- ca. **8–12 repetisjoner** per sett. Dette tallet kommer fra en sekundærkilde, så sjekk originaldokumentet før det brukes i appen.

Ifølge sekundærkilder har ACSM kommet med en nyere oppdatering, men den er ikke verifisert.

**Bruk i appen:** Disse tallene kan brukes som **standardverdier** når en nybegynner legger til en øvelse (f.eks. 3 sett × 10 reps), og som en kort tekst i øvelsesforslagene. Det gir trygg veiledning uten at vi må lage treningsprogrammer, som briefen har lagt i visjonen.

---

## 3. Dekker øvelseslista typiske brukere?

Regnet ut fra `ovelsesliste.md` med regelen i briefen: *en øvelse vises bare hvis brukeren har alt utstyret den krever.* Kroppsvekt er regnet som alltid tilgjengelig.

| Utstyrsprofil | Øvelser | Ben | Rygg | Bryst | Skuldre | Armer | Kjerne | Mangler |
|---|---|---|---|---|---|---|---|---|
| Kun kroppsvekt | 8 | 3 | 1 | 1 | **0** | **0** | 2 | Skuldre, armer |
| Hjemme: manualer | 13 | 5 | 2 | 1 | 1 | 1 | 2 | – |
| Hjemme: manualer + benk | 14 | 5 | 2 | 1 | 1 | 2 | 2 | – |
| Hjemme: strikk | 11 | 3 | 2 | 1 | 1 | 1 | 2 | – |
| Hjemme: kettlebell | 11 | 4 | 2 | 1 | **0** | **0** | 2 | Skuldre, armer |
| Hjemme: trekkestang | 10 | 3 | 2 | 1 | **0** | **0** | 3 | Skuldre, armer |
| Treningssenter (alt) | 34 | 9 | 10 | 3 | 3 | 4 | 3 | – |

**Funn:**
1. **Kun kroppsvekt** er den vanligste situasjonen for en nybegynner som starter hjemme, men den gir ingen skulder- eller armøvelse. Forslag:
   - *pike push-up* (skuldre, kroppsvekt)
   - *diamantarmhevinger* (armer, kroppsvekt)
2. **Kettlebell** mangler skulder og armer. Forslag: *kettlebell-press* (skuldre).
3. Trekkestang-brukeren får bare pull-ups (nivå: øvet) som ryggøvelse med stangen. Vurder å legge til *negative pull-ups* eller *hengende armstrekk* som nybegynnervariant.
4. **Bryst** har bare 1 øvelse i alle hjemmeprofilene (armhevinger). Det er greit for v1, men en variant som *armhevinger på knærne* ville hjulpet helt ferske nybegynnere.

Med 4–6 nye øvelser er hullene tettet, og lista er fortsatt godt innenfor 30–50.

---

## 4. Regler for øvelsesforslag (forslag til PRD-en)

- **Grunnregel (fra briefen):** vis en øvelse bare hvis brukeren har *alt* utstyret den krever.
- **Kroppsvekt** bør alltid regnes som tilgjengelig, så brukeren ikke må krysse av for det.
- **Benk:** Kan en stol erstatte benk for bench dips (#12)? I så fall bør hjelpeteksten si det.
- **Sortering:** vis nybegynnerøvelser først, deretter middels og øvet.
- **Filtrering:** la brukeren filtrere på muskelgruppe, f.eks. «vis bare beinøvelser».
- **Tomt resultat:** hvis ingen øvelser passer filteret, vis en melding, aldri en tom liste. Dette speiler kravet i briefen for strekkoder som ikke finnes.

Alt dette er rene regler, så det er lett å skrive tester for, f.eks.: *«bruker med bare manualer får ikke foreslått #13 markløft»*.

---

## 5. Treningslogging og datamodell

Forslag til enkel struktur:

```
Bruker ─< Treningsøkt (dato) ─< Øvelse i økt (øvelse, rekkefølge) ─< Sett (nr, reps, vekt_kg, sekunder)
Øvelse >─< Utstyr          (mange-til-mange: én øvelse kan kreve flere ting)
Bruker ─< Utstyrsprofil >─< Utstyr
```

**Ting datamodellen må håndtere:**
- **Tidsbaserte øvelser:** planke (#3) måles i sekunder, ikke reps. Enten får `Sett` et felt for sekunder, eller så får øvelsen en type (*reps* / *tid*).
- **Kroppsvektøvelser:** vekt er tom eller 0. Skal brukeren kunne legge til ekstra vekt, f.eks. vektvest?
- **Én eller flere muskelgrupper per øvelse:** #13 markløft har i dag «Rygg / hele kroppen». Dette er allerede et åpent punkt.
- **Forrige gang:** for å vise forrige vekt og reps trenger vi en spørring som henter siste sett for samme bruker og øvelse. Det er enkelt med strukturen over.
- **Sletting:** brukeren skal kunne slette en økt eller et enkelt sett, jf. personvernkravet i briefen.

---

## 6. Spørsmål til torsdag

| # | Spørsmål | Forslag |
|---|---|---|
| 1 | Skal vi legge til 4–6 øvelser for å tette hullene i seksjon 3? | Ja: pike push-up, diamantarmhevinger og kettlebell-press som minimum |
| 2 | Lagrede utstyrsprofiler, eller utstyrsvalg per økt? | Lagrede profiler, slik Fitbod har |
| 3 | Er kroppsvekt alltid tilgjengelig? | Ja |
| 4 | Hvordan logger vi tidsøvelser som planke? | Egen øvelsestype «tid» |
| 5 | Skal forrige vekt og reps vises ved logging? | Ja, det gir stor nytte for lite arbeid |
| 6 | Standardverdier når en øvelse legges til? | 3 sett × 10 reps for nybegynnere (ACSM) |
| 7 | Pausetimer i v1? | Nei, legg den til senere hvis det er tid |
| 8 | Én eller flere muskelgrupper per øvelse? | Flere er mer riktig, men én er enklere. Bestem på torsdag |

---

## Kilder

- [Hevy – Track workouts](https://www.hevyapp.com/features/track-workouts/)
- [Hevy – Workout rest timer](https://www.hevyapp.com/features/workout-rest-timer/)
- [Hevy – Workout set types](https://www.hevyapp.com/features/workout-set-types/)
- [Hevy – Workout settings (RPE)](https://www.hevyapp.com/features/workout-settings/)
- [Fitbod – Your gym profile](https://fitbod.me/blog/your-gym-profile/)
- [Fitbod Help – How Fitbod works](https://help.fitbod.me/hc/en-us/sections/360001078993-How-Fitbod-Works)
- [ACSM Position Stand: Progression Models in Resistance Training for Healthy Adults (2009), PubMed](https://pubmed.ncbi.nlm.nih.gov/19204579/)
- `ovelsesliste.md` (dekningsanalysen er regnet ut direkte fra denne)
