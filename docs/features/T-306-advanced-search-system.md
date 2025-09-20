# T-306: Sistema de Busca Avançada

## Visão Geral

A T-306 implementa um sistema completo de busca avançada para o Nexus Saúde, permitindo busca global e inteligente em pacientes, notas clínicas e agendamentos com performance otimizada e interface intuitiva.

## Objetivos Principais

### 1. Busca Global Unificada

- **Multi-entidade**: Busca simultânea em pacientes, notas e agendamentos
- **Full-Text Search**: Busca por conteúdo completo usando PostgreSQL
- **Relevância**: Ranking inteligente baseado em relevância e recência
- **Performance**: Resultados em < 200ms mesmo com grandes volumes

### 2. Interface de Busca Inteligente

- **Autocomplete**: Sugestões em tempo real durante a digitação
- **Filtros Dinâmicos**: Filtros contextuais baseados no tipo de resultado
- **Histórico**: Últimas buscas e buscas frequentes
- **Busca Rápida**: Atalhos de teclado e busca global acessível

### 3. Filtros e Segmentação

- **Por Tipo**: Pacientes, notas clínicas, agendamentos
- **Por Data**: Períodos flexíveis e rangos customizáveis
- **Por Autor**: Filtro por médico ou usuário específico
- **Por Status**: Estados específicos de cada entidade
- **Por Hospital**: Segmentação automática por contexto

## Arquitetura Técnica

### Database Schema

#### Search Indexes Table

```sql
CREATE TABLE search_indexes (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- 'patient', 'clinical_note', 'appointment'
  entity_id INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  search_vector TSVECTOR NOT NULL,
  metadata JSONB DEFAULT '{}',
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_search_indexes_hospital_type ON search_indexes(hospital_id, entity_type);
CREATE INDEX idx_search_indexes_search_vector ON search_indexes USING GIN(search_vector);
CREATE INDEX idx_search_indexes_metadata ON search_indexes USING GIN(metadata);
CREATE INDEX idx_search_indexes_entity ON search_indexes(entity_type, entity_id);
```

#### Search History Table

```sql
CREATE TABLE search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  clicked_result_id VARCHAR(100), -- entity_type:entity_id
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para analytics
CREATE INDEX idx_search_history_user_hospital ON search_history(user_id, hospital_id);
CREATE INDEX idx_search_history_query ON search_history(query);
CREATE INDEX idx_search_history_created_at ON search_history(created_at);
```

### Backend API Design

#### Search Service Architecture

```typescript
interface SearchService {
  // Busca global
  globalSearch(query: string, filters: SearchFilters, hospitalId: number): Promise<SearchResults>;

  // Busca por tipo específico
  searchPatients(query: string, filters: PatientFilters, hospitalId: number): Promise<Patient[]>;
  searchClinicalNotes(
    query: string,
    filters: NoteFilters,
    hospitalId: number
  ): Promise<ClinicalNote[]>;
  searchAppointments(
    query: string,
    filters: AppointmentFilters,
    hospitalId: number
  ): Promise<Appointment[]>;

  // Autocomplete
  getAutocompleteSuggestions(query: string, hospitalId: number): Promise<AutocompleteSuggestion[]>;

  // Histórico e analytics
  getSearchHistory(userId: number, limit: number): Promise<SearchHistoryItem[]>;
  recordSearchEvent(userId: number, query: string, filters: SearchFilters): Promise<void>;
  getSearchAnalytics(hospitalId: number, period: DateRange): Promise<SearchAnalytics>;

  // Índices
  rebuildSearchIndexes(hospitalId?: number): Promise<void>;
  updateEntityIndex(entityType: string, entityId: number): Promise<void>;
}
```

#### API Endpoints

```
GET    /api/v1/search/global?q={query}&type={type}&limit={limit}
GET    /api/v1/search/patients?q={query}&filters={filters}
GET    /api/v1/search/clinical-notes?q={query}&filters={filters}
GET    /api/v1/search/appointments?q={query}&filters={filters}
GET    /api/v1/search/autocomplete?q={query}&types={types}
GET    /api/v1/search/history?limit={limit}
POST   /api/v1/search/record-event
GET    /api/v1/search/analytics?period={period}
POST   /api/v1/search/rebuild-indexes
```

