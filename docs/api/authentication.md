# API de Autenticação - Documentação

## Base URL

```
Development: http://localhost:5000
Production: https://api.nexus-saude.com
```

## Headers Comuns

```
Content-Type: application/json
Cookie: access_token=<jwt_token>; refresh_token=<refresh_token>
```

## Autenticação

### POST /api/auth/login

Autentica um usuário no sistema.

**Parâmetros do Request:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| email | string | Sim | Email do usuário |
| password | string | Sim | Senha do usuário |

**Exemplo de Request:**

```json
{
  "email": "dr.silva@hospital.com",
  "password": "MinhaSenh@123"
}
```

**Respostas:**

**200 - Sucesso**

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "user": {
    "userId": 1,
    "email": "dr.silva@hospital.com",
    "role": "doctor",
    "hospitalId": 1
  }
}
```

**400 - Dados Inválidos**

```json
{
  "success": false,
  "message": "Dados de entrada inválidos",
  "errors": [
    {
      "field": "email",
      "message": "Email deve ser um endereço válido"
    }
  ]
}
```

**401 - Credenciais Inválidas**

```json
{
  "success": false,
  "message": "Credenciais inválidas"
}
```

**429 - Rate Limit Excedido**

```json
{
  "success": false,
  "message": "Muitas tentativas de login. Tente novamente em 15 minutos"
}
```

---

### POST /api/auth/logout

Invalida os tokens do usuário atual.

**Headers Requeridos:**

```
Cookie: access_token=<jwt_token>
```

**Respostas:**

**200 - Sucesso**

```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

**401 - Não Autenticado**

```json
{
  "success": false,
  "message": "Token de acesso inválido ou expirado"
}
```

---

### POST /api/auth/refresh

Renova o access token usando o refresh token.

**Headers Requeridos:**

```
Cookie: refresh_token=<refresh_jwt_token>
```

**Respostas:**

**200 - Sucesso**

```json
{
  "success": true,
  "message": "Token renovado com sucesso"
}
```

**401 - Refresh Token Inválido**

```json
{
  "success": false,
  "message": "Refresh token inválido ou expirado"
}
```

**429 - Rate Limit Excedido**

```json
{
  "success": false,
  "message": "Muitas tentativas de renovação. Tente novamente em 5 minutos"
}
```

---

### GET /api/auth/validate

Valida o token atual e retorna informações do usuário.

**Headers Requeridos:**

```
Cookie: access_token=<jwt_token>
```

**Respostas:**

**200 - Token Válido**

```json
{
  "valid": true,
  "user": {
    "userId": 1,
    "email": "dr.silva@hospital.com",
    "role": "doctor",
    "hospitalId": 1
  }
}
```

**401 - Token Inválido**

```json
{
  "valid": false,
  "message": "Token inválido ou expirado"
}
```

---

### POST /api/auth/change-password

Altera a senha do usuário autenticado.

**Headers Requeridos:**

```
Cookie: access_token=<jwt_token>
```

**Parâmetros do Request:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| currentPassword | string | Sim | Senha atual do usuário |
| newPassword | string | Sim | Nova senha (deve atender critérios de segurança) |

**Exemplo de Request:**

```json
{
  "currentPassword": "MinhaSenh@123",
  "newPassword": "NovaSenha@456"
}
```

**Respostas:**

**200 - Sucesso**

```json
{
  "success": true,
  "message": "Senha alterada com sucesso"
}
```

**400 - Senha Fraca**

```json
{
  "success": false,
  "message": "Nova senha não atende aos critérios de segurança",
  "errors": [
    "Senha deve ter pelo menos 8 caracteres",
    "Senha deve conter pelo menos um caractere especial"
  ]
}
```

**401 - Senha Atual Incorreta**

```json
{
  "success": false,
  "message": "Senha atual incorreta"
}
```

**401 - Não Autenticado**

```json
{
  "success": false,
  "message": "Token de acesso inválido ou expirado"
}
```

## Schemas de Validação

