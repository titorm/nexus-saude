import * as natural from 'natural';
import { config } from '../config/index.js';
import { logger, logError } from '../utils/logger.js';
import type { MedicalEntities } from './medical-assistant.js';

// Medical vocabularies and entities
const MEDICAL_SYMPTOMS = [
  'pain',
  'ache',
  'soreness',
  'discomfort',
  'stiffness',
  'swelling',
  'inflammation',
  'fever',
  'chills',
  'sweats',
  'nausea',
  'vomiting',
  'diarrhea',
  'constipation',
  'headache',
  'dizziness',
  'fatigue',
  'weakness',
  'numbness',
  'tingling',
  'shortness of breath',
  'cough',
  'wheezing',
  'chest pain',
  'palpitations',
  'rash',
  'itching',
  'burning',
  'bleeding',
  'bruising',
  'discharge',
  'blurred vision',
  'hearing loss',
  'confusion',
  'memory loss',
  'insomnia',
];

const MEDICAL_CONDITIONS = [
  'diabetes',
  'hypertension',
  'asthma',
  'pneumonia',
  'bronchitis',
  'influenza',
  'arthritis',
  'osteoporosis',
  'depression',
  'anxiety',
  'migraine',
  'epilepsy',
  'cancer',
  'tumor',
  'infection',
  'inflammation',
  'allergy',
  'autoimmune',
  'cardiovascular',
  'respiratory',
  'neurological',
  'gastrointestinal',
  'dermatological',
  'orthopedic',
  'psychiatric',
  'endocrine',
];

const MEDICAL_MEDICATIONS = [
  'aspirin',
  'ibuprofen',
  'acetaminophen',
  'antibiotic',
  'antiviral',
  'antifungal',
  'insulin',
  'metformin',
  'lisinopril',
  'atorvastatin',
  'omeprazole',
  'prednisone',
  'warfarin',
  'metoprolol',
  'amlodipine',
  'simvastatin',
  'levothyroxine',
  'hydrochlorothiazide',
  'albuterol',
  'fluticasone',
];

const MEDICAL_PROCEDURES = [
  'surgery',
  'biopsy',
  'scan',
  'x-ray',
  'mri',
  'ct scan',
  'ultrasound',
  'blood test',
  'urine test',
  'ecg',
  'ekg',
  'endoscopy',
  'colonoscopy',
  'mammography',
  'vaccination',
  'injection',
  'transfusion',
  'dialysis',
];

const ANATOMICAL_TERMS = [
  'heart',
  'lung',
  'liver',
  'kidney',
  'brain',
  'stomach',
  'intestine',
  'muscle',
  'bone',
  'joint',
  'skin',
  'eye',
  'ear',
  'nose',
  'throat',
  'chest',
  'abdomen',
  'back',
  'neck',
  'arm',
  'leg',
  'hand',
  'foot',
  'head',
  'face',
  'mouth',
  'tooth',
  'tongue',
  'blood',
  'nerve',
];

const LABORATORY_TESTS = [
  'blood count',
  'glucose',
  'cholesterol',
  'blood pressure',
  'hemoglobin',
  'white blood cell',
  'red blood cell',
  'platelet',
  'creatinine',
  'bun',
  'liver function',
  'thyroid',
  'vitamin',
  'mineral',
  'hormone',
  'enzyme',
  'protein',
  'antibody',
  'antigen',
  'culture',
  'sensitivity',
];

interface EntityPattern {
  pattern: RegExp;
  type: keyof MedicalEntities;
  confidence: number;
}

/**
 * Medical Natural Language Processing Processor
 * Extracts medical entities and performs medical text analysis
 */
export class MedicalNLPProcessor {
  private tokenizer: natural.WordTokenizer;
  // natural's typings differ by version; use any for stemmer to avoid strict export name issues
  private stemmer: any;
  private entityPatterns: EntityPattern[] = [];
  private medicalTerms: Map<string, { type: keyof MedicalEntities; confidence: number }> =
    new Map();
  private isInitialized = false;

  constructor() {
    this.tokenizer = new (natural as any).WordTokenizer();
    // prefer explicit PorterStemmer export variants depending on package version
    this.stemmer = (natural as any).PorterStemmer ||
      (natural as any).PorterStemmerDe ||
      (natural as any).stemmer || { stem: (s: string) => s };
  }

