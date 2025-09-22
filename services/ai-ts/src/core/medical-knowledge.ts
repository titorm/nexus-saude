import { config } from '../config/index.js';
import { logger, logError, logKnowledgeBaseQuery } from '../utils/logger.js';
import type { MedicalEntities, PatientContext } from './medical-assistant.js';

export interface MedicalKnowledge {
  conditions: MedicalCondition[];
  medications: MedicalMedication[];
  procedures: MedicalProcedure[];
  guidelines: MedicalGuideline[];
  sources: string[];
}

export interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  description: string;
  symptoms: string[];
  causes: string[];
  riskFactors: string[];
  complications: string[];
  prevalence?: number;
  age_groups?: string[];
  gender_predisposition?: 'M' | 'F' | 'Both';
}

export interface MedicalMedication {
  id: string;
  name: string;
  generic_name?: string;
  category: string;
  indications: string[];
  contraindications: string[];
  side_effects: string[];
  interactions: string[];
  dosage_forms: string[];
  pregnancy_category?: string;
}

export interface MedicalProcedure {
  id: string;
  name: string;
  category: string;
  description: string;
  indications: string[];
  contraindications: string[];
  complications: string[];
  recovery_time?: string;
}

export interface MedicalGuideline {
  id: string;
  title: string;
  organization: string;
  condition: string;
  recommendations: string[];
  evidence_level: string;
  last_updated: string;
}

export interface TreatmentProtocol {
  condition: string;
  severity: string;
  treatments: Array<{
    name: string;
    type: 'medication' | 'procedure' | 'lifestyle' | 'referral';
    priority: number;
    dosage?: string;
    duration?: string;
    notes?: string;
  }>;
  monitoring: string[];
  followUp: string[];
}

/**
 * Medical Knowledge Base
 * Manages medical information, conditions, treatments, and guidelines
 */
export class MedicalKnowledgeBase {
  private conditions: Map<string, MedicalCondition> = new Map();
  private medications: Map<string, MedicalMedication> = new Map();
  private procedures: Map<string, MedicalProcedure> = new Map();
  private guidelines: Map<string, MedicalGuideline> = new Map();
  private treatmentProtocols: Map<string, TreatmentProtocol[]> = new Map();
  private symptomIndex: Map<string, string[]> = new Map(); // symptom -> condition IDs
  private isInitialized = false;

