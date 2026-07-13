"""Helpers HTTP compartilhados pelos routers de recursos geo
(setores/municipios/reg_metro): parsing de bbox e envelope de resposta de tile.
Antes cada router mantinha uma copia identica destes dois trechos."""

from typing import Annotated

from fastapi import HTTPException, Query, Response


def parse_bbox_param(raw_bbox: str) -> list[float]:
    """Valida e converte o query param `bbox` ("minLng,minLat,maxLng,maxLat")."""
    try:
        bbox = [float(value) for value in raw_bbox.split(",")]
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Parametro 'bbox' deve conter apenas numeros.",
        ) from exc

    if len(bbox) != 4:
        raise HTTPException(
            status_code=400,
            detail="Parametro 'bbox' deve seguir o formato minLng,minLat,maxLng,maxLat.",
        )

    min_lng, min_lat, max_lng, max_lat = bbox
    if min_lng >= max_lng or min_lat >= max_lat:
        raise HTTPException(
            status_code=400,
            detail="Parametro 'bbox' invalido: limites minimos devem ser menores que os maximos.",
        )

    return bbox


def montar_resposta_tile(tile_content: bytes | None, y: int) -> Response:
    """Resposta padrao de tile MVT: 204 quando vazio, senao protobuf com
    cache de 24h (dado censitario e estatico)."""
    if not tile_content:
        return Response(status_code=204)

    return Response(
        content=tile_content,
        media_type="application/x-protobuf",
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f"attachment; filename={y}.pbf",
        },
    )


ANOS_VALIDOS = (2010, 2022)


def parse_year_param(
    year: Annotated[int, Query(description="Ano do censo: 2010 ou 2022.")] = 2010,
) -> int:
    """Dependency compartilhada por todas as rotas de recurso geo: valida o
    ano do censo contra as tabelas que de fato existem no banco."""
    if year not in ANOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Parametro 'year' invalido: deve ser um de {ANOS_VALIDOS}.",
        )
    return year
