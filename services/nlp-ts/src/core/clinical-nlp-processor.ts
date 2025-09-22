import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface ProcessingResult {
  success: boolean;
  processingTime: number;
  extractedEntities: MedicalEntity[];
  classification: DocumentClassification;
  summary?: string;
  structuredData?: StructuredClinicalData;
  confidence: number;
  errors?: string[];
}

export interface MedicalEntity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
  normalizedForm?: string;
  code?: string;
  codeSystem?: string;
}

export interface DocumentClassification {
  documentType: string;
  confidence: number;
  subTypes?: string[];
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface StructuredClinicalData {
  chiefComplaint?: string;
  historyPresentIllness?: string;
  pastMedicalHistory?: string[];
  medications?: MedicationInfo[];
  allergies?: AllergyInfo[];
  socialHistory?: string;
  familyHistory?: string;
  reviewOfSystems?: ReviewOfSystems;
  physicalExam?: PhysicalExamFindings;
  assessment?: string;
  plan?: TreatmentPlan[];
}

export interface MedicationInfo {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  startDate?: string;
  endDate?: string;
}

export interface AllergyInfo {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface ReviewOfSystems {
  constitutional?: string;
  cardiovascular?: string;
  respiratory?: string;
  gastrointestinal?: string;
  genitourinary?: string;
  musculoskeletal?: string;
  neurological?: string;
  psychiatric?: string;
  endocrine?: string;
  hematologic?: string;
  dermatologic?: string;
}

export interface PhysicalExamFindings {
  vitalSigns?: VitalSigns;
  general?: string;
  heent?: string;
  cardiovascular?: string;
  respiratory?: string;
  abdomen?: string;
  extremities?: string;
  neurological?: string;
  skin?: string;
}

export interface VitalSigns {
  temperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}

export interface TreatmentPlan {
  category: string;
  description: string;
  medications?: MedicationInfo[];
  procedures?: string[];
  followUp?: string;
  referrals?: string[];
}

export class ClinicalNLPProcessor {
  private initialized: boolean = false;
  private processingQueue: Map<string, ProcessingResult> = new Map();
  private medicalVocabulary: Map<string, string> = new Map();
  private abbreviations: Map<string, string> = new Map();
  private icd10Codes: Map<string, string> = new Map();
  private snomedCodes: Map<string, string> = new Map();

  constructor() {
    logger.info('Initializing Clinical NLP Processor');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Loading clinical vocabularies and models...');
      
      // Load medical vocabularies
      await this.loadMedicalVocabularies();
      
      // Initialize processing models
      await this.initializeModels();
      
      this.initialized = true;
      logger.info('Clinical NLP Processor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Clinical NLP Processor:', error);
      throw error;
    }
  }

  private async loadMedicalVocabularies(): Promise<void> {
    try {
      // Load clinical vocabulary
      const vocabPath = config.nlpModels.clinical.vocabularyPath;
      logger.debug(`Loading clinical vocabulary from ${vocabPath}`);
      
      // In a real implementation, this would load from files
      // For now, we'll populate with common medical terms
      this.populateDefaultVocabularies();
      
      logger.info(`Loaded ${this.medicalVocabulary.size} medical terms`);
      logger.info(`Loaded ${this.abbreviations.size} medical abbreviations`);
    } catch (error) {
      logger.error('Failed to load medical vocabularies:', error);
      throw error;
    }
  }

  private populateDefaultVocabularies(): void {
    // Medical vocabulary (common medical terms and their normalized forms)
    const medicalTerms = [
      ['hypertension', 'high blood pressure'],
      ['diabetes mellitus', 'diabetes'],
      ['myocardial infarction', 'heart attack'],
      ['cerebrovascular accident', 'stroke'],
      ['pneumonia', 'lung infection'],
      ['dyspnea', 'shortness of breath'],
      ['tachycardia', 'rapid heart rate'],
      ['bradycardia', 'slow heart rate'],
      ['edema', 'swelling'],
      ['syncope', 'fainting']
    ];
    
    medicalTerms.forEach(([term, normalized]) => {
      this.medicalVocabulary.set(term.toLowerCase(), normalized);
    });

    // Medical abbreviations
    const abbreviationsList = [
      ['BP', 'blood pressure'],
      ['HR', 'heart rate'],
      ['RR', 'respiratory rate'],
      ['O2Sat', 'oxygen saturation'],
      ['SOB', 'shortness of breath'],
      ['CAD', 'coronary artery disease'],
      ['CHF', 'congestive heart failure'],
      ['COPD', 'chronic obstructive pulmonary disease'],
      ['DM', 'diabetes mellitus'],
      ['HTN', 'hypertension'],
      ['MI', 'myocardial infarction'],
      ['CVA', 'cerebrovascular accident'],
      ['UTI', 'urinary tract infection'],
      ['URI', 'upper respiratory infection'],
      ['DVT', 'deep vein thrombosis'],
      ['PE', 'pulmonary embolism']
    ];
    
    abbreviationsList.forEach(([abbrev, expansion]) => {
      this.abbreviations.set(abbrev.toUpperCase(), expansion);
    });

    // Sample ICD-10 codes
    const icd10Codes = [
      ['I10', 'Essential hypertension'],
      ['E11.9', 'Type 2 diabetes mellitus without complications'],
      ['I21.9', 'Acute myocardial infarction, unspecified'],
      ['I63.9', 'Cerebral infarction, unspecified'],
      ['J44.1', 'Chronic obstructive pulmonary disease with acute exacerbation']
    ];
    
    icd10Codes.forEach(([code, description]) => {
      this.icd10Codes.set(code, description);
    });
  }

