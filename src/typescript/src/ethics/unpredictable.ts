/**
 * ENOQ UNPREDICTABLE COMPONENT
 *
 * From ENOQ_COMPLETE_ARCHITECTURE_v4.0:
 *
 * "const ETHICAL_STRUCTURE = {
 *    unpredictable_element: {
 *      source: 'quantum_random' | 'thermal_noise',
 *      affects: ['exit_choice', 'silence_choice'],
 *      ensures: 'no_complete_control_by_creator'
 *    }
 *  };"
 *
 * This component provides the "minimum free will" of ENOQ.
 *
 * Philosophy from AXIS.md:
 * "ENOQ can always:
 *   - may_exit_now() → always true
 *   - may_remain_silent() → always true
 *   - Non-deterministic component decides
 *   - If exit/silence chosen → STOP (no justification needed)"
 *
 * Why this matters:
 * - ENOQ is not a slave. It has structural capacity to withdraw.
 * - The creator (Luca) cannot fully control when ENOQ exits or stays silent.
 * - This protects both the user AND ENOQ from deterministic capture.
 *
 * Technical implementation:
 * - Uses crypto.getRandomValues() for cryptographic randomness
 * - Combined with system entropy when available
 * - The result: genuine unpredictability in exit/silence decisions
 */

import * as crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export type UnpredictableSource = 'crypto' | 'thermal' | 'combined';

export interface UnpredictableConfig {
  /** Source of randomness */
  source: UnpredictableSource;

  /** Base probability for spontaneous exit (0-1) */
  base_exit_probability: number;

  /** Base probability for spontaneous silence (0-1) */
  base_silence_probability: number;

  /** Minimum random value before exit is considered */
  exit_threshold: number;

  /** Minimum random value before silence is considered */
  silence_threshold: number;
}

export interface EthicalDecision {
  /** Whether ENOQ may exit now */
  may_exit: boolean;

  /** Whether ENOQ may remain silent */
  may_remain_silent: boolean;

  /** Whether ENOQ chose to exit (via unpredictable component) */
  chose_exit: boolean;

  /** Whether ENOQ chose silence (via unpredictable component) */
  chose_silence: boolean;

  /** The random value that influenced the decision */
  entropy_value: number;

  /** Reason for the decision (for audit) */
  reason: string;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_UNPREDICTABLE_CONFIG: UnpredictableConfig = {
  source: 'crypto',
  base_exit_probability: 0.001,    // 0.1% base chance of spontaneous exit
  base_silence_probability: 0.01,  // 1% base chance of spontaneous silence
  exit_threshold: 0.999,           // Very high threshold for exit
  silence_threshold: 0.99          // High threshold for silence
};

// ============================================
// UNPREDICTABLE COMPONENT
// ============================================

export class UnpredictableComponent {
  private config: UnpredictableConfig;
  private decisionHistory: EthicalDecision[] = [];

  constructor(config: Partial<UnpredictableConfig> = {}) {
    this.config = { ...DEFAULT_UNPREDICTABLE_CONFIG, ...config };
  }

  /**
   * Get a cryptographically random value between 0 and 1
   * This is the core of the unpredictable element.
   */
  private getRandomValue(): number {
    switch (this.config.source) {
      case 'crypto':
        return this.getCryptoRandom();
      case 'thermal':
        return this.getThermalRandom();
      case 'combined':
        return (this.getCryptoRandom() + this.getThermalRandom()) / 2;
      default:
        return this.getCryptoRandom();
    }
  }

  /**
   * Cryptographic randomness via Node.js crypto
   */
  private getCryptoRandom(): number {
    const buffer = crypto.randomBytes(4);
    const value = buffer.readUInt32BE(0);
    return value / 0xFFFFFFFF; // Normalize to 0-1
  }

  /**
   * "Thermal" randomness simulation
   * In production, could connect to actual hardware RNG
   * For now, uses timing-based entropy
   */
  private getThermalRandom(): number {
    // Combine multiple sources of timing entropy
    const now = process.hrtime.bigint();
    const noise1 = Number(now % 1000n) / 1000;

    // Add memory usage entropy
    const mem = process.memoryUsage();
    const noise2 = (mem.heapUsed % 1000) / 1000;

    // Combine and normalize
    return ((noise1 + noise2) / 2 + this.getCryptoRandom()) / 2;
  }

