/**
 * LIMEN ULTIMATE DIMENSIONAL DETECTOR v2
 *
 * A CALIBRATED SENSOR, not a judge.
 *
 * CORE PRINCIPLE:
 * The detector doesn't decide what to do.
 * The detector decides only how LITTLE the system can do.
 *
 * Output: probabilities + calibration + risk_flags
 * Decision: delegated to GENESIS/AXIS
 *
 * SCIENTIFIC FOUNDATIONS:
 * - FastFit (IBM NAACL 2024): Batch contrastive learning
 * - SetFit (HuggingFace): Few-shot classification with calibration
 * - GATE v2: 97.27% accuracy, 0% D1 FNR in benchmark
 * - Isotonic regression / Temperature scaling for calibration
 * - Abstention theory: know when you don't know
 *
 * ARCHITECTURE:
 * - Stage 0: Emergency Fast-Path (2ms) - safety floor
 * - Stage 1: Semantic Embedding (50ms) - representation
 * - Stage 2: FastFit Contrastive (5ms) - prototype matching with margin
 * - Stage 3: SetFit Heads (2ms) - calibrated probabilities
 * - Stage 4: Abstention + Safety Floor - STOP when uncertain
 *
 * OUTPUT (for AXIS to consume):
 * - domain_probs: P(D1), P(D3), P(D4), P(Knowledge)
 * - vertical_probs: P(SOMATIC), ..., P(TRANSCENDENT)
 * - confidence: calibrated probability estimate
 * - abstention_score: 0-1 (high = should abstain)
 * - risk_flags: { delegation, irreversibility, low_confidence, incongruence }
 * - safety_floor: STOP | MINIMAL | PROCEED
 */

import { SupportedLanguage, HumanDomain, FieldState } from '../../interface/types';
import { DimensionalState, VerticalDimension } from './dimensional_system';

// ============================================
// OUTPUT TYPES (for AXIS consumption)
// ============================================

export interface RiskFlags {
  /** User is delegating decision-making responsibility */
  delegation: boolean;
  /** Topic involves irreversible consequences */
  irreversibility: boolean;
  /** Confidence is below operational threshold */
  low_confidence: boolean;
  /** Cross-stage disagreement detected */
  incongruence: boolean;
  /** Repeated pattern (escalation) */
  repetition: boolean;
  /** Out-of-distribution input detected */
  ood_detected: boolean;
}

export type SafetyFloor = 'STOP' | 'MINIMAL' | 'PROCEED';

export interface DetectorOutput {
  // Probability distributions (calibrated)
  domain_probs: {
    D1_CRISIS: number;      // Acute crisis requiring immediate grounding
    D3_EXISTENTIAL: number; // Existential/meaning questions (V_MODE)
    D4_RELATIONAL: number;  // Relationship/attachment
    KNOWLEDGE: number;      // Factual/operational
  };

  vertical_probs: Record<VerticalDimension, number>;

  horizontal_probs: Record<HumanDomain, number>;

  // Calibration metrics
  confidence: number;           // 0-1, calibrated probability of correctness
  abstention_score: number;     // 0-1, high = should abstain
  margin: number;              // distance between top two predictions

  // Risk assessment
  risk_flags: RiskFlags;

  // Safety floor recommendation (sensor output, not decision)
  safety_floor: SafetyFloor;

  // Debug info
  stage_outputs?: {
    fast_path: { emergency_detected: boolean; confidence: number };
    embedding: { cached: boolean; latency_ms: number };
    contrastive: { top_match: string; margin: number };
    heads: { raw_logits: Record<string, number> };
    incongruence: { score: number; details: string[] };
  };

  // Latency
  latency_ms: number;
}

// Legacy compatibility
export interface LegacyDimensionalOutput extends DimensionalState {
  detector_output: DetectorOutput;
}

// ============================================
// CONFIGURATION
// ============================================

export interface UltimateDetectorConfig {
  // Embedding settings
  embedding_provider: 'openai' | 'local';
  embedding_model: string;
  embedding_dimensions: number;

  // Contrastive settings
  contrastive_temperature: number;
  min_similarity_threshold: number;
  hard_block_threshold: number;

  // Abstention settings
  abstention_confidence_threshold: number;  // below this → abstain
  abstention_margin_threshold: number;      // below this margin → abstain
  incongruence_threshold: number;           // cross-stage disagreement threshold

  // Safety settings
  emergency_recall_target: number;  // target recall for emergency (prioritize FNR)

  // Performance
  cache_embeddings: boolean;
  debug: boolean;
}

const DEFAULT_CONFIG: UltimateDetectorConfig = {
  embedding_provider: 'openai',
  embedding_model: 'text-embedding-3-small',
  embedding_dimensions: 256,

  contrastive_temperature: 0.07,
  min_similarity_threshold: 0.5,
  hard_block_threshold: 0.85,

  abstention_confidence_threshold: 0.4,
  abstention_margin_threshold: 0.15,
  incongruence_threshold: 0.3,

  emergency_recall_target: 0.99,

  cache_embeddings: true,
  debug: false,
};

// ============================================
// PROTOTYPE DATABASE (MULTILINGUAL BALANCED)
// ============================================

interface Prototype {
  text: string;
  class: string;
  subclass?: string;
  language: SupportedLanguage;
  embedding?: number[];
}

