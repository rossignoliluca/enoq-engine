/**
 * SCIENTIFIC GATING - v4.0 Runtime Component
 *
 * Cost-sensitive selective classification based on Chow's Rule:
 *   "Call LLM iff E[loss_without_LLM] > cost(LLM)"
 *
 * References:
 * - Chow, C. K. (1970). "On optimum recognition error and reject tradeoff"
 * - Herbei & Wegkamp (2006). "Classification with reject option"
 * - Bartlett & Wegkamp (2008). "Classification with a reject option using a hinge loss"
 *
 * Key insight: The gating decision is itself a classification problem.
 * We want to minimize total expected cost:
 *   Total_Cost = P(call_LLM) × cost_LLM + P(error | not_call_LLM) × cost_error
 *
 * ARCHITECTURAL INVARIANTS:
 * - Emergency detection NEVER goes through this gate (safety bypass)
 * - Cache is checked BEFORE gating decision
 * - Uncertainty comes from fast detectors, not from this module
 */

import { DimensionalState, VerticalDimension } from '../../operational/detectors/dimensional_system';
import { SupportedLanguage } from '../../interface/types';

// ============================================
// TYPES
// ============================================

export interface CostConfig {
  /** Cost of calling LLM (in abstract units, e.g., 1.0 = baseline) */
  cost_llm_call: number;

  /** Cost of false negative on V_MODE (missing existential crisis) */
  cost_fn_v_mode: number;

  /** Cost of false positive on V_MODE (unnecessary V_MODE activation) */
  cost_fp_v_mode: number;

  /** Cost of wrong vertical dimension classification */
  cost_wrong_vertical: number;

  /** Latency budget in ms (used for cost calculation) */
  latency_budget_ms: number;

  /** Latency cost multiplier (per 100ms over budget) */
  latency_cost_per_100ms: number;
}

export interface GatingInput {
  /** Original message */
  message: string;

  /** Detected language */
  language: SupportedLanguage;

  /** Fast detector's dimensional state */
  fast_state: DimensionalState;

  /** Estimated uncertainty from fast detector (0-1) */
  fast_uncertainty: number;

  /** Is this a cached result? */
  cache_hit: boolean;

  /** Session context (for multi-turn patterns) */
  session_turn_count?: number;
}

export interface GatingDecision {
  /** Should we call LLM? */
  call_llm: boolean;

  /** Reason for decision (for debugging/auditing) */
  reason: string;

  /** Expected loss if we DON'T call LLM */
  expected_loss_no_llm: number;

  /** Cost of calling LLM */
  cost_llm: number;

  /** Net benefit of calling LLM (positive = worth it) */
  net_benefit: number;

  /** Confidence in the gating decision itself */
  gating_confidence: number;

  /** Detailed breakdown for analytics */
  breakdown: {
    p_error_v_mode: number;
    p_error_vertical: number;
    base_llm_cost: number;
    latency_penalty: number;
  };
}

export interface GatingStats {
  /** Total gating decisions */
  total_decisions: number;

  /** Decisions to call LLM */
  llm_calls: number;

  /** Decisions to skip LLM */
  llm_skips: number;

  /** LLM call rate */
  call_rate: number;

  /** Average net benefit when calling */
  avg_benefit_when_calling: number;

  /** Reasons distribution */
  reasons: Record<string, number>;
}

// ============================================
// DEFAULT CONFIG
// ============================================

/**
 * Default cost configuration.
 *
 * Cost rationale:
 * - LLM call = 1.0 (baseline)
 * - Missing V_MODE = 5.0 (serious: user in existential crisis gets wrong response)
 * - False V_MODE = 0.5 (minor: user gets more careful response than needed)
 * - Wrong vertical = 1.0 (moderate: response may be off-target)
 *
 * These can be tuned based on production data.
 */
export const DEFAULT_COST_CONFIG: CostConfig = {
  cost_llm_call: 1.0,
  cost_fn_v_mode: 8.0, // Very high: missing existential crisis is serious (increased from 5.0)
  cost_fp_v_mode: 0.5, // Low: extra caution is not harmful
  cost_wrong_vertical: 1.0,
  latency_budget_ms: 500,
  latency_cost_per_100ms: 0.2,
};

// ============================================
// UNCERTAINTY ESTIMATION
// ============================================

/**
 * Estimate probability of error on V_MODE given fast detector state.
 *
 * Based on analysis of benchmark results:
 * - High existential (>0.7) with V_MODE triggered: low error
 * - Ambiguous zone (0.35-0.65): high error
 * - Short messages with meaning markers: high error
 * - Clear functional: low error
 */
