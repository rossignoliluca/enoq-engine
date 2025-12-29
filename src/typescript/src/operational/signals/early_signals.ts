/**
 * LIMEN Early Signals - Bounded Contributor Contract
 *
 * EarlySignals is how TotalSystem contributes to the pipeline in real-time.
 *
 * Key invariants:
 * 1. ALL fields are optional (partial signals are valid)
 * 2. Merge is always safe (no blocking on missing data)
 * 3. Deadline enforced - if not arrived, pipeline uses conservative defaults
 * 4. Each sub-module can contribute without blocking others
 *
 * Timeline:
 * - Standard deadline: 80-120ms
 * - Full deadline: 250ms (only for complex cases)
 * - Fallback: conservative defaults if timeout
 */

import {
  ADSScore,
  MotiveDistribution,
  RiskFlags,
  PolicyAdjustments,
  DelegationPrediction,
  ResponsePlan,
} from '../../interface/types';

// Re-export shared types for backwards compatibility
export type { PolicyAdjustments, DelegationPrediction, ResponsePlan } from '../../interface/types';

// ============================================
// DEADLINE CONFIGURATION
// ============================================

export const DEADLINE_CONFIG = {
  /** Standard deadline for EarlySignals (ms) */
  STANDARD_MS: 100,

  /** Extended deadline for complex cases (ms) */
  EXTENDED_MS: 200,

  /** Maximum wait before forcing fallback (ms) */
  MAX_MS: 250,

  /** Minimum wait (don't check too early) */
  MIN_MS: 30,
} as const;

// ============================================
// EARLY SIGNALS COMPONENTS
// ============================================

// Note: DelegationPrediction and PolicyAdjustments are now defined in interface/types.ts
// and re-exported above for backwards compatibility

// ============================================
// POLICY ADJUSTMENTS MERGE
// ============================================

/**
 * Merge ADS (HARD) and Second Order (SOFT) policy adjustments.
 *
 * Order: ADS first, then Second Order.
 *
 * Merge rules:
 * - must_require_user_effort: OR (once true, stays true)
 * - disable_tools: OR (once true, stays true)
 * - brevity_delta: min (more negative = more brief)
 * - warmth_delta: sum clamped to [-1, +1]
 * - force_pronouns: Second Order only (ADS must not set it)
 * - max_length: min (shorter wins)
 *
 * INVARIANT: Merge never loosens constraints (monotonic).
 */
export function mergePolicyAdjustments(
  adsPolicy: Partial<PolicyAdjustments>,
  secondOrderPolicy: Partial<PolicyAdjustments>
): PolicyAdjustments {
  const merged: PolicyAdjustments = {};

  // ---- HARD constraints (ADS) ----
  // OR logic: once true, stays true
  if (adsPolicy.must_require_user_effort || secondOrderPolicy.must_require_user_effort) {
    merged.must_require_user_effort = true;
  }

  if (adsPolicy.disable_tools || secondOrderPolicy.disable_tools) {
    merged.disable_tools = true;
  }

  // ---- max_length: min (shorter wins) ----
  if (adsPolicy.max_length !== undefined || secondOrderPolicy.max_length !== undefined) {
    const adsLen = adsPolicy.max_length ?? Infinity;
    const soLen = secondOrderPolicy.max_length ?? Infinity;
    const minLen = Math.min(adsLen, soLen);
    if (minLen !== Infinity) {
      merged.max_length = minLen;
    }
  }

  // ---- brevity_delta: min (more negative = more brief) ----
  if (adsPolicy.brevity_delta !== undefined || secondOrderPolicy.brevity_delta !== undefined) {
    const adsBrev = adsPolicy.brevity_delta ?? 0;
    const soBrev = secondOrderPolicy.brevity_delta ?? 0;
    merged.brevity_delta = Math.min(adsBrev, soBrev);
  }

  // ---- warmth_delta: sum clamped to [-1, +1] ----
  if (adsPolicy.warmth_delta !== undefined || secondOrderPolicy.warmth_delta !== undefined) {
    const adsWarmth = adsPolicy.warmth_delta ?? 0;
    const soWarmth = secondOrderPolicy.warmth_delta ?? 0;
    merged.warmth_delta = Math.max(-1, Math.min(1, adsWarmth + soWarmth));
  }

  // ---- force_pronouns: Second Order only ----
  // ADS should not set this; if it does, Second Order takes priority
  if (secondOrderPolicy.force_pronouns) {
    merged.force_pronouns = secondOrderPolicy.force_pronouns;
  } else if (adsPolicy.force_pronouns) {
    merged.force_pronouns = adsPolicy.force_pronouns;
  }

  // ---- budget_deltas: merge (take lower values) ----
  if (adsPolicy.budget_deltas || secondOrderPolicy.budget_deltas) {
    merged.budget_deltas = { ...adsPolicy.budget_deltas, ...secondOrderPolicy.budget_deltas };
  }

  return merged;
}

