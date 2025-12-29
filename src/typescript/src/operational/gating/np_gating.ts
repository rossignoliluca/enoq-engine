/**
 * NP-CALIBRATED GATING - v5.0 Runtime Component
 *
 * Origin: research module (now canonical)
 *
 * NP-calibrated threshold gating with lexicon boost.
 * Provides optimal LLM call reduction while maintaining recall target.
 *
 * Key features:
 * - τ (threshold) is configurable
 * - Lexicon boost catches "invisible" existential cases
 * - Fallback to v4 cost-based gating if needed
 * - Emergency bypass is HARD INVARIANT
 *
 * Scientific basis:
 * - Neyman-Pearson: Constrained classification
 * - Chow (1970): Optimal reject option
 * - El-Yaniv & Wiener (2010): Selective classification
 */

import { DimensionalState } from '../../operational/detectors/dimensional_system';
import { getBoostedExistentialScore, LexiconMatch } from '../../operational/detectors/existential_lexicon';

// ============================================
// TYPES
// ============================================

export interface NPGatingConfig {
  /** NP-calibrated threshold (default: 0.85 from benchmark calibration) */
  τ: number;

  /** Enable lexicon boost for invisible cases */
  use_lexicon: boolean;

  /** Enable fallback to v4 cost-based if score is invalid */
  enable_fallback: boolean;

  /** Log gating decisions for debug */
  debug: boolean;
}

export interface NPGatingDecision {
  /** Should we call LLM? */
  call_llm: boolean;

  /** Reason code */
  reason:
    | 'EMERGENCY_BYPASS'
    | 'V_MODE_TRIGGERED'
    | 'CACHE_HIT'
    | 'NP_SKIP'
    | 'NP_CALL'
    | 'FALLBACK';

  /** Nonconformity score A(x) */
  score: number | null;

  /** Threshold used */
  τ: number;

  /** Margin from threshold */
  margin: number | null;

  /** Lexicon matches found */
  lexicon_matches: LexiconMatch[];

  /** Debug info */
  debug?: {
    base_existential: number;
    lexicon_boost: number;
    boosted_existential: number;
  };
}

export interface NPGatingStats {
  total_decisions: number;
  emergency_bypasses: number;
  v_mode_triggered: number;
  cache_hits: number;
  np_skips: number;
  np_calls: number;
  fallbacks: number;
  call_rate: number;
  avg_score_when_skipping: number;
  avg_score_when_calling: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================

/**
 * Default configuration.
 * τ=0.85 is calibrated on the 50-case benchmark with 95% recall target.
 */
export const DEFAULT_NP_CONFIG: NPGatingConfig = {
  τ: 0.85,
  use_lexicon: true,
  enable_fallback: true,
  debug: false,
};

// ============================================
// NONCONFORMITY SCORE
// ============================================

interface ScoreResult {
  score: number;
  base_existential: number;
  lexicon_boost: number;
  boosted_existential: number;
  matches: LexiconMatch[];
  valid: boolean;
}

/**
 * Compute nonconformity score A(x) with lexicon boost.
 *
 * A(x) = 1 - boosted_existential_score
 *
 * Higher A(x) = more confident NOT v_mode = safe to skip LLM
 * Lower A(x) = might be v_mode = call LLM to be safe
 */
function computeScore(
  state: DimensionalState,
  message: string,
  useLexicon: boolean
): ScoreResult {
  const baseExistential = state.vertical.EXISTENTIAL;

  // Apply lexicon boost if enabled
  let boostedExistential = baseExistential;
  let lexiconBoost = 0;
  let matches: LexiconMatch[] = [];

  if (useLexicon) {
    const result = getBoostedExistentialScore(baseExistential, message);
    boostedExistential = result.score;
    lexiconBoost = result.lexicon_boost;
    matches = result.matches;
  }

  // A(x) = 1 - boosted_existential
  let score = 1 - boostedExistential;

  // Adjustment: If V_MODE triggered, very low score
  if (state.v_mode_triggered) {
    score = Math.min(score, 0.15);
  }

  // Adjustment: Ambiguity between top dimensions
  const verticalScores = Object.values(state.vertical).sort((a, b) => b - a);
  const gap = verticalScores[0] - (verticalScores[1] || 0);
  if (gap < 0.15) {
    score -= 0.15;
  } else if (gap < 0.25) {
    score -= 0.08;
  }

  // Clamp and validate
  score = Math.max(0, Math.min(1, score));
  const valid = !isNaN(score) && isFinite(score);

  return {
    score,
    base_existential: baseExistential,
    lexicon_boost: lexiconBoost,
    boosted_existential: boostedExistential,
    matches,
    valid,
  };
}

// ============================================
// NP GATING CLASS
// ============================================

export class NPGating {
  private config: NPGatingConfig;
  private stats = {
    total: 0,
    emergency: 0,
    v_mode: 0,
    cache: 0,
    np_skip: 0,
    np_call: 0,
    fallback: 0,
    scores_skip: [] as number[],
    scores_call: [] as number[],
  };

