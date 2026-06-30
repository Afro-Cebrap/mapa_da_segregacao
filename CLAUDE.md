# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo is a monorepo with two independent applications:

- `api/` — FastAPI backend (Python) serving census-tract data and vector tiles from PostgreSQL/PostGIS.
- `app/` — React 19 + TypeScript + Vite frontend, packaged with bun. Static deploy via Firebase Hosting.

There is no top-level build/test runner — all commands run from inside `api/` or `app/`.

## Backend (`api/`)

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

`data/db_build.py` ingests `sf_segregation_indices_corrigido.parquet` into PostGIS. `data/simplify_table.py` creates simplified geometry tables (used by the zoom-bucket resolver). Both read DB credentials from `api/.env`. Run them as standalone scripts from inside `api/`.

## Frontend (`app/`)

Uses **bun** as package manager and runner (do not use npm/yarn — `bun.lock` is the source of truth).

```bash
cd app
bun install
bun dev               # vite dev server on http://localhost:3000
bun run build         # production build into dist/
bun run preview       # serve dist/
bun run lint          # eslint
bun run format        # prettier --write
bun run format:check  # prettier --check
```

No test runner is configured.

### Architecture

- `src/main.tsx` → `src/App.tsx` (providers: TanStack Query, ThemeProvider, RouterProvider) → `src/Routes.tsx` (defines the two real routes; everything else `Navigate`s to `/`).
- Two pages: `pages/Home.tsx` (landing, under `MainLayout`) and `pages/Dashboard.tsx` (map UI, under `DashboardLayout`).
- API integration:
  - `src/services/api.ts` — Axios instance. `baseURL` from `VITE_API_URL` (defaults to `http://127.0.0.1:8000`); optional `VITE_API_KEY` becomes `x-api-key`; injects `Authorization: Bearer <token>` from `sessionStorage` if present.
  - `src/services/setores/Setores.services.ts` — typed wrappers over the `/api/setores` endpoints.
  - `src/hooks/useSetores.ts` — TanStack Query hooks. `useSetoresViewport` is the load-on-pan-end hook used by the dashboard; it **buckets zoom into low/mid/high and rounds bbox precision per bucket** (`getBboxPrecision`) so the React Query cache key is stable across small map nudges. Preserve this normalization when adding viewport-driven layers — without it, every micro-pan is a cache miss.
- Path alias: `@/...` → `app/src/...` (configured in `vite.config.ts` and `tsconfig.app.json`).
- Styling: Tailwind CSS 4 via `@tailwindcss/vite` (no `tailwind.config.*` — config lives in `src/index.css`). UI primitives from Radix UI / shadcn under `src/components/ui/`. Use `cn(...)` from `src/lib/utils.ts` for class merging.
- Map: MapLibre GL via `@vis.gl/react-maplibre`. When `VITE_USE_MOCKS=false`, all three map layers (setores, municípios, RMs) render from backend vector tiles via `getSegregationTileUrl`; mock mode keeps the GeoJSON path. Sidebar location lookups use the lightweight `GET /api/municipios/lista` (no geometry) instead of downloading the full GeoJSON.
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