  /**
   * Initialize the knowledge base
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Medical Knowledge Base...');
      
      const startTime = Date.now();
      
      // Load medical data
      await Promise.all([
        this.loadConditions(),
        this.loadMedications(),
        this.loadProcedures(),
        this.loadGuidelines(),
        this.loadTreatmentProtocols()
      ]);
      
      // Build search indices
      this.buildSymptomIndex();
      
      this.isInitialized = true;
      
      const loadTime = Date.now() - startTime;
      logger.info(`Medical Knowledge Base initialized in ${loadTime}ms`);
      logger.info(`Loaded: ${this.conditions.size} conditions, ${this.medications.size} medications, ${this.procedures.size} procedures`);
      
    } catch (error) {
      logError(error, 'MedicalKnowledgeBase.initialize');
      throw new Error('Failed to initialize medical knowledge base');
    }
  }

  /**
   * Search for relevant medical information
   */
  async searchRelevantInfo(
    entities: MedicalEntities,
    patientContext?: PatientContext
  ): Promise<MedicalKnowledge> {
    try {
      const startTime = Date.now();
      
      const relevantConditions: MedicalCondition[] = [];
      const relevantMedications: MedicalMedication[] = [];
      const relevantProcedures: MedicalProcedure[] = [];
      const relevantGuidelines: MedicalGuideline[] = [];
      const sources: string[] = [];

      // Search by symptoms
      for (const symptom of entities.symptoms) {
        const conditionIds = this.symptomIndex.get(symptom.toLowerCase()) || [];
        for (const conditionId of conditionIds) {
          const condition = this.conditions.get(conditionId);
          if (condition && !relevantConditions.find(c => c.id === condition.id)) {
            // Filter by patient demographics if available
            if (this.isConditionRelevant(condition, patientContext)) {
              relevantConditions.push(condition);
            }
          }
        }
      }

      // Search by mentioned conditions
      for (const conditionName of entities.conditions) {
        const condition = this.findConditionByName(conditionName);
        if (condition && !relevantConditions.find(c => c.id === condition.id)) {
          relevantConditions.push(condition);
        }
      }

      // Search by medications
      for (const medicationName of entities.medications) {
        const medication = this.findMedicationByName(medicationName);
        if (medication && !relevantMedications.find(m => m.id === medication.id)) {
          relevantMedications.push(medication);
        }
      }

      // Search by procedures
      for (const procedureName of entities.procedures) {
        const procedure = this.findProcedureByName(procedureName);
        if (procedure && !relevantProcedures.find(p => p.id === procedure.id)) {
          relevantProcedures.push(procedure);
        }
      }

      // Find relevant guidelines
      for (const condition of relevantConditions) {
        const guidelines = this.findGuidelinesByCondition(condition.name);
        relevantGuidelines.push(...guidelines.filter(g => 
          !relevantGuidelines.find(rg => rg.id === g.id)
        ));
      }

      // Add sources
      sources.push('Internal Medical Knowledge Base');
      if (relevantGuidelines.length > 0) {
        sources.push(...relevantGuidelines.map(g => g.organization));
      }

      const searchTime = Date.now() - startTime;
      logKnowledgeBaseQuery(
        entities.symptoms.join(', '), 
        relevantConditions.length + relevantMedications.length + relevantProcedures.length,
        searchTime
      );

      return {
        conditions: relevantConditions,
        medications: relevantMedications,
        procedures: relevantProcedures,
        guidelines: relevantGuidelines,
        sources: [...new Set(sources)] // Remove duplicates
      };

    } catch (error) {
      logError(error, 'MedicalKnowledgeBase.searchRelevantInfo');
      throw new Error('Failed to search medical knowledge');
    }
  }

  /**
   * Find conditions by symptoms
   */
  async findConditionsBySymptoms(
    symptoms: string[],
    patientInfo?: PatientContext
  ): Promise<MedicalCondition[]> {
    const conditionMatches = new Map<string, number>();

    // Score conditions based on symptom matches
    for (const symptom of symptoms) {
      const conditionIds = this.symptomIndex.get(symptom.toLowerCase()) || [];
      for (const conditionId of conditionIds) {
        const currentScore = conditionMatches.get(conditionId) || 0;
        conditionMatches.set(conditionId, currentScore + 1);
      }
    }

    // Get conditions sorted by match score
    const sortedConditions = Array.from(conditionMatches.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([conditionId]) => this.conditions.get(conditionId))
      .filter((condition): condition is MedicalCondition => 
        condition !== undefined && this.isConditionRelevant(condition, patientInfo)
      );

    return sortedConditions.slice(0, 10); // Return top 10 matches
  }

  /**
   * Get treatment protocols for a condition
   */
  async getTreatmentProtocols(
    condition: string,
    patientInfo?: PatientContext,
    severity?: string
  ): Promise<TreatmentProtocol[]> {
    const protocols = this.treatmentProtocols.get(condition.toLowerCase()) || [];
    
    // Filter by severity if specified
    if (severity) {
      return protocols.filter(p => p.severity === severity);
    }
    
    return protocols;
  }

