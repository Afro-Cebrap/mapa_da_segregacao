resource "google_storage_bucket" "data" {
  name                        = var.bucket_name
  project                     = var.project
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  force_destroy               = false
  depends_on                  = [google_project_service.storage]

  # The dataset changes about once per census; object versioning would only
  # accumulate copies of large archives.
  versioning {
    enabled = false
  }

  cors {
    origin = var.cors_origins
    method = ["GET", "HEAD"]
    # Range is what PMTiles uses to read a slice of the archive instead of the
    # whole file. Without it exposed, the map silently renders nothing.
    response_header = ["Content-Type", "Content-Length", "Range", "If-Match", "ETag"]
    max_age_seconds = 3600
  }
}

# Public read. The data is already published openly by the panel itself.
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