  private async initializeModels(): Promise<void> {
    // In a real implementation, this would initialize TensorFlow.js models
    // or other NLP models for clinical text processing
    logger.info('Models initialized (placeholder implementation)');
  }

  async processDocument(
    text: string,
    documentId: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    if (!this.initialized) {
      throw new Error('Clinical NLP Processor not initialized');
    }

    const startTime = Date.now();
    
    try {
      logger.debug(`Processing document ${documentId} (${text.length} characters)`);
      
      // Validate input
      if (!text || text.length === 0) {
        throw new Error('Text content is required');
      }
      
      if (text.length > config.processing.maxTextLength) {
        throw new Error(`Text too long. Max length: ${config.processing.maxTextLength}`);
      }

      // Preprocess text
      const preprocessedText = await this.preprocessText(text);
      
      // Extract medical entities
      const entities = await this.extractMedicalEntities(preprocessedText);
      
      // Classify document
      const classification = await this.classifyDocument(preprocessedText);
      
      // Generate summary if requested
      let summary: string | undefined;
      if (options.generateSummary) {
        summary = await this.generateSummary(preprocessedText);
      }
      
      // Extract structured data if requested
      let structuredData: StructuredClinicalData | undefined;
      if (options.extractStructuredData) {
        structuredData = await this.extractStructuredData(preprocessedText);
      }
      
      const processingTime = Date.now() - startTime;
      
      const result: ProcessingResult = {
        success: true,
        processingTime,
        extractedEntities: entities,
        classification,
        summary,
        structuredData,
        confidence: this.calculateOverallConfidence(entities, classification)
      };
      
      // Cache result
      this.processingQueue.set(documentId, result);
      
      logger.info(`Document ${documentId} processed successfully in ${processingTime}ms`);
      return result;
      
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error(`Failed to process document ${documentId}:`, error);
      
      return {
        success: false,
        processingTime,
        extractedEntities: [],
        classification: { documentType: 'unknown', confidence: 0 },
        confidence: 0,
        errors: [error.message]
      };
    }
  }

  private async preprocessText(text: string): Promise<string> {
    // Basic text preprocessing
    let processed = text.trim();
    
    // Expand medical abbreviations
    for (const [abbrev, expansion] of this.abbreviations) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      processed = processed.replace(regex, expansion);
    }
    
    // Clean up whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    return processed;
  }

