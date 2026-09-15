import json

import pytest

from segregation_pipeline.scopes import (
    SCALE_METRICS,
    build_metro_slugs,
    build_scope_payload,
    compute_breaks,
    slugify,
    write_scope_files,
)


def test_scale_metrics_match_the_legacy_whitelist():
    assert set(SCALE_METRICS) == {
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
        "percent_preta_ou_parda",
    }


def test_slugify_strips_accents_and_lowercases():
    assert slugify("RM São Paulo") == "rm-sao-paulo"


def test_slugify_collapses_punctuation_and_trims():
    assert slugify("  RM  Vale do Aço / MG  ") == "rm-vale-do-aco-mg"


def test_build_metro_slugs_maps_name_to_slug():
    assert build_metro_slugs(["RM São Paulo"]) == {"RM São Paulo": "rm-sao-paulo"}


def test_build_metro_slugs_rejects_collisions():
    # Two distinct names collapsing to one file would silently overwrite data.
    with pytest.raises(ValueError, match="slug collision"):
        build_metro_slugs(["RM São Paulo", "RM Sao  Paulo"])


def test_compute_breaks_returns_linear_interpolated_quartiles():
    # Matches Postgres percentile_cont, which interpolates linearly.
    assert compute_breaks([0.0, 1.0, 2.0, 3.0, 4.0]) == [0.0, 1.0, 2.0, 3.0]


def test_compute_breaks_ignores_non_finite_and_missing_values():
    assert compute_breaks([0.0, float("inf"), None, 4.0, float("nan")]) == [
        0.0,
        1.0,
        2.0,
        3.0,
    ]


def test_compute_breaks_returns_none_when_no_usable_values():
    # The legacy /escala answered 404 here; the frontend falls back to the
    # static METRICS_CONFIG breaks either way.
    assert compute_breaks([None, float("nan")]) is None


def test_scope_payload_carries_breaks_and_rows(make_gdf):
    payload = build_scope_payload(make_gdf([{}]))

    assert set(payload) == {"breaks", "rows"}
    assert set(payload["breaks"]) == set(SCALE_METRICS)


def test_scope_payload_rows_use_string_identifiers(make_gdf):
    payload = build_scope_payload(make_gdf([{}]))

    assert payload["rows"][0]["code_tract"] == "355030812345678"
    assert payload["rows"][0]["code_muni"] == "3550308"


def test_write_scope_files_splits_metro_and_muni_scopes(tmp_path, make_gdf):
    gdf = make_gdf(
        [
            {"unit_type": "metro", "name_metro": "RM São Paulo"},
            {
                "unit_type": "muni",
                "name_metro": None,
                "code_muni": "3304557",
                "code_tract": "330455712345678",
            },
        ]
    )

    written = write_scope_files(gdf, 2022, tmp_path)

    assert (tmp_path / "scopes/setores/2022/metro/rm-sao-paulo.json").exists()
    assert (tmp_path / "scopes/setores/2022/muni/3304557.json").exists()
    assert written["metro"] == 1
    assert written["muni"] == 1


def test_write_scope_files_emits_the_slug_index(tmp_path, make_gdf):
    gdf = make_gdf([{"unit_type": "metro", "name_metro": "RM São Paulo"}])

    write_scope_files(gdf, 2022, tmp_path)

    index = json.loads(
        (tmp_path / "scopes/setores/2022/index.json").read_text(encoding="utf-8")
    )
    assert index["metro"]["RM São Paulo"] == "rm-sao-paulo"
