"""
System Monitor
Monitoramento de sistemas e infraestrutura
"""

import asyncio
import psutil
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import logging
from enum import Enum

logger = logging.getLogger(__name__)

class SystemComponent(Enum):
    """Componentes do sistema"""
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    DATABASE = "database"
    CACHE = "cache"
    API = "api"
    SERVICE = "service"

class SystemStatus(Enum):
    """Status do sistema"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"
    MAINTENANCE = "maintenance"

class SystemMonitor:
    """Monitor de sistema e infraestrutura"""
    
    def __init__(self):
        self.is_active = False
        self.system_metrics = {}
        self.service_status = {}
        self.performance_baselines = {}
        self.system_alerts = {}
        self.monitoring_config = {}
        
    async def initialize(self):
        """Inicializa o monitor de sistema"""
        try:
            logger.info("Initializing System Monitor...")
            
            # Load monitoring configuration
            await self._load_monitoring_config()
            
            # Initialize baselines
            await self._initialize_performance_baselines()
            
            # Start system monitoring
            asyncio.create_task(self._continuous_system_monitoring())
            
            self.is_active = True
            logger.info("System Monitor initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing System Monitor: {e}")
            raise
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Obtém status geral do sistema"""
        try:
            # Collect current metrics
            cpu_metrics = await self._get_cpu_metrics()
            memory_metrics = await self._get_memory_metrics()
            disk_metrics = await self._get_disk_metrics()
            network_metrics = await self._get_network_metrics()
            
            # Check service status
            services_status = await self._check_services_status()
            
            # Calculate overall health
            overall_status = await self._calculate_overall_status(
                cpu_metrics, memory_metrics, disk_metrics, network_metrics, services_status
            )
            
            status = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "overall_status": overall_status,
                "components": {
                    "cpu": cpu_metrics,
                    "memory": memory_metrics,
                    "disk": disk_metrics,
                    "network": network_metrics,
                    "services": services_status
                },
                "uptime": await self.get_uptime(),
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None,
                "active_alerts": len(await self._get_active_system_alerts())
            }
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            raise
    
    async def check_metric_alerts(self, metric_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Verifica alertas baseados em métricas"""
        alerts = []
        
        try:
            service_name = metric_data.get("service_name")
            metric_name = metric_data.get("metric_name")
            value = metric_data.get("value")
            
            if not all([service_name, metric_name, value]):
                return alerts
            
            # Get thresholds for this metric
            thresholds = await self._get_metric_thresholds(service_name, metric_name)
            
            if not thresholds:
                return alerts
            
            # Check thresholds
            if value >= thresholds.get("critical", float('inf')):
                alerts.append({
                    "alert_type": f"metric_critical_{metric_name}",
                    "severity": "critical",
                    "message": f"Métrica crítica: {metric_name} = {value} (limite: {thresholds['critical']})",
                    "service": service_name,
                    "metric": metric_name,
                    "value": value,
                    "threshold": thresholds["critical"]
                })
            elif value >= thresholds.get("warning", float('inf')):
                alerts.append({
                    "alert_type": f"metric_warning_{metric_name}",
                    "severity": "medium",
                    "message": f"Métrica em alerta: {metric_name} = {value} (limite: {thresholds['warning']})",
                    "service": service_name,
                    "metric": metric_name,
                    "value": value,
                    "threshold": thresholds["warning"]
                })
            
            # Check for rapid changes
            rapid_change_alert = await self._check_rapid_metric_change(service_name, metric_name, value)
            if rapid_change_alert:
                alerts.append(rapid_change_alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking metric alerts: {e}")
            return []
    
    async def register_service(self, service_name: str, service_config: Dict[str, Any]) -> Dict[str, Any]:
        """Registra um serviço para monitoramento"""
        try:
            self.service_status[service_name] = {
                "name": service_name,
                "config": service_config,
                "status": SystemStatus.HEALTHY.value,
                "last_check": datetime.now(timezone.utc).isoformat(),
                "health_checks": [],
                "metrics": {},
                "registered_at": datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Service {service_name} registered for monitoring")
            
            return {
                "status": "registered",
                "service_name": service_name,
                "monitoring_enabled": True
            }
            
        except Exception as e:
            logger.error(f"Error registering service {service_name}: {e}")
            raise
    
    async def update_service_status(self, service_name: str, status: SystemStatus, details: Dict[str, Any] = None) -> Dict[str, Any]:
        """Atualiza status de um serviço"""
        try:
            if service_name not in self.service_status:
                await self.register_service(service_name, {})
            
            old_status = self.service_status[service_name]["status"]
            self.service_status[service_name]["status"] = status.value
            self.service_status[service_name]["last_check"] = datetime.now(timezone.utc).isoformat()
            
            if details:
                self.service_status[service_name]["details"] = details
            
            # Add to health check history
            health_check = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": status.value,
                "details": details or {}
            }
            
            self.service_status[service_name]["health_checks"].append(health_check)
            
            # Keep only last 100 health checks
            if len(self.service_status[service_name]["health_checks"]) > 100:
                self.service_status[service_name]["health_checks"] = \
                    self.service_status[service_name]["health_checks"][-100:]
            
            # Handle status changes
            if old_status != status.value:
                await self._handle_service_status_change(service_name, old_status, status.value, details)
            
            logger.info(f"Service {service_name} status updated to {status.value}")
            
            return {
                "status": "updated",
                "service_name": service_name,
                "old_status": old_status,
                "new_status": status.value
            }
            
        except Exception as e:
            logger.error(f"Error updating service status: {e}")
            raise
    
    async def perform_monitoring_cycle(self):
        """Executa ciclo de monitoramento"""
        try:
            # Collect system metrics
            await self._collect_system_metrics()
            
            # Check service health
            await self._check_all_services_health()
            
            # Analyze performance trends
            await self._analyze_performance_trends()
            
            # Check system alerts
            await self._check_system_alerts()
            
            # Clean up old data
            await self._cleanup_monitoring_data()
            
        except Exception as e:
            logger.error(f"Error in monitoring cycle: {e}")
    
    async def get_uptime(self) -> Dict[str, Any]:
        """Calcula uptime do sistema"""
        try:
            boot_time = psutil.boot_time()
            uptime_seconds = datetime.now().timestamp() - boot_time
            
            days = int(uptime_seconds // 86400)
            hours = int((uptime_seconds % 86400) // 3600)
            minutes = int((uptime_seconds % 3600) // 60)
            
            return {
                "uptime_seconds": uptime_seconds,
                "uptime_formatted": f"{days}d {hours}h {minutes}m",
                "boot_time": datetime.fromtimestamp(boot_time, timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating uptime: {e}")
            return {"uptime_seconds": 0, "uptime_formatted": "unknown", "boot_time": None}
    
    async def _load_monitoring_config(self):
        """Carrega configuração de monitoramento"""
        self.monitoring_config = {
            "cpu": {
                "warning_threshold": 80,
                "critical_threshold": 95,
                "check_interval": 30
            },
            "memory": {
                "warning_threshold": 80,
                "critical_threshold": 95,
                "check_interval": 30
            },
            "disk": {
                "warning_threshold": 80,
                "critical_threshold": 95,
                "check_interval": 60
            },
            "network": {
                "error_rate_warning": 0.01,
                "error_rate_critical": 0.05,
                "check_interval": 30
            },
            "services": {
                "health_check_interval": 60,
                "timeout": 30
            }
        }
    
    async def _initialize_performance_baselines(self):
        """Inicializa baselines de performance"""
        self.performance_baselines = {}
        
        # Collect initial baseline metrics
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            self.performance_baselines = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "established_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error initializing performance baselines: {e}")
    
    async def _continuous_system_monitoring(self):
        """Monitoramento contínuo do sistema"""
        while self.is_active:
            try:
                await asyncio.sleep(30)  # 30 seconds
                await self.perform_monitoring_cycle()
            except Exception as e:
                logger.error(f"Error in continuous system monitoring: {e}")
    
    async def _get_cpu_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de CPU"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            # Determine status
            status = SystemStatus.HEALTHY.value
            if cpu_percent >= self.monitoring_config["cpu"]["critical_threshold"]:
                status = SystemStatus.CRITICAL.value
            elif cpu_percent >= self.monitoring_config["cpu"]["warning_threshold"]:
                status = SystemStatus.WARNING.value
            
            return {
                "component": SystemComponent.CPU.value,
                "status": status,
                "cpu_percent": cpu_percent,
                "cpu_count": cpu_count,
                "cpu_frequency": {
                    "current": cpu_freq.current if cpu_freq else None,
                    "min": cpu_freq.min if cpu_freq else None,
                    "max": cpu_freq.max if cpu_freq else None
                } if cpu_freq else None,
                "per_cpu_percent": psutil.cpu_percent(percpu=True),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting CPU metrics: {e}")
            return {"component": SystemComponent.CPU.value, "status": SystemStatus.DOWN.value, "error": str(e)}
    
    async def _get_memory_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de memória"""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Determine status
            status = SystemStatus.HEALTHY.value
            if memory.percent >= self.monitoring_config["memory"]["critical_threshold"]:
                status = SystemStatus.CRITICAL.value
            elif memory.percent >= self.monitoring_config["memory"]["warning_threshold"]:
                status = SystemStatus.WARNING.value
            
            return {
                "component": SystemComponent.MEMORY.value,
                "status": status,
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "free": memory.free,
                    "percent": memory.percent,
                    "cached": getattr(memory, 'cached', 0),
                    "buffers": getattr(memory, 'buffers', 0)
                },
                "swap": {
                    "total": swap.total,
                    "used": swap.used,
                    "free": swap.free,
                    "percent": swap.percent
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting memory metrics: {e}")
            return {"component": SystemComponent.MEMORY.value, "status": SystemStatus.DOWN.value, "error": str(e)}
    
    async def _get_disk_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de disco"""
        try:
            disk_usage = psutil.disk_usage('/')
            disk_io = psutil.disk_io_counters()
            
            # Determine status
            disk_percent = (disk_usage.used / disk_usage.total) * 100
            status = SystemStatus.HEALTHY.value
            if disk_percent >= self.monitoring_config["disk"]["critical_threshold"]:
                status = SystemStatus.CRITICAL.value
            elif disk_percent >= self.monitoring_config["disk"]["warning_threshold"]:
                status = SystemStatus.WARNING.value
            
            return {
                "component": SystemComponent.DISK.value,
                "status": status,
                "disk_usage": {
                    "total": disk_usage.total,
                    "used": disk_usage.used,
                    "free": disk_usage.free,
                    "percent": disk_percent
                },
                "disk_io": {
                    "read_count": disk_io.read_count if disk_io else 0,
                    "write_count": disk_io.write_count if disk_io else 0,
                    "read_bytes": disk_io.read_bytes if disk_io else 0,
                    "write_bytes": disk_io.write_bytes if disk_io else 0,
                    "read_time": disk_io.read_time if disk_io else 0,
                    "write_time": disk_io.write_time if disk_io else 0
                } if disk_io else {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting disk metrics: {e}")
            return {"component": SystemComponent.DISK.value, "status": SystemStatus.DOWN.value, "error": str(e)}
    
    async def _get_network_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de rede"""
        try:
            net_io = psutil.net_io_counters()
            net_connections = len(psutil.net_connections())
            
            return {
                "component": SystemComponent.NETWORK.value,
                "status": SystemStatus.HEALTHY.value,
                "network_io": {
                    "bytes_sent": net_io.bytes_sent if net_io else 0,
                    "bytes_recv": net_io.bytes_recv if net_io else 0,
                    "packets_sent": net_io.packets_sent if net_io else 0,
                    "packets_recv": net_io.packets_recv if net_io else 0,
                    "errin": net_io.errin if net_io else 0,
                    "errout": net_io.errout if net_io else 0,
                    "dropin": net_io.dropin if net_io else 0,
                    "dropout": net_io.dropout if net_io else 0
                } if net_io else {},
                "connections_count": net_connections,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting network metrics: {e}")
            return {"component": SystemComponent.NETWORK.value, "status": SystemStatus.DOWN.value, "error": str(e)}
    
    async def _check_services_status(self) -> Dict[str, Any]:
        """Verifica status dos serviços"""
        services_summary = {
            "total_services": len(self.service_status),
            "healthy": 0,
            "warning": 0,
            "critical": 0,
            "down": 0,
            "services": {}
        }
        
        for service_name, service_data in self.service_status.items():
            status = service_data["status"]
            services_summary["services"][service_name] = {
                "status": status,
                "last_check": service_data["last_check"]
            }
            
            # Count by status
            if status == SystemStatus.HEALTHY.value:
                services_summary["healthy"] += 1
            elif status == SystemStatus.WARNING.value:
                services_summary["warning"] += 1
            elif status == SystemStatus.CRITICAL.value:
                services_summary["critical"] += 1
            elif status == SystemStatus.DOWN.value:
                services_summary["down"] += 1
        
        return services_summary
    
    async def _calculate_overall_status(self, cpu_metrics: Dict, memory_metrics: Dict, 
                                      disk_metrics: Dict, network_metrics: Dict, 
                                      services_status: Dict) -> str:
        """Calcula status geral do sistema"""
        component_statuses = [
            cpu_metrics.get("status", SystemStatus.HEALTHY.value),
            memory_metrics.get("status", SystemStatus.HEALTHY.value),
            disk_metrics.get("status", SystemStatus.HEALTHY.value),
            network_metrics.get("status", SystemStatus.HEALTHY.value)
        ]
        
        # Check for critical services
        critical_services = services_status.get("critical", 0)
        down_services = services_status.get("down", 0)
        
        if down_services > 0 or SystemStatus.DOWN.value in component_statuses:
            return SystemStatus.CRITICAL.value
        elif critical_services > 0 or SystemStatus.CRITICAL.value in component_statuses:
            return SystemStatus.CRITICAL.value
        elif SystemStatus.WARNING.value in component_statuses or services_status.get("warning", 0) > 0:
            return SystemStatus.WARNING.value
        else:
            return SystemStatus.HEALTHY.value
    
    async def _get_metric_thresholds(self, service_name: str, metric_name: str) -> Optional[Dict[str, float]]:
        """Obtém limites de métricas"""
        # Default thresholds based on common metrics
        default_thresholds = {
            "response_time": {"warning": 1000, "critical": 5000},  # milliseconds
            "error_rate": {"warning": 0.01, "critical": 0.05},  # percentage
            "throughput": {"warning": 0.8, "critical": 0.5},  # ratio of baseline
            "cpu_usage": {"warning": 80, "critical": 95},  # percentage
            "memory_usage": {"warning": 80, "critical": 95},  # percentage
            "disk_usage": {"warning": 80, "critical": 95},  # percentage
            "connection_count": {"warning": 1000, "critical": 2000}  # count
        }
        
        return default_thresholds.get(metric_name)
    
    async def _check_rapid_metric_change(self, service_name: str, metric_name: str, current_value: float) -> Optional[Dict[str, Any]]:
        """Verifica mudanças rápidas em métricas"""
        try:
            # Store metric history for trend analysis
            metric_key = f"{service_name}_{metric_name}"
            
            if metric_key not in self.system_metrics:
                self.system_metrics[metric_key] = []
            
            self.system_metrics[metric_key].append({
                "value": current_value,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            # Keep only last 10 values
            if len(self.system_metrics[metric_key]) > 10:
                self.system_metrics[metric_key] = self.system_metrics[metric_key][-10:]
            
            # Check for rapid changes (need at least 3 data points)
            if len(self.system_metrics[metric_key]) >= 3:
                values = [item["value"] for item in self.system_metrics[metric_key][-3:]]
                
                # Calculate change rate
                if len(values) >= 2:
                    change = abs(values[-1] - values[0]) / values[0] if values[0] != 0 else 0
                    
                    # Alert if change > 50% in short period
                    if change > 0.5:
                        return {
                            "alert_type": f"rapid_change_{metric_name}",
                            "severity": "medium",
                            "message": f"Mudança rápida detectada em {metric_name}: {change:.2%} em período curto",
                            "service": service_name,
                            "metric": metric_name,
                            "change_rate": change,
                            "current_value": current_value
                        }
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking rapid metric change: {e}")
            return None
    
    async def _handle_service_status_change(self, service_name: str, old_status: str, 
                                          new_status: str, details: Dict[str, Any] = None):
        """Trata mudanças de status de serviço"""
        if new_status in [SystemStatus.CRITICAL.value, SystemStatus.DOWN.value]:
            alert = {
                "alert_type": "service_status_change",
                "severity": "high" if new_status == SystemStatus.CRITICAL.value else "critical",
                "message": f"Serviço {service_name} mudou de status: {old_status} → {new_status}",
                "service": service_name,
                "old_status": old_status,
                "new_status": new_status,
                "details": details or {},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await self._store_system_alert(alert)
    
    async def _store_system_alert(self, alert: Dict[str, Any]):
        """Armazena alerta do sistema"""
        alert_id = f"system_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
        
        if "system_alerts" not in self.system_alerts:
            self.system_alerts["system_alerts"] = []
        
        alert["id"] = alert_id
        self.system_alerts["system_alerts"].append(alert)
        
        # Keep only last 100 alerts
        if len(self.system_alerts["system_alerts"]) > 100:
            self.system_alerts["system_alerts"] = self.system_alerts["system_alerts"][-100:]
    
    async def _get_active_system_alerts(self) -> List[Dict[str, Any]]:
        """Obtém alertas ativos do sistema"""
        if "system_alerts" not in self.system_alerts:
            return []
        
        # Return unresolved alerts from last 24 hours
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        
        active_alerts = []
        for alert in self.system_alerts["system_alerts"]:
            if alert.get("resolved", False):
                continue
            
            alert_time = datetime.fromisoformat(alert["timestamp"].replace("Z", "+00:00"))
            if alert_time > cutoff_time:
                active_alerts.append(alert)
        
        return active_alerts
    
    async def _collect_system_metrics(self):
        """Coleta métricas do sistema"""
        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Collect and store metrics
            cpu_metrics = await self._get_cpu_metrics()
            memory_metrics = await self._get_memory_metrics()
            disk_metrics = await self._get_disk_metrics()
            network_metrics = await self._get_network_metrics()
            
            # Store in metrics history
            if "system_metrics_history" not in self.system_metrics:
                self.system_metrics["system_metrics_history"] = []
            
            self.system_metrics["system_metrics_history"].append({
                "timestamp": timestamp,
                "cpu": cpu_metrics,
                "memory": memory_metrics,
                "disk": disk_metrics,
                "network": network_metrics
            })
            
            # Keep only last 1000 metric snapshots
            if len(self.system_metrics["system_metrics_history"]) > 1000:
                self.system_metrics["system_metrics_history"] = \
                    self.system_metrics["system_metrics_history"][-1000:]
                
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def _check_all_services_health(self):
        """Verifica saúde de todos os serviços"""
        for service_name in list(self.service_status.keys()):
            try:
                # Perform health check (placeholder)
                # In a real implementation, this would ping the service endpoint
                pass
            except Exception as e:
                logger.error(f"Error checking health for service {service_name}: {e}")
                await self.update_service_status(service_name, SystemStatus.DOWN, {"error": str(e)})
    
    async def _analyze_performance_trends(self):
        """Analisa tendências de performance"""
        try:
            # Analyze trends in system metrics
            if "system_metrics_history" in self.system_metrics:
                history = self.system_metrics["system_metrics_history"]
                
                if len(history) >= 10:
                    # Analyze CPU trend
                    cpu_values = [item["cpu"]["cpu_percent"] for item in history[-10:] 
                                 if "cpu_percent" in item["cpu"]]
                    
                    if len(cpu_values) >= 5:
                        # Check for increasing trend
                        recent_avg = sum(cpu_values[-3:]) / 3
                        older_avg = sum(cpu_values[:3]) / 3
                        
                        if recent_avg > older_avg * 1.2:  # 20% increase
                            await self._store_system_alert({
                                "alert_type": "performance_degradation",
                                "severity": "medium",
                                "message": f"Tendência de aumento no uso de CPU detectada",
                                "component": "cpu",
                                "trend": "increasing",
                                "timestamp": datetime.now(timezone.utc).isoformat()
                            })
                            
        except Exception as e:
            logger.error(f"Error analyzing performance trends: {e}")
    
    async def _check_system_alerts(self):
        """Verifica alertas do sistema"""
        # This method would check for various system conditions
        # and generate alerts as needed
        pass
    
    async def _cleanup_monitoring_data(self):
        """Limpa dados antigos de monitoramento"""
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Clean up old metrics
        for metric_key in list(self.system_metrics.keys()):
            if metric_key == "system_metrics_history":
                continue
                
            if isinstance(self.system_metrics[metric_key], list):
                self.system_metrics[metric_key] = [
                    item for item in self.system_metrics[metric_key]
                    if datetime.fromisoformat(item.get("timestamp", "1970-01-01T00:00:00+00:00").replace("Z", "+00:00")) > cutoff_time
                ]
                
                if not self.system_metrics[metric_key]:
                    del self.system_metrics[metric_key]