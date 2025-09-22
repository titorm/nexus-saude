"""
Alert Engine
Motor de alertas inteligente
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Set
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Severidade dos alertas"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(Enum):
    """Status dos alertas"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

class AlertCategory(Enum):
    """Categorias de alertas"""
    VITAL_SIGNS = "vital_signs"
    SYSTEM = "system"
    PATIENT = "patient"
    SERVICE = "service"
    SECURITY = "security"
    PERFORMANCE = "performance"

class AlertEngine:
    """Motor de alertas com lógica inteligente"""
    
    def __init__(self):
        self.is_active = False
        self.alerts = {}
        self.alert_rules = {}
        self.suppression_rules = {}
        self.escalation_policies = {}
        self.alert_history = {}
        self.correlation_groups = {}
        
    async def initialize(self):
        """Inicializa o motor de alertas"""
        try:
            logger.info("Initializing Alert Engine...")
            
            # Load alert rules
            await self._load_alert_rules()
            
            # Load suppression rules
            await self._load_suppression_rules()
            
            # Load escalation policies
            await self._load_escalation_policies()
            
            # Start alert processing
            asyncio.create_task(self._continuous_alert_processing())
            
            self.is_active = True
            logger.info("Alert Engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Alert Engine: {e}")
            raise
    
    async def create_alert(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo alerta"""
        try:
            # Generate alert ID if not provided
            alert_id = alert_data.get("id", str(uuid.uuid4()))
            
            # Validate required fields
            required_fields = ["patient_id", "alert_type", "severity", "message"]
            for field in required_fields:
                if field not in alert_data:
                    raise ValueError(f"Required field '{field}' is missing")
            
            # Create alert record
            alert = {
                "id": alert_id,
                "patient_id": alert_data["patient_id"],
                "alert_type": alert_data["alert_type"],
                "severity": alert_data["severity"],
                "message": alert_data["message"],
                "status": AlertStatus.ACTIVE.value,
                "category": self._determine_alert_category(alert_data["alert_type"]),
                "timestamp": alert_data.get("timestamp", datetime.now(timezone.utc).isoformat()),
                "acknowledged": False,
                "acknowledged_by": None,
                "acknowledged_at": None,
                "resolved": False,
                "resolved_by": None,
                "resolved_at": None,
                "escalated": False,
                "escalation_level": 0,
                "correlation_id": None,
                "source": alert_data.get("source", "monitoring_system"),
                "metadata": alert_data.get("metadata", {}),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Check suppression rules
            if await self._should_suppress_alert(alert):
                alert["status"] = AlertStatus.SUPPRESSED.value
                logger.info(f"Alert {alert_id} suppressed by rules")
            
            # Check for correlation with existing alerts
            correlation_id = await self._correlate_alert(alert)
            if correlation_id:
                alert["correlation_id"] = correlation_id
            
            # Store alert
            self.alerts[alert_id] = alert
            
            # Add to patient-specific alerts
            patient_id = alert["patient_id"]
            if patient_id not in self.alert_history:
                self.alert_history[patient_id] = []
            
            self.alert_history[patient_id].append(alert_id)
            
            # Keep only last 100 alerts per patient
            if len(self.alert_history[patient_id]) > 100:
                self.alert_history[patient_id] = self.alert_history[patient_id][-100:]
            
            # Process alert if not suppressed
            if alert["status"] != AlertStatus.SUPPRESSED.value:
                await self._process_new_alert(alert)
            
            logger.info(f"Alert created: {alert_id} - {alert['message']}")
            
            return {
                "status": "created",
                "alert_id": alert_id,
                "severity": alert["severity"],
                "correlation_id": alert.get("correlation_id"),
                "suppressed": alert["status"] == AlertStatus.SUPPRESSED.value
            }
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
            raise
    
    async def acknowledge_alert(self, alert_id: str, user_id: str) -> Dict[str, Any]:
        """Reconhece um alerta"""
        try:
            if alert_id not in self.alerts:
                raise ValueError(f"Alert {alert_id} not found")
            
            alert = self.alerts[alert_id]
            
            if alert["acknowledged"]:
                return {
                    "status": "already_acknowledged",
                    "alert_id": alert_id,
                    "acknowledged_by": alert["acknowledged_by"]
                }
            
            # Update alert
            alert["acknowledged"] = True
            alert["acknowledged_by"] = user_id
            alert["acknowledged_at"] = datetime.now(timezone.utc).isoformat()
            alert["status"] = AlertStatus.ACKNOWLEDGED.value
            
            # If alert is part of a correlation group, acknowledge related alerts
            if alert.get("correlation_id"):
                await self._acknowledge_correlated_alerts(alert["correlation_id"], user_id, alert_id)
            
            logger.info(f"Alert {alert_id} acknowledged by {user_id}")
            
            return {
                "status": "acknowledged",
                "alert_id": alert_id,
                "acknowledged_by": user_id,
                "acknowledged_at": alert["acknowledged_at"]
            }
            
        except Exception as e:
            logger.error(f"Error acknowledging alert {alert_id}: {e}")
            raise
    
    async def resolve_alert(self, alert_id: str, user_id: str, resolution_notes: str = None) -> Dict[str, Any]:
        """Resolve um alerta"""
        try:
            if alert_id not in self.alerts:
                raise ValueError(f"Alert {alert_id} not found")
            
            alert = self.alerts[alert_id]
            
            if alert["resolved"]:
                return {
                    "status": "already_resolved",
                    "alert_id": alert_id,
                    "resolved_by": alert["resolved_by"]
                }
            
            # Update alert
            alert["resolved"] = True
            alert["resolved_by"] = user_id
            alert["resolved_at"] = datetime.now(timezone.utc).isoformat()
            alert["status"] = AlertStatus.RESOLVED.value
            
            if resolution_notes:
                alert["resolution_notes"] = resolution_notes
            
            # Auto-acknowledge if not already acknowledged
            if not alert["acknowledged"]:
                alert["acknowledged"] = True
                alert["acknowledged_by"] = user_id
                alert["acknowledged_at"] = alert["resolved_at"]
            
            logger.info(f"Alert {alert_id} resolved by {user_id}")
            
            return {
                "status": "resolved",
                "alert_id": alert_id,
                "resolved_by": user_id,
                "resolved_at": alert["resolved_at"],
                "resolution_notes": resolution_notes
            }
            
        except Exception as e:
            logger.error(f"Error resolving alert {alert_id}: {e}")
            raise
    
    async def get_alerts(self, severity: str = None, patient_id: str = None, 
                        unresolved_only: bool = True, limit: int = 100) -> List[Dict[str, Any]]:
        """Busca alertas com filtros"""
        try:
            filtered_alerts = []
            
            for alert_id, alert in self.alerts.items():
                # Filter by severity
                if severity and alert["severity"] != severity:
                    continue
                
                # Filter by patient
                if patient_id and alert["patient_id"] != patient_id:
                    continue
                
                # Filter by resolution status
                if unresolved_only and alert["resolved"]:
                    continue
                
                filtered_alerts.append(alert.copy())
            
            # Sort by timestamp (newest first)
            filtered_alerts.sort(key=lambda x: x["timestamp"], reverse=True)
            
            # Apply limit
            if limit:
                filtered_alerts = filtered_alerts[:limit]
            
            return filtered_alerts
            
        except Exception as e:
            logger.error(f"Error getting alerts: {e}")
            raise
    
    async def get_patient_alerts(self, patient_id: str, hours: int = 24) -> List[Dict[str, Any]]:
        """Busca alertas de um paciente"""
        try:
            if patient_id not in self.alert_history:
                return []
            
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            patient_alerts = []
            
            for alert_id in self.alert_history[patient_id]:
                if alert_id in self.alerts:
                    alert = self.alerts[alert_id]
                    alert_time = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00"))
                    
                    if alert_time > cutoff_time:
                        patient_alerts.append(alert.copy())
            
            # Sort by timestamp (newest first)
            patient_alerts.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return patient_alerts
            
        except Exception as e:
            logger.error(f"Error getting patient alerts: {e}")
            raise
    
    async def get_alert_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Obtém estatísticas de alertas"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            stats = {
                "total_alerts": 0,
                "by_severity": {severity.value: 0 for severity in AlertSeverity},
                "by_status": {status.value: 0 for status in AlertStatus},
                "by_category": {category.value: 0 for category in AlertCategory},
                "acknowledged_count": 0,
                "resolved_count": 0,
                "escalated_count": 0,
                "suppressed_count": 0,
                "average_resolution_time": 0,
                "top_alert_types": {}
            }
            
            resolution_times = []
            
            for alert in self.alerts.values():
                alert_time = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00"))
                
                if alert_time < cutoff_time:
                    continue
                
                stats["total_alerts"] += 1
                stats["by_severity"][alert["severity"]] += 1
                stats["by_status"][alert["status"]] += 1
                stats["by_category"][alert["category"]] += 1
                
                if alert["acknowledged"]:
                    stats["acknowledged_count"] += 1
                
                if alert["resolved"]:
                    stats["resolved_count"] += 1
                    
                    # Calculate resolution time
                    if alert.get("resolved_at"):
                        resolution_time = datetime.fromisoformat(alert["resolved_at"].replace("Z", "+00:00"))
                        time_diff = (resolution_time - alert_time).total_seconds() / 60  # minutes
                        resolution_times.append(time_diff)
                
                if alert["escalated"]:
                    stats["escalated_count"] += 1
                
                if alert["status"] == AlertStatus.SUPPRESSED.value:
                    stats["suppressed_count"] += 1
                
                # Count alert types
                alert_type = alert["alert_type"]
                stats["top_alert_types"][alert_type] = stats["top_alert_types"].get(alert_type, 0) + 1
            
            # Calculate average resolution time
            if resolution_times:
                stats["average_resolution_time"] = sum(resolution_times) / len(resolution_times)
            
            # Sort top alert types
            stats["top_alert_types"] = dict(
                sorted(stats["top_alert_types"].items(), key=lambda x: x[1], reverse=True)
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting alert statistics: {e}")
            raise
    
    async def process_pending_alerts(self):
        """Processa alertas pendentes"""
        try:
            current_time = datetime.now(timezone.utc)
            
            for alert_id, alert in self.alerts.items():
                if alert["status"] not in [AlertStatus.ACTIVE.value, AlertStatus.ACKNOWLEDGED.value]:
                    continue
                
                # Check for escalation
                if await self._should_escalate_alert(alert, current_time):
                    await self._escalate_alert(alert)
                
                # Check for auto-resolution
                if await self._should_auto_resolve_alert(alert, current_time):
                    await self.resolve_alert(alert_id, "system", "Auto-resolved by system")
            
        except Exception as e:
            logger.error(f"Error processing pending alerts: {e}")
    
    async def _load_alert_rules(self):
        """Carrega regras de alertas"""
        self.alert_rules = {
            "vital_signs": {
                "bradycardia": {
                    "severity_mapping": {
                        "heart_rate": {
                            "< 40": AlertSeverity.CRITICAL.value,
                            "< 50": AlertSeverity.HIGH.value,
                            "< 60": AlertSeverity.MEDIUM.value
                        }
                    }
                },
                "tachycardia": {
                    "severity_mapping": {
                        "heart_rate": {
                            "> 130": AlertSeverity.CRITICAL.value,
                            "> 120": AlertSeverity.HIGH.value,
                            "> 100": AlertSeverity.MEDIUM.value
                        }
                    }
                }
            },
            "system": {
                "cpu_high": {
                    "thresholds": {
                        "warning": 80,
                        "critical": 95
                    }
                },
                "memory_high": {
                    "thresholds": {
                        "warning": 80,
                        "critical": 95
                    }
                }
            }
        }
    
    async def _load_suppression_rules(self):
        """Carrega regras de supressão"""
        self.suppression_rules = {
            "duplicate_prevention": {
                "enabled": True,
                "time_window": 300,  # 5 minutes
                "same_patient_same_type": True
            },
            "maintenance_windows": {
                "enabled": True,
                "windows": []
            },
            "low_priority_during_critical": {
                "enabled": True,
                "suppress_severities": [AlertSeverity.LOW.value]
            }
        }
    
    async def _load_escalation_policies(self):
        """Carrega políticas de escalação"""
        self.escalation_policies = {
            "critical_alerts": {
                "severity": AlertSeverity.CRITICAL.value,
                "escalation_time": 300,  # 5 minutes
                "max_escalation_level": 3
            },
            "high_alerts": {
                "severity": AlertSeverity.HIGH.value,
                "escalation_time": 900,  # 15 minutes
                "max_escalation_level": 2
            },
            "medium_alerts": {
                "severity": AlertSeverity.MEDIUM.value,
                "escalation_time": 1800,  # 30 minutes
                "max_escalation_level": 1
            }
        }
    
    async def _continuous_alert_processing(self):
        """Processamento contínuo de alertas"""
        while self.is_active:
            try:
                await asyncio.sleep(60)  # 1 minute
                await self.process_pending_alerts()
                await self._cleanup_old_alerts()
            except Exception as e:
                logger.error(f"Error in continuous alert processing: {e}")
    
    def _determine_alert_category(self, alert_type: str) -> str:
        """Determina categoria do alerta"""
        vital_signs_types = ["bradycardia", "tachycardia", "hypotension", "hypertension", 
                           "hypothermia", "hyperthermia", "hypoxemia", "hyperglycemia"]
        
        system_types = ["cpu_high", "memory_high", "disk_full", "service_down"]
        
        patient_types = ["status_change", "risk_escalation", "medication_due"]
        
        if any(vs_type in alert_type for vs_type in vital_signs_types):
            return AlertCategory.VITAL_SIGNS.value
        elif any(sys_type in alert_type for sys_type in system_types):
            return AlertCategory.SYSTEM.value
        elif any(pat_type in alert_type for pat_type in patient_types):
            return AlertCategory.PATIENT.value
        else:
            return AlertCategory.SYSTEM.value  # Default
    
    async def _should_suppress_alert(self, alert: Dict[str, Any]) -> bool:
        """Verifica se alerta deve ser suprimido"""
        try:
            # Check for duplicates
            if self.suppression_rules["duplicate_prevention"]["enabled"]:
                if await self._is_duplicate_alert(alert):
                    return True
            
            # Check maintenance windows
            if self.suppression_rules["maintenance_windows"]["enabled"]:
                if await self._is_in_maintenance_window(alert):
                    return True
            
            # Check for low priority during critical alerts
            if self.suppression_rules["low_priority_during_critical"]["enabled"]:
                if await self._should_suppress_low_priority(alert):
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking alert suppression: {e}")
            return False
    
    async def _is_duplicate_alert(self, alert: Dict[str, Any]) -> bool:
        """Verifica se é alerta duplicado"""
        current_time = datetime.now(timezone.utc)
        time_window = timedelta(seconds=self.suppression_rules["duplicate_prevention"]["time_window"])
        
        for existing_alert in self.alerts.values():
            if existing_alert["resolved"]:
                continue
            
            existing_time = datetime.fromisoformat(existing_alert["timestamp"].replace("Z", "+00:00"))
            
            if current_time - existing_time > time_window:
                continue
            
            # Check if same patient and same type
            if (existing_alert["patient_id"] == alert["patient_id"] and
                existing_alert["alert_type"] == alert["alert_type"]):
                return True
        
        return False
    
    async def _is_in_maintenance_window(self, alert: Dict[str, Any]) -> bool:
        """Verifica se está em janela de manutenção"""
        # Implementation would check against configured maintenance windows
        return False
    
    async def _should_suppress_low_priority(self, alert: Dict[str, Any]) -> bool:
        """Verifica se deve suprimir alerta de baixa prioridade"""
        if alert["severity"] not in self.suppression_rules["low_priority_during_critical"]["suppress_severities"]:
            return False
        
        # Check if there are active critical alerts for the same patient
        for existing_alert in self.alerts.values():
            if (existing_alert["patient_id"] == alert["patient_id"] and
                existing_alert["severity"] == AlertSeverity.CRITICAL.value and
                not existing_alert["resolved"]):
                return True
        
        return False
    
    async def _correlate_alert(self, alert: Dict[str, Any]) -> Optional[str]:
        """Correlaciona alerta com alertas existentes"""
        patient_id = alert["patient_id"]
        alert_category = alert["category"]
        
        # Look for related alerts in the same category for the same patient
        for existing_alert in self.alerts.values():
            if (existing_alert["patient_id"] == patient_id and
                existing_alert["category"] == alert_category and
                not existing_alert["resolved"] and
                existing_alert.get("correlation_id")):
                return existing_alert["correlation_id"]
        
        # Create new correlation group if multiple related alerts
        correlation_candidates = [
            existing_alert for existing_alert in self.alerts.values()
            if (existing_alert["patient_id"] == patient_id and
                existing_alert["category"] == alert_category and
                not existing_alert["resolved"])
        ]
        
        if len(correlation_candidates) >= 2:
            correlation_id = str(uuid.uuid4())
            
            # Update existing alerts with correlation ID
            for candidate in correlation_candidates:
                candidate["correlation_id"] = correlation_id
            
            return correlation_id
        
        return None
    
    async def _process_new_alert(self, alert: Dict[str, Any]):
        """Processa novo alerta"""
        # Log alert creation
        logger.info(f"Processing new alert: {alert['id']} - {alert['severity']} - {alert['message']}")
        
        # Check if immediate escalation is needed
        if alert["severity"] == AlertSeverity.CRITICAL.value:
            # Critical alerts may need immediate notification
            pass
    
    async def _acknowledge_correlated_alerts(self, correlation_id: str, user_id: str, source_alert_id: str):
        """Reconhece alertas correlacionados"""
        for alert_id, alert in self.alerts.items():
            if (alert.get("correlation_id") == correlation_id and
                alert_id != source_alert_id and
                not alert["acknowledged"]):
                
                alert["acknowledged"] = True
                alert["acknowledged_by"] = f"{user_id} (correlated)"
                alert["acknowledged_at"] = datetime.now(timezone.utc).isoformat()
                alert["status"] = AlertStatus.ACKNOWLEDGED.value
    
    async def _should_escalate_alert(self, alert: Dict[str, Any], current_time: datetime) -> bool:
        """Verifica se alerta deve ser escalado"""
        if alert["resolved"] or alert["escalated"]:
            return False
        
        severity = alert["severity"]
        alert_time = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00"))
        
        # Check escalation policies
        for policy_name, policy in self.escalation_policies.items():
            if policy["severity"] == severity:
                escalation_time = timedelta(seconds=policy["escalation_time"])
                
                if current_time - alert_time >= escalation_time:
                    if alert["escalation_level"] < policy["max_escalation_level"]:
                        return True
        
        return False
    
    async def _escalate_alert(self, alert: Dict[str, Any]):
        """Escala um alerta"""
        alert["escalated"] = True
        alert["escalation_level"] += 1
        alert["last_escalation"] = datetime.now(timezone.utc).isoformat()
        
        logger.warning(f"Alert {alert['id']} escalated to level {alert['escalation_level']}")
    
    async def _should_auto_resolve_alert(self, alert: Dict[str, Any], current_time: datetime) -> bool:
        """Verifica se alerta deve ser resolvido automaticamente"""
        # Implementation would check conditions for auto-resolution
        # For example, if the underlying condition has been resolved
        return False
    
    async def _cleanup_old_alerts(self):
        """Limpa alertas antigos"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=30)
        
        alerts_to_remove = []
        for alert_id, alert in self.alerts.items():
            alert_time = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00"))
            
            if alert_time < cutoff_time and alert["resolved"]:
                alerts_to_remove.append(alert_id)
        
        for alert_id in alerts_to_remove:
            del self.alerts[alert_id]
        
        if alerts_to_remove:
            logger.info(f"Cleaned up {len(alerts_to_remove)} old resolved alerts")