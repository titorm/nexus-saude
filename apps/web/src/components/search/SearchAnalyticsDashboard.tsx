import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import {
  TrendingUp,
  Search,
  Clock,
  Users,
  BarChart3,
  Activity,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
} from 'lucide-react';
import { useSearchAnalytics } from '../../hooks/useSearchAnalytics';

/**
 * Search Analytics Dashboard Component
 *
 * Comprehensive admin dashboard for monitoring search system performance,
 * user engagement, popular queries, and system health metrics.
 */

interface SearchAnalyticsDashboardProps {
  className?: string;
}

// Simple Card component
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`bg-white rounded-lg shadow border ${className}`}>{children}</div>;

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6 pb-3">{children}</div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>;

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`p-6 pt-3 ${className}`}>{children}</div>;

// Simple Tabs component
const Tabs: React.FC<{ defaultValue: string; children: React.ReactNode; className?: string }> = ({
  defaultValue,
  children,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div
      className={`space-y-4 ${className}`}
      data-active-tab={activeTab}
      data-set-tab={setActiveTab}
    >
      {children}
    </div>
  );
};

const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`grid grid-cols-5 bg-gray-100 rounded-lg p-1 ${className}`}>{children}</div>;

const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({
  value,
  children,
}) => (
  <button
    className="px-3 py-2 text-sm font-medium rounded-md hover:bg-white hover:shadow-sm transition-colors"
    onClick={() => {
      const tabsElement = document.querySelector('[data-active-tab]') as any;
      if (tabsElement && tabsElement.dataset.setTab) {
        const setTab = new Function('value', `return ${tabsElement.dataset.setTab}`);
        setTab(value);
      }
    }}
  >
    {children}
  </button>
);

const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({
  value,
  children,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const tabsElement = document.querySelector('[data-active-tab]') as any;
    if (tabsElement) {
      setActiveTab(tabsElement.dataset.activeTab);
    }
  }, []);

  if (activeTab !== value) return null;

  return <div className={className}>{children}</div>;
};

// Simple Select component
const Select: React.FC<{
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ value, onValueChange, children, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className={`px-3 py-2 border border-gray-300 rounded-md bg-white ${className}`}
  >
    {children}
  </select>
);

const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({
  value,
  children,
}) => <option value={value}>{children}</option>;

// Helper function to format dates
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'há alguns minutos';
  if (diffHours < 24) return `há ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} dias`;
};

export const SearchAnalyticsDashboard: React.FC<SearchAnalyticsDashboardProps> = ({
  className = '',
}) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState({
    startDate: formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    endDate: formatDate(new Date()),
  });
  const [refreshInterval, setRefreshInterval] = useState<number | null>(30000);

  const { analytics, isLoading, error, refetch } = useSearchAnalytics({
    timeframe,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    refreshInterval,
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetch]);

  const handleExportData = () => {
    if (!analytics) return;

    const dataToExport = {
      exportDate: new Date().toISOString(),
      timeframe,
      dateRange,
      metrics: analytics,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-analytics-${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Carregando analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Erro ao carregar analytics: {error.message}</p>
          <Button onClick={() => refetch()} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics de Busca</h1>
          <p className="text-gray-600 mt-1">
            Monitoramento e métricas do sistema de busca avançada
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selection */}
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </Select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-36"
            />
            <span className="text-gray-400">até</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="w-36"
            />
          </div>

          {/* Refresh Controls */}
          <Select
            value={refreshInterval?.toString() || 'manual'}
            onValueChange={(value) =>
              setRefreshInterval(value === 'manual' ? null : parseInt(value))
            }
          >
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="10000">10s</SelectItem>
            <SelectItem value="30000">30s</SelectItem>
            <SelectItem value="60000">1min</SelectItem>
          </Select>

          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          <Button onClick={handleExportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Buscas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.summary?.totalSearches?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  +{analytics?.summary?.searchGrowth || 0}% vs período anterior
                </p>
              </div>
              <Search className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.summary?.activeUsers?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {analytics?.summary?.avgSearchesPerUser || 0} buscas/usuário
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.summary?.avgResponseTime || 0}ms
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  95% &lt; {analytics?.summary?.p95ResponseTime || 0}ms
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.summary?.successRate || 0}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {analytics?.summary?.errorRate || 0}% erros
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="queries">Consultas</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Entity Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analytics?.distribution?.entityTypes || []).map((type: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{type.name}</span>
                      <span className="font-medium">{type.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tempo médio de resposta</span>
                    <span className="font-medium">
                      {analytics?.performance?.avgResponseTime || 0}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">P95 Response Time</span>
                    <span className="font-medium">
                      {analytics?.performance?.p95ResponseTime || 0}ms
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa de erro</span>
                    <span className="font-medium text-red-600">
                      {analytics?.performance?.errorRate || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Throughput</span>
                    <span className="font-medium">
                      {analytics?.performance?.throughput || 0} req/min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Consultas Mais Populares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analytics?.popularQueries || [])
                    .slice(0, 10)
                    .map((query: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            "{query.query}"
                          </p>
                          <p className="text-xs text-gray-500">{query.count} buscas</p>
                        </div>
                        <Badge variant="secondary">#{index + 1}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Failed Queries */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Consultas sem Resultados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analytics?.failedQueries || []).slice(0, 8).map((query: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          "{query.query}"
                        </p>
                        <p className="text-xs text-gray-500">
                          {query.attempts} tentativas • Última:{' '}
                          {formatDistanceToNow(new Date(query.lastAttempt))}
                        </p>
                      </div>
                      <Badge variant="error">0 resultados</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle>Saúde do Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status da Base de Dados</span>
                    <Badge
                      variant={analytics?.health?.database === 'healthy' ? 'success' : 'error'}
                    >
                      {analytics?.health?.database || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Índices de Busca</span>
                    <Badge
                      variant={analytics?.health?.searchIndexes === 'healthy' ? 'success' : 'error'}
                    >
                      {analytics?.health?.searchIndexes || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cache</span>
                    <Badge variant={analytics?.health?.cache === 'healthy' ? 'success' : 'error'}>
                      {analytics?.health?.cache || 'unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Última atualização dos índices</span>
                    <span className="text-sm font-medium">
                      {analytics?.health?.lastIndexUpdate
                        ? formatDistanceToNow(new Date(analytics.health.lastIndexUpdate))
                        : 'Desconhecido'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição do Tempo de Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(analytics?.performance?.responseTimeDistribution || []).map(
                    (item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.range}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Mais Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(analytics?.userActivity?.topUsers || []).map((user: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{user.searchCount} buscas</p>
                      <p className="text-xs text-gray-500">{user.avgResponseTime}ms avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Eventos de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(analytics?.security?.events || []).map((event: any, index: number) => (
                    <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                      <p className="text-sm font-medium text-gray-900">{event.type}</p>
                      <p className="text-xs text-gray-600">{event.description}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(event.timestamp))} • IP: {event.ipAddress}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Requests bloqueadas</span>
                    <span className="font-medium text-red-600">
                      {analytics?.security?.rateLimiting?.blockedRequests || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">IPs bloqueados</span>
                    <span className="font-medium">
                      {analytics?.security?.rateLimiting?.blockedIPs || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Usuários afetados</span>
                    <span className="font-medium">
                      {analytics?.security?.rateLimiting?.affectedUsers || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
