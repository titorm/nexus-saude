"""
Document Classifier
Classificador de documentos clínicos
"""

import asyncio
import re
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class DocumentType(Enum):
    """Tipos de documento"""
    ADMISSION_NOTE = "admission_note"
    DISCHARGE_SUMMARY = "discharge_summary"
    PROGRESS_NOTE = "progress_note"
    CONSULTATION = "consultation"
    PROCEDURE_NOTE = "procedure_note"
    LABORATORY_REPORT = "laboratory_report"
    RADIOLOGY_REPORT = "radiology_report"
    PATHOLOGY_REPORT = "pathology_report"
    NURSING_NOTE = "nursing_note"
    GENERAL = "general"

@dataclass
class ClassificationResult:
    """Resultado da classificação"""
    document_type: DocumentType
    confidence: float
    alternative_types: List[Tuple[DocumentType, float]]
    features_found: List[str]
    reasoning: str

class DocumentClassifier:
    """
    Classificador de documentos clínicos baseado em padrões e características
    """
    
    def __init__(self):
        self.is_initialized = False
        self.classification_rules = self._create_classification_rules()
        self.feature_extractors = self._create_feature_extractors()
        self.confidence_weights = self._create_confidence_weights()
    
    async def initialize(self):
        """Inicializa o classificador"""
        try:
            logger.info("Initializing Document Classifier...")
            
            # Carregar regras e padrões
            await self._load_classification_patterns()
            
            self.is_initialized = True
            logger.info("Document Classifier initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize classifier: {e}")
            self.is_initialized = True  # Continue com regras básicas
    
    async def classify_document(self, 
                              text: str,
                              include_categories: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Classifica um documento clínico
        """
        if not self.is_initialized:
            await self.initialize()
        
        logger.info("Classifying clinical document")
        
        # Extrair características do texto
        features = await self._extract_features(text)
        
        # Calcular scores para cada tipo de documento
        type_scores = {}
        
        for doc_type in DocumentType:
            if include_categories and doc_type.value not in include_categories:
                continue
                
            score = await self._calculate_type_score(text, features, doc_type)
            type_scores[doc_type] = score
        
        # Ordenar por score
        sorted_scores = sorted(type_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Melhor classificação
        best_type, best_score = sorted_scores[0]
        
        # Tipos alternativos
        alternatives = [(doc_type, score) for doc_type, score in sorted_scores[1:4]]
        
        # Gerar explicação
        reasoning = await self._generate_reasoning(text, features, best_type, best_score)
        
        result = ClassificationResult(
            document_type=best_type,
            confidence=best_score,
            alternative_types=alternatives,
            features_found=features,
            reasoning=reasoning
        )
        
        return self._result_to_dict(result)
    
    async def _extract_features(self, text: str) -> List[str]:
        """Extrai características do texto"""
        features = []
        text_lower = text.lower()
        
        # Características estruturais
        for feature_name, extractor in self.feature_extractors.items():
            if extractor(text, text_lower):
                features.append(feature_name)
        
        return features
    
    async def _calculate_type_score(self, text: str, features: List[str], 
                                  doc_type: DocumentType) -> float:
        """Calcula score para um tipo de documento"""
        score = 0.0
        text_lower = text.lower()
        
        # Regras específicas para cada tipo
        rules = self.classification_rules.get(doc_type, {})
        
        # Keywords positivas
        positive_keywords = rules.get("positive_keywords", [])
        for keyword in positive_keywords:
            if keyword in text_lower:
                score += rules.get("keyword_weight", 1.0)
        
        # Keywords negativas
        negative_keywords = rules.get("negative_keywords", [])
        for keyword in negative_keywords:
            if keyword in text_lower:
                score -= 0.5
        
        # Padrões estruturais
        structural_patterns = rules.get("structural_patterns", [])
        for pattern in structural_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                score += 2.0
        
        # Features específicas
        required_features = rules.get("required_features", [])
        for feature in required_features:
            if feature in features:
                score += 1.5
        
        # Bonus features
        bonus_features = rules.get("bonus_features", [])
        for feature in bonus_features:
            if feature in features:
                score += 0.5
        
        # Normalizar score (0-1)
        max_possible_score = (
            len(positive_keywords) * rules.get("keyword_weight", 1.0) +
            len(structural_patterns) * 2.0 +
            len(required_features) * 1.5 +
            len(bonus_features) * 0.5
        )
        
        if max_possible_score > 0:
            score = min(score / max_possible_score, 1.0)
        
        return max(score, 0.0)
    
    async def _generate_reasoning(self, text: str, features: List[str],
                                best_type: DocumentType, confidence: float) -> str:
        """Gera explicação da classificação"""
        
        reasoning_parts = []
        
        # Confiança
        if confidence > 0.8:
            reasoning_parts.append("Alta confiança na classificação")
        elif confidence > 0.6:
            reasoning_parts.append("Confiança moderada na classificação")
        else:
            reasoning_parts.append("Baixa confiança na classificação")
        
        # Features encontradas
        relevant_features = self._get_relevant_features_for_type(best_type, features)
        if relevant_features:
            reasoning_parts.append(f"Características identificadas: {', '.join(relevant_features)}")
        
        # Keywords específicas
        rules = self.classification_rules.get(best_type, {})
        found_keywords = []
        text_lower = text.lower()
        
        for keyword in rules.get("positive_keywords", [])[:3]:  # Top 3
            if keyword in text_lower:
                found_keywords.append(keyword)
        
        if found_keywords:
            reasoning_parts.append(f"Palavras-chave encontradas: {', '.join(found_keywords)}")
        
        return ". ".join(reasoning_parts)
    
    def _create_classification_rules(self) -> Dict[DocumentType, Dict[str, Any]]:
        """Cria regras de classificação para cada tipo"""
        return {
            DocumentType.ADMISSION_NOTE: {
                "positive_keywords": [
                    "admission", "admissão", "internação", "chief complaint",
                    "queixa principal", "admit", "entering", "hospital course"
                ],
                "negative_keywords": [
                    "discharge", "alta", "follow-up", "outpatient"
                ],
                "structural_patterns": [
                    r"chief complaint:?",
                    r"history of present illness:?",
                    r"queixa principal:?",
                    r"admission date:?"
                ],
                "required_features": [
                    "has_chief_complaint",
                    "has_history_section"
                ],
                "bonus_features": [
                    "has_admission_date",
                    "has_vital_signs"
                ],
                "keyword_weight": 1.5
            },
            
            DocumentType.DISCHARGE_SUMMARY: {
                "positive_keywords": [
                    "discharge", "alta", "summary", "resumo", "discharged",
                    "follow-up", "instructions", "home", "disposition"
                ],
                "negative_keywords": [
                    "admission", "admissão", "emergency"
                ],
                "structural_patterns": [
                    r"discharge\s+(?:summary|date|instructions)",
                    r"hospital course:?",
                    r"discharge\s+medications:?",
                    r"follow\s*-?\s*up:?"
                ],
                "required_features": [
                    "has_discharge_info",
                    "has_medications"
                ],
                "bonus_features": [
                    "has_follow_up",
                    "has_instructions"
                ],
                "keyword_weight": 1.8
            },
            
            DocumentType.PROGRESS_NOTE: {
                "positive_keywords": [
                    "progress", "evolução", "daily", "rounds", "soap",
                    "subjective", "objective", "assessment", "plan"
                ],
                "structural_patterns": [
                    r"subjective:?",
                    r"objective:?", 
                    r"assessment:?",
                    r"plan:?",
                    r"progress\s+note:?"
                ],
                "required_features": [
                    "has_soap_structure",
                    "has_assessment"
                ],
                "bonus_features": [
                    "has_vital_signs",
                    "has_plan"
                ],
                "keyword_weight": 1.2
            },
            
            DocumentType.CONSULTATION: {
                "positive_keywords": [
                    "consultation", "consulta", "opinion", "specialist",
                    "recommend", "evaluation", "consult", "referral"
                ],
                "structural_patterns": [
                    r"consultation\s+(?:note|report):?",
                    r"reason\s+for\s+consultation:?",
                    r"specialist\s+opinion:?",
                    r"recommendations:?"
                ],
                "required_features": [
                    "has_consultation_reason",
                    "has_recommendations"
                ],
                "bonus_features": [
                    "has_specialist_info",
                    "has_referral_info"
                ],
                "keyword_weight": 1.6
            },
            
            DocumentType.PROCEDURE_NOTE: {
                "positive_keywords": [
                    "procedure", "procedimento", "operation", "surgery",
                    "cirurgia", "operative", "technique", "performed"
                ],
                "structural_patterns": [
                    r"procedure\s+(?:performed|note):?",
                    r"operative\s+(?:note|report):?",
                    r"technique:?",
                    r"complications:?",
                    r"post\s*-?\s*operative:?"
                ],
                "required_features": [
                    "has_procedure_info",
                    "has_technique"
                ],
                "bonus_features": [
                    "has_complications",
                    "has_post_op"
                ],
                "keyword_weight": 2.0
            },
            
            DocumentType.LABORATORY_REPORT: {
                "positive_keywords": [
                    "laboratory", "lab", "result", "test", "análise",
                    "exame", "culture", "specimen", "value"
                ],
                "structural_patterns": [
                    r"lab\s+(?:results?|values?):?",
                    r"laboratory\s+(?:report|results?):?",
                    r"specimen:?",
                    r"culture\s+results?:?"
                ],
                "required_features": [
                    "has_lab_values",
                    "has_numeric_data"
                ],
                "bonus_features": [
                    "has_reference_ranges",
                    "has_abnormal_flags"
                ],
                "keyword_weight": 1.8
            },
            
            DocumentType.RADIOLOGY_REPORT: {
                "positive_keywords": [
                    "radiology", "imaging", "xray", "ct", "mri", "ultrasound",
                    "radiologia", "imagem", "raio-x", "tomografia", "ressonância"
                ],
                "structural_patterns": [
                    r"(?:ct|mri|xray|ultrasound)\s+(?:report|study):?",
                    r"imaging\s+(?:findings|impression):?",
                    r"radiologic\s+(?:findings|impression):?",
                    r"technique:?"
                ],
                "required_features": [
                    "has_imaging_findings",
                    "has_impression"
                ],
                "bonus_features": [
                    "has_technique_info",
                    "has_comparison"
                ],
                "keyword_weight": 2.0
            }
        }
    
    def _create_feature_extractors(self) -> Dict[str, callable]:
        """Cria extratores de características"""
        return {
            "has_chief_complaint": lambda text, text_lower: bool(
                re.search(r"chief complaint:?|cc:|queixa principal:?", text_lower)
            ),
            
            "has_history_section": lambda text, text_lower: bool(
                re.search(r"history of present illness:?|hpi:|história:?", text_lower)
            ),
            
            "has_soap_structure": lambda text, text_lower: bool(
                all(section in text_lower for section in ["subjective", "objective", "assessment", "plan"])
            ),
            
            "has_discharge_info": lambda text, text_lower: bool(
                re.search(r"discharge|alta|discharged", text_lower)
            ),
            
            "has_medications": lambda text, text_lower: bool(
                re.search(r"medication|medicine|drug|medicação|remédio", text_lower)
            ),
            
            "has_vital_signs": lambda text, text_lower: bool(
                re.search(r"bp|hr|temp|rr|vital|blood pressure|heart rate", text_lower)
            ),
            
            "has_lab_values": lambda text, text_lower: bool(
                re.search(r"\d+\.?\d*\s*(?:mg/dl|mmol/l|%|units?)", text_lower)
            ),
            
            "has_numeric_data": lambda text, text_lower: bool(
                len(re.findall(r"\d+\.?\d+", text)) > 3
            ),
            
            "has_procedure_info": lambda text, text_lower: bool(
                re.search(r"procedure|operation|surgery|technique", text_lower)
            ),
            
            "has_consultation_reason": lambda text, text_lower: bool(
                re.search(r"reason for consultation|consulta|referral", text_lower)
            ),
            
            "has_recommendations": lambda text, text_lower: bool(
                re.search(r"recommend|suggest|advise|opinion", text_lower)
            ),
            
            "has_imaging_findings": lambda text, text_lower: bool(
                re.search(r"findings?|impression|visualized|demonstrates", text_lower)
            ),
            
            "has_assessment": lambda text, text_lower: bool(
                re.search(r"assessment:?|impression:?|diagnosis:?", text_lower)
            ),
            
            "has_plan": lambda text, text_lower: bool(
                re.search(r"plan:?|treatment:?|management:?", text_lower)
            ),
            
            "has_follow_up": lambda text, text_lower: bool(
                re.search(r"follow\s*-?\s*up|return|next visit", text_lower)
            ),
            
            "has_admission_date": lambda text, text_lower: bool(
                re.search(r"admission date|admitted|date of admission", text_lower)
            ),
            
            "has_technique": lambda text, text_lower: bool(
                re.search(r"technique:?|method:?|approach:?", text_lower)
            ),
            
            "has_complications": lambda text, text_lower: bool(
                re.search(r"complication|adverse|problem", text_lower)
            ),
            
            "has_instructions": lambda text, text_lower: bool(
                re.search(r"instruction|discharge instruction|orientação", text_lower)
            ),
            
            "has_impression": lambda text, text_lower: bool(
                re.search(r"impression:?|conclusion:?|findings:?", text_lower)
            ),
            
            "has_reference_ranges": lambda text, text_lower: bool(
                re.search(r"normal\s+range|reference|normal:", text_lower)
            ),
            
            "has_abnormal_flags": lambda text, text_lower: bool(
                re.search(r"abnormal|elevated|decreased|high|low|\*", text_lower)
            ),
            
            "has_specialist_info": lambda text, text_lower: bool(
                re.search(r"specialist|cardiology|neurology|oncology", text_lower)
            ),
            
            "has_referral_info": lambda text, text_lower: bool(
                re.search(r"referral|refer|consultation request", text_lower)
            ),
            
            "has_technique_info": lambda text, text_lower: bool(
                re.search(r"technique|contrast|without contrast|protocol", text_lower)
            ),
            
            "has_comparison": lambda text, text_lower: bool(
                re.search(r"comparison|compared|prior|previous", text_lower)
            ),
            
            "has_post_op": lambda text, text_lower: bool(
                re.search(r"post\s*-?\s*operative|post\s*-?\s*op|recovery", text_lower)
            )
        }
    
    def _create_confidence_weights(self) -> Dict[str, float]:
        """Cria pesos de confiança"""
        return {
            "structural_pattern_match": 0.4,
            "keyword_density": 0.3,
            "feature_completeness": 0.2,
            "document_length": 0.1
        }
    
    async def _load_classification_patterns(self):
        """Carrega padrões de classificação"""
        # Aqui você poderia carregar padrões de arquivo ou banco de dados
        logger.info("Classification patterns loaded")
    
    def _get_relevant_features_for_type(self, doc_type: DocumentType, 
                                      features: List[str]) -> List[str]:
        """Obtém features relevantes para um tipo de documento"""
        rules = self.classification_rules.get(doc_type, {})
        required_features = rules.get("required_features", [])
        bonus_features = rules.get("bonus_features", [])
        
        relevant = []
        for feature in features:
            if feature in required_features or feature in bonus_features:
                relevant.append(feature)
        
        return relevant
    
    def _result_to_dict(self, result: ClassificationResult) -> Dict[str, Any]:
        """Converte resultado para dicionário"""
        return {
            "document_type": result.document_type.value,
            "confidence": result.confidence,
            "alternative_types": [
                {"type": doc_type.value, "confidence": conf}
                for doc_type, conf in result.alternative_types
            ],
            "features_found": result.features_found,
            "reasoning": result.reasoning
        }