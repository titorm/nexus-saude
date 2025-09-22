"""
Structured Data Extractor
Extrator de dados estruturados de textos não estruturados
"""

import asyncio
import re
from typing import Dict, List, Any, Optional
import logging
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)

class OutputFormat(Enum):
    """Formatos de saída"""
    JSON = "json"
    XML = "xml"
    CSV = "csv"
    FHIR = "fhir"

class Template(Enum):
    """Templates predefinidos"""
    GENERAL = "general"
    ADMISSION = "admission"
    DISCHARGE = "discharge"
    LAB_REPORT = "lab_report"
    RADIOLOGY = "radiology"
    PROCEDURE = "procedure"

@dataclass
class StructuredData:
    """Dados estruturados extraídos"""
    patient_info: Dict[str, Any]
    clinical_data: Dict[str, Any]
    temporal_data: Dict[str, Any]
    metadata: Dict[str, Any]

class StructuredDataExtractor:
    """Extrator de dados estruturados"""
    
    def __init__(self):
        self.is_initialized = False
        self.extraction_patterns = self._create_extraction_patterns()
        self.templates = self._create_templates()
        self.normalizers = self._create_normalizers()
    
    async def initialize(self):
        """Inicializa o extrator"""
        try:
            logger.info("Initializing Structured Data Extractor...")
            self.is_initialized = True
            logger.info("Structured Data Extractor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize extractor: {e}")
            self.is_initialized = True
    
    async def extract_structured_data(self, 
                                    text: str,
                                    output_format: str = "json",
                                    template: str = "general") -> Dict[str, Any]:
        """Extrai dados estruturados do texto"""
        if not self.is_initialized:
            await self.initialize()
        
        template_enum = Template(template)
        format_enum = OutputFormat(output_format)
        
        # Extrair dados baseado no template
        structured_data = await self._extract_by_template(text, template_enum)
        
        # Formatar saída
        formatted_output = await self._format_output(structured_data, format_enum)
        
        return {
            "structured_data": formatted_output,
            "extraction_metadata": {
                "template_used": template,
                "output_format": output_format,
                "confidence": self._calculate_extraction_confidence(structured_data),
                "completeness": self._calculate_completeness(structured_data, template_enum)
            }
        }
    
    async def _extract_by_template(self, text: str, template: Template) -> StructuredData:
        """Extrai dados baseado no template"""
        
        # Dados básicos sempre extraídos
        patient_info = await self._extract_patient_info(text)
        clinical_data = await self._extract_clinical_data(text)
        temporal_data = await self._extract_temporal_data(text)
        
        # Dados específicos do template
        if template == Template.ADMISSION:
            clinical_data.update(await self._extract_admission_specific(text))
        elif template == Template.DISCHARGE:
            clinical_data.update(await self._extract_discharge_specific(text))
        elif template == Template.LAB_REPORT:
            clinical_data.update(await self._extract_lab_specific(text))
        elif template == Template.RADIOLOGY:
            clinical_data.update(await self._extract_radiology_specific(text))
        elif template == Template.PROCEDURE:
            clinical_data.update(await self._extract_procedure_specific(text))
        
        metadata = {
            "template": template.value,
            "text_length": len(text),
            "extraction_timestamp": "2024-01-01T00:00:00Z"  # Mock timestamp
        }
        
        return StructuredData(
            patient_info=patient_info,
            clinical_data=clinical_data,
            temporal_data=temporal_data,
            metadata=metadata
        )
    
    async def _extract_patient_info(self, text: str) -> Dict[str, Any]:
        """Extrai informações do paciente"""
        patient_info = {}
        
        # Idade
        age_pattern = r'(?:age|idade)[:\s]*(\d+)'
        age_match = re.search(age_pattern, text, re.IGNORECASE)
        if age_match:
            patient_info["age"] = int(age_match.group(1))
        
        # Sexo
        gender_patterns = [
            r'(?:male|masculino|homem|m\b)',
            r'(?:female|feminino|mulher|f\b)'
        ]
        for i, pattern in enumerate(gender_patterns):
            if re.search(pattern, text, re.IGNORECASE):
                patient_info["gender"] = "male" if i == 0 else "female"
                break
        
        # ID do paciente
        id_pattern = r'(?:patient id|id)[:\s]*([A-Z0-9]+)'
        id_match = re.search(id_pattern, text, re.IGNORECASE)
        if id_match:
            patient_info["patient_id"] = id_match.group(1)
        
        # Nome (se mencionado)
        name_pattern = r'(?:patient|nome)[:\s]*([A-Z][a-z]+ [A-Z][a-z]+)'
        name_match = re.search(name_pattern, text, re.IGNORECASE)
        if name_match:
            patient_info["name"] = name_match.group(1)
        
        return patient_info
    
    async def _extract_clinical_data(self, text: str) -> Dict[str, Any]:
        """Extrai dados clínicos gerais"""
        clinical_data = {}
        
        # Sinais vitais
        vital_signs = {}
        
        # Pressão arterial
        bp_pattern = r'(?:BP|blood pressure)[:\s]*(\d+/\d+)'
        bp_match = re.search(bp_pattern, text, re.IGNORECASE)
        if bp_match:
            vital_signs["blood_pressure"] = bp_match.group(1)
        
        # Frequência cardíaca
        hr_pattern = r'(?:HR|heart rate)[:\s]*(\d+)'
        hr_match = re.search(hr_pattern, text, re.IGNORECASE)
        if hr_match:
            vital_signs["heart_rate"] = int(hr_match.group(1))
        
        # Temperatura
        temp_pattern = r'(?:temp|temperature)[:\s]*(\d+\.?\d*)'
        temp_match = re.search(temp_pattern, text, re.IGNORECASE)
        if temp_match:
            vital_signs["temperature"] = float(temp_match.group(1))
        
        if vital_signs:
            clinical_data["vital_signs"] = vital_signs
        
        # Medicações
        medications = []
        med_patterns = [
            r'\b\w+(?:cillin|mycin|prazole|sartan|olol|pril)\b',
            r'\b(?:aspirin|ibuprofen|acetaminophen|metformin)\b'
        ]
        
        for pattern in med_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                medications.append(match.group())
        
        if medications:
            clinical_data["medications"] = list(set(medications))
        
        # Diagnósticos
        diagnoses = []
        diagnosis_pattern = r'(?:diagnosis|diagnóstico)[:\s]*([^.\n]+)'
        diagnosis_match = re.search(diagnosis_pattern, text, re.IGNORECASE)
        if diagnosis_match:
            diagnoses.append(diagnosis_match.group(1).strip())
        
        if diagnoses:
            clinical_data["diagnoses"] = diagnoses
        
        # Alergias
        allergy_pattern = r'(?:allerg|alergia)[^.\n]*?([^.\n]+)'
        allergy_match = re.search(allergy_pattern, text, re.IGNORECASE)
        if allergy_match:
            clinical_data["allergies"] = [allergy_match.group(1).strip()]
        
        return clinical_data
    
    async def _extract_temporal_data(self, text: str) -> Dict[str, Any]:
        """Extrai dados temporais"""
        temporal_data = {}
        
        # Data de admissão
        admission_pattern = r'(?:admission date|data admissão)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        admission_match = re.search(admission_pattern, text, re.IGNORECASE)
        if admission_match:
            temporal_data["admission_date"] = admission_match.group(1)
        
        # Data de alta
        discharge_pattern = r'(?:discharge date|data alta)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})'
        discharge_match = re.search(discharge_pattern, text, re.IGNORECASE)
        if discharge_match:
            temporal_data["discharge_date"] = discharge_match.group(1)
        
        # Duração dos sintomas
        duration_pattern = r'(?:for|há)\s+(\d+)\s+(?:days?|weeks?|months?|dias?|semanas?|meses?)'
        duration_match = re.search(duration_pattern, text, re.IGNORECASE)
        if duration_match:
            temporal_data["symptom_duration"] = duration_match.group(0)
        
        return temporal_data
    
    async def _extract_admission_specific(self, text: str) -> Dict[str, Any]:
        """Extrai dados específicos de nota de admissão"""
        admission_data = {}
        
        # Queixa principal
        cc_pattern = r'(?:chief complaint|cc|queixa principal)[:\s]*([^.\n]+)'
        cc_match = re.search(cc_pattern, text, re.IGNORECASE)
        if cc_match:
            admission_data["chief_complaint"] = cc_match.group(1).strip()
        
        # História da doença atual
        hpi_pattern = r'(?:history of present illness|hpi|história)[:\s]*([^.]{100,})'
        hpi_match = re.search(hpi_pattern, text, re.IGNORECASE | re.DOTALL)
        if hpi_match:
            admission_data["history_present_illness"] = hpi_match.group(1).strip()[:500]
        
        return admission_data
    
    async def _extract_discharge_specific(self, text: str) -> Dict[str, Any]:
        """Extrai dados específicos de resumo de alta"""
        discharge_data = {}
        
        # Curso hospitalar
        course_pattern = r'(?:hospital course|curso)[:\s]*([^.]{100,})'
        course_match = re.search(course_pattern, text, re.IGNORECASE | re.DOTALL)
        if course_match:
            discharge_data["hospital_course"] = course_match.group(1).strip()[:500]
        
        # Instruções de alta
        instructions_pattern = r'(?:discharge instructions|instruções)[:\s]*([^.]{50,})'
        instructions_match = re.search(instructions_pattern, text, re.IGNORECASE | re.DOTALL)
        if instructions_match:
            discharge_data["discharge_instructions"] = instructions_match.group(1).strip()[:300]
        
        # Follow-up
        followup_pattern = r'(?:follow\s*up|seguimento)[:\s]*([^.\n]+)'
        followup_match = re.search(followup_pattern, text, re.IGNORECASE)
        if followup_match:
            discharge_data["follow_up"] = followup_match.group(1).strip()
        
        return discharge_data
    
    async def _extract_lab_specific(self, text: str) -> Dict[str, Any]:
        """Extrai dados específicos de relatório laboratorial"""
        lab_data = {
            "lab_values": {},
            "abnormal_values": []
        }
        
        # Valores laboratoriais
        lab_patterns = {
            "glucose": r'(?:glucose|glicose)[:\s]*(\d+\.?\d*)',
            "hemoglobin": r'(?:hemoglobin|hb|hemoglobina)[:\s]*(\d+\.?\d*)',
            "creatinine": r'(?:creatinine|creatinina)[:\s]*(\d+\.?\d*)',
            "sodium": r'(?:sodium|sódio|na)[:\s]*(\d+\.?\d*)',
            "potassium": r'(?:potassium|potássio|k)[:\s]*(\d+\.?\d*)'
        }
        
        for test_name, pattern in lab_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = float(match.group(1))
                lab_data["lab_values"][test_name] = value
                
                # Verificar se está fora da faixa normal (simplificado)
                if self._is_abnormal_lab_value(test_name, value):
                    lab_data["abnormal_values"].append({
                        "test": test_name,
                        "value": value,
                        "status": "abnormal"
                    })
        
        return lab_data
    
    async def _extract_radiology_specific(self, text: str) -> Dict[str, Any]:
        """Extrai dados específicos de relatório radiológico"""
        radiology_data = {}
        
        # Tipo de exame
        study_pattern = r'(?:ct|mri|xray|ultrasound|tomografia|ressonância)[:\s]*([^.\n]+)'
        study_match = re.search(study_pattern, text, re.IGNORECASE)
        if study_match:
            radiology_data["study_type"] = study_match.group(0).strip()
        
        # Achados
        findings_pattern = r'(?:findings|achados)[:\s]*([^.]{100,})'
        findings_match = re.search(findings_pattern, text, re.IGNORECASE | re.DOTALL)
        if findings_match:
            radiology_data["findings"] = findings_match.group(1).strip()[:500]
        
        # Impressão
        impression_pattern = r'(?:impression|impressão)[:\s]*([^.\n]+)'
        impression_match = re.search(impression_pattern, text, re.IGNORECASE)
        if impression_match:
            radiology_data["impression"] = impression_match.group(1).strip()
        
        return radiology_data
    
    async def _extract_procedure_specific(self, text: str) -> Dict[str, Any]:
        """Extrai dados específicos de nota de procedimento"""
        procedure_data = {}
        
        # Procedimento realizado
        procedure_pattern = r'(?:procedure performed|procedimento)[:\s]*([^.\n]+)'
        procedure_match = re.search(procedure_pattern, text, re.IGNORECASE)
        if procedure_match:
            procedure_data["procedure_performed"] = procedure_match.group(1).strip()
        
        # Indicação
        indication_pattern = r'(?:indication|indicação)[:\s]*([^.\n]+)'
        indication_match = re.search(indication_pattern, text, re.IGNORECASE)
        if indication_match:
            procedure_data["indication"] = indication_match.group(1).strip()
        
        # Complicações
        complications_pattern = r'(?:complications|complicações)[:\s]*([^.\n]+)'
        complications_match = re.search(complications_pattern, text, re.IGNORECASE)
        if complications_match:
            procedure_data["complications"] = complications_match.group(1).strip()
        
        return procedure_data
    
    async def _format_output(self, data: StructuredData, format_type: OutputFormat) -> Any:
        """Formata a saída no formato solicitado"""
        
        if format_type == OutputFormat.JSON:
            return {
                "patient_info": data.patient_info,
                "clinical_data": data.clinical_data,
                "temporal_data": data.temporal_data,
                "metadata": data.metadata
            }
        
        elif format_type == OutputFormat.FHIR:
            # Simplificado - converter para estrutura FHIR básica
            return {
                "resourceType": "Patient",
                "id": data.patient_info.get("patient_id", "unknown"),
                "gender": data.patient_info.get("gender", "unknown"),
                "birthDate": None,  # Não extraído
                "extension": [
                    {
                        "url": "clinical_data",
                        "valueString": json.dumps(data.clinical_data)
                    }
                ]
            }
        
        else:
            # Fallback para JSON
            return {
                "patient_info": data.patient_info,
                "clinical_data": data.clinical_data,
                "temporal_data": data.temporal_data,
                "metadata": data.metadata
            }
    
    def _is_abnormal_lab_value(self, test_name: str, value: float) -> bool:
        """Verifica se valor laboratorial está anormal (simplificado)"""
        normal_ranges = {
            "glucose": (70, 110),
            "hemoglobin": (12, 16),
            "creatinine": (0.7, 1.3),
            "sodium": (135, 145),
            "potassium": (3.5, 5.0)
        }
        
        range_min, range_max = normal_ranges.get(test_name, (0, 999999))
        return value < range_min or value > range_max
    
    def _calculate_extraction_confidence(self, data: StructuredData) -> float:
        """Calcula confiança da extração"""
        total_fields = 0
        filled_fields = 0
        
        for section in [data.patient_info, data.clinical_data, data.temporal_data]:
            for key, value in section.items():
                total_fields += 1
                if value:
                    filled_fields += 1
        
        return filled_fields / total_fields if total_fields > 0 else 0.0
    
    def _calculate_completeness(self, data: StructuredData, template: Template) -> float:
        """Calcula completude baseada no template"""
        required_fields = self.templates.get(template, [])
        
        found_fields = 0
        for field in required_fields:
            if self._field_exists_in_data(field, data):
                found_fields += 1
        
        return found_fields / len(required_fields) if required_fields else 1.0
    
    def _field_exists_in_data(self, field: str, data: StructuredData) -> bool:
        """Verifica se campo existe nos dados"""
        # Simplificado - verificar se campo está em qualquer seção
        all_data = {**data.patient_info, **data.clinical_data, **data.temporal_data}
        return field in all_data and all_data[field] is not None
    
    def _create_extraction_patterns(self) -> Dict[str, str]:
        """Cria padrões de extração"""
        return {
            "date": r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}',
            "age": r'(?:age|idade)[:\s]*(\d+)',
            "medication": r'\b\w+(?:cillin|mycin|prazole)\b',
            "vital_sign": r'(?:BP|HR|temp)[:\s]*(\d+[/]?\d*)'
        }
    
    def _create_templates(self) -> Dict[Template, List[str]]:
        """Cria templates com campos obrigatórios"""
        return {
            Template.GENERAL: ["patient_id", "age", "gender"],
            Template.ADMISSION: ["chief_complaint", "vital_signs", "admission_date"],
            Template.DISCHARGE: ["discharge_date", "medications", "follow_up"],
            Template.LAB_REPORT: ["lab_values", "patient_id"],
            Template.RADIOLOGY: ["study_type", "findings", "impression"],
            Template.PROCEDURE: ["procedure_performed", "indication"]
        }
    
    def _create_normalizers(self) -> Dict[str, callable]:
        """Cria funções de normalização"""
        return {
            "date": lambda x: x.replace("/", "-"),
            "medication": lambda x: x.lower().strip(),
            "gender": lambda x: "male" if x.lower() in ["m", "male", "masculino"] else "female"
        }