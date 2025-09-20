# Search Performance Testing Suite

Este diretório contém ferramentas de teste de performance para o sistema de busca avançada do Nexus Saúde.

## 📋 Visão Geral

Os testes de performance validam:

- ⚡ Tempo de resposta das consultas
- 🔍 Performance do autocomplete
- 👥 Capacidade de carga concurrent
- 📊 Uso de memória
- 🎯 Precisão dos resultados

## 🛠️ Ferramentas Disponíveis

### 1. Script Node.js (Recomendado)

```bash
# Instalar dependências
cd apps/api/src/tests/performance
npm install

# Executar testes básicos
node performance-test.js

# Executar com testes de carga
node performance-test.js --load-test

# Executar com URL customizada
node performance-test.js --url http://localhost:3001/api

# Executar com autenticação
node performance-test.js --token "your-auth-token"
```

### 2. Script Bash

```bash
# Tornar executável
chmod +x run-performance-tests.sh

# Executar testes
./run-performance-tests.sh
```

## 📊 Tipos de Teste

### Testes de Consulta Simples

- Termos médicos comuns: "diabetes", "consulta"
- Sintomas: "dor de cabeça", "febre"
- Entidades básicas: "paciente", "médico"

### Testes de Consulta Complexa

- Múltiplas condições: "diabetes tipo 2 hipertensão"
- Combinações de sintomas: "infecção viral sintomas febre"
- Detalhes de medicamentos: "metformina lisinopril dosagem"

### Testes de Frases Exatas

- Condições específicas: "diabetes tipo 2"
- Tipos de consulta: "consulta de emergência"
- Ações médicas: "acompanhamento"

### Testes de Autocomplete

- Prefixos curtos: "pat", "diab", "cons"
- Validação de velocidade < 50ms
- Número adequado de sugestões

### Testes de Carga

- 5, 10, 20 usuários simultâneos
- Duração de 15-30 segundos
- Medição de throughput e latência

## 📈 Métricas Coletadas

### Métricas de Performance

- **Tempo de Execução**: Tempo total da requisição
- **Tempo de Resposta**: Tempo de processamento no servidor
- **Uso de Memória**: Alocação durante a execução
- **Taxa de Sucesso**: Porcentagem de requisições bem-sucedidas

### Métricas de Qualidade

- **Contagem de Resultados**: Número de resultados retornados
- **Relevância**: Qualidade dos resultados
- **Taxa de Erro**: Porcentagem de falhas

## 🎯 Critérios de Performance

### Excelente (>80% consultas rápidas)

- 🟢 Consultas simples: <100ms
- 🟢 Autocomplete: <50ms
- 🟢 Consultas complexas: <200ms
- 🟢 Taxa de erro: <1%

### Bom (60-80% consultas rápidas)

- 🟡 Consultas simples: <200ms
- 🟡 Autocomplete: <100ms
- 🟡 Consultas complexas: <500ms
- 🟡 Taxa de erro: <5%

### Necessita Melhoria (<60% consultas rápidas)

- 🔴 Consultas simples: >200ms
- 🔴 Autocomplete: >100ms
- 🔴 Consultas complexas: >500ms
- 🔴 Taxa de erro: >5%

## 🔧 Configuração do Ambiente

### Pré-requisitos

```bash
# API rodando localmente
cd apps/api
pnpm dev

# Database com dados de teste
psql -d nexus_saude -f seed-test-data.sql
```

### Variáveis de Ambiente

```bash
# URL da API
API_URL=http://localhost:3001/api

# Token de autenticação (se necessário)
AUTH_TOKEN=your-jwt-token

# Timeout das requisições
REQUEST_TIMEOUT=30000
```

## 📋 Cenários de Teste

### 1. Teste de Smoke

Validação básica de conectividade e funcionalidade:

```bash
node performance-test.js --url http://localhost:3001/api
```

### 2. Teste de Carga

Simulação de uso normal com múltiplos usuários:

```bash
node performance-test.js --load-test
```

### 3. Teste de Stress

Validação dos limites do sistema:

```bash
node performance-test.js --stress-test
```

### 4. Teste de Regressão

Comparação com baseline de performance:

