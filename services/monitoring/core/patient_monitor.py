"""
Patient Monitor
Monitoramento abrangente de pacientes
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class PatientStatus(Enum):
    """Status do paciente"""
    STABLE = "stable"
    MONITORING = "monitoring"
    CRITICAL = "critical"
    EMERGENCY = "emergency"
    DISCHARGED = "discharged"

class RiskLevel(Enum):
    """Níveis de risco"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class PatientMonitor:
    """Monitor abrangente de pacientes"""
    
    def __init__(self):
        self.is_active = False
        self.patients = {}
        self.risk_assessments = {}
        self.patient_alerts = {}
        self.monitoring_protocols = {}
        
    async def initialize(self):
        """Inicializa o monitor de pacientes"""
        try:
            logger.info("Initializing Patient Monitor...")
            
            # Load patient data
            await self._load_patient_data()
            
            # Initialize monitoring protocols
            await self._initialize_protocols()
            
            # Start continuous monitoring
            asyncio.create_task(self._continuous_patient_monitoring())
            
            self.is_active = True
            logger.info("Patient Monitor initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Patient Monitor: {e}")
            raise
    
    async def register_patient(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Registra um novo paciente para monitoramento"""
        try:
            patient_id = patient_data.get("patient_id")
            
            if not patient_id:
                raise ValueError("Patient ID is required")
            
            # Create patient record
            patient_record = {
                "patient_id": patient_id,
                "name": patient_data.get("name", "Unknown"),
                "age": patient_data.get("age"),
                "gender": patient_data.get("gender"),
                "admission_date": patient_data.get("admission_date", datetime.now(timezone.utc).isoformat()),
                "diagnosis": patient_data.get("diagnosis", []),
                "medications": patient_data.get("medications", []),
                "allergies": patient_data.get("allergies", []),
                "status": PatientStatus.MONITORING.value,
                "risk_level": RiskLevel.LOW.value,
                "monitoring_frequency": patient_data.get("monitoring_frequency", "normal"),
                "assigned_staff": patient_data.get("assigned_staff", []),
                "room_number": patient_data.get("room_number"),
                "contact_info": patient_data.get("contact_info", {}),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Store patient
            self.patients[patient_id] = patient_record
            
            # Initialize risk assessment
            await self._initialize_risk_assessment(patient_id)
            
            # Setup monitoring protocol
            await self._setup_monitoring_protocol(patient_id, patient_data)
            
            logger.info(f"Patient {patient_id} registered for monitoring")
            
            return {
                "status": "registered",
                "patient_id": patient_id,
                "monitoring_protocol": self.monitoring_protocols.get(patient_id, {}),
                "risk_level": patient_record["risk_level"]
            }
            
        except Exception as e:
            logger.error(f"Error registering patient: {e}")
            raise
    
    async def update_patient_status(self, patient_id: str, status: PatientStatus, notes: str = None) -> Dict[str, Any]:
        """Atualiza status do paciente"""
        try:
            if patient_id not in self.patients:
                raise ValueError(f"Patient {patient_id} not found")
            
            old_status = self.patients[patient_id]["status"]
            self.patients[patient_id]["status"] = status.value
            self.patients[patient_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            if notes:
                if "status_history" not in self.patients[patient_id]:
                    self.patients[patient_id]["status_history"] = []
                
                self.patients[patient_id]["status_history"].append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "old_status": old_status,
                    "new_status": status.value,
                    "notes": notes
                })
            
            # Update monitoring frequency based on status
            await self._update_monitoring_frequency(patient_id, status)
            
            # Trigger status change alerts if needed
            await self._handle_status_change_alerts(patient_id, old_status, status.value)
            
            logger.info(f"Patient {patient_id} status updated from {old_status} to {status.value}")
            
            return {
                "status": "updated",
                "patient_id": patient_id,
                "old_status": old_status,
                "new_status": status.value,
                "monitoring_frequency": self.patients[patient_id]["monitoring_frequency"]
            }
            
        except Exception as e:
            logger.error(f"Error updating patient status: {e}")
            raise
    
    async def assess_patient_risk(self, patient_id: str, vital_signs_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Avalia risco do paciente"""
        try:
            if patient_id not in self.patients:
                raise ValueError(f"Patient {patient_id} not found")
            
            patient = self.patients[patient_id]
            
            # Calculate risk score
            risk_score = await self._calculate_risk_score(patient_id, vital_signs_data)
            
            # Determine risk level
            risk_level = self._determine_risk_level(risk_score)
            
            # Update patient risk
            old_risk_level = patient["risk_level"]
            patient["risk_level"] = risk_level.value
            
            # Store risk assessment
            risk_assessment = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "risk_score": risk_score,
                "risk_level": risk_level.value,
                "factors": await self._identify_risk_factors(patient_id, vital_signs_data),
                "recommendations": await self._generate_risk_recommendations(patient_id, risk_level)
            }
            
            if patient_id not in self.risk_assessments:
                self.risk_assessments[patient_id] = []
            
            self.risk_assessments[patient_id].append(risk_assessment)
            
            # Keep only last 100 assessments
            if len(self.risk_assessments[patient_id]) > 100:
                self.risk_assessments[patient_id] = self.risk_assessments[patient_id][-100:]
            
            # Handle risk level changes
            if old_risk_level != risk_level.value:
                await self._handle_risk_level_change(patient_id, old_risk_level, risk_level.value)
            
            logger.info(f"Risk assessment completed for patient {patient_id}: {risk_level.value}")
            
            return risk_assessment
            
        except Exception as e:
            logger.error(f"Error assessing patient risk: {e}")
            raise
    
    async def get_patient_summary(self, patient_id: str) -> Dict[str, Any]:
        """Obtém resumo completo do paciente"""
        try:
            if patient_id not in self.patients:
                raise ValueError(f"Patient {patient_id} not found")
            
            patient = self.patients[patient_id]
            
            # Get latest risk assessment
            latest_risk = None
            if patient_id in self.risk_assessments and self.risk_assessments[patient_id]:
                latest_risk = self.risk_assessments[patient_id][-1]
            
            # Get recent alerts
            recent_alerts = await self._get_recent_patient_alerts(patient_id, hours=24)
            
            # Get monitoring protocol
            protocol = self.monitoring_protocols.get(patient_id, {})
            
            summary = {
                "patient_info": patient,
                "current_risk": latest_risk,
                "recent_alerts": recent_alerts,
                "monitoring_protocol": protocol,
                "summary_generated": datetime.now(timezone.utc).isoformat()
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting patient summary: {e}")
            raise
    
    async def get_all_patients(self, status_filter: PatientStatus = None) -> List[Dict[str, Any]]:
        """Lista todos os pacientes"""
        try:
            patients_list = []
            
            for patient_id, patient_data in self.patients.items():
                if status_filter and patient_data["status"] != status_filter.value:
                    continue
                
                # Add latest risk assessment
                latest_risk = None
                if patient_id in self.risk_assessments and self.risk_assessments[patient_id]:
                    latest_risk = self.risk_assessments[patient_id][-1]
                
                patient_summary = {
                    **patient_data,
                    "latest_risk_assessment": latest_risk,
                    "active_alerts": len(await self._get_active_patient_alerts(patient_id))
                }
                
                patients_list.append(patient_summary)
            
            # Sort by risk level and status
            patients_list.sort(key=lambda p: (
                {"critical": 0, "high": 1, "moderate": 2, "low": 3}.get(p["risk_level"], 4),
                {"critical": 0, "emergency": 1, "monitoring": 2, "stable": 3, "discharged": 4}.get(p["status"], 5)
            ))
            
            return patients_list
            
        except Exception as e:
            logger.error(f"Error getting all patients: {e}")
            raise
    
    async def perform_monitoring_cycle(self):
        """Executa ciclo de monitoramento"""
        try:
            # Check all active patients
            for patient_id in list(self.patients.keys()):
                patient = self.patients[patient_id]
                
                # Skip discharged patients
                if patient["status"] == PatientStatus.DISCHARGED.value:
                    continue
                
                # Perform risk assessment
                await self.assess_patient_risk(patient_id)
                
                # Check monitoring compliance
                await self._check_monitoring_compliance(patient_id)
                
                # Update patient trends
                await self._update_patient_trends(patient_id)
            
            # Clean up old data
            await self._cleanup_patient_data()
            
        except Exception as e:
            logger.error(f"Error in patient monitoring cycle: {e}")
    
    async def _load_patient_data(self):
        """Carrega dados de pacientes"""
        # In a real implementation, load from database
        self.patients = {}
        self.risk_assessments = {}
        self.patient_alerts = {}
    
    async def _initialize_protocols(self):
        """Inicializa protocolos de monitoramento"""
        self.monitoring_protocols = {}
    
    async def _continuous_patient_monitoring(self):
        """Monitoramento contínuo de pacientes"""
        while self.is_active:
            try:
                await asyncio.sleep(600)  # 10 minutes
                await self.perform_monitoring_cycle()
            except Exception as e:
                logger.error(f"Error in continuous patient monitoring: {e}")
    
    async def _initialize_risk_assessment(self, patient_id: str):
        """Inicializa avaliação de risco para um paciente"""
        self.risk_assessments[patient_id] = []
        
        # Perform initial risk assessment
        await self.assess_patient_risk(patient_id)
    
    async def _setup_monitoring_protocol(self, patient_id: str, patient_data: Dict[str, Any]):
        """Configura protocolo de monitoramento"""
        protocol = {
            "vital_signs_frequency": self._determine_vital_signs_frequency(patient_data),
            "required_measurements": self._determine_required_measurements(patient_data),
            "alert_thresholds": self._determine_alert_thresholds(patient_data),
            "escalation_rules": self._determine_escalation_rules(patient_data),
            "documentation_requirements": self._determine_documentation_requirements(patient_data)
        }
        
        self.monitoring_protocols[patient_id] = protocol
    
    def _determine_vital_signs_frequency(self, patient_data: Dict[str, Any]) -> str:
        """Determina frequência de monitoramento de sinais vitais"""
        diagnosis = patient_data.get("diagnosis", [])
        age = patient_data.get("age", 0)
        
        # High frequency for critical conditions
        critical_conditions = ["sepsis", "cardiac_arrest", "respiratory_failure", "shock"]
        if any(condition in str(diagnosis).lower() for condition in critical_conditions):
            return "continuous"
        
        # Frequent monitoring for elderly or specific conditions
        if age > 65 or any(condition in str(diagnosis).lower() for condition in ["diabetes", "hypertension", "copd"]):
            return "every_15_minutes"
        
        return "every_hour"
    
    def _determine_required_measurements(self, patient_data: Dict[str, Any]) -> List[str]:
        """Determina medições obrigatórias"""
        base_measurements = ["heart_rate", "blood_pressure", "temperature", "respiratory_rate", "oxygen_saturation"]
        
        diagnosis = patient_data.get("diagnosis", [])
        
        # Add glucose monitoring for diabetics
        if "diabetes" in str(diagnosis).lower():
            base_measurements.append("glucose")
        
        # Add specific measurements based on conditions
        if "cardiac" in str(diagnosis).lower():
            base_measurements.extend(["ecg", "cardiac_enzymes"])
        
        if "respiratory" in str(diagnosis).lower():
            base_measurements.extend(["peak_flow", "arterial_blood_gas"])
        
        return list(set(base_measurements))
    
    def _determine_alert_thresholds(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Determina limites de alerta personalizados"""
        age = patient_data.get("age", 0)
        diagnosis = patient_data.get("diagnosis", [])
        
        # Base thresholds
        thresholds = {
            "heart_rate": {"min": 60, "max": 100},
            "blood_pressure_systolic": {"min": 90, "max": 140},
            "temperature": {"min": 36.1, "max": 37.2},
            "oxygen_saturation": {"min": 95, "max": 100}
        }
        
        # Adjust for age
        if age > 65:
            thresholds["heart_rate"]["min"] = 50
            thresholds["blood_pressure_systolic"]["max"] = 150
        
        # Adjust for conditions
        if "copd" in str(diagnosis).lower():
            thresholds["oxygen_saturation"]["min"] = 88
        
        return thresholds
    
    def _determine_escalation_rules(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Determina regras de escalação"""
        return {
            "immediate_escalation": ["critical_vitals", "cardiac_arrest", "respiratory_arrest"],
            "rapid_escalation": ["high_risk_vitals", "patient_distress"],
            "standard_escalation": ["abnormal_vitals", "medication_reaction"],
            "notification_chain": ["primary_nurse", "charge_nurse", "attending_physician", "supervisor"]
        }
    
    def _determine_documentation_requirements(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Determina requisitos de documentação"""
        return {
            "vital_signs_documentation": "every_measurement",
            "assessment_documentation": "every_shift",
            "medication_documentation": "every_administration",
            "incident_documentation": "immediate"
        }
    
    async def _calculate_risk_score(self, patient_id: str, vital_signs_data: Dict[str, Any] = None) -> float:
        """Calcula score de risco"""
        patient = self.patients[patient_id]
        risk_score = 0.0
        
        # Age factor
        age = patient.get("age", 0)
        if age > 80:
            risk_score += 3.0
        elif age > 65:
            risk_score += 2.0
        elif age > 50:
            risk_score += 1.0
        
        # Diagnosis factor
        high_risk_conditions = ["sepsis", "cardiac_arrest", "stroke", "respiratory_failure", "shock"]
        moderate_risk_conditions = ["pneumonia", "diabetes", "copd", "heart_failure"]
        
        diagnosis = str(patient.get("diagnosis", [])).lower()
        for condition in high_risk_conditions:
            if condition in diagnosis:
                risk_score += 5.0
                break
        else:
            for condition in moderate_risk_conditions:
                if condition in diagnosis:
                    risk_score += 2.0
                    break
        
        # Vital signs factor
        if vital_signs_data:
            risk_score += await self._calculate_vital_signs_risk_score(vital_signs_data)
        
        # Medication factor
        high_risk_meds = ["warfarin", "insulin", "digoxin", "chemotherapy"]
        medications = str(patient.get("medications", [])).lower()
        for med in high_risk_meds:
            if med in medications:
                risk_score += 1.0
        
        # Length of stay factor
        admission_date = patient.get("admission_date")
        if admission_date:
            try:
                admission_dt = datetime.fromisoformat(admission_date.replace("Z", "+00:00"))
                days_in_hospital = (datetime.now(timezone.utc) - admission_dt).days
                if days_in_hospital > 14:
                    risk_score += 2.0
                elif days_in_hospital > 7:
                    risk_score += 1.0
            except Exception:
                pass
        
        return min(risk_score, 20.0)  # Cap at 20
    
    async def _calculate_vital_signs_risk_score(self, vital_signs_data: Dict[str, Any]) -> float:
        """Calcula score de risco baseado em sinais vitais"""
        risk_score = 0.0
        
        # Heart rate
        hr = vital_signs_data.get("heart_rate")
        if hr:
            if hr < 40 or hr > 130:
                risk_score += 3.0
            elif hr < 50 or hr > 110:
                risk_score += 2.0
            elif hr < 60 or hr > 100:
                risk_score += 1.0
        
        # Blood pressure
        bp_sys = vital_signs_data.get("blood_pressure_systolic")
        if bp_sys:
            if bp_sys < 70 or bp_sys > 200:
                risk_score += 3.0
            elif bp_sys < 90 or bp_sys > 160:
                risk_score += 2.0
            elif bp_sys < 100 or bp_sys > 140:
                risk_score += 1.0
        
        # Temperature
        temp = vital_signs_data.get("temperature")
        if temp:
            if temp < 35.0 or temp > 39.5:
                risk_score += 3.0
            elif temp < 36.0 or temp > 38.5:
                risk_score += 2.0
            elif temp < 36.5 or temp > 37.5:
                risk_score += 1.0
        
        # Oxygen saturation
        spo2 = vital_signs_data.get("oxygen_saturation")
        if spo2:
            if spo2 < 85:
                risk_score += 3.0
            elif spo2 < 90:
                risk_score += 2.0
            elif spo2 < 95:
                risk_score += 1.0
        
        return risk_score
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Determina nível de risco baseado no score"""
        if risk_score >= 15:
            return RiskLevel.CRITICAL
        elif risk_score >= 10:
            return RiskLevel.HIGH
        elif risk_score >= 5:
            return RiskLevel.MODERATE
        else:
            return RiskLevel.LOW
    
    async def _identify_risk_factors(self, patient_id: str, vital_signs_data: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Identifica fatores de risco"""
        factors = []
        patient = self.patients[patient_id]
        
        # Age factor
        age = patient.get("age", 0)
        if age > 65:
            factors.append({
                "type": "demographic",
                "factor": "advanced_age",
                "description": f"Idade avançada ({age} anos)",
                "risk_contribution": "moderate" if age < 80 else "high"
            })
        
        # Diagnosis factors
        diagnosis = patient.get("diagnosis", [])
        high_risk_conditions = ["sepsis", "cardiac_arrest", "stroke", "respiratory_failure"]
        for condition in high_risk_conditions:
            if condition in str(diagnosis).lower():
                factors.append({
                    "type": "medical",
                    "factor": "high_risk_diagnosis",
                    "description": f"Diagnóstico de alto risco: {condition}",
                    "risk_contribution": "high"
                })
        
        # Vital signs factors
        if vital_signs_data:
            vital_factors = await self._identify_vital_signs_risk_factors(vital_signs_data)
            factors.extend(vital_factors)
        
        return factors
    
    async def _identify_vital_signs_risk_factors(self, vital_signs_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identifica fatores de risco nos sinais vitais"""
        factors = []
        
        # Check each vital sign
        hr = vital_signs_data.get("heart_rate")
        if hr and (hr < 50 or hr > 110):
            factors.append({
                "type": "vital_signs",
                "factor": "abnormal_heart_rate",
                "description": f"Frequência cardíaca anormal: {hr} bpm",
                "risk_contribution": "high" if hr < 40 or hr > 130 else "moderate"
            })
        
        bp_sys = vital_signs_data.get("blood_pressure_systolic")
        if bp_sys and (bp_sys < 90 or bp_sys > 160):
            factors.append({
                "type": "vital_signs",
                "factor": "abnormal_blood_pressure",
                "description": f"Pressão arterial anormal: {bp_sys} mmHg",
                "risk_contribution": "high" if bp_sys < 70 or bp_sys > 200 else "moderate"
            })
        
        return factors
    
    async def _generate_risk_recommendations(self, patient_id: str, risk_level: RiskLevel) -> List[str]:
        """Gera recomendações baseadas no risco"""
        recommendations = []
        
        if risk_level == RiskLevel.CRITICAL:
            recommendations.extend([
                "Monitoramento contínuo de sinais vitais",
                "Considerar transferência para UTI",
                "Notificação imediata do médico responsável",
                "Preparar para possível emergência"
            ])
        elif risk_level == RiskLevel.HIGH:
            recommendations.extend([
                "Monitoramento frequente (a cada 15 minutos)",
                "Avaliação médica urgente",
                "Considerar cuidados intensivos",
                "Notificar família sobre estado crítico"
            ])
        elif risk_level == RiskLevel.MODERATE:
            recommendations.extend([
                "Monitoramento a cada 30 minutos",
                "Avaliação médica em 1 hora",
                "Revisar medicações",
                "Monitorar evolução do quadro"
            ])
        else:  # LOW
            recommendations.extend([
                "Monitoramento padrão",
                "Continuar cuidados de rotina",
                "Próxima avaliação conforme protocolo"
            ])
        
        return recommendations
    
    async def _update_monitoring_frequency(self, patient_id: str, status: PatientStatus):
        """Atualiza frequência de monitoramento baseada no status"""
        if patient_id not in self.monitoring_protocols:
            return
        
        protocol = self.monitoring_protocols[patient_id]
        
        if status == PatientStatus.CRITICAL:
            protocol["vital_signs_frequency"] = "continuous"
        elif status == PatientStatus.EMERGENCY:
            protocol["vital_signs_frequency"] = "every_5_minutes"
        elif status == PatientStatus.MONITORING:
            protocol["vital_signs_frequency"] = "every_15_minutes"
        else:  # STABLE
            protocol["vital_signs_frequency"] = "every_hour"
    
    async def _handle_status_change_alerts(self, patient_id: str, old_status: str, new_status: str):
        """Trata alertas de mudança de status"""
        if new_status in ["critical", "emergency"]:
            # Create high priority alert
            alert = {
                "patient_id": patient_id,
                "alert_type": "status_change",
                "severity": "high",
                "message": f"Status do paciente mudou de {old_status} para {new_status}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "requires_immediate_attention": True
            }
            
            await self._store_patient_alert(patient_id, alert)
    
    async def _handle_risk_level_change(self, patient_id: str, old_risk: str, new_risk: str):
        """Trata mudanças no nível de risco"""
        if new_risk in ["high", "critical"] and old_risk in ["low", "moderate"]:
            # Risk escalation
            alert = {
                "patient_id": patient_id,
                "alert_type": "risk_escalation",
                "severity": "high",
                "message": f"Nível de risco aumentou de {old_risk} para {new_risk}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "requires_assessment": True
            }
            
            await self._store_patient_alert(patient_id, alert)
    
    async def _store_patient_alert(self, patient_id: str, alert: Dict[str, Any]):
        """Armazena alerta do paciente"""
        if patient_id not in self.patient_alerts:
            self.patient_alerts[patient_id] = []
        
        self.patient_alerts[patient_id].append(alert)
        
        # Keep only last 50 alerts per patient
        if len(self.patient_alerts[patient_id]) > 50:
            self.patient_alerts[patient_id] = self.patient_alerts[patient_id][-50:]
    
    async def _get_recent_patient_alerts(self, patient_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Obtém alertas recentes do paciente"""
        if patient_id not in self.patient_alerts:
            return []
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        recent_alerts = []
        for alert in self.patient_alerts[patient_id]:
            alert_time = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00"))
            if alert_time > cutoff_time:
                recent_alerts.append(alert)
        
        return recent_alerts
    
    async def _get_active_patient_alerts(self, patient_id: str) -> List[Dict[str, Any]]:
        """Obtém alertas ativos do paciente"""
        if patient_id not in self.patient_alerts:
            return []
        
        # Return unresolved alerts
        return [alert for alert in self.patient_alerts[patient_id] if not alert.get("resolved", False)]
    
    async def _check_monitoring_compliance(self, patient_id: str):
        """Verifica compliance do monitoramento"""
        # Check if monitoring is being performed according to protocol
        pass
    
    async def _update_patient_trends(self, patient_id: str):
        """Atualiza tendências do paciente"""
        # Update patient trend analysis
        pass
    
    async def _cleanup_patient_data(self):
        """Limpa dados antigos de pacientes"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=30)
        
        # Clean up old alerts
        for patient_id in list(self.patient_alerts.keys()):
            if self.patient_alerts[patient_id]:
                self.patient_alerts[patient_id] = [
                    alert for alert in self.patient_alerts[patient_id]
                    if datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00")) > cutoff_time
                ]
                
                if not self.patient_alerts[patient_id]:
                    del self.patient_alerts[patient_id]
        
        # Clean up old risk assessments
        for patient_id in list(self.risk_assessments.keys()):
            if self.risk_assessments[patient_id]:
                self.risk_assessments[patient_id] = [
                    assessment for assessment in self.risk_assessments[patient_id]
                    if datetime.fromisoformat(assessment["timestamp"].replace("Z", "+00:00")) > cutoff_time
                ]
                
                if not self.risk_assessments[patient_id]:
                    del self.risk_assessments[patient_id]