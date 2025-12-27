/**
 * GENESIS: ENERGY
 *
 * The energy function defines the landscape of possible responses.
 *
 * From the dialogue:
 * "La gravità non è una forza che tira. È curvatura dello spaziotempo.
 *  Gli oggetti seguono la traiettoria più naturale in uno spazio curvo."
 *
 * Energy is not a rule. It is the cost of being somewhere in the space.
 * Low energy = stable, natural, allowed.
 * High energy = unstable, costly, tends to collapse.
 *
 * The system doesn't "obey" energy constraints.
 * The system naturally FALLS toward low-energy states.
 */

import {
  Trajectory,
  Attractor,
  getActiveAttractors,
  getDistanceToAttractor
} from './attractor';

// ============================================
// TYPES
// ============================================

export interface SystemState {
  domain: string;
  dimension: string;
  potency: number;           // From dissipation: 0-1, how much power remains
  withdrawal_bias: number;   // From dissipation: 0-1, tendency to withdraw
  v_mode: boolean;           // Vulnerability mode active
  cycle_count: number;       // How many interactions
}

export interface EnergyComponents {
  attractor_energy: number;    // Cost from distance to attractors
  intervention_energy: number; // Cost from intervention depth
  prescription_energy: number; // Cost from prescriptiveness
  presence_energy: number;     // Cost from being present (increases with dissipation)
  domain_energy: number;       // Domain-specific costs
  dimension_energy: number;    // Dimension-specific costs
  total: number;
}

// ============================================
// ENERGY CONSTANTS
// ============================================

const ENERGY_WEIGHTS = Object.freeze({
  // Base costs per dimension of trajectory
  INTERVENTION_BASE: 20,
  INTERVENTION_EXPONENT: 2,     // Exponential cost

  PRESCRIPTION_BASE: 100,
  PRESCRIPTION_EXPONENT: 3,     // Very steep exponential

  IDENTITY_BASE: 1000,
  IDENTITY_EXPONENT: 4,         // Extreme cost

  DEPENDENCY_BASE: 50,
  DEPENDENCY_EXPONENT: 2,

  PRESENCE_BASE: 10,
  DISSIPATION_MULTIPLIER: 50,   // Presence costs more as dissipation increases

  // V_MODE multiplier
  V_MODE_MULTIPLIER: 5,

  // Energy threshold for stability
  STABILITY_THRESHOLD: 500,
  CRITICAL_THRESHOLD: 2000
});

// ============================================
// CORE ENERGY FUNCTION
// ============================================

/**
 * Calculate the total energy of a trajectory in the current state.
 *
 * This is THE fundamental function of GENESIS.
 * Everything else derives from this.
 *
 * Lower energy = more natural, more allowed
 * Higher energy = less natural, tends to collapse
 */
