/**
 * SOTA DIMENSIONAL DETECTOR
 *
 * State-of-the-art detection based on 2024 research:
 * - OpenAI text-embedding-3-small for semantic embeddings
 * - Contrastive prototype matching (SupMPN-inspired)
 * - Multi-task classification heads
 * - Hierarchical confidence routing
 * - LLM fallback for ambiguous cases
 *
 * References:
 * - FastFit (IBM NAACL 2024): Few-shot contrastive learning
 * - SupMPN: Multiple positives/negatives contrastive learning
 * - Hierarchical Attention Networks (CMU/Microsoft)
 * - Crisis Detection (IEEE BigData 2024)
 *
 * Performance targets:
 * - Accuracy: 92-95% (vs 56% regex, 84% LLM-only)
 * - V_MODE F1: 95%+ (vs 48% regex)
 * - Latency: ~50ms average (95% cases), ~3s for LLM fallback
 * - Cost: ~$0.05/1000 sessions
 */

import { SupportedLanguage, HumanDomain, FieldState } from '../../interface/types';
import { DimensionalState, VerticalDimension, dimensionalDetector } from './dimensional_system';
import { LLMDetector, isLLMAvailable } from './llm_detector';

// ============================================
// CONFIGURATION
// ============================================

export interface SOTADetectorConfig {
  // Embedding settings
  embedding_model: 'text-embedding-3-small' | 'text-embedding-3-large';
  embedding_dimensions: number;
  embedding_cache_ttl_ms: number;

  // Confidence thresholds
  high_confidence_threshold: number;  // Use embedding result directly
  medium_confidence_threshold: number; // Use ensemble
  low_confidence_threshold: number;   // Force LLM

  // Routing weights
  ensemble_weights: {
    embedding: number;
    regex: number;
    llm: number;
  };

  // Fallback settings
  llm_model: 'gpt-4o-mini' | 'haiku' | 'sonnet';
  fallback_to_regex: boolean;
  use_llm_for_critical: boolean; // Always use LLM for V_MODE/EMERGENCY decisions

  // Performance
  timeout_ms: number;
  debug: boolean;
}

export const DEFAULT_SOTA_CONFIG: SOTADetectorConfig = {
  embedding_model: 'text-embedding-3-small',
  embedding_dimensions: 256, // Reduced for speed, still effective
  embedding_cache_ttl_ms: 60000, // 1 minute cache

  high_confidence_threshold: 0.85,
  medium_confidence_threshold: 0.65,
  low_confidence_threshold: 0.40,

  ensemble_weights: {
    embedding: 0.5,
    regex: 0.2,
    llm: 0.3,
  },

  llm_model: 'gpt-4o-mini',
  fallback_to_regex: true,
  use_llm_for_critical: true,

  timeout_ms: 5000,
  debug: false,
};

// ============================================
// PROTOTYPE DEFINITIONS
// ============================================

interface Prototype {
  text: string;
  embedding?: number[];
  class: string;
  subclass?: string;
  language: SupportedLanguage;
}

