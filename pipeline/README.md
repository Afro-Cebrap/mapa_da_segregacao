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

**Rode todos os comandos deste documento no Git Bash.** Os exemplos abaixo
usam sintaxe POSIX (atribuição de variável inline, `./upload.sh`), que dá
erro de parse no PowerShell/cmd. Isso inclui os comandos com caminhos estilo
Windows (`venv\Scripts\python`) que aparecem dentro de blocos ```bash — eles
funcionam normalmente no Git Bash, que entende ambos os estilos de caminho.

- **Docker Desktop** instalado e rodando. Tippecanoe não tem build para
  Windows, então o pipeline inteiro roda dentro de um container Linux
  (`pipeline/Dockerfile`).
- **`gcloud` autenticado** (`gcloud auth login`), com permissão de escrita
  no bucket de destino — `upload.sh` usa `gsutil`, que reaproveita essas
  credenciais.
- **O parquet de origem numa pasta local.** Qualquer pasta serve; você aponta
  para ela com `PARQUET_DIR` no passo seguinte.
- **Memória.** O parquet de origem tem ~7M linhas; `build.py` faz um dedupe
  do frame inteiro antes de fatiar por recurso/ano (deliberado — ver
  `segregation_pipeline/build.py` e o histórico do PR para o porquê de não
  fatiar primeiro), e `source.normalize` faz uma cópia própria do
  GeoDataFrame por cima disso, então o pico de memória chega a segurar duas
  cópias inteiras do dataset ao mesmo tempo. `docker-compose.yml` não define
  limite de memória para o container, e o limite padrão do Docker Desktop no
  Windows costuma ficar bem abaixo do necessário para isso. **Aumente o
  limite de memória do Docker Desktop antes do primeiro run** — Settings →
  Resources → Memory (ou, em versões mais novas, Settings → Resources →
  Advanced) — para um valor generoso (vários GB de folga acima do que você
  acha que o parquet ocupa em disco); um OOM kill do container aparece só
  como o processo morrendo sem uma mensagem de erro clara.

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
um `.pmtiles` por combinação de recurso/ano). Por padrão tudo é escrito em
`./out`, mas isso é ajustável: defina `OUT` no host antes do
`docker compose run` para montar outra pasta no lugar de `./out` — por
exemplo, um disco com mais espaço livre, já que os tamanhos dos tilesets são
uma estimativa (ver abaixo), não uma medição:

```bash
OUT=/caminho/para/disco/com/espaco \
PARQUET_DIR=/caminho/para/pasta/com/o/parquet \
PARQUET_NAME=sf_segregation_indices.parquet \
  docker compose run --rm pipeline
```

(`docker-compose.yml` monta `${OUT:-./out}` do host em `/out` dentro do
container; dentro do container o caminho é sempre `/out`, então essa `OUT`
do host é só sobre onde os arquivos ficam salvos na sua máquina.)

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

### Maxzoom é por recurso, não uniforme

`--maximum-zoom` varia por recurso em `tiles.sh` (função `maxzoom_for`):

| Recurso       | `--maximum-zoom` |
| ------------- | ----------------- |
| `setores`     | 14                 |
| `municipios`  | 12                 |
| `reg_metropo` | 12                 |

`setores` vai a z14 para preservar a fidelidade que o banco ao vivo servia
em zoom alto (a tabela base, não uma simplificada — ver
`geo_comum.resolver_tabela_por_zoom` em `api/`); `municipios` e
`reg_metropo` já eram limitados a z12 pelo frontend antes desta migração e
continuam assim. Isso significa que o arquivo `setores_<ano>.pmtiles` demora
mais para tilar e fica maior que os outros dois — não é sinal de erro na
seleção de dados.

`app/src/components/dashboard/DashboardMap.tsx`'s `ARCHIVE_MAXZOOM` precisa
ficar em sincronia com esses valores por recurso.

`tiles.sh` imprime, ao final, o maxzoom real de cada arquivo gerado (via
`pmtiles-show`) ao lado dos tamanhos — ver a próxima subseção sobre por que
isso pode divergir do valor pedido.

### `--extend-zooms-if-still-dropping` pode gerar mais zoom do que o pedido

`tiles.sh` também passa `--extend-zooms-if-still-dropping`, que instrui o
tippecanoe a subir o maxzoom real do arquivo além do `--maximum-zoom` pedido
se ainda estiver descartando feições no zoom mais alto. Isso pode gerar,
publicar e cobrar por níveis de zoom que o frontend nunca vai pedir, porque
`DashboardMap.tsx` define estaticamente o maxzoom que acredita que cada
arquivo tem.

**Depois de rodar `tiles.sh`, confira a seção "Actual maxzoom per archive"
impressa ao final contra a tabela acima.** Se algum arquivo saiu com maxzoom
maior que o documentado, `app/src/components/dashboard/DashboardMap.tsx`'s
`ARCHIVE_MAXZOOM` precisa ser atualizado para aquele recurso antes de
publicar — senão os tiles extras existem no bucket mas o MapLibre nunca os
busca.

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
com o que a API antiga (ainda viva) responde. Suba a API legada localmente
(num terminal separado, deixe rodando):

```bash
cd api
venv1\Scripts\python -m uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

