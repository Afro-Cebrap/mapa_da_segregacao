# Cost tripwire for the public bucket.
#
# The bucket is public-read and CORS is NOT an access control — anyone can curl
# the archives. The data is meant to be public, so this is not a confidentiality
# problem; it is a cost one. Egress is billed per GB with no built-in ceiling, so
# a download loop against a multi-hundred-megabyte archive is an uncapped bill on
# a project whose whole purpose is cutting cost.
#
# IMPORTANT: a budget alert NOTIFIES, it does not CAP. Spending continues past
# the threshold. Its value is turning an invisible month-long leak into an email
# within hours. If a hard ceiling is ever required, that needs a different
# mechanism (e.g. a billing-disable function, or moving to zero-egress storage).
#
# Requires permissions on the BILLING ACCOUNT, not just the project. An operator
# with only project-level rights cannot apply this; leave billing_account empty
# in that case and ask whoever administers billing to run it.

locals {
  budget_enabled = var.billing_account != "" && length(var.budget_alert_emails) > 0
}

resource "google_project_service" "billingbudgets" {
  count              = local.budget_enabled ? 1 : 0
  project            = var.project
  service            = "billingbudgets.googleapis.com"
  disable_on_destroy = false
}

# google_monitoring_notification_channel below is a Cloud Monitoring resource;
# without this API enabled its create call fails. Gated the same as the rest
# of the budget resources so it stays optional when billing_account /
# budget_alert_emails are left empty (see locals.budget_enabled above).
resource "google_project_service" "monitoring" {
  count              = local.budget_enabled ? 1 : 0
  project            = var.project
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false
}

resource "google_monitoring_notification_channel" "budget_email" {
  count        = local.budget_enabled ? length(var.budget_alert_emails) : 0
  project      = var.project
  display_name = "Alerta de orcamento - ${var.budget_alert_emails[count.index]}"
  type         = "email"
  depends_on   = [google_project_service.monitoring]

  labels = {
    email_address = var.budget_alert_emails[count.index]
  }
}

resource "google_billing_budget" "data_bucket" {
  count           = local.budget_enabled ? 1 : 0
  billing_account = var.billing_account
  display_name    = "Orcamento mensal - ${var.project}"
  depends_on      = [google_project_service.billingbudgets]

  budget_filter {
    projects = ["projects/${var.project}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.budget_amount_usd)
    }
  }

  # 50% is the early warning, 100% means something is wrong, 200% means it is
  # badly wrong and should not wait for the next billing cycle to be noticed.
  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  threshold_rules {
    threshold_percent = 2.0
  }

  all_updates_rule {
    monitoring_notification_channels = google_monitoring_notification_channel.budget_email[*].id
    disable_default_iam_recipients   = false
  }
}
