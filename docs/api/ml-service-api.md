# ML Service API Documentation

## 📋 Overview

The ML Service provides a comprehensive RESTful API for machine learning operations in the Nexus Saúde healthcare platform. Built with FastAPI and scikit-learn, it offers real-time predictions, model training, and data management capabilities.

**Base URL**: `http://localhost:8001`  
**API Version**: v1  
**Authentication**: None (internal service)

## 🚀 Quick Start

### Health Check

```http
GET /
Response: {"message": "ML Service API is running"}
```

### API Documentation

- **Interactive Docs**: http://localhost:8001/docs
- **OpenAPI Schema**: http://localhost:8001/openapi.json

## 📊 Data Management Endpoints

### Get Data Information

```http
GET /api/v1/data/info
```

**Response**:

```json
{
  "total_samples": 1000,
  "diagnostic_samples": 500,
  "risk_samples": 500,
  "features": {
    "diagnostic": 40,
    "risk": 42
  },
  "last_updated": "2025-09-21T10:30:00Z"
}
```

### Generate Synthetic Data

```http
POST /api/v1/data/generate
Content-Type: application/json

{
  "num_samples": 1000,
  "include_labels": true,
  "seed": 42
}
```

**Response**:

```json
{
  "message": "Generated 1000 synthetic samples",
  "samples_created": 1000,
  "features_generated": ["age", "sex", "chest_pain", "..."],
  "generation_time": 0.245
}
```

### Get Data Sample

```http
GET /api/v1/data/sample?limit=5
```

**Response**:

```json
{
  "samples": [
    {
      "age": 45,
      "sex": "M",
      "chest_pain": true,
      "systolic_bp": 140,
      "diastolic_bp": 90,
      "heart_rate": 85,
      "temperature": 37.2,
      "has_diabetes": false,
      "is_smoker": true
    }
  ],
  "total_samples": 5,
  "features_count": 20
}
```

## 🤖 Model Training Endpoints

### Train Diagnostic Model

```http
POST /api/v1/train/diagnostic
Content-Type: application/json

{
  "test_size": 0.2,
  "random_state": 42,
  "n_estimators": 100
}
```

**Response**:

```json
{
  "model_type": "diagnostic",
  "algorithm": "RandomForestClassifier",
  "accuracy": 0.9325,
  "training_samples": 800,
  "test_samples": 200,
  "features_count": 40,
  "training_time": 2.45,
  "model_id": "diagnostic_rf_20250921_103000",
  "feature_importance": {
    "age_normalized": 0.15,
    "systolic_bp_normalized": 0.12,
    "has_chest_pain": 0.1
  }
}
```

### Train Risk Assessment Model

```http
POST /api/v1/train/risk
Content-Type: application/json

{
  "test_size": 0.2,
  "random_state": 42,
  "n_estimators": 100,
  "learning_rate": 0.1
}
```

**Response**:

```json
{
  "model_type": "risk",
  "algorithm": "GradientBoostingClassifier",
  "accuracy": 1.0,
  "training_samples": 800,
  "test_samples": 200,
  "features_count": 42,
  "training_time": 3.12,
  "model_id": "risk_gb_20250921_103000",
  "classes": ["low", "moderate", "high", "critical"]
}
```

## 🔮 Prediction Endpoints

### Diagnostic Prediction

```http
POST /api/v1/predict/diagnostic
Content-Type: application/json

{
  "age": 45,
  "sex": "M",
  "chest_pain": true,
  "shortness_of_breath": false,
  "fatigue": true,
  "dizziness": false,
  "systolic_bp": 140,
  "diastolic_bp": 90,
  "heart_rate": 85,
  "temperature": 37.2,
  "height": 175,
  "weight": 80,
  "is_smoker": true,
  "has_diabetes": false,
  "has_hypertension": true,
  "medications": ["Lisinopril"],
  "family_history": ["Diabetes", "Heart Disease"]
}
```

**Response**:

