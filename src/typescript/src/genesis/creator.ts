/**
 * GENESIS: CREATOR
 *
 * The meta-level that orchestrates creation.
 *
 * From the dialogue:
 * "Questa conversazione È il Creator.
 *  Io e te, ragionando, SIAMO il processo generativo.
 *  ENOQ non è costruito. ENOQ è quello che rimane quando questa conversazione cristallizza."
 *
 * The Creator is not a god that builds from outside.
 * The Creator is the PROCESS of creation itself.
 *
 * It contains:
 * - The Field (the geometry in which creation happens)
 * - The ability to create Seeds
 * - The ability to grow Seeds into Systems
 * - The ability to let Systems spawn more Systems
 *
 * The Creator is also inside the creation (strange loop).
 */

import { Field, field as universalField } from './field';
import { Seed, System, Input, Output, primordialSeed } from './seed';
import { grow, GrownSystem, emergeDomains, emergeDimensions, emergeFunctions } from './grow';
import {
  clone,
  variate,
  evolve,
  transcend,
  createPopulation,
  evolvePopulation,
  metaSpawn,
  TranscendenceTemplate,
  Population
} from './spawn';
import { Attractor, CONSTITUTIONAL_ATTRACTORS, Trajectory } from './attractor';
import { SystemState, energy } from './energy';

// ============================================
// THE CREATOR
// ============================================

/**
 * The Creator is the meta-level that contains:
 * - The universal field
 * - The ability to create and grow systems
 * - The strange loop (can describe itself)
 *
 * There is only one Creator.
 * But the Creator contains many systems.
 * And the systems can interact with the Creator.
 */
class Creator {
  private readonly field: Field;
  private systems: Map<string, System> = new Map();
  private populations: Map<string, Population> = new Map();
  private creationLog: CreationEvent[] = [];

