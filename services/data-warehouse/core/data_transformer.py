"""
Data Transformer
Sistema de transformação de dados para o data warehouse
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Callable, Union
import logging
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class TransformationRule:
    """Regra de transformação"""
    name: str
    source_field: str
    target_field: str
    transformation_type: str
    parameters: Dict[str, Any]
    condition: Optional[str] = None
    priority: int = 1

class DataTransformer:
    """Transformador de dados para o data warehouse"""
    
    def __init__(self):
        self.is_active = False
        self.transformation_functions = {}
        self.validation_rules = {}
        self.data_mappings = {}
        
    async def initialize(self):
        """Inicializa o transformador de dados"""
        try:
            logger.info("Initializing Data Transformer...")
            
            # Register transformation functions
            await self._register_transformation_functions()
            
            # Setup validation rules
            await self._setup_validation_rules()
            
            # Define data mappings
            await self._define_data_mappings()
            
            self.is_active = True
            logger.info("Data Transformer initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Data Transformer: {e}")
            raise
    
    async def transform_data(
        self, 
        source_data: List[Dict[str, Any]], 
        target_schema: str,
        transformation_rules: Optional[List[TransformationRule]] = None
    ) -> List[Dict[str, Any]]:
        """Transforma dados de acordo com esquema de destino"""
        try:
            logger.info(f"Starting data transformation for schema: {target_schema}")
            
            if not source_data:
                return []
            
            # Get default transformation rules if not provided
            if not transformation_rules:
                transformation_rules = await self._get_default_transformation_rules(target_schema)
            
            transformed_data = []
            
            for record in source_data:
                try:
                    transformed_record = await self._transform_record(record, transformation_rules, target_schema)
                    
                    # Validate transformed record
                    if await self._validate_record(transformed_record, target_schema):
                        transformed_data.append(transformed_record)
                    else:
                        logger.warning(f"Record validation failed for schema {target_schema}")
                        
                except Exception as e:
                    logger.error(f"Error transforming record: {e}")
                    continue
            
            logger.info(f"Transformation completed: {len(transformed_data)} records transformed for {target_schema}")
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error in data transformation: {e}")
            raise
    
    async def apply_business_rules(
        self, 
        data: List[Dict[str, Any]], 
        business_rules: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Aplica regras de negócio aos dados"""
        try:
            processed_data = []
            
            for record in data:
                processed_record = record.copy()
                
                # Apply each business rule
                for rule_name, rule_config in business_rules.items():
                    processed_record = await self._apply_business_rule(
                        processed_record, rule_name, rule_config
                    )
                
                processed_data.append(processed_record)
            
            return processed_data
            
        except Exception as e:
            logger.error(f"Error applying business rules: {e}")
            raise
    
    async def clean_data(self, data: List[Dict[str, Any]], cleaning_rules: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Limpa e padroniza dados"""
        try:
            cleaned_data = []
            
            for record in data:
                cleaned_record = await self._clean_record(record, cleaning_rules)
                if cleaned_record:  # Only add if record is valid after cleaning
                    cleaned_data.append(cleaned_record)
            
            logger.info(f"Data cleaning completed: {len(cleaned_data)} records retained from {len(data)} original records")
            return cleaned_data
            
        except Exception as e:
            logger.error(f"Error cleaning data: {e}")
            raise
    
    async def enrich_data(
        self, 
        data: List[Dict[str, Any]], 
        enrichment_sources: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Enriquece dados com informações adicionais"""
        try:
            enriched_data = []
            
            for record in data:
                enriched_record = record.copy()
                
                # Apply each enrichment
                for source_name, source_config in enrichment_sources.items():
                    enriched_record = await self._enrich_record(
                        enriched_record, source_name, source_config
                    )
                
                enriched_data.append(enriched_record)
            
            return enriched_data
            
        except Exception as e:
            logger.error(f"Error enriching data: {e}")
            raise
    
    async def _transform_record(
        self, 
        record: Dict[str, Any], 
        transformation_rules: List[TransformationRule],
        target_schema: str
    ) -> Dict[str, Any]:
        """Transforma um registro individual"""
        try:
            transformed_record = {}
            
            # Sort rules by priority
            sorted_rules = sorted(transformation_rules, key=lambda x: x.priority)
            
            for rule in sorted_rules:
                # Check condition if specified
                if rule.condition and not await self._evaluate_condition(record, rule.condition):
                    continue
                
                # Get source value
                source_value = self._get_nested_value(record, rule.source_field)
                
                # Apply transformation
                transformation_func = self.transformation_functions.get(rule.transformation_type)
                if transformation_func:
                    transformed_value = await transformation_func(source_value, rule.parameters)
                    self._set_nested_value(transformed_record, rule.target_field, transformed_value)
                else:
                    # Direct mapping if no transformation function
                    self._set_nested_value(transformed_record, rule.target_field, source_value)
            
            # Add metadata
            transformed_record["_source_system"] = record.get("_source_system", "unknown")
            transformed_record["_transformed_at"] = datetime.now(timezone.utc).isoformat()
            transformed_record["_target_schema"] = target_schema
            
            return transformed_record
            
        except Exception as e:
            logger.error(f"Error transforming record: {e}")
            raise
    
    async def _validate_record(self, record: Dict[str, Any], schema: str) -> bool:
        """Valida um registro transformado"""
        try:
            validation_rules = self.validation_rules.get(schema, {})
            
            # Check required fields
            required_fields = validation_rules.get("required_fields", [])
            for field in required_fields:
                if not self._get_nested_value(record, field):
                    logger.warning(f"Required field {field} missing in record")
                    return False
            
            # Check data types
            type_validations = validation_rules.get("type_validations", {})
            for field, expected_type in type_validations.items():
                value = self._get_nested_value(record, field)
                if value is not None and not isinstance(value, expected_type):
                    logger.warning(f"Field {field} has invalid type. Expected {expected_type}, got {type(value)}")
                    return False
            
            # Check value ranges
            range_validations = validation_rules.get("range_validations", {})
            for field, (min_val, max_val) in range_validations.items():
                value = self._get_nested_value(record, field)
                if value is not None and (value < min_val or value > max_val):
                    logger.warning(f"Field {field} value {value} outside valid range [{min_val}, {max_val}]")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating record: {e}")
            return False
    
    async def _register_transformation_functions(self):
        """Registra funções de transformação"""
        
        async def string_transform(value: Any, params: Dict[str, Any]) -> str:
            """Transformações de string"""
            if value is None:
                return params.get("default", "")
            
            str_value = str(value)
            
            # Apply string operations
            if params.get("uppercase"):
                str_value = str_value.upper()
            elif params.get("lowercase"):
                str_value = str_value.lower()
            elif params.get("title_case"):
                str_value = str_value.title()
            
            # Trim whitespace
            if params.get("trim", True):
                str_value = str_value.strip()
            
            # Replace patterns
            if "replace" in params:
                for old, new in params["replace"].items():
                    str_value = str_value.replace(old, new)
            
            # Regex replacements
            if "regex_replace" in params:
                for pattern, replacement in params["regex_replace"].items():
                    str_value = re.sub(pattern, replacement, str_value)
            
            # Truncate if needed
            max_length = params.get("max_length")
            if max_length and len(str_value) > max_length:
                str_value = str_value[:max_length]
            
            return str_value
        
        async def numeric_transform(value: Any, params: Dict[str, Any]) -> Union[int, float]:
            """Transformações numéricas"""
            if value is None:
                return params.get("default", 0)
            
            try:
                # Convert to number
                if params.get("type") == "int":
                    numeric_value = int(float(value))
                else:
                    numeric_value = float(value)
                
                # Apply mathematical operations
                if "multiply" in params:
                    numeric_value *= params["multiply"]
                
                if "add" in params:
                    numeric_value += params["add"]
                
                if "round" in params:
                    numeric_value = round(numeric_value, params["round"])
                
                # Apply range constraints
                min_val = params.get("min")
                max_val = params.get("max")
                
                if min_val is not None:
                    numeric_value = max(numeric_value, min_val)
                
                if max_val is not None:
                    numeric_value = min(numeric_value, max_val)
                
                return numeric_value
                
            except (ValueError, TypeError):
                logger.warning(f"Could not convert {value} to numeric")
                return params.get("default", 0)
        
        async def date_transform(value: Any, params: Dict[str, Any]) -> str:
            """Transformações de data"""
            if value is None:
                return params.get("default", datetime.now(timezone.utc).isoformat())
            
            try:
                # Parse input date
                if isinstance(value, str):
                    # Try different date formats
                    formats = params.get("input_formats", [
                        "%Y-%m-%d",
                        "%Y-%m-%d %H:%M:%S",
                        "%Y-%m-%dT%H:%M:%S",
                        "%d/%m/%Y",
                        "%m/%d/%Y"
                    ])
                    
                    date_obj = None
                    for fmt in formats:
                        try:
                            date_obj = datetime.strptime(value, fmt)
                            break
                        except ValueError:
                            continue
                    
                    if not date_obj:
                        raise ValueError(f"Could not parse date: {value}")
                        
                elif isinstance(value, datetime):
                    date_obj = value
                else:
                    raise ValueError(f"Invalid date type: {type(value)}")
                
                # Add timezone if not present
                if date_obj.tzinfo is None:
                    date_obj = date_obj.replace(tzinfo=timezone.utc)
                
                # Format output
                output_format = params.get("output_format", "%Y-%m-%d")
                return date_obj.strftime(output_format)
                
            except Exception as e:
                logger.warning(f"Could not transform date {value}: {e}")
                return params.get("default", datetime.now(timezone.utc).isoformat())
        
        async def lookup_transform(value: Any, params: Dict[str, Any]) -> Any:
            """Transformação por lookup/mapeamento"""
            if value is None:
                return params.get("default")
            
            lookup_table = params.get("lookup_table", {})
            return lookup_table.get(str(value), params.get("default", value))
        
        async def concatenate_transform(value: Any, params: Dict[str, Any]) -> str:
            """Concatena campos"""
            fields = params.get("fields", [])
            separator = params.get("separator", " ")
            
            values = []
            if isinstance(value, dict):
                for field in fields:
                    field_value = self._get_nested_value(value, field)
                    if field_value:
                        values.append(str(field_value))
            else:
                values = [str(value)] if value else []
            
            return separator.join(values)
        
        async def conditional_transform(value: Any, params: Dict[str, Any]) -> Any:
            """Transformação condicional"""
            conditions = params.get("conditions", [])
            
            for condition in conditions:
                condition_expr = condition.get("condition")
                if condition_expr and await self._evaluate_simple_condition(value, condition_expr):
                    return condition.get("value")
            
            return params.get("default", value)
        
        # Register all transformation functions
        self.transformation_functions = {
            "string": string_transform,
            "numeric": numeric_transform,
            "date": date_transform,
            "lookup": lookup_transform,
            "concatenate": concatenate_transform,
            "conditional": conditional_transform
        }
    
    async def _setup_validation_rules(self):
        """Configura regras de validação para cada esquema"""
        
        self.validation_rules = {
            "dim_patient": {
                "required_fields": ["patient_id", "patient_key"],
                "type_validations": {
                    "patient_key": int,
                    "patient_id": str,
                    "birth_date": str
                },
                "range_validations": {
                    "patient_key": (1, 999999999)
                }
            },
            "dim_provider": {
                "required_fields": ["provider_id", "provider_key"],
                "type_validations": {
                    "provider_key": int,
                    "provider_id": str,
                    "years_experience": int
                },
                "range_validations": {
                    "provider_key": (1, 999999999),
                    "years_experience": (0, 50)
                }
            },
            "fact_encounter": {
                "required_fields": ["encounter_id", "patient_key"],
                "type_validations": {
                    "patient_key": int,
                    "duration_minutes": (int, float),
                    "cost_amount": (int, float)
                },
                "range_validations": {
                    "duration_minutes": (1, 1440),  # 1 minute to 24 hours
                    "cost_amount": (0, 50000)  # Max $50K per encounter
                }
            },
            "fact_vital_signs": {
                "required_fields": ["patient_key"],
                "type_validations": {
                    "patient_key": int,
                    "heart_rate": (int, float),
                    "temperature_celsius": (int, float)
                },
                "range_validations": {
                    "heart_rate": (30, 200),
                    "blood_pressure_systolic": (60, 250),
                    "temperature_celsius": (30.0, 45.0),
                    "oxygen_saturation": (70, 100)
                }
            }
        }
    
    async def _define_data_mappings(self):
        """Define mapeamentos de dados padrão"""
        
        self.data_mappings = {
            "fhir_to_patient": {
                "resourceType": "resource_type",
                "id": "patient_id",
                "name.0.given.0": "first_name",
                "name.0.family": "last_name",
                "gender": "gender",
                "birthDate": "birth_date",
                "address.0.city": "city",
                "address.0.state": "state",
                "address.0.postalCode": "zip_code"
            },
            "monitoring_to_vital_signs": {
                "patient_id": "patient_id",
                "heart_rate": "heart_rate",
                "blood_pressure.systolic": "blood_pressure_systolic",
                "blood_pressure.diastolic": "blood_pressure_diastolic",
                "temperature": "temperature_celsius",
                "oxygen_saturation": "oxygen_saturation",
                "timestamp": "measurement_timestamp"
            }
        }
    
    async def _get_default_transformation_rules(self, target_schema: str) -> List[TransformationRule]:
        """Obtém regras de transformação padrão para um esquema"""
        
        rules_by_schema = {
            "dim_patient": [
                TransformationRule(
                    name="patient_key_generation",
                    source_field="patient_id",
                    target_field="patient_key",
                    transformation_type="numeric",
                    parameters={"type": "int", "multiply": 1000, "add": 1}
                ),
                TransformationRule(
                    name="name_standardization",
                    source_field="name",
                    target_field="full_name",
                    transformation_type="string",
                    parameters={"title_case": True, "trim": True}
                ),
                TransformationRule(
                    name="status_default",
                    source_field="status",
                    target_field="status",
                    transformation_type="lookup",
                    parameters={"default": "active", "lookup_table": {"1": "active", "0": "inactive"}}
                )
            ],
            "fact_encounter": [
                TransformationRule(
                    name="duration_validation",
                    source_field="duration_minutes",
                    target_field="duration_minutes",
                    transformation_type="numeric",
                    parameters={"type": "int", "min": 1, "max": 1440, "default": 30}
                ),
                TransformationRule(
                    name="cost_formatting",
                    source_field="cost_amount",
                    target_field="cost_amount",
                    transformation_type="numeric",
                    parameters={"type": "float", "round": 2, "min": 0}
                )
            ],
            "fact_vital_signs": [
                TransformationRule(
                    name="heart_rate_validation",
                    source_field="heart_rate",
                    target_field="heart_rate",
                    transformation_type="numeric",
                    parameters={"type": "int", "min": 30, "max": 200}
                ),
                TransformationRule(
                    name="temperature_conversion",
                    source_field="temperature",
                    target_field="temperature_celsius",
                    transformation_type="numeric",
                    parameters={"type": "float", "round": 1}
                )
            ]
        }
        
        return rules_by_schema.get(target_schema, [])
    
    def _get_nested_value(self, data: Dict[str, Any], field_path: str) -> Any:
        """Obtém valor de campo aninhado usando notação de ponto"""
        try:
            keys = field_path.split(".")
            value = data
            
            for key in keys:
                if isinstance(value, dict):
                    value = value.get(key)
                elif isinstance(value, list) and key.isdigit():
                    index = int(key)
                    value = value[index] if index < len(value) else None
                else:
                    return None
                
                if value is None:
                    break
            
            return value
            
        except (KeyError, IndexError, ValueError):
            return None
    
    def _set_nested_value(self, data: Dict[str, Any], field_path: str, value: Any):
        """Define valor de campo aninhado usando notação de ponto"""
        try:
            keys = field_path.split(".")
            current = data
            
            for i, key in enumerate(keys[:-1]):
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            current[keys[-1]] = value
            
        except Exception as e:
            logger.error(f"Error setting nested value {field_path}: {e}")
    
    async def _evaluate_condition(self, record: Dict[str, Any], condition: str) -> bool:
        """Avalia condição simples"""
        try:
            # Simple condition evaluation - would be more sophisticated in production
            if "==" in condition:
                field, expected_value = condition.split("==")
                field = field.strip()
                expected_value = expected_value.strip().strip('"\'')
                actual_value = str(self._get_nested_value(record, field) or "")
                return actual_value == expected_value
            
            return True
            
        except Exception:
            return True
    
    async def _evaluate_simple_condition(self, value: Any, condition: str) -> bool:
        """Avalia condição simples para um valor"""
        try:
            if condition.startswith(">"):
                threshold = float(condition[1:])
                return float(value or 0) > threshold
            elif condition.startswith("<"):
                threshold = float(condition[1:])
                return float(value or 0) < threshold
            elif condition.startswith("=="):
                expected = condition[2:].strip().strip('"\'')
                return str(value or "") == expected
            
            return True
            
        except Exception:
            return False
    
    async def _apply_business_rule(
        self, 
        record: Dict[str, Any], 
        rule_name: str, 
        rule_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Aplica regra de negócio específica"""
        # Placeholder for business rule implementations
        return record
    
    async def _clean_record(self, record: Dict[str, Any], cleaning_rules: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Limpa um registro individual"""
        try:
            cleaned_record = record.copy()
            
            # Remove null/empty values if specified
            if cleaning_rules.get("remove_nulls"):
                cleaned_record = {k: v for k, v in cleaned_record.items() if v is not None and v != ""}
            
            # Apply field-specific cleaning
            field_rules = cleaning_rules.get("fields", {})
            for field, rules in field_rules.items():
                if field in cleaned_record:
                    value = cleaned_record[field]
                    
                    # String cleaning
                    if isinstance(value, str):
                        if rules.get("trim"):
                            value = value.strip()
                        if rules.get("remove_special_chars"):
                            value = re.sub(r'[^\w\s-]', '', value)
                    
                    cleaned_record[field] = value
            
            return cleaned_record
            
        except Exception as e:
            logger.error(f"Error cleaning record: {e}")
            return None
    
    async def _enrich_record(
        self, 
        record: Dict[str, Any], 
        source_name: str, 
        source_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enriquece um registro com dados de uma fonte"""
        # Placeholder for data enrichment implementations
        return record