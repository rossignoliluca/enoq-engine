/**
 * DEFINITIVE GATING - Research Module
 *
 * NP-calibrated gating for optimal LLM call reduction with recall constraint.
 *
 * This implements the "definitive" gating strategy derived from:
 * - Chow (1970): Optimal reject option
 * - Neyman-Pearson: Constrained classification
 * - El-Yaniv & Wiener (2010): Selective classification
 *
 * Key insight: Given a monotonic score A(x), the optimal strategy is thresholding.
 * We calibrate τ on positive samples to achieve target recall.
 *
 * ARCHITECTURAL INVARIANTS (HARD):
 * - Emergency: NEVER goes to LLM. Always fast detector. Non-negotiable.
 * - V_MODE triggered: Already confident, skip LLM.
 *
 * GATING DECISION:
 * - A(x) > τ → skip LLM (confident NOT v_mode)
 * - A(x) ≤ τ → call LLM (uncertain, might be v_mode)
 */

import { DimensionalState, DimensionalDetector } from '../../operational/detectors/dimensional_system';
import { SupportedLanguage } from '../../interface/types';
import {
  CalibrationResult,
  computeNonconformityScore,
  loadCalibration,
  NonconformityScore,
} from './np_calibration';

// ============================================
// TYPES
// ============================================

export interface DefinitiveGatingConfig {
  /** Calibrated threshold */
  τ: number;

  /** Target recall (for reference) */
  target_recall: number;

  /** Enable cache integration */
  use_cache: boolean;
}

export interface GatingDecision {
  /** Should we call LLM? */
  call_llm: boolean;

  /** Reason code */
  reason:
    | 'EMERGENCY_BYPASS'
    | 'V_MODE_TRIGGERED'
    | 'CACHE_HIT'
    | 'CONFORMAL_SKIP'
    | 'CONFORMAL_CALL';

  /** Detailed explanation */
  explanation: string;

  /** Nonconformity score (if computed) */
  nonconformity_score: number | null;

  /** Score components (for debugging) */
  score_components: NonconformityScore['components'] | null;

  /** Threshold used */
  τ: number;

  /** Margin from threshold (positive = above, negative = below) */
  margin: number | null;
}

export interface GatingStats {
  total_decisions: number;
  emergency_bypasses: number;
  v_mode_triggered: number;
  cache_hits: number;
  conformal_skips: number;
  conformal_calls: number;
  call_rate: number;
  skip_rate: number;
  avg_score_when_skipping: number;
  avg_score_when_calling: number;
}

// ============================================
// DEFINITIVE GATING CLASS
// ============================================

export class DefinitiveGating {
  private config: DefinitiveGatingConfig;
  private stats: {
    total: number;
    emergency: number;
    v_mode: number;
    cache: number;
    skip: number;
    call: number;
    scores_skip: number[];
    scores_call: number[];
  } = {
    total: 0,
    emergency: 0,
    v_mode: 0,
    cache: 0,
    skip: 0,
    call: 0,
    scores_skip: [],
    scores_call: [],
  };

