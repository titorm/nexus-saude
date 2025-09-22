"""
Executive Dashboard
Dashboard executivo para visualização de KPIs e métricas
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class DashboardWidget:
    """Widget do dashboard"""
    id: str
    title: str
    type: str  # chart, metric, table, gauge
    data: Dict[str, Any]
    config: Dict[str, Any]
    position: Dict[str, int]  # x, y, width, height

@dataclass
class Dashboard:
    """Dashboard configuration"""
    id: str
    name: str
    description: str
    widgets: List[DashboardWidget]
    layout: Dict[str, Any]
    filters: Dict[str, Any]
    refresh_interval: int = 300  # seconds

class ExecutiveDashboard:
    """Sistema de dashboard executivo para análises de saúde"""
    
    def __init__(self, business_intelligence):
        self.business_intelligence = business_intelligence
        self.is_active = False
        self.dashboards = {}
        self.widget_templates = {}
        
    async def initialize(self):
        """Inicializa o sistema de dashboard"""
        try:
            logger.info("Initializing Executive Dashboard...")
            
            # Setup widget templates
            await self._setup_widget_templates()
            
            # Create default dashboards
            await self._create_default_dashboards()
            
            self.is_active = True
            logger.info("Executive Dashboard initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Executive Dashboard: {e}")
            raise
    
    async def get_dashboard(self, dashboard_id: str, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Obtém dashboard com dados atualizados"""
        try:
            logger.info(f"Getting dashboard: {dashboard_id}")
            
            if dashboard_id not in self.dashboards:
                raise ValueError(f"Dashboard {dashboard_id} not found")
            
            dashboard = self.dashboards[dashboard_id]
            
            # Apply filters
            effective_filters = dashboard.filters.copy()
            if filters:
                effective_filters.update(filters)
            
            # Get date range from filters
            date_range = self._get_date_range_from_filters(effective_filters)
            
            # Update widget data
            updated_widgets = []
            for widget in dashboard.widgets:
                updated_widget = await self._update_widget_data(widget, date_range, effective_filters)
                updated_widgets.append(updated_widget)
            
            return {
                "dashboard": {
                    "id": dashboard.id,
                    "name": dashboard.name,
                    "description": dashboard.description,
                    "layout": dashboard.layout,
                    "refresh_interval": dashboard.refresh_interval
                },
                "widgets": [
                    {
                        "id": w.id,
                        "title": w.title,
                        "type": w.type,
                        "data": w.data,
                        "config": w.config,
                        "position": w.position
                    } for w in updated_widgets
                ],
                "filters": effective_filters,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard: {e}")
            raise
    
    async def create_custom_dashboard(
        self, 
        name: str, 
        description: str,
        widget_configs: List[Dict[str, Any]]
    ) -> str:
        """Cria dashboard customizado"""
        try:
            logger.info(f"Creating custom dashboard: {name}")
            
            dashboard_id = str(uuid.uuid4())
            
            # Create widgets from configurations
            widgets = []
            for i, config in enumerate(widget_configs):
                widget = await self._create_widget_from_config(config, i)
                widgets.append(widget)
            
            # Create dashboard
            dashboard = Dashboard(
                id=dashboard_id,
                name=name,
                description=description,
                widgets=widgets,
                layout={"columns": 12, "rows": "auto"},
                filters={"date_range": "last_30_days"}
            )
            
            self.dashboards[dashboard_id] = dashboard
            
            logger.info(f"Custom dashboard created: {dashboard_id}")
            return dashboard_id
            
        except Exception as e:
            logger.error(f"Error creating custom dashboard: {e}")
            raise
    
    async def get_available_widgets(self) -> List[Dict[str, Any]]:
        """Obtém lista de widgets disponíveis"""
        try:
            widgets = []
            
            for template_id, template in self.widget_templates.items():
                widgets.append({
                    "id": template_id,
                    "name": template["name"],
                    "description": template["description"],
                    "type": template["type"],
                    "category": template["category"],
                    "config_schema": template.get("config_schema", {})
                })
            
            return widgets
            
        except Exception as e:
            logger.error(f"Error getting available widgets: {e}")
            raise
    
    async def export_dashboard(self, dashboard_id: str, format_type: str = "json") -> Dict[str, Any]:
        """Exporta dashboard em formato específico"""
        try:
            logger.info(f"Exporting dashboard {dashboard_id} in format {format_type}")
            
            dashboard_data = await self.get_dashboard(dashboard_id)
            
            if format_type == "json":
                return dashboard_data
            elif format_type == "pdf":
                # Would generate PDF report
                return {"pdf_url": f"/reports/dashboard_{dashboard_id}.pdf"}
            elif format_type == "excel":
                # Would generate Excel file
                return {"excel_url": f"/reports/dashboard_{dashboard_id}.xlsx"}
            else:
                raise ValueError(f"Unsupported export format: {format_type}")
                
        except Exception as e:
            logger.error(f"Error exporting dashboard: {e}")
            raise
    
    async def _setup_widget_templates(self):
        """Configura templates de widgets"""
        
        self.widget_templates = {
            # KPI Widgets
            "kpi_patient_satisfaction": {
                "name": "Patient Satisfaction",
                "description": "Patient satisfaction score with trend",
                "type": "metric",
                "category": "patient_care",
                "data_source": "kpi",
                "kpi_name": "patient_satisfaction",
                "config_schema": {
                    "show_trend": True,
                    "show_target": True,
                    "color_scheme": "health"
                }
            },
            "kpi_readmission_rate": {
                "name": "Readmission Rate",
                "description": "30-day readmission rate",
                "type": "gauge",
                "category": "patient_care",
                "data_source": "kpi",
                "kpi_name": "readmission_rate",
                "config_schema": {
                    "min_value": 0,
                    "max_value": 20,
                    "target_value": 10,
                    "color_ranges": [
                        {"min": 0, "max": 5, "color": "green"},
                        {"min": 5, "max": 10, "color": "yellow"},
                        {"min": 10, "max": 20, "color": "red"}
                    ]
                }
            },
            "kpi_bed_occupancy": {
                "name": "Bed Occupancy",
                "description": "Current bed occupancy rate",
                "type": "gauge",
                "category": "operational",
                "data_source": "kpi",
                "kpi_name": "bed_occupancy",
                "config_schema": {
                    "min_value": 0,
                    "max_value": 100,
                    "target_value": 85,
                    "unit": "%"
                }
            },
            
            # Chart Widgets
            "revenue_trend": {
                "name": "Revenue Trend",
                "description": "Monthly revenue trend",
                "type": "line_chart",
                "category": "financial",
                "data_source": "trend",
                "metric_name": "revenue_per_patient",
                "config_schema": {
                    "periods": 12,
                    "period_type": "month",
                    "show_target_line": True
                }
            },
            "department_comparison": {
                "name": "Department Performance",
                "description": "Compare performance across departments",
                "type": "bar_chart",
                "category": "operational",
                "data_source": "comparison",
                "config_schema": {
                    "group_by": "department",
                    "metrics": ["patient_satisfaction", "average_length_stay"],
                    "orientation": "vertical"
                }
            },
            "quality_scorecard": {
                "name": "Quality Scorecard",
                "description": "Quality metrics overview",
                "type": "scorecard",
                "category": "quality",
                "data_source": "scorecard",
                "config_schema": {
                    "categories": ["quality"],
                    "show_trends": True,
                    "layout": "grid"
                }
            },
            
            # Table Widgets
            "top_insights": {
                "name": "Top Insights",
                "description": "Key insights and alerts",
                "type": "table",
                "category": "insights",
                "data_source": "insights",
                "config_schema": {
                    "limit": 10,
                    "show_severity": True,
                    "sortable": True
                }
            },
            "financial_summary": {
                "name": "Financial Summary",
                "description": "Financial metrics summary",
                "type": "table",
                "category": "financial",
                "data_source": "kpi_group",
                "config_schema": {
                    "categories": ["financial"],
                    "show_targets": True,
                    "show_trends": True
                }
            }
        }
    
    async def _create_default_dashboards(self):
        """Cria dashboards padrão"""
        
        # Executive Overview Dashboard
        executive_widgets = [
            DashboardWidget(
                id="exec_patient_sat",
                title="Patient Satisfaction",
                type="metric",
                data={},
                config=self.widget_templates["kpi_patient_satisfaction"]["config_schema"],
                position={"x": 0, "y": 0, "width": 3, "height": 2}
            ),
            DashboardWidget(
                id="exec_readmission",
                title="Readmission Rate",
                type="gauge",
                data={},
                config=self.widget_templates["kpi_readmission_rate"]["config_schema"],
                position={"x": 3, "y": 0, "width": 3, "height": 2}
            ),
            DashboardWidget(
                id="exec_bed_occupancy",
                title="Bed Occupancy",
                type="gauge",
                data={},
                config=self.widget_templates["kpi_bed_occupancy"]["config_schema"],
                position={"x": 6, "y": 0, "width": 3, "height": 2}
            ),
            DashboardWidget(
                id="exec_revenue_trend",
                title="Revenue Trend",
                type="line_chart",
                data={},
                config=self.widget_templates["revenue_trend"]["config_schema"],
                position={"x": 0, "y": 2, "width": 6, "height": 3}
            ),
            DashboardWidget(
                id="exec_insights",
                title="Key Insights",
                type="table",
                data={},
                config=self.widget_templates["top_insights"]["config_schema"],
                position={"x": 6, "y": 2, "width": 6, "height": 3}
            )
        ]
        
        self.dashboards["executive_overview"] = Dashboard(
            id="executive_overview",
            name="Executive Overview",
            description="High-level executive dashboard with key performance indicators",
            widgets=executive_widgets,
            layout={"columns": 12, "rows": 5},
            filters={"date_range": "last_30_days"}
        )
        
        # Operational Dashboard
        operational_widgets = [
            DashboardWidget(
                id="op_bed_occupancy",
                title="Bed Occupancy",
                type="gauge",
                data={},
                config=self.widget_templates["kpi_bed_occupancy"]["config_schema"],
                position={"x": 0, "y": 0, "width": 4, "height": 2}
            ),
            DashboardWidget(
                id="op_dept_comparison",
                title="Department Performance",
                type="bar_chart",
                data={},
                config=self.widget_templates["department_comparison"]["config_schema"],
                position={"x": 4, "y": 0, "width": 8, "height": 3}
            ),
            DashboardWidget(
                id="op_quality_scorecard",
                title="Quality Metrics",
                type="scorecard",
                data={},
                config=self.widget_templates["quality_scorecard"]["config_schema"],
                position={"x": 0, "y": 3, "width": 12, "height": 3}
            )
        ]
        
        self.dashboards["operational"] = Dashboard(
            id="operational",
            name="Operational Dashboard",
            description="Operational metrics and department performance",
            widgets=operational_widgets,
            layout={"columns": 12, "rows": 6},
            filters={"date_range": "last_7_days"}
        )
        
        # Financial Dashboard
        financial_widgets = [
            DashboardWidget(
                id="fin_revenue_trend",
                title="Revenue Trend",
                type="line_chart",
                data={},
                config=self.widget_templates["revenue_trend"]["config_schema"],
                position={"x": 0, "y": 0, "width": 8, "height": 3}
            ),
            DashboardWidget(
                id="fin_summary",
                title="Financial Summary",
                type="table",
                data={},
                config=self.widget_templates["financial_summary"]["config_schema"],
                position={"x": 8, "y": 0, "width": 4, "height": 3}
            )
        ]
        
        self.dashboards["financial"] = Dashboard(
            id="financial",
            name="Financial Dashboard",
            description="Financial performance and revenue analytics",
            widgets=financial_widgets,
            layout={"columns": 12, "rows": 3},
            filters={"date_range": "last_90_days"}
        )
    
    async def _update_widget_data(
        self, 
        widget: DashboardWidget, 
        date_range: Tuple[datetime, datetime],
        filters: Dict[str, Any]
    ) -> DashboardWidget:
        """Atualiza dados de um widget"""
        try:
            # Determine data source and fetch data
            template = self._find_widget_template(widget)
            
            if not template:
                # Return widget with empty data if template not found
                widget.data = {"error": "Widget template not found"}
                return widget
            
            data_source = template.get("data_source")
            
            if data_source == "kpi":
                # Single KPI data
                kpi_name = template.get("kpi_name")
                if kpi_name:
                    kpis = await self.business_intelligence.calculate_kpis(date_range, filters)
                    if kpi_name in kpis:
                        metric = kpis[kpi_name]
                        widget.data = {
                            "value": metric.value,
                            "previous_value": metric.previous_value,
                            "change_percent": metric.change_percent,
                            "trend": metric.trend,
                            "unit": metric.unit,
                            "target": self.business_intelligence.kpis[kpi_name].target_value
                        }
                    else:
                        widget.data = {"error": f"KPI {kpi_name} not found"}
                        
            elif data_source == "trend":
                # Trend data
                metric_name = template.get("metric_name")
                if metric_name:
                    periods = widget.config.get("periods", 12)
                    period_type = widget.config.get("period_type", "month")
                    trend_data = await self.business_intelligence.analyze_trends(
                        metric_name, periods, period_type
                    )
                    widget.data = trend_data
                    
            elif data_source == "scorecard":
                # Scorecard data
                categories = widget.config.get("categories")
                scorecard = await self.business_intelligence.generate_scorecard(date_range, categories)
                widget.data = scorecard
                
            elif data_source == "insights":
                # Insights data
                limit = widget.config.get("limit", 10)
                insights = await self.business_intelligence.get_top_insights(date_range, limit)
                widget.data = {"insights": insights}
                
            elif data_source == "kpi_group":
                # Group of KPIs
                categories = widget.config.get("categories")
                kpis = await self.business_intelligence.calculate_kpis(date_range, filters)
                
                if categories:
                    filtered_kpis = {}
                    for kpi_name, metric in kpis.items():
                        if self.business_intelligence.kpis[kpi_name].category in categories:
                            filtered_kpis[kpi_name] = metric
                    widget.data = {"kpis": filtered_kpis}
                else:
                    widget.data = {"kpis": kpis}
                    
            else:
                widget.data = {"error": f"Unknown data source: {data_source}"}
            
            # Add metadata
            widget.data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            return widget
            
        except Exception as e:
            logger.error(f"Error updating widget data: {e}")
            widget.data = {"error": str(e)}
            return widget
    
    def _find_widget_template(self, widget: DashboardWidget) -> Optional[Dict[str, Any]]:
        """Encontra template para um widget"""
        # Try to match by widget properties
        for template_id, template in self.widget_templates.items():
            if (template["type"] == widget.type and 
                template["name"].lower().replace(" ", "_") in widget.id.lower()):
                return template
        return None
    
    def _get_date_range_from_filters(self, filters: Dict[str, Any]) -> Tuple[datetime, datetime]:
        """Obtém range de datas dos filtros"""
        try:
            date_range_filter = filters.get("date_range", "last_30_days")
            end_date = datetime.now(timezone.utc)
            
            if date_range_filter == "last_7_days":
                start_date = end_date - timedelta(days=7)
            elif date_range_filter == "last_30_days":
                start_date = end_date - timedelta(days=30)
            elif date_range_filter == "last_90_days":
                start_date = end_date - timedelta(days=90)
            elif date_range_filter == "last_year":
                start_date = end_date - timedelta(days=365)
            elif isinstance(date_range_filter, dict):
                start_date = datetime.fromisoformat(date_range_filter["start"])
                end_date = datetime.fromisoformat(date_range_filter["end"])
            else:
                start_date = end_date - timedelta(days=30)  # Default
            
            return (start_date, end_date)
            
        except Exception as e:
            logger.error(f"Error parsing date range: {e}")
            # Return default range
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=30)
            return (start_date, end_date)
    
    async def _create_widget_from_config(self, config: Dict[str, Any], index: int) -> DashboardWidget:
        """Cria widget a partir de configuração"""
        
        widget_id = config.get("id", f"widget_{index}")
        template_id = config.get("template_id")
        
        if template_id and template_id in self.widget_templates:
            template = self.widget_templates[template_id]
            widget_config = template["config_schema"].copy()
            widget_config.update(config.get("config", {}))
            
            return DashboardWidget(
                id=widget_id,
                title=config.get("title", template["name"]),
                type=template["type"],
                data={},
                config=widget_config,
                position=config.get("position", {"x": 0, "y": index * 2, "width": 6, "height": 2})
            )
        else:
            # Create basic widget
            return DashboardWidget(
                id=widget_id,
                title=config.get("title", "Custom Widget"),
                type=config.get("type", "metric"),
                data={},
                config=config.get("config", {}),
                position=config.get("position", {"x": 0, "y": index * 2, "width": 6, "height": 2})
            )