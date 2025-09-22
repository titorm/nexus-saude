import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export interface SummarizationResult {
  summary: string;
  extractiveSummary: string;
  abstractiveSummary?: string;
  keyPoints: string[];
  summary_type: 'extractive' | 'abstractive' | 'hybrid';
  confidence: number;
  compressionRatio: number;
  processingTime: number;
  metadata: SummarizationMetadata;
}

export interface SummarizationMetadata {
  originalLength: number;
  summaryLength: number;
  sentencesOriginal: number;
  sentencesSummary: number;
  keywordsExtracted: string[];
  importanceScores: SentenceScore[];
  clinicalFocus: string[];
}

export interface SentenceScore {
  sentence: string;
  score: number;
  position: number;
  factors: ScoringFactor[];
}

export interface ScoringFactor {
  factor: string;
  weight: number;
  contribution: number;
}

export interface SummarizationOptions {
  maxLength?: number;
  minLength?: number;
  summaryType?: 'extractive' | 'abstractive' | 'hybrid';
  focusAreas?: string[];
  includeKeyPoints?: boolean;
  preserveClinicalTerms?: boolean;
}

export class ClinicalSummarizer {
  private initialized: boolean = false;
  private clinicalKeywords: Set<string> = new Set();
  private importanceWeights: Map<string, number> = new Map();
  private summarizationHistory: Map<string, SummarizationResult> = new Map();
  private stopWords: Set<string> = new Set();

