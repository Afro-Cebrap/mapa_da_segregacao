from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from controllers import municipios_controller
from db.connection import get_db
from routes._comum import montar_resposta_tile, parse_bbox_param, parse_year_param
from schemas.setores_schema import MunicipiosSchema, MunicipioListaSchema

router = APIRouter(
    prefix="/api/municipios",
    tags=["Municipios"],
)


@router.get("/", response_model=List[MunicipiosSchema])
def listar_municipios(
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    return municipios_controller.obter_municipios(db, year)


@router.get("/lista", response_model=List[MunicipioListaSchema])
def listar_municipios_sem_geometria(
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    """Lista leve de municipios (sem geometria) para filtros no frontend."""
    return municipios_controller.obter_lista_municipios(db, year)


@router.get("/indicadores")
def listar_indicadores_municipios(
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    """Lista enxuta (sem geometria) para o ranking de indicadores."""
    return municipios_controller.obter_municipios_indicadores(db, year)


@router.get("/estado", response_model=List[MunicipiosSchema])
def listar_municipios_de_estado(
    cod_estado: str = Query(
        alias="codEstado",
        description="Codigo do Estado",
    ),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    if cod_estado:
        return municipios_controller.obter_municipios_de_estado(
            db,
            year,
            cod_estado,
        )

    raise HTTPException(
        status_code=400,
        detail="O parametro 'cod_estado' e obrigatorio.",
    )


@router.get("/viewport")
def listar_municipios_por_viewport(
    bbox: str = Query(
        ...,
        description="Bounds da area visivel no formato minLng,minLat,maxLng,maxLat",
    ),
    zoom: int = Query(..., ge=0, le=22),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    return municipios_controller.obter_municipios_por_viewport(
        db,
        year,
        parse_bbox_param(bbox),
        zoom,
    )


@router.get("/tiles/{z}/{x}/{y}.pbf")
def listar_tile_municipios(
    z: int,
    x: int,
    y: int,
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    tile_content = municipios_controller.obter_tile_municipios(db, year, z, x, y)
    return montar_resposta_tile(tile_content, y)
