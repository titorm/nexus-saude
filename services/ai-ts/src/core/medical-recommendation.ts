import { config } from '../config/index.js';
import { logger, logError } from '../utils/logger.js';
import type { 
  MedicalEntities, 
  PatientContext, 
  MedicalRecommendations,
  DiagnosticSuggestion,
  TreatmentSuggestion 
} from './medical-assistant.js';
import type { MedicalKnowledge, TreatmentProtocol } from './medical-knowledge.js';
import type { ConversationContext } from './conversation-manager.js';

export interface RecommendationRequest {
  query: string;
  entities: MedicalEntities;
  patientContext?: PatientContext;
  knowledge: MedicalKnowledge;
  conversationContext?: ConversationContext | null;
}

export interface DiagnosticRequest {
  symptoms: string[];
  patientInfo: PatientContext;
  conditions: any[];
}

export interface TreatmentRequest {
  diagnosis: string;
  patientInfo: PatientContext;
  severity: string;
  protocols: TreatmentProtocol[];
}

interface ScoredRecommendation {
  recommendation: string;
  score: number;
  reasoning: string;
  evidence: string[];
  confidence: number;
}

/**
 * Medical Recommendation Engine
 * Generates medical recommendations, diagnostic suggestions, and treatment plans
 */
export class MedicalRecommendationEngine {
  private ruleWeights: Map<string, number> = new Map();
  private diagnosticRules: Map<string, (symptoms: string[], patient: PatientContext) => number> = new Map();
  private treatmentRules: Map<string, (diagnosis: string, patient: PatientContext) => number> = new Map();
  private isInitialized = false;

  constructor() {
    // Initialize rule weights
    this.ruleWeights.set('symptom_match', 0.4);
    this.ruleWeights.set('age_relevance', 0.2);
    this.ruleWeights.set('gender_relevance', 0.15);
    this.ruleWeights.set('history_relevance', 0.15);
    this.ruleWeights.set('urgency_factor', 0.1);
  }

  /**
   * Initialize the recommendation engine
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Medical Recommendation Engine...');
      
      const startTime = Date.now();
      
      // Initialize diagnostic rules
      this.initializeDiagnosticRules();
      
      // Initialize treatment rules
      this.initializeTreatmentRules();
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      logger.info(`Medical Recommendation Engine initialized in ${initTime}ms`);
      
    } catch (error) {
      logError(error, 'MedicalRecommendationEngine.initialize');
      throw new Error('Failed to initialize Medical Recommendation Engine');
    }
  }

  /**
   * Generate medical recommendations
   */
  async generateRecommendations(request: RecommendationRequest): Promise<MedicalRecommendations> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const { query, entities, patientContext, knowledge, conversationContext } = request;
      
      // Analyze the type of request
      const requestType = this.analyzeRequestType(query, entities);
      
      // Generate scored recommendations
      const scoredRecommendations = await this.generateScoredRecommendations(
        requestType,
        entities,
        patientContext,
        knowledge,
        conversationContext
      );
      
      // Select best recommendation
      const bestRecommendation = scoredRecommendations[0];
      
      // Determine urgency
      const urgency = this.assessUrgency(entities, patientContext, bestRecommendation);
      
      // Check if follow-up is required
      const followUpRequired = this.assessFollowUpNeed(
        bestRecommendation,
        urgency,
        patientContext
      );

