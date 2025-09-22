"""
Report Generator
Sistema de geração de relatórios para o data warehouse
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
import logging
from dataclasses import dataclass
import pandas as pd
import io
import base64

logger = logging.getLogger(__name__)

@dataclass
class ReportTemplate:
    """Template de relatório"""
    template_id: str
    name: str
    description: str
    category: str
    sections: List[Dict[str, Any]]
    parameters: Dict[str, Any]
    output_formats: List[str]

@dataclass
class Report:
    """Relatório gerado"""
    report_id: str
    title: str
    description: str
    template_id: str
    parameters: Dict[str, Any]
    sections: List[Dict[str, Any]]
    generated_at: datetime
    generated_by: str
    format_type: str

class ReportGenerator:
    """Sistema de geração de relatórios executivos e operacionais"""
    
    def __init__(self, business_intelligence, executive_dashboard, advanced_analytics):
        self.business_intelligence = business_intelligence
        self.executive_dashboard = executive_dashboard
        self.advanced_analytics = advanced_analytics
        self.is_active = False
        self.templates = {}
        self.generated_reports = {}
        
    async def initialize(self):
        """Inicializa o gerador de relatórios"""
        try:
            logger.info("Initializing Report Generator...")
            
            # Setup report templates
            await self._setup_report_templates()
            
            # Configure output formats
            await self._setup_output_formats()
            
            self.is_active = True
            logger.info("Report Generator initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Report Generator: {e}")
            raise
    
    async def generate_report(
        self,
        template_id: str,
        parameters: Dict[str, Any],
        output_format: str = "json",
        generated_by: str = "system"
    ) -> str:
        """Gera relatório baseado em template"""
        try:
            logger.info(f"Generating report with template: {template_id}")
            
            if template_id not in self.templates:
                raise ValueError(f"Template {template_id} not found")
            
            template = self.templates[template_id]
            
            # Validate parameters
            await self._validate_parameters(template, parameters)
            
            # Generate report sections
            report_sections = []
            for section_config in template.sections:
                section = await self._generate_section(section_config, parameters)
                report_sections.append(section)
            
            # Create report
            report_id = str(uuid.uuid4())
            report = Report(
                report_id=report_id,
                title=parameters.get("title", template.name),
                description=template.description,
                template_id=template_id,
                parameters=parameters,
                sections=report_sections,
                generated_at=datetime.now(timezone.utc),
                generated_by=generated_by,
                format_type=output_format
            )
            
            # Store report
            self.generated_reports[report_id] = report
            
            # Format output
            output = await self._format_report_output(report, output_format)
            
            logger.info(f"Report generated successfully: {report_id}")
            return report_id
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            raise
    
    async def get_report(self, report_id: str, output_format: Optional[str] = None) -> Dict[str, Any]:
        """Obtém relatório gerado"""
        try:
            if report_id not in self.generated_reports:
                raise ValueError(f"Report {report_id} not found")
            
            report = self.generated_reports[report_id]
            
            # Use requested format or original format
            format_type = output_format or report.format_type
            
            return await self._format_report_output(report, format_type)
            
        except Exception as e:
            logger.error(f"Error getting report: {e}")
            raise
    
    async def list_templates(self) -> List[Dict[str, Any]]:
        """Lista templates disponíveis"""
        try:
            templates = []
            for template_id, template in self.templates.items():
                templates.append({
                    "template_id": template_id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category,
                    "parameters": template.parameters,
                    "output_formats": template.output_formats
                })
            
            return templates
            
        except Exception as e:
            logger.error(f"Error listing templates: {e}")
            raise
    
    async def schedule_report(
        self,
        template_id: str,
        parameters: Dict[str, Any],
        schedule: Dict[str, Any],
        recipients: List[str]
    ) -> str:
        """Agenda geração automática de relatório"""
        try:
            logger.info(f"Scheduling report: {template_id}")
            
            schedule_id = str(uuid.uuid4())
            
            # In production, this would integrate with a scheduler like Celery
            scheduled_report = {
                "schedule_id": schedule_id,
                "template_id": template_id,
                "parameters": parameters,
                "schedule": schedule,
                "recipients": recipients,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "active"
            }
            
            # Store schedule (in production, would save to database)
            logger.info(f"Report scheduled: {schedule_id}")
            return schedule_id
            
        except Exception as e:
            logger.error(f"Error scheduling report: {e}")
            raise
    
    async def create_custom_template(
        self,
        name: str,
        description: str,
        category: str,
        sections: List[Dict[str, Any]],
        parameters: Dict[str, Any]
    ) -> str:
        """Cria template customizado"""
        try:
            logger.info(f"Creating custom template: {name}")
            
            template_id = str(uuid.uuid4())
            
            template = ReportTemplate(
                template_id=template_id,
                name=name,
                description=description,
                category=category,
                sections=sections,
                parameters=parameters,
                output_formats=["json", "html", "pdf"]
            )
            
            self.templates[template_id] = template
            
            logger.info(f"Custom template created: {template_id}")
            return template_id
            
        except Exception as e:
            logger.error(f"Error creating custom template: {e}")
            raise
    
    async def _setup_report_templates(self):
        """Configura templates de relatório padrão"""
        
        # Executive Summary Report
        self.templates["executive_summary"] = ReportTemplate(
            template_id="executive_summary",
            name="Executive Summary Report",
            description="High-level executive summary with key metrics and insights",
            category="executive",
            sections=[
                {
                    "type": "kpi_summary",
                    "title": "Key Performance Indicators",
                    "config": {"categories": ["patient_care", "operational", "financial"]}
                },
                {
                    "type": "scorecard",
                    "title": "Performance Scorecard",
                    "config": {"show_trends": True, "show_targets": True}
                },
                {
                    "type": "insights",
                    "title": "Key Insights",
                    "config": {"limit": 5, "severity": ["high", "medium"]}
                },
                {
                    "type": "trends",
                    "title": "Trend Analysis",
                    "config": {"metrics": ["patient_satisfaction", "revenue_per_patient"], "periods": 6}
                }
            ],
            parameters={
                "date_range": {"type": "date_range", "required": True, "default": "last_30_days"},
                "departments": {"type": "list", "required": False, "default": []},
                "include_forecasts": {"type": "boolean", "required": False, "default": False}
            },
            output_formats=["json", "html", "pdf"]
        )
        
        # Operational Report
        self.templates["operational_report"] = ReportTemplate(
            template_id="operational_report",
            name="Operational Performance Report",
            description="Detailed operational metrics and department performance",
            category="operational",
            sections=[
                {
                    "type": "department_comparison",
                    "title": "Department Performance Comparison",
                    "config": {"metrics": ["bed_occupancy", "appointment_no_show", "emergency_wait_time"]}
                },
                {
                    "type": "capacity_analysis",
                    "title": "Capacity Analysis",
                    "config": {"show_utilization": True, "show_forecasts": True}
                },
                {
                    "type": "quality_metrics",
                    "title": "Quality Indicators",
                    "config": {"categories": ["quality"], "show_targets": True}
                },
                {
                    "type": "operational_insights",
                    "title": "Operational Insights",
                    "config": {"focus": "operational", "limit": 10}
                }
            ],
            parameters={
                "date_range": {"type": "date_range", "required": True, "default": "last_7_days"},
                "departments": {"type": "list", "required": False, "default": []},
                "detail_level": {"type": "string", "required": False, "default": "summary"}
            },
            output_formats=["json", "html", "excel"]
        )
        
        # Financial Report
        self.templates["financial_report"] = ReportTemplate(
            template_id="financial_report",
            name="Financial Performance Report",
            description="Comprehensive financial analysis and revenue metrics",
            category="financial",
            sections=[
                {
                    "type": "revenue_analysis",
                    "title": "Revenue Analysis",
                    "config": {"show_trends": True, "breakdown_by": ["department", "service"]}
                },
                {
                    "type": "cost_analysis",
                    "title": "Cost Analysis",
                    "config": {"show_variance": True, "compare_budget": True}
                },
                {
                    "type": "financial_kpis",
                    "title": "Financial KPIs",
                    "config": {"categories": ["financial"], "show_targets": True}
                },
                {
                    "type": "profitability_analysis",
                    "title": "Profitability Analysis",
                    "config": {"by_service": True, "by_department": True}
                }
            ],
            parameters={
                "date_range": {"type": "date_range", "required": True, "default": "last_90_days"},
                "currency": {"type": "string", "required": False, "default": "USD"},
                "include_budget_comparison": {"type": "boolean", "required": False, "default": True}
            },
            output_formats=["json", "excel", "pdf"]
        )
        
        # Quality Report
        self.templates["quality_report"] = ReportTemplate(
            template_id="quality_report",
            name="Quality & Safety Report",
            description="Quality metrics, safety indicators, and compliance analysis",
            category="quality",
            sections=[
                {
                    "type": "quality_scorecard",
                    "title": "Quality Scorecard",
                    "config": {"categories": ["quality"], "show_benchmarks": True}
                },
                {
                    "type": "safety_metrics",
                    "title": "Safety Indicators",
                    "config": {"include_incidents": True, "trend_analysis": True}
                },
                {
                    "type": "patient_outcomes",
                    "title": "Patient Outcomes",
                    "config": {"mortality_rates": True, "readmission_analysis": True}
                },
                {
                    "type": "compliance_status",
                    "title": "Compliance Status",
                    "config": {"regulations": ["CMS", "Joint Commission"], "audit_findings": True}
                }
            ],
            parameters={
                "date_range": {"type": "date_range", "required": True, "default": "last_30_days"},
                "include_benchmarks": {"type": "boolean", "required": False, "default": True},
                "compliance_period": {"type": "string", "required": False, "default": "quarterly"}
            },
            output_formats=["json", "html", "pdf"]
        )
        
        # Analytics Report
        self.templates["analytics_report"] = ReportTemplate(
            template_id="analytics_report",
            name="Advanced Analytics Report",
            description="Statistical analysis, correlations, and predictive insights",
            category="analytics",
            sections=[
                {
                    "type": "correlation_analysis",
                    "title": "Correlation Analysis",
                    "config": {"variables": ["patient_satisfaction", "readmission_rate", "length_stay"]}
                },
                {
                    "type": "regression_analysis",
                    "title": "Predictive Analysis",
                    "config": {"target": "patient_satisfaction", "predictors": ["length_stay", "cost_per_encounter"]}
                },
                {
                    "type": "forecasting",
                    "title": "Forecasting",
                    "config": {"variables": ["revenue_per_patient"], "periods": 12}
                },
                {
                    "type": "clustering_analysis",
                    "title": "Patient Segmentation",
                    "config": {"variables": ["age", "visit_frequency", "total_cost"]}
                }
            ],
            parameters={
                "date_range": {"type": "date_range", "required": True, "default": "last_365_days"},
                "analysis_depth": {"type": "string", "required": False, "default": "standard"},
                "include_predictions": {"type": "boolean", "required": False, "default": True}
            },
            output_formats=["json", "html", "pdf"]
        )
    
    async def _setup_output_formats(self):
        """Configura formatos de saída"""
        self.output_formats = {
            "json": {
                "mime_type": "application/json",
                "extension": "json",
                "supports_charts": False
            },
            "html": {
                "mime_type": "text/html",
                "extension": "html",
                "supports_charts": True
            },
            "pdf": {
                "mime_type": "application/pdf",
                "extension": "pdf",
                "supports_charts": True
            },
            "excel": {
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "extension": "xlsx",
                "supports_charts": True
            }
        }
    
    async def _validate_parameters(self, template: ReportTemplate, parameters: Dict[str, Any]):
        """Valida parâmetros do relatório"""
        for param_name, param_config in template.parameters.items():
            if param_config.get("required", False) and param_name not in parameters:
                # Use default if available
                if "default" in param_config:
                    parameters[param_name] = param_config["default"]
                else:
                    raise ValueError(f"Required parameter missing: {param_name}")
    
    async def _generate_section(self, section_config: Dict[str, Any], parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Gera seção do relatório"""
        try:
            section_type = section_config["type"]
            section_title = section_config["title"]
            config = section_config.get("config", {})
            
            # Get date range from parameters
            date_range = self._parse_date_range(parameters.get("date_range", "last_30_days"))
            
            section_data = {}
            
            if section_type == "kpi_summary":
                # Get KPI data
                categories = config.get("categories", [])
                kpis = await self.business_intelligence.calculate_kpis(date_range)
                
                if categories:
                    filtered_kpis = {}
                    for kpi_name, metric in kpis.items():
                        if self.business_intelligence.kpis[kpi_name].category in categories:
                            filtered_kpis[kpi_name] = {
                                "value": metric.value,
                                "unit": metric.unit,
                                "trend": metric.trend,
                                "change_percent": metric.change_percent,
                                "category": self.business_intelligence.kpis[kpi_name].category
                            }
                    section_data = {"kpis": filtered_kpis}
                else:
                    section_data = {"kpis": {k: {"value": v.value, "unit": v.unit, "trend": v.trend} 
                                           for k, v in kpis.items()}}
            
            elif section_type == "scorecard":
                # Get scorecard data
                categories = config.get("categories")
                scorecard = await self.business_intelligence.generate_scorecard(date_range, categories)
                section_data = scorecard
            
            elif section_type == "insights":
                # Get insights
                limit = config.get("limit", 10)
                insights = await self.business_intelligence.get_top_insights(date_range, limit)
                
                # Filter by severity if specified
                severity_filter = config.get("severity")
                if severity_filter:
                    insights = [i for i in insights if i.get("severity") in severity_filter]
                
                section_data = {"insights": insights}
            
            elif section_type == "trends":
                # Get trend analysis
                metrics = config.get("metrics", [])
                periods = config.get("periods", 12)
                
                trends = {}
                for metric in metrics:
                    trend_data = await self.business_intelligence.analyze_trends(metric, periods)
                    trends[metric] = trend_data
                
                section_data = {"trends": trends}
            
            elif section_type == "correlation_analysis":
                # Advanced analytics - correlation
                variables = config.get("variables", [])
                if variables:
                    analysis = await self.advanced_analytics.correlation_analysis(variables, date_range)
                    section_data = {
                        "analysis_id": analysis.analysis_id,
                        "results": analysis.results,
                        "insights": analysis.insights,
                        "confidence": analysis.confidence_score
                    }
            
            elif section_type == "regression_analysis":
                # Advanced analytics - regression
                target = config.get("target")
                predictors = config.get("predictors", [])
                if target and predictors:
                    analysis = await self.advanced_analytics.regression_analysis(target, predictors, date_range)
                    section_data = {
                        "analysis_id": analysis.analysis_id,
                        "results": analysis.results,
                        "insights": analysis.insights,
                        "confidence": analysis.confidence_score
                    }
            
            elif section_type == "forecasting":
                # Advanced analytics - forecasting
                variables = config.get("variables", [])
                periods = config.get("periods", 12)
                
                forecasts = {}
                for variable in variables:
                    analysis = await self.advanced_analytics.time_series_forecasting(variable, periods, date_range)
                    forecasts[variable] = {
                        "analysis_id": analysis.analysis_id,
                        "results": analysis.results,
                        "insights": analysis.insights,
                        "confidence": analysis.confidence_score
                    }
                
                section_data = {"forecasts": forecasts}
            
            else:
                # Default section with placeholder data
                section_data = {
                    "message": f"Section type '{section_type}' not implemented",
                    "config": config
                }
            
            return {
                "type": section_type,
                "title": section_title,
                "data": section_data,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating section {section_config.get('title', 'Unknown')}: {e}")
            return {
                "type": section_config.get("type", "unknown"),
                "title": section_config.get("title", "Error"),
                "data": {"error": str(e)},
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
    
    async def _format_report_output(self, report: Report, output_format: str) -> Dict[str, Any]:
        """Formata saída do relatório"""
        try:
            base_output = {
                "report_id": report.report_id,
                "title": report.title,
                "description": report.description,
                "template_id": report.template_id,
                "parameters": report.parameters,
                "generated_at": report.generated_at.isoformat(),
                "generated_by": report.generated_by,
                "format": output_format
            }
            
            if output_format == "json":
                base_output["sections"] = report.sections
                return base_output
            
            elif output_format == "html":
                html_content = await self._generate_html_report(report)
                base_output["content"] = html_content
                base_output["mime_type"] = "text/html"
                return base_output
            
            elif output_format == "pdf":
                # In production, would generate actual PDF
                base_output["content"] = "PDF content would be generated here"
                base_output["mime_type"] = "application/pdf"
                base_output["download_url"] = f"/reports/{report.report_id}.pdf"
                return base_output
            
            elif output_format == "excel":
                # In production, would generate actual Excel file
                excel_data = await self._generate_excel_report(report)
                base_output["content"] = excel_data
                base_output["mime_type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                base_output["download_url"] = f"/reports/{report.report_id}.xlsx"
                return base_output
            
            else:
                raise ValueError(f"Unsupported output format: {output_format}")
                
        except Exception as e:
            logger.error(f"Error formatting report output: {e}")
            raise
    
    def _parse_date_range(self, date_range_param: Union[str, Dict[str, str]]) -> Tuple[datetime, datetime]:
        """Converte parâmetro de data em range de datas"""
        try:
            end_date = datetime.now(timezone.utc)
            
            if isinstance(date_range_param, str):
                if date_range_param == "last_7_days":
                    start_date = end_date - timedelta(days=7)
                elif date_range_param == "last_30_days":
                    start_date = end_date - timedelta(days=30)
                elif date_range_param == "last_90_days":
                    start_date = end_date - timedelta(days=90)
                elif date_range_param == "last_365_days":
                    start_date = end_date - timedelta(days=365)
                else:
                    start_date = end_date - timedelta(days=30)  # Default
            
            elif isinstance(date_range_param, dict):
                start_date = datetime.fromisoformat(date_range_param["start"])
                end_date = datetime.fromisoformat(date_range_param["end"])
            
            else:
                start_date = end_date - timedelta(days=30)  # Default
            
            return (start_date, end_date)
            
        except Exception as e:
            logger.error(f"Error parsing date range: {e}")
            # Return default range
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=30)
            return (start_date, end_date)
    
    async def _generate_html_report(self, report: Report) -> str:
        """Gera relatório HTML"""
        try:
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>{report.title}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .header {{ border-bottom: 2px solid #007bff; padding-bottom: 10px; }}
                    .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; }}
                    .kpi {{ display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; }}
                    .insight {{ margin: 5px 0; padding: 8px; background: #e9ecef; }}
                    table {{ width: 100%; border-collapse: collapse; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                    th {{ background-color: #f2f2f2; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>{report.title}</h1>
                    <p>{report.description}</p>
                    <p><strong>Generated:</strong> {report.generated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                </div>
            """
            
            # Add sections
            for section in report.sections:
                html_content += f"""
                <div class="section">
                    <h2>{section['title']}</h2>
                """
                
                # Format section data based on type
                section_type = section['type']
                section_data = section['data']
                
                if section_type == "kpi_summary" and "kpis" in section_data:
                    html_content += "<div class='kpis'>"
                    for kpi_name, kpi_data in section_data["kpis"].items():
                        html_content += f"""
                        <div class="kpi">
                            <h4>{kpi_name}</h4>
                            <p><strong>{kpi_data.get('value', 'N/A')}</strong> {kpi_data.get('unit', '')}</p>
                            <p>Trend: {kpi_data.get('trend', 'N/A')}</p>
                        </div>
                        """
                    html_content += "</div>"
                
                elif section_type == "insights" and "insights" in section_data:
                    for insight in section_data["insights"]:
                        html_content += f"""
                        <div class="insight">
                            <strong>{insight.get('type', 'Insight')}:</strong> {insight.get('description', '')}
                        </div>
                        """
                
                else:
                    # Generic data display
                    html_content += f"<pre>{json.dumps(section_data, indent=2)}</pre>"
                
                html_content += "</div>"
            
            html_content += """
            </body>
            </html>
            """
            
            return html_content
            
        except Exception as e:
            logger.error(f"Error generating HTML report: {e}")
            return f"<html><body><h1>Error generating report</h1><p>{str(e)}</p></body></html>"
    
    async def _generate_excel_report(self, report: Report) -> str:
        """Gera relatório Excel (simulado)"""
        try:
            # In production, would use pandas/openpyxl to generate actual Excel file
            excel_info = {
                "sheets": [],
                "summary": f"Excel report with {len(report.sections)} sheets"
            }
            
            for i, section in enumerate(report.sections):
                sheet_info = {
                    "sheet_name": section["title"][:30],  # Excel sheet name limit
                    "data_type": section["type"],
                    "row_count": 0,
                    "columns": []
                }
                
                # Simulate data processing
                section_data = section["data"]
                if isinstance(section_data, dict):
                    sheet_info["row_count"] = len(section_data)
                    sheet_info["columns"] = list(section_data.keys())[:10]  # First 10 columns
                
                excel_info["sheets"].append(sheet_info)
            
            # Return base64 encoded "Excel file" (in production, would be actual Excel)
            excel_json = json.dumps(excel_info)
            excel_b64 = base64.b64encode(excel_json.encode()).decode()
            
            return excel_b64
            
        except Exception as e:
            logger.error(f"Error generating Excel report: {e}")
            return ""