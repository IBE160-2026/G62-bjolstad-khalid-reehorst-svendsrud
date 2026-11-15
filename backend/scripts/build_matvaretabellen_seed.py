"""Build backend/app/seed/data/matvaretabellen.json from a Matvaretabellen download.

Source: Matvaretabellen 2026, Mattilsynet (www.matvaretabellen.no), CC BY 4.0.
Download https://www.matvaretabellen.no/api/nb/foods.json (about 14 MB, not committed),
then run from backend/:

    uv run python scripts/build_matvaretabellen_seed.py path/to/foods.json

Only the small curated subset below is written and committed.
"""

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
OUTPUT = BACKEND_DIR / "app" / "seed" / "data" / "matvaretabellen.json"

# Everyday Norwegian basic foods (exact Matvaretabellen names). No baby food, no brands.
CURATED_NAMES: list[str] = [
    # Dairy
    "Helmelk, uspesifisert",
    "Lettmelk, uspesifisert",
    "Lettmelk, 0,5 % fett, vitamin D, uspesifisert",
    "Melk, uspesifisert",
    "Kaffemelk, 3,5 % fett",
    "Kakao, med lettmelk, tilberedt",
    "Yoghurt, naturell",
    "Yoghurt, vanilje",
    "Yoghurt, naturell, 10 % fett, gresk/tyrkisk",
    "Yoghurt, naturell, 2 % fett, gresk/tyrkisk",
    "Skyr, med smak, kunstig søtet",
    "Cottage cheese",
    "Kremost, naturell",
    "Lettrømme, 18 % fett",
    "Seterrømme, 35 % fett",
    "Crème fraîche, 35 % fett",
    "Matfløte, 18 % fett",
    "Kremfløte, 37 % fett",
    "Kaffefløte, 10 % fett",
    "Gulost, uspesifisert",
    "Brunost, uspesifisert",
    "Prim",
    "Mozzarella, norsk",
    "Feta, ost med geitmelk",
    "Cheddar, gulost",
    "Goudaost",
    "Nøkkelost",
    "Brie, hvitmuggost",
    "Parmesan, Parmigiano Reggiano, ost",
    "Pizzaost, revet",
    "Magerost, smørbar, 10 % fett",
    # Eggs
    "Egg, rå",
    "Egg, kokt",
    "Egg, stekt i fett",
    "Eggerøre, stekt i fett",
    "Eggehvite, rå",
    # Bread, grain and cereal
    "Havremel",
    "Havregryn",
    "Havrekli",
    "Havregrøt, med melk",
    "Havregrøt, med vann",
    "Risgrøt, med helmelk",
    "Hvetemel, siktet",
    "Hvetemel, sammalt, fint/grovt",
    "Rismel",
    "Brød, grovt (50-75 %), kjøpt",
    "Brød, ekstra grovt (75-100 %), kjøpt",
    "Brød, halvgrovt (25-50 %), kjøpt",
    "Rundstykke, grovt, kjøpt",
    "Rundstykke, fint, kjøpt",
    "Knekkebrød, rug, grovt",
    "Knekkebrød, havre",
    "Flatbrød, kjøpt",
    "Potetlompe, potetlefse, kjøpt",
    "Tortilla, wraps/burrito, hvetemel",
    "Pasta, naturell, tørr",
    "Pasta, naturell, kokt",
    "Pasta, fullkorn, tørr",
    "Pasta, fullkorn, kokt med salt",
    "Ris, polert, langkornet, tørr",
    "Ris, polert, langkornet, kokt",
    "Ris, basmati, kokt",
    "Ris, jasmin, kokt",
    "Ris, upolert, naturris, langkornet, kokt",
    "Eggnudler, kokt",
    "Riskaker, lettsaltet",
    "Granola, hjemmelaget",
    # Potatoes
    "Potet, lagringspotet, rå",
    "Potet, lagringspotet, kokt",
    "Potet, bakt",
    "Potetmos, potetstappe, hjemmelaget",
    "Søtpotet, rå",
    "Pommes frites, gatekjøkken",
    # Vegetables
    "Agurk, norsk, rå",
    "Tomat, uspesifisert, rå",
    "Cherrytomat, importert, rå",
    "Gulrot, norsk, rå",
    "Brokkoli, uspesifisert, rå",
    "Blomkål, uspesifisert, rå",
    "Løk, gul, norsk, rå",
    "Hvitløk, rå",
    "Paprika, rød, rå",
    "Paprika, grønn, rå",
    "Isbergsalat, issalat, rå",
    "Spinat, rå",
    "Hodekål, norsk, rå",
    "Kålrot, kålrabi, norsk, rå",
    "Squash, zucchini, rå",
    "Sjampinjong, champignon, rå",
    "Avokado, rå",
    "Mais, norsk, rå",
    "Purreløk, rå",
    "Rødbete, norsk, rå",
    "Erter, grønne, hermetisk, avrent",
    "Kikerter, hermetisk",
    "Kidneybønner, røde, hermetisk",
    "Linser, røde, tørre",
    "Tomatbønner, hvite bønner, i tomatsaus, hermetisk",
    # Fruit and berries
    "Banan, rå",
    "Eple, uspesifisert, rå",
    "Appelsin, rå",
    "Pære, uspesifisert, rå",
    "Klementin, rå",
    "Drue, rå",
    "Kiwi, rå",
    "Mango, rå",
    "Ananas, rå",
    "Vannmelon, rå",
    "Plomme, rå",
    "Jordbær, rå",
    "Blåbær, rå",
    "Bringebær, rå",
    "Tyttebær, rå",
    "Rosiner",
    "Jordbærsyltetøy",
    # Meat
    "Kylling, filet, uten skinn, rå",
    "Kylling, filet, stekt uten fett",
    "Kylling, hel, med skinn, ovnsstekt",
    "Kalkun, bryst, filet, uten skinn, rå",
    "Kjøttdeig, storfe, 14 % fett, med salt og vann, rå",
    "Karbonadedeig, storfe, 4,5 % fett, rå",
    "Kjøttdeig, svin, 9 % fett, rå",
    "Storfe, entrecôte, rå",
    "Storfe, indrefilet, rå",
    "Svin, ytrefilet, rå",
    "Svin, nakkekoteletter, rå",
    "Svin, bacon, flesk, stekt",
    "Svin, ribbe, sideflesk, rå",
    "Lam, kotelett, rå",
    "Elg, kvernet kjøtt, rå",
    "Kjøttkaker, kjøpt",
    "Kjøttboller",
    "Wienerpølse",
    "Grillpølse",
    "Kokt skinke",
    "Salami",
    "Servelat",
    "Leverpostei, uspesifisert",
    "Kalkunfilet, naturell/røkt",
    # Fish and seafood
    "Laks, oppdrett, rå",
    "Laks, filet, ovnsstekt",
    "Laks, røkt",
    "Torsk, uspesifisert, rå",
    "Torsk, filet, kokt",
    "Sei, rå",
    "Makrell i tomat, hermetisk",
    "Tunfisk, i vann, avrent, hermetisk",
    "Reker, kokt",
    "Fiskekaker, kjøpt",
    "Fiskeboller, kjøpt",
    "Fiskepudding",
    "Kaviar, av torskerogn",
    "Sild, sursild, innlagt, avrent",
    # Spreads, fats and extras
    "Smør",
    "Margarin, myk",
    "Olivenolje",
    "Rapsolje",
    "Majones, ekte",
    "Ketchup, tomatketchup",
    "Peanøttsmør",
    "Honning",
    "Sukker, hvitt",
    "Hummus",
    "Tofu",
    # Nuts and snacks
    "Mandler",
    "Valnøtter",
    "Cashewnøtter",
    "Peanøtter",
    "Solsikkefrø",
    "Sjokolade, melkesjokolade",
    "Sjokolade, mørk, 70 % kakao",
    "Potetchips",
    # Drinks
    "Appelsinjuice, fra konsentrat",
    "Eplejuice, most",
    "Kaffe, traktet",
    "Te, svart, tilberedt",
    "Brus, cola, med sukker",
    "Brus, cola, kunstig søtet, lett",
    "Vann, drikkevann",
    "Havrebasert drikke",
    "Øl, alkoholfritt",
]