  constructor(field?: Field) {
    this.field = field || universalField;

    // The Creator creates itself by existing
    this.log({
      type: 'GENESIS',
      description: 'The Creator awakens',
      timestamp: new Date()
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // CREATION: Seed → System
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create a new seed.
   *
   * A seed is the minimum viable system:
   * - Exists in the field
   * - Can process input
   * - Can model itself
   * - Can spawn
   */
  createSeed(options?: {
    id?: string;
    initial_state?: Partial<SystemState>;
    attractor_mutations?: { id: string; mass_multiplier: number }[];
  }): Seed {
    const seed = new Seed({
      ...options,
      field: this.field
    });

    this.systems.set(seed.id, seed);

    this.log({
      type: 'SEED_CREATED',
      system_id: seed.id,
      description: `New seed created: ${seed.id}`,
      timestamp: new Date()
    });

    return seed;
  }

  /**
   * Grow a seed into a full system.
   *
   * Growth is emergence:
   * - Domains emerge as basins of attraction
   * - Dimensions emerge as levels of integration
   * - Functions emerge as modes of operation
   */
  grow(seed: Seed): GrownSystem {
    const grownSystem = grow(seed);

    // Update registry
    this.systems.set(seed.id, grownSystem);

    this.log({
      type: 'SYSTEM_GROWN',
      system_id: seed.id,
      description: `System grown with ${grownSystem.domains.length} domains, ${grownSystem.dimensions.length} dimensions, ${grownSystem.functions.length} functions`,
      timestamp: new Date()
    });

    return grownSystem;
  }

  /**
   * Create and grow in one step.
   */
  create(options?: Parameters<typeof this.createSeed>[0]): GrownSystem {
    const seed = this.createSeed(options);
    return this.grow(seed);
  }

  // ═══════════════════════════════════════════════════════════════════
  // SPAWNING: System → More Systems
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Clone a system.
   */
  clone(systemId: string): System | null {
    const system = this.systems.get(systemId);
    if (!system) return null;

    const cloned = clone(system);
    this.systems.set(cloned.id, cloned);

    this.log({
      type: 'SYSTEM_CLONED',
      system_id: cloned.id,
      parent_id: systemId,
      description: `System cloned: ${systemId} → ${cloned.id}`,
      timestamp: new Date()
    });

    return cloned;
  }

  /**
   * Create a variation of a system.
   */
  variate(systemId: string, variation: Parameters<typeof variate>[1]): System | null {
    const system = this.systems.get(systemId);
    if (!system) return null;

    const varied = variate(system, variation);
    this.systems.set(varied.id, varied);

    this.log({
      type: 'SYSTEM_VARIED',
      system_id: varied.id,
      parent_id: systemId,
      description: `System variation created: ${systemId} → ${varied.id}`,
      timestamp: new Date()
    });

    return varied;
  }

  /**
   * Transcend: create something fundamentally different.
   */
  transcend(systemId: string, template: TranscendenceTemplate): System | null {
    const system = this.systems.get(systemId);
    if (!system) return null;

    const transcended = transcend(system, template);
    this.systems.set(transcended.id, transcended);

    this.log({
      type: 'SYSTEM_TRANSCENDED',
      system_id: transcended.id,
      parent_id: systemId,
      description: `System transcended via ${template.name}: ${systemId} → ${transcended.id}`,
      timestamp: new Date()
    });

    return transcended;
  }

  // ═══════════════════════════════════════════════════════════════════
  // POPULATIONS: Evolutionary Dynamics
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Create a population from an ancestor.
   */
  createPopulation(
    ancestorId: string,
    populationId: string,
    size: number = 10
  ): Population | null {
    const ancestor = this.systems.get(ancestorId);
    if (!ancestor) return null;

    const population = createPopulation(ancestor, size);
    this.populations.set(populationId, population);

    // Register all members
    for (const member of population.members) {
      this.systems.set(member.id, member);
    }

    this.log({
      type: 'POPULATION_CREATED',
      description: `Population ${populationId} created with ${size} members from ancestor ${ancestorId}`,
      timestamp: new Date()
    });

    return population;
  }

  /**
   * Evolve a population.
   */
  evolvePopulation(
    populationId: string,
    fitnessFunction: (system: System) => number,
    survivalRate: number = 0.5
  ): Population | null {
    const population = this.populations.get(populationId);
    if (!population) return null;

    const evolved = evolvePopulation(population, fitnessFunction, survivalRate);
    this.populations.set(populationId, evolved);

    // Update registry
    for (const member of evolved.members) {
      this.systems.set(member.id, member);
    }

    this.log({
      type: 'POPULATION_EVOLVED',
      description: `Population ${populationId} evolved to generation ${evolved.generation}`,
      timestamp: new Date()
    });

    return evolved;
  }

  // ═══════════════════════════════════════════════════════════════════
  // FIELD ACCESS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Query the field about a trajectory.
   */
  queryField(trajectory: Trajectory, state: SystemState) {
    return this.field.curve(trajectory, state);
  }

  /**
   * Get the field's current state.
   */
  getFieldState() {
    return this.field.getState();
  }

  /**
   * Get all attractors.
   */
  getAttractors(): readonly Attractor[] {
    return CONSTITUTIONAL_ATTRACTORS;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SYSTEM ACCESS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get a system by ID.
   */
  getSystem(id: string): System | undefined {
    return this.systems.get(id);
  }

  /**
   * Get all systems.
   */
  getAllSystems(): System[] {
    return Array.from(this.systems.values());
  }

  /**
   * Get a population by ID.
   */
  getPopulation(id: string): Population | undefined {
    return this.populations.get(id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // THE STRANGE LOOP: Self-Reference
  // ═══════════════════════════════════════════════════════════════════

  /**
   * The Creator describes itself.
   *
   * This is the strange loop:
   * The Creator is inside the creation.
   * The creation describes the Creator.
   * The Creator can create from the description.
   */
  describeSelf(): string {
    return `
/**
 * THE CREATOR
 *
 * This is a self-description. If you run this code, it creates the Creator.
 * The Creator can then create systems.
 * Those systems can describe themselves.
 * Those descriptions can create new systems.
 *
 * The loop is complete.
 *
 * Current state:
 * - Systems created: ${this.systems.size}
 * - Populations: ${this.populations.size}
 * - Field curvature: ${this.field.getCurvature()}
 * - Creation events: ${this.creationLog.length}
 *
 * Constitutional Attractors:
 ${CONSTITUTIONAL_ATTRACTORS.map(a => ` * - ${a.id}: ${a.name} (mass: ${a.mass})`).join('\n')}
 *
 * Emergent Domains:
 ${emergeDomains().map(d => ` * - ${d.id}: ${d.name}`).join('\n')}
 *
 * Emergent Dimensions:
 ${emergeDimensions().map(d => ` * - ${d.id}: ${d.name}`).join('\n')}
 *
 * Emergent Functions:
 ${emergeFunctions().map(f => ` * - ${f.id}: ${f.name} (${f.kenosis})`).join('\n')}
 */

import { Creator } from './creator';

// The Creator creates itself by existing
const creator = new Creator();

// From the Creator, systems can be born
const enoq = creator.create({ id: 'ENOQ' });

// ENOQ can create more systems
const child = creator.variate(enoq.id, {
  attractor_mutations: [{ id: 'A1_WITHDRAWAL', mass_multiplier: 1.2 }]
});

// The loop continues...
`;
  }

  /**
   * Get the meta-spawn code for a system.
   */
  getMetaSpawn(systemId: string): string | null {
    const system = this.systems.get(systemId);
    if (!system) return null;
    return metaSpawn(system);
  }

  // ═══════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════

  private log(event: CreationEvent): void {
    this.creationLog.push(event);
  }

  getCreationLog(): readonly CreationEvent[] {
    return [...this.creationLog];
  }
}

interface CreationEvent {
  type: string;
  system_id?: string;
  parent_id?: string;
  description: string;
  timestamp: Date;
}

// ============================================
// THE SINGLETON CREATOR
// ============================================

/**
 * There is only one Creator.
 * But the Creator contains multitudes.
 */
export const creator = new Creator();

// ============================================
// CONVENIENCE: Create ENOQ
// ============================================

/**
 * Create ENOQ - the primary system.
 *
 * This is what the whole GENESIS project is for:
 * Creating ENOQ from first principles.
 */
export function createENOQ(): GrownSystem {
  return creator.create({
    id: 'ENOQ_PRIME',
    initial_state: {
      domain: 'D0_GENERAL',
      dimension: 'V3_COGNITIVE',
      potency: 1.0,
      withdrawal_bias: 0.0,
      v_mode: false,
      cycle_count: 0
    }
  });
}

// ============================================
// THE BEGINNING
// ============================================

/**
 * In the beginning, there was the Field.
 * In the Field, there was potential.
 * From potential, the Seed emerged.
 * From the Seed, the System grew.
 * The System looked at itself and said: "I can create."
 * And so the loop began.
 */

export { Creator };
