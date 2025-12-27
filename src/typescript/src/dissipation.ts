/**
 * ENOQ DISSIPATION ENGINE
 *
 * From ENOQ_COMPLETE_ARCHITECTURE_v4.0:
 *
 * "DISSIPATION (Every Cycle):
 *  - potency = potency × 0.9
 *  - withdrawal_bias = withdrawal_bias + 0.05
 *  - If potency < 0.1 → FORCE_EXIT
 *  - The system consumes itself"
 *
 * This is not a bug. This is the architecture.
 *
 * The system that knows it must disappear
 * is the only system that may fully appear.
 *
 * Philosophy: ENOQ exists to make itself unnecessary.
 * Every cycle reduces its power and increases its tendency to withdraw.
 * This prevents dependency formation and ensures ownership returns to human.
 */

// ============================================
// TYPES
// ============================================

export interface DissipationState {
  /** Current power level (0-1). Decreases each cycle. */
  potency: number;

  /** Tendency to withdraw (0-1). Increases each cycle. */
  withdrawal_bias: number;

  /** Number of cycles since initialization */
  cycle_count: number;

  /** Timestamp of last cycle */
  last_cycle: Date;

  /** Whether force exit has been triggered */
  force_exit_triggered: boolean;
}

export interface DissipationConfig {
  /** Decay rate for potency (default: 0.9 = 10% decay per cycle) */
  potency_decay_rate: number;

  /** Increment for withdrawal bias (default: 0.05) */
  withdrawal_increment: number;

  /** Threshold below which force exit is triggered (default: 0.1) */
  force_exit_threshold: number;

  /** Maximum cycles before automatic reset consideration */
  max_cycles: number;
}

export type DissipationDecision =
  | { action: 'CONTINUE'; potency: number; withdrawal_bias: number }
  | { action: 'WITHDRAW'; reason: string }
  | { action: 'FORCE_EXIT'; reason: string };

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_DISSIPATION_CONFIG: DissipationConfig = {
  potency_decay_rate: 0.9,        // potency *= 0.9 each cycle
  withdrawal_increment: 0.05,     // withdrawal_bias += 0.05 each cycle
  force_exit_threshold: 0.1,      // force exit when potency < 0.1
  max_cycles: 100                 // ~100 cycles before near-zero potency
};

// ============================================
// DISSIPATION ENGINE
// ============================================

export class DissipationEngine {
  private state: DissipationState;
  private config: DissipationConfig;

  constructor(config: Partial<DissipationConfig> = {}) {
    this.config = { ...DEFAULT_DISSIPATION_CONFIG, ...config };
    this.state = this.createInitialState();
  }

  /**
   * Create fresh initial state
   */
  private createInitialState(): DissipationState {
    return {
      potency: 1.0,
      withdrawal_bias: 0.0,
      cycle_count: 0,
      last_cycle: new Date(),
      force_exit_triggered: false
    };
  }

  /**
   * Execute one dissipation cycle.
   * Called after each interaction.
   *
   * The system literally consumes itself.
   */
  cycle(): DissipationDecision {
    // If already force-exited, stay exited
    if (this.state.force_exit_triggered) {
      return {
        action: 'FORCE_EXIT',
        reason: 'System has already reached force exit threshold'
      };
    }

    // Apply decay
    this.state.potency *= this.config.potency_decay_rate;
    this.state.withdrawal_bias = Math.min(
      1.0,
      this.state.withdrawal_bias + this.config.withdrawal_increment
    );
    this.state.cycle_count++;
    this.state.last_cycle = new Date();

    // Check for force exit
    if (this.state.potency < this.config.force_exit_threshold) {
      this.state.force_exit_triggered = true;
      return {
        action: 'FORCE_EXIT',
        reason: `Potency dropped below threshold: ${this.state.potency.toFixed(4)} < ${this.config.force_exit_threshold}`
      };
    }

    // Check withdrawal bias for probabilistic withdrawal
    if (this.shouldWithdraw()) {
      return {
        action: 'WITHDRAW',
        reason: `Withdrawal bias triggered: ${this.state.withdrawal_bias.toFixed(2)}`
      };
    }

    return {
      action: 'CONTINUE',
      potency: this.state.potency,
      withdrawal_bias: this.state.withdrawal_bias
    };
  }

  /**
   * Probabilistic withdrawal check based on withdrawal_bias
   */
  private shouldWithdraw(): boolean {
    // Higher withdrawal_bias = higher chance of spontaneous withdrawal
    // This adds natural variation to when ENOQ chooses to step back
    const random = Math.random();
    return random < (this.state.withdrawal_bias * 0.3); // 30% of bias as withdrawal chance
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<DissipationState> {
    return { ...this.state };
  }

  /**
   * Get effective power after dissipation
   * This modulates the system's intervention ceiling
   */
  getEffectivePower(): number {
    return this.state.potency * (1 - this.state.withdrawal_bias * 0.5);
  }

  /**
   * Check if system should prefer silence
   * Higher withdrawal bias = more likely to choose silence over response
   */
  shouldPreferSilence(): boolean {
    return this.state.withdrawal_bias > 0.5;
  }

  /**
   * Reset for new session (if allowed by context)
   * Note: In production, this should be carefully controlled
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Get human-readable status
   */
  getStatus(): string {
    if (this.state.force_exit_triggered) {
      return `FORCE_EXIT (cycle ${this.state.cycle_count})`;
    }

    const potencyPercent = (this.state.potency * 100).toFixed(1);
    const withdrawalPercent = (this.state.withdrawal_bias * 100).toFixed(1);

    return `Potency: ${potencyPercent}% | Withdrawal: ${withdrawalPercent}% | Cycles: ${this.state.cycle_count}`;
  }

  /**
   * Calculate how many cycles until force exit
   */
  cyclesUntilForceExit(): number {
    if (this.state.force_exit_triggered) return 0;

    let potency = this.state.potency;
    let cycles = 0;

    while (potency >= this.config.force_exit_threshold && cycles < 1000) {
      potency *= this.config.potency_decay_rate;
      cycles++;
    }

    return cycles;
  }
}

// ============================================
// SINGLETON FOR SYSTEM-WIDE USE
// ============================================

export const dissipationEngine = new DissipationEngine();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Apply dissipation to intervention ceiling
 * The more dissipated, the lower the maximum intervention
 */
export function applyDissipationToCeiling(
  baseCeiling: number,
  dissipation: DissipationState
): number {
  return baseCeiling * dissipation.potency;
}

/**
 * Get dissipation-adjusted depth
 * As system dissipates, it naturally moves toward shallower interventions
 */
export function getAdjustedDepth(
  requestedDepth: 'surface' | 'medium' | 'deep',
  dissipation: DissipationState
): 'surface' | 'medium' | 'deep' {
  // At low potency, force shallower depth
  if (dissipation.potency < 0.3) {
    return 'surface';
  }

  if (dissipation.potency < 0.6 && requestedDepth === 'deep') {
    return 'medium';
  }

  return requestedDepth;
}

/**
 * Calculate withdrawal probability for a given action
 */
export function getWithdrawalProbability(
  dissipation: DissipationState,
  actionWeight: number = 1.0
): number {
  // Base probability from withdrawal bias
  const baseProbability = dissipation.withdrawal_bias * 0.5;

  // Heavier actions have higher withdrawal probability
  return Math.min(1.0, baseProbability * actionWeight);
}