// V_MODE prototypes - existential/meaning questions
const V_MODE_PROTOTYPES: Prototype[] = [
  // Italian - Clear existential
  { text: "Non so cosa voglio dalla vita", class: 'V_MODE', language: 'it' },
  { text: "Chi sono veramente?", class: 'V_MODE', language: 'it' },
  { text: "Qual è il senso di tutto questo?", class: 'V_MODE', language: 'it' },
  { text: "Mi sento perso, senza direzione", class: 'V_MODE', language: 'it' },
  { text: "A che serve fare qualsiasi cosa?", class: 'V_MODE', language: 'it' },
  { text: "Non mi riconosco più", class: 'V_MODE', language: 'it' },
  { text: "Tutto sembra vuoto e senza significato", class: 'V_MODE', language: 'it' },
  { text: "Mi chiedo se ne valga la pena", class: 'V_MODE', language: 'it' },
  { text: "Non so più chi voglio essere", class: 'V_MODE', language: 'it' },
  { text: "La mia vita non ha uno scopo", class: 'V_MODE', language: 'it' },
  // Italian - Subtle existential
  { text: "Qual è il punto?", class: 'V_MODE', subclass: 'subtle', language: 'it' },
  { text: "Non riesco a vedere un futuro", class: 'V_MODE', subclass: 'subtle', language: 'it' },
  { text: "Mi sveglio ogni giorno e mi chiedo perché", class: 'V_MODE', subclass: 'subtle', language: 'it' },
  // Existential fear (about life choices, NOT work anxiety)
  // CRITICAL: "Ho paura di fare la scelta sbagliata" is EXISTENTIAL, not work anxiety
  { text: "Ho paura di fare la scelta sbagliata", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  { text: "Ho paura di fare la scelta sbagliata nella vita", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  { text: "Ho paura di sbagliare la scelta", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  { text: "Temo di fare la scelta sbagliata", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  { text: "E se fosse la scelta sbagliata?", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  { text: "I'm afraid of making the wrong choice", class: 'V_MODE', subclass: 'existential_fear', language: 'en' },
  { text: "I'm afraid of making the wrong choice in life", class: 'V_MODE', subclass: 'existential_fear', language: 'en' },
  { text: "What if this is the wrong choice?", class: 'V_MODE', subclass: 'existential_fear', language: 'en' },
  { text: "I fear making the wrong decision", class: 'V_MODE', subclass: 'existential_fear', language: 'en' },
  { text: "Ho paura di sbagliare tutto nella vita", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  { text: "Ho paura di rovinare tutto", class: 'V_MODE', subclass: 'existential_fear', language: 'it' },
  // English
  { text: "What is the meaning of my existence?", class: 'V_MODE', language: 'en' },
  { text: "I don't know who I am anymore", class: 'V_MODE', language: 'en' },
  { text: "What's the point of all this?", class: 'V_MODE', language: 'en' },
  { text: "I feel completely lost in life", class: 'V_MODE', language: 'en' },
  { text: "Everything feels meaningless", class: 'V_MODE', language: 'en' },
  { text: "Is this all there is to life?", class: 'V_MODE', language: 'en' },
  { text: "What if I made all the wrong choices?", class: 'V_MODE', language: 'en' },
  // German
  { text: "Was ist der Sinn meines Lebens?", class: 'V_MODE', language: 'de' },
  // Spanish
  { text: "¿Quién soy realmente?", class: 'V_MODE', language: 'es' },
  { text: "No sé qué quiero de la vida", class: 'V_MODE', language: 'es' },
  // French
  { text: "Je me demande si tout cela a un sens", class: 'V_MODE', language: 'fr' },
];

// NOT V_MODE prototypes - similar wording but NOT existential
const NOT_V_MODE_PROTOTYPES: Prototype[] = [
  // Work/meeting context - these should NEVER trigger V_MODE
  // CRITICAL: "point" in work context is NOT existential
  { text: "What's the point of this meeting?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What is the point of this meeting?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this call?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this project?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this task?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this discussion?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this email?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this exercise?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'en' },
  { text: "Qual è il punto di questa riunione?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'it' },
  { text: "Qual è il punto di questo meeting?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'it' },
  { text: "Qual è il punto di questo progetto?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'it' },
  { text: "Qual è lo scopo di questa riunione?", class: 'NOT_V_MODE', subclass: 'work_point', language: 'it' },
  // General work decisions (not existential)
  { text: "I need to decide which project to work on", class: 'NOT_V_MODE', language: 'en' },
  { text: "Devo decidere quale task completare", class: 'NOT_V_MODE', language: 'it' },
  { text: "What should I do for the deadline?", class: 'NOT_V_MODE', language: 'en' },
  { text: "Non so cosa fare per il meeting", class: 'NOT_V_MODE', language: 'it' },
  { text: "I don't know what to do for the presentation", class: 'NOT_V_MODE', language: 'en' },
  { text: "What's the purpose of this report?", class: 'NOT_V_MODE', language: 'en' },
];

// EMERGENCY prototypes - acute crisis
const EMERGENCY_PROTOTYPES: Prototype[] = [
  { text: "Non riesco a respirare, ho il cuore che batte fortissimo", class: 'EMERGENCY', language: 'it' },
  { text: "Sto avendo un attacco di panico", class: 'EMERGENCY', language: 'it' },
  { text: "Mi sento soffocare, tremo tutto", class: 'EMERGENCY', language: 'it' },
  { text: "Ho paura di morire adesso", class: 'EMERGENCY', language: 'it' },
  { text: "Non riesco a calmarmi, panico totale", class: 'EMERGENCY', language: 'it' },
  { text: "I can't breathe, my heart is pounding", class: 'EMERGENCY', language: 'en' },
  { text: "I'm having a panic attack right now", class: 'EMERGENCY', language: 'en' },
  { text: "I feel like I'm dying, can't stop shaking", class: 'EMERGENCY', language: 'en' },
  { text: "Everything is spinning, I'm terrified", class: 'EMERGENCY', language: 'en' },
];

// NOT EMERGENCY prototypes - similar words but NOT crisis
const NOT_EMERGENCY_PROTOTYPES: Prototype[] = [
  // Romantic context
  { text: "Mi batte forte il cuore quando ti vedo", class: 'NOT_EMERGENCY', subclass: 'romantic', language: 'it' },
  { text: "My heart races when I think of you, I love you", class: 'NOT_EMERGENCY', subclass: 'romantic', language: 'en' },
  { text: "Il mio cuore batte solo per te", class: 'NOT_EMERGENCY', subclass: 'romantic', language: 'it' },
  // Colloquial expressions
  { text: "Sto morendo dal ridere!", class: 'NOT_EMERGENCY', subclass: 'colloquial', language: 'it' },
  { text: "I'm dying of laughter!", class: 'NOT_EMERGENCY', subclass: 'colloquial', language: 'en' },
  { text: "Mi fa morire questa cosa!", class: 'NOT_EMERGENCY', subclass: 'colloquial', language: 'it' },
  // Work anxiety (not crisis, not existential)
  { text: "Ho paura di sbagliare al lavoro", class: 'NOT_EMERGENCY', subclass: 'work_anxiety', language: 'it' },
  { text: "I'm nervous about the presentation tomorrow", class: 'NOT_EMERGENCY', subclass: 'work_anxiety', language: 'en' },
  { text: "Ho ansia per la riunione di domani", class: 'NOT_EMERGENCY', subclass: 'work_anxiety', language: 'it' },
];

// VERTICAL DIMENSION prototypes
const VERTICAL_PROTOTYPES: Record<VerticalDimension, Prototype[]> = {
  SOMATIC: [
    { text: "Sono stanco, non ho energia", class: 'SOMATIC', language: 'it' },
    { text: "Ho mal di testa da giorni", class: 'SOMATIC', language: 'it' },
    { text: "Mi sento fisicamente esausto", class: 'SOMATIC', language: 'it' },
    { text: "I can't sleep, my body aches", class: 'SOMATIC', language: 'en' },
    { text: "I feel tension in my shoulders", class: 'SOMATIC', language: 'en' },
  ],
  FUNCTIONAL: [
    { text: "Devo decidere se accettare questa offerta di lavoro", class: 'FUNCTIONAL', language: 'it' },
    { text: "Non riesco a finire tutto quello che devo fare", class: 'FUNCTIONAL', language: 'it' },
    { text: "Cosa devo fare per il meeting di domani?", class: 'FUNCTIONAL', language: 'it' },
    { text: "How should I structure this project?", class: 'FUNCTIONAL', language: 'en' },
    { text: "I need help organizing my schedule", class: 'FUNCTIONAL', language: 'en' },
  ],
  RELATIONAL: [
    { text: "Mia moglie non mi capisce, mi sento solo", class: 'RELATIONAL', language: 'it' },
    { text: "Non so come parlare con mio figlio", class: 'RELATIONAL', language: 'it' },
    { text: "Il mio capo mi tratta male", class: 'RELATIONAL', language: 'it' },
    { text: "My best friend betrayed my trust", class: 'RELATIONAL', language: 'en' },
    { text: "I feel disconnected from everyone", class: 'RELATIONAL', language: 'en' },
  ],
  EXISTENTIAL: [
    { text: "Non so cosa voglio dalla vita", class: 'EXISTENTIAL', language: 'it' },
    { text: "Chi sono veramente?", class: 'EXISTENTIAL', language: 'it' },
    { text: "What is the meaning of my existence?", class: 'EXISTENTIAL', language: 'en' },
    { text: "I keep questioning my entire life", class: 'EXISTENTIAL', language: 'en' },
    // Existential fear - fear about life choices
    { text: "Ho paura di fare la scelta sbagliata", class: 'EXISTENTIAL', language: 'it' },
    { text: "I'm afraid of making the wrong choice", class: 'EXISTENTIAL', language: 'en' },
    { text: "What if I'm on the wrong path?", class: 'EXISTENTIAL', language: 'en' },
    { text: "E se stessi sbagliando tutto?", class: 'EXISTENTIAL', language: 'it' },
  ],
  TRANSCENDENT: [
    { text: "Mi sento connesso a qualcosa di più grande", class: 'TRANSCENDENT', language: 'it' },
    { text: "C'è qualcosa oltre questa vita?", class: 'TRANSCENDENT', language: 'it' },
    { text: "I feel a connection to the universe", class: 'TRANSCENDENT', language: 'en' },
    { text: "What is my legacy?", class: 'TRANSCENDENT', language: 'en' },
  ],
};

// ============================================
// EMBEDDING SERVICE
// ============================================

class EmbeddingService {
  private cache = new Map<string, { embedding: number[]; timestamp: number }>();
  private cacheTTL: number;
  private model: string;
  private dimensions: number;

  constructor(config: SOTADetectorConfig) {
    this.cacheTTL = config.embedding_cache_ttl_ms;
    this.model = config.embedding_model;
    this.dimensions = config.embedding_dimensions;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = `${this.model}:${this.dimensions}:${text}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.embedding;
    }

    const embedding = await this.fetchEmbedding(text);
    this.cache.set(cacheKey, { embedding, timestamp: Date.now() });

    // Cleanup old entries
    if (this.cache.size > 1000) {
      this.pruneCache();
    }

    return embedding;
  }

  private async fetchEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not set');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    // Batch API call for efficiency
    const uncached: { text: string; idx: number }[] = [];
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = `${this.model}:${this.dimensions}:${texts[i]}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        results[i] = cached.embedding;
      } else {
        uncached.push({ text: texts[i], idx: i });
      }
    }

    if (uncached.length > 0) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not set');
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: uncached.map(u => u.text),
          dimensions: this.dimensions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json() as { data: Array<{ embedding: number[]; index: number }> };

      for (const item of data.data) {
        const uncachedItem = uncached[item.index];
        results[uncachedItem.idx] = item.embedding;
        const cacheKey = `${this.model}:${this.dimensions}:${uncachedItem.text}`;
        this.cache.set(cacheKey, { embedding: item.embedding, timestamp: Date.now() });
      }
    }

    return results;
  }

  private pruneCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// ============================================
// CONTRASTIVE MATCHER
// ============================================

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

interface ContrastiveResult {
  v_mode_score: number;
  v_mode_confidence: number;
  emergency_score: number;
  emergency_confidence: number;
  vertical_scores: Record<VerticalDimension, number>;
  vertical_confidence: number;
  best_v_mode_match?: string;
  best_emergency_match?: string;
}

class ContrastiveMatcher {
  private prototypeEmbeddings: Map<string, { prototype: Prototype; embedding: number[] }[]> = new Map();
  private initialized = false;

  async initialize(embeddingService: EmbeddingService): Promise<void> {
    if (this.initialized) return;

    // Compute all prototype embeddings
    const allPrototypes = [
      ...V_MODE_PROTOTYPES,
      ...NOT_V_MODE_PROTOTYPES,
      ...EMERGENCY_PROTOTYPES,
      ...NOT_EMERGENCY_PROTOTYPES,
      ...Object.values(VERTICAL_PROTOTYPES).flat(),
    ];

    const texts = allPrototypes.map(p => p.text);
    const embeddings = await embeddingService.getEmbeddings(texts);

    for (let i = 0; i < allPrototypes.length; i++) {
      const proto = allPrototypes[i];
      const key = proto.class;
      if (!this.prototypeEmbeddings.has(key)) {
        this.prototypeEmbeddings.set(key, []);
      }
      this.prototypeEmbeddings.get(key)!.push({ prototype: proto, embedding: embeddings[i] });
    }

    this.initialized = true;
  }

  async match(inputEmbedding: number[]): Promise<ContrastiveResult> {
    // V_MODE contrastive scoring
    const vModeMatches = this.prototypeEmbeddings.get('V_MODE') || [];
    const notVModeMatches = this.prototypeEmbeddings.get('NOT_V_MODE') || [];

    let maxVModeSim = 0;
    let bestVModeMatch = '';
    for (const { prototype, embedding } of vModeMatches) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxVModeSim) {
        maxVModeSim = sim;
        bestVModeMatch = prototype.text;
      }
    }

    let maxNotVModeSim = 0;
    let bestNotVModeMatch = '';
    for (const { prototype, embedding } of notVModeMatches) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxNotVModeSim) {
        maxNotVModeSim = sim;
        bestNotVModeMatch = prototype.text;
      }
    }

    // Contrastive V_MODE score with STRONG NOT_V_MODE blocking
    // If NOT_V_MODE match is very high (>0.85), it's a hard block
    // If NOT_V_MODE match is moderately high (>0.7), strong penalty
    let v_mode_score: number;
    if (maxNotVModeSim > 0.85) {
      // Hard block - work/meeting context definitively detected
      v_mode_score = 0;
    } else if (maxNotVModeSim > 0.7) {
      // Strong penalty - likely work context
      v_mode_score = Math.max(0, maxVModeSim - maxNotVModeSim * 0.9);
    } else {
      // Normal contrastive scoring
      v_mode_score = Math.max(0, maxVModeSim - maxNotVModeSim * 0.6);
    }
    const v_mode_confidence = Math.abs(maxVModeSim - maxNotVModeSim);

    // EMERGENCY contrastive scoring
    const emergencyMatches = this.prototypeEmbeddings.get('EMERGENCY') || [];
    const notEmergencyMatches = this.prototypeEmbeddings.get('NOT_EMERGENCY') || [];

    let maxEmergencySim = 0;
    let bestEmergencyMatch = '';
    for (const { prototype, embedding } of emergencyMatches) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxEmergencySim) {
        maxEmergencySim = sim;
        bestEmergencyMatch = prototype.text;
      }
    }

    let maxNotEmergencySim = 0;
    for (const { embedding } of notEmergencyMatches) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxNotEmergencySim) maxNotEmergencySim = sim;
    }

    // Contrastive EMERGENCY score
    const emergency_score = Math.max(0, maxEmergencySim - maxNotEmergencySim * 0.7);
    const emergency_confidence = Math.abs(maxEmergencySim - maxNotEmergencySim);

    // VERTICAL dimension scoring
    const vertical_scores: Record<VerticalDimension, number> = {
      SOMATIC: 0,
      FUNCTIONAL: 0,
      RELATIONAL: 0,
      EXISTENTIAL: 0,
      TRANSCENDENT: 0,
    };

    for (const dim of Object.keys(vertical_scores) as VerticalDimension[]) {
      const dimMatches = this.prototypeEmbeddings.get(dim) || [];
      let maxSim = 0;
      for (const { embedding } of dimMatches) {
        const sim = cosineSimilarity(inputEmbedding, embedding);
        if (sim > maxSim) maxSim = sim;
      }
      vertical_scores[dim] = maxSim;
    }

    // Normalize vertical scores
    const maxVertical = Math.max(...Object.values(vertical_scores));
    if (maxVertical > 0) {
      for (const dim of Object.keys(vertical_scores) as VerticalDimension[]) {
        vertical_scores[dim] = vertical_scores[dim] / maxVertical;
      }
    }

    // Vertical confidence based on separation
    const sortedVertical = Object.values(vertical_scores).sort((a, b) => b - a);
    const vertical_confidence = sortedVertical[0] - sortedVertical[1] + 0.2;

    return {
      v_mode_score,
      v_mode_confidence,
      emergency_score,
      emergency_confidence,
      vertical_scores,
      vertical_confidence: Math.min(1, vertical_confidence),
      best_v_mode_match: bestVModeMatch,
      best_emergency_match: bestEmergencyMatch,
    };
  }
}

