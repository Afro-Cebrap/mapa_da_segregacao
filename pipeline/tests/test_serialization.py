import math
from decimal import Decimal

import numpy as np

from segregation_pipeline.serialization import as_code, sanitize_number


def test_sanitize_number_passes_finite_floats_through():
    assert sanitize_number(0.5) == 0.5


def test_sanitize_number_nulls_infinity():
    # percent_indigena reaches inf in tracts that are ~100% one group; the
    # legacy API turned that into None rather than emitting invalid JSON.
    assert sanitize_number(float("inf")) is None
    assert sanitize_number(float("-inf")) is None


def test_sanitize_number_nulls_nan():
    assert sanitize_number(float("nan")) is None


def test_sanitize_number_nulls_non_finite_decimals():
    assert sanitize_number(Decimal("NaN")) is None
    assert sanitize_number(Decimal("Infinity")) is None


def test_sanitize_number_converts_finite_decimal_to_float():
    assert sanitize_number(Decimal("0.25")) == 0.25


def test_sanitize_number_handles_numpy_scalars():
    assert sanitize_number(np.float64(1.5)) == 1.5
    assert sanitize_number(np.float64("nan")) is None


def test_sanitize_number_passes_none_through():
    assert sanitize_number(None) is None


def test_as_code_stringifies_integers_without_a_decimal_tail():
    # code_state arrives as a numeric column; "35.0" would silently fail the
    # frontend's Set<string> matching.
    assert as_code(35) == "35"
    assert as_code(35.0) == "35"
    assert as_code(np.int64(35)) == "35"


def test_as_code_passes_strings_through():
    assert as_code("3550308") == "3550308"


def test_as_code_returns_none_for_missing_values():
    assert as_code(None) is None
    assert as_code(float("nan")) is None
