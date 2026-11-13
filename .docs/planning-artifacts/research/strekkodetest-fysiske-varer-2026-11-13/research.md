# Strekkodetest med varer hjemme (SM-4)

**Dato:** 2026-11-13
**Hvem:** Gustav Åbyholm Reehorst, med Claude Code
**Svarer på:** issue #14 (FR-9, FR-10, SM-4). Bygger på [strekkodeoppslaget 11.11](../off-dekning-og-acsm-2026-11-10.md).

**Sammendrag:** Testen har to deler. Del 2 er den ekte SM-4-testen: 10 tilfeldige varer fra kjøleskap og skap, fotografert. Alle 10 finnes i Open Food Facts med kcal. To datafeil i OFF (honning og Carlsberg) viser at appen må kontrollere kcal mot kJ. ChatGPT leste 2 av 10 strekkoder feil fra bildene, så strekkoder fra KI må alltid sjekkes.

## Del 1: 10 varer valgt fra OFF-lista

### Metode

- Ossi04 ba i Discord 13.11 om strekkodene fra 10 varer hjemme.
- De 10 varene er norske merkevarer som Gustav har hjemme. Strekkodene ble hentet fra [no.openfoodfacts.org](https://no.openfoodfacts.org/) og kontrollert mot varene.
- Hver strekkode ble slått opp med `GET https://world.openfoodfacts.org/api/v2/product/{strekkode}`, med 1,5 sekunder mellom kallene.
- kcal ble kontrollert mot kJ-verdien i samme oppføring (kJ ÷ 4,184).
- `bilder/` har en EAN-13-strekkode for hver vare. Bildene er **generert** fra tallene, ikke fotografert. De er lest tilbake med strekkodeleseren zxing-cpp, og alle 10 ga riktig tall. Bildene kan brukes til å teste kameraskanning (FR-8).

### Resultat

| # | Vare | Strekkode | Funnet | kcal/100 g (OFF) | kcal fra kJ | Svartid | Bilde |
|---|---|---|---|---|---|---|---|
| 1 | Bremykt Mykere 500 g | 7033330013290 | ✅ | 703 | 694 | 126 ms | [bilde](bilder/01_7033330013290.png) |
| 2 | Idun Tomatketchup 530 g | 7039010081320 | ✅ | 95 | 95 | 127 ms | [bilde](bilder/02_7039010081320.png) |
| 3 | Mills Peanut Butter 350 g | 7036110008844 | ✅ | 610 | 602 | 123 ms | [bilde](bilder/03_7036110008844.png) |
| 4 | TINE Meierismør 500 g | 7038010010187 | ✅ | 742 | 729 | 157 ms | [bilde](bilder/04_7038010010187.png) |
| 5 | Honningcentralen Akasiehonning 350 g | 7026450051051 | ⚠️ feil kcal | **95** | **329** | 135 ms | [bilde](bilder/05_7026450051051.png) |
| 6 | TINE Cottage Cheese Original 400 g | 7038010054471 | ✅ | 96 | 97 | 137 ms | [bilde](bilder/06_7038010054471.png) |
| 7 | AXA Bjørn Lettkokte Havregryn 1100 g | 7044416013141 | ✅ | 367 | 367 | 129 ms | [bilde](bilder/07_7044416013141.png) |
| 8 | TINE Lettmelk 1,0 % 1750 ml | 7038010000980 | ✅ | 42 | 42 | 119 ms | [bilde](bilder/08_7038010000980.png) |
| 9 | Nugatti 500 g | 7021010001057 | ✅ (HTTP 429 først) | 527 | 518 | 212 ms | [bilde](bilder/09_7021010001057.png) |
| 10 | Stabburet Leverpostei 100 g | 7039010132435 | ✅ | 225 | 223 | 135 ms | [bilde](bilder/10_7039010132435.png) |

**10 av 10 funnet, alle med kcal. 9 av 10 har riktig kcal.**

### Funn for arkitekturen

- **kcal kan være feil i OFF.** Akasiehonning står med 95 kcal, men 1377 kJ, som er 329 kcal. Honning har rundt 300–330 kcal per 100 g, så kJ-verdien er riktig. 95 er det samme tallet som ketchupen, så det er trolig en tastefeil. De andre 9 varene avviker høyst 2 % fra kJ-verdien. Forslag: når både kcal og kJ finnes og avviker mer enn rundt 10 %, regner appen kcal fra kJ eller ber brukeren sjekke tallet.
- **HTTP 429 (for mange forespørsler).** Nugatti fikk 429 ved første forsøk, selv om vi var under grensen på 15 oppslag i minuttet. Det kan skyldes kall fra samme IP like før. Nytt forsøk etter ett minutt gikk fint. Appen bør vise «prøv igjen» ved 429, ikke «fant ikke varen», og backend bør lagre (cache) varer den har slått opp, slik FR-8 allerede sier.
- Svartiden var 119–212 ms, som i testen 11.11.

### Begrensninger

- **Utvalget er ikke tilfeldig.** Varene ble valgt fra en liste over populære varer som allerede finnes i OFF, og deretter bekreftet hjemme. 10 av 10 er derfor et for godt resultat for dekningen. Varer som butikkenes egne merker, ferskvarer og importvarer er ikke med. Derfor ble del 2 gjort.
- To varer (Lettmelk og Leverpostei) var også med i testen 11.11.
- Strekkodebildene er generert, ikke fotografert, så de viser ikke hvordan skanning fungerer med ekte emballasje, lys og vinkel.

## Del 2: 10 tilfeldige varer fra kjøleskap og skap (den ekte SM-4-testen)

### Metode

- Ossi04 ba i Discord 13.11 om 10 tilfeldige varer fra kjøleskapet, fordi det er den ekte testen.
- Gustav fotograferte strekkoden på 10 varer fra kjøleskap, fryser og skap, uten å velge ut fra noen liste. Bildene ligger i [`bilder/ekte-varer/`](bilder/ekte-varer/). Metadata (EXIF, med blant annet mulig GPS-posisjon) er fjernet.
- Bildene ble først gitt til ChatGPT, som leste av strekkodene. Tallene ble så kontrollert på tre måter: kontrollsifferet, nettleserens innebygde strekkodeleser (`BarcodeDetector` i Chrome) og manuell avlesning av bildene der leseren ikke fant koden (bilde 2–5).
- Oppslag med `GET /api/v2/product/{strekkode}` som i del 1, og kcal kontrollert mot kJ.

### Resultat

| # | Vare (navn fra OFF) | Strekkode | ChatGPT leste | Funnet | kcal/100 | Svartid | Bilde |
|---|---|---|---|---|---|---|---|
| 1 | Unil Mais 340 g | 7311041013601 | ❌ 7311041101360 (finnes ikke) | ✅ | 84 | 178 ms | [bilde](bilder/ekte-varer/01_7311041013601.jpg) |
| 2 | REMA 1000 Hakket spinat, frossen | 7032069733738 | ✅ | ✅ | 21 | 120 ms | [bilde](bilder/ekte-varer/02_7032069733738.jpg) |
| 3 | Mozell Light Eple & Drue 1,5 l | 7044610871233 | ✅ (kalte den «Fun Light») | ✅ | 8 | 119 ms | [bilde](bilder/ekte-varer/03_7044610871233.jpg) |
| 4 | AXA Müsli Energi 650 g | 7044416017545 | ❌ 7044160175455 (ugyldig) | ✅ | 378 | 124 ms | [bilde](bilder/ekte-varer/04_7044416017545.jpg) |
| 5 | Unil Nacho-chips 200 g | 7035620035708 | ✅ | ✅ | 472 | 119 ms | [bilde](bilder/ekte-varer/05_7035620035708.jpg) |
| 6 | Nora Skivede rødbeter | 7039010087155 | ✅ (kalte det «syltetøy») | ✅ | 63 | 120 ms | [bilde](bilder/ekte-varer/06_7039010087155.jpg) |
| 7 | TINE Kirsebær Yoghurt 500 g | 7038010055706 | ✅ | ✅ | 83 | 134 ms | [bilde](bilder/ekte-varer/07_7038010055706.jpg) |
| 8 | Q Lettrømme 300 g | 7048840000456 | ✅ | ✅ | 179 | 134 ms | [bilde](bilder/ekte-varer/08_7048840000456.jpg) |
| 9 | Carlsberg pilsner 330 ml | 7044610874623 | ✅ (kalte den «grønn flaske») | ⚠️ feil kJ | 35 | 120 ms | [bilde](bilder/ekte-varer/09_7044610874623.jpg) |
| 10 | Eldorado Kokosmasse 250 g | 7035620036934 | ✅ (ble lagt til senere) | ✅ | 666 | 124 ms | [bilde](bilder/ekte-varer/10_7035620036934.jpg) |

**10 av 10 funnet med kcal.** Dekningen for vanlige varer i en norsk husholdning ser god ut, også for butikkenes egne merker (Unil, REMA 1000, Eldorado).

### Funn

- **Ny datafeil i OFF:** Carlsberg står med 0,146 kJ, men 35 kcal. Riktig er rundt 146 kJ. Her er det kJ som er feil, mens det i del 1 var kcal (honning). Appen kan derfor ikke stole blindt på verken kcal eller kJ. Forslag: sammenlign de to og be brukeren sjekke tallet hvis de avviker mye.
- **ChatGPT leste 2 av 10 strekkoder feil** (bilde 1 og 4). Den ene koden finnes ikke, og den andre har feil kontrollsiffer. Med ChatGPT sine tall ville resultatet blitt 8 av 10. Det viser hvorfor appen må sjekke kontrollsifferet (FR-9) og hvorfor KI-resultater må kontrolleres.
- **Nettleserens strekkodeleser fant 6 av 10 strekkoder** fra bildene. Den fant ikke koden på bilder med blank plast, skrå vinkel eller buet emballasje (bilde 2–5). Det støtter at kameraskanning er «Should» og at å skrive inn tallet er hovedveien (FR-8, FR-9).
- To varer har ikke mengde (gram) i OFF (spinat, og rødbeter har to vekter). Appen bør ikke kreve at pakningsstørrelse finnes.

### Begrensninger

- 10 varer fra én husholdning er et lite utvalg. Det sier noe om vanlige dagligvarer, men ikke om ferskvarer uten strekkode (frukt, kjøtt fra disk) eller sjeldne importvarer.
- Kokosmassen er bare fotografert bakfra, så navnet er ikke kontrollert mot bildet. Navnet er hentet fra OFF.
