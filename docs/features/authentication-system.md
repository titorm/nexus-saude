# Sistema de Autenticação Segura - Épico 2

## Visão Geral

Este documento descreve o sistema de autenticação segura implementado para o Nexus Saúde MVP. O sistema fornece autenticação robusta com JWT, autorização baseada em funções (RBAC), proteção contra ataques e auditoria de segurança.

## Funcionalidades Principais

### 1. Autenticação JWT com Dual-Token Strategy

- **Access Token**: JWT de curta duração (15 minutos) para autenticação de requests
- **Refresh Token**: JWT de longa duração (7 dias) para renovação automática
- **Token Blacklisting**: Sistema de revogação de tokens comprometidos
- **Cookie Security**: HttpOnly cookies com flags de segurança apropriadas

### 2. Proteção de Segurança

- **Rate Limiting**: Proteção contra ataques de força bruta
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Input Sanitization**: Proteção contra XSS e injeção de código
- **Password Security**: Hashing bcrypt com cost factor 12
- **Audit Logging**: Log de todas as tentativas de autenticação

### 3. Autorização Baseada em Funções (RBAC)

- **Roles**: `doctor`, `nurse`, `administrator`
- **Protected Routes**: Middleware para verificação de roles
- **Granular Permissions**: Controle fino de acesso por funcionalidade

## Implementação Técnica

### Backend (Fastify + Node.js)

#### Estrutura de Arquivos

```
apps/api/src/
├── middleware/
│   ├── auth.ts           # Middleware de autenticação JWT
│   ├── rateLimit.ts      # Rate limiting e proteção contra brute force
│   └── security.ts       # Headers de segurança e sanitização
├── routes/
│   └── auth.ts           # Rotas de autenticação
├── services/
│   └── auth.service.ts   # Lógica de negócio de autenticação
├── schemas/
│   └── auth.ts           # Schemas Zod para validação
└── tests/                # Testes de segurança
```

#### Endpoints de API

##### POST /api/auth/login

Autentica usuário e retorna tokens JWT.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "role": "doctor",
    "hospitalId": 1
  }
}
```

**Rate Limit:** 5 tentativas por 15 minutos

##### POST /api/auth/logout

Invalida tokens do usuário autenticado.

**Headers:** `Cookie: access_token=...`

**Response (200):**

```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

##### POST /api/auth/refresh

Renova access token usando refresh token.

**Headers:** `Cookie: refresh_token=...`

**Response (200):**

```json
{
  "success": true,
  "message": "Token renovado com sucesso"
}
```

**Rate Limit:** 10 tentativas por 5 minutos

##### GET /api/auth/validate

Valida token atual e retorna informações do usuário.

**Headers:** `Cookie: access_token=...`

**Response (200):**

```json
{
  "valid": true,
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "role": "doctor",
    "hospitalId": 1
  }
}
```

##### POST /api/auth/change-password

Altera senha do usuário autenticado.

**Headers:** `Cookie: access_token=...`

**Request:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Senha alterada com sucesso"
}
```

### Frontend (React + TanStack Router)

#### AuthContext

Contexto global para gerenciamento de estado de autenticação:

```typescript
const { user, login, logout, isLoading } = useAuth();
```

#### ProtectedRoute

Componente para proteção de rotas:

```tsx
<ProtectedRoute allowedRoles={['doctor', 'administrator']}>
  <DoctorDashboard />
</ProtectedRoute>
```

#### AuthGuard

Hook para proteção de seções específicas:

```typescript
const { hasPermission } = usePermissions();

if (hasPermission(['administrator'])) {
  // Render admin features
}
```

## Configuração de Segurança

### Variáveis de Ambiente

```env
# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nexus_saude