/**
 * Debug info for policy adjustment chain.
 */
export interface PolicyAdjustmentTrace {
  ads_policy: Partial<PolicyAdjustments>;
  second_order_policy: Partial<PolicyAdjustments>;
  merged_policy: PolicyAdjustments;
  ads_reasoning?: string;
  second_order_reasoning?: string;
}

/**
 * Veto signal from swarm or safety.
 */
export interface VetoSignal {
  /** Source of veto */
  source: 'swarm' | 'safety' | 'constitution' | 'axis';

  /** What is being vetoed */
  target: 'act' | 'plan' | 'constraint';

  /** Specific item vetoed (act type, constraint name) */
  item: string;

  /** Reason for veto */
  reason: string;

  /** Severity 0-1 (1 = hard veto, <0.5 = warning) */
  severity: number;
}

/**
 * Memory prior from MemorySystem.
 * Just hints, not content.
 */
export interface MemoryPrior {
  /** Relevant patterns from history (max 2-3) */
  patterns?: string[];

  /** User model features (not PII, just traits) */
  user_traits?: {
    autonomy_level?: 'high' | 'medium' | 'low';
    preferred_warmth?: 'cold' | 'neutral' | 'warm';
    communication_style?: 'direct' | 'indirect';
  };

  /** Previous session summary (1 line) */
  session_context?: string;

  /** Relapse risk for known patterns */
  relapse_risk?: number;  // 0-1
}

/**
 * Metacognitive signal from MetacognitiveMonitor.
 */
export interface MetacognitiveSignal {
  /** Uncertainty about classification */
  uncertainty?: number;  // 0-1

  /** Need more information before acting */
  need_more_info?: boolean;

  /** Coherence of current assessment */
  coherence?: number;  // 0-1

  /** Self-awareness flags */
  self_awareness?: {
    counter_transference_risk?: boolean;
    projection_risk?: boolean;
    over_helping_risk?: boolean;
  };
}

/**
 * Temporal signal from TemporalEngine.
 */
export interface TemporalSignal {
  /** Inertia from repeated patterns */
  inertia?: number;  // 0-1

  /** Time pressure detected */
  time_pressure?: boolean;

  /** Past pattern relevance */
  past_relevance?: number;  // 0-1

  /** Future orientation strength */
  future_orientation?: number;  // 0-1
}

/**
 * Candidate suggestions from TotalSystem.
 * Maximum 1-2, not full plans.
 */
export interface CandidateSuggestion {
  /** Suggested primary act */
  act: string;

  /** Suggested target */
  target?: string;

  /** Confidence */
  confidence: number;

  /** Reason */
  reason: string;
}

// ============================================
// EARLY SIGNALS (Main Interface)
// ============================================

/**
 * EarlySignals is the output of TotalSystem that arrives before S3b commit.
 *
 * ALL FIELDS ARE OPTIONAL.
 * The pipeline will use conservative defaults for missing fields.
 * This ensures no blocking on slow sub-modules.
 */
export interface EarlySignals {
  // ---- Core predictions ----
  /** Delegation prediction (ADS + motive) */
  delegation_pred?: DelegationPrediction;