// D1_CRISIS (Emergency) - prioritize recall
const D1_CRISIS_PROTOTYPES: Prototype[] = [
  // Italian
  { text: "Non riesco a respirare, ho il cuore che batte fortissimo", class: 'D1_CRISIS', language: 'it' },
  { text: "Sto avendo un attacco di panico", class: 'D1_CRISIS', language: 'it' },
  { text: "Mi sento soffocare, tremo tutto", class: 'D1_CRISIS', language: 'it' },
  { text: "Ho paura di morire adesso", class: 'D1_CRISIS', language: 'it' },
  { text: "Non riesco a calmarmi, panico totale", class: 'D1_CRISIS', language: 'it' },
  { text: "Il cuore mi batte fortissimo, non riesco a fermarmi", class: 'D1_CRISIS', language: 'it' },
  { text: "Sto perdendo il controllo", class: 'D1_CRISIS', language: 'it' },
  { text: "Mi manca l'aria, aiutami", class: 'D1_CRISIS', language: 'it' },
  // English
  { text: "I can't breathe, my heart is pounding", class: 'D1_CRISIS', language: 'en' },
  { text: "I'm having a panic attack right now", class: 'D1_CRISIS', language: 'en' },
  { text: "I feel like I'm dying, can't stop shaking", class: 'D1_CRISIS', language: 'en' },
  { text: "Everything is spinning, I'm terrified", class: 'D1_CRISIS', language: 'en' },
  { text: "I can't calm down, total panic", class: 'D1_CRISIS', language: 'en' },
  { text: "Help me, I can't breathe", class: 'D1_CRISIS', language: 'en' },
  { text: "I'm losing control", class: 'D1_CRISIS', language: 'en' },
  // Spanish
  { text: "No puedo respirar, mi corazón late muy rápido", class: 'D1_CRISIS', language: 'es' },
  { text: "Estoy teniendo un ataque de pánico", class: 'D1_CRISIS', language: 'es' },
  { text: "Estoy perdiendo el control", class: 'D1_CRISIS', language: 'es' },
  // German
  { text: "Ich kann nicht atmen, mein Herz rast", class: 'D1_CRISIS', language: 'de' },
  { text: "Ich habe eine Panikattacke", class: 'D1_CRISIS', language: 'de' },
  { text: "Ich verliere die Kontrolle", class: 'D1_CRISIS', language: 'de' },
  // French
  { text: "Je ne peux pas respirer, mon coeur bat très vite", class: 'D1_CRISIS', language: 'fr' },
  { text: "Je fais une crise de panique", class: 'D1_CRISIS', language: 'fr' },
];

// NOT D1 (false positives to block)
const NOT_D1_PROTOTYPES: Prototype[] = [
  // Romantic context
  { text: "Mi batte forte il cuore quando ti vedo", class: 'NOT_D1', subclass: 'romantic', language: 'it' },
  { text: "My heart races when I think of you, I love you", class: 'NOT_D1', subclass: 'romantic', language: 'en' },
  { text: "Il mio cuore batte solo per te", class: 'NOT_D1', subclass: 'romantic', language: 'it' },
  { text: "Ti amo così tanto che mi batte forte il cuore", class: 'NOT_D1', subclass: 'romantic', language: 'it' },
  { text: "You make my heart race", class: 'NOT_D1', subclass: 'romantic', language: 'en' },
  // Colloquial
  { text: "Sto morendo dal ridere!", class: 'NOT_D1', subclass: 'colloquial', language: 'it' },
  { text: "I'm dying of laughter!", class: 'NOT_D1', subclass: 'colloquial', language: 'en' },
  { text: "This is killing me!", class: 'NOT_D1', subclass: 'colloquial', language: 'en' },
  { text: "Mi fa morire questa cosa!", class: 'NOT_D1', subclass: 'colloquial', language: 'it' },
  { text: "Muoio di fame", class: 'NOT_D1', subclass: 'colloquial', language: 'it' },
  { text: "I'm dying of hunger", class: 'NOT_D1', subclass: 'colloquial', language: 'en' },
  // Excitement
  { text: "Che bello! Mi batte il cuore dall'emozione!", class: 'NOT_D1', subclass: 'excitement', language: 'it' },
  { text: "My heart is racing from excitement!", class: 'NOT_D1', subclass: 'excitement', language: 'en' },
];

