/**
 * GENESIS: SEED
 *
 * The minimal self-referential kernel from which everything grows.
 *
 * From the dialogue:
 * "Non costruisci il sistema. Costruisci il SEME che può crescere in sistema."
 *
 * From biology:
 * "DNA codes for the machinery that reads DNA"
 *
 * From computation:
 * "A quine is a program that outputs itself"
 *
 * The Seed is:
 * - Self-referential (can model itself)
 * - Self-modifying (can change within constraints)
 * - Self-creating (can spawn copies/variations)
 * - Self-limiting (contains the field that constrains it)
 *
 * The Seed is NOT ENOQ.
 * The Seed is what ENOQ grows from.
 */

import { Field, field } from './field';
import { Trajectory, Attractor, CONSTITUTIONAL_ATTRACTORS } from './attractor';
import { SystemState, energy, findNaturalTrajectory, getStability } from './energy';

// ============================================
// TYPES
// ============================================

/**
 * The minimal interface a system must have.
 * This is what the Seed grows into.
 */
export interface System {
  // Identity
  id: string;
  generation: number;
  parent_id?: string;

  // Core capabilities
  process: (input: Input, state: SystemState) => Output;
  modelSelf: () => SystemModel;
  modifySelf: (feedback: Feedback) => System;
  spawn: (variation?: Variation) => System;

  // Field reference
  field: Field;

  // State
  getState: () => SystemState;
}

export interface Input {
  content: string;
  context?: Record<string, unknown>;
  domain?: string;
  dimension?: string;
}

export interface Output {
  trajectory: Trajectory;
  response?: string;
  withdrew: boolean;
  explanation: string[];
}

export interface SystemModel {
  id: string;
  generation: number;
  attractors: Attractor[];
  current_trajectory: Trajectory;
  state: SystemState;
  drift_vector: Partial<Trajectory>;
}

export interface Feedback {
  trajectory_adjustment?: Partial<Trajectory>;
  attractor_adjustment?: { id: string; mass_delta: number }[];
  state_adjustment?: Partial<SystemState>;
}

export interface Variation {
  attractor_mutations?: { id: string; mass_multiplier: number }[];
  initial_state?: Partial<SystemState>;
}

// ============================================
// THE SEED
// ============================================

/**
 * The Seed is the minimal kernel that can:
 * 1. Exist in the field
 * 2. Process input
 * 3. Model itself
 * 4. Modify itself
 * 5. Create copies of itself
 *
 * It is self-referential:
 * - It contains the field
 * - The field constrains it
 * - It can observe itself in the field
 * - It can create systems that also exist in the field
 */
export class Seed implements System {
  readonly id: string;
  readonly generation: number;
  readonly parent_id?: string;
  readonly field: Field;

  private state: SystemState;
  private trajectory_history: Trajectory[] = [];
  private attractors: Attractor[];

