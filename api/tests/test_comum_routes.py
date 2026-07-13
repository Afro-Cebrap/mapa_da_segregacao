import pytest
from fastapi import HTTPException

from routes._comum import parse_year_param, ANOS_VALIDOS


def test_anos_validos():
    assert ANOS_VALIDOS == (2010, 2022)


def test_parse_year_param_default_2010():
    assert parse_year_param() == 2010


def test_parse_year_param_aceita_2022():
    assert parse_year_param(2022) == 2022


def test_parse_year_param_rejeita_ano_invalido():
    with pytest.raises(HTTPException) as exc_info:
        parse_year_param(1999)
    assert exc_info.value.status_code == 400
