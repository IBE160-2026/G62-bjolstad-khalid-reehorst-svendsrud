# Epic 3 Context: Food logging

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A consented user logs what they eat into four Meals for a calendar date: by searching the app's own food table, typing a barcode, re-logging a recent food in one tap, or registering a food themselves. They pick the amount, see kcal before saving, and can edit or delete entries. The epic adds the backend `food` module (food items, food log entries, kcal sums), the Matvaretabellen seed of common Norwegian basic foods, the Open Food Facts port with live and mock adapters, and an offline import of Norwegian Open Food Facts products. Fast, reliable food logging is half of the core loop and feeds the Daily Overview in Epic 6.

## Stories

- Story 3.1: Search for a basic food and log it (next)
- Story 3.2: Register my own food
- Story 3.3: Type a barcode
- Story 3.4: Log a recent food with one tap
- Story 3.5: Choose servings instead of grams
- Story 3.6: Edit or delete a food entry
- Story 3.7: Find Norwegian brand products in search
- Story 3.8: Scan a barcode with the camera (Should)

## Requirements & Constraints

- **Food Item:** name plus nutrition per 100 g; kcal required, protein/carbs/fat optional; optional barcode and serving size. Source is one of Matvaretabellen, Open Food Facts or user.
- **Meals:** exactly Frokost, Lunsj, Middag, Mellommåltid (Breakfast, Lunch, Dinner, Snacks).
- **Search:** case-insensitive "contains" on name ("mel" finds "Havremel"); covers shared items and the user's own items, never other users'; the user's recently used items come first; never calls Open Food Facts while typing (OFF asks for no search-as-you-type, and its search API often returns 503). No match shows "Ingen treff" with a hint to try another word (later also "Registrer selv"), never an empty list.
- **Seed:** at least 100 (planned 100–200) common Norwegian basic foods from Matvaretabellen (egg, rice, chicken fillet, banana, milk, bread …), loaded only into a fresh local database.
- **Amount:** grams by default; servings only when the item has a serving size, stored as grams (servings × serving size). Amounts ≤ 0 g or > 5 000 g are rejected with a message (5 000 g is a documented assumption).
- **kcal:** entry kcal = grams × kcal_per_100g / 100, kept unrounded; rounded only for display (150 g × 63 → 94.5 → shown "95"). Meal and day totals sum the unrounded values. Editing 150 g → 200 g of a 63 kcal item adds 31.5 kcal.
- **Recent foods:** the user's 10 most recently logged *distinct* items, newest first; one tap logs with last amount and Meal prefilled (editable); at most 3 taps from I dag; a new user sees no list and is pointed to Søk.
- **Own food:** name and kcal per 100 g required; macros and serving size optional; visible only to its owner (backend test required).
- **Barcode:** validate EAN-8/EAN-13 (length and check digit) before any lookup; on HTTP 404, missing kcal, or OFF unreachable show "Vi fant ikke denne varen. Vil du registrere den selv?" or "Vi får ikke kontakt med Open Food Facts nå. Du kan registrere varen selv." with "Registrer selv" and the barcode prefilled. Never a crash or empty result.
- **Edit/delete:** change grams or Meal; delete is immediate with a 5 s "Angre" toast. Other users' entries are rejected with no data.
- **Attribution (FR16):** wherever Matvaretabellen or Open Food Facts data is shown, show "Matvaretabellen 2026. Mattilsynet. www.matvaretabellen.no" and/or "Data fra Open Food Facts".
- **Tests:** kcal per entry, per Meal and per date; access control; the barcode not-found path. Tests never call a real external service.

## Technical Decisions

