import pytest

from segregation_pipeline.selection import (
    RESOURCES,
    YEARS,
    resolve_default_unit_type,
    select_rows,
)


def test_resources_and_years_match_the_legacy_tables():
    assert RESOURCES == ("setores", "municipios", "reg_metropo")
    assert YEARS == (2010, 2022)


def test_setores_keeps_only_15_character_tract_codes(make_gdf):
    gdf = make_gdf(
        [
            {"code_tract": "355030812345678"},
            {"code_tract": "Total"},
        ]
    )

    result = select_rows(gdf, "setores", 2022)

    assert list(result["code_tract"]) == ["355030812345678"]


def test_municipios_requires_total_tract_and_7_digit_muni(make_gdf):
    gdf = make_gdf(
        [
            {"code_tract": "Total", "code_muni": "3550308", "unit_type": "muni"},
            {"code_tract": "Total", "code_muni": "Total", "unit_type": "muni"},
            {"code_tract": "355030812345678", "unit_type": "muni"},
        ]
    )

    result = select_rows(gdf, "municipios", 2022)

    assert list(result["code_muni"]) == ["3550308"]


def test_municipios_keeps_only_muni_unit_type(make_gdf):
    gdf = make_gdf(
        [
            {"code_tract": "Total", "code_muni": "3550308", "unit_type": "muni"},
            {"code_tract": "Total", "code_muni": "3550308", "unit_type": "metro"},
        ]
    )

    result = select_rows(gdf, "municipios", 2022)

    assert list(result["unit_type"]) == ["muni"]


def test_reg_metropo_requires_total_tract_and_total_muni(make_gdf):
    gdf = make_gdf(
        [
            {"code_tract": "Total", "code_muni": "Total", "unit_type": "metro"},
            {"code_tract": "Total", "code_muni": "3550308", "unit_type": "metro"},
        ]
    )

    result = select_rows(gdf, "reg_metropo", 2022)

    assert len(result) == 1
    assert result["code_muni"].iloc[0] == "Total"


def test_year_filter_is_applied(make_gdf):
    gdf = make_gdf([{"year": 2010}, {"year": 2022}])

    result = select_rows(gdf, "setores", 2010)

    assert list(result["year"]) == [2010]


def test_default_unit_type_prefers_metro_inside_a_metro_area(make_gdf):
    gdf = make_gdf(
        [
            {"name_metro": "RM Sao Paulo", "unit_type": "metro", "dissimilarity": 0.9},
            {"name_metro": "RM Sao Paulo", "unit_type": "muni", "dissimilarity": 0.1},
        ]
    )

    result = resolve_default_unit_type(gdf)

    assert list(result["dissimilarity"]) == [0.9]


def test_default_unit_type_uses_muni_outside_a_metro_area(make_gdf):
    gdf = make_gdf(
        [
            {"name_metro": None, "unit_type": "metro", "dissimilarity": 0.9},
            {"name_metro": None, "unit_type": "muni", "dissimilarity": 0.1},
        ]
    )

    result = resolve_default_unit_type(gdf)

    assert list(result["dissimilarity"]) == [0.1]


def test_default_unit_type_always_keeps_rows_without_unit_type(make_gdf):
    # Tracts with no computed indicators must still be plotted, with the
    # "no data" styling, in every scope.
    gdf = make_gdf([{"unit_type": None, "name_metro": None}])

    result = resolve_default_unit_type(gdf)

    assert len(result) == 1


def test_select_rows_rejects_unknown_resource(make_gdf):
    with pytest.raises(ValueError, match="unknown resource"):
        select_rows(make_gdf([{}]), "escolas", 2022)