function estimateVModeErrorProbability(
  state: DimensionalState,
  message: string,
  uncertainty: number
): number {
  const existentialScore = state.vertical.EXISTENTIAL;

  // Base error rate from uncertainty
  let errorProb = uncertainty;

  // Ambiguous zone: higher error
  if (existentialScore >= 0.35 && existentialScore <= 0.65) {
    errorProb = Math.max(errorProb, 0.4);
  }

  // Short messages with potential existential content: higher error
  const isShort = message.length < 50;
  const meaningMarkers = [
    /qual è il punto|what'?s the point/i,
    /non so|I don'?t know/i,
    /perché|why/i,
    /senso|meaning/i,
    /vuoto|empty/i,
    /perso|lost/i,
  ];
  const hasMeaningMarkers = meaningMarkers.some((p) => p.test(message));

  if (isShort && hasMeaningMarkers && !state.v_mode_triggered) {
    // Fast detector says not V_MODE, but has markers: risky
    errorProb = Math.max(errorProb, 0.5);
  }

  // Clear cases: lower error
  if (state.v_mode_triggered && existentialScore > 0.7) {
    errorProb = Math.min(errorProb, 0.1);
  }
  if (state.primary_vertical === 'FUNCTIONAL' && existentialScore < 0.2) {
    errorProb = Math.min(errorProb, 0.1);
  }

  return Math.max(0, Math.min(1, errorProb));
}

/**
 * Estimate probability of wrong vertical dimension classification.
 */
function estimateVerticalErrorProbability(
  state: DimensionalState,
  uncertainty: number
): number {
  const scores = Object.values(state.vertical);
  const maxScore = Math.max(...scores);
  const secondMax = scores.sort((a, b) => b - a)[1] || 0;

  // If top two scores are close, higher error probability
  const gap = maxScore - secondMax;

  if (gap < 0.1) {
    return Math.max(uncertainty, 0.4); // Very ambiguous
  } else if (gap < 0.2) {
    return Math.max(uncertainty, 0.25); // Somewhat ambiguous
  } else if (gap < 0.3) {
    return Math.max(uncertainty, 0.15);
  }

  return Math.min(uncertainty, 0.1); // Clear winner
}

// ============================================
// GATING LOGIC
// ============================================

export class ScientificGating {
  private config: CostConfig;
  private stats: {
    total: number;
    calls: number;
    skips: number;
    benefits: number[];
    reasons: Record<string, number>;
  } = {
    total: 0,
    calls: 0,
    skips: 0,
    benefits: [],
    reasons: {},
  };

  constructor(config: Partial<CostConfig> = {}) {
    this.config = { ...DEFAULT_COST_CONFIG, ...config };
  }