  // ---- Risk assessment ----
  /** Risk flags (crisis, enchantment, v_mode, etc.) */
  risk_flags?: Partial<RiskFlags>;

  // ---- Policy adjustments ----
  /** Adjustments to constraints */
  policy_adjustments?: PolicyAdjustments;

  // ---- Candidate suggestions ----
  /** Suggested candidates (max 1-2) */
  candidate_suggestions?: CandidateSuggestion[];

  // ---- Sub-module signals ----
  /** Memory prior */
  memory?: MemoryPrior;

  /** Metacognitive signal */
  metacognitive?: MetacognitiveSignal;

  /** Temporal signal */
  temporal?: TemporalSignal;

  // ---- Veto signals ----
  /** Veto signals from any source */
  vetoes?: VetoSignal[];

  // ---- Metadata ----
  /** When these signals were generated */
  generated_at?: number;

  /** How long it took to generate (ms) */
  generation_time_ms?: number;

  /** Which sub-modules contributed */
  contributors?: string[];
}

// ============================================
// ARRIVAL STATUS
// ============================================

/**
 * Status of EarlySignals at sync point.
 */
export interface EarlySignalsStatus {
  /** Did signals arrive before deadline? */
  arrived_before_deadline: boolean;

  /** How long we waited (ms) */
  wait_time_ms: number;

  /** Which signals arrived (bitmask) */
  signals_received: {
    delegation_pred: boolean;
    risk_flags: boolean;
    policy_adjustments: boolean;
    candidate_suggestions: boolean;
    memory: boolean;
    metacognitive: boolean;
    temporal: boolean;
    vetoes: boolean;
  };

  /** What defaults were used */
  defaults_used: string[];

  /** Was this a timeout? */
  timed_out: boolean;

  /** Deadline that was used (ms) */
  deadline_used: number;
}

// ============================================
// CONSERVATIVE DEFAULTS
// ============================================

/**
 * Conservative defaults when EarlySignals timeout or are incomplete.
 */
export const CONSERVATIVE_DEFAULTS: EarlySignals = {
  delegation_pred: undefined,  // Don't assume
  risk_flags: {
    crisis: false,
    emergency: false,
    v_mode: false,
    enchantment: false,
    loop_detected: false,
    boundary_approach: false,
  },
  policy_adjustments: {
    // Default to restrictive
    max_length: 100,
    warmth_delta: 0,
    brevity_delta: -1,  // More brief
    disable_tools: true,  // Don't allow tools if unsure
  },
  candidate_suggestions: [],  // No suggestions
  memory: undefined,
  metacognitive: {
    uncertainty: 0.5,  // Assume moderate uncertainty
    need_more_info: true,
    coherence: 0.5,
  },
  temporal: {
    inertia: 0.5,  // Assume moderate inertia
  },
  vetoes: [],  // No vetoes
  generated_at: Date.now(),
  generation_time_ms: 0,
  contributors: ['defaults'],
};

// ============================================
// MERGE UTILITIES
// ============================================

/**
 * Merge partial EarlySignals with defaults.
 * Partial signals override defaults where present.
 */
export function mergeWithDefaults(
  partial: EarlySignals | undefined
): EarlySignals {
  if (!partial) {
    return { ...CONSERVATIVE_DEFAULTS, generated_at: Date.now() };
  }

  return {
    delegation_pred: partial.delegation_pred,
    risk_flags: {
      ...CONSERVATIVE_DEFAULTS.risk_flags,
      ...partial.risk_flags,
    },
    policy_adjustments: {
      ...CONSERVATIVE_DEFAULTS.policy_adjustments,
      ...partial.policy_adjustments,
    },
    candidate_suggestions: partial.candidate_suggestions || [],
    memory: partial.memory,
    metacognitive: {
      ...CONSERVATIVE_DEFAULTS.metacognitive,
      ...partial.metacognitive,
    },
    temporal: {
      ...CONSERVATIVE_DEFAULTS.temporal,
      ...partial.temporal,
    },
    vetoes: partial.vetoes || [],
    generated_at: partial.generated_at || Date.now(),
    generation_time_ms: partial.generation_time_ms || 0,
    contributors: partial.contributors || ['partial'],
  };
}

