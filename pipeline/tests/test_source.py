import geopandas as gpd
from shapely.geometry import Polygon

from segregation_pipeline.source import (
    drop_exact_duplicates,
    normalize,
)


def test_normalize_lowercases_columns(make_gdf):
    gdf = make_gdf([{}])
    gdf = gdf.rename(columns={"code_tract": "CODE_TRACT"})

    result = normalize(gdf)

    assert "code_tract" in result.columns
    assert "CODE_TRACT" not in result.columns


def test_normalize_drops_redundant_geom_column(make_gdf):
    gdf = make_gdf([{}])
    gdf["geom"] = "ignored"

    result = normalize(gdf)

    assert "geom" not in result.columns


def test_normalize_assigns_source_crs_when_missing():
    frame = gpd.GeoDataFrame(
        [{"code_tract": "1", "geometry": Polygon([(0, 0), (1, 0), (1, 1)])}],
        geometry="geometry",
    )
    assert frame.crs is None

    result = normalize(frame)

    assert result.crs.to_epsg() == 4674


def test_normalize_keeps_declared_crs(make_gdf):
    result = normalize(make_gdf([{}]))

    assert result.crs.to_epsg() == 4674


def test_normalize_stringifies_identifier_columns(make_gdf):
    gdf = make_gdf([{}])
    gdf["code_tract"] = 355030812345678
    gdf["code_muni"] = 3550308

    result = normalize(gdf)

    assert result["code_tract"].iloc[0] == "355030812345678"
    assert result["code_muni"].iloc[0] == "3550308"


def test_drop_exact_duplicates_removes_identical_attribute_rows(make_gdf):
    gdf = make_gdf([{}, {}])

    result = drop_exact_duplicates(gdf)

    assert len(result) == 1


def test_drop_exact_duplicates_keeps_rows_differing_by_unit_type(make_gdf):
    gdf = make_gdf(
        [
            {"unit_type": "muni", "dissimilarity": 0.1},
            {"unit_type": "metro", "dissimilarity": 0.9},
        ]
    )

    result = drop_exact_duplicates(gdf)

    assert len(result) == 2


def test_drop_exact_duplicates_ignores_geometry_differences(make_gdf):
    # Same attributes, different geometry: still one logical row, and geometry
    # is excluded from the dedupe key because it is not hashable.
    gdf = make_gdf([{}, {}])
    gdf.loc[1, "geometry"] = Polygon([(9, 9), (10, 9), (10, 10)])

    result = drop_exact_duplicates(gdf)

    assert len(result) == 1
