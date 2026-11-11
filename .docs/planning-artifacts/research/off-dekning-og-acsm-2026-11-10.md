# Open Food Facts: dekning av norske varer

**Dato:** 2026-11-10 · **Av:** Osman Khalid med Claude Code · **Svarer på:** PRD §11 Q3 og SM-4

## Kort svar

Av 15 vanlige norske varer fant Open Food Facts (OFF) **9 med norsk oppføring og kcal**, **4 bare som utenlandsk variant eller uten kcal**, og **2 ikke i det hele tatt**. Der kcal kunne sammenlignes med Oda, stemte den innen 1–2 %. Men noen OFF-oppføringer har åpenbart feil kcal, og søke-API-et svarte ofte med feil (HTTP 503).

**For appen betyr det:**
- OFF holder som **hovedkilde for merkevarer** (Tine, Q, Freia, Mills, Stabburet, Kavli, Prior).
- **Manuell registrering (FR-10, FR-12) er nødvendig**, ikke et nødstilfelle. Rundt 1 av 3 varer krever det.
- **Lagre alt vi slår opp** (NFR-6), og **aldri søk i OFF mens brukeren skriver** (FR-11). API-et er for ustabilt til det.
- Vurder en **enkel kontroll av kcal** (for eksempel varsle når en vare har under 5 eller over 900 kcal per 100 g), fordi OFF har feilregistreringer.
- **Matvaretabellen** bør dekke basisvarer (melk, havregryn, ris, kylling), slik PRD-en allerede legger opp til.

## Metode

- 15 varer valgt på forhånd fra vanlige merkevarer og kjedenes egne merker (First Price, Eldorado). Listen ble laget før søket, slik at OFF ikke styrte utvalget.
- Hver vare ble søkt på navn i OFF sitt søke-API (`world.openfoodfacts.org/cgi/search.pl`), og de fem øverste treffene ble vurdert. Søk som fikk HTTP 503 ble kjørt på nytt med 20–30 sekunders pause.
- kcal ble kontrollert mot produktsiden til samme vare hos Oda (oda.com). Der Oda sitt søk ga en annen vare, er sammenligningen utelatt.
- **Begrensning:** dette er et navnesøk. Selve strekkodeoppslaget (FR-9) er ikke testet, fordi vi ikke hadde en uavhengig liste med strekkoder. Strekkodene som ble funnet (tabellen under) kan brukes til den testen i SM-4.

## Resultat

| # | Vare | Funnet i OFF? | Strekkode (OFF) | kcal OFF | kcal Oda | Merknad |
|---|---|---|---|---|---|---|
| 1 | Tine Lettmelk 1 % | ✅ | 7038010000980 | 42 | 41 | |
| 2 | Tine Norvegia | ✅ | 7038010013966 | 344 | 351 (skivet) | Andre oppføringer har feil kcal (98,9 og 32,3) |
| 3 | Jarlsberg | ⚠️ Bare utenlandsk | 5000165083905 | 351 | 351 | Ingen oppføring merket Norge |
| 4 | Tine Gudbrandsdalsost | ✅ | 7038010028441 | 440 | 441 | |
| 5 | Q Lettmelk 0,5 % | ✅ | 7048840081950 | 37 | 37 | |
| 6 | Tine Skyr naturell | ❌ | – | – | – | Ingen treff |
| 7 | Freia Kvikk Lunsj | ✅ | 7622210816672 | 537,5 | 536 | |
| 8 | Grandiosa Original | ⚠️ Bare svensk | – | – | 217 | Bare svenske «X-tra Allt»-varianter blant treffene |
| 9 | Mills Kaviar | ✅ | 7036110009834 | 430 | 430 | |
| 10 | Stabburet Leverpostei | ✅ | 7039010132435 | 225 | 225 | |
| 11 | Kavli Rekeost | ✅ | 7041810010400 | 216 | 216 | |
| 12 | Prior Kyllingfilet (pålegg) | ✅ | 7039610001353 | 101 | – | Oda-søket ga en annen vare |
| 13 | Gilde Grillpølser | ❌ | – | – | 220 | Ingen treff |
| 14 | First Price Havregryn | ⚠️ Bare svensk | 7311041086971 | 364 | – | Svensk strekkode (731…) |
| 15 | Eldorado Jasminris | ⚠️ Norsk uten kcal | 7035620020346 | – | – | Norsk oppføring mangler kcal; svenske har 353 |