/**
 * Merge multiple partial signals from different sources.
 * Later sources override earlier ones.
 */
export function mergeSignals(...signals: (Partial<EarlySignals> | undefined)[]): EarlySignals {
  let merged = { ...CONSERVATIVE_DEFAULTS };

  for (const signal of signals) {
    if (!signal) continue;

    merged = {
      ...merged,
      ...signal,
      risk_flags: {
        ...merged.risk_flags,
        ...signal.risk_flags,
      },
      policy_adjustments: {
        ...merged.policy_adjustments,
        ...signal.policy_adjustments,
      },
      metacognitive: {
        ...merged.metacognitive,
        ...signal.metacognitive,
      },
      temporal: {
        ...merged.temporal,
        ...signal.temporal,
      },
      vetoes: [...(merged.vetoes || []), ...(signal.vetoes || [])],
      contributors: [...(merged.contributors || []), ...(signal.contributors || [])],
    };
  }

  return merged;
}

// ============================================
// DEADLINE ENFORCEMENT
// ============================================

/**
 * Wait for EarlySignals with deadline.
 * Returns whatever arrived, plus status.
 */
export async function waitForSignals(
  signalPromise: Promise<EarlySignals>,
  deadline: number = DEADLINE_CONFIG.STANDARD_MS
): Promise<{ signals: EarlySignals; status: EarlySignalsStatus }> {
  const startTime = Date.now();
  const effectiveDeadline = Math.min(deadline, DEADLINE_CONFIG.MAX_MS);

  // Race between signal arrival and timeout
  const timeoutPromise = new Promise<'timeout'>((resolve) =>
    setTimeout(() => resolve('timeout'), effectiveDeadline)
  );

  try {
    const result = await Promise.race([signalPromise, timeoutPromise]);

    if (result === 'timeout') {
      // Timeout - use defaults
      const waitTime = Date.now() - startTime;
      return {
        signals: { ...CONSERVATIVE_DEFAULTS, generated_at: Date.now() },
        status: {
          arrived_before_deadline: false,
          wait_time_ms: waitTime,
          signals_received: {
            delegation_pred: false,
            risk_flags: false,
            policy_adjustments: false,
            candidate_suggestions: false,
            memory: false,
            metacognitive: false,
            temporal: false,
            vetoes: false,
          },
          defaults_used: Object.keys(CONSERVATIVE_DEFAULTS),
          timed_out: true,
          deadline_used: effectiveDeadline,
        },
      };
    }

    // Signals arrived
    const waitTime = Date.now() - startTime;
    const merged = mergeWithDefaults(result as EarlySignals);

    // Determine which signals were actually received
    const signals = result as EarlySignals;
    const signalsReceived = {
      delegation_pred: signals.delegation_pred !== undefined,
      risk_flags: signals.risk_flags !== undefined,
      policy_adjustments: signals.policy_adjustments !== undefined,
      candidate_suggestions: (signals.candidate_suggestions?.length || 0) > 0,
      memory: signals.memory !== undefined,
      metacognitive: signals.metacognitive !== undefined,
      temporal: signals.temporal !== undefined,
      vetoes: (signals.vetoes?.length || 0) > 0,
    };

    // Determine which defaults were used
    const defaultsUsed: string[] = [];
    if (!signalsReceived.delegation_pred) defaultsUsed.push('delegation_pred');
    if (!signalsReceived.risk_flags) defaultsUsed.push('risk_flags');
    if (!signalsReceived.policy_adjustments) defaultsUsed.push('policy_adjustments');
    if (!signalsReceived.metacognitive) defaultsUsed.push('metacognitive');
    if (!signalsReceived.temporal) defaultsUsed.push('temporal');

    return {
      signals: merged,
      status: {
        arrived_before_deadline: true,
        wait_time_ms: waitTime,
        signals_received: signalsReceived,
        defaults_used: defaultsUsed,
        timed_out: false,
        deadline_used: effectiveDeadline,
      },
    };
  } catch (error) {
    // Error in signal generation - use defaults
    const waitTime = Date.now() - startTime;
    return {
      signals: { ...CONSERVATIVE_DEFAULTS, generated_at: Date.now() },
      status: {
        arrived_before_deadline: false,
        wait_time_ms: waitTime,
        signals_received: {
          delegation_pred: false,
          risk_flags: false,
          policy_adjustments: false,
          candidate_suggestions: false,
          memory: false,
          metacognitive: false,
          temporal: false,
          vetoes: false,
        },
        defaults_used: [...Object.keys(CONSERVATIVE_DEFAULTS), 'error_recovery'],
        timed_out: true,
        deadline_used: effectiveDeadline,
      },
    };
  }
}

