from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from controllers import setores_controller
from db.connection import get_db
from routes._comum import montar_resposta_tile, parse_bbox_param, parse_year_param
from schemas.setores_schema import SetoresSchema

router = APIRouter(
    prefix="/api/setores",
    tags=["Setores"],
)


@router.get("/", response_model=List[SetoresSchema])
def listar_setores(
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    return setores_controller.obter_setores(db, year)


@router.get("/indicadores")
def listar_indicadores_setores(
    scope: str | None = Query(
        None,
        description="Escopo do filtro: 'reg_metro' ou 'municipio'",
    ),
    code: str | None = Query(
        None,
        description="name_metro (para reg_metro) ou code_muni (para municipio)",
    ),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    return setores_controller.obter_setores_indicadores(
        db, year, escopo=scope, codigo=code,
    )


@router.get("/municipio", response_model=List[SetoresSchema])
def listar_setores_de_municipio(
    cod_municipio: str = Query(
        alias="codMunicipio",
        description="Codigo do Municipio",
    ),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    if cod_municipio:
        return setores_controller.obter_setores_de_municipio(
            db,
            year,
            cod_municipio,
        )

    raise HTTPException(
        status_code=400,
        detail="O parametro 'codMunicipio' e obrigatorio.",
    )


@router.get("/viewport")
def listar_setores_por_viewport(
    bbox: str = Query(
        ...,
        description="Bounds da area visivel no formato minLng,minLat,maxLng,maxLat",
    ),
    zoom: int = Query(..., ge=0, le=22),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    return setores_controller.obter_setores_por_viewport(
        db,
        year,
        parse_bbox_param(bbox),
        zoom,
    )


@router.get("/escala")
def obter_escala_metrica(
    metric: str = Query(..., description="Métrica numérica (ex: dissimilarity)"),
    scope: str = Query(..., description="Escopo: 'reg_metro' ou 'municipio'"),
    code: str = Query(..., description="name_metro (para reg_metro) ou code_muni (para municipio)"),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    """Percentis (p0/p25/p50/p75) da métrica no escopo informado.

    Usado pelo frontend para construir escala dinâmica de choropleth: se o
    município está em uma RM, o escopo é a RM inteira; se não, só o município.
    """
    try:
        resultado = setores_controller.obter_escala_metrica(db, year, metric, scope, code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="Sem dados para o escopo informado.",
        )

    return {"breaks": resultado}


@router.get("/tiles/{z}/{x}/{y}.pbf")
def listar_tile_setores(
    z: int,
    x: int,
    y: int,
    metro: str | None = Query(
        None,
        description="Filtra setores pela RM (name_metro).",
    ),
    cod_municipio: str | None = Query(
        None,
        alias="codMunicipio",
        description="Filtra setores pelo codigo do municipio.",
    ),
    year: int = Depends(parse_year_param),
    db: Session = Depends(get_db),
):
    tile_content = setores_controller.obter_tile_setores(
        db, year, z, x, y, metro=metro, cod_municipio=cod_municipio,
    )
    return montar_resposta_tile(tile_content, y)
