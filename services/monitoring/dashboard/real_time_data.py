"""
Real-time Data Handler
Processamento de dados em tempo real para o dashboard
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Callable
import logging
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class RealTimeDataHandler:
    """Manipulador de dados em tempo real"""
    
    def __init__(self, max_data_points: int = 1000):
        self.max_data_points = max_data_points
        self.is_active = False
        
        # Data storage
        self.data_streams = defaultdict(lambda: deque(maxlen=max_data_points))
        self.subscribers = defaultdict(list)
        self.data_processors = {}
        self.data_aggregators = {}
        
        # Statistics
        self.stats = {
            "messages_processed": 0,
            "data_points_stored": 0,
            "subscribers_count": 0,
            "streams_count": 0
        }
        
        # Configuration
        self.config = {
            "buffer_size": 1000,
            "aggregation_window": 60,  # seconds
            "retention_period": 3600,  # seconds
            "compression_enabled": True,
            "real_time_threshold": 5  # seconds for real-time data
        }
    
    async def initialize(self):
        """Inicializa o manipulador de dados"""
        try:
            logger.info("Initializing Real-time Data Handler...")
            
            # Register default data processors
            await self._register_default_processors()
            
            # Start background tasks
            asyncio.create_task(self._data_cleanup_task())
            asyncio.create_task(self._aggregation_task())
            asyncio.create_task(self._statistics_update_task())
            
            self.is_active = True
            logger.info("Real-time Data Handler initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Real-time Data Handler: {e}")
            raise
    
    async def add_data_point(self, stream_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Adiciona um ponto de dados ao stream"""
        try:
            # Add timestamp if not present
            if "timestamp" not in data:
                data["timestamp"] = datetime.now(timezone.utc).isoformat()
            
            # Process data if processor exists
            if stream_id in self.data_processors:
                data = await self.data_processors[stream_id](data)
            
            # Store data point
            self.data_streams[stream_id].append(data)
            self.stats["data_points_stored"] += 1
            
            # Notify subscribers
            await self._notify_subscribers(stream_id, data)
            
            # Update statistics
            self.stats["messages_processed"] += 1
            self.stats["streams_count"] = len(self.data_streams)
            
            return {
                "status": "added",
                "stream_id": stream_id,
                "timestamp": data["timestamp"],
                "data_point_count": len(self.data_streams[stream_id])
            }
            
        except Exception as e:
            logger.error(f"Error adding data point to stream {stream_id}: {e}")
            raise
    
    async def get_stream_data(
        self, 
        stream_id: str, 
        limit: Optional[int] = None,
        since: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Obtém dados de um stream"""
        try:
            data = list(self.data_streams[stream_id])
            
            # Filter by timestamp if specified
            if since:
                since_iso = since.isoformat()
                data = [d for d in data if d.get("timestamp", "") >= since_iso]
            
            # Apply limit
            if limit:
                data = data[-limit:]
            
            return data
            
        except Exception as e:
            logger.error(f"Error getting stream data for {stream_id}: {e}")
            return []
    
    async def subscribe_to_stream(
        self, 
        stream_id: str, 
        callback: Callable,
        filter_func: Optional[Callable] = None
    ) -> str:
        """Subscreve a um stream de dados"""
        try:
            subscription_id = f"{stream_id}_{len(self.subscribers[stream_id])}"
            
            subscription = {
                "id": subscription_id,
                "callback": callback,
                "filter": filter_func,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "message_count": 0
            }
            
            self.subscribers[stream_id].append(subscription)
            self.stats["subscribers_count"] = sum(len(subs) for subs in self.subscribers.values())
            
            logger.info(f"New subscription {subscription_id} to stream {stream_id}")
            
            return subscription_id
            
        except Exception as e:
            logger.error(f"Error subscribing to stream {stream_id}: {e}")
            raise
    
    async def unsubscribe_from_stream(self, stream_id: str, subscription_id: str) -> Dict[str, Any]:
        """Remove subscrição de um stream"""
        try:
            subscribers = self.subscribers[stream_id]
            initial_count = len(subscribers)
            
            self.subscribers[stream_id] = [
                sub for sub in subscribers 
                if sub["id"] != subscription_id
            ]
            
            removed = initial_count - len(self.subscribers[stream_id])
            self.stats["subscribers_count"] = sum(len(subs) for subs in self.subscribers.values())
            
            return {
                "status": "unsubscribed",
                "stream_id": stream_id,
                "subscription_id": subscription_id,
                "removed": removed > 0
            }
            
        except Exception as e:
            logger.error(f"Error unsubscribing from stream {stream_id}: {e}")
            raise
    
    async def get_aggregated_data(
        self, 
        stream_id: str, 
        aggregation_type: str,
        window_size: int = 60,
        field: str = "value"
    ) -> Dict[str, Any]:
        """Obtém dados agregados de um stream"""
        try:
            data = await self.get_stream_data(stream_id)
            
            if not data:
                return {"aggregation_type": aggregation_type, "result": None, "count": 0}
            
            # Extract numeric values
            values = []
            for point in data:
                try:
                    if field in point and isinstance(point[field], (int, float)):
                        values.append(point[field])
                except (KeyError, TypeError):
                    continue
            
            if not values:
                return {"aggregation_type": aggregation_type, "result": None, "count": 0}
            
            # Calculate aggregation
            result = await self._calculate_aggregation(values, aggregation_type)
            
            return {
                "aggregation_type": aggregation_type,
                "result": result,
                "count": len(values),
                "window_size": window_size,
                "field": field,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting aggregated data for {stream_id}: {e}")
            return {"aggregation_type": aggregation_type, "result": None, "count": 0}
    
    async def create_real_time_aggregation(
        self, 
        stream_id: str, 
        aggregation_config: Dict[str, Any]
    ) -> str:
        """Cria agregação em tempo real"""
        try:
            aggregation_id = f"agg_{stream_id}_{len(self.data_aggregators)}"
            
            aggregator = {
                "id": aggregation_id,
                "stream_id": stream_id,
                "config": aggregation_config,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_result": None,
                "update_count": 0
            }
            
            self.data_aggregators[aggregation_id] = aggregator
            
            return aggregation_id
            
        except Exception as e:
            logger.error(f"Error creating real-time aggregation: {e}")
            raise
    
    async def get_data_stream_statistics(self, stream_id: Optional[str] = None) -> Dict[str, Any]:
        """Obtém estatísticas dos streams de dados"""
        try:
            if stream_id:
                # Statistics for specific stream
                data = self.data_streams[stream_id]
                subscribers = self.subscribers[stream_id]
                
                return {
                    "stream_id": stream_id,
                    "data_points": len(data),
                    "subscribers": len(subscribers),
                    "first_timestamp": data[0]["timestamp"] if data else None,
                    "last_timestamp": data[-1]["timestamp"] if data else None,
                    "data_rate": await self._calculate_data_rate(stream_id)
                }
            else:
                # Global statistics
                return {
                    "global_stats": self.stats.copy(),
                    "active_streams": list(self.data_streams.keys()),
                    "total_subscribers": sum(len(subs) for subs in self.subscribers.values()),
                    "memory_usage": await self._calculate_memory_usage(),
                    "uptime": (datetime.now(timezone.utc) - self._start_time).total_seconds() if hasattr(self, '_start_time') else 0
                }
                
        except Exception as e:
            logger.error(f"Error getting data stream statistics: {e}")
            return {}
    
    async def process_batch_data(self, batch_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Processa dados em lote"""
        try:
            processed_count = 0
            failed_count = 0
            
            for data_point in batch_data:
                try:
                    stream_id = data_point.get("stream_id")
                    if not stream_id:
                        failed_count += 1
                        continue
                    
                    # Remove stream_id from data before adding
                    point_data = {k: v for k, v in data_point.items() if k != "stream_id"}
                    
                    await self.add_data_point(stream_id, point_data)
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Error processing batch data point: {e}")
                    failed_count += 1
            
            return {
                "status": "completed",
                "processed": processed_count,
                "failed": failed_count,
                "total": len(batch_data)
            }
            
        except Exception as e:
            logger.error(f"Error processing batch data: {e}")
            raise
    
    async def _notify_subscribers(self, stream_id: str, data: Dict[str, Any]):
        """Notifica subscritores de um stream"""
        try:
            subscribers = self.subscribers[stream_id]
            
            for subscription in subscribers:
                try:
                    # Apply filter if exists
                    if subscription.get("filter"):
                        if not subscription["filter"](data):
                            continue
                    
                    # Call callback
                    callback = subscription["callback"]
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                    
                    subscription["message_count"] += 1
                    
                except Exception as e:
                    logger.error(f"Error notifying subscriber {subscription['id']}: {e}")
                    
        except Exception as e:
            logger.error(f"Error notifying subscribers for stream {stream_id}: {e}")
    
    async def _register_default_processors(self):
        """Registra processadores padrão de dados"""
        try:
            # Processor for vital signs data
            async def vital_signs_processor(data):
                # Add validation and enrichment
                if "patient_id" in data and "vital_sign" in data:
                    data["processed_at"] = datetime.now(timezone.utc).isoformat()
                    data["data_type"] = "vital_signs"
                return data
            
            # Processor for alert data
            async def alert_processor(data):
                # Add alert processing logic
                if "severity" in data:
                    data["processed_at"] = datetime.now(timezone.utc).isoformat()
                    data["data_type"] = "alert"
                return data
            
            # Processor for system metrics
            async def metrics_processor(data):
                # Add metrics processing logic
                if "metric_name" in data:
                    data["processed_at"] = datetime.now(timezone.utc).isoformat()
                    data["data_type"] = "system_metric"
                return data
            
            self.data_processors.update({
                "vital_signs": vital_signs_processor,
                "alerts": alert_processor,
                "system_metrics": metrics_processor
            })
            
        except Exception as e:
            logger.error(f"Error registering default processors: {e}")
    
    async def _calculate_aggregation(self, values: List[float], aggregation_type: str) -> float:
        """Calcula agregação dos valores"""
        try:
            if not values:
                return 0.0
            
            if aggregation_type == "avg" or aggregation_type == "average":
                return sum(values) / len(values)
            elif aggregation_type == "sum":
                return sum(values)
            elif aggregation_type == "min":
                return min(values)
            elif aggregation_type == "max":
                return max(values)
            elif aggregation_type == "count":
                return len(values)
            elif aggregation_type == "median":
                sorted_values = sorted(values)
                n = len(sorted_values)
                if n % 2 == 0:
                    return (sorted_values[n//2-1] + sorted_values[n//2]) / 2
                else:
                    return sorted_values[n//2]
            elif aggregation_type == "std" or aggregation_type == "stddev":
                if len(values) < 2:
                    return 0.0
                mean = sum(values) / len(values)
                variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
                return variance ** 0.5
            else:
                logger.warning(f"Unknown aggregation type: {aggregation_type}")
                return 0.0
                
        except Exception as e:
            logger.error(f"Error calculating aggregation: {e}")
            return 0.0
    
    async def _calculate_data_rate(self, stream_id: str) -> float:
        """Calcula taxa de dados por segundo"""
        try:
            data = self.data_streams[stream_id]
            if len(data) < 2:
                return 0.0
            
            # Get timestamps from last 10 points
            recent_data = list(data)[-10:]
            timestamps = []
            
            for point in recent_data:
                try:
                    timestamp = datetime.fromisoformat(point["timestamp"].replace("Z", "+00:00"))
                    timestamps.append(timestamp)
                except (KeyError, ValueError):
                    continue
            
            if len(timestamps) < 2:
                return 0.0
            
            # Calculate rate
            time_span = (timestamps[-1] - timestamps[0]).total_seconds()
            if time_span > 0:
                return (len(timestamps) - 1) / time_span
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Error calculating data rate for {stream_id}: {e}")
            return 0.0
    
    async def _calculate_memory_usage(self) -> Dict[str, Any]:
        """Calcula uso de memória"""
        try:
            total_points = sum(len(stream) for stream in self.data_streams.values())
            
            # Estimate memory usage (rough calculation)
            estimated_bytes_per_point = 500  # average JSON object size
            estimated_total_bytes = total_points * estimated_bytes_per_point
            
            return {
                "total_data_points": total_points,
                "estimated_memory_bytes": estimated_total_bytes,
                "estimated_memory_mb": estimated_total_bytes / (1024 * 1024),
                "streams_count": len(self.data_streams),
                "max_points_per_stream": self.max_data_points
            }
            
        except Exception as e:
            logger.error(f"Error calculating memory usage: {e}")
            return {}
    
    async def _data_cleanup_task(self):
        """Tarefa de limpeza de dados antigos"""
        while self.is_active:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                current_time = datetime.now(timezone.utc)
                retention_threshold = current_time - timedelta(seconds=self.config["retention_period"])
                
                for stream_id, data_stream in self.data_streams.items():
                    # Remove old data points
                    while data_stream:
                        try:
                            oldest_point = data_stream[0]
                            point_time = datetime.fromisoformat(oldest_point["timestamp"].replace("Z", "+00:00"))
                            
                            if point_time < retention_threshold:
                                data_stream.popleft()
                            else:
                                break
                                
                        except (KeyError, ValueError, IndexError):
                            data_stream.popleft()
                
            except Exception as e:
                logger.error(f"Error in data cleanup task: {e}")
    
    async def _aggregation_task(self):
        """Tarefa de agregação contínua"""
        while self.is_active:
            try:
                await asyncio.sleep(self.config["aggregation_window"])
                
                # Update aggregations
                for aggregator_id, aggregator in self.data_aggregators.items():
                    try:
                        stream_id = aggregator["stream_id"]
                        config = aggregator["config"]
                        
                        # Perform aggregation
                        result = await self.get_aggregated_data(
                            stream_id,
                            config.get("type", "avg"),
                            config.get("window_size", 60),
                            config.get("field", "value")
                        )
                        
                        aggregator["last_result"] = result
                        aggregator["update_count"] += 1
                        
                    except Exception as e:
                        logger.error(f"Error updating aggregation {aggregator_id}: {e}")
                
            except Exception as e:
                logger.error(f"Error in aggregation task: {e}")
    
    async def _statistics_update_task(self):
        """Tarefa de atualização de estatísticas"""
        while self.is_active:
            try:
                await asyncio.sleep(60)  # Update every minute
                
                # Update statistics
                self.stats["streams_count"] = len(self.data_streams)
                self.stats["subscribers_count"] = sum(len(subs) for subs in self.subscribers.values())
                
                # Log statistics periodically
                if self.stats["messages_processed"] % 1000 == 0:
                    logger.info(f"Real-time data handler stats: {self.stats}")
                
            except Exception as e:
                logger.error(f"Error in statistics update task: {e}")