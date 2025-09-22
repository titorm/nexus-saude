"""
FHIR Validator
Validador para recursos FHIR R4
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)

class FHIRValidator:
    """Validador de recursos FHIR"""
    
    def __init__(self):
        self.is_initialized = False
        self.resource_schemas = {}
        self.validation_rules = {}
    
    async def initialize(self):
        """Inicializa o validador FHIR"""
        try:
            logger.info("Initializing FHIR Validator...")
            
            # Carregar esquemas de validação
            await self._load_validation_schemas()
            await self._load_validation_rules()
            
            self.is_initialized = True
            logger.info("FHIR Validator initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize FHIR Validator: {e}")
            self.is_initialized = True  # Continue even with errors
    
    async def validate_resource(self, resource_type: str, resource_data: Dict[str, Any]) -> bool:
        """Valida um recurso FHIR"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Validações básicas
            await self._validate_basic_structure(resource_type, resource_data)
            
            # Validações específicas por tipo de recurso
            if resource_type == "Patient":
                await self._validate_patient(resource_data)
            elif resource_type == "Observation":
                await self._validate_observation(resource_data)
            elif resource_type == "Encounter":
                await self._validate_encounter(resource_data)
            elif resource_type == "Medication":
                await self._validate_medication(resource_data)
            elif resource_type == "MedicationRequest":
                await self._validate_medication_request(resource_data)
            elif resource_type == "Practitioner":
                await self._validate_practitioner(resource_data)
            elif resource_type == "Organization":
                await self._validate_organization(resource_data)
            else:
                logger.warning(f"No specific validation for resource type: {resource_type}")
            
            logger.info(f"Resource {resource_type} validation successful")
            return True
            
        except Exception as e:
            logger.error(f"Validation error for {resource_type}: {e}")
            raise ValueError(f"FHIR validation failed: {e}")
    
    async def _validate_basic_structure(self, resource_type: str, resource_data: Dict[str, Any]):
        """Valida estrutura básica de um recurso FHIR"""
        
        # Verificar se é um dicionário
        if not isinstance(resource_data, dict):
            raise ValueError("Resource must be a JSON object")
        
        # Verificar resourceType
        if "resourceType" not in resource_data:
            raise ValueError("Resource must have a resourceType")
        
        if resource_data["resourceType"] != resource_type:
            raise ValueError(f"Resource type mismatch: expected {resource_type}, got {resource_data['resourceType']}")
        
        # Validar meta se presente
        if "meta" in resource_data:
            await self._validate_meta(resource_data["meta"])
        
        # Validar identificadores se presentes
        if "identifier" in resource_data:
            await self._validate_identifiers(resource_data["identifier"])
        
        # Validar extensões se presentes
        if "extension" in resource_data:
            await self._validate_extensions(resource_data["extension"])
    
    async def _validate_meta(self, meta: Dict[str, Any]):
        """Valida elemento meta"""
        if not isinstance(meta, dict):
            raise ValueError("Meta must be an object")
        
        # Validar versionId
        if "versionId" in meta:
            if not isinstance(meta["versionId"], str):
                raise ValueError("Meta.versionId must be a string")
        
        # Validar lastUpdated
        if "lastUpdated" in meta:
            if not isinstance(meta["lastUpdated"], str):
                raise ValueError("Meta.lastUpdated must be a string")
            
            # Validar formato ISO datetime
            try:
                datetime.fromisoformat(meta["lastUpdated"].replace('Z', '+00:00'))
            except ValueError:
                raise ValueError("Meta.lastUpdated must be a valid ISO datetime")
        
        # Validar profile
        if "profile" in meta:
            if not isinstance(meta["profile"], list):
                raise ValueError("Meta.profile must be an array")
            
            for profile in meta["profile"]:
                if not isinstance(profile, str):
                    raise ValueError("Meta.profile items must be strings")
    
    async def _validate_identifiers(self, identifiers: List[Dict[str, Any]]):
        """Valida lista de identificadores"""
        if not isinstance(identifiers, list):
            raise ValueError("Identifier must be an array")
        
        for identifier in identifiers:
            if not isinstance(identifier, dict):
                raise ValueError("Identifier items must be objects")
            
            # Validar use
            if "use" in identifier:
                valid_uses = ["usual", "official", "temp", "secondary", "old"]
                if identifier["use"] not in valid_uses:
                    raise ValueError(f"Invalid identifier use: {identifier['use']}")
            
            # Validar system e value
            if "system" in identifier and not isinstance(identifier["system"], str):
                raise ValueError("Identifier.system must be a string")
            
            if "value" in identifier and not isinstance(identifier["value"], str):
                raise ValueError("Identifier.value must be a string")
    
    async def _validate_extensions(self, extensions: List[Dict[str, Any]]):
        """Valida extensões"""
        if not isinstance(extensions, list):
            raise ValueError("Extension must be an array")
        
        for extension in extensions:
            if not isinstance(extension, dict):
                raise ValueError("Extension items must be objects")
            
            if "url" not in extension:
                raise ValueError("Extension must have a url")
            
            if not isinstance(extension["url"], str):
                raise ValueError("Extension.url must be a string")
    
    async def _validate_patient(self, patient_data: Dict[str, Any]):
        """Valida recurso Patient"""
        
        # Validar gender
        if "gender" in patient_data:
            valid_genders = ["male", "female", "other", "unknown"]
            if patient_data["gender"] not in valid_genders:
                raise ValueError(f"Invalid gender: {patient_data['gender']}")
        
        # Validar birthDate
        if "birthDate" in patient_data:
            birth_date = patient_data["birthDate"]
            if birth_date:
                # Aceitar formatos: YYYY, YYYY-MM, YYYY-MM-DD
                if not re.match(r'^\d{4}(-\d{2}(-\d{2})?)?$', birth_date):
                    raise ValueError(f"Invalid birthDate format: {birth_date}")
        
        # Validar name
        if "name" in patient_data:
            await self._validate_human_names(patient_data["name"])
        
        # Validar telecom
        if "telecom" in patient_data:
            await self._validate_contact_points(patient_data["telecom"])
        
        # Validar address
        if "address" in patient_data:
            await self._validate_addresses(patient_data["address"])
    
    async def _validate_observation(self, observation_data: Dict[str, Any]):
        """Valida recurso Observation"""
        
        # Validar status (obrigatório)
        if "status" not in observation_data:
            raise ValueError("Observation must have a status")
        
        valid_statuses = ["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"]
        if observation_data["status"] not in valid_statuses:
            raise ValueError(f"Invalid observation status: {observation_data['status']}")
        
        # Validar code (obrigatório)
        if "code" not in observation_data:
            raise ValueError("Observation must have a code")
        
        await self._validate_codeable_concept(observation_data["code"])
        
        # Validar category
        if "category" in observation_data:
            if not isinstance(observation_data["category"], list):
                raise ValueError("Observation.category must be an array")
            
            for category in observation_data["category"]:
                await self._validate_codeable_concept(category)
        
        # Validar subject
        if "subject" in observation_data:
            await self._validate_reference(observation_data["subject"])
        
        # Validar effective[x]
        if "effectiveDateTime" in observation_data:
            await self._validate_datetime(observation_data["effectiveDateTime"])
        elif "effectivePeriod" in observation_data:
            await self._validate_period(observation_data["effectivePeriod"])
    
    async def _validate_encounter(self, encounter_data: Dict[str, Any]):
        """Valida recurso Encounter"""
        
        # Validar status (obrigatório)
        if "status" not in encounter_data:
            raise ValueError("Encounter must have a status")
        
        valid_statuses = ["planned", "arrived", "triaged", "in-progress", "onleave", "finished", "cancelled", "entered-in-error", "unknown"]
        if encounter_data["status"] not in valid_statuses:
            raise ValueError(f"Invalid encounter status: {encounter_data['status']}")
        
        # Validar class
        if "class" in encounter_data:
            await self._validate_coding(encounter_data["class"])
    
    async def _validate_medication(self, medication_data: Dict[str, Any]):
        """Valida recurso Medication"""
        
        # Validar status
        if "status" in medication_data:
            valid_statuses = ["active", "inactive", "entered-in-error"]
            if medication_data["status"] not in valid_statuses:
                raise ValueError(f"Invalid medication status: {medication_data['status']}")
        
        # Validar code
        if "code" in medication_data:
            await self._validate_codeable_concept(medication_data["code"])
    
    async def _validate_medication_request(self, request_data: Dict[str, Any]):
        """Valida recurso MedicationRequest"""
        
        # Validar status (obrigatório)
        if "status" not in request_data:
            raise ValueError("MedicationRequest must have a status")
        
        valid_statuses = ["active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft", "unknown"]
        if request_data["status"] not in valid_statuses:
            raise ValueError(f"Invalid medication request status: {request_data['status']}")
        
        # Validar intent (obrigatório)
        if "intent" not in request_data:
            raise ValueError("MedicationRequest must have an intent")
        
        valid_intents = ["proposal", "plan", "order", "original-order", "reflex-order", "filler-order", "instance-order", "option"]
        if request_data["intent"] not in valid_intents:
            raise ValueError(f"Invalid medication request intent: {request_data['intent']}")
        
        # Validar medication (obrigatório)
        if "medication" not in request_data:
            raise ValueError("MedicationRequest must have a medication")
        
        # Pode ser CodeableConcept ou Reference
        medication = request_data["medication"]
        if "reference" in medication:
            await self._validate_reference(medication)
        else:
            await self._validate_codeable_concept(medication)
        
        # Validar subject (obrigatório)
        if "subject" not in request_data:
            raise ValueError("MedicationRequest must have a subject")
        
        await self._validate_reference(request_data["subject"])
    
    async def _validate_practitioner(self, practitioner_data: Dict[str, Any]):
        """Valida recurso Practitioner"""
        
        # Validar gender
        if "gender" in practitioner_data:
            valid_genders = ["male", "female", "other", "unknown"]
            if practitioner_data["gender"] not in valid_genders:
                raise ValueError(f"Invalid gender: {practitioner_data['gender']}")
        
        # Validar name
        if "name" in practitioner_data:
            await self._validate_human_names(practitioner_data["name"])
        
        # Validar telecom
        if "telecom" in practitioner_data:
            await self._validate_contact_points(practitioner_data["telecom"])
    
    async def _validate_organization(self, organization_data: Dict[str, Any]):
        """Valida recurso Organization"""
        
        # Validar name
        if "name" in organization_data:
            if not isinstance(organization_data["name"], str):
                raise ValueError("Organization.name must be a string")
        
        # Validar telecom
        if "telecom" in organization_data:
            await self._validate_contact_points(organization_data["telecom"])
        
        # Validar address
        if "address" in organization_data:
            await self._validate_addresses(organization_data["address"])
    
    async def _validate_codeable_concept(self, concept: Dict[str, Any]):
        """Valida CodeableConcept"""
        if not isinstance(concept, dict):
            raise ValueError("CodeableConcept must be an object")
        
        if "coding" in concept:
            if not isinstance(concept["coding"], list):
                raise ValueError("CodeableConcept.coding must be an array")
            
            for coding in concept["coding"]:
                await self._validate_coding(coding)
        
        if "text" in concept and not isinstance(concept["text"], str):
            raise ValueError("CodeableConcept.text must be a string")
    
    async def _validate_coding(self, coding: Dict[str, Any]):
        """Valida Coding"""
        if not isinstance(coding, dict):
            raise ValueError("Coding must be an object")
        
        if "system" in coding and not isinstance(coding["system"], str):
            raise ValueError("Coding.system must be a string")
        
        if "code" in coding and not isinstance(coding["code"], str):
            raise ValueError("Coding.code must be a string")
        
        if "display" in coding and not isinstance(coding["display"], str):
            raise ValueError("Coding.display must be a string")
    
    async def _validate_reference(self, reference: Dict[str, Any]):
        """Valida Reference"""
        if not isinstance(reference, dict):
            raise ValueError("Reference must be an object")
        
        if "reference" in reference and not isinstance(reference["reference"], str):
            raise ValueError("Reference.reference must be a string")
        
        if "display" in reference and not isinstance(reference["display"], str):
            raise ValueError("Reference.display must be a string")
    
    async def _validate_human_names(self, names: List[Dict[str, Any]]):
        """Valida lista de nomes humanos"""
        if not isinstance(names, list):
            raise ValueError("Name must be an array")
        
        for name in names:
            if not isinstance(name, dict):
                raise ValueError("Name items must be objects")
            
            if "use" in name:
                valid_uses = ["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]
                if name["use"] not in valid_uses:
                    raise ValueError(f"Invalid name use: {name['use']}")
            
            if "family" in name and not isinstance(name["family"], str):
                raise ValueError("Name.family must be a string")
            
            if "given" in name:
                if not isinstance(name["given"], list):
                    raise ValueError("Name.given must be an array")
                
                for given in name["given"]:
                    if not isinstance(given, str):
                        raise ValueError("Name.given items must be strings")
    
    async def _validate_contact_points(self, contacts: List[Dict[str, Any]]):
        """Valida pontos de contato"""
        if not isinstance(contacts, list):
            raise ValueError("Telecom must be an array")
        
        for contact in contacts:
            if not isinstance(contact, dict):
                raise ValueError("Telecom items must be objects")
            
            if "system" in contact:
                valid_systems = ["phone", "fax", "email", "pager", "url", "sms", "other"]
                if contact["system"] not in valid_systems:
                    raise ValueError(f"Invalid telecom system: {contact['system']}")
            
            if "use" in contact:
                valid_uses = ["home", "work", "temp", "old", "mobile"]
                if contact["use"] not in valid_uses:
                    raise ValueError(f"Invalid telecom use: {contact['use']}")
            
            if "value" in contact and not isinstance(contact["value"], str):
                raise ValueError("Telecom.value must be a string")
    
    async def _validate_addresses(self, addresses: List[Dict[str, Any]]):
        """Valida endereços"""
        if not isinstance(addresses, list):
            raise ValueError("Address must be an array")
        
        for address in addresses:
            if not isinstance(address, dict):
                raise ValueError("Address items must be objects")
            
            if "use" in address:
                valid_uses = ["home", "work", "temp", "old", "billing"]
                if address["use"] not in valid_uses:
                    raise ValueError(f"Invalid address use: {address['use']}")
            
            if "type" in address:
                valid_types = ["postal", "physical", "both"]
                if address["type"] not in valid_types:
                    raise ValueError(f"Invalid address type: {address['type']}")
    
    async def _validate_datetime(self, dt_string: str):
        """Valida string de datetime"""
        if not isinstance(dt_string, str):
            raise ValueError("DateTime must be a string")
        
        try:
            datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError(f"Invalid datetime format: {dt_string}")
    
    async def _validate_period(self, period: Dict[str, Any]):
        """Valida Period"""
        if not isinstance(period, dict):
            raise ValueError("Period must be an object")
        
        if "start" in period:
            await self._validate_datetime(period["start"])
        
        if "end" in period:
            await self._validate_datetime(period["end"])
    
    async def _load_validation_schemas(self):
        """Carrega esquemas de validação"""
        # Em uma implementação real, carregaria esquemas FHIR oficiais
        self.resource_schemas = {
            "Patient": {"required": ["resourceType"]},
            "Observation": {"required": ["resourceType", "status", "code"]},
            "Encounter": {"required": ["resourceType", "status"]},
            "Medication": {"required": ["resourceType"]},
            "MedicationRequest": {"required": ["resourceType", "status", "intent", "medication", "subject"]},
            "Practitioner": {"required": ["resourceType"]},
            "Organization": {"required": ["resourceType"]}
        }
    
    async def _load_validation_rules(self):
        """Carrega regras de validação específicas"""
        self.validation_rules = {
            "datetime_format": r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$',
            "date_format": r'^\d{4}(-\d{2}(-\d{2})?)?$',
            "uri_format": r'^https?://',
            "email_format": r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        }