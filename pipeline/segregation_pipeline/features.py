"""GeoJSONSeq emission for tippecanoe.

Property names and feature ids mirror each repository's PROPRIEDADES_TILE and
FEATURE_ID_SQL, because the MapLibre style expressions and the popup read them
by name.
"""

import json
import zlib

import geopandas as gpd
from shapely.geometry import mapping

from segregation_pipeline.serialization import sanitize_number

TILE_CRS_EPSG = 4326

# geo_comum.CAMPOS_METRICAS_TILE
TILE_METRICS = (
    "n_total",
    "dissimilarity",
    "index_h",
    "exp_branca_pp",
    "exp_pp_branca",
    "iso_branca_branca",
    "iso_pp_pp",
    "percent_branca",
    "percent_preta",
    "percent_amarela",
    "percent_parda",
    "percent_indigena",
)

TILE_PROPERTIES = {
    "setores": ("cod_setor", "code_muni", "name_muni", "abbrev_state") + TILE_METRICS,
    "municipios": (
        "code_muni",
        "name_muni",
        "code_state",
        "abbrev_state",
        "name_metro",
    )
    + TILE_METRICS,
    "reg_metropo": ("name_metro",) + TILE_METRICS,
}

# Properties that are numeric inside the tile even though they are identifiers.
NUMERIC_TILE_PROPERTIES = frozenset({"cod_setor", "code_muni", "code_state"})

# Source column backing each renamed tile property.
SOURCE_COLUMN = {"cod_setor": "code_tract"}


def feature_id(resource: str, row) -> int:
    """Stable numeric id, consumed by MapLibre setFeatureState for hover."""
    if resource == "setores":
        return int(row["code_tract"])
    if resource == "municipios":
        return int(row["code_muni"])
    if resource == "reg_metropo":
        # Postgres hashtext() has no portable equivalent. CRC32 is stable
        # across runs and machines, which is what feature-state needs.
        return zlib.crc32(str(row["name_metro"]).encode("utf-8"))
    raise ValueError(f"unknown resource: {resource}")


def _property_value(name: str, row):
    value = row[SOURCE_COLUMN.get(name, name)]
    if name in NUMERIC_TILE_PROPERTIES:
        numeric = sanitize_number(value)
        return None if numeric is None else int(numeric)
    if name in TILE_METRICS:
        return sanitize_number(value)
    return None if value is None or value != value else str(value)


def build_feature(resource: str, row, geometry_mapping: dict) -> dict:
    properties = {
        name: _property_value(name, row) for name in TILE_PROPERTIES[resource]
    }
    return {
        "type": "Feature",
        "id": feature_id(resource, row),
        "properties": properties,
        "geometry": geometry_mapping,
    }


def write_geojsonseq(gdf: gpd.GeoDataFrame, resource: str, path) -> int:
    """Write line-delimited GeoJSON for tippecanoe. Returns the feature count.

    Line-delimited output is what lets tippecanoe use --read-parallel, and it
    keeps peak memory flat for the ~316k setor rows.
    """
    projected = gdf.to_crs(epsg=TILE_CRS_EPSG)
    written = 0

    with open(path, "w", encoding="utf-8") as handle:
        for _, row in projected.iterrows():
            geometry = row[projected.geometry.name]
            if geometry is None or geometry.is_empty:
                continue
            feature = build_feature(resource, row, mapping(geometry))
            handle.write(json.dumps(feature, ensure_ascii=False))
            handle.write("\n")
            written += 1

    return written
