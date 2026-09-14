"""Compare generated artifacts against the live legacy API.

Run this while the FastAPI backend is still reachable, BEFORE anything is torn
down. "The numbers are unchanged" has to be a verified claim.

Usage:
    python validate.py --out ./out --api-url http://127.0.0.1:8000
"""

import argparse
import json
import sys
from pathlib import Path

from segregation_pipeline.selection import YEARS
from segregation_pipeline.serialization import sanitize_number

# Below display precision; guards against numeric-vs-float64 noise.
TOLERANCE = 1e-9


def _key(row, key_fields):
    return tuple(row.get(field) for field in key_fields)


def _values_differ(left, right) -> bool:
    left_number = sanitize_number(left)
    right_number = sanitize_number(right)
    if left_number is None or right_number is None:
        return left_number is not right_number and left != right
    return abs(left_number - right_number) > TOLERANCE


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
        for field, value in row.items():
            if field in key_fields:
                continue
            if _values_differ(value, counterpart.get(field)):
                problems.append(
                    f"{key}: {field} expected {value!r}, got {counterpart.get(field)!r}"
                )

    extra = set(actual_by_key) - {_key(row, key_fields) for row in expected}
    problems.extend(f"unexpected row for {key}" for key in sorted(extra))
    return problems


def compare_breaks(expected, actual) -> list[str]:
    if expected is None and actual is None:
        return []
    if expected is None or actual is None:
        return [f"breaks presence differs: {expected!r} vs {actual!r}"]
    return [
        f"break {index} expected {left!r}, got {right!r}"
        for index, (left, right) in enumerate(zip(expected, actual))
        if _values_differ(left, right)
    ]


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
