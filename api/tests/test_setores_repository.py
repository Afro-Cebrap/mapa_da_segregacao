from repositories.setores_repository import construir_clausula_setor


def test_clausula_sem_filtro():
    sql, params = construir_clausula_setor()
    assert sql is None
    assert params == {}


def test_clausula_por_metro():
    sql, params = construir_clausula_setor(metro="RM de Sao Paulo")
    assert sql == "t.name_metro = :filtro_metro"
    assert params == {"filtro_metro": "RM de Sao Paulo"}


def test_clausula_por_municipio():
    sql, params = construir_clausula_setor(cod_municipio="3550308")
    assert sql == "t.code_muni = :filtro_cod_municipio"
    assert params == {"filtro_cod_municipio": "3550308"}


def test_metro_tem_precedencia_sobre_municipio():
    sql, params = construir_clausula_setor(metro="RM X", cod_municipio="123")
    assert sql == "t.name_metro = :filtro_metro"
    assert params == {"filtro_metro": "RM X"}
