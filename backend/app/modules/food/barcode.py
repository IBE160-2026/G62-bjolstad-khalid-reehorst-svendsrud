"""EAN-8 / EAN-13 barcode check (story 3.3), used before any lookup and for own items."""

import re

_EAN = re.compile(r"[0-9]{8}|[0-9]{13}")

INVALID_BARCODE_MESSAGE = "Sjekk at strekkoden har 8 eller 13 siffer."


def is_valid_ean(code: str) -> bool:
    """True for 8 or 13 ASCII digits whose last digit is the correct GS1 check digit."""
    if not _EAN.fullmatch(code):
        return False
    digits = [int(char) for char in code]
    body, check = digits[:-1], digits[-1]
    # Weights 3, 1, 3, … from the digit next to the check digit, leftwards.
    total = sum(digit * (3 if index % 2 == 0 else 1) for index, digit in enumerate(reversed(body)))
    return (10 - total % 10) % 10 == check
