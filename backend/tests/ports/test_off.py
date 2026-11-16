"""Open Food Facts port (story 3.3): parsing, the live adapter with a stubbed urlopen (no
network), the rate limit, the mock fixtures and the EAN check."""

import http.client
import io
import json
import socket
import urllib.error
from decimal import Decimal
from typing import Any

import pytest

from app.modules.food.barcode import is_valid_ean
from app.ports.off import (
    MOCK_NO_KCAL,
    MOCK_NOT_FOUND,
    MAX_RESPONSE_BYTES,
    MOCK_UNREACHABLE,
    TIMEOUT_SECONDS,
    USER_AGENT,
    LiveOffAdapter,
    MockOffAdapter,
    OffNotFound,
    OffProduct,
    OffUnavailable,
    RateLimiter,
    _adapter,
    get_off_port,
    parse_product,
)

CODE = "7038010000980"


class FakeResponse(io.BytesIO):
    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


class StubUrlopen:
    """Records each request and answers with a payload or raises an error."""

    def __init__(self, answer: Any = None, error: BaseException | None = None) -> None:
        self.answer = answer
        self.error = error
        self.requests: list[tuple[Any, float]] = []

    def __call__(self, request: Any, timeout: float) -> FakeResponse:
        self.requests.append((request, timeout))
        if self.error is not None:
            raise self.error
        body = self.answer if isinstance(self.answer, bytes) else json.dumps(self.answer).encode()
        return FakeResponse(body)


def _found(product: dict[str, Any]) -> dict[str, Any]:
    return {"status": 1, "code": CODE, "product": product}


def _http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://example.invalid", code, "x", {}, None)  # type: ignore[arg-type]


# --- EAN check -------------------------------------------------------------------------


@pytest.mark.parametrize(
    "code", ["7038010000980", "7039010132435", "7044416013141", "7026450051051", "96385074"]
)
def test_valid_ean(code: str) -> None:
    assert is_valid_ean(code)


@pytest.mark.parametrize(
    "code",
    ["", "12345", "703801000098", "7038010000981", "70380100009a0", "70380100009800",
     " 7038010000980", "7038010000980\n", "٧٠٣٨٠١٠٠٠٠٩٨٠", "96385075"],
)
def test_invalid_ean(code: str) -> None:
    assert not is_valid_ean(code)


# --- parsing ---------------------------------------------------------------------------


def test_parse_uses_norwegian_name_plus_brand_and_keeps_values() -> None:
    result = parse_product(
        _found(
            {
                "product_name_nb": "Lettmelk",
                "product_name": "Lettmelk 1,0 %",
                "brands": "TINE, Tine SA",
                "nutriments": {
                    "energy-kcal_100g": 42,
                    "proteins_100g": 3.5,
                    "carbohydrates_100g": "4.5",
                    "fat_100g": 1.0,
                },
                "serving_quantity": "250",
            }
        ),
        CODE,
    )

    assert result == OffProduct(
        name="TINE Lettmelk",
        kcal_per_100g=Decimal("42"),
        protein_g=Decimal("3.5"),
        carbs_g=Decimal("4.5"),
        fat_g=Decimal("1.0"),
        serving_size_g=Decimal("250.0"),
    )


def test_parse_falls_back_to_product_name_and_skips_brand_already_in_name() -> None:
    result = parse_product(
        _found({"product_name": "Stabburet Leverpostei", "brands": "Stabburet",
                "nutriments": {"energy-kcal_100g": 225}}),
        CODE,
    )

    assert isinstance(result, OffProduct)
    assert result.name == "Stabburet Leverpostei"
    assert result.protein_g is None and result.serving_size_g is None


def test_parse_without_any_name_uses_the_barcode() -> None:
    result = parse_product(_found({"nutriments": {"energy-kcal_100g": 100}}), CODE)

    assert isinstance(result, OffProduct)
    assert result.name == f"Vare {CODE}"


@pytest.mark.parametrize(
    "payload",
    [
        {"status": 0, "status_verbose": "product not found"},
        _found({"product_name": "Jasminris", "nutriments": {}}),
        _found({"product_name": "Jasminris"}),
        _found({"product_name": "X", "nutriments": {"energy-kcal_100g": "abc"}}),
        _found({"product_name": "X", "nutriments": {"energy-kcal_100g": 2500}}),
        _found({"product_name": "X", "nutriments": {"energy-kcal_100g": -1}}),
        "not a dict",
    ],
)
def test_parse_without_usable_kcal_is_not_found(payload: Any) -> None:
    assert parse_product(payload, CODE) == OffNotFound()


def test_parse_drops_out_of_range_optional_values() -> None:
    result = parse_product(
        _found({"product_name": "X", "serving_quantity": 0,
                "nutriments": {"energy-kcal_100g": 95, "proteins_100g": 150, "fat_100g": True}}),
        CODE,
    )

    assert isinstance(result, OffProduct)
    assert result.kcal_per_100g == Decimal("95")
    assert (result.protein_g, result.fat_g, result.serving_size_g) == (None, None, None)


# --- live adapter (stubbed urlopen) ----------------------------------------------------


