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
            gdf[column] = gdf[column].astype(str)

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
