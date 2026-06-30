#!/usr/bin/env bash
# Ingestão one-shot do parquet no Cloud SQL via Cloud SQL Auth Proxy.
# Reusa api/data/db_build.py + simplify_table.py. Rodar quando o dataset mudar.
set -euo pipefail
cd "$(dirname "$0")"

PROJECT_INFRA="${PROJECT_INFRA:-painel-segregacao-001}"
REGION="${REGION:-us-central1}"
INSTANCE="${INSTANCE:-painel-segreg-pg}"
DB_NAME="${DB_NAME:-banco-segreg}"
DB_USER="${DB_USER:-usuario-painel}"
LOCAL_PORT="${LOCAL_PORT:-5433}"

CONN_NAME="${PROJECT_INFRA}:${REGION}:${INSTANCE}"
PARQUET_DIR="$(cd ../../api/data && pwd)"
PARQUET="${PARQUET_DIR}/sf_segregation_indices.parquet"
PY="$(cd ../../api && pwd)/venv1/Scripts/python"

[ -f "$PARQUET" ] || { echo "ERRO: parquet não encontrado em $PARQUET"; exit 1; }
[ -x "$PY" ] || PY="$(cd ../../api && pwd)/venv1/bin/python" # fallback linux/mac

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
PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -p "$LOCAL_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c 'CREATE SCHEMA IF NOT EXISTS dados;' \
  -c 'CREATE EXTENSION IF NOT EXISTS postgis;'

echo ">>> Ingestão (db_build.py) — pode levar alguns minutos"
( cd "$PARQUET_DIR" && "$PY" db_build.py )

echo ">>> Simplificação da RM (simplify_table.py)"
( cd "$PARQUET_DIR" && "$PY" simplify_table.py 0.001 --origem reg_metropo --destino reg_metropo_simplified )

echo ">>> Ingestão concluída."
