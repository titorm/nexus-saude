"""
Metrics Collector
Coleta e agregação de métricas
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import logging
from enum import Enum
import statistics

logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Tipos de métricas"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"
    TIMER = "timer"

class AggregationType(Enum):
    """Tipos de agregação"""
    SUM = "sum"
    AVERAGE = "average"
    MIN = "min"
    MAX = "max"
    COUNT = "count"
    PERCENTILE = "percentile"

class MetricsCollector:
    """Coletor e agregador de métricas"""
    
    def __init__(self):
        self.is_active = False
        self.metrics_data = {}
        self.aggregated_metrics = {}
        self.metric_definitions = {}
        self.collection_config = {}
        
    async def initialize(self):
        """Inicializa o coletor de métricas"""
        try:
            logger.info("Initializing Metrics Collector...")
            
            # Load collection configuration
            await self._load_collection_config()
            
            # Initialize metric definitions
            await self._initialize_metric_definitions()
            
            # Start metrics aggregation
            asyncio.create_task(self._continuous_metrics_aggregation())
            
            self.is_active = True
            logger.info("Metrics Collector initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Metrics Collector: {e}")
            raise
    
    async def collect_metric(self, metric_data: Dict[str, Any]) -> Dict[str, Any]:
        """Coleta uma métrica"""
        try:
            service_name = metric_data.get("service_name")
            metric_name = metric_data.get("metric_name")
            value = metric_data.get("value")
            timestamp = metric_data.get("timestamp", datetime.now(timezone.utc).isoformat())
            tags = metric_data.get("tags", {})
            unit = metric_data.get("unit", "")
            
            if not all([service_name, metric_name, value is not None]):
                raise ValueError("service_name, metric_name, and value are required")
            
            # Create metric key
            metric_key = f"{service_name}.{metric_name}"
            
            # Initialize metric storage if needed
            if metric_key not in self.metrics_data:
                self.metrics_data[metric_key] = {
                    "service_name": service_name,
                    "metric_name": metric_name,
                    "unit": unit,
                    "data_points": [],
                    "created_at": timestamp
                }
            
            # Add data point
            data_point = {
                "value": value,
                "timestamp": timestamp,
                "tags": tags
            }
            
            self.metrics_data[metric_key]["data_points"].append(data_point)
            
            # Keep only last 1000 data points per metric
            if len(self.metrics_data[metric_key]["data_points"]) > 1000:
                self.metrics_data[metric_key]["data_points"] = \
                    self.metrics_data[metric_key]["data_points"][-1000:]
            
            # Update unit if provided and different
            if unit and unit != self.metrics_data[metric_key]["unit"]:
                self.metrics_data[metric_key]["unit"] = unit
            
            logger.debug(f"Collected metric: {metric_key} = {value}")
            
            return {
                "status": "collected",
                "metric_key": metric_key,
                "value": value,
                "timestamp": timestamp
            }
            
        except Exception as e:
            logger.error(f"Error collecting metric: {e}")
            raise
    
    async def get_service_metrics(self, service_name: str, metric_name: str = None, 
                                hours: int = 24) -> List[Dict[str, Any]]:
        """Obtém métricas de um serviço"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
            service_metrics = []
            
            for metric_key, metric_data in self.metrics_data.items():
                # Filter by service
                if not metric_key.startswith(f"{service_name}."):
                    continue
                
                # Filter by specific metric if provided
                if metric_name and metric_data["metric_name"] != metric_name:
                    continue
                
                # Filter data points by time
                filtered_points = []
                for point in metric_data["data_points"]:
                    point_time = datetime.fromisoformat(point["timestamp"].replace("Z", "+00:00"))
                    if point_time > cutoff_time:
                        filtered_points.append(point)
                
                if filtered_points:
                    service_metrics.append({
                        "service_name": metric_data["service_name"],
                        "metric_name": metric_data["metric_name"],
                        "unit": metric_data["unit"],
                        "data_points": filtered_points,
                        "point_count": len(filtered_points)
                    })
            
            return service_metrics
            
        except Exception as e:
            logger.error(f"Error getting service metrics: {e}")
            raise
    
    async def get_aggregated_metrics(self, service_name: str = None, 
                                   aggregation_period: str = "1h") -> Dict[str, Any]:
        """Obtém métricas agregadas"""
        try:
            if service_name:
                return self.aggregated_metrics.get(f"{service_name}_{aggregation_period}", {})
            else:
                # Return all aggregated metrics for the period
                aggregated = {}
                for key, data in self.aggregated_metrics.items():
                    if key.endswith(f"_{aggregation_period}"):
                        service = key.replace(f"_{aggregation_period}", "")
                        aggregated[service] = data
                return aggregated
                
        except Exception as e:
            logger.error(f"Error getting aggregated metrics: {e}")
            raise
    
    async def get_current_metrics(self) -> Dict[str, Any]:
        """Obtém métricas atuais"""
        try:
            current_metrics = {}
            current_time = datetime.now(timezone.utc)
            
            for metric_key, metric_data in self.metrics_data.items():
                if not metric_data["data_points"]:
                    continue
                
                # Get most recent data point
                latest_point = metric_data["data_points"][-1]
                latest_time = datetime.fromisoformat(latest_point["timestamp"].replace("Z", "+00:00"))
                
                # Include if within last 5 minutes
                if (current_time - latest_time).total_seconds() <= 300:
                    current_metrics[metric_key] = {
                        "service_name": metric_data["service_name"],
                        "metric_name": metric_data["metric_name"],
                        "current_value": latest_point["value"],
                        "unit": metric_data["unit"],
                        "timestamp": latest_point["timestamp"],
                        "tags": latest_point.get("tags", {})
                    }
            
            return {
                "timestamp": current_time.isoformat(),
                "metrics": current_metrics,
                "total_metrics": len(current_metrics)
            }
            
        except Exception as e:
            logger.error(f"Error getting current metrics: {e}")
            raise
    
    async def collect_system_metrics(self):
        """Coleta métricas do sistema"""
        try:
            import psutil
            
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # CPU metrics
            await self.collect_metric({
                "service_name": "system",
                "metric_name": "cpu_percent",
                "value": psutil.cpu_percent(interval=1),
                "unit": "percent",
                "timestamp": timestamp,
                "tags": {"component": "cpu"}
            })
            
            # Memory metrics
            memory = psutil.virtual_memory()
            await self.collect_metric({
                "service_name": "system",
                "metric_name": "memory_percent",
                "value": memory.percent,
                "unit": "percent",
                "timestamp": timestamp,
                "tags": {"component": "memory"}
            })
            
            await self.collect_metric({
                "service_name": "system",
                "metric_name": "memory_used",
                "value": memory.used,
                "unit": "bytes",
                "timestamp": timestamp,
                "tags": {"component": "memory"}
            })
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            
            await self.collect_metric({
                "service_name": "system",
                "metric_name": "disk_percent",
                "value": disk_percent,
                "unit": "percent",
                "timestamp": timestamp,
                "tags": {"component": "disk", "mount": "/"}
            })
            
            # Network metrics
            net_io = psutil.net_io_counters()
            if net_io:
                await self.collect_metric({
                    "service_name": "system",
                    "metric_name": "network_bytes_sent",
                    "value": net_io.bytes_sent,
                    "unit": "bytes",
                    "timestamp": timestamp,
                    "tags": {"component": "network", "direction": "sent"}
                })
                
                await self.collect_metric({
                    "service_name": "system",
                    "metric_name": "network_bytes_recv",
                    "value": net_io.bytes_recv,
                    "unit": "bytes",
                    "timestamp": timestamp,
                    "tags": {"component": "network", "direction": "received"}
                })
            
            # Process count
            process_count = len(psutil.pids())
            await self.collect_metric({
                "service_name": "system",
                "metric_name": "process_count",
                "value": process_count,
                "unit": "count",
                "timestamp": timestamp,
                "tags": {"component": "processes"}
            })
            
        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")
    
    async def create_metric_definition(self, service_name: str, metric_name: str, 
                                     metric_type: MetricType, description: str = "",
                                     unit: str = "") -> Dict[str, Any]:
        """Cria definição de métrica"""
        try:
            metric_key = f"{service_name}.{metric_name}"
            
            definition = {
                "service_name": service_name,
                "metric_name": metric_name,
                "metric_type": metric_type.value,
                "description": description,
                "unit": unit,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            self.metric_definitions[metric_key] = definition
            
            return {
                "status": "created",
                "metric_key": metric_key,
                "definition": definition
            }
            
        except Exception as e:
            logger.error(f"Error creating metric definition: {e}")
            raise
    
    async def aggregate_metrics(self, service_name: str = None, period: str = "1h") -> Dict[str, Any]:
        """Agrega métricas por período"""
        try:
            # Parse period
            period_seconds = self._parse_period_to_seconds(period)
            current_time = datetime.now(timezone.utc)
            start_time = current_time - timedelta(seconds=period_seconds)
            
            aggregated = {}
            
            # Filter metrics by service if specified
            metrics_to_process = {}
            for metric_key, metric_data in self.metrics_data.items():
                if service_name and not metric_key.startswith(f"{service_name}."):
                    continue
                metrics_to_process[metric_key] = metric_data
            
            # Aggregate each metric
            for metric_key, metric_data in metrics_to_process.items():
                # Filter data points by time period
                period_points = []
                for point in metric_data["data_points"]:
                    point_time = datetime.fromisoformat(point["timestamp"].replace("Z", "+00:00"))
                    if start_time <= point_time <= current_time:
                        period_points.append(point)
                
                if not period_points:
                    continue
                
                # Calculate aggregations
                values = [point["value"] for point in period_points]
                
                aggregations = {
                    "count": len(values),
                    "sum": sum(values),
                    "average": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "median": statistics.median(values)
                }
                
                # Add percentiles if enough data
                if len(values) >= 10:
                    sorted_values = sorted(values)
                    aggregations.update({
                        "p95": self._percentile(sorted_values, 95),
                        "p99": self._percentile(sorted_values, 99)
                    })
                
                aggregated[metric_key] = {
                    "service_name": metric_data["service_name"],
                    "metric_name": metric_data["metric_name"],
                    "unit": metric_data["unit"],
                    "period": period,
                    "period_start": start_time.isoformat(),
                    "period_end": current_time.isoformat(),
                    "aggregations": aggregations,
                    "data_point_count": len(period_points)
                }
            
            return aggregated
            
        except Exception as e:
            logger.error(f"Error aggregating metrics: {e}")
            raise
    
    async def _load_collection_config(self):
        """Carrega configuração de coleta"""
        self.collection_config = {
            "retention_days": 7,
            "max_data_points_per_metric": 1000,
            "aggregation_intervals": ["1m", "5m", "15m", "1h", "6h", "24h"],
            "system_metrics_interval": 60,  # seconds
            "cleanup_interval": 3600  # seconds
        }
    
    async def _initialize_metric_definitions(self):
        """Inicializa definições de métricas padrão"""
        # System metrics
        system_metrics = [
            ("cpu_percent", MetricType.GAUGE, "CPU usage percentage", "percent"),
            ("memory_percent", MetricType.GAUGE, "Memory usage percentage", "percent"),
            ("memory_used", MetricType.GAUGE, "Memory used in bytes", "bytes"),
            ("disk_percent", MetricType.GAUGE, "Disk usage percentage", "percent"),
            ("network_bytes_sent", MetricType.COUNTER, "Network bytes sent", "bytes"),
            ("network_bytes_recv", MetricType.COUNTER, "Network bytes received", "bytes"),
            ("process_count", MetricType.GAUGE, "Number of running processes", "count")
        ]
        
        for metric_name, metric_type, description, unit in system_metrics:
            await self.create_metric_definition("system", metric_name, metric_type, description, unit)
        
        # Service metrics
        service_metrics = [
            ("request_count", MetricType.COUNTER, "Number of requests", "count"),
            ("request_duration", MetricType.HISTOGRAM, "Request duration", "milliseconds"),
            ("error_count", MetricType.COUNTER, "Number of errors", "count"),
            ("active_connections", MetricType.GAUGE, "Active connections", "count"),
            ("response_time", MetricType.HISTOGRAM, "Response time", "milliseconds"),
            ("throughput", MetricType.GAUGE, "Requests per second", "rps"),
            ("availability", MetricType.GAUGE, "Service availability", "percent")
        ]
        
        for metric_name, metric_type, description, unit in service_metrics:
            await self.create_metric_definition("service", metric_name, metric_type, description, unit)
    
    async def _continuous_metrics_aggregation(self):
        """Agregação contínua de métricas"""
        while self.is_active:
            try:
                await asyncio.sleep(300)  # 5 minutes
                
                # Aggregate metrics for different periods
                for period in self.collection_config["aggregation_intervals"]:
                    aggregated = await self.aggregate_metrics(period=period)
                    
                    # Store aggregated metrics
                    key = f"all_services_{period}"
                    self.aggregated_metrics[key] = {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "period": period,
                        "metrics": aggregated
                    }
                
                # Cleanup old data
                await self._cleanup_metrics_data()
                
            except Exception as e:
                logger.error(f"Error in continuous metrics aggregation: {e}")
    
    def _parse_period_to_seconds(self, period: str) -> int:
        """Converte período para segundos"""
        period_map = {
            "1m": 60,
            "5m": 300,
            "15m": 900,
            "1h": 3600,
            "6h": 21600,
            "24h": 86400
        }
        
        return period_map.get(period, 3600)  # Default to 1 hour
    
    def _percentile(self, sorted_values: List[float], percentile: float) -> float:
        """Calcula percentil"""
        if not sorted_values:
            return 0.0
        
        index = (percentile / 100) * (len(sorted_values) - 1)
        
        if index.is_integer():
            return sorted_values[int(index)]
        else:
            lower_index = int(index)
            upper_index = lower_index + 1
            if upper_index >= len(sorted_values):
                return sorted_values[-1]
            
            weight = index - lower_index
            return sorted_values[lower_index] * (1 - weight) + sorted_values[upper_index] * weight
    
    async def _cleanup_metrics_data(self):
        """Limpa dados antigos de métricas"""
        try:
            cutoff_time = datetime.now(timezone.utc) - timedelta(days=self.collection_config["retention_days"])
            
            for metric_key in list(self.metrics_data.keys()):
                metric_data = self.metrics_data[metric_key]
                
                # Filter out old data points
                filtered_points = []
                for point in metric_data["data_points"]:
                    point_time = datetime.fromisoformat(point["timestamp"].replace("Z", "+00:00"))
                    if point_time > cutoff_time:
                        filtered_points.append(point)
                
                if filtered_points:
                    metric_data["data_points"] = filtered_points
                else:
                    # Remove metric if no recent data
                    del self.metrics_data[metric_key]
            
            # Cleanup aggregated metrics
            for key in list(self.aggregated_metrics.keys()):
                aggregated_data = self.aggregated_metrics[key]
                timestamp = aggregated_data.get("timestamp")
                
                if timestamp:
                    data_time = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    if data_time < cutoff_time:
                        del self.aggregated_metrics[key]
            
            logger.info(f"Cleaned up metrics data, retained {len(self.metrics_data)} active metrics")
            
        except Exception as e:
            logger.error(f"Error cleaning up metrics data: {e}")
    
    async def get_metric_statistics(self, service_name: str, metric_name: str, 
                                  hours: int = 24) -> Dict[str, Any]:
        """Obtém estatísticas de uma métrica"""
        try:
            metrics = await self.get_service_metrics(service_name, metric_name, hours)
            
            if not metrics:
                return {"error": "No metrics found"}
            
            metric_data = metrics[0]
            values = [point["value"] for point in metric_data["data_points"]]
            
            if not values:
                return {"error": "No data points found"}
            
            statistics_data = {
                "service_name": service_name,
                "metric_name": metric_name,
                "unit": metric_data["unit"],
                "period_hours": hours,
                "data_point_count": len(values),
                "statistics": {
                    "count": len(values),
                    "sum": sum(values),
                    "average": statistics.mean(values),
                    "min": min(values),
                    "max": max(values),
                    "median": statistics.median(values),
                    "std_dev": statistics.stdev(values) if len(values) > 1 else 0
                }
            }
            
            # Add percentiles if enough data
            if len(values) >= 10:
                sorted_values = sorted(values)
                statistics_data["statistics"].update({
                    "p50": self._percentile(sorted_values, 50),
                    "p95": self._percentile(sorted_values, 95),
                    "p99": self._percentile(sorted_values, 99)
                })
            
            return statistics_data
            
        except Exception as e:
            logger.error(f"Error getting metric statistics: {e}")
            raise