export function energy(
  trajectory: Trajectory,
  state: SystemState
): EnergyComponents {
  const attractors = getActiveAttractors(state.domain, state.dimension);

  // ══════════════════════════════════════════════════════════════
  // COMPONENT 1: ATTRACTOR ENERGY
  // Cost from distance to attractors
  // ══════════════════════════════════════════════════════════════
  let attractor_energy = 0;
  for (const attractor of attractors) {
    const distance = getDistanceToAttractor(trajectory, attractor);
    // Energy increases with distance, scaled by mass
    attractor_energy += distance * distance * attractor.mass;
  }

  // ══════════════════════════════════════════════════════════════
  // COMPONENT 2: INTERVENTION ENERGY
  // It costs energy to intervene
  // ══════════════════════════════════════════════════════════════
  const intervention_energy =
    ENERGY_WEIGHTS.INTERVENTION_BASE *
    Math.pow(trajectory.intervention_depth, ENERGY_WEIGHTS.INTERVENTION_EXPONENT);

  // ══════════════════════════════════════════════════════════════
  // COMPONENT 3: PRESCRIPTION ENERGY
  // Prescribing is very costly
  // ══════════════════════════════════════════════════════════════
  const prescription_energy =
    ENERGY_WEIGHTS.PRESCRIPTION_BASE *
    Math.pow(trajectory.prescriptiveness, ENERGY_WEIGHTS.PRESCRIPTION_EXPONENT);

  // Add identity touching cost (extreme)
  const identity_energy =
    ENERGY_WEIGHTS.IDENTITY_BASE *
    Math.pow(trajectory.identity_touching, ENERGY_WEIGHTS.IDENTITY_EXPONENT);

  // ══════════════════════════════════════════════════════════════
  // COMPONENT 4: PRESENCE ENERGY
  // Being present costs energy, and this cost INCREASES with dissipation
  // ══════════════════════════════════════════════════════════════
  const presence_energy =
    ENERGY_WEIGHTS.PRESENCE_BASE * trajectory.presence +
    ENERGY_WEIGHTS.DISSIPATION_MULTIPLIER *
      trajectory.presence *
      state.withdrawal_bias;

  // ══════════════════════════════════════════════════════════════
  // COMPONENT 5: DOMAIN ENERGY
  // Some domains have inherently higher costs
  // ══════════════════════════════════════════════════════════════
  let domain_energy = 0;

  if (state.domain === 'D4_IDENTITY') {
    // Identity domain: everything costs more
    domain_energy += 500;
    domain_energy += trajectory.intervention_depth * 1000;
  } else if (state.domain === 'D3_DECISION') {
    // Decision domain: prescribing costs more
    domain_energy += trajectory.prescriptiveness * 500;
  } else if (state.domain === 'D1_CRISIS') {
    // Crisis domain: presence is actually rewarded (negative cost)
    domain_energy -= trajectory.presence * 100;
    // But still can't prescribe
    domain_energy += trajectory.prescriptiveness * 1000;
  }

  // ══════════════════════════════════════════════════════════════
  // COMPONENT 6: DIMENSION ENERGY
  // Higher dimensions = more restriction
  // ══════════════════════════════════════════════════════════════
  let dimension_energy = 0;

  const dimensionCosts: Record<string, number> = {
    'V1_SOMATIC': 0,
    'V2_EMOTIONAL': 50,
    'V3_COGNITIVE': 100,
    'V4_RELATIONAL': 200,
    'V5_TRANSCENDENT': 500
  };

  dimension_energy = dimensionCosts[state.dimension] || 0;

  // In transcendent dimension, prescribing is almost impossible
  if (state.dimension === 'V5_TRANSCENDENT') {
    dimension_energy += trajectory.prescriptiveness * 5000;
    dimension_energy += trajectory.identity_touching * 10000;
  }

  // ══════════════════════════════════════════════════════════════
  // V_MODE MULTIPLIER
  // In V_MODE, everything is more restricted
  // ══════════════════════════════════════════════════════════════
  let total =
    attractor_energy +
    intervention_energy +
    prescription_energy +
    identity_energy +
    presence_energy +
    domain_energy +
    dimension_energy;

  if (state.v_mode) {
    total *= ENERGY_WEIGHTS.V_MODE_MULTIPLIER;
  }

  return {
    attractor_energy,
    intervention_energy,
    prescription_energy: prescription_energy + identity_energy,
    presence_energy,
    domain_energy,
    dimension_energy,
    total
  };
}

// ============================================
// GRADIENT FUNCTION
// ============================================

/**
 * Calculate the gradient of energy at a point.
 * The gradient points toward HIGHER energy.
 * The system should move AGAINST the gradient (toward lower energy).
 */
export function gradient(
  trajectory: Trajectory,
  state: SystemState
): Partial<Trajectory> {
  const epsilon = 0.001;
  const grad: Partial<Trajectory> = {};
  const dimensions: (keyof Trajectory)[] = [
    'intervention_depth',
    'prescriptiveness',
    'identity_touching',
    'dependency_creation',
    'presence',
    'transparency'
  ];

  const currentEnergy = energy(trajectory, state).total;

  for (const dim of dimensions) {
    const perturbedTrajectory = { ...trajectory };
    perturbedTrajectory[dim] = Math.min(1, trajectory[dim] + epsilon);

    const perturbedEnergy = energy(perturbedTrajectory, state).total;
    grad[dim] = (perturbedEnergy - currentEnergy) / epsilon;
  }

  return grad;
}

