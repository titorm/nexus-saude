"""
FHIR Practitioner Resource
Implementação do recurso Practitioner conforme FHIR R4
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class Practitioner(BaseModel):
    """FHIR Practitioner resource"""
    resourceType: str = "Practitioner"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # Practitioner-specific elements
    identifier: Optional[List[Dict[str, Any]]] = None
    active: Optional[bool] = None
    name: Optional[List[Dict[str, Any]]] = None
    telecom: Optional[List[Dict[str, Any]]] = None
    address: Optional[List[Dict[str, Any]]] = None
    gender: Optional[str] = None  # male | female | other | unknown
    birthDate: Optional[str] = None
    photo: Optional[List[Dict[str, Any]]] = None
    qualification: Optional[List[Dict[str, Any]]] = None
    communication: Optional[List[Dict[str, Any]]] = None

class PractitionerManager:
    """Gerenciador de recursos Practitioner"""
    
    def __init__(self):
        self.practitioners = {}  # In-memory storage
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa o gerenciador de profissionais"""
        try:
            logger.info("Initializing Practitioner Manager...")
            
            # Criar alguns profissionais de exemplo
            await self._create_sample_practitioners()
            
            self.is_initialized = True
            logger.info("Practitioner Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Practitioner Manager: {e}")
            self.is_initialized = True
    
    async def create_practitioner(self, practitioner_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo profissional"""
        try:
            # Generate ID if not provided
            if "id" not in practitioner_data:
                practitioner_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            practitioner_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Practitioner"]
            }
            
            # Validate practitioner data
            await self._validate_practitioner(practitioner_data)
            
            # Store practitioner
            self.practitioners[practitioner_data["id"]] = practitioner_data
            
            logger.info(f"Practitioner created with ID: {practitioner_data['id']}")
            return practitioner_data
            
        except Exception as e:
            logger.error(f"Error creating practitioner: {e}")
            raise
    
    async def get_practitioner(self, practitioner_id: str) -> Optional[Dict[str, Any]]:
        """Busca um profissional por ID"""
        try:
            practitioner = self.practitioners.get(practitioner_id)
            if practitioner:
                logger.info(f"Practitioner found: {practitioner_id}")
            else:
                logger.warning(f"Practitioner not found: {practitioner_id}")
            return practitioner
        except Exception as e:
            logger.error(f"Error getting practitioner {practitioner_id}: {e}")
            raise
    
    async def _validate_practitioner(self, practitioner_data: Dict[str, Any]):
        """Valida dados do profissional"""
        try:
            # Basic validation
            if "resourceType" not in practitioner_data:
                practitioner_data["resourceType"] = "Practitioner"
            
            if practitioner_data["resourceType"] != "Practitioner":
                raise ValueError("Invalid resourceType for Practitioner")
            
            # Validate gender if present
            if "gender" in practitioner_data:
                valid_genders = ["male", "female", "other", "unknown"]
                if practitioner_data["gender"] not in valid_genders:
                    raise ValueError(f"Invalid gender value: {practitioner_data['gender']}")
            
        except Exception as e:
            logger.error(f"Practitioner validation error: {e}")
            raise
    
    async def _create_sample_practitioners(self):
        """Cria profissionais de exemplo"""
        try:
            sample_practitioners = [
                {
                    "id": "pract-001",
                    "resourceType": "Practitioner",
                    "active": True,
                    "identifier": [
                        {
                            "use": "official",
                            "type": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                        "code": "PRN",
                                        "display": "Provider number"
                                    }
                                ]
                            },
                            "system": "http://crm.sp.gov.br",
                            "value": "CRM123456"
                        }
                    ],
                    "name": [
                        {
                            "use": "official",
                            "family": "Santos",
                            "given": ["Carlos", "Eduardo"],
                            "prefix": ["Dr."],
                            "text": "Dr. Carlos Eduardo Santos"
                        }
                    ],
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 3333-3333",
                            "use": "work"
                        },
                        {
                            "system": "email",
                            "value": "carlos.santos@nexushospital.com",
                            "use": "work"
                        }
                    ],
                    "gender": "male",
                    "qualification": [
                        {
                            "identifier": [
                                {
                                    "value": "CRM123456"
                                }
                            ],
                            "code": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
                                        "code": "MD",
                                        "display": "Doctor of Medicine"
                                    }
                                ],
                                "text": "Médico"
                            },
                            "period": {
                                "start": "2005-06-15"
                            },
                            "issuer": {
                                "display": "Conselho Regional de Medicina de São Paulo"
                            }
                        }
                    ]
                },
                {
                    "id": "pract-002",
                    "resourceType": "Practitioner",
                    "active": True,
                    "identifier": [
                        {
                            "use": "official",
                            "type": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                        "code": "PRN",
                                        "display": "Provider number"
                                    }
                                ]
                            },
                            "system": "http://crm.sp.gov.br",
                            "value": "CRM789012"
                        }
                    ],
                    "name": [
                        {
                            "use": "official",
                            "family": "Lima",
                            "given": ["Ana", "Paula"],
                            "prefix": ["Dra."],
                            "text": "Dra. Ana Paula Lima"
                        }
                    ],
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 4444-4444",
                            "use": "work"
                        },
                        {
                            "system": "email",
                            "value": "ana.lima@nexushospital.com",
                            "use": "work"
                        }
                    ],
                    "gender": "female",
                    "qualification": [
                        {
                            "identifier": [
                                {
                                    "value": "CRM789012"
                                }
                            ],
                            "code": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/v2-0360",
                                        "code": "MD",
                                        "display": "Doctor of Medicine"
                                    }
                                ],
                                "text": "Médica Emergencista"
                            },
                            "period": {
                                "start": "2010-03-20"
                            },
                            "issuer": {
                                "display": "Conselho Regional de Medicina de São Paulo"
                            }
                        }
                    ]
                }
            ]
            
            for practitioner_data in sample_practitioners:
                practitioner_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/Practitioner"]
                }
                self.practitioners[practitioner_data["id"]] = practitioner_data
            
            logger.info(f"Created {len(sample_practitioners)} sample practitioners")
            
        except Exception as e:
            logger.error(f"Error creating sample practitioners: {e}")
            # Don't raise - sample data is optional