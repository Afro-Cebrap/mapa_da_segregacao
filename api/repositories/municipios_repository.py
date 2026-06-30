from sqlalchemy import text
from sqlalchemy.orm import Session

from models.municipios_model import MunicipiosModel
from repositories import geo_comum

TABELA_BASE = "dados.municipios"
# Sem simplificacao: tabela base (geometria cheia) em todo zoom. O ST_AsMVTGeom
# quantiza por zoom e o filtro sub-pixel segura a contagem de feicoes; municipios
# sao poucos (~5.5k), entao o custo e baixo.
TABELA_ZOOM_BAIXO = TABELA_BASE
TABELA_ZOOM_MEDIO = TABELA_BASE

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


def obter_municipios(db: Session):
    return geo_comum.consultar_payloads(db, MunicipiosModel)


def obter_municipios_indicadores(db: Session):
    """Lista enxuta (sem geometria) para o ranking de municipios — clicar num
    municipio nao precisa baixar todas as ~5.5k geometrias."""
    return geo_comum.consultar_indicadores(
        db, TABELA_BASE, CAMPOS_INDICADOR, CAMPOS_INDICADOR_CODIGO,
    )


def obter_municipios_por_estado(db: Session, cod_estado: str):
    return geo_comum.consultar_payloads(
        db, MunicipiosModel, filtro=MunicipiosModel.code_state == cod_estado,
    )


def obter_lista_municipios(db: Session):
    """Lista leve (sem geometria) para lookups de filtro no frontend.

    Inclui o bbox (EPSG:4326) de cada municipio para enquadramento ("tp")
    sem precisar baixar a geometria completa.
    """
    rows = db.execute(
        text(
            f"""
            SELECT code_muni, name_muni, code_state, name_metro,
                   ST_XMin(env) AS min_lng, ST_YMin(env) AS min_lat,
                   ST_XMax(env) AS max_lng, ST_YMax(env) AS max_lat
            FROM (
                SELECT m.code_muni, m.name_muni, m.code_state, m.name_metro,
                       ST_Envelope(ST_Transform(m.geometry, 4326)) AS env
                FROM {TABELA_BASE} m
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
    min_lng: float,
    min_lat: float,
    max_lng: float,
    max_lat: float,
    zoom: int,
):
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, zoom, TABELA_BASE, TABELA_ZOOM_BAIXO, TABELA_ZOOM_MEDIO,
    )
    return geo_comum.obter_por_viewport(
        db,
        tabela=tabela,
        min_lng=min_lng,
        min_lat=min_lat,
        max_lng=max_lng,
        max_lat=max_lat,
    )


def obter_tile_mvt(db: Session, z: int, x: int, y: int):
    tabela = geo_comum.resolver_tabela_por_zoom(
        db, z, TABELA_BASE, TABELA_ZOOM_BAIXO, TABELA_ZOOM_MEDIO,
    )
    return geo_comum.obter_tile_mvt(
        db,
        tabela=tabela,
        z=z,
        x=x,
        y=y,
        feature_id_sql=FEATURE_ID_SQL,
        colunas_propriedades=PROPRIEDADES_TILE,
    )
