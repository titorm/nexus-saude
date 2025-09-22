"""
Dashboard Manager
Gerenciamento do dashboard de monitoramento
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DashboardManager:
    """Gerenciador do dashboard de monitoramento"""
    
    def __init__(self):
        self.is_active = False
        self.dashboard_config = {}
        self.widget_registry = {}
        self.dashboard_data = {}
        self.refresh_intervals = {}
        
    async def initialize(self):
        """Inicializa o gerenciador de dashboard"""
        try:
            logger.info("Initializing Dashboard Manager...")
            
            # Load dashboard configuration
            await self._load_dashboard_config()
            
            # Register default widgets
            await self._register_default_widgets()
            
            # Start dashboard data refresh
            asyncio.create_task(self._continuous_dashboard_refresh())
            
            self.is_active = True
            logger.info("Dashboard Manager initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Dashboard Manager: {e}")
            raise
    
    async def get_dashboard_html(self) -> str:
        """Retorna HTML do dashboard"""
        try:
            html_content = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nexus Saúde - Monitoramento em Tempo Real</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .dashboard-card {
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .metric-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .metric-value {
            font-size: 2.5rem;
            font-weight: bold;
        }
        .metric-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        .alert-critical { border-left: 5px solid #dc3545; }
        .alert-high { border-left: 5px solid #fd7e14; }
        .alert-medium { border-left: 5px solid #ffc107; }
        .alert-low { border-left: 5px solid #198754; }
        .status-healthy { color: #198754; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .refresh-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }
        .patient-card {
            border-radius: 8px;
            border: 1px solid #dee2e6;
            margin-bottom: 15px;
            transition: all 0.3s ease;
        }
        .patient-card:hover {
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .vital-sign {
            display: inline-block;
            margin: 5px 10px 5px 0;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.9rem;
        }
        .vital-normal { background-color: #d4edda; color: #155724; }
        .vital-warning { background-color: #fff3cd; color: #856404; }
        .vital-critical { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body class="bg-light">
    <div class="refresh-indicator">
        <span class="badge bg-primary" id="lastRefresh">Atualizando...</span>
    </div>

    <div class="container-fluid">
        <header class="py-3 mb-4">
            <h1 class="display-4 text-center">
                <i class="fas fa-heartbeat text-danger"></i>
                Centro de Monitoramento Nexus Saúde
            </h1>
            <p class="text-center text-muted">Sistema de Monitoramento em Tempo Real</p>
        </header>

        <!-- Métricas Principais -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value" id="totalPatients">-</div>
                    <div class="metric-label">Pacientes Monitorados</div>
                    <i class="fas fa-users fa-2x float-end opacity-50"></i>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value" id="activeAlerts">-</div>
                    <div class="metric-label">Alertas Ativos</div>
                    <i class="fas fa-exclamation-triangle fa-2x float-end opacity-50"></i>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value" id="criticalPatients">-</div>
                    <div class="metric-label">Pacientes Críticos</div>
                    <i class="fas fa-exclamation-circle fa-2x float-end opacity-50"></i>
                </div>
            </div>
            <div class="col-md-3">
                <div class="metric-card">
                    <div class="metric-value" id="systemHealth">-</div>
                    <div class="metric-label">Saúde do Sistema</div>
                    <i class="fas fa-server fa-2x float-end opacity-50"></i>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Alertas Recentes -->
            <div class="col-md-6">
                <div class="card dashboard-card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-bell text-warning"></i>
                            Alertas Recentes
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="recentAlerts" style="max-height: 400px; overflow-y: auto;">
                            <div class="text-center py-3">
                                <i class="fas fa-spinner fa-spin"></i>
                                Carregando alertas...
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Status do Sistema -->
            <div class="col-md-6">
                <div class="card dashboard-card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-cogs text-info"></i>
                            Status do Sistema
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="systemStatus">
                            <div class="text-center py-3">
                                <i class="fas fa-spinner fa-spin"></i>
                                Carregando status...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <!-- Pacientes Críticos -->
            <div class="col-md-8">
                <div class="card dashboard-card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-user-injured text-danger"></i>
                            Pacientes Críticos
                        </h5>
                    </div>
                    <div class="card-body">
                        <div id="criticalPatientsTable" style="max-height: 500px; overflow-y: auto;">
                            <div class="text-center py-3">
                                <i class="fas fa-spinner fa-spin"></i>
                                Carregando pacientes...
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráfico de Métricas -->
            <div class="col-md-4">
                <div class="card dashboard-card">
                    <div class="card-header">
                        <h5 class="mb-0">
                            <i class="fas fa-chart-line text-success"></i>
                            Métricas em Tempo Real
                        </h5>
                    </div>
                    <div class="card-body">
                        <canvas id="metricsChart" height="300"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let ws = null;
        let metricsChart = null;

        // Conectar WebSocket
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/dashboard_${Date.now()}`;
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                console.log('WebSocket conectado');
                // Subscrever aos canais
                ws.send(JSON.stringify({type: 'subscribe', channel: 'vital_signs'}));
                ws.send(JSON.stringify({type: 'subscribe', channel: 'alerts'}));
                ws.send(JSON.stringify({type: 'subscribe', channel: 'metrics'}));
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = function() {
                console.log('WebSocket desconectado, tentando reconectar...');
                setTimeout(connectWebSocket, 5000);
            };
            
            ws.onerror = function(error) {
                console.error('Erro no WebSocket:', error);
            };
        }

        // Tratar mensagens do WebSocket
        function handleWebSocketMessage(data) {
            switch(data.type) {
                case 'vital_signs':
                    updateVitalSigns(data.data);
                    break;
                case 'alert':
                    updateAlerts(data.data);
                    break;
                case 'metrics_update':
                    updateMetrics(data.data);
                    break;
            }
        }

        // Atualizar sinais vitais
        function updateVitalSigns(data) {
            // Atualizar dados em tempo real
            refreshDashboard();
        }

        // Atualizar alertas
        function updateAlerts(data) {
            addNewAlert(data);
        }

        // Atualizar métricas
        function updateMetrics(data) {
            updateMetricsChart(data);
        }

        // Adicionar novo alerta
        function addNewAlert(alert) {
            const alertsContainer = document.getElementById('recentAlerts');
            const alertElement = createAlertElement(alert);
            alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);
            
            // Manter apenas os 10 alertas mais recentes
            const alerts = alertsContainer.children;
            if (alerts.length > 10) {
                alertsContainer.removeChild(alerts[alerts.length - 1]);
            }
        }

        // Criar elemento de alerta
        function createAlertElement(alert) {
            const div = document.createElement('div');
            div.className = `alert alert-sm alert-${alert.severity} mb-2`;
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <strong>Paciente ${alert.patient_id}</strong><br>
                        <small>${alert.message}</small>
                    </div>
                    <small class="text-muted">${formatTime(alert.timestamp)}</small>
                </div>
            `;
            return div;
        }

        // Formatar tempo
        function formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('pt-BR');
        }

        // Atualizar dashboard
        async function refreshDashboard() {
            try {
                const response = await fetch('/dashboard/data');
                const data = await response.json();
                
                // Atualizar métricas principais
                document.getElementById('totalPatients').textContent = data.total_patients || '0';
                document.getElementById('activeAlerts').textContent = data.active_alerts || '0';
                document.getElementById('criticalPatients').textContent = data.critical_patients || '0';
                document.getElementById('systemHealth').textContent = data.system_health || 'OK';
                
                // Atualizar alertas recentes
                updateRecentAlerts(data.recent_alerts || []);
                
                // Atualizar status do sistema
                updateSystemStatus(data.system_status || {});
                
                // Atualizar pacientes críticos
                updateCriticalPatientsTable(data.critical_patients_list || []);
                
                // Atualizar timestamp
                document.getElementById('lastRefresh').textContent = 
                    `Última atualização: ${formatTime(new Date())}`;
                    
            } catch (error) {
                console.error('Erro ao atualizar dashboard:', error);
            }
        }

        // Atualizar alertas recentes
        function updateRecentAlerts(alerts) {
            const container = document.getElementById('recentAlerts');
            container.innerHTML = '';
            
            if (alerts.length === 0) {
                container.innerHTML = '<div class="text-center py-3 text-muted">Nenhum alerta recente</div>';
                return;
            }
            
            alerts.forEach(alert => {
                container.appendChild(createAlertElement(alert));
            });
        }

        // Atualizar status do sistema
        function updateSystemStatus(status) {
            const container = document.getElementById('systemStatus');
            container.innerHTML = `
                <div class="row">
                    <div class="col-6">
                        <div class="text-center">
                            <div class="h4 status-${status.cpu?.status || 'healthy'}">${status.cpu?.cpu_percent || 0}%</div>
                            <div class="small text-muted">CPU</div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="text-center">
                            <div class="h4 status-${status.memory?.status || 'healthy'}">${status.memory?.memory?.percent || 0}%</div>
                            <div class="small text-muted">Memória</div>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="small">
                    <div><strong>Status Geral:</strong> 
                        <span class="status-${status.overall_status || 'healthy'}">${status.overall_status || 'Saudável'}</span>
                    </div>
                    <div><strong>Uptime:</strong> ${status.uptime?.uptime_formatted || 'N/A'}</div>
                </div>
            `;
        }

        // Atualizar tabela de pacientes críticos
        function updateCriticalPatientsTable(patients) {
            const container = document.getElementById('criticalPatientsTable');
            container.innerHTML = '';
            
            if (patients.length === 0) {
                container.innerHTML = '<div class="text-center py-3 text-muted">Nenhum paciente crítico</div>';
                return;
            }
            
            patients.forEach(patient => {
                const patientCard = document.createElement('div');
                patientCard.className = 'patient-card p-3';
                patientCard.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${patient.name || `Paciente ${patient.patient_id}`}</strong>
                            <span class="badge bg-danger ms-2">${patient.risk_level || 'Alto Risco'}</span>
                            <div class="mt-2">
                                <small class="text-muted">Última atualização: ${formatTime(patient.updated_at || new Date())}</small>
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="small text-muted">Alertas Ativos</div>
                            <div class="h5 text-danger">${patient.active_alerts || 0}</div>
                        </div>
                    </div>
                `;
                container.appendChild(patientCard);
            });
        }

        // Inicializar gráfico de métricas
        function initMetricsChart() {
            const ctx = document.getElementById('metricsChart').getContext('2d');
            metricsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'CPU %',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }, {
                        label: 'Memória %',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        }

        // Atualizar gráfico de métricas
        function updateMetricsChart(data) {
            if (!metricsChart || !data.metrics) return;
            
            const now = new Date().toLocaleTimeString();
            const cpuPercent = data.metrics['system.cpu_percent']?.current_value || 0;
            const memoryPercent = data.metrics['system.memory_percent']?.current_value || 0;
            
            // Adicionar novos dados
            metricsChart.data.labels.push(now);
            metricsChart.data.datasets[0].data.push(cpuPercent);
            metricsChart.data.datasets[1].data.push(memoryPercent);
            
            // Manter apenas os últimos 20 pontos
            if (metricsChart.data.labels.length > 20) {
                metricsChart.data.labels.shift();
                metricsChart.data.datasets[0].data.shift();
                metricsChart.data.datasets[1].data.shift();
            }
            
            metricsChart.update();
        }

        // Inicializar dashboard
        window.addEventListener('load', function() {
            connectWebSocket();
            initMetricsChart();
            refreshDashboard();
            
            // Atualizar a cada 30 segundos
            setInterval(refreshDashboard, 30000);
        });
    </script>
</body>
</html>
            """.strip()
            
            return html_content
            
        except Exception as e:
            logger.error(f"Error generating dashboard HTML: {e}")
            return "<html><body><h1>Error loading dashboard</h1></body></html>"
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Obtém dados para o dashboard"""
        try:
            # Import monitoring components
            from core.patient_monitor import PatientMonitor
            from core.system_monitor import SystemMonitor
            from alerts.alert_engine import AlertEngine
            from core.metrics_collector import MetricsCollector
            
            # Get instances (would be dependency injected in real app)
            patient_monitor = PatientMonitor()
            system_monitor = SystemMonitor()
            alert_engine = AlertEngine()
            metrics_collector = MetricsCollector()
            
            # Collect dashboard data
            dashboard_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_patients": len(getattr(patient_monitor, 'patients', {})),
                "active_alerts": len(await alert_engine.get_alerts(unresolved_only=True) if alert_engine.is_active else []),
                "critical_patients": len([
                    p for p in getattr(patient_monitor, 'patients', {}).values() 
                    if p.get("risk_level") == "critical"
                ]),
                "system_health": "healthy",
                "recent_alerts": await alert_engine.get_alerts(limit=10) if alert_engine.is_active else [],
                "system_status": await system_monitor.get_system_status() if system_monitor.is_active else {},
                "critical_patients_list": await self._get_critical_patients_list(),
                "metrics_summary": await self._get_metrics_summary()
            }
            
            return dashboard_data
            
        except Exception as e:
            logger.error(f"Error getting dashboard data: {e}")
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_patients": 0,
                "active_alerts": 0,
                "critical_patients": 0,
                "system_health": "unknown",
                "recent_alerts": [],
                "system_status": {},
                "critical_patients_list": [],
                "metrics_summary": {}
            }
    
    async def create_widget(self, widget_id: str, widget_config: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um widget personalizado"""
        try:
            widget = {
                "id": widget_id,
                "type": widget_config.get("type", "generic"),
                "title": widget_config.get("title", "Widget"),
                "config": widget_config,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "data_source": widget_config.get("data_source"),
                "refresh_interval": widget_config.get("refresh_interval", 60),
                "position": widget_config.get("position", {"row": 0, "col": 0}),
                "size": widget_config.get("size", {"width": 1, "height": 1})
            }
            
            self.widget_registry[widget_id] = widget
            
            return {
                "status": "created",
                "widget_id": widget_id,
                "widget": widget
            }
            
        except Exception as e:
            logger.error(f"Error creating widget: {e}")
            raise
    
    async def update_widget_data(self, widget_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Atualiza dados de um widget"""
        try:
            if widget_id not in self.widget_registry:
                raise ValueError(f"Widget {widget_id} not found")
            
            widget = self.widget_registry[widget_id]
            widget["data"] = data
            widget["last_updated"] = datetime.now(timezone.utc).isoformat()
            
            return {
                "status": "updated",
                "widget_id": widget_id,
                "last_updated": widget["last_updated"]
            }
            
        except Exception as e:
            logger.error(f"Error updating widget data: {e}")
            raise
    
    async def get_widget_data(self, widget_id: str) -> Dict[str, Any]:
        """Obtém dados de um widget"""
        try:
            if widget_id not in self.widget_registry:
                raise ValueError(f"Widget {widget_id} not found")
            
            widget = self.widget_registry[widget_id]
            
            # Get fresh data based on widget type
            fresh_data = await self._get_widget_fresh_data(widget)
            
            return {
                "widget_id": widget_id,
                "widget": widget,
                "data": fresh_data,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting widget data: {e}")
            raise
    
    async def _load_dashboard_config(self):
        """Carrega configuração do dashboard"""
        self.dashboard_config = {
            "refresh_interval": 30,  # seconds
            "max_alerts_display": 10,
            "max_patients_display": 20,
            "chart_data_points": 50,
            "auto_refresh": True,
            "theme": "light",
            "layout": {
                "grid_columns": 12,
                "grid_rows": 8
            }
        }
        
        self.refresh_intervals = {
            "alerts": 10,  # seconds
            "patients": 30,
            "system_status": 60,
            "metrics": 30
        }
    
    async def _register_default_widgets(self):
        """Registra widgets padrão"""
        default_widgets = [
            {
                "id": "total_patients",
                "type": "metric",
                "title": "Total de Pacientes",
                "data_source": "patient_monitor",
                "refresh_interval": 30
            },
            {
                "id": "active_alerts",
                "type": "metric",
                "title": "Alertas Ativos",
                "data_source": "alert_engine",
                "refresh_interval": 10
            },
            {
                "id": "system_status",
                "type": "status",
                "title": "Status do Sistema",
                "data_source": "system_monitor",
                "refresh_interval": 60
            },
            {
                "id": "recent_alerts_list",
                "type": "list",
                "title": "Alertas Recentes",
                "data_source": "alert_engine",
                "refresh_interval": 15
            }
        ]
        
        for widget_config in default_widgets:
            await self.create_widget(widget_config["id"], widget_config)
    
    async def _continuous_dashboard_refresh(self):
        """Atualização contínua do dashboard"""
        while self.is_active:
            try:
                await asyncio.sleep(self.dashboard_config["refresh_interval"])
                await self._refresh_dashboard_data()
            except Exception as e:
                logger.error(f"Error in continuous dashboard refresh: {e}")
    
    async def _refresh_dashboard_data(self):
        """Atualiza dados do dashboard"""
        try:
            # Refresh widget data based on their individual intervals
            current_time = datetime.now(timezone.utc)
            
            for widget_id, widget in self.widget_registry.items():
                last_updated = widget.get("last_updated")
                refresh_interval = widget.get("refresh_interval", 60)
                
                should_refresh = True
                if last_updated:
                    last_updated_time = datetime.fromisoformat(last_updated.replace("Z", "+00:00"))
                    should_refresh = (current_time - last_updated_time).total_seconds() >= refresh_interval
                
                if should_refresh:
                    try:
                        fresh_data = await self._get_widget_fresh_data(widget)
                        await self.update_widget_data(widget_id, fresh_data)
                    except Exception as e:
                        logger.error(f"Error refreshing widget {widget_id}: {e}")
            
        except Exception as e:
            logger.error(f"Error refreshing dashboard data: {e}")
    
    async def _get_widget_fresh_data(self, widget: Dict[str, Any]) -> Dict[str, Any]:
        """Obtém dados atualizados para um widget"""
        try:
            widget_type = widget.get("type")
            data_source = widget.get("data_source")
            
            if widget_type == "metric":
                return await self._get_metric_widget_data(data_source)
            elif widget_type == "status":
                return await self._get_status_widget_data(data_source)
            elif widget_type == "list":
                return await self._get_list_widget_data(data_source)
            elif widget_type == "chart":
                return await self._get_chart_widget_data(data_source)
            else:
                return {"value": "N/A", "status": "unknown"}
                
        except Exception as e:
            logger.error(f"Error getting fresh widget data: {e}")
            return {"error": str(e)}
    
    async def _get_metric_widget_data(self, data_source: str) -> Dict[str, Any]:
        """Obtém dados para widget de métrica"""
        # Placeholder implementation
        return {"value": 0, "unit": "", "trend": "stable"}
    
    async def _get_status_widget_data(self, data_source: str) -> Dict[str, Any]:
        """Obtém dados para widget de status"""
        # Placeholder implementation
        return {"status": "healthy", "details": {}}
    
    async def _get_list_widget_data(self, data_source: str) -> Dict[str, Any]:
        """Obtém dados para widget de lista"""
        # Placeholder implementation
        return {"items": [], "total": 0}
    
    async def _get_chart_widget_data(self, data_source: str) -> Dict[str, Any]:
        """Obtém dados para widget de gráfico"""
        # Placeholder implementation
        return {"data_points": [], "labels": []}
    
    async def _get_critical_patients_list(self) -> List[Dict[str, Any]]:
        """Obtém lista de pacientes críticos"""
        try:
            # Placeholder implementation
            return [
                {
                    "patient_id": "P001",
                    "name": "Paciente Exemplo",
                    "risk_level": "critical",
                    "active_alerts": 3,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            ]
        except Exception as e:
            logger.error(f"Error getting critical patients list: {e}")
            return []
    
    async def _get_metrics_summary(self) -> Dict[str, Any]:
        """Obtém resumo de métricas"""
        try:
            # Placeholder implementation
            return {
                "cpu_usage": 25.0,
                "memory_usage": 45.0,
                "disk_usage": 60.0,
                "network_activity": "normal"
            }
        except Exception as e:
            logger.error(f"Error getting metrics summary: {e}")
            return {}