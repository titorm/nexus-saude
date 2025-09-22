"""
FHIR Gateway Service
Gateway de integração FHIR R4 compliant para interoperabilidade hospitalar
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, HTTPException, Depends, Query, Path, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ValidationError
import logging
from enum import Enum
import uvicorn

# Import FHIR resources
from resources.patient import Patient, PatientManager
from resources.observation import Observation, ObservationManager
from resources.encounter import Encounter, EncounterManager
from resources.medication import Medication, MedicationRequest, MedicationManager
from resources.practitioner import Practitioner, PractitionerManager
from resources.organization import Organization, OrganizationManager

# Import validators
from validators.fhir_validator import FHIRValidator
from validators.bundle_validator import BundleValidator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="FHIR Gateway Service",
    description="Gateway de integração FHIR R4 compliant para sistemas hospitalares",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FHIR version and conformance
FHIR_VERSION = "4.0.1"
SERVER_BASE_URL = "http://localhost:8004"

# Resource managers
patient_manager = PatientManager()
observation_manager = ObservationManager()
encounter_manager = EncounterManager()
medication_manager = MedicationManager()
practitioner_manager = PractitionerManager()
organization_manager = OrganizationManager()

# Validators
fhir_validator = FHIRValidator()
bundle_validator = BundleValidator()

class SearchParameters(BaseModel):
    """Parâmetros de busca FHIR"""
    _count: Optional[int] = Field(default=50, le=200)
    _offset: Optional[int] = Field(default=0, ge=0)
    _sort: Optional[str] = None
    _include: Optional[List[str]] = None
    _revinclude: Optional[List[str]] = None

class OperationOutcome(BaseModel):
    """FHIR OperationOutcome resource"""
    resourceType: str = "OperationOutcome"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    issue: List[Dict[str, Any]]

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize FHIR Gateway service"""
    logger.info("Starting FHIR Gateway Service...")
    
    # Initialize resource managers
    await patient_manager.initialize()
    await observation_manager.initialize()
    await encounter_manager.initialize()
    await medication_manager.initialize()
    await practitioner_manager.initialize()
    await organization_manager.initialize()
    
    # Initialize validators
    await fhir_validator.initialize()
    await bundle_validator.initialize()
    
    logger.info("FHIR Gateway Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down FHIR Gateway Service...")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "FHIR Gateway Service",
        "version": "1.0.0",
        "fhir_version": FHIR_VERSION,
        "status": "operational"
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "FHIR Gateway",
        "version": "1.0.0",
        "fhir_version": FHIR_VERSION
    }

# Capability Statement
@app.get("/metadata")
async def capability_statement():
    """FHIR Capability Statement"""
    return {
        "resourceType": "CapabilityStatement",
        "id": "nexus-fhir-gateway",
        "meta": {
            "versionId": "1",
            "lastUpdated": datetime.now(timezone.utc).isoformat()
        },
        "url": f"{SERVER_BASE_URL}/metadata",
        "version": "1.0.0",
        "name": "NexusFHIRGateway",
        "title": "Nexus FHIR Gateway",
        "status": "active",
        "experimental": False,
        "date": datetime.now(timezone.utc).isoformat(),
        "publisher": "Nexus Saúde",
        "description": "FHIR R4 Gateway for hospital system interoperability",
        "kind": "instance",
        "software": {
            "name": "Nexus FHIR Gateway",
            "version": "1.0.0"
        },
        "implementation": {
            "description": "Nexus FHIR Gateway Implementation",
            "url": SERVER_BASE_URL
        },
        "fhirVersion": FHIR_VERSION,
        "format": ["json", "xml"],
        "rest": [
            {
                "mode": "server",
                "documentation": "Main FHIR endpoint for Nexus Gateway",
                "security": {
                    "cors": True,
                    "description": "CORS enabled"
                },
                "resource": [
                    {
                        "type": "Patient",
                        "profile": f"http://hl7.org/fhir/StructureDefinition/Patient",
                        "interaction": [
                            {"code": "create"},
                            {"code": "read"},
                            {"code": "update"},
                            {"code": "delete"},
                            {"code": "search-type"}
                        ],
                        "searchParam": [
                            {"name": "identifier", "type": "token"},
                            {"name": "name", "type": "string"},
                            {"name": "birthdate", "type": "date"},
                            {"name": "gender", "type": "token"}
                        ]
                    },
                    {
                        "type": "Observation",
                        "profile": f"http://hl7.org/fhir/StructureDefinition/Observation",
                        "interaction": [
                            {"code": "create"},
                            {"code": "read"},
                            {"code": "update"},
                            {"code": "delete"},
                            {"code": "search-type"}
                        ]
                    },
                    {
                        "type": "Encounter",
                        "profile": f"http://hl7.org/fhir/StructureDefinition/Encounter",
                        "interaction": [
                            {"code": "create"},
                            {"code": "read"},
                            {"code": "update"},
                            {"code": "delete"},
                            {"code": "search-type"}
                        ]
                    },
                    {
                        "type": "Medication",
                        "profile": f"http://hl7.org/fhir/StructureDefinition/Medication",
                        "interaction": [
                            {"code": "create"},
                            {"code": "read"},
                            {"code": "update"},
                            {"code": "delete"},
                            {"code": "search-type"}
                        ]
                    },
                    {
                        "type": "MedicationRequest",
                        "profile": f"http://hl7.org/fhir/StructureDefinition/MedicationRequest",
                        "interaction": [
                            {"code": "create"},
                            {"code": "read"},
                            {"code": "update"},
                            {"code": "delete"},
                            {"code": "search-type"}
                        ]
                    }
                ]
            }
        ]
    }

