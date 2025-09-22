import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface ClassificationResult {
  documentType: string;
  confidence: number;
  subTypes?: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  specialtyArea?: string;
  processingPriority: number;
  metadata: ClassificationMetadata;
}

export interface ClassificationMetadata {
  wordCount: number;
  sentenceCount: number;
  medicalTermDensity: number;
  structuredContentScore: number;
  clinicalIndicators: string[];
  suggestedActions: string[];
}

export interface DocumentFeatures {
  lengthFeatures: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    averageWordsPerSentence: number;
  };
  contentFeatures: {
    medicalTermFrequency: number;
    abbreviationFrequency: number;
    numericalDataFrequency: number;
    structuredSectionCount: number;
  };
  linguisticFeatures: {
    technicalComplexity: number;
    readabilityScore: number;
    formalityScore: number;
  };
  clinicalFeatures: {
    diagnosticReferences: number;
    treatmentReferences: number;
    medicationReferences: number;
    procedureReferences: number;
    anatomicalReferences: number;
  };
}

export class DocumentClassifier {
  private initialized: boolean = false;
  private documentTypePatterns: Map<string, DocumentTypePattern> = new Map();
  private specialtyKeywords: Map<string, string[]> = new Map();
  private urgencyKeywords: Map<string, string[]> = new Map();
  private classificationHistory: Map<string, ClassificationResult> = new Map();

