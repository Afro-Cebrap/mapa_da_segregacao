import os
import argparse
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def get_engine():
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASS')
    host = os.getenv('DB_HOST')
    port = os.getenv('DB_PORT')
    db = os.getenv('DB_NAME')
    url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
    return create_engine(url)

def simplificar_no_banco(tolerancia, tabela_origem, tabela_destino, schema='dados'):
    engine = get_engine()

    # Cria tabela simplificada com todas as colunas do schema atual.
    # ST_SimplifyPreserveTopology evita que polígonos pequenos sumam ou gerem
    # auto-intersecções; a geometria resultante mantém o SRID 4674 da origem.
    query = text(f"""
        CREATE TABLE {schema}.{tabela_destino} AS
        SELECT
            code_tract,
            code_muni,
            name_muni,
            code_neighborhood,
            name_neighborhood,
            code_district,
            name_district,
            code_subdistrict,
            name_subdistrict,
            zone,
            code_state,
            abbrev_state,
            name_state,
            code_region,
            name_region,
            year,
            name_metro,
            unit_id,
            unit_type,
            dissimilarity,
            index_h,
            exp_branca_pp,
            exp_pp_branca,
            iso_branca_branca,
            iso_pp_pp,
            n_branca,
            n_preta,
            n_parda,
            n_amarela,
            n_indigena,
            n_preta_ou_parda,
            n_total,
            percent_branca,
            percent_preta,
            percent_parda,
            percent_amarela,
            percent_indigena,
            percent_preta_ou_parda,
            ST_SimplifyPreserveTopology(geometry, :tol) AS geometry
        FROM {schema}.{tabela_origem};
    """)

    print(f"Executando simplificação no servidor (tolerância: {tolerancia})...")

    with engine.begin() as conn:
        conn.execute(text(f"DROP TABLE IF EXISTS {schema}.{tabela_destino};"))
        conn.execute(query, {"tol": tolerancia})

        # GiST sobre geometry (SRID 4674) — mesmo padrão da tabela base.
        # Ativa o operador && e ST_Intersects via índice nas queries de tile e viewport.
        print(f"Criando índice GiST em {schema}.{tabela_destino}.geometry...")
        conn.execute(text(
            f"CREATE INDEX idx_{tabela_destino}_geometry "
            f"ON {schema}.{tabela_destino} USING GIST (geometry);"
        ))
        conn.execute(text(f"ANALYZE {schema}.{tabela_destino};"))

    print(f"Sucesso! Tabela '{schema}.{tabela_destino}' criada.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Simplifica geometrias usando SQL nativo PostGIS.')
    parser.add_argument('tolerancia', type=float, help='Nível de simplificação (ex: 0.001)')
    parser.add_argument('--origem', type=str, default='setores_2010', help='Tabela de origem (ex: setores_2010)')
    parser.add_argument('--destino', type=str, help='Tabela de destino')

    args = parser.parse_args()
    tabela_out = args.destino if args.destino else f"{args.origem}_simplified"

    simplificar_no_banco(args.tolerancia, args.origem, tabela_out)
