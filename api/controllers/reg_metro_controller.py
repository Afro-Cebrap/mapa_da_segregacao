from typing import List

from sqlalchemy.orm import Session

from repositories import reg_metro_repository
from schemas.setores_schema import RegMetropoSchema


def obter_reg_metro(db: Session) -> List[RegMetropoSchema]:
    reg_metro = reg_metro_repository.obter_reg_metro(db)
    return reg_metro


def obter_reg_metro_indicadores(db: Session):
    return reg_metro_repository.obter_reg_metro_indicadores(db)


def obter_reg_metro_de_estado(
    db: Session,
    cod_estado: str,
) -> List[RegMetropoSchema]:
    estados = reg_metro_repository.obter_reg_metro_por_estado(
        db,
        cod_estado,
    )
    return estados


def obter_tile_reg_metro(db: Session, z: int, x: int, y: int):
    return reg_metro_repository.obter_tile_mvt(db, z, x, y)


def obter_reg_metro_por_viewport(
    db: Session,
    bbox: list[float],
    zoom: int,
):
    return reg_metro_repository.obter_reg_metro_por_viewport(
        db,
        min_lng=bbox[0],
        min_lat=bbox[1],
        max_lng=bbox[2],
        max_lat=bbox[3],
        zoom=zoom,
    )
