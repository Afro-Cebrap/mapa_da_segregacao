# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo is a monorepo with three independent pieces:

- `api/` — FastAPI backend (Python) serving census-tract data and vector tiles from PostgreSQL/PostGIS. **No longer deployed.** It now exists as a local development and validation artifact: the parity validator (`pipeline/validate.py`) diffs the static pipeline's output against it, and it stays useful for ad-hoc local queries against the database. See "Backend (`api/`) — local-only" below.
- `pipeline/` — the Python pipeline that reads the source parquet and produces the static artifacts (`.pmtiles` tiles, JSON rankings/scales/lookups) that reach production. This is how data actually gets to users now — see `pipeline/README.md` for the operator runbook.
- `app/` — React 19 + TypeScript + Vite frontend, packaged with bun. Static deploy via Firebase Hosting. Reads tiles and JSON directly from a public Cloud Storage bucket (`VITE_DATA_URL`); no backend call in production.

There is no top-level build/test runner — all commands run from inside `api/`, `pipeline/`, or `app/`.

## Backend (`api/`) — local-only

`api/` is not deployed anywhere. It used to be the production API behind
Cloud Run; that stack is superseded (see `deploy/gcp/README.md` and
`deploy/gcp/terraform-static/README.md`). Today it serves two purposes:

1. **Parity validation.** `pipeline/validate.py` runs against a locally-running
   instance of this API to confirm the static pipeline's output matches what
   the old live queries produced, before anything is published.
2. **Local exploration** of the PostGIS data model, if you still have the
   local Docker Postgres stack up.

### Run / develop

The venv lives at `api/venv1`. Run uvicorn from inside `api/` so relative imports (`from routes...`, `from controllers...`, `from db.connection...`) resolve:

```bash
cd api
venv1\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Install / reinstall deps:
```bash
api\venv1\Scripts\python -m pip install -r api\requirements.txt
```

Local DB stack (PostGIS + pgAdmin) via `api/docker-compose.yml`:
```bash
cd api && docker compose up -d
```
PostGIS exposes `localhost:5433`; pgAdmin at `http://localhost:8081` (`admin@admin.com` / `admin`). Connection settings come from `api/.env` (see `api/.env.example`).

Swagger docs: `http://127.0.0.1:8000/docs`.

There is a small pytest suite at `api/tests/` covering pure helpers in `geo_comum.py`; run from inside `api/`: `venv1\Scripts\python -m pytest tests -v`. No linter configured.

### Architecture

Layered FastAPI app, wired in `api/app.py` via `criar_aplicacao()`:

```
routes/       HTTP layer (APIRouter, request parsing, response envelope)
controllers/  Orchestration between routes and repositories
repositories/ SQLAlchemy ORM queries + raw SQL for spatial / MVT work
              repositories/geo_comum.py — shared viewport/MVT/zoom-resolution module
              that the three resource repositories (setores, municipios, reg_metro) delegate to
models/       SQLAlchemy ORM models (table `dados.setores`, etc.)
schemas/      Pydantic response contracts
db/           SQLAlchemy engine + `get_db` dependency
data/         Offline scripts (parquet ingest, geometry simplification)
```

Routers (`setores`, `municipios`, `reg_metro`) are all mounted under `/api/...`.

### Geometry / spatial behavior (important context)

- Source data is loaded into schema `dados`, primarily table `dados.setores` (and friends like `dados.municipios`, `dados.regioes_metropolitanas`). The README mentions `dados.setores_censitarios` but the live repository targets `dados.setores` — trust the code (`repositories/setores_repository.py`).
- Geometries are stored in their native SRID and **always transformed to EPSG:4326 on output** for GeoJSON, and to EPSG:3857 for MVT tiles.
- Zoom-aware table resolution lives in `geo_comum.resolver_tabela_por_zoom`, with one canonical table per bucket defined per repository: `dados.<recurso>_ultra_simplified` (z<8), `dados.<recurso>_simplified` (z<12), base table (z≥12). RM uses `dados.reg_metropo_simplified` for both low and mid buckets. Missing simplified tables fall back to the base table with a logged warning. Ingestion (`db_build.py` + `simplify_table.py`, or the VM ingest service) creates the simplified tables and GIST indexes. When you change column lists for `/viewport` or `/tiles`, every candidate table must expose those columns.
- The canonical attribute list for viewport responses is `geo_comum.CAMPOS_SEGREG`. Tiles emit `geo_comum.CAMPOS_METRICAS_TILE` plus per-layer identifier/name columns defined in each repository's `PROPRIEDADES_TILE`. Low-zoom tiles (z<8) drop sub-pixel features via `area_minima_para_zoom`.
- Tile endpoints (`/api/setores/tiles/`, `/api/municipios/tiles/`, `/api/reg_metro/tiles/`) return `application/x-protobuf`, with `Cache-Control: max-age=86400`, and `204 No Content` for empty tiles. MVT geometry is built with `ST_AsMVTGeom(... 4096, 64, true)` and all three resources emit layer name `setores_layer`.

### Offline data scripts

