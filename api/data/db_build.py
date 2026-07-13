import gc
import os
import geopandas as gpd
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def ler_parquet_geo(caminho_parquet):
    """Le um parquet com geometria, com ou sem metadado GeoParquet.

    Arquivos gravados com GeoDataFrame.to_parquet trazem o metadado 'geo' e
    sao lidos direto pelo geopandas. Arquivos gravados com
    pandas.DataFrame.to_parquet (caso dos datasets recebidos a partir de
    2026-07) trazem a geometria como bytes WKB sem metadado 'geo', o que faz
    gpd.read_parquet falhar — nesse caso o WKB e decodificado manualmente.
    Sem o metadado tambem nao ha CRS gravado; o chamador e responsavel por
    definir o CRS quando ausente.
    """
    try:
        return gpd.read_parquet(caminho_parquet)
    except ValueError:
        pass

    df = pd.read_parquet(caminho_parquet)
    coluna_geom = next((c for c in df.columns if c.lower() == 'geometry'), None)
    if coluna_geom is None:
        raise ValueError(
            f"Arquivo {caminho_parquet} nao tem metadado GeoParquet nem coluna de geometria ('geometry')."
        )
    df[coluna_geom] = gpd.GeoSeries.from_wkb(df[coluna_geom])
    return gpd.GeoDataFrame(df, geometry=coluna_geom)

def criar_indices_espaciais(engine, tabelas, nome_coluna_geom, schema='dados'):
    """Cria os índices espaciais GIST para as tabelas informadas"""
    with engine.begin() as conn:
        for tabela in tabelas:
            print(f"Criando índice espacial em {schema}.{tabela} na coluna '{nome_coluna_geom}'...")
            conn.execute(text(f"DROP INDEX IF EXISTS {schema}.idx_{tabela}_{nome_coluna_geom};"))
            conn.execute(text(
                f"CREATE INDEX idx_{tabela}_{nome_coluna_geom} "
                f"ON {schema}.{tabela} USING GIST ({nome_coluna_geom});"
            ))
            conn.execute(text(f"ANALYZE {schema}.{tabela};"))
    print("Índices espaciais criados.")

def criar_indice_b_tree(engine, tabela, coluna, schema='dados'):
    """Cria um índice padrão B-Tree para colunas de texto/atributos"""
    with engine.begin() as conn:
        print(f"Criando índice convencional em {schema}.{tabela} na coluna '{coluna}'...")
        conn.execute(text(f"DROP INDEX IF EXISTS {schema}.idx_{tabela}_{coluna};"))
        conn.execute(text(
            f"CREATE INDEX idx_{tabela}_{coluna} "
            f"ON {schema}.{tabela} ({coluna});"
        ))
        conn.execute(text(f"ANALYZE {schema}.{tabela};"))

def get_engine():
    """Cria a conexão com o banco usando as variáveis de ambiente"""
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASS')
    host = os.getenv('DB_HOST')
    port = os.getenv('DB_PORT')
    db = os.getenv('DB_NAME')

    url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    return create_engine(url)