  private async extractMedicalEntities(text: string): Promise<MedicalEntity[]> {
    const entities: MedicalEntity[] = [];
    
    // Simple pattern-based entity extraction
    // In a real implementation, this would use trained NER models
    
    // Extract vital signs
    const vitalPatterns = [
      { pattern: /(?:BP|blood pressure)[:\s]*(\d+\/\d+)/gi, label: 'VITAL_SIGN' },
      { pattern: /(?:HR|heart rate)[:\s]*(\d+)/gi, label: 'VITAL_SIGN' },
      { pattern: /(?:temp|temperature)[:\s]*(\d+\.?\d*)/gi, label: 'VITAL_SIGN' },
      { pattern: /(?:O2|oxygen)[:\s]*(\d+%)/gi, label: 'VITAL_SIGN' }
    ];
    
    vitalPatterns.forEach(({ pattern, label }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label,
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9
        });
      }
    });
    
    // Extract medical conditions
    for (const [term, normalized] of this.medicalVocabulary) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          text: match[0],
          label: 'DISEASE',
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8,
          normalizedForm: normalized
        });
      }
    }
    
    return entities.sort((a, b) => a.start - b.start);
  }

  private async classifyDocument(text: string): Promise<DocumentClassification> {
    // Simple rule-based classification
    // In a real implementation, this would use trained classification models
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('discharge') || lowerText.includes('discharge summary')) {
      return {
        documentType: 'discharge_summary',
        confidence: 0.95,
        urgencyLevel: 'medium'
      };
    }
    
    if (lowerText.includes('progress note') || lowerText.includes('daily note')) {
      return {
        documentType: 'progress_note',
        confidence: 0.9,
        urgencyLevel: 'low'
      };
    }
    
    if (lowerText.includes('consultation') || lowerText.includes('consult')) {
      return {
        documentType: 'consultation',
        confidence: 0.85,
        urgencyLevel: 'medium'
      };
    }
    
    if (lowerText.includes('operative') || lowerText.includes('surgery')) {
      return {
        documentType: 'operative_report',
        confidence: 0.9,
        urgencyLevel: 'high'
      };
    }
    
    if (lowerText.includes('pathology') || lowerText.includes('biopsy')) {
      return {
        documentType: 'pathology_report',
        confidence: 0.9,
        urgencyLevel: 'high'
      };
    }
    
    if (lowerText.includes('radiology') || lowerText.includes('imaging')) {
      return {
        documentType: 'radiology_report',
        confidence: 0.85,
        urgencyLevel: 'medium'
      };
    }
    
    if (lowerText.includes('lab') || lowerText.includes('laboratory')) {
      return {
        documentType: 'laboratory_report',
        confidence: 0.8,
        urgencyLevel: 'medium'
      };
    }
    
    return {
      documentType: 'general_note',
      confidence: 0.5,
      urgencyLevel: 'low'
    };
  }

  private async generateSummary(text: string): Promise<string> {
    // Simple extractive summarization
    // In a real implementation, this would use advanced summarization models
    
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    
    if (sentences.length <= 3) {
      return text.substring(0, config.summarization.maxSummaryLength);
    }
    
    // Score sentences based on medical term frequency
    const scoredSentences = sentences.map(sentence => {
      let score = 0;
      for (const [term] of this.medicalVocabulary) {
        if (sentence.toLowerCase().includes(term)) {
          score++;
        }
      }
      return { sentence, score };
    });
    
    // Sort by score and take top sentences
    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, 3).map(item => item.sentence);
    
    return topSentences.join('. ') + '.';
  }

  private async extractStructuredData(text: string): Promise<StructuredClinicalData> {
    const structuredData: StructuredClinicalData = {};
    
    // Extract chief complaint
    const ccMatch = text.match(/(?:chief complaint|cc)[:\s]*([^.\n]+)/i);
    if (ccMatch) {
      structuredData.chiefComplaint = ccMatch[1].trim();
    }
    
    // Extract medications
    const medicationPatterns = [
      /(\w+)\s+(\d+\s*mg)\s+(.*?)(?:daily|bid|tid|qid)/gi
    ];
    
    const medications: MedicationInfo[] = [];
    medicationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        medications.push({
          name: match[1],
          dosage: match[2],
          frequency: match[3]
        });
      }
    });
    
    if (medications.length > 0) {
      structuredData.medications = medications;
    }
    
    // Extract vital signs
    const vitalSigns: VitalSigns = {};
    
    const bpMatch = text.match(/(?:BP|blood pressure)[:\s]*(\d+\/\d+)/i);
    if (bpMatch) {
      vitalSigns.bloodPressure = bpMatch[1];
    }
    
    const hrMatch = text.match(/(?:HR|heart rate)[:\s]*(\d+)/i);
    if (hrMatch) {
      vitalSigns.heartRate = parseInt(hrMatch[1]);
    }
    
    if (Object.keys(vitalSigns).length > 0) {
      structuredData.physicalExam = { vitalSigns };
    }
    
    return structuredData;
  }

  private calculateOverallConfidence(
    entities: MedicalEntity[],
    classification: DocumentClassification
  ): number {
    if (entities.length === 0) {
      return classification.confidence * 0.5;
    }
    
    const avgEntityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
    return (avgEntityConfidence + classification.confidence) / 2;
  }

  async batchProcessDocuments(
    documents: Array<{ id: string; text: string }>,
    options: ProcessingOptions = {}
  ): Promise<Map<string, ProcessingResult>> {
    const results = new Map<string, ProcessingResult>();
    const batchSize = config.processing.batchSize;
    
    logger.info(`Processing ${documents.length} documents in batches of ${batchSize}`);
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      const batchPromises = batch.map(doc => 
        this.processDocument(doc.text, doc.id, options)
          .then(result => ({ id: doc.id, result }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ id, result }) => {
        results.set(id, result);
      });
      
      logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(documents.length / batchSize)}`);
    }
    
    return results;
  }

  getProcessingResult(documentId: string): ProcessingResult | undefined {
    return this.processingQueue.get(documentId);
  }

  clearProcessingCache(): void {
    this.processingQueue.clear();
    logger.info('Processing cache cleared');
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async cleanup(): Promise<void> {
    this.processingQueue.clear();
    this.medicalVocabulary.clear();
    this.abbreviations.clear();
    this.icd10Codes.clear();
    this.snomedCodes.clear();
    this.initialized = false;
    logger.info('Clinical NLP Processor cleaned up');
  }
}

export interface ProcessingOptions {
  generateSummary?: boolean;
  extractStructuredData?: boolean;
  includeConfidenceScores?: boolean;
  enableNormalization?: boolean;
}