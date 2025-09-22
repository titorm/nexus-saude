"""
ML Service Monitoring Module
Provides comprehensive metrics collection and monitoring capabilities
using Prometheus for the Nexus Saude ML service.
"""

import time
import psutil
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any
from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_fastapi_instrumentator import Instrumentator, metrics
from fastapi import FastAPI, Request
from functools import wraps
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# PROMETHEUS METRICS DEFINITIONS
# ============================================================================

# API Metrics
api_requests_total = Counter(
    'ml_api_requests_total',
    'Total number of API requests',
    ['method', 'endpoint', 'status_code']
)

api_request_duration = Histogram(
    'ml_api_request_duration_seconds',
    'Time spent processing API requests',
    ['method', 'endpoint'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
)

# Model Performance Metrics
model_predictions_total = Counter(
    'ml_model_predictions_total',
    'Total number of model predictions',
    ['model_type', 'prediction_type']
)

model_prediction_duration = Histogram(
    'ml_model_prediction_duration_seconds',
    'Time spent on model predictions',
    ['model_type'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

model_confidence_score = Histogram(
    'ml_model_confidence_score',
    'Model prediction confidence scores',
    ['model_type'],
    buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

model_accuracy = Gauge(
    'ml_model_accuracy',
    'Current model accuracy',
    ['model_type']
)

# Training Metrics
model_training_duration = Histogram(
    'ml_model_training_duration_seconds',
    'Time spent training models',
    ['model_type'],
    buckets=[1, 5, 10, 30, 60, 120, 300, 600]
)

model_training_samples = Gauge(
    'ml_model_training_samples',
    'Number of samples used for training',
    ['model_type']
)

model_features_count = Gauge(
    'ml_model_features_count',
    'Number of features used in model',
    ['model_type']
)

# Data Quality Metrics
data_quality_score = Gauge(
    'ml_data_quality_score',
    'Data quality score',
    ['data_source', 'metric_type']
)

data_drift_score = Gauge(
    'ml_data_drift_score',
    'Data drift detection score',
    ['feature_name', 'model_type']
)

# System Metrics
system_cpu_usage = Gauge(
    'ml_system_cpu_usage_percent',
    'CPU usage percentage'
)

system_memory_usage = Gauge(
    'ml_system_memory_usage_bytes',
    'Memory usage in bytes'
)

system_disk_usage = Gauge(
    'ml_system_disk_usage_bytes',
    'Disk usage in bytes'
)

# Model Registry Metrics
models_registry_count = Gauge(
    'ml_models_registry_count',
    'Number of models in registry',
    ['model_type', 'status']
)

# Error Metrics
ml_errors_total = Counter(
    'ml_errors_total',
    'Total number of ML service errors',
    ['error_type', 'component']
)

# Database Metrics
database_operations_total = Counter(
    'ml_database_operations_total',
    'Total database operations',
    ['operation_type', 'table_name']
)

database_operation_duration = Histogram(
    'ml_database_operation_duration_seconds',
    'Database operation duration',
    ['operation_type'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]
)

# ============================================================================
# MONITORING CLASS
# ============================================================================

class MLMonitoring:
    """
    Comprehensive monitoring class for ML service metrics collection.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.start_time = time.time()
        
    def setup_instrumentator(self, app: FastAPI) -> Instrumentator:
        """
        Setup Prometheus instrumentator for FastAPI application.
        """
        instrumentator = Instrumentator(
            should_group_status_codes=False,
            should_ignore_untemplated=True,
            should_respect_env_var=True,
            should_instrument_requests_inprogress=True,
            excluded_handlers=["/metrics", "/health", "/docs", "/openapi.json"],
            inprogress_name="ml_inprogress",
            inprogress_labels=True,
        )
        
        # Add custom metrics
        instrumentator.add(
            metrics.request_size(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_name="ml_request_size_bytes",
                metric_doc="Size of requests in bytes."
            )
        ).add(
            metrics.response_size(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_name="ml_response_size_bytes",
                metric_doc="Size of responses in bytes."
            )
        ).add(
            metrics.latency(
                should_include_handler=True,
                should_include_method=True,
                should_include_status=True,
                metric_name="ml_request_latency_seconds",
                metric_doc="Latency of requests in seconds."
            )
        )
        
        # Instrument the app
        instrumentator.instrument(app)
        instrumentator.expose(app, endpoint="/metrics")
        
        return instrumentator
    
    def track_prediction(self, model_type: str, prediction_type: str, 
                        confidence: float, duration: float):
        """
        Track model prediction metrics.
        """
        model_predictions_total.labels(
            model_type=model_type,
            prediction_type=prediction_type
        ).inc()
        
        model_prediction_duration.labels(
            model_type=model_type
        ).observe(duration)
        
        model_confidence_score.labels(
            model_type=model_type
        ).observe(confidence)
        
        self.logger.info(
            f"Tracked prediction - Model: {model_type}, "
            f"Type: {prediction_type}, Confidence: {confidence:.3f}, "
            f"Duration: {duration:.3f}s"
        )
    
    def track_training(self, model_type: str, accuracy: float, 
                      duration: float, samples: int, features: int):
        """
        Track model training metrics.
        """
        model_training_duration.labels(
            model_type=model_type
        ).observe(duration)
        
        model_accuracy.labels(
            model_type=model_type
        ).set(accuracy)
        
        model_training_samples.labels(
            model_type=model_type
        ).set(samples)
        
        model_features_count.labels(
            model_type=model_type
        ).set(features)
        
        self.logger.info(
            f"Tracked training - Model: {model_type}, "
            f"Accuracy: {accuracy:.3f}, Duration: {duration:.3f}s, "
            f"Samples: {samples}, Features: {features}"
        )
    
    def track_data_quality(self, data_source: str, metric_type: str, score: float):
        """
        Track data quality metrics.
        """
        data_quality_score.labels(
            data_source=data_source,
            metric_type=metric_type
        ).set(score)
        
        self.logger.info(
            f"Tracked data quality - Source: {data_source}, "
            f"Metric: {metric_type}, Score: {score:.3f}"
        )
    
    def track_data_drift(self, feature_name: str, model_type: str, drift_score: float):
        """
        Track data drift detection metrics.
        """
        data_drift_score.labels(
            feature_name=feature_name,
            model_type=model_type
        ).set(drift_score)
        
        if drift_score > 0.1:  # Alert threshold
            self.logger.warning(
                f"Data drift detected - Feature: {feature_name}, "
                f"Model: {model_type}, Score: {drift_score:.3f}"
            )
    
    def track_error(self, error_type: str, component: str, error_details: str = None):
        """
        Track ML service errors.
        """
        ml_errors_total.labels(
            error_type=error_type,
            component=component
        ).inc()
        
        self.logger.error(
            f"ML Error - Type: {error_type}, Component: {component}, "
            f"Details: {error_details}"
        )
    
    def track_database_operation(self, operation_type: str, table_name: str, duration: float):
        """
        Track database operation metrics.
        """
        database_operations_total.labels(
            operation_type=operation_type,
            table_name=table_name
        ).inc()
        
        database_operation_duration.labels(
            operation_type=operation_type
        ).observe(duration)
        
        self.logger.debug(
            f"Database operation - Type: {operation_type}, "
            f"Table: {table_name}, Duration: {duration:.3f}s"
        )
    
    def update_system_metrics(self):
        """
        Update system resource usage metrics.
        """
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            system_cpu_usage.set(cpu_percent)
            
            # Memory usage
            memory = psutil.virtual_memory()
            system_memory_usage.set(memory.used)
            
            # Disk usage
            disk = psutil.disk_usage('/')
            system_disk_usage.set(disk.used)
            
            self.logger.debug(
                f"System metrics - CPU: {cpu_percent:.1f}%, "
                f"Memory: {memory.used / 1024**3:.1f}GB, "
                f"Disk: {disk.used / 1024**3:.1f}GB"
            )
            
        except Exception as e:
            self.logger.error(f"Error updating system metrics: {e}")
    
    def update_model_registry_metrics(self, registry_data: Dict[str, Any]):
        """
        Update model registry metrics.
        """
        try:
            for model_type in ['diagnostic', 'risk']:
                active_count = sum(1 for model in registry_data.get('models', []) 
                                 if model.get('model_type') == model_type 
                                 and model.get('status') == 'active')
                
                models_registry_count.labels(
                    model_type=model_type,
                    status='active'
                ).set(active_count)
                
        except Exception as e:
            self.logger.error(f"Error updating model registry metrics: {e}")

# ============================================================================
# DECORATORS FOR AUTOMATIC MONITORING
# ============================================================================

def monitor_prediction(model_type: str):
    """
    Decorator to automatically monitor prediction operations.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Extract prediction details
                confidence = result.get('confidence', 0.0) if isinstance(result, dict) else 0.0
                prediction_type = result.get('diagnosis', 'unknown') if isinstance(result, dict) else 'unknown'
                
                # Track metrics
                monitoring.track_prediction(
                    model_type=model_type,
                    prediction_type=prediction_type,
                    confidence=confidence,
                    duration=duration
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                monitoring.track_error(
                    error_type=type(e).__name__,
                    component=f"prediction_{model_type}",
                    error_details=str(e)
                )
                raise
                
        return wrapper
    return decorator

def monitor_training(model_type: str):
    """
    Decorator to automatically monitor training operations.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Extract training details
                accuracy = result.get('accuracy', 0.0) if isinstance(result, dict) else 0.0
                samples = result.get('training_samples', 0) if isinstance(result, dict) else 0
                features = result.get('features_count', 0) if isinstance(result, dict) else 0
                
                # Track metrics
                monitoring.track_training(
                    model_type=model_type,
                    accuracy=accuracy,
                    duration=duration,
                    samples=samples,
                    features=features
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                monitoring.track_error(
                    error_type=type(e).__name__,
                    component=f"training_{model_type}",
                    error_details=str(e)
                )
                raise
                
        return wrapper
    return decorator

def monitor_database_operation(operation_type: str, table_name: str):
    """
    Decorator to automatically monitor database operations.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Track metrics
                monitoring.track_database_operation(
                    operation_type=operation_type,
                    table_name=table_name,
                    duration=duration
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                monitoring.track_error(
                    error_type=type(e).__name__,
                    component=f"database_{table_name}",
                    error_details=str(e)
                )
                raise
                
        return wrapper
    return decorator

# ============================================================================
# GLOBAL MONITORING INSTANCE
# ============================================================================

# Global monitoring instance
monitoring = MLMonitoring()

# ============================================================================
# HEALTH CHECK AND STATUS
# ============================================================================

def get_service_health() -> Dict[str, Any]:
    """
    Get comprehensive service health status.
    """
    try:
        uptime = time.time() - monitoring.start_time
        
        return {
            "status": "healthy",
            "uptime_seconds": uptime,
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            },
            "models": {
                "diagnostic": "active",
                "risk": "active"
            },
            "metrics_endpoint": "/metrics"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# ============================================================================
# ALERTING THRESHOLDS
# ============================================================================

ALERT_THRESHOLDS = {
    "cpu_usage_high": 80.0,
    "memory_usage_high": 85.0,
    "disk_usage_high": 90.0,
    "model_confidence_low": 0.3,
    "prediction_latency_high": 1.0,
    "training_accuracy_low": 0.8,
    "data_drift_high": 0.1,
    "error_rate_high": 0.05
}

def check_alerts() -> List[Dict[str, Any]]:
    """
    Check for alert conditions and return list of active alerts.
    """
    alerts = []
    
    try:
        # System resource alerts
        cpu_percent = psutil.cpu_percent()
        if cpu_percent > ALERT_THRESHOLDS["cpu_usage_high"]:
            alerts.append({
                "type": "system",
                "severity": "warning",
                "message": f"High CPU usage: {cpu_percent:.1f}%",
                "threshold": ALERT_THRESHOLDS["cpu_usage_high"]
            })
        
        memory_percent = psutil.virtual_memory().percent
        if memory_percent > ALERT_THRESHOLDS["memory_usage_high"]:
            alerts.append({
                "type": "system",
                "severity": "warning", 
                "message": f"High memory usage: {memory_percent:.1f}%",
                "threshold": ALERT_THRESHOLDS["memory_usage_high"]
            })
        
        disk_percent = psutil.disk_usage('/').percent
        if disk_percent > ALERT_THRESHOLDS["disk_usage_high"]:
            alerts.append({
                "type": "system",
                "severity": "critical",
                "message": f"High disk usage: {disk_percent:.1f}%",
                "threshold": ALERT_THRESHOLDS["disk_usage_high"]
            })
        
    except Exception as e:
        alerts.append({
            "type": "monitoring",
            "severity": "error",
            "message": f"Error checking system alerts: {e}"
        })
    
    return alerts