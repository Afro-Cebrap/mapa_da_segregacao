# Infraestrutura estática — bucket de dados

Este diretório provisiona só o que a nova arquitetura precisa: um bucket
público do Cloud Storage servindo tiles `.pmtiles` e JSON estáticos, mais um
alerta de orçamento opcional. Não há Cloud SQL nem Cloud Run aqui — esse
stack legado vive em `deploy/gcp/terraform/` e é desativado no passo 4
abaixo, depois que este stack estiver funcionando em produção.

**Nada neste README foi executado contra um projeto GCP real.** Nenhum
`terraform apply` rodou. Trate os comandos abaixo como o primeiro rascunho de
um operador humano, não como um caminho já percorrido.

## 1. Provisionar staging

```bash
cd deploy/gcp/terraform-static
terraform init
terraform apply -var-file=staging.tfvars -state=staging.tfstate
```

`staging.tfvars` aponta para o projeto `painel-segregacao-001` e o bucket
`painel-segregacao-001-dados`, e deixa o alerta de orçamento desligado
(projeto descartável — ver `budget.tf`).

## 2. Provisionar produção

```bash
terraform apply -var-file=prod.tfvars -state=prod.tfstate
```

Repare no `-state` diferente: staging e produção usam **arquivos de state
separados** (`staging.tfstate` / `prod.tfstate`) para que um `apply` num
ambiente nunca enxergue nem sobrescreva os recursos do outro, mesmo rodando
do mesmo diretório de módulo.

### Antes de aplicar em produção: o alerta de orçamento

`prod.tfvars` vem com `billing_account = ""` e `budget_alert_emails = []`,
o que **desativa o alerta silenciosamente** (é a checagem em
`budget.tf: local.budget_enabled`). Preencha os dois antes do apply de
produção:

```hcl
billing_account     = "000000-AAAAAA-BBBBBB"  # console.cloud.google.com/billing
budget_alert_emails = ["alguem@dominio.org"]
```

Criar o orçamento exige permissão na **conta de faturamento** (billing
account), não no projeto — são papéis diferentes no IAM do Google Cloud. Se
quem está rodando este apply não tem esse acesso, quem administra o
faturamento da organização precisa rodar esse pedaço (pode ser um apply
`-target` só nos recursos de `budget.tf` depois de preencher as duas
variáveis).

**O alerta notifica; ele não limita o gasto.** Isso importa aqui porque o
bucket é de leitura pública e CORS não é controle de acesso — qualquer um
pode baixar os arquivos publicados. Isso é intencional (os dados já são
públicos), mas significa que egress é cobrado por GB sem teto embutido: um
loop de downloads contra os arquivos (que podem chegar a centenas de MB cada)
é uma conta sem limite num projeto cujo objetivo inteiro é reduzir custo. O
alerta é o que transforma um vazamento silencioso de um mês inteiro em um
e-mail em poucas horas — não é dispensável só porque "os dados são
públicos mesmo".

### Se o apply falhar na permissão pública do bucket

`storage.tf` cria um `google_storage_bucket_iam_member` com
`member = "allUsers"`. Se o projeto (ou a organização) tiver a política
`constraints/storage.publicAccessPrevention` ativada, esse binding é
rejeitado no apply. Essa política **não aparece em lugar nenhum da
configuração Terraform deste repositório** — é definida a nível de projeto
ou organização, fora deste código. Se o apply falhar especificamente nesse
recurso, essa é a causa mais provável; peça a quem administra a organização
para desativar a política para este projeto ou avaliar uma exceção.

## 3. O valor de `VITE_DATA_URL`

Depois do apply, o output `data_base_url` já vem pronto para o frontend:

```bash
terraform output -state=staging.tfstate data_base_url
terraform output -state=prod.tfstate data_base_url
```

Isso vira `VITE_DATA_URL` em `app/.env.local` (dev/staging manual) ou
`app/.env.production` / na variável de ambiente do workflow de deploy do
frontend (produção). Sem barra final — veja `app/.env.example`.

## 4. Teardown do stack legado

Só execute isto **depois de observar produção funcionando** com o bucket
estático (mapa carregando tiles e rankings do novo `data_base_url`, sem
chamadas a `painel-api`). Faça nesta ordem:

1. **Apagar o serviço Cloud Run** `painel-api`:
   ```bash
   gcloud run services delete painel-api \
     --project mapa-da-segregacao --region us-central1
   ```

2. **Exportar o Cloud SQL para o Cloud Storage antes de destruir a
   instância.** O parquet de origem é a fonte de verdade real, mas um
   export custa centavos e elimina qualquer dúvida sobre ter perdido algo.
   Não pule esta etapa por ela parecer redundante:
   ```bash
   gcloud sql export sql painel-segreg-pg \
     gs://<algum-bucket-que-voce-controle>/backups/painel-segreg-final.sql \
     --database=banco-segreg --project mapa-da-segregacao
   ```
   (nomes de instância/banco default em
   `deploy/gcp/terraform/variables.tf`; ajuste se o projeto usa outros).

3. **Destruir o Cloud SQL — deliberadamente em duas etapas.**
   `google_sql_database_instance.main` em `deploy/gcp/terraform/cloudsql.tf`
   tem `deletion_protection = true`. Isso é uma proteção de segurança, não
   um obstáculo a contornar: edite o arquivo para `deletion_protection =
   false`, aplique essa mudança sozinha, e só então destrua a instância.
   ```bash
   cd deploy/gcp/terraform
   # editar cloudsql.tf: deletion_protection = false
   terraform apply    # aplica só a mudança da flag
   terraform destroy -target=google_sql_database_instance.main
   ```

4. **Remover o Artifact Registry, o WIF e as service accounts** que só
   existiam para o deploy do Cloud Run:
   ```bash
   terraform destroy \
     -target=google_artifact_registry_repository.docker \
     -target=google_iam_workload_identity_pool_provider.github \
     -target=google_iam_workload_identity_pool.github \
     -target=google_service_account.runtime \
     -target=google_service_account.deployer
   ```
   Ou, se nada mais em `deploy/gcp/terraform/` precisa sobreviver,
   `terraform destroy` do stack inteiro.

5. **Apagar o workflow de deploy da API**: remover
   `.github/workflows/deploy-api.yml` do repositório (ele não tem mais o que
   fazer sem Cloud Run).

Depois do teardown, o custo mensal do projeto de infra deve cair para perto
de zero (ver a tabela em `deploy/gcp/README.md`).
