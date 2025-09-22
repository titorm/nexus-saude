# Nexus Saúde - Plataforma de Saúde de Próxima Geração

Sistema avançado de saúde digital com IA, Analytics e Integração FHIR.

## 🏗️ Arquitetura da Plataforma

### **Epic 4: Next-Generation Healthcare Platform** ✅ CONCLUÍDO

Plataforma completa de saúde digital com inteligência artificial, analytics avançados e integração FHIR R4.

#### **Microserviços Implementados:**

1. **🤖 T-401: ML Predictive System** (Porta 8001)
   - Modelos preditivos de alta precisão (93%+)
   - 4 modelos especializados: risco de readmissão, length of stay, deterioração, resource utilization
   - Monitoramento contínuo e retreinamento automático

2. **🧠 T-402: Medical AI Assistant** (Porta 8002)
   - Assistente médico inteligente com NLP
   - Análise de sintomas e sugestões de diagnóstico
   - Sistema de recomendações personalizadas

3. **📝 T-403: NLP Clinical Notes** (Porta 8003)
   - Processamento de linguagem natural para notas clínicas
   - 5 módulos especializados: extração de entidades, análise de sentimento, classificação, sumarização, anonymização
   - Suporte a múltiplos idiomas

4. **🔗 T-404: FHIR Integration Gateway** (Porta 8004)
   - Gateway completo FHIR R4
   - 6 recursos implementados: Patient, Practitioner, Organization, Encounter, Observation, Medication
   - Validação automática e transformação de dados

5. **📊 T-409: Real-time Monitoring & Alerts** (Porta 8005)
   - Monitoramento em tempo real de métricas de saúde
   - Sistema avançado de alertas e notificações
   - Dashboard operacional com visualizações

6. **🏢 T-408: Data Warehouse & Analytics** (Porta 8006)
   - Data warehouse dimensional com modelagem avançada
   - ETL pipeline robusto com job management
   - Business Intelligence com 12 KPIs healthcare
   - Dashboards executivos e analytics avançados
   - Sistema de relatórios e exportação de dados

## 📁 Estrutura do Projeto

```
nexus-saude/
├── apps/
│   ├── api/                    # Backend API Principal (Fastify)
│   └── web/                    # Frontend React (Vite)
├── services/                   # Microserviços Epic 4
│   ├── ml-predictive/         # T-401: Sistema ML Preditivo
│   ├── ai-assistant/          # T-402: Assistente Médico IA
│   ├── nlp-clinical/          # T-403: NLP para Notas Clínicas
│   ├── fhir-gateway/          # T-404: Gateway de Integração FHIR
│   ├── monitoring/            # T-409: Monitoramento Tempo Real
│   └── data-warehouse/        # T-408: Data Warehouse & Analytics
├── packages/
│   ├── db/                    # Schema do banco e migrações (Drizzle)
│   ├── eslint-config/         # Configurações ESLint compartilhadas
│   └── tsconfig/              # Configurações TypeScript compartilhadas
└── docs/                      # Documentação técnica
```

## 🚀 Quick Start Epic 4

### **Pré-requisitos para Microserviços**

- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Node.js 18+ (para apps principais)

### **Inicialização dos Microserviços**

```bash
# 1. Configurar variáveis de ambiente
cp services/*/env.example services/*/.env
# Editar cada arquivo .env conforme necessário

# 2. Iniciar stack completa com Docker Compose
cd services/ml-predictive && docker-compose up -d
cd services/ai-assistant && docker-compose up -d
cd services/nlp-clinical && docker-compose up -d
cd services/fhir-gateway && docker-compose up -d
cd services/monitoring && docker-compose up -d
cd services/data-warehouse && docker-compose up -d

# 3. Verificar saúde dos serviços
curl http://localhost:8001/health  # ML Predictive
curl http://localhost:8002/health  # AI Assistant
curl http://localhost:8003/health  # NLP Clinical
curl http://localhost:8004/health  # FHIR Gateway
curl http://localhost:8005/health  # Monitoring
curl http://localhost:8006/health  # Data Warehouse

# 4. Iniciar aplicações principais
pnpm install
pnpm dev
```

### **URLs dos Serviços Epic 4**

#### **Aplicações Principais:**

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

