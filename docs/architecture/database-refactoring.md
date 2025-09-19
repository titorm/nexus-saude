# Refatoração da Arquitetura do Banco de Dados

## ✅ Migração Concluída: Drizzle ORM de `packages/db` para `apps/api`

### 📋 Resumo das Mudanças

Esta refatoração separou as responsabilidades da camada de banco de dados em dois pacotes distintos:

1. **`packages/db`**: Apenas tipagem TypeScript pura
2. **`apps/api`**: Implementação do Drizzle ORM e operações de banco

### 🔄 Mudanças Realizadas

#### 1. Transformação do `packages/db`

- **Antes**: Continha implementação completa do Drizzle ORM
- **Depois**: Apenas tipos TypeScript puros
- **Arquivos modificados**:
  - `src/schema.ts`: Convertido de pgTable para interfaces TypeScript
  - `src/index.ts`: Simplificado para exportar apenas tipos
  - `package.json`: Removidas dependências do Drizzle

#### 2. Migração para `apps/api/src/db/`

- **Criado**: `schema.ts` com definições completas das tabelas Drizzle
- **Criado**: `index.ts` com conexão PostgreSQL e funcionalidades do ORM
- **Movido**: `migrations/` (anteriormente `packages/db/drizzle/`)
- **Movido**: `drizzle.config.ts` atualizado com novos paths

#### 3. Estrutura Final

```
packages/db/
├── src/
│   ├── schema.ts     # ✅ Tipos TypeScript puros
│   └── index.ts      # ✅ Re-export de tipos
└── package.json      # ✅ Sem dependências do Drizzle

apps/api/
├── src/
│   ├── db/
│   │   ├── schema.ts     # ✅ Tabelas Drizzle completas
│   │   └── index.ts      # ✅ Conexão e ORM
│   └── scripts/
│       └── migrate.ts    # ✅ Script de migração
├── migrations/           # ✅ Migrações do banco
├── drizzle.config.ts     # ✅ Configuração do Drizzle
└── package.json          # ✅ Com dependências do Drizzle
```

### 🔧 Scripts Atualizados

#### `apps/api/package.json`

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "tsx src/scripts/migrate.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

### 💾 Tipos de Dados

Mantidos os mesmos tipos em ambos os pacotes para compatibilidade:

```typescript
// Disponível em @nexus/db e apps/api/src/db
export type User = { id: number; email: string; role: string; ... }
export type Patient = { id: number; fullName: string; ... }
export type ClinicalNote = { id: number; content: string; ... }
export type Hospital = { id: number; name: string; ... }
```

### 🚀 Como Usar

#### Para Tipos (qualquer lugar do projeto):

```typescript
import type { User, Patient } from '@nexus/db';
```

#### Para Operações de Banco (apenas em apps/api):

```typescript
import { getDb, users, patients } from '../db/index.js';

const db = await getDb();
const allUsers = await db.select().from(users);
```

### ✅ Validação

- ✅ Build de `packages/db` passou (apenas tipos)
- ✅ Build de `apps/api` passou (com Drizzle)
- ✅ Imports corrigidos em todos os services
- ✅ Estrutura de migrações preservada
- ✅ Compatibilidade com @nexus/db mantida

### 🎯 Benefícios da Arquitetura

1. **Separação de Responsabilidades**: Tipos puros vs implementação ORM
2. **Reutilização**: Outros apps podem usar @nexus/db para tipos
3. **Performance**: Pacote de tipos mais leve
4. **Manutenibilidade**: ORM isolado no contexto da API
5. **Flexibilidade**: Facilita futuras mudanças de ORM

### ⚠️ Pontos de Atenção

- Services em `apps/api` devem usar `getDb()` em vez de importar `db` diretamente
- Migrações agora residem em `apps/api/migrations/`
- Scripts do Drizzle devem ser executados no contexto de `apps/api`

### 🔄 Comandos Essenciais

```bash
# Gerar nova migração
cd apps/api && pnpm run db:generate

# Executar migrações
cd apps/api && pnpm run db:migrate

# Abrir Drizzle Studio
cd apps/api && pnpm run db:studio
```

---

**Status**: ✅ **CONCLUÍDA COM SUCESSO**  
**Data**: Janeiro 2025  
**Compatibilidade**: Mantida com código existente