  constructor() {
    logger.info('Initializing Clinical Summarizer');
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Loading summarization models and vocabularies...');
      
      await this.loadClinicalKeywords();
      await this.loadImportanceWeights();
      await this.loadStopWords();
      
      this.initialized = true;
      logger.info('Clinical Summarizer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Clinical Summarizer:', error);
      throw error;
    }
  }

  private async loadClinicalKeywords(): Promise<void> {
    const clinicalTerms = [
      // Medical conditions
      'diagnosis', 'disease', 'condition', 'syndrome', 'disorder',
      'hypertension', 'diabetes', 'cancer', 'pneumonia', 'stroke',
      
      // Symptoms
      'pain', 'fever', 'nausea', 'fatigue', 'weakness', 'dizziness',
      'shortness of breath', 'chest pain', 'headache', 'vomiting',
      
      // Treatments
      'treatment', 'therapy', 'medication', 'surgery', 'procedure',
      'prescription', 'dose', 'administration', 'intervention',
      
      // Clinical findings
      'examination', 'findings', 'results', 'assessment', 'impression',
      'recommendation', 'plan', 'follow-up', 'monitoring',
      
      // Anatomy
      'heart', 'lung', 'brain', 'liver', 'kidney', 'stomach',
      'blood', 'vessel', 'artery', 'vein', 'muscle', 'bone',
      
      // Measurements
      'pressure', 'rate', 'level', 'count', 'temperature', 'weight',
      'height', 'oxygen', 'glucose', 'cholesterol'
    ];

    clinicalTerms.forEach(term => this.clinicalKeywords.add(term.toLowerCase()));
    
    logger.info(`Loaded ${this.clinicalKeywords.size} clinical keywords`);
  }

  private async loadImportanceWeights(): Promise<void> {
    // Define weights for different types of content
    const weights = new Map([
      // High importance
      ['diagnosis', 3.0],
      ['assessment', 2.8],
      ['plan', 2.8],
      ['recommendation', 2.5],
      ['findings', 2.3],
      ['results', 2.3],
      ['impression', 2.5],
      
      // Medium-high importance
      ['medication', 2.0],
      ['treatment', 2.0],
      ['procedure', 1.8],
      ['surgery', 2.2],
      ['symptoms', 1.8],
      ['examination', 1.5],
      
      // Medium importance
      ['history', 1.3],
      ['patient', 1.2],
      ['condition', 1.5],
      ['disease', 1.8],
      
      // Lower importance
      ['general', 1.0],
      ['routine', 0.8],
      ['normal', 0.9],
      ['stable', 0.9]
    ]);

    this.importanceWeights = weights;
    
    logger.info(`Loaded ${weights.size} importance weights`);
  }

  private async loadStopWords(): Promise<void> {
    const stopWords = [
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'for',
      'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that',
      'the', 'to', 'was', 'will', 'with', 'would', 'she', 'her', 'his',
      'this', 'these', 'they', 'them', 'their', 'there', 'where', 'when',
      'what', 'who', 'which', 'why', 'how', 'could', 'should', 'may',
      'might', 'can', 'cannot', 'must', 'shall', 'very', 'also', 'just',
      'only', 'other', 'some', 'any', 'all', 'both', 'each', 'few',
      'more', 'most', 'same', 'such', 'than', 'too'
    ];

    stopWords.forEach(word => this.stopWords.add(word.toLowerCase()));
    
    logger.info(`Loaded ${this.stopWords.size} stop words`);
  }

  async summarizeText(
    text: string,
    documentId?: string,
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    if (!this.initialized) {
      throw new Error('Clinical Summarizer not initialized');
    }

    const startTime = Date.now();

    try {
      logger.debug(`Summarizing document ${documentId || 'unnamed'} (${text.length} characters)`);

      // Set default options
      const opts = {
        maxLength: options.maxLength || config.summarization.maxSummaryLength,
        minLength: options.minLength || config.summarization.minSummaryLength,
        summaryType: options.summaryType || 'extractive',
        focusAreas: options.focusAreas || [],
        includeKeyPoints: options.includeKeyPoints !== false,
        preserveClinicalTerms: options.preserveClinicalTerms !== false,
        ...options
      };

      // Preprocess text
      const preprocessedText = this.preprocessText(text);
      
      // Extract sentences
      const sentences = this.extractSentences(preprocessedText);
      
      // Score sentences
      const sentenceScores = await this.scoreSentences(sentences, opts.focusAreas);
      
      // Generate extractive summary
      const extractiveSummary = await this.generateExtractiveSummary(
        sentenceScores,
        opts.maxLength,
        opts.minLength
      );
      
      // Generate abstractive summary if requested
      let abstractiveSummary: string | undefined;
      if (opts.summaryType === 'abstractive' || opts.summaryType === 'hybrid') {
        abstractiveSummary = await this.generateAbstractiveSummary(
          extractiveSummary,
          opts.maxLength
        );
      }
      
      // Determine final summary
      const finalSummary = opts.summaryType === 'abstractive' && abstractiveSummary
        ? abstractiveSummary
        : extractiveSummary;
      
      // Extract key points
      const keyPoints = opts.includeKeyPoints
        ? await this.extractKeyPoints(sentenceScores, text)
        : [];
      
      // Calculate metrics
      const compressionRatio = finalSummary.length / text.length;
      const confidence = this.calculateSummaryConfidence(sentenceScores, finalSummary);
      
      // Generate metadata
      const metadata = this.generateSummarizationMetadata(
        text,
        finalSummary,
        sentences,
        sentenceScores
      );

      const processingTime = Date.now() - startTime;

      const result: SummarizationResult = {
        summary: finalSummary,
        extractiveSummary,
        abstractiveSummary,
        keyPoints,
        summary_type: opts.summaryType,
        confidence,
        compressionRatio,
        processingTime,
        metadata
      };

      // Cache result
      if (documentId) {
        this.summarizationHistory.set(documentId, result);
      }

      logger.debug(`Summarization completed in ${processingTime}ms (${Math.round(compressionRatio * 100)}% compression)`);
      return result;

    } catch (error: any) {
      logger.error(`Failed to summarize document ${documentId}:`, error);
      throw error;
    }
  }

  private preprocessText(text: string): string {
    // Clean up text for better processing
    let processed = text.trim();
    
    // Remove excessive whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Normalize common medical abbreviations for better scoring
    const abbreviations = [
      [/\bBP\b/g, 'blood pressure'],
      [/\bHR\b/g, 'heart rate'],
      [/\bSOB\b/g, 'shortness of breath'],
      [/\bDM\b/g, 'diabetes mellitus'],
      [/\bHTN\b/g, 'hypertension'],
      [/\bMI\b/g, 'myocardial infarction']
    ];

    abbreviations.forEach(([pattern, replacement]) => {
      processed = processed.replace(pattern, replacement as string);
    });
    
    return processed;
  }

  private extractSentences(text: string): string[] {
    // Split into sentences, being careful with medical abbreviations
    const sentences = text
      .split(/(?<![A-Z][a-z]\.)\s*[.!?]+\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 10); // Filter out very short sentences
    
    return sentences;
  }

  private async scoreSentences(
    sentences: string[],
    focusAreas: string[] = []
  ): Promise<SentenceScore[]> {
    return sentences.map((sentence, index) => {
      const factors: ScoringFactor[] = [];
      let totalScore = 0;

      // 1. Clinical keyword density
      const clinicalScore = this.calculateClinicalKeywordScore(sentence);
      factors.push({
        factor: 'clinical_keywords',
        weight: 0.3,
        contribution: clinicalScore
      });
      totalScore += clinicalScore * 0.3;

      // 2. Position score (first and last sentences often important)
      const positionScore = this.calculatePositionScore(index, sentences.length);
      factors.push({
        factor: 'position',
        weight: 0.1,
        contribution: positionScore
      });
      totalScore += positionScore * 0.1;

      // 3. Length score (prefer sentences with good information density)
      const lengthScore = this.calculateLengthScore(sentence);
      factors.push({
        factor: 'length',
        weight: 0.1,
        contribution: lengthScore
      });
      totalScore += lengthScore * 0.1;

      // 4. Importance words score
      const importanceScore = this.calculateImportanceWordsScore(sentence);
      factors.push({
        factor: 'importance_words',
        weight: 0.25,
        contribution: importanceScore
      });
      totalScore += importanceScore * 0.25;

      // 5. Numerical data score (lab values, measurements)
      const numericalScore = this.calculateNumericalDataScore(sentence);
      factors.push({
        factor: 'numerical_data',
        weight: 0.15,
        contribution: numericalScore
      });
      totalScore += numericalScore * 0.15;

      // 6. Focus areas score
      const focusScore = this.calculateFocusAreasScore(sentence, focusAreas);
      factors.push({
        factor: 'focus_areas',
        weight: 0.1,
        contribution: focusScore
      });
      totalScore += focusScore * 0.1;

      return {
        sentence,
        score: Math.min(totalScore, 1.0),
        position: index,
        factors
      };
    });
  }

  private calculateClinicalKeywordScore(sentence: string): number {
    const words = sentence.toLowerCase().split(/\s+/);
    const clinicalWords = words.filter(word => this.clinicalKeywords.has(word));
    return Math.min(clinicalWords.length / words.length * 2, 1.0);
  }

  private calculatePositionScore(position: number, totalSentences: number): number {
    // Higher score for beginning and end
    if (position === 0) return 1.0;
    if (position === totalSentences - 1) return 0.8;
    if (position < 3) return 0.6;
    if (position >= totalSentences - 3) return 0.6;
    return 0.3;
  }

  private calculateLengthScore(sentence: string): number {
    const words = sentence.split(/\s+/).length;
    // Prefer sentences with 10-30 words
    if (words >= 10 && words <= 30) return 1.0;
    if (words >= 8 && words <= 40) return 0.8;
    if (words >= 5 && words <= 50) return 0.5;
    return 0.2;
  }

  private calculateImportanceWordsScore(sentence: string): number {
    const lowerSentence = sentence.toLowerCase();
    let score = 0;
    
    for (const [word, weight] of this.importanceWeights) {
      if (lowerSentence.includes(word)) {
        score += weight;
      }
    }
    
    return Math.min(score / 5, 1.0); // Normalize to 0-1
  }

  private calculateNumericalDataScore(sentence: string): number {
    const numericalPatterns = [
      /\d+\/\d+/g, // Blood pressure
      /\d+\s*mg/g, // Medication doses
      /\d+\s*%/g,  // Percentages
      /\d+\.\d+/g, // Decimal numbers
      /\d+\s*bpm/g // Heart rate
    ];
    
    let matches = 0;
    numericalPatterns.forEach(pattern => {
      const found = sentence.match(pattern);
      matches += found ? found.length : 0;
    });
    
    return Math.min(matches / 3, 1.0);
  }

  private calculateFocusAreasScore(sentence: string, focusAreas: string[]): number {
    if (focusAreas.length === 0) return 0.5; // Neutral score if no focus areas
    
    const lowerSentence = sentence.toLowerCase();
    const matches = focusAreas.filter(area => 
      lowerSentence.includes(area.toLowerCase())
    ).length;
    
    return matches / focusAreas.length;
  }

  private async generateExtractiveSummary(
    sentenceScores: SentenceScore[],
    maxLength: number,
    minLength: number
  ): Promise<string> {
    // Sort sentences by score (descending)
    const sortedSentences = [...sentenceScores].sort((a, b) => b.score - a.score);
    
    const selectedSentences: SentenceScore[] = [];
    let currentLength = 0;
    
    // Select sentences until we reach target length
    for (const sentenceScore of sortedSentences) {
      const potentialLength = currentLength + sentenceScore.sentence.length;
      
      if (potentialLength > maxLength && selectedSentences.length > 0) {
        break;
      }
      
      selectedSentences.push(sentenceScore);
      currentLength = potentialLength;
      
      if (currentLength >= minLength && selectedSentences.length >= 3) {
        break;
      }
    }
    
    // Sort selected sentences by original position to maintain flow
    selectedSentences.sort((a, b) => a.position - b.position);
    
    return selectedSentences.map(s => s.sentence).join(' ');
  }

  private async generateAbstractiveSummary(
    extractiveSummary: string,
    maxLength: number
  ): Promise<string> {
    // Simplified abstractive summarization
    // In a real implementation, this would use advanced NLG models
    
    const sentences = this.extractSentences(extractiveSummary);
    if (sentences.length <= 1) return extractiveSummary;
    
    // Combine related information and simplify language
    let abstractive = extractiveSummary;
    
    // Replace some verbose medical terminology with simpler terms
    const simplifications = [
      [/myocardial infarction/gi, 'heart attack'],
      [/cerebrovascular accident/gi, 'stroke'],
      [/shortness of breath/gi, 'breathing difficulty'],
      [/elevated blood pressure/gi, 'high blood pressure']
    ];
    
    simplifications.forEach(([pattern, replacement]) => {
      abstractive = abstractive.replace(pattern, replacement as string);
    });
    
    // Truncate if still too long
    if (abstractive.length > maxLength) {
      abstractive = abstractive.substring(0, maxLength - 3) + '...';
    }
    
    return abstractive;
  }

  private async extractKeyPoints(
    sentenceScores: SentenceScore[],
    originalText: string
  ): Promise<string[]> {
    // Extract the most important clinical points
    const highScoreSentences = sentenceScores
      .filter(s => s.score > 0.7)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    
    const keyPoints: string[] = [];
    
    // Extract key medical findings
    highScoreSentences.forEach(sentenceScore => {
      const sentence = sentenceScore.sentence;
      
      // Look for key patterns
      const patterns = [
        /diagnosis[:\s]+([^.]+)/i,
        /assessment[:\s]+([^.]+)/i,
        /plan[:\s]+([^.]+)/i,
        /medication[:\s]+([^.]+)/i,
        /findings[:\s]+([^.]+)/i
      ];
      
      patterns.forEach(pattern => {
        const match = sentence.match(pattern);
        if (match && match[1]) {
          keyPoints.push(match[1].trim());
        }
      });
    });
    
    // If no structured points found, use high-scoring sentences directly
    if (keyPoints.length === 0) {
      keyPoints.push(...highScoreSentences.slice(0, 3).map(s => s.sentence));
    }
    
    return keyPoints.slice(0, 5); // Limit to top 5 key points
  }

  private calculateSummaryConfidence(
    sentenceScores: SentenceScore[],
    summary: string
  ): number {
    // Calculate confidence based on the quality of selected sentences
    const summaryWords = new Set(summary.toLowerCase().split(/\s+/));
    const clinicalWordsCovered = Array.from(summaryWords)
      .filter(word => this.clinicalKeywords.has(word)).length;
    
    const avgSentenceScore = sentenceScores.length > 0
      ? sentenceScores.reduce((sum, s) => sum + s.score, 0) / sentenceScores.length
      : 0;
    
    const clinicalDensity = clinicalWordsCovered / summaryWords.size;
    
    return Math.round((avgSentenceScore * 0.7 + clinicalDensity * 0.3) * 100) / 100;
  }

  private generateSummarizationMetadata(
    originalText: string,
    summary: string,
    sentences: string[],
    sentenceScores: SentenceScore[]
  ): SummarizationMetadata {
    const originalWords = originalText.split(/\s+/);
    const summaryWords = summary.split(/\s+/);
    const summarySentences = this.extractSentences(summary);
    
    // Extract keywords from high-scoring sentences
    const keywordsExtracted = this.extractKeywords(sentenceScores.slice(0, 5));
    
    // Identify clinical focus areas
    const clinicalFocus = this.identifyClinicalFocus(sentenceScores);
    
    return {
      originalLength: originalText.length,
      summaryLength: summary.length,
      sentencesOriginal: sentences.length,
      sentencesSummary: summarySentences.length,
      keywordsExtracted,
      importanceScores: sentenceScores.slice(0, 10), // Top 10 sentences
      clinicalFocus
    };
  }

  private extractKeywords(topSentences: SentenceScore[]): string[] {
    const wordFreq = new Map<string, number>();
    
    topSentences.forEach(sentenceScore => {
      const words = sentenceScore.sentence
        .toLowerCase()
        .split(/\s+/)
        .filter(word => 
          word.length > 3 && 
          !this.stopWords.has(word) &&
          /^[a-z]+$/.test(word)
        );
      
      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });
    
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private identifyClinicalFocus(sentenceScores: SentenceScore[]): string[] {
    const focusAreas = new Map<string, number>();
    
    // Define clinical categories
    const categories: [string, string[]][] = [
      ['cardiology', ['heart', 'cardiac', 'blood pressure', 'chest pain']],
      ['respiratory', ['lung', 'breathing', 'cough', 'pneumonia']],
      ['endocrine', ['diabetes', 'blood sugar', 'thyroid', 'hormone']],
      ['neurology', ['brain', 'neurological', 'headache', 'seizure']],
      ['gastroenterology', ['stomach', 'intestinal', 'liver', 'digestive']],
      ['medication', ['drug', 'medication', 'prescription', 'dose']]
    ];
    
    sentenceScores.forEach(sentenceScore => {
      const lowerSentence = sentenceScore.sentence.toLowerCase();
      
      categories.forEach(([category, keywords]) => {
        const matches = keywords.filter((keyword: string) => lowerSentence.includes(keyword)).length;
        if (matches > 0) {
          focusAreas.set(category, (focusAreas.get(category) || 0) + matches * sentenceScore.score);
        }
      });
    });
    
    return Array.from(focusAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }

  async batchSummarize(
    documents: Array<{ id: string; text: string; options?: SummarizationOptions }>
  ): Promise<Map<string, SummarizationResult>> {
    const results = new Map<string, SummarizationResult>();
    
    logger.info(`Summarizing ${documents.length} documents in batch`);
    
    const promises = documents.map(async doc => {
      try {
        const result = await this.summarizeText(doc.text, doc.id, doc.options);
        return { id: doc.id, result };
      } catch (error) {
        logger.error(`Failed to summarize document ${doc.id}:`, error);
        return {
          id: doc.id,
          result: {
            summary: 'Summarization failed',
            extractiveSummary: 'Error',
            keyPoints: [],
            summary_type: 'extractive' as const,
            confidence: 0,
            compressionRatio: 0,
            processingTime: 0,
            metadata: {
              originalLength: 0,
              summaryLength: 0,
              sentencesOriginal: 0,
              sentencesSummary: 0,
              keywordsExtracted: [],
              importanceScores: [],
              clinicalFocus: []
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

  getSummarizationHistory(documentId: string): SummarizationResult | undefined {
    return this.summarizationHistory.get(documentId);
  }

  clearHistory(): void {
    this.summarizationHistory.clear();
    logger.info('Summarization history cleared');
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async cleanup(): Promise<void> {
    this.clinicalKeywords.clear();
    this.importanceWeights.clear();
    this.stopWords.clear();
    this.summarizationHistory.clear();
    this.initialized = false;
    logger.info('Clinical Summarizer cleaned up');
  }
}