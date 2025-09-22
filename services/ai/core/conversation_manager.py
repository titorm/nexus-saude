"""
Conversation Manager
Gerenciador de conversas do assistente médico
"""

import uuid
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import logging
import json

logger = logging.getLogger(__name__)

class ConversationState(Enum):
    """Estados da conversa"""
    INITIAL = "initial"
    GATHERING_SYMPTOMS = "gathering_symptoms"
    CLARIFYING = "clarifying"
    PROVIDING_GUIDANCE = "providing_guidance"
    FOLLOW_UP = "follow_up"
    COMPLETED = "completed"
    EMERGENCY = "emergency"

class MessageType(Enum):
    """Tipos de mensagem"""
    USER_QUERY = "user_query"
    ASSISTANT_RESPONSE = "assistant_response"
    SYSTEM_PROMPT = "system_prompt"
    CLARIFICATION_REQUEST = "clarification_request"
    RECOMMENDATION = "recommendation"
    EMERGENCY_ALERT = "emergency_alert"

@dataclass
class ConversationMessage:
    """Mensagem na conversa"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.now)
    type: MessageType = MessageType.USER_QUERY
    content: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    processed_entities: List[Dict] = field(default_factory=list)
    confidence_score: float = 0.0

@dataclass
class PatientContext:
    """Contexto do paciente na conversa"""
    age: Optional[int] = None
    sex: Optional[str] = None
    medical_history: List[str] = field(default_factory=list)
    current_medications: List[str] = field(default_factory=list)
    allergies: List[str] = field(default_factory=list)
    symptoms: List[str] = field(default_factory=list)
    chief_complaint: Optional[str] = None
    urgency_level: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class ConversationSession:
    """Sessão de conversa"""
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    state: ConversationState = ConversationState.INITIAL
    messages: List[ConversationMessage] = field(default_factory=list)
    patient_context: PatientContext = field(default_factory=PatientContext)
    follow_up_questions: List[str] = field(default_factory=list)
    recommendations: List[Dict[str, Any]] = field(default_factory=list)
    is_active: bool = True
    session_summary: Optional[str] = None

class ConversationManager:
    """
    Gerenciador de conversas que mantém contexto e estado
    Responsável por:
    - Gerenciar sessões de conversa
    - Manter contexto do paciente
    - Determinar fluxo da conversa
    - Gerar perguntas de follow-up
    - Detectar emergências
    """
    
    def __init__(self, session_timeout_minutes: int = 30):
        self.sessions: Dict[str, ConversationSession] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)
        self.conversation_flows = self._define_conversation_flows()
        self.emergency_keywords = self._load_emergency_keywords()
        self.clarifying_questions = self._load_clarifying_questions()
    
    async def start_session(self, initial_message: str = "", 
                           patient_info: Optional[Dict[str, Any]] = None) -> ConversationSession:
        """Inicia uma nova sessão de conversa"""
        session = ConversationSession()
        
        # Configurar contexto inicial do paciente
        if patient_info:
            session.patient_context.age = patient_info.get("age")
            session.patient_context.sex = patient_info.get("sex")
            session.patient_context.medical_history = patient_info.get("medical_history", [])
            session.patient_context.current_medications = patient_info.get("medications", [])
            session.patient_context.allergies = patient_info.get("allergies", [])
        
        # Adicionar mensagem inicial se fornecida
        if initial_message:
            await self.add_message(session.session_id, initial_message, MessageType.USER_QUERY)
        
        self.sessions[session.session_id] = session
        
        logger.info(f"Started new conversation session: {session.session_id}")
        return session
    
    async def add_message(self, session_id: str, content: str, 
                         message_type: MessageType, 
                         metadata: Optional[Dict[str, Any]] = None) -> ConversationMessage:
        """Adiciona mensagem à sessão"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        message = ConversationMessage(
            type=message_type,
            content=content,
            metadata=metadata or {}
        )
        
        session.messages.append(message)
        session.last_activity = datetime.now()
        
        # Atualizar estado baseado na mensagem
        await self._update_session_state(session, message)
        
        logger.debug(f"Added message to session {session_id}: {message_type}")
        return message
    
    async def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """Obtém sessão por ID"""
        session = self.sessions.get(session_id)
        
        if session and self._is_session_expired(session):
            await self.end_session(session_id)
            return None
        
        return session
    
    async def update_patient_context(self, session_id: str, 
                                   context_updates: Dict[str, Any]) -> PatientContext:
        """Atualiza contexto do paciente"""
        session = await self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Atualizar campos do contexto
        for field, value in context_updates.items():
            if hasattr(session.patient_context, field):
                if field in ["symptoms", "medical_history", "current_medications", "allergies"]:
                    # Para listas, adicionar sem duplicar
                    current_list = getattr(session.patient_context, field)
                    if isinstance(value, list):
                        for item in value:
                            if item not in current_list:
                                current_list.append(item)
                    elif value not in current_list:
                        current_list.append(value)
                else:
                    setattr(session.patient_context, field, value)
        
        session.patient_context.last_updated = datetime.now()
        
        # Recalcular nível de urgência
        session.patient_context.urgency_level = await self._calculate_urgency_level(session)
        
        logger.debug(f"Updated patient context for session {session_id}")
        return session.patient_context
    
    async def get_next_questions(self, session_id: str) -> List[str]:
        """Gera próximas perguntas baseadas no estado da conversa"""
        session = await self.get_session(session_id)
        if not session:
            return []
        
        questions = []
        
        # Baseado no estado atual
        if session.state == ConversationState.INITIAL:
            questions = [
                "Pode me contar qual é o principal motivo da sua consulta hoje?",
                "Há quanto tempo você está sentindo esses sintomas?",
                "Em uma escala de 1 a 10, como você classificaria seu desconforto?"
            ]
        
        elif session.state == ConversationState.GATHERING_SYMPTOMS:
            questions = await self._generate_symptom_questions(session)
        
        elif session.state == ConversationState.CLARIFYING:
            questions = await self._generate_clarifying_questions(session)
        
        elif session.state == ConversationState.FOLLOW_UP:
            questions = [
                "Como você está se sentindo agora?",
                "Os sintomas melhoraram, pioraram ou permanecem iguais?",
                "Você seguiu as recomendações anteriores?"
            ]
        
        # Filtrar perguntas já feitas
        asked_questions = [msg.content for msg in session.messages 
                          if msg.type == MessageType.CLARIFICATION_REQUEST]
        questions = [q for q in questions if q not in asked_questions]
        
        return questions[:3]  # Limitar a 3 perguntas
    
    async def detect_emergency(self, session_id: str, message_content: str) -> Tuple[bool, float, List[str]]:
        """Detecta situações de emergência"""
        session = await self.get_session(session_id)
        if not session:
            return False, 0.0, []
        
        emergency_score = 0.0
        triggered_keywords = []
        
        content_lower = message_content.lower()
        
        # Verificar palavras-chave de emergência
        for keyword, weight in self.emergency_keywords.items():
            if keyword in content_lower:
                emergency_score += weight
                triggered_keywords.append(keyword)
        
        # Verificar contexto do paciente
        if session.patient_context.urgency_level > 0.7:
            emergency_score += 0.3
        
        # Combinações críticas de sintomas
        symptoms = session.patient_context.symptoms
        critical_combinations = [
            (["chest pain", "shortness of breath"], 0.8),
            (["severe headache", "confusion"], 0.7),
            (["abdominal pain", "vomiting blood"], 0.9),
            (["difficulty breathing", "wheezing"], 0.6)
        ]
        
        for combination, weight in critical_combinations:
            if all(symptom in " ".join(symptoms).lower() for symptom in combination):
                emergency_score += weight
                triggered_keywords.extend(combination)
        
        is_emergency = emergency_score > 0.6
        
        if is_emergency:
            session.state = ConversationState.EMERGENCY
            await self.add_message(
                session_id, 
                "Situação de emergência detectada",
                MessageType.EMERGENCY_ALERT,
                {"emergency_score": emergency_score, "triggers": triggered_keywords}
            )
        
        return is_emergency, emergency_score, triggered_keywords
    
    async def generate_session_summary(self, session_id: str) -> str:
        """Gera resumo da sessão"""
        session = await self.get_session(session_id)
        if not session:
            return ""
        
        summary_parts = []
        
        # Informações do paciente
        ctx = session.patient_context
        if ctx.age or ctx.sex:
            demographic = f"Paciente: {ctx.sex or 'N/A'}, {ctx.age or 'N/A'} anos"
            summary_parts.append(demographic)
        
        # Queixa principal
        if ctx.chief_complaint:
            summary_parts.append(f"Queixa principal: {ctx.chief_complaint}")
        
        # Sintomas
        if ctx.symptoms:
            symptoms_text = ", ".join(ctx.symptoms[:5])  # Primeiros 5 sintomas
            summary_parts.append(f"Sintomas: {symptoms_text}")
        
        # Histórico médico relevante
        if ctx.medical_history:
            history_text = ", ".join(ctx.medical_history[:3])
            summary_parts.append(f"Histórico: {history_text}")
        
        # Medicações atuais
        if ctx.current_medications:
            meds_text = ", ".join(ctx.current_medications[:3])
            summary_parts.append(f"Medicações: {meds_text}")
        
        # Nível de urgência
        if ctx.urgency_level > 0.3:
            urgency_text = "alta" if ctx.urgency_level > 0.7 else "moderada"
            summary_parts.append(f"Urgência: {urgency_text}")
        
        # Recomendações
        if session.recommendations:
            rec_count = len(session.recommendations)
            summary_parts.append(f"Recomendações: {rec_count} fornecidas")
        
        summary = " | ".join(summary_parts)
        session.session_summary = summary
        
        return summary
    
    async def end_session(self, session_id: str) -> bool:
        """Encerra sessão"""
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        session.is_active = False
        session.state = ConversationState.COMPLETED
        
        # Gerar resumo final
        await self.generate_session_summary(session_id)
        
        logger.info(f"Ended conversation session: {session_id}")
        return True
    
    async def cleanup_expired_sessions(self):
        """Remove sessões expiradas"""
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if self._is_session_expired(session):
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            await self.end_session(session_id)
            del self.sessions[session_id]
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
    
    def _is_session_expired(self, session: ConversationSession) -> bool:
        """Verifica se sessão expirou"""
        if not session.is_active:
            return True
        
        time_since_activity = datetime.now() - session.last_activity
        return time_since_activity > self.session_timeout
    
    async def _update_session_state(self, session: ConversationSession, 
                                  message: ConversationMessage):
        """Atualiza estado da sessão baseado na mensagem"""
        if message.type == MessageType.USER_QUERY:
            # Lógica para determinar próximo estado
            if session.state == ConversationState.INITIAL:
                session.state = ConversationState.GATHERING_SYMPTOMS
            elif session.state == ConversationState.GATHERING_SYMPTOMS:
                # Se temos informações suficientes, passar para orientação
                if len(session.patient_context.symptoms) >= 2:
                    session.state = ConversationState.PROVIDING_GUIDANCE
                else:
                    session.state = ConversationState.CLARIFYING
        
        elif message.type == MessageType.EMERGENCY_ALERT:
            session.state = ConversationState.EMERGENCY
    
    async def _calculate_urgency_level(self, session: ConversationSession) -> float:
        """Calcula nível de urgência baseado no contexto"""
        urgency = 0.0
        
        # Baseado em sintomas
        high_urgency_symptoms = [
            "chest pain", "difficulty breathing", "severe headache",
            "loss of consciousness", "severe bleeding",
            "dor no peito", "dificuldade para respirar", "cefaleia severa"
        ]
        
        for symptom in session.patient_context.symptoms:
            if any(urgent in symptom.lower() for urgent in high_urgency_symptoms):
                urgency += 0.3
        
        # Baseado em idade
        if session.patient_context.age:
            if session.patient_context.age > 65 or session.patient_context.age < 2:
                urgency += 0.2
        
        # Baseado em histórico médico
        high_risk_conditions = [
            "diabetes", "hypertension", "heart disease", "cancer",
            "diabetes", "hipertensão", "doença cardíaca", "câncer"
        ]
        
        for condition in session.patient_context.medical_history:
            if any(risk in condition.lower() for risk in high_risk_conditions):
                urgency += 0.1
        
        return min(urgency, 1.0)
    
    async def _generate_symptom_questions(self, session: ConversationSession) -> List[str]:
        """Gera perguntas para coletar mais sintomas"""
        questions = []
        
        current_symptoms = session.patient_context.symptoms
        
        # Perguntas baseadas em sintomas existentes
        if "pain" in " ".join(current_symptoms).lower():
            questions.extend([
                "Pode descrever melhor a dor? É aguda, pulsátil, queimação?",
                "A dor irradia para outras partes do corpo?",
                "O que piora ou melhora a dor?"
            ])
        
        if "fever" in " ".join(current_symptoms).lower():
            questions.extend([
                "Mediu a temperatura? Qual foi o valor?",
                "A febre vem acompanhada de calafrios?",
                "Há quanto tempo está com febre?"
            ])
        
        # Perguntas gerais se poucos sintomas
        if len(current_symptoms) < 2:
            questions.extend([
                "Está sentindo alguma dor? Se sim, onde?",
                "Tem notado febre ou calafrios?",
                "Houve mudanças no apetite ou sono?"
            ])
        
        return questions
    
    async def _generate_clarifying_questions(self, session: ConversationSession) -> List[str]:
        """Gera perguntas de esclarecimento"""
        questions = []
        
        ctx = session.patient_context
        
        # Perguntas sobre duração
        if not any("há quanto tempo" in msg.content.lower() 
                  for msg in session.messages):
            questions.append("Há quanto tempo esses sintomas começaram?")
        
        # Perguntas sobre severidade
        if not any("escala" in msg.content.lower() 
                  for msg in session.messages):
            questions.append("Em uma escala de 1 a 10, qual a intensidade dos sintomas?")
        
        # Perguntas sobre fatores desencadeantes
        questions.extend([
            "Algo específico desencadeou esses sintomas?",
            "Os sintomas pioram em algum momento específico do dia?",
            "Você tentou algum tratamento em casa?"
        ])
        
        return questions
    
    def _define_conversation_flows(self) -> Dict[str, Any]:
        """Define fluxos de conversa"""
        return {
            "standard_consultation": [
                ConversationState.INITIAL,
                ConversationState.GATHERING_SYMPTOMS,
                ConversationState.CLARIFYING,
                ConversationState.PROVIDING_GUIDANCE,
                ConversationState.FOLLOW_UP,
                ConversationState.COMPLETED
            ],
            "emergency_flow": [
                ConversationState.INITIAL,
                ConversationState.EMERGENCY
            ]
        }
    
    def _load_emergency_keywords(self) -> Dict[str, float]:
        """Carrega palavras-chave de emergência com pesos"""
        return {
            # Inglês
            "emergency": 0.9,
            "urgent": 0.7,
            "severe": 0.6,
            "critical": 0.8,
            "chest pain": 0.8,
            "difficulty breathing": 0.8,
            "unconscious": 0.9,
            "bleeding heavily": 0.8,
            "severe headache": 0.7,
            "can't breathe": 0.9,
            
            # Português
            "emergência": 0.9,
            "urgente": 0.7,
            "grave": 0.6,
            "crítico": 0.8,
            "dor no peito": 0.8,
            "dificuldade para respirar": 0.8,
            "inconsciente": 0.9,
            "sangrando muito": 0.8,
            "cefaleia severa": 0.7,
            "não consigo respirar": 0.9,
            "infarto": 0.9,
            "avc": 0.9
        }
    
    def _load_clarifying_questions(self) -> Dict[str, List[str]]:
        """Carrega banco de perguntas de esclarecimento"""
        return {
            "pain": [
                "Pode descrever o tipo de dor?",
                "A dor é constante ou vem e vai?",
                "O que alivia a dor?"
            ],
            "fever": [
                "Mediu a temperatura?",
                "Há outros sintomas junto com a febre?",
                "Está tomando algum medicamento para febre?"
            ],
            "general": [
                "Quando os sintomas começaram?",
                "Algo desencadeou os sintomas?",
                "Como está seu apetite e sono?"
            ]
        }