  /**
   * Initialize the NLP processor
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Medical NLP Processor...');

      const startTime = Date.now();

      // Build medical term mappings
      this.buildMedicalTermMappings();

      // Build entity patterns
      this.buildEntityPatterns();

      this.isInitialized = true;

      const initTime = Date.now() - startTime;
      logger.info(`Medical NLP Processor initialized in ${initTime}ms`);
      logger.info(
        `Loaded ${this.medicalTerms.size} medical terms and ${this.entityPatterns.length} patterns`
      );
    } catch (error) {
      logError(error, 'MedicalNLPProcessor.initialize');
      throw new Error('Failed to initialize Medical NLP Processor');
    }
  }

  /**
   * Extract medical entities from text
   */
  async extractMedicalEntities(text: string): Promise<MedicalEntities> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const entities: MedicalEntities = {
        symptoms: [],
        conditions: [],
        medications: [],
        procedures: [],
        anatomy: [],
        laboratories: [],
      };

      // Normalize text
      const normalizedText = this.normalizeText(text);

      // Extract using pattern matching
      await this.extractByPatterns(normalizedText, entities);

      // Extract using term matching
      await this.extractByTermMatching(normalizedText, entities);

      // Extract using context analysis
      await this.extractByContext(normalizedText, entities);

      // Remove duplicates and sort by confidence
      this.deduplicateEntities(entities);