#### **Microserviços Epic 4:**

- **ML Predictive:** http://localhost:8001 ([Swagger](http://localhost:8001/docs))
- **AI Assistant:** http://localhost:8002 ([Swagger](http://localhost:8002/docs))
- **NLP Clinical:** http://localhost:8003 ([Swagger](http://localhost:8003/docs))
- **FHIR Gateway:** http://localhost:8004 ([Swagger](http://localhost:8004/docs))
- **Monitoring:** http://localhost:8005 ([Dashboard](http://localhost:8005/dashboard))
- **Data Warehouse:** http://localhost:8006 ([Analytics](http://localhost:8006/analytics))

### **APIs de Demonstração**

```bash
# 1. Predição ML de Risco de Readmissão
curl -X POST http://localhost:8001/predict/readmission \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "P123", "age": 65, "diagnosis": "diabetes", "length_of_stay": 5}'

# 2. Consulta ao Assistente Médico IA
curl -X POST http://localhost:8002/assistant/analyze \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["febre", "tosse", "dor no peito"], "patient_age": 45}'

# 3. Análise NLP de Nota Clínica
curl -X POST http://localhost:8003/nlp/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Paciente com dor abdominal intensa, febre de 38.5°C"}'

# 4. Consulta FHIR de Paciente
curl -X GET http://localhost:8004/fhir/Patient/123 \
  -H "Accept: application/fhir+json"

# 5. Dashboard de Monitoramento
curl -X GET http://localhost:8005/monitoring/dashboard

# 6. Analytics do Data Warehouse
curl -X GET http://localhost:8006/analytics/kpis?date_range=last_30_days
```

## 🔐 Autenticação e Segurança

### **Sistema de Autenticação Principal**

JWT duplo (access + refresh tokens) em cookies httpOnly:

- **Access Token**: 15 minutos, autorização de requests
- **Refresh Token**: 7 dias, renovação automática

### **Segurança dos Microserviços**

- **API Keys**: Autenticação entre serviços
- **Rate Limiting**: Proteção contra ataques
- **CORS**: Configuração segura para cross-origin
- **Validação**: Pydantic schemas em todas as APIs
- **Logs**: Auditoria completa de operações

### **Usuários de Teste**

```
Médica: ana@hospital.com / 123456
Admin:  admin@hospital.com / 123456
```

## � Funcionalidades Epic 4

### **🤖 Machine Learning (T-401)**

- **Modelos Preditivos**: 4 modelos especializados com 93%+ de precisão
- **Predições Disponíveis**: Risco de readmissão, tempo de permanência, deterioração clínica, utilização de recursos
- **Monitoramento**: Acompanhamento contínuo de performance dos modelos
- **Retreinamento**: Automático baseado em novos dados

### **🧠 Inteligência Artificial (T-402)**

- **Assistente Médico**: Análise de sintomas e sugestões diagnósticas
- **NLP Médico**: Processamento de consultas em linguagem natural
- **Recomendações**: Sistema personalizado baseado em histórico
- **Suporte Decisório**: Alertas e insights para profissionais

### **📝 Processamento de Linguagem Natural (T-403)**

- **Análise de Notas**: Extração automática de informações clínicas
- **Módulos Especializados**: 5 engines de processamento
- **Multilingual**: Suporte a português e inglês
- **Anonimização**: Proteção automática de dados sensíveis

### **� Integração FHIR (T-404)**

- **FHIR R4 Compliant**: Aderência total ao padrão HL7 FHIR R4
- **6 Recursos**: Patient, Practitioner, Organization, Encounter, Observation, Medication
- **Validação**: Automática de payloads FHIR
- **Transformação**: Conversão bi-direcional de dados

### **📊 Monitoramento Tempo Real (T-409)**

- **Dashboard Operacional**: Visualizações em tempo real
- **Alertas Inteligentes**: Sistema avançado de notificações
- **Métricas de Saúde**: KPIs operacionais e clínicos
- **Integração**: Conecta todos os microserviços

### **🏢 Data Warehouse & Analytics (T-408)**

