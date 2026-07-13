from sqlalchemy import text
from sqlalchemy.orm import Session

from models.municipios_model import MODELOS_MUNICIPIOS_POR_ANO
from repositories import geo_comum

# Em municipios, code_tract vale 'Total' (nao numerico): o id da feature
# precisa vir de code_muni.
FEATURE_ID_SQL = "CAST(t.code_muni AS bigint)"
PROPRIEDADES_TILE = (
    "CAST(t.code_muni AS bigint) AS code_muni",
    "t.name_muni",
    "t.code_state",
    "t.abbrev_state",
    "t.name_metro",
    *(f"t.{campo}" for campo in geo_comum.CAMPOS_METRICAS_TILE),
)

# Payload enxuto do ranking (identificador + metricas, sem geometria). O front
# usa code_muni como chave do ranking de municipios e name_metro para o escopo.
CAMPOS_INDICADOR = (
    "code_muni", "name_metro",
    "dissimilarity", "index_h",
    "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp",
)
CAMPOS_INDICADOR_CODIGO = frozenset({"code_muni", "name_metro"})

# Cada municipio sempre aparece com a metrica calculada no proprio nivel do
# municipio (unit_type='muni'), independente de pertencer a uma RM.
FILTRO_UNIT_TYPE_MUNI = "unit_type = 'muni'"


def _tabela_base(ano: int) -> str:
    return f"dados.municipios_{ano}"


def _tabela_simplificada(ano: int) -> str:
    return f"dados.municipios_{ano}_simplified"


def obter_municipios(db: Session, ano: int):
    modelo = MODELOS_MUNICIPIOS_POR_ANO[ano]
    return geo_comum.consultar_payloads(db, modelo, filtro=modelo.unit_type == "muni")


def obter_municipios_indicadores(db: Session, ano: int):
    """Lista enxuta (sem geometria) para o ranking de municipios — clicar num
    municipio nao precisa baixar todas as ~5.5k geometrias."""
    return geo_comum.consultar_indicadores(
        db, _tabela_base(ano), CAMPOS_INDICADOR, CAMPOS_INDICADOR_CODIGO,
        filtro_sql=FILTRO_UNIT_TYPE_MUNI,
    )


def obter_municipios_por_estado(db: Session, ano: int, cod_estado: str):
    modelo = MODELOS_MUNICIPIOS_POR_ANO[ano]
    return geo_comum.consultar_payloads(
        db, modelo,
        filtro=(modelo.code_state == cod_estado) & (modelo.unit_type == "muni"),
    )


def obter_lista_municipios(db: Session, ano: int):
    """Lista leve (sem geometria) para lookups de filtro no frontend.

    Inclui o bbox (EPSG:4326) de cada municipio para enquadramento ("tp")
    sem precisar baixar a geometria completa.
    """
    tabela = _tabela_base(ano)
    rows = db.execute(
        text(
            f"""
            SELECT code_muni, name_muni, code_state, name_metro,
                   ST_XMin(env) AS min_lng, ST_YMin(env) AS min_lat,
                   ST_XMax(env) AS max_lng, ST_YMax(env) AS max_lat
            FROM (
                SELECT m.code_muni, m.name_muni, m.code_state, m.name_metro,
                       ST_Envelope(ST_Transform(m.geometry, 4326)) AS env
                FROM {tabela} m
                WHERE m.unit_type = 'muni'
            ) s
            ORDER BY name_muni NULLS LAST
            """
        )
    ).all()

    return [
        {
            "code_muni": row.code_muni,
            "name_muni": row.name_muni,
            "code_state": str(int(row.code_state)) if row.code_state is not None else None,
            "name_metro": row.name_metro,
            "min_lng": row.min_lng,
            "min_lat": row.min_lat,
            "max_lng": row.max_lng,
            "max_lat": row.max_lat,
        }
        for row in rows
    ]


def obter_municipios_por_viewport(
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
    )
    return geo_comum.obter_por_viewport(
        db,
        tabela=tabela,
        min_lng=min_lng,
        min_lat=min_lat,
        max_lng=max_lng,
        max_lat=max_lat,
        filtro_sql=FILTRO_UNIT_TYPE_MUNI,
    )


def obter_tile_mvt(db: Session, ano: int, z: int, x: int, y: int):
    tabela_base = _tabela_base(ano)
    tabela_simplificada = _tabela_simplificada(ano)
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, z, tabela_base, tabela_simplificada, tabela_simplificada,
    )
    return geo_comum.obter_tile_mvt(
        db,
        tabela=tabela,
        z=z,
        x=x,
        y=y,
        feature_id_sql=FEATURE_ID_SQL,
        colunas_propriedades=PROPRIEDADES_TILE,
        filtro_sql=FILTRO_UNIT_TYPE_MUNI,
    )
