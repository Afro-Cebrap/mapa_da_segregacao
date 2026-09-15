"""Per-scope setor artifacts.

One file serves both the legacy /api/setores/indicadores and
/api/setores/escala: Dashboard.tsx's escalaParams and useIndicatorRankings'
setoresApiParams resolve scope with identical logic, so they share a key space.
"""

import json
import re
import unicodedata
from pathlib import Path

import geopandas as gpd
import numpy as np

from segregation_pipeline.meta import RANKING_METRICS
from segregation_pipeline.serialization import as_code, sanitize_number

# setores_repository.METRICAS_VALIDAS — the metrics /escala accepted.
SCALE_METRICS = RANKING_METRICS + (
    "percent_branca",
    "percent_preta",
    "percent_amarela",
    "percent_parda",
    "percent_indigena",
    "percent_preta_ou_parda",
)

QUARTILES = (0, 25, 50, 75)


def slugify(name: str) -> str:
    """URL-safe file name for a metro area."""
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", ascii_only.lower()).strip("-")


def build_metro_slugs(names) -> dict[str, str]:
    """Map each metro-area name to its file slug.

    Shipped as index.json so the frontend never reimplements this
    normalization and the two sides cannot drift apart.
    """
    slugs: dict[str, str] = {}
    seen: dict[str, str] = {}

    for name in sorted({name for name in names if name}):
        slug = slugify(name)
        if slug in seen:
            raise ValueError(
                f"slug collision: {name!r} and {seen[slug]!r} both map to {slug!r}"
            )
        seen[slug] = name
        slugs[name] = slug

    return slugs


def compute_breaks(values) -> list[float] | None:
    """p0/p25/p50/p75 over finite values, or None when there are none.

    numpy's default linear interpolation matches Postgres percentile_cont.
    """
    usable = [
        number
        for number in (sanitize_number(value) for value in values)
        if number is not None
    ]
    if not usable:
        return None
    return [
        float(value)
        for value in np.percentile(usable, QUARTILES, method="linear")
    ]


def build_scope_payload(gdf: gpd.GeoDataFrame) -> dict:
    rows = [
        {
            "code_tract": as_code(row["code_tract"]),
            "code_muni": as_code(row["code_muni"]),
            **{metric: sanitize_number(row[metric]) for metric in RANKING_METRICS},
        }
        for _, row in gdf.iterrows()
    ]
    breaks = {
        metric: compute_breaks(gdf[metric].tolist()) for metric in SCALE_METRICS
    }
    return {"breaks": breaks, "rows": rows}


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )


def write_scope_files(gdf: gpd.GeoDataFrame, year: int, out_dir) -> dict[str, int]:
    """Write one file per metro area and per municipality.

    Both scopes are generated for every key present in the data, not only the
    ones the current UI can request, so a later change in scope resolution
    cannot produce a 404.
    """
    base = Path(out_dir) / "scopes" / "setores" / str(year)
    metro_rows = gdf[gdf["unit_type"] == "metro"]
    muni_rows = gdf[gdf["unit_type"] == "muni"]

    slugs = build_metro_slugs(metro_rows["name_metro"].dropna().unique())
    for name, slug in slugs.items():
        subset = metro_rows[metro_rows["name_metro"] == name]
        _write_json(base / "metro" / f"{slug}.json", build_scope_payload(subset))

    muni_codes = sorted(muni_rows["code_muni"].dropna().unique())
    for code in muni_codes:
        subset = muni_rows[muni_rows["code_muni"] == code]
        _write_json(base / "muni" / f"{code}.json", build_scope_payload(subset))

    _write_json(base / "index.json", {"metro": slugs})

    return {"metro": len(slugs), "muni": len(muni_codes)}
