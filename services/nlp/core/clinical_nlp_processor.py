"""
Clinical NLP Processor
Processador principal para análise de notas clínicas
"""

import asyncio
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import logging
from dataclasses import dataclass, field

try:
    import spacy
    from transformers import pipeline
    import torch
    DEPENDENCIES_AVAILABLE = True
except ImportError:
    DEPENDENCIES_AVAILABLE = False
    logging.warning("NLP dependencies not available. Using mock implementations.")

logger = logging.getLogger(__name__)

@dataclass
class ClinicalEntity:
    """Entidade clínica extraída"""
    text: str
    label: str
    start: int
    end: int
    confidence: float
    normalized_form: Optional[str] = None
    section: Optional[str] = None
    attributes: Dict[str, Any] = field(default_factory=dict)

@dataclass 
class ClinicalAnalysis:
    """Resultado da análise clínica completa"""
    original_text: str
    entities: List[ClinicalEntity]
    document_type: str
    sections: Dict[str, str]
    summary: str
    key_findings: List[str]
    urgency_score: float
    sentiment_analysis: Dict[str, float]
    structured_data: Dict[str, Any]
    quality_score: float
    processing_metadata: Dict[str, Any]

class ClinicalNLPProcessor:
    """
    Processador principal para análise de notas clínicas
    Integra todos os componentes de NLP médico
    """
    
    def __init__(self):
        self.nlp_model = None
        self.ner_pipeline = None
        self.is_initialized = False
        self.section_patterns = self._create_section_patterns()
        self.medical_vocabulary = self._load_medical_vocabulary()
        self.urgency_indicators = self._load_urgency_indicators()
        self.quality_metrics = self._create_quality_metrics()
    
    async def initialize(self):
        """Inicializa o processador"""
        try:
            logger.info("Initializing Clinical NLP Processor...")
            
            if DEPENDENCIES_AVAILABLE:
                await self._load_models()
            else:
                logger.warning("Using mock NLP models")
                await self._create_mock_models()
            
            self.is_initialized = True
            logger.info("Clinical NLP Processor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize processor: {e}")
            await self._create_mock_models()
            self.is_initialized = True
    
    async def process_clinical_note(self, 
                                   text: str,
                                   note_type: Optional[str] = None,
                                   patient_id: Optional[str] = None,
                                   metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Processa uma nota clínica completa
        """
        if not self.is_initialized:
            await self.initialize()
        
        logger.info(f"Processing clinical note of type: {note_type}")
        
        start_time = datetime.now()
        
        # 1. Extrair seções da nota
        sections = await self._extract_sections(text)
        
        # 2. Extrair entidades médicas
        entities = await self._extract_clinical_entities(text, sections)
        
        # 3. Determinar tipo de documento
        if not note_type:
            note_type = await self._classify_document_type(text, entities)
        
        # 4. Gerar resumo
        summary = await self._generate_summary(text, entities, sections)
        
        # 5. Identificar achados principais
        key_findings = await self._identify_key_findings(text, entities, sections)
        
        # 6. Calcular score de urgência
        urgency_score = await self._calculate_urgency_score(text, entities)
        
        # 7. Análise de sentimento
        sentiment = await self._analyze_sentiment(text)
        
        # 8. Extrair dados estruturados
        structured_data = await self._extract_structured_data(text, entities, sections)
        
        # 9. Calcular qualidade da nota
        quality_score = await self._calculate_quality_score(text, entities, sections)
        
        # 10. Metadados de processamento
        processing_time = (datetime.now() - start_time).total_seconds()
        processing_metadata = {
            "processing_time": processing_time,
            "processor_version": "1.0.0",
            "models_used": self._get_models_info(),
            "patient_id": patient_id,
            "processed_at": datetime.now().isoformat()
        }
        
        analysis = ClinicalAnalysis(
            original_text=text,
            entities=entities,
            document_type=note_type,
            sections=sections,
            summary=summary,
            key_findings=key_findings,
            urgency_score=urgency_score,
            sentiment_analysis=sentiment,
            structured_data=structured_data,
            quality_score=quality_score,
            processing_metadata=processing_metadata
        )
        
        return self._analysis_to_dict(analysis)
    
    async def _extract_sections(self, text: str) -> Dict[str, str]:
        """Extrai seções da nota clínica"""
        sections = {}
        
        for section_name, patterns in self.section_patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
                if match:
                    content = match.group(1).strip() if match.groups() else match.group(0).strip()
                    sections[section_name] = content
                    break
        
        # Se não encontrou seções específicas, tratar como texto único
        if not sections:
            sections["content"] = text
        
        return sections
    
    async def _extract_clinical_entities(self, text: str, sections: Dict[str, str]) -> List[ClinicalEntity]:
        """Extrai entidades médicas do texto"""
        entities = []
        
        if DEPENDENCIES_AVAILABLE and self.ner_pipeline:
            try:
                # Usar modelo transformer para NER
                ner_results = self.ner_pipeline(text)
                
                for result in ner_results:
                    entity = ClinicalEntity(
                        text=result['word'],
                        label=result['entity'],
                        start=result['start'],
                        end=result['end'],
                        confidence=result['score']
                    )
                    
                    # Determinar seção da entidade
                    entity.section = self._find_entity_section(entity.start, sections)
                    
                    # Normalizar entidade
                    entity.normalized_form = await self._normalize_entity(entity.text, entity.label)
                    
                    entities.append(entity)
                    
            except Exception as e:
                logger.warning(f"NER pipeline failed: {e}")
        
        # Adicionar entidades baseadas em padrões
        pattern_entities = await self._extract_pattern_entities(text, sections)
        entities.extend(pattern_entities)
        
        # Filtrar e remover duplicatas
        entities = self._filter_entities(entities)
        
        return entities
    
    async def _classify_document_type(self, text: str, entities: List[ClinicalEntity]) -> str:
        """Classifica o tipo de documento"""
        text_lower = text.lower()
        
        # Padrões para diferentes tipos de documento
        document_patterns = {
            "admission_note": [
                "admission", "admissão", "internação", "chief complaint",
                "history of present illness", "queixa principal"
            ],
            "discharge_summary": [
                "discharge", "alta", "summary", "resumo", "hospital course",
                "discharge instructions", "follow-up"
            ],
            "progress_note": [
                "progress", "evolução", "daily note", "subjective", "objective",
                "assessment", "plan", "soap"
            ],
            "consultation": [
                "consultation", "consulta", "opinion", "specialist",
                "recommendation", "evaluation"
            ],
            "procedure_note": [
                "procedure", "procedimento", "operation", "surgery",
                "cirurgia", "operative", "technique"
            ],
            "laboratory_report": [
                "laboratory", "lab", "result", "test", "análise",
                "exame", "culture", "pathology"
            ]
        }
        
        # Scoring para cada tipo
        type_scores = {}
        
        for doc_type, keywords in document_patterns.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += 1
            
            # Boost baseado em entidades
            if doc_type == "laboratory_report":
                lab_entities = [e for e in entities if "test" in e.label.lower() or "lab" in e.label.lower()]
                score += len(lab_entities) * 2
            
            type_scores[doc_type] = score
        
        # Retornar tipo com maior score
        best_type = max(type_scores.items(), key=lambda x: x[1])
        return best_type[0] if best_type[1] > 0 else "general"
    
    async def _generate_summary(self, text: str, entities: List[ClinicalEntity], 
                              sections: Dict[str, str]) -> str:
        """Gera resumo da nota clínica"""
        
        # Estratégia de sumarização baseada no tipo de seções
        summary_parts = []
        
        # Queixa principal
        if "chief_complaint" in sections:
            summary_parts.append(f"Queixa: {sections['chief_complaint'][:100]}...")
        
        # Achados principais das entidades
        key_entities = [e for e in entities if e.confidence > 0.8]
        if key_entities:
            conditions = [e.text for e in key_entities if "condition" in e.label.lower()]
            medications = [e.text for e in key_entities if "medication" in e.label.lower()]
            
            if conditions:
                summary_parts.append(f"Condições: {', '.join(conditions[:3])}")
            if medications:
                summary_parts.append(f"Medicações: {', '.join(medications[:3])}")
        
        # Plano se disponível
        if "plan" in sections:
            plan_text = sections["plan"][:150]
            summary_parts.append(f"Plano: {plan_text}...")
        
        # Se não conseguiu gerar resumo estruturado, usar extractivo
        if not summary_parts:
            sentences = re.split(r'[.!?]+', text)
            sentences = [s.strip() for s in sentences if s.strip() and len(s) > 20]
            
            # Pegar as 2 primeiras sentenças mais importantes
            if sentences:
                summary = ". ".join(sentences[:2])
                if len(summary) > 200:
                    summary = summary[:200] + "..."
                return summary
        
        return " | ".join(summary_parts)
    
    async def _identify_key_findings(self, text: str, entities: List[ClinicalEntity],
                                   sections: Dict[str, str]) -> List[str]:
        """Identifica achados principais da nota"""
        findings = []
        
        # Achados baseados em entidades de alta confiança
        high_conf_entities = [e for e in entities if e.confidence > 0.85]
        
        # Condições importantes
        conditions = [e for e in high_conf_entities if "condition" in e.label.lower()]
        for condition in conditions[:5]:  # Top 5 condições
            findings.append(f"Condição: {condition.text}")
        
        # Procedimentos importantes
        procedures = [e for e in high_conf_entities if "procedure" in e.label.lower()]
        for procedure in procedures[:3]:  # Top 3 procedimentos
            findings.append(f"Procedimento: {procedure.text}")
        
        # Achados anômalos em exames
        abnormal_patterns = [
            r"elevated?", r"decreased?", r"abnormal", r"positive",
            r"negative", r"increased?", r"reduced?"
        ]
        
        for pattern in abnormal_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                context_start = max(0, match.start() - 50)
                context_end = min(len(text), match.end() + 50)
                context = text[context_start:context_end].strip()
                
                if len(context) > 20:
                    findings.append(f"Achado: {context}")
                    
                if len(findings) >= 10:  # Limitar achados
                    break
        
        return findings
    
    async def _calculate_urgency_score(self, text: str, entities: List[ClinicalEntity]) -> float:
        """Calcula score de urgência (0-1)"""
        urgency_score = 0.0
        text_lower = text.lower()
        
        # Palavras-chave de urgência
        for keyword, weight in self.urgency_indicators.items():
            if keyword in text_lower:
                urgency_score += weight
        
        # Entidades que indicam urgência
        urgent_entities = [
            "emergency", "urgent", "stat", "immediate", "critical",
            "emergência", "urgente", "imediato", "crítico"
        ]
        
        for entity in entities:
            if any(urgent in entity.text.lower() for urgent in urgent_entities):
                urgency_score += 0.3
        
        # Combinações de sintomas críticos
        symptoms = [e.text.lower() for e in entities if "symptom" in e.label.lower()]
        critical_combinations = [
            (["chest pain", "shortness of breath"], 0.8),
            (["severe headache", "confusion"], 0.7),
            (["abdominal pain", "vomiting"], 0.5)
        ]
        
        for combination, weight in critical_combinations:
            if all(symptom in " ".join(symptoms) for symptom in combination):
                urgency_score += weight
        
        return min(urgency_score, 1.0)
    
    async def _analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analisa sentimento e tom da nota"""
        sentiment = {
            "positive": 0.0,
            "negative": 0.0,
            "neutral": 0.0,
            "concern_level": 0.0,
            "confidence": 0.0
        }
        
        # Palavras indicativas de sentimento
        positive_words = [
            "improved", "better", "stable", "normal", "good",
            "melhorou", "melhor", "estável", "normal", "bom"
        ]
        
        negative_words = [
            "worse", "deteriorated", "severe", "critical", "poor",
            "pior", "deteriorou", "grave", "crítico", "ruim"
        ]
        
        concern_words = [
            "concerning", "worrying", "suspicious", "abnormal",
            "preocupante", "suspeito", "anormal"
        ]
        
        text_lower = text.lower()
        word_count = len(text.split())
        
        # Contar palavras de cada categoria
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        concern_count = sum(1 for word in concern_words if word in text_lower)
        
        total_sentiment_words = positive_count + negative_count + concern_count
        
        if total_sentiment_words > 0:
            sentiment["positive"] = positive_count / total_sentiment_words
            sentiment["negative"] = negative_count / total_sentiment_words
            sentiment["concern_level"] = concern_count / total_sentiment_words
            sentiment["confidence"] = total_sentiment_words / word_count
        else:
            sentiment["neutral"] = 1.0
        
        return sentiment
    
    async def _extract_structured_data(self, text: str, entities: List[ClinicalEntity],
                                     sections: Dict[str, str]) -> Dict[str, Any]:
        """Extrai dados estruturados da nota"""
        structured = {
            "patient_demographics": {},
            "vital_signs": {},
            "medications": [],
            "conditions": [],
            "procedures": [],
            "lab_values": {},
            "allergies": [],
            "clinical_impressions": []
        }
        
        # Extrair sinais vitais
        vital_patterns = {
            "blood_pressure": r"BP\s*:?\s*(\d+/\d+)",
            "heart_rate": r"HR\s*:?\s*(\d+)",
            "temperature": r"temp\s*:?\s*(\d+\.?\d*)",
            "respiratory_rate": r"RR\s*:?\s*(\d+)",
            "oxygen_saturation": r"O2\s*sat\s*:?\s*(\d+)%?"
        }
        
        for vital, pattern in vital_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                structured["vital_signs"][vital] = match.group(1)
        
        # Organizar entidades por categoria
        for entity in entities:
            if "medication" in entity.label.lower():
                structured["medications"].append({
                    "name": entity.text,
                    "confidence": entity.confidence,
                    "section": entity.section
                })
            elif "condition" in entity.label.lower():
                structured["conditions"].append({
                    "name": entity.text,
                    "confidence": entity.confidence,
                    "section": entity.section
                })
            elif "procedure" in entity.label.lower():
                structured["procedures"].append({
                    "name": entity.text,
                    "confidence": entity.confidence,
                    "section": entity.section
                })
        
        # Extrair valores laboratoriais
        lab_pattern = r"(\w+)\s*:?\s*(\d+\.?\d*)\s*(mg/dl|mmol/l|%|units?)?"
        lab_matches = re.finditer(lab_pattern, text, re.IGNORECASE)
        
        for match in lab_matches:
            test_name = match.group(1)
            value = match.group(2)
            unit = match.group(3) or ""
            
            if test_name.lower() in ["glucose", "hemoglobin", "creatinine", "sodium", "potassium"]:
                structured["lab_values"][test_name] = {
                    "value": value,
                    "unit": unit
                }
        
        return structured
    
    async def _calculate_quality_score(self, text: str, entities: List[ClinicalEntity],
                                     sections: Dict[str, str]) -> float:
        """Calcula score de qualidade da nota (0-1)"""
        quality_score = 0.0
        
        # Critérios de qualidade
        criteria_scores = {}
        
        # 1. Completude (presença de seções importantes)
        important_sections = ["chief_complaint", "history", "examination", "assessment", "plan"]
        sections_present = sum(1 for section in important_sections if section in sections)
        criteria_scores["completeness"] = sections_present / len(important_sections)
        
        # 2. Clareza (ausência de erros de digitação/gramática)
        # Simplificado: verificar proporção de palavras reconhecidas
        words = text.split()
        if words:
            # Mock: assumir 90% das palavras são reconhecidas
            criteria_scores["clarity"] = 0.9
        else:
            criteria_scores["clarity"] = 0.0
        
        # 3. Detalhamento (densidade de entidades médicas)
        if words:
            entity_density = len(entities) / len(words)
            criteria_scores["detail"] = min(entity_density * 50, 1.0)  # Normalizar
        else:
            criteria_scores["detail"] = 0.0
        
        # 4. Estruturação (organização em seções)
        criteria_scores["structure"] = 1.0 if len(sections) > 1 else 0.5
        
        # 5. Objetividade (presença de dados quantitativos)
        numeric_pattern = r'\d+\.?\d*'
        numeric_matches = len(re.findall(numeric_pattern, text))
        criteria_scores["objectivity"] = min(numeric_matches / 10, 1.0)
        
        # Calcular score final (média ponderada)
        weights = {
            "completeness": 0.3,
            "clarity": 0.2,
            "detail": 0.2,
            "structure": 0.15,
            "objectivity": 0.15
        }
        
        quality_score = sum(score * weights[criterion] 
                           for criterion, score in criteria_scores.items())
        
        return quality_score
    
    # Métodos auxiliares
    
    async def _load_models(self):
        """Carrega modelos de NLP"""
        try:
            # Modelo spaCy
            try:
                self.nlp_model = spacy.load("en_core_web_sm")
            except OSError:
                logger.warning("spaCy model not found")
            
            # Pipeline de NER médico
            self.ner_pipeline = pipeline(
                "ner",
                model="d4data/biomedical-ner-all",
                tokenizer="d4data/biomedical-ner-all",
                aggregation_strategy="simple"
            )
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise
    
    async def _create_mock_models(self):
        """Cria modelos mock"""
        self.nlp_model = None
        self.ner_pipeline = None
        logger.info("Using mock NLP models")
    
    def _create_section_patterns(self) -> Dict[str, List[str]]:
        """Cria padrões para identificar seções"""
        return {
            "chief_complaint": [
                r"chief complaint:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"cc:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"queixa principal:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)"
            ],
            "history": [
                r"history of present illness:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"hpi:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"história:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)"
            ],
            "examination": [
                r"physical exam:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"examination:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"exame físico:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)"
            ],
            "assessment": [
                r"assessment:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"impression:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"avaliação:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)"
            ],
            "plan": [
                r"plan:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"treatment:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)",
                r"plano:?\s*(.+?)(?=\n\s*[a-z\s]+:|$)"
            ]
        }
    
    def _load_medical_vocabulary(self) -> Dict[str, List[str]]:
        """Carrega vocabulário médico"""
        return {
            "symptoms": [
                "pain", "fever", "headache", "nausea", "vomiting",
                "dor", "febre", "cefaleia", "náusea", "vômito"
            ],
            "conditions": [
                "hypertension", "diabetes", "pneumonia", "asthma",
                "hipertensão", "diabetes", "pneumonia", "asma"
            ],
            "medications": [
                "aspirin", "ibuprofen", "acetaminophen", "lisinopril",
                "aspirina", "ibuprofeno", "paracetamol"
            ]
        }
    
    def _load_urgency_indicators(self) -> Dict[str, float]:
        """Carrega indicadores de urgência"""
        return {
            "emergency": 0.9,
            "urgent": 0.8,
            "stat": 0.8,
            "immediate": 0.7,
            "critical": 0.9,
            "severe": 0.6,
            "emergência": 0.9,
            "urgente": 0.8,
            "imediato": 0.7,
            "crítico": 0.9,
            "grave": 0.6
        }
    
    def _create_quality_metrics(self) -> Dict[str, Any]:
        """Cria métricas de qualidade"""
        return {
            "min_length": 50,
            "max_length": 10000,
            "required_sections": ["assessment", "plan"],
            "entity_density_threshold": 0.05
        }
    
    async def _extract_pattern_entities(self, text: str, sections: Dict[str, str]) -> List[ClinicalEntity]:
        """Extrai entidades baseadas em padrões"""
        entities = []
        
        # Padrões de medicações
        med_patterns = [
            r"\b\w+(?:cillin|mycin|prazole|sartan|olol|pril)\b",
            r"\b(?:aspirin|ibuprofen|acetaminophen|metformin)\b"
        ]
        
        for pattern in med_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entities.append(ClinicalEntity(
                    text=match.group(),
                    label="MEDICATION",
                    start=match.start(),
                    end=match.end(),
                    confidence=0.8
                ))
        
        return entities
    
    def _find_entity_section(self, entity_position: int, sections: Dict[str, str]) -> Optional[str]:
        """Encontra a seção de uma entidade baseada na posição"""
        # Simplificado: retornar primeira seção encontrada
        for section_name in sections:
            return section_name
        return None
    
    async def _normalize_entity(self, entity_text: str, entity_label: str) -> str:
        """Normaliza entidade médica"""
        # Normalizações básicas
        normalized = entity_text.lower().strip()
        
        # Mapeamentos específicos
        mappings = {
            "acetaminophen": "paracetamol",
            "hypertension": "high blood pressure",
            "mi": "myocardial infarction"
        }
        
        return mappings.get(normalized, normalized)
    
    def _filter_entities(self, entities: List[ClinicalEntity]) -> List[ClinicalEntity]:
        """Filtra e remove duplicatas de entidades"""
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
    
    def _get_models_info(self) -> Dict[str, str]:
        """Retorna informações sobre modelos usados"""
        return {
            "nlp_model": "spacy" if self.nlp_model else "mock",
            "ner_pipeline": "biomedical-ner" if self.ner_pipeline else "mock"
        }
    
    def _analysis_to_dict(self, analysis: ClinicalAnalysis) -> Dict[str, Any]:
        """Converte análise para dicionário"""
        return {
            "original_text": analysis.original_text,
            "entities": [
                {
                    "text": e.text,
                    "label": e.label,
                    "start": e.start,
                    "end": e.end,
                    "confidence": e.confidence,
                    "normalized_form": e.normalized_form,
                    "section": e.section,
                    "attributes": e.attributes
                }
                for e in analysis.entities
            ],
            "document_type": analysis.document_type,
            "sections": analysis.sections,
            "summary": analysis.summary,
            "key_findings": analysis.key_findings,
            "urgency_score": analysis.urgency_score,
            "sentiment_analysis": analysis.sentiment_analysis,
            "structured_data": analysis.structured_data,
            "quality_score": analysis.quality_score,
            "processing_metadata": analysis.processing_metadata
        }