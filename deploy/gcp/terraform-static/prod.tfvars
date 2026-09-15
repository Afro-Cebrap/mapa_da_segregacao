project     = "mapa-da-segregacao"
region      = "us-central1"
bucket_name = "mapa-da-segregacao-dados"

cors_origins = [
  "https://mapa-da-segregacao.web.app",
  "https://mapa-da-segregacao.firebaseapp.com",
]

# The operator MUST fill these two in before applying to production — they are
# the only values in this repo that cannot be derived from the code. The billing
# account id is visible at console.cloud.google.com/billing (format
# 000000-AAAAAA-BBBBBB). Leaving them empty silently disables the alert, which is
# a deliberate fallback for operators without billing-account permissions, not a
# default anyone should settle for in production.
billing_account     = ""
budget_alert_emails = []
budget_amount_usd   = 10