def test_live_sends_user_agent_fields_and_timeout() -> None:
    stub = StubUrlopen(_found({"product_name": "Lettmelk", "brands": "TINE",
                               "nutriments": {"energy-kcal_100g": 42}}))

    result = LiveOffAdapter(urlopen=stub).lookup(CODE)

    assert isinstance(result, OffProduct)
    assert result.name == "TINE Lettmelk"
    [(request, timeout)] = stub.requests
    assert timeout == TIMEOUT_SECONDS == 5
    assert request.get_header("User-agent") == USER_AGENT
    assert USER_AGENT == "PromptForce/0.1 (IBE160 student project)"
    assert request.full_url == (
        f"https://world.openfoodfacts.org/api/v2/product/{CODE}"
        "?fields=product_name,product_name_nb,brands,nutriments,serving_quantity"
    )


def test_live_404_is_not_found() -> None:
    assert LiveOffAdapter(urlopen=StubUrlopen(error=_http_error(404))).lookup(CODE) == OffNotFound()


@pytest.mark.parametrize(
    "error",
    [
        _http_error(500),
        _http_error(503),
        _http_error(429),
        urllib.error.URLError("no route"),
        TimeoutError("timed out"),
        socket.timeout("timed out"),
        ConnectionResetError(),
    ],
)
def test_live_errors_are_unavailable(error: BaseException) -> None:
    assert LiveOffAdapter(urlopen=StubUrlopen(error=error)).lookup(CODE) == OffUnavailable()


@pytest.mark.parametrize(
    "error", [http.client.BadStatusLine("x"), http.client.RemoteDisconnected("closed")]
)
def test_live_http_client_errors_are_unavailable(error: BaseException) -> None:
    assert LiveOffAdapter(urlopen=StubUrlopen(error=error)).lookup(CODE) == OffUnavailable()


class BrokenResponse(FakeResponse):
    def read(self, size: int | None = -1) -> bytes:
        raise http.client.IncompleteRead(b"{", 100)


def test_live_incomplete_read_is_unavailable() -> None:
    def urlopen(request: Any, timeout: float) -> FakeResponse:
        return BrokenResponse(b"")

    assert LiveOffAdapter(urlopen=urlopen).lookup(CODE) == OffUnavailable()


def test_live_oversized_answer_is_unavailable() -> None:
    body = json.dumps(
        _found({"product_name": "X", "nutriments": {"energy-kcal_100g": 42},
                "padding": "x" * MAX_RESPONSE_BYTES})
    ).encode()

    assert LiveOffAdapter(urlopen=StubUrlopen(body)).lookup(CODE) == OffUnavailable()


def test_live_bad_json_is_unavailable() -> None:
    assert LiveOffAdapter(urlopen=StubUrlopen(b"<html>busy</html>")).lookup(CODE) == OffUnavailable()


def test_live_rate_limit_is_14_per_rolling_minute() -> None:
    now = [1000.0]
    stub = StubUrlopen(error=_http_error(404))
    adapter = LiveOffAdapter(urlopen=stub, limiter=RateLimiter(clock=lambda: now[0]))

    results = [adapter.lookup(CODE) for _ in range(15)]

    assert results[:14] == [OffNotFound()] * 14
    assert results[14] == OffUnavailable()
    assert len(stub.requests) == 14  # the 15th never reaches OFF

    now[0] += 59.9
    assert adapter.lookup(CODE) == OffUnavailable()
    now[0] += 0.1  # the first call is now a full minute old
    assert adapter.lookup(CODE) == OffNotFound()
    assert len(stub.requests) == 15


# --- mock adapter and selection --------------------------------------------------------


@pytest.mark.parametrize(
    ("code", "name", "kcal"),
    [
        ("7038010000980", "TINE Lettmelk", Decimal("42")),
        ("7039010132435", "Stabburet Leverpostei", Decimal("225")),
        ("7044416013141", "AXA Bjørn Lettkokte Havregryn", Decimal("367")),
        ("7026450051051", "Honningcentralen Akasiehonning", Decimal("95")),
    ],
)
def test_mock_found_fixtures(code: str, name: str, kcal: Decimal) -> None:
    result = MockOffAdapter().lookup(code)

    assert isinstance(result, OffProduct)
    assert (result.name, result.kcal_per_100g) == (name, kcal)


def test_mock_error_fixtures_are_valid_codes() -> None:
    mock = MockOffAdapter()

    for code in (MOCK_NO_KCAL, MOCK_NOT_FOUND, MOCK_UNREACHABLE):
        assert is_valid_ean(code)
    assert mock.lookup(MOCK_NO_KCAL) == OffNotFound()
    assert mock.lookup(MOCK_NOT_FOUND) == OffNotFound()
    assert mock.lookup(MOCK_UNREACHABLE) == OffUnavailable()
    assert mock.calls == [MOCK_NO_KCAL, MOCK_NOT_FOUND, MOCK_UNREACHABLE]


def test_off_mode_selects_adapter(monkeypatch: pytest.MonkeyPatch) -> None:
    assert isinstance(_adapter("mock"), MockOffAdapter)
    assert isinstance(_adapter("live"), LiveOffAdapter)
    assert _adapter("live") is _adapter("live")  # one rate limit per process

    from app.core import settings as settings_module

    monkeypatch.setenv("OFF_MODE", "mock")
    settings_module.get_settings.cache_clear()
    try:
        assert isinstance(get_off_port(), MockOffAdapter)
    finally:
        settings_module.get_settings.cache_clear()
