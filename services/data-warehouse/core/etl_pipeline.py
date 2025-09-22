"""
ETL Pipeline
Sistema de Extract, Transform, Load para o data warehouse
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Callable
import logging
from enum import Enum
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

class JobStatus(Enum):
    """Status de job ETL"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SCHEDULED = "scheduled"

class JobPriority(Enum):
    """Prioridade de job ETL"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class ETLJob:
    """Definição de um job ETL"""
    job_id: str
    name: str
    source_type: str
    source_config: Dict[str, Any]
    target_tables: List[str]
    transformation_rules: Dict[str, Any]
    schedule: Optional[str]
    status: JobStatus
    priority: JobPriority
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    progress_percentage: float = 0.0
    records_processed: int = 0
    records_total: int = 0
    execution_time_seconds: float = 0.0

class ETLPipeline:
    """Pipeline ETL para o data warehouse"""
    
    def __init__(self):
        self.is_active = False
        self.jobs = {}
        self.job_queue = asyncio.Queue()
        self.running_jobs = {}
        self.job_history = {}
        self.extractors = {}
        self.transformers = {}
        self.loaders = {}
        
    async def initialize(self):
        """Inicializa o pipeline ETL"""
        try:
            logger.info("Initializing ETL Pipeline...")
            
            # Register extractors, transformers, and loaders
            await self._register_extractors()
            await self._register_transformers()
            await self._register_loaders()
            
            # Start job processor
            asyncio.create_task(self._job_processor())
            
            self.is_active = True
            logger.info("ETL Pipeline initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing ETL Pipeline: {e}")
            raise
    
    async def create_job(self, job_config: Dict[str, Any]) -> Dict[str, Any]:
        """Cria um novo job ETL"""
        try:
            job_id = str(uuid.uuid4())
            
            job = ETLJob(
                job_id=job_id,
                name=job_config.get("name", f"ETL Job {job_id[:8]}"),
                source_type=job_config["source_type"],
                source_config=job_config["source_config"],
                target_tables=job_config["target_tables"],
                transformation_rules=job_config.get("transformation_rules", {}),
                schedule=job_config.get("schedule"),
                status=JobStatus.SCHEDULED if job_config.get("schedule") else JobStatus.PENDING,
                priority=JobPriority(job_config.get("priority", JobPriority.NORMAL.value)),
                created_at=datetime.now(timezone.utc)
            )
            
            self.jobs[job_id] = job
            
            # Add to queue if not scheduled
            if not job.schedule:
                await self.job_queue.put(job_id)
            
            logger.info(f"Created ETL job {job_id}: {job.name}")
            
            return {
                "job_id": job_id,
                "status": job.status.value,
                "message": f"ETL job created successfully",
                "scheduled_at": job.created_at.isoformat(),
                "estimated_duration": await self._estimate_job_duration(job)
            }
            
        except Exception as e:
            logger.error(f"Error creating ETL job: {e}")
            raise
    
    async def get_jobs(
        self, 
        status: Optional[str] = None,
        source_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lista jobs ETL"""
        try:
            jobs = list(self.jobs.values())
            
            # Filter by status
            if status:
                jobs = [job for job in jobs if job.status.value == status]
            
            # Filter by source type
            if source_type:
                jobs = [job for job in jobs if job.source_type == source_type]
            
            # Sort by created_at desc
            jobs.sort(key=lambda x: x.created_at, reverse=True)
            
            # Limit results
            jobs = jobs[:limit]
            
            return [
                {
                    "job_id": job.job_id,
                    "name": job.name,
                    "source_type": job.source_type,
                    "status": job.status.value,
                    "priority": job.priority.value,
                    "progress_percentage": job.progress_percentage,
                    "records_processed": job.records_processed,
                    "created_at": job.created_at.isoformat(),
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                    "execution_time_seconds": job.execution_time_seconds,
                    "error_message": job.error_message
                }
                for job in jobs
            ]
            
        except Exception as e:
            logger.error(f"Error getting ETL jobs: {e}")
            return []
    
    async def get_job_details(self, job_id: str) -> Dict[str, Any]:
        """Obtém detalhes de um job ETL"""
        try:
            if job_id not in self.jobs:
                raise ValueError(f"Job {job_id} not found")
            
            job = self.jobs[job_id]
            
            return {
                **asdict(job),
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "status": job.status.value,
                "priority": job.priority.value,
                "estimated_remaining_time": await self._estimate_remaining_time(job),
                "execution_log": await self._get_job_execution_log(job_id)
            }
            
        except Exception as e:
            logger.error(f"Error getting job details: {e}")
            raise
    
    async def execute_job(self, job_id: str) -> Dict[str, Any]:
        """Executa um job ETL"""
        try:
            if job_id not in self.jobs:
                raise ValueError(f"Job {job_id} not found")
            
            job = self.jobs[job_id]
            
            if job.status in [JobStatus.RUNNING, JobStatus.COMPLETED]:
                raise ValueError(f"Job {job_id} is already {job.status.value}")
            
            logger.info(f"Starting execution of ETL job {job_id}: {job.name}")
            
            # Update job status
            job.status = JobStatus.RUNNING
            job.started_at = datetime.now(timezone.utc)
            job.progress_percentage = 0.0
            
            self.running_jobs[job_id] = job
            
            try:
                # Execute ETL phases
                await self._extract_phase(job)
                await self._transform_phase(job)
                await self._load_phase(job)
                
                # Mark as completed
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.now(timezone.utc)
                job.progress_percentage = 100.0
                job.execution_time_seconds = (job.completed_at - job.started_at).total_seconds()
                
                logger.info(f"ETL job {job_id} completed successfully in {job.execution_time_seconds:.2f} seconds")
                
                return {
                    "status": "completed",
                    "job_id": job_id,
                    "execution_time_seconds": job.execution_time_seconds,
                    "records_processed": job.records_processed
                }
                
            except Exception as e:
                # Mark as failed
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                job.completed_at = datetime.now(timezone.utc)
                
                logger.error(f"ETL job {job_id} failed: {e}")
                raise
                
            finally:
                # Remove from running jobs
                if job_id in self.running_jobs:
                    del self.running_jobs[job_id]
                
                # Add to history
                self.job_history[job_id] = job
            
        except Exception as e:
            logger.error(f"Error executing ETL job {job_id}: {e}")
            raise
    
    async def cancel_job(self, job_id: str) -> Dict[str, Any]:
        """Cancela um job ETL"""
        try:
            if job_id not in self.jobs:
                raise ValueError(f"Job {job_id} not found")
            
            job = self.jobs[job_id]
            
            if job.status == JobStatus.COMPLETED:
                raise ValueError(f"Cannot cancel completed job {job_id}")
            
            # Update status
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now(timezone.utc)
            
            # Remove from running jobs if applicable
            if job_id in self.running_jobs:
                del self.running_jobs[job_id]
            
            logger.info(f"ETL job {job_id} cancelled")
            
            return {
                "status": "cancelled",
                "job_id": job_id,
                "cancelled_at": job.completed_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error cancelling ETL job {job_id}: {e}")
            raise
    
    async def monitor_jobs(self) -> Dict[str, Any]:
        """Monitora jobs em execução"""
        try:
            monitoring_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_jobs": len(self.jobs),
                "running_jobs": len(self.running_jobs),
                "pending_jobs": len([j for j in self.jobs.values() if j.status == JobStatus.PENDING]),
                "completed_jobs": len([j for j in self.jobs.values() if j.status == JobStatus.COMPLETED]),
                "failed_jobs": len([j for j in self.jobs.values() if j.status == JobStatus.FAILED]),
                "queue_size": self.job_queue.qsize(),
                "running_job_details": []
            }
            
            # Add details of running jobs
            for job_id, job in self.running_jobs.items():
                monitoring_data["running_job_details"].append({
                    "job_id": job_id,
                    "name": job.name,
                    "progress_percentage": job.progress_percentage,
                    "records_processed": job.records_processed,
                    "execution_time_seconds": (datetime.now(timezone.utc) - job.started_at).total_seconds(),
                    "estimated_remaining_time": await self._estimate_remaining_time(job)
                })
            
            return monitoring_data
            
        except Exception as e:
            logger.error(f"Error monitoring jobs: {e}")
            return {}
    
    async def _job_processor(self):
        """Processador de jobs em background"""
        while self.is_active:
            try:
                # Get job from queue with timeout
                try:
                    job_id = await asyncio.wait_for(self.job_queue.get(), timeout=5.0)
                    await self.execute_job(job_id)
                except asyncio.TimeoutError:
                    continue
                
            except Exception as e:
                logger.error(f"Error in job processor: {e}")
                await asyncio.sleep(1)
    
    async def _extract_phase(self, job: ETLJob):
        """Fase de extração de dados"""
        try:
            logger.info(f"Starting extract phase for job {job.job_id}")
            
            # Get appropriate extractor
            extractor = self.extractors.get(job.source_type)
            if not extractor:
                raise ValueError(f"No extractor found for source type: {job.source_type}")
            
            # Update progress
            job.progress_percentage = 10.0
            
            # Execute extraction
            extracted_data = await extractor(job.source_config)
            
            # Store extracted data for transform phase
            job.source_config["_extracted_data"] = extracted_data
            job.records_total = len(extracted_data) if isinstance(extracted_data, list) else 1
            
            job.progress_percentage = 30.0
            logger.info(f"Extract phase completed for job {job.job_id}")
            
        except Exception as e:
            logger.error(f"Error in extract phase for job {job.job_id}: {e}")
            raise
    
    async def _transform_phase(self, job: ETLJob):
        """Fase de transformação de dados"""
        try:
            logger.info(f"Starting transform phase for job {job.job_id}")
            
            extracted_data = job.source_config.get("_extracted_data", [])
            transformation_rules = job.transformation_rules
            
            # Update progress
            job.progress_percentage = 40.0
            
            # Apply transformations
            transformed_data = {}
            
            for target_table in job.target_tables:
                transformer = self.transformers.get(target_table)
                if transformer:
                    transformed_data[target_table] = await transformer(extracted_data, transformation_rules)
                else:
                    # Default transformation (pass through)
                    transformed_data[target_table] = extracted_data
            
            # Store transformed data for load phase
            job.source_config["_transformed_data"] = transformed_data
            
            job.progress_percentage = 70.0
            logger.info(f"Transform phase completed for job {job.job_id}")
            
        except Exception as e:
            logger.error(f"Error in transform phase for job {job.job_id}: {e}")
            raise
    
    async def _load_phase(self, job: ETLJob):
        """Fase de carregamento de dados"""
        try:
            logger.info(f"Starting load phase for job {job.job_id}")
            
            transformed_data = job.source_config.get("_transformed_data", {})
            
            # Update progress
            job.progress_percentage = 80.0
            
            # Load data to each target table
            total_records = 0
            
            for target_table, data in transformed_data.items():
                loader = self.loaders.get(target_table)
                if loader:
                    records_loaded = await loader(data, target_table)
                    total_records += records_loaded
                else:
                    logger.warning(f"No loader found for target table: {target_table}")
            
            job.records_processed = total_records
            job.progress_percentage = 100.0
            
            logger.info(f"Load phase completed for job {job.job_id}, {total_records} records processed")
            
        except Exception as e:
            logger.error(f"Error in load phase for job {job.job_id}: {e}")
            raise
    
    async def _register_extractors(self):
        """Registra extractors para diferentes fontes de dados"""
        
        async def fhir_extractor(config: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Extractor para dados FHIR"""
            # Placeholder - would integrate with FHIR Gateway
            await asyncio.sleep(0.1)  # Simulate processing
            return [
                {"resource_type": "Patient", "id": f"P{i:03d}", "name": f"Patient {i}"}
                for i in range(1, 101)
            ]
        
        async def ml_service_extractor(config: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Extractor para serviço ML"""
            # Placeholder - would integrate with ML Service
            await asyncio.sleep(0.1)
            return [
                {"prediction_id": f"ML{i:03d}", "accuracy": 0.85 + (i % 15) / 100}
                for i in range(1, 51)
            ]
        
        async def monitoring_extractor(config: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Extractor para dados de monitoramento"""
            # Placeholder - would integrate with Monitoring Service
            await asyncio.sleep(0.1)
            return [
                {"alert_id": f"A{i:03d}", "severity": "high", "resolved": i % 3 == 0}
                for i in range(1, 201)
            ]
        
        async def file_extractor(config: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Extractor para arquivos CSV/Excel"""
            # Placeholder - would read actual files
            await asyncio.sleep(0.2)
            return [{"file_record": i, "data": f"value_{i}"} for i in range(1, 1001)]
        
        self.extractors = {
            "fhir": fhir_extractor,
            "ml_service": ml_service_extractor,
            "monitoring": monitoring_extractor,
            "file_upload": file_extractor,
            "external_api": fhir_extractor,  # Generic API extractor
            "clinical_notes": ml_service_extractor  # Clinical notes extractor
        }
    
    async def _register_transformers(self):
        """Registra transformers para diferentes tabelas"""
        
        async def patient_transformer(data: List[Dict[str, Any]], rules: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Transformer para dimensão de pacientes"""
            transformed = []
            for record in data:
                if record.get("resource_type") == "Patient":
                    transformed.append({
                        "patient_key": hash(record["id"]) % 1000000,
                        "patient_id": record["id"],
                        "name": record.get("name", "Unknown"),
                        "status": "active"
                    })
            return transformed
        
        async def encounter_transformer(data: List[Dict[str, Any]], rules: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Transformer para fatos de atendimento"""
            transformed = []
            for i, record in enumerate(data):
                transformed.append({
                    "encounter_id": f"ENC{i:06d}",
                    "patient_key": hash(record.get("id", i)) % 1000000,
                    "duration_minutes": 45 + (i % 60),
                    "cost_amount": 150.0 + (i % 500),
                    "satisfaction_score": 7.5 + (i % 3)
                })
            return transformed
        
        async def vital_signs_transformer(data: List[Dict[str, Any]], rules: Dict[str, Any]) -> List[Dict[str, Any]]:
            """Transformer para fatos de sinais vitais"""
            transformed = []
            for i, record in enumerate(data):
                transformed.append({
                    "vital_signs_id": f"VS{i:06d}",
                    "patient_key": hash(record.get("id", i)) % 1000000,
                    "heart_rate": 70 + (i % 40),
                    "blood_pressure_systolic": 120 + (i % 40),
                    "temperature_celsius": 36.5 + (i % 2),
                    "oxygen_saturation": 95 + (i % 5)
                })
            return transformed
        
        self.transformers = {
            "dim_patient": patient_transformer,
            "fact_encounter": encounter_transformer,
            "fact_vital_signs": vital_signs_transformer
        }
    
    async def _register_loaders(self):
        """Registra loaders para diferentes tabelas"""
        
        async def dimension_loader(data: List[Dict[str, Any]], table_name: str) -> int:
            """Loader para tabelas dimensão"""
            # Placeholder - would insert into actual database
            await asyncio.sleep(0.1)
            logger.info(f"Loaded {len(data)} records into {table_name}")
            return len(data)
        
        async def fact_loader(data: List[Dict[str, Any]], table_name: str) -> int:
            """Loader para tabelas fato"""
            # Placeholder - would insert into actual database
            await asyncio.sleep(0.2)
            logger.info(f"Loaded {len(data)} records into {table_name}")
            return len(data)
        
        # Register loaders for all dimension and fact tables
        dimension_tables = ["dim_time", "dim_patient", "dim_provider", "dim_location", "dim_procedure", "dim_diagnosis"]
        fact_tables = ["fact_encounter", "fact_procedure", "fact_vital_signs", "fact_financial", "fact_quality"]
        
        self.loaders = {}
        
        for table in dimension_tables:
            self.loaders[table] = dimension_loader
        
        for table in fact_tables:
            self.loaders[table] = fact_loader
    
    async def _estimate_job_duration(self, job: ETLJob) -> int:
        """Estima duração de um job em segundos"""
        # Simple estimation based on source type and target tables
        base_time = 60  # 1 minute base
        
        source_multipliers = {
            "fhir": 2.0,
            "ml_service": 1.5,
            "monitoring": 1.2,
            "file_upload": 3.0,
            "external_api": 2.5,
            "clinical_notes": 1.8
        }
        
        multiplier = source_multipliers.get(job.source_type, 1.0)
        table_factor = len(job.target_tables) * 0.5
        
        return int(base_time * multiplier * (1 + table_factor))
    
    async def _estimate_remaining_time(self, job: ETLJob) -> Optional[int]:
        """Estima tempo restante de um job em execução"""
        if job.status != JobStatus.RUNNING or not job.started_at:
            return None
        
        elapsed = (datetime.now(timezone.utc) - job.started_at).total_seconds()
        
        if job.progress_percentage > 0:
            total_estimated = elapsed / (job.progress_percentage / 100)
            remaining = total_estimated - elapsed
            return max(0, int(remaining))
        
        return None
    
    async def _get_job_execution_log(self, job_id: str) -> List[Dict[str, Any]]:
        """Obtém log de execução de um job"""
        # Placeholder - would return actual execution logs
        return [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": "INFO",
                "message": f"Job {job_id} execution log entry"
            }
        ]