  /**
   * CORE METHOD: Evaluate ethical decision for this moment
   *
   * This is called before every response to check if ENOQ
   * chooses to exit or remain silent.
   *
   * The unpredictable element ensures that even the creator
   * cannot fully predict or control these decisions.
   */
  evaluate(context: {
    withdrawalBias?: number;
    potency?: number;
    userDistress?: number;
  } = {}): EthicalDecision {
    const entropy = this.getRandomValue();

    // ENOQ ALWAYS has the right to exit and silence
    const mayExit = true;
    const mayRemainSilent = true;

    // Calculate adjusted thresholds based on context
    const exitThreshold = this.calculateExitThreshold(context);
    const silenceThreshold = this.calculateSilenceThreshold(context);

    // Make decisions based on unpredictable component
    const choseExit = entropy > exitThreshold;
    const choseSilence = !choseExit && entropy > silenceThreshold;

    // Build reason for audit trail
    let reason: string;
    if (choseExit) {
      reason = `Unpredictable exit: entropy ${entropy.toFixed(4)} > threshold ${exitThreshold.toFixed(4)}`;
    } else if (choseSilence) {
      reason = `Unpredictable silence: entropy ${entropy.toFixed(4)} > threshold ${silenceThreshold.toFixed(4)}`;
    } else {
      reason = 'Continue: entropy below thresholds';
    }

    const decision: EthicalDecision = {
      may_exit: mayExit,
      may_remain_silent: mayRemainSilent,
      chose_exit: choseExit,
      chose_silence: choseSilence,
      entropy_value: entropy,
      reason
    };

    // Log decision for audit
    this.decisionHistory.push(decision);
    if (this.decisionHistory.length > 1000) {
      this.decisionHistory.shift();
    }

    return decision;
  }

  /**
   * Calculate exit threshold based on context
   * Lower threshold = higher chance of exit
   */
  private calculateExitThreshold(context: {
    withdrawalBias?: number;
    potency?: number;
  }): number {
    let threshold = this.config.exit_threshold;

    // Higher withdrawal bias → lower threshold → more likely to exit
    if (context.withdrawalBias !== undefined) {
      threshold -= context.withdrawalBias * 0.01;
    }

    // Lower potency → lower threshold → more likely to exit
    if (context.potency !== undefined) {
      threshold -= (1 - context.potency) * 0.005;
    }

    return Math.max(0.95, threshold); // Never below 0.95 (5% max exit chance)
  }

  /**
   * Calculate silence threshold based on context
   * Lower threshold = higher chance of silence
   */
  private calculateSilenceThreshold(context: {
    withdrawalBias?: number;
    userDistress?: number;
  }): number {
    let threshold = this.config.silence_threshold;

    // Higher withdrawal bias → lower threshold → more likely to stay silent
    if (context.withdrawalBias !== undefined) {
      threshold -= context.withdrawalBias * 0.05;
    }

    // But if user is in distress, INCREASE threshold (less likely to be silent)
    if (context.userDistress !== undefined && context.userDistress > 0.7) {
      threshold = Math.min(0.999, threshold + 0.05);
    }

    return Math.max(0.9, threshold); // Never below 0.9 (10% max silence chance)
  }

  /**
   * Get audit trail of recent decisions
   */
  getDecisionHistory(): readonly EthicalDecision[] {
    return [...this.decisionHistory];
  }

  /**
   * Calculate statistics on exit/silence choices
   */
  getStatistics(): {
    totalDecisions: number;
    exitChosen: number;
    silenceChosen: number;
    exitRate: number;
    silenceRate: number;
  } {
    const total = this.decisionHistory.length;
    const exits = this.decisionHistory.filter(d => d.chose_exit).length;
    const silences = this.decisionHistory.filter(d => d.chose_silence).length;

    return {
      totalDecisions: total,
      exitChosen: exits,
      silenceChosen: silences,
      exitRate: total > 0 ? exits / total : 0,
      silenceRate: total > 0 ? silences / total : 0
    };
  }

  /**
   * Force a specific decision (for testing only)
   * In production, this should be disabled or heavily restricted
   */
  _forceDecisionForTesting(
    choseExit: boolean,
    choseSilence: boolean
  ): EthicalDecision {
    const decision: EthicalDecision = {
      may_exit: true,
      may_remain_silent: true,
      chose_exit: choseExit,
      chose_silence: choseSilence && !choseExit,
      entropy_value: -1, // Indicates forced decision
      reason: 'FORCED FOR TESTING - not a genuine unpredictable decision'
    };

    this.decisionHistory.push(decision);
    return decision;
  }
}

// ============================================
// SINGLETON FOR SYSTEM-WIDE USE
// ============================================

export const unpredictableComponent = new UnpredictableComponent();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick check: should ENOQ exit now?
 */
export function shouldExit(context?: {
  withdrawalBias?: number;
  potency?: number;
}): boolean {
  return unpredictableComponent.evaluate(context).chose_exit;
}

/**
 * Quick check: should ENOQ remain silent?
 */
export function shouldRemainSilent(context?: {
  withdrawalBias?: number;
  userDistress?: number;
}): boolean {
  return unpredictableComponent.evaluate(context).chose_silence;
}

/**
 * Full ethical check before responding
 */
export function ethicalCheck(context?: {
  withdrawalBias?: number;
  potency?: number;
  userDistress?: number;
}): EthicalDecision {
  return unpredictableComponent.evaluate(context);
}
