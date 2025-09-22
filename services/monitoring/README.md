# Nexus Saúde - Real-time Monitoring Service

Sistema de monitoramento em tempo real com alertas inteligentes para o ecossistema Nexus Saúde.

## 📋 Visão Geral

O **Real-time Monitoring Service** é um sistema abrangente de monitoramento de pacientes e infraestrutura que oferece:

- ✅ Monitoramento de sinais vitais em tempo real
- ✅ Sistema de alertas inteligentes com correlação e supressão
- ✅ Dashboard web interativo com visualizações em tempo real
- ✅ Notificações multi-canal (email, SMS, push, Slack, Teams, WhatsApp)
- ✅ Escalação automática de alertas em múltiplos níveis
- ✅ Métricas de sistema e performance
- ✅ API RESTful completa e WebSocket para atualizações em tempo real
- ✅ Arquitetura escalável e alta disponibilidade

## 🚀 Recursos Principais

### Monitoramento de Pacientes

- **Sinais Vitais**: Frequência cardíaca, pressão arterial, temperatura, saturação de oxigênio, frequência respiratória
- **Detecção de Anomalias**: Algoritmos inteligentes para identificar padrões anômalos
- **Análise de Tendências**: Monitoramento de tendências e correlações entre sinais vitais
- **Avaliação de Risco**: Classificação automática de risco do paciente

### Sistema de Alertas

- **Motor de Alertas Inteligente**: Correlação de alertas, supressão de duplicatas, auto-resolução
- **Severidade Configurável**: Alertas low, medium, high e critical
- **Regras Personalizáveis**: Configuração flexível de thresholds e condições
- **Histórico Completo**: Rastreamento completo do ciclo de vida dos alertas

### Notificações Multi-canal

- **Email**: Notificações via SMTP com templates customizáveis
- **SMS**: Integração com Twilio para mensagens de texto
- **Push Notifications**: Suporte a Firebase para notificações móveis
- **Webhook**: Integração com sistemas externos via HTTP
- **Slack**: Notificações em canais do Slack
- **Microsoft Teams**: Integração com Teams via webhook
- **WhatsApp Business**: Suporte a WhatsApp Business API

### Escalação Automática

- **5 Níveis de Escalação**: Sistema hierárquico de escalação
- **Timeout Configurável**: Tempos limite personalizáveis por nível
- **Agendamento On-call**: Suporte a escalas de plantão
- **Resolução Automática**: Detecção automática de resolução

### Dashboard Web

- **Interface Interativa**: Dashboard responsivo com atualizações em tempo real
- **Visualizações**: Gráficos interativos e métricas em tempo real
- **Customizável**: Widgets personalizáveis e layout flexível
- **WebSocket**: Atualizações instantâneas via WebSocket

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    Real-time Monitoring Service             │
├─────────────────────────────────────────────────────────────┤
│  Core Modules                                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ VitalSigns      │ │ Patient         │ │ System        │  │
│  │ Monitor         │ │ Monitor         │ │ Monitor       │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
│  ┌─────────────────┐                                        │
│  │ Metrics         │                                        │
│  │ Collector       │                                        │
│  └─────────────────┘                                        │
├─────────────────────────────────────────────────────────────┤
│  Alert System                                               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ Alert           │ │ Notification    │ │ Escalation    │  │
│  │ Engine          │ │ Service         │ │ Manager       │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Dashboard                                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │ Dashboard       │ │ Real-time       │ │ Static        │  │
│  │ Manager         │ │ Data Handler    │ │ Assets        │  │
│  └─────────────────┘ └─────────────────┘ └───────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ REST API        │ │ WebSocket       │                   │
│  │ (FastAPI)       │ │ Server          │                   │
│  └─────────────────┘ └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Integração com Outros Serviços

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ML Service    │    │  FHIR Gateway   │    │ AI Assistant    │
│   (Port 8001)   │    │   (Port 8004)   │    │  (Port 8002)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌─────────────────────────────────┐
                │    Monitoring Service           │
                │       (Port 8005)               │
                └─────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  NLP Service    │    │ Data Warehouse  │    │   Front-end     │
│  (Port 8003)    │    │  (Port 8006)    │    │  Applications   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Instalação e Configuração

### Pré-requisitos

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (opcional)

### Instalação Local

1. **Clone o repositório**:

```bash
git clone https://github.com/nexus-saude/monitoring-service
cd monitoring-service
```

