"""
FHIR Patient Resource
Implementação do recurso Patient conforme FHIR R4
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field, ValidationError
import logging

logger = logging.getLogger(__name__)

class PatientIdentifier(BaseModel):
    """Patient identifier"""
    use: Optional[str] = None
    type: Optional[Dict[str, Any]] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period: Optional[Dict[str, Any]] = None
    assigner: Optional[Dict[str, Any]] = None

class HumanName(BaseModel):
    """Human name structure"""
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period: Optional[Dict[str, Any]] = None

class ContactPoint(BaseModel):
    """Contact point (phone, email, etc.)"""
    system: Optional[str] = None  # phone | fax | email | pager | url | sms | other
    value: Optional[str] = None
    use: Optional[str] = None  # home | work | temp | old | mobile
    rank: Optional[int] = None
    period: Optional[Dict[str, Any]] = None

class Address(BaseModel):
    """Address structure"""
    use: Optional[str] = None  # home | work | temp | old | billing
    type: Optional[str] = None  # postal | physical | both
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    period: Optional[Dict[str, Any]] = None

class Patient(BaseModel):
    """FHIR Patient resource"""
    resourceType: str = "Patient"
    id: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    implicitRules: Optional[str] = None
    language: Optional[str] = None
    text: Optional[Dict[str, Any]] = None
    contained: Optional[List[Dict[str, Any]]] = None
    extension: Optional[List[Dict[str, Any]]] = None
    modifierExtension: Optional[List[Dict[str, Any]]] = None
    
    # Patient-specific elements
    identifier: Optional[List[PatientIdentifier]] = None
    active: Optional[bool] = None
    name: Optional[List[HumanName]] = None
    telecom: Optional[List[ContactPoint]] = None
    gender: Optional[str] = None  # male | female | other | unknown
    birthDate: Optional[str] = None
    deceased: Optional[bool] = None
    deceasedDateTime: Optional[str] = None
    address: Optional[List[Address]] = None
    maritalStatus: Optional[Dict[str, Any]] = None
    multipleBirth: Optional[bool] = None
    multipleBirthInteger: Optional[int] = None
    photo: Optional[List[Dict[str, Any]]] = None
    contact: Optional[List[Dict[str, Any]]] = None
    communication: Optional[List[Dict[str, Any]]] = None
    generalPractitioner: Optional[List[Dict[str, Any]]] = None
    managingOrganization: Optional[Dict[str, Any]] = None
    link: Optional[List[Dict[str, Any]]] = None

class PatientManager:
    """Gerenciador de recursos Patient"""
    
    def __init__(self):
        self.patients = {}  # In-memory storage (in production, use database)
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa o gerenciador de pacientes"""
        try:
            logger.info("Initializing Patient Manager...")
            
            # Criar alguns pacientes de exemplo
            await self._create_sample_patients()
            
            self.is_initialized = True
            logger.info("Patient Manager initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Patient Manager: {e}")
            self.is_initialized = True  # Continue even with errors
    
    async def create_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo paciente"""
        try:
            # Generate ID if not provided
            if "id" not in patient_data:
                patient_data["id"] = str(uuid.uuid4())
            
            # Add metadata
            patient_data["meta"] = {
                "versionId": "1",
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"]
            }
            
            # Validate patient data (basic validation)
            await self._validate_patient(patient_data)
            
            # Store patient
            self.patients[patient_data["id"]] = patient_data
            
            logger.info(f"Patient created with ID: {patient_data['id']}")
            return patient_data
            
        except Exception as e:
            logger.error(f"Error creating patient: {e}")
            raise
    
    async def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Busca um paciente por ID"""
        try:
            patient = self.patients.get(patient_id)
            if patient:
                logger.info(f"Patient found: {patient_id}")
            else:
                logger.warning(f"Patient not found: {patient_id}")
            return patient
        except Exception as e:
            logger.error(f"Error getting patient {patient_id}: {e}")
            raise
    
    async def update_patient(self, patient_id: str, patient_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Atualiza um paciente"""
        try:
            if patient_id not in self.patients:
                return None
            
            # Preserve ID
            patient_data["id"] = patient_id
            
            # Update metadata
            old_version = int(self.patients[patient_id].get("meta", {}).get("versionId", "1"))
            patient_data["meta"] = {
                "versionId": str(old_version + 1),
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
                "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"]
            }
            
            # Validate patient data
            await self._validate_patient(patient_data)
            
            # Update patient
            self.patients[patient_id] = patient_data
            
            logger.info(f"Patient updated: {patient_id}")
            return patient_data
            
        except Exception as e:
            logger.error(f"Error updating patient {patient_id}: {e}")
            raise
    
    async def delete_patient(self, patient_id: str) -> bool:
        """Deleta um paciente"""
        try:
            if patient_id in self.patients:
                del self.patients[patient_id]
                logger.info(f"Patient deleted: {patient_id}")
                return True
            else:
                logger.warning(f"Patient not found for deletion: {patient_id}")
                return False
        except Exception as e:
            logger.error(f"Error deleting patient {patient_id}: {e}")
            raise
    
    async def search_patients(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """Busca pacientes baseado em parâmetros"""
        try:
            matching_patients = []
            
            for patient in self.patients.values():
                if await self._matches_search_criteria(patient, search_params):
                    matching_patients.append({
                        "fullUrl": f"Patient/{patient['id']}",
                        "resource": patient
                    })
            
            # Apply pagination
            count = search_params.get("_count", 50)
            offset = search_params.get("_offset", 0)
            
            total = len(matching_patients)
            paginated_patients = matching_patients[offset:offset + count]
            
            logger.info(f"Patient search returned {len(paginated_patients)} of {total} results")
            
            return {
                "total": total,
                "entries": paginated_patients
            }
            
        except Exception as e:
            logger.error(f"Error searching patients: {e}")
            raise
    
    async def _validate_patient(self, patient_data: Dict[str, Any]):
        """Valida dados do paciente"""
        try:
            # Basic validation
            if "resourceType" not in patient_data:
                patient_data["resourceType"] = "Patient"
            
            if patient_data["resourceType"] != "Patient":
                raise ValueError("Invalid resourceType for Patient")
            
            # Validate gender if present
            if "gender" in patient_data:
                valid_genders = ["male", "female", "other", "unknown"]
                if patient_data["gender"] not in valid_genders:
                    raise ValueError(f"Invalid gender value: {patient_data['gender']}")
            
            # Validate birthDate format if present
            if "birthDate" in patient_data:
                # Basic date format validation (YYYY-MM-DD)
                birth_date = patient_data["birthDate"]
                if birth_date and len(birth_date) >= 4:
                    # Allow partial dates (year only, year-month, full date)
                    pass
                else:
                    raise ValueError(f"Invalid birthDate format: {birth_date}")
            
        except Exception as e:
            logger.error(f"Patient validation error: {e}")
            raise
    
    async def _matches_search_criteria(self, patient: Dict[str, Any], search_params: Dict[str, Any]) -> bool:
        """Verifica se paciente atende aos critérios de busca"""
        try:
            # Search by identifier
            if "identifier" in search_params:
                identifier_value = search_params["identifier"]
                patient_identifiers = patient.get("identifier", [])
                
                for identifier in patient_identifiers:
                    if identifier.get("value") == identifier_value:
                        return True
            
            # Search by name
            if "name" in search_params:
                name_search = search_params["name"].lower()
                patient_names = patient.get("name", [])
                
                for name in patient_names:
                    # Search in family name
                    if name.get("family", "").lower().find(name_search) >= 0:
                        return True
                    
                    # Search in given names
                    given_names = name.get("given", [])
                    for given in given_names:
                        if given.lower().find(name_search) >= 0:
                            return True
                    
                    # Search in text
                    if name.get("text", "").lower().find(name_search) >= 0:
                        return True
            
            # Search by birthdate
            if "birthdate" in search_params:
                if patient.get("birthDate") == search_params["birthdate"]:
                    return True
            
            # Search by gender
            if "gender" in search_params:
                if patient.get("gender") == search_params["gender"]:
                    return True
            
            # If no specific search parameters, return all (except pagination params)
            search_keys = set(search_params.keys()) - {"_count", "_offset"}
            if not search_keys:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error in search criteria matching: {e}")
            return False
    
    async def _create_sample_patients(self):
        """Cria pacientes de exemplo"""
        try:
            sample_patients = [
                {
                    "id": "patient-001",
                    "resourceType": "Patient",
                    "active": True,
                    "identifier": [
                        {
                            "use": "usual",
                            "type": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                        "code": "MR",
                                        "display": "Medical Record Number"
                                    }
                                ]
                            },
                            "system": "http://hospital.nexus.com/patient-id",
                            "value": "MRN123456"
                        }
                    ],
                    "name": [
                        {
                            "use": "official",
                            "family": "Silva",
                            "given": ["João", "Pedro"],
                            "text": "João Pedro Silva"
                        }
                    ],
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 99999-9999",
                            "use": "mobile"
                        },
                        {
                            "system": "email",
                            "value": "joao.silva@email.com",
                            "use": "home"
                        }
                    ],
                    "gender": "male",
                    "birthDate": "1985-03-15",
                    "address": [
                        {
                            "use": "home",
                            "type": "physical",
                            "line": ["Rua das Flores, 123"],
                            "city": "São Paulo",
                            "state": "SP",
                            "postalCode": "01234-567",
                            "country": "BR"
                        }
                    ],
                    "maritalStatus": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                                "code": "M",
                                "display": "Married"
                            }
                        ]
                    }
                },
                {
                    "id": "patient-002",
                    "resourceType": "Patient",
                    "active": True,
                    "identifier": [
                        {
                            "use": "usual",
                            "type": {
                                "coding": [
                                    {
                                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                        "code": "MR",
                                        "display": "Medical Record Number"
                                    }
                                ]
                            },
                            "system": "http://hospital.nexus.com/patient-id",
                            "value": "MRN789012"
                        }
                    ],
                    "name": [
                        {
                            "use": "official",
                            "family": "Santos",
                            "given": ["Maria", "Clara"],
                            "text": "Maria Clara Santos"
                        }
                    ],
                    "telecom": [
                        {
                            "system": "phone",
                            "value": "+55 11 88888-8888",
                            "use": "mobile"
                        }
                    ],
                    "gender": "female",
                    "birthDate": "1992-08-22",
                    "address": [
                        {
                            "use": "home",
                            "type": "physical",
                            "line": ["Av. Paulista, 1000"],
                            "city": "São Paulo",
                            "state": "SP",
                            "postalCode": "01310-100",
                            "country": "BR"
                        }
                    ]
                }
            ]
            
            for patient_data in sample_patients:
                patient_data["meta"] = {
                    "versionId": "1",
                    "lastUpdated": datetime.now(timezone.utc).isoformat(),
                    "profile": ["http://hl7.org/fhir/StructureDefinition/Patient"]
                }
                self.patients[patient_data["id"]] = patient_data
            
            logger.info(f"Created {len(sample_patients)} sample patients")
            
        except Exception as e:
            logger.error(f"Error creating sample patients: {e}")
            # Don't raise - sample data is optional