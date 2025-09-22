"""
Medical AI Assistant Service

Este serviço implementa um assistente médico inteligente que utiliza
processamento de linguagem natural e base de conhecimento médico para
auxiliar profissionais de saúde na tomada de decisões clínicas.
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import logging

# FastAPI imports
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ML/NLP imports
try:
    import openai
    import transformers
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    import torch
    import numpy as np
    from sentence_transformers import SentenceTransformer
    import spacy
except ImportError:
    # Para desenvolvimento sem dependências
    pass

# Local imports
from .core.medical_knowledge import MedicalKnowledgeBase
from .core.nlp_processor import MedicalNLPProcessor
from .core.conversation_manager import ConversationManager
from .core.recommendation_engine import MedicalRecommendationEngine
from .utils.logging import setup_logging

# Configure logging
logger = setup_logging(__name__)

class MedicalAssistant:
    """
    Core Medical AI Assistant
    Coordena todos os componentes para fornecer assistência médica inteligente
    """
    
    def __init__(self):
        self.knowledge_base = MedicalKnowledgeBase()
        self.nlp_processor = MedicalNLPProcessor()
        self.conversation_manager = ConversationManager()
        self.recommendation_engine = MedicalRecommendationEngine()
        self.is_initialized = False
        
    async def initialize(self):
        """Inicializa todos os componentes do assistente"""
        try:
            logger.info("Initializing Medical AI Assistant...")
            
            # Initialize components
            await self.knowledge_base.initialize()
            await self.nlp_processor.initialize()
            await self.conversation_manager.initialize()
            await self.recommendation_engine.initialize()
            
            self.is_initialized = True
            logger.info("Medical AI Assistant initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Medical AI Assistant: {e}")
            raise
    
    async def process_query(self, 
                          query: str, 
                          patient_context: Optional[Dict] = None,
                          conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Processa uma consulta médica e retorna resposta inteligente
        
        Args:
            query: Pergunta ou descrição médica
            patient_context: Contexto do paciente (histórico, sintomas, etc.)
            conversation_id: ID da conversa para manter contexto
            
        Returns:
            Resposta estruturada com diagnósticos, recomendações e explicações
        """
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Extract medical entities from query
            entities = await self.nlp_processor.extract_medical_entities(query)
            
            # Get conversation context
            conversation_context = None
            if conversation_id:
                conversation_context = await self.conversation_manager.get_context(conversation_id)
            
            # Search knowledge base
            relevant_knowledge = await self.knowledge_base.search_relevant_info(
                entities, patient_context
            )
            
            # Generate recommendations
            recommendations = await self.recommendation_engine.generate_recommendations(
                query=query,
                entities=entities,
                patient_context=patient_context,
                knowledge=relevant_knowledge,
                conversation_context=conversation_context
            )
            
            # Prepare response
            response = {
                "query": query,
                "entities_found": entities,
                "recommendations": recommendations,
                "confidence_score": recommendations.get("confidence", 0.0),
                "sources": relevant_knowledge.get("sources", []),
                "follow_up_questions": self._generate_follow_up_questions(entities, recommendations),
                "timestamp": datetime.utcnow().isoformat(),
                "conversation_id": conversation_id
            }
            
            # Save to conversation history
            if conversation_id:
                await self.conversation_manager.save_interaction(
                    conversation_id, query, response
                )
            
            logger.info(f"Processed medical query successfully: {query[:50]}...")
            return response
            
        except Exception as e:
            logger.error(f"Error processing medical query: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process query: {str(e)}")
    
    async def generate_diagnostic_suggestions(self, 
                                            symptoms: List[str],
                                            patient_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gera sugestões de diagnóstico baseadas em sintomas
        
        Args:
            symptoms: Lista de sintomas relatados
            patient_info: Informações do paciente (idade, sexo, histórico, etc.)
            
        Returns:
            Sugestões de diagnóstico com probabilidades e justificativas
        """
        try:
            # Extract entities from symptoms
            symptom_entities = []
            for symptom in symptoms:
                entities = await self.nlp_processor.extract_medical_entities(symptom)
                symptom_entities.extend(entities.get("symptoms", []))
            
            # Search for related conditions
            related_conditions = await self.knowledge_base.find_conditions_by_symptoms(
                symptom_entities, patient_info
            )
            
            # Generate diagnostic probabilities
            diagnostic_suggestions = await self.recommendation_engine.calculate_diagnostic_probabilities(
                symptoms=symptom_entities,
                patient_info=patient_info,
                conditions=related_conditions
            )
            
            return {
                "symptoms_analyzed": symptom_entities,
                "diagnostic_suggestions": diagnostic_suggestions,
                "recommended_tests": self._recommend_diagnostic_tests(diagnostic_suggestions),
                "red_flags": self._identify_red_flags(symptom_entities, patient_info),
                "confidence_level": diagnostic_suggestions.get("overall_confidence", 0.0),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating diagnostic suggestions: {e}")
            raise
    
    async def suggest_treatments(self, 
                               diagnosis: str,
                               patient_info: Dict[str, Any],
                               severity: str = "moderate") -> Dict[str, Any]:
        """
        Sugere tratamentos baseados em diagnóstico
        
        Args:
            diagnosis: Diagnóstico principal
            patient_info: Informações do paciente
            severity: Severidade da condição
            
        Returns:
            Sugestões de tratamento estruturadas
        """
        try:
            # Get treatment protocols from knowledge base
            treatment_protocols = await self.knowledge_base.get_treatment_protocols(
                diagnosis, severity
            )
            
            # Consider patient-specific factors
            personalized_treatments = await self.recommendation_engine.personalize_treatments(
                protocols=treatment_protocols,
                patient_info=patient_info,
                diagnosis=diagnosis
            )
            
            return {
                "diagnosis": diagnosis,
                "severity": severity,
                "treatment_recommendations": personalized_treatments,
                "contraindications": self._check_contraindications(personalized_treatments, patient_info),
                "monitoring_requirements": self._get_monitoring_requirements(diagnosis, personalized_treatments),
                "follow_up_schedule": self._recommend_follow_up(diagnosis, severity),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error suggesting treatments: {e}")
            raise
    
    def _generate_follow_up_questions(self, entities: Dict, recommendations: Dict) -> List[str]:
        """Gera perguntas de seguimento relevantes"""
        questions = []
        
        # Based on entities found
        if "symptoms" in entities:
            questions.append("Há quanto tempo esses sintomas começaram?")
            questions.append("Os sintomas são constantes ou intermitentes?")
        
        if "medications" in entities:
            questions.append("O paciente está tomando alguma outra medicação?")
            questions.append("Houve alguma reação adversa a medicamentos no passado?")
        
        # Based on recommendations
        if recommendations.get("requires_urgent_care"):
            questions.append("Os sintomas pioraram nas últimas horas?")
            questions.append("O paciente apresenta sinais de desconforto respiratório?")
        
        return questions[:5]  # Limitar a 5 perguntas
    
    def _recommend_diagnostic_tests(self, suggestions: Dict) -> List[Dict[str, Any]]:
        """Recomenda exames diagnósticos"""
        tests = []
        
        for suggestion in suggestions.get("diagnoses", []):
            condition = suggestion.get("condition", "")
            probability = suggestion.get("probability", 0.0)
            
            if probability > 0.3:  # Alta probabilidade
                if "cardiac" in condition.lower():
                    tests.append({
                        "test": "ECG",
                        "reason": f"Suspeita de {condition}",
                        "urgency": "routine" if probability < 0.7 else "urgent"
                    })
                    tests.append({
                        "test": "Troponinas",
                        "reason": "Marcadores cardíacos",
                        "urgency": "urgent" if probability > 0.8 else "routine"
                    })
                
                elif "pulmonary" in condition.lower():
                    tests.append({
                        "test": "Raio-X de Tórax",
                        "reason": f"Investigação de {condition}",
                        "urgency": "routine"
                    })
        
        return tests
    
    def _identify_red_flags(self, symptoms: List[str], patient_info: Dict) -> List[str]:
        """Identifica red flags que requerem atenção urgente"""
        red_flags = []
        
        # Sintomas de alerta
        urgent_symptoms = [
            "chest pain", "difficulty breathing", "severe headache",
            "loss of consciousness", "severe abdominal pain"
        ]
        
        for symptom in symptoms:
            if any(urgent in symptom.lower() for urgent in urgent_symptoms):
                red_flags.append(f"Sintoma de alerta identificado: {symptom}")
        
        # Fatores de risco do paciente
        age = patient_info.get("age", 0)
        if age > 65:
            red_flags.append("Paciente idoso - maior risco de complicações")
        
        conditions = patient_info.get("medical_history", [])
        high_risk_conditions = ["diabetes", "hypertension", "heart disease"]
        for condition in conditions:
            if any(risk in condition.lower() for risk in high_risk_conditions):
                red_flags.append(f"Condição de alto risco: {condition}")
        
        return red_flags
    
    def _check_contraindications(self, treatments: Dict, patient_info: Dict) -> List[str]:
        """Verifica contraindicações para tratamentos sugeridos"""
        contraindications = []
        
        allergies = patient_info.get("allergies", [])
        medications = patient_info.get("current_medications", [])
        conditions = patient_info.get("medical_history", [])
        
        for treatment in treatments.get("medications", []):
            drug_name = treatment.get("name", "").lower()
            
            # Check allergies
            for allergy in allergies:
                if drug_name in allergy.lower():
                    contraindications.append(f"Alergia conhecida a {drug_name}")
            
            # Check drug interactions
            for med in medications:
                if self._check_drug_interaction(drug_name, med):
                    contraindications.append(f"Possível interação entre {drug_name} e {med}")
            
            # Check condition contraindications
            if "aspirin" in drug_name and any("bleeding" in cond.lower() for cond in conditions):
                contraindications.append("Aspirina contraindicada devido a histórico de sangramento")
        
        return contraindications
    
    def _check_drug_interaction(self, drug1: str, drug2: str) -> bool:
        """Verifica interação entre medicamentos (simplificado)"""
        # Esta seria uma função mais complexa consultando base de dados de interações
        known_interactions = {
            ("warfarin", "aspirin"): True,
            ("metformin", "contrast"): True,
            ("ace_inhibitor", "potassium"): True
        }
        
        return known_interactions.get((drug1.lower(), drug2.lower()), False)
    
    def _get_monitoring_requirements(self, diagnosis: str, treatments: Dict) -> List[str]:
        """Define requisitos de monitoramento"""
        monitoring = []
        
        if "diabetes" in diagnosis.lower():
            monitoring.append("Monitoramento de glicemia")
            monitoring.append("Hemoglobina glicada a cada 3 meses")
        
        if "hypertension" in diagnosis.lower():
            monitoring.append("Pressão arterial semanal")
            monitoring.append("Função renal semestral")
        
        for treatment in treatments.get("medications", []):
            drug = treatment.get("name", "").lower()
            if "warfarin" in drug:
                monitoring.append("INR semanal")
            elif "metformin" in drug:
                monitoring.append("Função renal semestral")
        
        return monitoring
    
    def _recommend_follow_up(self, diagnosis: str, severity: str) -> Dict[str, Any]:
        """Recomenda cronograma de seguimento"""
        follow_up = {
            "next_appointment": None,
            "specialist_referral": None,
            "emergency_criteria": []
        }
        
        if severity == "mild":
            follow_up["next_appointment"] = "2-4 semanas"
        elif severity == "moderate":
            follow_up["next_appointment"] = "1-2 semanas"
        elif severity == "severe":
            follow_up["next_appointment"] = "2-3 dias"
        
        # Specialist referrals
        if "cardiac" in diagnosis.lower():
            follow_up["specialist_referral"] = "Cardiologista"
        elif "diabetes" in diagnosis.lower():
            follow_up["specialist_referral"] = "Endocrinologista"
        
        # Emergency criteria
        if "chest pain" in diagnosis.lower():
            follow_up["emergency_criteria"].append("Dor torácica severa ou prolongada")
        
        return follow_up


# Pydantic models for API
class QueryRequest(BaseModel):
    query: str = Field(..., description="Medical query or question")
    patient_context: Optional[Dict[str, Any]] = Field(None, description="Patient context information")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")

class DiagnosticRequest(BaseModel):
    symptoms: List[str] = Field(..., description="List of symptoms")
    patient_info: Dict[str, Any] = Field(..., description="Patient information")

class TreatmentRequest(BaseModel):
    diagnosis: str = Field(..., description="Primary diagnosis")
    patient_info: Dict[str, Any] = Field(..., description="Patient information")
    severity: str = Field("moderate", description="Condition severity")

class AssistantResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: str
    timestamp: str


# Global assistant instance
medical_assistant = MedicalAssistant()


# FastAPI app for testing (will be integrated with main API)
app = FastAPI(
    title="Medical AI Assistant Service",
    description="Intelligent medical assistant for healthcare professionals",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize assistant on startup"""
    await medical_assistant.initialize()


@app.post("/query", response_model=AssistantResponse)
async def process_medical_query(request: QueryRequest):
    """Process a medical query"""
    try:
        result = await medical_assistant.process_query(
            query=request.query,
            patient_context=request.patient_context,
            conversation_id=request.conversation_id
        )
        
        return AssistantResponse(
            success=True,
            data=result,
            message="Query processed successfully",
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/diagnose", response_model=AssistantResponse)
async def generate_diagnostic_suggestions(request: DiagnosticRequest):
    """Generate diagnostic suggestions"""
    try:
        result = await medical_assistant.generate_diagnostic_suggestions(
            symptoms=request.symptoms,
            patient_info=request.patient_info
        )
        
        return AssistantResponse(
            success=True,
            data=result,
            message="Diagnostic suggestions generated",
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/treat", response_model=AssistantResponse)
async def suggest_treatments(request: TreatmentRequest):
    """Suggest treatments"""
    try:
        result = await medical_assistant.suggest_treatments(
            diagnosis=request.diagnosis,
            patient_info=request.patient_info,
            severity=request.severity
        )
        
        return AssistantResponse(
            success=True,
            data=result,
            message="Treatment suggestions generated",
            timestamp=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Medical AI Assistant",
        "version": "1.0.0",
        "initialized": medical_assistant.is_initialized,
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)