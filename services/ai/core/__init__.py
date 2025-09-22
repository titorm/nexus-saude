"""
Core module initialization
"""

from .medical_knowledge import MedicalKnowledgeBase
from .medical_nlp import MedicalNLPProcessor, MedicalEntity, ProcessedText, EntityType
from .conversation_manager import ConversationManager, ConversationSession, PatientContext
from .medical_recommendation import MedicalRecommendationEngine, Recommendation, TreatmentPlan

__all__ = [
    'MedicalKnowledgeBase',
    'MedicalNLPProcessor',
    'MedicalEntity',
    'ProcessedText', 
    'EntityType',
    'ConversationManager',
    'ConversationSession',
    'PatientContext',
    'MedicalRecommendationEngine',
    'Recommendation',
    'TreatmentPlan'
]