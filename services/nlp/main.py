"""
Clinical Notes NLP Service
Serviço de processamento de linguagem natural para notas clínicas

Este serviço fornece:
- Extração de entidades médicas de notas clínicas
- Classificação automática de documentos
- Sumarização de textos médicos
- Análise de sentimento e urgência
- Estruturação de dados não estruturados
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import asyncio
import logging
import uuid
from datetime import datetime
import json

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração da aplicação
app = FastAPI(
    title="Clinical Notes NLP Service",
    description="Serviço de processamento de linguagem natural para notas clínicas",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Importar classes principais
from core.clinical_nlp_processor import ClinicalNLPProcessor
from core.document_classifier import DocumentClassifier  
from core.medical_entity_extractor import MedicalEntityExtractor
from core.clinical_summarizer import ClinicalSummarizer
from core.structured_data_extractor import StructuredDataExtractor

# Modelos Pydantic
class ClinicalNote(BaseModel):
    """Modelo para nota clínica"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(..., description="Conteúdo da nota clínica")
    note_type: Optional[str] = Field(default="general", description="Tipo da nota")
    patient_id: Optional[str] = Field(default=None, description="ID do paciente")
    author_id: Optional[str] = Field(default=None, description="ID do autor")
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class EntityExtractionRequest(BaseModel):
    """Request para extração de entidades"""
    text: str = Field(..., description="Texto para análise")
    entity_types: Optional[List[str]] = Field(default=None, description="Tipos específicos de entidades")
    include_confidence: bool = Field(default=True, description="Incluir scores de confiança")

class DocumentClassificationRequest(BaseModel):
    """Request para classificação de documentos"""
    text: str = Field(..., description="Texto para classificação")
    include_categories: Optional[List[str]] = Field(default=None, description="Categorias específicas")

class SummarizationRequest(BaseModel):
    """Request para sumarização"""
    text: str = Field(..., description="Texto para sumarizar")
    max_length: Optional[int] = Field(default=150, description="Tamanho máximo do resumo")
    summary_type: Optional[str] = Field(default="extractive", description="Tipo de sumarização")

class StructuredExtractionRequest(BaseModel):
    """Request para extração de dados estruturados"""
    text: str = Field(..., description="Texto para estruturar")
    output_format: Optional[str] = Field(default="json", description="Formato de saída")
    template: Optional[str] = Field(default="general", description="Template a usar")

