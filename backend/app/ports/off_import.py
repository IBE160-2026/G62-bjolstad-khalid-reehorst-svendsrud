"""Offline import of the most scanned Norwegian Open Food Facts products (story 3.7).

`python -m app.cli import-off-norway` fetches 20 pages of 100 products from the OFF search
API (at most 10 searches per minute: we wait at least 6 s between pages), keeps products
with a name, a valid EAN and kcal per 100 g, and writes a committed seed file. The app
itself never calls the search API; `seed_if_empty` loads the file. Data fra Open Food
Facts (ODbL 1.0). Never run in tests: they pass a stubbed `urlopen` and a fake `sleep`.
"""

import http.client
import json
import os
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Iterable
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from app.modules.food.barcode import is_valid_ean
from app.ports.off import USER_AGENT, OffProduct, _text, parse_product

OFF_SEARCH_URL = (
    "https://world.openfoodfacts.org/api/v2/search?countries_tags_en=norway"
    "&sort_by=unique_scans_n&page_size=100&page={page}"
    "&fields=code,product_name,product_name_nb,brands,nutriments,serving_quantity"
)
PAGES = 10  # 1 000 products; raise when the OFF search API is stable (it often answers 503)
SEARCH_TIMEOUT_SECONDS = 30
# OFF allows 10 search requests per minute per IP.
SECONDS_BETWEEN_PAGES = 6.0
# The OFF search API often answers 503; each page is tried this many times in all,
# waiting between tries so the 10-searches-per-minute limit is never exceeded.
ATTEMPTS_PER_PAGE = 3
SECONDS_BETWEEN_ATTEMPTS = 30.0
# A page of 100 products is a few hundred kB; anything far larger is refused.
MAX_PAGE_BYTES = 20_000_000

DATA_DIR = Path(__file__).resolve().parent.parent / "seed" / "data"
OUTPUT_FILE = DATA_DIR / "off_norway.json"
LICENSE_FILE = DATA_DIR / "OFF_LICENSE.md"


class OffImportError(Exception):
    """A page could not be fetched or read; nothing is written."""


def fetch_page(urlopen: Callable[..., Any], page: int) -> list[dict[str, Any]]:
    request = urllib.request.Request(
        OFF_SEARCH_URL.format(page=page),
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urlopen(request, timeout=SEARCH_TIMEOUT_SECONDS) as response:
            body = response.read(MAX_PAGE_BYTES + 1)
    except (urllib.error.URLError, http.client.HTTPException, TimeoutError, OSError) as error:
        # HTTPError is a URLError subclass, so 4xx/5xx land here too.
        raise OffImportError(f"page {page}: {error}") from error
    if len(body) > MAX_PAGE_BYTES:
        raise OffImportError(f"page {page}: answer too large")
    try:
        payload = json.loads(body.decode("utf-8"))
    except ValueError as error:
        raise OffImportError(f"page {page}: unreadable answer") from error
    products = payload.get("products") if isinstance(payload, dict) else None
    if not isinstance(products, list):
        raise OffImportError(f"page {page}: no product list")
    return [product for product in products if isinstance(product, dict)]


def fetch_products(
    urlopen: Callable[..., Any] = urllib.request.urlopen,
    sleep: Callable[[float], None] = time.sleep,
    pages: int = PAGES,
) -> list[dict[str, Any]]:
    """Every product on pages 1..pages, in OFF's order (most scanned first)."""
    products: list[dict[str, Any]] = []
    for page in range(1, pages + 1):
        if page > 1:
            sleep(SECONDS_BETWEEN_PAGES)
        products.extend(_fetch_page_with_retries(urlopen, sleep, page))
    return products


def _fetch_page_with_retries(
    urlopen: Callable[..., Any], sleep: Callable[[float], None], page: int
) -> list[dict[str, Any]]:
    """One page, retried after a pause when OFF fails; the last error is raised."""
    for attempt in range(1, ATTEMPTS_PER_PAGE + 1):
        try:
            return fetch_page(urlopen, page)
        except OffImportError:
            if attempt == ATTEMPTS_PER_PAGE:
                raise
            sleep(SECONDS_BETWEEN_ATTEMPTS)
    raise AssertionError("unreachable")


def _json_number(value: Decimal | None) -> int | float | None:
    if value is None:
        return None
    return int(value) if value == value.to_integral_value() else float(value)


def select_products(products: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Valid EAN, a product name and kcal per 100 g (0–900); first occurrence of a barcode
    wins. Values are OFF's own, parsed exactly as in a barcode lookup. Sorted by barcode."""
    rows: dict[str, dict[str, Any]] = {}
    for product in products:
        code = _text(product.get("code"))
        if code in rows or not is_valid_ean(code):
            continue
        if not (_text(product.get("product_name_nb")) or _text(product.get("product_name"))):
            continue
        result = parse_product({"status": 1, "product": product}, code)
        if not isinstance(result, OffProduct):
            continue
        rows[code] = {
            "barcode": code,
            "name": result.name,
            "kcal_per_100g": _json_number(result.kcal_per_100g),
            "protein_g": _json_number(result.protein_g),
            "carbs_g": _json_number(result.carbs_g),
            "fat_g": _json_number(result.fat_g),
            "serving_size_g": _json_number(result.serving_size_g),
        }
    return [rows[code] for code in sorted(rows)]


def license_text(count: int, today: date) -> str:
    return f"""# Open Food Facts – lisens

Data fra Open Food Facts (https://world.openfoodfacts.org).

`off_norway.json` er en avledet database (derived database) laget av Open Food Facts-databasen,
og er lisensiert under Open Database License (ODbL) 1.0:
https://opendatacommons.org/licenses/odbl/1-0/

Innholdet i de enkelte produktene er lisensiert under Database Contents License (DbCL) 1.0:
https://opendatacommons.org/licenses/dbcl/1-0/

- Kilde: Open Food Facts search API v2, de {PAGES * 100} mest skannede produktene merket Norge
  (`countries_tags_en=norway`, `sort_by=unique_scans_n`, {PAGES} sider à 100).
- Hentet: {today.isoformat()}
- Beholdt: {count} produkter med gyldig EAN-8/EAN-13, navn og kcal per 100 g (0–900).
- Verdiene er ikke endret. Navn er satt sammen av merke og produktnavn som ved strekkodeoppslag.
- Oppdateres med `python -m app.cli import-off-norway`.
"""


def _write_atomic(path: Path, text: str) -> None:
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    os.replace(temporary, path)


def write_outputs(rows: list[dict[str, Any]], data_dir: Path, today: date) -> None:
    _write_atomic(data_dir / OUTPUT_FILE.name, json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    _write_atomic(data_dir / LICENSE_FILE.name, license_text(len(rows), today))


def run_import(
    urlopen: Callable[..., Any] = urllib.request.urlopen,
    sleep: Callable[[float], None] = time.sleep,
    data_dir: Path = DATA_DIR,
    today: date | None = None,
) -> tuple[int, int]:
    """Fetch, filter and write. Returns (fetched, kept). Raises OffImportError before
    writing anything if any page fails."""
    products = fetch_products(urlopen, sleep)
    rows = select_products(products)
    write_outputs(rows, data_dir, today or date.today())
    return len(products), len(rows)
