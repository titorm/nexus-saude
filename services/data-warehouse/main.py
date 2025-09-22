"""
Data Warehouse & Analytics Service
Sistema de data warehouse dimensional com ETL e analytics avançados
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Union
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging
from enum import Enum
import uvicorn
from contextlib import asynccontextmanager

# Import data warehouse components
from core.dimensional_model import DimensionalModel
from core.etl_pipeline import ETLPipeline
from core.data_transformer import DataTransformer
from analytics.business_intelligence import BusinessIntelligence
from analytics.executive_dashboard import ExecutiveDashboard
from analytics.advanced_analytics import AdvancedAnalytics
from reports.report_generator import ReportGenerator
from exports.data_export import DataExporter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataSourceType(Enum):
    """Tipos de fonte de dados"""
    FHIR = "fhir"
    ML_SERVICE = "ml_service"
    MONITORING = "monitoring"
    CLINICAL_NOTES = "clinical_notes"
    EXTERNAL_API = "external_api"
    FILE_UPLOAD = "file_upload"

class ReportFormat(Enum):
    """Formatos de relatório"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"
    HTML = "html"

class AnalyticsType(Enum):
    """Tipos de análise"""
    DESCRIPTIVE = "descriptive"
    DIAGNOSTIC = "diagnostic"
    PREDICTIVE = "predictive"
    PRESCRIPTIVE = "prescriptive"

# Request/Response Models
class ETLJobRequest(BaseModel):
    """Request para job ETL"""
    source_type: DataSourceType
    source_config: Dict[str, Any]
    target_tables: List[str]
    schedule: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    transformation_rules: Optional[Dict[str, Any]] = None

class ETLJobResponse(BaseModel):
    """Response de job ETL"""
    job_id: str
    status: str
    message: str
    scheduled_at: Optional[datetime] = None
    estimated_duration: Optional[int] = None

class AnalyticsQuery(BaseModel):
    """Query de analytics"""
    analysis_type: AnalyticsType
    dimensions: List[str]
    measures: List[str]
    filters: Optional[Dict[str, Any]] = None
    time_range: Optional[Dict[str, str]] = None
    aggregation: Optional[str] = "sum"
    group_by: Optional[List[str]] = None

class ReportRequest(BaseModel):
    """Request para geração de relatório"""
    report_type: str
    format: ReportFormat
    parameters: Dict[str, Any]
    filters: Optional[Dict[str, Any]] = None
    schedule: Optional[str] = None
    recipients: Optional[List[str]] = None

# Global instances
dimensional_model = DimensionalModel()
etl_pipeline = ETLPipeline()
data_transformer = DataTransformer()
business_intelligence = BusinessIntelligence()
executive_dashboard = ExecutiveDashboard()
advanced_analytics = AdvancedAnalytics()
report_generator = ReportGenerator()
data_exporter = DataExporter()

