"""
Medical Entity Extractor
Extrator de entidades médicas especializado
"""

import asyncio
import re
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class EntityType(Enum):
    """Tipos de entidade médica"""
    MEDICATION = "medication"
    CONDITION = "condition" 
    SYMPTOM = "symptom"
    PROCEDURE = "procedure"
    ANATOMY = "anatomy"
    LAB_TEST = "lab_test"
    VITAL_SIGN = "vital_sign"
    DOSAGE = "dosage"
    TEMPORAL = "temporal"
    PERSON = "person"

@dataclass
class MedicalEntity:
    """Entidade médica extraída"""
    text: str
    entity_type: EntityType
    start: int
    end: int
    confidence: float
    normalized_form: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class MedicalEntityExtractor:
    """Extrator especializado de entidades médicas"""
    
    def __init__(self):
        self.is_initialized = False
        self.entity_patterns = self._create_entity_patterns()
        self.medical_dictionaries = self._load_medical_dictionaries()
        self.normalization_rules = self._create_normalization_rules()
    
    async def initialize(self):
        """Inicializa o extrator"""
        try:
            logger.info("Initializing Medical Entity Extractor...")
            self.is_initialized = True
            logger.info("Medical Entity Extractor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize extractor: {e}")
            self.is_initialized = True
    
    async def extract_entities(self, 
                             text: str,
                             entity_types: Optional[List[str]] = None,
                             include_confidence: bool = True) -> List[Dict[str, Any]]:
        """Extrai entidades médicas do texto"""
        if not self.is_initialized:
            await self.initialize()
        
        entities = []
        
        # Filtrar tipos se especificado
        types_to_extract = []
        if entity_types:
            types_to_extract = [EntityType(t) for t in entity_types if t in [e.value for e in EntityType]]
        else:
            types_to_extract = list(EntityType)
        
        # Extrair cada tipo de entidade
        for entity_type in types_to_extract:
            type_entities = await self._extract_entities_by_type(text, entity_type)
            entities.extend(type_entities)
        
        # Remover sobreposições
        entities = self._resolve_overlaps(entities)
        
        # Converter para dicionário
        result = []
        for entity in entities:
            entity_dict = {
                "text": entity.text,
                "type": entity.entity_type.value,
                "start": entity.start,
                "end": entity.end,
                "normalized_form": entity.normalized_form
            }
            
            if include_confidence:
                entity_dict["confidence"] = entity.confidence
            
            if entity.attributes:
                entity_dict["attributes"] = entity.attributes
            
            result.append(entity_dict)
        
        return result
    
    async def _extract_entities_by_type(self, text: str, entity_type: EntityType) -> List[MedicalEntity]:
        """Extrai entidades de um tipo específico"""
        entities = []
        
        # Usar padrões regex
        patterns = self.entity_patterns.get(entity_type, [])
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entity = MedicalEntity(
                    text=match.group().strip(),
                    entity_type=entity_type,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.8
                )
                entity.normalized_form = self._normalize_entity(entity.text, entity_type)
                entities.append(entity)
        
        # Usar dicionários médicos
        dictionary = self.medical_dictionaries.get(entity_type, [])
        for term in dictionary:
            pattern = r'\b' + re.escape(term) + r'\b'
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entity = MedicalEntity(
                    text=match.group().strip(),
                    entity_type=entity_type,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.9
                )
                entity.normalized_form = self._normalize_entity(entity.text, entity_type)
                entities.append(entity)
        
        return entities
    
    def _create_entity_patterns(self) -> Dict[EntityType, List[str]]:
        """Cria padrões regex para cada tipo de entidade"""
        return {
            EntityType.MEDICATION: [
                r'\b\w+(?:cillin|mycin|prazole|sartan|olol|pril|ide)\b',
                r'\b(?:aspirin|ibuprofen|acetaminophen|metformin|warfarin)\b',
                r'\b\w+\s+\d+\s*mg\b'
            ],
            EntityType.VITAL_SIGN: [
                r'BP\s*:?\s*\d+/\d+',
                r'blood pressure\s*:?\s*\d+/\d+',
                r'HR\s*:?\s*\d+',
                r'heart rate\s*:?\s*\d+',
                r'temp\s*:?\s*\d+\.?\d*',
                r'temperature\s*:?\s*\d+\.?\d*'
            ],
            EntityType.LAB_TEST: [
                r'\b(?:glucose|hemoglobin|creatinine|sodium|potassium)\s*:?\s*\d+\.?\d*',
                r'\b(?:CBC|BUN|ALT|AST|TSH)\b',
                r'\bwhite blood cell count\b'
            ],
            EntityType.DOSAGE: [
                r'\d+\s*(?:mg|mcg|g|ml|cc|units?)',
                r'\d+\s*times?\s*(?:daily|per day|a day)',
                r'twice daily|once daily|BID|TID|QID'
            ],
            EntityType.TEMPORAL: [
                r'\b(?:since|for|during|after|before)\s+\w+',
                r'\b\d+\s+(?:days?|weeks?|months?|years?)\s+ago',
                r'\b(?:yesterday|today|tomorrow|last week|next month)\b'
            ]
        }
    
    def _load_medical_dictionaries(self) -> Dict[EntityType, List[str]]:
        """Carrega dicionários médicos"""
        return {
            EntityType.CONDITION: [
                "hypertension", "diabetes", "pneumonia", "asthma", "bronchitis",
                "myocardial infarction", "stroke", "depression", "anxiety",
                "hipertensão", "diabetes", "pneumonia", "asma", "bronquite"
            ],
            EntityType.SYMPTOM: [
                "headache", "fever", "cough", "nausea", "vomiting", "diarrhea",
                "fatigue", "weakness", "dizziness", "shortness of breath",
                "chest pain", "abdominal pain", "back pain",
                "cefaleia", "febre", "tosse", "náusea", "vômito", "diarreia"
            ],
            EntityType.ANATOMY: [
                "heart", "lung", "liver", "kidney", "brain", "stomach",
                "intestine", "muscle", "bone", "blood", "nerve",
                "coração", "pulmão", "fígado", "rim", "cérebro", "estômago"
            ],
            EntityType.PROCEDURE: [
                "surgery", "biopsy", "endoscopy", "ultrasound", "x-ray",
                "ct scan", "mri", "blood test", "urine test",
                "cirurgia", "biópsia", "endoscopia", "ultrassom", "raio-x"
            ],
            EntityType.PERSON: [
                "patient", "doctor", "nurse", "physician", "surgeon",
                "paciente", "médico", "enfermeiro", "cirurgião"
            ]
        }
    
    def _create_normalization_rules(self) -> Dict[EntityType, Dict[str, str]]:
        """Cria regras de normalização"""
        return {
            EntityType.MEDICATION: {
                "acetaminophen": "paracetamol",
                "tylenol": "paracetamol",
                "advil": "ibuprofen"
            },
            EntityType.CONDITION: {
                "mi": "myocardial infarction",
                "heart attack": "myocardial infarction",
                "high blood pressure": "hypertension"
            },
            EntityType.SYMPTOM: {
                "sob": "shortness of breath",
                "dyspnea": "shortness of breath",
                "cp": "chest pain"
            }
        }
    
    def _normalize_entity(self, text: str, entity_type: EntityType) -> str:
        """Normaliza uma entidade"""
        text_lower = text.lower().strip()
        
        # Aplicar regras específicas do tipo
        rules = self.normalization_rules.get(entity_type, {})
        normalized = rules.get(text_lower, text_lower)
        
        return normalized
    
    def _resolve_overlaps(self, entities: List[MedicalEntity]) -> List[MedicalEntity]:
        """Remove entidades sobrepostas (mantém a de maior confiança)"""
        entities.sort(key=lambda x: x.confidence, reverse=True)
        
        non_overlapping = []
        for entity in entities:
            overlaps = False
            for existing in non_overlapping:
                if (entity.start < existing.end and entity.end > existing.start):
                    overlaps = True
                    break
            
            if not overlaps:
                non_overlapping.append(entity)
        
        return non_overlapping