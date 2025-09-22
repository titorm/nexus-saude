"""
Configuration settings for ML service
"""

try:
    from pydantic_settings import BaseSettings
    from pydantic import Field
except ImportError:
    # Mock for development
    class BaseSettings:
        pass
    
    def Field(**kwargs):
        return None

import os
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    app_name: str = "Nexus Saúde ML Service"
    version: str = "1.0.0"
    debug: bool = False
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8001
    
    # Environment
    environment: str = "development"
    
    # Logging
    log_level: str = "info"
    
    # Database Configuration
    database_url: Optional[str] = None
    
    # Redis Configuration
    redis_url: Optional[str] = None
    
    # ML Configuration
    model_path: str = "data/models"
    data_path: str = "data"
    
    # Model Training
    default_test_size: float = 0.2
    random_state: int = 42
    
    # API Rate Limiting
    max_requests_per_minute: int = 100
    
    # Security
    enable_cors: bool = True
    cors_origins: list = ["*"]
    
    # Monitoring
    enable_metrics: bool = True
    metrics_path: str = "/metrics"
    
    # Health Check
    health_check_timeout: int = 30
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # Ignore extra fields from environment
        "case_sensitive": False,
        "arbitrary_types_allowed": True
    }


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings