project     = "painel-segregacao-001"
region      = "us-central1"
bucket_name = "painel-segregacao-001-dados"

cors_origins = [
  "https://mapa-da-segregacao.web.app",
  "https://mapa-da-segregacao.firebaseapp.com",
  # Staging only: lets a local `bun dev` read the staging bucket.
  "http://localhost:3000",
]

# Budget alert left off in staging: it is a throwaway project and the alert
# would only add noise. Fill these in if staging is ever kept long-term.
billing_account     = ""
budget_alert_emails = []