# Startup/shutdown lifecycle
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia o ciclo de vida da aplicação"""
    # Startup
    logger.info("Starting Data Warehouse & Analytics Service...")
    
    # Initialize all components
    await dimensional_model.initialize()
    await etl_pipeline.initialize()
    await data_transformer.initialize()
    await business_intelligence.initialize()
    await executive_dashboard.initialize()
    await advanced_analytics.initialize()
    await report_generator.initialize()
    await data_exporter.initialize()
    
    # Start background tasks
    asyncio.create_task(background_etl_monitoring())
    asyncio.create_task(background_data_quality_checks())
    asyncio.create_task(background_analytics_refresh())
    
    logger.info("Data Warehouse & Analytics Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Data Warehouse & Analytics Service...")

# FastAPI app with lifespan
app = FastAPI(
    title="Data Warehouse & Analytics Service",
    description="Sistema de data warehouse dimensional com ETL e analytics avançados",
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

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Data Warehouse & Analytics Service",
        "version": "1.0.0",
        "status": "operational",
        "components": {
            "dimensional_model": dimensional_model.is_active,
            "etl_pipeline": etl_pipeline.is_active,
            "business_intelligence": business_intelligence.is_active,
            "advanced_analytics": advanced_analytics.is_active
        }
    }

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Data Warehouse & Analytics",
        "version": "1.0.0"
    }

# =============================
# DIMENSIONAL MODEL ENDPOINTS
# =============================

@app.get("/dimensions")
async def get_dimensions():
    """Lista todas as dimensões disponíveis"""
    try:
        dimensions = await dimensional_model.get_dimensions()
        return {
            "dimensions": dimensions,
            "count": len(dimensions)
        }
    except Exception as e:
        logger.error(f"Error getting dimensions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dimensions/{dimension_name}")
async def get_dimension_details(dimension_name: str):
    """Obtém detalhes de uma dimensão específica"""
    try:
        dimension = await dimensional_model.get_dimension_details(dimension_name)
        return dimension
    except Exception as e:
        logger.error(f"Error getting dimension details: {e}")
        raise HTTPException(status_code=404, detail="Dimension not found")

@app.get("/facts")
async def get_fact_tables():
    """Lista todas as tabelas fato disponíveis"""
    try:
        facts = await dimensional_model.get_fact_tables()
        return {
            "fact_tables": facts,
            "count": len(facts)
        }
    except Exception as e:
        logger.error(f"Error getting fact tables: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/facts/{fact_table}")
async def get_fact_table_details(fact_table: str):
    """Obtém detalhes de uma tabela fato específica"""
    try:
        fact_details = await dimensional_model.get_fact_table_details(fact_table)
        return fact_details
    except Exception as e:
        logger.error(f"Error getting fact table details: {e}")
        raise HTTPException(status_code=404, detail="Fact table not found")

# =============================
# ETL PIPELINE ENDPOINTS
# =============================

@app.post("/etl/jobs", response_model=ETLJobResponse)
async def create_etl_job(job_request: ETLJobRequest, background_tasks: BackgroundTasks):
    """Cria um novo job ETL"""
    try:
        job_result = await etl_pipeline.create_job(job_request.dict())
        
        # Execute ETL job in background if not scheduled
        if not job_request.schedule:
            background_tasks.add_task(execute_etl_job, job_result["job_id"])
        
        return ETLJobResponse(**job_result)
    except Exception as e:
        logger.error(f"Error creating ETL job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/etl/jobs")
async def get_etl_jobs(
    status: Optional[str] = None,
    source_type: Optional[DataSourceType] = None,
    limit: int = Query(50, ge=1, le=1000)
):
    """Lista jobs ETL"""
    try:
        jobs = await etl_pipeline.get_jobs(status=status, source_type=source_type, limit=limit)
        return {
            "jobs": jobs,
            "count": len(jobs)
        }
    except Exception as e:
        logger.error(f"Error getting ETL jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/etl/jobs/{job_id}")
async def get_etl_job(job_id: str):
    """Obtém detalhes de um job ETL específico"""
    try:
        job = await etl_pipeline.get_job_details(job_id)
        return job
    except Exception as e:
        logger.error(f"Error getting ETL job: {e}")
        raise HTTPException(status_code=404, detail="Job not found")

@app.post("/etl/jobs/{job_id}/execute")
async def execute_etl_job_endpoint(job_id: str, background_tasks: BackgroundTasks):
    """Executa um job ETL específico"""
    try:
        background_tasks.add_task(execute_etl_job, job_id)
        return {
            "status": "started",
            "job_id": job_id,
            "message": "ETL job execution started"
        }
    except Exception as e:
        logger.error(f"Error executing ETL job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/etl/jobs/{job_id}")
async def cancel_etl_job(job_id: str):
    """Cancela um job ETL"""
    try:
        result = await etl_pipeline.cancel_job(job_id)
        return result
    except Exception as e:
        logger.error(f"Error canceling ETL job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# BUSINESS INTELLIGENCE ENDPOINTS
# =============================

@app.post("/analytics/query")
async def execute_analytics_query(query: AnalyticsQuery):
    """Executa uma query de analytics"""
    try:
        result = await business_intelligence.execute_query(query.dict())
        return result
    except Exception as e:
        logger.error(f"Error executing analytics query: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/kpis")
async def get_kpis(time_range: Optional[str] = None):
    """Obtém KPIs principais"""
    try:
        kpis = await business_intelligence.get_kpis(time_range)
        return {
            "kpis": kpis,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting KPIs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/dashboard/{dashboard_type}")
async def get_dashboard_data(dashboard_type: str, time_range: Optional[str] = None):
    """Obtém dados para dashboard específico"""
    try:
        dashboard_data = await business_intelligence.get_dashboard_data(dashboard_type, time_range)
        return dashboard_data
    except Exception as e:
        logger.error(f"Error getting dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# EXECUTIVE DASHBOARD ENDPOINTS
# =============================

@app.get("/executive/dashboard")
async def get_executive_dashboard():
    """Dashboard executivo principal"""
    try:
        dashboard = await executive_dashboard.generate_dashboard()
        return dashboard
    except Exception as e:
        logger.error(f"Error getting executive dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/executive/summary")
async def get_executive_summary(period: str = "monthly"):
    """Resumo executivo"""
    try:
        summary = await executive_dashboard.generate_summary(period)
        return summary
    except Exception as e:
        logger.error(f"Error getting executive summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/executive/trends")
async def get_executive_trends(metric: Optional[str] = None):
    """Análise de tendências executivas"""
    try:
        trends = await executive_dashboard.get_trends(metric)
        return trends
    except Exception as e:
        logger.error(f"Error getting executive trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# ADVANCED ANALYTICS ENDPOINTS
# =============================

@app.post("/analytics/advanced/correlation")
async def analyze_correlation(variables: List[str], time_range: Optional[Dict[str, str]] = None):
    """Análise de correlação entre variáveis"""
    try:
        correlation = await advanced_analytics.correlation_analysis(variables, time_range)
        return correlation
    except Exception as e:
        logger.error(f"Error in correlation analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/advanced/regression")
async def regression_analysis(
    target_variable: str,
    independent_variables: List[str],
    model_type: str = "linear"
):
    """Análise de regressão"""
    try:
        regression = await advanced_analytics.regression_analysis(
            target_variable, independent_variables, model_type
        )
        return regression
    except Exception as e:
        logger.error(f"Error in regression analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/advanced/forecasting")
async def forecasting_analysis(
    metric: str,
    periods: int = 30,
    model_type: str = "auto"
):
    """Análise de forecasting"""
    try:
        forecast = await advanced_analytics.forecasting_analysis(metric, periods, model_type)
        return forecast
    except Exception as e:
        logger.error(f"Error in forecasting analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/advanced/clustering")
async def clustering_analysis(
    features: List[str],
    algorithm: str = "kmeans",
    n_clusters: Optional[int] = None
):
    """Análise de clustering"""
    try:
        clustering = await advanced_analytics.clustering_analysis(features, algorithm, n_clusters)
        return clustering
    except Exception as e:
        logger.error(f"Error in clustering analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# REPORTS ENDPOINTS
# =============================

@app.post("/reports/generate")
async def generate_report(report_request: ReportRequest, background_tasks: BackgroundTasks):
    """Gera um relatório"""
    try:
        report_id = str(uuid.uuid4())
        
        # Generate report in background
        background_tasks.add_task(
            generate_report_background,
            report_id,
            report_request.dict()
        )
        
        return {
            "report_id": report_id,
            "status": "generating",
            "estimated_time": "2-5 minutes"
        }
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reports/{report_id}")
async def get_report_status(report_id: str):
    """Obtém status de um relatório"""
    try:
        status = await report_generator.get_report_status(report_id)
        return status
    except Exception as e:
        logger.error(f"Error getting report status: {e}")
        raise HTTPException(status_code=404, detail="Report not found")

@app.get("/reports/{report_id}/download")
async def download_report(report_id: str):
    """Download de um relatório"""
    try:
        report_file = await report_generator.download_report(report_id)
        return report_file
    except Exception as e:
        logger.error(f"Error downloading report: {e}")
        raise HTTPException(status_code=404, detail="Report not found")

@app.get("/reports")
async def list_reports(limit: int = Query(50, ge=1, le=200)):
    """Lista relatórios"""
    try:
        reports = await report_generator.list_reports(limit)
        return {
            "reports": reports,
            "count": len(reports)
        }
    except Exception as e:
        logger.error(f"Error listing reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================
# DATA EXPORT ENDPOINTS
# =============================

@app.post("/export/data")
async def export_data(
    table_name: str,
    format: str = "csv",
    filters: Optional[Dict[str, Any]] = None,
    background_tasks: BackgroundTasks = None
):
    """Exporta dados"""
    try:
        export_id = str(uuid.uuid4())
        
        # Export data in background
        background_tasks.add_task(
            export_data_background,
            export_id,
            table_name,
            format,
            filters
        )
        
        return {
            "export_id": export_id,
            "status": "exporting",
            "table": table_name,
            "format": format
        }
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/{export_id}")
async def get_export_status(export_id: str):
    """Obtém status de uma exportação"""
    try:
        status = await data_exporter.get_export_status(export_id)
        return status
    except Exception as e:
        logger.error(f"Error getting export status: {e}")
        raise HTTPException(status_code=404, detail="Export not found")

@app.get("/export/{export_id}/download")
async def download_export(export_id: str):
    """Download de uma exportação"""
    try:
        export_file = await data_exporter.download_export(export_id)
        return export_file
    except Exception as e:
        logger.error(f"Error downloading export: {e}")
        raise HTTPException(status_code=404, detail="Export not found")

# =============================
# BACKGROUND TASKS
# =============================

async def execute_etl_job(job_id: str):
    """Executa job ETL em background"""
    try:
        await etl_pipeline.execute_job(job_id)
    except Exception as e:
        logger.error(f"Error executing ETL job {job_id}: {e}")

async def generate_report_background(report_id: str, report_config: Dict[str, Any]):
    """Gera relatório em background"""
    try:
        await report_generator.generate_report(report_id, report_config)
    except Exception as e:
        logger.error(f"Error generating report {report_id}: {e}")

async def export_data_background(
    export_id: str,
    table_name: str,
    format: str,
    filters: Optional[Dict[str, Any]]
):
    """Exporta dados em background"""
    try:
        await data_exporter.export_data(export_id, table_name, format, filters)
    except Exception as e:
        logger.error(f"Error exporting data {export_id}: {e}")

async def background_etl_monitoring():
    """Monitoramento contínuo de jobs ETL"""
    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes
            await etl_pipeline.monitor_jobs()
        except Exception as e:
            logger.error(f"Error in ETL monitoring: {e}")

async def background_data_quality_checks():
    """Verificações de qualidade de dados"""
    while True:
        try:
            await asyncio.sleep(3600)  # Check every hour
            await dimensional_model.run_data_quality_checks()
        except Exception as e:
            logger.error(f"Error in data quality checks: {e}")

async def background_analytics_refresh():
    """Atualização de analytics em background"""
    while True:
        try:
            await asyncio.sleep(1800)  # Refresh every 30 minutes
            await business_intelligence.refresh_cache()
        except Exception as e:
            logger.error(f"Error refreshing analytics: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8006,
        reload=True,
        log_level="info"
    )