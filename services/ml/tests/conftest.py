"""
Test configuration and fixtures for ML service
"""

import pytest
import asyncio
from typing import Generator
from unittest.mock import Mock, patch

try:
    from fastapi.testclient import TestClient
    from httpx import AsyncClient
except ImportError:
    # Mock for development
    class TestClient:
        def __init__(self, app):
            pass
    
    class AsyncClient:
        def __init__(self, **kwargs):
            pass

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Test client for synchronous tests"""
    return TestClient(app)


@pytest.fixture
async def async_client() -> AsyncClient:
    """Async test client for asynchronous tests"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_ml_pipeline():
    """Mock ML pipeline for testing"""
    with patch('app.core.pipeline.MLPipeline') as mock:
        pipeline = Mock()
        pipeline.predict_diagnostic.return_value = {
            "prediction": "diabetes",
            "confidence": 0.85,
            "risk_factors": ["high_glucose", "family_history"]
        }
        pipeline.predict_risk.return_value = {
            "risk_score": 0.75,
            "risk_level": "moderate",
            "contributing_factors": ["age", "bmi", "blood_pressure"]
        }
        mock.return_value = pipeline
        yield pipeline


@pytest.fixture
def sample_diagnostic_request():
    """Sample diagnostic prediction request"""
    return {
        "patient_data": {
            "age": 45,
            "gender": "male",
            "blood_pressure": 140,
            "cholesterol": 200,
            "glucose": 180,
            "bmi": 28.5,
            "family_history": True
        },
        "features": [
            "age", "gender", "blood_pressure", 
            "cholesterol", "glucose", "bmi", "family_history"
        ]
    }


@pytest.fixture
def sample_risk_request():
    """Sample risk assessment request"""
    return {
        "patient_data": {
            "age": 55,
            "gender": "female",
            "medical_history": ["hypertension", "diabetes"],
            "lifestyle_factors": {
                "smoking": False,
                "exercise": "moderate",
                "diet": "balanced"
            },
            "family_history": ["heart_disease", "stroke"]
        },
        "risk_type": "cardiovascular"
    }


@pytest.fixture
def mock_database():
    """Mock database connection"""
    with patch('app.core.database.get_connection') as mock:
        connection = Mock()
        mock.return_value = connection
        yield connection


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


class MockDataset:
    """Mock dataset for testing"""
    
    def __init__(self, size=1000):
        self.size = size
        self.data = self._generate_mock_data()
    
    def _generate_mock_data(self):
        """Generate mock medical data"""
        import random
        
        data = []
        for i in range(self.size):
            record = {
                "patient_id": f"P{i:04d}",
                "age": random.randint(18, 90),
                "gender": random.choice(["male", "female"]),
                "blood_pressure": random.randint(90, 200),
                "cholesterol": random.randint(150, 300),
                "glucose": random.randint(70, 300),
                "bmi": round(random.uniform(18.5, 40.0), 1),
                "family_history": random.choice([True, False]),
                "diagnosis": random.choice([
                    "healthy", "diabetes", "hypertension", 
                    "heart_disease", "obesity"
                ])
            }
            data.append(record)
        
        return data


@pytest.fixture
def mock_dataset():
    """Mock dataset fixture"""
    return MockDataset()


@pytest.fixture
def mock_model():
    """Mock trained model"""
    model = Mock()
    model.predict.return_value = [0.85, 0.15]  # Mock prediction probabilities
    model.predict_proba.return_value = [[0.15, 0.85], [0.75, 0.25]]
    model.feature_importances_ = [0.2, 0.3, 0.15, 0.1, 0.25]
    return model


@pytest.fixture
def mock_redis():
    """Mock Redis connection"""
    with patch('app.core.cache.get_redis') as mock:
        redis_client = Mock()
        redis_client.get.return_value = None
        redis_client.set.return_value = True
        redis_client.exists.return_value = False
        mock.return_value = redis_client
        yield redis_client


@pytest.fixture
def mock_mlflow():
    """Mock MLflow for experiment tracking"""
    with patch('mlflow.start_run'), \
         patch('mlflow.log_metric'), \
         patch('mlflow.log_param'), \
         patch('mlflow.sklearn.log_model'):
        yield


# Test data constants
TEST_PATIENT_DATA = {
    "basic": {
        "age": 45,
        "gender": "male",
        "blood_pressure": 135,
        "cholesterol": 200,
        "glucose": 120
    },
    "diabetic": {
        "age": 55,
        "gender": "female", 
        "blood_pressure": 145,
        "cholesterol": 250,
        "glucose": 180,
        "bmi": 32.0,
        "family_history": True
    },
    "healthy": {
        "age": 30,
        "gender": "male",
        "blood_pressure": 120,
        "cholesterol": 180,
        "glucose": 95,
        "bmi": 23.5,
        "family_history": False
    }
}

TEST_PREDICTIONS = {
    "diagnostic": {
        "diabetes": {
            "prediction": "diabetes",
            "confidence": 0.87,
            "risk_factors": ["high_glucose", "family_history", "obesity"]
        },
        "healthy": {
            "prediction": "healthy",
            "confidence": 0.92,
            "risk_factors": []
        }
    },
    "risk": {
        "high": {
            "risk_score": 0.85,
            "risk_level": "high",
            "contributing_factors": ["age", "blood_pressure", "cholesterol"]
        },
        "low": {
            "risk_score": 0.25,
            "risk_level": "low",
            "contributing_factors": ["age"]
        }
    }
}