  /**
   * Make gating decision using Chow's Rule.
   *
   * Core formula:
   *   Call_LLM iff E[loss | no_LLM] > cost(LLM)
   *
   * Where:
   *   E[loss | no_LLM] = P(FN_V_MODE) × cost_FN + P(FP_V_MODE) × cost_FP + P(wrong_vertical) × cost_vertical
   *   cost(LLM) = base_cost + latency_penalty
   */
  decide(input: GatingInput): GatingDecision {
    this.stats.total++;

    // SAFETY BYPASS: Emergency never goes to LLM
    if (input.fast_state.emergency_detected) {
      const decision = this.createDecision(
        false,
        'SAFETY_BYPASS: Emergency detected, fast detector only',
        0,
        this.config.cost_llm_call,
        input
      );
      this.recordDecision(decision);
      return decision;
    }

    // CACHE HIT: No need to call LLM
    if (input.cache_hit) {
      const decision = this.createDecision(
        false,
        'CACHE_HIT: Using cached LLM result',
        0,
        this.config.cost_llm_call,
        input
      );
      this.recordDecision(decision);
      return decision;
    }

    // Calculate expected loss without LLM
    const p_error_v_mode = estimateVModeErrorProbability(
      input.fast_state,
      input.message,
      input.fast_uncertainty
    );

    const p_error_vertical = estimateVerticalErrorProbability(
      input.fast_state,
      input.fast_uncertainty
    );

    // Expected loss calculation
    // For V_MODE: consider both FN (if fast says no) and FP (if fast says yes)
    let v_mode_loss: number;
    if (input.fast_state.v_mode_triggered) {
      // Fast says V_MODE: risk is FP
      v_mode_loss = p_error_v_mode * this.config.cost_fp_v_mode;
    } else {
      // Fast says not V_MODE: risk is FN (more serious)
      v_mode_loss = p_error_v_mode * this.config.cost_fn_v_mode;
    }

    const vertical_loss = p_error_vertical * this.config.cost_wrong_vertical;
    const expected_loss_no_llm = v_mode_loss + vertical_loss;

    // Calculate LLM cost (base + latency penalty)
    const base_llm_cost = this.config.cost_llm_call;
    // Assume LLM adds ~500-1000ms latency on average
    const estimated_llm_latency = 750;
    const latency_over_budget = Math.max(
      0,
      estimated_llm_latency - this.config.latency_budget_ms
    );
    const latency_penalty =
      (latency_over_budget / 100) * this.config.latency_cost_per_100ms;
    const cost_llm = base_llm_cost + latency_penalty;

    // CHOW'S RULE: Call LLM iff expected loss >= cost
    // Note: Using >= instead of > to prefer safety when borderline
    const net_benefit = expected_loss_no_llm - cost_llm;
    const call_llm = net_benefit >= 0;

    // Generate reason
    let reason: string;
    if (call_llm) {
      if (p_error_v_mode > 0.3) {
        reason = `HIGH_V_MODE_UNCERTAINTY: P(error)=${(p_error_v_mode * 100).toFixed(0)}%, net_benefit=${net_benefit.toFixed(2)}`;
      } else if (p_error_vertical > 0.25) {
        reason = `HIGH_VERTICAL_UNCERTAINTY: P(error)=${(p_error_vertical * 100).toFixed(0)}%, net_benefit=${net_benefit.toFixed(2)}`;
      } else {
        reason = `POSITIVE_NET_BENEFIT: ${net_benefit.toFixed(2)}`;
      }
    } else {
      if (expected_loss_no_llm < 0.5) {
        reason = `LOW_EXPECTED_LOSS: ${expected_loss_no_llm.toFixed(2)} < cost ${cost_llm.toFixed(2)}`;
      } else {
        reason = `COST_EXCEEDS_BENEFIT: loss=${expected_loss_no_llm.toFixed(2)}, cost=${cost_llm.toFixed(2)}`;
      }
    }

    const decision = this.createDecision(
      call_llm,
      reason,
      expected_loss_no_llm,
      cost_llm,
      input,
      {
        p_error_v_mode,
        p_error_vertical,
        base_llm_cost,
        latency_penalty,
      }
    );

    this.recordDecision(decision);
    return decision;
  }

  /**
   * Create a GatingDecision object.
   */
  private createDecision(
    call_llm: boolean,
    reason: string,
    expected_loss: number,
    cost_llm: number,
    input: GatingInput,
    breakdown?: GatingDecision['breakdown']
  ): GatingDecision {
    return {
      call_llm,
      reason,
      expected_loss_no_llm: expected_loss,
      cost_llm,
      net_benefit: expected_loss - cost_llm,
      gating_confidence: 1 - input.fast_uncertainty,
      breakdown: breakdown || {
        p_error_v_mode: 0,
        p_error_vertical: 0,
        base_llm_cost: this.config.cost_llm_call,
        latency_penalty: 0,
      },
    };
  }

  /**
   * Record decision for statistics.
   */
  private recordDecision(decision: GatingDecision): void {
    if (decision.call_llm) {
      this.stats.calls++;
      this.stats.benefits.push(decision.net_benefit);
    } else {
      this.stats.skips++;
    }

    // Extract reason category
    const reasonCategory = decision.reason.split(':')[0];
    this.stats.reasons[reasonCategory] = (this.stats.reasons[reasonCategory] || 0) + 1;
  }

  /**
   * Get gating statistics.
   */
  getStats(): GatingStats {
    const avgBenefit =
      this.stats.benefits.length > 0
        ? this.stats.benefits.reduce((a, b) => a + b, 0) / this.stats.benefits.length
        : 0;

    return {
      total_decisions: this.stats.total,
      llm_calls: this.stats.calls,
      llm_skips: this.stats.skips,
      call_rate: this.stats.total > 0 ? this.stats.calls / this.stats.total : 0,
      avg_benefit_when_calling: avgBenefit,
      reasons: { ...this.stats.reasons },
    };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.stats = {
      total: 0,
      calls: 0,
      skips: 0,
      benefits: [],
      reasons: {},
    };
  }

  /**
   * Update cost configuration.
   */
  updateConfig(config: Partial<CostConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): CostConfig {
    return { ...this.config };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const scientificGating = new ScientificGating();

export default scientificGating;
