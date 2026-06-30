import json
import logging
import math
from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import func, text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Lista canonica de atributos das tres tabelas (setores/municipios/reg_metropo
# compartilham o mesmo schema de colunas).
CAMPOS_SEGREG = (
    "code_tract", "code_muni", "name_muni", "code_neighborhood", "name_neighborhood",
    "code_district", "name_district", "code_subdistrict", "name_subdistrict",
    "code_weighting", "zone", "code_state", "abbrev_state", "name_state",
    "code_region", "name_region", "year", "name_metro",
    "dissimilarity", "index_h", "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp", "n_branca", "n_preta", "n_parda",
    "n_amarela", "n_indigena", "n_preta_ou_parda", "n_total",
    "percent_branca", "percent_preta", "percent_parda", "percent_amarela",
    "percent_indigena", "percent_preta_ou_parda",
)

# Metricas numericas emitidas como propriedades em todo tile MVT (choropleth + popup).
CAMPOS_METRICAS_TILE = (
    "n_total", "dissimilarity", "index_h", "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp", "percent_branca", "percent_preta",
    "percent_amarela", "percent_parda", "percent_indigena",
)

# Nome da camada interna do MVT, compartilhado pelos tres endpoints
# (o frontend referencia via source-layer).
NOME_CAMADA_MVT = "setores_layer"

# SRID nativo dos dados (SIRGAS 2000 / EPSG:4674). A coluna geometry e
# declarada com este SRID, permitindo que o operador && use o indice GiST
# diretamente sem ST_SetSRID por linha.
SRID_DADOS = 4674


def _row_value(row, field: str):
    if hasattr(row, "_mapping"):
        return row._mapping[field]
    return getattr(row, field)


def sanitizar_float_json(valor):
    # inf/-inf/NaN nao sao JSON-validos (o JSONResponse do FastAPI serializa com
    # json.dumps allow_nan=False), entao setores com indices defeituosos
    # (ex. percent_indigena=inf em areas ~100% de um grupo) derrubavam o
    # /viewport com 500. Cobre float E Decimal (colunas numeric do Postgres
    # voltam como Decimal('NaN')/Decimal('Infinity'), que escapavam do check
    # antigo so-float). Nao-finitos viram None ("Sem dados") em vez de quebrar.
    if isinstance(valor, float) and not math.isfinite(valor):
        return None
    if isinstance(valor, Decimal) and not valor.is_finite():
        return None
    return valor


def construir_payload(row, campos=CAMPOS_SEGREG) -> dict:
    payload = {field: sanitizar_float_json(_row_value(row, field)) for field in campos}
    geometry = _row_value(row, "geometry")
    payload["geometry"] = json.loads(geometry) if geometry else None
    return payload


def construir_feature(row, campos=CAMPOS_SEGREG) -> dict:
    payload = construir_payload(row, campos)
    geometry = payload.pop("geometry")
    if geometry is None:
        return {}

    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": payload,
    }


def consultar_payloads(db: Session, modelo, *, filtro=None) -> list[dict]:
    """Lista de payloads (CAMPOS_SEGREG + geometria em 4326) de um dos modelos
    de recurso (setores/municipios/reg_metropo). `filtro` e uma condicao
    SQLAlchemy opcional (ex.: Model.code_state == cod). Centraliza a query
    que os tres repositorios repetiam identica, exceto pelo modelo."""
    query = db.query(
        *(getattr(modelo, campo) for campo in CAMPOS_SEGREG),
        func.ST_AsGeoJSON(func.ST_Transform(modelo.geometry, 4326)).label("geometry"),
    )
    if filtro is not None:
        query = query.where(filtro)
    return [construir_payload(row) for row in query.all()]


def _linha_indicador(mapping, campos: Sequence[str], campos_codigo) -> dict:
    """Normaliza uma linha do ranking enxuto: codigos viram texto (o front
    casa contra Set<string>, e codigo numerico falharia o match silenciosamente)
    e as metricas passam pelo sanitizador de nao-finitos (inf/NaN -> None),
    senao o JSONResponse (allow_nan=False) derruba o endpoint inteiro com 500."""
    linha: dict = {}
    for campo in campos:
        valor = mapping[campo]
        if campo in campos_codigo:
            linha[campo] = None if valor is None else str(valor)
        else:
            linha[campo] = sanitizar_float_json(valor)
    return linha


def consultar_indicadores(
    db: Session,
    tabela: str,
    campos: Sequence[str],
    campos_codigo,
    filtro_sql: str | None = None,
    filtro_params: dict | None = None,
) -> list[dict]:
    """Lista enxuta (sem geometria) para o ranking de indicadores: identificador
    + metricas de segregacao, sem o custo da geometria. Compartilhada pelos tres
    recursos (setores/municipios/reg_metropo); cada um informa seus `campos`.
    `filtro_sql` e `filtro_params` permitem filtrar por escopo (RM ou municipio)
    diretamente no banco, reduzindo o payload para setores."""
    colunas = ", ".join(campos)
    where = f" WHERE {filtro_sql}" if filtro_sql else ""
    rows = db.execute(
        text(f"SELECT {colunas} FROM {tabela}{where}"),
        filtro_params or {},
    ).all()
    return [_linha_indicador(row._mapping, campos, campos_codigo) for row in rows]


