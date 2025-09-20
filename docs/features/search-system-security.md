# Security & Permissions Implementation for Advanced Search System

## Overview

This document outlines the comprehensive security implementation for the T-306 Advanced Search System, ensuring data protection, access control, and audit compliance.

## Security Architecture

### 1. Authentication & Authorization

#### JWT-Based Authentication

- All search endpoints require valid JWT tokens
- Token validation includes user existence and active status checks
- Role-based permissions control access to different search features

#### Permission Levels

- **search:read** - Basic search access (all authenticated users)
- **search:advanced** - Advanced filtering and complex queries (doctors, admins)
- **search:analytics** - Analytics and reporting access (admins only)
- **search:manage** - System management and index rebuilding (admins only)

#### Role Mappings

```typescript
const rolePermissions = {
  admin: ['search:read', 'search:advanced', 'search:analytics', 'search:manage'],
  doctor: ['search:read', 'search:advanced'],
  nurse: ['search:read'],
  receptionist: ['search:read'],
};
```

### 2. Data Isolation

#### Hospital-Based Isolation

- All search queries automatically filtered by user's hospitalId
- Users can only search data belonging to their hospital
- Database queries include hospital_id constraints

#### Implementation Pattern

```typescript
// Automatic hospital filtering in all search queries
const searchQuery = db
  .select()
  .from(searchTable)
  .where(and(searchConditions, eq(searchTable.hospitalId, userHospitalId)));
```

### 3. Input Validation & Sanitization

#### Query Sanitization

- SQL injection prevention through parameterized queries
- XSS protection by content sanitization
- Input length limits and character restrictions

#### Validation Schemas

```typescript
const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long')
    .refine((query) => !containsSqlInjection(query))
    .refine((query) => !containsXSS(query)),
  limit: z.number().int().min(1).max(100),
  // ... other fields
});
```

### 4. Rate Limiting

#### Endpoint-Specific Limits

- **Global Search**: 100 requests/minute per user
- **Autocomplete**: 200 requests/minute per user (faster response needed)
- **Analytics**: 30 requests/minute per user
- **Index Management**: 5 requests/5 minutes per user

#### Implementation

- In-memory rate limiting for development
- Redis-based rate limiting recommended for production
- Rate limit headers included in responses

### 5. Audit Logging

#### Comprehensive Activity Tracking

All search activities are logged to the `audit_logs` table:

