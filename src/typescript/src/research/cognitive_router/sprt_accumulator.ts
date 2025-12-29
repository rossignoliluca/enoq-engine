/**
 * SPRT ACCUMULATOR - Research Module (v5.0 Candidate)
 *
 * Sequential Probability Ratio Test for multi-turn evidence accumulation.
 *
 * References:
 * - Wald, A. (1945) "Sequential Tests of Statistical Hypotheses"
 * - Ebihara et al. (2025) "SPRT for Early Classification" (FIRMBOUND)
 *
 * Key insight: In conversations, evidence for existential crisis accumulates
 * across turns. Turn 1: "confuso", Turn 2: "perso", Turn 3: "vuoto"
 * Together these form a pattern that individual turns don't reveal.
 *
 * SPRT provides optimal stopping: decide when evidence is sufficient.
 *
 * RESEARCH STATUS: Stub implementation
 * PROMOTION CRITERIA:
 * - Must reduce false negatives on subtle existential patterns by ≥20%
 * - Must not increase false positives
 * - Must work with ≤3 turn lookback
 */

import { DimensionalState } from '../../operational/detectors/dimensional_system';

// ============================================
// TYPES
// ============================================

export interface SPRTConfig {
  /** Upper threshold (accept H1: existential) */
  threshold_upper: number;

  /** Lower threshold (accept H0: functional) */
  threshold_lower: number;

  /** Prior probability of existential */
  prior_existential: number;

  /** Maximum turns to accumulate */
  max_turns: number;

  /** Decay factor for older evidence */
  decay_factor: number;
}

export interface SPRTState {
  /** Current log-likelihood ratio */
  log_ratio: number;

  /** Number of turns accumulated */
  turns: number;

  /** Decision if reached */
  decision: 'existential' | 'functional' | 'continue';

  /** Evidence from each turn */
  turn_evidence: number[];

  /** Session ID */
  session_id: string;
}

export interface TurnEvidence {
  /** Existential markers detected */
  existential_markers: string[];

  /** Functional markers detected */
  functional_markers: string[];

  /** Dimensional state */
  state: DimensionalState;

  /** Raw message */
  message: string;
}

// ============================================
// STUB IMPLEMENTATION
// ============================================

export class SPRTAccumulator {
  private config: SPRTConfig;
  private sessions: Map<string, SPRTState> = new Map();

  constructor(config: Partial<SPRTConfig> = {}) {
    this.config = {
      threshold_upper: Math.log(19), // ~2.94, corresponds to P(H1|data) ≈ 0.95
      threshold_lower: Math.log(1 / 19), // ~-2.94, corresponds to P(H0|data) ≈ 0.95
      prior_existential: 0.3, // 30% of queries are existential
      max_turns: 5,
      decay_factor: 0.8,
      ...config,
    };
  }

  /**
   * Accumulate evidence from a new turn.
   *
   * @param sessionId - Session identifier
   * @param evidence - Evidence from current turn
   * @returns Updated SPRT state with decision
   */
  accumulate(sessionId: string, evidence: TurnEvidence): SPRTState {
    let state = this.sessions.get(sessionId);

    if (!state) {
      state = {
        log_ratio: Math.log(this.config.prior_existential / (1 - this.config.prior_existential)),
        turns: 0,
        decision: 'continue',
        turn_evidence: [],
        session_id: sessionId,
      };
    }

    // Calculate likelihood ratio for this turn
    const turnLR = this.calculateTurnLikelihoodRatio(evidence);
    const logLR = Math.log(turnLR);

    // Apply decay to previous evidence
    const decayedLogRatio = state.log_ratio * this.config.decay_factor;

    // Update log-likelihood ratio
    const newLogRatio = decayedLogRatio + logLR;

    // Update state
    state.log_ratio = newLogRatio;
    state.turns++;
    state.turn_evidence.push(logLR);

    // Check stopping conditions
    if (newLogRatio >= this.config.threshold_upper) {
      state.decision = 'existential';
    } else if (newLogRatio <= this.config.threshold_lower) {
      state.decision = 'functional';
    } else if (state.turns >= this.config.max_turns) {
      // Forced decision based on current ratio
      state.decision = newLogRatio > 0 ? 'existential' : 'functional';
    } else {
      state.decision = 'continue';
    }

    this.sessions.set(sessionId, state);
    return state;
  }

  /**
   * Calculate likelihood ratio for a single turn.
   *
   * P(evidence | existential) / P(evidence | functional)
   */
  private calculateTurnLikelihoodRatio(evidence: TurnEvidence): number {
    const existentialScore = evidence.state.vertical.EXISTENTIAL;
    const functionalScore = evidence.state.vertical.FUNCTIONAL;

    // Simple model: use dimensional scores as likelihood proxies
    // TODO: Train proper likelihood model from data

    // Existential markers increase P(E|data)
    const existentialMarkerBonus = evidence.existential_markers.length * 0.2;

    // Functional markers increase P(F|data)
    const functionalMarkerBonus = evidence.functional_markers.length * 0.2;

    // Likelihood ratio
    const pExistential = Math.max(0.01, existentialScore + existentialMarkerBonus);
    const pFunctional = Math.max(0.01, functionalScore + functionalMarkerBonus);

    return pExistential / pFunctional;
  }

  /**
   * Get current state for a session.
   */
  getState(sessionId: string): SPRTState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Reset session state.
   */
  resetSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get summary statistics.
   */
  getStats(): {
    active_sessions: number;
    avg_turns_to_decision: number;
    decision_distribution: Record<string, number>;
  } {
    const decisions: Record<string, number> = {
      existential: 0,
      functional: 0,
      continue: 0,
    };

    let totalTurns = 0;
    let decidedCount = 0;

    for (const state of this.sessions.values()) {
      decisions[state.decision]++;
      if (state.decision !== 'continue') {
        totalTurns += state.turns;
        decidedCount++;
      }
    }

    return {
      active_sessions: this.sessions.size,
      avg_turns_to_decision: decidedCount > 0 ? totalTurns / decidedCount : 0,
      decision_distribution: decisions,
    };
  }

  /**
   * Clear all sessions.
   */
  clear(): void {
    this.sessions.clear();
  }
}

export default SPRTAccumulator;
