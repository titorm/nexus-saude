output "database_url" {
  description = "PostgreSQL connection URL"
  value       = local.database_url
  sensitive   = true
}

output "database_host" {
  description = "PostgreSQL host"
  value       = supabase_project.nexus_saude.database_host
}

output "supabase_url" {
  description = "Supabase project URL"
  value       = "https://${supabase_project.nexus_saude.id}.supabase.co"
}

output "supabase_anon_key" {
  description = "Supabase anonymous key"
  value       = supabase_project.nexus_saude.anon_key
  sensitive   = true
}

output "supabase_service_role_key" {
  description = "Supabase service role key"
  value       = supabase_project.nexus_saude.service_role_key
  sensitive   = true
}

output "project_ref" {
  description = "Supabase project reference"
  value       = supabase_project.nexus_saude.id
}

output "redis_url" {
  description = "Redis connection URL"
  value       = var.redis_url
  sensitive   = true
}