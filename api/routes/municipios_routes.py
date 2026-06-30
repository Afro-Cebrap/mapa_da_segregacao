from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from controllers import municipios_controller
from db.connection import get_db
from routes._comum import montar_resposta_tile, parse_bbox_param
from schemas.setores_schema import MunicipiosSchema, MunicipioListaSchema

router = APIRouter(
    prefix="/api/municipios",
    tags=["Municipios"],
)


@router.get("/", response_model=List[MunicipiosSchema])
def listar_municipios(db: Session = Depends(get_db)):
    return municipios_controller.obter_municipios(db)


@router.get("/lista", response_model=List[MunicipioListaSchema])
def listar_municipios_sem_geometria(db: Session = Depends(get_db)):
    """Lista leve de municipios (sem geometria) para filtros no frontend."""
    return municipios_controller.obter_lista_municipios(db)


@router.get("/indicadores")
def listar_indicadores_municipios(db: Session = Depends(get_db)):
    """Lista enxuta (sem geometria) para o ranking de indicadores."""
    return municipios_controller.obter_municipios_indicadores(db)


@router.get("/estado", response_model=List[MunicipiosSchema])
def listar_municipios_de_estado(
    cod_estado: str = Query(
        alias="codEstado",
        description="Codigo do Estado",
    ),
    db: Session = Depends(get_db),
):
    if cod_estado:
        return municipios_controller.obter_municipios_de_estado(
            db,
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
    db: Session = Depends(get_db),
):
    return municipios_controller.obter_municipios_por_viewport(
        db,
        parse_bbox_param(bbox),
        zoom,
    )


@router.get("/tiles/{z}/{x}/{y}.pbf")
def listar_tile_municipios(z: int, x: int, y: int, db: Session = Depends(get_db)):
    tile_content = municipios_controller.obter_tile_municipios(db, z, x, y)
    return montar_resposta_tile(tile_content, y)