2. **Instale as dependências**:

```bash
pip install -r requirements.txt
```

3. **Configure o ambiente**:

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Inicialize o banco de dados**:

```bash
# Configure PostgreSQL e Redis
# Execute as migrações necessárias
```

5. **Execute o serviço**:

```bash
python main.py
```

### Instalação com Docker

1. **Clone e configure**:

```bash
git clone https://github.com/nexus-saude/monitoring-service
cd monitoring-service
cp .env.example .env
```

2. **Execute com Docker Compose**:

```bash
docker-compose up -d
```

## 🔧 Configuração

### Variáveis de Ambiente Principais

```env
# Servidor
HOST=0.0.0.0
PORT=8005
ENVIRONMENT=production

# Banco de Dados
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/nexus_monitoring
REDIS_URL=redis://localhost:6379/0

# Monitoramento
MONITORING_INTERVAL=30
VITAL_SIGNS_INTERVAL=10
ALERT_PROCESSING_INTERVAL=5

# Notificações
SMTP_HOST=smtp.gmail.com
SMTP_USERNAME=alerts@nexussaude.com
SMTP_PASSWORD=your_password
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
SLACK_BOT_TOKEN=xoxb-your-token

# Thresholds
HEART_RATE_MIN_NORMAL=60
HEART_RATE_MAX_NORMAL=100
BLOOD_PRESSURE_SYSTOLIC_MAX_NORMAL=140
TEMPERATURE_MAX_NORMAL=37.5
OXYGEN_SATURATION_MIN_NORMAL=95
```

### Configuração de Alertas

```python
# Exemplo de configuração de thresholds
THRESHOLDS = {
    "heart_rate": {
        "normal": (60, 100),
        "warning": (50, 120),
        "critical": (40, 150)
    },
    "blood_pressure_systolic": {
        "normal": (90, 140),
        "warning": (80, 160),
        "critical": (70, 180)
    },
    "temperature": {
        "normal": (36.0, 37.5),
        "warning": (35.5, 38.0),
        "critical": (35.0, 40.0)
    }
}
```

## 🌐 API Reference

### Endpoints Principais

#### Sinais Vitais

```http
POST /vital-signs
GET /vital-signs/{patient_id}
GET /vital-signs/{patient_id}/history
```

#### Alertas

```http
GET /alerts
POST /alerts
GET /alerts/{alert_id}
PUT /alerts/{alert_id}/resolve
GET /alerts/patient/{patient_id}
```

#### Dashboard

```http
GET /dashboard
GET /dashboard/data
POST /dashboard/widgets
GET /dashboard/widgets/{widget_id}
```

#### Métricas do Sistema

```http
GET /system/metrics
GET /system/status
GET /system/health
```

#### WebSocket

```
ws://localhost:8005/ws/{client_id}
```

### Exemplo de Uso da API

#### Enviando Sinais Vitais

```python
import httpx

async def send_vital_signs():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8005/vital-signs",
            json={
                "patient_id": "P001",
                "heart_rate": 85,
                "blood_pressure_systolic": 120,
                "blood_pressure_diastolic": 80,
                "temperature": 36.8,
                "oxygen_saturation": 98,
                "respiratory_rate": 16,
                "timestamp": "2024-01-15T10:30:00Z"
            }
        )
        return response.json()
```

#### Conectando via WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8005/ws/dashboard');

ws.onopen = function () {
  // Subscrever a alertas
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      channel: 'alerts',
    })
  );
};

