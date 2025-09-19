terraform {
  required_version = ">= 1.0"
  
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }

  # Estado remoto - Configure conforme necessário
  backend "s3" {
    bucket = "nexus-saude-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
    
    # Opcional: DynamoDB para lock
    dynamodb_table = "nexus-saude-terraform-locks"
    encrypt        = true
  }
}

# Configuração do provider Supabase
provider "supabase" {
  access_token = var.supabase_access_token
}

# Projeto Supabase
resource "supabase_project" "nexus_saude" {
  organization_id   = var.supabase_org_id
  name             = "nexus-saude-${var.environment}"
  database_password = var.database_password
  region           = var.supabase_region

  lifecycle {
    prevent_destroy = true
  }
}

# Configurações do banco de dados
resource "supabase_settings" "nexus_saude" {
  project_ref = supabase_project.nexus_saude.id

  database = {
    enable_logs = true
  }
  
  api = {
    max_rows = 1000
  }
}

# Configuração alternativa usando recursos locais para Redis
# Em um cenário real, você usaria o provider Upstash ou criaria recursos na AWS/GCP

locals {
  # URLs de conexão que serão usados pela aplicação
  database_url = "postgresql://postgres:${var.database_password}@${supabase_project.nexus_saude.database_host}:5432/postgres"
  redis_url    = var.redis_url # Para ser configurado externamente ou via Upstash
}

# Bucket S3 para estado do Terraform (caso não exista)
resource "aws_s3_bucket" "terraform_state" {
  count  = var.create_state_bucket ? 1 : 0
  bucket = "nexus-saude-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  count  = var.create_state_bucket ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  count  = var.create_state_bucket ? 1 : 0
  bucket = aws_s3_bucket.terraform_state[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# DynamoDB para locks do Terraform
resource "aws_dynamodb_table" "terraform_locks" {
  count        = var.create_state_bucket ? 1 : 0
  name         = "nexus-saude-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}