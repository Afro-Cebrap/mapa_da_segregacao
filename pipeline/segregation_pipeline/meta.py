"""Small, unscoped artifacts: the municipality lookup list and the
municipality/metro-area rankings.

Mirrors municipios_repository.obter_lista_municipios and the CAMPOS_INDICADOR
payloads of municipios_repository and reg_metro_repository.
"""

import geopandas as gpd
import pandas as pd

from segregation_pipeline.serialization import as_code, sanitize_number

BBOX_CRS_EPSG = 4326

# CAMPOS_INDICADOR minus the identifier columns, shared by all three rankings.
RANKING_METRICS = (
    "dissimilarity",
    "index_h",
    "exp_branca_pp",
    "exp_pp_branca",
    "iso_branca_branca",
    "iso_pp_pp",
)


def _metrics(row) -> dict:
    return {metric: sanitize_number(row[metric]) for metric in RANKING_METRICS}


def build_municipios_lista(gdf: gpd.GeoDataFrame) -> list[dict]:
    """Geometry-free municipality lookup, with the 4326 bbox used to frame the
    map on selection. abbrev_state is new here: it lets SearchBar drop its
    full-geometry download and reuse this payload.

    Rows are sorted by name_muni for readability only, with missing names
    last; this is a code-point sort, not pt-BR collation, and is not a
    contract — the frontend (useLocationLookups.ts) re-sorts with
    localeCompare('pt-BR') before display.
    """
    projected = gdf.to_crs(epsg=BBOX_CRS_EPSG)
    rows = []

    for _, row in projected.iterrows():
        geometry = row[projected.geometry.name]
        if geometry is None or geometry.is_empty:
            bounds = (None, None, None, None)
        else:
            bounds = tuple(sanitize_number(value) for value in geometry.bounds)
        name_muni = row["name_muni"]
        if pd.isna(name_muni):
            name_muni = None
        rows.append(
            {
                "code_muni": as_code(row["code_muni"]),
                "name_muni": name_muni,
                "code_state": as_code(row["code_state"]),
                "name_metro": row["name_metro"],
                "abbrev_state": row["abbrev_state"],
                "min_lng": bounds[0],
                "min_lat": bounds[1],
                "max_lng": bounds[2],
                "max_lat": bounds[3],
            }
        )

    rows.sort(key=lambda row: (row["name_muni"] is None, row["name_muni"] or ""))
    return rows


def build_municipios_rankings(gdf: gpd.GeoDataFrame) -> list[dict]:
    return [
        {
            "code_muni": as_code(row["code_muni"]),
            "name_metro": row["name_metro"],
            **_metrics(row),
        }
        for _, row in gdf.iterrows()
    ]


def build_reg_metro_rankings(gdf: gpd.GeoDataFrame) -> list[dict]:
    return [
        {"name_metro": row["name_metro"], **_metrics(row)}
        for _, row in gdf.iterrows()
    ]
