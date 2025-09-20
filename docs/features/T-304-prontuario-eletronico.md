# T-304: Prontuário Eletrônico - Especificação Técnica

## 📋 Visão Geral

A tarefa T-304 implementa o **Prontuário Eletrônico Completo** - a página de detalhes individual do paciente com timeline interativa de notas clínicas, editor de notas e visualizador de documentos.

## 🎯 Objetivos

Criar uma interface completa e intuitiva para:

- **Visualizar dados completos do paciente**
- **Timeline cronológica de notas clínicas**
- **Criar e editar notas médicas**
- **Upload e visualização de anexos**
- **Navegação intuitiva entre seções**

## 🏗️ Arquitetura da Página

```
/patient/:id
├── Header do Paciente
│   ├── Informações pessoais
│   ├── Dados médicos principais
│   └── Status e alertas
├── Navegação por Abas
│   ├── Timeline (Principal)
│   ├── Dados Pessoais
│   ├── Informações Médicas
│   └── Documentos
└── Conteúdo Principal
    ├── Timeline Interativa
    ├── Editor de Notas
    └── Upload de Arquivos
```

## 📊 Componentes a Implementar

### 1. **PatientHeader** - Cabeçalho do Paciente

- Foto/Avatar do paciente
- Informações básicas (nome, idade, CPF)
- Status de atividade
- Informações médicas críticas (tipo sanguíneo, alergias)
- Botões de ação (editar, imprimir)

### 2. **PatientTabs** - Navegação por Abas

- Timeline (aba principal)
- Dados Pessoais
- Informações Médicas
- Documentos/Anexos

### 3. **Timeline** - Timeline Interativa

- Lista cronológica de notas clínicas
- Filtros por tipo de nota e período
- Agrupamento por data
- Indicadores visuais por prioridade
- Ações rápidas (visualizar, editar, excluir)

### 4. **NoteCard** - Card de Nota Clínica

- Tipo e prioridade da nota
- Título e resumo do conteúdo
- Autor e data
- Tags e categorias
- Sintomas e medicações
- Follow-ups pendentes

### 5. **NoteEditor** - Editor de Notas

- Formulário completo para notas
- Editor de texto rico (rich text)
- Campos estruturados (sintomas, medicações, sinais vitais)
- Sistema de tags
- Upload de anexos
- Preview antes de salvar

### 6. **PatientInfo** - Informações Detalhadas

- Dados pessoais editáveis
- Endereço e contatos
- Informações de emergência
- Histórico médico

### 7. **DocumentViewer** - Visualizador de Documentos

- Lista de anexos
- Preview de documentos (PDF, imagens)
- Upload de novos documentos
- Organização por categorias

## 🔧 Funcionalidades Técnicas

### **State Management**

- React Query para cache de dados
- Context para estado da página
- Estado local para formulários

### **Navegação**

- TanStack Router para rota `/patient/:id`
- Abas com estado preservado
- Breadcrumbs para navegação

### **Integrações API**

```typescript
// Hooks principais
usePatient(id); // Dados do paciente
usePatientNotes(id); // Timeline de notas
useCreateNote(); // Criar nova nota
useUpdateNote(); // Editar nota
useDeleteNote(); // Excluir nota
useUploadDocument(); // Upload de arquivos
```

### **Performance**

- Lazy loading das abas
- Virtualização da timeline
- Cache inteligente de imagens
- Debounce em buscas

## 📱 Design e UX

### **Layout Responsivo**

- Mobile-first design
- Abas colapsáveis em mobile
- Timeline otimizada para touch
- Formulários adaptáveis

### **Material Design**

- Cores temáticas por tipo de nota
- Elevação e sombras consistentes
- Animações suaves
- Feedback visual imediato

### **Acessibilidade**

- ARIA labels completos
- Navegação por teclado
- Alto contraste
- Screen reader friendly

## 🎨 Paleta de Cores por Tipo de Nota

```typescript
const noteColors = {
  consultation: 'blue', // Consulta
  diagnosis: 'red', // Diagnóstico
  prescription: 'green', // Prescrição
  examination: 'purple', // Exame
  laboratory: 'orange', // Laboratório
  imaging: 'indigo', // Imagem
  procedure: 'pink', // Procedimento
  follow_up: 'yellow', // Follow-up
  referral: 'teal', // Encaminhamento
  discharge: 'gray', // Alta
  emergency: 'red', // Emergência
  observation: 'slate', // Observação
};
```

## 📋 User Stories

### Como médico, eu quero:

