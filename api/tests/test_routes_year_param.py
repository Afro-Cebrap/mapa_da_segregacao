from unittest.mock import patch

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_listar_setores_usa_year_default_2010():
    with patch(
        "controllers.setores_controller.setores_repository.obter_setores",
        return_value=[],
    ) as mock_obter:
        resposta = client.get("/api/setores/")
        assert resposta.status_code == 200
        mock_obter.assert_called_once()
        _, ano = mock_obter.call_args.args
        assert ano == 2010


def test_listar_setores_aceita_year_2022():
    with patch(
        "controllers.setores_controller.setores_repository.obter_setores",
        return_value=[],
    ) as mock_obter:
        resposta = client.get("/api/setores/?year=2022")
        assert resposta.status_code == 200
        _, ano = mock_obter.call_args.args
        assert ano == 2022


def test_listar_setores_rejeita_year_invalido():
    resposta = client.get("/api/setores/?year=1999")
    assert resposta.status_code == 400


def test_listar_municipios_lista_repassa_year():
    with patch(
        "controllers.municipios_controller.municipios_repository.obter_lista_municipios",
        return_value=[],
    ) as mock_obter:
        resposta = client.get("/api/municipios/lista?year=2022")
        assert resposta.status_code == 200
        _, ano = mock_obter.call_args.args
        assert ano == 2022


def test_tile_reg_metro_rejeita_year_invalido():
    resposta = client.get("/api/reg_metro/tiles/5/10/12.pbf?year=1999")
    assert resposta.status_code == 400
