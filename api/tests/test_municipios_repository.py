from repositories.municipios_repository import _tabela_base, _tabela_simplificada


def test_tabela_base_por_ano():
    assert _tabela_base(2010) == "dados.municipios_2010"
    assert _tabela_base(2022) == "dados.municipios_2022"


def test_tabela_simplificada_por_ano():
    assert _tabela_simplificada(2010) == "dados.municipios_2010_simplified"
    assert _tabela_simplificada(2022) == "dados.municipios_2022_simplified"
