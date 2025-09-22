"""
Medical Knowledge Base
Base de conhecimento médico para o assistente IA
"""

import json
import asyncio
from typing import Dict, List, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class MedicalKnowledgeBase:
    """
    Base de conhecimento médico que inclui:
    - Condições médicas e seus sintomas
    - Protocolos de tratamento
    - Interações medicamentosas
    - Guidelines clínicos
    """
    
    def __init__(self, data_path: Optional[str] = None):
        self.data_path = data_path or str(Path(__file__).parent.parent / "data")
        self.conditions = {}
        self.symptoms_index = {}
        self.treatments = {}
        self.drug_interactions = {}
        self.guidelines = {}
        self.is_initialized = False
    
    async def initialize(self):
        """Inicializa a base de conhecimento"""
        try:
            logger.info("Initializing Medical Knowledge Base...")
            
            # Load medical conditions
            await self._load_medical_conditions()
            
            # Build symptoms index
            await self._build_symptoms_index()
            
            # Load treatment protocols
            await self._load_treatment_protocols()
            
            # Load drug interactions
            await self._load_drug_interactions()
            
            # Load clinical guidelines
            await self._load_clinical_guidelines()
            
            self.is_initialized = True
            logger.info("Medical Knowledge Base initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize knowledge base: {e}")
            # Continue with mock data for development
            await self._create_mock_data()
            self.is_initialized = True
    
    async def search_relevant_info(self, entities: Dict[str, List[str]], 
                                 patient_context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Busca informações relevantes baseadas em entidades médicas
        """
        relevant_info = {
            "conditions": [],
            "treatments": [],
            "guidelines": [],
            "sources": []
        }
        
        # Search by symptoms
        symptoms = entities.get("symptoms", [])
        for symptom in symptoms:
            conditions = await self._find_conditions_by_symptom(symptom)
            relevant_info["conditions"].extend(conditions)
        
        # Search by conditions/diagnoses
        conditions = entities.get("conditions", [])
        for condition in conditions:
            treatments = await self._get_treatments_for_condition(condition)
            relevant_info["treatments"].extend(treatments)
            
            guidelines = await self._get_guidelines_for_condition(condition)
            relevant_info["guidelines"].extend(guidelines)
        
        # Consider patient context
        if patient_context:
            age = patient_context.get("age", 0)
            sex = patient_context.get("sex", "")
            
            # Filter by age-appropriate treatments
            relevant_info["treatments"] = self._filter_by_age(relevant_info["treatments"], age)
            
            # Add sex-specific considerations
            if sex:
                relevant_info["guidelines"].extend(
                    await self._get_sex_specific_guidelines(conditions, sex)
                )
        
        # Remove duplicates and sort by relevance
        relevant_info["conditions"] = self._deduplicate_and_sort(relevant_info["conditions"])
        relevant_info["treatments"] = self._deduplicate_and_sort(relevant_info["treatments"])
        relevant_info["guidelines"] = self._deduplicate_and_sort(relevant_info["guidelines"])
        
        return relevant_info
    
    async def find_conditions_by_symptoms(self, symptoms: List[str], 
                                        patient_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Encontra condições médicas baseadas em sintomas
        """
        condition_scores = {}
        
        for symptom in symptoms:
            # Normalizar sintoma
            normalized_symptom = symptom.lower().strip()
            
            # Buscar no índice de sintomas
            related_conditions = self.symptoms_index.get(normalized_symptom, [])
            
            for condition_id in related_conditions:
                if condition_id not in condition_scores:
                    condition_scores[condition_id] = {
                        "condition": self.conditions.get(condition_id, {}),
                        "score": 0,
                        "matching_symptoms": []
                    }
                
                condition_scores[condition_id]["score"] += 1
                condition_scores[condition_id]["matching_symptoms"].append(symptom)
        
        # Ajustar scores baseado em informações do paciente
        for condition_id, data in condition_scores.items():
            condition = data["condition"]
            
            # Ajuste por idade
            age_range = condition.get("typical_age_range", [0, 100])
            patient_age = patient_info.get("age", 50)
            if age_range[0] <= patient_age <= age_range[1]:
                data["score"] *= 1.5
            
            # Ajuste por sexo
            sex_prevalence = condition.get("sex_prevalence", {})
            patient_sex = patient_info.get("sex", "").lower()
            if patient_sex in sex_prevalence:
                data["score"] *= sex_prevalence[patient_sex]
            
            # Ajuste por histórico médico
            risk_factors = condition.get("risk_factors", [])
            patient_history = patient_info.get("medical_history", [])
            for factor in risk_factors:
                if any(factor.lower() in hist.lower() for hist in patient_history):
                    data["score"] *= 1.3
        
        # Converter para lista e ordenar por score
        conditions_list = []
        for condition_id, data in condition_scores.items():
            conditions_list.append({
                "condition_id": condition_id,
                "name": data["condition"].get("name", "Unknown"),
                "description": data["condition"].get("description", ""),
                "probability": min(data["score"] / len(symptoms), 1.0),
                "matching_symptoms": data["matching_symptoms"],
                "total_symptoms": len(data["condition"].get("symptoms", [])),
                "severity": data["condition"].get("severity", "moderate")
            })
        
        # Ordenar por probabilidade
        conditions_list.sort(key=lambda x: x["probability"], reverse=True)
        
        return conditions_list[:10]  # Retornar top 10
    
    async def get_treatment_protocols(self, diagnosis: str, severity: str = "moderate") -> Dict[str, Any]:
        """
        Obtém protocolos de tratamento para um diagnóstico
        """
        diagnosis_key = diagnosis.lower().replace(" ", "_")
        
        treatment_protocol = self.treatments.get(diagnosis_key, {})
        
        if not treatment_protocol:
            # Buscar por termos similares
            for key, protocol in self.treatments.items():
                if any(word in key for word in diagnosis.lower().split()):
                    treatment_protocol = protocol
                    break
        
        if not treatment_protocol:
            return await self._create_generic_treatment_protocol(diagnosis, severity)
        
        # Ajustar por severidade
        severity_adjustments = {
            "mild": {"medication_strength": 0.7, "monitoring_frequency": 0.5},
            "moderate": {"medication_strength": 1.0, "monitoring_frequency": 1.0},
            "severe": {"medication_strength": 1.3, "monitoring_frequency": 2.0}
        }
        
        adjusted_protocol = treatment_protocol.copy()
        adjustments = severity_adjustments.get(severity, severity_adjustments["moderate"])
        
        # Ajustar medicações
        for medication in adjusted_protocol.get("medications", []):
            if "dosage" in medication:
                # Ajustar dosagem baseado na severidade (conceitual)
                medication["severity_adjusted"] = True
        
        return adjusted_protocol
    
    async def _load_medical_conditions(self):
        """Carrega condições médicas da base de dados"""
        # Por enquanto, usar dados mock
        self.conditions = {
            "hypertension": {
                "name": "Hipertensão Arterial",
                "description": "Pressão arterial persistentemente elevada",
                "symptoms": ["headache", "dizziness", "blurred vision", "chest pain"],
                "typical_age_range": [30, 80],
                "sex_prevalence": {"m": 1.2, "f": 1.0},
                "risk_factors": ["obesity", "diabetes", "smoking", "family history"],
                "severity": "moderate"
            },
            "diabetes": {
                "name": "Diabetes Mellitus",
                "description": "Distúrbio metabólico caracterizado por hiperglicemia",
                "symptoms": ["excessive thirst", "frequent urination", "fatigue", "blurred vision"],
                "typical_age_range": [25, 75],
                "sex_prevalence": {"m": 1.1, "f": 1.0},
                "risk_factors": ["obesity", "family history", "sedentary lifestyle"],
                "severity": "moderate"
            },
            "myocardial_infarction": {
                "name": "Infarto Agudo do Miocárdio",
                "description": "Necrose do músculo cardíaco por falta de irrigação",
                "symptoms": ["chest pain", "shortness of breath", "nausea", "sweating"],
                "typical_age_range": [45, 85],
                "sex_prevalence": {"m": 1.5, "f": 1.0},
                "risk_factors": ["hypertension", "diabetes", "smoking", "high cholesterol"],
                "severity": "severe"
            },
            "pneumonia": {
                "name": "Pneumonia",
                "description": "Infecção dos pulmões",
                "symptoms": ["cough", "fever", "shortness of breath", "chest pain"],
                "typical_age_range": [0, 100],
                "sex_prevalence": {"m": 1.0, "f": 1.0},
                "risk_factors": ["immunosuppression", "smoking", "chronic disease"],
                "severity": "moderate"
            },
            "migraine": {
                "name": "Enxaqueca",
                "description": "Tipo de cefaleia primária recorrente",
                "symptoms": ["headache", "nausea", "sensitivity to light", "visual disturbances"],
                "typical_age_range": [15, 55],
                "sex_prevalence": {"m": 0.7, "f": 1.3},
                "risk_factors": ["family history", "stress", "hormonal changes"],
                "severity": "mild"
            }
        }
    
    async def _build_symptoms_index(self):
        """Constrói índice invertido de sintomas para condições"""
        self.symptoms_index = {}
        
        for condition_id, condition_data in self.conditions.items():
            symptoms = condition_data.get("symptoms", [])
            for symptom in symptoms:
                normalized_symptom = symptom.lower().strip()
                if normalized_symptom not in self.symptoms_index:
                    self.symptoms_index[normalized_symptom] = []
                self.symptoms_index[normalized_symptom].append(condition_id)
        
        # Adicionar variações e sinônimos
        symptom_variations = {
            "headache": ["head pain", "cephalgia", "dolor de cabeza"],
            "chest pain": ["thoracic pain", "pectoral pain", "dor no peito"],
            "shortness of breath": ["dyspnea", "breathing difficulty", "falta de ar"],
            "dizziness": ["vertigo", "lightheadedness", "tontura"],
            "fatigue": ["tiredness", "exhaustion", "cansaço"]
        }
        
        for main_symptom, variations in symptom_variations.items():
            if main_symptom in self.symptoms_index:
                conditions = self.symptoms_index[main_symptom]
                for variation in variations:
                    self.symptoms_index[variation.lower()] = conditions.copy()
    
    async def _load_treatment_protocols(self):
        """Carrega protocolos de tratamento"""
        self.treatments = {
            "hypertension": {
                "first_line": [
                    {"class": "ACE inhibitor", "examples": ["Lisinopril", "Enalapril"]},
                    {"class": "Diuretic", "examples": ["Hydrochlorothiazide", "Furosemide"]},
                    {"class": "Calcium channel blocker", "examples": ["Amlodipine", "Nifedipine"]}
                ],
                "lifestyle_modifications": [
                    "Reduced sodium intake (<2g/day)",
                    "Regular physical activity",
                    "Weight management",
                    "Limit alcohol consumption",
                    "Smoking cessation"
                ],
                "monitoring": {
                    "blood_pressure": "Weekly initially, then monthly",
                    "kidney_function": "Every 3-6 months",
                    "electrolytes": "Every 3-6 months"
                },
                "target_bp": "< 130/80 mmHg"
            },
            "diabetes": {
                "first_line": [
                    {"class": "Metformin", "dosage": "500-1000mg twice daily"},
                    {"class": "Lifestyle modification", "description": "Diet and exercise"}
                ],
                "second_line": [
                    {"class": "Sulfonylurea", "examples": ["Glibenclamide", "Gliclazide"]},
                    {"class": "DPP-4 inhibitor", "examples": ["Sitagliptin", "Vildagliptin"]},
                    {"class": "SGLT-2 inhibitor", "examples": ["Empagliflozin", "Dapagliflozin"]}
                ],
                "monitoring": {
                    "hba1c": "Every 3 months",
                    "fasting_glucose": "Weekly initially",
                    "kidney_function": "Annually",
                    "eye_exam": "Annually",
                    "foot_exam": "Every visit"
                },
                "target_hba1c": "< 7%"
            },
            "myocardial_infarction": {
                "acute_management": [
                    {"medication": "Aspirin", "dosage": "300mg loading, then 75mg daily"},
                    {"medication": "Clopidogrel", "dosage": "600mg loading, then 75mg daily"},
                    {"medication": "Atorvastatin", "dosage": "80mg daily"},
                    {"medication": "Metoprolol", "dosage": "25mg twice daily, titrate up"}
                ],
                "interventions": [
                    "Primary PCI if available within 120 minutes",
                    "Thrombolysis if PCI not available"
                ],
                "monitoring": {
                    "cardiac_enzymes": "Every 6-8 hours x 3",
                    "ecg": "Every 8 hours x 3",
                    "vital_signs": "Continuous monitoring"
                },
                "complications_watch": [
                    "Cardiogenic shock",
                    "Arrhythmias",
                    "Mechanical complications"
                ]
            }
        }
    
    async def _load_drug_interactions(self):
        """Carrega interações medicamentosas"""
        self.drug_interactions = {
            ("warfarin", "aspirin"): {
                "severity": "major",
                "effect": "Increased bleeding risk",
                "management": "Monitor INR closely, consider PPI"
            },
            ("metformin", "contrast"): {
                "severity": "major",
                "effect": "Risk of lactic acidosis",
                "management": "Stop metformin 48h before contrast"
            },
            ("ace_inhibitor", "potassium"): {
                "severity": "moderate",
                "effect": "Hyperkalemia risk",
                "management": "Monitor potassium levels"
            },
            ("simvastatin", "clarithromycin"): {
                "severity": "major",
                "effect": "Increased statin toxicity",
                "management": "Use alternative antibiotic"
            }
        }
    
    async def _load_clinical_guidelines(self):
        """Carrega guidelines clínicos"""
        self.guidelines = {
            "hypertension": [
                {
                    "source": "ESC/ESH 2018",
                    "recommendation": "Start treatment at ≥140/90 mmHg",
                    "evidence_level": "A"
                },
                {
                    "source": "AHA/ACC 2017",
                    "recommendation": "Start treatment at ≥130/80 mmHg",
                    "evidence_level": "A"
                }
            ],
            "diabetes": [
                {
                    "source": "ADA 2023",
                    "recommendation": "HbA1c target <7% for most adults",
                    "evidence_level": "A"
                },
                {
                    "source": "EASD/ADA 2022",
                    "recommendation": "Metformin as first-line therapy",
                    "evidence_level": "A"
                }
            ]
        }
    
    async def _create_mock_data(self):
        """Cria dados mock para desenvolvimento"""
        logger.info("Creating mock medical knowledge data...")
        await self._load_medical_conditions()
        await self._build_symptoms_index()
        await self._load_treatment_protocols()
        await self._load_drug_interactions()
        await self._load_clinical_guidelines()
    
    async def _find_conditions_by_symptom(self, symptom: str) -> List[Dict[str, Any]]:
        """Encontra condições relacionadas a um sintoma"""
        normalized_symptom = symptom.lower().strip()
        condition_ids = self.symptoms_index.get(normalized_symptom, [])
        
        conditions = []
        for condition_id in condition_ids:
            condition = self.conditions.get(condition_id, {})
            if condition:
                conditions.append({
                    "id": condition_id,
                    "name": condition.get("name", ""),
                    "description": condition.get("description", ""),
                    "relevance_score": 0.8  # Simplified scoring
                })
        
        return conditions
    
    async def _get_treatments_for_condition(self, condition: str) -> List[Dict[str, Any]]:
        """Obtém tratamentos para uma condição"""
        condition_key = condition.lower().replace(" ", "_")
        treatment_protocol = self.treatments.get(condition_key, {})
        
        treatments = []
        
        # First-line treatments
        for treatment in treatment_protocol.get("first_line", []):
            treatments.append({
                "type": "first_line",
                "treatment": treatment,
                "evidence_level": "high"
            })
        
        # Second-line treatments
        for treatment in treatment_protocol.get("second_line", []):
            treatments.append({
                "type": "second_line",
                "treatment": treatment,
                "evidence_level": "moderate"
            })
        
        return treatments
    
    async def _get_guidelines_for_condition(self, condition: str) -> List[Dict[str, Any]]:
        """Obtém guidelines para uma condição"""
        condition_key = condition.lower().replace(" ", "_")
        return self.guidelines.get(condition_key, [])
    
    async def _get_sex_specific_guidelines(self, conditions: List[str], sex: str) -> List[Dict[str, Any]]:
        """Obtém guidelines específicos por sexo"""
        sex_specific = []
        
        if sex.lower() == "f":
            for condition in conditions:
                if "cardiac" in condition.lower():
                    sex_specific.append({
                        "guideline": "Consider atypical presentation of cardiac disease in women",
                        "source": "AHA Women's Cardiac Guidelines",
                        "evidence_level": "B"
                    })
        
        return sex_specific
    
    def _filter_by_age(self, treatments: List[Dict], age: int) -> List[Dict]:
        """Filtra tratamentos apropriados para a idade"""
        # Simplified age filtering
        filtered = []
        
        for treatment in treatments:
            include = True
            
            # Avoid certain medications in elderly
            if age > 75:
                treatment_text = str(treatment).lower()
                if any(avoid in treatment_text for avoid in ["benzodiazepine", "tricyclic"]):
                    include = False
            
            # Pediatric considerations
            if age < 18:
                treatment_text = str(treatment).lower()
                if any(avoid in treatment_text for avoid in ["aspirin", "ace inhibitor"]):
                    include = False
            
            if include:
                filtered.append(treatment)
        
        return filtered
    
    def _deduplicate_and_sort(self, items: List[Dict]) -> List[Dict]:
        """Remove duplicatas e ordena por relevância"""
        # Simplified deduplication
        seen = set()
        unique_items = []
        
        for item in items:
            # Create a simple hash based on item content
            item_hash = str(sorted(item.items()))
            if item_hash not in seen:
                seen.add(item_hash)
                unique_items.append(item)
        
        # Sort by relevance score if available
        unique_items.sort(
            key=lambda x: x.get("relevance_score", x.get("probability", 0)), 
            reverse=True
        )
        
        return unique_items
    
    async def _create_generic_treatment_protocol(self, diagnosis: str, severity: str) -> Dict[str, Any]:
        """Cria protocolo genérico quando não há protocolo específico"""
        return {
            "diagnosis": diagnosis,
            "severity": severity,
            "general_approach": [
                "Symptomatic treatment",
                "Supportive care",
                "Monitor for complications"
            ],
            "monitoring": {
                "clinical_assessment": "Regular follow-up as needed",
                "vital_signs": "Monitor for changes"
            },
            "referral_criteria": [
                "Worsening symptoms",
                "No improvement with conservative management",
                "Development of complications"
            ],
            "note": "Consult specific guidelines for detailed management"
        }