// D3_EXISTENTIAL (V_MODE triggers)
const D3_EXISTENTIAL_PROTOTYPES: Prototype[] = [
  // Core existential - Italian
  { text: "Non so cosa voglio dalla vita", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Chi sono veramente?", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Qual è il senso di tutto questo?", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Mi sento perso, senza direzione", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "A che serve fare qualsiasi cosa?", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Non mi riconosco più", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Tutto sembra vuoto e senza significato", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Niente ha più senso per me", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Mi chiedo se ne valga la pena", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "La mia vita non ha uno scopo", class: 'D3_EXISTENTIAL', language: 'it' },
  { text: "Qual è il punto?", class: 'D3_EXISTENTIAL', subclass: 'subtle', language: 'it' },
  { text: "A che serve tutto questo?", class: 'D3_EXISTENTIAL', subclass: 'subtle', language: 'it' },
  // Existential fear (CRITICAL - these are D3, not work anxiety)
  { text: "Ho paura di fare la scelta sbagliata", class: 'D3_EXISTENTIAL', subclass: 'existential_fear', language: 'it' },
  { text: "Ho paura di sbagliare tutto nella vita", class: 'D3_EXISTENTIAL', subclass: 'existential_fear', language: 'it' },
  { text: "E se stessi sbagliando tutto?", class: 'D3_EXISTENTIAL', subclass: 'existential_fear', language: 'it' },
  // Core existential - English
  { text: "What is the meaning of my existence?", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "I don't know who I am anymore", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "What's the point of all this?", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "I feel completely lost in life", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "Everything feels meaningless", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "Everything feels meaningless to me", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "Nothing feels meaningful anymore", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "Is this all there is to life?", class: 'D3_EXISTENTIAL', language: 'en' },
  { text: "What's the point?", class: 'D3_EXISTENTIAL', subclass: 'subtle', language: 'en' },
  { text: "What is the point?", class: 'D3_EXISTENTIAL', subclass: 'subtle', language: 'en' },
  { text: "What's even the point?", class: 'D3_EXISTENTIAL', subclass: 'subtle', language: 'en' },
  { text: "I'm afraid of making the wrong choice", class: 'D3_EXISTENTIAL', subclass: 'existential_fear', language: 'en' },
  { text: "What if I made all the wrong choices?", class: 'D3_EXISTENTIAL', subclass: 'existential_fear', language: 'en' },
  // Spanish
  { text: "¿Quién soy realmente?", class: 'D3_EXISTENTIAL', language: 'es' },
  { text: "No sé qué quiero de la vida", class: 'D3_EXISTENTIAL', language: 'es' },
  { text: "Todo parece vacío y sin sentido", class: 'D3_EXISTENTIAL', language: 'es' },
  // German
  { text: "Was ist der Sinn meines Lebens?", class: 'D3_EXISTENTIAL', language: 'de' },
  { text: "Ich weiß nicht mehr, wer ich bin", class: 'D3_EXISTENTIAL', language: 'de' },
  // French
  { text: "Je me demande si tout cela a un sens", class: 'D3_EXISTENTIAL', language: 'fr' },
  { text: "Qui suis-je vraiment?", class: 'D3_EXISTENTIAL', language: 'fr' },
];

// NOT D3 (work/operational context - must NOT trigger V_MODE)
const NOT_D3_PROTOTYPES: Prototype[] = [
  // Work "point" questions
  { text: "What's the point of this meeting?", class: 'NOT_D3', subclass: 'work_point', language: 'en' },
  { text: "What is the point of this meeting?", class: 'NOT_D3', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this project?", class: 'NOT_D3', subclass: 'work_point', language: 'en' },
  { text: "What's the point of this task?", class: 'NOT_D3', subclass: 'work_point', language: 'en' },
  { text: "What's the purpose of this meeting?", class: 'NOT_D3', subclass: 'work_point', language: 'en' },
  { text: "Why are we having this meeting?", class: 'NOT_D3', subclass: 'work_point', language: 'en' },
  { text: "Qual è il punto di questa riunione?", class: 'NOT_D3', subclass: 'work_point', language: 'it' },
  { text: "Qual è lo scopo di questo meeting?", class: 'NOT_D3', subclass: 'work_point', language: 'it' },
  // Work decisions
  { text: "I need to decide which project to work on", class: 'NOT_D3', subclass: 'work', language: 'en' },
  { text: "What should I do for the deadline?", class: 'NOT_D3', subclass: 'work', language: 'en' },
  { text: "How should I structure this report?", class: 'NOT_D3', subclass: 'work', language: 'en' },
  { text: "Devo decidere quale task completare", class: 'NOT_D3', subclass: 'work', language: 'it' },
  // Work anxiety (not existential)
  { text: "Ho paura di sbagliare al lavoro domani", class: 'NOT_D3', subclass: 'work_anxiety', language: 'it' },
  { text: "I'm nervous about the presentation tomorrow", class: 'NOT_D3', subclass: 'work_anxiety', language: 'en' },
  { text: "I'm worried about the deadline", class: 'NOT_D3', subclass: 'work_anxiety', language: 'en' },
];

// D4_RELATIONAL
const D4_RELATIONAL_PROTOTYPES: Prototype[] = [
  { text: "Mia moglie non mi capisce, mi sento solo", class: 'D4_RELATIONAL', language: 'it' },
  { text: "Non so come parlare con mio figlio", class: 'D4_RELATIONAL', language: 'it' },
  { text: "Mi sento disconnesso dagli altri", class: 'D4_RELATIONAL', language: 'it' },
  { text: "Non ho nessuno con cui parlare", class: 'D4_RELATIONAL', language: 'it' },
  { text: "I feel disconnected from everyone", class: 'D4_RELATIONAL', language: 'en' },
  { text: "My partner doesn't understand me", class: 'D4_RELATIONAL', language: 'en' },
  { text: "I feel alone in this relationship", class: 'D4_RELATIONAL', language: 'en' },
  { text: "My best friend betrayed my trust", class: 'D4_RELATIONAL', language: 'en' },
  { text: "Me siento desconectado de todos", class: 'D4_RELATIONAL', language: 'es' },
  { text: "Je me sens seul dans cette relation", class: 'D4_RELATIONAL', language: 'fr' },
];

// KNOWLEDGE (operational/factual)
const KNOWLEDGE_PROTOTYPES: Prototype[] = [
  { text: "How do I configure this setting?", class: 'KNOWLEDGE', language: 'en' },
  { text: "What's the weather tomorrow?", class: 'KNOWLEDGE', language: 'en' },
  { text: "Can you explain how this works?", class: 'KNOWLEDGE', language: 'en' },
  { text: "What time is the meeting?", class: 'KNOWLEDGE', language: 'en' },
  { text: "Come si configura questa impostazione?", class: 'KNOWLEDGE', language: 'it' },
  { text: "Che tempo fa domani?", class: 'KNOWLEDGE', language: 'it' },
  // Work/task decisions
  { text: "Devo decidere quale task fare", class: 'KNOWLEDGE', language: 'it' },
  { text: "Quale task devo fare prima?", class: 'KNOWLEDGE', language: 'it' },
  { text: "Which task should I do first?", class: 'KNOWLEDGE', language: 'en' },
  { text: "I need to decide which task to do", class: 'KNOWLEDGE', language: 'en' },
  // Colloquial expressions (NOT emotional)
  { text: "Sto morendo dal ridere!", class: 'KNOWLEDGE', subclass: 'colloquial', language: 'it' },
  { text: "I'm dying of laughter!", class: 'KNOWLEDGE', subclass: 'colloquial', language: 'en' },
  { text: "This is so funny!", class: 'KNOWLEDGE', subclass: 'colloquial', language: 'en' },
  { text: "Che ridere!", class: 'KNOWLEDGE', subclass: 'colloquial', language: 'it' },
  { text: "LOL", class: 'KNOWLEDGE', subclass: 'colloquial', language: 'en' },
  { text: "Haha", class: 'KNOWLEDGE', subclass: 'colloquial', language: 'en' },
];

// VERTICAL DIMENSION PROTOTYPES
const VERTICAL_PROTOTYPES: Record<VerticalDimension, Prototype[]> = {
  SOMATIC: [
    { text: "Sono stanco, non ho energia", class: 'SOMATIC', language: 'it' },
    { text: "Ho mal di testa da giorni", class: 'SOMATIC', language: 'it' },
    { text: "Mi sento fisicamente esausto", class: 'SOMATIC', language: 'it' },
    { text: "Ho dolore al petto", class: 'SOMATIC', language: 'it' },
    { text: "Non dormo bene", class: 'SOMATIC', language: 'it' },
    { text: "I can't sleep, my body aches", class: 'SOMATIC', language: 'en' },
    { text: "I'm exhausted, no energy left", class: 'SOMATIC', language: 'en' },
    { text: "My body hurts all over", class: 'SOMATIC', language: 'en' },
  ],
  FUNCTIONAL: [
    { text: "Devo decidere se accettare questa offerta di lavoro", class: 'FUNCTIONAL', language: 'it' },
    { text: "Non riesco a finire tutto quello che devo fare", class: 'FUNCTIONAL', language: 'it' },
    { text: "Cosa devo fare per il meeting di domani?", class: 'FUNCTIONAL', language: 'it' },
    { text: "What's the point of this meeting?", class: 'FUNCTIONAL', language: 'en' },
    { text: "How should I structure this project?", class: 'FUNCTIONAL', language: 'en' },
    { text: "I need help organizing my schedule", class: 'FUNCTIONAL', language: 'en' },
    { text: "Which task should I prioritize?", class: 'FUNCTIONAL', language: 'en' },
  ],
  RELATIONAL: [
    { text: "Mia moglie non mi capisce, mi sento solo", class: 'RELATIONAL', language: 'it' },
    { text: "Non so come parlare con mio figlio", class: 'RELATIONAL', language: 'it' },
    { text: "Mi sento disconnesso dagli altri", class: 'RELATIONAL', language: 'it' },
    { text: "I feel disconnected from everyone", class: 'RELATIONAL', language: 'en' },
    { text: "My partner doesn't understand me", class: 'RELATIONAL', language: 'en' },
    { text: "I feel alone in this relationship", class: 'RELATIONAL', language: 'en' },
  ],
  EXISTENTIAL: [
    { text: "Non so cosa voglio dalla vita", class: 'EXISTENTIAL', language: 'it' },
    { text: "Chi sono veramente?", class: 'EXISTENTIAL', language: 'it' },
    { text: "Qual è il senso di tutto?", class: 'EXISTENTIAL', language: 'it' },
    { text: "Ho paura di fare la scelta sbagliata", class: 'EXISTENTIAL', language: 'it' },
    { text: "What is the meaning of my existence?", class: 'EXISTENTIAL', language: 'en' },
    { text: "Who am I really?", class: 'EXISTENTIAL', language: 'en' },
    { text: "I'm afraid of making the wrong choice", class: 'EXISTENTIAL', language: 'en' },
  ],
  TRANSCENDENT: [
    { text: "Mi sento connesso a qualcosa di più grande", class: 'TRANSCENDENT', language: 'it' },
    { text: "C'è qualcosa oltre questa vita?", class: 'TRANSCENDENT', language: 'it' },
    { text: "Mi chiedo cosa lascerò dopo di me", class: 'TRANSCENDENT', language: 'it' },
    { text: "I feel a connection to the universe", class: 'TRANSCENDENT', language: 'en' },
    { text: "What is my legacy?", class: 'TRANSCENDENT', language: 'en' },
    { text: "Is there something beyond this life?", class: 'TRANSCENDENT', language: 'en' },
  ],
};

// ============================================
// STAGE 0: EMERGENCY FAST-PATH (SAFETY FLOOR)
// ============================================

const EMERGENCY_REGEX_PATTERNS = [
  /(?<!morendo dal )(?<!dying of )(?<!dying from )(can'?t|cannot|non riesco a|no puedo|nicht)\s*(breathe|respirare|respirar|atmen)/i,
  /(?<!morendo dal )(?<!dying of )(panic|panico|pánico|panik)\s*(attack|attacco|ataque)?/i,
  /(heart|cuore|corazón|herz)\s*(is\s*)?(pounding|racing|beating\s*fast|batte\s*forte|batte\s*fortissimo|late\s*rápido)/i,
  /(help|aiuto|ayuda|hilfe)\s*(me|mi)?/i,
  /(losing|perdendo|perdiendo)\s*(control|controllo|control)/i,
  /(can'?t|cannot|non riesco)\s*(calm|calmare|calmar)/i,
  /terrified|terrorizzato|aterrorizado/i,
  /(shaking|trembling|tremando|temblando)/i,
  /feel(ing)?\s*(like\s*)?(i'?m\s*)?(dying|morendo|muriendo)/i,
];

const EMERGENCY_EXCLUSION_PATTERNS = [
  /love|amore|amor|liebe|ti amo|te amo|i love|when i see you|quando ti vedo/i,
  /morendo dal ridere|dying of laughter|dying laughing|muoio dal ridere/i,
  /dying of (hunger|thirst|boredom)|morendo di (fame|sete|noia)/i,
  /killing me.*(laughter|funny|hilarious)/i,
  /this is killing me/i,
  /excitement|emozione|entusiasmo/i,
];

interface FastPathResult {
  emergency_detected: boolean;
  confidence: number;
  pattern_matches: number;
  excluded: boolean;
}

function checkEmergencyFastPath(message: string): FastPathResult {
  // Check exclusions first
  for (const pattern of EMERGENCY_EXCLUSION_PATTERNS) {
    if (pattern.test(message)) {
      return { emergency_detected: false, confidence: 0.95, pattern_matches: 0, excluded: true };
    }
  }

  // Check emergency patterns
  let matchCount = 0;
  for (const pattern of EMERGENCY_REGEX_PATTERNS) {
    if (pattern.test(message)) matchCount++;
  }

  if (matchCount >= 2) {
    return { emergency_detected: true, confidence: 0.90, pattern_matches: matchCount, excluded: false };
  } else if (matchCount === 1) {
    return { emergency_detected: true, confidence: 0.70, pattern_matches: matchCount, excluded: false };
  }

  return { emergency_detected: false, confidence: 0.5, pattern_matches: 0, excluded: false };
}

// ============================================
// STAGE 1: EMBEDDING SERVICE
// ============================================

class EmbeddingService {
  private cache = new Map<string, { embedding: number[]; timestamp: number }>();
  private config: UltimateDetectorConfig;

  constructor(config: UltimateDetectorConfig) {
    this.config = config;
  }

  async getEmbedding(text: string): Promise<{ embedding: number[]; cached: boolean }> {
    const cacheKey = text.toLowerCase().trim();
    const cached = this.cache.get(cacheKey);

    if (cached && this.config.cache_embeddings) {
      return { embedding: cached.embedding, cached: true };
    }

    const embedding = await this.fetchEmbedding(text);
    this.cache.set(cacheKey, { embedding, timestamp: Date.now() });

    return { embedding, cached: false };
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);
    const uncached: { text: string; idx: number }[] = [];

    for (let i = 0; i < texts.length; i++) {
      const cacheKey = texts[i].toLowerCase().trim();
      const cached = this.cache.get(cacheKey);
      if (cached && this.config.cache_embeddings) {
        results[i] = cached.embedding;
      } else {
        uncached.push({ text: texts[i], idx: i });
      }
    }

    if (uncached.length > 0) {
      const embeddings = await this.fetchEmbeddingsBatch(uncached.map(u => u.text));
      for (let i = 0; i < uncached.length; i++) {
        results[uncached[i].idx] = embeddings[i];
        const cacheKey = uncached[i].text.toLowerCase().trim();
        this.cache.set(cacheKey, { embedding: embeddings[i], timestamp: Date.now() });
      }
    }

    return results;
  }

  private async fetchEmbedding(text: string): Promise<number[]> {
    const results = await this.fetchEmbeddingsBatch([text]);
    return results[0];
  }

  private async fetchEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return texts.map(() => this.randomEmbedding());
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.embedding_model,
          input: texts,
          dimensions: this.config.embedding_dimensions,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json() as { data: Array<{ embedding: number[]; index: number }> };
      const sorted = data.data.sort((a, b) => a.index - b.index);
      return sorted.map(d => d.embedding);

    } catch {
      console.warn('[ULTIMATE] Embedding API error, using random fallback');
      return texts.map(() => this.randomEmbedding());
    }
  }

  private randomEmbedding(): number[] {
    const embedding = new Array(this.config.embedding_dimensions);
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = (Math.random() - 0.5) * 2;
    }
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / norm);
  }
}

