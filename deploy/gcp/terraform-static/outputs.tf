output "data_bucket_name" {
  value = google_storage_bucket.data.name
}

# Empty when the budget alert is disabled (no billing account or no recipients).
output "budget_alert_enabled" {
  value = local.budget_enabled
}

# The value to put in VITE_DATA_URL, without a trailing slash.
output "data_base_url" {
  value = "https://storage.googleapis.com/${google_storage_bucket.data.name}"
}
