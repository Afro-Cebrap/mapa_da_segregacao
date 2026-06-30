# Deploy serverless (Cloud SQL + Cloud Run + Firebase)

Substitui o deploy em VM (`deploy/vm/`, hoje parada). Spec:
`docs/superpowers/specs/2026-06-29-deploy-serverless-gcp-design.md`.
Plano: `docs/superpowers/plans/2026-06-29-deploy-serverless-gcp.md`.

## Projetos
- Infra (Cloud SQL, Cloud Run, Artifact Registry, WIF): `painel-segregacao-001`
- Firebase Hosting (front): `painel-segregacao`

## Provisionar / atualizar infra
```bash
cd deploy/gcp/terraform
terraform init
terraform apply
terraform output github_repo_variables   # setar no GitHub (Settings > Actions > Variables)
```

## Ingestão de dados (quando o parquet mudar)
Parquet em `api/data/sf_segregation_indices.parquet`.
```bash
./deploy/gcp/ingest-local.sh
```

## Deploy
Automático via GitHub Actions:
- push em `api/**`  → build+push imagem → Cloud Run (`.github/workflows/deploy-api.yml`)
- push em `app/**`  → build+deploy Firebase (`.github/workflows/deploy-web.yml`)

## Trocar de projeto GCP ou de repo
1. Editar `deploy/gcp/terraform/terraform.tfvars` (`project_infra`,
   `project_firebase`, `region`, `github_repo`, `cors_origins`).
2. `terraform apply`.
3. Atualizar as repo variables no GitHub com o novo `terraform output github_repo_variables`.
4. Se trocou o repo, mover os 2 workflows para o novo repositório.

## Estado do Terraform
Local por padrão. Para time/CI, migrar para backend GCS (ver bloco comentado em `main.tf`).

## Rollback para a VM
A VM `painel-segregacao-vm` está parada (não deletada). Para reativar:
`gcloud compute instances start painel-segregacao-vm --zone us-central1-a`.
Deletar de vez (libera disco/IP) é um passo manual posterior.
