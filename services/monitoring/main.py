"""
Real-time Monitoring & Alerts Service
Sistema de monitoramento em tempo real com alertas inteligentes
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Set
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import logging
from enum import Enum
import uvicorn
from contextlib import asynccontextmanager

# Import core monitoring components
from core.vital_signs_monitor import VitalSignsMonitor
from core.patient_monitor import PatientMonitor
from core.system_monitor import SystemMonitor
from core.metrics_collector import MetricsCollector

# Import alert components
from alerts.alert_engine import AlertEngine
from alerts.notification_service import NotificationService
from alerts.escalation_manager import EscalationManager

# Import dashboard components
from dashboard.dashboard_manager import DashboardManager
from dashboard.real_time_data import RealTimeDataHandler
from static.assets import StaticAssetsManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Níveis de severidade de alertas"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class MonitoringStatus(Enum):
    """Status do sistema de monitoramento"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"

class VitalSignsData(BaseModel):
    """Dados de sinais vitais"""
    patient_id: str
    timestamp: str
    heart_rate: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    temperature: Optional[float] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[int] = None
    glucose: Optional[float] = None

class AlertData(BaseModel):
    """Dados de alerta"""
    id: Optional[str] = None
    patient_id: str
    alert_type: str
    severity: AlertSeverity
    message: str
    timestamp: Optional[str] = None
    acknowledged: bool = False
    resolved: bool = False

class SystemMetric(BaseModel):
    """Métrica do sistema"""
    service_name: str
    metric_name: str
    value: float
    unit: str
    timestamp: Optional[str] = None
    tags: Optional[Dict[str, str]] = None

