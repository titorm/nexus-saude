"""
API Endpoints for ML Predictions

Fornece endpoints RESTful para análise preditiva médica,
incluindo diagnósticos, avaliação de riscos e predição de outcomes.
"""

from fastapi import APIRouter, HTTPException, Depends

from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

# Pydantic imports (will be available after installation)
try:
    from pydantic import BaseModel, Field, validator
except ImportError:
    # Mock for development
    BaseModel = object
    Field = lambda *args, **kwargs: None
    validator = lambda *args, **kwargs: lambda f: f

from ..utils.logging import get_logger, log_prediction


# Initialize router
router = APIRouter()
# Security will be added later
# security = HTTPBearer()
logger = get_logger("api.predictions")


# Pydantic models for request/response
class VitalSigns(BaseModel):
    """Vital signs data"""
    temperature: Optional[float] = Field(None, ge=30.0, le=45.0, description="Temperature in Celsius")
    heart_rate: Optional[int] = Field(None, ge=30, le=200, description="Heart rate in BPM") 
    blood_pressure: Optional[Dict[str, int]] = Field(None, description="Blood pressure (systolic/diastolic)")
    respiratory_rate: Optional[int] = Field(None, ge=5, le=50, description="Respiratory rate per minute")
    oxygen_saturation: Optional[float] = Field(None, ge=0.0, le=100.0, description="Oxygen saturation %")


class PatientFeatures(BaseModel):
    """Patient features for ML prediction"""
    patient_id: str = Field(..., description="Patient unique identifier")
    age: int = Field(..., ge=0, le=150, description="Patient age in years")
    gender: str = Field(..., pattern="^(M|F|Other)$", description="Patient gender")
    weight: Optional[float] = Field(None, ge=0.0, le=300.0, description="Weight in kg")
    height: Optional[float] = Field(None, ge=0.0, le=250.0, description="Height in cm")
    
    # Clinical data
    symptoms: List[str] = Field(default=[], description="List of symptoms")
    chronic_conditions: List[str] = Field(default=[], description="List of chronic conditions")
    medications: List[str] = Field(default=[], description="Current medications")
    allergies: List[str] = Field(default=[], description="Known allergies")
    family_history: List[str] = Field(default=[], description="Family medical history")
    
    # Vital signs
    vital_signs: Optional[VitalSigns] = Field(None, description="Current vital signs")
    
    # Laboratory results
    lab_results: Optional[Dict[str, float]] = Field(default={}, description="Laboratory test results")
    
    @validator('symptoms', 'chronic_conditions', 'medications', 'allergies', 'family_history')
    def validate_lists(cls, v):
        """Ensure lists don't contain empty strings"""
        return [item.strip() for item in v if item and item.strip()]


class PredictionRequest(BaseModel):
    """Request for ML prediction"""
    patient_features: PatientFeatures
    model_type: str = Field(..., pattern="^(diagnostic|risk|outcome)$")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context")
    require_explanation: bool = Field(default=False, description="Include model explanation")


class DiagnosisPrediction(BaseModel):
    """Single diagnosis prediction"""
    diagnosis: str = Field(..., description="Predicted diagnosis")
    probability: float = Field(..., ge=0.0, le=1.0, description="Prediction probability")
    confidence: str = Field(..., pattern="^(low|medium|high)$", description="Confidence level")
    rank: int = Field(..., ge=1, description="Rank in prediction list")
    icd10_code: Optional[str] = Field(None, description="ICD-10 code if available")


class RiskAssessment(BaseModel):
    """Risk assessment result"""
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Risk score (0-100)")
    risk_level: str = Field(..., pattern="^(low|medium|high|critical)$", description="Risk level")
    risk_factors: List[str] = Field(..., description="Identified risk factors")
    recommendations: List[str] = Field(..., description="Clinical recommendations")


class PredictionResponse(BaseModel):
    """Response from ML prediction"""
    prediction_id: str = Field(..., description="Unique prediction identifier")
    model_type: str = Field(..., description="Type of model used")
    model_version: str = Field(..., description="Model version")
    
    # Prediction results (one of these will be populated)
    diagnoses: Optional[List[DiagnosisPrediction]] = Field(None, description="Diagnostic predictions")
    risk_assessment: Optional[RiskAssessment] = Field(None, description="Risk assessment")
    outcome_prediction: Optional[Dict[str, Any]] = Field(None, description="Outcome prediction")
    
    # Metadata
    overall_confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")
    recommendations: List[str] = Field(default=[], description="General recommendations")
    created_at: datetime = Field(default_factory=datetime.now, description="Prediction timestamp")


class PredictionHistory(BaseModel):
    """Historical predictions for a patient"""
    patient_id: str
    predictions: List[PredictionResponse]
    total_count: int
    date_range: Dict[str, str]


