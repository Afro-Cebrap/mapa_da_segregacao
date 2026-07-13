from repositories.reg_metro_repository import _tabela_base, _tabela_simplificada


def test_tabela_base_por_ano():
    assert _tabela_base(2010) == "dados.reg_metropo_2010"
    assert _tabela_base(2022) == "dados.reg_metropo_2022"


def test_tabela_simplificada_por_ano():
    assert _tabela_simplificada(2010) == "dados.reg_metropo_2010_simplified"
    assert _tabela_simplificada(2022) == "dados.reg_metropo_2022_simplified"