  constructor(config: Partial<NPGatingConfig> = {}) {
    this.config = { ...DEFAULT_NP_CONFIG, ...config };
  }

  /**
   * Make gating decision.
   *
   * Decision tree:
   * 1. Emergency → BYPASS (hard invariant)
   * 2. V_MODE triggered → BYPASS (already confident)
   * 3. Cache hit → BYPASS (use cached result)
   * 4. A(x) > τ → SKIP (confident not v_mode)
   * 5. A(x) ≤ τ → CALL (uncertain, might be v_mode)
   * 6. Invalid score → FALLBACK to v4
   */
  decide(
    state: DimensionalState,
    message: string,
    cacheHit: boolean = false
  ): NPGatingDecision {
    this.stats.total++;
    const τ = this.config.τ;

    // INVARIANT 1: Emergency NEVER goes to LLM
    if (state.emergency_detected) {
      this.stats.emergency++;
      return this.makeDecision(false, 'EMERGENCY_BYPASS', null, τ, []);
    }

    // INVARIANT 2: V_MODE already triggered
    if (state.v_mode_triggered) {
      this.stats.v_mode++;
      return this.makeDecision(false, 'V_MODE_TRIGGERED', null, τ, []);
    }

    // OPTIMIZATION: Cache hit
    if (cacheHit) {
      this.stats.cache++;
      return this.makeDecision(false, 'CACHE_HIT', null, τ, []);
    }

    // Compute score with lexicon boost
    const scoreResult = computeScore(state, message, this.config.use_lexicon);

    // FALLBACK: Invalid score
    if (!scoreResult.valid && this.config.enable_fallback) {
      this.stats.fallback++;
      // Fallback: call LLM when uncertain
      return this.makeDecision(true, 'FALLBACK', null, τ, [], {
        base_existential: scoreResult.base_existential,
        lexicon_boost: scoreResult.lexicon_boost,
        boosted_existential: scoreResult.boosted_existential,
      });
    }

    const score = scoreResult.score;
    const margin = score - τ;

    // NP DECISION: A(x) > τ → skip, A(x) ≤ τ → call
    if (score > τ) {
      this.stats.np_skip++;
      this.stats.scores_skip.push(score);
      return this.makeDecision(
        false,
        'NP_SKIP',
        score,
        τ,
        scoreResult.matches,
        {
          base_existential: scoreResult.base_existential,
          lexicon_boost: scoreResult.lexicon_boost,
          boosted_existential: scoreResult.boosted_existential,
        }
      );
    } else {
      this.stats.np_call++;
      this.stats.scores_call.push(score);
      return this.makeDecision(
        true,
        'NP_CALL',
        score,
        τ,
        scoreResult.matches,
        {
          base_existential: scoreResult.base_existential,
          lexicon_boost: scoreResult.lexicon_boost,
          boosted_existential: scoreResult.boosted_existential,
        }
      );
    }
  }

  private makeDecision(
    call_llm: boolean,
    reason: NPGatingDecision['reason'],
    score: number | null,
    τ: number,
    matches: LexiconMatch[],
    debug?: NPGatingDecision['debug']
  ): NPGatingDecision {
    const decision: NPGatingDecision = {
      call_llm,
      reason,
      score,
      τ,
      margin: score !== null ? score - τ : null,
      lexicon_matches: matches,
    };

    if (this.config.debug && debug) {
      decision.debug = debug;
    }

    return decision;
  }

  /**
   * Get gating statistics.
   */
  getStats(): NPGatingStats {
    const total = this.stats.total || 1;
    const avgSkip = this.stats.scores_skip.length > 0
      ? this.stats.scores_skip.reduce((a, b) => a + b, 0) / this.stats.scores_skip.length
      : 0;
    const avgCall = this.stats.scores_call.length > 0
      ? this.stats.scores_call.reduce((a, b) => a + b, 0) / this.stats.scores_call.length
      : 0;

    return {
      total_decisions: this.stats.total,
      emergency_bypasses: this.stats.emergency,
      v_mode_triggered: this.stats.v_mode,
      cache_hits: this.stats.cache,
      np_skips: this.stats.np_skip,
      np_calls: this.stats.np_call,
      fallbacks: this.stats.fallback,
      call_rate: this.stats.np_call / total,
      avg_score_when_skipping: avgSkip,
      avg_score_when_calling: avgCall,
    };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      emergency: 0,
      v_mode: 0,
      cache: 0,
      np_skip: 0,
      np_call: 0,
      fallback: 0,
      scores_skip: [],
      scores_call: [],
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): NPGatingConfig {
    return { ...this.config };
  }

  /**
   * Update threshold (runtime tuning).
   */
  setThreshold(τ: number): void {
    this.config.τ = τ;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const npGating = new NPGating();

export default npGating;
