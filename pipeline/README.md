# Pipeline de dados estáticos

Este pipeline substitui o banco PostGIS + API ao vivo por um conjunto de
arquivos estáticos (tiles `.pmtiles`, JSON de rankings/escalas/lookups) que
são publicados num bucket público do Cloud Storage e lidos direto pelo
frontend. Não há mais banco a manter em produção: quando o dataset muda,
roda-se o pipeline de novo e sobrescreve-se os arquivos do bucket.

**Nada aqui foi executado contra um projeto GCP real ainda.** O parquet de
origem está numa máquina de outra pessoa, não neste repositório. Este
documento é o que permite a um operador rodar isso pela primeira vez — leia
até o fim antes de começar, especialmente os avisos abaixo.

## 1. Pré-requisitos

- **Docker Desktop** instalado e rodando. Tippecanoe não tem build para
  Windows, então o pipeline inteiro roda dentro de um container Linux
  (`pipeline/Dockerfile`).
- **`gcloud` autenticado** (`gcloud auth login`), com permissão de escrita
  no bucket de destino — `upload.sh` usa `gsutil`, que reaproveita essas
  credenciais.
- **O parquet de origem numa pasta local.** Qualquer pasta serve; você aponta
  para ela com `PARQUET_DIR` no passo seguinte.

### Aviso: a imagem Docker nunca foi construída neste projeto

Nenhum `docker build` foi rodado ainda — o Docker Desktop não estava
disponível no ambiente onde este pipeline foi escrito, e subir o daemon não
foi autorizado. **O primeiro `docker compose run --rm pipeline` que você rodar
é, de fato, o primeiro build desta imagem.** É esperado gastar algum tempo
depurando o `Dockerfile` antes de chegar num build limpo.

Em particular, o `Dockerfile` compila o tippecanoe a partir do código-fonte
(tag `2.78.0`) e instala `libsqlite3-dev` como dependência de build. Esse
nome de pacote foi corrigido a partir do README do próprio tippecanoe para
essa tag (o plano original citava `libsqlite8-dev`, que está errado), mas
**a compilação em si nunca foi testada**. Se o build falhar na etapa de
`apt-get install` ou no `make` do tippecanoe, essa linha é o primeiro lugar
a olhar.

## 2. Gerar os artefatos

Defina onde está o parquet e rode o pipeline via Docker Compose:

```bash
cd pipeline
PARQUET_DIR=/caminho/para/pasta/com/o/parquet \
PARQUET_NAME=sf_segregation_indices.parquet \
  docker compose run --rm pipeline
```

Isso roda `build.py` (lê o parquet, escreve GeoJSONSeq intermediário e o JSON
de meta/scopes/manifest) e depois `tiles.sh` (chama o tippecanoe para gerar
um `.pmtiles` por combinação de recurso/ano). Tudo é escrito em `./out`
(montado no container; ajustável com a variável `OUT`).

**Confira os tamanhos impressos ao final** — `tiles.sh` termina com
`ls -lh "$OUT/tiles"`. Isso importa porque os tamanhos dos seis tilesets
nunca foram medidos: a estimativa informal é 300 MB–1 GB no total, mas é um
palpite, não uma medição. Antes de publicar (passo 5), veja se os números
que saíram fazem sentido; um arquivo muito maior ou muito menor que o
esperado é sinal de algo errado na seleção de dados ou na tiling.

## 3. A tensão de zoom baixo

`tiles.sh` roda o tippecanoe com `-ps` (desliga a simplificação de linha do
tippecanoe — decisão deliberada: nenhuma simplificação de geometria própria
é feita nesta versão do pipeline) e com `--drop-densest-as-needed` como
válvula de segurança contra o limite de tamanho por tile em zoom baixo, onde
o Brasil inteiro cai num único tile. Essas duas flags competem entre si e
qual delas "vence" numa tiling real é empírico — nunca foi testado com o
parquet de produção.

**Se o log do tippecanoe indicar que muitos setores estão sendo descartados
em zoom baixo, afrouxe o `-ps` em `tiles.sh` antes de mexer no
`--drop-densest-as-needed`.** Perder precisão de vértice em z4 é muito menos
visível no mapa do que perder setores inteiros do resultado.

### Aviso: testando com uma amostra pequena

Testar com um parquet filtrado ou reduzido é um bom primeiro passo antes de
rodar contra o dataset completo — mas `docker compose run --rm pipeline` roda
`build.py` e `tiles.sh` em sequência dentro do mesmo container (é o `CMD` do
`Dockerfile`), então uma seleção que vem vazia demais só aparece no meio
dessa execução única. Se uma ou mais combinações de recurso/ano não
produzirem nenhuma linha, `build.py` já pula essas combinações e avisa
(`!!! <recurso>_<ano> selected 0 rows`); isso é normal e inofensivo. Mas se
**todas** vierem vazias, a pasta `out/geojsonseq/` nunca chega a ser criada,
e o glob em `tiles.sh` (`"$OUT"/geojsonseq/*.geojsonl`) não tem proteção
`nullglob`: o shell passa a string literal do glob, não expandida, para o
tippecanoe, que falha com um erro confuso apontando um arquivo chamado
literalmente `*.geojsonl`, em vez de dizer "nenhum arquivo de entrada". Se
você bater nesse erro específico testando com uma amostra, a causa mais
provável é que o filtro aplicado ao parquet não deixou nenhuma linha válida
para nenhum recurso/ano — revise a amostra, não o tippecanoe. No dataset
completo (seis combinações reais) esse caminho nunca é acionado.

## 4. Validar a paridade

Antes de publicar qualquer coisa, confirme que os artefatos gerados batem
com o que a API antiga (ainda viva) responde. Suba a API legada localmente:

```bash
cd api
venv1\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

E, com o servidor no ar, rode o validador a partir de `pipeline/`:

```bash
python validate.py --out ./out --api-url http://127.0.0.1:8000
```

**Só siga para o passo de publicação com saída limpa** (`All artifacts match
the live API.`, código de saída 0). Qualquer divergência impressa é motivo
para investigar antes de publicar — não para publicar assim mesmo.

## 5. Publicar

```bash
./upload.sh painel-segregacao-001-dados   # staging, primeiro
./upload.sh mapa-da-segregacao-dados      # produção, depois de validar staging
```

O script sincroniza `tiles/`, `meta/` e `scopes/` (com `gsutil rsync -d`,
que também remove do bucket o que não existe mais localmente) e copia
`manifest.json` por cima. `geojsonseq/` é intermediário de build e nunca é
publicado.

Os nomes dos dois buckets vêm de `deploy/gcp/terraform-static/staging.tfvars`
e `prod.tfvars` — veja `deploy/gcp/terraform-static/README.md` para como
esses buckets são provisionados e qual URL colocar em `VITE_DATA_URL` no
frontend.

## 6. Quando o dataset mudar

Repita a partir do passo 2. Não existe banco para atualizar — o parquet novo
substitui o antigo na pasta local, o pipeline roda de novo, e `upload.sh`
sobrescreve os arquivos no bucket (o `rsync -d` remove tiles de anos/recursos
que deixaram de existir). O `manifest.json` registra o timestamp e a origem
de cada geração, útil para conferir depois qual versão está publicada.
