"""
Database configuration and models for ML service
"""

try:
    from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Text, Boolean, JSON, text
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session
    from sqlalchemy.pool import StaticPool
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    # Mock for development
    create_engine = lambda *args, **kwargs: None
    Column = lambda *args, **kwargs: None
    Integer = String = DateTime = Float = Text = Boolean = JSON = None
    declarative_base = lambda: object
    sessionmaker = lambda *args, **kwargs: None
    Session = object
    StaticPool = None
    text = lambda x: x
    SQLALCHEMY_AVAILABLE = False

import os
from typing import Optional
from datetime import datetime
import json

from ..utils.logging import get_logger


logger = get_logger("ml.database")

# Database URL from environment or default to SQLite for development
DATABASE_URL = os.getenv(
    "ML_DATABASE_URL", 
    "sqlite:///./ml_data.db"
)

# Create SQLAlchemy engine
if SQLALCHEMY_AVAILABLE:
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(
            DATABASE_URL,
            poolclass=StaticPool,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_engine(DATABASE_URL)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
else:
    engine = None
    SessionLocal = None
    Base = object


class MLFeatures(Base):
    """Store extracted features for ML models"""
    __tablename__ = "ml_features"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    feature_type = Column(String, nullable=False)  # diagnostic, risk, treatment
    feature_data = Column(JSON, nullable=False)
    model_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TrainingJobs(Base):
    """Track ML model training jobs"""
    __tablename__ = "training_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True, nullable=False)
    model_type = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending, running, completed, failed
    dataset_size = Column(Integer, nullable=True)
    parameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)
    model_path = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PredictionLogs(Base):
    """Log all predictions made by ML models"""
    __tablename__ = "prediction_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, index=True, nullable=False)
    model_type = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    input_features = Column(JSON, nullable=False)
    prediction_result = Column(JSON, nullable=False)
    confidence_score = Column(Float, nullable=True)
    processing_time_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class ModelRegistry(Base):
    """Registry of trained ML models"""
    __tablename__ = "model_registry"
    
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, unique=True, index=True, nullable=False)
    model_type = Column(String, nullable=False)
    algorithm = Column(String, nullable=False)
    version = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    metrics = Column(JSON, nullable=True)
    training_dataset_info = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    deployed_at = Column(DateTime, nullable=True)


class DataQualityMetrics(Base):
    """Track data quality metrics over time"""
    __tablename__ = "data_quality_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_type = Column(String, nullable=False)  # synthetic, real, combined
    quality_score = Column(Float, nullable=False)
    completeness_score = Column(Float, nullable=False)
    consistency_score = Column(Float, nullable=False)
    accuracy_score = Column(Float, nullable=False)
    timeliness_score = Column(Float, nullable=False)
    record_count = Column(Integer, nullable=False)
    anomalies_detected = Column(Integer, default=0)
    issues_found = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


# Database utility functions
def get_db():
    """Get database session"""
    if not SQLALCHEMY_AVAILABLE or not SessionLocal:
        raise RuntimeError("Database not available - SQLAlchemy not installed")
    
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        raise e


def init_database():
    """Initialize database tables"""
    if not SQLALCHEMY_AVAILABLE or not engine:
        logger.warning("Database initialization skipped - SQLAlchemy not available")
        return
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Test connection
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
            logger.info("Database connection tested successfully")
            
    except Exception as e:
        logger.error("Failed to initialize database", error=str(e))
        raise


def close_database():
    """Close database connections"""
    if engine:
        engine.dispose()
        logger.info("Database connections closed")