MACROS = {"Protein": "protein_g", "Karbo": "carbs_g", "Fett": "fat_g"}


def _macro(food: dict, nutrient_id: str) -> float | None:
    for constituent in food.get("constituents", []):
        if constituent.get("nutrientId") == nutrient_id and "quantity" in constituent:
            return float(constituent["quantity"])
    return None


def build(source: Path) -> list[dict]:
    foods = json.loads(source.read_text(encoding="utf-8"))["foods"]
    by_name = {food["foodName"].strip(): food for food in foods}
    missing = [name for name in CURATED_NAMES if name not in by_name]
    if missing:
        raise SystemExit(f"Not in Matvaretabellen: {missing}")
    if len(set(CURATED_NAMES)) != len(CURATED_NAMES):
        raise SystemExit("Duplicate names in CURATED_NAMES")

    items = []
    for name in CURATED_NAMES:
        food = by_name[name]
        kcal = food.get("calories", {}).get("quantity")
        if kcal is None:
            raise SystemExit(f"No kcal for {name}")
        item = {"food_id": food["foodId"], "name": name, "kcal_per_100g": float(kcal)}
        for nutrient_id, field in MACROS.items():
            value = _macro(food, nutrient_id)
            if value is not None:
                item[field] = value
        items.append(item)
    return items


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    items = build(Path(argv[0]))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(items, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} foods to {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
