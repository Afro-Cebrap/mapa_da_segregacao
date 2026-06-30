# Painel Segregacao - Backend

API em FastAPI responsavel por disponibilizar dados de setores censitarios e tiles vetoriais para o painel.

O backend foi organizado em camadas simples:

- rotas FastAPI
- controllers
- repositories
- models ORM
- schemas Pydantic
- conexao com PostgreSQL/PostGIS

## Stack

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- PostgreSQL + PostGIS
- GeoAlchemy2
- GeoPandas
- Pandas

## Estrutura

- `app.py`: cria a aplicacao FastAPI, registra middleware e inclui as rotas
- `db/connection.py`: conexao com o banco e dependency `get_db`
- `routes/setores_routes.py`: endpoints HTTP de setores
- `controllers/setores_controller.py`: orquestracao entre rota e repositorio
- `repositories/setores_repository.py`: queries ORM e SQL nativo para MVT
- `models/setores_model.py`: mapeamento da tabela `dados.setores_censitarios`
- `schemas/setores_schema.py`: contrato de resposta serializado pela API
- `data/db_build.py`: carga de dados parquet para o PostGIS
- `data/simplify_table.py`: criacao de tabelas com geometria simplificada
- `docker-compose.yml`: ambiente local com PostGIS e pgAdmin

## Banco de dados

A API espera uma base PostgreSQL com extensoes espaciais e uma tabela principal:

- schema: `dados`
- tabela: `setores_censitarios`

Campos principais esperados:

- identificacao territorial: `code_muni`, `cod_setor`
- totais populacionais: `n_total`, `n_branca`, `n_preta_ou_parda`, `n_preta`, `n_amarela`, `n_parda`, `n_indigena`
- percentuais: `percent_branca`, `percent_preta_ou_parda`, `percent_preta`, `percent_amarela`, `percent_parda`, `percent_indigena`
- indicadores: `dissimil`, `entropy`, `index_h`
- geometria: `geometry` em `MULTIPOLYGON` com SRID `4674` (SIRGAS 2000)

Observacao:

- a API transforma a geometria para `EPSG:4326` ao responder GeoJSON para consumo no frontend

## Configuracao

### Variaveis de ambiente

Crie um arquivo `.env` em `api/` com base em `.env.example`:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=banco-segreg
DB_USER=usuario-painel
DB_PASS=senha
```

### Banco local com Docker

```bash
cd api
docker compose up -d
```

Servicos disponiveis:

- PostgreSQL/PostGIS: `localhost:5433`
- pgAdmin: `http://localhost:8081`

Credenciais padrao do pgAdmin:

- usuario: `admin@admin.com`
- senha: `admin`

## Como rodar a API

### Usando `.venv`

Na raiz do repositorio:

```bash
py -m venv .venv
.\.venv\Scripts\python -m pip install -r api\requirements.txt
cd api
..\.venv\Scripts\python -m uvicorn app:app --reload
```

Se estiver executando o comando manualmente no Windows, use:

```bash
cd api
..\.venv\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

A API fica disponivel em:

- `http://127.0.0.1:8000`
- documentacao Swagger: `http://127.0.0.1:8000/docs`
- contrato OpenAPI: `http://127.0.0.1:8000/openapi.json`

## Endpoints

### `GET /api/setores/`

Retorna todos os setores censitarios cadastrados, com atributos numericos e geometria em GeoJSON.

### `GET /api/setores/municipio?codMunicipio=3550308`

Retorna os setores filtrados por codigo do municipio.

Parametro esperado:

- `codMunicipio`: codigo do municipio enviado como query string

### `GET /api/setores/viewport?bbox=minLng,minLat,maxLng,maxLat&zoom=10`

Retorna os setores visiveis na area atual do mapa em formato GeoJSON `FeatureCollection`.

Parametros esperados:

- `bbox`: bounds no formato `minLng,minLat,maxLng,maxLat`
- `zoom`: nivel de zoom atual do mapa

Comportamento:

- escolhe automaticamente uma tabela simplificada por faixa de zoom, quando ela existir
- faz fallback para `dados.setores_censitarios` quando as tabelas simplificadas nao estiverem disponiveis
- cada feature inclui os campos usados hoje no frontend para estilo tematico e popup

### `GET /api/setores/tiles/{z}/{x}/{y}.pbf`

Retorna um tile vetorial Mapbox Vector Tile para consumo cartografico.

Comportamento:

- responde com `application/x-protobuf`
- retorna `204` quando o tile nao possui feicoes
- adiciona cache header com `max-age=3600`