# Global ML pipeline instance (will be set during startup)
_ml_pipeline = None

def get_ml_pipeline():
    """Get ML pipeline instance"""
    global _ml_pipeline
    
    if _ml_pipeline is None:
        # Initialize pipeline if not already done
        from ..core.pipeline import MLPipeline
        _ml_pipeline = MLPipeline()
    
    return _ml_pipeline


# Prediction endpoints
@router.post("/diagnostic", response_model=PredictionResponse)
async def predict_diagnosis(
    request: PredictionRequest,
    pipeline = Depends(get_ml_pipeline)
):
    """
    Predict possible diagnoses for a patient based on symptoms and medical history
    
    This endpoint uses machine learning models to analyze patient symptoms,
    vital signs, and medical history to suggest possible diagnoses with
    confidence scores.
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(
            "Diagnostic prediction requested",
            patient_id=request.patient_features.patient_id,
            symptoms_count=len(request.patient_features.symptoms),
            has_vital_signs=request.patient_features.vital_signs is not None
        )
        
        # Validate model type
        if request.model_type != "diagnostic":
            raise HTTPException(
                status_code=400,
                detail="Invalid model type for diagnostic endpoint"
            )
        
        # Make prediction
        prediction_result = await pipeline.predict_diagnosis(
            request.patient_features.dict()
        )
        
        # Generate unique prediction ID
        prediction_id = str(uuid.uuid4())
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000
        
        # Format response
        diagnoses = []
        for pred in prediction_result.get("predictions", []):
            diagnoses.append(DiagnosisPrediction(
                diagnosis=pred["diagnosis"],
                probability=pred["probability"],
                confidence=pred["confidence"],
                rank=pred["rank"],
                icd10_code=pred.get("icd10_code")
            ))
        
        response = PredictionResponse(
            prediction_id=prediction_id,
            model_type=prediction_result["model_type"],
            model_version=prediction_result["model_version"],
            diagnoses=diagnoses,
            overall_confidence=prediction_result["overall_confidence"],
            processing_time_ms=processing_time,
            recommendations=_generate_diagnostic_recommendations(diagnoses),
            created_at=datetime.now()
        )
        
        # Log prediction in background
        # TODO: Log prediction to database
        # background_tasks.add_task(
        #     _log_prediction,
        #     prediction_id=prediction_response.prediction_id,
        #     request=request.dict(),
        #     response=diagnostic_prediction,
        #     user_id="anonymous"  # TODO: Extract from authentication
        # )
        
        logger.info(
            "Diagnostic prediction completed",
            prediction_id=prediction_id,
            processing_time_ms=processing_time,
            confidence=response.overall_confidence
        )
        
        return response
        
    except Exception as e:
        logger.error(
            "Diagnostic prediction failed",
            patient_id=request.patient_features.patient_id,
            error=str(e),
            error_type=type(e).__name__
        )
        
        if isinstance(e, HTTPException):
            raise
            
        raise HTTPException(
            status_code=500,
            detail=f"Prediction processing failed: {str(e)}"
        )


@router.post("/risk", response_model=PredictionResponse)
async def assess_risk(
    request: PredictionRequest,
    pipeline = Depends(get_ml_pipeline)
):
    """
    Assess medical risk for a patient based on their medical profile
    
    This endpoint evaluates various risk factors including age, chronic conditions,
    medications, and vital signs to calculate an overall risk score and provide
    recommendations for monitoring and care.
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(
            "Risk assessment requested",
            patient_id=request.patient_features.patient_id,
            age=request.patient_features.age,
            chronic_conditions_count=len(request.patient_features.chronic_conditions)
        )
        
        # Validate model type
        if request.model_type != "risk":
            raise HTTPException(
                status_code=400,
                detail="Invalid model type for risk assessment endpoint"
            )
        
        # Make risk assessment
        risk_result = await pipeline.assess_risk(
            request.patient_features.dict()
        )
        
        # Generate unique prediction ID
        prediction_id = str(uuid.uuid4())
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000
        
        # Format response
        risk_assessment = RiskAssessment(
            risk_score=risk_result["risk_score"],
            risk_level=risk_result["risk_level"],
            risk_factors=risk_result["risk_factors"],
            recommendations=risk_result["recommendations"]
        )
        
        response = PredictionResponse(
            prediction_id=prediction_id,
            model_type=risk_result["model_type"],
            model_version=risk_result["model_version"],
            risk_assessment=risk_assessment,
            overall_confidence=risk_result["confidence"],
            processing_time_ms=processing_time,
            recommendations=risk_result["recommendations"],
            created_at=datetime.now()
        )
        
        # TODO: Log prediction in background
        # background_tasks.add_task(
        #     log_prediction,
        #     prediction_id=prediction_id,
        #     model_type="risk",
        #     patient_id=request.patient_features.patient_id,
        #     prediction_result=risk_result,
        #     confidence=risk_result["confidence"],
        #     user_id="anonymous"  # TODO: Extract from authentication
        # )
        
        logger.info(
            "Risk assessment completed",
            prediction_id=prediction_id,
            risk_score=risk_assessment.risk_score,
            risk_level=risk_assessment.risk_level,
            processing_time_ms=processing_time
        )
        
        return response
        
    except Exception as e:
        logger.error(
            "Risk assessment failed",
            patient_id=request.patient_features.patient_id,
            error=str(e),
            error_type=type(e).__name__
        )
        
        if isinstance(e, HTTPException):
            raise
            
        raise HTTPException(
            status_code=500,
            detail=f"Risk assessment failed: {str(e)}"
        )


