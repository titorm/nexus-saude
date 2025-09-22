"""
Core NLP modules
Módulos principais para processamento de linguagem natural
"""

from .clinical_nlp_processor import ClinicalNLPProcessor
from .document_classifier import DocumentClassifier
from .medical_entity_extractor import MedicalEntityExtractor
from .clinical_summarizer import ClinicalSummarizer
from .structured_data_extractor import StructuredDataExtractor

__all__ = [
    "ClinicalNLPProcessor",
    "DocumentClassifier", 
    "MedicalEntityExtractor",
    "ClinicalSummarizer",
    "StructuredDataExtractor"
]