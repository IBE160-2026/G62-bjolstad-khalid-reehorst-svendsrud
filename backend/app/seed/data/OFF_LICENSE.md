# Open Food Facts – lisens

Data fra Open Food Facts (https://world.openfoodfacts.org).

`off_norway.json` er en avledet database (derived database) laget av Open Food Facts-databasen,
og er lisensiert under Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/

Innholdet i de enkelte produktene er lisensiert under Database Contents License (DbCL) 1.0:
https://opendatacommons.org/licenses/dbcl/1-0/

- Kilde: Open Food Facts search API v2, de 1000 mest skannede produktene merket Norge
  (`countries_tags_en=norway`, `sort_by=unique_scans_n`, 10 sider à 100).
- Hentet: 2026-11-17
- Beholdt: 941 produkter med gyldig EAN-8/EAN-13, navn og kcal per 100 g (0–900).
- Verdiene er ikke endret. Navn er satt sammen av merke og produktnavn som ved strekkodeoppslag.
- Oppdateres med `python -m app.cli import-off-norway`.