# Patient endpoints
@app.post("/Patient")
async def create_patient(patient_data: Dict[str, Any]):
    """Create a new Patient"""
    try:
        # Validate FHIR resource
        await fhir_validator.validate_resource("Patient", patient_data)
        
        # Create patient
        patient = await patient_manager.create_patient(patient_data)
        
        return JSONResponse(
            status_code=201,
            content=patient,
            headers={"Location": f"{SERVER_BASE_URL}/Patient/{patient['id']}"}
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating patient: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/Patient/{patient_id}")
async def get_patient(patient_id: str = Path(..., description="Patient ID")):
    """Get Patient by ID"""
    try:
        patient = await patient_manager.get_patient(patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient
    except Exception as e:
        logger.error(f"Error getting patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/Patient/{patient_id}")
async def update_patient(
    patient_id: str = Path(..., description="Patient ID"),
    patient_data: Dict[str, Any] = None
):
    """Update Patient"""
    try:
        # Validate FHIR resource
        await fhir_validator.validate_resource("Patient", patient_data)
        
        # Update patient
        patient = await patient_manager.update_patient(patient_id, patient_data)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return patient
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/Patient/{patient_id}")
async def delete_patient(patient_id: str = Path(..., description="Patient ID")):
    """Delete Patient"""
    try:
        success = await patient_manager.delete_patient(patient_id)
        if not success:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return {"message": "Patient deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/Patient")
async def search_patients(
    identifier: Optional[str] = Query(None),
    name: Optional[str] = Query(None),
    birthdate: Optional[str] = Query(None),
    gender: Optional[str] = Query(None),
    _count: int = Query(default=50, le=200),
    _offset: int = Query(default=0, ge=0)
):
    """Search Patients"""
    try:
        search_params = {
            "identifier": identifier,
            "name": name,
            "birthdate": birthdate,
            "gender": gender,
            "_count": _count,
            "_offset": _offset
        }
        
        # Remove None values
        search_params = {k: v for k, v in search_params.items() if v is not None}
        
        result = await patient_manager.search_patients(search_params)
        
        return {
            "resourceType": "Bundle",
            "id": str(uuid.uuid4()),
            "meta": {
                "lastUpdated": datetime.now(timezone.utc).isoformat()
            },
            "type": "searchset",
            "total": result.get("total", 0),
            "entry": result.get("entries", [])
        }
    except Exception as e:
        logger.error(f"Error searching patients: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Observation endpoints
@app.post("/Observation")
async def create_observation(observation_data: Dict[str, Any]):
    """Create a new Observation"""
    try:
        await fhir_validator.validate_resource("Observation", observation_data)
        observation = await observation_manager.create_observation(observation_data)
        
        return JSONResponse(
            status_code=201,
            content=observation,
            headers={"Location": f"{SERVER_BASE_URL}/Observation/{observation['id']}"}
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating observation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/Observation/{observation_id}")
async def get_observation(observation_id: str = Path(..., description="Observation ID")):
    """Get Observation by ID"""
    try:
        observation = await observation_manager.get_observation(observation_id)
        if not observation:
            raise HTTPException(status_code=404, detail="Observation not found")
        return observation
    except Exception as e:
        logger.error(f"Error getting observation {observation_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/Observation")
async def search_observations(
    subject: Optional[str] = Query(None),
    code: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    _count: int = Query(default=50, le=200),
    _offset: int = Query(default=0, ge=0)
):
    """Search Observations"""
    try:
        search_params = {
            "subject": subject,
            "code": code,
            "date": date,
            "_count": _count,
            "_offset": _offset
        }
        
        search_params = {k: v for k, v in search_params.items() if v is not None}
        result = await observation_manager.search_observations(search_params)
        
        return {
            "resourceType": "Bundle",
            "id": str(uuid.uuid4()),
            "meta": {
                "lastUpdated": datetime.now(timezone.utc).isoformat()
            },
            "type": "searchset",
            "total": result.get("total", 0),
            "entry": result.get("entries", [])
        }
    except Exception as e:
        logger.error(f"Error searching observations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Encounter endpoints
@app.post("/Encounter")
async def create_encounter(encounter_data: Dict[str, Any]):
    """Create a new Encounter"""
    try:
        await fhir_validator.validate_resource("Encounter", encounter_data)
        encounter = await encounter_manager.create_encounter(encounter_data)
        
        return JSONResponse(
            status_code=201,
            content=encounter,
            headers={"Location": f"{SERVER_BASE_URL}/Encounter/{encounter['id']}"}
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating encounter: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/Encounter/{encounter_id}")
async def get_encounter(encounter_id: str = Path(..., description="Encounter ID")):
    """Get Encounter by ID"""
    try:
        encounter = await encounter_manager.get_encounter(encounter_id)
        if not encounter:
            raise HTTPException(status_code=404, detail="Encounter not found")
        return encounter
    except Exception as e:
        logger.error(f"Error getting encounter {encounter_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Medication endpoints  
@app.post("/Medication")
async def create_medication(medication_data: Dict[str, Any]):
    """Create a new Medication"""
    try:
        await fhir_validator.validate_resource("Medication", medication_data)
        medication = await medication_manager.create_medication(medication_data)
        
        return JSONResponse(
            status_code=201,
            content=medication,
            headers={"Location": f"{SERVER_BASE_URL}/Medication/{medication['id']}"}
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating medication: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/Medication/{medication_id}")
async def get_medication(medication_id: str = Path(..., description="Medication ID")):
    """Get Medication by ID"""
    try:
        medication = await medication_manager.get_medication(medication_id)
        if not medication:
            raise HTTPException(status_code=404, detail="Medication not found")
        return medication
    except Exception as e:
        logger.error(f"Error getting medication {medication_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Bundle endpoint for transaction processing
@app.post("/")
async def process_bundle(bundle_data: Dict[str, Any]):
    """Process FHIR Bundle (batch/transaction)"""
    try:
        # Validate bundle
        await bundle_validator.validate_bundle(bundle_data)
        
        # Process bundle entries
        results = []
        bundle_type = bundle_data.get("type", "batch")
        
        for entry in bundle_data.get("entry", []):
            if "request" in entry:
                request = entry["request"]
                method = request.get("method", "GET")
                url = request.get("url", "")
                
                if method == "POST" and "resource" in entry:
                    # Create resource
                    resource = entry["resource"]
                    resource_type = resource.get("resourceType")
                    
                    if resource_type == "Patient":
                        result = await patient_manager.create_patient(resource)
                    elif resource_type == "Observation":
                        result = await observation_manager.create_observation(resource)
                    elif resource_type == "Encounter":
                        result = await encounter_manager.create_encounter(resource)
                    elif resource_type == "Medication":
                        result = await medication_manager.create_medication(resource)
                    else:
                        result = {"error": f"Unsupported resource type: {resource_type}"}
                    
                    results.append({
                        "response": {
                            "status": "201 Created",
                            "location": f"{resource_type}/{result.get('id')}"
                        },
                        "resource": result
                    })
        
        return {
            "resourceType": "Bundle",
            "id": str(uuid.uuid4()),
            "meta": {
                "lastUpdated": datetime.now(timezone.utc).isoformat()
            },
            "type": f"{bundle_type}-response",
            "entry": results
        }
        
    except Exception as e:
        logger.error(f"Error processing bundle: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Error handling
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    """Handle 404 errors with FHIR OperationOutcome"""
    return JSONResponse(
        status_code=404,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "not-found",
                    "diagnostics": exc.detail
                }
            ]
        }
    )

@app.exception_handler(400)
async def validation_error_handler(request: Request, exc: HTTPException):
    """Handle validation errors with FHIR OperationOutcome"""
    return JSONResponse(
        status_code=400,
        content={
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": "error",
                    "code": "invalid",
                    "diagnostics": exc.detail
                }
            ]
        }
    )

# Metrics endpoint
@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "FHIR Gateway",
        "version": "1.0.0",
        "fhir_version": FHIR_VERSION,
        "status": "operational",
        "resources_supported": [
            "Patient", "Observation", "Encounter", 
            "Medication", "MedicationRequest", 
            "Practitioner", "Organization"
        ],
        "interactions_supported": [
            "create", "read", "update", "delete", "search-type"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info"
    )