# Data access layer
class MLDatabase:
    """High-level database operations for ML service"""
    
    def __init__(self):
        self.logger = get_logger("ml.database.operations")
    
    def save_features(self, patient_id: str, feature_type: str, feature_data: dict, model_version: str):
        """Save extracted features for a patient"""
        if not SQLALCHEMY_AVAILABLE:
            self.logger.warning("Database not available - features not saved")
            return None
            
        try:
            with SessionLocal() as session:
                features = MLFeatures(
                    patient_id=patient_id,
                    feature_type=feature_type,
                    feature_data=feature_data,
                    model_version=model_version
                )
                session.add(features)
                session.commit()
                session.refresh(features)
                
                self.logger.info(
                    "Features saved successfully",
                    patient_id=patient_id,
                    feature_type=feature_type,
                    features_id=features.id
                )
                return features.id
                
        except Exception as e:
            self.logger.error("Failed to save features", error=str(e))
            raise
    
    def log_prediction(self, patient_id: str, model_type: str, model_version: str, 
                      input_features: dict, prediction_result: dict, 
                      confidence_score: Optional[float] = None, 
                      processing_time_ms: Optional[float] = None):
        """Log a prediction result"""
        if not SQLALCHEMY_AVAILABLE:
            self.logger.warning("Database not available - prediction not logged")
            return None
            
        try:
            with SessionLocal() as session:
                log_entry = PredictionLogs(
                    patient_id=patient_id,
                    model_type=model_type,
                    model_version=model_version,
                    input_features=input_features,
                    prediction_result=prediction_result,
                    confidence_score=confidence_score,
                    processing_time_ms=processing_time_ms
                )
                session.add(log_entry)
                session.commit()
                session.refresh(log_entry)
                
                self.logger.info(
                    "Prediction logged successfully",
                    patient_id=patient_id,
                    model_type=model_type,
                    log_id=log_entry.id
                )
                return log_entry.id
                
        except Exception as e:
            self.logger.error("Failed to log prediction", error=str(e))
            raise
    
    def create_training_job(self, job_id: str, model_type: str, algorithm: str, 
                           dataset_size: Optional[int] = None, parameters: Optional[dict] = None):
        """Create a new training job record"""
        if not SQLALCHEMY_AVAILABLE:
            self.logger.warning("Database not available - training job not created")
            return None
            
        try:
            with SessionLocal() as session:
                job = TrainingJobs(
                    job_id=job_id,
                    model_type=model_type,
                    algorithm=algorithm,
                    dataset_size=dataset_size,
                    parameters=parameters,
                    status="pending"
                )
                session.add(job)
                session.commit()
                session.refresh(job)
                
                self.logger.info(
                    "Training job created",
                    job_id=job_id,
                    model_type=model_type,
                    algorithm=algorithm
                )
                return job.id
                
        except Exception as e:
            self.logger.error("Failed to create training job", error=str(e))
            raise
    
    def update_training_job(self, job_id: str, status: str, metrics: Optional[dict] = None, 
                           model_path: Optional[str] = None, error_message: Optional[str] = None):
        """Update training job status and results"""
        if not SQLALCHEMY_AVAILABLE:
            self.logger.warning("Database not available - training job not updated")
            return
            
        try:
            with SessionLocal() as session:
                job = session.query(TrainingJobs).filter(TrainingJobs.job_id == job_id).first()
                if not job:
                    raise ValueError(f"Training job {job_id} not found")
                
                job.status = status
                if metrics:
                    job.metrics = metrics
                if model_path:
                    job.model_path = model_path
                if error_message:
                    job.error_message = error_message
                    
                if status == "running" and not job.started_at:
                    job.started_at = datetime.utcnow()
                elif status in ["completed", "failed"]:
                    job.completed_at = datetime.utcnow()
                
                session.commit()
                
                self.logger.info(
                    "Training job updated",
                    job_id=job_id,
                    status=status
                )
                
        except Exception as e:
            self.logger.error("Failed to update training job", error=str(e))
            raise
    
    def register_model(self, model_name: str, model_type: str, algorithm: str, 
                      version: str, file_path: str, metrics: Optional[dict] = None,
                      training_dataset_info: Optional[dict] = None):
        """Register a trained model in the registry"""
        if not SQLALCHEMY_AVAILABLE:
            self.logger.warning("Database not available - model not registered")
            return None
            
        try:
            with SessionLocal() as session:
                # Deactivate previous versions
                session.query(ModelRegistry).filter(
                    ModelRegistry.model_name == model_name
                ).update({"is_active": False})
                
                # Register new model
                model = ModelRegistry(
                    model_name=model_name,
                    model_type=model_type,
                    algorithm=algorithm,
                    version=version,
                    file_path=file_path,
                    metrics=metrics,
                    training_dataset_info=training_dataset_info,
                    is_active=True,
                    deployed_at=datetime.utcnow()
                )
                session.add(model)
                session.commit()
                session.refresh(model)
                
                self.logger.info(
                    "Model registered successfully",
                    model_name=model_name,
                    version=version,
                    model_id=model.id
                )
                return model.id
                
        except Exception as e:
            self.logger.error("Failed to register model", error=str(e))
            raise
    
    def get_active_model(self, model_name: str) -> Optional[dict]:
        """Get the currently active model"""
        if not SQLALCHEMY_AVAILABLE:
            return None
            
        try:
            with SessionLocal() as session:
                model = session.query(ModelRegistry).filter(
                    ModelRegistry.model_name == model_name,
                    ModelRegistry.is_active == True
                ).first()
                
                if model:
                    return {
                        "id": model.id,
                        "model_name": model.model_name,
                        "model_type": model.model_type,
                        "algorithm": model.algorithm,
                        "version": model.version,
                        "file_path": model.file_path,
                        "metrics": model.metrics,
                        "deployed_at": model.deployed_at.isoformat() if model.deployed_at else None
                    }
                return None
                
        except Exception as e:
            self.logger.error("Failed to get active model", error=str(e))
            return None
    
    def save_data_quality_metrics(self, dataset_type: str, quality_score: float,
                                 completeness: float, consistency: float, 
                                 accuracy: float, timeliness: float, record_count: int,
                                 anomalies: int = 0, issues: Optional[list] = None,
                                 recommendations: Optional[list] = None):
        """Save data quality metrics"""
        if not SQLALCHEMY_AVAILABLE:
            self.logger.warning("Database not available - quality metrics not saved")
            return None
            
        try:
            with SessionLocal() as session:
                metrics = DataQualityMetrics(
                    dataset_type=dataset_type,
                    quality_score=quality_score,
                    completeness_score=completeness,
                    consistency_score=consistency,
                    accuracy_score=accuracy,
                    timeliness_score=timeliness,
                    record_count=record_count,
                    anomalies_detected=anomalies,
                    issues_found=issues,
                    recommendations=recommendations
                )
                session.add(metrics)
                session.commit()
                session.refresh(metrics)
                
                self.logger.info(
                    "Data quality metrics saved",
                    dataset_type=dataset_type,
                    quality_score=quality_score,
                    metrics_id=metrics.id
                )
                return metrics.id
                
        except Exception as e:
            self.logger.error("Failed to save data quality metrics", error=str(e))
            raise


# Global database instance
ml_db = MLDatabase()