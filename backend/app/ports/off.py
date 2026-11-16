"""Open Food Facts port (AD-7): barcode lookup with a live and a mock adapter.

`OFF_MODE=mock` (default, always in tests) never touches the network. `OFF_MODE=live` calls
the OFF API v2 with the app's own User-Agent, a 5 s timeout and at most 14 lookups per
rolling minute per process (OFF allows 15). Data fra Open Food Facts (ODbL).
"""

import http.client
import json
import math
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache
from typing import Any, Protocol

from app.core.settings import get_settings

OFF_PRODUCT_URL = (
    "https://world.openfoodfacts.org/api/v2/product/{code}"
    "?fields=product_name,product_name_nb,brands,nutriments,serving_quantity"
)
USER_AGENT = "PromptForce/0.1 (IBE160 student project)"
TIMEOUT_SECONDS = 5
# A product answer is a few kB; anything over this is treated as unavailable.
MAX_RESPONSE_BYTES = 1_000_000
RATE_LIMIT = 14
RATE_WINDOW_SECONDS = 60.0

NAME_MAX = 200
KCAL_MAX = 900
MACRO_MAX = 100
SERVING_MIN, SERVING_MAX = 1, 2000


@dataclass(frozen=True)
class OffProduct:
    """A product with kcal per 100 g; optional values are None when OFF lacks them."""

    name: str
    kcal_per_100g: Decimal
    protein_g: Decimal | None = None
    carbs_g: Decimal | None = None
    fat_g: Decimal | None = None
    serving_size_g: Decimal | None = None


@dataclass(frozen=True)
class OffNotFound:
    """OFF has no such product, or it has no usable kcal per 100 g."""


@dataclass(frozen=True)
class OffUnavailable:
    """Timeout, network error, 5xx, rate limit (OFF's or ours) or an unreadable answer."""


OffResult = OffProduct | OffNotFound | OffUnavailable


class OffPort(Protocol):
    def lookup(self, barcode: str) -> OffResult: ...


def _number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        try:
            number = float(value.strip().replace(",", "."))
        except ValueError:
            return None
    else:
        return None
    return number if math.isfinite(number) else None


def _in_range(value: Any, low: float, high: float, places: int) -> Decimal | None:
    number = _number(value)
    if number is None or not low <= number <= high:
        return None
    return Decimal(str(round(number, places)))


def _text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def product_name(product: dict[str, Any], barcode: str) -> str:
    """Norwegian name, else the product name; prefixed with the first brand if missing."""
    base = _text(product.get("product_name_nb")) or _text(product.get("product_name"))
    brand = _text(_text(product.get("brands")).split(",")[0])
    if base and brand and brand.lower() not in base.lower():
        name = f"{brand} {base}"
    else:
        name = base or brand or f"Vare {barcode}"
    return name[:NAME_MAX].strip()


def parse_product(payload: Any, barcode: str) -> OffResult:
    """Turn an OFF API v2 product answer into a result. OFF values are kept as they are;
    a kcal value that is missing or outside 0–900 counts as no kcal."""
    if not isinstance(payload, dict) or payload.get("status") == 0:
        return OffNotFound()
    product = payload.get("product")
    if not isinstance(product, dict):
        return OffNotFound()
    nutriments = product.get("nutriments")
    if not isinstance(nutriments, dict):
        nutriments = {}
    kcal = _in_range(nutriments.get("energy-kcal_100g"), 0, KCAL_MAX, 2)
    if kcal is None:
        return OffNotFound()
    return OffProduct(
        name=product_name(product, barcode),
        kcal_per_100g=kcal,
        protein_g=_in_range(nutriments.get("proteins_100g"), 0, MACRO_MAX, 2),
        carbs_g=_in_range(nutriments.get("carbohydrates_100g"), 0, MACRO_MAX, 2),
        fat_g=_in_range(nutriments.get("fat_100g"), 0, MACRO_MAX, 2),
        serving_size_g=_in_range(product.get("serving_quantity"), SERVING_MIN, SERVING_MAX, 1),
    )