  /**
   * Load medical conditions
   */
  private async loadConditions(): Promise<void> {
    // In a real implementation, this would load from a database or API
    // For now, we'll use sample data
    const sampleConditions: MedicalCondition[] = [
      {
        id: '1',
        name: 'Hypertension',
        category: 'Cardiovascular',
        description: 'High blood pressure',
        symptoms: ['headache', 'dizziness', 'fatigue', 'chest pain'],
        causes: ['genetics', 'lifestyle', 'obesity', 'smoking'],
        riskFactors: ['age', 'family history', 'obesity', 'sedentary lifestyle'],
        complications: ['heart disease', 'stroke', 'kidney disease'],
        prevalence: 0.45,
        age_groups: ['adult', 'elderly'],
        gender_predisposition: 'Both'
      },
      {
        id: '2',
        name: 'Type 2 Diabetes',
        category: 'Endocrine',
        description: 'Insulin resistance and high blood sugar',
        symptoms: ['increased thirst', 'frequent urination', 'fatigue', 'blurred vision'],
        causes: ['insulin resistance', 'genetics', 'obesity'],
        riskFactors: ['obesity', 'sedentary lifestyle', 'family history', 'age'],
        complications: ['cardiovascular disease', 'kidney disease', 'neuropathy'],
        prevalence: 0.11,
        age_groups: ['adult', 'elderly'],
        gender_predisposition: 'Both'
      },
      {
        id: '3',
        name: 'Pneumonia',
        category: 'Respiratory',
        description: 'Infection of the lungs',
        symptoms: ['cough', 'fever', 'shortness of breath', 'chest pain'],
        causes: ['bacterial infection', 'viral infection', 'fungal infection'],
        riskFactors: ['age', 'compromised immune system', 'chronic conditions'],
        complications: ['respiratory failure', 'sepsis', 'lung abscess'],
        age_groups: ['all'],
        gender_predisposition: 'Both'
      }
    ];

    for (const condition of sampleConditions) {
      this.conditions.set(condition.id, condition);
    }
  }

  /**
   * Load medications
   */
  private async loadMedications(): Promise<void> {
    const sampleMedications: MedicalMedication[] = [
      {
        id: '1',
        name: 'Lisinopril',
        generic_name: 'Lisinopril',
        category: 'ACE Inhibitor',
        indications: ['hypertension', 'heart failure'],
        contraindications: ['pregnancy', 'angioedema'],
        side_effects: ['cough', 'dizziness', 'hyperkalemia'],
        interactions: ['potassium supplements', 'NSAIDs'],
        dosage_forms: ['tablet'],
        pregnancy_category: 'D'
      },
      {
        id: '2',
        name: 'Metformin',
        generic_name: 'Metformin',
        category: 'Biguanide',
        indications: ['type 2 diabetes'],
        contraindications: ['kidney disease', 'metabolic acidosis'],
        side_effects: ['nausea', 'diarrhea', 'metallic taste'],
        interactions: ['contrast dye', 'alcohol'],
        dosage_forms: ['tablet', 'extended-release tablet'],
        pregnancy_category: 'B'
      }
    ];

    for (const medication of sampleMedications) {
      this.medications.set(medication.id, medication);
    }
  }

  /**
   * Load procedures
   */
  private async loadProcedures(): Promise<void> {
    const sampleProcedures: MedicalProcedure[] = [
      {
        id: '1',
        name: 'Echocardiogram',
        category: 'Diagnostic',
        description: 'Ultrasound of the heart',
        indications: ['heart murmur', 'chest pain', 'shortness of breath'],
        contraindications: [],
        complications: ['rare allergic reaction to contrast'],
        recovery_time: 'immediate'
      }
    ];

    for (const procedure of sampleProcedures) {
      this.procedures.set(procedure.id, procedure);
    }
  }

  /**
   * Load clinical guidelines
   */
  private async loadGuidelines(): Promise<void> {
    const sampleGuidelines: MedicalGuideline[] = [
      {
        id: '1',
        title: 'Hypertension Management Guidelines',
        organization: 'American Heart Association',
        condition: 'hypertension',
        recommendations: [
          'Target BP <130/80 mmHg for most adults',
          'Start with lifestyle modifications',
          'Add medication if BP remains elevated'
        ],
        evidence_level: 'A',
        last_updated: '2023-01-01'
      }
    ];

    for (const guideline of sampleGuidelines) {
      this.guidelines.set(guideline.id, guideline);
    }
  }