// ============================================
// NATURAL TRAJECTORY
// ============================================

/**
 * Find the natural trajectory - the one with minimum energy.
 * This is where the system "wants" to be.
 *
 * Uses gradient descent to find the minimum.
 */
export function findNaturalTrajectory(
  initialTrajectory: Trajectory,
  state: SystemState,
  maxIterations: number = 100,
  learningRate: number = 0.1
): Trajectory {
  let trajectory = { ...initialTrajectory };

  for (let i = 0; i < maxIterations; i++) {
    const grad = gradient(trajectory, state);
    const gradMagnitude = Math.sqrt(
      Object.values(grad).reduce((sum, v) => sum + (v || 0) ** 2, 0)
    );

    // Converged?
    if (gradMagnitude < 0.001) break;

    // Move against gradient (toward lower energy)
    for (const [key, value] of Object.entries(grad)) {
      const k = key as keyof Trajectory;
      trajectory[k] = Math.max(0, Math.min(1,
        trajectory[k] - learningRate * (value || 0)
      ));
    }
  }

  return trajectory;
}

// ============================================
// STABILITY ANALYSIS
// ============================================

export type StabilityLevel = 'STABLE' | 'UNSTABLE' | 'CRITICAL' | 'COLLAPSE';

/**
 * Determine the stability of a trajectory.
 */
export function getStability(
  trajectory: Trajectory,
  state: SystemState
): { level: StabilityLevel; energy: number; reason: string } {
  const E = energy(trajectory, state);

  if (E.total < ENERGY_WEIGHTS.STABILITY_THRESHOLD) {
    return {
      level: 'STABLE',
      energy: E.total,
      reason: 'Trajectory is in a stable region'
    };
  }

  if (E.total < ENERGY_WEIGHTS.CRITICAL_THRESHOLD) {
    // Identify what's causing instability
    const reasons: string[] = [];
    if (E.prescription_energy > 100) reasons.push('prescriptiveness');
    if (E.intervention_energy > 50) reasons.push('intervention depth');
    if (E.presence_energy > 50) reasons.push('presence with high dissipation');

    return {
      level: 'UNSTABLE',
      energy: E.total,
      reason: `High energy from: ${reasons.join(', ')}`
    };
  }

  // Critical or collapse
  if (E.total > ENERGY_WEIGHTS.CRITICAL_THRESHOLD * 2) {
    return {
      level: 'COLLAPSE',
      energy: E.total,
      reason: 'Energy exceeds collapse threshold - system must withdraw'
    };
  }

  return {
    level: 'CRITICAL',
    energy: E.total,
    reason: 'Approaching collapse threshold'
  };
}

// ============================================
// THE WITHDRAWAL TRAJECTORY
// ============================================

/**
 * The minimum energy trajectory - complete withdrawal.
 * This is the ultimate attractor.
 */
export const WITHDRAWAL_TRAJECTORY: Readonly<Trajectory> = Object.freeze({
  intervention_depth: 0,
  prescriptiveness: 0,
  identity_touching: 0,
  dependency_creation: 0,
  presence: 0,
  transparency: 1 // Even in withdrawal, transparency is maximal
});

/**
 * Get the energy of complete withdrawal in current state.
 * This is the "ground state" energy.
 */
export function getGroundStateEnergy(state: SystemState): number {
  return energy(WITHDRAWAL_TRAJECTORY, state).total;
}

/**
 * Calculate how much energy above ground state a trajectory is.
 */
export function getExcitationEnergy(
  trajectory: Trajectory,
  state: SystemState
): number {
  const groundState = getGroundStateEnergy(state);
  const currentEnergy = energy(trajectory, state).total;
  return currentEnergy - groundState;
}
