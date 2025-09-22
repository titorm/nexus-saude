import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { MedicalEntity } from './clinical-nlp-processor.js';

export interface EntityExtractionResult {
  entities: MedicalEntity[];
  extractionTime: number;
  confidence: number;
  normalizedEntities: NormalizedEntity[];
  entityRelations: EntityRelation[];
  metadata: ExtractionMetadata;
}

export interface NormalizedEntity {
  originalText: string;
  normalizedText: string;
  entityType: string;
  confidence: number;
  codes: EntityCode[];
  attributes: EntityAttributes;
}

export interface EntityCode {
  codeSystem: string;
  code: string;
  display: string;
  version?: string;
}

export interface EntityAttributes {
  negated?: boolean;
  temporal?: 'past' | 'present' | 'future';
  certainty?: 'definite' | 'probable' | 'possible';
  severity?: 'mild' | 'moderate' | 'severe';
  laterality?: 'left' | 'right' | 'bilateral';
  anatomicalSite?: string;
}

export interface EntityRelation {
  sourceEntity: string;
  targetEntity: string;
  relationType: string;
  confidence: number;
}

export interface ExtractionMetadata {
  totalEntitiesFound: number;
  entityTypeDistribution: Record<string, number>;
  averageConfidence: number;
  processingModel: string;
  extractionParameters: Record<string, any>;
}

export class MedicalEntityExtractor {
  private initialized: boolean = false;
  private entityPatterns: Map<string, EntityPattern[]> = new Map();
  private medicalCodes: Map<string, EntityCode[]> = new Map();
  private negationPatterns: RegExp[] = [];
  private temporalPatterns: Map<string, RegExp[]> = new Map();
  private severityPatterns: Map<string, RegExp[]> = new Map();
  private extractionHistory: Map<string, EntityExtractionResult> = new Map();

