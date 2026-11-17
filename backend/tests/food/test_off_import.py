"""Norwegian Open Food Facts import (story 3.7): the import with a stubbed fetch and a fake
sleep (no network), seed loading and idempotency, and search over seeded OFF items."""

import json
import re
from collections.abc import Callable, Iterator
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select
from sqlalchemy.orm import Session, sessionmaker

import app.core.db
from app import cli
from app.core.settings import get_settings
from app.modules.food.models import FoodItem
from app.ports import off_import
from app.ports.off import USER_AGENT
from app.seed import seed
from tests.conftest import _truncate_tables
from tests.ports.test_off import FakeResponse

TINE = "7038010000980"  # TINE Lettmelk
Q_LETTMELK = "7038010055720"
LEVERPOSTEI = "7039010132435"
BAD_CHECK_DIGIT = "7038010000981"


def _product(code: str, name: str | None, kcal: Any = 42, brand: str = "TINE") -> dict[str, Any]:
    product: dict[str, Any] = {"code": code, "brands": brand, "nutriments": {}}
    if name is not None:
        product["product_name"] = name
    if kcal is not None:
        product["nutriments"] = {
            "energy-kcal_100g": kcal,
            "proteins_100g": 3.5,
            "carbohydrates_100g": 4.5,
            "fat_100g": 1,
        }
    return product


PAGE_1 = [
    _product(TINE, "Lettmelk"),
    _product("7044416013141", None, 367, "AXA"),  # no name
    _product("7035620020346", "Jasminris", None, "Eldorado"),  # no kcal
    _product(BAD_CHECK_DIGIT, "Feil strekkode"),  # bad barcode
    _product("12345", "For kort"),  # bad barcode
]
PAGE_2 = [
    _product(TINE, "Duplikat", 99),  # duplicate: the first (most scanned) wins
    {**_product(LEVERPOSTEI, "Leverpostei", 225, "Stabburet"), "serving_quantity": "20"},
    _product(Q_LETTMELK, "Lettmelk 0,5 %", 37, "Q"),
    _product("7000000000027", "Kcal for høy", 2000),  # kcal outside 0–900
]


class StubSearch:
    """Answers the search API by page number (or raises) and records each request.

    With `error`, page 2 fails `failures` times (default: every time), then answers.
    """

    def __init__(
        self,
        pages: list[list[dict[str, Any]]],
        error: BaseException | None = None,
        failures: int | None = None,
    ):
        self.pages = pages
        self.error = error
        self.failures = failures
        self.page_2_attempts = 0
        self.requests: list[tuple[Any, float]] = []

    def __call__(self, request: Any, timeout: float) -> FakeResponse:
        self.requests.append((request, timeout))
        page = int(re.search(r"[?&]page=(\d+)", request.full_url).group(1))
        if self.error is not None and page == 2:
            self.page_2_attempts += 1
            if self.failures is None or self.page_2_attempts <= self.failures:
                raise self.error
        products = self.pages[page - 1] if page <= len(self.pages) else []
        return FakeResponse(json.dumps({"count": 2000, "products": products}).encode())


class FakeSleep:
    def __init__(self) -> None:
        self.calls: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.calls.append(seconds)


def test_import_keeps_only_valid_products_once_sorted(tmp_path: Path) -> None:
    stub, sleep = StubSearch([PAGE_1, PAGE_2]), FakeSleep()

    fetched, kept = off_import.run_import(stub, sleep, tmp_path, date(2026, 11, 16))

    assert (fetched, kept) == (9, 3)
    rows = json.loads((tmp_path / "off_norway.json").read_text(encoding="utf-8"))
    assert [row["barcode"] for row in rows] == sorted([TINE, Q_LETTMELK, LEVERPOSTEI])
    by_code = {row["barcode"]: row for row in rows}
    assert by_code[TINE] == {
        "barcode": TINE,
        "name": "TINE Lettmelk",
        "kcal_per_100g": 42,
        "protein_g": 3.5,
        "carbs_g": 4.5,
        "fat_g": 1,
        "serving_size_g": None,
    }
    assert by_code[Q_LETTMELK]["name"] == "Q Lettmelk 0,5 %"
    assert by_code[LEVERPOSTEI]["serving_size_g"] == 20
    license_text = (tmp_path / "OFF_LICENSE.md").read_text(encoding="utf-8")
    for text in ("Data fra Open Food Facts", "ODbL", "1.0", "2026-11-16", "avledet database"):
        assert text in license_text


def test_import_fetches_all_pages_rate_limited_with_user_agent(tmp_path: Path) -> None:
    stub, sleep = StubSearch([PAGE_1, PAGE_2]), FakeSleep()

    off_import.run_import(stub, sleep, tmp_path, date(2026, 11, 16))

    assert len(stub.requests) == off_import.PAGES
    # A wait of at least 6 s between every two requests: at most 10 searches a minute.
    assert len(sleep.calls) == off_import.PAGES - 1
    assert all(seconds >= 6 for seconds in sleep.calls)
    for page, (request, timeout) in enumerate(stub.requests, start=1):
        assert timeout == 30
        assert request.get_header("User-agent") == USER_AGENT
        url = request.full_url
        assert url.startswith("https://world.openfoodfacts.org/api/v2/search?")
        assert "countries_tags_en=norway" in url and "sort_by=unique_scans_n" in url
        assert "page_size=100" in url and f"&page={page}&" in url


