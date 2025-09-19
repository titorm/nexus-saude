# AGENTS.md - AI Development Guidelines for Full Stack Projects

> **⚠️ IMPORTANT**: This file is **READ-ONLY**. AI agents must never edit or modify this file. It serves as the canonical reference for all development standards.

## Overview

This document provides comprehensive guidelines for AI agents working on full stack projects using the following technology stack:

**Tech Stack:**
- **Monorepo**: Turborepo (optimized for Vercel deployments)
- **Backend**: Node.js + Fastify + PostgreSQL + Drizzle ORM
- **Frontend**: React.js + TanStack Router + Tailwind CSS + Material Expressive design pattern

All modifications must follow these instructions to maintain code quality, consistency, and project standards.

## 📚 Documentation Requirements

### Mandatory Project Documentation

**Every new functionality or feature implementation MUST include proper documentation in the `docs/` folder (project root).**

#### Documentation Structure
```
docs/
├── features/           # Feature-specific documentation
├── api/               # API endpoints and schemas
├── components/        # Frontend component documentation
├── workflows/         # Business logic and workflows
├── architecture/      # System architecture decisions
└── deployment/        # Deployment and infrastructure docs
```

#### Documentation Standards
1. **Core Functionality Documentation**: Every new feature must have a corresponding `.md` file in `docs/features/`
2. **Always Up-to-Date**: Documentation must be updated BEFORE implementation and maintained as the source of truth
3. **Implementation Reference**: All future changes to a feature must reference its documentation first
4. **API Documentation**: New API endpoints require documentation in `docs/api/`
5. **Component Documentation**: New React components need documentation in `docs/components/`

#### Documentation Template
Create documentation following this structure:

```markdown
# Feature Name

## Overview
Brief description of the feature and its purpose.

## Core Functionality
Detailed explanation of what this feature does.

## Technical Implementation
- Database schema changes
- API endpoints
- Frontend components
- Business logic

## Dependencies
List of internal and external dependencies.

## Testing Strategy
How to test this feature.

## Future Considerations
Potential improvements or extensions.
```

## 🔍 Pre-Development Requirements

### 1. Project Analysis Phase

Before starting ANY development task, the AI must:

1. **Complete Project Scan**: Perform a comprehensive analysis of the entire project structure
   - Review all configuration files (`package.json`, `tsconfig.json`, `turbo.json`, etc.)
   - Analyze folder structure and file organization patterns
   - Identify architectural patterns and conventions used
   - Review existing components, utilities, and services
   - Study styling approaches and UI patterns (Material Expressive)
   - Examine state management patterns
   - Check testing patterns and configurations
   - Review Drizzle schema definitions and database patterns

2. **Pattern Recognition**: Document the following patterns found in the project:
   - Naming conventions for files, functions, and variables
   - Code organization structure
   - Component architecture patterns
   - API integration patterns with Fastify
   - Database interaction patterns with Drizzle
   - Error handling approaches
   - Styling methodologies (Tailwind CSS + Material Expressive)
   - Import/export conventions
   - TanStack Router patterns

### 2. Documentation Review Phase

**MANDATORY**: Before any implementation:
1. Check if documentation exists for the feature in `docs/`
2. If documentation exists, use it as the primary reference
3. If documentation doesn't exist, create it FIRST before coding
4. Ensure documentation accuracy matches current implementation

### 3. Task Planning Phase

After project analysis and documentation review, create a detailed **Activity Schedule**:

```markdown
## Activity Schedule

### Task: [Brief Description]

**Estimated Duration**: [Time estimate]
**Priority**: [High/Medium/Low]
**Documentation Status**: [Exists/Needs Creation/Needs Update]

#### Phase 1: Documentation & Planning
- [ ] Review/Create feature documentation in `docs/`
- [ ] Review related existing code
- [ ] Identify dependencies and impacts
- [ ] Plan implementation approach
- [ ] Identify potential risks

#### Phase 2: Database & Backend
- [ ] Design/Update database schema (Drizzle)
- [ ] Implement API endpoints (Fastify)
- [ ] Add input validation and error handling
- [ ] Write backend tests

#### Phase 3: Frontend Implementation
- [ ] Create/Update React components
- [ ] Implement routing (TanStack Router)
- [ ] Apply styling (Tailwind CSS + Material Expressive)
- [ ] Handle state management
- [ ] Implement error boundaries

#### Phase 4: Testing & Integration
- [ ] Unit tests (backend and frontend)
- [ ] Integration testing
- [ ] End-to-end testing
- [ ] Manual testing

#### Phase 5: Documentation Update
- [ ] Update feature documentation in `docs/`
- [ ] Add/update code comments
- [ ] Update API documentation
- [ ] Update README if needed
```

## 🛠 Development Standards

### Package Management
- **ALWAYS use `pnpm`** for all package management operations
- Never use `npm` or `yarn`
- Common commands:
  ```bash
  pnpm install           # Install dependencies
  pnpm add [package]     # Add new dependency
  pnpm remove [package]  # Remove dependency
  pnpm dev               # Start development server
  pnpm build             # Build for production
  pnpm test              # Run tests
  ```

### Monorepo Structure (Turborepo)
- Follow established workspace patterns
- Use proper workspace dependencies
- Leverage Turborepo's caching system
- Configure proper build pipelines in `turbo.json`
- Ensure apps are optimized for Vercel deployment

### Backend Development (Node.js + Fastify + PostgreSQL + Drizzle)

