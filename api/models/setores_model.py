from sqlalchemy import Column, String, Float
from geoalchemy2 import Geometry
from .base import Base


def _colunas_setores():
    """Cada chamada cria instancias novas de Column: uma Column do SQLAlchemy
    so pode pertencer a uma tabela, entao a factory de classes por ano precisa
    reconstruir as colunas a cada classe gerada (nao da para compartilhar as
    mesmas instancias entre SetoresModel2010 e SetoresModel2022)."""
    return {
        "code_tract": Column("code_tract", String, primary_key=True, index=True),
        "code_muni": Column("code_muni", String, index=True),
        "name_muni": Column("name_muni", String, index=True),
        "code_neighborhood": Column("code_neighborhood", Float, nullable=True),
        "name_neighborhood": Column("name_neighborhood", String, nullable=True),
        "code_district": Column("code_district", Float, nullable=True),
        "name_district": Column("name_district", String, nullable=True),
        "code_subdistrict": Column("code_subdistrict", Float, nullable=True),
        "name_subdistrict": Column("name_subdistrict", String, nullable=True),
        "zone": Column("zone", String, nullable=True, index=True),
        "code_state": Column("code_state", Float, nullable=True),
        "abbrev_state": Column("abbrev_state", String, nullable=True),
        "name_state": Column("name_state", String, nullable=True),
        "code_region": Column("code_region", Float, nullable=True),
        "name_region": Column("name_region", String, nullable=True),
        "year": Column("year", Float, nullable=True),
        "name_metro": Column("name_metro", String, nullable=True),
        "unit_id": Column("unit_id", String, nullable=True),
        "unit_type": Column("unit_type", String, nullable=True, index=True),
        "dissimilarity": Column("dissimilarity", Float, nullable=True),
        "index_h": Column("index_h", Float, nullable=True),
        "exp_branca_pp": Column("exp_branca_pp", Float, nullable=True),
        "exp_pp_branca": Column("exp_pp_branca", Float, nullable=True),
        "iso_branca_branca": Column("iso_branca_branca", Float, nullable=True),
        "iso_pp_pp": Column("iso_pp_pp", Float, nullable=True),
        "n_branca": Column("n_branca", Float, nullable=True),
        "n_preta": Column("n_preta", Float, nullable=True),
        "n_parda": Column("n_parda", Float, nullable=True),
        "n_amarela": Column("n_amarela", Float, nullable=True),
        "n_indigena": Column("n_indigena", Float, nullable=True),
        "n_preta_ou_parda": Column("n_preta_ou_parda", Float, nullable=True),
        "n_total": Column("n_total", Float, nullable=True),
        "percent_branca": Column("percent_branca", Float, nullable=True),
        "percent_preta": Column("percent_preta", Float, nullable=True),
        "percent_parda": Column("percent_parda", Float, nullable=True),
        "percent_amarela": Column("percent_amarela", Float, nullable=True),
        "percent_indigena": Column("percent_indigena", Float, nullable=True),
        "percent_preta_ou_parda": Column("percent_preta_ou_parda", Float, nullable=True),
        "geometry": Column("geometry", Geometry(srid=4674)),
    }


def _criar_modelo_setores(ano: int):
    return type(
        f"SetoresModel{ano}",
        (Base,),
        {
            "__tablename__": f"setores_{ano}",
            "__table_args__": {"schema": "dados"},
            **_colunas_setores(),
        },
    )


SetoresModel2010 = _criar_modelo_setores(2010)
SetoresModel2022 = _criar_modelo_setores(2022)

MODELOS_SETORES_POR_ANO = {2010: SetoresModel2010, 2022: SetoresModel2022}
