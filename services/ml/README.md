# Medical AI/ML Service

## 🧠 Overview

Este serviço implementa modelos de machine learning para análise preditiva médica, incluindo diagnósticos, avaliação de riscos e predição de outcomes.

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- pip ou poetry para gerenciamento de dependências
- Redis para cache
- PostgreSQL para feature store

### Installation

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações
```

### Development

```bash
# Executar servidor de desenvolvimento
python -m uvicorn main:app --reload --port 8000

# Executar testes
pytest tests/

# Treinar modelos
python scripts/train_models.py

# Validar modelos
python scripts/validate_models.py
```

## 📁 Structure

```
services/ml/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── config.py            # Configuration
│   ├── models/              # ML models
│   │   ├── __init__.py
│   │   ├── diagnostic.py    # Diagnostic prediction
│   │   ├── risk.py          # Risk assessment
│   │   └── outcome.py       # Outcome prediction
│   ├── api/                 # API endpoints
│   │   ├── __init__.py
│   │   ├── predictions.py   # Prediction endpoints
│   │   └── monitoring.py    # Monitoring endpoints
│   ├── core/                # Core functionality
│   │   ├── __init__.py
│   │   ├── pipeline.py      # ML pipeline
│   │   ├── features.py      # Feature engineering
│   │   └── preprocessing.py # Data preprocessing
│   ├── schemas/             # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── prediction.py    # Prediction schemas
│   │   └── monitoring.py    # Monitoring schemas
│   └── utils/               # Utilities
│       ├── __init__.py
│       ├── logging.py       # Logging setup
│       └── metrics.py       # Metrics tracking
├── data/                    # Data storage
│   ├── raw/                 # Raw medical data
│   ├── processed/           # Processed features
│   └── models/              # Trained models
├── notebooks/               # Jupyter notebooks
│   ├── exploration/         # Data exploration
│   ├── training/            # Model training
│   └── validation/          # Model validation
├── scripts/                 # Utility scripts
│   ├── train_models.py      # Model training
│   ├── validate_models.py   # Model validation
│   └── data_preparation.py  # Data preparation
├── tests/                   # Tests
│   ├── test_models.py       # Model tests
│   ├── test_api.py          # API tests
│   └── test_pipeline.py     # Pipeline tests
├── requirements.txt         # Python dependencies
├── requirements-dev.txt     # Development dependencies
├── .env.example             # Environment variables template
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker Compose setup
└── README.md                # This file
```

## 🔧 Configuration

### Environment Variables

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nexus_ml
REDIS_URL=redis://localhost:6379/0

# ML Configuration
MODEL_PATH=./data/models
FEATURE_STORE_PATH=./data/processed
ML_EXPERIMENT_TRACKING=mlflow

# Security
JWT_SECRET_KEY=your-secret-key
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Model Performance
ACCURACY_THRESHOLD=0.85
CONFIDENCE_THRESHOLD=0.7
DRIFT_DETECTION_THRESHOLD=0.05
```

## 🤖 Models

### Diagnostic Prediction Model

- **Tipo**: Classificação multi-classe
- **Algoritmo**: Random Forest + Neural Network ensemble
- **Features**: Sintomas, sinais vitais, histórico médico
- **Output**: Top 5 diagnósticos mais prováveis com confiança

### Risk Assessment Model

- **Tipo**: Regressão + Classificação
- **Algoritmo**: Gradient Boosting (XGBoost)
- **Features**: Comorbidades, medicações, scores clínicos
- **Output**: Risk score (0-100) e categoria de risco

### Outcome Prediction Model

- **Tipo**: Regressão temporal
- **Algoritmo**: LSTM + Random Forest
- **Features**: Tratamentos, response histórica, biomarcadores
- **Output**: Probabilidade de sucesso e tempo estimado

## 📊 API Endpoints

### Predictions

```http
POST /api/v1/predictions/diagnostic
Content-Type: application/json

{
  "patient_features": {
    "patient_id": "uuid",
    "age": 45,
    "gender": "M",
    "symptoms": ["fever", "cough", "chest_pain"],
    "vital_signs": {
      "temperature": 38.5,
      "heart_rate": 95,
      "blood_pressure": {"systolic": 140, "diastolic": 90}
    }
  }
}
```

```http
POST /api/v1/predictions/risk
POST /api/v1/predictions/outcome
GET /api/v1/predictions/history/{patient_id}
```

### Monitoring

```http
GET /api/v1/monitoring/health
GET /api/v1/monitoring/metrics
GET /api/v1/monitoring/models
```

## 🔍 Monitoring

### Métricas Rastreadas

- Accuracy, Precision, Recall por modelo
- Latência de predição
- Throughput de requests
- Model drift detection
- Error rates

### Dashboards

- Grafana dashboards para métricas em tempo real
- MLflow para tracking de experimentos
- Custom monitoring dashboard

## 🧪 Testing

```bash
# Executar todos os testes
pytest

# Testes unitários
pytest tests/test_models.py

# Testes de integração
pytest tests/test_api.py

# Testes de performance
pytest tests/test_performance.py

# Coverage report
pytest --cov=app --cov-report=html
```

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t nexus-ml-service .

# Run container
docker run -p 8000:8000 --env-file .env nexus-ml-service

# Docker Compose
docker-compose up -d
```

### Production

```bash
# Usar servidor ASGI otimizado
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 📈 Performance

### Benchmarks

- Predição diagnóstica: < 500ms
- Avaliação de risco: < 200ms
- Throughput: 100+ requests/segundo
- Memory usage: < 2GB por worker

### Otimizações

- Model caching com Redis
- Batch prediction para múltiplos pacientes
- Feature pre-computation
- Model quantization para inference

## 🔒 Security & Compliance

### LGPD/HIPAA

- Anonimização automática de dados sensíveis
- Audit trail completo
- Consent management
- Data retention policies

### Security

- JWT authentication
- Rate limiting
- Input validation
- Secure model storage

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (Swagger)
- **Model Cards**: `docs/model-cards/`
- **Architecture**: `docs/architecture.md`
- **Deployment**: `docs/deployment.md`

## 🆘 Troubleshooting

### Common Issues

1. **Modelo não carrega**

   ```bash
   # Verificar se modelo existe
   ls data/models/
   # Re-treinar se necessário
   python scripts/train_models.py
   ```

2. **Baixa accuracy**

   ```bash
   # Verificar model drift
   python scripts/validate_models.py
   # Re-treinar com dados atualizados
   ```

3. **Performance issues**
   ```bash
   # Monitorar recursos
   htop
   # Verificar cache Redis
   redis-cli monitor
   ```

## 🤝 Contributing

1. Fork o repositório
2. Criar branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit changes (`git commit -m 'Add nova funcionalidade'`)
4. Push branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📄 License

Este projeto está licenciado sob MIT License - veja LICENSE.md para detalhes.
