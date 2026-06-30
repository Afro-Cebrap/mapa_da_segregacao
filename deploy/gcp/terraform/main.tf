terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  # Estado local por enquanto. Para backend GCS, descomente e crie o bucket antes:
  # backend "gcs" {
  #   bucket = "painel-segregacao-tfstate"
  #   prefix = "deploy/gcp"
  # }
}

provider "google" {
  project = var.project_infra
  region  = var.region
}

locals {
  apis = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "compute.googleapis.com",
  ]
}

resource "google_project_service" "infra" {
  for_each           = toset(local.apis)
  project            = var.project_infra
  service            = each.value
  disable_on_destroy = false
}
