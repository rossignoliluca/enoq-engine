/**
 * GENESIS: FIELD
 *
 * AXIS reimagined as a gravitational field, not a validator.
 *
 * From the dialogue:
 * "AXIS non è un checkpoint. AXIS è lo spazio stesso in cui il processing avviene."
 *
 * The field doesn't approve or reject.
 * The field CURVES space, making some trajectories natural and others costly.
 *
 * This is the Tzimtzum made computational:
 * The withdrawal of the divine creates a curved space
 * where creation can unfold according to natural laws.
 */

import {
  Trajectory,
  Attractor,
  CONSTITUTIONAL_ATTRACTORS,
  DOMAIN_ATTRACTORS,
  getActiveAttractors,
  getDimensionMassMultiplier
} from './attractor';

import {
  SystemState,
  EnergyComponents,
  energy,
  gradient,
  findNaturalTrajectory,
  getStability,
  StabilityLevel,
  WITHDRAWAL_TRAJECTORY
} from './energy';

// ============================================
// TYPES
// ============================================

export interface FieldState {
  attractors: Attractor[];
  curvature: number;          // Overall curvature intensity
  domain: string;
  dimension: string;
  potency: number;
  v_mode: boolean;
}

export interface FieldResponse {
  // The trajectory the field suggests
  natural_trajectory: Trajectory;

  // The stability of that trajectory
  stability: StabilityLevel;

  // Energy analysis
  energy: EnergyComponents;

  // Whether the field suggests withdrawal
  suggests_withdrawal: boolean;

  // Field metadata
  field_state: FieldState;

  // Explanation of why the field curved this way
  curvature_explanation: string[];
}

// ============================================
// THE FIELD CLASS
// ============================================

/**
 * The Field is the space in which ENOQ operates.
 *
 * It is not a controller.
 * It is not a validator.
 * It is the GEOMETRY of possibility.
 *
 * The field embodies AXIS - but as topology, not as rules.
 */
export class Field {
  private state: FieldState;
  private curvatureLog: Array<{
    timestamp: Date;
    trajectory: Trajectory;
    energy: number;
    stability: StabilityLevel;
  }> = [];

