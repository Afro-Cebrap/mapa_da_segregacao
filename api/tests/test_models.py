from models.setores_model import SetoresModel2010, SetoresModel2022, MODELOS_SETORES_POR_ANO
from models.municipios_model import MunicipiosModel2010, MunicipiosModel2022, MODELOS_MUNICIPIOS_POR_ANO
from models.regi_metro_model import (
    RegiaoMetropolitanaModel2010,
    RegiaoMetropolitanaModel2022,
    MODELOS_REG_METRO_POR_ANO,
)

COLUNAS_ESPERADAS = {
    "code_tract", "code_muni", "name_muni", "code_neighborhood", "name_neighborhood",
    "code_district", "name_district", "code_subdistrict", "name_subdistrict",
    "zone", "code_state", "abbrev_state", "name_state", "code_region", "name_region",
    "year", "name_metro", "unit_id", "unit_type",
    "dissimilarity", "index_h", "exp_branca_pp", "exp_pp_branca",
    "iso_branca_branca", "iso_pp_pp", "n_branca", "n_preta", "n_parda",
    "n_amarela", "n_indigena", "n_preta_ou_parda", "n_total",
    "percent_branca", "percent_preta", "percent_parda", "percent_amarela",
    "percent_indigena", "percent_preta_ou_parda", "geometry",
}


def test_setores_model_tablenames():
    assert SetoresModel2010.__tablename__ == "setores_2010"
    assert SetoresModel2022.__tablename__ == "setores_2022"
    assert SetoresModel2010.__table_args__ == {"schema": "dados"}
    assert MODELOS_SETORES_POR_ANO == {2010: SetoresModel2010, 2022: SetoresModel2022}


def test_municipios_model_tablenames():
    assert MunicipiosModel2010.__tablename__ == "municipios_2010"
    assert MunicipiosModel2022.__tablename__ == "municipios_2022"
    assert MODELOS_MUNICIPIOS_POR_ANO == {2010: MunicipiosModel2010, 2022: MunicipiosModel2022}


def test_reg_metro_model_tablenames():
    assert RegiaoMetropolitanaModel2010.__tablename__ == "reg_metropo_2010"
    assert RegiaoMetropolitanaModel2022.__tablename__ == "reg_metropo_2022"
    assert MODELOS_REG_METRO_POR_ANO == {
        2010: RegiaoMetropolitanaModel2010,
        2022: RegiaoMetropolitanaModel2022,
    }


def test_setores_model_colunas_batem_com_schema_novo():
    colunas = set(SetoresModel2010.__table__.columns.keys())
    assert colunas == COLUNAS_ESPERADAS
    assert "code_weighting" not in colunas


def test_setores_model_2010_e_2022_sao_classes_distintas_com_colunas_independentes():
    # Cada ano precisa da sua própria Column (SQLAlchemy não permite uma
    # instância de Column pertencer a duas tabelas ao mesmo tempo).
    assert SetoresModel2010 is not SetoresModel2022
    assert SetoresModel2010.__table__ is not SetoresModel2022.__table__
    assert SetoresModel2010.code_tract is not SetoresModel2022.code_tract