- **Modelagem Dimensional**: 6 dimensões + 5 fact tables
- **ETL Pipeline**: Processamento robusto de dados
- **Business Intelligence**: 12 KPIs healthcare específicos
- **Dashboards Executivos**: 3 dashboards pré-configurados
- **Analytics Avançados**: Correlação, regressão, forecasting, clustering
- **Relatórios**: 5 templates especializados
- **Exportação**: Múltiplos formatos (CSV, Excel, JSON, Parquet)

## 📋 Epic 4 Roadmap

- [x] ✅ **T-401**: ML Predictive System
- [x] ✅ **T-402**: Medical AI Assistant
- [x] ✅ **T-403**: NLP Clinical Notes
- [x] ✅ **T-404**: FHIR Integration Gateway
- [x] ✅ **T-409**: Real-time Monitoring & Alerts
- [x] ✅ **T-408**: Data Warehouse & Analytics
- [x] ✅ **Documentação**: Arquitetura e APIs completas

## 🏥 Features da Plataforma

### **Para Profissionais de Saúde**

- **Assistente IA**: Suporte diagnóstico inteligente
- **Predições ML**: Alertas de risco em tempo real
- **Análise NLP**: Processamento automático de notas
- **Dashboard Clínico**: Métricas de pacientes consolidadas
- **Integração FHIR**: Interoperabilidade total

### **Para Administradores**

- **Analytics Executivos**: Dashboards de performance
- **Business Intelligence**: KPIs operacionais e financeiros
- **Monitoramento**: Alertas de sistema e operacionais
- **Relatórios**: Geração automática de relatórios
- **Data Warehouse**: Análises históricas e tendências

### **Para TI/DevOps**

- **Microserviços**: Arquitetura escalável e resiliente
- **Monitoring**: Observabilidade completa
- **APIs Documentadas**: Swagger/OpenAPI em todos os serviços
- **Docker Ready**: Deploy simplificado com containers
- **Health Checks**: Monitoramento automático de saúde

## 🛠️ Scripts e Comandos Úteis

### **Epic 4 - Microserviços**

```bash
# === DESENVOLVIMENTO ===

# Verificar status de todos os serviços
./scripts/check-services.sh

# Logs agregados de todos os microserviços
docker-compose logs -f

# Restart de serviço específico
cd services/ml-predictive && docker-compose restart

# === DEPLOYMENT ===

# Build de todas as imagens
for service in ml-predictive ai-assistant nlp-clinical fhir-gateway monitoring data-warehouse; do
  cd services/$service && docker build -t nexus-$service:latest .
  cd ../..
done

# Deploy completo Epic 4
./scripts/deploy-epic4.sh

# === TESTING ===

# Testes de integração Epic 4
./scripts/test-epic4-integration.sh

# Performance testing
./scripts/load-test-epic4.sh

# === MONITORING ===

# Health check de todos os serviços
curl http://localhost:8001/health && \
curl http://localhost:8002/health && \
curl http://localhost:8003/health && \
curl http://localhost:8004/health && \
curl http://localhost:8005/health && \
curl http://localhost:8006/health

# Métricas agregadas
curl http://localhost:8005/monitoring/metrics/aggregate

# === DEVELOPMENT HELPERS ===

# Hot reload de serviço específico
cd services/ml-predictive && uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Debug mode
export DEBUG=true && python services/ai-assistant/main.py

# Seed data para testing
./scripts/seed-epic4-data.sh
```

### **Aplicações Principais**

```bash
# Desenvolvimento
pnpm dev                 # Inicia todos os serviços
pnpm dev:api            # Apenas backend
pnpm dev:web            # Apenas frontend

# Build
pnpm build              # Build de produção
pnpm build:api          # Build backend
pnpm build:web          # Build frontend

# Database
pnpm db:generate        # Gera migrações
pnpm db:migrate         # Aplica migrações
pnpm db:seed            # Popula dados de exemplo
pnpm db:studio          # Interface visual do banco

# Testing
pnpm test               # Testes unitários
pnpm test:e2e           # Testes end-to-end
pnpm test:coverage      # Coverage report

# Linting
pnpm lint               # Executa linting
pnpm lint:fix           # Fix automático
pnpm format             # Formata código

# Type checking
pnpm type-check         # Verifica tipos TypeScript
```

## 🐳 Docker Quick Reference

### **Epic 4 - Containers**

