# Nexus Saúde - Infrastructure as Code

Este diretório contém os scripts Terraform para provisionar a infraestrutura do Nexus Saúde.

## Estrutura

- `main.tf` - Configuração principal do Terraform
- `variables.tf` - Variáveis de entrada
- `outputs.tf` - Outputs dos recursos criados
- `terraform.tfvars.example` - Exemplo de arquivo de variáveis

## Recursos Provisionados

### Supabase (PostgreSQL)

- Banco de dados PostgreSQL gerenciado
- Configurações de backup e alta disponibilidade
- Políticas de segurança (RLS)

### Upstash (Redis)

- Cluster Redis para cache e sessões
- Configurações de TTL e persistência

## Como usar

1. Copie `terraform.tfvars.example` para `terraform.tfvars`
2. Preencha as variáveis necessárias
3. Execute os comandos:

```bash
terraform init
terraform plan
terraform apply
```

## Variáveis de Ambiente Necessárias

- `SUPABASE_ACCESS_TOKEN` - Token de acesso do Supabase
- `UPSTASH_EMAIL` - Email da conta Upstash
- `UPSTASH_API_KEY` - API Key do Upstash

## Estado Remoto

O estado do Terraform é gerenciado remotamente usando Terraform Cloud ou AWS S3 para garantir sincronização entre equipes.
