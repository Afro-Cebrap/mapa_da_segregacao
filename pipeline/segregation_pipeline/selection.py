"""Per-resource row selection.

Reproduces the FILTROS_RECURSO of api/data/db_build.py and the unit_type
resolution of setores_repository.construir_clausula_setor (default branch).
"""

import geopandas as gpd

RESOURCES = ("setores", "municipios", "reg_metropo")
YEARS = (2010, 2022)

# A census tract code is 15 characters; aggregate rows carry the literal 'Total'.
TRACT_CODE_LENGTH = 15


def _resource_mask(gdf: gpd.GeoDataFrame, resource: str):
    if resource == "setores":
        return gdf["code_tract"].str.len() == TRACT_CODE_LENGTH
    if resource == "municipios":
        return (gdf["code_tract"] == "Total") & (gdf["code_muni"].str.len() == 7)
    if resource == "reg_metropo":
        return (gdf["code_tract"] == "Total") & (gdf["code_muni"] == "Total")
    raise ValueError(f"unknown resource: {resource}")


def resolve_default_unit_type(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Keep one row per geometry, using the most granular metric available.

    'metro' when the municipality belongs to a metro area, 'muni' otherwise.
    Rows with no unit_type have no duplicate to disambiguate against and are
    always kept, so the geometry stays on the map with "no data" styling.
    """
    in_metro = gdf["name_metro"].notna()
    unit_type = gdf["unit_type"]
    keep = (
        unit_type.isna()
        | (in_metro & (unit_type == "metro"))
        | (~in_metro & (unit_type == "muni"))
    )
    return gdf[keep]


def select_rows(gdf: gpd.GeoDataFrame, resource: str, year: int) -> gpd.GeoDataFrame:
    """Rows for one resource and one census year, with unit_type resolved."""
    selected = gdf[_resource_mask(gdf, resource) & (gdf["year"] == year)]

    if resource == "setores":
        return resolve_default_unit_type(selected)
    if resource == "municipios":
        return selected[selected["unit_type"] == "muni"]
    return selected[selected["unit_type"] == "metro"]