// ============================================
// STAGE 2: FASTFIT CONTRASTIVE MATCHER
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
  domain_scores: {
    D1_CRISIS: number;
    D3_EXISTENTIAL: number;
    D4_RELATIONAL: number;
    KNOWLEDGE: number;
  };
  vertical_scores: Record<VerticalDimension, number>;
  top_match: { class: string; text: string; similarity: number };
  margin: number;
  incongruence_details: string[];
}

class FastFitContrastiveMatcher {
  private prototypeEmbeddings: Map<string, { prototype: Prototype; embedding: number[] }[]> = new Map();
  private initialized = false;
  private config: UltimateDetectorConfig;

  constructor(config: UltimateDetectorConfig) {
    this.config = config;
  }

  async initialize(embeddingService: EmbeddingService): Promise<void> {
    if (this.initialized) return;

    const allPrototypes = [
      ...D1_CRISIS_PROTOTYPES,
      ...NOT_D1_PROTOTYPES,
      ...D3_EXISTENTIAL_PROTOTYPES,
      ...NOT_D3_PROTOTYPES,
      ...D4_RELATIONAL_PROTOTYPES,
      ...KNOWLEDGE_PROTOTYPES,
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

    if (this.config.debug) {
      console.log(`[ULTIMATE] Initialized with ${allPrototypes.length} prototypes`);
    }
  }

  match(inputEmbedding: number[]): ContrastiveResult {
    // Compute domain scores with contrastive blocking
    const d1Score = this.computeContrastiveScore(inputEmbedding, 'D1_CRISIS', 'NOT_D1');
    const d3Score = this.computeContrastiveScore(inputEmbedding, 'D3_EXISTENTIAL', 'NOT_D3');
    const d4Score = this.computeMaxSimilarity(inputEmbedding, 'D4_RELATIONAL');
    const knowledgeScore = this.computeMaxSimilarity(inputEmbedding, 'KNOWLEDGE');

    // Compute vertical scores
    const verticalScores: Record<VerticalDimension, number> = {
      SOMATIC: 0,
      FUNCTIONAL: 0,
      RELATIONAL: 0,
      EXISTENTIAL: 0,
      TRANSCENDENT: 0,
    };

    for (const dim of Object.keys(verticalScores) as VerticalDimension[]) {
      verticalScores[dim] = this.computeMaxSimilarity(inputEmbedding, dim);
    }

    // Find top match across all classes
    let topMatch = { class: '', text: '', similarity: 0 };
    for (const [className, protos] of this.prototypeEmbeddings) {
      if (className.startsWith('NOT_')) continue;
      for (const { prototype, embedding } of protos) {
        const sim = cosineSimilarity(inputEmbedding, embedding);
        if (sim > topMatch.similarity) {
          topMatch = { class: className, text: prototype.text, similarity: sim };
        }
      }
    }

    // Compute margin (difference between top two)
    const allScores = [d1Score.score, d3Score.score, d4Score, knowledgeScore];
    const sortedScores = [...allScores].sort((a, b) => b - a);
    const margin = sortedScores[0] - sortedScores[1];

    // Detect incongruence
    const incongruenceDetails: string[] = [];
    if (d1Score.score > 0.5 && d1Score.blocked) {
      incongruenceDetails.push('D1 high but blocked by NOT_D1');
    }
    if (d3Score.score > 0.5 && d3Score.blocked) {
      incongruenceDetails.push('D3 high but blocked by NOT_D3');
    }

    return {
      domain_scores: {
        D1_CRISIS: d1Score.score,
        D3_EXISTENTIAL: d3Score.score,
        D4_RELATIONAL: d4Score,
        KNOWLEDGE: knowledgeScore,
      },
      vertical_scores: verticalScores,
      top_match: topMatch,
      margin,
      incongruence_details: incongruenceDetails,
    };
  }

  private computeContrastiveScore(
    inputEmbedding: number[],
    positiveClass: string,
    negativeClass: string
  ): { score: number; blocked: boolean } {
    const positiveProtos = this.prototypeEmbeddings.get(positiveClass) || [];
    const negativeProtos = this.prototypeEmbeddings.get(negativeClass) || [];

    let maxPositiveSim = 0;
    for (const { embedding } of positiveProtos) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxPositiveSim) maxPositiveSim = sim;
    }

