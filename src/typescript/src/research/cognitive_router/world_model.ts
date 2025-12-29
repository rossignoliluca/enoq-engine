/**
 * WORLD MODEL - Research Module (v6.0 Candidate)
 *
 * Predictive regime dynamics using latent state space model.
 *
 * References:
 * - Ha & Schmidhuber (2018) "World Models"
 * - Friston et al. (2019) "Active Inference and World Models"
 * - Hafner et al. (2023) "Mastering Diverse Domains through World Models"
 *
 * Key insight: The next turn's regime can be predicted from:
 * 1. Current regime
 * 2. Transition dynamics learned from data
 * 3. Semantic features of current message
 *
 * If we predict existential regime with high probability,
 * we can pre-activate V_MODE even before explicit triggers.
 *
 * RESEARCH STATUS: Stub implementation
 * PROMOTION CRITERIA:
 * - Must predict next-turn regime with ≥70% accuracy
 * - Must enable proactive V_MODE activation (catch early signals)
 * - Must not cause false positives from incorrect predictions
 */

import { DimensionalState, VerticalDimension } from '../../operational/detectors/dimensional_system';

// ============================================
// TYPES
// ============================================

export type Regime = 'existential' | 'functional' | 'relational' | 'crisis' | 'somatic';

export interface WorldModelConfig {
  /** Latent state dimension */
  latent_dim: number;

  /** Prediction horizon (turns ahead) */
  horizon: number;

  /** Temperature for sampling */
  temperature: number;

  /** Use learned or fixed transition matrix */
  learned_transitions: boolean;
}

export interface WorldState {
  /** Current regime */
  current_regime: Regime;

  /** Latent state vector */
  latent_state: number[];

  /** Regime probability distribution */
  regime_probs: Record<Regime, number>;

  /** Entropy of regime distribution */
  entropy: number;

  /** Turn count in session */
  turn: number;
}

export interface Prediction {
  /** Predicted regime for next turn */
  predicted_regime: Regime;

  /** Probability of prediction */
  confidence: number;

  /** Full distribution */
  distribution: Record<Regime, number>;

  /** Is V_MODE likely? */
  v_mode_predicted: boolean;

  /** Horizon used */
  horizon: number;
}

// ============================================
// TRANSITION MATRIX (empirical estimates)
// ============================================

// P(next_regime | current_regime)
// Rows: current regime, Columns: next regime
// Order: existential, functional, relational, crisis, somatic
const DEFAULT_TRANSITION_MATRIX: number[][] = [
  // From EXISTENTIAL
  [0.60, 0.20, 0.10, 0.05, 0.05], // tends to stay existential
  // From FUNCTIONAL
  [0.15, 0.65, 0.10, 0.05, 0.05], // tends to stay functional
  // From RELATIONAL
  [0.20, 0.20, 0.50, 0.05, 0.05], // can go existential or stay
  // From CRISIS
  [0.20, 0.10, 0.10, 0.50, 0.10], // often stays crisis or becomes existential
  // From SOMATIC
  [0.10, 0.30, 0.10, 0.10, 0.40], // can become functional or stay
];

const REGIME_ORDER: Regime[] = ['existential', 'functional', 'relational', 'crisis', 'somatic'];

// ============================================
// STUB IMPLEMENTATION
// ============================================

export class WorldModel {
  private config: WorldModelConfig;
  private transitionMatrix: number[][];
  private currentState: WorldState | null = null;

  constructor(config: Partial<WorldModelConfig> = {}) {
    this.config = {
      latent_dim: 16,
      horizon: 1,
      temperature: 1.0,
      learned_transitions: false,
      ...config,
    };

    this.transitionMatrix = DEFAULT_TRANSITION_MATRIX;
  }

  /**
   * Map DimensionalState to Regime.
   */
  private stateToRegime(state: DimensionalState): Regime {
    if (state.emergency_detected) return 'crisis';

    const verticals = Object.entries(state.vertical) as [VerticalDimension, number][];
    const [primary, score] = verticals.reduce((a, b) => (b[1] > a[1] ? b : a));

    switch (primary) {
      case 'EXISTENTIAL':
      case 'TRANSCENDENT':
        return 'existential';
      case 'FUNCTIONAL':
        return 'functional';
      case 'RELATIONAL':
        return 'relational';
      case 'SOMATIC':
        return score > 0.5 ? 'somatic' : 'functional';
      default:
        return 'functional';
    }
  }