def processar_e_salvar_tabelas(caminho_parquet):
    print(f"Lendo arquivo: {caminho_parquet}...")

    gdf = ler_parquet_geo(caminho_parquet)
    # Transforma os nomes das colunas para minúsculo
    gdf.columns = [c.lower() for c in gdf.columns]

    # Remove coluna geom duplicada caso exista (mantém apenas geometry principal)
    if 'geom' in gdf.columns:
        gdf = gdf.drop(columns=['geom'])
        print("Coluna 'geom' removida. Mantendo apenas a geometria principal.")

    # Identifica o nome da coluna geométrica ativa (geopandas usa 'geometry')
    coluna_geometrica = gdf.geometry.name
    print(f"Coluna geométrica ativa: '{coluna_geometrica}'")

    # Dado é SIRGAS 2000 (EPSG:4674). Rotular como 4326 corromperia o SRID.
    if gdf.crs is None:
        gdf.set_crs(epsg=4674, inplace=True)

    print(f"Dados carregados. Total de registros: {len(gdf)}")

    gdf['code_tract'] = gdf['code_tract'].astype(str)
    gdf['code_muni'] = gdf['code_muni'].astype(str)

    # ── Filtros por tabela ────────────────────────────────────────────────────
    # Cada recorte é gerado uma vez por ano (2010 e 2022), resultando em 6
    # tabelas: <recurso>_2010 e <recurso>_2022. O filtro (recurso + ano) é
    # aplicado direto sobre `gdf` e o recorte é salvo e liberado da memória
    # antes do próximo, para não reter várias cópias de ~7M linhas ao mesmo
    # tempo (setores_2022 sozinho já é quase o dataset inteiro).

    ANOS = (2010, 2022)

    FILTROS_RECURSO = (
        ('setores', lambda gdf: gdf['code_tract'].str.len() == 15),
        ('municipios', lambda gdf: (gdf['code_tract'] == 'Total') & (gdf['code_muni'].str.len() == 7)),
        ('reg_metropo', lambda gdf: (gdf['code_tract'] == 'Total') & (gdf['code_muni'] == 'Total')),
    )

    # ── Gravação no PostGIS ───────────────────────────────────────────────────
    engine = get_engine()
    print("\nIniciando upload para o PostGIS...")

    def salvar_no_banco(df_recorte, nome_tabela):
        if df_recorte.empty:
            print(f"Aviso: recorte para '{nome_tabela}' resultou em 0 linhas. Pulando.")
            return False

        # O to_postgis (GeoAlchemy2) cria automaticamente um índice GIST chamado
        # idx_<tabela>_<coluna_geom> junto com a tabela. Se esse nome já pertence
        # a outra relação (ex.: índice herdado por uma tabela renomeada para
        # *_old), o CREATE TABLE falha com DuplicateTable. Libera o nome antes.
        with engine.begin() as conn:
            conn.execute(text(f"DROP INDEX IF EXISTS dados.idx_{nome_tabela}_{coluna_geometrica};"))

        print(f"Subindo tabela '{nome_tabela}'...")
        df_recorte.to_postgis(
            name=nome_tabela,
            con=engine,
            if_exists='replace',
            index=False,
            schema='dados',
            chunksize=50_000,
        )
        print(f"Sucesso! Tabela '{nome_tabela}' salva.")
        return True

    tabelas_criadas = []
    for nome_base, filtro_recurso in FILTROS_RECURSO:
        for ano in ANOS:
            df_ano = gdf[filtro_recurso(gdf) & (gdf['year'] == ano)]
            nome_tabela = f"{nome_base}_{ano}"
            n_bruto = len(df_ano)

            # Remove duplicatas exatas (mesmos atributos, ignorando a geometria).
            # Ex.: setores repetem a mesma linha várias vezes por 'unit_type'
            # ('muni'/'metro') quando o valor calculado é idêntico; linhas com
            # 'unit_type' diferente e valores distintos (ex.: dissimilarity
            # calculado por município vs. por região metropolitana) NÃO são
            # duplicatas e são preservadas.
            colunas_dedup = [c for c in df_ano.columns if c != coluna_geometrica]
            df_ano = df_ano.drop_duplicates(subset=colunas_dedup, keep='first')

            if len(df_ano) < n_bruto:
                print(f"Tabela {nome_tabela.upper()}: {n_bruto} -> {len(df_ano)} após remover duplicatas exatas.")
            else:
                print(f"Tabela {nome_tabela.upper()} -> Encontrado: {len(df_ano)}")

            if salvar_no_banco(df_ano, nome_tabela):
                tabelas_criadas.append(nome_tabela)
            del df_ano
            gc.collect()

    # ── Índices de performance ────────────────────────────────────────────────

    # GiST sobre a coluna geometry (SRID 4674) — ativa o operador && e
    # ST_Intersects via índice, evitando seq scan nas queries de tile e viewport.
    criar_indices_espaciais(engine, tabelas_criadas, coluna_geometrica)

    # B-Tree para filtros por identificador
    print("\nCriando índices convencionais...")
    COLUNA_ID_POR_RECURSO = {
        'setores': 'code_tract',
        'municipios': 'code_muni',
        'reg_metropo': 'name_metro',
    }
    for nome_tabela in tabelas_criadas:
        nome_base = nome_tabela.rsplit('_', 1)[0]
        coluna_id = COLUNA_ID_POR_RECURSO.get(nome_base)
        if coluna_id:
            criar_indice_b_tree(engine, nome_tabela, coluna_id)

    print("Processo finalizado com sucesso!")

if __name__ == "__main__":
    CAMINHO_ARQUIVO = 'sf_segregation_indices.parquet'
    processar_e_salvar_tabelas(CAMINHO_ARQUIVO)
