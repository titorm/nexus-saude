# Nexus Saúde MVP

Sistema de prontuário eletrônico modular para hospitais.

## 🏗️ Arquitetura

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: Fastify + Drizzle ORM + PostgreSQL + Redis
- **Frontend**: React + Vite + TailwindCSS + Tanstack Router/Query
- **Autenticação**: JWT seguro com refresh tokens
- **Deploy**: Vercel (frontend) + Fly.io (backend) + Supabase (database)

## 📁 Estrutura do Projeto

```
nexus-saude/
├── apps/
│   ├── api/           # Backend API (Fastify)
│   └── web/           # Frontend React (Vite)
├── packages/
│   ├── db/            # Schema do banco e migrações (Drizzle)
│   ├── eslint-config/ # Configurações ESLint compartilhadas
│   └── tsconfig/      # Configurações TypeScript compartilhadas
└── docs/              # Documentação técnica
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- PostgreSQL
- Redis

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Gerar e aplicar migrações do banco
pnpm db:generate
pnpm db:migrate

# Poplar banco com dados de exemplo
pnpm db:seed

# Iniciar desenvolvimento
pnpm dev
```

### URLs de Desenvolvimento

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

## 🔐 Autenticação

O sistema usa JWT duplo (access + refresh tokens) armazenados em cookies httpOnly para máxima segurança:

- **Access Token**: 15 minutos, para autorização de requests
- **Refresh Token**: 7 dias, para renovação automática

### Usuários de Teste (após seed)

```
Médica: ana@hospital.com / 123456
Admin:  admin@hospital.com / 123456
```

## 📋 Roadmap

- [x] ✅ Configuração do monorepo
- [x] ✅ Schema do banco de dados
- [x] ✅ API backend base
- [x] ✅ Frontend React base
- [x] ✅ Autenticação JWT
- [ ] 🔄 Módulo de prontuário
- [ ] 📋 CI/CD pipeline

## 🏥 Features MVP

### Para Médicos
- Login seguro
- Lista de pacientes do hospital
- Timeline do histórico do paciente
- Criação de notas clínicas
- Transcrição por voz (futuro)

### Para Administradores
- Dashboard com métricas operacionais
- Gestão de usuários
- Importação de dados (CSV)

## 🛠️ Scripts Úteis

```bash
# Desenvolvimento
pnpm dev                 # Inicia todos os serviços
pnpm build              # Build de produção
pnpm lint               # Lint de todo o código
pnpm type-check         # Verificação de tipos

# Banco de dados
pnpm db:generate        # Gera migrações
pnpm db:migrate         # Aplica migrações
pnpm db:seed           # Popula com dados de teste

# Testes
pnpm test              # Executa todos os testes
```

## 📖 Documentação Técnica

- [Documento de Requisitos (DRD)](./requirements.md)
- [Documento de Design Técnico (DTD)](./design.md)
- [Backlog de Implementação](./tasks.md)

## 🔒 Segurança

- ✅ Validação Zod em todas as entradas
- ✅ Hashing bcrypt (cost 12) para senhas
- ✅ Cookies httpOnly para tokens
- ✅ CORS configurado
- ✅ Headers de segurança
- ✅ Rate limiting (futuro)

## 🏆 Performance

- ✅ Turborepo para builds otimizados
- ✅ Tanstack Query para cache inteligente
- ✅ PostgreSQL com índices otimizados
- ✅ Redis para sessões e cache
- ✅ Bundle splitting automático

---

Desenvolvido com ❤️ para revolucionar a área da saúde 🏥