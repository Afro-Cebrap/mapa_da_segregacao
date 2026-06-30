# Arquitetura — Mapa da Segregação

## Visão geral

O sistema é composto por três camadas independentes:

| Camada | Tecnologia | Hospedagem |
|---|---|---|
| Frontend | React 19 + Vite + MapLibre GL | Firebase Hosting |
| API | FastAPI + SQLAlchemy + GeoAlchemy2 | Cloud Run (GCP) |
| Banco | PostgreSQL 15 + PostGIS | Cloud SQL (GCP) |

---

## 1. Arquitetura do sistema

```mermaid
graph TB
    subgraph Cliente
        U((Usuário))
        B[Navegador\nMapLibre GL]
    end

    subgraph Firebase["Firebase Hosting"]
        SPA["React SPA\n(bundle estático)"]
    end

    subgraph CloudRun["Cloud Run — painel-api"]
        API["FastAPI\n(uvicorn)"]
    end

    subgraph CloudSQL["Cloud SQL"]
        PG[(PostgreSQL 15\n+ PostGIS)]
        subgraph Tabelas
            S[dados.setores\n316k linhas]
            M[dados.municipios\n5.5k linhas]
            R[dados.reg_metropo\n39 linhas]
            SS[dados.setores_*_simplified]
        end
    end

    U --> B
    B -->|HTTPS — assets| SPA
    B -->|REST JSON| API
    B -->|Protobuf /tiles/{z}/{x}/{y}.pbf| API
    API -->|SQL espacial| PG
```

---

## 2. Backend — camadas internas

A API segue arquitetura em camadas com separação clara de responsabilidades.

```mermaid
graph LR
    subgraph HTTP
        R[routes/\nAPIRouter\nvalidação de params]
    end

    subgraph Orquestração
        C[controllers/\norquestração\nentre rota e repo]
    end

    subgraph Dados
        RP[repositories/\nqueries ORM\ne SQL nativo MVT]
        GC[geo_comum.py\nutilitários espaciais\ncompartilhados]
    end

    subgraph ORM
        M[models/\nSQLAlchemy]
        SC[schemas/\nPydantic]
    end

    subgraph Banco
        DB[(PostgreSQL\n+ PostGIS)]
    end

    R --> C --> RP
    RP --> GC
    RP --> M
    R --> SC
    M --> DB
    GC --> DB
```

### Rotas disponíveis

| Prefixo | Recurso | Endpoints principais |
|---|---|---|
| `/api/setores` | Setores censitários (316k) | `/viewport`, `/tiles/{z}/{x}/{y}.pbf`, `/indicadores`, `/escala` |
| `/api/municipios` | Municípios (5.5k) | `/`, `/lista`, `/viewport`, `/tiles/{z}/{x}/{y}.pbf`, `/indicadores` |
| `/api/reg_metro` | Regiões metropolitanas (39) | `/`, `/viewport`, `/tiles/{z}/{x}/{y}.pbf`, `/indicadores` |

### Resolução de tabela por zoom

```mermaid
flowchart LR
    Z{Zoom} -->|z ≥ 12| TB[tabela base\ngeometria completa]
    Z -->|8 ≤ z < 12| TS[*_simplified\ngeometria média]
    Z -->|z < 8| TU[*_ultra_simplified\ngeometria mínima]
    TU -->|não existe?| TB
    TS -->|não existe?| TB
```

---

## 3. Frontend — fluxo de dados do mapa

```mermaid
sequenceDiagram
    participant U as Usuário
    participant Map as MapLibre GL
    participant TQ as TanStack Query
    participant API as Cloud Run API
    participant PG as PostGIS

    U->>Map: pan / zoom
    Map->>TQ: bbox + zoom (normalizado)
    TQ->>TQ: cache hit?
    alt cache miss
        TQ->>API: GET /api/setores/tiles/{z}/{x}/{y}.pbf
        API->>PG: ST_AsMVTGeom + ST_AsMVT
        PG-->>API: bytes protobuf
        API-->>TQ: application/x-protobuf
        TQ-->>Map: tile renderizado
    else cache hit
        TQ-->>Map: tile do cache (staleTime 1h)
    end

    U->>Map: clica num município
    Map->>TQ: useIndicatorRankings(municipios)
    TQ->>API: GET /api/municipios/indicadores
    API->>PG: SELECT code_muni, metricas FROM dados.municipios
    PG-->>API: rows sem geometria
    API-->>TQ: JSON enxuto
    TQ-->>U: ranking + posição no painel
```

### Normalização da cache key

O hook `useSetoresViewport` agrupa o bbox por precisão de acordo com o zoom antes de montar a query key, evitando cache miss em micro-pans:

| Zoom | Precisão do bbox |
|---|---|
| < 8 | 0 casas decimais |
| 8–11 | 1 casa decimal |
| ≥ 12 | 3 casas decimais |

---

## 4. Infraestrutura GCP

