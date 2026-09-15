"""Compare generated artifacts against the live legacy API.

Run this while the FastAPI backend is still reachable, BEFORE anything is torn
down. "The numbers are unchanged" has to be a verified claim.

Usage:
    python validate.py --out ./out --api-url http://127.0.0.1:8000
"""

import argparse
import json
import math
import random
import sys
from pathlib import Path

from segregation_pipeline.selection import YEARS
from segregation_pipeline.serialization import sanitize_number

# Below display precision; guards against numeric-vs-float64 noise.
TOLERANCE = 1e-9

# `scopes/setores/<year>/muni/` holds one file per município outside any RM
# (~5,500 of them). Validating all of them is ~5,500 x 12 metrics x 2 years
# of /escala calls alone -- far too slow to run before every publish. This
# is a deterministic sample instead: same seed, same size, every run, so a
# regression that happens to land on a sampled code is still caught run over
# run, even though the sample is not exhaustive coverage of the muni path.
MUNI_SAMPLE_SIZE = 25
MUNI_SAMPLE_SEED = 20260914


def _key(row, key_fields):
    return tuple(row.get(field) for field in key_fields)


def _is_missing(value) -> bool:
    """True for None or a non-finite float -- both mean "no data" here.

    A bare None and float('nan') carry the same "missing" meaning even
    though they're different Python values, so they must compare equal to
    each other rather than falling through to a naive `!=` check.
    """
    if value is None:
        return True
    return isinstance(value, float) and not math.isfinite(value)


def _values_differ(left, right) -> bool:
    left_missing = _is_missing(left)
    right_missing = _is_missing(right)
    if left_missing or right_missing:
        return left_missing != right_missing

    # A string on either side means at least one value is meant to be read
    # as text, not as a number -- most importantly, identifier fields that
    # serialize as strings in the generated JSON (e.g. "35") but come back
    # as ints from the live API (35). sanitize_number happily parses both
    # into equal floats, which would hide exactly the type mismatch this
    # comparison exists to catch, so short-circuit before it.
    if isinstance(left, str) or isinstance(right, str):
        return left != right

    left_number = sanitize_number(left)
    right_number = sanitize_number(right)
    if left_number is not None and right_number is not None:
        return abs(left_number - right_number) > TOLERANCE

    # Neither side is missing and at least one isn't a valid number --
    # e.g. two names. sanitize_number can't tell them apart, so fall back
    # to a plain comparison.
    return left != right


def compare_rows(expected, actual, key_fields) -> list[str]:
    """Order-insensitive row comparison keyed by key_fields."""
    problems: list[str] = []
    actual_by_key = {_key(row, key_fields): row for row in actual}

    for row in expected:
        key = _key(row, key_fields)
        counterpart = actual_by_key.get(key)
        if counterpart is None:
            problems.append(f"missing row for {key}")
            continue
        # Iterate the union of both sides' fields, not just `row`'s -- a
        # field the generated artifact dropped (or one the live API stopped
        # sending) is a real regression that a one-sided `row.items()` loop
        # can never see.
        for field in sorted(set(row) | set(counterpart)):
            if field in key_fields:
                continue
            if field not in row:
                problems.append(
                    f"{key}: {field} missing from expected, actual has {counterpart[field]!r}"
                )
                continue
            if field not in counterpart:
                problems.append(
                    f"{key}: {field} missing from actual, expected {row[field]!r}"
                )
                continue
            if _values_differ(row[field], counterpart[field]):
                problems.append(
                    f"{key}: {field} expected {row[field]!r}, got {counterpart[field]!r}"
                )

    extra = set(actual_by_key) - {_key(row, key_fields) for row in expected}
    problems.extend(f"unexpected row for {key}" for key in sorted(extra))
    return problems


def compare_breaks(expected, actual) -> list[str]:
    if expected is None and actual is None:
        return []
    if expected is None or actual is None:
        return [f"breaks presence differs: {expected!r} vs {actual!r}"]

    problems: list[str] = []
    if len(expected) != len(actual):
        # zip() below silently drops the tail of the longer side; without
        # this, a shortened breaks list would report zero mismatches.
        problems.append(
            f"breaks length differs: expected {len(expected)}, got {len(actual)}"
        )

    problems.extend(
        f"break {index} expected {left!r}, got {right!r}"
        for index, (left, right) in enumerate(zip(expected, actual))
        if _values_differ(left, right)
    )
    return problems


def _request(api_url: str, path: str, params: dict | None = None):
    """Perform the raw GET against the live API.

    The only place that imports `requests`: the module stays importable
    (compare_rows/compare_breaks in particular) even where `requests` isn't
    installed, and the CLI path still fails clearly if it's genuinely missing.
    """
    import requests

    return requests.get(f"{api_url}{path}", params=params, timeout=120)


def _get(api_url: str, path: str, params: dict | None = None):
    response = _request(api_url, path, params)
    response.raise_for_status()
    return response.json()


