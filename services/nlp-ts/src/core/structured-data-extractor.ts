import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type {
  StructuredClinicalData,
  VitalSigns,
  MedicationInfo,
  AllergyInfo,
  ReviewOfSystems,
  PhysicalExamFindings,
  TreatmentPlan,
} from './clinical-nlp-processor.js';

export interface StructuredExtractionResult {
  structuredData: StructuredClinicalData;
  extractionConfidence: number;
  fieldsExtracted: string[];
  processingTime: number;
  metadata: StructuredExtractionMetadata;
}

export interface StructuredExtractionMetadata {
  totalFieldsAttempted: number;
  successfulExtractions: number;
  fieldConfidences: Record<string, number>;
  extractionMethod: string;
  dataQualityScore: number;
  completenessScore: number;
}

export interface ExtractionPattern {
  field: string;
  patterns: RegExp[];
  processor: (match: RegExpMatchArray, text: string) => any;
  confidence: number;
  required: boolean;
}

export class StructuredDataExtractor {
  private initialized: boolean = false;
  private extractionPatterns: Map<string, ExtractionPattern> = new Map();
  private sectionHeaders: Map<string, RegExp[]> = new Map();
  private valuePatterns: Map<string, RegExp[]> = new Map();
  private extractionHistory: Map<string, StructuredExtractionResult> = new Map();

