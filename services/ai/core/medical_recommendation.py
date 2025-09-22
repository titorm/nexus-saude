"""
Medical Recommendation Engine
Sistema de recomendações médicas baseado em IA
"""

import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging
import json
import random

logger = logging.getLogger(__name__)

class RecommendationType(Enum):
    """Tipos de recomendação"""
    SELF_CARE = "self_care"
    MEDICATION = "medication"
    LIFESTYLE = "lifestyle"
    MONITORING = "monitoring"
    SEEK_CARE = "seek_care"
    EMERGENCY = "emergency"
    DIAGNOSTIC = "diagnostic"
    FOLLOW_UP = "follow_up"
    PREVENTION = "prevention"

class UrgencyLevel(Enum):
    """Níveis de urgência"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    EMERGENCY = "emergency"

@dataclass
class Recommendation:
    """Recomendação médica"""
    id: str
    type: RecommendationType
    title: str
    description: str
    urgency: UrgencyLevel
    confidence: float
    reasoning: str
    contraindications: List[str] = field(default_factory=list)
    precautions: List[str] = field(default_factory=list)
    expected_timeline: Optional[str] = None
    follow_up_needed: bool = False
    sources: List[str] = field(default_factory=list)
    personalized_factors: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class TreatmentPlan:
    """Plano de tratamento completo"""
    patient_id: str
    primary_diagnosis: str
    differential_diagnoses: List[str]
    recommendations: List[Recommendation]
    red_flags: List[str]
    when_to_seek_care: List[str]
    expected_course: str
    follow_up_timeline: str
    lifestyle_modifications: List[str]
    monitoring_parameters: List[str]
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class MedicalRecommendationEngine:
    """
    Motor de recomendações médicas que gera sugestões personalizadas
    baseadas em:
    - Sintomas e condições identificadas
    - Contexto do paciente (idade, sexo, histórico)
    - Evidências médicas e guidelines
    - Fatores de risco e contraindicações
    """
    
    def __init__(self):
        self.recommendation_templates = self._load_recommendation_templates()
        self.contraindication_rules = self._load_contraindication_rules()
        self.dosage_guidelines = self._load_dosage_guidelines()
        self.interaction_checker = self._load_drug_interactions()
        self.red_flag_indicators = self._load_red_flags()
        self.follow_up_schedules = self._load_follow_up_schedules()
    
    async def generate_recommendations(self, 
                                     symptoms: List[str],
                                     probable_conditions: List[Dict[str, Any]],
                                     patient_context: Dict[str, Any],
                                     severity: str = "moderate") -> List[Recommendation]:
        """
        Gera recomendações personalizadas baseadas nos dados do paciente
        """
        recommendations = []
        
        logger.info(f"Generating recommendations for symptoms: {symptoms}")
        
        # Verificar red flags primeiro
        emergency_recs = await self._check_emergency_recommendations(symptoms, patient_context)
        if emergency_recs:
            return emergency_recs
        
        # Gerar recomendações por categoria
        self_care_recs = await self._generate_self_care_recommendations(
            symptoms, probable_conditions, patient_context, severity
        )
        recommendations.extend(self_care_recs)
        
        medication_recs = await self._generate_medication_recommendations(
            symptoms, probable_conditions, patient_context, severity
        )
        recommendations.extend(medication_recs)
        
        lifestyle_recs = await self._generate_lifestyle_recommendations(
            symptoms, probable_conditions, patient_context
        )
        recommendations.extend(lifestyle_recs)
        
        monitoring_recs = await self._generate_monitoring_recommendations(
            symptoms, probable_conditions, patient_context
        )
        recommendations.extend(monitoring_recs)
        
        seek_care_recs = await self._generate_seek_care_recommendations(
            symptoms, probable_conditions, patient_context, severity
        )
        recommendations.extend(seek_care_recs)
        
        # Filtrar por contraindicações
        filtered_recs = await self._filter_contraindications(recommendations, patient_context)
        
        # Personalizar baseado no contexto do paciente
        personalized_recs = await self._personalize_recommendations(filtered_recs, patient_context)
        
        # Ordenar por relevância e urgência
        sorted_recs = self._sort_recommendations(personalized_recs)
        
        return sorted_recs[:10]  # Limitar a 10 recomendações principais
    
    async def create_treatment_plan(self,
                                  primary_diagnosis: str,
                                  symptoms: List[str],
                                  patient_context: Dict[str, Any],
                                  differential_diagnoses: Optional[List[str]] = None) -> TreatmentPlan:
        """
        Cria um plano de tratamento completo
        """
        logger.info(f"Creating treatment plan for: {primary_diagnosis}")
        
        # Gerar recomendações específicas para o diagnóstico
        probable_conditions = [{"name": primary_diagnosis, "probability": 0.8}]
        recommendations = await self.generate_recommendations(
            symptoms, probable_conditions, patient_context
        )
        
        # Identificar red flags
        red_flags = await self._identify_red_flags(primary_diagnosis, symptoms, patient_context)
        
        # Critérios para buscar atendimento
        seek_care_criteria = await self._generate_seek_care_criteria(
            primary_diagnosis, symptoms, patient_context
        )
        
        # Curso esperado da doença
        expected_course = await self._generate_expected_course(primary_diagnosis, patient_context)
        
        # Cronograma de follow-up
        follow_up_timeline = await self._generate_follow_up_timeline(
            primary_diagnosis, patient_context
        )
        
        # Modificações de estilo de vida
        lifestyle_mods = await self._generate_comprehensive_lifestyle_modifications(
            primary_diagnosis, patient_context
        )
        
        # Parâmetros de monitoramento
        monitoring_params = await self._generate_monitoring_parameters(
            primary_diagnosis, patient_context
        )
        
        return TreatmentPlan(
            patient_id=patient_context.get("patient_id", "unknown"),
            primary_diagnosis=primary_diagnosis,
            differential_diagnoses=differential_diagnoses or [],
            recommendations=recommendations,
            red_flags=red_flags,
            when_to_seek_care=seek_care_criteria,
            expected_course=expected_course,
            follow_up_timeline=follow_up_timeline,
            lifestyle_modifications=lifestyle_mods,
            monitoring_parameters=monitoring_params
        )
    
    async def check_drug_interactions(self, 
                                    medications: List[str],
                                    proposed_medication: str) -> Dict[str, Any]:
        """
        Verifica interações medicamentosas
        """
        interactions = {
            "major_interactions": [],
            "moderate_interactions": [],
            "minor_interactions": [],
            "recommendations": [],
            "safe_to_prescribe": True
        }
        
        proposed_med_lower = proposed_medication.lower()
        
        for current_med in medications:
            current_med_lower = current_med.lower()
            
            # Buscar interações conhecidas
            interaction_key = tuple(sorted([current_med_lower, proposed_med_lower]))
            
            if interaction_key in self.interaction_checker:
                interaction_data = self.interaction_checker[interaction_key]
                severity = interaction_data.get("severity", "minor")
                
                interaction_info = {
                    "medication1": current_med,
                    "medication2": proposed_medication,
                    "effect": interaction_data.get("effect", "Unknown effect"),
                    "management": interaction_data.get("management", "Monitor closely")
                }
                
                if severity == "major":
                    interactions["major_interactions"].append(interaction_info)
                    interactions["safe_to_prescribe"] = False
                elif severity == "moderate":
                    interactions["moderate_interactions"].append(interaction_info)
                else:
                    interactions["minor_interactions"].append(interaction_info)
        
        # Gerar recomendações baseadas nas interações
        if interactions["major_interactions"]:
            interactions["recommendations"].append(
                "CONTRAINDICADO: Interações medicamentosas graves detectadas. "
                "Consulte médico antes de usar."
            )
        elif interactions["moderate_interactions"]:
            interactions["recommendations"].append(
                "CUIDADO: Interações moderadas detectadas. "
                "Monitoramento adicional necessário."
            )
        
        return interactions
    
    async def _check_emergency_recommendations(self,
                                             symptoms: List[str],
                                             patient_context: Dict[str, Any]) -> List[Recommendation]:
        """
        Verifica se há necessidade de recomendações de emergência
        """
        emergency_recs = []
        
        # Sintomas de emergência
        emergency_symptoms = [
            "chest pain", "difficulty breathing", "loss of consciousness",
            "severe headache", "sudden vision loss", "severe bleeding",
            "dor no peito", "dificuldade respirar", "perda consciência",
            "cefaleia severa", "perda visão", "sangramento grave"
        ]
        
        for symptom in symptoms:
            if any(emergency in symptom.lower() for emergency in emergency_symptoms):
                emergency_recs.append(Recommendation(
                    id=f"emergency_{len(emergency_recs)}",
                    type=RecommendationType.EMERGENCY,
                    title="PROCURE ATENDIMENTO MÉDICO IMEDIATAMENTE",
                    description=f"Sintoma '{symptom}' requer avaliação médica urgente. "
                               f"Dirija-se ao pronto socorro mais próximo ou ligue para emergência.",
                    urgency=UrgencyLevel.EMERGENCY,
                    confidence=0.95,
                    reasoning=f"Sintoma '{symptom}' pode indicar condição médica grave",
                    follow_up_needed=True
                ))
        
        # Combinações críticas
        if any("chest pain" in s.lower() for s in symptoms) and \
           any("shortness of breath" in s.lower() for s in symptoms):
            emergency_recs.append(Recommendation(
                id="emergency_cardiac",
                type=RecommendationType.EMERGENCY,
                title="SUSPEITA DE EMERGÊNCIA CARDÍACA",
                description="Combinação de dor no peito e falta de ar pode indicar "
                           "infarto ou embolia pulmonar. Procure emergência IMEDIATAMENTE.",
                urgency=UrgencyLevel.EMERGENCY,
                confidence=0.9,
                reasoning="Combinação de sintomas sugere emergência cardiovascular",
                follow_up_needed=True
            ))
        
        return emergency_recs
    
    async def _generate_self_care_recommendations(self,
                                                symptoms: List[str],
                                                probable_conditions: List[Dict[str, Any]],
                                                patient_context: Dict[str, Any],
                                                severity: str) -> List[Recommendation]:
        """
        Gera recomendações de autocuidado
        """
        recommendations = []
        
        # Recomendações baseadas em sintomas específicos
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            
            if "headache" in symptom_lower or "cefaleia" in symptom_lower:
                recommendations.append(Recommendation(
                    id="selfcare_headache",
                    type=RecommendationType.SELF_CARE,
                    title="Manejo da Cefaleia",
                    description="Descanse em ambiente escuro e silencioso, "
                               "aplique compressas frias na testa, "
                               "mantenha-se hidratado.",
                    urgency=UrgencyLevel.LOW,
                    confidence=0.8,
                    reasoning="Medidas de conforto podem aliviar cefaleias tensionais",
                    expected_timeline="Melhora em 2-4 horas"
                ))
            
            elif "fever" in symptom_lower or "febre" in symptom_lower:
                recommendations.append(Recommendation(
                    id="selfcare_fever",
                    type=RecommendationType.SELF_CARE,
                    title="Controle da Febre",
                    description="Mantenha-se hidratado, use roupas leves, "
                               "tome banhos mornos, descanse adequadamente.",
                    urgency=UrgencyLevel.MODERATE,
                    confidence=0.85,
                    reasoning="Medidas físicas ajudam no controle da temperatura",
                    expected_timeline="Melhora em 24-48 horas"
                ))
            
            elif "cough" in symptom_lower or "tosse" in symptom_lower:
                recommendations.append(Recommendation(
                    id="selfcare_cough",
                    type=RecommendationType.SELF_CARE,
                    title="Alívio da Tosse",
                    description="Beba líquidos mornos, use umidificador, "
                               "evite irritantes como fumaça, "
                               "considere mel para tosse seca.",
                    urgency=UrgencyLevel.LOW,
                    confidence=0.75,
                    reasoning="Medidas de suporte podem aliviar irritação das vias aéreas",
                    expected_timeline="Melhora gradual em 3-7 dias"
                ))
        
        return recommendations
    
    async def _generate_medication_recommendations(self,
                                                 symptoms: List[str],
                                                 probable_conditions: List[Dict[str, Any]],
                                                 patient_context: Dict[str, Any],
                                                 severity: str) -> List[Recommendation]:
        """
        Gera recomendações de medicamentos (sempre com ressalva médica)
        """
        recommendations = []
        
        # IMPORTANTE: Sempre incluir disclaimer sobre consulta médica
        disclaimer = ("IMPORTANTE: Esta é apenas uma orientação geral. "
                     "Consulte sempre um médico antes de tomar qualquer medicamento. "
                     "Considere alergias e medicamentos atuais.")
        
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            
            if "pain" in symptom_lower or "dor" in symptom_lower:
                # Verificar contraindicações para idade
                age = patient_context.get("age", 30)
                
                if age >= 18:
                    recommendations.append(Recommendation(
                        id="medication_pain_adult",
                        type=RecommendationType.MEDICATION,
                        title="Analgésicos para Dor",
                        description=f"{disclaimer}\n\n"
                                   f"Para dor leve a moderada, considere:\n"
                                   f"- Paracetamol 500-1000mg a cada 6-8h (máximo 4g/dia)\n"
                                   f"- Ibuprofeno 400mg a cada 8h (se não houver contraindicações)",
                        urgency=UrgencyLevel.MODERATE,
                        confidence=0.7,
                        reasoning="Analgésicos comuns são eficazes para dor leve-moderada",
                        contraindications=[
                            "Alergia aos medicamentos",
                            "Úlcera péptica ativa (para ibuprofeno)",
                            "Doença renal grave",
                            "Uso de anticoagulantes"
                        ],
                        precautions=[
                            "Não exceder dose máxima",
                            "Tomar com alimentos se irritação gástrica",
                            "Suspender se efeitos adversos"
                        ]
                    ))
            
            elif "fever" in symptom_lower or "febre" in symptom_lower:
                recommendations.append(Recommendation(
                    id="medication_fever",
                    type=RecommendationType.MEDICATION,
                    title="Antitérmicos para Febre",
                    description=f"{disclaimer}\n\n"
                               f"Para febre acima de 38°C:\n"
                               f"- Paracetamol 750mg a cada 6h\n"
                               f"- Dipirona 500mg a cada 6h (se disponível)",
                    urgency=UrgencyLevel.MODERATE,
                    confidence=0.8,
                    reasoning="Antitérmicos reduzem desconforto da febre",
                    contraindications=[
                        "Alergia aos medicamentos",
                        "Doença hepática grave (paracetamol)"
                    ]
                ))
        
        return recommendations
    
    async def _generate_lifestyle_recommendations(self,
                                                symptoms: List[str],
                                                probable_conditions: List[Dict[str, Any]],
                                                patient_context: Dict[str, Any]) -> List[Recommendation]:
        """
        Gera recomendações de estilo de vida
        """
        recommendations = []
        
        # Recomendações gerais de saúde
        recommendations.append(Recommendation(
            id="lifestyle_hydration",
            type=RecommendationType.LIFESTYLE,
            title="Hidratação Adequada",
            description="Beba pelo menos 2-3 litros de água por dia. "
                       "Aumente a ingestão se houver febre, vômitos ou diarreia.",
            urgency=UrgencyLevel.LOW,
            confidence=0.9,
            reasoning="Hidratação adequada é fundamental para recuperação",
            expected_timeline="Benefícios imediatos"
        ))
        
        recommendations.append(Recommendation(
            id="lifestyle_rest",
            type=RecommendationType.LIFESTYLE,
            title="Repouso e Sono",
            description="Garanta 7-9 horas de sono por noite. "
                       "Descanse mais durante a doença para permitir recuperação.",
            urgency=UrgencyLevel.LOW,
            confidence=0.85,
            reasoning="Repouso adequado fortalece sistema imunológico",
            expected_timeline="Melhora em 1-3 dias"
        ))
        
        # Recomendações específicas baseadas em condições
        for condition in probable_conditions:
            condition_name = condition.get("name", "").lower()
            
            if "hypertension" in condition_name or "hipertensão" in condition_name:
                recommendations.append(Recommendation(
                    id="lifestyle_hypertension",
                    type=RecommendationType.LIFESTYLE,
                    title="Manejo da Pressão Arterial",
                    description="Reduza sal na dieta (<2g/dia), "
                               "pratique exercícios regulares, "
                               "mantenha peso saudável, "
                               "limite álcool, evite tabaco.",
                    urgency=UrgencyLevel.MODERATE,
                    confidence=0.9,
                    reasoning="Modificações do estilo de vida reduzem pressão arterial",
                    expected_timeline="Benefícios em 2-4 semanas"
                ))
            
            elif "diabetes" in condition_name:
                recommendations.append(Recommendation(
                    id="lifestyle_diabetes",
                    type=RecommendationType.LIFESTYLE,
                    title="Controle Glicêmico",
                    description="Mantenha dieta balanceada com carboidratos complexos, "
                               "pratique exercícios regulares, "
                               "monitore glicemia conforme orientação médica.",
                    urgency=UrgencyLevel.HIGH,
                    confidence=0.95,
                    reasoning="Controle glicêmico previne complicações diabéticas",
                    expected_timeline="Melhora gradual em 2-8 semanas"
                ))
        
        return recommendations
    
    async def _generate_monitoring_recommendations(self,
                                                 symptoms: List[str],
                                                 probable_conditions: List[Dict[str, Any]],
                                                 patient_context: Dict[str, Any]) -> List[Recommendation]:
        """
        Gera recomendações de monitoramento
        """
        recommendations = []
        
        # Monitoramento de sintomas gerais
        recommendations.append(Recommendation(
            id="monitoring_symptoms",
            type=RecommendationType.MONITORING,
            title="Monitoramento de Sintomas",
            description="Acompanhe a evolução dos sintomas diariamente. "
                       "Anote piora, melhora ou novos sintomas. "
                       "Monitore temperatura se houver febre.",
            urgency=UrgencyLevel.LOW,
            confidence=0.8,
            reasoning="Monitoramento permite detectar mudanças precocemente",
            follow_up_needed=True
        ))
        
        # Sinais de alerta
        red_flags = await self._identify_red_flags("", symptoms, patient_context)
        if red_flags:
            recommendations.append(Recommendation(
                id="monitoring_red_flags",
                type=RecommendationType.MONITORING,
                title="Sinais de Alerta",
                description=f"Procure atendimento médico imediato se apresentar:\n" +
                           "\n".join([f"- {flag}" for flag in red_flags]),
                urgency=UrgencyLevel.HIGH,
                confidence=0.95,
                reasoning="Sinais de alerta indicam necessidade de avaliação urgente",
                follow_up_needed=True
            ))
        
        return recommendations
    
    async def _generate_seek_care_recommendations(self,
                                                symptoms: List[str],
                                                probable_conditions: List[Dict[str, Any]],
                                                patient_context: Dict[str, Any],
                                                severity: str) -> List[Recommendation]:
        """
        Gera recomendações sobre quando procurar atendimento
        """
        recommendations = []
        
        # Critérios baseados na severidade
        if severity == "severe":
            urgency = UrgencyLevel.HIGH
            timeline = "nas próximas 24 horas"
        elif severity == "moderate":
            urgency = UrgencyLevel.MODERATE
            timeline = "em 2-3 dias se não houver melhora"
        else:
            urgency = UrgencyLevel.LOW
            timeline = "se sintomas persistirem por mais de uma semana"
        
        recommendations.append(Recommendation(
            id="seek_care_timeline",
            type=RecommendationType.SEEK_CARE,
            title="Quando Procurar Atendimento",
            description=f"Consulte um médico {timeline}. "
                       f"Procure atendimento mais cedo se houver piora dos sintomas "
                       f"ou surgimento de novos sintomas preocupantes.",
            urgency=urgency,
            confidence=0.8,
            reasoning=f"Severidade {severity} requer acompanhamento médico apropriado",
            follow_up_needed=True
        ))
        
        # Recomendações específicas para grupos de risco
        age = patient_context.get("age", 30)
        if age > 65 or age < 2:
            recommendations.append(Recommendation(
                id="seek_care_age_risk",
                type=RecommendationType.SEEK_CARE,
                title="Atenção Especial por Idade",
                description="Por estar em grupo de maior risco (idade), "
                           "considere consulta médica mais precoce. "
                           "Não hesite em procurar atendimento se houver preocupações.",
                urgency=UrgencyLevel.MODERATE,
                confidence=0.85,
                reasoning="Idade é fator de risco para complicações",
                personalized_factors=[f"Idade: {age} anos"]
            ))
        
        return recommendations
    
    async def _filter_contraindications(self,
                                      recommendations: List[Recommendation],
                                      patient_context: Dict[str, Any]) -> List[Recommendation]:
        """
        Filtra recomendações baseado em contraindicações
        """
        filtered = []
        
        age = patient_context.get("age", 30)
        allergies = patient_context.get("allergies", [])
        medications = patient_context.get("current_medications", [])
        medical_history = patient_context.get("medical_history", [])
        
        for rec in recommendations:
            include_recommendation = True
            
            # Verificar contraindicações por idade
            if rec.type == RecommendationType.MEDICATION:
                if age < 18 and "aspirin" in rec.description.lower():
                    include_recommendation = False
                elif age > 75 and "ibuprofeno" in rec.description.lower():
                    # Adicionar precaução extra para idosos
                    rec.precautions.append("Atenção redobrada em idosos - risco renal")
            
            # Verificar alergias
            for allergy in allergies:
                if allergy.lower() in rec.description.lower():
                    include_recommendation = False
                    break
            
            # Verificar interações medicamentosas
            if rec.type == RecommendationType.MEDICATION and medications:
                # Simplificado - apenas algumas interações comuns
                if "warfarin" in medications and "aspirin" in rec.description.lower():
                    include_recommendation = False
            
            if include_recommendation:
                filtered.append(rec)
        
        return filtered
    
    async def _personalize_recommendations(self,
                                         recommendations: List[Recommendation],
                                         patient_context: Dict[str, Any]) -> List[Recommendation]:
        """
        Personaliza recomendações baseado no contexto do paciente
        """
        for rec in recommendations:
            # Adicionar fatores de personalização
            age = patient_context.get("age")
            sex = patient_context.get("sex")
            
            if age:
                rec.personalized_factors.append(f"Ajustado para idade: {age} anos")
            
            if sex:
                rec.personalized_factors.append(f"Considerando sexo: {sex}")
            
            # Ajustar confiança baseado na personalização
            if rec.personalized_factors:
                rec.confidence *= 1.1  # Aumentar confiança se personalizado
            
            rec.confidence = min(rec.confidence, 1.0)  # Manter máximo de 1.0
        
        return recommendations
    
    def _sort_recommendations(self, recommendations: List[Recommendation]) -> List[Recommendation]:
        """
        Ordena recomendações por urgência e confiança
        """
        urgency_weights = {
            UrgencyLevel.EMERGENCY: 4,
            UrgencyLevel.HIGH: 3,
            UrgencyLevel.MODERATE: 2,
            UrgencyLevel.LOW: 1
        }
        
        def sort_key(rec):
            urgency_weight = urgency_weights.get(rec.urgency, 1)
            return (urgency_weight, rec.confidence)
        
        return sorted(recommendations, key=sort_key, reverse=True)
    
    # Métodos auxiliares para carregar dados
    def _load_recommendation_templates(self) -> Dict[str, Any]:
        """Carrega templates de recomendações"""
        return {
            "pain_management": {
                "mild": "Medidas de conforto e analgésicos simples",
                "moderate": "Analgésicos e avaliação médica se persistir",
                "severe": "Avaliação médica urgente"
            },
            "fever_management": {
                "low": "Medidas físicas de resfriamento",
                "moderate": "Antitérmicos e hidratação",
                "high": "Avaliação médica e antitérmicos"
            }
        }
    
    def _load_contraindication_rules(self) -> Dict[str, List[str]]:
        """Carrega regras de contraindicação"""
        return {
            "aspirin": ["age < 18", "bleeding disorder", "peptic ulcer"],
            "ibuprofen": ["kidney disease", "heart failure", "age > 75"],
            "acetaminophen": ["liver disease", "alcohol abuse"]
        }
    
    def _load_dosage_guidelines(self) -> Dict[str, Dict[str, Any]]:
        """Carrega guidelines de dosagem"""
        return {
            "acetaminophen": {
                "adult": "500-1000mg q6-8h, max 4g/day",
                "pediatric": "10-15mg/kg q4-6h"
            },
            "ibuprofen": {
                "adult": "400-600mg q6-8h, max 2.4g/day",
                "pediatric": "5-10mg/kg q6-8h"
            }
        }
    
    def _load_drug_interactions(self) -> Dict[Tuple[str, str], Dict[str, str]]:
        """Carrega interações medicamentosas"""
        return {
            ("warfarin", "aspirin"): {
                "severity": "major",
                "effect": "Increased bleeding risk",
                "management": "Avoid combination or monitor INR closely"
            },
            ("metformin", "contrast"): {
                "severity": "major", 
                "effect": "Risk of lactic acidosis",
                "management": "Stop metformin 48h before contrast"
            }
        }
    
    def _load_red_flags(self) -> Dict[str, List[str]]:
        """Carrega indicadores de red flags"""
        return {
            "headache": [
                "Pior cefaleia da vida",
                "Febre + rigidez de nuca",
                "Mudanças visuais súbitas",
                "Confusão mental"
            ],
            "chest_pain": [
                "Dor irradiando para braço/mandíbula",
                "Falta de ar intensa",
                "Sudorese profusa",
                "Náusea/vômito associados"
            ],
            "abdominal_pain": [
                "Dor intensa e súbita",
                "Vômito com sangue",
                "Fezes escuras/sangue",
                "Rigidez abdominal"
            ]
        }
    
    def _load_follow_up_schedules(self) -> Dict[str, str]:
        """Carrega cronogramas de follow-up"""
        return {
            "acute_illness": "3-7 dias se não houver melhora",
            "chronic_condition": "Conforme orientação médica prévia",
            "medication_started": "1-2 semanas para avaliar resposta",
            "high_risk_patient": "24-48 horas se sintomas persistirem"
        }
    
    async def _identify_red_flags(self,
                                primary_diagnosis: str,
                                symptoms: List[str],
                                patient_context: Dict[str, Any]) -> List[str]:
        """Identifica red flags baseado no diagnóstico e sintomas"""
        red_flags = []
        
        # Red flags gerais
        general_red_flags = [
            "Febre alta persistente (>39°C)",
            "Dificuldade respiratória grave",
            "Dor intensa que não melhora",
            "Vômitos persistentes",
            "Sinais de desidratação",
            "Alteração do nível de consciência"
        ]
        
        red_flags.extend(general_red_flags)
        
        # Red flags específicos por sintoma
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            if "headache" in symptom_lower:
                red_flags.extend(self.red_flag_indicators.get("headache", []))
            elif "chest pain" in symptom_lower:
                red_flags.extend(self.red_flag_indicators.get("chest_pain", []))
            elif "abdominal pain" in symptom_lower:
                red_flags.extend(self.red_flag_indicators.get("abdominal_pain", []))
        
        return list(set(red_flags))  # Remove duplicatas
    
    async def _generate_seek_care_criteria(self,
                                         primary_diagnosis: str,
                                         symptoms: List[str],
                                         patient_context: Dict[str, Any]) -> List[str]:
        """Gera critérios para buscar atendimento médico"""
        criteria = [
            "Piora dos sintomas apesar do tratamento",
            "Surgimento de novos sintomas preocupantes",
            "Febre alta que não responde a antitérmicos",
            "Dificuldade para comer ou beber",
            "Preocupação significativa com os sintomas"
        ]
        
        # Critérios específicos por idade
        age = patient_context.get("age", 30)
        if age > 65:
            criteria.append("Qualquer mudança no estado geral")
        elif age < 2:
            criteria.append("Irritabilidade persistente ou letargia")
        
        return criteria
    
    async def _generate_expected_course(self,
                                      primary_diagnosis: str,
                                      patient_context: Dict[str, Any]) -> str:
        """Gera descrição do curso esperado da doença"""
        diagnosis_lower = primary_diagnosis.lower()
        
        course_descriptions = {
            "viral illness": "Melhora gradual em 7-10 dias com cuidados de suporte",
            "bacterial infection": "Melhora em 2-3 dias com antibiótico apropriado",
            "hypertension": "Controle a longo prazo com medicação e mudanças de estilo de vida",
            "diabetes": "Manejo contínuo com monitoramento regular da glicemia"
        }
        
        for condition, description in course_descriptions.items():
            if condition in diagnosis_lower:
                return description
        
        return "Evolução variável - acompanhamento médico recomendado"
    
    async def _generate_follow_up_timeline(self,
                                         primary_diagnosis: str,
                                         patient_context: Dict[str, Any]) -> str:
        """Gera cronograma de follow-up"""
        diagnosis_lower = primary_diagnosis.lower()
        
        if "acute" in diagnosis_lower or "viral" in diagnosis_lower:
            return "Reavaliação em 3-7 dias se não houver melhora"
        elif "chronic" in diagnosis_lower:
            return "Seguimento conforme orientação médica regular"
        else:
            return "Reavaliação médica em 1-2 semanas"
    
    async def _generate_comprehensive_lifestyle_modifications(self,
                                                            primary_diagnosis: str,
                                                            patient_context: Dict[str, Any]) -> List[str]:
        """Gera modificações abrangentes de estilo de vida"""
        modifications = [
            "Manter hidratação adequada",
            "Garantir sono reparador (7-9 horas)",
            "Dieta balanceada rica em frutas e vegetais",
            "Atividade física regular conforme tolerância"
        ]
        
        diagnosis_lower = primary_diagnosis.lower()
        
        if "hypertension" in diagnosis_lower:
            modifications.extend([
                "Reduzir ingestão de sódio (<2g/dia)",
                "Manter peso saudável",
                "Limitar consumo de álcool",
                "Técnicas de manejo do estresse"
            ])
        
        if "diabetes" in diagnosis_lower:
            modifications.extend([
                "Controle rigoroso da dieta com carboidratos complexos",
                "Monitoramento regular da glicemia",
                "Exercícios aeróbicos regulares",
                "Cuidados com os pés"
            ])
        
        return modifications
    
    async def _generate_monitoring_parameters(self,
                                            primary_diagnosis: str,
                                            patient_context: Dict[str, Any]) -> List[str]:
        """Gera parâmetros de monitoramento"""
        parameters = [
            "Evolução dos sintomas",
            "Temperatura corporal",
            "Apetite e hidratação",
            "Padrão do sono"
        ]
        
        diagnosis_lower = primary_diagnosis.lower()
        
        if "hypertension" in diagnosis_lower:
            parameters.extend([
                "Pressão arterial diária",
                "Peso corporal",
                "Sinais de edema",
                "Tolerância ao exercício"
            ])
        
        if "diabetes" in diagnosis_lower:
            parameters.extend([
                "Glicemia capilar",
                "Sintomas de hipo/hiperglicemia",
                "Peso corporal",
                "Cicatrização de feridas"
            ])
        
        return parameters