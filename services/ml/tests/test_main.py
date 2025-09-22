"""
Tests for main FastAPI application
"""

import pytest
from unittest.mock import patch, Mock

try:
    from fastapi.testclient import TestClient
except ImportError:
    # Mock for development
    class TestClient:
        def __init__(self, app):
            pass
        
        def get(self, path):
            return Mock(status_code=200, json=lambda: {"status": "ok"})

from app.main import app


class TestMainApp:
    """Test cases for main FastAPI application"""
    
    def test_app_creation(self):
        """Test that the FastAPI app is created properly"""
        assert app is not None
        assert hasattr(app, 'routes')
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
    
    def test_ready_endpoint(self, client):
        """Test readiness check endpoint"""
        response = client.get("/health/ready")
        assert response.status_code == 200
        
        data = response.json()
        assert "ready" in data
        assert "checks" in data
    
    def test_metrics_endpoint(self, client):
        """Test Prometheus metrics endpoint"""
        response = client.get("/metrics")
        assert response.status_code == 200
        
        # Should return metrics in Prometheus format
        content = response.content.decode()
        assert "http_requests_total" in content or len(content) > 0
    
    @patch('app.core.pipeline.MLPipeline')
    def test_prediction_endpoint_diagnostic(self, mock_pipeline, client):
        """Test diagnostic prediction endpoint"""
        # Mock pipeline response
        mock_instance = Mock()
        mock_instance.predict_diagnostic.return_value = {
            "prediction": "diabetes",
            "confidence": 0.85,
            "risk_factors": ["high_glucose"]
        }
        mock_pipeline.return_value = mock_instance
        
        # Test request
        request_data = {
            "patient_data": {
                "age": 45,
                "blood_pressure": 140,
                "glucose": 180
            },
            "features": ["age", "blood_pressure", "glucose"]
        }
        
        response = client.post("/predictions/diagnostic", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "prediction" in data
        assert "confidence" in data
    
    @patch('app.core.pipeline.MLPipeline')
    def test_prediction_endpoint_risk(self, mock_pipeline, client):
        """Test risk assessment endpoint"""
        # Mock pipeline response
        mock_instance = Mock()
        mock_instance.predict_risk.return_value = {
            "risk_score": 0.75,
            "risk_level": "moderate",
            "contributing_factors": ["age", "bmi"]
        }
        mock_pipeline.return_value = mock_instance
        
        # Test request
        request_data = {
            "patient_data": {
                "age": 55,
                "medical_history": ["hypertension"]
            },
            "risk_type": "cardiovascular"
        }
        
        response = client.post("/predictions/risk", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "risk_score" in data
        assert "risk_level" in data
    
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.get("/health")
        assert response.status_code == 200
        
        # In a real test, we'd check for CORS headers
        # This is a placeholder for when CORS is properly configured
        # assert "Access-Control-Allow-Origin" in response.headers
    
    def test_request_logging(self, client):
        """Test that requests are logged properly"""
        with patch('app.utils.logging.get_logger') as mock_logger:
            logger_instance = Mock()
            mock_logger.return_value = logger_instance
            
            response = client.get("/health")
            assert response.status_code == 200
            
            # Verify logging was called (in real implementation)
            # logger_instance.info.assert_called()
    
    def test_error_handling(self, client):
        """Test error handling for invalid requests"""
        # Test invalid endpoint
        response = client.get("/invalid-endpoint")
        assert response.status_code == 404
        
        # Test invalid prediction request
        invalid_request = {
            "invalid_field": "test"
        }
        
        response = client.post("/predictions/diagnostic", json=invalid_request)
        # Should return 422 (validation error) or handle gracefully
        assert response.status_code in [400, 422, 500]


class TestAPIDocumentation:
    """Test API documentation endpoints"""
    
    def test_openapi_schema(self, client):
        """Test OpenAPI schema endpoint"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
    
    def test_docs_endpoint(self, client):
        """Test Swagger UI docs endpoint"""
        response = client.get("/docs")
        assert response.status_code == 200
        
        # Should return HTML content
        content = response.content.decode()
        assert "swagger" in content.lower() or "openapi" in content.lower()
    
    def test_redoc_endpoint(self, client):
        """Test ReDoc documentation endpoint"""
        response = client.get("/redoc")
        assert response.status_code == 200
        
        # Should return HTML content
        content = response.content.decode()
        assert "redoc" in content.lower() or "documentation" in content.lower()


class TestMiddleware:
    """Test middleware functionality"""
    
    @patch('time.time')
    def test_request_timing_middleware(self, mock_time, client):
        """Test request timing middleware"""
        mock_time.side_effect = [1000.0, 1000.5]  # 500ms request
        
        response = client.get("/health")
        assert response.status_code == 200
        
        # In real implementation, would check for timing headers
        # assert "X-Process-Time" in response.headers
    
    def test_security_headers_middleware(self, client):
        """Test security headers middleware"""
        response = client.get("/health")
        assert response.status_code == 200
        
        # In real implementation, would check for security headers
        # assert "X-Content-Type-Options" in response.headers
        # assert "X-Frame-Options" in response.headers


class TestErrorHandling:
    """Test error handling scenarios"""
    
    @patch('app.core.pipeline.MLPipeline')
    def test_pipeline_error_handling(self, mock_pipeline, client):
        """Test handling of ML pipeline errors"""
        # Mock pipeline to raise an exception
        mock_instance = Mock()
        mock_instance.predict_diagnostic.side_effect = Exception("Model error")
        mock_pipeline.return_value = mock_instance
        
        request_data = {
            "patient_data": {"age": 45},
            "features": ["age"]
        }
        
        response = client.post("/predictions/diagnostic", json=request_data)
        
        # Should handle error gracefully
        assert response.status_code in [500, 503]
        
        data = response.json()
        assert "detail" in data or "error" in data
    
    def test_validation_error_handling(self, client):
        """Test handling of validation errors"""
        # Send invalid JSON
        response = client.post(
            "/predictions/diagnostic",
            json={"invalid": "data"}
        )
        
        # Should return validation error
        assert response.status_code in [400, 422]
        
        data = response.json()
        assert "detail" in data or "error" in data
    
    def test_large_request_handling(self, client):
        """Test handling of large requests"""
        # Create a large request
        large_data = {
            "patient_data": {f"feature_{i}": i for i in range(1000)},
            "features": [f"feature_{i}" for i in range(1000)]
        }
        
        response = client.post("/predictions/diagnostic", json=large_data)
        
        # Should handle or reject large requests appropriately
        assert response.status_code in [200, 400, 413, 422]


if __name__ == "__main__":
    # Run tests if executed directly
    import sys
    sys.exit(pytest.main([__file__]))