class RateLimiter:
    """At most `limit` calls in any rolling `window` seconds."""

    def __init__(
        self,
        limit: int = RATE_LIMIT,
        window: float = RATE_WINDOW_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._limit = limit
        self._window = window
        self._clock = clock
        self._calls: deque[float] = deque()
        self._lock = threading.Lock()

    def try_acquire(self) -> bool:
        with self._lock:
            now = self._clock()
            while self._calls and now - self._calls[0] >= self._window:
                self._calls.popleft()
            if len(self._calls) >= self._limit:
                return False
            self._calls.append(now)
            return True


class LiveOffAdapter:
    """Calls OFF over HTTPS with stdlib urllib (no extra dependency)."""

    def __init__(
        self,
        urlopen: Callable[..., Any] = urllib.request.urlopen,
        limiter: RateLimiter | None = None,
    ) -> None:
        self._urlopen = urlopen
        self._limiter = limiter or RateLimiter()

    def lookup(self, barcode: str) -> OffResult:
        if not self._limiter.try_acquire():
            return OffUnavailable()
        request = urllib.request.Request(
            OFF_PRODUCT_URL.format(code=barcode),
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        try:
            with self._urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                body = response.read(MAX_RESPONSE_BYTES + 1)
        except urllib.error.HTTPError as error:
            return OffNotFound() if error.code == 404 else OffUnavailable()
        except (urllib.error.URLError, http.client.HTTPException, TimeoutError, OSError):
            # HTTPException covers IncompleteRead, BadStatusLine and the like.
            return OffUnavailable()
        if len(body) > MAX_RESPONSE_BYTES:
            return OffUnavailable()
        try:
            payload = json.loads(body.decode("utf-8"))
        except ValueError:
            # Bad JSON or bad UTF-8.
            return OffUnavailable()
        return parse_product(payload, barcode)


# Real, verified barcodes (research 2026-11-10/13) plus three error cases.
MOCK_NO_KCAL = "7035620020346"  # Eldorado Jasminris: Norwegian entry without kcal
MOCK_NOT_FOUND = "7000000000003"  # valid EAN-13, OFF answers 404
MOCK_UNREACHABLE = "7000000000010"  # valid EAN-13, simulates OFF being unreachable

# Names and kcal as found in OFF; other nutriments are left out of the fixtures.
MOCK_PRODUCTS: dict[str, dict[str, Any]] = {
    "7038010000980": {
        "product_name_nb": "Lettmelk",
        "product_name": "Lettmelk 1,0 %",
        "brands": "TINE",
        "nutriments": {"energy-kcal_100g": 42},
    },
    "7039010132435": {
        "product_name_nb": "Leverpostei",
        "brands": "Stabburet",
        "nutriments": {"energy-kcal_100g": 225},
    },
    "7044416013141": {
        "product_name": "Bjørn Lettkokte Havregryn",
        "brands": "AXA",
        "nutriments": {"energy-kcal_100g": 367},
    },
    # Known bad OFF data (honey is about 300–330 kcal), kept as-is: we never correct OFF.
    "7026450051051": {
        "product_name": "Akasiehonning",
        "brands": "Honningcentralen",
        "nutriments": {"energy-kcal_100g": 95},
    },
    MOCK_NO_KCAL: {
        "product_name": "Jasminris",
        "brands": "Eldorado",
        "nutriments": {},
    },
}


class MockOffAdapter:
    """Answers from the fixtures above; every other code is not found. No network."""

    def __init__(self) -> None:
        self.calls: list[str] = []

    def lookup(self, barcode: str) -> OffResult:
        self.calls.append(barcode)
        if barcode == MOCK_UNREACHABLE:
            return OffUnavailable()
        product = MOCK_PRODUCTS.get(barcode)
        if product is None:
            return OffNotFound()
        return parse_product({"status": 1, "product": product}, barcode)


@lru_cache
def _adapter(mode: str) -> OffPort:
    # Cached so the live rate limit is shared by every request in this process.
    return LiveOffAdapter() if mode == "live" else MockOffAdapter()


def get_off_port() -> OffPort:
    """The adapter chosen by OFF_MODE; a FastAPI dependency, so tests can override it."""
    return _adapter(get_settings().off_mode)
