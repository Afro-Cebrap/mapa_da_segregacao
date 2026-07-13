from typing import List

from sqlalchemy.orm import Session

from repositories import municipios_repository
from schemas.setores_schema import MunicipiosSchema


def obter_municipios(db: Session, ano: int) -> List[MunicipiosSchema]:
    return municipios_repository.obter_municipios(db, ano)


def obter_municipios_indicadores(db: Session, ano: int):
    return municipios_repository.obter_municipios_indicadores(db, ano)


def obter_municipios_de_estado(
    db: Session,
    ano: int,
    cod_estado: str,
) -> List[MunicipiosSchema]:
    return municipios_repository.obter_municipios_por_estado(db, ano, cod_estado)


def obter_tile_municipios(db: Session, ano: int, z: int, x: int, y: int):
    return municipios_repository.obter_tile_mvt(db, ano, z, x, y)


def obter_municipios_por_viewport(
    db: Session,
    ano: int,
    bbox: list[float],
    zoom: int,
):
    return municipios_repository.obter_municipios_por_viewport(
        db,
        ano,
        min_lng=bbox[0],
        min_lat=bbox[1],
        max_lng=bbox[2],
        max_lat=bbox[3],
        zoom=zoom,
    )


def obter_lista_municipios(db: Session, ano: int):
    return municipios_repository.obter_lista_municipios(db, ano)