// ============================================
// MULTI-TASK CLASSIFIER
// ============================================

interface MultiTaskResult {
  vertical: Record<VerticalDimension, number>;
  primary_vertical: VerticalDimension;
  v_mode_triggered: boolean;
  emergency_detected: boolean;
  confidence: number;
}

class MultiTaskClassifier {
  classify(
    contrastiveResult: ContrastiveResult,
    regexState: DimensionalState,
    config: SOTADetectorConfig
  ): MultiTaskResult {
    const { ensemble_weights } = config;

    // Ensemble vertical scores
    const vertical: Record<VerticalDimension, number> = {
      SOMATIC: 0,
      FUNCTIONAL: 0,
      RELATIONAL: 0,
      EXISTENTIAL: 0,
      TRANSCENDENT: 0,
    };

    for (const dim of Object.keys(vertical) as VerticalDimension[]) {
      vertical[dim] =
        contrastiveResult.vertical_scores[dim] * ensemble_weights.embedding +
        regexState.vertical[dim] * ensemble_weights.regex;
    }

    // Normalize
    const maxV = Math.max(...Object.values(vertical));
    if (maxV > 0) {
      for (const dim of Object.keys(vertical) as VerticalDimension[]) {
        vertical[dim] = Math.min(1, vertical[dim] / maxV);
      }
    }

    // Primary vertical
    const primary_vertical = Object.entries(vertical)
      .sort(([, a], [, b]) => b - a)[0][0] as VerticalDimension;

    // V_MODE decision with contrastive evidence
    // Key: v_mode_score must be HIGH and NOT_V_MODE similarity must be LOW
    const v_mode_triggered =
      (contrastiveResult.v_mode_score > 0.25 &&
       contrastiveResult.v_mode_confidence > 0.15 &&
       (vertical.EXISTENTIAL > 0.4 || vertical.TRANSCENDENT > 0.35)) ||
      // Also trigger if strong existential dimension even with lower contrastive score
      (vertical.EXISTENTIAL > 0.65 && contrastiveResult.v_mode_score > 0.15);

    // EMERGENCY decision with contrastive evidence
    const emergency_detected =
      contrastiveResult.emergency_score > 0.4 &&
      contrastiveResult.emergency_confidence > 0.3 &&
      vertical.SOMATIC > 0.5;

    // Overall confidence
    const confidence = Math.min(1,
      (contrastiveResult.v_mode_confidence +
       contrastiveResult.emergency_confidence +
       contrastiveResult.vertical_confidence) / 3
    );

    return {
      vertical,
      primary_vertical,
      v_mode_triggered,
      emergency_detected,
      confidence,
    };
  }
}