1. **Visualizar o perfil completo do paciente** para ter contexto médico
2. **Ver a timeline cronológica** para entender a evolução do caso
3. **Criar notas rapidamente** durante ou após consultas
4. **Anexar documentos** como exames e receitas
5. **Filtrar notas por tipo** para encontrar informações específicas
6. **Editar notas anteriores** para correções ou complementos
7. **Ver follow-ups pendentes** para não esquecer retornos

### Como administrador, eu quero:

8. **Auditoria completa** de quem criou/editou cada nota
9. **Controle de permissões** para notas privadas
10. **Relatórios exportáveis** do prontuário

## 🔄 Fluxos de Navegação

### **Fluxo Principal**

1. Lista de Pacientes → Card do Paciente → Clique
2. Carregamento da página `/patient/:id`
3. Header do paciente + Timeline (aba ativa)
4. Scroll para navegar na timeline
5. Ações: Nova nota, Filtrar, Pesquisar

### **Fluxo de Criação de Nota**

1. Botão "Nova Nota" → Modal/Drawer
2. Seleção do tipo de nota
3. Formulário contextual baseado no tipo
4. Preview da nota
5. Salvar → Atualização da timeline

### **Fluxo de Edição**

1. Click na nota → Ações rápidas
2. "Editar" → Carregar dados no editor
3. Modificações → Preview
4. Salvar → Atualização visual

## 📊 Métricas de Sucesso

### **Performance**

- Carregamento inicial < 2s
- Navegação entre abas < 200ms
- Timeline scroll suave (60fps)
- Upload de documentos < 5s

### **UX**

- Taxa de erro < 1% nas ações
- Tempo médio para criar nota < 3min
- 95% de satisfação em usabilidade
- Zero bugs críticos em produção

## 🔗 Dependências

### **APIs (Já Existentes)**

- ✅ `GET /patients/:id` - Dados do paciente
- ✅ `GET /clinical-notes/patient/:id/timeline` - Timeline
- ✅ `POST /clinical-notes` - Criar nota
- ✅ `PUT /clinical-notes/:id` - Editar nota
- ✅ `DELETE /clinical-notes/:id` - Excluir nota

### **Frontend (Existente)**

- ✅ React Query configurado
- ✅ TanStack Router
- ✅ Material Design System
- ✅ Tipos TypeScript base

### **Novas Dependências**

- Rich text editor (ex: TipTap, Quill)
- Upload de arquivos (File API)
- Preview de documentos (PDF.js)
- Virtual scrolling (React Window)

## 📁 Estrutura de Arquivos

```
src/
├── pages/
│   └── PatientDetailsPage.tsx
├── components/patient-details/
│   ├── PatientHeader.tsx
│   ├── PatientTabs.tsx
│   ├── Timeline.tsx
│   ├── NoteCard.tsx
│   ├── NoteEditor.tsx
│   ├── PatientInfo.tsx
│   ├── DocumentViewer.tsx
│   └── index.ts
├── types/
│   └── clinicalNotes.ts
├── hooks/
│   └── useClinicalNotes.ts
├── services/
│   └── clinicalNotes.service.ts
└── utils/
    ├── noteUtils.ts
    └── documentUtils.ts
```

## 🚀 Plano de Implementação

### **Phase 1: Estrutura Base**

1. Página `/patient/:id` com routing
2. PatientHeader com dados básicos
3. PatientTabs com navegação
4. Layout responsivo

### **Phase 2: Timeline**

1. Componente Timeline
2. NoteCard com dados das notas
3. Filtros e busca
4. Estados de loading

### **Phase 3: Editor de Notas**

1. NoteEditor com formulário
2. Campos específicos por tipo
3. Validação e preview
4. Integração com API

### **Phase 4: Recursos Avançados**

1. Upload de documentos
2. DocumentViewer
3. PatientInfo editável
4. Otimizações de performance

## ✅ Critérios de Aceitação

- [ ] Página carrega dados do paciente em < 2s
- [ ] Timeline exibe notas cronologicamente
- [ ] Filtros funcionam corretamente
- [ ] Editor de notas salva dados válidos
- [ ] Upload de documentos funciona
- [ ] Interface 100% responsiva
- [ ] Navegação acessível por teclado
- [ ] Estados de erro tratados
- [ ] Cache de dados funcionando
- [ ] TypeScript sem erros

---

**Prioridade**: Alta  
**Pontos de História**: 13  
**Estimativa**: 2 sprints  
**Dependências**: T-303 ✅, Backend APIs ✅
