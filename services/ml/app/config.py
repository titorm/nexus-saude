"""
Configuration settings for the Medical AI/ML Service
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True
    API_WORKERS: int = 1
    
    # Database Configuration
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/nexus_ml"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # ML Configuration
    MODEL_PATH: str = "./data/models"
    FEATURE_STORE_PATH: str = "./data/processed"
    TRAINING_DATA_PATH: str = "./data/raw"
    ML_EXPERIMENT_TRACKING: str = "mlflow"
    MLFLOW_TRACKING_URI: str = "http://localhost:5000"
    
    # Model Performance Thresholds
    ACCURACY_THRESHOLD: float = 0.85
    PRECISION_THRESHOLD: float = 0.80
    RECALL_THRESHOLD: float = 0.85
    CONFIDENCE_THRESHOLD: float = 0.70
    DRIFT_DETECTION_THRESHOLD: float = 0.05
    
    # Security
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:5173"
    ]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: str = "./logs/ml-service.log"
    
    # Cache Configuration
    CACHE_TTL: int = 3600
    PREDICTION_CACHE_SIZE: int = 1000
    
    # Model Training
    TRAIN_TEST_SPLIT: float = 0.8
    VALIDATION_SPLIT: float = 0.2
    RANDOM_SEED: int = 42
    MAX_TRAINING_TIME: int = 3600
    
    # Monitoring
    PROMETHEUS_PORT: int = 9090
    METRICS_ENABLED: bool = True
    HEALTH_CHECK_INTERVAL: int = 30
    
    # Feature Engineering
    FEATURE_SELECTION_THRESHOLD: float = 0.01
    FEATURE_SCALING_METHOD: str = "standard"
    HANDLE_MISSING_VALUES: str = "median"
    
    # Medical Compliance
    ANONYMIZE_PATIENT_DATA: bool = True
    AUDIT_PREDICTIONS: bool = True
    GDPR_COMPLIANCE: bool = True
    HIPAA_COMPLIANCE: bool = True
    
    # Performance
    MAX_CONCURRENT_PREDICTIONS: int = 100
    PREDICTION_TIMEOUT: int = 30
    BATCH_SIZE: int = 32
    GPU_ENABLED: bool = False
    
    # Development
    DEBUG: bool = True
    RELOAD_MODELS_ON_CHANGE: bool = True
    SAVE_PREDICTION_LOGS: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()