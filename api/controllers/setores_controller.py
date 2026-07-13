from typing import List

from sqlalchemy.orm import Session

from repositories import setores_repository
from schemas.setores_schema import SetoresSchema


def obter_setores(db: Session, ano: int) -> List[SetoresSchema]:
    return setores_repository.obter_setores(db, ano)


def obter_setores_indicadores(
    db: Session,
    ano: int,
    escopo: str | None = None,
    codigo: str | None = None,
):
    return setores_repository.obter_setores_indicadores(
        db, ano, escopo=escopo, codigo=codigo,
    )


def obter_setores_de_municipio(
    db: Session,
    ano: int,
    cod_municipio: str,
) -> List[SetoresSchema]:
    return setores_repository.obter_setores_por_municipio(db, ano, cod_municipio)


def obter_tile_setores(
    db: Session,
    ano: int,
    z: int,
    x: int,
    y: int,
    metro: str | None = None,
    cod_municipio: str | None = None,
):
    return setores_repository.obter_tile_mvt(
        db, ano, z, x, y, metro=metro, cod_municipio=cod_municipio,
    )


def obter_setores_por_viewport(
    db: Session,
    ano: int,
    bbox: list[float],
    zoom: int,
):
    return setores_repository.obter_setores_por_viewport(
        db,
        ano,
        min_lng=bbox[0],
        min_lat=bbox[1],
        max_lng=bbox[2],
        max_lat=bbox[3],
        zoom=zoom,
    )


def obter_escala_metrica(
    db: Session,
    ano: int,
    metrica: str,
    escopo: str,
    codigo: str,
) -> list[float] | None:
    return setores_repository.obter_escala_metrica(db, ano, metrica, escopo, codigo)
