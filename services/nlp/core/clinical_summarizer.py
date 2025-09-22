"""
Clinical Summarizer
Sumarizador de textos clínicos
"""

import asyncio
import re
from typing import Dict, List, Any, Optional
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class SummaryType(Enum):
    """Tipos de sumarização"""
    EXTRACTIVE = "extractive"
    ABSTRACTIVE = "abstractive" 
    KEYWORDS = "keywords"
    BULLET_POINTS = "bullet_points"

@dataclass
class SummaryResult:
    """Resultado da sumarização"""
    summary: str
    summary_type: SummaryType
    original_length: int
    summary_length: int
    compression_ratio: float
    key_sentences: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

class ClinicalSummarizer:
    """Sumarizador especializado para textos clínicos"""
    
    def __init__(self):
        self.is_initialized = False
        self.medical_terms = self._load_medical_terms()
        self.section_weights = self._create_section_weights()
        self.sentence_scorers = self._create_sentence_scorers()
    
    async def initialize(self):
        """Inicializa o sumarizador"""
        try:
            logger.info("Initializing Clinical Summarizer...")
            self.is_initialized = True
            logger.info("Clinical Summarizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize summarizer: {e}")
            self.is_initialized = True
    
    async def summarize_text(self, 
                           text: str,
                           max_length: int = 150,
                           summary_type: str = "extractive") -> Dict[str, Any]:
        """Sumariza texto clínico"""
        if not self.is_initialized:
            await self.initialize()
        
        summary_type_enum = SummaryType(summary_type)
        
        if summary_type_enum == SummaryType.EXTRACTIVE:
            result = await self._extractive_summary(text, max_length)
        elif summary_type_enum == SummaryType.KEYWORDS:
            result = await self._keyword_summary(text, max_length)
        elif summary_type_enum == SummaryType.BULLET_POINTS:
            result = await self._bullet_point_summary(text, max_length)
        else:
            # Fallback para extractive
            result = await self._extractive_summary(text, max_length)
        
        return self._result_to_dict(result)
    
    async def _extractive_summary(self, text: str, max_length: int) -> SummaryResult:
        """Sumarização extrativa baseada em scores de sentenças"""
        sentences = self._split_sentences(text)
        
        if not sentences:
            return SummaryResult(
                summary=text[:max_length],
                summary_type=SummaryType.EXTRACTIVE,
                original_length=len(text),
                summary_length=min(len(text), max_length),
                compression_ratio=min(len(text), max_length) / len(text) if text else 0
            )
        
        # Calcular scores para cada sentença
        sentence_scores = []
        for i, sentence in enumerate(sentences):
            score = await self._score_sentence(sentence, i, sentences, text)
            sentence_scores.append((sentence, score, i))
        
        # Ordenar por score
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Selecionar sentenças até o limite de tamanho
        selected_sentences = []
        current_length = 0
        
        for sentence, score, position in sentence_scores:
            sentence_length = len(sentence)
            if current_length + sentence_length <= max_length:
                selected_sentences.append((sentence, position))
                current_length += sentence_length
            
            if current_length >= max_length * 0.9:  # 90% do limite
                break
        
        # Ordenar por posição original
        selected_sentences.sort(key=lambda x: x[1])
        
        # Criar resumo
        summary = " ".join([sentence for sentence, _ in selected_sentences])
        
        # Extrair sentenças-chave separadamente
        key_sentences = [sentence for sentence, _, _ in sentence_scores[:3]]
        
        return SummaryResult(
            summary=summary,
            summary_type=SummaryType.EXTRACTIVE,
            original_length=len(text),
            summary_length=len(summary),
            compression_ratio=len(summary) / len(text) if text else 0,
            key_sentences=key_sentences
        )
    
    async def _keyword_summary(self, text: str, max_length: int) -> SummaryResult:
        """Sumarização baseada em palavras-chave"""
        keywords = await self._extract_keywords(text)
        
        # Criar resumo com as palavras-chave mais importantes
        top_keywords = keywords[:10]
        summary = "Palavras-chave: " + ", ".join(top_keywords)
        
        if len(summary) > max_length:
            # Truncar se necessário
            summary = summary[:max_length-3] + "..."
        
        return SummaryResult(
            summary=summary,
            summary_type=SummaryType.KEYWORDS,
            original_length=len(text),
            summary_length=len(summary),
            compression_ratio=len(summary) / len(text) if text else 0,
            keywords=top_keywords
        )
    
    async def _bullet_point_summary(self, text: str, max_length: int) -> SummaryResult:
        """Sumarização em pontos principais"""
        sentences = self._split_sentences(text)
        
        # Identificar sentenças importantes
        important_sentences = []
        for sentence in sentences:
            score = await self._score_sentence(sentence, 0, sentences, text)
            if score > 0.5:  # Threshold para importância
                important_sentences.append(sentence)
        
        # Criar bullet points
        bullet_points = []
        current_length = 0
        
        for sentence in important_sentences[:5]:  # Máximo 5 pontos
            # Simplificar a sentença
            simplified = self._simplify_sentence(sentence)
            point = f"• {simplified}"
            
            if current_length + len(point) <= max_length:
                bullet_points.append(point)
                current_length += len(point) + 1  # +1 para quebra de linha
        
        summary = "\n".join(bullet_points)
        
        return SummaryResult(
            summary=summary,
            summary_type=SummaryType.BULLET_POINTS,
            original_length=len(text),
            summary_length=len(summary),
            compression_ratio=len(summary) / len(text) if text else 0
        )
    
    async def _score_sentence(self, sentence: str, position: int, 
                            all_sentences: List[str], full_text: str) -> float:
        """Calcula score de uma sentença"""
        score = 0.0
        sentence_lower = sentence.lower()
        
        # 1. Score baseado em termos médicos importantes
        medical_term_score = 0
        for term in self.medical_terms:
            if term in sentence_lower:
                medical_term_score += 1
        
        if len(sentence.split()) > 0:
            medical_density = medical_term_score / len(sentence.split())
            score += medical_density * 0.4
        
        # 2. Score baseado na posição (início e fim são mais importantes)
        position_score = 0
        total_sentences = len(all_sentences)
        if position < total_sentences * 0.2:  # Primeiro 20%
            position_score = 0.8
        elif position > total_sentences * 0.8:  # Último 20%
            position_score = 0.6
        else:
            position_score = 0.3
        
        score += position_score * 0.2
        
        # 3. Score baseado no tamanho (nem muito curta nem muito longa)
        length_score = 0
        word_count = len(sentence.split())
        if 5 <= word_count <= 25:
            length_score = 1.0
        elif word_count < 5:
            length_score = 0.3
        else:
            length_score = 0.6
        
        score += length_score * 0.1
        
        # 4. Score baseado em palavras-chave clínicas
        clinical_keywords = [
            "diagnosis", "treatment", "patient", "condition", "symptom",
            "procedure", "medication", "result", "finding",
            "diagnóstico", "tratamento", "paciente", "condição", "sintoma"
        ]
        
        keyword_score = sum(1 for keyword in clinical_keywords if keyword in sentence_lower)
        score += min(keyword_score * 0.1, 0.3)
        
        # 5. Penalizar sentenças muito técnicas ou com muitos números
        technical_penalty = 0
        if len(re.findall(r'\d+', sentence)) > 5:
            technical_penalty = 0.2
        
        score -= technical_penalty
        
        return max(score, 0.0)
    
    async def _extract_keywords(self, text: str) -> List[str]:
        """Extrai palavras-chave do texto"""
        words = text.lower().split()
        
        # Filtrar palavras comuns
        stop_words = {
            "the", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "up", "about", "into", "through",
            "during", "before", "after", "above", "below", "between",
            "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "must", "can",
            "o", "a", "e", "de", "do", "da", "em", "para", "com", "por",
            "que", "não", "se", "um", "uma", "como", "mais", "muito"
        }
        
        # Contar frequência das palavras
        word_freq = {}
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word)
            if len(clean_word) > 2 and clean_word not in stop_words:
                word_freq[clean_word] = word_freq.get(clean_word, 0) + 1
        
        # Priorizar termos médicos
        medical_keywords = []
        other_keywords = []
        
        for word, freq in word_freq.items():
            if word in self.medical_terms:
                medical_keywords.append((word, freq * 2))  # Boost médico
            else:
                other_keywords.append((word, freq))
        
        # Combinar e ordenar
        all_keywords = medical_keywords + other_keywords
        all_keywords.sort(key=lambda x: x[1], reverse=True)
        
        return [word for word, _ in all_keywords]
    
    def _split_sentences(self, text: str) -> List[str]:
        """Divide texto em sentenças"""
        # Padrão simples para divisão de sentenças
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s) > 10]
        return sentences
    
    def _simplify_sentence(self, sentence: str) -> str:
        """Simplifica uma sentença para bullet point"""
        # Remover palavras desnecessárias do início
        sentence = re.sub(r'^(the patient|patient|the)\s+', '', sentence, flags=re.IGNORECASE)
        
        # Truncar se muito longa
        if len(sentence) > 80:
            sentence = sentence[:77] + "..."
        
        return sentence.strip()
    
    def _load_medical_terms(self) -> List[str]:
        """Carrega termos médicos importantes"""
        return [
            # Condições
            "diabetes", "hypertension", "pneumonia", "asthma", "cancer",
            "infection", "inflammation", "disease", "syndrome", "disorder",
            
            # Sintomas
            "pain", "fever", "cough", "headache", "nausea", "fatigue",
            "shortness", "breath", "dizziness", "weakness",
            
            # Procedimentos
            "surgery", "procedure", "examination", "test", "scan",
            "biopsy", "treatment", "therapy", "medication",
            
            # Anatomia
            "heart", "lung", "liver", "kidney", "brain", "blood",
            "chest", "abdomen", "extremity",
            
            # Termos clínicos
            "patient", "diagnosis", "treatment", "condition", "symptom",
            "finding", "result", "normal", "abnormal", "positive", "negative",
            
            # Português
            "paciente", "diagnóstico", "tratamento", "condição", "sintoma",
            "resultado", "normal", "anormal", "positivo", "negativo",
            "dor", "febre", "tosse", "cefaleia", "náusea", "fadiga"
        ]
    
    def _create_section_weights(self) -> Dict[str, float]:
        """Cria pesos para diferentes seções"""
        return {
            "assessment": 0.9,
            "impression": 0.9,
            "plan": 0.8,
            "findings": 0.7,
            "history": 0.6,
            "examination": 0.6,
            "background": 0.4
        }
    
    def _create_sentence_scorers(self) -> Dict[str, callable]:
        """Cria funções de scoring para sentenças"""
        return {
            "medical_terms": lambda s: sum(1 for term in self.medical_terms if term in s.lower()),
            "numbers": lambda s: len(re.findall(r'\d+', s)),
            "length": lambda s: len(s.split()),
            "clinical_keywords": lambda s: sum(1 for kw in ["diagnosis", "treatment", "patient"] if kw in s.lower())
        }
    
    def _result_to_dict(self, result: SummaryResult) -> Dict[str, Any]:
        """Converte resultado para dicionário"""
        return {
            "summary": result.summary,
            "summary_type": result.summary_type.value,
            "original_length": result.original_length,
            "summary_length": result.summary_length,
            "compression_ratio": result.compression_ratio,
            "key_sentences": result.key_sentences,
            "keywords": result.keywords
        }