      return entities;
    } catch (error) {
      logError(error, 'MedicalNLPProcessor.extractMedicalEntities');
      return {
        symptoms: [],
        conditions: [],
        medications: [],
        procedures: [],
        anatomy: [],
        laboratories: [],
      };
    }
  }

  /**
   * Analyze medical text sentiment and urgency
   */
  async analyzeMedicalSentiment(text: string): Promise<{
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }> {
    try {
      const normalizedText = this.normalizeText(text);

      // Urgency keywords
      const emergencyKeywords = ['emergency', 'urgent', 'severe', 'acute', 'critical', 'immediate'];
      const highUrgencyKeywords = ['serious', 'significant', 'concerning', 'worsening', 'sudden'];
      const mediumUrgencyKeywords = ['moderate', 'persistent', 'ongoing', 'recurring'];

      let urgencyScore = 0;
      let maxUrgency: 'low' | 'medium' | 'high' | 'emergency' = 'low';

      // Check for urgency indicators
      for (const keyword of emergencyKeywords) {
        if (normalizedText.includes(keyword)) {
          urgencyScore = 4;
          maxUrgency = 'emergency';
          break;
        }
      }

      if (urgencyScore === 0) {
        for (const keyword of highUrgencyKeywords) {
          if (normalizedText.includes(keyword)) {
            urgencyScore = Math.max(urgencyScore, 3);
            maxUrgency = 'high';
          }
        }
      }

      if (urgencyScore === 0) {
        for (const keyword of mediumUrgencyKeywords) {
          if (normalizedText.includes(keyword)) {
            urgencyScore = Math.max(urgencyScore, 2);
            maxUrgency = 'medium';
          }
        }
      }

      // Sentiment analysis using simple keyword approach
      const positiveKeywords = ['better', 'improved', 'healing', 'recovery', 'good'];
      const negativeKeywords = ['worse', 'pain', 'suffering', 'deteriorating', 'bad'];

      let sentimentScore = 0;
      for (const keyword of positiveKeywords) {
        if (normalizedText.includes(keyword)) sentimentScore += 1;
      }
      for (const keyword of negativeKeywords) {
        if (normalizedText.includes(keyword)) sentimentScore -= 1;
      }

      const sentiment =
        sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral';

      return {
        urgency: maxUrgency,
        sentiment,
        confidence: Math.min(1.0, Math.abs(sentimentScore) * 0.2 + urgencyScore * 0.25),
      };
    } catch (error) {
      logError(error, 'MedicalNLPProcessor.analyzeMedicalSentiment');
      return {
        urgency: 'low',
        sentiment: 'neutral',
        confidence: 0.0,
      };
    }
  }

  /**
   * Extract medical abbreviations and expand them
   */
  async expandMedicalAbbreviations(text: string): Promise<string> {
    const abbreviations = new Map([
      ['bp', 'blood pressure'],
      ['hr', 'heart rate'],
      ['rr', 'respiratory rate'],
      ['temp', 'temperature'],
      ['wt', 'weight'],
      ['ht', 'height'],
      ['bmi', 'body mass index'],
      ['cbc', 'complete blood count'],
      ['bmp', 'basic metabolic panel'],
      ['ecg', 'electrocardiogram'],
      ['ekg', 'electrocardiogram'],
      ['mri', 'magnetic resonance imaging'],
      ['ct', 'computed tomography'],
      ['dx', 'diagnosis'],
      ['tx', 'treatment'],
      ['rx', 'prescription'],
      ['sx', 'symptoms'],
      ['hx', 'history'],
      ['pe', 'physical examination'],
      ['sob', 'shortness of breath'],
      ['cp', 'chest pain'],
      ['n/v', 'nausea and vomiting'],
      ['uti', 'urinary tract infection'],
      ['uri', 'upper respiratory infection'],
      ['dob', 'date of birth'],
      ['doa', 'date of admission'],
      ['doc', 'date of consultation'],
    ]);

    let expandedText = text;
    for (const [abbrev, expansion] of abbreviations) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      expandedText = expandedText.replace(regex, expansion);
    }

    return expandedText;
  }

  /**
   * Normalize text for processing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Build medical term mappings
   */
  private buildMedicalTermMappings(): void {
    // Map symptoms
    for (const symptom of MEDICAL_SYMPTOMS) {
      this.medicalTerms.set(symptom.toLowerCase(), { type: 'symptoms', confidence: 0.8 });
      // Add variations
      const stemmed = this.stemmer.stem(symptom);
      this.medicalTerms.set(stemmed, { type: 'symptoms', confidence: 0.7 });
    }

    // Map conditions
    for (const condition of MEDICAL_CONDITIONS) {
      this.medicalTerms.set(condition.toLowerCase(), { type: 'conditions', confidence: 0.9 });
      const stemmed = this.stemmer.stem(condition);
      this.medicalTerms.set(stemmed, { type: 'conditions', confidence: 0.8 });
    }

    // Map medications
    for (const medication of MEDICAL_MEDICATIONS) {
      this.medicalTerms.set(medication.toLowerCase(), { type: 'medications', confidence: 0.9 });
    }

    // Map procedures
    for (const procedure of MEDICAL_PROCEDURES) {
      this.medicalTerms.set(procedure.toLowerCase(), { type: 'procedures', confidence: 0.8 });
    }

    // Map anatomy
    for (const anatomy of ANATOMICAL_TERMS) {
      this.medicalTerms.set(anatomy.toLowerCase(), { type: 'anatomy', confidence: 0.7 });
    }

    // Map laboratory tests
    for (const lab of LABORATORY_TESTS) {
      this.medicalTerms.set(lab.toLowerCase(), { type: 'laboratories', confidence: 0.8 });
    }
  }

  /**
   * Build entity extraction patterns
   */
  private buildEntityPatterns(): void {
    this.entityPatterns = [
      // Symptom patterns
      {
        pattern: /experiencing\s+(.+?)\s+(?:pain|discomfort|symptoms?)/gi,
        type: 'symptoms',
        confidence: 0.8,
      },
      { pattern: /complain(?:s|ing)?\s+of\s+(.+?)(?:\s|$)/gi, type: 'symptoms', confidence: 0.9 },
      { pattern: /feels?\s+(.+?)(?:\s|$)/gi, type: 'symptoms', confidence: 0.6 },

      // Condition patterns
      { pattern: /diagnos(?:ed|is)\s+with\s+(.+?)(?:\s|$)/gi, type: 'conditions', confidence: 0.9 },
      { pattern: /history\s+of\s+(.+?)(?:\s|$)/gi, type: 'conditions', confidence: 0.8 },
      {
        pattern: /has\s+(.+?)\s+(?:condition|disease|disorder)/gi,
        type: 'conditions',
        confidence: 0.8,
      },

      // Medication patterns
      {
        pattern: /(?:taking|prescribed|on)\s+(.+?)\s+(?:mg|tablet|pills?|medication)/gi,
        type: 'medications',
        confidence: 0.9,
      },
      { pattern: /medication:\s*(.+?)(?:\n|$)/gi, type: 'medications', confidence: 0.8 },

      // Procedure patterns
      {
        pattern: /(?:underwent|had|scheduled for)\s+(.+?)\s+(?:surgery|procedure|test)/gi,
        type: 'procedures',
        confidence: 0.9,
      },
      {
        pattern: /(?:need|require)s?\s+(.+?)\s+(?:test|scan|examination)/gi,
        type: 'procedures',
        confidence: 0.7,
      },

      // Laboratory patterns
      {
        pattern:
          /(?:blood|lab|laboratory)\s+(?:test|work|results?)\s+(?:show|reveal)s?\s+(.+?)(?:\s|$)/gi,
        type: 'laboratories',
        confidence: 0.8,
      },
    ];
  }

  /**
   * Extract entities using pattern matching
   */
  private async extractByPatterns(text: string, entities: MedicalEntities): Promise<void> {
    for (const pattern of this.entityPatterns) {
      const matches = text.matchAll(pattern.pattern);
      for (const match of matches) {
        if (match[1]) {
          const entity = match[1].trim();
          if (entity && !entities[pattern.type].includes(entity)) {
            entities[pattern.type].push(entity);
          }
        }
      }
    }
  }

  /**
   * Extract entities using term matching
   */
  private async extractByTermMatching(text: string, entities: MedicalEntities): Promise<void> {
    const tokens = this.tokenizer.tokenize(text) || [];

    // Check individual tokens
    for (const token of tokens) {
      const termInfo = this.medicalTerms.get(token.toLowerCase());
      if (termInfo && !entities[termInfo.type].includes(token)) {
        entities[termInfo.type].push(token);
      }
    }

    // Check n-grams (2-3 words)
    for (let i = 0; i < tokens.length - 1; i++) {
      // Bigrams
      const bigram = `${tokens[i]} ${tokens[i + 1]}`.toLowerCase();
      const bigramInfo = this.medicalTerms.get(bigram);
      if (bigramInfo && !entities[bigramInfo.type].includes(bigram)) {
        entities[bigramInfo.type].push(bigram);
      }

      // Trigrams
      if (i < tokens.length - 2) {
        const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`.toLowerCase();
        const trigramInfo = this.medicalTerms.get(trigram);
        if (trigramInfo && !entities[trigramInfo.type].includes(trigram)) {
          entities[trigramInfo.type].push(trigram);
        }
      }
    }
  }

  /**
   * Extract entities using context analysis
   */
  private async extractByContext(text: string, entities: MedicalEntities): Promise<void> {
    // Context-based extraction using surrounding words
    const contextKeywords = {
      symptoms: ['feel', 'experiencing', 'complain', 'report', 'describe', 'mention'],
      conditions: ['diagnose', 'condition', 'disease', 'disorder', 'illness', 'history'],
      medications: ['taking', 'prescribed', 'medication', 'drug', 'pill', 'tablet'],
      procedures: ['surgery', 'procedure', 'operation', 'test', 'scan', 'examination'],
      anatomy: ['in', 'on', 'around', 'near', 'affecting', 'involving'],
      laboratories: ['test', 'lab', 'laboratory', 'blood', 'urine', 'result'],
    };

    const tokens = this.tokenizer.tokenize(text) || [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].toLowerCase();

      // Check if current token matches any context keyword
      for (const [entityType, keywords] of Object.entries(contextKeywords)) {
        if (keywords.includes(token)) {
          // Look at surrounding tokens
          const surroundingTokens = [];
          for (let j = Math.max(0, i - 3); j <= Math.min(tokens.length - 1, i + 3); j++) {
            if (j !== i) {
              surroundingTokens.push(tokens[j]);
            }
          }

          // Check if surrounding tokens are medical terms
          for (const surroundingToken of surroundingTokens) {
            const termInfo = this.medicalTerms.get(surroundingToken.toLowerCase());
            if (termInfo && termInfo.type === entityType) {
              const typedEntityType = entityType as keyof MedicalEntities;
              if (!entities[typedEntityType].includes(surroundingToken)) {
                entities[typedEntityType].push(surroundingToken);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Remove duplicate entities and sort by relevance
   */
  private deduplicateEntities(entities: MedicalEntities): void {
    for (const [type, entityList] of Object.entries(entities) as [
      keyof MedicalEntities,
      string[],
    ][]) {
      // Remove duplicates while preserving type
      const unique = Array.from(new Set(entityList));

      // Sort by length (longer terms are usually more specific)
      unique.sort((a, b) => b.length - a.length);

      // Update the entity list
      entities[type] = unique;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.medicalTerms.clear();
    this.entityPatterns = [];
    this.isInitialized = false;
    logger.info('Medical NLP Processor cleaned up');
  }
}
