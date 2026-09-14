from shapely.geometry import Polygon

from segregation_pipeline.meta import (
    RANKING_METRICS,
    build_municipios_lista,
    build_municipios_rankings,
    build_reg_metro_rankings,
)


def test_ranking_metrics_match_the_legacy_indicador_columns():
    assert RANKING_METRICS == (
        "dissimilarity",
        "index_h",
        "exp_branca_pp",
        "exp_pp_branca",
        "iso_branca_branca",
        "iso_pp_pp",
    )


def test_lista_carries_the_schema_fields_plus_abbrev_state(make_gdf):
    rows = build_municipios_lista(make_gdf([{"code_tract": "Total"}]))

    assert set(rows[0]) == {
        "code_muni",
        "name_muni",
        "code_state",
        "name_metro",
        "abbrev_state",
        "min_lng",
        "min_lat",
        "max_lng",
        "max_lat",
    }


def test_lista_reports_the_wgs84_bounding_box(make_gdf):
    rows = build_municipios_lista(make_gdf([{"code_tract": "Total"}]))

    assert rows[0]["min_lng"] < rows[0]["max_lng"]
    assert rows[0]["min_lat"] < rows[0]["max_lat"]


def test_lista_stringifies_numeric_state_codes(make_gdf):
    rows = build_municipios_lista(make_gdf([{"code_tract": "Total", "code_state": 35}]))

    assert rows[0]["code_state"] == "35"


def test_lista_is_sorted_by_municipality_name(make_gdf):
    gdf = make_gdf(
        [
            {"code_tract": "Total", "code_muni": "2", "name_muni": "Santos"},
            {"code_tract": "Total", "code_muni": "1", "name_muni": "Campinas"},
        ]
    )

    rows = build_municipios_lista(gdf)

    assert [row["name_muni"] for row in rows] == ["Campinas", "Santos"]


def test_lista_sorts_missing_names_last(make_gdf):
    gdf = make_gdf(
        [
            {"code_tract": "Total", "code_muni": "2", "name_muni": None},
            {"code_tract": "Total", "code_muni": "1", "name_muni": "Campinas"},
        ]
    )

    rows = build_municipios_lista(gdf)

    assert [row["name_muni"] for row in rows] == ["Campinas", None]


def test_lista_nulls_bounds_for_empty_geometry(make_gdf):
    gdf = make_gdf([{"code_tract": "Total", "geometry": Polygon()}])

    rows = build_municipios_lista(gdf)

    assert rows[0]["min_lng"] is None
    assert rows[0]["min_lat"] is None
    assert rows[0]["max_lng"] is None
    assert rows[0]["max_lat"] is None


def test_municipios_rankings_carry_code_and_metro_as_strings(make_gdf):
    rows = build_municipios_rankings(make_gdf([{"code_tract": "Total"}]))

    assert rows[0]["code_muni"] == "3550308"
    assert rows[0]["name_metro"] == "RM Sao Paulo"
    assert set(rows[0]) == {"code_muni", "name_metro"} | set(RANKING_METRICS)


def test_municipios_rankings_null_non_finite_metrics(make_gdf):
    gdf = make_gdf([{"code_tract": "Total", "index_h": float("nan")}])

    rows = build_municipios_rankings(gdf)

    assert rows[0]["index_h"] is None


def test_reg_metro_rankings_are_keyed_by_metro_name(make_gdf):
    rows = build_reg_metro_rankings(make_gdf([{"code_tract": "Total"}]))

    assert set(rows[0]) == {"name_metro"} | set(RANKING_METRICS)
    assert rows[0]["name_metro"] == "RM Sao Paulo"
