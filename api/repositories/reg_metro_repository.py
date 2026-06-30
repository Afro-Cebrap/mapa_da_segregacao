from sqlalchemy.orm import Session

from models.regi_metro_model import RegiaoMetropolitanaModel
from repositories import geo_comum

TABELA_BASE = "dados.reg_metropo"
# RM tem so 46 geometrias: a propria _simplified atende os dois buckets.
TABELA_ZOOM_BAIXO = "dados.reg_metropo_simplified"
TABELA_ZOOM_MEDIO = "dados.reg_metropo_simplified"

# code_tract/code_muni valem 'Total' em RM; id sintetico derivado do nome.
# hashtext depende apenas do valor, entao o id e estavel entre tiles e entre
# as tabelas de zoom (row_number nao seria: a janela rodaria por tile).
# abs() porque o id de feature MVT e uint64.
FEATURE_ID_SQL = "abs(CAST(hashtext(t.name_metro) AS bigint))"
PROPRIEDADES_TILE = (
    "t.name_metro",
    *(f"t.{campo}" for campo in geo_comum.CAMPOS_METRICAS_TILE),
)

# Payload enxuto do ranking (sem geometria). A chave do ranking de RMs e o
# name_metro; cada RM aparece uma vez na tabela base.
CAMPOS_INDICADOR = (
    "name_metro",
    "dissimilarity", "index_h",
    "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp",
)
CAMPOS_INDICADOR_CODIGO = frozenset({"name_metro"})


def obter_reg_metro(db: Session):
    return geo_comum.consultar_payloads(db, RegiaoMetropolitanaModel)


def obter_reg_metro_indicadores(db: Session):
    """Lista enxuta (sem geometria) para o ranking de regioes metropolitanas."""
    return geo_comum.consultar_indicadores(
        db, TABELA_BASE, CAMPOS_INDICADOR, CAMPOS_INDICADOR_CODIGO,
    )


def obter_reg_metro_por_estado(db: Session, cod_estado: str):
    return geo_comum.consultar_payloads(
        db,
        RegiaoMetropolitanaModel,
        filtro=RegiaoMetropolitanaModel.code_state == cod_estado,
    )


def obter_reg_metro_por_viewport(
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