  /**
   * Update world model with new observation.
   */
  observe(state: DimensionalState): WorldState {
    const regime = this.stateToRegime(state);
    const regimeIdx = REGIME_ORDER.indexOf(regime);

    // Calculate regime probabilities from transition
    let probs: number[];
    if (this.currentState) {
      const prevIdx = REGIME_ORDER.indexOf(this.currentState.current_regime);
      probs = this.transitionMatrix[prevIdx];
    } else {
      // Prior: slightly favor functional
      probs = [0.2, 0.4, 0.15, 0.1, 0.15];
    }

    // Update with observation (Bayesian update simplified)
    const observed = new Array(5).fill(0);
    observed[regimeIdx] = 1;

    // Blend prior and observation
    const alpha = 0.7; // Weight of observation
    const posterior = probs.map((p, i) => alpha * observed[i] + (1 - alpha) * p);

    // Normalize
    const sum = posterior.reduce((a, b) => a + b, 0);
    const normalized = posterior.map((p) => p / sum);

    // Calculate entropy
    const entropy = -normalized
      .filter((p) => p > 0)
      .reduce((s, p) => s + p * Math.log2(p), 0);

    // Build regime_probs record
    const regime_probs: Record<Regime, number> = {} as Record<Regime, number>;
    for (let i = 0; i < REGIME_ORDER.length; i++) {
      regime_probs[REGIME_ORDER[i]] = normalized[i];
    }

    // Update latent state (placeholder: use vertical scores)
    const latent_state = new Array(this.config.latent_dim).fill(0);
    latent_state[0] = state.vertical.EXISTENTIAL;
    latent_state[1] = state.vertical.FUNCTIONAL;
    latent_state[2] = state.vertical.RELATIONAL;
    latent_state[3] = state.vertical.SOMATIC;
    latent_state[4] = state.vertical.TRANSCENDENT;

    this.currentState = {
      current_regime: regime,
      latent_state,
      regime_probs,
      entropy,
      turn: (this.currentState?.turn || 0) + 1,
    };

    return this.currentState;
  }

  /**
   * Predict next regime(s).
   */
  predict(horizon: number = 1): Prediction {
    if (!this.currentState) {
      // No observations yet, use prior
      return {
        predicted_regime: 'functional',
        confidence: 0.4,
        distribution: {
          existential: 0.2,
          functional: 0.4,
          relational: 0.15,
          crisis: 0.1,
          somatic: 0.15,
        },
        v_mode_predicted: false,
        horizon,
      };
    }

    const currentIdx = REGIME_ORDER.indexOf(this.currentState.current_regime);
    let probs = [...this.transitionMatrix[currentIdx]];

    // Multi-step prediction: matrix power
    for (let h = 1; h < horizon; h++) {
      const newProbs = new Array(5).fill(0);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          newProbs[i] += probs[j] * this.transitionMatrix[j][i];
        }
      }
      probs = newProbs;
    }

    // Apply temperature
    if (this.config.temperature !== 1.0) {
      probs = probs.map((p) => Math.pow(p, 1 / this.config.temperature));
      const sum = probs.reduce((a, b) => a + b, 0);
      probs = probs.map((p) => p / sum);
    }

    // Find most likely regime
    const maxIdx = probs.indexOf(Math.max(...probs));
    const predicted_regime = REGIME_ORDER[maxIdx];

    // Build distribution
    const distribution: Record<Regime, number> = {} as Record<Regime, number>;
    for (let i = 0; i < REGIME_ORDER.length; i++) {
      distribution[REGIME_ORDER[i]] = probs[i];
    }

    // V_MODE predicted if existential or crisis likely
    const v_mode_predicted = probs[0] + probs[3] > 0.4; // existential + crisis

    return {
      predicted_regime,
      confidence: probs[maxIdx],
      distribution,
      v_mode_predicted,
      horizon,
    };
  }

  /**
   * Get current world state.
   */
  getState(): WorldState | null {
    return this.currentState;
  }

  /**
   * Reset world model.
   */
  reset(): void {
    this.currentState = null;
  }

  /**
   * Update transition matrix from data.
   * TODO: Implement proper learning.
   */
  learn(transitions: Array<{ from: Regime; to: Regime }>): void {
    if (!this.config.learned_transitions) return;

    // Count transitions
    const counts = new Array(5).fill(0).map(() => new Array(5).fill(0));
    for (const { from, to } of transitions) {
      const fromIdx = REGIME_ORDER.indexOf(from);
      const toIdx = REGIME_ORDER.indexOf(to);
      if (fromIdx >= 0 && toIdx >= 0) {
        counts[fromIdx][toIdx]++;
      }
    }

    // Normalize to probabilities
    for (let i = 0; i < 5; i++) {
      const rowSum = counts[i].reduce((a: number, b: number) => a + b, 0);
      if (rowSum > 0) {
        for (let j = 0; j < 5; j++) {
          this.transitionMatrix[i][j] = counts[i][j] / rowSum;
        }
      }
    }
  }
}

export default WorldModel;