```bash
# Iniciar stack completa
docker-compose -f services/*/docker-compose.yml up -d

# Stop all Epic 4 services
docker stop $(docker ps -q --filter "label=epic=4")

# Logs de serviço específico
docker-compose -f services/ml-predictive/docker-compose.yml logs -f

# Rebuild e restart
docker-compose -f services/data-warehouse/docker-compose.yml up --build -d

# Cleanup
docker system prune -a --volumes
```

## � Documentação Técnica

### **APIs Swagger/OpenAPI**

- [ML Predictive API](http://localhost:8001/docs)
- [AI Assistant API](http://localhost:8002/docs)
- [NLP Clinical API](http://localhost:8003/docs)
- [FHIR Gateway API](http://localhost:8004/docs)
- [Monitoring API](http://localhost:8005/docs)
- [Data Warehouse API](http://localhost:8006/docs)

### **Arquitetura Detalhada**

- [Epic 4 Architecture](./docs/epic4-architecture.md)
- [Microservices Design](./docs/microservices-design.md)
- [Data Flow Diagrams](./docs/data-flow.md)
- [Security Model](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)

### **Guias de Desenvolvimento**

- [Contributing Guide](./docs/contributing.md)
- [Code Standards](./docs/code-standards.md)
- [Testing Strategy](./docs/testing.md)
- [Performance Guidelines](./docs/performance.md)

## � Troubleshooting

### **Problemas Comuns Epic 4**

```bash
# Serviço não inicializa
docker-compose logs [service-name]
# Verificar configurações de ambiente
cat services/[service]/.env

# Erro de conexão entre serviços
# Verificar network Docker
docker network ls
docker network inspect nexus-network

# Performance issues
# Verificar recursos
docker stats
# Ajustar limits no docker-compose.yml

# Database connection issues
# Verificar PostgreSQL
docker exec -it nexus-postgres-ml psql -U mluser -d nexus_ml

# Redis issues
# Verificar Redis
docker exec -it nexus-redis-ml redis-cli ping
```

### **Logs e Debugging**

```bash
# Logs estruturados Epic 4
tail -f /var/log/nexus-saude/*.log

# Debug específico
export LOG_LEVEL=DEBUG
export PYTHONPATH=/app
python -m debugpy --listen 0.0.0.0:5678 --wait-for-client services/ml-predictive/main.py

# Profiling
export ENABLE_PROFILING=true
```

## 🚀 Performance e Escalabilidade

### **Configurações Recomendadas**

**Desenvolvimento:**

- 2 CPU cores por serviço
- 4GB RAM total
- 20GB storage

**Produção:**

- 4+ CPU cores por serviço
- 16GB+ RAM total
- 100GB+ SSD storage
- Load balancer (nginx/traefik)
- Redis Cluster
- PostgreSQL com replicas

### **Monitoring e Observabilidade**

- **Health Checks**: Automáticos em todos os serviços
- **Métricas**: Prometheus + Grafana
- **Logs**: Estruturados em JSON
- **Tracing**: OpenTelemetry ready
- **Alertas**: Sistema integrado de notificações

---

## 🤝 Contribuição

### **Epic 4 Development**

1. Fork o repositório
2. Crie branch feature (`git checkout -b feature/epic4-enhancement`)
3. Implemente mudanças seguindo os padrões
4. Execute testes: `./scripts/test-epic4.sh`
5. Commit com mensagens claras
6. Push e crie Pull Request

### **Padrões de Código**

- **Python**: PEP 8, Black, isort
- **TypeScript**: ESLint, Prettier
- **Docker**: Multi-stage builds, security scanning
- **APIs**: OpenAPI 3.0, Pydantic validation
- **Testing**: Unit + Integration + E2E

---

## 📄 Licença

Copyright © 2024 Nexus Saúde Team. Todos os direitos reservados.

---

## 🆘 Suporte

- **Documentação**: [/docs](./docs/)
- **Issues**: [GitHub Issues](https://github.com/nexus-saude/issues)
- **Discord**: [Nexus Saúde Community](https://discord.gg/nexus-saude)
- **Email**: dev@nexus-saude.com

---

**🎉 Epic 4 Next-Generation Healthcare Platform - Concluído com Sucesso!**