  constructor() {
    logger.info('Initializing Document Classifier');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Loading classification patterns and models...');
      
      await this.loadDocumentTypePatterns();
      await this.loadSpecialtyKeywords();
      await this.loadUrgencyKeywords();
      
      this.initialized = true;
      logger.info('Document Classifier initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Document Classifier:', error);
      throw error;
    }
  }

  private async loadDocumentTypePatterns(): Promise<void> {
    // Define patterns for different document types
    const patterns: DocumentTypePattern[] = [
      {
        type: 'discharge_summary',
        keywords: ['discharge', 'discharge summary', 'hospital course', 'disposition'],
        requiredSections: ['diagnosis', 'medications', 'follow-up'],
        confidenceWeight: 0.95,
        urgencyLevel: 'medium',
        specialtyArea: 'general'
      },
      {
        type: 'progress_note',
        keywords: ['progress note', 'daily note', 'soap', 'subjective', 'objective'],
        requiredSections: ['assessment', 'plan'],
        confidenceWeight: 0.9,
        urgencyLevel: 'low',
        specialtyArea: 'general'
      },
      {
        type: 'consultation',
        keywords: ['consultation', 'consult', 'referral', 'specialist opinion'],
        requiredSections: ['reason for consultation', 'recommendations'],
        confidenceWeight: 0.85,
        urgencyLevel: 'medium',
        specialtyArea: 'specialty'
      },
      {
        type: 'operative_report',
        keywords: ['operative report', 'surgery', 'procedure', 'operation', 'surgical'],
        requiredSections: ['procedure', 'findings', 'complications'],
        confidenceWeight: 0.92,
        urgencyLevel: 'high',
        specialtyArea: 'surgical'
      },
      {
        type: 'pathology_report',
        keywords: ['pathology', 'biopsy', 'specimen', 'histology', 'cytology'],
        requiredSections: ['specimen', 'diagnosis', 'microscopic'],
        confidenceWeight: 0.9,
        urgencyLevel: 'high',
        specialtyArea: 'pathology'
      },
      {
        type: 'radiology_report',
        keywords: ['radiology', 'imaging', 'x-ray', 'ct scan', 'mri', 'ultrasound'],
        requiredSections: ['technique', 'findings', 'impression'],
        confidenceWeight: 0.88,
        urgencyLevel: 'medium',
        specialtyArea: 'radiology'
      },
      {
        type: 'laboratory_report',
        keywords: ['laboratory', 'lab results', 'blood work', 'chemistry', 'hematology'],
        requiredSections: ['results', 'reference ranges'],
        confidenceWeight: 0.85,
        urgencyLevel: 'medium',
        specialtyArea: 'laboratory'
      },
      {
        type: 'emergency_note',
        keywords: ['emergency', 'er', 'trauma', 'urgent', 'stat', 'emergency department'],
        requiredSections: ['chief complaint', 'triage'],
        confidenceWeight: 0.9,
        urgencyLevel: 'critical',
        specialtyArea: 'emergency'
      },
      {
        type: 'h_and_p',
        keywords: ['history and physical', 'h&p', 'admission note', 'initial assessment'],
        requiredSections: ['history', 'physical exam', 'assessment', 'plan'],
        confidenceWeight: 0.88,
        urgencyLevel: 'medium',
        specialtyArea: 'general'
      }
    ];

    patterns.forEach(pattern => {
      this.documentTypePatterns.set(pattern.type, pattern);
    });

    logger.info(`Loaded ${patterns.length} document type patterns`);
  }

  private async loadSpecialtyKeywords(): Promise<void> {
    const specialties = new Map([
      ['cardiology', ['heart', 'cardiac', 'cardiovascular', 'ecg', 'echo', 'catheterization']],
      ['pulmonology', ['lung', 'respiratory', 'pneumonia', 'copd', 'asthma', 'bronchitis']],
      ['neurology', ['brain', 'neurological', 'seizure', 'stroke', 'headache', 'memory']],
      ['gastroenterology', ['gi', 'stomach', 'intestinal', 'liver', 'pancreas', 'colon']],
      ['orthopedics', ['bone', 'joint', 'fracture', 'arthritis', 'surgery', 'orthopedic']],
      ['dermatology', ['skin', 'rash', 'dermatitis', 'lesion', 'mole', 'eczema']],
      ['psychiatry', ['mental health', 'depression', 'anxiety', 'psychiatric', 'therapy']],
      ['oncology', ['cancer', 'tumor', 'chemotherapy', 'radiation', 'oncology', 'malignant']],
      ['pediatrics', ['pediatric', 'child', 'infant', 'adolescent', 'developmental']],
      ['obstetrics', ['pregnancy', 'obstetric', 'delivery', 'prenatal', 'labor']]
    ]);

    this.specialtyKeywords = specialties;
    logger.info(`Loaded ${specialties.size} specialty keyword sets`);
  }

  private async loadUrgencyKeywords(): Promise<void> {
    const urgencyLevels = new Map([
      ['critical', ['critical', 'emergency', 'urgent', 'stat', 'immediate', 'life-threatening', 'acute', 'severe']],
      ['high', ['important', 'significant', 'concerning', 'abnormal', 'elevated', 'high priority']],
      ['medium', ['moderate', 'routine', 'follow-up', 'stable', 'chronic', 'managed']],
      ['low', ['minor', 'mild', 'stable', 'resolved', 'improving', 'well-controlled']]
    ]);

    this.urgencyKeywords = urgencyLevels;
    logger.info(`Loaded ${urgencyLevels.size} urgency keyword sets`);
  }

  async classifyDocument(text: string, documentId?: string): Promise<ClassificationResult> {
    if (!this.initialized) {
      throw new Error('Document Classifier not initialized');
    }

    try {
      logger.debug(`Classifying document ${documentId || 'unnamed'} (${text.length} characters)`);

      // Extract document features
      const features = this.extractDocumentFeatures(text);
      
      // Score document types
      const typeScores = this.scoreDocumentTypes(text, features);
      
      // Determine best classification
      const bestMatch = this.getBestClassification(typeScores);
      
      // Determine specialty area
      const specialtyArea = this.determineSpecialtyArea(text);
      
      // Determine urgency level
      const urgencyLevel = this.determineUrgencyLevel(text, bestMatch.type);
      
      // Calculate processing priority
      const processingPriority = this.calculateProcessingPriority(urgencyLevel, bestMatch.confidence);
      
      // Generate metadata
      const metadata = this.generateClassificationMetadata(text, features, bestMatch.type);

      const result: ClassificationResult = {
        documentType: bestMatch.type,
        confidence: bestMatch.confidence,
        subTypes: bestMatch.subTypes,
        urgencyLevel,
        specialtyArea,
        processingPriority,
        metadata
      };

      // Cache result
      if (documentId) {
        this.classificationHistory.set(documentId, result);
      }

      logger.debug(`Document classified as ${bestMatch.type} with confidence ${bestMatch.confidence}`);
      return result;

    } catch (error: any) {
      logger.error(`Failed to classify document ${documentId}:`, error);
      throw error;
    }
  }

  private extractDocumentFeatures(text: string): DocumentFeatures {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Count medical terms and abbreviations
    const medicalTermCount = this.countMedicalTerms(text);
    const abbreviationCount = this.countAbbreviations(text);
    const numericalDataCount = (text.match(/\b\d+(\.\d+)?\b/g) || []).length;

    // Count structured sections (headers)
    const structuredSectionCount = (text.match(/^[A-Z][A-Z\s]+:|\n[A-Z][A-Z\s]+:/gm) || []).length;

    // Calculate linguistic features
    const technicalComplexity = this.calculateTechnicalComplexity(text);
    const readabilityScore = this.calculateReadabilityScore(words, sentences);
    const formalityScore = this.calculateFormalityScore(text);

    // Count clinical references
    const diagnosticReferences = this.countDiagnosticReferences(text);
    const treatmentReferences = this.countTreatmentReferences(text);
    const medicationReferences = this.countMedicationReferences(text);
    const procedureReferences = this.countProcedureReferences(text);
    const anatomicalReferences = this.countAnatomicalReferences(text);

    return {
      lengthFeatures: {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        averageWordsPerSentence: words.length / sentences.length || 0
      },
      contentFeatures: {
        medicalTermFrequency: medicalTermCount / words.length,
        abbreviationFrequency: abbreviationCount / words.length,
        numericalDataFrequency: numericalDataCount / words.length,
        structuredSectionCount
      },
      linguisticFeatures: {
        technicalComplexity,
        readabilityScore,
        formalityScore
      },
      clinicalFeatures: {
        diagnosticReferences,
        treatmentReferences,
        medicationReferences,
        procedureReferences,
        anatomicalReferences
      }
    };
  }

  private scoreDocumentTypes(text: string, features: DocumentFeatures): Map<string, number> {
    const scores = new Map<string, number>();
    const lowerText = text.toLowerCase();

    for (const [type, pattern] of this.documentTypePatterns) {
      let score = 0;

      // Keyword matching
      const keywordMatches = pattern.keywords.filter(keyword => 
        lowerText.includes(keyword.toLowerCase())
      ).length;
      score += (keywordMatches / pattern.keywords.length) * 0.4;

      // Required sections
      const sectionMatches = pattern.requiredSections.filter(section => 
        lowerText.includes(section.toLowerCase())
      ).length;
      score += (sectionMatches / pattern.requiredSections.length) * 0.3;

      // Document structure alignment
      score += this.calculateStructureAlignment(type, features) * 0.2;

      // Content features alignment
      score += this.calculateContentAlignment(type, features) * 0.1;

      // Apply confidence weight
      score *= pattern.confidenceWeight;

      scores.set(type, Math.min(score, 1.0));
    }

    return scores;
  }

  private getBestClassification(scores: Map<string, number>): { type: string; confidence: number; subTypes?: string[] } {
    let bestType = 'unknown';
    let bestScore = 0;

    for (const [type, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // If confidence is too low, classify as general note
    if (bestScore < config.classification.confidenceThreshold) {
      return {
        type: 'general_note',
        confidence: 0.5
      };
    }

    return {
      type: bestType,
      confidence: bestScore
    };
  }

  private determineSpecialtyArea(text: string): string {
    const lowerText = text.toLowerCase();
    let bestSpecialty = 'general';
    let bestScore = 0;

    for (const [specialty, keywords] of this.specialtyKeywords) {
      const matches = keywords.filter(keyword => 
        lowerText.includes(keyword.toLowerCase())
      ).length;
      
      const score = matches / keywords.length;
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestSpecialty = specialty;
      }
    }

    return bestSpecialty;
  }

  private determineUrgencyLevel(text: string, documentType: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    
    // Check document type default urgency
    const pattern = this.documentTypePatterns.get(documentType);
    let baseUrgency = pattern?.urgencyLevel || 'low';

    // Check for urgency keywords
    for (const [level, keywords] of this.urgencyKeywords) {
      const matches = keywords.filter(keyword => 
        lowerText.includes(keyword.toLowerCase())
      ).length;
      
      if (matches > 0) {
        // Escalate urgency if keywords found
        const levelPriority = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        const currentPriority = levelPriority[baseUrgency as keyof typeof levelPriority] || 1;
        const keywordPriority = levelPriority[level as keyof typeof levelPriority] || 1;
        
        if (keywordPriority > currentPriority) {
          baseUrgency = level as 'low' | 'medium' | 'high' | 'critical';
        }
      }
    }

    return baseUrgency;
  }

  private calculateProcessingPriority(urgency: string, confidence: number): number {
    const urgencyWeights = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    const urgencyWeight = urgencyWeights[urgency as keyof typeof urgencyWeights] || 1;
    
    return Math.round(urgencyWeight * confidence * 10);
  }

  private generateClassificationMetadata(
    text: string,
    features: DocumentFeatures,
    documentType: string
  ): ClassificationMetadata {
    const clinicalIndicators: string[] = [];
    const suggestedActions: string[] = [];

    // Analyze clinical indicators
    if (features.clinicalFeatures.diagnosticReferences > 5) {
      clinicalIndicators.push('High diagnostic content');
    }
    if (features.clinicalFeatures.medicationReferences > 3) {
      clinicalIndicators.push('Medication management focus');
    }
    if (features.contentFeatures.structuredSectionCount > 5) {
      clinicalIndicators.push('Well-structured document');
    }

    // Generate suggested actions
    if (documentType === 'pathology_report') {
      suggestedActions.push('Review for malignancy indicators');
      suggestedActions.push('Check for follow-up recommendations');
    }
    if (documentType === 'emergency_note') {
      suggestedActions.push('Prioritize for immediate review');
      suggestedActions.push('Check for disposition status');
    }
    if (features.clinicalFeatures.medicationReferences > 5) {
      suggestedActions.push('Review medication interactions');
    }

    return {
      wordCount: features.lengthFeatures.wordCount,
      sentenceCount: features.lengthFeatures.sentenceCount,
      medicalTermDensity: features.contentFeatures.medicalTermFrequency,
      structuredContentScore: features.contentFeatures.structuredSectionCount / 10,
      clinicalIndicators,
      suggestedActions
    };
  }

  // Helper methods for feature calculation
  private countMedicalTerms(text: string): number {
    const medicalTerms = [
      'diagnosis', 'treatment', 'medication', 'symptom', 'disease',
      'procedure', 'surgery', 'therapy', 'examination', 'assessment'
    ];
    
    const lowerText = text.toLowerCase();
    return medicalTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countAbbreviations(text: string): number {
    const abbreviations = ['BP', 'HR', 'RR', 'SOB', 'CAD', 'CHF', 'COPD', 'DM', 'HTN'];
    return abbreviations.reduce((count, abbrev) => {
      const matches = text.match(new RegExp(`\\b${abbrev}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private calculateTechnicalComplexity(text: string): number {
    const technicalTerms = text.match(/\b[a-z]+ology\b|\b[a-z]+itis\b|\b[a-z]+osis\b/gi);
    return (technicalTerms ? technicalTerms.length : 0) / 100;
  }

  private calculateReadabilityScore(words: string[], sentences: string[]): number {
    const avgWordsPerSentence = words.length / sentences.length;
    const complexWords = words.filter(word => word.length > 6).length;
    const complexWordRatio = complexWords / words.length;
    
    // Simplified readability score (0-100, higher = more readable)
    return Math.max(0, 100 - (avgWordsPerSentence * 2) - (complexWordRatio * 50));
  }

  private calculateFormalityScore(text: string): number {
    const formalIndicators = [
      /\b(therefore|however|furthermore|moreover|consequently)\b/gi,
      /\b(patient|diagnosis|treatment|procedure)\b/gi
    ];
    
    let formalCount = 0;
    formalIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      formalCount += matches ? matches.length : 0;
    });
    
    return Math.min(formalCount / 10, 1.0);
  }

  private countDiagnosticReferences(text: string): number {
    const diagnosticTerms = ['diagnosis', 'diagnosed', 'condition', 'disorder', 'syndrome'];
    const lowerText = text.toLowerCase();
    return diagnosticTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countTreatmentReferences(text: string): number {
    const treatmentTerms = ['treatment', 'therapy', 'management', 'intervention'];
    const lowerText = text.toLowerCase();
    return treatmentTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countMedicationReferences(text: string): number {
    const medicationTerms = ['medication', 'drug', 'prescription', 'dose', 'mg', 'tablet'];
    const lowerText = text.toLowerCase();
    return medicationTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countProcedureReferences(text: string): number {
    const procedureTerms = ['procedure', 'surgery', 'operation', 'biopsy', 'examination'];
    const lowerText = text.toLowerCase();
    return procedureTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private countAnatomicalReferences(text: string): number {
    const anatomicalTerms = ['heart', 'lung', 'brain', 'liver', 'kidney', 'stomach', 'chest'];
    const lowerText = text.toLowerCase();
    return anatomicalTerms.reduce((count, term) => {
      const matches = lowerText.match(new RegExp(`\\b${term}\\b`, 'g'));
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private calculateStructureAlignment(type: string, features: DocumentFeatures): number {
    // Different document types have different expected structures
    const structureExpectations = {
      'operative_report': { minSections: 5, avgWordsPerSentence: 15 },
      'pathology_report': { minSections: 4, avgWordsPerSentence: 20 },
      'discharge_summary': { minSections: 6, avgWordsPerSentence: 18 },
      'progress_note': { minSections: 3, avgWordsPerSentence: 12 }
    };

    const expectations = structureExpectations[type as keyof typeof structureExpectations];
    if (!expectations) return 0.5;

    const sectionScore = Math.min(features.contentFeatures.structuredSectionCount / expectations.minSections, 1.0);
    const lengthScore = 1.0 - Math.abs(features.lengthFeatures.averageWordsPerSentence - expectations.avgWordsPerSentence) / expectations.avgWordsPerSentence;

    return (sectionScore + lengthScore) / 2;
  }

  private calculateContentAlignment(type: string, features: DocumentFeatures): number {
    // Different document types have different expected content densities
    const contentExpectations = {
      'laboratory_report': { numericalData: 0.2, medicalTerms: 0.1 },
      'pathology_report': { numericalData: 0.1, medicalTerms: 0.15 },
      'operative_report': { numericalData: 0.05, medicalTerms: 0.12 },
      'progress_note': { numericalData: 0.08, medicalTerms: 0.1 }
    };

    const expectations = contentExpectations[type as keyof typeof contentExpectations];
    if (!expectations) return 0.5;

    const numericalScore = 1.0 - Math.abs(features.contentFeatures.numericalDataFrequency - expectations.numericalData) / expectations.numericalData;
    const medicalTermScore = 1.0 - Math.abs(features.contentFeatures.medicalTermFrequency - expectations.medicalTerms) / expectations.medicalTerms;

    return Math.max(0, (numericalScore + medicalTermScore) / 2);
  }

  async batchClassifyDocuments(
    documents: Array<{ id: string; text: string }>
  ): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();
    
    logger.info(`Classifying ${documents.length} documents in batch`);
    
    const promises = documents.map(async doc => {
      try {
        const result = await this.classifyDocument(doc.text, doc.id);
        return { id: doc.id, result };
      } catch (error) {
        logger.error(`Failed to classify document ${doc.id}:`, error);
        return {
          id: doc.id,
          result: {
            documentType: 'error',
            confidence: 0,
            urgencyLevel: 'low' as const,
            processingPriority: 0,
            metadata: {
              wordCount: 0,
              sentenceCount: 0,
              medicalTermDensity: 0,
              structuredContentScore: 0,
              clinicalIndicators: ['Classification failed'],
              suggestedActions: ['Manual review required']
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

  getClassificationHistory(documentId: string): ClassificationResult | undefined {
    return this.classificationHistory.get(documentId);
  }

  clearHistory(): void {
    this.classificationHistory.clear();
    logger.info('Classification history cleared');
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async cleanup(): Promise<void> {
    this.documentTypePatterns.clear();
    this.specialtyKeywords.clear();
    this.urgencyKeywords.clear();
    this.classificationHistory.clear();
    this.initialized = false;
    logger.info('Document Classifier cleaned up');
  }
}

interface DocumentTypePattern {
  type: string;
  keywords: string[];
  requiredSections: string[];
  confidenceWeight: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  specialtyArea: string;
}