### Frontend Components Architecture

#### 1. Global Search Component

```typescript
interface GlobalSearchProps {
  placeholder?: string;
  initialQuery?: string;
  onResultSelect?: (result: SearchResult) => void;
  showCategories?: boolean;
  maxResults?: number;
}

export function GlobalSearch({
  placeholder = 'Buscar pacientes, notas, agendamentos...',
  initialQuery = '',
  onResultSelect,
  showCategories = true,
  maxResults = 20,
}: GlobalSearchProps) {
  // Auto-complete com debounce
  // Categorização de resultados
  // Navegação por teclado
  // Histórico de buscas
}
```

#### 2. Advanced Search Modal

```typescript
interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilters?: SearchFilters;
  onSearch?: (query: string, filters: SearchFilters) => void;
}

export function AdvancedSearchModal({
  isOpen,
  onClose,
  initialFilters,
  onSearch,
}: AdvancedSearchModalProps) {
  // Formulário de filtros avançados
  // Preview de resultados
  // Salvamento de filtros favoritos
  // Exportação de resultados
}
```

#### 3. Search Results Components

```typescript
// Resultado unificado
interface SearchResultCardProps {
  result: SearchResult;
  query: string;
  onSelect: (result: SearchResult) => void;
  showCategory?: boolean;
}

// Lista de resultados com paginação
interface SearchResultsListProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
  onLoadMore?: () => void;
  onResultSelect?: (result: SearchResult) => void;
}

// Filtros laterais
interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableFilters: AvailableFilters;
  resultsCount: number;
}
```

### TypeScript Types

```typescript
// Tipos base de busca
interface SearchFilters {
  types?: ('patient' | 'clinical_note' | 'appointment')[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  authors?: number[];
  status?: string[];
  priority?: ('critical' | 'high' | 'normal' | 'low')[];
  tags?: string[];
}

interface SearchResult {
  id: string; // formato: "patient:123"
  type: 'patient' | 'clinical_note' | 'appointment';
  title: string;
  content: string;
  excerpt: string;
  relevanceScore: number;
  metadata: {
    authorName?: string;
    patientName?: string;
    createdAt: Date;
    status?: string;
    priority?: string;
    tags?: string[];
  };
  highlights: {
    title?: string[];
    content?: string[];
  };
}

interface AutocompleteSuggestion {
  text: string;
  type: 'query' | 'patient' | 'author' | 'tag';
  metadata?: any;
  count?: number;
}

interface SearchAnalytics {
  totalSearches: number;
  topQueries: Array<{ query: string; count: number }>;
  searchesByType: Record<string, number>;
  avgResultsPerSearch: number;
  clickThroughRate: number;
  noResultsRate: number;
}
```

### Performance e Otimização

#### 1. Database Optimizations

```sql
-- Índices compostos para queries frequentes
CREATE INDEX idx_search_compound ON search_indexes(hospital_id, entity_type, created_at DESC);

-- Particionamento por hospital (se necessário)
CREATE TABLE search_indexes_hospital_1 PARTITION OF search_indexes
FOR VALUES IN (1);

-- Configuração de full-text search otimizada
ALTER DATABASE nexus_saude SET default_text_search_config = 'portuguese';

-- Função para atualização automática de search_vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('portuguese', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_indexes_vector
  BEFORE INSERT OR UPDATE ON search_indexes
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

#### 2. Caching Strategy

```typescript
// Cache em múltiplas camadas
interface SearchCacheStrategy {
  // Cache L1: Resultados exatos (Redis)
  queryCache: Map<string, SearchResult[]>; // TTL: 5 minutos

  // Cache L2: Autocomplete (Memory)
  autocompleteCache: Map<string, AutocompleteSuggestion[]>; // TTL: 30 minutos

  // Cache L3: Agregações (Redis)
  analyticsCache: Map<string, SearchAnalytics>; // TTL: 1 hora

