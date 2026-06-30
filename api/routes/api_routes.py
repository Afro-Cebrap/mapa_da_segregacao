
from fastapi import APIRouter


router = APIRouter(
    prefix="/api",
    tags=["Healthcheck"],
    responses=padrao_respostas_http,
)

@router.get("/doctor",
            summary="Integridade do sistema",
            description="Verifica a integridade do sistema")
async def obter_status_api() -> dict:
    return {
        "sucesso": True,
        "mensagem": "Serviço OK!",
        "dados": {"ambiente": "",
                  "database": {"emExecucao": "",
                               "detalhes": ""},
                  }
    }


def registrar_rotas(app):
    app.include_router(router)