```json
{
  "diagnosis": "Healthy/Normal",
  "confidence": 0.36,
  "model_type": "RandomForest",
  "features_used": 40,
  "prediction_id": "pred_diag_20250921_103045",
  "alternative_diagnoses": [
    { "diagnosis": "Hypertension", "probability": 0.25 },
    { "diagnosis": "Diabetes", "probability": 0.2 },
    { "diagnosis": "Heart Disease", "probability": 0.19 }
  ],
  "recommendations": [
    "Monitor blood pressure regularly",
    "Consider lifestyle modifications",
    "Follow up in 3 months"
  ]
}
```

### Risk Assessment Prediction

```http
POST /api/v1/predict/risk
Content-Type: application/json

{
  "primary_diagnosis": "Hypertension",
  "risk_level": "moderate",
  "age": 65,
  "sex": "F",
  "systolic_bp": 160,
  "diastolic_bp": 95,
  "heart_rate": 90,
  "has_diabetes": true,
  "has_hypertension": true,
  "is_smoker": false,
  "medications": ["Metformin", "Amlodipine"],
  "recent_hospitalizations": 1,
  "emergency_visits": 2
}
```

**Response**:

```json
{
  "risk_level": "critical",
  "risk_score": 0.999,
  "model_type": "GradientBoosting",
  "features_used": 42,
  "prediction_id": "pred_risk_20250921_103045",
  "risk_factors": [
    { "factor": "Age > 60", "contribution": 0.25 },
    { "factor": "Diabetes + Hypertension", "contribution": 0.3 },
    { "factor": "High Systolic BP", "contribution": 0.2 },
    { "factor": "Recent Hospitalizations", "contribution": 0.24 }
  ],
  "recommendations": [
    "Immediate medical attention recommended",
    "Monitor vital signs closely",
    "Consider medication adjustment",
    "Schedule follow-up within 24 hours"
  ]
}
```

## 🗄️ Database Operations

### Get Training Jobs History

```http
GET /api/v1/database/training-jobs?limit=10&offset=0
```

**Response**:

```json
{
  "training_jobs": [
    {
      "id": 1,
      "model_type": "diagnostic",
      "accuracy": 0.9325,
      "features_count": 40,
      "training_time": 2.45,
      "created_at": "2025-09-21T10:30:00Z"
    },
    {
      "id": 2,
      "model_type": "risk",
      "accuracy": 1.0,
      "features_count": 42,
      "training_time": 3.12,
      "created_at": "2025-09-21T10:35:00Z"
    }
  ],
  "total": 2,
  "limit": 10,
  "offset": 0
}
```

### Get Prediction History

```http
GET /api/v1/database/predictions?model_type=diagnostic&limit=5
```

**Response**:

```json
{
  "predictions": [
    {
      "id": 1,
      "input_data": { "age": 45, "sex": "M", "...": "..." },
      "prediction": { "diagnosis": "Healthy/Normal", "confidence": 0.36 },
      "model_type": "diagnostic",
      "created_at": "2025-09-21T10:45:00Z"
    }
  ],
  "total": 1,
  "limit": 5,
  "offset": 0
}
```

### Get Model Registry

```http
GET /api/v1/database/models
```

**Response**:

```json
{
  "models": [
    {
      "id": 1,
      "model_name": "diagnostic_randomforest",
      "model_type": "diagnostic",
      "version": "1.0.0",
      "accuracy": 0.9325,
      "file_path": "/app/models/diagnostic_model.joblib",
      "created_at": "2025-09-21T10:30:00Z"
    },
    {
      "id": 2,
      "model_name": "risk_gradientboosting",
      "model_type": "risk",
      "version": "1.0.0",
      "accuracy": 1.0,
      "file_path": "/app/models/risk_model.joblib",
      "created_at": "2025-09-21T10:35:00Z"
    }
  ],
  "total": 2
}
```

### Get Data Quality Metrics

```http
GET /api/v1/database/metrics
```

**Response**:

