# Painel Segregacao - Frontend

Aplicacao web do projeto **Painel Segregacao**, desenvolvida com React, TypeScript e Vite.

Hoje o frontend entrega:

- uma landing page institucional em `/`
- um dashboard interativo em `/dashboard`
- visualizacao cartografica com MapLibre
- filtros de indicadores e camadas auxiliares
- integracao da camada principal de setores via backend por viewport
- deploy estatico via Firebase Hosting

## Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- MapLibre GL + `@vis.gl/react-maplibre`
- Tailwind CSS 4
- componentes utilitarios com Radix UI
- animacoes com Motion

## Estrutura

```bash
src/
├── App.tsx                    # Raiz: providers (React Query, ThemeProvider, Router)
├── main.tsx                   # Entrypoint
├── index.css                  # Estilos globais e tokens de design
├── Routes.tsx                 # Definição de todas as rotas e ScrollToTop
│
├── pages/                     # Páginas da aplicação
│   ├── Home.tsx               # Página inicial
│   ...                        # Outras páginas
│
├── components/
│   ├── Container.tsx          # Wrapper com largura máxima e animação
│   ├── ...                    # Outros componentes
│   ├── layouts/               # Layouts padrão da aplicação
|   ├── kokonutui/             # Componentes Kokonutui
│   └── ui/                    # Componentes Radix UI / shadcn
│
├── constants/                 # Constantes de configuração da aplicação
│
├── context/
│   └── ThemeContext.tsx       # Contexto de tema claro/escuro
│
├── hooks/                     # Custom hooks da aplicação
│
├── services/                  # Cliente HTTP, QueryClient e integrações com a API
│
├── lib/
│   ├── QueryClient.tsx        # Configuração e Provider do TanStack Query
│   └── utils.ts               # Utilitários (cn, buildKPIs, etc.)
│
├── mocks/                     # Dados mockados aplicação
│
├── types/                     # Tipos Typescripts da aplicação
│
└── assets/                    # Imagens e SVGs estáticos
```

## Como rodar

### Desenvolvimento

```bash
cd app
bun install
bun dev
```

O Vite sobe por padrao em `http://localhost:3000`.

### Build de producao

```bash
cd app
bun run build
```

## Scripts disponiveis

- `bun dev`: inicia o servidor de desenvolvimento
- `bun run build`: gera a pasta `dist`
- `bun run preview`: publica localmente o build de producao
- `bun run lint`: executa o ESLint
- `bun run format`: formata os arquivos com Prettier
- `bun run format:check`: valida a formatacao sem alterar arquivos

## Rotas

- `/`: homepage com conteudo institucional e CTA para exploracao
- `/dashboard`: area principal de visualizacao espacial

Qualquer rota desconhecida redireciona para `/`.

## Como o dashboard funciona

O dashboard organiza a experiencia em tres blocos:

- **Sidebar**: controla ano do censo, indicador ativo, visibilidade de camadas e legenda
- **Mapa**: renderiza setores censitarios e camadas auxiliares
- **Toolbox**: oferece busca, zoom, reset de camera, ajuste de extensao e modo de desenho

Na integracao atual:

- a camada principal de setores usa Axios + TanStack Query
- o carregamento ocorre por viewport ao final dos movimentos do mapa
- as camadas auxiliares continuam vindo dos mocks locais

## Deploy com Firebase Hosting

Os arquivos de deploy ficam na raiz do frontend:

- `.firebaserc`: projeto Firebase ativo
- `firebase.json`: publicacao da pasta `dist` com rewrite para SPA

Fluxo recomendado:

```bash
cd app
bun run build
firebase deploy --only hosting
```
