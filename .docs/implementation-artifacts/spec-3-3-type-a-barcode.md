---
title: 'Story 3.3: Type a barcode'
type: 'feature'
created: '2026-11-16'
status: 'done'
baseline_commit: '8c6d97db6d7d0454b22b42070986e9b991bba119'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/.docs/implementation-artifacts/epic-3-context.md'
  - '{project-root}/.docs/implementation-artifacts/spec-3-2-register-my-own-food.md'
  - '{project-root}/.docs/planning-artifacts/research/off-dekning-og-acsm-2026-11-10.md'
  - '{project-root}/frontend/VOICE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Packaged products are fastest to log by barcode, but the user has to search or type nutrition values by hand.

**Approach:** Add the Open Food Facts port (`backend/app/ports/off.py`, live and mock adapters chosen by `OFF_MODE`, AD-7) and a barcode lookup in the `food` service: validate EAN-8/EAN-13, look in the app's own shared and user items first, then ask Open Food Facts and cache a found product as a shared item. Enable the "Skriv strekkode" tab: a found product opens the amount picker; not found, no kcal or OFF unreachable shows a clear message and "Registrer selv" with the barcode prefilled.

## Boundaries & Constraints

**Always:** New nullable `food_items.barcode` (String(14), migration `0010`, `down_revision='0009'`) with a unique partial index for shared items (`owner_id IS NULL`); own items may also carry a barcode (3.2 form gets an optional barcode field, prefilled from this flow). `GET /api/food/barcode/{code}` (`ConsentedUser`, `operation_id="lookup_barcode"`): 422 `invalid_barcode` "Sjekk at strekkoden har 8 eller 13 siffer." for wrong length/digits/check digit (no OFF call); 200 item when found; 404 `barcode_not_found` "Vi fant ikke denne varen. Vil du registrere den selv?" for OFF 404 or a product without kcal per 100 g; 503 `off_unavailable` "Vi får ikke kontakt med Open Food Facts nå. Du kan registrere varen selv." for timeout/network/5xx/rate limit. Order: user's own item with that barcode → shared item → OFF. Live adapter: stdlib `urllib` (no new dependency), `https://world.openfoodfacts.org/api/v2/product/{code}?fields=product_name,product_name_nb,brands,nutriments,serving_quantity`, header `User-Agent: PromptForce/0.1 (IBE160 student project)`, 5 s timeout, at most 14 lookups per rolling minute per process (over the limit → unavailable), kcal from `nutriments["energy-kcal_100g"]`; name = Norwegian name or product name plus brand. Found products are stored as `source="off"`, `owner_id` NULL, `external_id`=barcode. Mock adapter (default, always in tests): fixtures for 7038010000980 TINE Lettmelk (found), 7039010132435 Stabburet Leverpostei (found), 7044416013141 AXA Havregryn (found), 7026450051051 Akasiehonning (found, 95 kcal — known bad OFF data, kept as-is), one valid code without kcal, one valid code not found, and one code that simulates unreachable. Attribution "Data fra Open Food Facts" shown with OFF items in the amount picker. Never call OFF while typing; only on submit.

