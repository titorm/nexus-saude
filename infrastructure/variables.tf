variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "supabase_access_token" {
  description = "Supabase access token"
  type        = string
  sensitive   = true
}

variable "supabase_org_id" {
  description = "Supabase organization ID"
  type        = string
}

variable "supabase_region" {
  description = "Supabase region"
  type        = string
  default     = "us-east-1"
}

variable "database_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.database_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

variable "redis_url" {
  description = "Redis connection URL (Upstash or other provider)"
  type        = string
  sensitive   = true
}

variable "create_state_bucket" {
  description = "Whether to create S3 bucket for Terraform state"
  type        = bool
  default     = false
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}