  constructor() {
    logger.info('Initializing Medical Entity Extractor');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Loading entity extraction models and patterns...');
      
      await this.loadEntityPatterns();
      await this.loadMedicalCodes();
      await this.loadContextualPatterns();
      
      this.initialized = true;
      logger.info('Medical Entity Extractor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Medical Entity Extractor:', error);
      throw error;
    }
  }

  private async loadEntityPatterns(): Promise<void> {
    // Define patterns for different medical entity types
    const diseasePatterns: EntityPattern[] = [
      { pattern: /\b(?:diabetes(?:\s+mellitus)?|dm)\b/gi, type: 'DISEASE', confidence: 0.9 },
      { pattern: /\b(?:hypertension|htn|high\s+blood\s+pressure)\b/gi, type: 'DISEASE', confidence: 0.9 },
      { pattern: /\b(?:myocardial\s+infarction|mi|heart\s+attack)\b/gi, type: 'DISEASE', confidence: 0.95 },
      { pattern: /\b(?:pneumonia|lung\s+infection)\b/gi, type: 'DISEASE', confidence: 0.85 },
      { pattern: /\b(?:copd|chronic\s+obstructive\s+pulmonary\s+disease)\b/gi, type: 'DISEASE', confidence: 0.9 },
      { pattern: /\b(?:stroke|cva|cerebrovascular\s+accident)\b/gi, type: 'DISEASE', confidence: 0.9 },
      { pattern: /\b(?:cancer|carcinoma|malignancy|tumor|neoplasm)\b/gi, type: 'DISEASE', confidence: 0.8 }
    ];

    const symptomPatterns: EntityPattern[] = [
      { pattern: /\b(?:chest\s+pain|angina)\b/gi, type: 'SYMPTOM', confidence: 0.85 },
      { pattern: /\b(?:shortness\s+of\s+breath|sob|dyspnea)\b/gi, type: 'SYMPTOM', confidence: 0.9 },
      { pattern: /\b(?:headache|cephalgia)\b/gi, type: 'SYMPTOM', confidence: 0.8 },
      { pattern: /\b(?:nausea|vomiting)\b/gi, type: 'SYMPTOM', confidence: 0.8 },
      { pattern: /\b(?:fever|pyrexia|febrile)\b/gi, type: 'SYMPTOM', confidence: 0.85 },
      { pattern: /\b(?:fatigue|weakness|tired)\b/gi, type: 'SYMPTOM', confidence: 0.7 },
      { pattern: /\b(?:dizziness|vertigo|lightheaded)\b/gi, type: 'SYMPTOM', confidence: 0.8 }
    ];

    const medicationPatterns: EntityPattern[] = [
      { pattern: /\b(?:aspirin|asa)\b/gi, type: 'MEDICATION', confidence: 0.9 },
      { pattern: /\b(?:metformin|glucophage)\b/gi, type: 'MEDICATION', confidence: 0.95 },
      { pattern: /\b(?:lisinopril|zestril)\b/gi, type: 'MEDICATION', confidence: 0.95 },
      { pattern: /\b(?:atorvastatin|lipitor)\b/gi, type: 'MEDICATION', confidence: 0.95 },
      { pattern: /\b(?:warfarin|coumadin)\b/gi, type: 'MEDICATION', confidence: 0.95 },
      { pattern: /\b(?:insulin|lantus|humalog)\b/gi, type: 'MEDICATION', confidence: 0.9 }
    ];

    const procedurePatterns: EntityPattern[] = [
      { pattern: /\b(?:appendectomy|appendix\s+removal)\b/gi, type: 'PROCEDURE', confidence: 0.9 },
      { pattern: /\b(?:colonoscopy|colon\s+exam)\b/gi, type: 'PROCEDURE', confidence: 0.9 },
      { pattern: /\b(?:mri|magnetic\s+resonance\s+imaging)\b/gi, type: 'PROCEDURE', confidence: 0.85 },
      { pattern: /\b(?:ct\s+scan|computed\s+tomography)\b/gi, type: 'PROCEDURE', confidence: 0.85 },
      { pattern: /\b(?:x-ray|radiograph)\b/gi, type: 'PROCEDURE', confidence: 0.8 },
      { pattern: /\b(?:ecg|ekg|electrocardiogram)\b/gi, type: 'PROCEDURE', confidence: 0.9 },
      { pattern: /\b(?:biopsy|tissue\s+sample)\b/gi, type: 'PROCEDURE', confidence: 0.85 }
    ];

    const anatomyPatterns: EntityPattern[] = [
      { pattern: /\b(?:heart|cardiac|myocardium)\b/gi, type: 'ANATOMY', confidence: 0.8 },
      { pattern: /\b(?:lung|pulmonary|respiratory)\b/gi, type: 'ANATOMY', confidence: 0.8 },
      { pattern: /\b(?:brain|cerebral|neurological)\b/gi, type: 'ANATOMY', confidence: 0.8 },
      { pattern: /\b(?:liver|hepatic)\b/gi, type: 'ANATOMY', confidence: 0.85 },
      { pattern: /\b(?:kidney|renal|nephro)\b/gi, type: 'ANATOMY', confidence: 0.85 },
      { pattern: /\b(?:stomach|gastric)\b/gi, type: 'ANATOMY', confidence: 0.8 }
    ];

    const testPatterns: EntityPattern[] = [
      { pattern: /\b(?:blood\s+glucose|bg|blood\s+sugar)\b/gi, type: 'TEST', confidence: 0.9 },
      { pattern: /\b(?:hemoglobin\s+a1c|hba1c|a1c)\b/gi, type: 'TEST', confidence: 0.95 },
      { pattern: /\b(?:cholesterol|ldl|hdl)\b/gi, type: 'TEST', confidence: 0.85 },
      { pattern: /\b(?:blood\s+pressure|bp)\b/gi, type: 'TEST', confidence: 0.8 },
      { pattern: /\b(?:complete\s+blood\s+count|cbc)\b/gi, type: 'TEST', confidence: 0.9 },
      { pattern: /\b(?:basic\s+metabolic\s+panel|bmp)\b/gi, type: 'TEST', confidence: 0.9 }
    ];

    // Store patterns by type
    this.entityPatterns.set('DISEASE', diseasePatterns);
    this.entityPatterns.set('SYMPTOM', symptomPatterns);
    this.entityPatterns.set('MEDICATION', medicationPatterns);
    this.entityPatterns.set('PROCEDURE', procedurePatterns);
    this.entityPatterns.set('ANATOMY', anatomyPatterns);
    this.entityPatterns.set('TEST', testPatterns);

    const totalPatterns = Array.from(this.entityPatterns.values())
      .reduce((sum, patterns) => sum + patterns.length, 0);
    
    logger.info(`Loaded ${totalPatterns} entity patterns across ${this.entityPatterns.size} types`);
  }

  private async loadMedicalCodes(): Promise<void> {
    // Load ICD-10, SNOMED, and other medical coding systems
    const icd10Codes = new Map([
      ['diabetes', [
        { codeSystem: 'ICD-10', code: 'E11.9', display: 'Type 2 diabetes mellitus without complications' },
        { codeSystem: 'ICD-10', code: 'E10.9', display: 'Type 1 diabetes mellitus without complications' }
      ]],
      ['hypertension', [
        { codeSystem: 'ICD-10', code: 'I10', display: 'Essential hypertension' }
      ]],
      ['myocardial infarction', [
        { codeSystem: 'ICD-10', code: 'I21.9', display: 'Acute myocardial infarction, unspecified' }
      ]],
      ['pneumonia', [
        { codeSystem: 'ICD-10', code: 'J18.9', display: 'Pneumonia, unspecified organism' }
      ]]
    ]);

    const snomedCodes = new Map([
      ['aspirin', [
        { codeSystem: 'SNOMED-CT', code: '387458008', display: 'Aspirin (substance)' }
      ]],
      ['metformin', [
        { codeSystem: 'SNOMED-CT', code: '387517004', display: 'Metformin (substance)' }
      ]],
      ['chest pain', [
        { codeSystem: 'SNOMED-CT', code: '29857009', display: 'Chest pain (finding)' }
      ]]
    ]);

    // Merge all code systems
    this.medicalCodes = new Map([...icd10Codes, ...snomedCodes]);
    
    logger.info(`Loaded ${this.medicalCodes.size} medical code mappings`);
  }

  private async loadContextualPatterns(): Promise<void> {
    // Negation patterns
    this.negationPatterns = [
      /\b(?:no|not|without|denies|negative|absent|rule\s+out)\b/gi,
      /\b(?:unlikely|doubtful|questionable)\b/gi
    ];

    // Temporal patterns
    this.temporalPatterns.set('past', [
      /\b(?:history\s+of|previous|prior|past|formerly)\b/gi,
      /\b(?:years?\s+ago|months?\s+ago|weeks?\s+ago)\b/gi
    ]);

    this.temporalPatterns.set('present', [
      /\b(?:current|currently|now|present|today|active)\b/gi,
      /\b(?:acute|ongoing|recent)\b/gi
    ]);

    this.temporalPatterns.set('future', [
      /\b(?:planned|scheduled|will|future|upcoming)\b/gi,
      /\b(?:prevention|prophylaxis)\b/gi
    ]);

    // Severity patterns
    this.severityPatterns.set('mild', [
      /\b(?:mild|slight|minor|minimal)\b/gi
    ]);

    this.severityPatterns.set('moderate', [
      /\b(?:moderate|moderately|medium)\b/gi
    ]);

    this.severityPatterns.set('severe', [
      /\b(?:severe|severely|serious|significant|marked|extreme)\b/gi
    ]);

    logger.info('Loaded contextual patterns for negation, temporal, and severity analysis');
  }

  async extractEntities(text: string, documentId?: string): Promise<EntityExtractionResult> {
    if (!this.initialized) {
      throw new Error('Medical Entity Extractor not initialized');
    }

    const startTime = Date.now();

    try {
      logger.debug(`Extracting entities from document ${documentId || 'unnamed'} (${text.length} characters)`);

      // Extract raw entities using patterns
      const rawEntities = await this.extractRawEntities(text);
      
      // Apply contextual analysis
      const contextualEntities = await this.applyContextualAnalysis(text, rawEntities);
      
      // Normalize entities
      const normalizedEntities = await this.normalizeEntities(contextualEntities);
      
      // Find entity relations
      const entityRelations = await this.findEntityRelations(text, contextualEntities);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(contextualEntities);
      
      // Generate metadata
      const metadata = this.generateExtractionMetadata(contextualEntities);

      const extractionTime = Date.now() - startTime;

      const result: EntityExtractionResult = {
        entities: contextualEntities,
        extractionTime,
        confidence,
        normalizedEntities,
        entityRelations,
        metadata
      };

      // Cache result
      if (documentId) {
        this.extractionHistory.set(documentId, result);
      }

      logger.debug(`Extracted ${contextualEntities.length} entities in ${extractionTime}ms`);
      return result;

    } catch (error: any) {
      logger.error(`Failed to extract entities from document ${documentId}:`, error);
      throw error;
    }
  }

  private async extractRawEntities(text: string): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];

    // Process each entity type
    for (const [entityType, patterns] of this.entityPatterns) {
      for (const pattern of patterns) {
        let match;
        // Reset regex lastIndex for global patterns
        pattern.pattern.lastIndex = 0;
        
        while ((match = pattern.pattern.exec(text)) !== null) {
          entities.push({
            text: match[0],
            label: pattern.type,
            start: match.index,
            end: match.index + match[0].length,
            confidence: pattern.confidence
          });
        }
      }
    }

    // Remove overlapping entities (keep the one with higher confidence)
    const filteredEntities = this.removeOverlappingEntities(entities);
    
    return filteredEntities.sort((a, b) => a.start - b.start);
  }

  private removeOverlappingEntities(entities: MedicalEntity[]): MedicalEntity[] {
    const sorted = entities.sort((a, b) => a.start - b.start);
    const filtered: MedicalEntity[] = [];

    for (const entity of sorted) {
      const overlapping = filtered.find(existing => 
        (entity.start >= existing.start && entity.start < existing.end) ||
        (entity.end > existing.start && entity.end <= existing.end) ||
        (entity.start <= existing.start && entity.end >= existing.end)
      );

      if (!overlapping) {
        filtered.push(entity);
      } else if (entity.confidence > overlapping.confidence) {
        // Replace with higher confidence entity
        const index = filtered.indexOf(overlapping);
        filtered[index] = entity;
      }
    }

    return filtered;
  }

  private async applyContextualAnalysis(text: string, entities: MedicalEntity[]): Promise<MedicalEntity[]> {
    return entities.map(entity => {
      const contextualEntity = { ...entity };
      
      // Get surrounding context (50 characters before and after)
      const contextStart = Math.max(0, entity.start - 50);
      const contextEnd = Math.min(text.length, entity.end + 50);
      const context = text.substring(contextStart, contextEnd);

      // Check for negation
      const isNegated = this.negationPatterns.some(pattern => pattern.test(context));
      
      // Check temporal context
      let temporal: 'past' | 'present' | 'future' | undefined;
      for (const [timeframe, patterns] of this.temporalPatterns) {
        if (patterns.some(pattern => pattern.test(context))) {
          temporal = timeframe as 'past' | 'present' | 'future';
          break;
        }
      }

      // Check severity
      let severity: 'mild' | 'moderate' | 'severe' | undefined;
      for (const [severityLevel, patterns] of this.severityPatterns) {
        if (patterns.some(pattern => pattern.test(context))) {
          severity = severityLevel as 'mild' | 'moderate' | 'severe';
          break;
        }
      }

      // Adjust confidence based on context
      if (isNegated) {
        contextualEntity.confidence *= 0.7; // Reduce confidence for negated entities
      }
      if (temporal === 'past') {
        contextualEntity.confidence *= 0.9; // Slightly reduce for historical findings
      }

      return contextualEntity;
    });
  }

  private async normalizeEntities(entities: MedicalEntity[]): Promise<NormalizedEntity[]> {
    return entities.map(entity => {
      const normalizedText = this.normalizeEntityText(entity.text);
      const codes = this.getEntityCodes(normalizedText);
      const attributes = this.extractEntityAttributes(entity);

      return {
        originalText: entity.text,
        normalizedText,
        entityType: entity.label,
        confidence: entity.confidence,
        codes,
        attributes
      };
    });
  }

  private normalizeEntityText(text: string): string {
    // Basic normalization: lowercase, remove extra spaces, standardize terms
    let normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Standardize common variations
    const standardizations = [
      [/\bmi\b/g, 'myocardial infarction'],
      [/\bhtn\b/g, 'hypertension'],
      [/\bdm\b/g, 'diabetes mellitus'],
      [/\bsob\b/g, 'shortness of breath'],
      [/\bcad\b/g, 'coronary artery disease']
    ];

    standardizations.forEach(([pattern, replacement]) => {
      normalized = normalized.replace(pattern, replacement as string);
    });

    return normalized;
  }

  private getEntityCodes(normalizedText: string): EntityCode[] {
    const codes = this.medicalCodes.get(normalizedText);
    return codes || [];
  }

  private extractEntityAttributes(entity: MedicalEntity): EntityAttributes {
    const attributes: EntityAttributes = {};
    
    // This would be enhanced with more sophisticated attribute extraction
    // For now, using basic pattern matching
    
    if (entity.text.toLowerCase().includes('left')) {
      attributes.laterality = 'left';
    } else if (entity.text.toLowerCase().includes('right')) {
      attributes.laterality = 'right';
    } else if (entity.text.toLowerCase().includes('bilateral')) {
      attributes.laterality = 'bilateral';
    }

    return attributes;
  }

  private async findEntityRelations(text: string, entities: MedicalEntity[]): Promise<EntityRelation[]> {
    const relations: EntityRelation[] = [];
    
    // Find relationships between entities
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        // Check if entities are close to each other (within 100 characters)
        const distance = Math.abs(entity1.start - entity2.start);
        if (distance <= 100) {
          const relation = this.determineRelationType(entity1, entity2, text);
          if (relation) {
            relations.push({
              sourceEntity: entity1.text,
              targetEntity: entity2.text,
              relationType: relation,
              confidence: 0.7 // Base confidence for relations
            });
          }
        }
      }
    }

    return relations;
  }

  private determineRelationType(entity1: MedicalEntity, entity2: MedicalEntity, text: string): string | null {
    // Simple rule-based relation detection
    if (entity1.label === 'DISEASE' && entity2.label === 'SYMPTOM') {
      return 'has_symptom';
    }
    if (entity1.label === 'DISEASE' && entity2.label === 'MEDICATION') {
      return 'treated_with';
    }
    if (entity1.label === 'SYMPTOM' && entity2.label === 'ANATOMY') {
      return 'located_in';
    }
    if (entity1.label === 'PROCEDURE' && entity2.label === 'ANATOMY') {
      return 'performed_on';
    }
    if (entity1.label === 'TEST' && entity2.label === 'DISEASE') {
      return 'diagnoses';
    }

    return null;
  }

  private calculateOverallConfidence(entities: MedicalEntity[]): number {
    if (entities.length === 0) return 0;
    
    const avgConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private generateExtractionMetadata(entities: MedicalEntity[]): ExtractionMetadata {
    const entityTypeDistribution: Record<string, number> = {};
    
    entities.forEach(entity => {
      entityTypeDistribution[entity.label] = (entityTypeDistribution[entity.label] || 0) + 1;
    });

    const avgConfidence = entities.length > 0 
      ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length 
      : 0;

    return {
      totalEntitiesFound: entities.length,
      entityTypeDistribution,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      processingModel: 'pattern-based-v1',
      extractionParameters: {
        confidenceThreshold: config.entityExtraction.confidenceThreshold,
        enableNormalization: config.entityExtraction.enableNormalization
      }
    };
  }

  async batchExtractEntities(
    documents: Array<{ id: string; text: string }>
  ): Promise<Map<string, EntityExtractionResult>> {
    const results = new Map<string, EntityExtractionResult>();
    
    logger.info(`Extracting entities from ${documents.length} documents in batch`);
    
    const promises = documents.map(async doc => {
      try {
        const result = await this.extractEntities(doc.text, doc.id);
        return { id: doc.id, result };
      } catch (error) {
        logger.error(`Failed to extract entities from document ${doc.id}:`, error);
        return {
          id: doc.id,
          result: {
            entities: [],
            extractionTime: 0,
            confidence: 0,
            normalizedEntities: [],
            entityRelations: [],
            metadata: {
              totalEntitiesFound: 0,
              entityTypeDistribution: {},
              averageConfidence: 0,
              processingModel: 'error',
              extractionParameters: {}
            }
          }
        };
      }
    });

    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });

    return results;
  }

  getExtractionHistory(documentId: string): EntityExtractionResult | undefined {
    return this.extractionHistory.get(documentId);
  }

  clearHistory(): void {
    this.extractionHistory.clear();
    logger.info('Entity extraction history cleared');
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async cleanup(): Promise<void> {
    this.entityPatterns.clear();
    this.medicalCodes.clear();
    this.negationPatterns = [];
    this.temporalPatterns.clear();
    this.severityPatterns.clear();
    this.extractionHistory.clear();
    this.initialized = false;
    logger.info('Medical Entity Extractor cleaned up');
  }
}

interface EntityPattern {
  pattern: RegExp;
  type: string;
  confidence: number;
}