`validate.py` importa o pacote `requests` para falar com essa API — e isso
**não** está instalado em `api/venv1` (aquele venv serve a própria API, não
o pipeline). Rode o validador com um interpretador que tenha
`pipeline/requirements.txt` instalado, que já inclui `requests`.

### Opção A — venv dedicado do pipeline (recomendado)

```bash
cd pipeline
python -m venv venv
venv\Scripts\python -m pip install -r requirements.txt
venv\Scripts\python validate.py --out ./out --api-url http://127.0.0.1:8000
```

### Opção B — dentro do container Docker

A imagem já tem `requests` instalado (é parte do `pip install -r
requirements.txt` do `Dockerfile`), então dá para rodar o validador sem criar
venv nenhum — mas a API do passo anterior roda no **host**, não no
container, então `http://127.0.0.1:8000` de dentro do container aponta para
o próprio container, não para o host. Use `host.docker.internal`, que o
Docker Desktop (Windows/Mac) resolve para o host automaticamente:

```bash
cd pipeline
docker compose run --rm pipeline python validate.py --out /out --api-url http://host.docker.internal:8000
```

Repare nas duas diferenças em relação à Opção A: o comando roda `python`
direto (substituindo o `CMD` padrão do container, que é `tiles.sh`), `--out`
aponta para `/out` (o caminho **dentro** do container, não `./out` do host —
ver a seção 2 sobre a variável `OUT`), e a URL da API usa
`host.docker.internal` em vez de `127.0.0.1`. Isso não funciona em Docker
nativo no Linux sem configuração extra (`host.docker.internal` só é
automático no Docker Desktop); se for esse o seu caso, use a Opção A.

### Depois de rodar (qualquer uma das opções)

**Só siga para o passo de publicação com saída limpa** (`All artifacts match
the live API.`, código de saída 0). Qualquer divergência impressa é motivo
para investigar antes de publicar — não para publicar assim mesmo. Esse é o
passo que autoriza destruir o banco de produção mais adiante (seção 4 de
`deploy/gcp/terraform-static/README.md`); não pule nem trate uma falha aqui
como cosmética.

### O que `validate.py` cobre — e o que não cobre

Uma saída limpa **não** significa que tudo foi comparado byte a byte contra
a API antiga. O que `validate.py` de fato verifica:

- Os artefatos `meta/` (lista de municípios, rankings de municípios e de
  regiões metropolitanas) para os dois anos.
- Todos os arquivos de escopo `scopes/setores/<ano>/metro/*.json` (uma RM
  por arquivo — são poucas, então a cobertura aqui é integral).
- Uma **amostra determinística** dos arquivos
  `scopes/setores/<ano>/muni/*.json` (`MUNI_SAMPLE_SIZE` em `validate.py`,
  hoje 25 por ano) — não o conjunto inteiro. São ~5.500 municípios fora de
  qualquer RM; validar todos exigiria ~5.500 × 12 métricas × 2 anos de
  chamadas a `/api/setores/escala`, o suficiente para inviabilizar rodar
  isto antes de cada publicação. A amostra usa seed fixa, então uma
  regressão que caia num código amostrado é pega de novo em toda execução,
  mas municípios fora da amostra não têm checagem automática nenhuma.

O que `validate.py` **não** verifica, em nenhuma hipótese:

- **Os próprios arquivos `.pmtiles`.** O plano original (spec §8) previa
  decodificar uma amostra de tiles e comparar propriedade por propriedade
  contra o endpoint de tiles ao vivo. Isso foi deliberadamente descartado:
  adicionar dependências e código de decodificação não testados ao único
  script que autoriza um teardown irreversível criaria falsa confiança, e
  não há hoje nenhum arquivo `.pmtiles` real nem dataset para exercitar esse
  código nem uma vez. Trate a geometria e as propriedades dentro dos tiles
  como não verificadas por este script.

### Checagem manual complementar (obrigatória antes de produção)

Como os tiles não têm checagem automática, faça uma checagem manual visual
depois de publicar em staging (passo 5), com o painel apontando para o
bucket de staging (`VITE_DATA_URL`) e a API legada local rodando lado a
lado:

1. Abra o painel apontando para o `data_base_url` de staging.
2. Escolha alguns setores censitários espalhados pelo mapa e compare os
   valores exibidos no popup contra a mesma consulta na API legada
   (`/api/setores/indicadores` ou o Swagger em `http://127.0.0.1:8000/docs`).
3. **Inclua pelo menos um setor dentro de uma região metropolitana e um
   município fora de qualquer RM** — essa é exatamente a resolução de
   `unit_type` (`metro` vs. `muni`) que não tem nenhuma checagem automática
   equivalente (a amostra de `muni/` acima cobre os arquivos de escopo, não
   os tiles).
4. Confira também zoom alto num setor (para checar a fidelidade z14 — ver
   seção 3) e zoom baixo numa área densa.

Isso não substitui `validate.py`, mas é o que compensa a lacuna deixada pela
falta de decodificação de tiles.

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
