"""
FHIR Organization Resource
Implementação do recurso Organization conforme FHIR R4
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)

class Organization(BaseModel):
    """FHIR Organization resource"""
    resourceType: str = "Organization"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # Organization-specific elements
    identifier: Optional[List[Dict[str, Any]]] = None
    active: Optional[bool] = None
    type: Optional[List[Dict[str, Any]]] = None
    name: Optional[str] = None
    alias: Optional[List[str]] = None
    telecom: Optional[List[Dict[str, Any]]] = None
    address: Optional[List[Dict[str, Any]]] = None
    partOf: Optional[Dict[str, Any]] = None
    contact: Optional[List[Dict[str, Any]]] = None
    endpoint: Optional[List[Dict[str, Any]]] = None

class OrganizationManager:
    """Gerenciador de recursos Organization"""
    
    def __init__(self):
        self.organizations = {}  # In-memory storage
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa o gerenciador de organizações"""
        try:
            logger.info("Initializing Organization Manager...")
            
            # Criar algumas organizações de exemplo
            await self._create_sample_organizations()
            
            self.is_initialized = True
            logger.info("Organization Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Organization Manager: {e}")
            self.is_initialized = True
    
    async def create_organization(self, organization_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria uma nova organização"""
        try:
            # Generate ID if not provided
            if "id" not in organization_data:
                organization_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            organization_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Organization"]
            }
            
            # Validate organization data
            await self._validate_organization(organization_data)
            
            # Store organization
            self.organizations[organization_data["id"]] = organization_data
            
            logger.info(f"Organization created with ID: {organization_data['id']}")
            return organization_data
            
        except Exception as e:
            logger.error(f"Error creating organization: {e}")
            raise
    
    async def get_organization(self, organization_id: str) -> Optional[Dict[str, Any]]:
        """Busca uma organização por ID"""
        try:
            organization = self.organizations.get(organization_id)
            if organization:
                logger.info(f"Organization found: {organization_id}")
            else:
                logger.warning(f"Organization not found: {organization_id}")
            return organization
        except Exception as e:
            logger.error(f"Error getting organization {organization_id}: {e}")
            raise
    
    async def _validate_organization(self, organization_data: Dict[str, Any]):
        """Valida dados da organização"""
        try:
            # Basic validation
            if "resourceType" not in organization_data:
                organization_data["resourceType"] = "Organization"
            
            if organization_data["resourceType"] != "Organization":
                raise ValueError("Invalid resourceType for Organization")
            
        except Exception as e:
            logger.error(f"Organization validation error: {e}")
            raise
    
    async def _create_sample_organizations(self):
        """Cria organizações de exemplo"""
        try:
            sample_organizations = [
                {
                    "id": "nexus-hospital",
                    "resourceType": "Organization",
                    "active": True,
                    "identifier": [
                        {
                            "use": "official",
                            "system": "http://cnes.datasus.gov.br",
                            "value": "2345678"
                        }
                    ],
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/organization-type",
                                    "code": "prov",
                                    "display": "Healthcare Provider"
                                }
                            ]
                        }
                    ],
                    "name": "Nexus Hospital",
                    "alias": ["Hospital Nexus", "Nexus Saúde"],
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 2222-2222",
                            "use": "work"
                        },
                        {
                            "system": "email",
                            "value": "contato@nexushospital.com",
                            "use": "work"
                        },
                        {
                            "system": "url",
                            "value": "https://www.nexushospital.com",
                            "use": "work"
                        }
                    ],
                    "address": [
                        {
                            "use": "work",
                            "type": "physical",
                            "line": ["Av. Nexus, 1000"],
                            "city": "São Paulo",
                            "state": "SP",
                            "postalCode": "01234-567",
                            "country": "BR"
                        }
                    ]
                },
                {
                    "id": "pharma-001",
                    "resourceType": "Organization",
                    "active": True,
                    "identifier": [
                        {
                            "use": "official",
                            "system": "http://cnpj.receita.fazenda.gov.br",
                            "value": "12.345.678/0001-90"
                        }
                    ],
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/organization-type",
                                    "code": "corp",
                                    "display": "Corporation"
                                }
                            ]
                        }
                    ],
                    "name": "Generic Pharma",
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 5555-5555",
                            "use": "work"
                        },
                        {
                            "system": "email",
                            "value": "contato@genericpharma.com",
                            "use": "work"
                        }
                    ],
                    "address": [
                        {
                            "use": "work",
                            "type": "physical",
                            "line": ["Rua dos Medicamentos, 500"],
                            "city": "São Paulo",
                            "state": "SP",
                            "postalCode": "05678-901",
                            "country": "BR"
                        }
                    ]
                },
                {
                    "id": "lab-001",
                    "resourceType": "Organization",
                    "active": True,
                    "identifier": [
                        {
                            "use": "official",
                            "system": "http://cnpj.receita.fazenda.gov.br",
                            "value": "98.765.432/0001-10"
                        }
                    ],
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/organization-type",
                                    "code": "prov",
                                    "display": "Healthcare Provider"
                                }
                            ]
                        }
                    ],
                    "name": "Laboratório Nexus",
                    "alias": ["Lab Nexus"],
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 6666-6666",
                            "use": "work"
                        },
                        {
                            "system": "email",
                            "value": "lab@nexushospital.com",
                            "use": "work"
                        }
                    ],
                    "address": [
                        {
                            "use": "work",
                            "type": "physical",
                            "line": ["Av. Nexus, 1000", "Bloco B - Térreo"],
                            "city": "São Paulo",
                            "state": "SP",
                            "postalCode": "01234-567",
                            "country": "BR"
                        }
                    ],
                    "partOf": {
                        "reference": "Organization/nexus-hospital",
                        "display": "Nexus Hospital"
                    }
                }
            ]
            
            for organization_data in sample_organizations:
                organization_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/Organization"]
                }
                self.organizations[organization_data["id"]] = organization_data
            
            logger.info(f"Created {len(sample_organizations)} sample organizations")
            
        except Exception as e:
            logger.error(f"Error creating sample organizations: {e}")
            # Don't raise - sample data is optional