  constructor(config: Partial<DefinitiveGatingConfig> = {}) {
    // Try to load calibration if τ not provided
    let τ = config.τ;
    let target_recall = config.target_recall || 0.95;

    if (τ === undefined) {
      const calibration = loadCalibration();
      if (calibration) {
        τ = calibration.τ;
        target_recall = calibration.target_recall;
      } else {
        // Fallback: conservative threshold
        τ = 0.5;
        console.warn('[DefinitiveGating] No calibration found, using fallback τ=0.5');
      }
    }

    this.config = {
      τ,
      target_recall,
      use_cache: config.use_cache ?? true,
    };
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
   */
  decide(
    state: DimensionalState,
    message: string,
    cacheHit: boolean = false
  ): GatingDecision {
    this.stats.total++;

    // INVARIANT 1: Emergency NEVER goes to LLM
    if (state.emergency_detected) {
      this.stats.emergency++;
      return {
        call_llm: false,
        reason: 'EMERGENCY_BYPASS',
        explanation: 'Hard invariant: emergency always from fast detector',
        nonconformity_score: null,
        score_components: null,
        τ: this.config.τ,
        margin: null,
      };
    }

    // INVARIANT 2: V_MODE already triggered → no need for LLM
    if (state.v_mode_triggered) {
      this.stats.v_mode++;
      return {
        call_llm: false,
        reason: 'V_MODE_TRIGGERED',
        explanation: 'Fast detector already triggered V_MODE with high confidence',
        nonconformity_score: null,
        score_components: null,
        τ: this.config.τ,
        margin: null,
      };
    }

    // OPTIMIZATION: Cache hit → use cached result
    if (cacheHit && this.config.use_cache) {
      this.stats.cache++;
      return {
        call_llm: false,
        reason: 'CACHE_HIT',
        explanation: 'Using cached LLM result',
        nonconformity_score: null,
        score_components: null,
        τ: this.config.τ,
        margin: null,
      };
    }

    // NP-CALIBRATED DECISION
    const { score, components } = computeNonconformityScore(state, message);
    const margin = score - this.config.τ;

    if (score > this.config.τ) {
      // A(x) > τ: confident NOT v_mode, skip LLM
      this.stats.skip++;
      this.stats.scores_skip.push(score);
      return {
        call_llm: false,
        reason: 'CONFORMAL_SKIP',
        explanation: `A(x)=${score.toFixed(3)} > τ=${this.config.τ.toFixed(3)}: confident not V_MODE`,
        nonconformity_score: score,
        score_components: components,
        τ: this.config.τ,
        margin,
      };
    } else {
      // A(x) ≤ τ: might be v_mode, call LLM to be safe
      this.stats.call++;
      this.stats.scores_call.push(score);
      return {
        call_llm: true,
        reason: 'CONFORMAL_CALL',
        explanation: `A(x)=${score.toFixed(3)} ≤ τ=${this.config.τ.toFixed(3)}: uncertain, calling LLM`,
        nonconformity_score: score,
        score_components: components,
        τ: this.config.τ,
        margin,
      };
    }
  }

  /**
   * Get gating statistics.
   */
  getStats(): GatingStats {
    const total = this.stats.total || 1;
    const avgSkip = this.stats.scores_skip.length > 0
      ? this.stats.scores_skip.reduce((a, b) => a + b, 0) / this.stats.scores_skip.length
      : 0;
    const avgCall = this.stats.scores_call.length > 0
      ? this.stats.scores_call.reduce((a, b) => a + b, 0) / this.stats.scores_call.length
      : 0;

    const callCount = this.stats.call;
    const skipCount = this.stats.emergency + this.stats.v_mode + this.stats.cache + this.stats.skip;

    return {
      total_decisions: this.stats.total,
      emergency_bypasses: this.stats.emergency,
      v_mode_triggered: this.stats.v_mode,
      cache_hits: this.stats.cache,
      conformal_skips: this.stats.skip,
      conformal_calls: this.stats.call,
      call_rate: callCount / total,
      skip_rate: skipCount / total,
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
      skip: 0,
      call: 0,
      scores_skip: [],
      scores_call: [],
    };
  }

  /**
   * Get current configuration.
   */
  getConfig(): DefinitiveGatingConfig {
    return { ...this.config };
  }

  /**
   * Update threshold (for experimentation).
   */
  updateThreshold(τ: number): void {
    this.config.τ = τ;
  }
}

// ============================================
// FACTORY
// ============================================

/**
 * Create a DefinitiveGating instance with calibration loaded from file.
 */
export function createDefinitiveGating(
  calibrationPath?: string
): DefinitiveGating {
  const calibration = loadCalibration(calibrationPath);

  if (!calibration) {
    console.warn('[createDefinitiveGating] No calibration found, run np_calibration first');
    return new DefinitiveGating();
  }

  console.log(`[createDefinitiveGating] Loaded τ=${calibration.τ.toFixed(4)} ` +
    `(target_recall=${(calibration.target_recall * 100).toFixed(0)}%, ` +
    `n_positives=${calibration.n_positives})`);

  return new DefinitiveGating({
    τ: calibration.τ,
    target_recall: calibration.target_recall,
  });
}

export default DefinitiveGating;
