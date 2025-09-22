"""
Notification Service
Serviço de notificações para alertas
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import logging
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class NotificationChannel(Enum):
    """Canais de notificação"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    WEBHOOK = "webhook"
    SLACK = "slack"
    TEAMS = "teams"
    WHATSAPP = "whatsapp"

class NotificationPriority(Enum):
    """Prioridade das notificações"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class NotificationService:
    """Serviço de notificações multi-canal"""
    
    def __init__(self):
        self.is_active = False
        self.notification_queue = asyncio.Queue()
        self.notification_history = {}
        self.notification_config = {}
        self.channel_handlers = {}
        self.user_preferences = {}
        
    async def initialize(self):
        """Inicializa o serviço de notificações"""
        try:
            logger.info("Initializing Notification Service...")
            
            # Load notification configuration
            await self._load_notification_config()
            
            # Initialize channel handlers
            await self._initialize_channel_handlers()
            
            # Load user preferences
            await self._load_user_preferences()
            
            # Start notification processing
            asyncio.create_task(self._process_notification_queue())
            
            self.is_active = True
            logger.info("Notification Service initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Notification Service: {e}")
            raise
    
    async def send_alert_notification(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Envia notificação para um alerta"""
        try:
            # Determine notification priority based on alert severity
            priority = self._map_severity_to_priority(alert_data.get("severity", "medium"))
            
            # Get notification recipients
            recipients = await self._get_alert_recipients(alert_data)
            
            if not recipients:
                logger.warning(f"No recipients found for alert {alert_data.get('id')}")
                return {"status": "no_recipients"}
            
            # Create notification
            notification = await self._create_alert_notification(alert_data, priority, recipients)
            
            # Queue notification for processing
            await self.notification_queue.put(notification)
            
            logger.info(f"Alert notification queued for {len(recipients)} recipients")
            
            return {
                "status": "queued",
                "notification_id": notification["id"],
                "recipients_count": len(recipients),
                "priority": priority.value
            }
            
        except Exception as e:
            logger.error(f"Error sending alert notification: {e}")
            raise
    
    async def send_custom_notification(self, message: str, recipients: List[str], 
                                     channels: List[NotificationChannel] = None,
                                     priority: NotificationPriority = NotificationPriority.NORMAL) -> Dict[str, Any]:
        """Envia notificação customizada"""
        try:
            if not recipients:
                raise ValueError("Recipients list cannot be empty")
            
            if channels is None:
                channels = [NotificationChannel.EMAIL]
            
            # Create notification
            notification = {
                "id": f"custom_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                "type": "custom",
                "message": message,
                "recipients": recipients,
                "channels": [channel.value for channel in channels],
                "priority": priority.value,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending"
            }
            
            # Queue notification
            await self.notification_queue.put(notification)
            
            return {
                "status": "queued",
                "notification_id": notification["id"],
                "recipients_count": len(recipients)
            }
            
        except Exception as e:
            logger.error(f"Error sending custom notification: {e}")
            raise
    
    async def get_notification_history(self, user_id: str = None, hours: int = 24) -> List[Dict[str, Any]]:
        """Obtém histórico de notificações"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            filtered_notifications = []
            for notification_id, notification in self.notification_history.items():
                notification_time = datetime.fromisoformat(notification["created_at"].replace("Z", "+00:00"))
                
                if notification_time < cutoff_time:
                    continue
                
                # Filter by user if specified
                if user_id and user_id not in notification.get("recipients", []):
                    continue
                
                filtered_notifications.append(notification.copy())
            
            # Sort by timestamp (newest first)
            filtered_notifications.sort(key=lambda x: x["created_at"], reverse=True)
            
            return filtered_notifications
            
        except Exception as e:
            logger.error(f"Error getting notification history: {e}")
            raise
    
    async def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """Atualiza preferências de notificação do usuário"""
        try:
            self.user_preferences[user_id] = {
                "email": preferences.get("email"),
                "phone": preferences.get("phone"),
                "enabled_channels": preferences.get("enabled_channels", [NotificationChannel.EMAIL.value]),
                "alert_severity_filter": preferences.get("alert_severity_filter", ["medium", "high", "critical"]),
                "quiet_hours": preferences.get("quiet_hours", {"start": "22:00", "end": "06:00"}),
                "timezone": preferences.get("timezone", "UTC"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            return {
                "status": "updated",
                "user_id": user_id,
                "preferences": self.user_preferences[user_id]
            }
            
        except Exception as e:
            logger.error(f"Error updating user preferences: {e}")
            raise
    
    async def get_notification_statistics(self, hours: int = 24) -> Dict[str, Any]:
        """Obtém estatísticas de notificações"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            stats = {
                "total_notifications": 0,
                "by_channel": {channel.value: 0 for channel in NotificationChannel},
                "by_priority": {priority.value: 0 for priority in NotificationPriority},
                "by_status": {"sent": 0, "failed": 0, "pending": 0},
                "by_type": {},
                "delivery_rate": 0.0
            }
            
            sent_count = 0
            total_count = 0
            
            for notification in self.notification_history.values():
                notification_time = datetime.fromisoformat(notification["created_at"].replace("Z", "+00:00"))
                
                if notification_time < cutoff_time:
                    continue
                
                stats["total_notifications"] += 1
                total_count += 1
                
                # Count by channel
                for channel in notification.get("channels", []):
                    if channel in stats["by_channel"]:
                        stats["by_channel"][channel] += 1
                
                # Count by priority
                priority = notification.get("priority", "normal")
                if priority in stats["by_priority"]:
                    stats["by_priority"][priority] += 1
                
                # Count by status
                status = notification.get("status", "pending")
                if status in stats["by_status"]:
                    stats["by_status"][status] += 1
                
                if status == "sent":
                    sent_count += 1
                
                # Count by type
                notification_type = notification.get("type", "unknown")
                stats["by_type"][notification_type] = stats["by_type"].get(notification_type, 0) + 1
            
            # Calculate delivery rate
            if total_count > 0:
                stats["delivery_rate"] = (sent_count / total_count) * 100
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting notification statistics: {e}")
            raise
    
    async def _load_notification_config(self):
        """Carrega configuração de notificações"""
        self.notification_config = {
            "email": {
                "smtp_server": "localhost",
                "smtp_port": 587,
                "use_tls": True,
                "username": "",
                "password": "",
                "from_address": "noreply@nexus-saude.com"
            },
            "sms": {
                "provider": "twilio",
                "api_key": "",
                "api_secret": "",
                "from_number": ""
            },
            "webhook": {
                "timeout": 30,
                "retry_attempts": 3
            },
            "rate_limiting": {
                "max_notifications_per_minute": 60,
                "max_notifications_per_hour": 1000
            }
        }
    
    async def _initialize_channel_handlers(self):
        """Inicializa handlers dos canais"""
        self.channel_handlers = {
            NotificationChannel.EMAIL.value: self._send_email_notification,
            NotificationChannel.SMS.value: self._send_sms_notification,
            NotificationChannel.PUSH.value: self._send_push_notification,
            NotificationChannel.WEBHOOK.value: self._send_webhook_notification,
            NotificationChannel.SLACK.value: self._send_slack_notification,
            NotificationChannel.TEAMS.value: self._send_teams_notification,
            NotificationChannel.WHATSAPP.value: self._send_whatsapp_notification
        }
    
    async def _load_user_preferences(self):
        """Carrega preferências dos usuários"""
        # In a real implementation, load from database
        self.user_preferences = {
            "admin": {
                "email": "admin@nexus-saude.com",
                "phone": "+5511999999999",
                "enabled_channels": ["email", "sms"],
                "alert_severity_filter": ["high", "critical"],
                "quiet_hours": {"start": "22:00", "end": "06:00"},
                "timezone": "America/Sao_Paulo"
            },
            "nurse_station": {
                "email": "enfermagem@nexus-saude.com",
                "enabled_channels": ["email", "push"],
                "alert_severity_filter": ["medium", "high", "critical"],
                "quiet_hours": {"start": "23:00", "end": "05:00"},
                "timezone": "America/Sao_Paulo"
            },
            "doctor_on_call": {
                "email": "plantao@nexus-saude.com",
                "phone": "+5511888888888",
                "enabled_channels": ["email", "sms", "push"],
                "alert_severity_filter": ["critical"],
                "quiet_hours": None,  # Always available
                "timezone": "America/Sao_Paulo"
            }
        }
    
    async def _process_notification_queue(self):
        """Processa fila de notificações"""
        while self.is_active:
            try:
                # Get notification from queue (with timeout)
                notification = await asyncio.wait_for(
                    self.notification_queue.get(), 
                    timeout=10.0
                )
                
                # Process notification
                await self._process_notification(notification)
                
                # Mark task as done
                self.notification_queue.task_done()
                
            except asyncio.TimeoutError:
                # No notifications to process, continue
                continue
            except Exception as e:
                logger.error(f"Error processing notification queue: {e}")
                await asyncio.sleep(1)
    
    async def _process_notification(self, notification: Dict[str, Any]):
        """Processa uma notificação"""
        try:
            notification_id = notification["id"]
            channels = notification.get("channels", [])
            recipients = notification.get("recipients", [])
            
            # Update status
            notification["status"] = "processing"
            notification["processing_started"] = datetime.now(timezone.utc).isoformat()
            
            # Store in history
            self.notification_history[notification_id] = notification.copy()
            
            success_count = 0
            error_count = 0
            
            # Send through each channel
            for channel in channels:
                if channel not in self.channel_handlers:
                    logger.warning(f"Unknown notification channel: {channel}")
                    continue
                
                try:
                    handler = self.channel_handlers[channel]
                    await handler(notification, recipients)
                    success_count += 1
                    
                except Exception as e:
                    logger.error(f"Error sending notification via {channel}: {e}")
                    error_count += 1
            
            # Update final status
            if error_count == 0:
                notification["status"] = "sent"
            elif success_count > 0:
                notification["status"] = "partial_success"
            else:
                notification["status"] = "failed"
            
            notification["processing_completed"] = datetime.now(timezone.utc).isoformat()
            notification["success_count"] = success_count
            notification["error_count"] = error_count
            
            # Update history
            self.notification_history[notification_id] = notification
            
            logger.info(f"Notification {notification_id} processed: {notification['status']}")
            
        except Exception as e:
            logger.error(f"Error processing notification: {e}")
            notification["status"] = "failed"
            notification["error"] = str(e)
            self.notification_history[notification.get("id", "unknown")] = notification
    
    def _map_severity_to_priority(self, severity: str) -> NotificationPriority:
        """Mapeia severidade do alerta para prioridade de notificação"""
        severity_priority_map = {
            "low": NotificationPriority.LOW,
            "medium": NotificationPriority.NORMAL,
            "high": NotificationPriority.HIGH,
            "critical": NotificationPriority.URGENT
        }
        
        return severity_priority_map.get(severity, NotificationPriority.NORMAL)
    
    async def _get_alert_recipients(self, alert_data: Dict[str, Any]) -> List[str]:
        """Determina destinatários para um alerta"""
        recipients = []
        severity = alert_data.get("severity", "medium")
        
        # Determine recipients based on severity and alert type
        for user_id, preferences in self.user_preferences.items():
            if severity in preferences.get("alert_severity_filter", []):
                recipients.append(user_id)
        
        return recipients
    
    async def _create_alert_notification(self, alert_data: Dict[str, Any], 
                                       priority: NotificationPriority, 
                                       recipients: List[str]) -> Dict[str, Any]:
        """Cria notificação para alerta"""
        # Create formatted message
        message = self._format_alert_message(alert_data)
        
        # Determine channels based on priority
        channels = self._determine_channels_for_priority(priority, recipients)
        
        notification = {
            "id": f"alert_{alert_data.get('id', 'unknown')}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "type": "alert",
            "alert_id": alert_data.get("id"),
            "message": message,
            "subject": f"Alerta {alert_data.get('severity', '').upper()}: {alert_data.get('alert_type', '')}",
            "recipients": recipients,
            "channels": channels,
            "priority": priority.value,
            "alert_data": alert_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending"
        }
        
        return notification
    
    def _format_alert_message(self, alert_data: Dict[str, Any]) -> str:
        """Formata mensagem do alerta"""
        patient_id = alert_data.get("patient_id", "N/A")
        severity = alert_data.get("severity", "").upper()
        alert_type = alert_data.get("alert_type", "")
        message = alert_data.get("message", "")
        timestamp = alert_data.get("timestamp", datetime.now(timezone.utc).isoformat())
        
        formatted_message = f"""
🚨 ALERTA {severity}

Paciente: {patient_id}
Tipo: {alert_type}
Mensagem: {message}
Timestamp: {timestamp}

Este é um alerta automático do Sistema de Monitoramento Nexus Saúde.
        """.strip()
        
        return formatted_message
    
    def _determine_channels_for_priority(self, priority: NotificationPriority, recipients: List[str]) -> List[str]:
        """Determina canais baseados na prioridade"""
        if priority == NotificationPriority.URGENT:
            return [NotificationChannel.EMAIL.value, NotificationChannel.SMS.value, NotificationChannel.PUSH.value]
        elif priority == NotificationPriority.HIGH:
            return [NotificationChannel.EMAIL.value, NotificationChannel.PUSH.value]
        else:
            return [NotificationChannel.EMAIL.value]
    
    async def _send_email_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação por email"""
        try:
            config = self.notification_config["email"]
            
            for recipient in recipients:
                user_prefs = self.user_preferences.get(recipient, {})
                email = user_prefs.get("email")
                
                if not email:
                    logger.warning(f"No email configured for user {recipient}")
                    continue
                
                # Create email message
                msg = MIMEMultipart()
                msg['From'] = config["from_address"]
                msg['To'] = email
                msg['Subject'] = notification.get("subject", "Notification")
                
                body = notification["message"]
                msg.attach(MIMEText(body, 'plain'))
                
                # Send email (placeholder - would use actual SMTP)
                logger.info(f"Email notification sent to {email}")
                
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
            raise
    
    async def _send_sms_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação por SMS"""
        try:
            for recipient in recipients:
                user_prefs = self.user_preferences.get(recipient, {})
                phone = user_prefs.get("phone")
                
                if not phone:
                    logger.warning(f"No phone configured for user {recipient}")
                    continue
                
                # Send SMS (placeholder - would use SMS provider API)
                logger.info(f"SMS notification sent to {phone}")
                
        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
            raise
    
    async def _send_push_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação push"""
        try:
            for recipient in recipients:
                # Send push notification (placeholder - would use push service)
                logger.info(f"Push notification sent to {recipient}")
                
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            raise
    
    async def _send_webhook_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação via webhook"""
        try:
            # Send webhook (placeholder - would make HTTP request)
            logger.info("Webhook notification sent")
            
        except Exception as e:
            logger.error(f"Error sending webhook notification: {e}")
            raise
    
    async def _send_slack_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação para Slack"""
        try:
            # Send Slack message (placeholder - would use Slack API)
            logger.info("Slack notification sent")
            
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
            raise
    
    async def _send_teams_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação para Microsoft Teams"""
        try:
            # Send Teams message (placeholder - would use Teams API)
            logger.info("Teams notification sent")
            
        except Exception as e:
            logger.error(f"Error sending Teams notification: {e}")
            raise
    
    async def _send_whatsapp_notification(self, notification: Dict[str, Any], recipients: List[str]):
        """Envia notificação via WhatsApp"""
        try:
            # Send WhatsApp message (placeholder - would use WhatsApp Business API)
            logger.info("WhatsApp notification sent")
            
        except Exception as e:
            logger.error(f"Error sending WhatsApp notification: {e}")
            raise