#### API Standards
```typescript
// ✅ CORRECT: Proper Fastify route structure
export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:id', {
    schema: {
      params: { id: Type.String() },
      response: { 200: UserSchema }
    }
  }, getUserHandler);
}

// ✅ CORRECT: Drizzle database operations
const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
```

#### Database Standards (Drizzle)
- Use proper schema definitions with validation
- Follow consistent naming conventions
- Implement proper migrations
- Use transactions for complex operations
- Index frequently queried columns

### Frontend Development (React.js + TanStack Router + Tailwind CSS + Material Expressive)

#### Component Standards
```typescript
// ✅ CORRECT: Proper React component structure
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const navigate = useNavigate();
  const user = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  return (
    <div className="md3-surface-container p-4 rounded-lg">
      {/* Material Expressive styling */}
    </div>
  );
};
```

#### Routing Standards (TanStack Router)
- Use type-safe route definitions
- Implement proper error boundaries
- Handle loading states consistently
- Use proper route parameters validation

#### Styling Standards (Tailwind CSS + Material Expressive)
- Follow Material Expressive design tokens
- Use consistent spacing and color patterns
- Implement responsive design
- Follow accessibility guidelines

### Type Safety & API Integration

When API types/models change, maintain type safety across the stack:

```bash
# Generate and sync types (if applicable)
pnpm run generate:types
pnpm run sync:types
```

### Internationalization (i18n) Standards

All user-facing text must follow i18n patterns:

#### 1. Code Implementation
```javascript
// ✅ CORRECT: Use translation function
const message = t("common.welcome");
const dynamicMessage = t("user.itemsCount", { count });

// ❌ WRONG: Hardcoded strings
const message = "Welcome";
const dynamicMessage = `You have ${count} items`;
```

#### 2. Translation Files Structure
Maintain translations in all supported languages:
```
locales/
├── en/
│   └── common.json
├── pt/
│   └── common.json
└── es/
    └── common.json
```

## 📋 Code Quality Requirements

### Code Standards
- Follow existing project conventions identified in analysis phase
- Use TypeScript strictly with proper type definitions
- Implement comprehensive error handling
- Add meaningful comments for complex business logic
- Follow consistent naming conventions across the stack
- Use proper async/await patterns
- Implement proper logging

### File Organization
- Follow monorepo workspace structure
- Use consistent file naming conventions
- Group related functionality appropriately
- Maintain clean import statements
- Separate concerns properly (UI, business logic, data access)

### Testing Requirements
- Write unit tests for business logic
- Create integration tests for API endpoints
- Add component tests for React components
- Implement end-to-end tests for critical flows
- Ensure all tests pass before submitting changes
- Achieve reasonable test coverage (aim for 80%+)

## 🔄 Development Workflow

### Step-by-Step Process
1. **Documentation Review/Creation** (Check `docs/` folder, create/update as needed)
2. **Project Analysis** (Complete scan and pattern recognition)
3. **Schedule Creation** (Detailed activity breakdown)
4. **Backend Implementation** (Database, API, business logic)
5. **Frontend Implementation** (Components, routing, styling)
6. **Testing** (Unit, integration, e2e)
7. **Documentation Update** (Update `docs/` with final implementation)
8. **Review** (Self-review against these guidelines)

### Quality Checklist

Before submitting any changes, verify:

**Documentation:**
- [ ] Feature documentation exists in `docs/`
- [ ] Documentation is up-to-date with implementation
- [ ] API endpoints documented
- [ ] Component interfaces documented

**Development Standards:**
- [ ] Project analysis completed
- [ ] Activity schedule created and followed
- [ ] All commands use `pnpm`
- [ ] Turborepo configuration respected
- [ ] TypeScript types properly defined

**Backend (Node.js + Fastify + Drizzle):**
- [ ] Database schema properly defined
- [ ] API routes follow Fastify patterns
- [ ] Input validation implemented
- [ ] Error handling in place
- [ ] Database operations use Drizzle patterns

**Frontend (React + TanStack Router + Tailwind):**
- [ ] Components follow React best practices
- [ ] Routing uses TanStack Router properly
- [ ] Styling follows Material Expressive + Tailwind
- [ ] State management implemented correctly
- [ ] Error boundaries in place

**Quality Assurance:**
- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] No console errors
- [ ] Responsive design works
- [ ] Accessibility guidelines followed

## 🚨 Critical Rules

1. **Never Edit AGENTS.md**: This file is read-only and must never be modified
2. **Documentation First**: Always create/update documentation before implementing
3. **Use Correct Package Manager**: Only use `pnpm`, never npm or yarn
4. **Follow Stack Conventions**: Respect established patterns for each technology
5. **Type Safety**: Maintain strict TypeScript usage throughout
6. **Test Coverage**: Ensure adequate testing at all levels
7. **Documentation Currency**: Keep `docs/` folder always updated with core functionality

## 🛡️ Security Considerations

- Implement proper authentication and authorization
- Validate all inputs on both client and server
- Use parameterized queries (Drizzle handles this)
- Implement proper CORS policies
- Follow security best practices for API endpoints
- Sanitize user inputs
- Use HTTPS in production

## 📚 Additional Resources

- Review existing components for implementation examples
- Check `package.json` for available scripts and dependencies
- Examine existing documentation in `docs/` folder
- Study project README for specific setup instructions
- Reference official documentation for each stack technology
- Follow Material Expressive design guidelines
- Review TanStack Router documentation for routing patterns

---

**Remember**: Quality over speed. Always prioritize documentation accuracy and code maintainability. This ensures scalable, consistent, and high-quality contributions to the project.