import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Polygon

from segregation_pipeline.source import (
    drop_exact_duplicates,
    load_source,
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


def test_normalize_strips_trailing_zero_from_float_identifiers(make_gdf):
    # Numeric IDs sometimes arrive as float64 (e.g. a nullable-int column, or
    # pandas.DataFrame.to_parquet round-tripping numerics as double). Naive
    # astype(str) would turn 3550308.0 into "3550308.0", which then silently
    # never matches the string "3550308" used elsewhere in the panel.
    gdf = make_gdf([{}])
    gdf["code_tract"] = gdf["code_tract"].astype(float)
    gdf["code_muni"] = gdf["code_muni"].astype(float)

    result = normalize(gdf)

    assert result["code_tract"].iloc[0] == "355030812345678"
    assert result["code_muni"].iloc[0] == "3550308"


def test_normalize_preserves_missing_identifier_as_nan(make_gdf):
    gdf = make_gdf([{}])
    gdf.loc[0, "code_muni"] = None

    result = normalize(gdf)

    assert pd.isna(result["code_muni"].iloc[0])


def test_load_source_reads_geoparquet_with_metadata(make_gdf, tmp_path):
    gdf = make_gdf([{}, {}])
    path = tmp_path / "with_metadata.parquet"
    gdf.to_parquet(path)

    result = load_source(str(path))

    assert isinstance(result, gpd.GeoDataFrame)
    assert len(result) == 2
    assert result.crs.to_epsg() == 4674


def test_load_source_falls_back_to_wkb_when_metadata_missing(make_gdf, tmp_path):
    gdf = make_gdf([{}, {}])
    frame = pd.DataFrame(gdf.drop(columns="geometry"))
    frame["geometry"] = gdf["geometry"].apply(lambda geom: geom.wkb)
    path = tmp_path / "without_metadata.parquet"
    frame.to_parquet(path)

    result = load_source(str(path))

    assert isinstance(result, gpd.GeoDataFrame)
    assert len(result) == 2
    assert result["geometry"].iloc[0].equals(gdf["geometry"].iloc[0])


def test_load_source_raises_without_geometry_column(tmp_path):
    frame = pd.DataFrame([{"code_tract": "1", "n_total": 1.0}])
    path = tmp_path / "no_geometry.parquet"
    frame.to_parquet(path)

    with pytest.raises(ValueError):
        load_source(str(path))


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
