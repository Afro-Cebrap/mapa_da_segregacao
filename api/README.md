# API — Mapa da Segregação

FastAPI backend servindo dados de segregação racial por setor censitário, município e região metropolitana via JSON e tiles vetoriais (MVT/Protobuf).

**Produção:** https://painel-api-2olyn5cqxq-uc.a.run.app/docs

## Stack

- Python 3.11+, FastAPI, Uvicorn
- SQLAlchemy + GeoAlchemy2 (ORM + spatial)
- PostgreSQL 15 + PostGIS (Cloud SQL em produção, Docker local)
- Pydantic (schemas de resposta)

## Desenvolvimento local

**Pré-requisito:** Docker Desktop rodando.

```bash
# 1. Banco local (PostGIS :5433 + pgAdmin :8081)
cd api
docker compose up -d

# 2. Instalar dependências
venv1\Scripts\python -m pip install -r requirements.txt

# 3. Criar api/.env a partir do exemplo
copy .env.example .env

# 4. Rodar a API
venv1\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Swagger: http://127.0.0.1:8000/docs

## Testes

```bash
cd api
venv1\Scripts\python -m pytest tests -v
```

## Arquitetura interna

```
routes/         HTTP — APIRouter, validação de params, serialização
controllers/    Orquestração entre rota e repositório
repositories/   Queries ORM e SQL nativo para MVT
  geo_comum.py  Utilitários espaciais compartilhados (viewport, MVT, zoom)
models/         SQLAlchemy ORM (tabela dados.setores, etc.)
schemas/        Pydantic — contratos de resposta
db/             Engine SQLAlchemy + dependency get_db
data/           Scripts offline (ingestão parquet, simplificação de geometria)
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/setores/tiles/{z}/{x}/{y}.pbf` | Tile MVT de setores censitários |
| GET | `/api/setores/viewport` | GeoJSON por bbox |
| GET | `/api/setores/indicadores` | Métricas sem geometria (ranking) |
| GET | `/api/setores/escala` | Percentis de métrica por escopo |
| GET | `/api/municipios/tiles/{z}/{x}/{y}.pbf` | Tile MVT de municípios |
| GET | `/api/municipios/lista` | Lista leve (sem geometria) com bbox |
| GET | `/api/municipios/indicadores` | Métricas sem geometria (ranking) |
| GET | `/api/reg_metro/tiles/{z}/{x}/{y}.pbf` | Tile MVT de RMs |
| GET | `/api/reg_metro/indicadores` | Métricas sem geometria (ranking) |

Tiles retornam `application/x-protobuf`, `Cache-Control: max-age=86400` e `204` para tiles vazios.

## Variáveis de ambiente

```env
# api/.env (local)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=banco-segreg
DB_USER=usuario-painel
DB_PASS=senha

# Em produção (Cloud Run), DB_PASS vem do Secret Manager e
# INSTANCE_CONNECTION_NAME conecta via unix socket /cloudsql/...
```

## Ingestão de dados

```bash
# Ingerir parquet no banco local
cd api
venv1\Scripts\python data/db_build.py

# Criar tabelas simplificadas para tiles em zoom baixo
venv1\Scripts\python data/simplify_table.py

# Ingerir direto no Cloud SQL via Auth Proxy
./deploy/gcp/ingest-local.sh
```
