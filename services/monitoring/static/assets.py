"""
Static Assets Manager
Gerenciamento de arquivos estáticos para o dashboard
"""

import os
from pathlib import Path
from typing import Dict, Any

class StaticAssetsManager:
    """Gerenciador de assets estáticos"""
    
    def __init__(self, base_path: str = "static"):
        self.base_path = Path(base_path)
        self.ensure_directories()
    
    def ensure_directories(self):
        """Cria diretórios necessários"""
        directories = [
            self.base_path / "css",
            self.base_path / "js",
            self.base_path / "images",
            self.base_path / "fonts"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def get_dashboard_css(self) -> str:
        """Retorna CSS customizado para o dashboard"""
        return """
/* Nexus Saúde Dashboard Styles */

:root {
    --primary-color: #2c5aa0;
    --secondary-color: #34c759;
    --danger-color: #ff3b30;
    --warning-color: #ff9500;
    --info-color: #007aff;
    --dark-color: #1c1c1e;
    --light-color: #f2f2f7;
    
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-success: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    --gradient-warning: linear-gradient(135deg, #fceabb 0%, #f8b500 100%);
    --gradient-danger: linear-gradient(135deg, #ff512f 0%, #f09819 100%);
    
    --shadow-sm: 0 2px 4px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
    --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
    
    --border-radius: 8px;
    --border-radius-lg: 12px;
    --transition: all 0.3s ease;
}

/* Base Styles */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8f9fa;
    color: #333;
    line-height: 1.6;
}

/* Dashboard Header */
.dashboard-header {
    background: var(--gradient-primary);
    color: white;
    padding: 2rem 0;
    margin-bottom: 2rem;
    border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
    box-shadow: var(--shadow-lg);
}

.dashboard-title {
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin: 0;
}

.dashboard-subtitle {
    opacity: 0.9;
    font-weight: 300;
    margin: 0.5rem 0 0 0;
}

/* Cards */
.dashboard-card {
    background: white;
    border: none;
    border-radius: var(--border-radius-lg);
    box-shadow: var(--shadow-md);
    transition: var(--transition);
    overflow: hidden;
    margin-bottom: 1.5rem;
}

.dashboard-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.dashboard-card .card-header {
    background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
    border-bottom: 1px solid #dee2e6;
    padding: 1rem 1.5rem;
    font-weight: 600;
}

.dashboard-card .card-body {
    padding: 1.5rem;
}

/* Metric Cards */
.metric-card {
    background: var(--gradient-primary);
    color: white;
    border-radius: var(--border-radius-lg);
    padding: 1.5rem;
    text-align: center;
    box-shadow: var(--shadow-md);
    transition: var(--transition);
    position: relative;
    overflow: hidden;
}

.metric-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-xl);
}

.metric-card.success {
    background: var(--gradient-success);
}

.metric-card.warning {
    background: var(--gradient-warning);
}

.metric-card.danger {
    background: var(--gradient-danger);
}

.metric-value {
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metric-label {
    font-size: 0.9rem;
    opacity: 0.9;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.metric-icon {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 2rem;
    opacity: 0.3;
}

/* Alert Styles */
.alert-item {
    background: white;
    border-radius: var(--border-radius);
    padding: 1rem;
    margin-bottom: 0.75rem;
    box-shadow: var(--shadow-sm);
    border-left: 4px solid;
    transition: var(--transition);
}

.alert-item:hover {
    box-shadow: var(--shadow-md);
}

.alert-item.critical {
    border-left-color: var(--danger-color);
    background: linear-gradient(90deg, #fff5f5 0%, white 100%);
}

.alert-item.high {
    border-left-color: var(--warning-color);
    background: linear-gradient(90deg, #fffbf0 0%, white 100%);
}

.alert-item.medium {
    border-left-color: var(--info-color);
    background: linear-gradient(90deg, #f0f9ff 0%, white 100%);
}

.alert-item.low {
    border-left-color: var(--secondary-color);
    background: linear-gradient(90deg, #f0fff4 0%, white 100%);
}

.alert-header {
    display: flex;
    justify-content: between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
}

.alert-title {
    font-weight: 600;
    color: #333;
    margin: 0;
}

.alert-time {
    font-size: 0.8rem;
    color: #666;
    white-space: nowrap;
}

.alert-message {
    color: #555;
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
}

/* Patient Cards */
.patient-card {
    background: white;
    border-radius: var(--border-radius);
    border: 1px solid #e9ecef;
    padding: 1rem;
    margin-bottom: 1rem;
    transition: var(--transition);
    position: relative;
}

.patient-card:hover {
    box-shadow: var(--shadow-md);
    border-color: #ced4da;
}

.patient-card.critical {
    border-left: 4px solid var(--danger-color);
    background: linear-gradient(90deg, #fff5f5 0%, white 100%);
}

.patient-card.warning {
    border-left: 4px solid var(--warning-color);
    background: linear-gradient(90deg, #fffbf0 0%, white 100%);
}

.patient-card.stable {
    border-left: 4px solid var(--secondary-color);
    background: linear-gradient(90deg, #f0fff4 0%, white 100%);
}

.patient-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
}

.patient-status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
}

.status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
}

.status-badge.critical {
    background: var(--danger-color);
    color: white;
}

.status-badge.warning {
    background: var(--warning-color);
    color: white;
}

.status-badge.stable {
    background: var(--secondary-color);
    color: white;
}

/* Vital Signs */
.vital-signs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
}

.vital-sign {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    border: 1px solid;
}

.vital-sign.normal {
    background: #d4edda;
    color: #155724;
    border-color: #c3e6cb;
}

.vital-sign.warning {
    background: #fff3cd;
    color: #856404;
    border-color: #ffeaa7;
}

.vital-sign.critical {
    background: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
}

/* System Status */
.system-metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f1f3f4;
}

.system-metric:last-child {
    border-bottom: none;
}

.metric-name {
    font-weight: 500;
    color: #333;
}

.metric-value-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.metric-progress {
    width: 100px;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
}

.metric-progress-bar {
    height: 100%;
    border-radius: 3px;
    transition: var(--transition);
}

.metric-progress-bar.healthy {
    background: var(--secondary-color);
}

.metric-progress-bar.warning {
    background: var(--warning-color);
}

.metric-progress-bar.critical {
    background: var(--danger-color);
}

/* Refresh Indicator */
.refresh-indicator {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1050;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: var(--border-radius);
    padding: 0.5rem 1rem;
    box-shadow: var(--shadow-md);
    border: 1px solid #e9ecef;
}

.refresh-indicator .badge {
    background: var(--primary-color) !important;
}

/* Loading States */
.loading-spinner {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: #666;
    font-size: 0.9rem;
}

.loading-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    color: #666;
    background: #f8f9fa;
    border-radius: var(--border-radius);
    border: 2px dashed #dee2e6;
}

/* Animations */
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.animate-pulse {
    animation: pulse 2s infinite;
}

.animate-spin {
    animation: spin 1s linear infinite;
}

/* Responsive Design */
@media (max-width: 768px) {
    .metric-value {
        font-size: 2rem;
    }
    
    .dashboard-card .card-body {
        padding: 1rem;
    }
    
    .patient-card {
        padding: 0.75rem;
    }
    
    .vital-signs {
        flex-direction: column;
        gap: 0.25rem;
    }
}

/* Dark Mode Support */
@media (prefers-color-scheme: dark) {
    body {
        background-color: #1c1c1e;
        color: #ffffff;
    }
    
    .dashboard-card {
        background: #2c2c2e;
        color: #ffffff;
    }
    
    .dashboard-card .card-header {
        background: linear-gradient(90deg, #3a3a3c 0%, #48484a 100%);
        border-bottom-color: #48484a;
    }
    
    .alert-item {
        background: #2c2c2e;
        color: #ffffff;
    }
    
    .patient-card {
        background: #2c2c2e;
        border-color: #48484a;
        color: #ffffff;
    }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

/* Focus States */
.dashboard-card:focus-within {
    box-shadow: var(--shadow-lg);
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
}

/* Print Styles */
@media print {
    .refresh-indicator,
    .loading-spinner {
        display: none !important;
    }
    
    .dashboard-card {
        box-shadow: none !important;
        border: 1px solid #dee2e6 !important;
        page-break-inside: avoid;
    }
}
"""
    
    def get_dashboard_js(self) -> str:
        """Retorna JavaScript customizado para o dashboard"""
        return """
/* Nexus Saúde Dashboard JavaScript */

class NexusDashboard {
    constructor() {
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.charts = {};
        this.isVisible = true;
        
        this.init();
    }
    
    init() {
        this.setupVisibilityListener();
        this.connectWebSocket();
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }
    
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden;
            if (this.isVisible && this.ws?.readyState !== WebSocket.OPEN) {
                this.connectWebSocket();
            }
        });
    }
    
    connectWebSocket() {
        if (!this.isVisible) return;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/dashboard_${Date.now()}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('Dashboard WebSocket connected');
            this.reconnectAttempts = 0;
            this.subscribeToChannels();
            this.updateConnectionStatus(true);
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('Dashboard WebSocket disconnected');
            this.updateConnectionStatus(false);
            this.scheduleReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('Dashboard WebSocket error:', error);
            this.updateConnectionStatus(false);
        };
    }
    
    subscribeToChannels() {
        const channels = ['vital_signs', 'alerts', 'metrics', 'patients'];
        channels.forEach(channel => {
            this.sendWebSocketMessage({
                type: 'subscribe',
                channel: channel
            });
        });
    }
    
    sendWebSocketMessage(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = Math.pow(2, this.reconnectAttempts) * 1000;
            this.reconnectAttempts++;
            
            setTimeout(() => {
                if (this.isVisible) {
                    this.connectWebSocket();
                }
            }, delay);
        }
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'vital_signs_update':
                this.handleVitalSignsUpdate(data.data);
                break;
            case 'alert_new':
                this.handleNewAlert(data.data);
                break;
            case 'metrics_update':
                this.handleMetricsUpdate(data.data);
                break;
            case 'patient_status_change':
                this.handlePatientStatusChange(data.data);
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }
    
    handleVitalSignsUpdate(data) {
        // Update patient vital signs in real-time
        this.updatePatientVitalSigns(data);
        this.refreshDashboard();
    }
    
    handleNewAlert(alert) {
        // Add new alert to the top of the list
        this.addNewAlert(alert);
        this.updateAlertCounts();
        this.showNotification(alert);
    }
    
    handleMetricsUpdate(metrics) {
        // Update system metrics and charts
        this.updateSystemMetrics(metrics);
        this.updateCharts(metrics);
    }
    
    handlePatientStatusChange(data) {
        // Update patient status display
        this.updatePatientStatus(data);
        this.refreshDashboard();
    }
    
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        if (indicator) {
            indicator.className = connected ? 'badge bg-success' : 'badge bg-danger';
            indicator.textContent = connected ? 'Conectado' : 'Desconectado';
        }
    }
    
    addNewAlert(alert) {
        const alertsContainer = document.getElementById('recentAlerts');
        if (!alertsContainer) return;
        
        const alertElement = this.createAlertElement(alert);
        alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);
        
        // Keep only the 10 most recent alerts
        const alerts = alertsContainer.children;
        while (alerts.length > 10) {
            alertsContainer.removeChild(alerts[alerts.length - 1]);
        }
        
        // Animate the new alert
        alertElement.style.opacity = '0';
        alertElement.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            alertElement.style.transition = 'all 0.3s ease';
            alertElement.style.opacity = '1';
            alertElement.style.transform = 'translateY(0)';
        }, 100);
    }
    
    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.severity}`;
        
        const severityIcon = this.getSeverityIcon(alert.severity);
        const timeAgo = this.getTimeAgo(alert.timestamp);
        
        div.innerHTML = `
            <div class="alert-header">
                <div class="alert-title">
                    <i class="${severityIcon}"></i>
                    Paciente ${alert.patient_id}
                </div>
                <div class="alert-time">${timeAgo}</div>
            </div>
            <div class="alert-message">${alert.message}</div>
        `;
        
        return div;
    }
    
    getSeverityIcon(severity) {
        const icons = {
            critical: 'fas fa-exclamation-circle text-danger',
            high: 'fas fa-exclamation-triangle text-warning',
            medium: 'fas fa-info-circle text-info',
            low: 'fas fa-check-circle text-success'
        };
        return icons[severity] || icons.medium;
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const alertTime = new Date(timestamp);
        const diffMs = now - alertTime;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h atrás`;
        
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d atrás`;
    }
    
    showNotification(alert) {
        // Check if browser supports notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`Alerta: Paciente ${alert.patient_id}`, {
                body: alert.message,
                icon: '/static/images/alert-icon.png',
                tag: `alert-${alert.id}`,
                requireInteraction: alert.severity === 'critical'
            });
            
            notification.onclick = () => {
                window.focus();
                this.highlightAlert(alert);
            };
            
            // Auto-close after 10 seconds (except critical alerts)
            if (alert.severity !== 'critical') {
                setTimeout(() => notification.close(), 10000);
            }
        }
    }
    
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    async refreshDashboard() {
        try {
            const response = await fetch('/dashboard/data');
            const data = await response.json();
            
            this.updateMetricCards(data);
            this.updateRecentAlerts(data.recent_alerts || []);
            this.updateSystemStatus(data.system_status || {});
            this.updateCriticalPatients(data.critical_patients_list || []);
            this.updateLastRefreshTime();
            
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showErrorMessage('Erro ao atualizar dados do dashboard');
        }
    }
    
    updateMetricCards(data) {
        const metrics = [
            { id: 'totalPatients', value: data.total_patients },
            { id: 'activeAlerts', value: data.active_alerts },
            { id: 'criticalPatients', value: data.critical_patients },
            { id: 'systemHealth', value: data.system_health }
        ];
        
        metrics.forEach(metric => {
            const element = document.getElementById(metric.id);
            if (element) {
                this.animateValue(element, element.textContent, metric.value);
            }
        });
    }
    
    animateValue(element, start, end) {
        const startNum = parseInt(start) || 0;
        const endNum = parseInt(end) || 0;
        const duration = 1000; // 1 second
        const stepTime = 50;
        const steps = duration / stepTime;
        const increment = (endNum - startNum) / steps;
        
        let current = startNum;
        const timer = setInterval(() => {
            current += increment;
            element.textContent = Math.round(current);
            
            if ((increment > 0 && current >= endNum) || (increment < 0 && current <= endNum)) {
                element.textContent = endNum;
                clearInterval(timer);
            }
        }, stepTime);
    }
    
    updateLastRefreshTime() {
        const element = document.getElementById('lastRefresh');
        if (element) {
            const now = new Date();
            element.textContent = `Última atualização: ${now.toLocaleTimeString('pt-BR')}`;
        }
    }
    
    setupEventListeners() {
        // Request notification permission on first interaction
        document.addEventListener('click', () => {
            this.requestNotificationPermission();
        }, { once: true });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'r':
                        event.preventDefault();
                        this.refreshDashboard();
                        break;
                    case 'f':
                        event.preventDefault();
                        this.toggleFullscreen();
                        break;
                }
            }
        });
        
        // Auto-refresh when tab becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshDashboard();
            }
        });
    }
    
    startPeriodicUpdates() {
        // Refresh dashboard every 30 seconds
        setInterval(() => {
            if (this.isVisible) {
                this.refreshDashboard();
            }
        }, 30000);
        
        // Update time displays every second
        setInterval(() => {
            this.updateTimeDisplays();
        }, 1000);
    }
    
    updateTimeDisplays() {
        // Update all time-ago displays
        const timeElements = document.querySelectorAll('[data-timestamp]');
        timeElements.forEach(element => {
            const timestamp = element.getAttribute('data-timestamp');
            element.textContent = this.getTimeAgo(timestamp);
        });
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }
    
    showErrorMessage(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'toast position-fixed top-0 end-0 m-3';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-header bg-danger text-white">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong class="me-auto">Erro</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        document.body.appendChild(toast);
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Remove element after hiding
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nexusDashboard = new NexusDashboard();
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NexusDashboard;
}
"""
    
    def create_static_files(self):
        """Cria arquivos estáticos necessários"""
        # Create CSS file
        css_path = self.base_path / "css" / "dashboard.css"
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(self.get_dashboard_css())
        
        # Create JS file
        js_path = self.base_path / "js" / "dashboard.js"
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(self.get_dashboard_js())
        
        # Create favicon
        self.create_favicon()
        
        return {
            "css_file": str(css_path),
            "js_file": str(js_path),
            "status": "created"
        }
    
    def create_favicon(self):
        """Cria um favicon simples"""
        favicon_content = """<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="#2c5aa0"/>
    <path d="M12 8 L20 16 L12 24 Z" fill="white"/>
</svg>"""
        
        favicon_path = self.base_path / "favicon.svg"
        with open(favicon_path, 'w', encoding='utf-8') as f:
            f.write(favicon_content)
    
    def get_file_path(self, file_type: str, filename: str) -> str:
        """Retorna caminho para arquivo estático"""
        return str(self.base_path / file_type / filename)