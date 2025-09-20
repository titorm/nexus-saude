# T-307: Sistema de Navegação e Roteamento

## Overview

O sistema de navegação e roteamento T-307 implementa uma experiência de navegação completa e profissional para o Nexus Saúde, incluindo menu lateral responsivo, sistema de breadcrumbs automático, proteção avançada de rotas por papel de usuário e gerenciamento de estado global de navegação.

## Core Functionality

### 1. Menu Lateral (Sidebar Navigation)

Sistema de navegação principal com as seguintes características:

- **Layout Responsivo**: Sidebar que se adapta a diferentes tamanhos de tela
- **Estado Persistente**: Preferência de abertura/fechamento salva no localStorage
- **Navegação por Role**: Menu items condicionais baseados no papel do usuário
- **Design Material Expressive**: Integração com sistema de design da aplicação
- **Ícones Lucide React**: Iconografia consistente e moderna
- **Animações Suaves**: Transições e estados hover/active

### 2. Sistema de Breadcrumbs

Navegação contextual automática com:

- **Geração Automática**: Baseado na estrutura de rotas do TanStack Router
- **Navegação Clicável**: Permite navegação rápida para níveis superiores
- **Rotas Dinâmicas**: Suporte para parâmetros de URL (ex: /patients/:id)
- **Tradução de Rótulos**: Nomes amigáveis para rotas técnicas
- **Responsividade**: Adaptação para telas pequenas com ellipsis

### 3. Rotas Protegidas Avançadas

Sistema de proteção granular incluindo:

- **Guards por Role**: Diferentes níveis de acesso por papel
- **Redirecionamentos Inteligentes**: Baseado no contexto do usuário
- **Fallback Routes**: Páginas de erro personalizadas
- **Validação de Sessão**: Verificação automática de autenticação
- **Hospital Isolation**: Isolamento de dados por hospital

### 4. Gerenciamento de Estado Global

Estado centralizado para:

- **Sidebar State**: Aberto/fechado, preferências
- **Navigation History**: Histórico de navegação do usuário
- **User Preferences**: Tema, idioma, configurações
- **Breadcrumb Context**: Estado atual da navegação
- **Loading States**: Estados de carregamento globais

## Technical Implementation

### Arquitetura de Componentes

```
src/
├── components/
│   ├── navigation/
│   │   ├── Sidebar.tsx                 # Menu lateral principal
│   │   ├── SidebarItem.tsx            # Item individual do menu
│   │   ├── Breadcrumbs.tsx            # Sistema de breadcrumbs
│   │   ├── MobileNavigation.tsx       # Navegação mobile
│   │   └── index.ts                   # Exports públicos
│   ├── layout/
│   │   ├── RootLayout.tsx             # Layout principal
│   │   ├── Header.tsx                 # Cabeçalho da aplicação
│   │   ├── MainContent.tsx            # Área de conteúdo
│   │   └── index.ts                   # Exports públicos
├── contexts/
│   ├── NavigationContext.tsx          # Estado global de navegação
│   └── index.ts                       # Context exports
├── hooks/
│   ├── useNavigation.tsx              # Hook principal de navegação
│   ├── useBreadcrumbs.tsx             # Hook para breadcrumbs
│   ├── useSidebar.tsx                 # Hook para sidebar
│   └── index.ts                       # Hook exports
├── types/
│   ├── navigation.ts                  # Tipos de navegação
│   └── index.ts                       # Type exports
└── utils/
    ├── navigation.ts                  # Utilitários de navegação
    └── routes.ts                      # Configuração de rotas
```

### Estrutura de Dados

#### NavigationItem

```typescript
interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  requiredRoles?: UserRole[];
  children?: NavigationItem[];
  badge?: string | number;
  isExternal?: boolean;
}
```

#### NavigationState

```typescript
interface NavigationState {
  sidebarOpen: boolean;
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  history: string[];
  preferences: NavigationPreferences;
}
```

#### BreadcrumbItem

```typescript
interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrentPage: boolean;
  params?: Record<string, string>;
}
```

### Status da Implementação

### ✅ Componentes Implementados

#### 1. NavigationContext (`src/contexts/NavigationContext.tsx`)

- **Estado Global**: Gerenciamento centralizado do estado de navegação
- **Persistência**: Preferências salvas no localStorage
- **Hooks Integrados**: useNavigation() e useBreadcrumbs()
- **Type Safety**: TypeScript completo com interfaces bem definidas

#### 2. Sidebar (`src/components/navigation/Sidebar.tsx`)

- **Design Responsivo**: Mobile-first com Material Expressive
- **Role-based Navigation**: Filtros baseados no role do usuário
- **Estados**: Collapsed/expanded com persistência
- **Animações**: Transições suaves Material Design
- **User Profile**: Seção integrada com informações do usuário