### Login Schema

```typescript
{
  email: string()
    .email("Email deve ser um endereço válido")
    .min(1, "Email é obrigatório"),
  password: string()
    .min(1, "Senha é obrigatória")
}
```

### Change Password Schema

```typescript
{
  currentPassword: string()
    .min(1, "Senha atual é obrigatória"),
  newPassword: string()
    .min(8, "Nova senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Nova senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Nova senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Nova senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Nova senha deve conter pelo menos um caractere especial")
}
```

## Rate Limiting

### Limites por Endpoint

| Endpoint                    | Limite        | Janela de Tempo | Comportamento               |
| --------------------------- | ------------- | --------------- | --------------------------- |
| `/api/auth/login`           | 5 tentativas  | 15 minutos      | Bloqueia IP por 15 min      |
| `/api/auth/refresh`         | 10 tentativas | 5 minutos       | Bloqueia IP por 5 min       |
| `/api/auth/change-password` | 3 tentativas  | 30 minutos      | Bloqueia usuário por 30 min |

### Headers de Rate Limiting

Os responses incluem headers informativos:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

## Segurança

### Cookies de Autenticação

```
access_token:
- HttpOnly: true
- Secure: true (apenas HTTPS)
- SameSite: Strict
- Max-Age: 900 (15 minutos)

refresh_token:
- HttpOnly: true
- Secure: true (apenas HTTPS)
- SameSite: Strict
- Max-Age: 604800 (7 dias)
```

### Headers de Segurança

Todos os responses incluem headers de segurança:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Roles e Permissões

### Roles Disponíveis

- `doctor`: Médico
- `nurse`: Enfermeiro
- `administrator`: Administrador

### Middleware de Autorização

Para proteger rotas com roles específicas:

```typescript
// Apenas médicos
fastify.get(
  '/api/prescriptions',
  {
    preHandler: [authenticate, requireRole(['doctor'])],
  },
  handler
);

// Médicos e administradores
fastify.get(
  '/api/patients',
  {
    preHandler: [authenticate, requireRole(['doctor', 'administrator'])],
  },
  handler
);
```

## Tratamento de Erros

### Códigos de Status HTTP

- `200`: Sucesso
- `400`: Dados inválidos
- `401`: Não autenticado ou credenciais inválidas
- `403`: Não autorizado (role insuficiente)
- `429`: Rate limit excedido
- `500`: Erro interno do servidor

### Formato de Erro Padrão

```json
{
  "success": false,
  "message": "Descrição do erro",
  "code": "ERROR_CODE",
  "errors": [
    /* detalhes específicos */
  ]
}
```

## Exemplos de Uso

### Fluxo de Autenticação Completo

**1. Login**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.silva@hospital.com","password":"MinhaSenh@123"}' \
  -c cookies.txt
```

**2. Acesso a Rota Protegida**

```bash
curl -X GET http://localhost:5000/api/patients \
  -b cookies.txt
```

**3. Renovação de Token**

```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

**4. Logout**

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt
```

### Usando JavaScript/Axios

```javascript
// Login
const loginResponse = await axios.post(
  '/api/auth/login',
  {
    email: 'dr.silva@hospital.com',
    password: 'MinhaSenh@123',
  },
  {
    withCredentials: true,
  }
);

// Request autenticado
const patientsResponse = await axios.get('/api/patients', {
  withCredentials: true,
});

// Logout
await axios.post(
  '/api/auth/logout',
  {},
  {
    withCredentials: true,
  }
);
```

## Ambiente de Desenvolvimento

### Configuração Local

```env
JWT_SECRET=dev-secret-key-not-for-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DATABASE_URL=postgresql://localhost:5432/nexus_saude_dev
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Testando com Postman

1. Importe a collection disponível em `/docs/postman/`
2. Configure as variáveis de ambiente
3. Execute os requests na sequência: Login → Validate → Protected Routes → Logout

---

**Última Atualização**: Dezembro 2024  
**Versão da API**: 1.0
