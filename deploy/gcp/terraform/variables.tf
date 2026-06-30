variable "project_infra" { type = string }
variable "project_firebase" { type = string }
variable "region" {
  type    = string
  default = "us-central1"
}
variable "github_repo" {
  type        = string
  description = "owner/repo do monorepo no GitHub"
}

# Banco
variable "db_instance_name" {
  type    = string
  default = "painel-segreg-pg"
}
variable "db_tier" {
  type    = string
  default = "db-custom-1-3840"
}
variable "db_name" {
  type    = string
  default = "banco-segreg"
}
variable "db_user" {
  type    = string
  default = "usuario-painel"
}

# Artifact Registry / Cloud Run
variable "ar_repo" {
  type    = string
  default = "painel"
}
variable "run_service" {
  type    = string
  default = "painel-api"
}
variable "run_min_instances" {
  type    = number
  default = 0
}
variable "run_max_instances" {
  type    = number
  default = 4
}
variable "run_memory" {
  type = string
  # Endpoints que retornam municipios com geometria e os ~316k indicadores
  # de setores estouram 512Mi; 2Gi da folga confortavel.
  default = "2Gi"
}
variable "cors_origins" {
  type = list(string)
}

# Service accounts / WIF
variable "runtime_sa_id" {
  type    = string
  default = "api-runtime"
}
variable "deploy_sa_id" {
  type    = string
  default = "gh-deployer"
}
variable "wif_pool_id" {
  type    = string
  default = "github-pool"
}
variable "wif_provider_id" {
  type    = string
  default = "github-provider"
}
