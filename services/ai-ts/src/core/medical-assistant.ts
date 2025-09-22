import { OpenAI } from 'openai';
import { config } from '../config/index.js';
import { logger, logError, logMedicalQuery, logDiagnosticSuggestion, logTreatmentRecommendation } from '../utils/logger.js';
import { MedicalKnowledgeBase } from './medical-knowledge.js';
import { MedicalNLPProcessor } from './medical-nlp.js';
import { ConversationManager } from './conversation-manager.js';
import { MedicalRecommendationEngine } from './medical-recommendation.js';

export interface MedicalQuery {
  query: string;
  patientContext?: PatientContext;
  conversationId?: string;
}

export interface PatientContext {
  id?: string;
  age?: number;
  gender?: 'M' | 'F' | 'Other';
  medicalHistory?: string[];
  currentMedications?: string[];
  allergies?: string[];
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
  symptoms?: string[];
  chiefComplaint?: string;
}

export interface MedicalResponse {
  query: string;
  entitiesFound: MedicalEntities;
  recommendations: MedicalRecommendations;
  confidenceScore: number;
  sources: string[];
  followUpQuestions: string[];
  timestamp: string;
  conversationId?: string;
}

export interface MedicalEntities {
  symptoms: string[];
  conditions: string[];
  medications: string[];
  procedures: string[];
  anatomy: string[];
  laboratories: string[];
}

export interface MedicalRecommendations {
  type: 'diagnostic' | 'treatment' | 'general' | 'referral';
  primary: string;
  alternatives: string[];
  confidence: number;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  followUpRequired: boolean;
}

export interface DiagnosticSuggestion {
  condition: string;
  probability: number;
  reasoning: string;
  supportingSymptoms: string[];
  recommendedTests: string[];
  differentialDiagnoses: string[];
  redFlags: string[];
}

export interface TreatmentSuggestion {
  treatment: string;
  type: 'medication' | 'procedure' | 'lifestyle' | 'referral';
  dosage?: string;
  duration?: string;
  instructions: string;
  contraindications: string[];
  sideEffects: string[];
  monitoring: string[];
}

/**
 * Core Medical AI Assistant
 * Coordinates all components to provide intelligent medical assistance
 */
export class MedicalAssistant {
  private openai?: OpenAI;
  private knowledgeBase: MedicalKnowledgeBase;
  private nlpProcessor: MedicalNLPProcessor;
  private conversationManager: ConversationManager;
  private recommendationEngine: MedicalRecommendationEngine;
  public isInitialized = false;

