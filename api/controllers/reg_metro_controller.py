from typing import List

from sqlalchemy.orm import Session

from repositories import reg_metro_repository
from schemas.setores_schema import RegMetropoSchema


def obter_reg_metro(db: Session, ano: int) -> List[RegMetropoSchema]:
    return reg_metro_repository.obter_reg_metro(db, ano)


def obter_reg_metro_indicadores(db: Session, ano: int):
    return reg_metro_repository.obter_reg_metro_indicadores(db, ano)


def obter_reg_metro_de_estado(
    db: Session,
    ano: int,
    cod_estado: str,
) -> List[RegMetropoSchema]:
    return reg_metro_repository.obter_reg_metro_por_estado(db, ano, cod_estado)


def obter_tile_reg_metro(db: Session, ano: int, z: int, x: int, y: int):
    return reg_metro_repository.obter_tile_mvt(db, ano, z, x, y)


def obter_reg_metro_por_viewport(
    db: Session,
    ano: int,
    bbox: list[float],
    zoom: int,
):
    return reg_metro_repository.obter_reg_metro_por_viewport(
        db,
        ano,
        min_lng=bbox[0],
        min_lat=bbox[1],
        max_lng=bbox[2],
        max_lat=bbox[3],
        zoom=zoom,
    )
