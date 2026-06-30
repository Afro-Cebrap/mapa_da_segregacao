from sqlalchemy import text
from sqlalchemy.orm import Session

from models.setores_model import SetoresModel
from repositories import geo_comum

TABELA_BASE = "dados.setores"

# Whitelist de colunas permitidas em obter_escala_metrica (evita injecao SQL).
METRICAS_VALIDAS = frozenset({
    "dissimilarity", "index_h", "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp", "percent_branca", "percent_preta",
    "percent_amarela", "percent_parda", "percent_indigena",
    "percent_preta_ou_parda",
})

# Colunas do payload enxuto do ranking (identificador + metricas de segregacao,
# sem geometria).
CAMPOS_INDICADOR = (
    "code_tract", "code_muni",
    "dissimilarity", "index_h",
    "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp",
)
# Colunas de codigo (texto) vs metricas. As metricas sao razoes que podem vir
# inf/NaN em setores degenerados; precisam ser neutralizadas antes do JSON.
CAMPOS_INDICADOR_CODIGO = frozenset({"code_tract", "code_muni"})
# Sem simplificacao de geometria: a tabela base (geometria cheia) e usada em
# TODO zoom. O ST_AsMVTGeom(...4096...) ja quantiza a geometria por zoom, entao
# a geometria cheia mal aumenta o tamanho do tile (+5-27%); o custo e ~1.5x no
# tempo de geracao. O filtro sub-pixel (area_minima) continua descartando
# feicoes invisiveis em z<12, mantendo a contagem de feicoes sob controle.
TABELA_ZOOM_BAIXO = TABELA_BASE
TABELA_ZOOM_MEDIO = TABELA_BASE

FEATURE_ID_SQL = "CAST(t.code_tract AS bigint)"
PROPRIEDADES_TILE = (
    "CAST(t.code_tract AS bigint) AS cod_setor",
    "CAST(t.code_muni AS bigint) AS code_muni",
    # Nomes para popup/painel (strings repetidas comprimem bem no gzip).
    "t.name_muni",
    "t.abbrev_state",
    *(f"t.{campo}" for campo in geo_comum.CAMPOS_METRICAS_TILE),
)

def obter_setores(db: Session):
    return geo_comum.consultar_payloads(db, SetoresModel)


def obter_setores_indicadores(
    db: Session,
    escopo: str | None = None,
    codigo: str | None = None,
):
    """Lista enxuta (sem geometria) para o ranking de indicadores.

    Quando `escopo` e `codigo` são informados, filtra no banco (RM ou município),
    reduzindo o payload de ~316k para apenas os setores do escopo relevante.
    Sem filtro, retorna todos (comportamento anterior — não usado pelo front).
    """
    filtro_sql: str | None = None
    filtro_params: dict = {}

    if escopo == "reg_metro" and codigo:
        filtro_sql = "name_metro = :codigo"
        filtro_params = {"codigo": codigo}
    elif escopo == "municipio" and codigo:
        filtro_sql = "code_muni = :codigo"
        filtro_params = {"codigo": codigo}

    return geo_comum.consultar_indicadores(
        db, TABELA_BASE, CAMPOS_INDICADOR, CAMPOS_INDICADOR_CODIGO,
        filtro_sql=filtro_sql, filtro_params=filtro_params,
    )


def obter_setores_por_municipio(db: Session, cod_municipio: str):
    return geo_comum.consultar_payloads(
        db, SetoresModel, filtro=SetoresModel.code_muni == cod_municipio,
    )


def obter_setores_por_viewport(
    db: Session,
    min_lng: float,
    min_lat: float,
    max_lng: float,
    max_lat: float,
    zoom: int,
):
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, zoom, TABELA_BASE, TABELA_ZOOM_BAIXO, TABELA_ZOOM_MEDIO,
        limite_zoom_ultra=10,
    )
    return geo_comum.obter_por_viewport(
        db,
        tabela=tabela,
        min_lng=min_lng,
        min_lat=min_lat,
        max_lng=max_lng,
        max_lat=max_lat,
    )


def construir_clausula_setor(
    metro: str | None = None,
    cod_municipio: str | None = None,
) -> tuple[str | None, dict]:
    """Monta a clausula WHERE extra (sobre alias t) para filtrar setores por
    RM ou municipio no tile MVT. `metro` tem precedencia (municipio em RM plota
    a RM inteira). Retorna (fragmento_sql | None, params)."""
    if metro:
        return "t.name_metro = :filtro_metro", {"filtro_metro": metro}
    if cod_municipio:
        return (
            "t.code_muni = :filtro_cod_municipio",
            {"filtro_cod_municipio": cod_municipio},
        )
    return None, {}


def obter_tile_mvt(
    db: Session,
    z: int,
    x: int,
    y: int,
    metro: str | None = None,
    cod_municipio: str | None = None,
):
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, z, TABELA_BASE, TABELA_ZOOM_BAIXO, TABELA_ZOOM_MEDIO,
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
    )


def obter_escala_metrica(
    db: Session,
    metrica: str,
    escopo: str,
    codigo: str,
) -> list[float] | None:
    """Calcula quebras de escala (p0/p25/p50/p75) para a metrica no escopo dado.

    escopo: 'reg_metro' (todos os setores da RM) ou 'municipio' (so aquele municipio).
    Retorna None se nao houver dados para o filtro informado.
    """
    if metrica not in METRICAS_VALIDAS:
        raise ValueError(f"Métrica inválida: {metrica}")

    if escopo == "reg_metro":
        filtro = "name_metro = :codigo"
    elif escopo == "municipio":
        filtro = "code_muni = :codigo"
    else:
        raise ValueError(f"Escopo inválido: {escopo}")

    sql = text(f"""
        SELECT
            percentile_cont(0.0)  WITHIN GROUP (ORDER BY {metrica}) AS p0,
            percentile_cont(0.25) WITHIN GROUP (ORDER BY {metrica}) AS p25,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY {metrica}) AS p50,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY {metrica}) AS p75
        FROM {TABELA_BASE}
        WHERE {filtro}
          AND {metrica} IS NOT NULL
          AND {metrica} < 'Infinity'::float
          AND {metrica} > '-Infinity'::float
    """)

    row = db.execute(sql, {"codigo": codigo}).one_or_none()
    if row is None or row.p0 is None:
        return None

    return [float(row.p0), float(row.p25), float(row.p50), float(row.p75)]