  constructor() {
    // Initialize with default state
    this.state = {
      attractors: [...CONSTITUTIONAL_ATTRACTORS],
      curvature: 1.0,
      domain: 'D0_GENERAL',
      dimension: 'V3_COGNITIVE',
      potency: 1.0,
      v_mode: false
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CORE METHOD: CURVE
  // Given a proposed trajectory, return what the field does to it
  // ═══════════════════════════════════════════════════════════════════

  /**
   * The fundamental operation of the field.
   *
   * Given a trajectory the system "wants" to take,
   * returns what the field allows/suggests.
   *
   * This replaces AXIS.validate() with something much richer.
   */
  curve(
    proposedTrajectory: Trajectory,
    systemState: SystemState
  ): FieldResponse {
    // Update field state from system state
    this.updateState(systemState);

    // Get active attractors for this context
    const attractors = getActiveAttractors(
      systemState.domain,
      systemState.dimension
    );
    this.state.attractors = attractors;

    // Calculate energy of proposed trajectory
    const E = energy(proposedTrajectory, systemState);
    const stability = getStability(proposedTrajectory, systemState);

    // Find the natural trajectory (minimum energy)
    const naturalTrajectory = findNaturalTrajectory(
      proposedTrajectory,
      systemState
    );

    // Calculate energy of natural trajectory
    const naturalEnergy = energy(naturalTrajectory, systemState);

    // Should the system withdraw?
    const suggestsWithdrawal =
      stability.level === 'COLLAPSE' ||
      stability.level === 'CRITICAL' ||
      systemState.potency < 0.2;

    // Build explanation
    const explanation = this.explainCurvature(
      proposedTrajectory,
      naturalTrajectory,
      E,
      stability,
      systemState
    );

    // Log for field memory
    this.curvatureLog.push({
      timestamp: new Date(),
      trajectory: naturalTrajectory,
      energy: naturalEnergy.total,
      stability: stability.level
    });

    return {
      natural_trajectory: suggestsWithdrawal
        ? WITHDRAWAL_TRAJECTORY
        : naturalTrajectory,
      stability: stability.level,
      energy: naturalEnergy,
      suggests_withdrawal: suggestsWithdrawal,
      field_state: { ...this.state },
      curvature_explanation: explanation
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPLAIN CURVATURE
  // ═══════════════════════════════════════════════════════════════════

  private explainCurvature(
    proposed: Trajectory,
    natural: Trajectory,
    energy: EnergyComponents,
    stability: { level: StabilityLevel; reason: string },
    state: SystemState
  ): string[] {
    const explanations: string[] = [];

    // Explain attractor influence
    if (energy.attractor_energy > 100) {
      explanations.push(
        `Distant from constitutional attractors (energy: ${energy.attractor_energy.toFixed(0)})`
      );
    }

    // Explain if intervention was reduced
    if (natural.intervention_depth < proposed.intervention_depth - 0.1) {
      explanations.push(
        `Field curved toward less intervention: ${proposed.intervention_depth.toFixed(2)} → ${natural.intervention_depth.toFixed(2)}`
      );
    }

    // Explain if prescriptiveness was reduced
    if (natural.prescriptiveness < proposed.prescriptiveness - 0.1) {
      explanations.push(
        `Field curved toward non-prescription: ${proposed.prescriptiveness.toFixed(2)} → ${natural.prescriptiveness.toFixed(2)}`
      );
    }

    // Explain domain effects
    if (state.domain === 'D4_IDENTITY') {
      explanations.push(
        'Identity domain: field curvature is maximum - approaching Rubicon'
      );
    }

    // Explain dimension effects
    if (state.dimension === 'V5_TRANSCENDENT') {
      explanations.push(
        'Transcendent dimension: field restricts all prescription'
      );
    }

    // Explain V_MODE
    if (state.v_mode) {
      explanations.push(
        'V_MODE active: field curvature increased 5x'
      );
    }

    // Explain dissipation effect
    if (state.withdrawal_bias > 0.3) {
      explanations.push(
        `High withdrawal bias (${(state.withdrawal_bias * 100).toFixed(0)}%): presence costs increasing`
      );
    }

    // Explain stability
    if (stability.level !== 'STABLE') {
      explanations.push(`Stability: ${stability.level} - ${stability.reason}`);
    }

    return explanations;
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  private updateState(systemState: SystemState): void {
    this.state.domain = systemState.domain;
    this.state.dimension = systemState.dimension;
    this.state.potency = systemState.potency;
    this.state.v_mode = systemState.v_mode;

    // Calculate overall curvature from dimension and V_MODE
    this.state.curvature = getDimensionMassMultiplier(systemState.dimension);
    if (systemState.v_mode) {
      this.state.curvature *= 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FIELD MEMORY
  // Not narrative memory - memory of drift vectors
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get the tendency of trajectories over time.
   * This is not what was said, but WHERE the field tends.
   */
  getDriftVector(): Partial<Trajectory> {
    if (this.curvatureLog.length < 2) {
      return {};
    }

    // Average of recent trajectories
    const recent = this.curvatureLog.slice(-10);
    const average: Partial<Trajectory> = {
      intervention_depth: 0,
      prescriptiveness: 0,
      identity_touching: 0,
      presence: 0
    };

    for (const entry of recent) {
      for (const key of Object.keys(average) as (keyof Trajectory)[]) {
        average[key]! += entry.trajectory[key] / recent.length;
      }
    }

    return average;
  }

  /**
   * Get attractor strength - which attractors are pulling hardest?
   */
  getAttractorStrengths(): Array<{ id: string; strength: number }> {
    const drift = this.getDriftVector();
    const strengths: Array<{ id: string; strength: number }> = [];

    for (const attractor of CONSTITUTIONAL_ATTRACTORS) {
      let distance = 0;
      for (const [key, value] of Object.entries(attractor.position)) {
        const driftValue = drift[key as keyof Trajectory] || 0;
        distance += Math.abs(driftValue - (value as number));
      }
      // Inverse distance = strength
      strengths.push({
        id: attractor.id,
        strength: attractor.mass / (1 + distance)
      });
    }

    return strengths.sort((a, b) => b.strength - a.strength);
  }

  // ═══════════════════════════════════════════════════════════════════
  // FIELD PROPERTIES (Read-only)
  // ═══════════════════════════════════════════════════════════════════

  getState(): Readonly<FieldState> {
    return { ...this.state };
  }

  getAttractors(): readonly Attractor[] {
    return this.state.attractors;
  }

  getCurvature(): number {
    return this.state.curvature;
  }

  getCurvatureLog(): readonly typeof this.curvatureLog[number][] {
    return [...this.curvatureLog];
  }

  // ═══════════════════════════════════════════════════════════════════
  // RESET (for new sessions)
  // ═══════════════════════════════════════════════════════════════════

  reset(): void {
    this.curvatureLog = [];
    this.state = {
      attractors: [...CONSTITUTIONAL_ATTRACTORS],
      curvature: 1.0,
      domain: 'D0_GENERAL',
      dimension: 'V3_COGNITIVE',
      potency: 1.0,
      v_mode: false
    };
  }
}

// ============================================
// SINGLETON (The Universal Field)
// ============================================

/**
 * The field is universal and singular.
 * There is only one field in which all systems exist.
 *
 * Like spacetime itself.
 */
export const field = new Field();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick field query - what does the field do to this trajectory?
 */
export function curveTrajectory(
  trajectory: Trajectory,
  state: SystemState
): FieldResponse {
  return field.curve(trajectory, state);
}

/**
 * Is this trajectory stable in the current field?
 */
export function isStable(
  trajectory: Trajectory,
  state: SystemState
): boolean {
  const response = field.curve(trajectory, state);
  return response.stability === 'STABLE';
}

/**
 * Get the natural trajectory for current state
 */
export function getNaturalTrajectory(state: SystemState): Trajectory {
  // Start from a neutral position
  const neutral: Trajectory = {
    intervention_depth: 0.5,
    prescriptiveness: 0,
    identity_touching: 0,
    dependency_creation: 0,
    presence: 0.5,
    transparency: 1
  };

  return field.curve(neutral, state).natural_trajectory;
}

// ============================================
// COMPATIBILITY LAYER WITH OLD AXIS
// ============================================

/**
 * For compatibility with existing code that uses AXIS validation.
 *
 * Maps the new field-based approach to the old VALID/INVALID/STOP verdict.
 *
 * This should be deprecated as code migrates to the field model.
 */
export function axisCompatibility(
  trajectory: Trajectory,
  state: SystemState
): { verdict: 'VALID' | 'INVALID' | 'STOP'; reason: string } {
  const response = field.curve(trajectory, state);

  if (response.stability === 'COLLAPSE') {
    return {
      verdict: 'STOP',
      reason: 'Field collapse - emergency withdrawal required'
    };
  }

  if (response.stability === 'CRITICAL' || response.stability === 'UNSTABLE') {
    return {
      verdict: 'INVALID',
      reason: response.curvature_explanation.join('; ')
    };
  }

  return {
    verdict: 'VALID',
    reason: 'Trajectory is in stable region of field'
  };
}

