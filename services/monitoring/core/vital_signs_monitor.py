"""
Vital Signs Monitor
Monitoramento de sinais vitais em tempo real
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class VitalSignType(Enum):
    """Tipos de sinais vitais"""
    HEART_RATE = "heart_rate"
    BLOOD_PRESSURE = "blood_pressure"
    TEMPERATURE = "temperature"
    RESPIRATORY_RATE = "respiratory_rate"
    OXYGEN_SATURATION = "oxygen_saturation"
    GLUCOSE = "glucose"

class VitalSignsAlert(Enum):
    """Tipos de alertas de sinais vitais"""
    BRADYCARDIA = "bradycardia"
    TACHYCARDIA = "tachycardia"
    HYPOTENSION = "hypotension"
    HYPERTENSION = "hypertension"
    HYPOTHERMIA = "hypothermia"
    HYPERTHERMIA = "hyperthermia"
    BRADYPNEA = "bradypnea"
    TACHYPNEA = "tachypnea"
    HYPOXEMIA = "hypoxemia"
    HYPEROXEMIA = "hyperoxemia"
    HYPOGLYCEMIA = "hypoglycemia"
    HYPERGLYCEMIA = "hyperglycemia"

class VitalSignsMonitor:
    """Monitor de sinais vitais com alertas inteligentes"""
    
    def __init__(self):
        self.is_active = False
        self.patient_data = {}
        self.alert_thresholds = self._load_default_thresholds()
        self.trends_cache = {}
        self.baseline_cache = {}
        
    async def initialize(self):
        """Inicializa o monitor de sinais vitais"""
        try:
            logger.info("Initializing Vital Signs Monitor...")
            
            # Load configurations
            await self._load_configurations()
            
            # Initialize data structures
            await self._initialize_data_structures()
            
            # Start trend analysis
            asyncio.create_task(self._continuous_trend_analysis())
            
            self.is_active = True
            logger.info("Vital Signs Monitor initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Vital Signs Monitor: {e}")
            raise
    
    async def process_vital_signs(self, vital_signs_data: Dict[str, Any]) -> Dict[str, Any]:
        """Processa dados de sinais vitais"""
        try:
            patient_id = vital_signs_data.get("patient_id")
            timestamp = vital_signs_data.get("timestamp", datetime.now(timezone.utc).isoformat())
            
            # Validate data
            if not patient_id:
                raise ValueError("Patient ID is required")
            
            # Store data
            await self._store_vital_signs(patient_id, vital_signs_data)
            
            # Analyze trends
            trends = await self._analyze_trends(patient_id, vital_signs_data)
            
            # Check for alerts
            alerts = await self.check_alerts(vital_signs_data)
            
            # Update baseline if needed
            await self._update_baseline(patient_id, vital_signs_data)
            
            result = {
                "status": "processed",
                "patient_id": patient_id,
                "timestamp": timestamp,
                "trends": trends,
                "alerts_triggered": len(alerts),
                "alerts": alerts
            }
            
            logger.info(f"Processed vital signs for patient {patient_id}: {len(alerts)} alerts")
            return result
            
        except Exception as e:
            logger.error(f"Error processing vital signs: {e}")
            raise
    
    async def check_alerts(self, vital_signs_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas baseados nos sinais vitais"""
        alerts = []
        patient_id = vital_signs_data.get("patient_id")
        
        try:
            # Get patient-specific thresholds
            thresholds = await self._get_patient_thresholds(patient_id)
            
            # Check each vital sign
            alerts.extend(await self._check_heart_rate_alerts(vital_signs_data, thresholds))
            alerts.extend(await self._check_blood_pressure_alerts(vital_signs_data, thresholds))
            alerts.extend(await self._check_temperature_alerts(vital_signs_data, thresholds))
            alerts.extend(await self._check_respiratory_alerts(vital_signs_data, thresholds))
            alerts.extend(await self._check_oxygen_alerts(vital_signs_data, thresholds))
            alerts.extend(await self._check_glucose_alerts(vital_signs_data, thresholds))
            
            # Check trend-based alerts
            trend_alerts = await self._check_trend_alerts(patient_id, vital_signs_data)
            alerts.extend(trend_alerts)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking alerts for patient {patient_id}: {e}")
            return []
    
    async def get_patient_vital_signs(self, patient_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Busca sinais vitais de um paciente"""
        try:
            if patient_id not in self.patient_data:
                return []
            
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            # Filter data by time range
            patient_records = self.patient_data[patient_id]
            filtered_records = [
                record for record in patient_records
                if datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00")) > cutoff_time
            ]
            
            # Sort by timestamp
            filtered_records.sort(key=lambda x: x["timestamp"])
            
            return filtered_records
            
        except Exception as e:
            logger.error(f"Error getting vital signs for patient {patient_id}: {e}")
            return []
    
    async def perform_monitoring_cycle(self):
        """Executa ciclo de monitoramento"""
        try:
            # Check for missing data
            await self._check_missing_data()
            
            # Update trends
            await self._update_all_trends()
            
            # Check for deterioration patterns
            await self._check_deterioration_patterns()
            
            # Clean old data
            await self._cleanup_old_data()
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")
    
    async def _load_configurations(self):
        """Carrega configurações"""
        # In a real implementation, load from database or config file
        pass
    
    async def _initialize_data_structures(self):
        """Inicializa estruturas de dados"""
        self.patient_data = {}
        self.trends_cache = {}
        self.baseline_cache = {}
    
    def _load_default_thresholds(self) -> Dict[str, Dict[str, Any]]:
        """Carrega limites padrão para alertas"""
        return {
            "heart_rate": {
                "min_normal": 60,
                "max_normal": 100,
                "min_critical": 40,
                "max_critical": 120
            },
            "blood_pressure_systolic": {
                "min_normal": 90,
                "max_normal": 140,
                "min_critical": 70,
                "max_critical": 180
            },
            "blood_pressure_diastolic": {
                "min_normal": 60,
                "max_normal": 90,
                "min_critical": 40,
                "max_critical": 110
            },
            "temperature": {
                "min_normal": 36.1,
                "max_normal": 37.2,
                "min_critical": 35.0,
                "max_critical": 39.0
            },
            "respiratory_rate": {
                "min_normal": 12,
                "max_normal": 20,
                "min_critical": 8,
                "max_critical": 30
            },
            "oxygen_saturation": {
                "min_normal": 95,
                "max_normal": 100,
                "min_critical": 88,
                "max_critical": 100
            },
            "glucose": {
                "min_normal": 70,
                "max_normal": 140,
                "min_critical": 50,
                "max_critical": 300
            }
        }
    
    async def _store_vital_signs(self, patient_id: str, data: Dict[str, Any]):
        """Armazena dados de sinais vitais"""
        if patient_id not in self.patient_data:
            self.patient_data[patient_id] = []
        
        # Add timestamp if not present
        if "timestamp" not in data:
            data["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        self.patient_data[patient_id].append(data.copy())
        
        # Keep only last 1000 records per patient
        if len(self.patient_data[patient_id]) > 1000:
            self.patient_data[patient_id] = self.patient_data[patient_id][-1000:]
    
    async def _analyze_trends(self, patient_id: str, current_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analisa tendências dos sinais vitais"""
        try:
            trends = {}
            
            # Get recent history
            recent_data = await self.get_patient_vital_signs(patient_id, hours=6)
            
            if len(recent_data) < 2:
                return {"status": "insufficient_data"}
            
            # Analyze trends for each vital sign
            for vital_sign in ["heart_rate", "blood_pressure_systolic", "blood_pressure_diastolic", 
                             "temperature", "respiratory_rate", "oxygen_saturation", "glucose"]:
                
                values = [record.get(vital_sign) for record in recent_data if record.get(vital_sign)]
                
                if len(values) >= 2:
                    trend = self._calculate_trend(values)
                    trends[vital_sign] = {
                        "direction": trend["direction"],
                        "magnitude": trend["magnitude"],
                        "stability": trend["stability"]
                    }
            
            return trends
            
        except Exception as e:
            logger.error(f"Error analyzing trends for patient {patient_id}: {e}")
            return {}
    
    def _calculate_trend(self, values: List[float]) -> Dict[str, Any]:
        """Calcula tendência de uma série de valores"""
        if len(values) < 2:
            return {"direction": "stable", "magnitude": 0, "stability": "unknown"}
        
        # Simple linear trend calculation
        recent_avg = sum(values[-3:]) / min(3, len(values))
        older_avg = sum(values[:3]) / min(3, len(values))
        
        diff = recent_avg - older_avg
        magnitude = abs(diff)
        
        if magnitude < 0.1:  # Very small change
            direction = "stable"
        elif diff > 0:
            direction = "increasing"
        else:
            direction = "decreasing"
        
        # Calculate stability (coefficient of variation)
        if len(values) > 1:
            mean_val = sum(values) / len(values)
            variance = sum((x - mean_val) ** 2 for x in values) / len(values)
            std_dev = variance ** 0.5
            stability = "stable" if std_dev / mean_val < 0.1 else "variable"
        else:
            stability = "unknown"
        
        return {
            "direction": direction,
            "magnitude": magnitude,
            "stability": stability
        }
    
    async def _get_patient_thresholds(self, patient_id: str) -> Dict[str, Dict[str, Any]]:
        """Obtém limites personalizados do paciente"""
        # In a real implementation, this would load patient-specific thresholds
        # For now, return default thresholds
        return self.alert_thresholds
    
    async def _check_heart_rate_alerts(self, data: Dict[str, Any], thresholds: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas de frequência cardíaca"""
        alerts = []
        heart_rate = data.get("heart_rate")
        
        if heart_rate is None:
            return alerts
        
        hr_thresholds = thresholds.get("heart_rate", {})
        
        if heart_rate < hr_thresholds.get("min_critical", 40):
            alerts.append({
                "alert_type": VitalSignsAlert.BRADYCARDIA.value,
                "severity": "critical",
                "message": f"Bradicardia crítica: {heart_rate} bpm",
                "value": heart_rate,
                "normal_range": f"{hr_thresholds.get('min_normal')}-{hr_thresholds.get('max_normal')} bpm"
            })
        elif heart_rate < hr_thresholds.get("min_normal", 60):
            alerts.append({
                "alert_type": VitalSignsAlert.BRADYCARDIA.value,
                "severity": "medium",
                "message": f"Bradicardia: {heart_rate} bpm",
                "value": heart_rate,
                "normal_range": f"{hr_thresholds.get('min_normal')}-{hr_thresholds.get('max_normal')} bpm"
            })
        elif heart_rate > hr_thresholds.get("max_critical", 120):
            alerts.append({
                "alert_type": VitalSignsAlert.TACHYCARDIA.value,
                "severity": "critical",
                "message": f"Taquicardia crítica: {heart_rate} bpm",
                "value": heart_rate,
                "normal_range": f"{hr_thresholds.get('min_normal')}-{hr_thresholds.get('max_normal')} bpm"
            })
        elif heart_rate > hr_thresholds.get("max_normal", 100):
            alerts.append({
                "alert_type": VitalSignsAlert.TACHYCARDIA.value,
                "severity": "medium",
                "message": f"Taquicardia: {heart_rate} bpm",
                "value": heart_rate,
                "normal_range": f"{hr_thresholds.get('min_normal')}-{hr_thresholds.get('max_normal')} bpm"
            })
        
        return alerts
    
    async def _check_blood_pressure_alerts(self, data: Dict[str, Any], thresholds: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas de pressão arterial"""
        alerts = []
        systolic = data.get("blood_pressure_systolic")
        diastolic = data.get("blood_pressure_diastolic")
        
        if systolic is None and diastolic is None:
            return alerts
        
        # Check systolic pressure
        if systolic is not None:
            sys_thresholds = thresholds.get("blood_pressure_systolic", {})
            
            if systolic < sys_thresholds.get("min_critical", 70):
                alerts.append({
                    "alert_type": VitalSignsAlert.HYPOTENSION.value,
                    "severity": "critical",
                    "message": f"Hipotensão crítica: {systolic} mmHg",
                    "value": systolic,
                    "normal_range": f"{sys_thresholds.get('min_normal')}-{sys_thresholds.get('max_normal')} mmHg"
                })
            elif systolic < sys_thresholds.get("min_normal", 90):
                alerts.append({
                    "alert_type": VitalSignsAlert.HYPOTENSION.value,
                    "severity": "medium",
                    "message": f"Hipotensão: {systolic} mmHg",
                    "value": systolic,
                    "normal_range": f"{sys_thresholds.get('min_normal')}-{sys_thresholds.get('max_normal')} mmHg"
                })
            elif systolic > sys_thresholds.get("max_critical", 180):
                alerts.append({
                    "alert_type": VitalSignsAlert.HYPERTENSION.value,
                    "severity": "critical",
                    "message": f"Hipertensão crítica: {systolic} mmHg",
                    "value": systolic,
                    "normal_range": f"{sys_thresholds.get('min_normal')}-{sys_thresholds.get('max_normal')} mmHg"
                })
            elif systolic > sys_thresholds.get("max_normal", 140):
                alerts.append({
                    "alert_type": VitalSignsAlert.HYPERTENSION.value,
                    "severity": "medium",
                    "message": f"Hipertensão: {systolic} mmHg",
                    "value": systolic,
                    "normal_range": f"{sys_thresholds.get('min_normal')}-{sys_thresholds.get('max_normal')} mmHg"
                })
        
        # Check diastolic pressure
        if diastolic is not None:
            dia_thresholds = thresholds.get("blood_pressure_diastolic", {})
            
            if diastolic < dia_thresholds.get("min_critical", 40):
                alerts.append({
                    "alert_type": VitalSignsAlert.HYPOTENSION.value,
                    "severity": "critical",
                    "message": f"Hipotensão diastólica crítica: {diastolic} mmHg",
                    "value": diastolic,
                    "normal_range": f"{dia_thresholds.get('min_normal')}-{dia_thresholds.get('max_normal')} mmHg"
                })
            elif diastolic > dia_thresholds.get("max_critical", 110):
                alerts.append({
                    "alert_type": VitalSignsAlert.HYPERTENSION.value,
                    "severity": "critical",
                    "message": f"Hipertensão diastólica crítica: {diastolic} mmHg",
                    "value": diastolic,
                    "normal_range": f"{dia_thresholds.get('min_normal')}-{dia_thresholds.get('max_normal')} mmHg"
                })
        
        return alerts
    
    async def _check_temperature_alerts(self, data: Dict[str, Any], thresholds: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas de temperatura"""
        alerts = []
        temperature = data.get("temperature")
        
        if temperature is None:
            return alerts
        
        temp_thresholds = thresholds.get("temperature", {})
        
        if temperature < temp_thresholds.get("min_critical", 35.0):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPOTHERMIA.value,
                "severity": "critical",
                "message": f"Hipotermia crítica: {temperature}°C",
                "value": temperature,
                "normal_range": f"{temp_thresholds.get('min_normal')}-{temp_thresholds.get('max_normal')}°C"
            })
        elif temperature < temp_thresholds.get("min_normal", 36.1):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPOTHERMIA.value,
                "severity": "medium",
                "message": f"Hipotermia: {temperature}°C",
                "value": temperature,
                "normal_range": f"{temp_thresholds.get('min_normal')}-{temp_thresholds.get('max_normal')}°C"
            })
        elif temperature > temp_thresholds.get("max_critical", 39.0):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPERTHERMIA.value,
                "severity": "critical",
                "message": f"Hipertermia crítica: {temperature}°C",
                "value": temperature,
                "normal_range": f"{temp_thresholds.get('min_normal')}-{temp_thresholds.get('max_normal')}°C"
            })
        elif temperature > temp_thresholds.get("max_normal", 37.2):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPERTHERMIA.value,
                "severity": "medium",
                "message": f"Hipertermia: {temperature}°C",
                "value": temperature,
                "normal_range": f"{temp_thresholds.get('min_normal')}-{temp_thresholds.get('max_normal')}°C"
            })
        
        return alerts
    
    async def _check_respiratory_alerts(self, data: Dict[str, Any], thresholds: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas de frequência respiratória"""
        alerts = []
        respiratory_rate = data.get("respiratory_rate")
        
        if respiratory_rate is None:
            return alerts
        
        resp_thresholds = thresholds.get("respiratory_rate", {})
        
        if respiratory_rate < resp_thresholds.get("min_critical", 8):
            alerts.append({
                "alert_type": VitalSignsAlert.BRADYPNEA.value,
                "severity": "critical",
                "message": f"Bradipneia crítica: {respiratory_rate} rpm",
                "value": respiratory_rate,
                "normal_range": f"{resp_thresholds.get('min_normal')}-{resp_thresholds.get('max_normal')} rpm"
            })
        elif respiratory_rate < resp_thresholds.get("min_normal", 12):
            alerts.append({
                "alert_type": VitalSignsAlert.BRADYPNEA.value,
                "severity": "medium",
                "message": f"Bradipneia: {respiratory_rate} rpm",
                "value": respiratory_rate,
                "normal_range": f"{resp_thresholds.get('min_normal')}-{resp_thresholds.get('max_normal')} rpm"
            })
        elif respiratory_rate > resp_thresholds.get("max_critical", 30):
            alerts.append({
                "alert_type": VitalSignsAlert.TACHYPNEA.value,
                "severity": "critical",
                "message": f"Taquipneia crítica: {respiratory_rate} rpm",
                "value": respiratory_rate,
                "normal_range": f"{resp_thresholds.get('min_normal')}-{resp_thresholds.get('max_normal')} rpm"
            })
        elif respiratory_rate > resp_thresholds.get("max_normal", 20):
            alerts.append({
                "alert_type": VitalSignsAlert.TACHYPNEA.value,
                "severity": "medium",
                "message": f"Taquipneia: {respiratory_rate} rpm",
                "value": respiratory_rate,
                "normal_range": f"{resp_thresholds.get('min_normal')}-{resp_thresholds.get('max_normal')} rpm"
            })
        
        return alerts
    
    async def _check_oxygen_alerts(self, data: Dict[str, Any], thresholds: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas de saturação de oxigênio"""
        alerts = []
        oxygen_saturation = data.get("oxygen_saturation")
        
        if oxygen_saturation is None:
            return alerts
        
        o2_thresholds = thresholds.get("oxygen_saturation", {})
        
        if oxygen_saturation < o2_thresholds.get("min_critical", 88):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPOXEMIA.value,
                "severity": "critical",
                "message": f"Hipoxemia crítica: {oxygen_saturation}%",
                "value": oxygen_saturation,
                "normal_range": f"{o2_thresholds.get('min_normal')}-{o2_thresholds.get('max_normal')}%"
            })
        elif oxygen_saturation < o2_thresholds.get("min_normal", 95):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPOXEMIA.value,
                "severity": "medium",
                "message": f"Hipoxemia: {oxygen_saturation}%",
                "value": oxygen_saturation,
                "normal_range": f"{o2_thresholds.get('min_normal')}-{o2_thresholds.get('max_normal')}%"
            })
        
        return alerts
    
    async def _check_glucose_alerts(self, data: Dict[str, Any], thresholds: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas de glicose"""
        alerts = []
        glucose = data.get("glucose")
        
        if glucose is None:
            return alerts
        
        glucose_thresholds = thresholds.get("glucose", {})
        
        if glucose < glucose_thresholds.get("min_critical", 50):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPOGLYCEMIA.value,
                "severity": "critical",
                "message": f"Hipoglicemia crítica: {glucose} mg/dL",
                "value": glucose,
                "normal_range": f"{glucose_thresholds.get('min_normal')}-{glucose_thresholds.get('max_normal')} mg/dL"
            })
        elif glucose < glucose_thresholds.get("min_normal", 70):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPOGLYCEMIA.value,
                "severity": "medium",
                "message": f"Hipoglicemia: {glucose} mg/dL",
                "value": glucose,
                "normal_range": f"{glucose_thresholds.get('min_normal')}-{glucose_thresholds.get('max_normal')} mg/dL"
            })
        elif glucose > glucose_thresholds.get("max_critical", 300):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPERGLYCEMIA.value,
                "severity": "critical",
                "message": f"Hiperglicemia crítica: {glucose} mg/dL",
                "value": glucose,
                "normal_range": f"{glucose_thresholds.get('min_normal')}-{glucose_thresholds.get('max_normal')} mg/dL"
            })
        elif glucose > glucose_thresholds.get("max_normal", 140):
            alerts.append({
                "alert_type": VitalSignsAlert.HYPERGLYCEMIA.value,
                "severity": "medium",
                "message": f"Hiperglicemia: {glucose} mg/dL",
                "value": glucose,
                "normal_range": f"{glucose_thresholds.get('min_normal')}-{glucose_thresholds.get('max_normal')} mg/dL"
            })
        
        return alerts
    
    async def _check_trend_alerts(self, patient_id: str, current_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas baseados em tendências"""
        alerts = []
        
        try:
            trends = await self._analyze_trends(patient_id, current_data)
            
            for vital_sign, trend_data in trends.items():
                if trend_data.get("direction") == "decreasing" and trend_data.get("magnitude", 0) > 10:
                    alerts.append({
                        "alert_type": f"declining_{vital_sign}",
                        "severity": "medium",
                        "message": f"Tendência de declínio em {vital_sign}",
                        "trend_info": trend_data
                    })
                elif trend_data.get("stability") == "variable":
                    alerts.append({
                        "alert_type": f"unstable_{vital_sign}",
                        "severity": "low",
                        "message": f"Instabilidade em {vital_sign}",
                        "trend_info": trend_data
                    })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking trend alerts: {e}")
            return []
    
    async def _update_baseline(self, patient_id: str, data: Dict[str, Any]):
        """Atualiza baseline do paciente"""
        # This would update patient's normal ranges based on historical data
        pass
    
    async def _continuous_trend_analysis(self):
        """Análise contínua de tendências"""
        while self.is_active:
            try:
                await asyncio.sleep(300)  # 5 minutes
                # Perform trend analysis for all active patients
                for patient_id in self.patient_data.keys():
                    await self._update_patient_trends(patient_id)
            except Exception as e:
                logger.error(f"Error in continuous trend analysis: {e}")
    
    async def _update_patient_trends(self, patient_id: str):
        """Atualiza tendências de um paciente"""
        try:
            recent_data = await self.get_patient_vital_signs(patient_id, hours=1)
            if recent_data:
                trends = await self._analyze_trends(patient_id, recent_data[-1])
                self.trends_cache[patient_id] = trends
        except Exception as e:
            logger.error(f"Error updating trends for patient {patient_id}: {e}")
    
    async def _check_missing_data(self):
        """Verifica dados ausentes"""
        current_time = datetime.now(timezone.utc)
        
        for patient_id in list(self.patient_data.keys()):
            if not self.patient_data[patient_id]:
                continue
            
            last_data = self.patient_data[patient_id][-1]
            last_time = datetime.fromisoformat(last_data["timestamp"].replace("Z", "+00:00"))
            
            # If no data for more than 30 minutes, create an alert
            if (current_time - last_time).total_seconds() > 1800:  # 30 minutes
                logger.warning(f"No vital signs data for patient {patient_id} for {(current_time - last_time).total_seconds()//60} minutes")
    
    async def _update_all_trends(self):
        """Atualiza todas as tendências"""
        for patient_id in self.patient_data.keys():
            await self._update_patient_trends(patient_id)
    
    async def _check_deterioration_patterns(self):
        """Verifica padrões de deterioração"""
        # Advanced pattern recognition for early warning
        pass
    
    async def _cleanup_old_data(self):
        """Limpa dados antigos"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=7)
        
        for patient_id in list(self.patient_data.keys()):
            # Keep only data from last 7 days
            self.patient_data[patient_id] = [
                record for record in self.patient_data[patient_id]
                if datetime.fromisoformat(record["timestamp"].replace("Z", "+00:00")) > cutoff_time
            ]
            
            # Remove patient if no recent data
            if not self.patient_data[patient_id]:
                del self.patient_data[patient_id]