class ProcessingResult(BaseModel):
    """Resultado do processamento"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)

# Instâncias dos processadores
clinical_processor = None
document_classifier = None
entity_extractor = None
clinical_summarizer = None
structured_extractor = None

@app.on_event("startup")
async def startup_event():
    """Inicialização do serviço"""
    global clinical_processor, document_classifier, entity_extractor, clinical_summarizer, structured_extractor
    
    logger.info("Initializing Clinical Notes NLP Service...")
    
    try:
        # Inicializar processadores
        clinical_processor = ClinicalNLPProcessor()
        await clinical_processor.initialize()
        
        document_classifier = DocumentClassifier()
        await document_classifier.initialize()
        
        entity_extractor = MedicalEntityExtractor()
        await entity_extractor.initialize()
        
        clinical_summarizer = ClinicalSummarizer()
        await clinical_summarizer.initialize()
        
        structured_extractor = StructuredDataExtractor()
        await structured_extractor.initialize()
        
        logger.info("Clinical Notes NLP Service initialized successfully!")
        
    except Exception as e:
        logger.error(f"Failed to initialize service: {e}")
        raise

@app.get("/")
async def root():
    """Endpoint raiz"""
    return {
        "service": "Clinical Notes NLP Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "process_note": "/api/v1/process-note",
            "extract_entities": "/api/v1/extract-entities", 
            "classify_document": "/api/v1/classify-document",
            "summarize": "/api/v1/summarize",
            "extract_structured": "/api/v1/extract-structured",
            "batch_process": "/api/v1/batch-process"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Verificar se todos os processadores estão inicializados
        processors_status = {
            "clinical_processor": clinical_processor is not None and clinical_processor.is_initialized,
            "document_classifier": document_classifier is not None and document_classifier.is_initialized,
            "entity_extractor": entity_extractor is not None and entity_extractor.is_initialized,
            "clinical_summarizer": clinical_summarizer is not None and clinical_summarizer.is_initialized,
            "structured_extractor": structured_extractor is not None and structured_extractor.is_initialized
        }
        
        all_healthy = all(processors_status.values())
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "processors": processors_status,
            "timestamp": datetime.now()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now()
        }

@app.post("/api/v1/process-note", response_model=ProcessingResult)
async def process_clinical_note(note: ClinicalNote) -> ProcessingResult:
    """
    Processa uma nota clínica completa com todos os análises
    """
    start_time = datetime.now()
    
    try:
        if not clinical_processor:
            raise HTTPException(status_code=503, detail="Clinical processor not initialized")
        
        logger.info(f"Processing clinical note: {note.id}")
        
        # Processar nota completa
        result = await clinical_processor.process_clinical_note(
            note.content,
            note_type=note.note_type,
            patient_id=note.patient_id,
            metadata=note.metadata
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=True,
            message="Clinical note processed successfully",
            data=result,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error processing clinical note: {e}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=False,
            message=f"Error processing clinical note: {str(e)}",
            processing_time=processing_time
        )

@app.post("/api/v1/extract-entities", response_model=ProcessingResult)
async def extract_medical_entities(request: EntityExtractionRequest) -> ProcessingResult:
    """
    Extrai entidades médicas de um texto
    """
    start_time = datetime.now()
    
    try:
        if not entity_extractor:
            raise HTTPException(status_code=503, detail="Entity extractor not initialized")
        
        logger.info("Extracting medical entities")
        
        # Extrair entidades
        entities = await entity_extractor.extract_entities(
            request.text,
            entity_types=request.entity_types,
            include_confidence=request.include_confidence
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=True,
            message="Entities extracted successfully",
            data={"entities": entities},
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error extracting entities: {e}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=False,
            message=f"Error extracting entities: {str(e)}",
            processing_time=processing_time
        )

@app.post("/api/v1/classify-document", response_model=ProcessingResult)
async def classify_clinical_document(request: DocumentClassificationRequest) -> ProcessingResult:
    """
    Classifica um documento clínico
    """
    start_time = datetime.now()
    
    try:
        if not document_classifier:
            raise HTTPException(status_code=503, detail="Document classifier not initialized")
        
        logger.info("Classifying clinical document")
        
        # Classificar documento
        classification = await document_classifier.classify_document(
            request.text,
            include_categories=request.include_categories
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=True,
            message="Document classified successfully",
            data={"classification": classification},
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error classifying document: {e}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=False,
            message=f"Error classifying document: {str(e)}",
            processing_time=processing_time
        )

@app.post("/api/v1/summarize", response_model=ProcessingResult)
async def summarize_clinical_text(request: SummarizationRequest) -> ProcessingResult:
    """
    Sumariza texto clínico
    """
    start_time = datetime.now()
    
    try:
        if not clinical_summarizer:
            raise HTTPException(status_code=503, detail="Clinical summarizer not initialized")
        
        logger.info("Summarizing clinical text")
        
        # Sumarizar texto
        summary = await clinical_summarizer.summarize_text(
            request.text,
            max_length=request.max_length,
            summary_type=request.summary_type
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=True,
            message="Text summarized successfully",
            data={"summary": summary},
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error summarizing text: {e}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=False,
            message=f"Error summarizing text: {str(e)}",
            processing_time=processing_time
        )

@app.post("/api/v1/extract-structured", response_model=ProcessingResult)
async def extract_structured_data(request: StructuredExtractionRequest) -> ProcessingResult:
    """
    Extrai dados estruturados de texto não estruturado
    """
    start_time = datetime.now()
    
    try:
        if not structured_extractor:
            raise HTTPException(status_code=503, detail="Structured extractor not initialized")
        
        logger.info("Extracting structured data")
        
        # Extrair dados estruturados
        structured_data = await structured_extractor.extract_structured_data(
            request.text,
            output_format=request.output_format,
            template=request.template
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=True,
            message="Structured data extracted successfully",
            data={"structured_data": structured_data},
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error extracting structured data: {e}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=False,
            message=f"Error extracting structured data: {str(e)}",
            processing_time=processing_time
        )

@app.post("/api/v1/batch-process", response_model=ProcessingResult)
async def batch_process_notes(
    notes: List[ClinicalNote],
    background_tasks: BackgroundTasks
) -> ProcessingResult:
    """
    Processa múltiplas notas clínicas em lote
    """
    start_time = datetime.now()
    
    try:
        if not clinical_processor:
            raise HTTPException(status_code=503, detail="Clinical processor not initialized")
        
        logger.info(f"Starting batch processing of {len(notes)} notes")
        
        # Processar em background
        batch_id = str(uuid.uuid4())
        background_tasks.add_task(
            process_notes_batch,
            notes,
            batch_id
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=True,
            message=f"Batch processing started for {len(notes)} notes",
            data={
                "batch_id": batch_id,
                "note_count": len(notes),
                "status": "processing"
            },
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error starting batch processing: {e}")
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return ProcessingResult(
            success=False,
            message=f"Error starting batch processing: {str(e)}",
            processing_time=processing_time
        )

async def process_notes_batch(notes: List[ClinicalNote], batch_id: str):
    """
    Processa lote de notas em background
    """
    logger.info(f"Processing batch {batch_id} with {len(notes)} notes")
    
    results = []
    
    for note in notes:
        try:
            result = await clinical_processor.process_clinical_note(
                note.content,
                note_type=note.note_type,
                patient_id=note.patient_id,
                metadata=note.metadata
            )
            
            results.append({
                "note_id": note.id,
                "status": "success",
                "result": result
            })
            
        except Exception as e:
            logger.error(f"Error processing note {note.id}: {e}")
            results.append({
                "note_id": note.id,
                "status": "error",
                "error": str(e)
            })
    
    # Salvar resultados (aqui você salvaria em banco de dados)
    logger.info(f"Batch {batch_id} completed. {len(results)} notes processed")

@app.get("/api/v1/models")
async def get_available_models():
    """
    Retorna informações sobre modelos disponíveis
    """
    try:
        models_info = {
            "clinical_nlp": {
                "status": "loaded" if clinical_processor and clinical_processor.is_initialized else "not_loaded",
                "capabilities": [
                    "entity_extraction",
                    "sentiment_analysis", 
                    "urgency_detection",
                    "medical_classification"
                ]
            },
            "document_classifier": {
                "status": "loaded" if document_classifier and document_classifier.is_initialized else "not_loaded",
                "categories": [
                    "admission_note",
                    "discharge_summary",
                    "progress_note",
                    "consultation",
                    "procedure_note",
                    "laboratory_report"
                ]
            },
            "entity_extractor": {
                "status": "loaded" if entity_extractor and entity_extractor.is_initialized else "not_loaded",
                "entity_types": [
                    "medication",
                    "condition",
                    "symptom",
                    "procedure",
                    "anatomy",
                    "lab_test",
                    "vital_sign"
                ]
            },
            "clinical_summarizer": {
                "status": "loaded" if clinical_summarizer and clinical_summarizer.is_initialized else "not_loaded",
                "summary_types": [
                    "extractive",
                    "abstractive",
                    "keywords",
                    "bullet_points"
                ]
            }
        }
        
        return {
            "models": models_info,
            "service_status": "operational",
            "last_updated": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Error getting models info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/metrics")
async def get_service_metrics():
    """
    Retorna métricas do serviço
    """
    try:
        # Aqui você implementaria coleta de métricas reais
        metrics = {
            "requests_processed": 0,
            "average_processing_time": 0.0,
            "error_rate": 0.0,
            "models_loaded": sum(1 for processor in [
                clinical_processor, document_classifier, 
                entity_extractor, clinical_summarizer, structured_extractor
            ] if processor and getattr(processor, 'is_initialized', False)),
            "memory_usage": "N/A",
            "cpu_usage": "N/A",
            "last_updated": datetime.now()
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )