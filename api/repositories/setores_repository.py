from sqlalchemy import case, text
from sqlalchemy.orm import Session

from models.setores_model import MODELOS_SETORES_POR_ANO
from repositories import geo_comum

# Whitelist de colunas permitidas em obter_escala_metrica (evita injecao SQL).
METRICAS_VALIDAS = frozenset({
    "dissimilarity", "index_h", "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp", "percent_branca", "percent_preta",
    "percent_amarela", "percent_parda", "percent_indigena",
    "percent_preta_ou_parda",
})

# Colunas do payload enxuto do ranking (identificador + metricas, sem geometria).
CAMPOS_INDICADOR = (
    "code_tract", "code_muni",
    "dissimilarity", "index_h",
    "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp",
)
CAMPOS_INDICADOR_CODIGO = frozenset({"code_tract", "code_muni"})

FEATURE_ID_SQL = "CAST(t.code_tract AS bigint)"
PROPRIEDADES_TILE = (
    "CAST(t.code_tract AS bigint) AS cod_setor",
    "CAST(t.code_muni AS bigint) AS code_muni",
    "t.name_muni",
    "t.abbrev_state",
    *(f"t.{campo}" for campo in geo_comum.CAMPOS_METRICAS_TILE),
)


def _tabela_base(ano: int) -> str:
    return f"dados.setores_{ano}"


def _tabela_simplificada(ano: int) -> str:
    return f"dados.setores_{ano}_simplified"


def _filtro_unit_type_padrao(modelo):
    """Regra padrao (sem escopo de RM/municipio explicito) de resolucao de
    unit_type por setor: usa a metrica mais granular disponivel — 'metro' se o
    municipio do setor pertence a uma RM, 'muni' caso contrario. Setores sem
    unit_type (indicadores nao calculados) sao sempre incluidos — nao ha linha
    duplicada pra desempatar nesse caso, e o setor precisa continuar sendo
    plotado (com o visual padrao de "sem dados"). Equivalente em ORM ao branch
    padrao (sem args) de `construir_clausula_setor()`."""
    return case(
        (modelo.unit_type.is_(None), True),
        (modelo.name_metro.isnot(None), modelo.unit_type == "metro"),
        else_=modelo.unit_type == "muni",
    )


def obter_setores(db: Session, ano: int):
    modelo = MODELOS_SETORES_POR_ANO[ano]
    return geo_comum.consultar_payloads(
        db, modelo, filtro=_filtro_unit_type_padrao(modelo),
    )


def obter_setores_indicadores(
    db: Session,
    ano: int,
    escopo: str | None = None,
    codigo: str | None = None,
):
    """Lista enxuta (sem geometria) para o ranking de indicadores.

    Quando `escopo` e `codigo` são informados, filtra no banco (RM ou município),
    reduzindo o payload de ~316k para apenas os setores do escopo relevante.
    """
    if escopo == "reg_metro" and codigo:
        filtro_sql = "name_metro = :codigo AND unit_type = 'metro'"
        filtro_params = {"codigo": codigo}
    elif escopo == "municipio" and codigo:
        filtro_sql = "code_muni = :codigo AND unit_type = 'muni'"
        filtro_params = {"codigo": codigo}
    else:
        filtro_sql = (
            "CASE WHEN name_metro IS NOT NULL "
            "THEN unit_type = 'metro' ELSE unit_type = 'muni' END"
        )
        filtro_params = {}

    return geo_comum.consultar_indicadores(
        db, _tabela_base(ano), CAMPOS_INDICADOR, CAMPOS_INDICADOR_CODIGO,
        filtro_sql=filtro_sql, filtro_params=filtro_params,
    )


def obter_setores_por_municipio(db: Session, ano: int, cod_municipio: str):
    modelo = MODELOS_SETORES_POR_ANO[ano]
    return geo_comum.consultar_payloads(
        db, modelo,
        filtro=(modelo.code_muni == cod_municipio)
        & ((modelo.unit_type == "muni") | modelo.unit_type.is_(None)),
    )