```mermaid
graph TB
    subgraph GitHub["GitHub — Afro-Cebrap/mapa_da_segregacao"]
        GHA[GitHub Actions\nCI/CD]
        OIDC[OIDC Token]
    end

    subgraph GCP["GCP — mapa-da-segregacao"]
        subgraph IAM
            WIF[Workload Identity\nFederation Pool]
            SA_D[SA: gh-deployer\nrun.admin\nar.writer]
            SA_R[SA: api-runtime\ncloudsql.client\nsecretmanager.accessor]
        end

        subgraph Compute
            CR[Cloud Run v2\npainel-api\n1 CPU / 2 Gi\nmin=0 max=4]
        end

        subgraph Storage
            AR[Artifact Registry\nDocker — painel/]
            SM[Secret Manager\nDB_PASS]
            CS[(Cloud SQL\ndb-custom-1-3840\n1 vCPU / 3.75 GB RAM)]
        end
    end

    subgraph Firebase["Firebase — mapa-da-segregacao"]
        FH[Firebase Hosting\nReact SPA]
    end

    GHA -->|OIDC| WIF
    WIF -->|impersonate| SA_D
    SA_D -->|docker push| AR
    SA_D -->|gcloud run deploy| CR
    AR -->|imagem| CR
    CR -->|unix socket /cloudsql| CS
    SA_R -->|acessa| SM
    SM -->|DB_PASS em runtime| CR
    GHA -->|FIREBASE_TOKEN| FH
```

### Recursos provisionados pelo Terraform

| Recurso | Nome | Custo estimado |
|---|---|---|
| Cloud SQL | `painel-segreg-pg` (db-custom-1-3840) | ~$51/mês |
| Cloud Run | `painel-api` | ~$0–5/mês |
| Artifact Registry | `painel` | ~$0.10/mês |
| Firebase Hosting | — | $0 (free tier) |
| Secret Manager | `db-password` | ~$0.06/mês |
| **Total** | | **~$52–57/mês** |

---

## 5. CI/CD — pipelines

```mermaid
flowchart TD
    subgraph Push["git push → main"]
        PA[api/** modificado]
        PW[app/** modificado]
    end

    subgraph API_Pipeline["deploy-api.yml"]
        A1[Checkout]
        A2[Auth WIF → gh-deployer]
        A3[docker build ./api]
        A4[docker push Artifact Registry]
        A5[gcloud run deploy painel-api]
    end

    subgraph Web_Pipeline["deploy-web.yml"]
        W1[Checkout]
        W2[Auth WIF → gh-deployer]
        W3[Resolve Cloud Run URL]
        W4["bun install + bun run build\n(VITE_API_URL=Cloud Run URL)"]
        W5[firebase deploy --only hosting]
    end

    PA --> API_Pipeline
    PW --> Web_Pipeline
    A1 --> A2 --> A3 --> A4 --> A5
    W1 --> W2 --> W3 --> W4 --> W5
```

> **Nota:** O Firebase Hosting usa `secrets.FIREBASE_TOKEN` (refresh token de CI via `firebase login:ci`), pois o firebase-tools não aceita credenciais WIF (`external_account`). O gcloud é autenticado via WIF apenas para resolver a URL do Cloud Run antes do build.

---

## 6. Banco de dados — schema e tabelas

```mermaid
erDiagram
    SETORES {
        bigint code_tract PK
        bigint code_muni FK
        text name_muni
        text code_state
        text abbrev_state
        text name_metro
        numeric dissimilarity
        numeric index_h
        numeric exp_branca_pp
        numeric exp_pp_branca
        numeric iso_branca_branca
        numeric iso_pp_pp
        integer n_total
        integer n_branca
        integer n_preta_ou_parda
        numeric percent_branca
        geometry geometry "SRID 4674"
    }

    MUNICIPIOS {
        bigint code_muni PK
        text name_muni
        text code_state
        text name_metro
        numeric dissimilarity
        numeric index_h
        geometry geometry "SRID 4674"
    }

    REG_METROPO {
        text name_metro PK
        text code_state
        numeric dissimilarity
        numeric index_h
        geometry geometry "SRID 4674"
    }

    MUNICIPIOS ||--o{ SETORES : "code_muni"
    REG_METROPO ||--o{ MUNICIPIOS : "name_metro"
```

### Tabelas de zoom simplificadas

Criadas por `data/simplify_table.py` e resolvidas em runtime por `geo_comum.resolver_tabela_por_zoom`:

| Tabela | Zoom alvo | Tolerância |
|---|---|---|
| `dados.setores` | z ≥ 12 | geometria original |
| `dados.setores_simplified` | 10 ≤ z < 12 | simplificada |
| `dados.setores_ultra_simplified` | z < 10 | muito simplificada |
| `dados.municipios` | todos os zooms | geometria original (~5.5k) |
| `dados.reg_metropo_simplified` | z < 12 | simplificada |

---

## 7. Ambiente local

```mermaid
flowchart LR
    subgraph Dev["Desenvolvimento local"]
        FE["bun dev\nlocalhost:3000"]
        BE["uvicorn\nlocalhost:8000"]
        DC["docker compose\nPostGIS :5433\npgAdmin :8081"]
    end

    FE -->|VITE_API_URL=http://127.0.0.1:8000| BE
    BE -->|api/.env → localhost:5433| DC
```

### Comandos

```bash
# Backend
cd api
docker compose up -d
venv1\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd app
bun install
bun dev

# Testes
cd api
venv1\Scripts\python -m pytest tests -v
```
