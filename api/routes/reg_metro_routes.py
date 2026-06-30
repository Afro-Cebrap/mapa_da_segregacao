from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from controllers import reg_metro_controller
from db.connection import get_db
from routes._comum import montar_resposta_tile, parse_bbox_param
from schemas.setores_schema import RegMetropoSchema

router = APIRouter(
    prefix="/api/reg_metro",
    tags=["Regiao Metropolitana"],
)


@router.get("/", response_model=List[RegMetropoSchema])
def listar_reg_metro(db: Session = Depends(get_db)):
    return reg_metro_controller.obter_reg_metro(db)


@router.get("/indicadores")
def listar_indicadores_reg_metro(db: Session = Depends(get_db)):
    """Lista enxuta (sem geometria) para o ranking de indicadores."""
    return reg_metro_controller.obter_reg_metro_indicadores(db)


@router.get("/estado", response_model=List[RegMetropoSchema])
def listar_reg_metro_de_estado(
    cod_estado: str = Query(
        alias="codEstado",
        description="Codigo do Estado",
    ),
    db: Session = Depends(get_db),
):
    if cod_estado:
        return reg_metro_controller.obter_reg_metro_de_estado(
            db,
            cod_estado,
        )

    raise HTTPException(
        status_code=400,
        detail="O parametro 'cod_estado' e obrigatorio.",
    )


@router.get("/viewport")
def listar_reg_metro_por_viewport(
    bbox: str = Query(
        ...,
        description="Bounds da area visivel no formato minLng,minLat,maxLng,maxLat",
    ),
    zoom: int = Query(..., ge=0, le=22),
    db: Session = Depends(get_db),
):
    return reg_metro_controller.obter_reg_metro_por_viewport(
        db,
        parse_bbox_param(bbox),
        zoom,
    )


@router.get("/tiles/{z}/{x}/{y}.pbf")
def listar_tile_reg_metro(z: int, x: int, y: int, db: Session = Depends(get_db)):
    tile_content = reg_metro_controller.obter_tile_reg_metro(db, z, x, y)
    return montar_resposta_tile(tile_content, y)