ws.onmessage = function (event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## 📊 Dashboard

### Acesso ao Dashboard

O dashboard web está disponível em: `http://localhost:8005/dashboard`

### Recursos do Dashboard

- **Métricas em Tempo Real**: CPU, memória, pacientes monitorados, alertas ativos
- **Lista de Alertas Recentes**: Alertas ordenados por severidade e timestamp
- **Status do Sistema**: Indicadores de saúde dos componentes
- **Pacientes Críticos**: Lista de pacientes que requerem atenção imediata
- **Gráficos Interativos**: Visualizações de métricas históricas
- **Atualizações em Tempo Real**: Via WebSocket para dados instantâneos

### Personalização do Dashboard

```python
# Criar widget personalizado
widget_config = {
    "type": "metric",
    "title": "Pacientes em UTI",
    "data_source": "patient_monitor",
    "refresh_interval": 30,
    "position": {"row": 0, "col": 0},
    "size": {"width": 1, "height": 1}
}

response = await client.post("/dashboard/widgets", json=widget_config)
```

## 🔔 Sistema de Notificações

### Configuração de Canais

#### Email (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=alerts@nexussaude.com
SMTP_PASSWORD=your_app_password
SMTP_USE_TLS=true
```

#### SMS (Twilio)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+5511999999999
```

#### Slack

```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx
SLACK_CHANNEL=#nexus-alerts
```

#### Microsoft Teams

```env
TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/...
```

### Personalização de Templates

```python
# Template de email personalizado
EMAIL_TEMPLATE = """
<h2>🚨 Alerta Crítico - Nexus Saúde</h2>
<p><strong>Paciente:</strong> {{ patient_id }}</p>
<p><strong>Severidade:</strong> {{ severity }}</p>
<p><strong>Mensagem:</strong> {{ message }}</p>
<p><strong>Timestamp:</strong> {{ timestamp }}</p>
<hr>
<p>Acesse o dashboard: <a href="{{ dashboard_url }}">Ver Detalhes</a></p>
"""
```

## 📈 Monitoramento e Métricas

### Métricas Disponíveis

- **Pacientes**: Total monitorados, críticos, estáveis
- **Alertas**: Total gerados, ativos, resolvidos por severidade
- **Sistema**: CPU, memória, disco, rede, uptime
- **Performance**: Latência de API, throughput, conexões WebSocket
- **Notificações**: Taxa de entrega, falhas, tempo de resposta

### Integração com Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nexus-monitoring'
    static_configs:
      - targets: ['localhost:8005']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

### Dashboards Grafana

O serviço inclui dashboards pré-configurados para Grafana:

- **Overview**: Métricas gerais do sistema
- **Alertas**: Análise de alertas e tendências
- **Pacientes**: Monitoramento de pacientes
- **Performance**: Métricas de performance da aplicação

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
pytest

# Testes específicos
pytest tests/test_vital_signs.py
pytest tests/test_alerts.py
pytest tests/test_dashboard.py

# Com cobertura
pytest --cov=. --cov-report=html
```

### Testes de Carga

```bash
# Teste de carga WebSocket
python tests/load_test_websocket.py

# Teste de carga API
python tests/load_test_api.py
```

## 🚀 Deploy em Produção

### Docker Compose (Recomendado)

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/
```

### Considerações de Produção

1. **Segurança**:
   - Configure HTTPS com certificados SSL
   - Use autenticação JWT para APIs
   - Configure rate limiting
   - Valide todas as entradas

2. **Escalabilidade**:
   - Configure múltiplas réplicas
   - Use load balancer
   - Configure Redis Cluster
   - Otimize pools de conexão

3. **Monitoramento**:
   - Configure Sentry para error tracking
   - Use Prometheus + Grafana
   - Configure logs estruturados
   - Monitore métricas de negócio

4. **Backup**:
   - Configure backup automático do PostgreSQL
   - Backup de configurações Redis
   - Retenção de logs
   - Disaster recovery plan

## 🤝 Contribuição

### Desenvolvimento Local

1. **Fork e clone** o repositório
2. **Crie uma branch** para sua feature: `git checkout -b feature/nova-funcionalidade`
3. **Instale dependências de desenvolvimento**: `pip install -r requirements-dev.txt`
4. **Execute os testes**: `pytest`
5. **Faça commit** das mudanças: `git commit -m 'Add: nova funcionalidade'`
6. **Push para branch**: `git push origin feature/nova-funcionalidade`
7. **Abra um Pull Request**

### Padrões de Código

- **Python**: Seguir PEP 8, usar Black para formatação
- **Async/Await**: Usar padrões assíncronos sempre que possível
- **Type Hints**: Incluir type hints em todas as funções
- **Documentação**: Documentar funções com docstrings
- **Testes**: Manter cobertura de testes > 80%

## 📄 Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Documentação**: [docs.nexussaude.com](https://docs.nexussaude.com)
- **Issues**: [GitHub Issues](https://github.com/nexus-saude/monitoring-service/issues)
- **Email**: support@nexussaude.com
- **Slack**: [#nexus-support](https://nexussaude.slack.com/channels/nexus-support)

---

**Nexus Saúde** - Transformando o cuidado em saúde através da tecnologia 🏥✨
