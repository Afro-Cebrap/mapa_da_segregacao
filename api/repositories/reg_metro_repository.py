from sqlalchemy.orm import Session

from models.regi_metro_model import MODELOS_REG_METRO_POR_ANO
from repositories import geo_comum

# code_tract/code_muni valem 'Total' em RM; id sintetico derivado do nome.
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

# Toda RM so tem sentido no nivel metropolitano.
FILTRO_UNIT_TYPE_METRO = "unit_type = 'metro'"


def _tabela_base(ano: int) -> str:
    return f"dados.reg_metropo_{ano}"


def _tabela_simplificada(ano: int) -> str:
    return f"dados.reg_metropo_{ano}_simplified"


def obter_reg_metro(db: Session, ano: int):
    modelo = MODELOS_REG_METRO_POR_ANO[ano]
    return geo_comum.consultar_payloads(db, modelo, filtro=modelo.unit_type == "metro")


def obter_reg_metro_indicadores(db: Session, ano: int):
    """Lista enxuta (sem geometria) para o ranking de regioes metropolitanas."""
    return geo_comum.consultar_indicadores(
        db, _tabela_base(ano), CAMPOS_INDICADOR, CAMPOS_INDICADOR_CODIGO,
        filtro_sql=FILTRO_UNIT_TYPE_METRO,
    )


def obter_reg_metro_por_estado(db: Session, ano: int, cod_estado: str):
    modelo = MODELOS_REG_METRO_POR_ANO[ano]
    return geo_comum.consultar_payloads(
        db, modelo,
        filtro=(modelo.code_state == cod_estado) & (modelo.unit_type == "metro"),
    )


def obter_reg_metro_por_viewport(
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
        filtro_sql=FILTRO_UNIT_TYPE_METRO,
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
        filtro_sql=FILTRO_UNIT_TYPE_METRO,
    )
