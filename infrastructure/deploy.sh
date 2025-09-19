#!/bin/bash

# Script de deploy da infraestrutura Nexus Saúde
# Usage: ./deploy.sh [plan|apply|destroy]

set -e

ACTION=${1:-plan}
ENVIRONMENT=${2:-dev}

echo "🚀 Nexus Saúde Infrastructure Deployment"
echo "Action: $ACTION"
echo "Environment: $ENVIRONMENT"
echo ""

# Verificar se terraform está instalado
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform não encontrado. Instale o Terraform primeiro."
    exit 1
fi

# Verificar se arquivo de variáveis existe
if [ ! -f "terraform.tfvars" ]; then
    echo "❌ Arquivo terraform.tfvars não encontrado."
    echo "💡 Copie terraform.tfvars.example para terraform.tfvars e configure as variáveis."
    exit 1
fi

# Inicializar Terraform
echo "🔧 Inicializando Terraform..."
terraform init

# Validar configuração
echo "✅ Validando configuração..."
terraform validate

# Executar ação
case $ACTION in
    plan)
        echo "📋 Planejando mudanças..."
        terraform plan -var="environment=$ENVIRONMENT"
        ;;
    apply)
        echo "🚀 Aplicando mudanças..."
        terraform apply -var="environment=$ENVIRONMENT" -auto-approve
        echo ""
        echo "✅ Infraestrutura provisionada com sucesso!"
        echo ""
        echo "📄 Outputs importantes:"
        terraform output
        ;;
    destroy)
        echo "⚠️  ATENÇÃO: Isso irá destruir toda a infraestrutura!"
        read -p "Tem certeza? Digite 'yes' para continuar: " -r
        if [[ $REPLY == "yes" ]]; then
            terraform destroy -var="environment=$ENVIRONMENT" -auto-approve
            echo "🗑️  Infraestrutura destruída."
        else
            echo "❌ Operação cancelada."
        fi
        ;;
    *)
        echo "❌ Ação inválida. Use: plan, apply, ou destroy"
        exit 1
        ;;
esac

echo ""
echo "✨ Deploy concluído!"