"""
FHIR Medication Resources
Implementação dos recursos Medication e MedicationRequest conforme FHIR R4
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class Medication(BaseModel):
    """FHIR Medication resource"""
    resourceType: str = "Medication"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # Medication-specific elements
    identifier: Optional[List[Dict[str, Any]]] = None
    code: Optional[Dict[str, Any]] = None
    status: Optional[str] = None  # active | inactive | entered-in-error
    manufacturer: Optional[Dict[str, Any]] = None
    form: Optional[Dict[str, Any]] = None
    amount: Optional[Dict[str, Any]] = None
    ingredient: Optional[List[Dict[str, Any]]] = None
    batch: Optional[Dict[str, Any]] = None

class MedicationRequest(BaseModel):
    """FHIR MedicationRequest resource"""
    resourceType: str = "MedicationRequest"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # MedicationRequest-specific elements
    identifier: Optional[List[Dict[str, Any]]] = None
    status: str  # active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown
    statusReason: Optional[Dict[str, Any]] = None
    intent: str  # proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option
    category: Optional[List[Dict[str, Any]]] = None
    priority: Optional[str] = None  # routine | urgent | asap | stat
    doNotPerform: Optional[bool] = None
    reported: Optional[bool] = None  # Can also be Reference
    medication: Dict[str, Any]  # CodeableConcept or Reference
    subject: Dict[str, Any]  # Reference to Patient/Group
    encounter: Optional[Dict[str, Any]] = None
    supportingInformation: Optional[List[Dict[str, Any]]] = None
    authoredOn: Optional[str] = None
    requester: Optional[Dict[str, Any]] = None
    performer: Optional[Dict[str, Any]] = None
    performerType: Optional[Dict[str, Any]] = None
    recorder: Optional[Dict[str, Any]] = None
    reasonCode: Optional[List[Dict[str, Any]]] = None
    reasonReference: Optional[List[Dict[str, Any]]] = None
    instantiatesCanonical: Optional[List[str]] = None
    instantiatesUri: Optional[List[str]] = None
    basedOn: Optional[List[Dict[str, Any]]] = None
    groupIdentifier: Optional[Dict[str, Any]] = None
    courseOfTherapyType: Optional[Dict[str, Any]] = None
    insurance: Optional[List[Dict[str, Any]]] = None
    note: Optional[List[Dict[str, Any]]] = None
    dosageInstruction: Optional[List[Dict[str, Any]]] = None
    dispenseRequest: Optional[Dict[str, Any]] = None
    substitution: Optional[Dict[str, Any]] = None
    priorPrescription: Optional[Dict[str, Any]] = None
    detectedIssue: Optional[List[Dict[str, Any]]] = None
    eventHistory: Optional[List[Dict[str, Any]]] = None

class MedicationManager:
    """Gerenciador de recursos Medication e MedicationRequest"""
    
    def __init__(self):
        self.medications = {}  # In-memory storage for Medication
        self.medication_requests = {}  # In-memory storage for MedicationRequest
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa o gerenciador de medicações"""
        try:
            logger.info("Initializing Medication Manager...")
            
            # Criar algumas medicações de exemplo
            await self._create_sample_medications()
            await self._create_sample_medication_requests()
            
            self.is_initialized = True
            logger.info("Medication Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Medication Manager: {e}")
            self.is_initialized = True
    
    # Medication methods
    async def create_medication(self, medication_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria uma nova medicação"""
        try:
            # Generate ID if not provided
            if "id" not in medication_data:
                medication_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            medication_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Medication"]
            }
            
            # Validate medication data
            await self._validate_medication(medication_data)
            
            # Store medication
            self.medications[medication_data["id"]] = medication_data
            
            logger.info(f"Medication created with ID: {medication_data['id']}")
            return medication_data
            
        except Exception as e:
            logger.error(f"Error creating medication: {e}")
            raise
    
    async def get_medication(self, medication_id: str) -> Optional[Dict[str, Any]]:
        """Busca uma medicação por ID"""
        try:
            medication = self.medications.get(medication_id)
            if medication:
                logger.info(f"Medication found: {medication_id}")
            else:
                logger.warning(f"Medication not found: {medication_id}")
            return medication
        except Exception as e:
            logger.error(f"Error getting medication {medication_id}: {e}")
            raise
    
    async def update_medication(self, medication_id: str, medication_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Atualiza uma medicação"""
        try:
            if medication_id not in self.medications:
                return None
            
            # Preserve ID
            medication_data["id"] = medication_id
            
            # Update metadata
            old_version = int(self.medications[medication_id].get("meta", {}).get("versionId", "1"))
            medication_data["meta"] = {
                "versionId": str(old_version + 1),
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Medication"]
            }
            
            # Validate medication data
            await self._validate_medication(medication_data)
            
            # Update medication
            self.medications[medication_id] = medication_data
            
            logger.info(f"Medication updated: {medication_id}")
            return medication_data
            
        except Exception as e:
            logger.error(f"Error updating medication {medication_id}: {e}")
            raise
    
    async def delete_medication(self, medication_id: str) -> bool:
        """Deleta uma medicação"""
        try:
            if medication_id in self.medications:
                del self.medications[medication_id]
                logger.info(f"Medication deleted: {medication_id}")
                return True
            else:
                logger.warning(f"Medication not found for deletion: {medication_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting medication {medication_id}: {e}")
            raise
    
    # MedicationRequest methods
    async def create_medication_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria uma nova prescrição"""
        try:
            # Generate ID if not provided
            if "id" not in request_data:
                request_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            request_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/MedicationRequest"]
            }
            
            # Validate medication request data
            await self._validate_medication_request(request_data)
            
            # Store medication request
            self.medication_requests[request_data["id"]] = request_data
            
            logger.info(f"MedicationRequest created with ID: {request_data['id']}")
            return request_data
            
        except Exception as e:
            logger.error(f"Error creating medication request: {e}")
            raise
    
    async def get_medication_request(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Busca uma prescrição por ID"""
        try:
            request = self.medication_requests.get(request_id)
            if request:
                logger.info(f"MedicationRequest found: {request_id}")
            else:
                logger.warning(f"MedicationRequest not found: {request_id}")
            return request
        except Exception as e:
            logger.error(f"Error getting medication request {request_id}: {e}")
            raise
    
    async def search_medications(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """Busca medicações baseado em parâmetros"""
        try:
            matching_medications = []
            
            for medication in self.medications.values():
                if await self._matches_medication_search_criteria(medication, search_params):
                    matching_medications.append({
                        "fullUrl": f"Medication/{medication['id']}",
                        "resource": medication
                    })
            
            # Apply pagination
            count = search_params.get("_count", 50)
            offset = search_params.get("_offset", 0)
            
            total = len(matching_medications)
            paginated_medications = matching_medications[offset:offset + count]
            
            logger.info(f"Medication search returned {len(paginated_medications)} of {total} results")
            
            return {
                "total": total,
                "entries": paginated_medications
            }
            
        except Exception as e:
            logger.error(f"Error searching medications: {e}")
            raise
    
    async def search_medication_requests(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """Busca prescrições baseado em parâmetros"""
        try:
            matching_requests = []
            
            for request in self.medication_requests.values():
                if await self._matches_request_search_criteria(request, search_params):
                    matching_requests.append({
                        "fullUrl": f"MedicationRequest/{request['id']}",
                        "resource": request
                    })
            
            # Apply pagination
            count = search_params.get("_count", 50)
            offset = search_params.get("_offset", 0)
            
            total = len(matching_requests)
            paginated_requests = matching_requests[offset:offset + count]
            
            logger.info(f"MedicationRequest search returned {len(paginated_requests)} of {total} results")
            
            return {
                "total": total,
                "entries": paginated_requests
            }
            
        except Exception as e:
            logger.error(f"Error searching medication requests: {e}")
            raise
    
    async def _validate_medication(self, medication_data: Dict[str, Any]):
        """Valida dados da medicação"""
        try:
            # Basic validation
            if "resourceType" not in medication_data:
                medication_data["resourceType"] = "Medication"
            
            if medication_data["resourceType"] != "Medication":
                raise ValueError("Invalid resourceType for Medication")
            
            # Validate status if present
            if "status" in medication_data:
                valid_statuses = ["active", "inactive", "entered-in-error"]
                if medication_data["status"] not in valid_statuses:
                    raise ValueError(f"Invalid status value: {medication_data['status']}")
            
        except Exception as e:
            logger.error(f"Medication validation error: {e}")
            raise
    
    async def _validate_medication_request(self, request_data: Dict[str, Any]):
        """Valida dados da prescrição"""
        try:
            # Basic validation
            if "resourceType" not in request_data:
                request_data["resourceType"] = "MedicationRequest"
            
            if request_data["resourceType"] != "MedicationRequest":
                raise ValueError("Invalid resourceType for MedicationRequest")
            
            # Validate required fields
            if "status" not in request_data:
                raise ValueError("MedicationRequest must have a status")
            
            valid_statuses = ["active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft", "unknown"]
            if request_data["status"] not in valid_statuses:
                raise ValueError(f"Invalid status value: {request_data['status']}")
            
            if "intent" not in request_data:
                raise ValueError("MedicationRequest must have an intent")
            
            valid_intents = ["proposal", "plan", "order", "original-order", "reflex-order", "filler-order", "instance-order", "option"]
            if request_data["intent"] not in valid_intents:
                raise ValueError(f"Invalid intent value: {request_data['intent']}")
            
            if "medication" not in request_data:
                raise ValueError("MedicationRequest must have a medication")
            
            if "subject" not in request_data:
                raise ValueError("MedicationRequest must have a subject")
            
        except Exception as e:
            logger.error(f"MedicationRequest validation error: {e}")
            raise
    
    async def _matches_medication_search_criteria(self, medication: Dict[str, Any], search_params: Dict[str, Any]) -> bool:
        """Verifica se medicação atende aos critérios de busca"""
        try:
            # Search by code
            if "code" in search_params:
                code_search = search_params["code"]
                medication_code = medication.get("code", {})
                
                # Search in coding
                codings = medication_code.get("coding", [])
                for coding in codings:
                    if coding.get("code") == code_search:
                        return True
                
                # Search in text
                if medication_code.get("text", "").lower().find(code_search.lower()) >= 0:
                    return True
            
            # Search by status
            if "status" in search_params:
                if medication.get("status") == search_params["status"]:
                    return True
            
            # If no specific search parameters, return all
            search_keys = set(search_params.keys()) - {"_count", "_offset"}
            if not search_keys:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error in medication search criteria matching: {e}")
            return False
    
    async def _matches_request_search_criteria(self, request: Dict[str, Any], search_params: Dict[str, Any]) -> bool:
        """Verifica se prescrição atende aos critérios de busca"""
        try:
            # Search by subject/patient
            if "subject" in search_params or "patient" in search_params:
                subject_ref = search_params.get("subject") or search_params.get("patient")
                request_subject = request.get("subject", {})
                
                if request_subject.get("reference") == subject_ref:
                    return True
                
                # Also check if it's just the ID part
                if request_subject.get("reference", "").endswith(f"/{subject_ref}"):
                    return True
            
            # Search by status
            if "status" in search_params:
                if request.get("status") == search_params["status"]:
                    return True
            
            # Search by medication
            if "medication" in search_params:
                medication_ref = search_params["medication"]
                request_medication = request.get("medication", {})
                
                if request_medication.get("reference") == medication_ref:
                    return True
                
                # Also check if it's just the ID part
                if request_medication.get("reference", "").endswith(f"/{medication_ref}"):
                    return True
            
            # If no specific search parameters, return all
            search_keys = set(search_params.keys()) - {"_count", "_offset"}
            if not search_keys:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error in medication request search criteria matching: {e}")
            return False
    
    async def _create_sample_medications(self):
        """Cria medicações de exemplo"""
        try:
            sample_medications = [
                {
                    "id": "med-001",
                    "resourceType": "Medication",
                    "code": {
                        "coding": [
                            {
                                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                                "code": "329511",
                                "display": "amoxicillin 500 MG Oral Capsule"
                            }
                        ],
                        "text": "Amoxicillin 500mg"
                    },
                    "status": "active",
                    "manufacturer": {
                        "reference": "Organization/pharma-001",
                        "display": "Generic Pharma"
                    },
                    "form": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "385055001",
                                "display": "Tablet"
                            }
                        ]
                    }
                },
                {
                    "id": "med-002",
                    "resourceType": "Medication",
                    "code": {
                        "coding": [
                            {
                                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                                "code": "310965",
                                "display": "acetaminophen 500 MG Oral Tablet"
                            }
                        ],
                        "text": "Paracetamol 500mg"
                    },
                    "status": "active",
                    "form": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "385055001",
                                "display": "Tablet"
                            }
                        ]
                    }
                },
                {
                    "id": "med-003",
                    "resourceType": "Medication",
                    "code": {
                        "coding": [
                            {
                                "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                                "code": "197361",
                                "display": "ibuprofen 200 MG Oral Tablet"
                            }
                        ],
                        "text": "Ibuprofeno 200mg"
                    },
                    "status": "active",
                    "form": {
                        "coding": [
                            {
                                "system": "http://snomed.info/sct",
                                "code": "385055001",
                                "display": "Tablet"
                            }
                        ]
                    }
                }
            ]
            
            for medication_data in sample_medications:
                medication_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/Medication"]
                }
                self.medications[medication_data["id"]] = medication_data
            
            logger.info(f"Created {len(sample_medications)} sample medications")
            
        except Exception as e:
            logger.error(f"Error creating sample medications: {e}")
    
    async def _create_sample_medication_requests(self):
        """Cria prescrições de exemplo"""
        try:
            sample_requests = [
                {
                    "id": "medreq-001",
                    "resourceType": "MedicationRequest",
                    "status": "active",
                    "intent": "order",
                    "medication": {
                        "reference": "Medication/med-001",
                        "display": "Amoxicillin 500mg"
                    },
                    "subject": {
                        "reference": "Patient/patient-001",
                        "display": "João Pedro Silva"
                    },
                    "encounter": {
                        "reference": "Encounter/enc-001"
                    },
                    "authoredOn": "2024-01-15T11:00:00Z",
                    "requester": {
                        "reference": "Practitioner/pract-001",
                        "display": "Dr. Carlos Santos"
                    },
                    "reasonCode": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "233604007",
                                    "display": "Pneumonia"
                                }
                            ],
                            "text": "Bacterial infection"
                        }
                    ],
                    "dosageInstruction": [
                        {
                            "sequence": 1,
                            "text": "Take one capsule twice daily for 7 days",
                            "timing": {
                                "repeat": {
                                    "frequency": 2,
                                    "period": 1,
                                    "periodUnit": "d",
                                    "duration": 7,
                                    "durationUnit": "d"
                                }
                            },
                            "route": {
                                "coding": [
                                    {
                                        "system": "http://snomed.info/sct",
                                        "code": "26643006",
                                        "display": "Oral route"
                                    }
                                ]
                            },
                            "doseAndRate": [
                                {
                                    "doseQuantity": {
                                        "value": 1,
                                        "unit": "capsule",
                                        "system": "http://unitsofmeasure.org",
                                        "code": "1"
                                    }
                                }
                            ]
                        }
                    ],
                    "dispenseRequest": {
                        "validityPeriod": {
                            "start": "2024-01-15",
                            "end": "2024-01-22"
                        },
                        "numberOfRepeatsAllowed": 0,
                        "quantity": {
                            "value": 14,
                            "unit": "capsule",
                            "system": "http://unitsofmeasure.org",
                            "code": "1"
                        },
                        "expectedSupplyDuration": {
                            "value": 7,
                            "unit": "days",
                            "system": "http://unitsofmeasure.org",
                            "code": "d"
                        }
                    }
                },
                {
                    "id": "medreq-002",
                    "resourceType": "MedicationRequest",
                    "status": "active",
                    "intent": "order",
                    "medication": {
                        "reference": "Medication/med-002",
                        "display": "Paracetamol 500mg"
                    },
                    "subject": {
                        "reference": "Patient/patient-002",
                        "display": "Maria Clara Santos"
                    },
                    "encounter": {
                        "reference": "Encounter/enc-002"
                    },
                    "authoredOn": "2024-01-16T15:00:00Z",
                    "requester": {
                        "reference": "Practitioner/pract-002",
                        "display": "Dr. Ana Lima"
                    },
                    "reasonCode": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "25064002",
                                    "display": "Headache"
                                }
                            ],
                            "text": "Severe headache"
                        }
                    ],
                    "dosageInstruction": [
                        {
                            "sequence": 1,
                            "text": "Take 1-2 tablets every 6 hours as needed for pain",
                            "asNeededBoolean": True,
                            "timing": {
                                "repeat": {
                                    "frequency": 1,
                                    "period": 6,
                                    "periodUnit": "h"
                                }
                            },
                            "route": {
                                "coding": [
                                    {
                                        "system": "http://snomed.info/sct",
                                        "code": "26643006",
                                        "display": "Oral route"
                                    }
                                ]
                            },
                            "doseAndRate": [
                                {
                                    "doseRange": {
                                        "low": {
                                            "value": 1,
                                            "unit": "tablet"
                                        },
                                        "high": {
                                            "value": 2,
                                            "unit": "tablet"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
            ]
            
            for request_data in sample_requests:
                request_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/MedicationRequest"]
                }
                self.medication_requests[request_data["id"]] = request_data
            
            logger.info(f"Created {len(sample_requests)} sample medication requests")
            
        except Exception as e:
            logger.error(f"Error creating sample medication requests: {e}")
            # Don't raise - sample data is optional