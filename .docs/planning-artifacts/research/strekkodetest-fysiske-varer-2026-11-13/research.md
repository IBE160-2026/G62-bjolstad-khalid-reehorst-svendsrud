# Strekkodetest med varer hjemme (SM-4)

**Dato:** 2026-11-13
**Hvem:** Gustav Åbyholm Reehorst, med Claude Code
**Svarer på:** issue #14 (FR-9, FR-10, SM-4). Bygger på [strekkodeoppslaget 11.11](../off-dekning-og-acsm-2026-11-10.md).

## Metode

- Ossi04 ba i Discord 13.11 om strekkodene fra 10 varer hjemme.
- De 10 varene er norske merkevarer som Gustav har hjemme. Strekkodene ble hentet fra [no.openfoodfacts.org](https://no.openfoodfacts.org/) og kontrollert mot varene.
- Hver strekkode ble slått opp med `GET https://world.openfoodfacts.org/api/v2/product/{strekkode}`, med 1,5 sekunder mellom kallene.
- kcal ble kontrollert mot kJ-verdien i samme oppføring (kJ ÷ 4,184).
- `bilder/` har en EAN-13-strekkode for hver vare. Bildene er **generert** fra tallene, ikke fotografert. De er lest tilbake med strekkodeleseren zxing-cpp, og alle 10 ga riktig tall. Bildene kan brukes til å teste kameraskanning (FR-8).

## Resultat

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

## Funn for arkitekturen

- **kcal kan være feil i OFF.** Akasiehonning står med 95 kcal, men 1377 kJ, som er 329 kcal. Honning har rundt 300–330 kcal per 100 g, så kJ-verdien er riktig. 95 er det samme tallet som ketchupen, så det er trolig en tastefeil. De andre 9 varene avviker høyst 2 % fra kJ-verdien. Forslag: når både kcal og kJ finnes og avviker mer enn rundt 10 %, regner appen kcal fra kJ eller ber brukeren sjekke tallet.
- **HTTP 429 (for mange forespørsler).** Nugatti fikk 429 ved første forsøk, selv om vi var under grensen på 15 oppslag i minuttet. Det kan skyldes kall fra samme IP like før. Nytt forsøk etter ett minutt gikk fint. Appen bør vise «prøv igjen» ved 429, ikke «fant ikke varen», og backend bør lagre (cache) varer den har slått opp, slik FR-8 allerede sier.
- Svartiden var 119–212 ms, som i testen 11.11.

## Begrensninger

- **Utvalget er ikke tilfeldig.** Varene ble valgt fra en liste over populære varer som allerede finnes i OFF, og deretter bekreftet hjemme. 10 av 10 er derfor et for godt resultat for dekningen. Varer som butikkenes egne merker, ferskvarer og importvarer er ikke med. Testen 10.11 (navnesøk med en liste laget på forhånd) fant 9 av 15, og det er et bedre anslag for dekningen.
- To varer (Lettmelk og Leverpostei) var også med i testen 11.11.
- Strekkodebildene er generert, ikke fotografert, så de viser ikke hvordan skanning fungerer med ekte emballasje, lys og vinkel.
