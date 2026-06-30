import os
import geopandas as gpd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def criar_indices_espaciais(engine, tabelas, nome_coluna_geom, schema='dados'):
    """Cria os índices espaciais GIST para as tabelas informadas"""
    with engine.begin() as conn:
        for tabela in tabelas:
            print(f"Criando índice espacial em {schema}.{tabela} na coluna '{nome_coluna_geom}'...")
            conn.execute(text(
                f"CREATE INDEX IF NOT EXISTS idx_{tabela}_{nome_coluna_geom} "
                f"ON {schema}.{tabela} USING GIST ({nome_coluna_geom});"
            ))
            conn.execute(text(f"ANALYZE {schema}.{tabela};"))
    print("Índices espaciais criados.")

def criar_indice_b_tree(engine, tabela, coluna, schema='dados'):
    """Cria um índice padrão B-Tree para colunas de texto/atributos"""
    with engine.begin() as conn:
        print(f"Criando índice convencional em {schema}.{tabela} na coluna '{coluna}'...")
        conn.execute(text(
            f"CREATE INDEX IF NOT EXISTS idx_{tabela}_{coluna} "
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

    gdf = gpd.read_parquet(caminho_parquet)
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

    # setores: code_tract com 15 dígitos
    gdf_setores = gdf[gdf['code_tract'].str.len() == 15]
    print(f"Tabela SETORES (Esperado: ~316.545) -> Encontrado: {len(gdf_setores)}")

    # municipios: code_tract = 'Total' e code_muni com 7 dígitos
    gdf_municipios = gdf[(gdf['code_tract'] == 'Total') & (gdf['code_muni'].str.len() == 7)]
    print(f"Tabela MUNICIPIOS (Esperado: ~5.565) -> Encontrado: {len(gdf_municipios)}")

    # reg_metropo: code_tract = 'Total' e code_muni = 'Total'
    gdf_reg_metropo = gdf[(gdf['code_tract'] == 'Total') & (gdf['code_muni'] == 'Total')]
    print(f"Tabela REG_METROPO (Esperado: ~46) -> Encontrado: {len(gdf_reg_metropo)}")

    # ── Gravação no PostGIS ───────────────────────────────────────────────────
    engine = get_engine()
    print("\nIniciando upload para o PostGIS...")

    def salvar_no_banco(df_recorte, nome_tabela):
        if df_recorte.empty:
            print(f"Aviso: recorte para '{nome_tabela}' resultou em 0 linhas. Pulando.")
            return False

        print(f"Subindo tabela '{nome_tabela}'...")
        df_recorte.to_postgis(
            name=nome_tabela,
            con=engine,
            if_exists='replace',
            index=False,
            schema='dados'
        )
        print(f"Sucesso! Tabela '{nome_tabela}' salva.")
        return True

    tabelas_criadas = [
        nome_tabela
        for df_recorte, nome_tabela in (
            (gdf_setores,    'setores'),
            (gdf_municipios, 'municipios'),
            (gdf_reg_metropo,'reg_metropo'),
        )
        if salvar_no_banco(df_recorte, nome_tabela)
    ]

    # ── Índices de performance ────────────────────────────────────────────────

    # GiST sobre a coluna geometry (SRID 4674) — ativa o operador && e
    # ST_Intersects via índice, evitando seq scan nas queries de tile e viewport.
    criar_indices_espaciais(engine, tabelas_criadas, coluna_geometrica)

    # B-Tree para filtros por identificador
    print("\nCriando índices convencionais...")
    if 'setores' in tabelas_criadas:
        criar_indice_b_tree(engine, 'setores', 'code_tract')

    if 'municipios' in tabelas_criadas:
        criar_indice_b_tree(engine, 'municipios', 'code_muni')

    if 'reg_metropo' in tabelas_criadas:
        criar_indice_b_tree(engine, 'reg_metropo', 'name_metro')

    print("Processo finalizado com sucesso!")

if __name__ == "__main__":
    CAMINHO_ARQUIVO = 'sf_segregation_indices.parquet'
    processar_e_salvar_tabelas(CAMINHO_ARQUIVO)
