"""
Database management endpoints for ML service
"""

try:
    from fastapi import APIRouter, HTTPException, Depends
    from pydantic import BaseModel, Field
    FASTAPI_AVAILABLE = True
except ImportError:
    # Mock for development
    APIRouter = object
    HTTPException = Exception
    Depends = lambda x: None
    BaseModel = object
    Field = lambda **kwargs: None
    FASTAPI_AVAILABLE = False

from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

from ..utils.logging import get_logger
from ..core.database import ml_db, get_db, SQLALCHEMY_AVAILABLE


router = APIRouter()
logger = get_logger("api.database")


class DatabaseInfoResponse(BaseModel):
    """Database connection information"""
    available: bool
    database_type: str
    tables_created: bool
    connection_status: str


class TrainingJobResponse(BaseModel):
    """Training job information"""
    job_id: str
    model_type: str
    algorithm: str
    status: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None


class PredictionLogResponse(BaseModel):
    """Prediction log entry"""
    id: int
    patient_id: str
    model_type: str
    model_version: str
    confidence_score: Optional[float]
    created_at: str


class ModelRegistryResponse(BaseModel):
    """Registered model information"""
    model_name: str
    model_type: str
    algorithm: str
    version: str
    is_active: bool
    created_at: str
    metrics: Optional[Dict[str, float]] = None


@router.get("/info", response_model=DatabaseInfoResponse)
async def get_database_info():
    """
    Get database connection and status information
    """
    try:
        if not SQLALCHEMY_AVAILABLE:
            return DatabaseInfoResponse(
                available=False,
                database_type="none",
                tables_created=False,
                connection_status="SQLAlchemy not available"
            )
        
        # Test database connection
        try:
            db = get_db()
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            db.close()
            connection_status = "connected"
        except Exception as e:
            connection_status = f"connection_failed: {str(e)}"
        
        return DatabaseInfoResponse(
            available=SQLALCHEMY_AVAILABLE,
            database_type="sqlite" if "sqlite" in str(db) else "postgresql",
            tables_created=True,
            connection_status=connection_status
        )
        
    except Exception as e:
        logger.error("Failed to get database info", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get database info: {str(e)}"
        )


@router.post("/training-jobs")
async def create_training_job_endpoint(
    model_type: str,
    algorithm: str,
    dataset_size: Optional[int] = None,
    parameters: Optional[Dict[str, Any]] = None
):
    """
    Create a new training job record in the database
    """
    try:
        job_id = str(uuid.uuid4())
        
        # Create training job in database
        job_record_id = ml_db.create_training_job(
            job_id=job_id,
            model_type=model_type,
            algorithm=algorithm,
            dataset_size=dataset_size,
            parameters=parameters
        )
        
        logger.info(
            "Training job created in database",
            job_id=job_id,
            model_type=model_type,
            algorithm=algorithm
        )
        
        return {
            "job_id": job_id,
            "model_type": model_type,
            "algorithm": algorithm,
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "database_record_id": job_record_id
        }
        
    except Exception as e:
        logger.error("Failed to create training job", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create training job: {str(e)}"
        )


@router.put("/training-jobs/{job_id}/status")
async def update_training_job_status(
    job_id: str,
    status: str,
    metrics: Optional[Dict[str, float]] = None,
    model_path: Optional[str] = None,
    error_message: Optional[str] = None
):
    """
    Update training job status and results
    """
    try:
        ml_db.update_training_job(
            job_id=job_id,
            status=status,
            metrics=metrics,
            model_path=model_path,
            error_message=error_message
        )
        
        logger.info(
            "Training job status updated",
            job_id=job_id,
            status=status
        )
        
        return {
            "job_id": job_id,
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to update training job", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update training job: {str(e)}"
        )


@router.post("/models/register")
async def register_model_endpoint(
    model_name: str,
    model_type: str,
    algorithm: str,
    version: str,
    file_path: str,
    metrics: Optional[Dict[str, float]] = None,
    training_dataset_info: Optional[Dict[str, Any]] = None
):
    """
    Register a trained model in the model registry
    """
    try:
        model_id = ml_db.register_model(
            model_name=model_name,
            model_type=model_type,
            algorithm=algorithm,
            version=version,
            file_path=file_path,
            metrics=metrics,
            training_dataset_info=training_dataset_info
        )
        
        logger.info(
            "Model registered in database",
            model_name=model_name,
            version=version,
            model_id=model_id
        )
        
        return {
            "model_id": model_id,
            "model_name": model_name,
            "version": version,
            "status": "registered",
            "registered_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to register model", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to register model: {str(e)}"
        )