#### 3. Breadcrumbs (`src/components/navigation/Breadcrumbs.tsx`)

- **Auto-geração**: Criados automaticamente baseado na rota atual
- **Truncamento Inteligente**: Limitação para mobile com ellipsis
- **Navegação Clicável**: Links para navegação rápida
- **Parâmetros Dinâmicos**: Suporte completo a parâmetros de rota

#### 4. RouteGuard (`src/components/navigation/RouteGuard.tsx`)

- **Hierarquia de Roles**: administrator > doctor > nurse
- **Redirecionamentos Inteligentes**: Baseado no contexto de autenticação
- **Fallbacks Customizáveis**: Componentes para acesso negado
- **Loading States**: Estados de carregamento durante autenticação

#### 5. RootLayout (`src/layouts/RootLayout.tsx`)

- **Layout Principal**: Integração de todos os componentes
- **Responsive Grid**: Sistema de layout flexível
- **Navigation Integration**: Sidebar e breadcrumbs integrados
- **Outlet Management**: Gerenciamento correto das rotas filhas

#### 6. Hooks Personalizados

- **useNavigation()**: Hook principal para interação com navegação
- **useBreadcrumbs()**: Geração automática de breadcrumbs

### ✅ Funcionalidades Testadas

#### Testes Unitários

- **NavigationContext**: 5 testes passando
  - Estado padrão
  - Toggle do sidebar
  - Fechamento do sidebar
  - Carregamento de preferências do localStorage
  - Tratamento de erros do localStorage

#### Build e Compilação

- **Frontend**: ✅ Compilação bem-sucedida
- **Type Safety**: ✅ TypeScript sem erros
- **Bundle Size**: 443.75 kB (otimizado)

### 🎨 Design System Implementado

#### Material Expressive + Tailwind CSS

- **Tokens de Design**: Cores, espaçamentos e tipografia Material Design 3
- **Componentes Responsivos**: Mobile-first approach
- **Animações**: Motion design seguindo Material guidelines
- **Elevações**: Sistema de sombras Material

#### Classes Customizadas

```css
/* Cores temáticas */
.bg-md3-surface-container
.text-md3-primary
.bg-md3-primary-container
.text-md3-on-primary-container

/* Estados interativos */
.hover:bg-md3-surface-variant
.focus:ring-md3-primary

/* Elevações */
.shadow-md3-elevation-1
.shadow-md3-elevation-2
```

### 🔧 Integração TanStack Router

#### Rotas Protegidas

```typescript
// Configuração implementada
const Route = createRootRoute({
  component: () => (
    <NavigationProvider>
      <RootLayout>
        <Outlet />
      </RootLayout>
    </NavigationProvider>
  ),
});
```

#### Proteção de Rotas

- **RouteGuard**: Componente para proteger rotas específicas
- **Role Hierarchy**: Sistema de hierarquia de permissões
- **Redirecionamentos**: Automáticos para login quando necessário

### 📊 Performance

#### Otimizações Implementadas

- **Code Splitting**: Componentes carregados sob demanda
- **Context Optimization**: Evita re-renders desnecessários
- **Memoização**: Computações otimizadas
- **Bundle Size**: Otimizado com Vite

#### Métricas

- **Build Time**: ~1.17s
- **Bundle Size**: 443.75 kB
- **Gzip**: 130.83 kB

### 🎯 Próximos Passos

#### Melhorias Futuras

1. **Testes Adicionais**: Componentes Sidebar e Breadcrumbs
2. **E2E Testing**: Cypress para testes de navegação completos
3. **Accessibility**: Melhorias WCAG e navegação por teclado
4. **Analytics**: Tracking de navegação para UX insights

#### Considerações de Deploy

- **Vercel Ready**: Otimizado para deploy no Vercel
- **Environment Variables**: Configurações baseadas em ambiente
- **Error Boundaries**: Tratamento robusto de erros

---

## Configuração de Rotas

### Estrutura de Roteamento