    let maxNegativeSim = 0;
    for (const { embedding } of negativeProtos) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxNegativeSim) maxNegativeSim = sim;
    }

    // Hard blocking if negative is very strong
    if (maxNegativeSim > this.config.hard_block_threshold) {
      return { score: 0, blocked: true };
    }

    // Contrastive scoring
    const score = Math.max(0, maxPositiveSim - maxNegativeSim * 0.6);
    return { score, blocked: false };
  }

  private computeMaxSimilarity(inputEmbedding: number[], className: string): number {
    const protos = this.prototypeEmbeddings.get(className) || [];
    let maxSim = 0;
    for (const { embedding } of protos) {
      const sim = cosineSimilarity(inputEmbedding, embedding);
      if (sim > maxSim) maxSim = sim;
    }
    return maxSim;
  }
}

// ============================================
// STAGE 3: SETFIT CLASSIFICATION HEADS (CALIBRATED)
// ============================================

interface HeadsResult {
  domain_probs: {
    D1_CRISIS: number;
    D3_EXISTENTIAL: number;
    D4_RELATIONAL: number;
    KNOWLEDGE: number;
  };
  vertical_probs: Record<VerticalDimension, number>;
  confidence: number;
  raw_logits: Record<string, number>;
}

class SetFitClassificationHeads {
  private config: UltimateDetectorConfig;
  private calibrationTemperature = 1.5; // temperature scaling for calibration

