variable "project" {
  type        = string
  description = "GCP project holding the data bucket"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "bucket_name" {
  type        = string
  description = "Globally unique name of the public data bucket"
}

variable "cors_origins" {
  type        = list(string)
  description = "Origins allowed to read the bucket from a browser"
}

# Budget alerting. Optional so the root still applies for an operator who lacks
# billing-account permissions, or for a throwaway staging project: leave
# billing_account empty and no budget resources are created.
variable "billing_account" {
  type        = string
  default     = ""
  description = "Billing account id (e.g. 000000-AAAAAA-BBBBBB). Empty disables the budget alert."
}

variable "budget_amount_usd" {
  type        = number
  default     = 10
  description = "Monthly budget in USD. After teardown this project should cost ~$0-3/month, so a low ceiling makes the alert a sharp tripwire rather than noise."
}

variable "budget_alert_emails" {
  type        = list(string)
  default     = []
  description = "Addresses notified when a budget threshold is crossed."
}
