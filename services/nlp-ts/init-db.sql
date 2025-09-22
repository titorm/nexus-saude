-- NLP Service Database Initialization Script
-- This script creates the necessary tables for the NLP service

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for classification
CREATE TYPE document_type AS ENUM (
  'clinical_note', 'discharge_summary', 'lab_report', 'radiology_report',
  'pathology_report', 'consultation_note', 'operative_note', 'progress_note',
  'history_physical', 'emergency_note', 'prescription', 'referral_letter'
);

CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE entity_type AS ENUM (
  'medication', 'condition', 'procedure', 'anatomy', 'symptom',
  'dosage', 'frequency', 'duration', 'allergy', 'lab_value',
  'vital_sign', 'device', 'provider', 'facility'
);

-- NLP Processing Logs Table
CREATE TABLE IF NOT EXISTS nlp_processing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  operation_type VARCHAR(100) NOT NULL,
  input_text_length INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Document Classification Logs Table
CREATE TABLE IF NOT EXISTS document_classification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  classified_type document_type,
  confidence_score DECIMAL(5,4),
  urgency_level urgency_level,
  specialty_area VARCHAR(100),
  processing_time_ms INTEGER NOT NULL,
  model_version VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Entity Extraction Logs Table
CREATE TABLE IF NOT EXISTS entity_extraction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  entities_found INTEGER DEFAULT 0,
  entity_types VARCHAR(255)[], -- Array of entity types found
  processing_time_ms INTEGER NOT NULL,
  model_version VARCHAR(50),
  confidence_threshold DECIMAL(3,2),
  normalization_enabled BOOLEAN DEFAULT false,
  extracted_entities JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Summarization Logs Table
CREATE TABLE IF NOT EXISTS summarization_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  original_length INTEGER NOT NULL,
  summary_length INTEGER NOT NULL,
  compression_ratio DECIMAL(5,4),
  summary_type VARCHAR(50), -- 'extractive' or 'abstractive'
  processing_time_ms INTEGER NOT NULL,
  model_version VARCHAR(50),
  key_phrases TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Structured Data Extraction Logs Table
CREATE TABLE IF NOT EXISTS structured_extraction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  fields_extracted VARCHAR(255)[], -- Array of extracted field names
  extraction_confidence DECIMAL(5,4),
  processing_time_ms INTEGER NOT NULL,
  template_used VARCHAR(100),
  structured_data JSONB DEFAULT '{}',
  validation_errors TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nlp_processing_logs_document_id ON nlp_processing_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_nlp_processing_logs_user_id ON nlp_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_nlp_processing_logs_created_at ON nlp_processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_nlp_processing_logs_operation_type ON nlp_processing_logs(operation_type);

CREATE INDEX IF NOT EXISTS idx_document_classification_logs_document_id ON document_classification_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_classification_logs_user_id ON document_classification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_classification_logs_type ON document_classification_logs(classified_type);
CREATE INDEX IF NOT EXISTS idx_document_classification_logs_urgency ON document_classification_logs(urgency_level);
CREATE INDEX IF NOT EXISTS idx_document_classification_logs_created_at ON document_classification_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_entity_extraction_logs_document_id ON entity_extraction_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_entity_extraction_logs_user_id ON entity_extraction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_entity_extraction_logs_created_at ON entity_extraction_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_summarization_logs_document_id ON summarization_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_summarization_logs_user_id ON summarization_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_summarization_logs_created_at ON summarization_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_structured_extraction_logs_document_id ON structured_extraction_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_structured_extraction_logs_user_id ON structured_extraction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_structured_extraction_logs_created_at ON structured_extraction_logs(created_at);

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nlp_processing_logs_updated_at 
    BEFORE UPDATE ON nlp_processing_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();