  constructor() {
    this.knowledgeBase = new MedicalKnowledgeBase();
    this.nlpProcessor = new MedicalNLPProcessor();
    this.conversationManager = new ConversationManager();
    this.recommendationEngine = new MedicalRecommendationEngine();
    
    // Initialize OpenAI if API key is provided
    if (config.openaiApiKey && config.enableOpenAI) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey
      });
    }
  }

  /**
   * Initialize all components of the medical assistant
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Medical AI Assistant...');
      
      const startTime = Date.now();
      
      // Initialize components in parallel where possible
      await Promise.all([
        this.knowledgeBase.initialize(),
        this.nlpProcessor.initialize(),
        this.conversationManager.initialize(),
        this.recommendationEngine.initialize()
      ]);
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      logger.info(`Medical AI Assistant initialized successfully in ${initTime}ms`);
      
    } catch (error) {
      logError(error, 'MedicalAssistant.initialize');
      throw new Error('Failed to initialize Medical AI Assistant');
    }
  }

  /**
   * Process a medical query and return intelligent response
   */
  async processQuery(request: MedicalQuery): Promise<MedicalResponse> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const { query, patientContext, conversationId } = request;
      const startTime = Date.now();

      // Extract medical entities from query
      const entities = await this.nlpProcessor.extractMedicalEntities(query);

      // Get conversation context if available
      let conversationContext = null;
      if (conversationId) {
        conversationContext = await this.conversationManager.getContext(conversationId);
      }

      // Search knowledge base for relevant information
      const relevantKnowledge = await this.knowledgeBase.searchRelevantInfo(
        entities,
        patientContext
      );

      // Generate recommendations
      const recommendations = await this.recommendationEngine.generateRecommendations({
        query,
        entities,
        patientContext,
        knowledge: relevantKnowledge,
        conversationContext
      });

      // Generate follow-up questions
      const followUpQuestions = await this.generateFollowUpQuestions(entities, recommendations);

      // Prepare response
      const response: MedicalResponse = {
        query,
        entitiesFound: entities,
        recommendations,
        confidenceScore: recommendations.confidence,
        sources: relevantKnowledge.sources || [],
        followUpQuestions,
        timestamp: new Date().toISOString(),
        conversationId
      };

      // Save to conversation history
      if (conversationId) {
        await this.conversationManager.saveInteraction(conversationId, query, response);
      }

      const processingTime = Date.now() - startTime;
      logMedicalQuery(query, patientContext?.id, recommendations.confidence);
      logger.info(`Medical query processed in ${processingTime}ms`);

      return response;

    } catch (error) {
      logError(error, 'MedicalAssistant.processQuery');
      throw new Error('Failed to process medical query');
    }
  }

  /**
   * Generate diagnostic suggestions based on symptoms
   */
  async generateDiagnosticSuggestions(
    symptoms: string[],
    patientInfo: PatientContext
  ): Promise<DiagnosticSuggestion[]> {
    try {
      const startTime = Date.now();

      // Extract entities from symptoms
      const symptomEntities: string[] = [];
      for (const symptom of symptoms) {
        const entities = await this.nlpProcessor.extractMedicalEntities(symptom);
        symptomEntities.push(...entities.symptoms);
      }

      // Search for related conditions
      const relatedConditions = await this.knowledgeBase.findConditionsBySymptoms(
        symptomEntities,
        patientInfo
      );

      // Generate diagnostic probabilities
      const diagnosticSuggestions = await this.recommendationEngine.calculateDiagnosticProbabilities({
        symptoms: symptomEntities,
        patientInfo,
        conditions: relatedConditions
      });

      // Add recommended tests and red flags
      const enhancedSuggestions = await Promise.all(
        diagnosticSuggestions.map(async (suggestion) => ({
          ...suggestion,
          recommendedTests: await this.recommendDiagnosticTests(suggestion),
          redFlags: await this.identifyRedFlags(symptomEntities, patientInfo)
        }))
      );

      const processingTime = Date.now() - startTime;
      logDiagnosticSuggestion(symptoms, enhancedSuggestions, 
        enhancedSuggestions.reduce((acc, s) => acc + s.probability, 0) / enhancedSuggestions.length
      );
      logger.info(`Diagnostic suggestions generated in ${processingTime}ms`);

      return enhancedSuggestions;

    } catch (error) {
      logError(error, 'MedicalAssistant.generateDiagnosticSuggestions');
      throw new Error('Failed to generate diagnostic suggestions');
    }
  }

  /**
   * Suggest treatments based on diagnosis
   */
  async suggestTreatments(
    diagnosis: string,
    patientInfo: PatientContext,
    severity: 'mild' | 'moderate' | 'severe' = 'moderate'
  ): Promise<TreatmentSuggestion[]> {
    try {
      const startTime = Date.now();

      // Get treatment protocols from knowledge base
      const treatmentProtocols = await this.knowledgeBase.getTreatmentProtocols(
        diagnosis,
        patientInfo,
        severity
      );

      // Generate personalized treatment suggestions
      const treatmentSuggestions = await this.recommendationEngine.generateTreatmentRecommendations({
        diagnosis,
        patientInfo,
        severity,
        protocols: treatmentProtocols
      });

      // Check for contraindications and interactions
      const safeTreatments = await Promise.all(
        treatmentSuggestions.map(async (treatment) => ({
          ...treatment,
          contraindications: await this.checkContraindications(treatment, patientInfo),
          sideEffects: await this.getPotentialSideEffects(treatment),
          monitoring: await this.getMonitoringRequirements(treatment)
        }))
      );

      const processingTime = Date.now() - startTime;
      logTreatmentRecommendation(diagnosis, safeTreatments, severity);
      logger.info(`Treatment suggestions generated in ${processingTime}ms`);

      return safeTreatments;

    } catch (error) {
      logError(error, 'MedicalAssistant.suggestTreatments');
      throw new Error('Failed to suggest treatments');
    }
  }

  /**
   * Generate follow-up questions based on entities and recommendations
   */
  private async generateFollowUpQuestions(
    entities: MedicalEntities,
    recommendations: MedicalRecommendations
  ): Promise<string[]> {
    const questions: string[] = [];

    // Questions based on symptoms
    if (entities.symptoms.length > 0) {
      questions.push(`Can you describe the onset and duration of ${entities.symptoms[0]}?`);
      if (entities.symptoms.length > 1) {
        questions.push('Are these symptoms occurring together or separately?');
      }
    }

    // Questions based on recommendations
    if (recommendations.type === 'diagnostic') {
      questions.push('Have you experienced any of these symptoms before?');
      questions.push('Are there any triggers that make the symptoms worse?');
    }

    if (recommendations.urgency === 'high' || recommendations.urgency === 'emergency') {
      questions.push('When did these symptoms first appear?');
      questions.push('Have the symptoms gotten worse over time?');
    }

    return questions.slice(0, 3); // Limit to 3 questions
  }

  /**
   * Recommend diagnostic tests for a condition
   */
  private async recommendDiagnosticTests(suggestion: DiagnosticSuggestion): Promise<string[]> {
    // This would integrate with medical guidelines database
    // For now, return basic tests based on condition
    const basicTests = [
      'Complete Blood Count (CBC)',
      'Basic Metabolic Panel',
      'Urinalysis'
    ];

    // Add condition-specific tests
    if (suggestion.condition.toLowerCase().includes('heart')) {
      basicTests.push('ECG', 'Echocardiogram');
    }
    
    if (suggestion.condition.toLowerCase().includes('infection')) {
      basicTests.push('Blood Culture', 'C-Reactive Protein');
    }

    return basicTests;
  }

  /**
   * Identify red flag symptoms
   */
  private async identifyRedFlags(symptoms: string[], patientInfo: PatientContext): Promise<string[]> {
    const redFlags: string[] = [];

    // Check for emergency symptoms
    const emergencySymptoms = [
      'chest pain', 'difficulty breathing', 'severe headache',
      'loss of consciousness', 'severe abdominal pain', 'high fever'
    ];

    for (const symptom of symptoms) {
      for (const emergency of emergencySymptoms) {
        if (symptom.toLowerCase().includes(emergency)) {
          redFlags.push(`${symptom} - requires immediate medical attention`);
        }
      }
    }

    return redFlags;
  }

  /**
   * Check for treatment contraindications
   */
  private async checkContraindications(
    treatment: TreatmentSuggestion,
    patientInfo: PatientContext
  ): Promise<string[]> {
    const contraindications: string[] = [];

    // Check allergies
    if (patientInfo.allergies) {
      for (const allergy of patientInfo.allergies) {
        if (treatment.treatment.toLowerCase().includes(allergy.toLowerCase())) {
          contraindications.push(`Patient allergic to ${allergy}`);
        }
      }
    }

    // Check drug interactions
    if (patientInfo.currentMedications && treatment.type === 'medication') {
      // This would integrate with drug interaction database
      contraindications.push('Check for drug interactions with current medications');
    }

    return contraindications;
  }

  /**
   * Get potential side effects for treatment
   */
  private async getPotentialSideEffects(treatment: TreatmentSuggestion): Promise<string[]> {
    // This would integrate with drug database
    // Return common side effects based on treatment type
    if (treatment.type === 'medication') {
      return ['Nausea', 'Dizziness', 'Headache', 'Fatigue'];
    }
    
    return [];
  }

  /**
   * Get monitoring requirements for treatment
   */
  private async getMonitoringRequirements(treatment: TreatmentSuggestion): Promise<string[]> {
    const monitoring: string[] = [];

    if (treatment.type === 'medication') {
      monitoring.push('Monitor for side effects');
      monitoring.push('Follow up in 1-2 weeks');
    }

    if (treatment.type === 'procedure') {
      monitoring.push('Post-procedure monitoring');
      monitoring.push('Watch for complications');
    }

    return monitoring;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      logger.info('Cleaning up Medical AI Assistant...');
      
      await Promise.all([
        this.knowledgeBase.cleanup(),
        this.nlpProcessor.cleanup(),
        this.conversationManager.cleanup(),
        this.recommendationEngine.cleanup()
      ]);
      
      this.isInitialized = false;
      logger.info('Medical AI Assistant cleanup completed');
      
    } catch (error) {
      logError(error, 'MedicalAssistant.cleanup');
    }
  }
}