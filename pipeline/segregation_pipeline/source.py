"""Loading and normalization of the source parquet.

Mirrors api/data/db_build.py so the static artifacts start from exactly the
rows the PostGIS ingestion would have produced.
"""

import geopandas as gpd
import pandas as pd

# SIRGAS 2000. The dataset carries no CRS metadata when it is written with
# pandas.DataFrame.to_parquet, so it has to be declared rather than inferred.
SOURCE_EPSG = 4674

# Columns the panel treats as identifiers rather than numbers.
IDENTIFIER_COLUMNS = ("code_tract", "code_muni")


def load_source(path: str) -> gpd.GeoDataFrame:
    """Read a parquet with geometry, with or without GeoParquet metadata.

    Files written by GeoDataFrame.to_parquet carry the 'geo' metadata and are
    read directly. Files written by pandas.DataFrame.to_parquet carry geometry
    as WKB bytes without that metadata, and are decoded manually.
    """
    try:
        return gpd.read_parquet(path)
    except ValueError:
        pass

    frame = pd.read_parquet(path)
    geometry_column = next(
        (column for column in frame.columns if column.lower() == "geometry"), None
    )
    if geometry_column is None:
        raise ValueError(
            f"{path} has neither GeoParquet metadata nor a 'geometry' column."
        )
    frame[geometry_column] = gpd.GeoSeries.from_wkb(frame[geometry_column])
    return gpd.GeoDataFrame(frame, geometry=geometry_column)


def _stringify_identifier(value):
    """Stringify a single identifier value without introducing a trailing
    '.0' for whole-number floats, and without turning a missing value into
    the literal string 'nan'.

    Identifier columns are usually int or str already, matching the legacy
    ingestion's plain astype(str). But numeric IDs sometimes arrive as
    float64 (e.g. a nullable-int column, or numerics round-tripped through
    pandas.DataFrame.to_parquet as double); a plain astype(str) would turn
    35.0 into "35.0", which then silently never matches the string "35"
    used elsewhere in the panel.

    Looks like serialization.as_code, but is NOT interchangeable with it and
    must not be merged into it: this function passes a missing value through
    unchanged (as NaN) so that callers like selection.py's resource masks can
    still call .str.len() on the column afterwards (NaN survives; None would
    break the string dtype .str accessor needs). as_code, used at artifact
    write time rather than during normalize(), returns None for the same
    input because a bare None is what json.dumps needs for "no value".
    """
    if pd.isna(value):
        return value
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def normalize(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Lowercase column names, drop the redundant 'geom' column, declare the
    source CRS when absent, and stringify identifier columns."""
    gdf = gdf.copy()
    gdf.columns = [column.lower() for column in gdf.columns]

    if "geom" in gdf.columns:
        gdf = gdf.drop(columns=["geom"])

    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=SOURCE_EPSG)

    for column in IDENTIFIER_COLUMNS:
        if column in gdf.columns:
            gdf[column] = gdf[column].apply(_stringify_identifier)

    return gdf


def drop_exact_duplicates(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Drop rows identical across every non-geometry column.

    Tracts repeat the same row per unit_type when the computed value is
    identical. Rows whose unit_type differs AND whose values differ are not
    duplicates and are preserved. Geometry is excluded from the key because
    it is not hashable.
    """
    geometry_column = gdf.geometry.name
    key_columns = [column for column in gdf.columns if column != geometry_column]
    return gdf.drop_duplicates(subset=key_columns, keep="first")
