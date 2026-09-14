import json
import zlib

from segregation_pipeline.features import (
    TILE_METRICS,
    TILE_PROPERTIES,
    build_feature,
    feature_id,
    write_geojsonseq,
)


def test_tile_metrics_match_the_legacy_tile_columns():
    assert TILE_METRICS == (
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


def test_setores_properties_match_the_legacy_tile_payload():
    assert TILE_PROPERTIES["setores"] == (
        "cod_setor",
        "code_muni",
        "name_muni",
        "abbrev_state",
    ) + TILE_METRICS


def test_municipios_properties_match_the_legacy_tile_payload():
    assert TILE_PROPERTIES["municipios"] == (
        "code_muni",
        "name_muni",
        "code_state",
        "abbrev_state",
        "name_metro",
    ) + TILE_METRICS


def test_reg_metropo_properties_match_the_legacy_tile_payload():
    assert TILE_PROPERTIES["reg_metropo"] == ("name_metro",) + TILE_METRICS


def test_setores_feature_id_is_the_numeric_tract_code():
    assert feature_id("setores", {"code_tract": "355030812345678"}) == 355030812345678


def test_municipios_feature_id_is_the_numeric_muni_code():
    assert feature_id("municipios", {"code_muni": "3550308"}) == 3550308


def test_reg_metropo_feature_id_is_a_deterministic_hash_of_the_name():
    # Postgres hashtext() is unavailable outside the database; CRC32 gives a
    # stable id so hover state does not shift between pipeline runs.
    row = {"name_metro": "RM Sao Paulo"}
    expected = zlib.crc32("RM Sao Paulo".encode("utf-8"))

    assert feature_id("reg_metropo", row) == expected
    assert feature_id("reg_metropo", row) == feature_id("reg_metropo", row)


def test_build_feature_emits_numeric_identifiers_inside_tiles(make_gdf):
    row = make_gdf([{}]).iloc[0]

    feature = build_feature("setores", row, {"type": "Polygon", "coordinates": []})

    assert feature["properties"]["cod_setor"] == 355030812345678
    assert feature["properties"]["code_muni"] == 3550308


def test_build_feature_nulls_non_finite_metrics(make_gdf):
    row = make_gdf([{"percent_indigena": float("inf")}]).iloc[0]

    feature = build_feature("setores", row, {"type": "Polygon", "coordinates": []})

    assert feature["properties"]["percent_indigena"] is None


def test_build_feature_omits_columns_outside_the_tile_contract(make_gdf):
    row = make_gdf([{}]).iloc[0]

    feature = build_feature("reg_metropo", row, {"type": "Polygon", "coordinates": []})

    assert set(feature["properties"]) == set(TILE_PROPERTIES["reg_metropo"])


def test_write_geojsonseq_emits_one_json_object_per_line(tmp_path, make_gdf):
    gdf = make_gdf([{"code_tract": "1" * 15}, {"code_tract": "2" * 15}])
    target = tmp_path / "setores.geojsonl"

    count = write_geojsonseq(gdf, "setores", target)

    lines = target.read_text(encoding="utf-8").strip().splitlines()
    assert count == 2
    assert len(lines) == 2
    assert json.loads(lines[0])["type"] == "Feature"


def test_write_geojsonseq_reprojects_to_wgs84(tmp_path, make_gdf):
    gdf = make_gdf([{}])
    target = tmp_path / "setores.geojsonl"

    write_geojsonseq(gdf, "setores", target)

    feature = json.loads(target.read_text(encoding="utf-8").strip())
    # Input CRS is EPSG:4674; tippecanoe requires EPSG:4326 coordinates.
    assert feature["geometry"]["type"] == "Polygon"
    longitude = feature["geometry"]["coordinates"][0][0][0]
    assert -180 <= longitude <= 180


def test_write_geojsonseq_skips_rows_without_geometry(tmp_path, make_gdf):
    gdf = make_gdf([{}, {}])
    gdf.loc[1, "geometry"] = None
    target = tmp_path / "setores.geojsonl"

    count = write_geojsonseq(gdf, "setores", target)

    assert count == 1
