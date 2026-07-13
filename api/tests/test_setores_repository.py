from sqlalchemy import Column, Integer, MetaData, String, Table, create_engine, select

from models.setores_model import MODELOS_SETORES_POR_ANO
from repositories.setores_repository import (
    _filtro_unit_type_padrao,
    construir_clausula_setor,
)

_CASE_PADRAO = (
    "CASE WHEN t.unit_type IS NULL THEN TRUE "
    "WHEN t.name_metro IS NOT NULL THEN t.unit_type = 'metro' "
    "ELSE t.unit_type = 'muni' END"
)


def test_clausula_sem_filtro_usa_case_padrao_por_unit_type():
    sql, params = construir_clausula_setor()
    assert sql == _CASE_PADRAO
    assert params == {}


def test_clausula_por_metro_forca_unit_type_metro_mas_inclui_unit_type_nulo():
    sql, params = construir_clausula_setor(metro="RM de Sao Paulo")
    assert sql == (
        "(t.unit_type = 'metro' OR t.unit_type IS NULL) "
        "AND t.name_metro = :filtro_metro"
    )
    assert params == {"filtro_metro": "RM de Sao Paulo"}


def test_clausula_por_municipio_forca_unit_type_muni_mas_inclui_unit_type_nulo():
    sql, params = construir_clausula_setor(cod_municipio="3550308")
    assert sql == (
        "(t.unit_type = 'muni' OR t.unit_type IS NULL) "
        "AND t.code_muni = :filtro_cod_municipio"
    )
    assert params == {"filtro_cod_municipio": "3550308"}


def test_metro_tem_precedencia_sobre_municipio():
    sql, params = construir_clausula_setor(metro="RM X", cod_municipio="123")
    assert sql == (
        "(t.unit_type = 'metro' OR t.unit_type IS NULL) "
        "AND t.name_metro = :filtro_metro"
    )
    assert params == {"filtro_metro": "RM X"}


def test_filtro_unit_type_padrao_compila_para_o_mesmo_case_da_clausula_raw():
    """`obter_setores` (via ORM) deve aplicar exatamente a mesma regra padrao
    de unit_type que `construir_clausula_setor()` aplica via SQL bruto para
    /viewport e /tiles — a mesma regra descrita no achado de review: sem esse
    filtro, um setor cujo municipio pertence a uma RM retorna as DUAS linhas
    (unit_type='muni' e 'metro'), duplicando geometria com metricas diferentes.
    """
    modelo = MODELOS_SETORES_POR_ANO[2010]
    expr = _filtro_unit_type_padrao(modelo)
    compilado = str(expr.compile(compile_kwargs={"literal_binds": True}))

    assert "CASE WHEN" in compilado
    assert "unit_type IS NULL" in compilado
    assert "name_metro IS NOT NULL" in compilado
    assert "unit_type = 'metro'" in compilado
    assert "unit_type = 'muni'" in compilado
    assert compilado.index("unit_type IS NULL") < compilado.index("name_metro IS NOT NULL")
    assert compilado.index("name_metro IS NOT NULL") < compilado.index("unit_type = 'metro'")
    assert compilado.index("unit_type = 'metro'") < compilado.index("unit_type = 'muni'")


def test_filtro_unit_type_padrao_filtra_corretamente_em_query_real():
    """Verifica o comportamento real (nao so a string SQL): roda a expressao
    contra uma tabela em memoria com as combinacoes possiveis de
    name_metro/unit_type e confirma que:
    - so as linhas 'corretas' (metro quando o municipio pertence a uma RM,
      muni caso contrario) sao retornadas — o bug de duplicacao de setor
      (retornar as duas linhas de um setor em RM) nao acontece;
    - setores com unit_type NULL (sem indicadores calculados) sao sempre
      incluidos, independente de name_metro, pois nao ha linha duplicada
      para desempatar e eles precisam continuar sendo plotados no mapa
      (com o visual padrao de "sem dados").
    """
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()
    tabela = Table(
        "setores_teste", metadata,
        Column("id", Integer, primary_key=True),
        Column("name_metro", String, nullable=True),
        Column("unit_type", String, nullable=True),
    )
    metadata.create_all(engine)

    with engine.begin() as conn:
        conn.execute(
            tabela.insert(),
            [
                # Setor cujo municipio pertence a RM: so a linha 'metro' e valida.
                {"id": 1, "name_metro": "RM Sao Paulo", "unit_type": "metro"},
                {"id": 2, "name_metro": "RM Sao Paulo", "unit_type": "muni"},
                # Setor cujo municipio NAO pertence a RM: so a linha 'muni' e valida.
                {"id": 3, "name_metro": None, "unit_type": "muni"},
                {"id": 4, "name_metro": None, "unit_type": "metro"},
                # Setores sem unit_type (indicadores nao calculados): sempre inclusos.
                {"id": 5, "name_metro": "RM Sao Paulo", "unit_type": None},
                {"id": 6, "name_metro": None, "unit_type": None},
            ],
        )

    filtro = _filtro_unit_type_padrao(tabela.c)
    with engine.begin() as conn:
        ids = sorted(
            row.id for row in conn.execute(select(tabela.c.id).where(filtro))
        )

    assert ids == [1, 3, 5, 6]
