from typing import List

from sqlalchemy.orm import Session

from repositories import setores_repository
from schemas.setores_schema import SetoresSchema


def obter_setores(db: Session) -> List[SetoresSchema]:
    municipios = setores_repository.obter_setores(db)
    return municipios


def obter_setores_indicadores(
    db: Session,
    escopo: str | None = None,
    codigo: str | None = None,
):
    return setores_repository.obter_setores_indicadores(db, escopo=escopo, codigo=codigo)


def obter_setores_de_municipio(
    db: Session,
    cod_municipio: str,
) -> List[SetoresSchema]:
    municipios = setores_repository.obter_setores_por_municipio(
        db,
        cod_municipio,
    )
    return municipios


def obter_tile_setores(
    db: Session,
    z: int,
    x: int,
    y: int,
    metro: str | None = None,
    cod_municipio: str | None = None,
):
    return setores_repository.obter_tile_mvt(
        db, z, x, y, metro=metro, cod_municipio=cod_municipio,
    )


def obter_setores_por_viewport(
    db: Session,
    bbox: list[float],
    zoom: int,
):
    return setores_repository.obter_setores_por_viewport(
        db,
        min_lng=bbox[0],
        min_lat=bbox[1],
        max_lng=bbox[2],
        max_lat=bbox[3],
        zoom=zoom,
    )


def obter_escala_metrica(
    db: Session,
    metrica: str,
    escopo: str,
    codigo: str,
) -> list[float] | None:
    return setores_repository.obter_escala_metrica(db, metrica, escopo, codigo)