  // Invalidação inteligente
  invalidateOnEntityUpdate(entityType: string, entityId: number): void;
}
```

#### 3. Frontend Performance

```typescript
// Debounce para autocomplete
const useSearchAutocomplete = (query: string, delay = 300) => {
  const debouncedQuery = useDebounce(query, delay);
  return useQuery({
    queryKey: ['search', 'autocomplete', debouncedQuery],
    queryFn: () => searchService.getAutocompleteSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Virtualização para grandes listas de resultados
const SearchResultsList = ({ results }: { results: SearchResult[] }) => {
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      {rowVirtualizer.getVirtualItems().map((virtualItem) => (
        <SearchResultCard
          key={virtualItem.key}
          result={results[virtualItem.index]}
          style={{
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start}px)`,
          }}
        />
      ))}
    </div>
  );
};
```

## Funcionalidades Implementadas

### 1. Busca Global Unificada ✅

- **Multi-entity Search**: Busca simultânea em pacientes, notas clínicas e agendamentos
- **Relevance Scoring**: Algoritmo de relevância baseado em:
  - Correspondência exata vs parcial
  - Recência dos dados
  - Tipo de entidade
  - Frequência de acesso
- **Performance**: Otimização com índices PostgreSQL e cache
- **Segurança**: Filtro automático por hospital do usuário

### 2. Interface de Autocomplete ✅

- **Real-time Suggestions**: Sugestões em tempo real com debounce de 300ms
- **Categorized Results**: Resultados categorizados por tipo
- **Keyboard Navigation**: Navegação completa por teclado (↑↓ Enter Esc)
- **Recent Searches**: Histórico das últimas buscas
- **Quick Actions**: Ações rápidas para resultados comuns

### 3. Filtros Avançados ✅

- **Dynamic Filters**: Filtros que se ajustam baseado no tipo de resultado
- **Date Range**: Seleção flexível de períodos
- **Multi-select**: Seleção múltipla para autores, tags, status
- **Filter Persistence**: Filtros salvos na sessão do usuário
- **Filter Reset**: Limpeza rápida de todos os filtros

### 4. Search Analytics ✅

- **Query Tracking**: Rastreamento de todas as buscas realizadas
- **Click-through Rate**: Medição de efetividade dos resultados
- **Popular Queries**: Identificação de buscas mais frequentes
- **No Results Analysis**: Análise de buscas sem resultados
- **Performance Metrics**: Métricas de tempo de resposta

## Business Rules

### 1. Segurança e Autorização

- **Hospital Isolation**: Usuários só veem resultados do seu hospital
- **Role-based Results**: Diferentes níveis de acesso baseado no papel
- **Private Notes**: Notas privadas só aparecem para o autor
- **Audit Trail**: Log de todas as ações de busca

### 2. Relevância e Ranking

```typescript
interface RelevanceAlgorithm {
  // Fatores de relevância (peso de 0-1)
  exactMatch: 0.4; // Correspondência exata tem maior peso
  titleMatch: 0.3; // Título tem mais peso que conteúdo
  contentMatch: 0.2; // Conteúdo tem peso médio
  recency: 0.1; // Dados recentes têm pequeno boost

  // Boost por tipo de entidade
  patientBoost: 1.2; // Pacientes são mais importantes
  noteBoost: 1.0; // Notas têm peso normal
  appointmentBoost: 0.8; // Agendamentos têm menor peso

  // Penalidades
  inactivePatientPenalty: 0.5; // Pacientes inativos
  oldDataPenalty: 0.1; // Dados muito antigos
}
```

### 3. Limites e Performance

- **Rate Limiting**: 100 buscas por minuto por usuário
- **Result Limits**: Máximo 100 resultados por busca
- **Query Limits**: Máximo 500 caracteres por busca
- **Cache TTL**: 5 minutos para resultados, 30 minutos para autocomplete
- **Index Rebuild**: Reconstrução automática a cada 6 horas

## Testing Strategy

### 1. Unit Tests

```typescript
describe('SearchService', () => {
  describe('globalSearch', () => {
    it('should return results from all entity types', async () => {
      // Test multi-entity search
    });

    it('should respect hospital isolation', async () => {
      // Test security boundaries
    });

    it('should rank results by relevance', async () => {
      // Test relevance algorithm
    });

    it('should handle special characters and accents', async () => {
      // Test text normalization
    });
  });

  describe('autocomplete', () => {
    it('should provide suggestions for partial queries', async () => {
      // Test autocomplete functionality
    });

    it('should limit suggestion count', async () => {
      // Test performance limits
    });
  });
});
```

### 2. Integration Tests

```typescript
describe('Search API Integration', () => {
  it('should perform end-to-end search workflow', async () => {
    // Test complete search flow
    const response = await request(app)
      .get('/api/v1/search/global')
      .query({ q: 'João Silva', limit: 10 })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('results');
    expect(response.body.results).toBeArray();
  });
});
```

### 3. Performance Tests

```typescript
describe('Search Performance', () => {
  it('should respond within 200ms for simple queries', async () => {
    const start = Date.now();
    await searchService.globalSearch('test', {}, hospitalId);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should handle 100 concurrent searches', async () => {
    const promises = Array(100)
      .fill(null)
      .map(() => searchService.globalSearch('test', {}, hospitalId));
    await expect(Promise.all(promises)).resolves.not.toThrow();
  });
});
```

## Deployment Considerations

### 1. Database Migration

```sql
-- Migration script para T-306
BEGIN;

-- Criar tabelas de índice de busca
CREATE TABLE search_indexes (
  -- schema definido acima
);

-- Criar tabela de histórico
CREATE TABLE search_history (
  -- schema definido acima
);

-- Popular índices iniciais
INSERT INTO search_indexes (entity_type, entity_id, title, content, hospital_id)
SELECT
  'patient' as entity_type,
  id as entity_id,
  CONCAT(first_name, ' ', last_name) as title,
  CONCAT(first_name, ' ', last_name, ' ', email, ' ', phone) as content,
  hospital_id
FROM patients WHERE is_active = true;

-- Commit das mudanças
COMMIT;
```

### 2. Environment Variables

```bash
# Configurações de busca
SEARCH_MAX_RESULTS=100
SEARCH_DEBOUNCE_MS=300
SEARCH_CACHE_TTL=300
SEARCH_AUTOCOMPLETE_MIN_CHARS=2

# Performance
SEARCH_INDEX_REBUILD_INTERVAL=21600  # 6 horas
SEARCH_RATE_LIMIT_PER_MINUTE=100
```

### 3. Monitoring

```typescript
// Métricas para monitoramento
interface SearchMetrics {
  searchRequestsPerMinute: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  popularQueries: string[];
  slowQueries: Array<{ query: string; time: number }>;
}
```

## Future Enhancements

### Phase 2 Features

1. **Semantic Search**: Busca por significado usando AI/ML
2. **Search Templates**: Templates de busca salvos e compartilháveis
3. **Advanced Export**: Exportação de resultados em múltiplos formatos
4. **Search Alerts**: Alertas automáticos para novas entradas
5. **Voice Search**: Busca por voz usando Web Speech API
6. **Mobile App**: App nativo com busca offline

### Phase 3 Features

1. **Elasticsearch Integration**: Para volumes muito grandes
2. **Machine Learning**: Sugestões inteligentes baseadas em comportamento
3. **Natural Language**: Busca em linguagem natural
4. **Graph Search**: Busca baseada em relacionamentos
5. **Real-time Search**: Busca em tempo real com WebSockets

## Success Metrics

### Performance Metrics

- **Response Time**: < 200ms para 95% das buscas
- **Throughput**: > 1000 buscas/minuto por servidor
- **Cache Hit Rate**: > 70% para autocomplete
- **Uptime**: 99.9% de disponibilidade

### User Experience Metrics

- **Search Success Rate**: > 90% das buscas retornam resultados relevantes
- **Click-through Rate**: > 60% dos usuários clicam em um resultado
- **Search Abandonment**: < 10% das buscas são abandonadas
- **User Satisfaction**: > 4.5/5 em pesquisas de satisfação

### Business Metrics

- **Time to Find**: Redução de 50% no tempo para encontrar informações
- **User Adoption**: > 80% dos usuários usam busca regularmente
- **Support Tickets**: Redução de 30% em tickets relacionados a "não encontro"
- **Productivity**: Aumento mensurável na produtividade dos médicos