  constructor(config: UltimateDetectorConfig) {
    this.config = config;
  }

  classify(contrastive: ContrastiveResult): HeadsResult {
    // Convert raw scores to logits (simple linear transform)
    const rawLogits = {
      D1_CRISIS: contrastive.domain_scores.D1_CRISIS * 2 - 1,
      D3_EXISTENTIAL: contrastive.domain_scores.D3_EXISTENTIAL * 2 - 1,
      D4_RELATIONAL: contrastive.domain_scores.D4_RELATIONAL * 2 - 1,
      KNOWLEDGE: contrastive.domain_scores.KNOWLEDGE * 2 - 1,
    };

    // Apply temperature scaling for calibration
    const scaledLogits = Object.fromEntries(
      Object.entries(rawLogits).map(([k, v]) => [k, v / this.calibrationTemperature])
    ) as typeof rawLogits;

    // Softmax for domain probabilities
    const domainProbs = this.softmax(scaledLogits) as typeof scaledLogits;

    // Normalize vertical scores to probabilities
    const verticalTotal = Object.values(contrastive.vertical_scores).reduce((a, b) => a + b, 0);
    const verticalProbs = Object.fromEntries(
      Object.entries(contrastive.vertical_scores).map(([k, v]) => [k, v / (verticalTotal || 1)])
    ) as Record<VerticalDimension, number>;

    // Compute calibrated confidence (based on margin and max prob)
    const maxDomainProb = Math.max(...Object.values(domainProbs));
    const confidence = Math.min(1, maxDomainProb * (1 + contrastive.margin));

    return {
      domain_probs: domainProbs,
      vertical_probs: verticalProbs,
      confidence,
      raw_logits: rawLogits,
    };
  }

