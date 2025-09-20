-- Migration: T-306 Advanced Search System
-- Created: 2025-09-20
-- Description: Add search indexes and search history tables with full-text search support

-- Adicionar enum para tipos de entidade de busca
DO $$ BEGIN
    CREATE TYPE search_entity_type AS ENUM ('patient', 'clinical_note', 'appointment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de índices de busca
CREATE TABLE IF NOT EXISTS search_indexes (
    id SERIAL PRIMARY KEY,
    entity_type search_entity_type NOT NULL,
    entity_id INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    search_vector TSVECTOR, -- Para full-text search
    metadata JSONB DEFAULT '{}',
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraints
    UNIQUE(entity_type, entity_id)
);

-- Índices para search_indexes
CREATE INDEX IF NOT EXISTS search_indexes_hospital_type_idx ON search_indexes (hospital_id, entity_type);
CREATE INDEX IF NOT EXISTS search_indexes_entity_idx ON search_indexes (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS search_indexes_search_vector_idx ON search_indexes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS search_indexes_metadata_idx ON search_indexes USING GIN (metadata);
CREATE INDEX IF NOT EXISTS search_indexes_updated_at_idx ON search_indexes (updated_at);

-- Criar tabela de histórico de buscas
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_result_id VARCHAR(100), -- formato: "patient:123"
    hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para search_history
CREATE INDEX IF NOT EXISTS search_history_user_hospital_idx ON search_history (user_id, hospital_id);
CREATE INDEX IF NOT EXISTS search_history_query_idx ON search_history (query);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON search_history (created_at);

-- Função para atualizar search_vector automaticamente
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('portuguese', COALESCE(NEW.title, '')), 'A') ||
                         setweight(to_tsvector('portuguese', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar search_vector
DROP TRIGGER IF EXISTS search_indexes_search_vector_trigger ON search_indexes;
CREATE TRIGGER search_indexes_search_vector_trigger
    BEFORE INSERT OR UPDATE ON search_indexes
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS search_indexes_updated_at_trigger ON search_indexes;
CREATE TRIGGER search_indexes_updated_at_trigger
    BEFORE UPDATE ON search_indexes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para sincronizar índices quando pacientes são criados/atualizados
CREATE OR REPLACE FUNCTION sync_patient_search_index()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM search_indexes 
        WHERE entity_type = 'patient' AND entity_id = OLD.id;
        RETURN OLD;
    END IF;
    
    -- Insert ou Update
    INSERT INTO search_indexes (
        entity_type,
        entity_id,
        title,
        content,
        metadata,
        hospital_id
    ) VALUES (
        'patient',
        NEW.id,
        NEW.full_name,
        CONCAT(NEW.full_name, ' ', COALESCE(NEW.email, ''), ' ', COALESCE(NEW.phone, '')),
        jsonb_build_object(
            'dateOfBirth', NEW.date_of_birth,
            'gender', NEW.gender
        ),
        NEW.hospital_id
    )
    ON CONFLICT (entity_type, entity_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronização de pacientes
DROP TRIGGER IF EXISTS sync_patient_search_trigger ON patients;
CREATE TRIGGER sync_patient_search_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION sync_patient_search_index();

-- Função para sincronizar índices quando notas clínicas são criadas/atualizadas
CREATE OR REPLACE FUNCTION sync_clinical_note_search_index()
RETURNS TRIGGER AS $$
DECLARE
    patient_name TEXT;
    author_name TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM search_indexes 
        WHERE entity_type = 'clinical_note' AND entity_id = OLD.id;
        RETURN OLD;
    END IF;
    
    -- Buscar nomes relacionados
    SELECT p.full_name INTO patient_name 
    FROM patients p WHERE p.id = NEW.patient_id;
    
    SELECT u.name INTO author_name 
    FROM users u WHERE u.id = NEW.author_id;
    
    -- Insert ou Update
    INSERT INTO search_indexes (
        entity_type,
        entity_id,
        title,
        content,
        metadata,
        hospital_id
    ) VALUES (
        'clinical_note',
        NEW.id,
        NEW.title,
        CONCAT(
            NEW.title, ' ',
            NEW.content, ' ',
            COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.symptoms)), ' '), ''), ' ',
            COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.tags)), ' '), '')
        ),
        jsonb_build_object(
            'authorName', author_name,
            'patientName', patient_name,
            'type', NEW.type,
            'priority', NEW.priority,
            'tags', NEW.tags
        ),
        NEW.hospital_id
    )
    ON CONFLICT (entity_type, entity_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronização de notas clínicas
DROP TRIGGER IF EXISTS sync_clinical_note_search_trigger ON clinical_notes;
CREATE TRIGGER sync_clinical_note_search_trigger
    AFTER INSERT OR UPDATE OR DELETE ON clinical_notes
    FOR EACH ROW
    EXECUTE FUNCTION sync_clinical_note_search_index();

-- Função para sincronizar índices quando agendamentos são criados/atualizados
CREATE OR REPLACE FUNCTION sync_appointment_search_index()
RETURNS TRIGGER AS $$
DECLARE
    patient_name TEXT;
    doctor_name TEXT;
    appointment_type_name TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM search_indexes 
        WHERE entity_type = 'appointment' AND entity_id = OLD.id;
        RETURN OLD;
    END IF;
    
    -- Buscar nomes relacionados
    SELECT p.full_name INTO patient_name 
    FROM patients p WHERE p.id = NEW.patient_id;
    
    SELECT u.name INTO doctor_name 
    FROM users u WHERE u.id = NEW.doctor_id;
    
    SELECT at.name INTO appointment_type_name 
    FROM appointment_types at WHERE at.id = NEW.appointment_type_id;
    
    -- Insert ou Update
    INSERT INTO search_indexes (
        entity_type,
        entity_id,
        title,
        content,
        metadata,
        hospital_id
    ) VALUES (
        'appointment',
        NEW.id,
        CONCAT('Consulta: ', patient_name, ' - ', doctor_name),
        CONCAT(
            'Consulta: ', patient_name, ' - ', doctor_name, ' ',
            COALESCE(NEW.reason, ''), ' ',
            COALESCE(NEW.notes, '')
        ),
        jsonb_build_object(
            'doctorName', doctor_name,
            'patientName', patient_name,
            'appointmentType', appointment_type_name,
            'status', NEW.status,
            'scheduledAt', NEW.scheduled_at
        ),
        NEW.hospital_id
    )
    ON CONFLICT (entity_type, entity_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronização de agendamentos
DROP TRIGGER IF EXISTS sync_appointment_search_trigger ON appointments;
CREATE TRIGGER sync_appointment_search_trigger
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION sync_appointment_search_index();

-- Popular índices existentes (executar apenas uma vez)
INSERT INTO search_indexes (entity_type, entity_id, title, content, metadata, hospital_id)
SELECT 
    'patient' as entity_type,
    p.id as entity_id,
    p.full_name as title,
    CONCAT(p.full_name, ' ', COALESCE(p.email, ''), ' ', COALESCE(p.phone, '')) as content,
    jsonb_build_object(
        'dateOfBirth', p.date_of_birth,
        'gender', p.gender
    ) as metadata,
    p.hospital_id
FROM patients p
ON CONFLICT (entity_type, entity_id) DO NOTHING;

INSERT INTO search_indexes (entity_type, entity_id, title, content, metadata, hospital_id)
SELECT 
    'clinical_note' as entity_type,
    cn.id as entity_id,
    cn.title,
    CONCAT(
        cn.title, ' ',
        cn.content, ' ',
        COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(cn.symptoms)), ' '), ''), ' ',
        COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(cn.tags)), ' '), '')
    ) as content,
    jsonb_build_object(
        'authorName', u.name,
        'patientName', p.full_name,
        'type', cn.type,
        'priority', cn.priority,
        'tags', cn.tags
    ) as metadata,
    cn.hospital_id
