-- Migration: Create audit logs table for search system security
-- File: apps/api/src/db/migrations/20240115_create_audit_logs.sql

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  hospital_id INTEGER REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance optimization
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_entity_type_idx ON audit_logs(entity_type);
CREATE INDEX audit_logs_hospital_id_idx ON audit_logs(hospital_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);

-- Index for search-specific queries
CREATE INDEX audit_logs_search_actions_idx ON audit_logs(action) WHERE action LIKE 'search:%';

-- Composite index for hospital-specific audit queries
CREATE INDEX audit_logs_hospital_action_date_idx ON audit_logs(hospital_id, action, created_at);

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all system activities, particularly search operations';
COMMENT ON COLUMN audit_logs.action IS 'Action performed, e.g., search:global_search_completed, search:rate_limit_exceeded';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected by the action, e.g., search, patient, clinical_note';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the specific entity if applicable';
COMMENT ON COLUMN audit_logs.details IS 'JSON object containing action-specific details like query text, result counts, etc.';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address for security tracking';
COMMENT ON COLUMN audit_logs.user_agent IS 'Client user agent string for device/browser identification';

-- Sample audit log entries for reference
INSERT INTO audit_logs (user_id, action, entity_type, details, ip_address, user_agent, hospital_id) VALUES
(1, 'search:global_search_completed', 'search', 
 '{"query": "diabetes", "resultCount": 15, "executionTime": 245, "entityTypes": ["patient", "clinical_note"]}',
 '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1),
(1, 'search:rate_limit_exceeded', 'search',
 '{"maxRequests": 100, "currentCount": 101, "windowMs": 60000}',
 '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1),
(2, 'search:permission_denied', 'search',
 '{"requiredPermission": "search:analytics", "userRole": "nurse"}',
 '192.168.1.105', 'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7)', 1);

-- Retention policy function (optional)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Example: Schedule cleanup to run daily (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');