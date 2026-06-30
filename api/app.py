from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

import os
import time
from routes.setores_routes import router as setores_router
from routes.municipios_routes import router as municipios_router
from routes.reg_metro_routes import router as reg_metro_router

def criar_aplicacao():
    app = FastAPI(title="API Painel Segregações",
                  description="API de integração painel Segregações",
                  version="0.1.0")
    """"
        Nesta seção é feita a inclusão de funções que serão executadas em todas as requisições
        antes delas serem processadas. Middlewares são úteis para validação de headers, autenticação e 
        autorização de uso da API, registro de log de chamadas etc.
    """
    configurar_middleware(app)

    """"
        Nesta seção são incluídas todas as rotas disponíveis na API.
        Utiliza-se a obordagem de injeção de dependência, passando para um
        um módulo de rotas o app, e este por sua vez faz o registro de suas 
        rotas na aplicação.
    """
    
    app.include_router(setores_router)
    app.include_router(municipios_router)
    app.include_router(reg_metro_router)
    
    return app


def configurar_middleware(app):
    # CORS. Atenção à spec: o navegador rejeita "Access-Control-Allow-Origin: *"
    # em requisições credenciadas e, com allow_credentials=True, o curinga "*" em
    # allow_headers deixa de funcionar (vira o nome literal "*"). Por isso:
    #   - sem CORS_ORIGINS definido -> libera tudo com credenciais DESLIGADAS
    #     (combinação válida; o front local em localhost:3000 acessa 127.0.0.1:8000
    #     sem usar cookies, então isso basta para testar);
    #   - com CORS_ORIGINS (lista separada por vírgula) -> origens explícitas +
    #     localhost via regex + credenciais LIGADAS (caso futuramente use cookies).
    origens_env = os.getenv("CORS_ORIGINS", "").strip()
    if origens_env:
        origens = [o.strip() for o in origens_env.split(",") if o.strip()]
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origens,
            allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
    
app = criar_aplicacao()
