"""
Configuration for AI Medical Assistant Service
"""

import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field

class AIServiceSettings(BaseSettings):
    """Settings for AI Medical Assistant Service"""
    
    # Service Configuration
    service_name: str = "ai-medical-assistant"
    service_version: str = "1.0.0"
    debug: bool = Field(default=False, env="DEBUG")
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", env="AI_HOST")
    port: int = Field(default=8002, env="AI_PORT")
    workers: int = Field(default=1, env="AI_WORKERS")
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-3.5-turbo", env="OPENAI_MODEL")
    openai_temperature: float = Field(default=0.3, env="OPENAI_TEMPERATURE")
    openai_max_tokens: int = Field(default=1000, env="OPENAI_MAX_TOKENS")
    
    # Hugging Face Configuration
    hf_model_cache_dir: str = Field(default="./models", env="HF_CACHE_DIR")
    hf_use_auth_token: bool = Field(default=False, env="HF_USE_AUTH_TOKEN")
    
    # Medical Knowledge Configuration
    medical_knowledge_path: str = Field(default="./data/medical_knowledge", env="MEDICAL_KNOWLEDGE_PATH")
    enable_medical_db: bool = Field(default=True, env="ENABLE_MEDICAL_DB")
    
    # NLP Configuration
    spacy_model: str = Field(default="en_core_web_sm", env="SPACY_MODEL")
    sentence_transformer_model: str = Field(default="all-MiniLM-L6-v2", env="SENTENCE_TRANSFORMER_MODEL")
    
    # Conversation Configuration
    conversation_timeout_minutes: int = Field(default=30, env="CONVERSATION_TIMEOUT")
    max_conversation_memory: int = Field(default=20, env="MAX_CONVERSATION_MEMORY")
    
    # Security Configuration
    api_key: Optional[str] = Field(default=None, env="AI_API_KEY")
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"], 
        env="ALLOWED_ORIGINS"
    )
    
    # Database Configuration
    database_url: str = Field(
        default="postgresql://nexus:nexus123@localhost/nexus_ai",
        env="AI_DATABASE_URL"
    )
    
    # External Services
    ml_service_url: str = Field(default="http://localhost:8001", env="ML_SERVICE_URL")
    fhir_service_url: str = Field(default="http://localhost:8003", env="FHIR_SERVICE_URL")
    
    # Monitoring Configuration
    enable_metrics: bool = Field(default=True, env="ENABLE_METRICS")
    metrics_port: int = Field(default=9092, env="AI_METRICS_PORT")
    
    # Logging Configuration
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    log_format: str = Field(default="json", env="LOG_FORMAT")
    
    # Feature Flags
    enable_emergency_detection: bool = Field(default=True, env="ENABLE_EMERGENCY_DETECTION")
    enable_drug_interaction_check: bool = Field(default=True, env="ENABLE_DRUG_INTERACTION_CHECK")
    enable_recommendation_engine: bool = Field(default=True, env="ENABLE_RECOMMENDATION_ENGINE")
    enable_conversation_memory: bool = Field(default=True, env="ENABLE_CONVERSATION_MEMORY")
    
    # Rate Limiting
    rate_limit_requests_per_minute: int = Field(default=60, env="RATE_LIMIT_RPM")
    rate_limit_requests_per_hour: int = Field(default=1000, env="RATE_LIMIT_RPH")
    
    # Caching
    enable_cache: bool = Field(default=True, env="ENABLE_CACHE")
    cache_ttl_seconds: int = Field(default=3600, env="CACHE_TTL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = AIServiceSettings()

# Model paths and configurations
MODEL_CONFIGS = {
    "medical_ner": {
        "model_name": "Clinical-AI-Apollo/Medical-NER",
        "cache_dir": settings.hf_model_cache_dir,
        "use_auth_token": settings.hf_use_auth_token
    },
    "summarization": {
        "model_name": "facebook/bart-large-cnn",
        "cache_dir": settings.hf_model_cache_dir,
        "max_length": 150,
        "min_length": 30
    },
    "sentence_transformer": {
        "model_name": settings.sentence_transformer_model,
        "cache_dir": settings.hf_model_cache_dir
    }
}

# Emergency keywords and weights
EMERGENCY_CONFIG = {
    "keywords": {
        "chest_pain": 0.8,
        "difficulty_breathing": 0.8,
        "unconscious": 0.9,
        "severe_bleeding": 0.8,
        "stroke_symptoms": 0.9,
        "severe_headache": 0.7,
        "allergic_reaction": 0.7
    },
    "symptom_combinations": {
        ("chest_pain", "shortness_of_breath"): 0.9,
        ("severe_headache", "confusion"): 0.8,
        ("abdominal_pain", "vomiting_blood"): 0.9
    }
}

# Medical knowledge configuration
MEDICAL_KNOWLEDGE_CONFIG = {
    "knowledge_sources": [
        "icd_10",
        "snomed_ct", 
        "clinical_guidelines",
        "drug_interactions",
        "symptom_checker"
    ],
    "update_frequency_hours": 24,
    "confidence_threshold": 0.6
}

# Conversation flow configuration
CONVERSATION_CONFIG = {
    "max_turns": 50,
    "emergency_escalation_threshold": 0.7,
    "follow_up_questions_limit": 3,
    "context_memory_turns": 10
}

# Recommendation engine configuration  
RECOMMENDATION_CONFIG = {
    "max_recommendations": 10,
    "confidence_threshold": 0.5,
    "personalization_weight": 0.3,
    "evidence_based_weight": 0.7
}

# API Response templates
API_RESPONSES = {
    "success": {
        "status": "success",
        "message": "Request processed successfully"
    },
    "error": {
        "status": "error", 
        "message": "An error occurred processing the request"
    },
    "emergency": {
        "status": "emergency",
        "message": "Emergency condition detected - seek immediate medical attention"
    }
}