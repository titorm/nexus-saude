import { Router } from 'express';
import { z } from 'zod';
import { SearchService } from '../services/search.service.js';
import {
  globalSearchSchema,
  autocompleteSchema,
  searchPatientsSchema,
  searchClinicalNotesSchema,
  searchAppointmentsSchema,
  searchHistoryQuerySchema,
  searchAnalyticsSchema,
  searchEventSchema,
} from '../schemas/search.js';

const router = Router();
const searchService = new SearchService();

// Middleware temporário para auth (será implementado depois)
const auth = (req: any, res: any, next: any) => {
  req.user = { id: 1, role: 'doctor' }; // Mock user
  next();
};

// Middleware temporário para hospitalId (será implementado depois)
const getHospitalId = (req: any, res: any, next: any) => {
  req.hospitalId = 1; // Mock hospital ID
  next();
};

/**
 * GET /api/search/global
 * Busca global unificada em todas as entidades
 */
router.get('/global', auth, getHospitalId, async (req, res) => {
  try {
    const query = globalSearchSchema.parse({
      ...req.query,
      types: req.query.types ? JSON.parse(req.query.types as string) : undefined,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
    });

    const results = await searchService.globalSearch(query, req.hospitalId!, req.user!.id);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de busca inválidos',
        details: error.issues,
      });
    }

    console.error('Erro na busca global:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/search/patients
 * Busca específica em pacientes
 */
router.get('/patients', auth, getHospitalId, async (req, res) => {
  try {
    const query = searchPatientsSchema.parse(req.query);

    const results = await searchService.searchPatients(query, req.hospitalId!);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de busca inválidos',
        details: error.issues,
      });
    }

    console.error('Erro na busca de pacientes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/search/clinical-notes
 * Busca específica em notas clínicas
 */
router.get('/clinical-notes', auth, getHospitalId, async (req, res) => {
  try {
    const query = searchClinicalNotesSchema.parse({
      ...req.query,
      types: req.query.types ? JSON.parse(req.query.types as string) : undefined,
      priority: req.query.priority ? JSON.parse(req.query.priority as string) : undefined,
      dateRange: req.query.dateRange ? JSON.parse(req.query.dateRange as string) : undefined,
    });

    const results = await searchService.searchClinicalNotes(query, req.hospitalId!);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de busca inválidos',
        details: error.issues,
      });
    }

    console.error('Erro na busca de notas clínicas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/search/appointments
 * Busca específica em agendamentos
 */
router.get('/appointments', auth, getHospitalId, async (req, res) => {
  try {
    const query = searchAppointmentsSchema.parse({
      ...req.query,
      status: req.query.status ? JSON.parse(req.query.status as string) : undefined,
      dateRange: req.query.dateRange ? JSON.parse(req.query.dateRange as string) : undefined,
    });

    const results = await searchService.searchAppointments(query, req.hospitalId!);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de busca inválidos',
        details: error.issues,
      });
    }

    console.error('Erro na busca de agendamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/search/autocomplete
 * Autocomplete para sugestões de busca
 */
router.get('/autocomplete', auth, getHospitalId, async (req, res) => {
  try {
    const query = autocompleteSchema.parse({
      ...req.query,
      types: req.query.types ? JSON.parse(req.query.types as string) : undefined,
    });

    const suggestions = await searchService.getAutocompleteSuggestions(query, req.hospitalId!);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de autocomplete inválidos',
        details: error.issues,
      });
    }

    console.error('Erro no autocomplete:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/search/events
 * Registrar evento de busca (clique em resultado)
 */
router.post('/events', auth, getHospitalId, async (req, res) => {
  try {
    const event = searchEventSchema.parse(req.body);

    await searchService.recordSearchEvent(
      req.user!.id,
      event,
      req.hospitalId!,
      event.clickedResultId
    );

    res.json({
      success: true,
      message: 'Evento registrado com sucesso',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados do evento inválidos',
        details: error.issues,
      });
    }

    console.error('Erro ao registrar evento de busca:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/search/history
 * Obter histórico de buscas do usuário
 */
router.get('/history', auth, getHospitalId, async (req, res) => {
  try {
    const query = searchHistoryQuerySchema.parse(req.query);

    const history = await searchService.getSearchHistory(req.user!.id, query, req.hospitalId!);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de histórico inválidos',
        details: error.issues,
      });
    }

    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/search/analytics
 * Obter analytics de busca (apenas administradores)
 */
router.get('/analytics', auth, getHospitalId, async (req, res) => {
  try {
    // Verificar se o usuário é administrador
    if (req.user!.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem acessar analytics.',
      });
    }

    const query = searchAnalyticsSchema.parse(req.query);

    const analytics = await searchService.getSearchAnalytics(query, req.hospitalId!);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetros de analytics inválidos',
        details: error.issues,
      });
    }

    console.error('Erro ao buscar analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * PUT /api/search/index/:entityType/:entityId
 * Atualizar índice de busca para uma entidade específica (apenas administradores)
 */
router.put('/index/:entityType/:entityId', auth, getHospitalId, async (req, res) => {
  try {
    // Verificar se o usuário é administrador
    if (req.user!.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem atualizar índices.',
      });
    }

    const { entityType, entityId } = req.params;

    // Validar entityType
    const validEntityTypes = ['patient', 'clinical_note', 'appointment'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de entidade inválido',
      });
    }

    // Validar entityId
    const entityIdNum = parseInt(entityId, 10);
    if (isNaN(entityIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'ID da entidade inválido',
      });
    }

    await searchService.updateEntityIndex(entityType, entityIdNum, req.hospitalId!);

    res.json({
      success: true,
      message: 'Índice atualizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar índice:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/search/reindex
 * Reindexar todas as entidades (apenas administradores)
 */
router.post('/reindex', auth, getHospitalId, async (req, res) => {
  try {
    // Verificar se o usuário é administrador
    if (req.user!.role !== 'administrator') {
      return res.status(403).json({
        success: false,
        error: 'Acesso negado. Apenas administradores podem reindexar.',
      });
    }

    // Nota: Implementação simplificada
    // Em produção, isso deveria ser um job em background
    res.json({
      success: true,
      message: 'Reindexação iniciada. Este processo pode levar alguns minutos.',
    });

    // TODO: Implementar job de reindexação em background
    // - Buscar todas as entidades
    // - Atualizar índices de busca
    // - Notificar quando concluído
  } catch (error) {
    console.error('Erro ao iniciar reindexação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;
