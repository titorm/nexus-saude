"""
Medical NLP Processor
Processador de linguagem natural médica
"""

import re
import asyncio
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

try:
    import spacy
    from transformers import pipeline, AutoTokenizer, AutoModel
    from sentence_transformers import SentenceTransformer
    import torch
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False
    logging.warning("NLP dependencies not available. Using mock implementations.")

logger = logging.getLogger(__name__)

class EntityType(Enum):
    """Tipos de entidades médicas"""
    SYMPTOM = "symptom"
    CONDITION = "condition"
    MEDICATION = "medication"
    ANATOMY = "anatomy"
    PROCEDURE = "procedure"
    LAB_TEST = "lab_test"
    VITAL_SIGN = "vital_sign"
    TEMPORAL = "temporal"
    SEVERITY = "severity"
    PERSON = "person"

@dataclass
class MedicalEntity:
    """Entidade médica extraída do texto"""
    text: str
    label: EntityType
    start: int
    end: int
    confidence: float
    normalized_form: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

@dataclass
class ProcessedText:
    """Resultado do processamento de texto médico"""
    original_text: str
    entities: List[MedicalEntity]
    summary: str
    key_concepts: List[str]
    sentiment: Dict[str, float]
    complexity_score: float
    medical_relevance: float

class MedicalNLPProcessor:
    """
    Processador de linguagem natural especializado em textos médicos
    Capaz de:
    - Extrair entidades médicas
    - Reconhecer padrões clínicos
    - Normalizar terminologia
    - Analisar sentimento e urgência
    - Sumarizar textos clínicos
    """
    
    def __init__(self):
        self.nlp_model = None
        self.ner_pipeline = None
        self.summarizer = None
        self.sentence_model = None
        self.medical_patterns = self._create_medical_patterns()
        self.medical_vocabulary = self._load_medical_vocabulary()
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa os modelos de NLP"""
        try:
            logger.info("Initializing Medical NLP Processor...")
            
            if DEPENDENCIES_AVAILABLE:
                await self._load_models()
            else:
                logger.warning("Using mock NLP implementations")
                await self._create_mock_models()
            
            self.is_initialized = True
            logger.info("Medical NLP Processor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize NLP processor: {e}")
            await self._create_mock_models()
            self.is_initialized = True
    
    async def process_text(self, text: str, 
                          context: Optional[Dict[str, Any]] = None) -> ProcessedText:
        """
        Processa texto médico completo
        """
        if not self.is_initialized:
            await self.initialize()
        
        logger.info(f"Processing medical text: {text[:100]}...")
        
        # Extrair entidades médicas
        entities = await self.extract_entities(text)
        
        # Gerar resumo
        summary = await self.summarize_text(text)
        
        # Extrair conceitos-chave
        key_concepts = await self.extract_key_concepts(text, entities)
        
        # Análise de sentimento
        sentiment = await self.analyze_sentiment(text)
        
        # Calcular scores
        complexity_score = self._calculate_complexity(text, entities)
        medical_relevance = self._calculate_medical_relevance(text, entities)
        
        return ProcessedText(
            original_text=text,
            entities=entities,
            summary=summary,
            key_concepts=key_concepts,
            sentiment=sentiment,
            complexity_score=complexity_score,
            medical_relevance=medical_relevance
        )
    
    async def extract_entities(self, text: str) -> List[MedicalEntity]:
        """
        Extrai entidades médicas do texto
        """
        entities = []
        
        if DEPENDENCIES_AVAILABLE and self.ner_pipeline:
            # Usar modelo transformer para NER
            ner_results = self.ner_pipeline(text)
            
            for result in ner_results:
                entity_type = self._map_ner_label_to_entity_type(result['entity'])
                entities.append(MedicalEntity(
                    text=result['word'],
                    label=entity_type,
                    start=result['start'],
                    end=result['end'],
                    confidence=result['score']
                ))
        
        # Adicionar entidades baseadas em padrões regex
        pattern_entities = self._extract_pattern_entities(text)
        entities.extend(pattern_entities)
        
        # Normalizar entidades
        for entity in entities:
            entity.normalized_form = await self._normalize_entity(entity.text, entity.label)
        
        # Remover duplicatas e filtrar por confiança
        entities = self._filter_and_deduplicate_entities(entities)
        
        return entities
    
    async def extract_symptoms_and_conditions(self, text: str) -> Dict[str, List[str]]:
        """
        Extrai especificamente sintomas e condições do texto
        """
        entities = await self.extract_entities(text)
        
        symptoms = []
        conditions = []
        
        for entity in entities:
            if entity.label == EntityType.SYMPTOM:
                symptoms.append(entity.normalized_form or entity.text)
            elif entity.label == EntityType.CONDITION:
                conditions.append(entity.normalized_form or entity.text)
        
        # Adicionar detecção baseada em vocabulário médico
        symptoms.extend(self._find_symptoms_in_text(text))
        conditions.extend(self._find_conditions_in_text(text))
        
        return {
            "symptoms": list(set(symptoms)),
            "conditions": list(set(conditions))
        }
    
    async def analyze_clinical_note(self, note: str) -> Dict[str, Any]:
        """
        Analisa uma nota clínica completa
        """
        processed = await self.process_text(note)
        
        # Extrair seções específicas
        sections = self._extract_note_sections(note)
        
        # Identificar informações críticas
        critical_findings = self._identify_critical_findings(processed.entities)
        
        # Calcular urgência
        urgency_score = self._calculate_urgency(processed.entities, processed.sentiment)
        
        # Extrair medicações mencionadas
        medications = [e for e in processed.entities if e.label == EntityType.MEDICATION]
        
        # Extrair procedimentos
        procedures = [e for e in processed.entities if e.label == EntityType.PROCEDURE]
        
        return {
            "processed_text": processed,
            "sections": sections,
            "critical_findings": critical_findings,
            "urgency_score": urgency_score,
            "medications": [m.text for m in medications],
            "procedures": [p.text for p in procedures],
            "structured_data": self._extract_structured_data(note)
        }
    
    async def summarize_text(self, text: str, max_length: int = 150) -> str:
        """
        Sumariza texto médico
        """
        if DEPENDENCIES_AVAILABLE and self.summarizer:
            try:
                summary = self.summarizer(text, max_length=max_length, min_length=30)
                return summary[0]['summary_text']
            except Exception as e:
                logger.warning(f"Summarization failed: {e}")
        
        # Fallback: extractive summary
        return self._extractive_summary(text, max_length)
    
    async def extract_key_concepts(self, text: str, entities: List[MedicalEntity]) -> List[str]:
        """
        Extrai conceitos-chave do texto
        """
        concepts = []
        
        # Conceitos das entidades
        entity_concepts = [e.normalized_form or e.text for e in entities]
        concepts.extend(entity_concepts)
        
        # Conceitos baseados em tf-idf médico
        medical_terms = self._extract_medical_terms(text)
        concepts.extend(medical_terms)
        
        # Remover duplicatas e ordenar por relevância
        unique_concepts = list(set(concepts))
        scored_concepts = [(concept, self._score_concept_relevance(concept, text)) 
                          for concept in unique_concepts]
        scored_concepts.sort(key=lambda x: x[1], reverse=True)
        
        return [concept for concept, score in scored_concepts[:10]]
    
    async def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """
        Analisa sentimento e urgência do texto médico
        """
        sentiment = {
            "urgency": 0.0,
            "concern": 0.0,
            "pain_level": 0.0,
            "emotional_distress": 0.0
        }
        
        # Palavras indicativas de urgência
        urgency_words = [
            "emergency", "urgent", "immediately", "severe", "critical",
            "emergência", "urgente", "imediatamente", "grave", "crítico"
        ]
        
        # Palavras indicativas de preocupação
        concern_words = [
            "worried", "concerned", "afraid", "anxious", "scared",
            "preocupado", "preocupação", "medo", "ansioso", "assustado"
        ]
        
        # Indicadores de dor
        pain_words = [
            "pain", "hurt", "ache", "burning", "stabbing", "throbbing",
            "dor", "doendo", "queimação", "pontada", "latejando"
        ]
        
        text_lower = text.lower()
        
        # Calcular scores
        sentiment["urgency"] = sum(1 for word in urgency_words if word in text_lower) / len(urgency_words)
        sentiment["concern"] = sum(1 for word in concern_words if word in text_lower) / len(concern_words)
        sentiment["pain_level"] = sum(1 for word in pain_words if word in text_lower) / len(pain_words)
        
        # Análise de intensificadores
        intensifiers = ["very", "extremely", "really", "quite", "muito", "extremamente", "bastante"]
        intensifier_count = sum(1 for word in intensifiers if word in text_lower)
        
        # Ajustar scores baseado em intensificadores
        intensity_multiplier = 1 + (intensifier_count * 0.2)
        for key in sentiment:
            sentiment[key] = min(sentiment[key] * intensity_multiplier, 1.0)
        
        return sentiment
    
    def _create_medical_patterns(self) -> Dict[str, List[str]]:
        """Cria padrões regex para entidades médicas"""
        return {
            "vital_signs": [
                r"BP\s*:?\s*(\d+/\d+)",
                r"blood pressure\s*:?\s*(\d+/\d+)",
                r"HR\s*:?\s*(\d+)",
                r"heart rate\s*:?\s*(\d+)",
                r"temp\s*:?\s*(\d+\.?\d*)",
                r"temperature\s*:?\s*(\d+\.?\d*)",
                r"O2\s*sat\s*:?\s*(\d+%?)",
                r"oxygen saturation\s*:?\s*(\d+%?)"
            ],
            "medications": [
                r"\b\w+(?:cillin|mycin|prazole|sartan|olol|pril|ide)\b",
                r"\b(?:aspirin|ibuprofen|acetaminophen|paracetamol)\b",
                r"\b\w+\s*\d+\s*mg\b"
            ],
            "lab_values": [
                r"\b(?:glucose|hemoglobin|hematocrit|WBC|RBC)\s*:?\s*(\d+\.?\d*)",
                r"\b(?:creatinine|urea|sodium|potassium)\s*:?\s*(\d+\.?\d*)"
            ],
            "temporal": [
                r"\b(?:since|for|during|after|before)\s+\w+",
                r"\b\d+\s+(?:days?|weeks?|months?|years?)\s+ago",
                r"\b(?:yesterday|today|tomorrow|last week|next month)\b"
            ]
        }
    
    def _load_medical_vocabulary(self) -> Dict[str, List[str]]:
        """Carrega vocabulário médico"""
        return {
            "symptoms": [
                "headache", "fever", "cough", "nausea", "vomiting", "diarrhea",
                "fatigue", "weakness", "dizziness", "shortness of breath",
                "chest pain", "abdominal pain", "back pain", "joint pain",
                "cefaleia", "febre", "tosse", "náusea", "vômito", "diarreia",
                "fadiga", "fraqueza", "tontura", "falta de ar", "dor no peito"
            ],
            "conditions": [
                "hypertension", "diabetes", "pneumonia", "bronchitis", "asthma",
                "myocardial infarction", "stroke", "depression", "anxiety",
                "hipertensão", "diabetes", "pneumonia", "bronquite", "asma",
                "infarto", "avc", "depressão", "ansiedade"
            ],
            "anatomy": [
                "heart", "lung", "liver", "kidney", "brain", "stomach",
                "intestine", "muscle", "bone", "blood", "nerve",
                "coração", "pulmão", "fígado", "rim", "cérebro", "estômago"
            ],
            "procedures": [
                "surgery", "biopsy", "endoscopy", "ultrasound", "x-ray",
                "ct scan", "mri", "blood test", "urine test",
                "cirurgia", "biópsia", "endoscopia", "ultrassom", "raio-x"
            ]
        }
    
    async def _load_models(self):
        """Carrega modelos de NLP"""
        try:
            # Carregar modelo spaCy para português/inglês
            try:
                self.nlp_model = spacy.load("pt_core_news_sm")
            except OSError:
                try:
                    self.nlp_model = spacy.load("en_core_web_sm")
                except OSError:
                    logger.warning("No spaCy model available")
            
            # Pipeline de NER médico
            self.ner_pipeline = pipeline(
                "ner",
                model="Clinical-AI-Apollo/Medical-NER",
                tokenizer="Clinical-AI-Apollo/Medical-NER",
                aggregation_strategy="simple"
            )
            
            # Sumarizador
            self.summarizer = pipeline(
                "summarization",
                model="facebook/bart-large-cnn"
            )
            
            # Modelo de embeddings de sentenças
            self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            
        except Exception as e:
            logger.error(f"Error loading NLP models: {e}")
            raise
    
    async def _create_mock_models(self):
        """Cria modelos mock para desenvolvimento"""
        self.nlp_model = None
        self.ner_pipeline = None
        self.summarizer = None
        self.sentence_model = None
        logger.info("Using mock NLP models")
    
    def _extract_pattern_entities(self, text: str) -> List[MedicalEntity]:
        """Extrai entidades baseadas em padrões regex"""
        entities = []
        
        # Sinais vitais
        for pattern in self.medical_patterns["vital_signs"]:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append(MedicalEntity(
                    text=match.group(),
                    label=EntityType.VITAL_SIGN,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.9
                ))
        
        # Medicações
        for pattern in self.medical_patterns["medications"]:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append(MedicalEntity(
                    text=match.group(),
                    label=EntityType.MEDICATION,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.8
                ))
        
        # Valores laboratoriais
        for pattern in self.medical_patterns["lab_values"]:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append(MedicalEntity(
                    text=match.group(),
                    label=EntityType.LAB_TEST,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.85
                ))
        
        # Expressões temporais
        for pattern in self.medical_patterns["temporal"]:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append(MedicalEntity(
                    text=match.group(),
                    label=EntityType.TEMPORAL,
                    start=match.start(),
                    end=match.end(),
                    confidence=0.7
                ))
        
        return entities
    
    def _find_symptoms_in_text(self, text: str) -> List[str]:
        """Encontra sintomas no texto usando vocabulário"""
        symptoms = []
        text_lower = text.lower()
        
        for symptom in self.medical_vocabulary["symptoms"]:
            if symptom.lower() in text_lower:
                symptoms.append(symptom)
        
        return symptoms
    
    def _find_conditions_in_text(self, text: str) -> List[str]:
        """Encontra condições no texto usando vocabulário"""
        conditions = []
        text_lower = text.lower()
        
        for condition in self.medical_vocabulary["conditions"]:
            if condition.lower() in text_lower:
                conditions.append(condition)
        
        return conditions
    
    async def _normalize_entity(self, entity_text: str, entity_type: EntityType) -> str:
        """Normaliza entidade médica"""
        # Simplificado - normalizações básicas
        normalized = entity_text.lower().strip()
        
        # Normalizações específicas por tipo
        if entity_type == EntityType.SYMPTOM:
            symptom_mappings = {
                "head pain": "headache",
                "cephalgia": "headache",
                "dolor de cabeza": "headache",
                "cefaleia": "headache",
                "breathing difficulty": "shortness of breath",
                "falta de ar": "shortness of breath"
            }
            normalized = symptom_mappings.get(normalized, normalized)
        
        elif entity_type == EntityType.CONDITION:
            condition_mappings = {
                "high blood pressure": "hypertension",
                "hipertensão": "hypertension",
                "pressão alta": "hypertension",
                "heart attack": "myocardial infarction",
                "infarto": "myocardial infarction"
            }
            normalized = condition_mappings.get(normalized, normalized)
        
        return normalized
    
    def _filter_and_deduplicate_entities(self, entities: List[MedicalEntity]) -> List[MedicalEntity]:
        """Remove duplicatas e filtra entidades por confiança"""
        # Filtrar por confiança mínima
        filtered = [e for e in entities if e.confidence >= 0.5]
        
        # Remover sobreposições (manter a de maior confiança)
        non_overlapping = []
        filtered.sort(key=lambda x: x.confidence, reverse=True)
        
        for entity in filtered:
            overlaps = False
            for existing in non_overlapping:
                if (entity.start < existing.end and entity.end > existing.start):
                    overlaps = True
                    break
            
            if not overlaps:
                non_overlapping.append(entity)
        
        return non_overlapping
    
    def _map_ner_label_to_entity_type(self, ner_label: str) -> EntityType:
        """Mapeia rótulos do NER para tipos de entidade"""
        label_mapping = {
            "PROBLEM": EntityType.CONDITION,
            "TREATMENT": EntityType.PROCEDURE,
            "TEST": EntityType.LAB_TEST,
            "MEDICATION": EntityType.MEDICATION,
            "ANATOMY": EntityType.ANATOMY,
            "PERSON": EntityType.PERSON,
            "TIME": EntityType.TEMPORAL
        }
        
        return label_mapping.get(ner_label.upper(), EntityType.CONDITION)
    
    def _extractive_summary(self, text: str, max_length: int) -> str:
        """Resumo extrativo simples"""
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return text[:max_length]
        
        # Scoring simples baseado em palavras médicas
        scored_sentences = []
        for sentence in sentences:
            score = sum(1 for word in self.medical_vocabulary["symptoms"] + 
                           self.medical_vocabulary["conditions"] 
                           if word.lower() in sentence.lower())
            scored_sentences.append((sentence, score))
        
        # Ordenar por score e pegar as melhores
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        
        summary = ""
        for sentence, score in scored_sentences:
            if len(summary) + len(sentence) <= max_length:
                summary += sentence + ". "
            else:
                break
        
        return summary.strip() or text[:max_length]
    
    def _extract_medical_terms(self, text: str) -> List[str]:
        """Extrai termos médicos do texto"""
        terms = []
        
        # Buscar em todos os vocabulários
        for category, words in self.medical_vocabulary.items():
            for word in words:
                if word.lower() in text.lower():
                    terms.append(word)
        
        return terms
    
    def _score_concept_relevance(self, concept: str, text: str) -> float:
        """Score da relevância de um conceito no texto"""
        concept_lower = concept.lower()
        text_lower = text.lower()
        
        # Frequência
        frequency = text_lower.count(concept_lower)
        
        # Posição (conceitos no início têm mais peso)
        position_score = 1.0
        first_occurrence = text_lower.find(concept_lower)
        if first_occurrence != -1:
            position_score = 1.0 - (first_occurrence / len(text))
        
        # Categoria médica
        category_score = 1.0
        for category, words in self.medical_vocabulary.items():
            if concept_lower in [w.lower() for w in words]:
                category_weights = {
                    "symptoms": 1.2,
                    "conditions": 1.5,
                    "medications": 1.1,
                    "procedures": 1.0
                }
                category_score = category_weights.get(category, 1.0)
                break
        
        return frequency * position_score * category_score
    
    def _extract_note_sections(self, note: str) -> Dict[str, str]:
        """Extrai seções de uma nota clínica"""
        sections = {}
        
        # Padrões comuns de seções
        section_patterns = [
            (r"chief complaint:(.+?)(?=\n[a-z\s]+:|\n\n|\Z)", "chief_complaint"),
            (r"history of present illness:(.+?)(?=\n[a-z\s]+:|\n\n|\Z)", "hpi"),
            (r"physical examination:(.+?)(?=\n[a-z\s]+:|\n\n|\Z)", "physical_exam"),
            (r"assessment:(.+?)(?=\n[a-z\s]+:|\n\n|\Z)", "assessment"),
            (r"plan:(.+?)(?=\n[a-z\s]+:|\n\n|\Z)", "plan")
        ]
        
        for pattern, section_name in section_patterns:
            match = re.search(pattern, note, re.IGNORECASE | re.DOTALL)
            if match:
                sections[section_name] = match.group(1).strip()
        
        return sections
    
    def _identify_critical_findings(self, entities: List[MedicalEntity]) -> List[str]:
        """Identifica achados críticos"""
        critical_keywords = [
            "emergency", "critical", "severe", "acute", "urgent",
            "emergência", "crítico", "grave", "agudo", "urgente",
            "chest pain", "shortness of breath", "unconscious",
            "dor no peito", "falta de ar", "inconsciente"
        ]
        
        critical_findings = []
        
        for entity in entities:
            if any(keyword in entity.text.lower() for keyword in critical_keywords):
                critical_findings.append(entity.text)
        
        return critical_findings
    
    def _calculate_urgency(self, entities: List[MedicalEntity], 
                          sentiment: Dict[str, float]) -> float:
        """Calcula score de urgência"""
        urgency_score = 0.0
        
        # Score do sentiment
        urgency_score += sentiment.get("urgency", 0.0) * 0.4
        urgency_score += sentiment.get("pain_level", 0.0) * 0.3
        urgency_score += sentiment.get("concern", 0.0) * 0.2
        
        # Entidades críticas
        critical_entities = self._identify_critical_findings(entities)
        urgency_score += min(len(critical_entities) * 0.1, 0.3)
        
        return min(urgency_score, 1.0)
    
    def _extract_structured_data(self, note: str) -> Dict[str, Any]:
        """Extrai dados estruturados da nota"""
        structured = {
            "vital_signs": {},
            "lab_values": {},
            "medications": [],
            "allergies": [],
            "procedures": []
        }
        
        # Sinais vitais
        vital_patterns = {
            "blood_pressure": r"BP\s*:?\s*(\d+/\d+)",
            "heart_rate": r"HR\s*:?\s*(\d+)",
            "temperature": r"temp\s*:?\s*(\d+\.?\d*)",
            "respiratory_rate": r"RR\s*:?\s*(\d+)"
        }
        
        for vital, pattern in vital_patterns.items():
            match = re.search(pattern, note, re.IGNORECASE)
            if match:
                structured["vital_signs"][vital] = match.group(1)
        
        return structured
    
    def _calculate_complexity(self, text: str, entities: List[MedicalEntity]) -> float:
        """Calcula score de complexidade do texto"""
        # Número de entidades médicas
        entity_score = min(len(entities) / 20, 1.0)
        
        # Comprimento do texto
        length_score = min(len(text) / 1000, 1.0)
        
        # Terminologia médica
        medical_terms = sum(1 for word in text.split() 
                           if any(word.lower() in vocab 
                                 for vocab in self.medical_vocabulary.values()))
        terminology_score = min(medical_terms / len(text.split()), 1.0)
        
        return (entity_score + length_score + terminology_score) / 3
    
    def _calculate_medical_relevance(self, text: str, entities: List[MedicalEntity]) -> float:
        """Calcula relevância médica do texto"""
        if not text:
            return 0.0
        
        # Densidade de entidades médicas
        medical_density = len(entities) / len(text.split())
        
        # Presença de vocabulário médico
        medical_words = 0
        total_words = len(text.split())
        
        for word in text.split():
            if any(word.lower() in vocab for vocab in self.medical_vocabulary.values()):
                medical_words += 1
        
        vocab_relevance = medical_words / total_words if total_words > 0 else 0
        
        return min((medical_density * 10 + vocab_relevance) / 2, 1.0)