from typing import List

from sqlalchemy.orm import Session

from repositories import municipios_repository
from schemas.setores_schema import MunicipiosSchema


def obter_municipios(db: Session) -> List[MunicipiosSchema]:
    municipios = municipios_repository.obter_municipios(db)
    return municipios


def obter_municipios_indicadores(db: Session):
    return municipios_repository.obter_municipios_indicadores(db)


def obter_municipios_de_estado(
    db: Session,
    cod_estado: str,
) -> List[MunicipiosSchema]:
    estados = municipios_repository.obter_municipios_por_estado(
        db,
        cod_estado,
    )
    return estados


def obter_tile_municipios(db: Session, z: int, x: int, y: int):
    return municipios_repository.obter_tile_mvt(db, z, x, y)


def obter_municipios_por_viewport(
    db: Session,
    bbox: list[float],
    zoom: int,
):
    return municipios_repository.obter_municipios_por_viewport(
        db,
        min_lng=bbox[0],
        min_lat=bbox[1],
        max_lng=bbox[2],
        max_lat=bbox[3],
        zoom=zoom,
    )


def obter_lista_municipios(db: Session):
    return municipios_repository.obter_lista_municipios(db)
