import math
from decimal import Decimal
from types import SimpleNamespace

import pytest

from repositories.geo_comum import area_minima_para_zoom
from repositories import geo_comum

# Campos de exemplo para os testes de _linha_indicador (formato municipios).
_CAMPOS_IND = ("code_muni", "name_metro", "dissimilarity", "index_h")
_CAMPOS_IND_CODIGO = frozenset({"code_muni", "name_metro"})


def _fake_row(**overrides):
    """Linha sintetica com todos os CAMPOS_SEGREG (default 0.0) + geometry None."""
    valores = {campo: 0.0 for campo in geo_comum.CAMPOS_SEGREG}
    valores.update(overrides)
    valores["geometry"] = None
    return SimpleNamespace(**valores)


def test_construir_payload_neutraliza_floats_nao_finitos():
    # inf/-inf/NaN nao sao JSON-validos: setores com indices defeituosos
    # (ex. percent_indigena=inf) derrubavam o /viewport com 500.
    row = _fake_row(
        percent_indigena=math.inf,
        index_h=float("nan"),
        dissimilarity=-math.inf,
    )

    payload = geo_comum.construir_payload(row)

    assert payload["percent_indigena"] is None
    assert payload["index_h"] is None
    assert payload["dissimilarity"] is None


def test_construir_payload_preserva_valores_finitos():
    row = _fake_row(percent_branca=0.5, n_total=121.0)

    payload = geo_comum.construir_payload(row)

    assert payload["percent_branca"] == 0.5
    assert payload["n_total"] == 121.0


def test_sanitizar_neutraliza_decimal_nao_finito():
    # Colunas numeric do Postgres voltam como Decimal; Decimal('NaN')/('Infinity')
    # escapavam do check antigo so-float e derrubavam o endpoint com 500.
    assert geo_comum.sanitizar_float_json(Decimal("Infinity")) is None
    assert geo_comum.sanitizar_float_json(Decimal("-Infinity")) is None
    assert geo_comum.sanitizar_float_json(Decimal("NaN")) is None
    assert geo_comum.sanitizar_float_json(Decimal("0.42")) == Decimal("0.42")


def test_linha_indicador_neutraliza_nao_finitos():
    # inf/NaN nas metricas derrubariam o JSONResponse (allow_nan=False); o
    # ranking precisa que virem None em vez de quebrar o endpoint inteiro.
    mapping = {
        "code_muni": "3550308",
        "name_metro": "RM de Sao Paulo",
        "dissimilarity": float("inf"),
        "index_h": float("nan"),
    }
    linha = geo_comum._linha_indicador(mapping, _CAMPOS_IND, _CAMPOS_IND_CODIGO)
    assert linha["dissimilarity"] is None
    assert linha["index_h"] is None


def test_linha_indicador_codigos_viram_texto():
    # O front filtra codigos contra Set<string>; codigos numericos do banco
    # precisam sair como texto para o match nao falhar silenciosamente.
    mapping = {
        "code_muni": 3550308,
        "name_metro": "RM X",
        "dissimilarity": 0.1,
        "index_h": 0.2,
    }
    linha = geo_comum._linha_indicador(mapping, _CAMPOS_IND, _CAMPOS_IND_CODIGO)
    assert linha["code_muni"] == "3550308"
    assert linha["name_metro"] == "RM X"


def test_linha_indicador_codigo_none_continua_none():
    mapping = {campo: None for campo in _CAMPOS_IND}
    linha = geo_comum._linha_indicador(mapping, _CAMPOS_IND, _CAMPOS_IND_CODIGO)
    assert linha["code_muni"] is None
    assert linha["name_metro"] is None


def test_area_minima_zero_a_partir_de_z12():
    # A partir de z12 (tabela base, detalhe maximo) nao ha filtro sub-pixel.
    assert area_minima_para_zoom(12) == 0.0
    assert area_minima_para_zoom(22) == 0.0


def test_area_minima_ativa_em_zoom_baixo_e_medio():
    # Sub-pixel agora filtra tambem na faixa media (z8-z11), nao so z<8.
    assert area_minima_para_zoom(8) > 0.0
    assert area_minima_para_zoom(11) > 0.0


def test_area_minima_cresce_conforme_zoom_diminui():
    assert area_minima_para_zoom(3) > area_minima_para_zoom(7) > 0.0


def test_area_minima_valor_conhecido_z4():
    # 360 graus / 2^4 tiles / 512 px = 0.0439453125 graus por pixel.
    graus_por_pixel = 360.0 / (2 ** 4) / 512.0
    assert area_minima_para_zoom(4) == pytest.approx(graus_por_pixel ** 2)


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def scalar(self):
        return self._value


class _FakeDB:
    """db.execute(...).scalar() retorna sempre um nome (tabela existe)."""

    def execute(self, *args, **kwargs):
        return _FakeResult("dados.qualquer")


def test_resolver_ultra_ate_limite_customizado():
    db = _FakeDB()
    # limite 10: z9 cai no bucket ultra (baixo)
    assert geo_comum.resolver_tabela_por_zoom(
        db, 9, "base", "ultra", "medio", limite_zoom_ultra=10
    ) == "ultra"
    # z11 ainda no bucket medio
    assert geo_comum.resolver_tabela_por_zoom(
        db, 11, "base", "ultra", "medio", limite_zoom_ultra=10
    ) == "medio"
    # z12+ sempre base
    assert geo_comum.resolver_tabela_por_zoom(
        db, 12, "base", "ultra", "medio", limite_zoom_ultra=10
    ) == "base"


def test_resolver_default_mantem_limite_8():
    db = _FakeDB()
    # default (8): z9 cai no bucket medio; z7 no ultra
    assert geo_comum.resolver_tabela_por_zoom(
        db, 9, "base", "ultra", "medio"
    ) == "medio"
    assert geo_comum.resolver_tabela_por_zoom(
        db, 7, "base", "ultra", "medio"
    ) == "ultra"


def test_campos_segreg_sem_code_weighting():
    assert "code_weighting" not in geo_comum.CAMPOS_SEGREG
    assert "unit_type" not in geo_comum.CAMPOS_SEGREG
    assert "unit_id" not in geo_comum.CAMPOS_SEGREG


class _CapturingDB:
    """Captura os parametros da ultima chamada a execute(), sem tocar banco real."""

    def __init__(self):
        self.ultimo_params = None

    def execute(self, sql, params):
        self.ultimo_params = params
        return _FakeResult(None)


def test_obter_tile_mvt_aplica_area_minima_por_padrao():
    # Comportamento default (municipios/reg_metro): corte sub-pixel ligado.
    db = _CapturingDB()
    geo_comum.obter_tile_mvt(
        db,
        tabela="dados.municipios_2010",
        z=5, x=1, y=1,
        feature_id_sql="t.id",
        colunas_propriedades=("t.nome",),
    )
    assert db.ultimo_params["area_minima"] == area_minima_para_zoom(5)
    assert db.ultimo_params["area_minima"] > 0.0


def test_obter_tile_mvt_filtrar_area_minima_false_desliga_corte_sub_pixel():
    # Setores: geometrias pequenas (setores censitarios densos) precisam
    # continuar visiveis mesmo em zoom baixo/medio, entao o corte e desligado.
    db = _CapturingDB()
    geo_comum.obter_tile_mvt(
        db,
        tabela="dados.setores_2010",
        z=5, x=1, y=1,
        feature_id_sql="t.id",
        colunas_propriedades=("t.nome",),
        filtrar_area_minima=False,
    )
    assert db.ultimo_params["area_minima"] == 0.0
