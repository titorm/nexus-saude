"""
FHIR Observation Resource
Implementação do recurso Observation conforme FHIR R4
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class CodeableConcept(BaseModel):
    """Codeable concept structure"""
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None

class Quantity(BaseModel):
    """Quantity structure"""
    value: Optional[float] = None
    comparator: Optional[str] = None  # < | <= | >= | >
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None

class Reference(BaseModel):
    """Reference structure"""
    reference: Optional[str] = None
    type: Optional[str] = None
    identifier: Optional[Dict[str, Any]] = None
    display: Optional[str] = None

class ObservationComponent(BaseModel):
    """Observation component"""
    code: CodeableConcept
    value: Optional[Dict[str, Any]] = None  # Can be various types
    dataAbsentReason: Optional[CodeableConcept] = None
    interpretation: Optional[List[CodeableConcept]] = None
    referenceRange: Optional[List[Dict[str, Any]]] = None

class Observation(BaseModel):
    """FHIR Observation resource"""
    resourceType: str = "Observation"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # Observation-specific elements
    identifier: Optional[List[Dict[str, Any]]] = None
    basedOn: Optional[List[Reference]] = None
    partOf: Optional[List[Reference]] = None
    status: str  # registered | preliminary | final | amended | corrected | cancelled | entered-in-error | unknown
    category: Optional[List[CodeableConcept]] = None
    code: CodeableConcept
    subject: Optional[Reference] = None
    focus: Optional[List[Reference]] = None
    encounter: Optional[Reference] = None
    effective: Optional[Dict[str, Any]] = None  # Can be DateTime, Period, Timing, instant
    issued: Optional[str] = None
    performer: Optional[List[Reference]] = None
    value: Optional[Dict[str, Any]] = None  # Can be various types
    dataAbsentReason: Optional[CodeableConcept] = None
    interpretation: Optional[List[CodeableConcept]] = None
    note: Optional[List[Dict[str, Any]]] = None
    bodySite: Optional[CodeableConcept] = None
    method: Optional[CodeableConcept] = None
    specimen: Optional[Reference] = None
    device: Optional[Reference] = None
    referenceRange: Optional[List[Dict[str, Any]]] = None
    hasMember: Optional[List[Reference]] = None
    derivedFrom: Optional[List[Reference]] = None
    component: Optional[List[ObservationComponent]] = None

class ObservationManager:
    """Gerenciador de recursos Observation"""
    
    def __init__(self):
        self.observations = {}  # In-memory storage
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa o gerenciador de observações"""
        try:
            logger.info("Initializing Observation Manager...")
            
            # Criar algumas observações de exemplo
            await self._create_sample_observations()
            
            self.is_initialized = True
            logger.info("Observation Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Observation Manager: {e}")
            self.is_initialized = True
    
    async def create_observation(self, observation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria uma nova observação"""
        try:
            # Generate ID if not provided
            if "id" not in observation_data:
                observation_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            observation_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Observation"]
            }
            
            # Validate observation data
            await self._validate_observation(observation_data)
            
            # Store observation
            self.observations[observation_data["id"]] = observation_data
            
            logger.info(f"Observation created with ID: {observation_data['id']}")
            return observation_data
            
        except Exception as e:
            logger.error(f"Error creating observation: {e}")
            raise
    
    async def get_observation(self, observation_id: str) -> Optional[Dict[str, Any]]:
        """Busca uma observação por ID"""
        try:
            observation = self.observations.get(observation_id)
            if observation:
                logger.info(f"Observation found: {observation_id}")
            else:
                logger.warning(f"Observation not found: {observation_id}")
            return observation
        except Exception as e:
            logger.error(f"Error getting observation {observation_id}: {e}")
            raise
    
    async def update_observation(self, observation_id: str, observation_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Atualiza uma observação"""
        try:
            if observation_id not in self.observations:
                return None
            
            # Preserve ID
            observation_data["id"] = observation_id
            
            # Update metadata
            old_version = int(self.observations[observation_id].get("meta", {}).get("versionId", "1"))
            observation_data["meta"] = {
                "versionId": str(old_version + 1),
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Observation"]
            }
            
            # Validate observation data
            await self._validate_observation(observation_data)
            
            # Update observation
            self.observations[observation_id] = observation_data
            
            logger.info(f"Observation updated: {observation_id}")
            return observation_data
            
        except Exception as e:
            logger.error(f"Error updating observation {observation_id}: {e}")
            raise
    
    async def delete_observation(self, observation_id: str) -> bool:
        """Deleta uma observação"""
        try:
            if observation_id in self.observations:
                del self.observations[observation_id]
                logger.info(f"Observation deleted: {observation_id}")
                return True
            else:
                logger.warning(f"Observation not found for deletion: {observation_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting observation {observation_id}: {e}")
            raise
    
    async def search_observations(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """Busca observações baseado em parâmetros"""
        try:
            matching_observations = []
            
            for observation in self.observations.values():
                if await self._matches_search_criteria(observation, search_params):
                    matching_observations.append({
                        "fullUrl": f"Observation/{observation['id']}",
                        "resource": observation
                    })
            
            # Apply pagination
            count = search_params.get("_count", 50)
            offset = search_params.get("_offset", 0)
            
            total = len(matching_observations)
            paginated_observations = matching_observations[offset:offset + count]
            
            logger.info(f"Observation search returned {len(paginated_observations)} of {total} results")
            
            return {
                "total": total,
                "entries": paginated_observations
            }
            
        except Exception as e:
            logger.error(f"Error searching observations: {e}")
            raise
    
    async def _validate_observation(self, observation_data: Dict[str, Any]):
        """Valida dados da observação"""
        try:
            # Basic validation
            if "resourceType" not in observation_data:
                observation_data["resourceType"] = "Observation"
            
            if observation_data["resourceType"] != "Observation":
                raise ValueError("Invalid resourceType for Observation")
            
            # Validate required fields
            if "status" not in observation_data:
                raise ValueError("Observation must have a status")
            
            valid_statuses = ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"]
            if observation_data["status"] not in valid_statuses:
                raise ValueError(f"Invalid status value: {observation_data['status']}")
            
            if "code" not in observation_data:
                raise ValueError("Observation must have a code")
            
        except Exception as e:
            logger.error(f"Observation validation error: {e}")
            raise
    
    async def _matches_search_criteria(self, observation: Dict[str, Any], search_params: Dict[str, Any]) -> bool:
        """Verifica se observação atende aos critérios de busca"""
        try:
            # Search by subject
            if "subject" in search_params:
                subject_ref = search_params["subject"]
                observation_subject = observation.get("subject", {})
                
                if observation_subject.get("reference") == subject_ref:
                    return True
                
                # Also check if it's just the ID part
                if observation_subject.get("reference", "").endswith(f"/{subject_ref}"):
                    return True
            
            # Search by code
            if "code" in search_params:
                code_search = search_params["code"]
                observation_code = observation.get("code", {})
                
                # Search in coding
                codings = observation_code.get("coding", [])
                for coding in codings:
                    if coding.get("code") == code_search:
                        return True
                
                # Search in text
                if observation_code.get("text", "").lower().find(code_search.lower()) >= 0:
                    return True
            
            # Search by date
            if "date" in search_params:
                date_search = search_params["date"]
                
                # Check effective date
                effective = observation.get("effective")
                if effective:
                    if isinstance(effective, str) and effective.startswith(date_search):
                        return True
                    elif isinstance(effective, dict):
                        # Handle effectivePeriod or effectiveDateTime
                        if effective.get("start", "").startswith(date_search):
                            return True
                        if effective.get("end", "").startswith(date_search):
                            return True
                
                # Check issued date
                issued = observation.get("issued", "")
                if issued.startswith(date_search):
                    return True
            
            # If no specific search parameters, return all
            search_keys = set(search_params.keys()) - {"_count", "_offset"}
            if not search_keys:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error in observation search criteria matching: {e}")
            return False
    
    async def _create_sample_observations(self):
        """Cria observações de exemplo"""
        try:
            sample_observations = [
                {
                    "id": "obs-001",
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                    "code": "vital-signs",
                                    "display": "Vital Signs"
                                }
                            ]
                        }
                    ],
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "8867-4",
                                "display": "Heart rate"
                            }
                        ],
                        "text": "Heart rate"
                    },
                    "subject": {
                        "reference": "Patient/patient-001",
                        "display": "João Pedro Silva"
                    },
                    "effectiveDateTime": "2024-01-15T10:30:00Z",
                    "issued": "2024-01-15T10:35:00Z",
                    "performer": [
                        {
                            "reference": "Practitioner/pract-001",
                            "display": "Dr. Carlos Santos"
                        }
                    ],
                    "valueQuantity": {
                        "value": 72,
                        "unit": "beats/min",
                        "system": "http://unitsofmeasure.org",
                        "code": "/min"
                    },
                    "interpretation": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                    "code": "N",
                                    "display": "Normal"
                                }
                            ]
                        }
                    ],
                    "referenceRange": [
                        {
                            "low": {
                                "value": 60,
                                "unit": "beats/min"
                            },
                            "high": {
                                "value": 100,
                                "unit": "beats/min"
                            }
                        }
                    ]
                },
                {
                    "id": "obs-002",
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                    "code": "vital-signs",
                                    "display": "Vital Signs"
                                }
                            ]
                        }
                    ],
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "85354-9",
                                "display": "Blood pressure panel with all children optional"
                            }
                        ],
                        "text": "Blood pressure"
                    },
                    "subject": {
                        "reference": "Patient/patient-001",
                        "display": "João Pedro Silva"
                    },
                    "effectiveDateTime": "2024-01-15T10:30:00Z",
                    "issued": "2024-01-15T10:35:00Z",
                    "performer": [
                        {
                            "reference": "Practitioner/pract-001",
                            "display": "Dr. Carlos Santos"
                        }
                    ],
                    "component": [
                        {
                            "code": {
                                "coding": [
                                    {
                                        "system": "http://loinc.org",
                                        "code": "8480-6",
                                        "display": "Systolic blood pressure"
                                    }
                                ]
                            },
                            "valueQuantity": {
                                "value": 120,
                                "unit": "mmHg",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]"
                            }
                        },
                        {
                            "code": {
                                "coding": [
                                    {
                                        "system": "http://loinc.org",
                                        "code": "8462-4",
                                        "display": "Diastolic blood pressure"
                                    }
                                ]
                            },
                            "valueQuantity": {
                                "value": 80,
                                "unit": "mmHg",
                                "system": "http://unitsofmeasure.org",
                                "code": "mm[Hg]"
                            }
                        }
                    ]
                },
                {
                    "id": "obs-003",
                    "resourceType": "Observation",
                    "status": "final",
                    "category": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                    "code": "laboratory",
                                    "display": "Laboratory"
                                }
                            ]
                        }
                    ],
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": "33747-0",
                                "display": "Glucose [Mass/volume] in Blood"
                            }
                        ],
                        "text": "Blood glucose"
                    },
                    "subject": {
                        "reference": "Patient/patient-002",
                        "display": "Maria Clara Santos"
                    },
                    "effectiveDateTime": "2024-01-16T08:00:00Z",
                    "issued": "2024-01-16T09:00:00Z",
                    "performer": [
                        {
                            "reference": "Practitioner/pract-002",
                            "display": "Dr. Ana Lima"
                        }
                    ],
                    "valueQuantity": {
                        "value": 95,
                        "unit": "mg/dL",
                        "system": "http://unitsofmeasure.org",
                        "code": "mg/dL"
                    },
                    "interpretation": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                                    "code": "N",
                                    "display": "Normal"
                                }
                            ]
                        }
                    ],
                    "referenceRange": [
                        {
                            "low": {
                                "value": 70,
                                "unit": "mg/dL"
                            },
                            "high": {
                                "value": 110,
                                "unit": "mg/dL"
                            },
                            "text": "Normal fasting glucose"
                        }
                    ]
                }
            ]
            
            for observation_data in sample_observations:
                observation_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/Observation"]
                }
                self.observations[observation_data["id"]] = observation_data
            
            logger.info(f"Created {len(sample_observations)} sample observations")
            
        except Exception as e:
            logger.error(f"Error creating sample observations: {e}")
            # Don't raise - sample data is optional