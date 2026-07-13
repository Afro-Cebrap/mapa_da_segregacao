from pydantic import BaseModel, field_validator
from typing import Optional


class SegregBaseSchema(BaseModel):
    code_tract: Optional[str] = None
    code_muni: Optional[str] = None
    name_muni: Optional[str] = None
    code_neighborhood: Optional[float] = None
    name_neighborhood: Optional[str] = None
    code_district: Optional[float] = None
    name_district: Optional[str] = None
    code_subdistrict: Optional[float] = None
    name_subdistrict: Optional[str] = None
    zone: Optional[str] = None
    code_state: Optional[str] = None
    abbrev_state: Optional[str] = None
    name_state: Optional[str] = None
    code_region: Optional[float] = None
    name_region: Optional[str] = None
    year: Optional[float] = None
    name_metro: Optional[str] = None

    dissimilarity: Optional[float] = None
    index_h: Optional[float] = None
    exp_branca_pp: Optional[float] = None
    exp_pp_branca: Optional[float] = None
    iso_branca_branca: Optional[float] = None
    iso_pp_pp: Optional[float] = None

    n_branca: Optional[float] = None
    n_preta: Optional[float] = None
    n_parda: Optional[float] = None
    n_amarela: Optional[float] = None
    n_indigena: Optional[float] = None
    n_preta_ou_parda: Optional[float] = None
    n_total: Optional[float] = None

    percent_branca: Optional[float] = None
    percent_preta: Optional[float] = None
    percent_parda: Optional[float] = None
    percent_amarela: Optional[float] = None
    percent_indigena: Optional[float] = None
    percent_preta_ou_parda: Optional[float] = None

    geometry: Optional[dict] = None

    # code_state e float no BD; converte para string inteira para compatibilidade
    # com o mapa de siglas do frontend (Map<"35", "SP">).
    @field_validator("code_state", mode="before")
    @classmethod
    def _normalizar_code_state(cls, v):
        if v is None:
            return None
        if isinstance(v, float):
            return str(int(v))
        return str(v)

    class Config:
        from_attributes = True


class SetoresSchema(SegregBaseSchema):
    pass


class MunicipiosSchema(SegregBaseSchema):
    pass


class RegMetropoSchema(SegregBaseSchema):
    pass


class MunicipioListaSchema(BaseModel):
    code_muni: Optional[str] = None
    name_muni: Optional[str] = None
    code_state: Optional[str] = None
    name_metro: Optional[str] = None
    min_lng: Optional[float] = None
    min_lat: Optional[float] = None
    max_lng: Optional[float] = None
    max_lat: Optional[float] = None

    class Config:
        from_attributes = True
