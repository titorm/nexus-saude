"""
FHIR Encounter Resource
Implementação do recurso Encounter conforme FHIR R4
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class Encounter(BaseModel):
    """FHIR Encounter resource"""
    resourceType: str = "Encounter"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # Encounter-specific elements
    identifier: Optional[List[Dict[str, Any]]] = None
    status: str  # planned | arrived | triaged | in-progress | onleave | finished | cancelled | entered-in-error | unknown
    statusHistory: Optional[List[Dict[str, Any]]] = None
    class_: Optional[Dict[str, Any]] = Field(None, alias="class")  # AMB | EMER | FLD | HH | IMP | ACUTE | NONAC | OBSENC | PRENC | SS | VR
    classHistory: Optional[List[Dict[str, Any]]] = None
    type: Optional[List[Dict[str, Any]]] = None
    serviceType: Optional[Dict[str, Any]] = None
    priority: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    episodeOfCare: Optional[List[Dict[str, Any]]] = None
    basedOn: Optional[List[Dict[str, Any]]] = None
    participant: Optional[List[Dict[str, Any]]] = None
    appointment: Optional[List[Dict[str, Any]]] = None
    period: Optional[Dict[str, Any]] = None
    length: Optional[Dict[str, Any]] = None
    reasonCode: Optional[List[Dict[str, Any]]] = None
    reasonReference: Optional[List[Dict[str, Any]]] = None
    diagnosis: Optional[List[Dict[str, Any]]] = None
    account: Optional[List[Dict[str, Any]]] = None
    hospitalization: Optional[Dict[str, Any]] = None
    location: Optional[List[Dict[str, Any]]] = None
    serviceProvider: Optional[Dict[str, Any]] = None
    partOf: Optional[Dict[str, Any]] = None

class EncounterManager:
    """Gerenciador de recursos Encounter"""
    
    def __init__(self):
        self.encounters = {}  # In-memory storage
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa o gerenciador de encontros"""
        try:
            logger.info("Initializing Encounter Manager...")
            
            # Criar alguns encontros de exemplo
            await self._create_sample_encounters()
            
            self.is_initialized = True
            logger.info("Encounter Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Encounter Manager: {e}")
            self.is_initialized = True
    
    async def create_encounter(self, encounter_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo encontro"""
        try:
            # Generate ID if not provided
            if "id" not in encounter_data:
                encounter_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            encounter_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Encounter"]
            }
            
            # Validate encounter data
            await self._validate_encounter(encounter_data)
            
            # Store encounter
            self.encounters[encounter_data["id"]] = encounter_data
            
            logger.info(f"Encounter created with ID: {encounter_data['id']}")
            return encounter_data
            
        except Exception as e:
            logger.error(f"Error creating encounter: {e}")
            raise
    
    async def get_encounter(self, encounter_id: str) -> Optional[Dict[str, Any]]:
        """Busca um encontro por ID"""
        try:
            encounter = self.encounters.get(encounter_id)
            if encounter:
                logger.info(f"Encounter found: {encounter_id}")
            else:
                logger.warning(f"Encounter not found: {encounter_id}")
            return encounter
        except Exception as e:
            logger.error(f"Error getting encounter {encounter_id}: {e}")
            raise
    
    async def update_encounter(self, encounter_id: str, encounter_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Atualiza um encontro"""
        try:
            if encounter_id not in self.encounters:
                return None
            
            # Preserve ID
            encounter_data["id"] = encounter_id
            
            # Update metadata
            old_version = int(self.encounters[encounter_id].get("meta", {}).get("versionId", "1"))
            encounter_data["meta"] = {
                "versionId": str(old_version + 1),
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Encounter"]
            }
            
            # Validate encounter data
            await self._validate_encounter(encounter_data)
            
            # Update encounter
            self.encounters[encounter_id] = encounter_data
            
            logger.info(f"Encounter updated: {encounter_id}")
            return encounter_data
            
        except Exception as e:
            logger.error(f"Error updating encounter {encounter_id}: {e}")
            raise
    
    async def delete_encounter(self, encounter_id: str) -> bool:
        """Deleta um encontro"""
        try:
            if encounter_id in self.encounters:
                del self.encounters[encounter_id]
                logger.info(f"Encounter deleted: {encounter_id}")
                return True
            else:
                logger.warning(f"Encounter not found for deletion: {encounter_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting encounter {encounter_id}: {e}")
            raise
    
    async def search_encounters(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """Busca encontros baseado em parâmetros"""
        try:
            matching_encounters = []
            
            for encounter in self.encounters.values():
                if await self._matches_search_criteria(encounter, search_params):
                    matching_encounters.append({
                        "fullUrl": f"Encounter/{encounter['id']}",
                        "resource": encounter
                    })
            
            # Apply pagination
            count = search_params.get("_count", 50)
            offset = search_params.get("_offset", 0)
            
            total = len(matching_encounters)
            paginated_encounters = matching_encounters[offset:offset + count]
            
            logger.info(f"Encounter search returned {len(paginated_encounters)} of {total} results")
            
            return {
                "total": total,
                "entries": paginated_encounters
            }
            
        except Exception as e:
            logger.error(f"Error searching encounters: {e}")
            raise
    
    async def _validate_encounter(self, encounter_data: Dict[str, Any]):
        """Valida dados do encontro"""
        try:
            # Basic validation
            if "resourceType" not in encounter_data:
                encounter_data["resourceType"] = "Encounter"
            
            if encounter_data["resourceType"] != "Encounter":
                raise ValueError("Invalid resourceType for Encounter")
            
            # Validate required fields
            if "status" not in encounter_data:
                raise ValueError("Encounter must have a status")
            
            valid_statuses = ["planned", "arrived", "triaged", "in-progress", "onleave", "finished", "cancelled", "entered-in-error", "unknown"]
            if encounter_data["status"] not in valid_statuses:
                raise ValueError(f"Invalid status value: {encounter_data['status']}")
            
            # Validate class if present
            if "class" in encounter_data:
                encounter_class = encounter_data["class"]
                if isinstance(encounter_class, dict) and "code" in encounter_class:
                    valid_classes = ["AMB", "EMER", "FLD", "HH", "IMP", "ACUTE", "NONAC", "OBSENC", "PRENC", "SS", "VR"]
                    if encounter_class["code"] not in valid_classes:
                        raise ValueError(f"Invalid class code: {encounter_class['code']}")
            
        except Exception as e:
            logger.error(f"Encounter validation error: {e}")
            raise
    
    async def _matches_search_criteria(self, encounter: Dict[str, Any], search_params: Dict[str, Any]) -> bool:
        """Verifica se encontro atende aos critérios de busca"""
        try:
            # Search by subject/patient
            if "subject" in search_params or "patient" in search_params:
                subject_ref = search_params.get("subject") or search_params.get("patient")
                encounter_subject = encounter.get("subject", {})
                
                if encounter_subject.get("reference") == subject_ref:
                    return True
                
                # Also check if it's just the ID part
                if encounter_subject.get("reference", "").endswith(f"/{subject_ref}"):
                    return True
            
            # Search by status
            if "status" in search_params:
                if encounter.get("status") == search_params["status"]:
                    return True
            
            # Search by class
            if "class" in search_params:
                encounter_class = encounter.get("class", {})
                if encounter_class.get("code") == search_params["class"]:
                    return True
            
            # Search by date
            if "date" in search_params:
                date_search = search_params["date"]
                period = encounter.get("period", {})
                
                start_date = period.get("start", "")
                end_date = period.get("end", "")
                
                if start_date.startswith(date_search) or end_date.startswith(date_search):
                    return True
            
            # If no specific search parameters, return all
            search_keys = set(search_params.keys()) - {"_count", "_offset"}
            if not search_keys:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error in encounter search criteria matching: {e}")
            return False
    
    async def _create_sample_encounters(self):
        """Cria encontros de exemplo"""
        try:
            sample_encounters = [
                {
                    "id": "enc-001",
                    "resourceType": "Encounter",
                    "status": "finished",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "AMB",
                        "display": "ambulatory"
                    },
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "11429006",
                                    "display": "Consultation"
                                }
                            ],
                            "text": "Routine consultation"
                        }
                    ],
                    "subject": {
                        "reference": "Patient/patient-001",
                        "display": "João Pedro Silva"
                    },
                    "participant": [
                        {
                            "type": [
                                {
                                    "coding": [
                                        {
                                            "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                            "code": "ATND",
                                            "display": "attender"
                                        }
                                    ]
                                }
                            ],
                            "individual": {
                                "reference": "Practitioner/pract-001",
                                "display": "Dr. Carlos Santos"
                            }
                        }
                    ],
                    "period": {
                        "start": "2024-01-15T10:00:00Z",
                        "end": "2024-01-15T11:00:00Z"
                    },
                    "reasonCode": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "162864005",
                                    "display": "Body weight"
                                }
                            ],
                            "text": "Annual checkup"
                        }
                    ],
                    "location": [
                        {
                            "location": {
                                "reference": "Location/room-101",
                                "display": "Consultation Room 101"
                            },
                            "status": "active",
                            "period": {
                                "start": "2024-01-15T10:00:00Z",
                                "end": "2024-01-15T11:00:00Z"
                            }
                        }
                    ],
                    "serviceProvider": {
                        "reference": "Organization/nexus-hospital",
                        "display": "Nexus Hospital"
                    }
                },
                {
                    "id": "enc-002",
                    "resourceType": "Encounter",
                    "status": "in-progress",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "EMER",
                        "display": "emergency"
                    },
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "50849002",
                                    "display": "Emergency room visit"
                                }
                            ],
                            "text": "Emergency consultation"
                        }
                    ],
                    "priority": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
                                "code": "UR",
                                "display": "urgent"
                            }
                        ]
                    },
                    "subject": {
                        "reference": "Patient/patient-002",
                        "display": "Maria Clara Santos"
                    },
                    "participant": [
                        {
                            "type": [
                                {
                                    "coding": [
                                        {
                                            "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                            "code": "ATND",
                                            "display": "attender"
                                        }
                                    ]
                                }
                            ],
                            "individual": {
                                "reference": "Practitioner/pract-002",
                                "display": "Dr. Ana Lima"
                            }
                        }
                    ],
                    "period": {
                        "start": "2024-01-16T14:30:00Z"
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
                    "location": [
                        {
                            "location": {
                                "reference": "Location/er-bed-05",
                                "display": "Emergency Room Bed 5"
                            },
                            "status": "active",
                            "period": {
                                "start": "2024-01-16T14:30:00Z"
                            }
                        }
                    ],
                    "serviceProvider": {
                        "reference": "Organization/nexus-hospital",
                        "display": "Nexus Hospital"
                    }
                },
                {
                    "id": "enc-003",
                    "resourceType": "Encounter",
                    "status": "planned",
                    "class": {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "AMB",
                        "display": "ambulatory"
                    },
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://snomed.info/sct",
                                    "code": "390906007",
                                    "display": "Follow-up encounter"
                                }
                            ],
                            "text": "Follow-up consultation"
                        }
                    ],
                    "subject": {
                        "reference": "Patient/patient-001",
                        "display": "João Pedro Silva"
                    },
                    "participant": [
                        {
                            "type": [
                                {
                                    "coding": [
                                        {
                                            "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                            "code": "ATND",
                                            "display": "attender"
                                        }
                                    ]
                                }
                            ],
                            "individual": {
                                "reference": "Practitioner/pract-001",
                                "display": "Dr. Carlos Santos"
                            }
                        }
                    ],
                    "period": {
                        "start": "2024-01-30T15:00:00Z",
                        "end": "2024-01-30T15:30:00Z"
                    },
                    "reasonCode": [
                        {
                            "text": "Follow-up from previous consultation"
                        }
                    ],
                    "location": [
                        {
                            "location": {
                                "reference": "Location/room-101",
                                "display": "Consultation Room 101"
                            },
                            "status": "planned"
                        }
                    ],
                    "serviceProvider": {
                        "reference": "Organization/nexus-hospital",
                        "display": "Nexus Hospital"
                    }
                }
            ]
            
            for encounter_data in sample_encounters:
                encounter_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/Encounter"]
                }
                self.encounters[encounter_data["id"]] = encounter_data
            
            logger.info(f"Created {len(sample_encounters)} sample encounters")
            
        except Exception as e:
            logger.error(f"Error creating sample encounters: {e}")
            # Don't raise - sample data is optional