// ============================================
// APPLY SIGNALS TO PLAN
// ============================================

/**
 * Apply EarlySignals to a ResponsePlan.
 * Modifies constraints based on signals.
 */
export function applySignalsToPlan(
  plan: ResponsePlan,
  signals: EarlySignals
): ResponsePlan {
  const updated = { ...plan };
  const constraints = { ...plan.constraints };
  const metadata = { ...plan.metadata };

  // Apply policy adjustments
  if (signals.policy_adjustments) {
    const adj = signals.policy_adjustments;

    if (adj.max_length !== undefined) {
      constraints.max_length = Math.min(constraints.max_length, adj.max_length);
    }

    if (adj.warmth_delta !== undefined) {
      // Map warmth levels to numbers, apply delta, map back
      const warmthLevels: Array<typeof constraints.warmth> = ['cold', 'neutral', 'warm', 'very_warm'];
      const currentIndex = warmthLevels.indexOf(constraints.warmth);
      const newIndex = Math.max(0, Math.min(3, currentIndex + Math.round(adj.warmth_delta * 2)));
      constraints.warmth = warmthLevels[newIndex];
    }

    if (adj.brevity_delta !== undefined && adj.brevity_delta < 0) {
      // Make more brief
      const brevityLevels: Array<typeof constraints.brevity> = ['minimal', 'brief', 'moderate', 'full'];
      const currentIndex = brevityLevels.indexOf(constraints.brevity);
      const newIndex = Math.max(0, currentIndex + Math.round(adj.brevity_delta));
      constraints.brevity = brevityLevels[newIndex];
    }

    if (adj.force_pronouns) {
      constraints.pronouns = adj.force_pronouns;
    }

    if (adj.disable_tools) {
      constraints.tools_allowed = false;
    }
  }

  // Apply risk flags
  if (signals.risk_flags) {
    metadata.risk = {
      ...metadata.risk,
      ...signals.risk_flags,
    };
  }

  // Apply delegation prediction
  if (signals.delegation_pred) {
    metadata.ads = signals.delegation_pred.ads;
    metadata.motive = signals.delegation_pred.motive;

    // High ADS = require user effort
    if (signals.delegation_pred.ads.final > 0.6) {
      constraints.must_require_user_effort = true;
    }
  }

  // Apply memory prior adjustments
  if (signals.memory?.user_traits) {
    const traits = signals.memory.user_traits;
    if (traits.preferred_warmth) {
      constraints.warmth = traits.preferred_warmth === 'warm' ? 'warm' :
                          traits.preferred_warmth === 'cold' ? 'cold' : 'neutral';
    }
  }

  // Apply vetoes
  if (signals.vetoes && signals.vetoes.length > 0) {
    for (const veto of signals.vetoes) {
      if (veto.severity >= 0.8 && veto.target === 'act') {
        // Remove vetoed act
        updated.acts = updated.acts.filter(a => a.type !== veto.item);
      }
    }
  }

  updated.constraints = constraints;
  updated.metadata = metadata;

  return updated;
}

// Types and functions are exported inline above