# Global monitoring instances
vital_signs_monitor = VitalSignsMonitor()
patient_monitor = PatientMonitor()
system_monitor = SystemMonitor()
metrics_collector = MetricsCollector()
alert_engine = AlertEngine()
notification_service = NotificationService()
escalation_manager = EscalationManager()
dashboard_manager = DashboardManager()
real_time_data = RealTimeDataHandler()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.client_subscriptions: Dict[WebSocket, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_subscriptions[websocket] = set()
        logger.info(f"WebSocket client connected: {client_id}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.client_subscriptions:
            del self.client_subscriptions[websocket]
        logger.info("WebSocket client disconnected")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast(self, message: str, channel: str = None):
        disconnected = []
        for connection in self.active_connections:
            try:
                # Check if client is subscribed to this channel
                if channel and channel not in self.client_subscriptions.get(connection, set()):
                    continue
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    def subscribe_to_channel(self, websocket: WebSocket, channel: str):
        if websocket in self.client_subscriptions:
            self.client_subscriptions[websocket].add(channel)

connection_manager = ConnectionManager()

# Startup/shutdown lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    # Startup
    logger.info("Starting Real-time Monitoring Service...")
    
    # Initialize all components
    await vital_signs_monitor.initialize()
    await patient_monitor.initialize()
    await system_monitor.initialize()
    await metrics_collector.initialize()
    await alert_engine.initialize()
    await notification_service.initialize()
    await escalation_manager.initialize()
    await dashboard_manager.initialize()
    await real_time_data.initialize()
    
    # Start background monitoring tasks
    asyncio.create_task(background_monitoring())
    asyncio.create_task(background_alert_processing())
    asyncio.create_task(background_metrics_collection())
    
    logger.info("Real-time Monitoring Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Real-time Monitoring Service...")

# FastAPI app with lifespan
app = FastAPI(
    title="Real-time Monitoring & Alerts Service",
    description="Sistema de monitoramento em tempo real com alertas inteligentes",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for dashboard
try:
    # Initialize static assets manager
    static_assets = StaticAssetsManager()
    static_assets.create_static_files()
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception as e:
    logger.warning(f"Could not mount static files: {e}")

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Real-time Monitoring & Alerts Service",
        "version": "1.0.0",
        "status": "operational",
        "components": {
            "vital_signs_monitor": vital_signs_monitor.is_active,
            "patient_monitor": patient_monitor.is_active,
            "system_monitor": system_monitor.is_active,
            "alert_engine": alert_engine.is_active
        }
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Real-time Monitoring",
        "version": "1.0.0",
        "uptime": await get_system_uptime()
    }

# Vital signs endpoints
@app.post("/vital-signs")
async def receive_vital_signs(vital_signs: VitalSignsData, background_tasks: BackgroundTasks):
    """Recebe dados de sinais vitais"""
    try:
        # Process vital signs
        result = await vital_signs_monitor.process_vital_signs(vital_signs.dict())
        
        # Check for alerts in background
        background_tasks.add_task(check_vital_signs_alerts, vital_signs.dict())
        
        # Broadcast to WebSocket clients
        await connection_manager.broadcast(
            json.dumps({
                "type": "vital_signs",
                "data": vital_signs.dict()
            }),
            channel="vital_signs"
        )
        
        return {
            "status": "received",
            "patient_id": vital_signs.patient_id,
            "timestamp": vital_signs.timestamp,
            "alerts_triggered": result.get("alerts_triggered", 0)
        }
        
    except Exception as e:
        logger.error(f"Error processing vital signs: {e}")
        raise HTTPException(status_code=500, detail="Error processing vital signs")

@app.get("/vital-signs/{patient_id}")
async def get_patient_vital_signs(
    patient_id: str,
    hours: int = 24,
    include_alerts: bool = True
):
    """Busca sinais vitais de um paciente"""
    try:
        vital_signs = await vital_signs_monitor.get_patient_vital_signs(
            patient_id, 
            hours=hours
        )
        
        response = {
            "patient_id": patient_id,
            "vital_signs": vital_signs,
            "period_hours": hours
        }
        
        if include_alerts:
            alerts = await alert_engine.get_patient_alerts(patient_id, hours=hours)
            response["alerts"] = alerts
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting vital signs for patient {patient_id}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving vital signs")

# Alert endpoints
@app.post("/alerts")
async def create_alert(alert: AlertData, background_tasks: BackgroundTasks):
    """Cria um novo alerta"""
    try:
        # Generate alert ID if not provided
        if not alert.id:
            alert.id = str(uuid.uuid4())
        
        if not alert.timestamp:
            alert.timestamp = datetime.now(timezone.utc).isoformat()
        
        # Process alert
        result = await alert_engine.create_alert(alert.dict())
        
        # Handle notifications in background
        background_tasks.add_task(process_alert_notifications, alert.dict())
        
        # Broadcast alert to WebSocket clients
        await connection_manager.broadcast(
            json.dumps({
                "type": "alert",
                "data": alert.dict()
            }),
            channel="alerts"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating alert: {e}")
        raise HTTPException(status_code=500, detail="Error creating alert")

@app.get("/alerts")
async def get_alerts(
    severity: Optional[AlertSeverity] = None,
    patient_id: Optional[str] = None,
    unresolved_only: bool = True,
    limit: int = 100
):
    """Busca alertas com filtros"""
    try:
        alerts = await alert_engine.get_alerts(
            severity=severity.value if severity else None,
            patient_id=patient_id,
            unresolved_only=unresolved_only,
            limit=limit
        )
        
        return {
            "alerts": alerts,
            "total": len(alerts),
            "filters": {
                "severity": severity.value if severity else None,
                "patient_id": patient_id,
                "unresolved_only": unresolved_only
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving alerts")

@app.put("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, user_id: str):
    """Reconhece um alerta"""
    try:
        result = await alert_engine.acknowledge_alert(alert_id, user_id)
        
        # Broadcast acknowledgment
        await connection_manager.broadcast(
            json.dumps({
                "type": "alert_acknowledged",
                "data": {
                    "alert_id": alert_id,
                    "user_id": user_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }),
            channel="alerts"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error acknowledging alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Error acknowledging alert")

@app.put("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, user_id: str, resolution_notes: Optional[str] = None):
    """Resolve um alerta"""
    try:
        result = await alert_engine.resolve_alert(alert_id, user_id, resolution_notes)
        
        # Broadcast resolution
        await connection_manager.broadcast(
            json.dumps({
                "type": "alert_resolved",
                "data": {
                    "alert_id": alert_id,
                    "user_id": user_id,
                    "resolution_notes": resolution_notes,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            }),
            channel="alerts"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error resolving alert {alert_id}: {e}")
        raise HTTPException(status_code=500, detail="Error resolving alert")

# System monitoring endpoints
@app.post("/metrics")
async def submit_system_metric(metric: SystemMetric):
    """Submete uma métrica do sistema"""
    try:
        if not metric.timestamp:
            metric.timestamp = datetime.now(timezone.utc).isoformat()
        
        result = await metrics_collector.collect_metric(metric.dict())
        
        # Check for system alerts
        await check_system_metric_alerts(metric.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"Error submitting metric: {e}")
        raise HTTPException(status_code=500, detail="Error submitting metric")

@app.get("/metrics/{service_name}")
async def get_service_metrics(
    service_name: str,
    metric_name: Optional[str] = None,
    hours: int = 24
):
    """Busca métricas de um serviço"""
    try:
        metrics = await metrics_collector.get_service_metrics(
            service_name,
            metric_name=metric_name,
            hours=hours
        )
        
        return {
            "service_name": service_name,
            "metric_name": metric_name,
            "metrics": metrics,
            "period_hours": hours
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics for service {service_name}: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving metrics")

@app.get("/system/status")
async def get_system_status():
    """Status geral do sistema"""
    try:
        status = await system_monitor.get_system_status()
        return status
        
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving system status")

# Dashboard endpoints
@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard():
    """Dashboard principal"""
    return await dashboard_manager.get_dashboard_html()

@app.get("/dashboard/data")
async def get_dashboard_data():
    """Dados para o dashboard"""
    try:
        data = await dashboard_manager.get_dashboard_data()
        return data
        
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving dashboard data")

@app.get("/dashboard/real-time")
async def get_real_time_dashboard_data():
    """Dados em tempo real para o dashboard"""
    try:
        data = await real_time_data.get_real_time_data()
        return data
        
    except Exception as e:
        logger.error(f"Error getting real-time data: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving real-time data")

# WebSocket endpoint
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time updates"""
    await connection_manager.connect(websocket, client_id)
    try:
        while True:
            # Receive client messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle subscription requests
            if message.get("type") == "subscribe":
                channel = message.get("channel")
                if channel:
                    connection_manager.subscribe_to_channel(websocket, channel)
                    await connection_manager.send_personal_message(
                        json.dumps({
                            "type": "subscription_confirmed",
                            "channel": channel
                        }),
                        websocket
                    )
            
            # Handle ping/pong for connection health
            elif message.get("type") == "ping":
                await connection_manager.send_personal_message(
                    json.dumps({"type": "pong"}),
                    websocket
                )
            
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket)

# Background tasks
async def background_monitoring():
    """Task de monitoramento em background"""
    while True:
        try:
            # Continuous monitoring tasks
            await vital_signs_monitor.perform_monitoring_cycle()
            await patient_monitor.perform_monitoring_cycle()
            await system_monitor.perform_monitoring_cycle()
            
            # Wait before next cycle
            await asyncio.sleep(30)  # 30 seconds
            
        except Exception as e:
            logger.error(f"Error in background monitoring: {e}")
            await asyncio.sleep(60)  # Wait longer on error

async def background_alert_processing():
    """Task de processamento de alertas em background"""
    while True:
        try:
            # Process pending alerts
            await alert_engine.process_pending_alerts()
            await escalation_manager.process_escalations()
            
            # Wait before next cycle
            await asyncio.sleep(10)  # 10 seconds
            
        except Exception as e:
            logger.error(f"Error in background alert processing: {e}")
            await asyncio.sleep(30)

async def background_metrics_collection():
    """Task de coleta de métricas em background"""
    while True:
        try:
            # Collect system metrics
            await metrics_collector.collect_system_metrics()
            
            # Update dashboard data
            await real_time_data.update_real_time_data()
            
            # Broadcast metrics to WebSocket clients
            metrics_data = await metrics_collector.get_current_metrics()
            await connection_manager.broadcast(
                json.dumps({
                    "type": "metrics_update",
                    "data": metrics_data
                }),
                channel="metrics"
            )
            
            # Wait before next cycle
            await asyncio.sleep(60)  # 1 minute
            
        except Exception as e:
            logger.error(f"Error in background metrics collection: {e}")
            await asyncio.sleep(120)

# Helper functions
async def check_vital_signs_alerts(vital_signs_data: Dict[str, Any]):
    """Verifica alertas baseados em sinais vitais"""
    try:
        alerts = await vital_signs_monitor.check_alerts(vital_signs_data)
        
        for alert_data in alerts:
            await alert_engine.create_alert(alert_data)
            
    except Exception as e:
        logger.error(f"Error checking vital signs alerts: {e}")

async def process_alert_notifications(alert_data: Dict[str, Any]):
    """Processa notificações para um alerta"""
    try:
        await notification_service.send_alert_notification(alert_data)
        
        # Check if escalation is needed
        if alert_data.get("severity") in ["high", "critical"]:
            await escalation_manager.initiate_escalation(alert_data)
            
    except Exception as e:
        logger.error(f"Error processing alert notifications: {e}")

async def check_system_metric_alerts(metric_data: Dict[str, Any]):
    """Verifica alertas baseados em métricas do sistema"""
    try:
        alerts = await system_monitor.check_metric_alerts(metric_data)
        
        for alert_data in alerts:
            await alert_engine.create_alert(alert_data)
            
    except Exception as e:
        logger.error(f"Error checking system metric alerts: {e}")

async def get_system_uptime():
    """Calcula uptime do sistema"""
    try:
        uptime_data = await system_monitor.get_uptime()
        return uptime_data
    except Exception:
        return "unknown"

# =============================
# DASHBOARD ROUTES
# =============================

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Dashboard principal de monitoramento"""
    try:
        html_content = await dashboard_manager.get_dashboard_html()
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Error loading dashboard: {e}")
        return HTMLResponse(content="<html><body><h1>Dashboard Error</h1></body></html>", status_code=500)

@app.get("/dashboard/data")
async def get_dashboard_data():
    """Endpoint para dados do dashboard"""
    try:
        data = await dashboard_manager.get_dashboard_data()
        return data
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dashboard/widgets")
async def create_dashboard_widget(widget_data: Dict[str, Any]):
    """Cria um widget personalizado no dashboard"""
    try:
        widget_id = widget_data.get("id", str(uuid.uuid4()))
        result = await dashboard_manager.create_widget(widget_id, widget_data)
        return result
    except Exception as e:
        logger.error(f"Error creating dashboard widget: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dashboard/widgets/{widget_id}")
async def get_dashboard_widget(widget_id: str):
    """Obtém dados de um widget específico"""
    try:
        widget_data = await dashboard_manager.get_widget_data(widget_id)
        return widget_data
    except Exception as e:
        logger.error(f"Error getting dashboard widget: {e}")
        raise HTTPException(status_code=404, detail="Widget not found")

@app.post("/realtime/data")
async def add_realtime_data(stream_data: Dict[str, Any]):
    """Adiciona dados a um stream em tempo real"""
    try:
        stream_id = stream_data.get("stream_id")
        data = stream_data.get("data", {})
        
        if not stream_id:
            raise HTTPException(status_code=400, detail="stream_id is required")
        
        result = await real_time_data.add_data_point(stream_id, data)
        
        # Broadcast to WebSocket clients
        await connection_manager.broadcast(
            json.dumps({
                "type": "realtime_data",
                "stream_id": stream_id,
                "data": data
            }),
            channel="realtime"
        )
        
        return result
    except Exception as e:
        logger.error(f"Error adding realtime data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/realtime/data/{stream_id}")
async def get_realtime_data(
    stream_id: str, 
    limit: Optional[int] = None,
    since: Optional[str] = None
):
    """Obtém dados de um stream em tempo real"""
    try:
        since_datetime = None
        if since:
            since_datetime = datetime.fromisoformat(since.replace("Z", "+00:00"))
        
        data = await real_time_data.get_stream_data(stream_id, limit, since_datetime)
        return {
            "stream_id": stream_id,
            "data": data,
            "count": len(data)
        }
    except Exception as e:
        logger.error(f"Error getting realtime data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/realtime/stats/{stream_id}")
async def get_realtime_stats(stream_id: str):
    """Obtém estatísticas de um stream em tempo real"""
    try:
        stats = await real_time_data.get_data_stream_statistics(stream_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting realtime stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/realtime/aggregation/{stream_id}")
async def get_realtime_aggregation(
    stream_id: str,
    aggregation_type: str = "avg",
    window_size: int = 60,
    field: str = "value"
):
    """Obtém dados agregados de um stream"""
    try:
        aggregation = await real_time_data.get_aggregated_data(
            stream_id, aggregation_type, window_size, field
        )
        return aggregation
    except Exception as e:
        logger.error(f"Error getting realtime aggregation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
        log_level="info"
    )