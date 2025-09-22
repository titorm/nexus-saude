"""
FHIR Bundle Validator
Validador para recursos Bundle FHIR R4
"""

import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

class BundleValidator:
    """Validador de recursos Bundle FHIR"""
    
    def __init__(self):
        self.is_initialized = False
        self.supported_bundle_types = [
            "document", "message", "transaction", "transaction-response",
            "batch", "batch-response", "history", "searchset", "collection"
        ]
        self.supported_http_methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH"]
    
    async def initialize(self):
        """Inicializa o validador de Bundle"""
        try:
            logger.info("Initializing Bundle Validator...")
            self.is_initialized = True
            logger.info("Bundle Validator initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Bundle Validator: {e}")
            self.is_initialized = True
    
    async def validate_bundle(self, bundle_data: Dict[str, Any]) -> bool:
        """Valida um Bundle FHIR"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Validações básicas do Bundle
            await self._validate_bundle_structure(bundle_data)
            
            # Validar entradas do Bundle
            if "entry" in bundle_data:
                await self._validate_bundle_entries(bundle_data["entry"], bundle_data.get("type"))
            
            # Validações específicas por tipo de Bundle
            bundle_type = bundle_data.get("type")
            if bundle_type == "transaction":
                await self._validate_transaction_bundle(bundle_data)
            elif bundle_type == "batch":
                await self._validate_batch_bundle(bundle_data)
            elif bundle_type == "document":
                await self._validate_document_bundle(bundle_data)
            elif bundle_type == "message":
                await self._validate_message_bundle(bundle_data)
            elif bundle_type == "searchset":
                await self._validate_searchset_bundle(bundle_data)
            
            logger.info(f"Bundle validation successful for type: {bundle_type}")
            return True
            
        except Exception as e:
            logger.error(f"Bundle validation error: {e}")
            raise ValueError(f"Bundle validation failed: {e}")
    
    async def _validate_bundle_structure(self, bundle_data: Dict[str, Any]):
        """Valida estrutura básica do Bundle"""
        
        # Verificar se é um dicionário
        if not isinstance(bundle_data, dict):
            raise ValueError("Bundle must be a JSON object")
        
        # Verificar resourceType
        if "resourceType" not in bundle_data:
            raise ValueError("Bundle must have a resourceType")
        
        if bundle_data["resourceType"] != "Bundle":
            raise ValueError(f"Invalid resourceType for Bundle: {bundle_data['resourceType']}")
        
        # Verificar type (obrigatório)
        if "type" not in bundle_data:
            raise ValueError("Bundle must have a type")
        
        bundle_type = bundle_data["type"]
        if bundle_type not in self.supported_bundle_types:
            raise ValueError(f"Unsupported bundle type: {bundle_type}")
        
        # Validar ID se presente
        if "id" in bundle_data:
            if not isinstance(bundle_data["id"], str):
                raise ValueError("Bundle.id must be a string")
        
        # Validar meta se presente
        if "meta" in bundle_data:
            await self._validate_bundle_meta(bundle_data["meta"])
        
        # Validar identifier se presente
        if "identifier" in bundle_data:
            await self._validate_bundle_identifier(bundle_data["identifier"])
        
        # Validar timestamp se presente
        if "timestamp" in bundle_data:
            await self._validate_timestamp(bundle_data["timestamp"])
        
        # Validar total se presente
        if "total" in bundle_data:
            if not isinstance(bundle_data["total"], int) or bundle_data["total"] < 0:
                raise ValueError("Bundle.total must be a non-negative integer")
        
        # Validar link se presente
        if "link" in bundle_data:
            await self._validate_bundle_links(bundle_data["link"])
    
    async def _validate_bundle_meta(self, meta: Dict[str, Any]):
        """Valida meta do Bundle"""
        if not isinstance(meta, dict):
            raise ValueError("Bundle.meta must be an object")
        
        if "lastUpdated" in meta:
            await self._validate_timestamp(meta["lastUpdated"])
    
    async def _validate_bundle_identifier(self, identifier: Dict[str, Any]):
        """Valida identifier do Bundle"""
        if not isinstance(identifier, dict):
            raise ValueError("Bundle.identifier must be an object")
        
        if "system" in identifier and not isinstance(identifier["system"], str):
            raise ValueError("Bundle.identifier.system must be a string")
        
        if "value" in identifier and not isinstance(identifier["value"], str):
            raise ValueError("Bundle.identifier.value must be a string")
    
    async def _validate_timestamp(self, timestamp: str):
        """Valida timestamp"""
        if not isinstance(timestamp, str):
            raise ValueError("Timestamp must be a string")
        
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError(f"Invalid timestamp format: {timestamp}")
    
    async def _validate_bundle_links(self, links: List[Dict[str, Any]]):
        """Valida links do Bundle"""
        if not isinstance(links, list):
            raise ValueError("Bundle.link must be an array")
        
        for link in links:
            if not isinstance(link, dict):
                raise ValueError("Bundle.link items must be objects")
            
            if "relation" not in link:
                raise ValueError("Bundle.link must have a relation")
            
            if "url" not in link:
                raise ValueError("Bundle.link must have a url")
            
            if not isinstance(link["url"], str):
                raise ValueError("Bundle.link.url must be a string")
    
    async def _validate_bundle_entries(self, entries: List[Dict[str, Any]], bundle_type: str):
        """Valida entradas do Bundle"""
        if not isinstance(entries, list):
            raise ValueError("Bundle.entry must be an array")
        
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                raise ValueError(f"Bundle.entry[{i}] must be an object")
            
            await self._validate_bundle_entry(entry, bundle_type, i)
    
    async def _validate_bundle_entry(self, entry: Dict[str, Any], bundle_type: str, index: int):
        """Valida uma entrada do Bundle"""
        
        # Validar fullUrl se presente
        if "fullUrl" in entry:
            if not isinstance(entry["fullUrl"], str):
                raise ValueError(f"Bundle.entry[{index}].fullUrl must be a string")
        
        # Validar resource se presente
        if "resource" in entry:
            await self._validate_entry_resource(entry["resource"], index)
        
        # Validar search se presente (para searchset bundles)
        if "search" in entry:
            await self._validate_entry_search(entry["search"], index)
        
        # Validar request se presente (para transaction/batch bundles)
        if "request" in entry:
            await self._validate_entry_request(entry["request"], bundle_type, index)
        
        # Validar response se presente (para response bundles)
        if "response" in entry:
            await self._validate_entry_response(entry["response"], index)
        
        # Validações específicas por tipo de Bundle
        if bundle_type in ["transaction", "batch"]:
            if "request" not in entry:
                raise ValueError(f"Bundle.entry[{index}] must have a request for {bundle_type} bundles")
        
        if bundle_type in ["transaction-response", "batch-response"]:
            if "response" not in entry:
                raise ValueError(f"Bundle.entry[{index}] must have a response for {bundle_type} bundles")
    
    async def _validate_entry_resource(self, resource: Dict[str, Any], index: int):
        """Valida resource de uma entrada"""
        if not isinstance(resource, dict):
            raise ValueError(f"Bundle.entry[{index}].resource must be an object")
        
        if "resourceType" not in resource:
            raise ValueError(f"Bundle.entry[{index}].resource must have a resourceType")
        
        # Aqui poderia chamar o FHIRValidator para validar o recurso específico
        # Por simplicidade, fazemos apenas validações básicas
    
    async def _validate_entry_search(self, search: Dict[str, Any], index: int):
        """Valida search de uma entrada"""
        if not isinstance(search, dict):
            raise ValueError(f"Bundle.entry[{index}].search must be an object")
        
        if "mode" in search:
            valid_modes = ["match", "include", "outcome"]
            if search["mode"] not in valid_modes:
                raise ValueError(f"Invalid search mode in entry[{index}]: {search['mode']}")
        
        if "score" in search:
            if not isinstance(search["score"], (int, float)) or search["score"] < 0:
                raise ValueError(f"Bundle.entry[{index}].search.score must be a non-negative number")
    
    async def _validate_entry_request(self, request: Dict[str, Any], bundle_type: str, index: int):
        """Valida request de uma entrada"""
        if not isinstance(request, dict):
            raise ValueError(f"Bundle.entry[{index}].request must be an object")
        
        # Validar method (obrigatório)
        if "method" not in request:
            raise ValueError(f"Bundle.entry[{index}].request must have a method")
        
        method = request["method"]
        if method not in self.supported_http_methods:
            raise ValueError(f"Unsupported HTTP method in entry[{index}]: {method}")
        
        # Validar url (obrigatório)
        if "url" not in request:
            raise ValueError(f"Bundle.entry[{index}].request must have a url")
        
        if not isinstance(request["url"], str):
            raise ValueError(f"Bundle.entry[{index}].request.url must be a string")
        
        # Validar ifNoneMatch se presente
        if "ifNoneMatch" in request:
            if not isinstance(request["ifNoneMatch"], str):
                raise ValueError(f"Bundle.entry[{index}].request.ifNoneMatch must be a string")
        
        # Validar ifModifiedSince se presente
        if "ifModifiedSince" in request:
            await self._validate_timestamp(request["ifModifiedSince"])
        
        # Validar ifMatch se presente
        if "ifMatch" in request:
            if not isinstance(request["ifMatch"], str):
                raise ValueError(f"Bundle.entry[{index}].request.ifMatch must be a string")
        
        # Validar ifNoneExist se presente
        if "ifNoneExist" in request:
            if not isinstance(request["ifNoneExist"], str):
                raise ValueError(f"Bundle.entry[{index}].request.ifNoneExist must be a string")
    
    async def _validate_entry_response(self, response: Dict[str, Any], index: int):
        """Valida response de uma entrada"""
        if not isinstance(response, dict):
            raise ValueError(f"Bundle.entry[{index}].response must be an object")
        
        # Validar status (obrigatório)
        if "status" not in response:
            raise ValueError(f"Bundle.entry[{index}].response must have a status")
        
        if not isinstance(response["status"], str):
            raise ValueError(f"Bundle.entry[{index}].response.status must be a string")
        
        # Validar location se presente
        if "location" in response:
            if not isinstance(response["location"], str):
                raise ValueError(f"Bundle.entry[{index}].response.location must be a string")
        
        # Validar etag se presente
        if "etag" in response:
            if not isinstance(response["etag"], str):
                raise ValueError(f"Bundle.entry[{index}].response.etag must be a string")
        
        # Validar lastModified se presente
        if "lastModified" in response:
            await self._validate_timestamp(response["lastModified"])
    
    async def _validate_transaction_bundle(self, bundle_data: Dict[str, Any]):
        """Valida Bundle do tipo transaction"""
        
        # Transaction bundles devem ter entries com requests
        if "entry" not in bundle_data:
            raise ValueError("Transaction bundle must have entries")
        
        entries = bundle_data["entry"]
        if not entries:
            raise ValueError("Transaction bundle must have at least one entry")
        
        # Verificar se todas as entradas têm requests
        for i, entry in enumerate(entries):
            if "request" not in entry:
                raise ValueError(f"Transaction bundle entry[{i}] must have a request")
            
            # Verificar se métodos são apropriados para transação
            method = entry["request"]["method"]
            if method not in ["POST", "PUT", "DELETE", "PATCH"]:
                raise ValueError(f"Transaction bundle entry[{i}] has invalid method for transaction: {method}")
    
    async def _validate_batch_bundle(self, bundle_data: Dict[str, Any]):
        """Valida Bundle do tipo batch"""
        
        # Batch bundles são similares a transaction, mas menos restritivos
        if "entry" not in bundle_data:
            raise ValueError("Batch bundle must have entries")
        
        entries = bundle_data["entry"]
        if not entries:
            raise ValueError("Batch bundle must have at least one entry")
        
        # Verificar se todas as entradas têm requests
        for i, entry in enumerate(entries):
            if "request" not in entry:
                raise ValueError(f"Batch bundle entry[{i}] must have a request")
    
    async def _validate_document_bundle(self, bundle_data: Dict[str, Any]):
        """Valida Bundle do tipo document"""
        
        if "entry" not in bundle_data or not bundle_data["entry"]:
            raise ValueError("Document bundle must have at least one entry")
        
        entries = bundle_data["entry"]
        
        # Primeira entrada deve ser um Composition
        first_entry = entries[0]
        if "resource" not in first_entry:
            raise ValueError("Document bundle first entry must have a resource")
        
        first_resource = first_entry["resource"]
        if first_resource.get("resourceType") != "Composition":
            raise ValueError("Document bundle first entry must be a Composition")
        
        # Todas as entradas devem ter fullUrl
        for i, entry in enumerate(entries):
            if "fullUrl" not in entry:
                raise ValueError(f"Document bundle entry[{i}] must have a fullUrl")
    
    async def _validate_message_bundle(self, bundle_data: Dict[str, Any]):
        """Valida Bundle do tipo message"""
        
        if "entry" not in bundle_data or not bundle_data["entry"]:
            raise ValueError("Message bundle must have at least one entry")
        
        entries = bundle_data["entry"]
        
        # Primeira entrada deve ser um MessageHeader
        first_entry = entries[0]
        if "resource" not in first_entry:
            raise ValueError("Message bundle first entry must have a resource")
        
        first_resource = first_entry["resource"]
        if first_resource.get("resourceType") != "MessageHeader":
            raise ValueError("Message bundle first entry must be a MessageHeader")
        
        # Todas as entradas devem ter fullUrl
        for i, entry in enumerate(entries):
            if "fullUrl" not in entry:
                raise ValueError(f"Message bundle entry[{i}] must have a fullUrl")
    
    async def _validate_searchset_bundle(self, bundle_data: Dict[str, Any]):
        """Valida Bundle do tipo searchset"""
        
        # Searchset bundles devem ter total
        if "total" not in bundle_data:
            raise ValueError("Searchset bundle must have a total")
        
        # Entradas devem ter informações de search se presentes
        if "entry" in bundle_data:
            for i, entry in enumerate(bundle_data["entry"]):
                if "search" in entry:
                    search = entry["search"]
                    if "mode" not in search:
                        raise ValueError(f"Searchset bundle entry[{i}].search must have a mode")
    
    async def validate_bundle_integrity(self, bundle_data: Dict[str, Any]) -> Dict[str, Any]:
        """Valida integridade do Bundle e retorna estatísticas"""
        
        stats = {
            "total_entries": 0,
            "resource_types": {},
            "request_methods": {},
            "validation_errors": [],
            "warnings": []
        }
        
        try:
            if "entry" in bundle_data:
                stats["total_entries"] = len(bundle_data["entry"])
                
                for i, entry in enumerate(bundle_data["entry"]):
                    # Contar tipos de recursos
                    if "resource" in entry:
                        resource_type = entry["resource"].get("resourceType", "Unknown")
                        stats["resource_types"][resource_type] = stats["resource_types"].get(resource_type, 0) + 1
                    
                    # Contar métodos de request
                    if "request" in entry:
                        method = entry["request"].get("method", "Unknown")
                        stats["request_methods"][method] = stats["request_methods"].get(method, 0) + 1
                    
                    # Verificar referências internas
                    await self._check_internal_references(entry, bundle_data, i, stats)
            
            return stats
            
        except Exception as e:
            stats["validation_errors"].append(f"Error during integrity validation: {e}")
            return stats
    
    async def _check_internal_references(self, entry: Dict[str, Any], bundle_data: Dict[str, Any], index: int, stats: Dict[str, Any]):
        """Verifica referências internas no Bundle"""
        
        if "resource" not in entry:
            return
        
        resource = entry["resource"]
        
        # Verificar se há referências a outros recursos no bundle
        # Esta é uma verificação simplificada
        def find_references(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    new_path = f"{path}.{key}" if path else key
                    if key == "reference" and isinstance(value, str):
                        # Verificar se é uma referência interna
                        if not value.startswith("http") and "/" in value:
                            # Buscar se o recurso referenciado existe no bundle
                            referenced_found = False
                            for other_entry in bundle_data.get("entry", []):
                                if other_entry.get("fullUrl", "").endswith(value) or \
                                   (other_entry.get("resource", {}).get("resourceType") + "/" + 
                                    other_entry.get("resource", {}).get("id", "")) == value:
                                    referenced_found = True
                                    break
                            
                            if not referenced_found:
                                stats["warnings"].append(
                                    f"Entry[{index}] has unresolved reference: {value} at {new_path}"
                                )
                    else:
                        find_references(value, new_path)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    find_references(item, f"{path}[{i}]")
        
        find_references(resource)