FROM clinical_notes cn
LEFT JOIN users u ON cn.author_id = u.id
LEFT JOIN patients p ON cn.patient_id = p.id
ON CONFLICT (entity_type, entity_id) DO NOTHING;

INSERT INTO search_indexes (entity_type, entity_id, title, content, metadata, hospital_id)
SELECT 
    'appointment' as entity_type,
    a.id as entity_id,
    CONCAT('Consulta: ', p.full_name, ' - ', u.name) as title,
    CONCAT(
        'Consulta: ', p.full_name, ' - ', u.name, ' ',
        COALESCE(a.reason, ''), ' ',
        COALESCE(a.notes, '')
    ) as content,
    jsonb_build_object(
        'doctorName', u.name,
        'patientName', p.full_name,
        'appointmentType', at.name,
        'status', a.status,
        'scheduledAt', a.scheduled_at
    ) as metadata,
    a.hospital_id
FROM appointments a
LEFT JOIN users u ON a.doctor_id = u.id
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
ON CONFLICT (entity_type, entity_id) DO NOTHING;

-- Comentários sobre o design
COMMENT ON TABLE search_indexes IS 'Índices de busca para full-text search em todas as entidades do sistema';
COMMENT ON COLUMN search_indexes.search_vector IS 'Vector de busca PostgreSQL para pesquisa full-text otimizada';
COMMENT ON COLUMN search_indexes.metadata IS 'Metadados específicos da entidade para exibição nos resultados';

COMMENT ON TABLE search_history IS 'Histórico de buscas dos usuários para analytics e melhorias';
COMMENT ON COLUMN search_history.clicked_result_id IS 'ID do resultado clicado no formato "tipo:id" para tracking de relevância';

-- Configuração de idioma português para full-text search
-- Isso melhora a qualidade da busca para textos em português
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS portuguese_unaccent (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent 
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, portuguese_stem;