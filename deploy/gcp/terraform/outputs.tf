output "cloud_sql_connection_name" {
  value = google_sql_database_instance.main.connection_name
}

output "cloud_run_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "deploy_sa_email" {
  value = google_service_account.deployer.email
}

output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

# Variáveis a configurar no GitHub (Settings > Actions > Variables).
output "github_repo_variables" {
  value = {
    GCP_PROJECT_INFRA = var.project_infra
    GCP_REGION        = var.region
    WIF_PROVIDER      = google_iam_workload_identity_pool_provider.github.name
    DEPLOY_SA_EMAIL   = google_service_account.deployer.email
    AR_REPO           = var.ar_repo
    RUN_SERVICE       = var.run_service
    FIREBASE_PROJECT  = var.project_firebase
  }
}
