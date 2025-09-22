#!/bin/bash

echo "=== NEXUS SAÚDE - VERIFICAÇÃO FINAL DOS SERVIÇOS ==="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

services=("ai-ts" "data-warehouse-ts" "fhir-ts" "ml-ts" "monitoring-ts" "nlp-ts")
working_services=()
problematic_services=()

echo "🔍 Verificando cada serviço..."
echo ""

for service in "${services[@]}"; do
    echo "--- Verificando $service ---"
    
    cd "$service" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Diretório não encontrado${NC}"
        problematic_services+=("$service: diretório não encontrado")
        continue
    fi
    
    # Verificar package.json
    if [ ! -f "package.json" ]; then
        echo -e "${RED}❌ package.json não encontrado${NC}"
        problematic_services+=("$service: package.json ausente")
        cd ..
        continue
    fi
    
    # Verificar node_modules
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  node_modules não encontrado${NC}"
        problematic_services+=("$service: node_modules ausente")
        cd ..
        continue
    fi
    
    # Verificar compilação TypeScript
    if npx tsc --noEmit > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Compilação TypeScript OK${NC}"
        working_services+=("$service")
    else
        echo -e "${RED}❌ Erros de compilação TypeScript${NC}"
        problematic_services+=("$service: erros TypeScript")
    fi
    
    cd ..
    echo ""
done

echo "=== RESUMO FINAL ==="
echo ""

echo -e "${GREEN}✅ SERVIÇOS FUNCIONAIS (${#working_services[@]}/6):${NC}"
for service in "${working_services[@]}"; do
    echo "  - $service"
done
echo ""

if [ ${#problematic_services[@]} -gt 0 ]; then
    echo -e "${YELLOW}🔧 SERVIÇOS COM PROBLEMAS (${#problematic_services[@]}/6):${NC}"
    for issue in "${problematic_services[@]}"; do
        echo "  - $issue"
    done
    echo ""
fi

# Estatísticas
total_ts_files=$(find . -name "*.ts" -type f | wc -l)
total_node_modules=$(find . -name "node_modules" -type d | wc -l)

echo "📊 ESTATÍSTICAS:"
echo "  - Total de arquivos TypeScript: $total_ts_files"
echo "  - Serviços com dependências: $total_node_modules/6"
echo "  - Taxa de sucesso: $((${#working_services[@]} * 100 / 6))%"
echo ""

if [ ${#working_services[@]} -eq 6 ]; then
    echo -e "${GREEN}🎉 TODOS OS SERVIÇOS ESTÃO FUNCIONAIS!${NC}"
    exit 0
else
    echo -e "${YELLOW}🚧 Alguns serviços precisam de ajustes.${NC}"
    exit 1
fi