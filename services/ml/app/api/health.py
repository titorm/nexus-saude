"""
Health check endpoints for ML service
"""

try:
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel
except ImportError:
    # Mock for development
    APIRouter = object
    HTTPException = Exception
    BaseModel = object

from datetime import datetime
from typing import Dict, Any, List
import os
import psutil
import time

from ..utils.logging import get_logger


router = APIRouter()
logger = get_logger("api.health")


class HealthStatus(BaseModel):
    """Health status response"""
    status: str
    timestamp: str
    version: str
    uptime_seconds: float
    

class DetailedHealthStatus(BaseModel):
    """Detailed health status with system metrics"""
    status: str
    timestamp: str
    version: str
    uptime_seconds: float
    system: Dict[str, Any]
    ml_pipeline: Dict[str, Any]
    dependencies: Dict[str, str]


# Track service start time
_start_time = time.time()


@router.get("/", response_model=HealthStatus)
async def health_check():
    """
    Basic health check endpoint
    
    Returns basic service health information including status,
    timestamp, version, and uptime.
    """
    uptime = time.time() - _start_time
    
    return HealthStatus(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        uptime_seconds=uptime
    )


@router.get("/detailed", response_model=DetailedHealthStatus)
async def detailed_health_check():
    """
    Detailed health check with system metrics
    
    Returns comprehensive health information including system resources,
    ML pipeline status, and dependency health.
    """
    try:
        uptime = time.time() - _start_time
        
        # System metrics
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        cpu_percent = psutil.cpu_percent(interval=1)
        
        system_info = {
            "cpu_percent": cpu_percent,
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "percent_used": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent_used": round((disk.used / disk.total) * 100, 2)
            },
            "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
        }
        
        # ML Pipeline status
        ml_pipeline_info = {
            "initialized": True,  # TODO: Get from actual pipeline
            "models_loaded": 0,   # TODO: Get from actual pipeline
            "last_prediction": None,  # TODO: Track last prediction time
            "prediction_count": 0     # TODO: Track prediction counter
        }
        
        # Dependencies status
        dependencies = {
            "database": "healthy",    # TODO: Check database connection
            "redis": "healthy",       # TODO: Check Redis connection
            "mlflow": "not_configured"  # TODO: Check MLflow connection
        }
        
        # Determine overall status
        overall_status = "healthy"
        
        if cpu_percent > 90:
            overall_status = "degraded"
        if memory.percent > 90:
            overall_status = "degraded"
        if any(status != "healthy" for status in dependencies.values() if status != "not_configured"):
            overall_status = "unhealthy"
            
        return DetailedHealthStatus(
            status=overall_status,
            timestamp=datetime.now().isoformat(),
            version="1.0.0",
            uptime_seconds=uptime,
            system=system_info,
            ml_pipeline=ml_pipeline_info,
            dependencies=dependencies
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


@router.get("/readiness")
async def readiness_check():
    """
    Readiness check for Kubernetes
    
    Returns 200 if service is ready to accept traffic,
    503 if not ready yet.
    """
    try:
        # Check if ML pipeline is initialized
        # TODO: Check actual pipeline status
        pipeline_ready = True
        
        # Check critical dependencies
        database_ready = True  # TODO: Check database
        
        if pipeline_ready and database_ready:
            return {"status": "ready", "timestamp": datetime.now().isoformat()}
        else:
            raise HTTPException(
                status_code=503,
                detail="Service not ready"
            )
            
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail="Service not ready"
        )


@router.get("/liveness")
async def liveness_check():
    """
    Liveness check for Kubernetes
    
    Returns 200 if service is alive, 500 if it should be restarted.
    """
    try:
        # Basic liveness indicators
        uptime = time.time() - _start_time
        
        # Service should be alive if it's been running
        if uptime > 0:
            return {"status": "alive", "uptime_seconds": uptime}
        else:
            raise HTTPException(
                status_code=500,
                detail="Service appears to be dead"
            )
            
    except Exception as e:
        logger.error("Liveness check failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Service liveness check failed"
        )