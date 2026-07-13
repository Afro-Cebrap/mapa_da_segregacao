import geopandas as gpd
import pandas as pd
import pytest
from shapely.geometry import Polygon

from data.db_build import ler_parquet_geo

_POLIGONO = Polygon([(0, 0), (1, 0), (1, 1), (0, 0)])


def _df_atributos():
    return pd.DataFrame(
        {
            "code_tract": ["123456789012345"],
            "code_muni": ["1234567"],
            "year": [2022.0],
        }
    )


def test_ler_parquet_geo_sem_metadado_geo(tmp_path):
    # Parquet gerado com pandas.to_parquet: geometria vira bytes WKB e o
    # metadado 'geo' do padrao GeoParquet nao existe. gpd.read_parquet
    # recusa esse arquivo; o loader precisa decodificar o WKB manualmente.
    df = _df_atributos()
    df["geometry"] = [_POLIGONO.wkb]
    caminho = tmp_path / "sem_geo.parquet"
    df.to_parquet(caminho)

    with pytest.raises(ValueError):
        gpd.read_parquet(caminho)  # confirma que o cenario reproduz o bug

    gdf = ler_parquet_geo(caminho)

    assert isinstance(gdf, gpd.GeoDataFrame)
    assert gdf.geometry.name == "geometry"
    assert gdf.geometry.iloc[0].equals(_POLIGONO)
    assert gdf["code_tract"].iloc[0] == "123456789012345"


def test_ler_parquet_geo_geoparquet(tmp_path):
    # GeoParquet legitimo (com metadado 'geo') continua funcionando e
    # preserva o CRS gravado no arquivo.
    gdf_origem = gpd.GeoDataFrame(_df_atributos(), geometry=[_POLIGONO], crs="EPSG:4674")
    caminho = tmp_path / "com_geo.parquet"
    gdf_origem.to_parquet(caminho)

    gdf = ler_parquet_geo(caminho)

    assert isinstance(gdf, gpd.GeoDataFrame)
    assert gdf.crs is not None and gdf.crs.to_epsg() == 4674
    assert gdf.geometry.iloc[0].equals(_POLIGONO)


def test_ler_parquet_geo_sem_coluna_geometria(tmp_path):
    caminho = tmp_path / "sem_geometria.parquet"
    _df_atributos().to_parquet(caminho)

    with pytest.raises(ValueError, match="geometr"):
        ler_parquet_geo(caminho)
