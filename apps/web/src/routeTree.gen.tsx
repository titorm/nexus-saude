import { createRootRoute, createRoute } from '@tanstack/react-router';

// Componente simples para home
function HomePage() {
  return (
    <div>
      <h1>Nexus Saúde</h1>
      <p>Sistema de Gestão em Saúde</p>
    </div>
  );
}

// Componente simples para login
function LoginPage() {
  return (
    <div>
      <h2>Login</h2>
      <p>Página de login</p>
    </div>
  );
}

// Rota raiz
const rootRoute = createRootRoute({
  component: HomePage,
});

// Rota de login
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// Árvore de rotas
export const routeTree = rootRoute.addChildren([loginRoute]);