- **Module `food`** (router → service → repository, `models.py`, `schemas.py`; paths `/api/food/...`, e.g. `/api/food/entries?date=2026-11-13`); frontend mirror `frontend/src/modules/food/`. Every endpoint depends on `require_consent`; mutations pass the Origin check; errors use the envelope with field errors; regenerate committed OpenAPI types.
- **`food_items`:** `source` (Matvaretabellen / Open Food Facts / user), `owner_id` NULL for shared items and set for user-created ones, kcal per 100 g (required), protein/carbs/fat (nullable), optional barcode and serving size. Research recommends keeping the source per row so attribution can be shown per item.
- **`food_log_entries`:** `user_id`, `food_item_id`, `date` (`YYYY-MM-DD`, chosen by the client in Europe/Oslo), Meal, `grams`, `kcal_per_100g_snapshot` copied at logging time, UUIDv4 id, UTC `created_at`.
- **AD-4 ownership:** no endpoint accepts a user id; every repository read/write of entries filters by the current user; item queries return shared items plus the current user's own items only.
- **AD-5 rules:** kcal per entry, per Meal and per date are pure, unit-tested functions in the `food` service. The frontend may show a live preview while typing, but saved and displayed totals come from the API. `overview` (Epic 6) reads them through the `food` service.
- **AD-6 snapshot:** entry kcal is always grams × snapshot / 100; edits change grams or Meal, never the snapshot, so history never changes when an item is updated.
- **AD-7 OFF port:** `backend/app/ports/off.py` with `live` and `mock` adapters by `OFF_MODE=live|mock` (add to `.env.example`). The service checks shared and own items first; the live adapter sends the app's own User-Agent (e.g. `PromptForce/0.1 (IBE160 student project; contact)`), stays under 15 lookups/min, caches every found product as a shared item, and treats 404 as "not found". Mock fixtures use real verified barcodes (7038010000980 TINE Lettmelk 42 kcal, 7039010132435 Stabburet Leverpostei 225, 7044416013141 AXA Havregryn 367, 7026450051051 Akasiehonning with wrong OFF value 95) plus no-kcal, not-found and unreachable cases.
- **AD-12:** dates are `YYYY-MM-DD` from the client; units grams and kcal; values rounded only for display.
- **AD-8 seed:** on startup `alembic upgrade head` then `seed_if_empty` only with `APP_ENV=local`; the Matvaretabellen subset lives in `backend/app/seed/`. The OFF Norway import (`python -m app.cli import-off-norway`) commits its result as a seed file so the examiner needs no network.
- **AD-15:** every food mutation invalidates the Mat/overview query for that date (TanStack Query), so totals update without reload.
- **Data sources (research):** Matvaretabellen (Mattilsynet) is free, no key or registration, via XLSX/ODS download or a public JSON/EDN API at matvaretabellen.no/en/api (foods, food groups, nutrients, LanguaL, sources; local caching allowed; updated each autumn). Licence CC BY 4.0 per Mattilsynet (data.norge.no says NLOD 2.0; both allow use with attribution). Open Food Facts: no key, ODbL with attribution required, 15 product lookups and 10 searches per minute per IP; barcode lookup is fast (≈120–320 ms) and stable; about 1 in 3 Norwegian products needs manual registration; many lack serving size; some have wrong kcal (a 5–900 kcal range check would not catch the honey case).

## UX & Interaction Patterns

- **Mat page** (full page with its own URL): the chosen date's four Meals with entries, Meal totals and the day total; "+ Legg til" on a Meal and a "Logg mat" button open the sheet.
- **Legg til mat sheet:** method picker with four equal pill options Søk · Skriv strekkode · Nylig brukt · Manuelt; selected option is plum. Søk is selected and focused by default; Meal preselected when opened from a Meal row. "Skann med kamera" appears inside Skriv strekkode only when supported. One level deep: a sheet never opens another sheet. Full height under 768 px. Reuse the existing native `<dialog>` pattern: focus moves in, Esc closes, focus returns to the opener.
- **Amount picker (Matvare):** grams by default, grams/servings switch when available, Meal choice, live kcal preview, "Lagre" closes the sheet and returns to where it opened. Enter adds the highlighted search result.
- **Design:** tokens only; plum only for actions; the single mauve `mark` colour for the Mat bowl icon disc, "+ Legg til" text (`mark-text`) and selected rows (`mark-tint`); Mat and Trening differ by icon and label, not colour. Values in ink with tabular numerals; numbers use a space as thousands separator. Labels above inputs; inline errors start with the fix. Skeleton rows while loading, no full-page spinner. Toasts via `aria-live="polite"`, never covering the primary button.
- **Voice:** follow `frontend/VOICE.md`: warm, short, "du"-form, verbs on buttons ("Logg mat", "Lagre", "Registrer selv").

## Cross-Story Dependencies

- Builds on Epics 1–2: `require_consent`, `CurrentUser`, `Now`, Origin check, error envelope with field errors, SessionGuard routing, tokens, VOICE.md, dialog pattern. Account deletion/purge must also cover food log entries and user-created food items.
- 3.1 creates `food_items`, `food_log_entries`, the kcal functions, the Mat page, the sheet with only Søk active, and the Matvaretabellen seed. 3.2 activates Manuelt and adds "Registrer selv" to the no-match message. 3.3 adds the OFF port and Skriv strekkode, reusing 3.2's form with the barcode prefilled. 3.4–3.6 extend the same sheet, amount picker and entry rows. 3.7 reuses the OFF cache path and search. 3.8 reuses 3.3's lookup path (Quagga2; needs HTTPS/localhost).
- Epic 6's I dag Mat card and kcal eaten/remaining read the `food` service sums per date.