```typescript
const navigationConfig: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    requiredRoles: ['doctor', 'nurse', 'administrator'],
  },
  {
    id: 'patients',
    label: 'Pacientes',
    path: '/patients',
    icon: Users,
    requiredRoles: ['doctor', 'nurse'],
    children: [
      {
        id: 'patients-list',
        label: 'Lista de Pacientes',
        path: '/patients',
        icon: List,
      },
      {
        id: 'patients-new',
        label: 'Novo Paciente',
        path: '/patients/new',
        icon: UserPlus,
      },
    ],
  },
  {
    id: 'clinical-notes',
    label: 'Prontuários',
    path: '/clinical-notes',
    icon: FileText,
    requiredRoles: ['doctor', 'nurse'],
  },
  {
    id: 'appointments',
    label: 'Consultas',
    path: '/appointments',
    icon: Calendar,
    requiredRoles: ['doctor', 'nurse', 'receptionist'],
  },
  {
    id: 'reports',
    label: 'Relatórios',
    path: '/reports',
    icon: BarChart3,
    requiredRoles: ['administrator', 'doctor'],
  },
  {
    id: 'admin',
    label: 'Administração',
    path: '/admin',
    icon: Settings,
    requiredRoles: ['administrator'],
    children: [
      {
        id: 'admin-users',
        label: 'Usuários',
        path: '/admin/users',
        icon: Users,
      },
      {
        id: 'admin-hospitals',
        label: 'Hospitais',
        path: '/admin/hospitals',
        icon: Building,
      },
      {
        id: 'admin-settings',
        label: 'Configurações',
        path: '/admin/settings',
        icon: Cog,
      },
    ],
  },
];
```

#### Route Guards

```typescript
const routeGuards: Record<string, RouteGuard> = {
  '/dashboard': {
    requiredRoles: ['doctor', 'nurse', 'administrator'],
    redirectTo: '/unauthorized',
  },
  '/patients': {
    requiredRoles: ['doctor', 'nurse'],
    redirectTo: '/dashboard',
  },
  '/admin': {
    requiredRoles: ['administrator'],
    redirectTo: '/dashboard',
  },
};
```

## Dependencies

### Frontend Dependencies

- **@tanstack/react-router**: Roteamento type-safe
- **lucide-react**: Biblioteca de ícones
- **clsx**: Utilitário para classes CSS
- **react**: Framework principal
- **tailwindcss**: Styling framework

### Internal Dependencies

- **AuthContext**: Sistema de autenticação
- **ProtectedRoute**: Proteção de rotas existente
- **Material Expressive Design**: Sistema de design

### API Dependencies

- **Authentication API**: Validação de sessão
- **User Management API**: Informações de usuário e roles

## Testing Strategy

### Testes Unitários

- **Componentes de Navegação**: Renderização e interações
- **Hooks Customizados**: Lógica de estado e efeitos
- **Utilitários**: Funções de navegação e breadcrumbs
- **Context Providers**: Estado global e updates

### Testes de Integração

- **Fluxos de Navegação**: Navegação entre páginas
- **Proteção de Rotas**: Validação de acesso por role
- **Persistência de Estado**: localStorage e preferências
- **Responsividade**: Comportamento mobile/desktop

### Testes E2E

- **Jornada Completa do Usuário**: Login → Navegação → Logout
- **Navegação por Role**: Diferentes personas de usuário
- **Sidebar Interaction**: Abertura/fechamento e persistência
- **Breadcrumb Navigation**: Navegação contextual

## Future Considerations

### Performance

- **Code Splitting**: Lazy loading de componentes de rota
- **Route Preloading**: Pré-carregamento de rotas frequentes
- **Sidebar Virtualization**: Para muitos items de menu
- **Navigation Caching**: Cache de estados de navegação

### UX Enhancements

- **Search Navigation**: Busca rápida de páginas
- **Keyboard Shortcuts**: Navegação por teclado
- **Recent Pages**: Histórico de páginas visitadas
- **Bookmarks**: Páginas favoritas do usuário

### Acessibilidade

- **Screen Reader Support**: Navegação acessível
- **Keyboard Navigation**: Navegação completa por teclado
- **High Contrast**: Suporte a modos de alto contraste
- **Focus Management**: Gerenciamento de foco adequado

### Internacionalização

- **Multi-language Labels**: Rótulos em múltiplos idiomas
- **RTL Support**: Suporte para idiomas da direita para esquerda
- **Dynamic Routes**: Rotas localizadas

## Implementation Phases

### Fase 1: Componentes Base

1. Criar NavigationContext e tipos base
2. Implementar Sidebar component básico
3. Criar Breadcrumbs component
4. Implementar hooks fundamentais

### Fase 2: Layout e Integração

1. Criar RootLayout component
2. Integrar com sistema de autenticação
3. Implementar proteção de rotas avançada
4. Configurar persistência de estado

### Fase 3: Funcionalidades Avançadas

1. Adicionar navegação mobile
2. Implementar search navigation
3. Adicionar keyboard shortcuts
4. Otimizar performance

### Fase 4: Testes e Polimento

1. Criar suite completa de testes
2. Validar acessibilidade
3. Otimizar responsividade
4. Documentar API completa

---

**Status**: Em Desenvolvimento  
**Assignee**: AI Agent  
**Priority**: Alta  
**Estimated Completion**: 2-3 dias de desenvolvimento