      return {
        type: requestType,
        primary: bestRecommendation.recommendation,
        alternatives: scoredRecommendations.slice(1, 4).map(r => r.recommendation),
        confidence: bestRecommendation.confidence,
        reasoning: bestRecommendation.reasoning,
        urgency,
        followUpRequired
      };

    } catch (error) {
      logError(error, 'MedicalRecommendationEngine.generateRecommendations');
      throw new Error('Failed to generate medical recommendations');
    }
  }

  /**
   * Calculate diagnostic probabilities
   */
  async calculateDiagnosticProbabilities(request: DiagnosticRequest): Promise<DiagnosticSuggestion[]> {
    try {
      const { symptoms, patientInfo, conditions } = request;
      const suggestions: DiagnosticSuggestion[] = [];

      for (const condition of conditions) {
        // Calculate probability based on symptom matching
        const symptomScore = this.calculateSymptomMatch(symptoms, condition.symptoms || []);
        
        // Apply demographic factors
        const demographicScore = this.calculateDemographicRelevance(condition, patientInfo);
        
        // Apply diagnostic rules
        const ruleScore = this.applyDiagnosticRules(condition.name, symptoms, patientInfo);
        
        // Calculate overall probability
        const probability = Math.min(1.0, 
          symptomScore * 0.5 + 
          demographicScore * 0.3 + 
          ruleScore * 0.2
        );

        if (probability > 0.1) { // Only include suggestions with reasonable probability
          suggestions.push({
            condition: condition.name,
            probability,
            reasoning: this.generateDiagnosticReasoning(condition, symptoms, probability),
            supportingSymptoms: this.findSupportingSymptoms(symptoms, condition.symptoms || []),
            recommendedTests: [],
            differentialDiagnoses: [],
            redFlags: []
          });
        }
      }

      // Sort by probability (highest first)
      suggestions.sort((a, b) => b.probability - a.probability);
      
      return suggestions.slice(0, 5); // Return top 5 suggestions

    } catch (error) {
      logError(error, 'MedicalRecommendationEngine.calculateDiagnosticProbabilities');
      return [];
    }
  }

  /**
   * Generate treatment recommendations
   */
  async generateTreatmentRecommendations(request: TreatmentRequest): Promise<TreatmentSuggestion[]> {
    try {
      const { diagnosis, patientInfo, severity, protocols } = request;
      const suggestions: TreatmentSuggestion[] = [];

      for (const protocol of protocols) {
        for (const treatment of protocol.treatments) {
          // Calculate treatment suitability score
          const suitabilityScore = this.calculateTreatmentSuitability(
            treatment,
            diagnosis,
            patientInfo,
            severity
          );

          if (suitabilityScore > 0.3) { // Only include suitable treatments
            suggestions.push({
              treatment: treatment.name,
              type: treatment.type,
              dosage: treatment.dosage,
              duration: treatment.duration,
              instructions: treatment.notes || `Follow standard protocol for ${treatment.name}`,
              contraindications: [],
              sideEffects: [],
              monitoring: protocol.monitoring
            });
          }
        }
      }

      // Sort by priority and suitability
      suggestions.sort((a, b) => {
        const priorityA = this.getTreatmentPriority(a.treatment);
        const priorityB = this.getTreatmentPriority(b.treatment);
        return priorityA - priorityB;
      });

      return suggestions.slice(0, 3); // Return top 3 treatment suggestions

    } catch (error) {
      logError(error, 'MedicalRecommendationEngine.generateTreatmentRecommendations');
      return [];
    }
  }

  /**
   * Analyze the type of medical request
   */
  private analyzeRequestType(query: string, entities: MedicalEntities): 'diagnostic' | 'treatment' | 'general' | 'referral' {
    const lowerQuery = query.toLowerCase();
    
    // Check for diagnostic keywords
    if (lowerQuery.includes('diagnos') || lowerQuery.includes('what') || lowerQuery.includes('condition')) {
      return 'diagnostic';
    }
    
    // Check for treatment keywords
    if (lowerQuery.includes('treat') || lowerQuery.includes('medica') || lowerQuery.includes('therap')) {
      return 'treatment';
    }
    
    // Check for referral keywords
    if (lowerQuery.includes('specialist') || lowerQuery.includes('refer') || lowerQuery.includes('consult')) {
      return 'referral';
    }
    
    // Check entities for context
    if (entities.symptoms.length > entities.conditions.length) {
      return 'diagnostic';
    }
    
    if (entities.medications.length > 0 || entities.procedures.length > 0) {
      return 'treatment';
    }
    
    return 'general';
  }

  /**
   * Generate scored recommendations based on request type
   */
  private async generateScoredRecommendations(
    type: 'diagnostic' | 'treatment' | 'general' | 'referral',
    entities: MedicalEntities,
    patientContext?: PatientContext,
    knowledge?: MedicalKnowledge,
    conversationContext?: ConversationContext | null
  ): Promise<ScoredRecommendation[]> {
    const recommendations: ScoredRecommendation[] = [];

    switch (type) {
      case 'diagnostic':
        recommendations.push(...await this.generateDiagnosticRecommendations(entities, patientContext, knowledge));
        break;
      
      case 'treatment':
        recommendations.push(...await this.generateTreatmentRecommendations2(entities, patientContext, knowledge));
        break;
      
      case 'referral':
        recommendations.push(...await this.generateReferralRecommendations(entities, patientContext));
        break;
      
      default:
        recommendations.push(...await this.generateGeneralRecommendations(entities, patientContext, knowledge));
        break;
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);
    
    return recommendations;
  }

  /**
   * Generate diagnostic recommendations
   */
  private async generateDiagnosticRecommendations(
    entities: MedicalEntities,
    patientContext?: PatientContext,
    knowledge?: MedicalKnowledge
  ): Promise<ScoredRecommendation[]> {
    const recommendations: ScoredRecommendation[] = [];

    if (entities.symptoms.length > 0) {
      // Recommend clinical evaluation
      recommendations.push({
        recommendation: 'Comprehensive clinical evaluation recommended',
        score: 0.9,
        reasoning: `Based on reported symptoms: ${entities.symptoms.join(', ')}`,
        evidence: ['Clinical assessment protocols', 'Symptom analysis'],
        confidence: 0.85
      });

      // Recommend specific tests based on symptoms
      if (entities.symptoms.some(s => s.includes('chest') || s.includes('heart'))) {
        recommendations.push({
          recommendation: 'Cardiac evaluation including ECG and chest X-ray',
          score: 0.8,
          reasoning: 'Cardiovascular symptoms detected',
          evidence: ['Cardiology guidelines', 'Symptom correlation'],
          confidence: 0.75
        });
      }

      if (entities.symptoms.some(s => s.includes('breath') || s.includes('cough'))) {
        recommendations.push({
          recommendation: 'Pulmonary function tests and chest imaging',
          score: 0.75,
          reasoning: 'Respiratory symptoms identified',
          evidence: ['Pulmonology guidelines', 'Clinical protocols'],
          confidence: 0.7
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate treatment recommendations
   */
  private async generateTreatmentRecommendations2(
    entities: MedicalEntities,
    patientContext?: PatientContext,
    knowledge?: MedicalKnowledge
  ): Promise<ScoredRecommendation[]> {
    const recommendations: ScoredRecommendation[] = [];

    if (entities.conditions.length > 0) {
      const condition = entities.conditions[0];
      
      recommendations.push({
        recommendation: `Evidence-based treatment protocol for ${condition}`,
        score: 0.9,
        reasoning: `Standard treatment approach for diagnosed ${condition}`,
        evidence: ['Clinical guidelines', 'Evidence-based medicine'],
        confidence: 0.8
      });

      // Lifestyle recommendations
      recommendations.push({
        recommendation: 'Lifestyle modifications and patient education',
        score: 0.7,
        reasoning: 'Comprehensive approach to treatment',
        evidence: ['Preventive medicine guidelines', 'Patient care standards'],
        confidence: 0.75
      });
    }

    return recommendations;
  }

  /**
   * Generate referral recommendations
   */
  private async generateReferralRecommendations(
    entities: MedicalEntities,
    patientContext?: PatientContext
  ): Promise<ScoredRecommendation[]> {
    const recommendations: ScoredRecommendation[] = [];

    // Determine specialist based on symptoms/conditions
    if (entities.symptoms.some(s => s.includes('heart') || s.includes('chest'))) {
      recommendations.push({
        recommendation: 'Cardiology consultation recommended',
        score: 0.85,
        reasoning: 'Cardiovascular symptoms require specialist evaluation',
        evidence: ['Cardiology referral guidelines'],
        confidence: 0.8
      });
    }

    if (entities.symptoms.some(s => s.includes('joint') || s.includes('muscle'))) {
      recommendations.push({
        recommendation: 'Rheumatology or Orthopedic consultation',
        score: 0.8,
        reasoning: 'Musculoskeletal symptoms need specialist assessment',
        evidence: ['Orthopedic referral protocols'],
        confidence: 0.75
      });
    }

    return recommendations;
  }

  /**
   * Generate general recommendations
   */
  private async generateGeneralRecommendations(
    entities: MedicalEntities,
    patientContext?: PatientContext,
    knowledge?: MedicalKnowledge
  ): Promise<ScoredRecommendation[]> {
    const recommendations: ScoredRecommendation[] = [];

    recommendations.push({
      recommendation: 'Comprehensive medical history and physical examination',
      score: 0.8,
      reasoning: 'Standard approach for medical consultation',
      evidence: ['Clinical practice guidelines', 'Medical standards'],
      confidence: 0.9
    });

    if (patientContext?.age && patientContext.age > 40) {
      recommendations.push({
        recommendation: 'Age-appropriate preventive screening',
        score: 0.7,
        reasoning: 'Preventive care based on age demographics',
        evidence: ['Preventive medicine guidelines', 'Screening protocols'],
        confidence: 0.8
      });
    }

    return recommendations;
  }

  /**
   * Calculate symptom match score
   */
  private calculateSymptomMatch(reportedSymptoms: string[], conditionSymptoms: string[]): number {
    if (conditionSymptoms.length === 0) return 0;

    let matchCount = 0;
    for (const reported of reportedSymptoms) {
      for (const condition of conditionSymptoms) {
        if (reported.toLowerCase().includes(condition.toLowerCase()) ||
            condition.toLowerCase().includes(reported.toLowerCase())) {
          matchCount++;
          break;
        }
      }
    }

    return matchCount / conditionSymptoms.length;
  }

  /**
   * Calculate demographic relevance
   */
  private calculateDemographicRelevance(condition: any, patientInfo: PatientContext): number {
    let score = 0.5; // Base score

    // Age relevance
    if (condition.age_groups && patientInfo.age) {
      const ageGroup = this.getAgeGroup(patientInfo.age);
      if (condition.age_groups.includes(ageGroup)) {
        score += 0.3;
      }
    }

    // Gender relevance
    if (condition.gender_predisposition && patientInfo.gender) {
      if (condition.gender_predisposition === patientInfo.gender || 
          condition.gender_predisposition === 'Both') {
        score += 0.2;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * Apply diagnostic rules
   */
  private applyDiagnosticRules(condition: string, symptoms: string[], patientInfo: PatientContext): number {
    const rule = this.diagnosticRules.get(condition.toLowerCase());
    return rule ? rule(symptoms, patientInfo) : 0.5;
  }

  /**
   * Generate diagnostic reasoning
   */
  private generateDiagnosticReasoning(condition: any, symptoms: string[], probability: number): string {
    const matchingSymptoms = this.findSupportingSymptoms(symptoms, condition.symptoms || []);
    
    return `Probability: ${(probability * 100).toFixed(1)}%. ` +
           `Matching symptoms: ${matchingSymptoms.join(', ')}. ` +
           `Consider differential diagnosis and confirmatory testing.`;
  }

  /**
   * Find supporting symptoms
   */
  private findSupportingSymptoms(reportedSymptoms: string[], conditionSymptoms: string[]): string[] {
    const supporting: string[] = [];
    
    for (const reported of reportedSymptoms) {
      for (const condition of conditionSymptoms) {
        if (reported.toLowerCase().includes(condition.toLowerCase()) ||
            condition.toLowerCase().includes(reported.toLowerCase())) {
          supporting.push(reported);
          break;
        }
      }
    }
    
    return supporting;
  }

  /**
   * Calculate treatment suitability
   */
  private calculateTreatmentSuitability(
    treatment: any,
    diagnosis: string,
    patientInfo: PatientContext,
    severity: string
  ): number {
    let score = 0.5; // Base score

    // Check if treatment matches diagnosis
    if (treatment.indications?.includes(diagnosis.toLowerCase())) {
      score += 0.4;
    }

    // Check severity appropriateness
    if (severity === 'severe' && treatment.priority <= 2) {
      score += 0.3;
    } else if (severity === 'moderate' && treatment.priority <= 3) {
      score += 0.2;
    }

    // Check for contraindications (simplified)
    if (patientInfo.allergies?.some(allergy => 
      treatment.name.toLowerCase().includes(allergy.toLowerCase()))) {
      score -= 0.5;
    }

    return Math.max(0, Math.min(1.0, score));
  }

  /**
   * Get treatment priority
   */
  private getTreatmentPriority(treatmentName: string): number {
    // This would be based on clinical guidelines
    // For now, return a default priority
    return 2;
  }

  /**
   * Assess urgency level
   */
  private assessUrgency(
    entities: MedicalEntities,
    patientContext?: PatientContext,
    recommendation?: ScoredRecommendation
  ): 'low' | 'medium' | 'high' | 'emergency' {
    // Check for emergency symptoms
    const emergencySymptoms = ['chest pain', 'difficulty breathing', 'severe headache', 'loss of consciousness'];
    for (const symptom of entities.symptoms) {
      if (emergencySymptoms.some(emergency => symptom.toLowerCase().includes(emergency))) {
        return 'emergency';
      }
    }

    // Check for high urgency indicators
    const highUrgencySymptoms = ['severe pain', 'high fever', 'bleeding', 'sudden onset'];
    for (const symptom of entities.symptoms) {
      if (highUrgencySymptoms.some(urgent => symptom.toLowerCase().includes(urgent))) {
        return 'high';
      }
    }

    // Check recommendation confidence
    if (recommendation && recommendation.confidence > 0.8) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Assess follow-up need
   */
  private assessFollowUpNeed(
    recommendation: ScoredRecommendation,
    urgency: 'low' | 'medium' | 'high' | 'emergency',
    patientContext?: PatientContext
  ): boolean {
    // Always require follow-up for high urgency or emergency
    if (urgency === 'high' || urgency === 'emergency') {
      return true;
    }

    // Require follow-up for low confidence recommendations
    if (recommendation.confidence < 0.6) {
      return true;
    }

    // Require follow-up for elderly patients
    if (patientContext?.age && patientContext.age > 65) {
      return true;
    }

    return false;
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
   * Initialize diagnostic rules
   */
  private initializeDiagnosticRules(): void {
    // Example diagnostic rules
    this.diagnosticRules.set('hypertension', (symptoms, patient) => {
      let score = 0.3;
      if (symptoms.some(s => s.includes('headache'))) score += 0.2;
      if (symptoms.some(s => s.includes('dizziness'))) score += 0.2;
      if (patient.age && patient.age > 40) score += 0.3;
      return Math.min(1.0, score);
    });

    this.diagnosticRules.set('diabetes', (symptoms, patient) => {
      let score = 0.2;
      if (symptoms.some(s => s.includes('thirst'))) score += 0.3;
      if (symptoms.some(s => s.includes('urination'))) score += 0.3;
      if (symptoms.some(s => s.includes('fatigue'))) score += 0.2;
      return Math.min(1.0, score);
    });
  }

  /**
   * Initialize treatment rules
   */
  private initializeTreatmentRules(): void {
    // Example treatment rules
    this.treatmentRules.set('hypertension', (diagnosis, patient) => {
      let score = 0.8;
      if (patient.age && patient.age > 65) score += 0.1;
      if (patient.medicalHistory?.includes('heart disease')) score += 0.1;
      return Math.min(1.0, score);
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.ruleWeights.clear();
    this.diagnosticRules.clear();
    this.treatmentRules.clear();
    this.isInitialized = false;
    logger.info('Medical Recommendation Engine cleaned up');
  }
}