@pytest.mark.parametrize(
    "error", [OSError("nettverk nede"), TimeoutError("timed out")], ids=["network", "timeout"]
)
def test_network_error_leaves_files_untouched(tmp_path: Path, error: BaseException) -> None:
    (tmp_path / "off_norway.json").write_text("gammel", encoding="utf-8")

    with pytest.raises(off_import.OffImportError):
        off_import.run_import(StubSearch([PAGE_1], error), FakeSleep(), tmp_path)

    assert (tmp_path / "off_norway.json").read_text(encoding="utf-8") == "gammel"
    assert not (tmp_path / "OFF_LICENSE.md").exists()


def test_cli_prints_counts_and_exits_non_zero_on_error(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], tmp_path: Path
) -> None:
    calls: list[dict[str, object]] = []
    real_run_import = off_import.run_import
    monkeypatch.setattr(
        off_import,
        "run_import",
        lambda **kwargs: (
            calls.append(kwargs),
            real_run_import(StubSearch([PAGE_1, PAGE_2]), FakeSleep(), tmp_path, date(2026, 11, 16)),
        )[1],
    )
    assert cli.main(["import-off-norway"]) == 0
    assert "Fetched 9 products, kept 3." in capsys.readouterr().out
    # The command turns on the page cache, so a rerun after an OFF 503 resumes.
    assert calls == [{"cache_dir": off_import.CACHE_DIR}]

    def failing(**_: object) -> tuple[int, int]:
        raise off_import.OffImportError("page 1: 503")

    monkeypatch.setattr(off_import, "run_import", failing)
    assert cli.main(["import-off-norway"]) == 1
    assert "Fetched" not in capsys.readouterr().out


def test_committed_seed_file_is_valid() -> None:
    from app.modules.food.barcode import is_valid_ean

    rows = json.loads(seed.OFF_NORWAY_FILE.read_text(encoding="utf-8"))
    barcodes = [row["barcode"] for row in rows]

    assert 0 < len(rows) <= off_import.PAGES * 100
    assert barcodes == sorted(set(barcodes))
    for row in rows:
        assert is_valid_ean(row["barcode"])
        assert row["name"]
        assert 0 <= row["kcal_per_100g"] <= 900
    license_text = (seed.OFF_NORWAY_FILE.parent / "OFF_LICENSE.md").read_text(encoding="utf-8")
    # The license states the same count as the data file, and the required attribution.
    assert str(len(rows)) in license_text
    for text in ("Data fra Open Food Facts", "ODbL"):
        assert text in license_text


# --- Seed loading -------------------------------------------------------------------------

FIXTURE_ROWS = [
    {"barcode": TINE, "name": "TINE Lettmelk", "kcal_per_100g": 42, "protein_g": 3.5,
     "carbs_g": 4.5, "fat_g": 1, "serving_size_g": None},
    {"barcode": Q_LETTMELK, "name": "Q Lettmelk 0,5 %", "kcal_per_100g": 37, "protein_g": None,
     "carbs_g": None, "fat_g": None, "serving_size_g": 250},
    {"barcode": LEVERPOSTEI, "name": "Stabburet Leverpostei", "kcal_per_100g": 225,
     "protein_g": None, "carbs_g": None, "fat_g": None, "serving_size_g": None},
]


@pytest.fixture
def off_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "off_norway.json"
    path.write_text(json.dumps(FIXTURE_ROWS), encoding="utf-8")
    monkeypatch.setattr(seed, "OFF_NORWAY_FILE", path)
    return path


@pytest.fixture
def factory(test_engine: Engine) -> Iterator[sessionmaker[Session]]:
    yield sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    _truncate_tables(test_engine)


def _count(factory: sessionmaker[Session], source: str) -> int:
    with factory() as db:
        statement = select(func.count()).select_from(FoodItem).where(FoodItem.source == source)
        return db.scalar(statement) or 0