@router.get("/models/{model_name}/active")
async def get_active_model_info(model_name: str):
    """
    Get information about the currently active model
    """
    try:
        model_info = ml_db.get_active_model(model_name)
        
        if not model_info:
            raise HTTPException(
                status_code=404,
                detail=f"No active model found for {model_name}"
            )
        
        return model_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get active model", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get active model: {str(e)}"
        )


@router.post("/predictions/log")
async def log_prediction_endpoint(
    patient_id: str,
    model_type: str,
    model_version: str,
    input_features: Dict[str, Any],
    prediction_result: Dict[str, Any],
    confidence_score: Optional[float] = None,
    processing_time_ms: Optional[float] = None
):
    """
    Log a prediction result to the database
    """
    try:
        log_id = ml_db.log_prediction(
            patient_id=patient_id,
            model_type=model_type,
            model_version=model_version,
            input_features=input_features,
            prediction_result=prediction_result,
            confidence_score=confidence_score,
            processing_time_ms=processing_time_ms
        )
        
        logger.info(
            "Prediction logged to database",
            patient_id=patient_id,
            model_type=model_type,
            log_id=log_id
        )
        
        return {
            "log_id": log_id,
            "patient_id": patient_id,
            "model_type": model_type,
            "logged_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to log prediction", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log prediction: {str(e)}"
        )


@router.post("/features/save")
async def save_features_endpoint(
    patient_id: str,
    feature_type: str,
    feature_data: Dict[str, Any],
    model_version: str
):
    """
    Save extracted features for a patient
    """
    try:
        feature_id = ml_db.save_features(
            patient_id=patient_id,
            feature_type=feature_type,
            feature_data=feature_data,
            model_version=model_version
        )
        
        logger.info(
            "Features saved to database",
            patient_id=patient_id,
            feature_type=feature_type,
            feature_id=feature_id
        )
        
        return {
            "feature_id": feature_id,
            "patient_id": patient_id,
            "feature_type": feature_type,
            "saved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to save features", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save features: {str(e)}"
        )


@router.post("/data-quality/save")
async def save_data_quality_metrics_endpoint(
    dataset_type: str,
    quality_score: float,
    completeness: float,
    consistency: float,
    accuracy: float,
    timeliness: float,
    record_count: int,
    anomalies: int = 0,
    issues: Optional[List[str]] = None,
    recommendations: Optional[List[str]] = None
):
    """
    Save data quality metrics to the database
    """
    try:
        metrics_id = ml_db.save_data_quality_metrics(
            dataset_type=dataset_type,
            quality_score=quality_score,
            completeness=completeness,
            consistency=consistency,
            accuracy=accuracy,
            timeliness=timeliness,
            record_count=record_count,
            anomalies=anomalies,
            issues=issues,
            recommendations=recommendations
        )
        
        logger.info(
            "Data quality metrics saved",
            dataset_type=dataset_type,
            quality_score=quality_score,
            metrics_id=metrics_id
        )
        
        return {
            "metrics_id": metrics_id,
            "dataset_type": dataset_type,
            "quality_score": quality_score,
            "saved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to save data quality metrics", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save data quality metrics: {str(e)}"
        )


@router.get("/stats")
async def get_database_stats():
    """
    Get database statistics and usage information
    """
    try:
        if not SQLALCHEMY_AVAILABLE:
            return {
                "available": False,
                "message": "Database not available"
            }
        
        # In a real implementation, you would query actual table counts
        # For now, return simulated statistics
        return {
            "available": True,
            "statistics": {
                "total_predictions": 0,
                "total_training_jobs": 0,
                "total_models": 0,
                "total_features": 0,
                "data_quality_checks": 0
            },
            "recent_activity": {
                "predictions_last_24h": 0,
                "training_jobs_last_week": 0,
                "models_deployed_last_month": 0
            },
            "storage_info": {
                "database_size_mb": 0,
                "estimated_records": 0
            },
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Failed to get database stats", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get database stats: {str(e)}"
        )