def obter_setores_por_viewport(
    db: Session,
    ano: int,
    min_lng: float,
    min_lat: float,
    max_lng: float,
    max_lat: float,
    zoom: int,
):
    tabela_base = _tabela_base(ano)
    tabela_simplificada = _tabela_simplificada(ano)
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, zoom, tabela_base, tabela_simplificada, tabela_simplificada,
        limite_zoom_ultra=10,
    )
    filtro_sql, filtro_params = construir_clausula_setor()
    return geo_comum.obter_por_viewport(
        db,
        tabela=tabela,
        min_lng=min_lng,
        min_lat=min_lat,
        max_lng=max_lng,
        max_lat=max_lat,
        filtro_sql=filtro_sql,
        filtro_params=filtro_params,
    )


def construir_clausula_setor(
    metro: str | None = None,
    cod_municipio: str | None = None,
) -> tuple[str, dict]:
    """Monta a clausula WHERE (sobre alias t) que filtra setores por RM ou
    municipio E resolve qual linha de unit_type usar por setor.

    `metro` tem precedencia (municipio em RM plota a RM inteira, com metricas
    calculadas no nivel da RM). Sem filtro nenhum, cada setor usa a metrica
    mais granular disponivel: 'metro' se o municipio dele pertence a uma RM,
    'muni' caso contrario. Setores com unit_type NULL (sem indicadores
    calculados) sao sempre incluidos, em qualquer escopo, pra continuarem
    sendo plotados no mapa com o visual padrao de "sem dados".
    """
    if metro:
        return (
            "(t.unit_type = 'metro' OR t.unit_type IS NULL) "
            "AND t.name_metro = :filtro_metro",
            {"filtro_metro": metro},
        )
    if cod_municipio:
        return (
            "(t.unit_type = 'muni' OR t.unit_type IS NULL) "
            "AND t.code_muni = :filtro_cod_municipio",
            {"filtro_cod_municipio": cod_municipio},
        )
    return (
        "CASE WHEN t.unit_type IS NULL THEN TRUE "
        "WHEN t.name_metro IS NOT NULL THEN t.unit_type = 'metro' "
        "ELSE t.unit_type = 'muni' END",
        {},
    )


def obter_tile_mvt(
    db: Session,
    ano: int,
    z: int,
    x: int,
    y: int,
    metro: str | None = None,
    cod_municipio: str | None = None,
):
    tabela_base = _tabela_base(ano)
    tabela_simplificada = _tabela_simplificada(ano)
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, z, tabela_base, tabela_simplificada, tabela_simplificada,
        limite_zoom_ultra=10,
    )
    filtro_sql, filtro_params = construir_clausula_setor(metro, cod_municipio)
    return geo_comum.obter_tile_mvt(
        db,
        tabela=tabela,
        z=z,
        x=x,
        y=y,
        feature_id_sql=FEATURE_ID_SQL,
        colunas_propriedades=PROPRIEDADES_TILE,
        filtro_sql=filtro_sql,
        filtro_params=filtro_params,
        filtrar_area_minima=False,
    )


def obter_escala_metrica(
    db: Session,
    ano: int,
    metrica: str,
    escopo: str,
    codigo: str,
) -> list[float] | None:
    """Calcula quebras de escala (p0/p25/p50/p75) para a metrica no escopo dado.

    escopo: 'reg_metro' (todos os setores da RM, unit_type='metro') ou
    'municipio' (so aquele municipio, unit_type='muni').
    Retorna None se nao houver dados para o filtro informado.
    """
    if metrica not in METRICAS_VALIDAS:
        raise ValueError(f"Métrica inválida: {metrica}")

    if escopo == "reg_metro":
        filtro = "name_metro = :codigo AND unit_type = 'metro'"
    elif escopo == "municipio":
        filtro = "code_muni = :codigo AND unit_type = 'muni'"
    else:
        raise ValueError(f"Escopo inválido: {escopo}")

    sql = text(f"""
        SELECT
            percentile_cont(0.0)  WITHIN GROUP (ORDER BY {metrica}) AS p0,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY {metrica}) AS p25,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY {metrica}) AS p50,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY {metrica}) AS p75
        FROM {_tabela_base(ano)}
        WHERE {filtro}
          AND {metrica} IS NOT NULL
          AND {metrica} < 'Infinity'::float
          AND {metrica} > '-Infinity'::float
    """)

    row = db.execute(sql, {"codigo": codigo}).one_or_none()
    if row is None or row.p0 is None:
        return None

    return [float(row.p0), float(row.p25), float(row.p50), float(row.p75)]