def _get_breaks(api_url: str, params: dict) -> list | None:
    """Fetch live percentile breaks for a metric, or None when the API has no data.

    A 404 means the legacy endpoint has nothing for this scope/metric/year
    combination, which is a valid "no data" answer, not a request failure.
    """
    response = _request(api_url, "/api/setores/escala", params)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()["breaks"]


def _load(out_dir: Path, relative: str):
    return json.loads((out_dir / relative).read_text(encoding="utf-8"))


def _sample_muni_codes(out_dir: Path, year: int) -> list[str]:
    """Deterministic sample of município codes with a generated scope file.

    There is no index of muni codes (unlike metro slugs, which index.json
    lists) -- the codes are the file stems under muni/. Sampling instead of
    fully enumerating them keeps validate.py fast enough to run before every
    publish; see MUNI_SAMPLE_SIZE above for why this isn't exhaustive.
    """
    muni_dir = out_dir / "scopes" / "setores" / str(year) / "muni"
    codes = sorted(path.stem for path in muni_dir.glob("*.json"))
    if len(codes) <= MUNI_SAMPLE_SIZE:
        return codes
    return random.Random(MUNI_SAMPLE_SEED).sample(codes, MUNI_SAMPLE_SIZE)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="out")
    parser.add_argument("--api-url", required=True)
    args = parser.parse_args()

    out_dir = Path(args.out)
    problems: list[str] = []

    for year in YEARS:
        print(f">>> {year}: municipality list")
        generated = _load(out_dir, f"meta/municipios_lista_{year}.json")
        live = _get(args.api_url, "/api/municipios/lista", {"year": year})
        # abbrev_state is new in the static artifact and has no live counterpart.
        trimmed = [
            {key: value for key, value in row.items() if key != "abbrev_state"}
            for row in generated
        ]
        problems += [
            f"lista {year}: {problem}"
            for problem in compare_rows(trimmed, live, ("code_muni",))
        ]

        print(f">>> {year}: municipality rankings")
        problems += [
            f"indicadores municipios {year}: {problem}"
            for problem in compare_rows(
                _load(out_dir, f"meta/indicadores_municipios_{year}.json"),
                _get(args.api_url, "/api/municipios/indicadores", {"year": year}),
                ("code_muni",),
            )
        ]

        print(f">>> {year}: metro-area rankings")
        problems += [
            f"indicadores reg_metro {year}: {problem}"
            for problem in compare_rows(
                _load(out_dir, f"meta/indicadores_reg_metro_{year}.json"),
                _get(args.api_url, "/api/reg_metro/indicadores", {"year": year}),
                ("name_metro",),
            )
        ]

        print(f">>> {year}: setor scopes")
        index = _load(out_dir, f"scopes/setores/{year}/index.json")
        for name, slug in index["metro"].items():
            payload = _load(out_dir, f"scopes/setores/{year}/metro/{slug}.json")
            live_rows = _get(
                args.api_url,
                "/api/setores/indicadores",
                {"scope": "reg_metro", "code": name, "year": year},
            )
            problems += [
                f"scope {name} {year}: {problem}"
                for problem in compare_rows(
                    payload["rows"], live_rows, ("code_tract",)
                )
            ]

            for metric, breaks in payload["breaks"].items():
                live_breaks = _get_breaks(
                    args.api_url,
                    {
                        "metric": metric,
                        "scope": "reg_metro",
                        "code": name,
                        "year": year,
                    },
                )
                problems += [
                    f"escala {name} {metric} {year}: {problem}"
                    for problem in compare_breaks(breaks, live_breaks)
                ]

        muni_codes = _sample_muni_codes(out_dir, year)
        print(
            f">>> {year}: setor scopes for {len(muni_codes)} sampled municípios "
            f"(of the full muni/ set; see MUNI_SAMPLE_SIZE)"
        )
        for code in muni_codes:
            payload = _load(out_dir, f"scopes/setores/{year}/muni/{code}.json")
            live_rows = _get(
                args.api_url,
                "/api/setores/indicadores",
                {"scope": "municipio", "code": code, "year": year},
            )
            problems += [
                f"scope muni {code} {year}: {problem}"
                for problem in compare_rows(payload["rows"], live_rows, ("code_tract",))
            ]

            for metric, breaks in payload["breaks"].items():
                live_breaks = _get_breaks(
                    args.api_url,
                    {
                        "metric": metric,
                        "scope": "municipio",
                        "code": code,
                        "year": year,
                    },
                )
                problems += [
                    f"escala muni {code} {metric} {year}: {problem}"
                    for problem in compare_breaks(breaks, live_breaks)
                ]

    if problems:
        print(f"\n!!! {len(problems)} mismatches")
        for problem in problems[:50]:
            print(f"  - {problem}")
        if len(problems) > 50:
            print(f"  ... and {len(problems) - 50} more")
        return 1

    print("\n>>> All artifacts match the live API.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