`data/db_build.py` ingests `sf_segregation_indices_corrigido.parquet` into PostGIS. `data/simplify_table.py` creates simplified geometry tables (used by the zoom-bucket resolver). Both read DB credentials from `api/.env`. Run them as standalone scripts from inside `api/`. Neither is part of the production data path any more — that's `pipeline/`, below.

## Pipeline (`pipeline/`)

Reads the source parquet and produces every static artifact the frontend
consumes, then uploads them to a public Cloud Storage bucket. Runs in Docker
(tippecanoe has no Windows build) via `docker compose run --rm pipeline`.
Full operator runbook — prerequisites, the zoom/simplification tension,
parity validation against the local `api/`, and publishing to staging vs.
production — is in `pipeline/README.md`. Infra for the bucket itself lives
in `deploy/gcp/terraform-static/`, documented in
`deploy/gcp/terraform-static/README.md`.

```
build.py      Reads the parquet, writes GeoJSONSeq + JSON (meta/scopes/manifest)
tiles.sh      Runs tippecanoe over each GeoJSONSeq to produce .pmtiles
validate.py   Diffs generated artifacts against the live api/ (pre-publish check)
upload.sh     Syncs tiles/meta/scopes + the manifest to a bucket
```

There is a pytest suite at `pipeline/tests/`; run from the repo root with the
API's existing venv (it already has pytest, geopandas, pandas, pyarrow,
numpy and shapely, which is everything the test suite touches):
`api\venv1\Scripts\python -m pytest pipeline\tests -v`. `pipeline/` has its
own `requirements.txt` for a dedicated venv or the Docker image, but no
separate venv has been set up in this repo.

## Frontend (`app/`)

Uses **bun** as package manager and runner (do not use npm/yarn — `bun.lock` is the source of truth).

```bash
cd app
bun install
bun dev               # vite dev server on http://localhost:3000
bun run build         # production build into dist/
bun run preview       # serve dist/
bun run lint          # eslint
bun run test          # vitest run
bun run test:watch    # vitest, watch mode
bun run format        # prettier --write
bun run format:check  # prettier --check
```

### Architecture

- `src/main.tsx` → `src/App.tsx` (providers: TanStack Query, ThemeProvider, RouterProvider) → `src/Routes.tsx` (defines the two real routes; everything else `Navigate`s to `/`).
- Two pages: `pages/Home.tsx` (landing, under `MainLayout`) and `pages/Dashboard.tsx` (map UI, under `DashboardLayout`).
- Static data integration (no backend calls in production — this changed with the pmtiles migration; there is no `src/services/api.ts`/axios instance any more):
  - `src/services/staticData/config.ts` — `dataBaseUrl` from `VITE_DATA_URL` (defaults to `http://localhost:3000/data` for local dev against a served `pipeline/out`), plus `dataUrl(path)` to join it with an artifact path.
  - `src/services/staticData/client.ts` — `staticDataService`, typed fetch wrappers over the static JSON artifacts (municípios lista, rankings, per-scope setor rows + scale breaks). Throws `StaticDataHttpError` (carries the HTTP status) so callers can tell a real 404 apart from a network/CORS failure.
  - `src/services/setores/Setores.services.ts` — `getSegregationTileUrl` / `buildTileUrl` build `pmtiles://` URLs pointing at `<dataBaseUrl>/tiles/<archive>_<year>.pmtiles`; `main.tsx` registers the `pmtiles` protocol with MapLibre via the `pmtiles` package.
  - `src/hooks/useSetores.ts` — TanStack Query hooks over the static client: `useMetroSlugs` (the reg_metro slug index, cached for the session), `useSetoresScope` (one scope file serves both ranking rows and scale breaks), `useEscalaSetores`.
  - `src/hooks/useLocationLookups.ts` — fetches `meta/municipios_lista_<year>.json` (no geometry) and builds the sidebar's location lookups client-side.
- Path alias: `@/...` → `app/src/...` (configured in `vite.config.ts` and `tsconfig.app.json`).
- Styling: Tailwind CSS 4 via `@tailwindcss/vite` (no `tailwind.config.*` — config lives in `src/index.css`). UI primitives from Radix UI / shadcn under `src/components/ui/`. Use `cn(...)` from `src/lib/utils.ts` for class merging.
- Map: MapLibre GL via `@vis.gl/react-maplibre`. All three map layers (setores, municípios, RMs) render from the static `.pmtiles` archives via `getSegregationTileUrl`.
- Prettier config (`.prettierrc.json`): tabs, single quotes, semicolons, trailing commas — `bun run format` before committing.

### Deploy

Static deploy to Firebase Hosting from `app/dist/`:
```bash
cd app && bun run build && firebase deploy --only hosting
```
`.firebaserc` and `firebase.json` are checked in.

## Conventions

- Repository language is Portuguese (pt-BR) for identifiers, comments, and docs (`obter_setores`, `criar_aplicacao`, route descriptions). Match the existing language when adding code; don't translate symbols.
- Default git branch is `develop`; PRs target `main`.
