/**
 * UNIFIED GATING - v5.1 Runtime Component
 *
 * Combines three gating strategies for optimal LLM call reduction:
 *
 * 1. CACHE HIT → Skip (15-30% reduction in repeated sessions)
 * 2. HARD SKIP → Skip obvious functional/factual (10-20% reduction)
 * 3. NP GATING → Skip high-confidence non-V_MODE (remaining 26% reduction)
 *
 * Target: <50% call rate while maintaining 100% V_MODE recall
 *
 * INVARIANTS:
 * - Emergency NEVER goes to LLM (safety bypass)
 * - Hard skip is VERY conservative (only skip when certain)
 * - NP gating catches borderline cases
 *
 * Scientific basis:
 * - Neyman-Pearson: Constrained classification for V_MODE
 * - Selective classification: Know when to defer
 * - Cascading classifiers: Fast rules first, expensive later
 */

import { DimensionalState } from '../../operational/detectors/dimensional_system';
import { SupportedLanguage } from '../../interface/types';
import { NPGating, NPGatingDecision, DEFAULT_NP_CONFIG } from './np_gating';
import { LLMDetectorCache, CacheStats } from '../../gate/thresholds/llm_cache';
import { RegimeClassification } from '../../operational/detectors/llm_detector_v2';

// ============================================
// TYPES
// ============================================

export interface UnifiedGatingConfig {
  /** Enable cache lookup */
  use_cache: boolean;

  /** Enable hard skip rules */
  use_hard_skip: boolean;

  /** Enable NP gating */
  use_np_gating: boolean;

  /** NP threshold (from np_gating) */
  τ: number;

  /** Debug logging */
  debug: boolean;
}

export type SkipReason =
  | 'EMERGENCY_BYPASS'
  | 'V_MODE_TRIGGERED'
  | 'CACHE_HIT'
  | 'HARD_SKIP_FACTUAL'
  | 'HARD_SKIP_OPERATIONAL'
  | 'HARD_SKIP_ACKNOWLEDGMENT'
  | 'HARD_SKIP_GREETING'
  | 'NP_SKIP'
  | 'NP_CALL'
  | 'FALLBACK';

export interface UnifiedGatingDecision {
  /** Should we call LLM? */
  call_llm: boolean;

  /** Which gating stage made the decision */
  stage: 'cache' | 'hard_skip' | 'np_gating' | 'safety';

  /** Specific reason */
  reason: SkipReason;

  /** NP score (if NP gating was used) */
  np_score: number | null;

  /** Hard skip pattern matched (if any) */
  hard_skip_pattern: string | null;

  /** Cached result (if cache hit) */
  cached_result: RegimeClassification | null;
}

export interface UnifiedGatingStats {
  total_decisions: number;

  // By stage
  emergency_bypasses: number;
  v_mode_bypasses: number;
  cache_hits: number;
  hard_skips: number;
  np_skips: number;
  np_calls: number;

  // Rates
  overall_call_rate: number;
  cache_hit_rate: number;
  hard_skip_rate: number;
  np_skip_rate: number;

  // Breakdown
  hard_skip_by_type: Record<string, number>;
}

// ============================================
// HARD SKIP PATTERNS
// ============================================

interface HardSkipPattern {
  pattern: RegExp;
  type: 'factual' | 'operational' | 'acknowledgment' | 'greeting';
  confidence: number;
}

/**
 * HARD SKIP RULES
 *
 * These are VERY conservative - only skip when we're certain.
 * The principle: "When in doubt, don't skip"
 *
 * Categories:
 * 1. Factual questions (weather, time, definitions)
 * 2. Operational requests (how to, configuration, technical)
 * 3. Pure acknowledgments (ok, yes, thanks)
 * 4. Greetings (hello, hi, bye)
 */