def _tabela_existe(db: Session, tabela_qualificada: str) -> bool:
    return bool(
        db.execute(
            text("SELECT to_regclass(:nome_tabela)"),
            {"nome_tabela": tabela_qualificada},
        ).scalar(),
    )


def resolver_tabela_por_zoom(
    db: Session,
    z: int,
    tabela_base: str,
    tabela_zoom_baixo: str,
    tabela_zoom_medio: str,
    limite_zoom_ultra: int = 8,
) -> str:
    if z >= 12:
        return tabela_base

    candidata = tabela_zoom_baixo if z < limite_zoom_ultra else tabela_zoom_medio
    if _tabela_existe(db, candidata):
        return candidata

    # Fallback de seguranca: sem tabela simplificada a query roda na base
    # completa, o que tende a ser lento em zoom baixo. Rode a ingestao
    # (db_build + simplify_table) para criar as tabelas simplificadas.
    logger.warning(
        "Tabela simplificada %s inexistente; usando %s (lento em zoom baixo).",
        candidata,
        tabela_base,
    )
    return tabela_base


def area_minima_para_zoom(z: int) -> float:
    """Area (em graus quadrados, SRID nativo) de ~1 pixel de tile no zoom dado.

    Em zoom baixo/medio, poligonos menores que 1 pixel sao invisiveis; filtra-los
    antes do ST_AsMVTGeom reduz drasticamente o custo e o tamanho do tile sem
    alterar o visual. A partir de z12 (tabela base, detalhe maximo) nao filtramos
    (retorna 0.0).
    """
    if z >= 12:
        return 0.0

    # 512 = tamanho em px com que o MapLibre renderiza cada tile (default de
    # fontes vetoriais); se o frontend mudar tileSize, ajustar aqui.
    graus_por_pixel = 360.0 / (2 ** z) / 512.0
    return graus_por_pixel ** 2


def obter_por_viewport(
    db: Session,
    *,
    tabela: str,
    min_lng: float,
    min_lat: float,
    max_lng: float,
    max_lat: float,
):
    colunas = ",\n            ".join(f"t.{campo}" for campo in CAMPOS_SEGREG)
    sql = text(
        f"""
        WITH bounds AS (
            SELECT ST_Transform(
                       ST_MakeEnvelope(:min_lng, :min_lat, :max_lng, :max_lat, 4326),
                       :srid
                   ) AS nativo
        )
        SELECT
            {colunas},
            ST_AsGeoJSON(ST_Transform(t.geometry, 4326)) AS geometry
        FROM {tabela} t, bounds
        WHERE
            t.geometry && bounds.nativo
            AND ST_Intersects(t.geometry, bounds.nativo)
        """
    )

    rows = db.execute(
        sql,
        {
            "min_lng": min_lng,
            "min_lat": min_lat,
            "max_lng": max_lng,
            "max_lat": max_lat,
            "srid": SRID_DADOS,
        },
    ).all()

    features = [
        feature
        for feature in (construir_feature(row) for row in rows)
        if feature
    ]

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def obter_tile_mvt(
    db: Session,
    *,
    tabela: str,
    z: int,
    x: int,
    y: int,
    feature_id_sql: str,
    colunas_propriedades: Sequence[str],
    filtro_sql: str | None = None,
    filtro_params: dict | None = None,
):
    """Gera o tile MVT da tabela informada.

    feature_id_sql: expressao SQL (sobre alias t) que produz o id numerico da
    feature — usado pelo MapLibre para hover via feature-state.
    colunas_propriedades: expressoes SQL completas (com alias) emitidas como
    propriedades da feature.
    filtro_sql: clausula WHERE extra opcional (sobre alias t), concatenada como
    `AND (<filtro_sql>)`; seus parametros vem em filtro_params.

    """
    area_minima = area_minima_para_zoom(z)
    props = ",\n            ".join(colunas_propriedades)
    filtro_where = f"AND ({filtro_sql})" if filtro_sql else ""
    sql = text(
        f"""
        WITH bounds AS (
          SELECT ST_TileEnvelope(:z, :x, :y) AS merc,
                 ST_Transform(ST_TileEnvelope(:z, :x, :y), :srid) AS nativo
        ),
        mvt_geom AS (
          SELECT
            ST_AsMVTGeom(
                ST_Transform(t.geometry, 3857),
                bounds.merc,
                4096, 64, true
            ) AS geom,
            {feature_id_sql} AS feature_id,
            {props}
          FROM {tabela} t, bounds
          WHERE t.geometry && bounds.nativo
            AND ST_Intersects(t.geometry, bounds.nativo)
            AND (CAST(:area_minima AS double precision) = 0.0 OR ST_Area(t.geometry) > :area_minima)
            {filtro_where}
        )
        SELECT ST_AsMVT(
            mvt_geom.*,
            '{NOME_CAMADA_MVT}',
            4096,
            'geom',
            'feature_id'
        ) FROM mvt_geom;
    """
    )

    parametros = {"z": z, "x": x, "y": y, "area_minima": area_minima, "srid": SRID_DADOS}
    if filtro_params:
        parametros.update(filtro_params)

    result = db.execute(sql, parametros).scalar()
    if result is not None:
        return bytes(result)
    return None