**Never:** No camera scanning (3.8), no OFF search or bulk import (3.7), no correcting OFF values, no API key, no network in tests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Invalid | "12345", "7038010000981" (bad check digit), letters | 422 `invalid_barcode`, no OFF call | Form shows message under field |
| Own item | user's own item has the code | returned, no OFF call | N/A |
| Cached | shared item has the code | returned, no OFF call | N/A |
| Found | 7038010000980, not cached | 200 TINE Lettmelk; stored as shared `off` item; second lookup hits cache | N/A |
| No kcal | fixture without kcal | 404 `barcode_not_found`, nothing stored | "Registrer selv" with barcode |
| Not found | OFF 404 fixture | 404 `barcode_not_found` | "Registrer selv" with barcode |
| Unreachable | fixture / timeout / 15th call in a minute | 503 `off_unavailable`, nothing stored | "Registrer selv" |
| Flow | found code in Skriv strekkode | amount picker with "Data fra Open Food Facts"; save logs it | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/ports/off.py` (new) -- `OffPort` protocol, `LiveOffAdapter`, `MockOffAdapter`, `get_off_port()` from `settings.off_mode`; result types found / not found / unavailable; `is_valid_ean()` (EAN-8/13 check digit) in the food module or a small helper.
- `backend/app/modules/food/{models,schemas,repository,service,router}.py` -- barcode column, lookup service, route; own-item create accepts optional `barcode` (validated with the same helper).
- `backend/migrations/versions/0010_food_barcode.py`; `tests/test_health.py` expects `0010`.
- `backend/tests/food/test_barcode.py`, `backend/tests/ports/test_off.py` (new) -- every backend row; live adapter parsing tested with a stubbed `urlopen` (no network), User-Agent and rate limit included.
- `backend/openapi.json`, `frontend/src/lib/api/schema.d.ts` -- regenerate.
- `frontend/src/modules/food/` -- `barcode-panel.tsx` (new; numeric input, "Finn varen", messages, "Registrer selv"), `api.ts` (`useLookupBarcode`), `add-food-sheet.tsx` (enable tab, route found → amount picker, not found → own form with barcode), `own-food-form.tsx` (optional barcode field), `amount-picker.tsx` / `attribution.tsx` (OFF attribution).

## Tasks & Acceptance

**Execution:**
- [x] OFF port, EAN helper, backend food changes, migration, tests -- FR9, FR10, NFR5, NFR6, NFR8, AD-7.
- [x] `openapi.json`, `schema.d.ts` -- regenerate.
- [x] frontend barcode tab, own-form barcode, attribution -- Vitest for invalid code, found → amount picker, not found / unavailable → "Registrer selv" with barcode prefilled.

**Acceptance Criteria:**
- Given the running stack in mock mode, when a user types 7038010000980 in "Skriv strekkode" and logs 200 g, then the entry is TINE Lettmelk with "Data fra Open Food Facts" shown; typing the not-found fixture offers "Registrer selv" with the code prefilled.
- Given the change, when `docker compose exec backend pytest -q`, `npm run test -- --run`, `npm run lint` and `npm run build` run, then all pass with no raw hex in `src/**/*.tsx`.

## Implementation Notes

- `is_valid_ean()` lives in `backend/app/modules/food/barcode.py` (ASCII digits only); the frontend mirrors it as `isValidEan()` in `meals.ts`, so an invalid code is caught before any request.
- Port results are `OffProduct` / `OffNotFound` / `OffUnavailable`. The mock fixtures are raw OFF-shaped payloads parsed by the same `parse_product()` as the live adapter. Error fixtures: no kcal `7035620020346` (Eldorado Jasminris, real), not found `7000000000003`, unreachable `7000000000010`; any other unknown code is also not found. Fixtures carry only name and kcal (macros were not verified).
- Name: `product_name_nb` or `product_name`, prefixed with the first brand unless already in the name; no name at all → "Vare {barcode}". Macros (0–100) and `serving_quantity` (1–2 000) are taken when present and in range, otherwise left out. A kcal value outside 0–900 is treated as "no kcal" (404), so a broken OFF value cannot overflow the column or break the own-item limits; in-range values like the honey's 95 are kept as-is.
- `get_off_port()` is a FastAPI dependency cached per mode, so the live rate limiter (14 per rolling 60 s, monotonic clock) is shared per process. The test `app` fixture always overrides it with a fresh `MockOffAdapter`.
- A concurrent insert of the same shared barcode is caught in a savepoint (`add_shared_item`) and the existing row returned.
- `FoodItemResponse` now includes `barcode`. Own-item `barcode` ignores spaces, empty → null, invalid → field error on `barcode`.
- The amount picker's back button reads "Tilbake til strekkode" when opened from Skriv strekkode.

## Spec Change Log

## Review Triage Log

| Layer | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| BH, EC | Trailing newline in the code gives 500 | medium | `$` matches before `\n`; `int("\n")` raises | patch |
| EC | `http.client.HTTPException` escapes; unbounded body read | medium | Not in the `except` tuple; `read()` without limit | patch |
| BH | OFF items in search shown without OFF attribution | medium | Search panel renders only Matvaretabellen attribution (FR16) | patch |
| BH, EC | "Tilbake til strekkode" loses the typed code | low | `BarcodePanel` state unmounts | patch |
| VG | OFF macros/serving copy and "newest own item wins" untested | medium | Mock fixtures have kcal only; no lookup after two own items | patch |
| VG | Search refresh after an OFF lookup untested | low | Only a 60 s staleness window | defer |
| BH | Regenerated API files, settings and `FoodSource.OFF` missing | false | Excluded from the review diff on purpose; `off_mode` and `FoodSource.OFF` exist since 1.1/3.1; build passes | rejected |
| BH, EC | No negative cache for misses | low | Mock is the default; live traffic is tiny | rejected |
| BH | Rate limit is per process | low | One uvicorn worker in Compose | rejected |
| BH | No logging of OFF failures | low | Useful later; no user impact | rejected |
| BH | Mock adapter call list grows | low | Small strings; dev only | rejected |
| BH | Status differs; evidence not recorded | false | Step 5 syncs status; the API run is in Implementation Notes | rejected |
| BH | "Concurrent" test uses one session | low | Name overstates; behaviour is covered by the savepoint | rejected |
| BH | Pending state, error clearing and hyphenated input untested | low | Minor UI paths | rejected |
| BH | ODbL licence not named | low | Attribution links to OFF, where the licence is stated | rejected |
| EC | Stale lookup result after editing the field | low | Requires editing during a sub-second request | rejected |

## Verification

**Commands:**
- `docker compose up --build -d && docker compose exec backend pytest -q` -- expected: all pass
- `cd frontend && npm run test -- --run && npm run lint && npm run build` -- expected: pass