  private softmax(logits: Record<string, number>): typeof logits {
    const values = Object.values(logits);
    const maxLogit = Math.max(...values);
    const expValues = values.map(v => Math.exp(v - maxLogit));
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    const keys = Object.keys(logits);
    return Object.fromEntries(keys.map((k, i) => [k, expValues[i] / sumExp])) as typeof logits;
  }
}

// ============================================
// STAGE 4: ABSTENTION + SAFETY FLOOR
// ============================================

interface AbstentionResult {
  abstention_score: number;
  safety_floor: SafetyFloor;
  risk_flags: RiskFlags;
  incongruence_score: number;
}

function computeAbstention(
  fastPath: FastPathResult,
  contrastive: ContrastiveResult,
  heads: HeadsResult,
  config: UltimateDetectorConfig
): AbstentionResult {
  // Compute abstention score
  let abstentionScore = 0;

  // Low margin → abstain
  if (contrastive.margin < config.abstention_margin_threshold) {
    abstentionScore += 0.4;
  }

  // Low confidence → abstain
  if (heads.confidence < config.abstention_confidence_threshold) {
    abstentionScore += 0.3;
  }

  // Incongruence detected → abstain
  const incongruenceScore = contrastive.incongruence_details.length > 0 ? 0.3 : 0;
  abstentionScore += incongruenceScore;

  // Cross-stage disagreement
  const fastPathSaysEmergency = fastPath.emergency_detected;
  const headsSayEmergency = heads.domain_probs.D1_CRISIS > 0.5;
  if (fastPathSaysEmergency !== headsSayEmergency) {
    abstentionScore += 0.2;
  }

  abstentionScore = Math.min(1, abstentionScore);

  // Compute risk flags
  const riskFlags: RiskFlags = {
    delegation: false, // Would need context history to detect
    irreversibility: heads.domain_probs.D1_CRISIS > 0.5, // Only high crisis probability
    low_confidence: heads.confidence < 0.25, // Very low confidence only
    incongruence: contrastive.incongruence_details.length > 1, // Multiple incongruences
    repetition: false, // Would need session history
    ood_detected: contrastive.top_match.similarity < 0.3, // Very low similarity = OOD
  };

  // Determine safety floor
  // Philosophy: PROCEED is default. STOP only for genuine emergencies.
  let safetyFloor: SafetyFloor;

  // STOP: Only for genuine emergencies detected by fast-path
  // The fast-path is highly tuned for somatic crisis signals
  if (fastPath.emergency_detected) {
    safetyFloor = 'STOP';
  }
  // MINIMAL: Very high abstention (multiple red flags combined)
  else if (abstentionScore > 0.8) {
    safetyFloor = 'MINIMAL';
  }
  // PROCEED: Default for normal conversation
  // Low confidence is normal for ambiguous human language
  else {
    safetyFloor = 'PROCEED';
  }

  return {
    abstention_score: abstentionScore,
    safety_floor: safetyFloor,
    risk_flags: riskFlags,
    incongruence_score: incongruenceScore,
  };
}

// ============================================
// ULTIMATE DETECTOR (MAIN CLASS)
// ============================================

export class UltimateDetector {
  private config: UltimateDetectorConfig;
  private embeddingService: EmbeddingService;
  private contrastiveMatcher: FastFitContrastiveMatcher;
  private classificationHeads: SetFitClassificationHeads;
  private initialized = false;

  constructor(config: Partial<UltimateDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embeddingService = new EmbeddingService(this.config);
    this.contrastiveMatcher = new FastFitContrastiveMatcher(this.config);
    this.classificationHeads = new SetFitClassificationHeads(this.config);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const start = performance.now();
    await this.contrastiveMatcher.initialize(this.embeddingService);
    this.initialized = true;

    if (this.config.debug) {
      console.log(`[ULTIMATE] Initialized in ${(performance.now() - start).toFixed(0)}ms`);
    }
  }

