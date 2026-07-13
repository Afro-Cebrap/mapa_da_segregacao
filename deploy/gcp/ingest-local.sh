#!/usr/bin/env bash
# Ingestão one-shot do parquet no Cloud SQL via Cloud SQL Auth Proxy.
# Reusa api/data/db_build.py + simplify_table.py. Rodar quando o dataset mudar.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT_INFRA="${PROJECT_INFRA:-mapa-da-segregacao}"
REGION="${REGION:-us-central1}"
INSTANCE="${INSTANCE:-painel-segreg-pg}"
DB_NAME="${DB_NAME:-banco-segreg}"
DB_USER="${DB_USER:-usuario-painel}"
# 5435 para não colidir com os Postgres locais do Docker (5432-5434).
LOCAL_PORT="${LOCAL_PORT:-5435}"

CONN_NAME="${PROJECT_INFRA}:${REGION}:${INSTANCE}"
PARQUET_DIR="$(cd ../../api/data && pwd)"
# Mesmo arquivo que db_build.py lê (CAMINHO_ARQUIVO).
PARQUET="${PARQUET_DIR}/sf_segregation_indices.parquet"
PY="$(cd ../../api && pwd)/venv-segreg/Scripts/python"

[ -f "$PARQUET" ] || { echo "ERRO: parquet não encontrado em $PARQUET"; exit 1; }
[ -x "$PY" ] || PY="$(cd ../../api && pwd)/venv-segreg/bin/python" # fallback linux/mac

echo ">>> Lendo senha do Secret Manager"
DB_PASS="$(gcloud secrets versions access latest --secret=db-password --project="$PROJECT_INFRA")"

echo ">>> Subindo cloud-sql-proxy em 127.0.0.1:${LOCAL_PORT} para ${CONN_NAME}"
cloud-sql-proxy --port "$LOCAL_PORT" "$CONN_NAME" &
PROXY_PID=$!
trap 'kill "$PROXY_PID" 2>/dev/null || true' EXIT
sleep 6

export DB_HOST=127.0.0.1
export DB_PORT="$LOCAL_PORT"
export DB_NAME DB_USER DB_PASS

echo ">>> Garantindo schema 'dados' e extensão PostGIS"
# Via python/sqlalchemy (mesmo venv da ingestão) — dispensa psql instalado.
"$PY" - <<'PYEOF'
import os
from sqlalchemy import create_engine, text
url = (
    f"postgresql://{os.environ['DB_USER']}:{os.environ['DB_PASS']}"
    f"@{os.environ['DB_HOST']}:{os.environ['DB_PORT']}/{os.environ['DB_NAME']}"
)
with create_engine(url).begin() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS dados;"))
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
print("schema 'dados' + extensão postgis OK")
PYEOF

echo ">>> Ingestão (db_build.py) — pode levar vários minutos"
( cd "$PARQUET_DIR" && "$PY" db_build.py )

# Uma _simplified por tabela base (tol 0.001) — o resolver por zoom usa
# dados.<recurso>_<ano>_simplified para z<12 e a base para z>=12.
echo ">>> Simplificação das 6 tabelas (simplify_table.py)"
for TABELA in setores_2010 setores_2022 municipios_2010 municipios_2022 reg_metropo_2010 reg_metropo_2022; do
  echo ">>>   ${TABELA} -> ${TABELA}_simplified"
  ( cd "$PARQUET_DIR" && "$PY" simplify_table.py 0.001 --origem "$TABELA" --destino "${TABELA}_simplified" )
done

echo ">>> Ingestão concluída."