  constructor() {
    logger.info('Initializing Structured Data Extractor');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Loading structured extraction patterns...');

      await this.loadExtractionPatterns();
      await this.loadSectionHeaders();
      await this.loadValuePatterns();

      this.initialized = true;
      logger.info('Structured Data Extractor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Structured Data Extractor:', error);
      throw error;
    }
  }

  private async loadExtractionPatterns(): Promise<void> {
    const patterns: ExtractionPattern[] = [
      // Chief Complaint
      {
        field: 'chiefComplaint',
        patterns: [
          /(?:chief\s+complaint|cc)[:\s]*([^.\n]+)/i,
          /(?:presenting\s+complaint|pc)[:\s]*([^.\n]+)/i,
          /(?:reason\s+for\s+visit)[:\s]*([^.\n]+)/i,
        ],
        processor: (match) => match[1].trim(),
        confidence: 0.9,
        required: true,
      },

      // History of Present Illness
      {
        field: 'historyPresentIllness',
        patterns: [
          /(?:history\s+of\s+present\s+illness|hpi)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i,
          /(?:present\s+illness)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i,
        ],
        processor: (match) => match[1].trim(),
        confidence: 0.85,
        required: false,
      },

      // Past Medical History
      {
        field: 'pastMedicalHistory',
        patterns: [
          /(?:past\s+medical\s+history|pmh)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i,
          /(?:medical\s+history)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i,
        ],
        processor: (match, text) => this.extractListItems(match[1]),
        confidence: 0.8,
        required: false,
      },

      // Social History
      {
        field: 'socialHistory',
        patterns: [
          /(?:social\s+history|sh)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i,
          /(?:tobacco|smoking|alcohol|drugs)[:\s]*([^.\n]+)/i,
        ],
        processor: (match) => match[1].trim(),
        confidence: 0.75,
        required: false,
      },

      // Family History
      {
        field: 'familyHistory',
        patterns: [/(?:family\s+history|fh)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i],
        processor: (match) => match[1].trim(),
        confidence: 0.7,
        required: false,
      },

      // Assessment
      {
        field: 'assessment',
        patterns: [
          /(?:assessment|impression)[:\s]*([^]+?)(?=\n\s*(?:plan|treatment)|\n\n|$)/i,
          /(?:diagnosis)[:\s]*([^]+?)(?=\n\s*[A-Z]|\n\n|$)/i,
        ],
        processor: (match) => match[1].trim(),
        confidence: 0.9,
        required: true,
      },
    ];

    patterns.forEach((pattern) => {
      this.extractionPatterns.set(pattern.field, pattern);
    });

    logger.info(`Loaded ${patterns.length} extraction patterns`);
  }

  private async loadSectionHeaders(): Promise<void> {
    const sections = new Map([
      [
        'vital_signs',
        [
          /(?:vital\s+signs?|vs)[:\s]*$/i,
          /(?:temperature|temp|bp|blood\s+pressure|heart\s+rate|hr)[:\s]*$/i,
        ],
      ],
      ['physical_exam', [/(?:physical\s+exam(?:ination)?|pe)[:\s]*$/i, /(?:examination)[:\s]*$/i]],
      [
        'medications',
        [/(?:medications?|meds?|drugs?)[:\s]*$/i, /(?:current\s+medications?)[:\s]*$/i],
      ],
      ['allergies', [/(?:allergies|drug\s+allergies)[:\s]*$/i, /(?:adverse\s+reactions?)[:\s]*$/i]],
      [
        'review_of_systems',
        [/(?:review\s+of\s+systems?|ros)[:\s]*$/i, /(?:systems?\s+review)[:\s]*$/i],
      ],
    ]);

    this.sectionHeaders = sections;
    logger.info(`Loaded ${sections.size} section header patterns`);
  }

  private async loadValuePatterns(): Promise<void> {
    const patterns = new Map([
      [
        'vital_signs',
        [
          /(?:temperature|temp)[:\s]*(\d+\.?\d*)\s*(?:°?[cf])?/i,
          /(?:bp|blood\s+pressure)[:\s]*(\d+\/\d+)/i,
          /(?:hr|heart\s+rate)[:\s]*(\d+)\s*(?:bpm)?/i,
          /(?:rr|respiratory\s+rate)[:\s]*(\d+)/i,
          /(?:o2\s*sat|oxygen)[:\s]*(\d+)\s*%/i,
          /(?:weight)[:\s]*(\d+\.?\d*)\s*(?:kg|lbs?)?/i,
          /(?:height)[:\s]*(\d+\.?\d*)\s*(?:cm|ft|in)?/i,
        ],
      ],
      [
        'medications',
        [
          /(\w+(?:\s+\w+)*)\s+(\d+\.?\d*\s*mg)\s+(.*?)(?:daily|bid|tid|qid|prn)/i,
          /(\w+)\s+(\d+\s*mg)\s+(?:po|iv|im)\s+(.*)/i,
        ],
      ],
      [
        'allergies',
        [
          /(?:allergic\s+to|allergy)[:\s]*([^.\n]+)/i,
          /(\w+)[:\s]*(?:causes?|reaction)[:\s]*([^.\n]+)/i,
        ],
      ],
      ['dosage', [/(\d+\.?\d*)\s*(mg|g|mcg|units?)/i, /(\d+)\s*(?:tablet|capsule|pill)s?/i]],
    ]);

    this.valuePatterns = patterns;
    logger.info(`Loaded ${patterns.size} value pattern sets`);
  }

  async extractStructuredData(
    text: string,
    documentId?: string
  ): Promise<StructuredExtractionResult> {
    if (!this.initialized) {
      throw new Error('Structured Data Extractor not initialized');
    }

    const startTime = Date.now();

    try {
      logger.debug(
        `Extracting structured data from document ${documentId || 'unnamed'} (${text.length} characters)`
      );

      // Parse sections from the document
      const sections = this.parseSections(text);

      // Extract structured fields
      const structuredData = await this.extractFields(text, sections);

      // Extract vital signs
      structuredData.physicalExam = {
        ...structuredData.physicalExam,
        vitalSigns: await this.extractVitalSigns(text, sections),
      };

      // Extract medications
      structuredData.medications = await this.extractMedications(text, sections);

      // Extract allergies
      structuredData.allergies = await this.extractAllergies(text, sections);

      // Extract review of systems
      structuredData.reviewOfSystems = await this.extractReviewOfSystems(text, sections);

      // Extract treatment plan
      structuredData.plan = await this.extractTreatmentPlan(text, sections);

      // Calculate extraction metrics
      const fieldsExtracted = this.getExtractedFields(structuredData);
      const extractionConfidence = this.calculateExtractionConfidence(
        structuredData,
        fieldsExtracted
      );

      // Generate metadata
      const metadata = this.generateExtractionMetadata(structuredData, fieldsExtracted);

      const processingTime = Date.now() - startTime;

      const result: StructuredExtractionResult = {
        structuredData,
        extractionConfidence,
        fieldsExtracted,
        processingTime,
        metadata,
      };

      // Cache result
      if (documentId) {
        this.extractionHistory.set(documentId, result);
      }

      logger.debug(
        `Structured extraction completed in ${processingTime}ms (${fieldsExtracted.length} fields extracted)`
      );
      return result;
    } catch (error: any) {
      logger.error(`Failed to extract structured data from document ${documentId}:`, error);
      throw error;
    }
  }

  private parseSections(text: string): Map<string, string> {
    const sections = new Map<string, string>();

    // Split text into potential sections based on headers
    const lines = text.split('\n');
    let currentSection = 'general';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if this line is a section header
      let foundSection = false;
      for (const [sectionName, patterns] of this.sectionHeaders) {
        if (patterns.some((pattern) => pattern.test(trimmedLine))) {
          // Save previous section
          if (currentContent.length > 0) {
            sections.set(currentSection, currentContent.join('\n'));
          }

          currentSection = sectionName;
          currentContent = [];
          foundSection = true;
          break;
        }
      }

      if (!foundSection) {
        currentContent.push(line);
      }
    }

    // Save the last section
    if (currentContent.length > 0) {
      sections.set(currentSection, currentContent.join('\n'));
    }

    return sections;
  }

  private async extractFields(
    text: string,
    sections: Map<string, string>
  ): Promise<StructuredClinicalData> {
    const structuredData: StructuredClinicalData = {};

    // Process each extraction pattern
    for (const [fieldName, pattern] of this.extractionPatterns) {
      try {
        let extracted = false;

        // Try to extract from specific sections first
        for (const [sectionName, sectionContent] of sections) {
          for (const regex of pattern.patterns) {
            const match = sectionContent.match(regex);
            if (match) {
              // Assign into the structuredData record using index signature to avoid any casts
              (structuredData as Record<string, unknown>)[fieldName] = pattern.processor(
                match,
                sectionContent
              );
              extracted = true;
              break;
            }
          }
          if (extracted) break;
        }

        // If not found in sections, try the full text
        if (!extracted) {
          for (const regex of pattern.patterns) {
            const match = text.match(regex);
            if (match) {
              (structuredData as Record<string, unknown>)[fieldName] = pattern.processor(
                match,
                text
              );
              break;
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to extract field ${fieldName}:`, error);
      }
    }

    return structuredData;
  }

  private async extractVitalSigns(
    text: string,
    sections: Map<string, string>
  ): Promise<VitalSigns> {
    const vitalSigns: VitalSigns = {};
    const vitalSection = sections.get('vital_signs') || text;

    const patterns = this.valuePatterns.get('vital_signs') || [];

    for (const pattern of patterns) {
      const match = vitalSection.match(pattern);
      if (match) {
        const value = match[1];

        if (pattern.source.includes('temperature|temp')) {
          vitalSigns.temperature = parseFloat(value);
        } else if (pattern.source.includes('bp|blood')) {
          vitalSigns.bloodPressure = value;
        } else if (pattern.source.includes('hr|heart')) {
          vitalSigns.heartRate = parseInt(value);
        } else if (pattern.source.includes('rr|respiratory')) {
          vitalSigns.respiratoryRate = parseInt(value);
        } else if (pattern.source.includes('o2|oxygen')) {
          vitalSigns.oxygenSaturation = parseInt(value);
        } else if (pattern.source.includes('weight')) {
          vitalSigns.weight = parseFloat(value);
        } else if (pattern.source.includes('height')) {
          vitalSigns.height = parseFloat(value);
        }
      }
    }

    // Calculate BMI if height and weight are available
    if (vitalSigns.height && vitalSigns.weight) {
      const heightInMeters = vitalSigns.height > 3 ? vitalSigns.height / 100 : vitalSigns.height;
      vitalSigns.bmi =
        Math.round((vitalSigns.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    return vitalSigns;
  }

  private async extractMedications(
    text: string,
    sections: Map<string, string>
  ): Promise<MedicationInfo[]> {
    const medications: MedicationInfo[] = [];
    const medicationSection = sections.get('medications') || text;

    const patterns = this.valuePatterns.get('medications') || [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(medicationSection)) !== null) {
        medications.push({
          name: match[1].trim(),
          dosage: match[2] ? match[2].trim() : undefined,
          frequency: match[3] ? match[3].trim() : undefined,
        });
      }
    }

    // Also look for simpler medication mentions
    const simpleMedPattern = /(?:^|\n)\s*-?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+\s*mg)/gm;
    let simpleMatch: RegExpExecArray | null;
    while ((simpleMatch = simpleMedPattern.exec(medicationSection)) !== null) {
      const existing = medications.find(
        (med) => med.name.toLowerCase() === simpleMatch![1].toLowerCase()
      );

      if (!existing) {
        medications.push({
          name: simpleMatch[1].trim(),
          dosage: simpleMatch[2].trim(),
        });
      }
    }

    return medications;
  }

  private async extractAllergies(
    text: string,
    sections: Map<string, string>
  ): Promise<AllergyInfo[]> {
    const allergies: AllergyInfo[] = [];
    const allergySection = sections.get('allergies') || text;

    const patterns = this.valuePatterns.get('allergies') || [];

    for (const pattern of patterns) {
      const match = allergySection.match(pattern);
      if (match) {
        allergies.push({
          allergen: match[1].trim(),
          reaction: match[2] ? match[2].trim() : undefined,
        });
      }
    }

    // Look for common allergy formats
    const allergyFormats = [
      /(?:nkda|no\s+known\s+drug\s+allergies)/i,
      /(?:allergic\s+to|allergy)[:\s]*([^.\n,]+)/gi,
      /([A-Z][a-z]+)[:\s]*(?:rash|hives|swelling|reaction)/gi,
    ];

    allergyFormats.forEach((pattern) => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(allergySection)) !== null) {
        if (
          match[0].toLowerCase().includes('nkda') ||
          match[0].toLowerCase().includes('no known')
        ) {
          // Skip if no known allergies
          return;
        }

        if (match[1]) {
          const existing = allergies.find(
            (allergy) => allergy.allergen.toLowerCase() === match![1].toLowerCase()
          );

          if (!existing) {
            allergies.push({
              allergen: match[1].trim(),
            });
          }
        }
      }
    });

    return allergies;
  }

  private async extractReviewOfSystems(
    text: string,
    sections: Map<string, string>
  ): Promise<ReviewOfSystems> {
    const ros: ReviewOfSystems = {};
    const rosSection = sections.get('review_of_systems') || text;

    const systemPatterns: [string, RegExp][] = [
      ['constitutional', /(?:constitutional|general)[:\s]*([^.\n]+)/i],
      ['cardiovascular', /(?:cardiovascular|cardiac|heart)[:\s]*([^.\n]+)/i],
      ['respiratory', /(?:respiratory|pulmonary|lung)[:\s]*([^.\n]+)/i],
      ['gastrointestinal', /(?:gastrointestinal|gi|gastro)[:\s]*([^.\n]+)/i],
      ['genitourinary', /(?:genitourinary|gu|urinary)[:\s]*([^.\n]+)/i],
      ['musculoskeletal', /(?:musculoskeletal|msk|orthopedic)[:\s]*([^.\n]+)/i],
      ['neurological', /(?:neurological|neuro|nervous)[:\s]*([^.\n]+)/i],
      ['psychiatric', /(?:psychiatric|psych|mental)[:\s]*([^.\n]+)/i],
      ['endocrine', /(?:endocrine|hormonal)[:\s]*([^.\n]+)/i],
      ['hematologic', /(?:hematologic|blood|heme)[:\s]*([^.\n]+)/i],
      ['dermatologic', /(?:dermatologic|skin|derm)[:\s]*([^.\n]+)/i],
    ];

    systemPatterns.forEach(([system, pattern]) => {
      const match = rosSection.match(pattern);
      if (match) {
        // Use a typed index assignment instead of casting to any
        (ros as Record<string, unknown>)[system] = match[1].trim();
      }
    });

    return ros;
  }

  private async extractTreatmentPlan(
    text: string,
    sections: Map<string, string>
  ): Promise<TreatmentPlan[]> {
    const plans: TreatmentPlan[] = [];

    // Look for plan section
    const planPatterns = [
      /(?:plan|treatment)[:\s]*([^]+?)(?=\n\s*[A-Z][A-Z\s]*:|\n\n|$)/i,
      /(?:recommendations?)[:\s]*([^]+?)(?=\n\s*[A-Z][A-Z\s]*:|\n\n|$)/i,
    ];

    for (const pattern of planPatterns) {
      const match = text.match(pattern);
      if (match) {
        const planText = match[1];

        // Extract individual plan items
        const planItems = this.extractListItems(planText);

        planItems.forEach((item) => {
          plans.push({
            category: 'general',
            description: item.trim(),
          });
        });

        break;
      }
    }

    return plans;
  }

  private extractListItems(text: string): string[] {
    // Extract items from bulleted or numbered lists
    const items: string[] = [];

    // Try different list formats
    const listPatterns = [
      /(?:^|\n)\s*[-*•]\s*([^.\n]+)/gm, // Bullet points
      /(?:^|\n)\s*\d+[.)]\s*([^.\n]+)/gm, // Numbered lists
      /(?:^|\n)\s*([^.\n]{10,})/gm, // Regular lines (fallback)
    ];

    for (const pattern of listPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const item = match[1].trim();
        if (item.length > 5 && !items.includes(item)) {
          items.push(item);
        }
      }

      if (items.length > 0) break; // Use first successful pattern
    }

    // If no structured lists found, split by sentences
    if (items.length === 0) {
      const sentences = text
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);
      items.push(...sentences.slice(0, 5)); // Limit to first 5 sentences
    }

    return items;
  }

  private getExtractedFields(structuredData: StructuredClinicalData): string[] {
    const fields: string[] = [];

    Object.entries(structuredData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value.trim().length > 0) {
          fields.push(key);
        } else if (Array.isArray(value) && value.length > 0) {
          fields.push(key);
        } else if (typeof value === 'object' && Object.keys(value).length > 0) {
          fields.push(key);
        }
      }
    });

    return fields;
  }

  private calculateExtractionConfidence(
    structuredData: StructuredClinicalData,
    fieldsExtracted: string[]
  ): number {
    const totalFields = config.structuredExtraction.enabledFields.length;
    const requiredFields = ['chiefComplaint', 'assessment'];

    let score = 0;
    let maxScore = 0;

    // Score based on field importance
    fieldsExtracted.forEach((field) => {
      const pattern = this.extractionPatterns.get(field);
      if (pattern) {
        score += pattern.confidence * (pattern.required ? 2 : 1);
      } else {
        score += 0.5; // Default score for non-pattern fields
      }
    });

    // Calculate max possible score
    this.extractionPatterns.forEach((pattern) => {
      maxScore += pattern.confidence * (pattern.required ? 2 : 1);
    });

    // Add bonus for required fields
    const requiredFieldsFound = requiredFields.filter((field) =>
      fieldsExtracted.includes(field)
    ).length;
    score += (requiredFieldsFound / requiredFields.length) * 0.2;
    maxScore += 0.2;

    return Math.min(score / maxScore, 1.0);
  }

  private generateExtractionMetadata(
    structuredData: StructuredClinicalData,
    fieldsExtracted: string[]
  ): StructuredExtractionMetadata {
    const totalFields = config.structuredExtraction.enabledFields.length;
    const fieldConfidences: Record<string, number> = {};

    // Calculate confidence for each extracted field
    fieldsExtracted.forEach((field) => {
      const pattern = this.extractionPatterns.get(field);
      fieldConfidences[field] = pattern ? pattern.confidence : 0.5;
    });

    // Calculate data quality score
    const dataQualityScore = this.calculateDataQuality(structuredData);

    // Calculate completeness score
    const completenessScore = fieldsExtracted.length / totalFields;

    return {
      totalFieldsAttempted: totalFields,
      successfulExtractions: fieldsExtracted.length,
      fieldConfidences,
      extractionMethod: 'pattern-based-v1',
      dataQualityScore,
      completenessScore,
    };
  }

  private calculateDataQuality(structuredData: StructuredClinicalData): number {
    let qualityScore = 0;
    let totalFields = 0;

    Object.entries(structuredData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        totalFields++;

        if (typeof value === 'string') {
          // Score based on text length and content quality
          const length = value.trim().length;
          if (length > 50) qualityScore += 1;
          else if (length > 20) qualityScore += 0.7;
          else if (length > 5) qualityScore += 0.3;
        } else if (Array.isArray(value)) {
          // Score based on array completeness
          qualityScore += Math.min(value.length / 3, 1);
        } else if (typeof value === 'object') {
          // Score based on object completeness
          const objectKeys = Object.keys(value).length;
          qualityScore += Math.min(objectKeys / 5, 1);
        }
      }
    });

    return totalFields > 0 ? qualityScore / totalFields : 0;
  }

  async batchExtractStructuredData(
    documents: Array<{ id: string; text: string }>
  ): Promise<Map<string, StructuredExtractionResult>> {
    const results = new Map<string, StructuredExtractionResult>();

    logger.info(`Extracting structured data from ${documents.length} documents in batch`);

    const promises = documents.map(async (doc) => {
      try {
        const result = await this.extractStructuredData(doc.text, doc.id);
        return { id: doc.id, result };
      } catch (error) {
        logger.error(`Failed to extract structured data from document ${doc.id}:`, error);
        return {
          id: doc.id,
          result: {
            structuredData: {},
            extractionConfidence: 0,
            fieldsExtracted: [],
            processingTime: 0,
            metadata: {
              totalFieldsAttempted: 0,
              successfulExtractions: 0,
              fieldConfidences: {},
              extractionMethod: 'error',
              dataQualityScore: 0,
              completenessScore: 0,
            },
          },
        };
      }
    });

    const batchResults = await Promise.all(promises);

    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });

    return results;
  }

  getExtractionHistory(documentId: string): StructuredExtractionResult | undefined {
    return this.extractionHistory.get(documentId);
  }

  clearHistory(): void {
    this.extractionHistory.clear();
    logger.info('Structured extraction history cleared');
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async cleanup(): Promise<void> {
    this.extractionPatterns.clear();
    this.sectionHeaders.clear();
    this.valuePatterns.clear();
    this.extractionHistory.clear();
    this.initialized = false;
    logger.info('Structured Data Extractor cleaned up');
  }
}