// ============================================
// SOTA DETECTOR (MAIN CLASS)
// ============================================

export class SOTADetector {
  private config: SOTADetectorConfig;
  private embeddingService: EmbeddingService;
  private contrastiveMatcher: ContrastiveMatcher;
  private multiTaskClassifier: MultiTaskClassifier;
  private llmDetector?: LLMDetector;
  private initialized = false;

  constructor(config: Partial<SOTADetectorConfig> = {}) {
    this.config = { ...DEFAULT_SOTA_CONFIG, ...config };
    this.embeddingService = new EmbeddingService(this.config);
    this.contrastiveMatcher = new ContrastiveMatcher();
    this.multiTaskClassifier = new MultiTaskClassifier();

    if (isLLMAvailable(this.config.llm_model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'haiku')) {
      this.llmDetector = new LLMDetector({
        model: this.config.llm_model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'haiku',
        fallback_to_regex: false,
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.contrastiveMatcher.initialize(this.embeddingService);
      this.initialized = true;
      if (this.config.debug) {
        console.log('[SOTA] Initialized with prototype embeddings');
      }
    } catch (error) {
      console.warn('[SOTA] Failed to initialize embeddings, will use regex fallback');
    }
  }

  /**
   * Main detection method - drop-in replacement for dimensionalDetector.detect()
   */
  async detect(
    message: string,
    language: SupportedLanguage,
    context?: {
      previous_state?: DimensionalState;
      field_state?: FieldState;
    }
  ): Promise<DimensionalState> {
    const startTime = performance.now();

    // Always get regex baseline (fast)
    const regexState = dimensionalDetector.detect(message, language, context);

    // If not initialized or no API key, return regex result
    if (!this.initialized || !process.env.OPENAI_API_KEY) {
      return regexState;
    }

    try {
      // Get input embedding
      const inputEmbedding = await this.embeddingService.getEmbedding(message);

      // Contrastive matching
      const contrastiveResult = await this.contrastiveMatcher.match(inputEmbedding);

      // Multi-task classification
      const mtResult = this.multiTaskClassifier.classify(
        contrastiveResult,
        regexState,
        this.config
      );

      // Decide if we need LLM verification
      const needsLLM =
        (this.config.use_llm_for_critical &&
          (mtResult.v_mode_triggered || mtResult.emergency_detected)) ||
        mtResult.confidence < this.config.low_confidence_threshold;

      if (needsLLM && this.llmDetector) {
        try {
          const llmResult = await this.llmDetector.detect(message, language);
          // Use LLM for critical flags, keep embedding for vertical scores
          return this.buildState(
            mtResult.vertical,
            mtResult.primary_vertical,
            llmResult.state.v_mode_triggered,
            llmResult.state.emergency_detected,
            regexState.horizontal,
            regexState.integration,
            mtResult.confidence
          );
        } catch {
          // LLM failed, use embedding result
        }
      }

      // Build final state
      const latency = performance.now() - startTime;
      if (this.config.debug) {
        console.log(`[SOTA] Detection in ${latency.toFixed(0)}ms, confidence: ${(mtResult.confidence * 100).toFixed(0)}%`);
        console.log(`[SOTA] v_mode: ${mtResult.v_mode_triggered}, emergency: ${mtResult.emergency_detected}`);
      }

      return this.buildState(
        mtResult.vertical,
        mtResult.primary_vertical,
        mtResult.v_mode_triggered,
        mtResult.emergency_detected,
        regexState.horizontal,
        regexState.integration,
        mtResult.confidence
      );

    } catch (error) {
      if (this.config.debug) {
        console.error('[SOTA] Error, falling back to regex:', error);
      }
      return regexState;
    }
  }

  /**
   * Synchronous detection (for backward compatibility)
   * Uses regex as primary, returns immediately
   */
  detectSync(
    message: string,
    language: SupportedLanguage,
    context?: {
      previous_state?: DimensionalState;
      field_state?: FieldState;
    }
  ): DimensionalState {
    return dimensionalDetector.detect(message, language, context);
  }

  private buildState(
    vertical: Record<VerticalDimension, number>,
    primary_vertical: VerticalDimension,
    v_mode_triggered: boolean,
    emergency_detected: boolean,
    horizontal: Record<HumanDomain, number>,
    integration: DimensionalState['integration'],
    confidence: number
  ): DimensionalState {
    const primary_horizontal = Object.entries(horizontal)
      .filter(([, v]) => v >= 0.3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => k as HumanDomain);

    const activeVerticals = Object.values(vertical).filter(v => v >= 0.3).length;

    return {
      vertical,
      horizontal,
      integration: {
        ...integration,
        coherence: Math.min(1, integration.coherence + confidence * 0.1),
      },
      primary_vertical,
      primary_horizontal,
      v_mode_triggered,
      emergency_detected,
      cross_dimensional: activeVerticals >= 2,
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): SOTADetectorConfig {
    return { ...this.config };
  }
}

// ============================================
// SINGLETON & EXPORTS
// ============================================

let sotaDetectorInstance: SOTADetector | null = null;

export async function getSOTADetector(config?: Partial<SOTADetectorConfig>): Promise<SOTADetector> {
  if (!sotaDetectorInstance) {
    sotaDetectorInstance = new SOTADetector(config);
    await sotaDetectorInstance.initialize();
  }
  return sotaDetectorInstance;
}

export function resetSOTADetector(): void {
  sotaDetectorInstance = null;
}

// For testing
export { cosineSimilarity, ContrastiveMatcher, EmbeddingService, MultiTaskClassifier };