**Oppsummert:** 9 ✅ · 4 ⚠️ · 2 ❌.

## Kilder

- Open Food Facts søke-API, kjørt 2026-11-10. Data fra Open Food Facts (ODbL).
- Oda produkt-API (`oda.com/api/v1/products/…`), kjørt 2026-11-10, kun for å kontrollere kcal.

---

# ACSM: repetisjoner for nybegynnere

**Svarer på:** PRD §11 Q5 og antakelsen i FR-23.

**Bekreftet mot originalkilden.** Sammendraget av ACSM sitt posisjonsdokument sier at for nybegynnere «it is recommended that loads correspond to a repetition range of an 8-12 repetition maximum (RM)», og at treningsfrekvensen er 2–3 dager i uka.

- **8–12 repetisjoner:** ✅ bekreftet. Standardverdien på 10 reps i FR-23 ligger midt i området.
- **2–3 dager i uka:** ✅ bekreftet.
- **Antall sett (1–3):** ⚠️ står ikke i sammendraget. Tallet kommer fortsatt bare fra en sekundærkilde. Standardverdien på 3 sett i FR-23 er derfor et rimelig valg, men ikke direkte bekreftet av ACSM.

**Kilde:** American College of Sports Medicine. *American College of Sports Medicine position stand. Progression models in resistance training for healthy adults.* Med Sci Sports Exerc. 2009;41(3):687–708. doi:10.1249/MSS.0b013e3181915670. PMID 19204579. Sammendraget er hentet via NCBI E-utilities 2026-11-10.

---

# Strekkodeoppslag i Open Food Facts (2026-11-11)

**Svarer på:** issue #14 (FR-9, FR-10, SM-4). Strekkodene fra tabellen over ble slått opp direkte med `GET /api/v2/product/{strekkode}`.

| Vare | Strekkode | Funnet | kcal OFF | kcal Oda | Svartid |
|---|---|---|---|---|---|
| Tine Lettmelk 1 % | 7038010000980 | ✅ | 42 | 41 | 322 ms |
| Tine Norvegia | 7038010013966 | ✅ | 344 | 351 | 129 ms |
| Jarlsberg | 5000165083905 | ✅ | 351 | 351 | 117 ms |
| Tine Gudbrandsdalsost | 7038010028441 | ✅ | 440 | 441 | 142 ms |
| Q Lettmelk 0,5 % | 7048840081950 | ✅ | 37 | 37 | 149 ms |
| Freia Kvikk Lunsj | 7622210816672 | ✅ | 537,5 | 536 | 130 ms |
| Mills Kaviar | 7036110009834 | ✅ | 430 | 430 | 157 ms |
| Stabburet Leverpostei | 7039010132435 | ✅ | 225 | 225 | 147 ms |
| Kavli Rekeost | 7041810010400 | ✅ | 216 | 216 | 126 ms |
| Prior Kyllingfilet | 7039610001353 | ✅ | 101 | – | 151 ms |
| First Price Havregryn | 7311041086971 | ✅ | 364 | – | 132 ms |
| Eldorado Jasminris | 7035620020346 | ⚠️ uten kcal | – | – | 163 ms |
| Finnes ikke (feiltest) | 7000000000000 | ❌ HTTP 404 | – | – | 124 ms |
| Ugyldig, 12 siffer (feiltest) | 703801000098 | ❌ HTTP 404 | – | – | 150 ms |

**Funn for arkitekturen:**
- Strekkodeoppslaget er **raskt og stabilt**: rundt 120–320 ms og ingen 503-feil, i motsetning til søke-API-et.
- **«Ikke funnet» kommer som HTTP 404** med `status: 0`. Appen må tolke det som «varen finnes ikke» og vise registrer-selv-knappen (FR-10), ikke som en teknisk feil.
- **En vare kan finnes uten kcal** (Eldorado Jasminris). Den skal også gå til manuell registrering (FR-10).
- **OFF sjekker ikke om strekkoden er gyldig.** En 12-sifret kode gir bare 404. Appen bør validere EAN-13/EAN-8 (lengde og kontrollsiffer) før den spør OFF, så brukeren får beskjed om tastefeil.

**Begrensning:** strekkodene kom fra OFF selv, så testen viser at oppslaget fungerer, men **ikke** dekningen. Den ekte SM-4-testen krever strekkoder fra 10 fysiske varer i kjøleskapet eller butikken.
