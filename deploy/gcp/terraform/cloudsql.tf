resource "google_sql_database_instance" "main" {
  name                = var.db_instance_name
  project             = var.project_infra
  region              = var.region
  database_version    = "POSTGRES_15"
  deletion_protection = true
  depends_on          = [google_project_service.infra]

  settings {
    tier              = var.db_tier
    disk_type         = "PD_SSD"
    disk_size         = 10
    disk_autoresize   = true
    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled = true
      # Sem authorized_networks: acesso só via conector (Cloud Run) e Auth Proxy.
    }

    # Espelha o tuning do docker-compose no que o Cloud SQL permite.
    database_flags {
      name  = "max_parallel_workers_per_gather"
      value = "2"
    }
    database_flags {
      name  = "work_mem"
      value = "49152" # kB = 48MB
    }
  }
}

resource "google_sql_database" "db" {
  name     = var.db_name
  instance = google_sql_database_instance.main.name
  project  = var.project_infra
}

resource "random_password" "db" {
  length  = 28
  special = false
}

resource "google_sql_user" "user" {
  name     = var.db_user
  instance = google_sql_database_instance.main.name
  password = random_password.db.result
  project  = var.project_infra
}

resource "google_secret_manager_secret" "db_password" {
  secret_id  = "db-password"
  project    = var.project_infra
  depends_on = [google_project_service.infra]
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db.result
}
