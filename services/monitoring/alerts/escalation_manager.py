"""
Escalation Manager
Gerenciamento de escalação de alertas
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class EscalationLevel(Enum):
    """Níveis de escalação"""
    LEVEL_1 = "level_1"  # Enfermeiro responsável
    LEVEL_2 = "level_2"  # Enfermeiro chefe
    LEVEL_3 = "level_3"  # Médico plantonista
    LEVEL_4 = "level_4"  # Médico supervisor
    LEVEL_5 = "level_5"  # Diretor clínico

class EscalationStatus(Enum):
    """Status da escalação"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    ESCALATED = "escalated"

class EscalationTrigger(Enum):
    """Gatilhos de escalação"""
    TIME_BASED = "time_based"
    SEVERITY_BASED = "severity_based"
    MANUAL = "manual"
    PATTERN_BASED = "pattern_based"

class EscalationManager:
    """Gerenciador de escalação de alertas"""
    
    def __init__(self):
        self.is_active = False
        self.escalations = {}
        self.escalation_policies = {}
        self.escalation_history = {}
        self.on_call_schedule = {}
        self.escalation_rules = {}
        
    async def initialize(self):
        """Inicializa o gerenciador de escalação"""
        try:
            logger.info("Initializing Escalation Manager...")
            
            # Load escalation policies
            await self._load_escalation_policies()
            
            # Load on-call schedule
            await self._load_on_call_schedule()
            
            # Load escalation rules
            await self._load_escalation_rules()
            
            # Start escalation processing
            asyncio.create_task(self._continuous_escalation_processing())
            
            self.is_active = True
            logger.info("Escalation Manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Escalation Manager: {e}")
            raise
    
    async def initiate_escalation(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Inicia escalação para um alerta"""
        try:
            alert_id = alert_data.get("id")
            if not alert_id:
                raise ValueError("Alert ID is required")
            
            # Check if escalation already exists
            if alert_id in self.escalations:
                return {"status": "escalation_exists", "escalation_id": self.escalations[alert_id]["id"]}
            
            # Create escalation record
            escalation_id = f"esc_{alert_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
            
            escalation = {
                "id": escalation_id,
                "alert_id": alert_id,
                "alert_data": alert_data,
                "status": EscalationStatus.PENDING.value,
                "current_level": EscalationLevel.LEVEL_1.value,
                "trigger": EscalationTrigger.SEVERITY_BASED.value,
                "initiated_at": datetime.now(timezone.utc).isoformat(),
                "policy_applied": await self._determine_escalation_policy(alert_data),
                "escalation_timeline": [],
                "assigned_personnel": [],
                "acknowledgments": [],
                "resolution_attempts": []
            }
            
            # Store escalation
            self.escalations[alert_id] = escalation
            
            # Start escalation process
            await self._process_escalation_level(escalation)
            
            logger.info(f"Escalation initiated for alert {alert_id}: {escalation_id}")
            
            return {
                "status": "initiated",
                "escalation_id": escalation_id,
                "current_level": escalation["current_level"],
                "policy": escalation["policy_applied"]
            }
            
        except Exception as e:
            logger.error(f"Error initiating escalation: {e}")
            raise
    
    async def acknowledge_escalation(self, escalation_id: str, user_id: str, level: str = None) -> Dict[str, Any]:
        """Reconhece uma escalação"""
        try:
            escalation = await self._find_escalation_by_id(escalation_id)
            if not escalation:
                raise ValueError(f"Escalation {escalation_id} not found")
            
            # Record acknowledgment
            acknowledgment = {
                "user_id": user_id,
                "level": level or escalation["current_level"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "acknowledged"
            }
            
            escalation["acknowledgments"].append(acknowledgment)
            escalation["status"] = EscalationStatus.ACKNOWLEDGED.value
            
            # Add to timeline
            escalation["escalation_timeline"].append({
                "timestamp": acknowledgment["timestamp"],
                "action": "escalation_acknowledged",
                "user_id": user_id,
                "level": acknowledgment["level"],
                "details": f"Escalação reconhecida por {user_id}"
            })
            
            logger.info(f"Escalation {escalation_id} acknowledged by {user_id}")
            
            return {
                "status": "acknowledged",
                "escalation_id": escalation_id,
                "acknowledged_by": user_id,
                "acknowledgment_time": acknowledgment["timestamp"]
            }
            
        except Exception as e:
            logger.error(f"Error acknowledging escalation: {e}")
            raise
    
    async def resolve_escalation(self, escalation_id: str, user_id: str, resolution_notes: str = None) -> Dict[str, Any]:
        """Resolve uma escalação"""
        try:
            escalation = await self._find_escalation_by_id(escalation_id)
            if not escalation:
                raise ValueError(f"Escalation {escalation_id} not found")
            
            # Record resolution
            resolution = {
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "notes": resolution_notes,
                "resolution_level": escalation["current_level"]
            }
            
            escalation["resolution_attempts"].append(resolution)
            escalation["status"] = EscalationStatus.RESOLVED.value
            escalation["resolved_at"] = resolution["timestamp"]
            escalation["resolved_by"] = user_id
            
            # Add to timeline
            escalation["escalation_timeline"].append({
                "timestamp": resolution["timestamp"],
                "action": "escalation_resolved",
                "user_id": user_id,
                "level": escalation["current_level"],
                "details": f"Escalação resolvida por {user_id}",
                "notes": resolution_notes
            })
            
            # Move to history
            self.escalation_history[escalation_id] = escalation.copy()
            
            # Remove from active escalations
            alert_id = escalation["alert_id"]
            if alert_id in self.escalations:
                del self.escalations[alert_id]
            
            logger.info(f"Escalation {escalation_id} resolved by {user_id}")
            
            return {
                "status": "resolved",
                "escalation_id": escalation_id,
                "resolved_by": user_id,
                "resolution_time": resolution["timestamp"],
                "resolution_notes": resolution_notes
            }
            
        except Exception as e:
            logger.error(f"Error resolving escalation: {e}")
            raise
    
    async def escalate_to_next_level(self, escalation_id: str, reason: str = None) -> Dict[str, Any]:
        """Escala para o próximo nível"""
        try:
            escalation = await self._find_escalation_by_id(escalation_id)
            if not escalation:
                raise ValueError(f"Escalation {escalation_id} not found")
            
            current_level = escalation["current_level"]
            next_level = await self._get_next_escalation_level(current_level)
            
            if not next_level:
                return {"status": "max_level_reached", "current_level": current_level}
            
            # Update escalation level
            escalation["current_level"] = next_level
            escalation["status"] = EscalationStatus.ESCALATED.value
            
            # Add to timeline
            escalation["escalation_timeline"].append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "level_escalated",
                "from_level": current_level,
                "to_level": next_level,
                "reason": reason or "Automatic escalation",
                "details": f"Escalado de {current_level} para {next_level}"
            })
            
            # Process new level
            await self._process_escalation_level(escalation)
            
            logger.info(f"Escalation {escalation_id} escalated from {current_level} to {next_level}")
            
            return {
                "status": "escalated",
                "escalation_id": escalation_id,
                "from_level": current_level,
                "to_level": next_level,
                "reason": reason
            }
            
        except Exception as e:
            logger.error(f"Error escalating to next level: {e}")
            raise
    
    async def get_active_escalations(self) -> List[Dict[str, Any]]:
        """Obtém escalações ativas"""
        try:
            active_escalations = []
            
            for escalation in self.escalations.values():
                if escalation["status"] not in [EscalationStatus.RESOLVED.value]:
                    active_escalations.append(escalation.copy())
            
            # Sort by initiation time (oldest first)
            active_escalations.sort(key=lambda x: x["initiated_at"])
            
            return active_escalations
            
        except Exception as e:
            logger.error(f"Error getting active escalations: {e}")
            raise
    
    async def get_escalation_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Obtém estatísticas de escalação"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            stats = {
                "total_escalations": 0,
                "by_level": {level.value: 0 for level in EscalationLevel},
                "by_status": {status.value: 0 for status in EscalationStatus},
                "by_trigger": {trigger.value: 0 for trigger in EscalationTrigger},
                "average_resolution_time": 0,
                "escalation_rate": 0,
                "resolution_rate": 0
            }
            
            resolution_times = []
            total_alerts = 0
            resolved_count = 0
            
            # Check active escalations
            for escalation in self.escalations.values():
                escalation_time = datetime.fromisoformat(escalation["initiated_at"].replace("Z", "+00:00"))
                
                if escalation_time < cutoff_time:
                    continue
                
                stats["total_escalations"] += 1
                total_alerts += 1
                
                stats["by_level"][escalation["current_level"]] += 1
                stats["by_status"][escalation["status"]] += 1
                stats["by_trigger"][escalation["trigger"]] += 1
            
            # Check escalation history
            for escalation in self.escalation_history.values():
                escalation_time = datetime.fromisoformat(escalation["initiated_at"].replace("Z", "+00:00"))
                
                if escalation_time < cutoff_time:
                    continue
                
                stats["total_escalations"] += 1
                total_alerts += 1
                
                if escalation["status"] == EscalationStatus.RESOLVED.value:
                    resolved_count += 1
                    
                    # Calculate resolution time
                    if escalation.get("resolved_at"):
                        resolution_time = datetime.fromisoformat(escalation["resolved_at"].replace("Z", "+00:00"))
                        time_diff = (resolution_time - escalation_time).total_seconds() / 60  # minutes
                        resolution_times.append(time_diff)
            
            # Calculate averages and rates
            if resolution_times:
                stats["average_resolution_time"] = sum(resolution_times) / len(resolution_times)
            
            if total_alerts > 0:
                stats["resolution_rate"] = (resolved_count / total_alerts) * 100
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting escalation statistics: {e}")
            raise
    
    async def process_escalations(self):
        """Processa escalações pendentes"""
        try:
            current_time = datetime.now(timezone.utc)
            
            for escalation in list(self.escalations.values()):
                if escalation["status"] == EscalationStatus.RESOLVED.value:
                    continue
                
                # Check if escalation should be escalated to next level
                if await self._should_escalate_to_next_level(escalation, current_time):
                    await self.escalate_to_next_level(
                        escalation["id"], 
                        "Automatic escalation due to timeout"
                    )
                
                # Check for resolution timeout
                if await self._should_timeout_escalation(escalation, current_time):
                    await self._handle_escalation_timeout(escalation)
            
        except Exception as e:
            logger.error(f"Error processing escalations: {e}")
    
    async def _load_escalation_policies(self):
        """Carrega políticas de escalação"""
        self.escalation_policies = {
            "critical_alert": {
                "levels": [
                    {"level": EscalationLevel.LEVEL_1.value, "timeout": 300, "roles": ["nurse"]},  # 5 min
                    {"level": EscalationLevel.LEVEL_2.value, "timeout": 600, "roles": ["charge_nurse"]},  # 10 min
                    {"level": EscalationLevel.LEVEL_3.value, "timeout": 900, "roles": ["doctor"]},  # 15 min
                    {"level": EscalationLevel.LEVEL_4.value, "timeout": 1800, "roles": ["supervisor"]},  # 30 min
                    {"level": EscalationLevel.LEVEL_5.value, "timeout": None, "roles": ["director"]}
                ]
            },
            "high_alert": {
                "levels": [
                    {"level": EscalationLevel.LEVEL_1.value, "timeout": 600, "roles": ["nurse"]},  # 10 min
                    {"level": EscalationLevel.LEVEL_2.value, "timeout": 1800, "roles": ["charge_nurse"]},  # 30 min
                    {"level": EscalationLevel.LEVEL_3.value, "timeout": 3600, "roles": ["doctor"]},  # 1 hour
                    {"level": EscalationLevel.LEVEL_4.value, "timeout": None, "roles": ["supervisor"]}
                ]
            },
            "medium_alert": {
                "levels": [
                    {"level": EscalationLevel.LEVEL_1.value, "timeout": 1800, "roles": ["nurse"]},  # 30 min
                    {"level": EscalationLevel.LEVEL_2.value, "timeout": 3600, "roles": ["charge_nurse"]},  # 1 hour
                    {"level": EscalationLevel.LEVEL_3.value, "timeout": None, "roles": ["doctor"]}
                ]
            }
        }
    
    async def _load_on_call_schedule(self):
        """Carrega cronograma de plantão"""
        # In a real implementation, this would load from database
        self.on_call_schedule = {
            "nurse": ["nurse_001", "nurse_002", "nurse_003"],
            "charge_nurse": ["charge_nurse_001"],
            "doctor": ["doctor_001", "doctor_002"],
            "supervisor": ["supervisor_001"],
            "director": ["director_001"]
        }
    
    async def _load_escalation_rules(self):
        """Carrega regras de escalação"""
        self.escalation_rules = {
            "auto_escalation_enabled": True,
            "max_escalation_attempts": 3,
            "escalation_timeout_hours": 24,
            "require_acknowledgment": True,
            "allow_manual_escalation": True
        }
    
    async def _continuous_escalation_processing(self):
        """Processamento contínuo de escalações"""
        while self.is_active:
            try:
                await asyncio.sleep(60)  # 1 minute
                await self.process_escalations()
            except Exception as e:
                logger.error(f"Error in continuous escalation processing: {e}")
    
    async def _determine_escalation_policy(self, alert_data: Dict[str, Any]) -> str:
        """Determina política de escalação baseada no alerta"""
        severity = alert_data.get("severity", "medium")
        
        severity_policy_map = {
            "critical": "critical_alert",
            "high": "high_alert",
            "medium": "medium_alert",
            "low": "medium_alert"  # Default to medium policy
        }
        
        return severity_policy_map.get(severity, "medium_alert")
    
    async def _process_escalation_level(self, escalation: Dict[str, Any]):
        """Processa um nível de escalação"""
        try:
            current_level = escalation["current_level"]
            policy_name = escalation["policy_applied"]
            
            if policy_name not in self.escalation_policies:
                logger.error(f"Unknown escalation policy: {policy_name}")
                return
            
            policy = self.escalation_policies[policy_name]
            level_config = None
            
            # Find level configuration
            for level in policy["levels"]:
                if level["level"] == current_level:
                    level_config = level
                    break
            
            if not level_config:
                logger.error(f"No configuration found for level {current_level}")
                return
            
            # Assign personnel
            assigned_personnel = await self._assign_personnel_for_level(level_config["roles"])
            escalation["assigned_personnel"] = assigned_personnel
            
            # Update status
            escalation["status"] = EscalationStatus.IN_PROGRESS.value
            
            # Add to timeline
            escalation["escalation_timeline"].append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": "level_activated",
                "level": current_level,
                "assigned_personnel": assigned_personnel,
                "timeout": level_config.get("timeout"),
                "details": f"Nível {current_level} ativado com {len(assigned_personnel)} pessoas designadas"
            })
            
            logger.info(f"Escalation level {current_level} processed for alert {escalation['alert_id']}")
            
        except Exception as e:
            logger.error(f"Error processing escalation level: {e}")
    
    async def _assign_personnel_for_level(self, roles: List[str]) -> List[str]:
        """Designa pessoal para um nível de escalação"""
        assigned = []
        
        for role in roles:
            if role in self.on_call_schedule:
                # In a real implementation, this would check availability and on-call status
                available_personnel = self.on_call_schedule[role]
                if available_personnel:
                    assigned.extend(available_personnel)
        
        return assigned
    
    async def _get_next_escalation_level(self, current_level: str) -> Optional[str]:
        """Obtém próximo nível de escalação"""
        level_order = [
            EscalationLevel.LEVEL_1.value,
            EscalationLevel.LEVEL_2.value,
            EscalationLevel.LEVEL_3.value,
            EscalationLevel.LEVEL_4.value,
            EscalationLevel.LEVEL_5.value
        ]
        
        try:
            current_index = level_order.index(current_level)
            if current_index < len(level_order) - 1:
                return level_order[current_index + 1]
        except ValueError:
            pass
        
        return None
    
    async def _find_escalation_by_id(self, escalation_id: str) -> Optional[Dict[str, Any]]:
        """Encontra escalação por ID"""
        # Check active escalations
        for escalation in self.escalations.values():
            if escalation["id"] == escalation_id:
                return escalation
        
        # Check history
        if escalation_id in self.escalation_history:
            return self.escalation_history[escalation_id]
        
        return None
    
    async def _should_escalate_to_next_level(self, escalation: Dict[str, Any], current_time: datetime) -> bool:
        """Verifica se deve escalar para próximo nível"""
        if escalation["status"] != EscalationStatus.IN_PROGRESS.value:
            return False
        
        # Get policy and level configuration
        policy_name = escalation["policy_applied"]
        current_level = escalation["current_level"]
        
        if policy_name not in self.escalation_policies:
            return False
        
        policy = self.escalation_policies[policy_name]
        level_config = None
        
        for level in policy["levels"]:
            if level["level"] == current_level:
                level_config = level
                break
        
        if not level_config or not level_config.get("timeout"):
            return False
        
        # Check if timeout has been reached
        last_timeline_entry = None
        for entry in reversed(escalation["escalation_timeline"]):
            if entry["action"] in ["level_activated", "level_escalated"]:
                last_timeline_entry = entry
                break
        
        if not last_timeline_entry:
            return False
        
        level_start_time = datetime.fromisoformat(last_timeline_entry["timestamp"].replace("Z", "+00:00"))
        timeout_seconds = level_config["timeout"]
        
        return (current_time - level_start_time).total_seconds() >= timeout_seconds
    
    async def _should_timeout_escalation(self, escalation: Dict[str, Any], current_time: datetime) -> bool:
        """Verifica se escalação deve ser encerrada por timeout"""
        initiated_time = datetime.fromisoformat(escalation["initiated_at"].replace("Z", "+00:00"))
        timeout_hours = self.escalation_rules["escalation_timeout_hours"]
        
        return (current_time - initiated_time).total_seconds() >= (timeout_hours * 3600)
    
    async def _handle_escalation_timeout(self, escalation: Dict[str, Any]):
        """Trata timeout de escalação"""
        escalation["status"] = EscalationStatus.RESOLVED.value
        escalation["resolved_at"] = datetime.now(timezone.utc).isoformat()
        escalation["resolved_by"] = "system"
        escalation["timeout"] = True
        
        # Add to timeline
        escalation["escalation_timeline"].append({
            "timestamp": escalation["resolved_at"],
            "action": "escalation_timeout",
            "details": "Escalação encerrada por timeout",
            "timeout_hours": self.escalation_rules["escalation_timeout_hours"]
        })
        
        # Move to history
        self.escalation_history[escalation["id"]] = escalation.copy()
        
        # Remove from active escalations
        alert_id = escalation["alert_id"]
        if alert_id in self.escalations:
            del self.escalations[alert_id]
        
        logger.warning(f"Escalation {escalation['id']} timed out and was resolved automatically")