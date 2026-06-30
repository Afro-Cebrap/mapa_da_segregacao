resource "google_service_account" "deployer" {
  account_id   = var.deploy_sa_id
  display_name = "GitHub Actions deployer"
  project      = var.project_infra
}

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_infra
  workload_identity_pool_id = var.wif_pool_id
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.infra]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_infra
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = var.wif_provider_id
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  # Restringe ao repo (obrigatório quando se mapeia attribute.repository).
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Permite que o repo (via OIDC) personifique a SA de deploy.
resource "google_service_account_iam_member" "wif_bind" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

# Roles do deployer no projeto de infra.
resource "google_project_iam_member" "deployer_run" {
  project = var.project_infra
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_ar" {
  project = var.project_infra
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# Deployar o Cloud Run "como" a runtime SA exige actAs.
resource "google_service_account_iam_member" "deployer_actas_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

# Cross-project: deploy no Firebase Hosting (projeto diferente da infra).
resource "google_project_iam_member" "deployer_firebase" {
  project = var.project_firebase
  role    = "roles/firebasehosting.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# firebase deploy chama a Management API para resolver o projeto antes do
# hosting; firebasehosting.admin nao concede firebase.projects.get.
resource "google_project_iam_member" "deployer_firebase_viewer" {
  project = var.project_firebase
  role    = "roles/firebase.viewer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}