```sql
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
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Logged Events

- **Search Operations**: Query text, result counts, execution times
- **Permission Checks**: Access granted/denied events
- **Security Events**: Rate limiting, validation failures
- **System Events**: Index rebuilds, configuration changes

#### Example Log Entry

```json
{
  "userId": 123,
  "action": "search:global_search_completed",
  "entityType": "search",
  "details": {
    "query": "diabetes",
    "resultCount": 15,
    "executionTime": 245,
    "hospitalId": 1,
    "ipAddress": "192.168.1.100",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Implementation Guide

### 1. Database Migration

Create the audit logs table:

```sql
-- Migration: 20240115_create_audit_logs.sql
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

-- Indexes for performance
CREATE INDEX audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_action_idx ON audit_logs(action);
CREATE INDEX audit_logs_entity_type_idx ON audit_logs(entity_type);
CREATE INDEX audit_logs_hospital_id_idx ON audit_logs(hospital_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at);
```

### 2. Security Middleware Integration

#### Existing Fastify App Structure

The current app uses existing security middleware in `middleware/security.js`. Enhance these for search-specific requirements:

```typescript
// In routes/search.routes.ts - Enhanced security
router.get(
  '/global',
  auth, // Existing JWT authentication
  validateSearchPermission('search:read'),
  rateLimitSearch(100), // 100 requests/minute
  validateSearchInput, // Input sanitization
  hospitalIsolation, // Auto-filter by hospital
  auditSearchActivity, // Log search activity
  async (req, res) => {
    // Search implementation
  }
);
```

### 3. Middleware Functions

#### Authentication Middleware

```typescript
const validateSearchPermission = (permission: string) => {
  return async (req: any, res: any, next: any) => {
    const userPermissions = getUserPermissions(req.user.role);
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permission,
      });
    }
    next();
  };
};
```

#### Rate Limiting Middleware

```typescript
const rateLimitSearch = (maxRequests: number) => {
  return async (req: any, res: any, next: any) => {
    const key = `search_rate_limit:${req.user.id}`;
    const current = await getRateLimit(key);

    if (current > maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: 60,
      });
    }

    await incrementRateLimit(key);
    next();
  };
};
```

#### Hospital Isolation Middleware

```typescript
const hospitalIsolation = (req: any, res: any, next: any) => {
  req.query.hospitalId = req.user.hospitalId;
  req.body.hospitalId = req.user.hospitalId;
  next();
};
```

#### Audit Logging Middleware

```typescript
const auditSearchActivity = (req: any, res: any, next: any) => {
  const originalSend = res.send;

  res.send = function (data: any) {
    // Log search activity after response
    logSearchActivity({
      userId: req.user.id,
      action: `search:${req.route.path.replace('/', '_')}`,
      details: {
        query: req.body.query || req.query.q,
        path: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
      hospitalId: req.user.hospitalId,
    });

    return originalSend.call(this, data);
  };

  next();
};
```

## Security Monitoring

### 1. Real-Time Monitoring

#### Key Metrics to Monitor

- Failed authentication attempts
- Rate limit violations
- Permission denied events
- Unusual search patterns
- High-volume queries

#### Alert Thresholds

- **High Alert**: >10 failed auth attempts/minute from single IP
- **Medium Alert**: >5 rate limit violations/minute from single user
- **Low Alert**: Access to analytics endpoints by non-admin users

### 2. Audit Trail Analysis

#### Query Analysis

```sql
-- Most searched terms by hospital
SELECT
  hospital_id,
  details->>'query' as search_query,
  COUNT(*) as search_count
FROM audit_logs
WHERE action = 'search:global_search_completed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hospital_id, details->>'query'
ORDER BY search_count DESC;

-- Failed search attempts
SELECT
  user_id,
  details->>'error' as error_type,
  COUNT(*) as error_count
FROM audit_logs
WHERE action LIKE 'search:%_error'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, details->>'error';
```

## Security Compliance

### 1. Data Protection

- LGPD compliance through data isolation
- Automatic PII masking in audit logs
- Retention policies for search history

### 2. Access Controls

- Principle of least privilege
- Regular permission audits
- Automated access reviews

### 3. Incident Response

- Automated security alerts
- Incident logging and tracking
- Response procedures documentation

## Configuration

### Environment Variables

```bash
# Security Configuration
JWT_SECRET=your-jwt-secret-key
RATE_LIMIT_REDIS_URL=redis://localhost:6379
AUDIT_LOG_RETENTION_DAYS=90
SEARCH_MAX_QUERY_LENGTH=500
SEARCH_MAX_RESULTS_PER_REQUEST=100

# Monitoring
SECURITY_ALERT_EMAIL=security@hospital.com
MONITORING_WEBHOOK_URL=https://monitoring.example.com/webhook
```

### Production Recommendations

#### 1. Infrastructure Security

- Use HTTPS for all communications
- Implement Web Application Firewall (WAF)
- Regular security scans and penetration testing
- Network segmentation for database access

#### 2. Database Security

- Encrypted connections (SSL/TLS)
- Database-level access controls
- Regular backup encryption
- Query performance monitoring

#### 3. Application Security

- Regular dependency updates
- Security code reviews
- Automated security testing in CI/CD
- Error handling that doesn't expose sensitive information

## Testing Security

### 1. Security Test Suite

```bash
# Run security tests
npm run test:security

# Test rate limiting
npm run test:rate-limits

# Test authentication
npm run test:auth

# Test input validation
npm run test:validation
```

### 2. Penetration Testing

- SQL injection attempts
- XSS payload testing
- Authentication bypass attempts
- Rate limit bypass testing

This comprehensive security implementation ensures that the Advanced Search System meets enterprise-grade security requirements while maintaining usability and performance.