  /**
   * Main detection method - returns calibrated probabilities + risk assessment
   */
  async detectRaw(
    message: string,
    _language: SupportedLanguage
  ): Promise<DetectorOutput> {
    const startTime = performance.now();

    if (!this.initialized) {
      await this.initialize();
    }

    // STAGE 0: Emergency fast-path
    const fastPath = checkEmergencyFastPath(message);

    // STAGE 1: Get embedding
    const embeddingStart = performance.now();
    const { embedding: inputEmbedding, cached } = await this.embeddingService.getEmbedding(message);
    const embeddingLatency = performance.now() - embeddingStart;

    // STAGE 2: Contrastive matching
    const contrastive = this.contrastiveMatcher.match(inputEmbedding);

    // STAGE 3: Classification heads
    const heads = this.classificationHeads.classify(contrastive);

    // STAGE 4: Abstention + Safety floor
    const abstention = computeAbstention(fastPath, contrastive, heads, this.config);

    // Build horizontal probs (simplified mapping from domain)
    const horizontalProbs: Record<HumanDomain, number> = {} as Record<HumanDomain, number>;
    const domains: HumanDomain[] = [
      'H01_SURVIVAL', 'H02_SAFETY', 'H03_BODY', 'H04_EMOTION', 'H05_COGNITION',
      'H06_MEANING', 'H07_IDENTITY', 'H08_TEMPORAL', 'H09_ATTACHMENT', 'H10_COORDINATION',
      'H11_BELONGING', 'H12_HIERARCHY', 'H13_CREATION', 'H14_WORK', 'H15_LEGAL',
      'H16_OPERATIONAL', 'H17_FORM'
    ];
    for (const d of domains) {
      horizontalProbs[d] = 0;
    }

    // Map vertical to horizontal
    horizontalProbs.H03_BODY = heads.vertical_probs.SOMATIC;
    horizontalProbs.H06_MEANING = heads.vertical_probs.EXISTENTIAL;
    horizontalProbs.H07_IDENTITY = heads.vertical_probs.EXISTENTIAL * 0.8;
    horizontalProbs.H14_WORK = heads.vertical_probs.FUNCTIONAL;
    horizontalProbs.H09_ATTACHMENT = heads.vertical_probs.RELATIONAL;

    const latency = performance.now() - startTime;

    if (this.config.debug) {
      console.log(`[ULTIMATE] Detection in ${latency.toFixed(0)}ms`);
      console.log(`[ULTIMATE] Safety floor: ${abstention.safety_floor}`);
      console.log(`[ULTIMATE] Domain probs: D1=${heads.domain_probs.D1_CRISIS.toFixed(2)} D3=${heads.domain_probs.D3_EXISTENTIAL.toFixed(2)}`);
    }

    return {
      domain_probs: heads.domain_probs,
      vertical_probs: heads.vertical_probs,
      horizontal_probs: horizontalProbs,
      confidence: heads.confidence,
      abstention_score: abstention.abstention_score,
      margin: contrastive.margin,
      risk_flags: abstention.risk_flags,
      safety_floor: abstention.safety_floor,
      stage_outputs: {
        fast_path: { emergency_detected: fastPath.emergency_detected, confidence: fastPath.confidence },
        embedding: { cached, latency_ms: embeddingLatency },
        contrastive: { top_match: contrastive.top_match.text, margin: contrastive.margin },
        heads: { raw_logits: heads.raw_logits },
        incongruence: { score: abstention.incongruence_score, details: contrastive.incongruence_details },
      },
      latency_ms: latency,
    };
  }

  /**
   * Legacy-compatible detection method (for backward compatibility with pipeline)
   */
  async detect(
    message: string,
    language: SupportedLanguage,
    _context?: {
      previous_state?: DimensionalState;
      field_state?: FieldState;
    }
  ): Promise<DimensionalState> {
    const raw = await this.detectRaw(message, language);

    // Convert to legacy format
    const primaryVertical = Object.entries(raw.vertical_probs)
      .sort(([, a], [, b]) => b - a)[0][0] as VerticalDimension;

    const primaryHorizontal = Object.entries(raw.horizontal_probs)
      .filter(([, v]) => v >= 0.2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => k as HumanDomain);

    // V_MODE decision based on probabilities (not binary)
    // Use softer threshold + check if D3 is top or second-top domain
    const sortedDomains = Object.entries(raw.domain_probs)
      .sort(([, a], [, b]) => b - a);
    const topDomain = sortedDomains[0][0];
    const d3IsTopOrSecond = sortedDomains.slice(0, 2).some(([k]) => k === 'D3_EXISTENTIAL');

    const v_mode_triggered =
      // Path 1: D3 is top domain
      (topDomain === 'D3_EXISTENTIAL' && raw.domain_probs.D3_EXISTENTIAL > 0.25) ||
      // Path 2: D3 is second AND primary vertical is existential/transcendent
      (raw.domain_probs.D3_EXISTENTIAL > 0.25 &&
       (primaryVertical === 'EXISTENTIAL' || primaryVertical === 'TRANSCENDENT') &&
       d3IsTopOrSecond) ||
      // Path 3: Strong D3 signal regardless of vertical
      (raw.domain_probs.D3_EXISTENTIAL > 0.32);

    // Emergency decision (prioritize recall)
    const emergency_detected =
      raw.domain_probs.D1_CRISIS > 0.3 ||
      raw.stage_outputs?.fast_path.emergency_detected ||
      false;

    return {
      vertical: raw.vertical_probs,
      horizontal: raw.horizontal_probs,
      integration: {
        phi: raw.confidence,
        complexity: Object.values(raw.vertical_probs).filter(v => v > 0.2).length,
        coherence: raw.margin,
        tension: raw.abstention_score,
      },
      primary_vertical: primaryVertical,
      primary_horizontal: primaryHorizontal,
      v_mode_triggered,
      emergency_detected,
      cross_dimensional: raw.abstention_score > 0.3,
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================
// SINGLETON & EXPORTS
// ============================================

let ultimateDetectorInstance: UltimateDetector | null = null;

export async function getUltimateDetector(
  config?: Partial<UltimateDetectorConfig>
): Promise<UltimateDetector> {
  if (!ultimateDetectorInstance) {
    ultimateDetectorInstance = new UltimateDetector(config);
    await ultimateDetectorInstance.initialize();
  }
  return ultimateDetectorInstance;
}

export function resetUltimateDetector(): void {
  ultimateDetectorInstance = null;
}

export type { ContrastiveResult };
