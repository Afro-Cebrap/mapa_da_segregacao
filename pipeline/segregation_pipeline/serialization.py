"""JSON value rules shared by every artifact writer.

Mirrors geo_comum.sanitizar_float_json and geo_comum._linha_indicador so the
static payloads match the legacy API responses' values -- not byte-for-byte
(this module normalizes Decimal and int to float, and validate.py compares
with a 1e-9 tolerance precisely because exact byte equality does not hold),
but equivalent under that tolerance.
"""

import math
from decimal import Decimal


def sanitize_number(value):
    """Return a JSON-safe number, or None for missing and non-finite values.

    inf/-inf/NaN are not valid JSON and previously produced 500s from the
    endpoints that serialize with allow_nan=False. They become None, which the
    panel renders as "Sem dados".
    """
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value) if value.is_finite() else None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if math.isfinite(numeric) else None


def as_code(value):
    """Return an identifier as a string, or None when missing.

    Numeric codes are rendered without a decimal tail: the frontend matches
    these against Set<string>, where "35.0" would silently never match "35".

    Looks like source._stringify_identifier, but is NOT interchangeable with
    it and must not be merged into it: this function returns None for a
    missing value because that is what a JSON writer needs for "no value".
    _stringify_identifier instead passes NaN through unchanged, because it
    runs during normalize() and selection.py's resource masks still need to
    call .str.len() on the column afterwards -- which None would break (NaN
    does not).
    """
    if value is None:
        return None
    if isinstance(value, str):
        return value
    numeric = sanitize_number(value)
    if numeric is None:
        return None
    if float(numeric).is_integer():
        return str(int(numeric))
    return str(numeric)