@router.get("/history/{patient_id}", response_model=PredictionHistory)
async def get_prediction_history(
    patient_id: str,
    limit: int = 50,
    model_type: Optional[str] = None
):
    """
    Get prediction history for a specific patient
    
    Returns historical predictions made for the patient, optionally filtered
    by model type and limited to a specified number of results.
    """
    try:
        logger.info(
            "Prediction history requested",
            patient_id=patient_id,
            limit=limit,
            model_type=model_type
        )
        
        # TODO: Implement database query for prediction history
        # For now, return mock data
        
        # Validate access permissions
        # TODO: Extract user from authentication
        user_id = "anonymous"  # _extract_user_from_token(token)
        if not _check_patient_access(user_id, patient_id):
            raise HTTPException(
                status_code=403,
                detail="Access denied to patient data"
            )
        
        # Mock response for development
        mock_predictions = []
        
        response = PredictionHistory(
            patient_id=patient_id,
            predictions=mock_predictions,
            total_count=len(mock_predictions),
            date_range={
                "start": datetime.now().strftime("%Y-%m-%d"),
                "end": datetime.now().strftime("%Y-%m-%d")
            }
        )
        
        logger.info(
            "Prediction history retrieved",
            patient_id=patient_id,
            count=len(mock_predictions)
        )
        
        return response
        
    except Exception as e:
        logger.error(
            "Failed to retrieve prediction history",
            patient_id=patient_id,
            error=str(e)
        )
        
        if isinstance(e, HTTPException):
            raise
            
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve prediction history"
        )


@router.post("/batch", response_model=List[PredictionResponse])
async def batch_predictions(
    requests: List[PredictionRequest],
    pipeline = Depends(get_ml_pipeline)
):
    """
    Process multiple predictions in a single request
    
    Useful for batch processing multiple patients or running multiple
    model types on the same patient data.
    """
    if len(requests) > 10:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Batch size limited to 10 requests"
        )
    
    logger.info(
        "Batch prediction requested",
        batch_size=len(requests)
    )
    
    responses = []
    
    for i, request in enumerate(requests):
        try:
            if request.model_type == "diagnostic":
                response = await predict_diagnosis(request, pipeline)
            elif request.model_type == "risk":
                response = await assess_risk(request, pipeline)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported model type: {request.model_type}"
                )
            
            responses.append(response)
            
        except Exception as e:
            logger.error(
                "Batch prediction item failed",
                batch_index=i,
                patient_id=request.patient_features.patient_id,
                error=str(e)
            )
            # Continue with other predictions
            continue
    
    logger.info(
        "Batch prediction completed",
        batch_size=len(requests),
        successful=len(responses)
    )
    
    return responses


# Helper functions
def _generate_diagnostic_recommendations(diagnoses: List[DiagnosisPrediction]) -> List[str]:
    """Generate recommendations based on diagnostic predictions"""
    recommendations = []
    
    if not diagnoses:
        return ["Insufficient data for recommendations"]
    
    primary_diagnosis = diagnoses[0]
    
    if primary_diagnosis.confidence == "low":
        recommendations.append("Consider additional diagnostic tests")
        recommendations.append("Monitor symptoms closely")
    
    if primary_diagnosis.probability < 0.6:
        recommendations.append("Consider differential diagnoses")
    
    # Add specific recommendations based on diagnosis
    if "infection" in primary_diagnosis.diagnosis.lower():
        recommendations.append("Monitor for signs of systemic infection")
        recommendations.append("Consider laboratory tests (CBC, cultures)")
    
    if "heart" in primary_diagnosis.diagnosis.lower():
        recommendations.append("ECG recommended")
        recommendations.append("Monitor vital signs")
    
    return recommendations


def _extract_user_from_token(token: str) -> str:
    """Extract user ID from JWT token"""
    # TODO: Implement JWT token validation and user extraction
    return "mock_user_id"


def _check_patient_access(user_id: str, patient_id: str) -> bool:
    """Check if user has access to patient data"""
    # TODO: Implement proper access control
    return True