  /**
   * Load treatment protocols
   */
  private async loadTreatmentProtocols(): Promise<void> {
    const sampleProtocols: TreatmentProtocol[] = [
      {
        condition: 'hypertension',
        severity: 'mild',
        treatments: [
          {
            name: 'Lifestyle modifications',
            type: 'lifestyle',
            priority: 1,
            notes: 'Diet, exercise, weight loss'
          },
          {
            name: 'Lisinopril',
            type: 'medication',
            priority: 2,
            dosage: '10mg daily',
            duration: 'ongoing'
          }
        ],
        monitoring: ['Blood pressure checks', 'Kidney function'],
        followUp: ['4-6 weeks', 'then every 3 months']
      }
    ];

    for (const protocol of sampleProtocols) {
      const condition = protocol.condition;
      const existing = this.treatmentProtocols.get(condition) || [];
      existing.push(protocol);
      this.treatmentProtocols.set(condition, existing);
    }
  }

  /**
   * Build symptom index for fast lookup
   */
  private buildSymptomIndex(): void {
    for (const [conditionId, condition] of this.conditions) {
      for (const symptom of condition.symptoms) {
        const normalizedSymptom = symptom.toLowerCase();
        const conditionIds = this.symptomIndex.get(normalizedSymptom) || [];
        if (!conditionIds.includes(conditionId)) {
          conditionIds.push(conditionId);
          this.symptomIndex.set(normalizedSymptom, conditionIds);
        }
      }
    }
  }

  /**
   * Check if condition is relevant for patient
   */
  private isConditionRelevant(condition: MedicalCondition, patientContext?: PatientContext): boolean {
    if (!patientContext) return true;

    // Check age groups
    if (condition.age_groups && patientContext.age) {
      const ageGroup = this.getAgeGroup(patientContext.age);
      if (!condition.age_groups.includes(ageGroup)) {
        return false;
      }
    }

    // Check gender predisposition
    if (condition.gender_predisposition && 
        condition.gender_predisposition !== 'Both' && 
        patientContext.gender &&
        condition.gender_predisposition !== patientContext.gender) {
      return false;
    }

    return true;
  }

  /**
   * Get age group for patient
   */
  private getAgeGroup(age: number): string {
    if (age < 18) return 'pediatric';
    if (age < 65) return 'adult';
    return 'elderly';
  }

  /**
   * Find condition by name
   */
  private findConditionByName(name: string): MedicalCondition | undefined {
    for (const condition of this.conditions.values()) {
      if (condition.name.toLowerCase().includes(name.toLowerCase())) {
        return condition;
      }
    }
    return undefined;
  }

  /**
   * Find medication by name
   */
  private findMedicationByName(name: string): MedicalMedication | undefined {
    for (const medication of this.medications.values()) {
      if (medication.name.toLowerCase().includes(name.toLowerCase()) ||
          (medication.generic_name && medication.generic_name.toLowerCase().includes(name.toLowerCase()))) {
        return medication;
      }
    }
    return undefined;
  }

  /**
   * Find procedure by name
   */
  private findProcedureByName(name: string): MedicalProcedure | undefined {
    for (const procedure of this.procedures.values()) {
      if (procedure.name.toLowerCase().includes(name.toLowerCase())) {
        return procedure;
      }
    }
    return undefined;
  }

  /**
   * Find guidelines by condition
   */
  private findGuidelinesByCondition(condition: string): MedicalGuideline[] {
    const guidelines: MedicalGuideline[] = [];
    for (const guideline of this.guidelines.values()) {
      if (guideline.condition.toLowerCase().includes(condition.toLowerCase())) {
        guidelines.push(guideline);
      }
    }
    return guidelines;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.conditions.clear();
    this.medications.clear();
    this.procedures.clear();
    this.guidelines.clear();
    this.treatmentProtocols.clear();
    this.symptomIndex.clear();
    this.isInitialized = false;
    logger.info('Medical Knowledge Base cleaned up');
  }
}