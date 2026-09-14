from validate import compare_breaks, compare_rows


def test_compare_rows_reports_nothing_when_identical():
    rows = [{"code_tract": "1", "dissimilarity": 0.5}]

    assert compare_rows(rows, list(rows), ("code_tract",)) == []


def test_compare_rows_is_insensitive_to_ordering():
    expected = [{"code_tract": "1"}, {"code_tract": "2"}]
    actual = [{"code_tract": "2"}, {"code_tract": "1"}]

    assert compare_rows(expected, actual, ("code_tract",)) == []


def test_compare_rows_reports_a_missing_key():
    problems = compare_rows(
        [{"code_tract": "1"}, {"code_tract": "2"}],
        [{"code_tract": "1"}],
        ("code_tract",),
    )

    assert any("missing" in problem for problem in problems)


def test_compare_rows_reports_a_differing_value():
    problems = compare_rows(
        [{"code_tract": "1", "dissimilarity": 0.5}],
        [{"code_tract": "1", "dissimilarity": 0.9}],
        ("code_tract",),
    )

    assert any("dissimilarity" in problem for problem in problems)


def test_compare_rows_tolerates_float_noise():
    # Postgres returns numeric; numpy returns float64. Differences far below
    # display precision are not regressions.
    problems = compare_rows(
        [{"code_tract": "1", "dissimilarity": 0.1 + 0.2}],
        [{"code_tract": "1", "dissimilarity": 0.3}],
        ("code_tract",),
    )

    assert problems == []


def test_compare_breaks_reports_a_differing_quartile():
    problems = compare_breaks([0.0, 1.0, 2.0, 3.0], [0.0, 1.0, 2.0, 9.0])

    assert len(problems) == 1


def test_compare_breaks_accepts_both_sides_absent():
    assert compare_breaks(None, None) == []


def test_compare_breaks_reports_a_length_mismatch():
    problems = compare_breaks([0.0, 1.0, 2.0, 3.0], [0.0, 1.0, 2.0])

    assert any("length" in problem for problem in problems)


def test_compare_rows_reports_a_differing_text_value():
    problems = compare_rows(
        [{"code_muni": "1", "name_muni": "São Paulo"}],
        [{"code_muni": "1", "name_muni": "Rio de Janeiro"}],
        ("code_muni",),
    )

    assert any("name_muni" in problem for problem in problems)


def test_compare_rows_treats_identical_text_as_equal():
    rows = [{"code_muni": "1", "name_muni": "São Paulo"}]

    assert compare_rows(rows, list(rows), ("code_muni",)) == []


def test_compare_rows_reports_none_versus_text_as_a_difference():
    problems = compare_rows(
        [{"code_muni": "1", "name_muni": None}],
        [{"code_muni": "1", "name_muni": "São Paulo"}],
        ("code_muni",),
    )

    assert any("name_muni" in problem for problem in problems)


def test_compare_rows_reports_a_number_missing_on_one_side():
    problems = compare_rows(
        [{"code_tract": "1", "dissimilarity": 0.5}],
        [{"code_tract": "1", "dissimilarity": None}],
        ("code_tract",),
    )

    assert any("dissimilarity" in problem for problem in problems)


def test_compare_rows_treats_none_as_equal_to_none():
    rows = [{"code_tract": "1", "dissimilarity": None}]

    assert compare_rows(rows, list(rows), ("code_tract",)) == []


def test_compare_rows_treats_nan_as_equal_to_nan():
    problems = compare_rows(
        [{"code_tract": "1", "dissimilarity": float("nan")}],
        [{"code_tract": "1", "dissimilarity": float("nan")}],
        ("code_tract",),
    )

    assert problems == []


def test_compare_rows_treats_none_and_nan_as_equivalent_missing_values():
    problems = compare_rows(
        [{"code_tract": "1", "dissimilarity": None}],
        [{"code_tract": "1", "dissimilarity": float("nan")}],
        ("code_tract",),
    )

    assert problems == []