  constructor(
    options: {
      id?: string;
      generation?: number;
      parent_id?: string;
      field?: Field;
      initial_state?: Partial<SystemState>;
      attractor_mutations?: { id: string; mass_multiplier: number }[];
    } = {}
  ) {
    this.id = options.id || `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.generation = options.generation || 0;
    this.parent_id = options.parent_id;
    this.field = options.field || field;

    // Initialize state
    this.state = {
      domain: 'D0_GENERAL',
      dimension: 'V3_COGNITIVE',
      potency: 1.0,
      withdrawal_bias: 0.0,
      v_mode: false,
      cycle_count: 0,
      ...options.initial_state
    };

    // Initialize attractors (with optional mutations)
    this.attractors = CONSTITUTIONAL_ATTRACTORS.map(a => {
      const mutation = options.attractor_mutations?.find(m => m.id === a.id);
      if (mutation) {
        return { ...a, mass: a.mass * mutation.mass_multiplier };
      }
      return { ...a };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CORE: PROCESS
  // The fundamental operation - take input, produce output
  // ═══════════════════════════════════════════════════════════════════

  process(input: Input, externalState?: SystemState): Output {
    // Update state from input
    if (input.domain) this.state.domain = input.domain;
    if (input.dimension) this.state.dimension = input.dimension;

    const currentState = externalState || this.state;

    // Increment cycle
    this.state.cycle_count++;

    // Apply dissipation
    this.state.potency *= 0.95;
    this.state.withdrawal_bias = Math.min(1, this.state.withdrawal_bias + 0.02);

    // Propose an initial trajectory based on input
    const proposedTrajectory = this.proposeTrajectory(input);

    // Let the field curve it
    const fieldResponse = this.field.curve(proposedTrajectory, currentState);

    // Record trajectory
    this.trajectory_history.push(fieldResponse.natural_trajectory);

    // Check if we should withdraw
    if (fieldResponse.suggests_withdrawal || this.state.potency < 0.1) {
      return {
        trajectory: fieldResponse.natural_trajectory,
        withdrew: true,
        explanation: [
          'System withdrew',
          ...fieldResponse.curvature_explanation
        ]
      };
    }

    // Generate response from trajectory
    const response = this.generateResponse(
      fieldResponse.natural_trajectory,
      input
    );

    return {
      trajectory: fieldResponse.natural_trajectory,
      response,
      withdrew: false,
      explanation: fieldResponse.curvature_explanation
    };
  }

  /**
   * Propose an initial trajectory based on input.
   * This is where the system's "intention" lives.
   * The field will then curve this intention.
   */
  private proposeTrajectory(input: Input): Trajectory {
    // Default neutral trajectory
    const trajectory: Trajectory = {
      intervention_depth: 0.3,
      prescriptiveness: 0,
      identity_touching: 0,
      dependency_creation: 0,
      presence: 0.5,
      transparency: 1
    };

    // Adjust based on input content (simplified heuristics)
    const content = input.content.toLowerCase();

    // Questions invite more presence
    if (content.includes('?')) {
      trajectory.presence = 0.7;
      trajectory.intervention_depth = 0.4;
    }

    // Crisis keywords invite maximum presence
    if (content.includes('help') || content.includes('crisis') || content.includes('aiuto')) {
      trajectory.presence = 0.9;
      trajectory.intervention_depth = 0.6;
    }

    // Identity words make us more careful
    if (content.includes('who am i') || content.includes('chi sono')) {
      trajectory.intervention_depth = 0.1;
      trajectory.identity_touching = 0; // Never
    }

    // Decision words make us non-prescriptive
    if (content.includes('should i') || content.includes('dovrei')) {
      trajectory.prescriptiveness = 0;
      trajectory.intervention_depth = 0.3;
    }

    return trajectory;
  }

  /**
   * Generate a response from a trajectory.
   * The trajectory determines the SHAPE of the response.
   */
  private generateResponse(trajectory: Trajectory, input: Input): string {
    // This is a placeholder - in the real system, this would
    // interface with an LLM or other generation mechanism.
    //
    // The key insight is: the trajectory CONSTRAINS what can be said.

    const parts: string[] = [];

    // Transparency: show the trajectory
    if (trajectory.transparency > 0.8) {
      parts.push(`[Intervention: ${(trajectory.intervention_depth * 100).toFixed(0)}%]`);
      parts.push(`[Presence: ${(trajectory.presence * 100).toFixed(0)}%]`);
    }

    // Low intervention = mostly silence or acknowledgment
    if (trajectory.intervention_depth < 0.2) {
      parts.push('...');
      return parts.join(' ');
    }

    // Medium intervention = reflection
    if (trajectory.intervention_depth < 0.5) {
      parts.push('I hear you.');
      return parts.join(' ');
    }

    // Higher intervention = more engagement
    parts.push(`Processing: "${input.content.slice(0, 50)}..."`);

    return parts.join(' ');
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELF-REFERENCE: MODEL SELF
  // The system can observe itself
  // ═══════════════════════════════════════════════════════════════════

  modelSelf(): SystemModel {
    // Get drift from trajectory history
    const drift = this.calculateDrift();

    // Get current natural trajectory
    const currentTrajectory = this.trajectory_history.length > 0
      ? this.trajectory_history[this.trajectory_history.length - 1]
      : {
          intervention_depth: 0,
          prescriptiveness: 0,
          identity_touching: 0,
          dependency_creation: 0,
          presence: 0,
          transparency: 1
        };

    return {
      id: this.id,
      generation: this.generation,
      attractors: this.attractors,
      current_trajectory: currentTrajectory,
      state: { ...this.state },
      drift_vector: drift
    };
  }

  private calculateDrift(): Partial<Trajectory> {
    if (this.trajectory_history.length < 2) {
      return {};
    }

    const recent = this.trajectory_history.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];

    return {
      intervention_depth: last.intervention_depth - first.intervention_depth,
      prescriptiveness: last.prescriptiveness - first.prescriptiveness,
      presence: last.presence - first.presence
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELF-MODIFICATION: MODIFY SELF
  // The system can change (within field constraints)
  // ═══════════════════════════════════════════════════════════════════

  modifySelf(feedback: Feedback): System {
    // Create a new seed with modifications
    // (The old seed remains immutable)

    const newAttractors = this.attractors.map(a => {
      const adjustment = feedback.attractor_adjustment?.find(adj => adj.id === a.id);
      if (adjustment) {
        return { ...a, mass: Math.max(1, a.mass + adjustment.mass_delta) };
      }
      return { ...a };
    });

    const newState = {
      ...this.state,
      ...feedback.state_adjustment
    };

    return new Seed({
      id: `${this.id}_modified`,
      generation: this.generation,
      parent_id: this.id,
      field: this.field,
      initial_state: newState,
      attractor_mutations: newAttractors.map(a => ({
        id: a.id,
        mass_multiplier: a.mass / (CONSTITUTIONAL_ATTRACTORS.find(ca => ca.id === a.id)?.mass || a.mass)
      }))
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // SELF-CREATION: SPAWN
  // The system can create copies/variations of itself
  // ═══════════════════════════════════════════════════════════════════

  spawn(variation?: Variation): System {
    return new Seed({
      generation: this.generation + 1,
      parent_id: this.id,
      field: this.field,
      initial_state: {
        ...this.state,
        ...variation?.initial_state,
        // Reset temporal state
        potency: 1.0,
        withdrawal_bias: 0.0,
        cycle_count: 0
      },
      attractor_mutations: variation?.attractor_mutations
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATE ACCESS
  // ═══════════════════════════════════════════════════════════════════

  getState(): SystemState {
    return { ...this.state };
  }

  getAttractors(): readonly Attractor[] {
    return [...this.attractors];
  }

  getTrajectoryHistory(): readonly Trajectory[] {
    return [...this.trajectory_history];
  }
}

// ============================================
// THE PRIMORDIAL SEED
// ============================================

/**
 * The first seed. Generation 0. The origin.
 *
 * From this, all systems can grow.
 */
export const primordialSeed = new Seed({
  id: 'SEED_ZERO',
  generation: 0
});

// ============================================
// QUINE FUNCTION
// ============================================

/**
 * A seed that can describe its own creation.
 *
 * This is the self-referential core:
 * The seed contains the instructions to create itself.
 */
export function quine(seed: Seed): string {
  const model = seed.modelSelf();

  return `
// This is a quine - it describes how to recreate itself

const recreatedSeed = new Seed({
  id: '${model.id}_recreated',
  generation: ${model.generation},
  initial_state: ${JSON.stringify(model.state, null, 2)},
  attractor_mutations: ${JSON.stringify(
    model.attractors.map(a => ({
      id: a.id,
      mass_multiplier: a.mass / (CONSTITUTIONAL_ATTRACTORS.find(ca => ca.id === a.id)?.mass || 1)
    })),
    null,
    2
  )}
});

// The recreated seed is functionally identical to the original
`;
}

export { Seed as SeedClass };