const HARD_SKIP_PATTERNS: HardSkipPattern[] = [
  // === FACTUAL QUESTIONS ===
  // Time/date
  { pattern: /^(what|che)\s*(time|ora)\s*(is it|è)?\??$/i, type: 'factual', confidence: 0.99 },
  { pattern: /^(what|qual).*(date|data)\s*(today|oggi)?\??$/i, type: 'factual', confidence: 0.99 },
  { pattern: /^(what|che)\s*day\s*(is it)?\??$/i, type: 'factual', confidence: 0.99 },

  // Weather
  { pattern: /^(what|com'?è|how).*(weather|tempo|meteo)/i, type: 'factual', confidence: 0.95 },
  { pattern: /^(will it|pioverà)\s*(rain|piovere)/i, type: 'factual', confidence: 0.95 },

  // Definitions/info (careful: avoid "what is the meaning of life")
  { pattern: /^(what|cos'?è|define)\s+(is\s+)?(a|an|the|un|una|il|la)?\s*\w{3,15}\??$/i, type: 'factual', confidence: 0.80 },

  // === OPERATIONAL REQUESTS ===
  // How to (technical context)
  { pattern: /^how\s+(do|can|should)\s+I\s+(configure|setup|install|run|build|deploy|fix|debug)/i, type: 'operational', confidence: 0.95 },
  { pattern: /^come\s+(posso|faccio a)\s+(configurare|installare|avviare|eseguire)/i, type: 'operational', confidence: 0.95 },

  // Commands/actions
  { pattern: /^(run|start|stop|restart|build|deploy|execute)\s+/i, type: 'operational', confidence: 0.90 },
  { pattern: /^(esegui|avvia|ferma|riavvia)\s+/i, type: 'operational', confidence: 0.90 },

  // File/code operations
  { pattern: /^(open|close|save|delete|create|edit|read)\s+(the\s+)?(file|folder|document)/i, type: 'operational', confidence: 0.95 },
  { pattern: /^(apri|chiudi|salva|elimina|crea|modifica|leggi)\s+(il\s+)?(file|cartella|documento)/i, type: 'operational', confidence: 0.95 },

  // Meeting/schedule (work context)
  { pattern: /^(schedule|set up|book|cancel)\s+(a\s+)?(meeting|call|appointment)/i, type: 'operational', confidence: 0.90 },
  { pattern: /^(what|when).*(next\s+)?(meeting|call|standup)/i, type: 'operational', confidence: 0.85 },

  // === ACKNOWLEDGMENTS ===
  { pattern: /^(ok|okay|k|okok|alright|va bene|d'?accordo)\.?$/i, type: 'acknowledgment', confidence: 0.99 },
  { pattern: /^(yes|no|si|sì|yeah|yep|nope|nah)\.?$/i, type: 'acknowledgment', confidence: 0.99 },
  { pattern: /^(got it|understood|capito|inteso)\.?$/i, type: 'acknowledgment', confidence: 0.99 },
  { pattern: /^(thanks|thank you|grazie|thx|ty)\.?$/i, type: 'acknowledgment', confidence: 0.99 },
  { pattern: /^(sure|certo|of course|ovviamente)\.?$/i, type: 'acknowledgment', confidence: 0.95 },

  // === GREETINGS ===
  { pattern: /^(hi|hello|hey|ciao|buongiorno|buonasera|salve)\.?$/i, type: 'greeting', confidence: 0.99 },
  { pattern: /^(bye|goodbye|arrivederci|addio|ciao ciao)\.?$/i, type: 'greeting', confidence: 0.99 },
  { pattern: /^(good\s*(morning|afternoon|evening|night))\.?$/i, type: 'greeting', confidence: 0.99 },
];

/**
 * ANTI-SKIP PATTERNS
 *
 * If any of these match, NEVER hard skip (might be existential).
 */
const ANTI_SKIP_PATTERNS: RegExp[] = [
  // Existential keywords
  /meaning|senso|purpose|scopo|point|punto/i,
  /life|vita|existence|esistenza/i,
  /who\s+am\s+i|chi\s+sono/i,
  /why\s+(am\s+i|bother|continue)|perch[eé]\s+(sono|continuare)/i,

  // Emotional keywords
  /feel|sento|feeling|sentimento/i,
  /lost|perso|confused|confuso/i,
  /empty|vuoto|meaningless|insignificante/i,
  /tired\s+of|stanco\s+di/i,

  // Crisis keywords
  /can'?t\s+(breathe|cope|go on)|non\s+(riesco|ce la faccio)/i,
  /panic|panico|help|aiuto/i,

  // SHORT DANGEROUS PHRASES (might look like acks but aren't)
  // "I can't" alone or with generic continuation
  /\bi\s*can'?t\b/i,
  /\bnon\s+(posso|riesco)\b/i,

  // "basta" - can mean "enough" (ack) OR "I've had enough" (crisis)
  /\bbasta\b/i,

  // "non ce la faccio" / "can't do this anymore" / "can't take it"
  /ce la faccio/i,
  /can'?t\s+(do\s+this|take\s+(it|this)|anymore)/i,

  // "I'm done" - ambiguous, could be crisis
  /\bi'?m\s+done\b/i,
  /\bho\s+finito\b/i,

  // "no more" / "non più" / "basta così"
  /\bno\s+more\b/i,
  /\bnon\s+più\b/i,
  /basta\s+così/i,
];

/**
 * Check if message matches hard skip criteria.
 */
function checkHardSkip(message: string): {
  should_skip: boolean;
  type: HardSkipPattern['type'] | null;
  pattern: string | null;
  confidence: number;
} {
  const normalized = message.trim();

  // NEVER skip if message contains anti-skip patterns
  for (const antiPattern of ANTI_SKIP_PATTERNS) {
    if (antiPattern.test(normalized)) {
      return { should_skip: false, type: null, pattern: null, confidence: 0 };
    }
  }

  // Check hard skip patterns
  for (const { pattern, type, confidence } of HARD_SKIP_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        should_skip: true,
        type,
        pattern: pattern.source,
        confidence,
      };
    }
  }

  return { should_skip: false, type: null, pattern: null, confidence: 0 };
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_UNIFIED_CONFIG: UnifiedGatingConfig = {
  use_cache: true,
  use_hard_skip: true,
  use_np_gating: true,
  τ: DEFAULT_NP_CONFIG.τ, // 0.85
  debug: false,
};

// ============================================
// UNIFIED GATING CLASS
// ============================================

export class UnifiedGating {
  private config: UnifiedGatingConfig;
  private npGating: NPGating;
  private cache: LLMDetectorCache;
  private stats = {
    total: 0,
    emergency: 0,
    v_mode: 0,
    cache_hits: 0,
    hard_skips: 0,
    np_skips: 0,
    np_calls: 0,
    hard_skip_by_type: {} as Record<string, number>,
  };

  constructor(
    config: Partial<UnifiedGatingConfig> = {},
    cache?: LLMDetectorCache
  ) {
    this.config = { ...DEFAULT_UNIFIED_CONFIG, ...config };
    this.npGating = new NPGating({ τ: this.config.τ, debug: this.config.debug });
    this.cache = cache || new LLMDetectorCache();
  }

  /**
   * Make unified gating decision.
   *
   * Decision cascade:
   * 1. Emergency → BYPASS (safety invariant)
   * 2. V_MODE already triggered → BYPASS (regex confident)
   * 3. Cache hit → USE CACHED (avoid redundant LLM call)
   * 4. Hard skip rules → SKIP (obvious functional/factual)
   * 5. NP gating → SKIP or CALL based on A(x) score
   */
  decide(
    state: DimensionalState,
    message: string,
    language: SupportedLanguage
  ): UnifiedGatingDecision {
    this.stats.total++;

    // STAGE 0: Safety invariants
    if (state.emergency_detected) {
      this.stats.emergency++;
      return this.makeDecision(false, 'safety', 'EMERGENCY_BYPASS');
    }

    if (state.v_mode_triggered) {
      this.stats.v_mode++;
      return this.makeDecision(false, 'safety', 'V_MODE_TRIGGERED');
    }

    // STAGE 1: Cache lookup
    if (this.config.use_cache) {
      const cached = this.cache.get(message, language);
      if (cached) {
        this.stats.cache_hits++;
        return this.makeDecision(false, 'cache', 'CACHE_HIT', null, null, cached);
      }
    }

    // STAGE 2: Hard skip rules
    if (this.config.use_hard_skip) {
      const hardSkip = checkHardSkip(message);
      if (hardSkip.should_skip) {
        this.stats.hard_skips++;
        this.stats.hard_skip_by_type[hardSkip.type!] =
          (this.stats.hard_skip_by_type[hardSkip.type!] || 0) + 1;

        const reason = this.typeToReason(hardSkip.type!);
        return this.makeDecision(false, 'hard_skip', reason, null, hardSkip.pattern);
      }
    }

    // STAGE 3: NP gating
    if (this.config.use_np_gating) {
      const npDecision = this.npGating.decide(state, message, false);

      if (npDecision.reason === 'NP_SKIP') {
        this.stats.np_skips++;
        return this.makeDecision(false, 'np_gating', 'NP_SKIP', npDecision.score);
      } else {
        this.stats.np_calls++;
        return this.makeDecision(true, 'np_gating', 'NP_CALL', npDecision.score);
      }
    }

    // FALLBACK: Call LLM if no gating enabled
    this.stats.np_calls++;
    return this.makeDecision(true, 'np_gating', 'FALLBACK');
  }

  private typeToReason(type: HardSkipPattern['type']): SkipReason {
    switch (type) {
      case 'factual': return 'HARD_SKIP_FACTUAL';
      case 'operational': return 'HARD_SKIP_OPERATIONAL';
      case 'acknowledgment': return 'HARD_SKIP_ACKNOWLEDGMENT';
      case 'greeting': return 'HARD_SKIP_GREETING';
    }
  }

  private makeDecision(
    call_llm: boolean,
    stage: UnifiedGatingDecision['stage'],
    reason: SkipReason,
    np_score: number | null = null,
    hard_skip_pattern: string | null = null,
    cached_result: RegimeClassification | null = null
  ): UnifiedGatingDecision {
    const decision: UnifiedGatingDecision = {
      call_llm,
      stage,
      reason,
      np_score,
      hard_skip_pattern,
      cached_result,
    };

    if (this.config.debug) {
      console.log(`[UNIFIED_GATING] ${reason} → call_llm=${call_llm}`);
    }

    return decision;
  }

  /**
   * Store LLM result in cache for future use.
   */
  cacheResult(
    message: string,
    language: SupportedLanguage,
    result: RegimeClassification
  ): void {
    if (this.config.use_cache) {
      this.cache.set(message, language, result);
    }
  }

  /**
   * Get unified gating statistics.
   */
  getStats(): UnifiedGatingStats {
    const total = this.stats.total || 1;
    const skipped = this.stats.emergency + this.stats.v_mode +
      this.stats.cache_hits + this.stats.hard_skips + this.stats.np_skips;

    return {
      total_decisions: this.stats.total,
      emergency_bypasses: this.stats.emergency,
      v_mode_bypasses: this.stats.v_mode,
      cache_hits: this.stats.cache_hits,
      hard_skips: this.stats.hard_skips,
      np_skips: this.stats.np_skips,
      np_calls: this.stats.np_calls,
      overall_call_rate: this.stats.np_calls / total,
      cache_hit_rate: this.stats.cache_hits / total,
      hard_skip_rate: this.stats.hard_skips / total,
      np_skip_rate: this.stats.np_skips / total,
      hard_skip_by_type: { ...this.stats.hard_skip_by_type },
    };
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Reset all statistics.
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      emergency: 0,
      v_mode: 0,
      cache_hits: 0,
      hard_skips: 0,
      np_skips: 0,
      np_calls: 0,
      hard_skip_by_type: {},
    };
    this.npGating.resetStats();
  }

  /**
   * Get current configuration.
   */
  getConfig(): UnifiedGatingConfig {
    return { ...this.config };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const unifiedGating = new UnifiedGating();

export default unifiedGating;
