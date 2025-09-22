"""
Logging configuration for the Medical AI/ML Service
"""

import structlog
import logging
import sys
import os
from typing import Any, Dict


def setup_logging(log_level: str = "INFO", log_format: str = "json") -> structlog.stdlib.BoundLogger:
    """
    Setup structured logging for the application
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
        log_format: Log format (json, console)
    
    Returns:
        Configured logger instance
    """
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper())
    )
    
    # Shared processors for all loggers
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    if log_format.lower() == "json":
        # JSON output for production
        shared_processors.append(structlog.processors.JSONRenderer())
    else:
        # Human-readable console output for development
        shared_processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    # Configure structlog
    structlog.configure(
        processors=shared_processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Create logger instance
    logger = structlog.get_logger("nexus.ml")
    
    # Log configuration
    logger.info(
        "Logging configured",
        level=log_level,
        format=log_format,
        pid=os.getpid()
    )
    
    return logger


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a logger instance for a specific module"""
    return structlog.get_logger(f"nexus.ml.{name}")


class LoggerMixin:
    """Mixin class to add logging capabilities to any class"""
    
    @property
    def logger(self) -> structlog.stdlib.BoundLogger:
        """Get logger for this class"""
        class_name = self.__class__.__name__.lower()
        return get_logger(class_name)


def log_prediction(
    prediction_id: str,
    model_type: str,
    patient_id: str,
    prediction_result: Dict[str, Any],
    confidence: float,
    user_id: str = None
) -> None:
    """
    Log prediction for audit trail and monitoring
    
    Args:
        prediction_id: Unique prediction identifier
        model_type: Type of ML model used
        patient_id: Patient identifier (will be hashed)
        prediction_result: The prediction result
        confidence: Model confidence score
        user_id: User who requested prediction
    """
    import hashlib
    from datetime import datetime
    
    logger = get_logger("prediction.audit")
    
    # Hash sensitive data
    hashed_patient_id = hashlib.sha256(patient_id.encode()).hexdigest()[:16]
    hashed_user_id = hashlib.sha256(user_id.encode()).hexdigest()[:16] if user_id else None
    
    logger.info(
        "Prediction logged",
        prediction_id=prediction_id,
        model_type=model_type,
        patient_hash=hashed_patient_id,
        user_hash=hashed_user_id,
        confidence=confidence,
        prediction_count=len(prediction_result.get("predictions", [])),
        timestamp=datetime.now().isoformat(),
        audit_type="prediction"
    )


def log_model_performance(
    model_name: str,
    metrics: Dict[str, float],
    dataset_size: int = None
) -> None:
    """
    Log model performance metrics
    
    Args:
        model_name: Name of the ML model
        metrics: Performance metrics dict
        dataset_size: Size of evaluation dataset
    """
    logger = get_logger("model.performance")
    
    logger.info(
        "Model performance logged",
        model_name=model_name,
        accuracy=metrics.get("accuracy"),
        precision=metrics.get("precision"),
        recall=metrics.get("recall"),
        f1_score=metrics.get("f1_score"),
        dataset_size=dataset_size,
        audit_type="model_performance"
    )


def log_data_access(
    data_type: str,
    operation: str,
    user_id: str,
    patient_id: str = None,
    record_count: int = None
) -> None:
    """
    Log data access for compliance
    
    Args:
        data_type: Type of data accessed
        operation: Operation performed (read, write, update, delete)
        user_id: User accessing data
        patient_id: Patient ID if applicable
        record_count: Number of records accessed
    """
    import hashlib
    
    logger = get_logger("data.access")
    
    # Hash sensitive identifiers
    hashed_user_id = hashlib.sha256(user_id.encode()).hexdigest()[:16]
    hashed_patient_id = hashlib.sha256(patient_id.encode()).hexdigest()[:16] if patient_id else None
    
    logger.info(
        "Data access logged",
        data_type=data_type,
        operation=operation,
        user_hash=hashed_user_id,
        patient_hash=hashed_patient_id,
        record_count=record_count,
        audit_type="data_access"
    )