```bash
# Executar antes das mudanças
node performance-test.js > baseline-results.json

# Executar após as mudanças
node performance-test.js > current-results.json

# Comparar resultados
diff baseline-results.json current-results.json
```

## 📊 Análise de Resultados

### Interpretação das Métricas

#### Tempo de Resposta

- **<100ms**: Excelente - Usuário não percebe latência
- **100-300ms**: Bom - Latência perceptível mas aceitável
- **300-1000ms**: Regular - Latência notável
- **>1000ms**: Ruim - Experiência prejudicada

#### Taxa de Throughput

- **>100 req/s**: Excelente capacidade
- **50-100 req/s**: Boa capacidade
- **20-50 req/s**: Capacidade adequada
- **<20 req/s**: Capacidade limitada

#### Uso de Memória

- Monitorar vazamentos de memória
- Validar garbage collection eficiente
- Observar crescimento de heap

### Recomendações de Otimização

#### Para Consultas Lentas

1. **Indexação de Database**
   - Verificar índices de full-text search
   - Otimizar índices compostos
   - Analisar planos de execução

2. **Caching**
   - Implementar cache de consultas frequentes
   - Cache de autocomplete
   - Cache de resultados populares

3. **Paginação**
   - Limitar resultados por página
   - Implementar lazy loading
   - Otimizar ordenação

#### Para Problemas de Carga

1. **Connection Pooling**
   - Configurar pool de conexões adequado
   - Monitorar uso de conexões
   - Implementar timeout apropriado

2. **Rate Limiting**
   - Implementar limites por usuário
   - Throttling de consultas
   - Prevenção de abuso

3. **Scaling Horizontal**
   - Load balancer para múltiplas instâncias
   - Database read replicas
   - CDN para assets estáticos

## 🚨 Alertas e Monitoramento

### Configuração de Alertas

#### Métricas Críticas

- Tempo de resposta médio > 500ms
- Taxa de erro > 5%
- Uso de CPU > 80%
- Uso de memória > 85%

#### Ferramentas Recomendadas

- **APM**: New Relic, DataDog, ou similar
- **Logs**: ELK Stack ou Grafana Loki
- **Métricas**: Prometheus + Grafana
- **Uptime**: Pingdom ou similar

### Dashboard de Performance

#### Métricas em Tempo Real

- Latência de consultas (P50, P95, P99)
- Throughput (requests/second)
- Taxa de erro
- Uso de recursos (CPU, Memória, Disk I/O)

#### Métricas Históricas

- Tendências de performance
- Comparação período-a-período
- Identificação de padrões

## 🧪 Testes Automatizados

### Integração CI/CD

#### Pipeline de Performance

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Run Performance Tests
        run: |
          cd apps/api/src/tests/performance
          npm install
          node performance-test.js --url ${{ secrets.API_URL }}
```

#### Critérios de Aprovação

- Tempo médio de resposta < 200ms
- Taxa de sucesso > 95%
- Sem degradação > 20% vs baseline

## 📚 Recursos Adicionais

### Documentação

- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Fastify Performance](https://www.fastify.io/docs/latest/Guides/Getting-Started/#your-first-server)
- [React Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)

### Ferramentas Complementares

- **Artillery.io**: Testes de carga avançados
- **K6**: Performance testing moderno
- **Apache Bench**: Testes simples de HTTP
- **JMeter**: Testes de carga GUI

### Benchmarks da Indústria

- **SaaS Healthcare**: ~200ms tempo de resposta
- **Busca Médica**: >95% precisão
- **Autocomplete**: <100ms resposta
- **Uptime**: >99.9% disponibilidade

---

## 🤝 Contribuindo

Para adicionar novos testes ou melhorar os existentes:

1. Adicione cenários em `getTestScenarios()`
2. Implemente métricas adicionais em `runSearchTest()`
3. Atualize critérios de performance conforme necessário
4. Documente novos tipos de teste neste README

## 📞 Suporte

Para questões sobre performance ou problemas com os testes:

- 📧 Email: dev-team@nexussaude.com.br
- 💬 Slack: #performance-testing
- 📋 Issues: GitHub Issues do projeto
