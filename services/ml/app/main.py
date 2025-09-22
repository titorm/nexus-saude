"""
Medical AI/ML Service - FastAPI Application

Sistema de machine learning para análise preditiva médica.
Fornece APIs para predição de diagnósticos, avaliação de riscos
e predição de outcomes médicos.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager
from prometheus_client import generate_latest
import uvicorn
import structlog
import os
import asyncio
from typing import Dict, Any

from .core.config import settings
from .api import predictions, health, data_simple as data, database, monitoring_dashboard
from .core.pipeline import MLPipeline
from .core.monitoring import monitoring, get_service_health, check_alerts
from .utils.logging import setup_logging


# Setup structured logging
logger = setup_logging()

# Background task to update system metrics
async def update_system_metrics():
    """Background task to periodically update system metrics"""
    while True:
        try:
            monitoring.update_system_metrics()
            await asyncio.sleep(30)  # Update every 30 seconds
        except Exception as e:
            logger.error(f"Error updating system metrics: {e}")
            await asyncio.sleep(60)  # Wait longer on error


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Medical AI/ML Service")
    
    # Initialize database
    try:
        from .core.database import init_database
        init_database()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        # Continue without database for development
    
    # Setup monitoring
    try:
        instrumentator = monitoring.setup_instrumentator(app)
        logger.info("Prometheus monitoring initialized")
    except Exception as e:
        logger.error("Failed to initialize monitoring", error=str(e))
    
    # Initialize ML Pipeline
    app.state.ml_pipeline = MLPipeline()
    await app.state.ml_pipeline.initialize()
    
    # Load trained models
    try:
        await app.state.ml_pipeline.load_models()
        logger.info("Models loaded successfully")
    except Exception as e:
        logger.error("Failed to load models", error=str(e))
        # Continue without models for development
    
    # Start background tasks
    task = asyncio.create_task(update_system_metrics())
    app.state.monitoring_task = task
    
    logger.info("Medical AI/ML Service started successfully")
    yield
    
    # Cleanup
    logger.info("Shutting down Medical AI/ML Service")
    
    # Cancel background tasks
    if hasattr(app.state, 'monitoring_task'):
        app.state.monitoring_task.cancel()
        try:
            await app.state.monitoring_task
        except asyncio.CancelledError:
            pass
    
    # Close database connections
    try:
        from .core.database import close_database
        close_database()
        logger.info("Database connections closed")
    except Exception as e:
        logger.warning("Error closing database", error=str(e))
    
    await app.state.ml_pipeline.cleanup()


# Create FastAPI application
app = FastAPI(
    title="Nexus Saúde - Medical AI/ML Service",
    description="Sistema de machine learning para análise preditiva médica",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Temporarily disable TrustedHostMiddleware for testing
# app.add_middleware(
#     TrustedHostMiddleware,
#     allowed_hosts=["*"] if settings.debug else ["localhost", "127.0.0.1"]
# )


@app.middleware("http")
async def monitoring_middleware(request, call_next):
    """Enhanced monitoring middleware"""
    import time
    
    start_time = time.time()
    
    # Log request
    logger.info(
        "Request started",
        method=request.method,
        url=str(request.url),
        client_ip=request.client.host if request.client else None
    )
    
    try:
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            "Request completed",
            method=request.method,
            url=str(request.url),
            status_code=response.status_code,
            duration=duration
        )
        
        return response
        
    except Exception as e:
        duration = time.time() - start_time
        
        # Track error
        monitoring.track_error(
            error_type=type(e).__name__,
            component="api_request",
            error_details=str(e)
        )
        
        logger.error(
            "Request failed",
            method=request.method,
            url=str(request.url),
            duration=duration,
            error=str(e)
        )
        
        raise


# Include routers
app.include_router(
    predictions.router,
    prefix="/api/v1/predict",
    tags=["predictions"]
)

app.include_router(
    monitoring.router,
    prefix="/api/v1/monitoring",
    tags=["monitoring"]
)

app.include_router(
    health.router,
    prefix="/api/v1/health",
    tags=["health"]
)

# Include data router
app.include_router(
    data.router,
    prefix="/api/v1/data",
    tags=["data"]
)

# Include database router
app.include_router(
    database.router,
    prefix="/api/v1/database",
    tags=["database"]
)

# Include monitoring dashboard router
app.include_router(
    monitoring_dashboard.router,
    prefix="/api/v1/monitoring",
    tags=["monitoring"]
)

# Import and include training router
try:
    from .api import training
    app.include_router(
        training.router,
        prefix="/api/v1/training",
        tags=["training"]
    )
except ImportError:
    logger.warning("Training endpoints not available - development mode")


@app.get("/")
async def root():
    """Root endpoint with health status"""
    health_status = get_service_health()
    return {
        "service": "Nexus Saúde Medical AI/ML Service",
        "version": "1.0.0",
        "status": health_status["status"],
        "documentation": "/docs",
        "monitoring": "/metrics",
        "health": "/health"
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain")


@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    health_status = get_service_health()
    alerts = check_alerts()
    
    return {
        **health_status,
        "alerts": alerts,
        "alerts_count": len(alerts)
    }


@app.get("/info")
async def service_info():
    """Enhanced service information"""
    pipeline = getattr(app.state, 'ml_pipeline', None)
    models_count = len(pipeline.models) if pipeline and hasattr(pipeline, 'models') else 0
    
    return {
        "service": "medical-ai-ml",
        "version": "1.0.0",
        "python_version": "3.11+",
        "models_loaded": models_count,
        "environment": "development" if settings.debug else "production",
        "monitoring": {
            "prometheus_enabled": True,
            "metrics_endpoint": "/metrics",
            "health_endpoint": "/health",
            "alerts_enabled": True
        },
        "features": [
            "diagnostic_prediction",
            "risk_assessment", 
            "outcome_prediction",
            "model_monitoring",
            "real_time_inference",
            "prometheus_metrics",
            "system_monitoring",
            "alert_system"
        ]
    }


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with monitoring"""
    # Track error
    monitoring.track_error(
        error_type="HTTPException",
        component="api_handler",
        error_details=f"Status: {exc.status_code}, Detail: {exc.detail}"
    )
    
    logger.error(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        url=str(request.url)
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions with monitoring"""
    # Track error
    monitoring.track_error(
        error_type=type(exc).__name__,
        component="api_handler",
        error_details=str(exc)
    )
    
    logger.error(
        "Unhandled exception",
        error=str(exc),
        type=type(exc).__name__,
        url=str(request.url)
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        workers=1 if settings.debug else 1,
        log_config=None  # Use our custom logging
    )