```json
{
  "metrics": [
    {
      "id": 1,
      "metric_name": "data_completeness",
      "metric_value": 0.95,
      "data_source": "synthetic_generation",
      "created_at": "2025-09-21T10:00:00Z"
    },
    {
      "id": 2,
      "metric_name": "feature_correlation",
      "metric_value": 0.78,
      "data_source": "training_data",
      "created_at": "2025-09-21T10:30:00Z"
    }
  ],
  "total": 2
}
```

## 📝 Data Models

### Diagnostic Prediction Input

```json
{
  "age": "integer (required, 0-120)",
  "sex": "string (required, M/F)",
  "chest_pain": "boolean (required)",
  "shortness_of_breath": "boolean (required)",
  "fatigue": "boolean (required)",
  "dizziness": "boolean (required)",
  "systolic_bp": "integer (required, 80-250)",
  "diastolic_bp": "integer (required, 40-150)",
  "heart_rate": "integer (required, 40-200)",
  "temperature": "float (required, 35.0-42.0)",
  "height": "integer (required, 100-250 cm)",
  "weight": "integer (required, 30-300 kg)",
  "is_smoker": "boolean (required)",
  "has_diabetes": "boolean (required)",
  "has_hypertension": "boolean (required)",
  "medications": "array of strings (optional)",
  "family_history": "array of strings (optional)"
}
```

### Risk Assessment Input

```json
{
  "primary_diagnosis": "string (required)",
  "risk_level": "string (required, low/moderate/high/critical)",
  "age": "integer (required, 0-120)",
  "sex": "string (required, M/F)",
  "systolic_bp": "integer (required, 80-250)",
  "diastolic_bp": "integer (required, 40-150)",
  "heart_rate": "integer (required, 40-200)",
  "has_diabetes": "boolean (required)",
  "has_hypertension": "boolean (required)",
  "is_smoker": "boolean (required)",
  "medications": "array of strings (optional)",
  "recent_hospitalizations": "integer (optional, default: 0)",
  "emergency_visits": "integer (optional, default: 0)"
}
```

## ⚠️ Error Responses

### 400 Bad Request

```json
{
  "detail": "Validation error",
  "errors": [
    {
      "field": "age",
      "message": "Age must be between 0 and 120"
    }
  ]
}
```

### 404 Not Found

```json
{
  "detail": "Model not found"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Internal server error",
  "error": "Model prediction failed"
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nexus
# or for development
DATABASE_URL=sqlite:///./ml_data.db

# ML Service
ML_MODEL_PATH=/app/models
ML_LOG_LEVEL=INFO
ML_MAX_PREDICTION_TIME=30

# API
API_VERSION=v1
API_PREFIX=/api/v1
CORS_ORIGINS=["http://localhost:3000"]
```

### Model Configuration

```python
# Diagnostic Model (RandomForest)
{
  "n_estimators": 100,
  "max_depth": 10,
  "min_samples_split": 2,
  "min_samples_leaf": 1,
  "random_state": 42
}

# Risk Model (GradientBoosting)
{
  "n_estimators": 100,
  "learning_rate": 0.1,
  "max_depth": 6,
  "min_samples_split": 2,
  "random_state": 42
}
```

## 📊 Performance Metrics

### Response Times

- **Prediction Endpoint**: < 100ms
- **Training Endpoint**: 2-5 seconds
- **Data Generation**: < 1 second

### Model Performance

- **Diagnostic Model**: 93.25% accuracy
- **Risk Model**: 100% accuracy
- **Feature Processing**: 40-42 features per model

### Resource Usage

- **Memory**: ~200MB per model
- **CPU**: Single core sufficient
- **Storage**: ~10MB per trained model

## 🚀 Deployment

### Docker Container

```bash
# Build image
docker build -t nexus-ml-service .

# Run container
docker run -p 8001:8001 \
  -e DATABASE_URL=postgresql://... \
  nexus-ml-service
```

### Health Monitoring

```bash
# Health check endpoint
curl -f http://localhost:8001/ || exit 1

# Metrics endpoint (if Prometheus enabled)
curl http://localhost:8001/metrics
```

---

**Version**: 1.0.0  
**Last Updated**: September 21, 2025  
**Status**: Production Ready ✅