# Redis (for session management)
REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=http://localhost:3000
NODE_ENV=production
```

### Headers de Segurança

- **Content Security Policy (CSP)**: Previne XSS
- **HTTP Strict Transport Security (HSTS)**: Force HTTPS
- **X-Frame-Options**: Previne clickjacking
- **X-Content-Type-Options**: Previne MIME sniffing
- **Referrer-Policy**: Controla informações de referrer

### Rate Limiting Configuration

```typescript
// Login rate limiting
authRateLimit: {
  max: 5,           // 5 tentativas
  windowMs: 900000, // 15 minutos
}

// Refresh token rate limiting
refreshRateLimit: {
  max: 10,          // 10 tentativas
  windowMs: 300000, // 5 minutos
}
```

## Segurança de Senhas

### Política de Senhas

- Mínimo 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos uma letra minúscula
- Pelo menos um número
- Pelo menos um caractere especial
- Não pode conter padrões comuns (123456, password, etc.)

### Hashing

- **Algoritmo**: bcrypt
- **Cost Factor**: 12 (recomendado para 2024)
- **Salt**: Gerado automaticamente pelo bcrypt

## Auditoria e Logging

### Eventos Logados

- Tentativas de login (sucesso/falha)
- Renovação de tokens
- Alterações de senha
- Tentativas de acesso negadas
- Atividades suspeitas

### Formato de Log

```json
{
  "timestamp": "2024-12-26T22:52:49.000Z",
  "level": "warn",
  "event": "auth_failure",
  "userId": null,
  "email": "test@example.com",
  "ip": "127.0.0.1",
  "userAgent": "TestAgent/1.0",
  "reason": "Invalid credentials"
}
```

## Implementação RBAC

### Roles Disponíveis

1. **doctor**: Médicos com acesso a prontuários e prescrições
2. **nurse**: Enfermeiros com acesso limitado a prontuários
3. **administrator**: Administradores com acesso total ao sistema

### Middleware de Autorização

```typescript
// Proteger rota para apenas médicos
fastify.get(
  '/api/prescriptions',
  {
    preHandler: [fastify.authenticate, requireRole(['doctor'])],
  },
  handler
);

// Proteger rota para médicos e administradores
fastify.get(
  '/api/patients',
  {
    preHandler: [fastify.authenticate, requireRole(['doctor', 'administrator'])],
  },
  handler
);
```

## Testes de Segurança

### Testes Implementados

1. **Unit Tests**: AuthService, password validation, token management
2. **Integration Tests**: Auth routes, middleware, rate limiting
3. **Security Tests**: XSS protection, CSRF protection, input sanitization

### Testes Manuais Recomendados

- Teste de penetração básico
- Verificação de headers de segurança
- Teste de rate limiting em produção
- Validação de logs de auditoria

## Deploy e Configuração

### Variáveis de Produção

```env
NODE_ENV=production
JWT_SECRET=<strong-random-key-256-bits>
DATABASE_URL=<production-database-url>
REDIS_URL=<production-redis-url>
CORS_ORIGIN=https://nexus-saude.com
```

### Checklist de Segurança

- [ ] JWT secret forte (256+ bits)
- [ ] HTTPS configurado
- [ ] Rate limiting ativado
- [ ] Logs de auditoria configurados
- [ ] Backup de banco de dados
- [ ] Monitoramento de segurança
- [ ] Renovação periódica de secrets

## Manutenção e Monitoramento

### Monitoramento Recomendado

- Taxa de falhas de autenticação
- Tentativas de ataques de força bruta
- Performance dos endpoints de auth
- Logs de erros e exceções

### Manutenção Regular

- Rotação de JWT secrets (trimestral)
- Revisão de logs de auditoria
- Atualização de dependências
- Teste de procedimentos de backup

## Próximos Passos

1. **Implementar 2FA**: Autenticação de dois fatores via SMS/email
2. **OAuth Integration**: Integração com Google/Microsoft
3. **Session Management**: Controle avançado de sessões
4. **Advanced RBAC**: Permissões mais granulares
5. **Security Monitoring**: Dashboard de segurança em tempo real

---

**Data de Implementação**: Dezembro 2024  
**Versão**: 1.0  
**Status**: ✅ Implementado e Testado