def test_seed_loads_matvaretabellen_and_off_once(
    factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch, off_file: Path
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    settings = get_settings().model_copy(update={"app_env": "local"})
    matvaretabellen = len(json.loads(seed.MATVARETABELLEN_FILE.read_text(encoding="utf-8")))

    assert seed.seed_if_empty(settings) is True
    assert _count(factory, "matvaretabellen") == matvaretabellen
    assert _count(factory, "off") == 3
    assert seed.seed_if_empty(settings) is True  # the second start adds nothing
    assert _count(factory, "off") == 3

    with factory() as db:
        tine = db.scalars(select(FoodItem).where(FoodItem.barcode == TINE)).one()
        q = db.scalars(select(FoodItem).where(FoodItem.barcode == Q_LETTMELK)).one()
    assert (tine.source, tine.owner_id, tine.external_id) == ("off", None, TINE)
    assert tine.name == "TINE Lettmelk"
    assert float(tine.kcal_per_100g) == 42 and float(tine.protein_g) == 3.5
    assert float(q.serving_size_g) == 250 and q.fat_g is None


def test_seed_skips_barcodes_already_cached(
    factory: sessionmaker[Session], off_file: Path
) -> None:
    with factory() as db:
        db.add(FoodItem(source="off", owner_id=None, external_id=TINE, barcode=TINE,
                        name="TINE Lettmelk (cachet)", kcal_per_100g=42))
        db.commit()
        assert seed.seed_off_items(db) == 2
        db.commit()
        assert seed.seed_off_items(db) == 0
        names = db.scalars(select(FoodItem.name).where(FoodItem.barcode == TINE)).all()
    assert names == ["TINE Lettmelk (cachet)"]


def test_seed_off_skips_outside_local(
    factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch, off_file: Path
) -> None:
    monkeypatch.setattr(app.core.db, "get_session_factory", lambda: factory)
    settings = get_settings().model_copy(update={"app_env": "test"})

    assert seed.seed_if_empty(settings) is False
    assert _count(factory, "off") == 0


# --- Search -------------------------------------------------------------------------------


def test_search_lettmelk_finds_tine_and_q(
    db_session: Session, off_file: Path, logged_in_client: Callable[..., TestClient]
) -> None:
    seed.seed_food_items(db_session)
    seed.seed_off_items(db_session)
    db_session.commit()
    client = logged_in_client("sara@eksempel.no")
    assert client.post("/api/identity/consent").status_code == 200

    response = client.get("/api/food/items", params={"q": "lettmelk"})

    assert response.status_code == 200
    by_name = {item["name"]: item for item in response.json()}
    assert by_name["TINE Lettmelk"]["source"] == "off"
    assert by_name["Q Lettmelk 0,5 %"]["source"] == "off"
    assert any(item["source"] == "matvaretabellen" for item in response.json())


def test_a_failing_page_is_retried_after_a_pause(tmp_path: Path) -> None:
    stub, sleep = StubSearch([PAGE_1, PAGE_2], OSError("503"), failures=2), FakeSleep()

    fetched, kept = off_import.run_import(stub, sleep, tmp_path, date(2026, 11, 16))

    # Page 2 failed twice and answered on the third and last try.
    assert stub.page_2_attempts == 3
    assert len(stub.requests) == off_import.PAGES + 2
    assert sleep.calls.count(off_import.SECONDS_BETWEEN_ATTEMPTS) == 2
    assert all(seconds >= 6 for seconds in sleep.calls)
    assert (fetched, kept) == (9, 3)


def test_a_page_that_keeps_failing_stops_the_import(tmp_path: Path) -> None:
    stub, sleep = StubSearch([PAGE_1], OSError("503")), FakeSleep()

    with pytest.raises(off_import.OffImportError):
        off_import.run_import(stub, sleep, tmp_path)

    assert stub.page_2_attempts == off_import.ATTEMPTS_PER_PAGE
    assert not (tmp_path / "off_norway.json").exists()


def test_an_interrupted_import_resumes_from_the_cached_pages(tmp_path: Path) -> None:
    cache = tmp_path / "cache"
    data = tmp_path / "data"
    data.mkdir()

    # First run: page 2 keeps failing, so only page 1 is cached and nothing is written.
    with pytest.raises(off_import.OffImportError):
        off_import.run_import(
            StubSearch([PAGE_1], OSError("503")), FakeSleep(), data, cache_dir=cache
        )
    assert (cache / "page_1.json").exists()
    assert not (data / "off_norway.json").exists()

    # Second run: page 1 comes from the cache, the rest from OFF; the cache is removed.
    stub = StubSearch([PAGE_1, PAGE_2])
    fetched, kept = off_import.run_import(
        stub, FakeSleep(), data, date(2026, 11, 17), cache_dir=cache
    )
    requested_pages = [
        int(re.search(r"[?&]page=(\d+)", request.full_url).group(1))
        for request, _ in stub.requests
    ]
    assert 1 not in requested_pages
    assert (fetched, kept) == (9, 3)
    assert (data / "off_norway.json").exists()
    assert not cache.exists()


def test_a_damaged_cached_page_is_fetched_again(tmp_path: Path) -> None:
    cache = tmp_path / "cache"
    cache.mkdir()
    (cache / "page_1.json").write_text("[{ halv", encoding="utf-8")
    stub = StubSearch([PAGE_1, PAGE_2])

    fetched, _ = off_import.run_import(stub, FakeSleep(), tmp_path, date(2026, 11, 17), cache_dir=cache)

    assert fetched == 9
    assert not cache.exists()

