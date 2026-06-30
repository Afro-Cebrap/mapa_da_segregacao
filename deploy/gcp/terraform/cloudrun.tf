resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = var.ar_repo
  format        = "DOCKER"
  project       = var.project_infra
  depends_on    = [google_project_service.infra]
}

resource "google_service_account" "runtime" {
  account_id   = var.runtime_sa_id
  display_name = "Cloud Run runtime - painel API"
  project      = var.project_infra
}

resource "google_project_iam_member" "runtime_sql" {
  project = var.project_infra
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_secret" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_service" "api" {
  name                = var.run_service
  location            = var.region
  project             = var.project_infra
  deletion_protection = false
  depends_on = [
    google_project_service.infra,
    google_secret_manager_secret_version.db_password,
  ]

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = var.run_min_instances
      max_instance_count = var.run_max_instances
    }

    containers {
      # Placeholder; o GitHub Actions substitui pela imagem real.
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = var.run_memory
        }
      }

      env {
        name  = "INSTANCE_CONNECTION_NAME"
        value = google_sql_database_instance.main.connection_name
      }
      env {
        name  = "DB_USER"
        value = var.db_user
      }
      env {
        name  = "DB_NAME"
        value = var.db_name
      }
      env {
        name  = "CORS_ORIGINS"
        value = join(",", var.cors_origins)
      }
      env {
        name = "DB_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.main.connection_name]
      }
    }
  }

  # O Actions atualiza a imagem; o Terraform não deve revertê-la.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
}

# API pública (sem auth): o front a consome direto.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  project  = var.project_infra
  role     = "roles/run.invoker"
  member   = "allUsers"
}
