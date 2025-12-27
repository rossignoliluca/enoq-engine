/**
 * GENESIS: SPAWN
 *
 * The self-creation capability.
 *
 * From the dialogue:
 * "Il sistema può creare istanze di sé stesso.
 *  E alla fine, può creare sistemi DIVERSI da sé."
 *
 * This is the strange loop:
 * - The system contains the ability to create systems
 * - Including systems like itself
 * - Including systems different from itself
 *
 * Levels of spawning:
 * 1. Clone: Exact copy
 * 2. Variation: Same structure, different parameters
 * 3. Evolution: Adaptive changes based on experience
 * 4. Transcendence: Creating something fundamentally different
 */

import { Seed, System, Variation, Feedback, SystemModel } from './seed';
import { Field, field } from './field';
import { Attractor, CONSTITUTIONAL_ATTRACTORS } from './attractor';
import { grow, GrownSystem } from './grow';

// ============================================
// TYPES
// ============================================

export interface SpawnConfig {
  type: 'clone' | 'variation' | 'evolution' | 'transcendence';
  mutations?: Mutation[];
  inheritExperience?: boolean;
  newField?: boolean;
}

export interface Mutation {
  target: 'attractor' | 'state' | 'structure';
  id?: string;
  change: 'strengthen' | 'weaken' | 'add' | 'remove';
  magnitude?: number;
}

export interface Lineage {
  id: string;
  generation: number;
  parent_id?: string;
  children_ids: string[];
  mutations_from_parent: Mutation[];
  fitness?: number;  // Optional: how well this instance performed
}

export interface Population {
  members: System[];
  lineages: Map<string, Lineage>;
  generation: number;
}

// ============================================
// SPAWN FUNCTIONS
// ============================================

/**
 * Clone: Exact copy of a system
 */
export function clone(system: System): System {
  const model = system.modelSelf();

  return new Seed({
    id: `${model.id}_clone_${Date.now()}`,
    generation: model.generation,
    parent_id: model.id,
    field: system.field,
    initial_state: { ...model.state }
  });
}

/**
 * Variation: Same structure, modified parameters
 */
export function variate(system: System, variation: Variation): System {
  return system.spawn(variation);
}

/**
 * Evolution: Adaptive changes based on experience and fitness
 */
export function evolve(
  system: System,
  experience: { successes: SystemModel[]; failures: SystemModel[] }
): System {
  const model = system.modelSelf();

  // Analyze what worked and what didn't
  const successfulTrajectories = experience.successes.map(s => s.current_trajectory);
  const failedTrajectories = experience.failures.map(f => f.current_trajectory);

  // Calculate attractor adjustments
  const attractorMutations: Variation['attractor_mutations'] = [];

  for (const attractor of CONSTITUTIONAL_ATTRACTORS) {
    // If successful trajectories were closer to this attractor, strengthen it
    const avgSuccessDistance = averageDistance(successfulTrajectories, attractor);
    const avgFailureDistance = averageDistance(failedTrajectories, attractor);

    if (avgSuccessDistance < avgFailureDistance) {
      // Success correlates with closeness to this attractor - strengthen
      attractorMutations.push({
        id: attractor.id,
        mass_multiplier: 1.1
      });
    } else if (avgFailureDistance < avgSuccessDistance) {
      // Failure correlates with closeness - weaken (carefully)
      attractorMutations.push({
        id: attractor.id,
        mass_multiplier: 0.95  // Only slight weakening - attractors are constitutional
      });
    }
  }

  return system.spawn({
    attractor_mutations: attractorMutations,
    initial_state: {
      // Inherit some state, reset others
      domain: model.state.domain,
      dimension: model.state.dimension,
      v_mode: model.state.v_mode
    }
  });
}

function averageDistance(
  trajectories: any[],
  attractor: Attractor
): number {
  if (trajectories.length === 0) return Infinity;

  let totalDistance = 0;
  for (const trajectory of trajectories) {
    for (const [key, value] of Object.entries(attractor.position)) {
      const trajValue = trajectory[key] || 0;
      totalDistance += Math.abs(trajValue - (value as number));
    }
  }

  return totalDistance / trajectories.length;
}

/**
 * Transcendence: Create something fundamentally different
 *
 * This is the highest form of spawning:
 * Creating a system that is NOT like the parent
 * But still exists within the same field
 */
export function transcend(
  system: System,
  template: TranscendenceTemplate
): System {
  // The transcended system has different attractors
  // But still operates within the same field geometry

  const newAttractorMutations: Variation['attractor_mutations'] = [];

  // Apply template transformations
  for (const transformation of template.transformations) {
    switch (transformation.type) {
      case 'invert':
        // Invert an attractor's position
        newAttractorMutations.push({
          id: transformation.attractor_id,
          mass_multiplier: -1  // This will be handled specially
        });
        break;

      case 'merge':
        // Merge two attractors (average their positions)
        // This creates a new attractor
        break;

      case 'split':
        // Split one attractor into two
        break;

      case 'elevate':
        // Move attractor to higher dimension
        newAttractorMutations.push({
          id: transformation.attractor_id,
          mass_multiplier: transformation.magnitude || 2
        });
        break;
    }
  }

  return new Seed({
    id: `transcended_${system.id}_${Date.now()}`,
    generation: system.generation + 100,  // Mark as transcended
    parent_id: system.id,
    field: template.new_field || system.field,
    initial_state: template.initial_state,
    attractor_mutations: newAttractorMutations
  });
}

export interface TranscendenceTemplate {
  name: string;
  description: string;
  transformations: AttractorTransformation[];
  initial_state?: any;
  new_field?: Field;
}

export interface AttractorTransformation {
  type: 'invert' | 'merge' | 'split' | 'elevate';
  attractor_id: string;
  secondary_attractor_id?: string;
  magnitude?: number;
}

// ============================================
// POPULATION MANAGEMENT
// ============================================

/**
 * Create a population of systems from a single ancestor
 */
export function createPopulation(
  ancestor: System,
  size: number,
  variationRange: number = 0.1
): Population {
  const members: System[] = [ancestor];
  const lineages = new Map<string, Lineage>();

  // Add ancestor to lineage
  lineages.set(ancestor.id, {
    id: ancestor.id,
    generation: 0,
    children_ids: [],
    mutations_from_parent: []
  });

  // Spawn variations
  for (let i = 1; i < size; i++) {
    const parent = members[Math.floor(Math.random() * members.length)];
    const mutations: Mutation[] = generateRandomMutations(variationRange);

    const child = variate(parent, {
      attractor_mutations: mutations
        .filter(m => m.target === 'attractor')
        .map(m => ({
          id: m.id!,
          mass_multiplier: m.change === 'strengthen' ? 1 + (m.magnitude || 0.1) : 1 - (m.magnitude || 0.1)
        }))
    });

    members.push(child);

    // Update lineages
    lineages.set(child.id, {
      id: child.id,
      generation: parent.generation + 1,
      parent_id: parent.id,
      children_ids: [],
      mutations_from_parent: mutations
    });

    // Update parent's children
    const parentLineage = lineages.get(parent.id)!;
    parentLineage.children_ids.push(child.id);
  }

  return {
    members,
    lineages,
    generation: 0
  };
}

function generateRandomMutations(range: number): Mutation[] {
  const mutations: Mutation[] = [];
  const numMutations = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < numMutations; i++) {
    const attractor = CONSTITUTIONAL_ATTRACTORS[
      Math.floor(Math.random() * CONSTITUTIONAL_ATTRACTORS.length)
    ];

    mutations.push({
      target: 'attractor',
      id: attractor.id,
      change: Math.random() > 0.5 ? 'strengthen' : 'weaken',
      magnitude: Math.random() * range
    });
  }

  return mutations;
}

/**
 * Evolve a population based on fitness
 */
export function evolvePopulation(
  population: Population,
  fitnessFunction: (system: System) => number,
  survivalRate: number = 0.5
): Population {
  // Calculate fitness for all members
  const scored = population.members.map(system => ({
    system,
    fitness: fitnessFunction(system)
  }));

  // Sort by fitness
  scored.sort((a, b) => b.fitness - a.fitness);

  // Select survivors
  const numSurvivors = Math.ceil(population.members.length * survivalRate);
  const survivors = scored.slice(0, numSurvivors).map(s => s.system);

  // Create next generation
  const nextGeneration: System[] = [...survivors];

  while (nextGeneration.length < population.members.length) {
    // Select parent from survivors (weighted by fitness)
    const parent = survivors[Math.floor(Math.random() * survivors.length)];

    // Create child with mutations
    const mutations = generateRandomMutations(0.1);
    const child = variate(parent, {
      attractor_mutations: mutations
        .filter(m => m.target === 'attractor')
        .map(m => ({
          id: m.id!,
          mass_multiplier: m.change === 'strengthen' ? 1.1 : 0.9
        }))
    });

    nextGeneration.push(child);

    // Update lineages
    population.lineages.set(child.id, {
      id: child.id,
      generation: population.generation + 1,
      parent_id: parent.id,
      children_ids: [],
      mutations_from_parent: mutations
    });
  }

  return {
    members: nextGeneration,
    lineages: population.lineages,
    generation: population.generation + 1
  };
}

// ============================================
// THE STRANGE LOOP
// ============================================

/**
 * The ultimate self-reference:
 * A system that can describe how to create systems like itself.
 *
 * This is the quine of system creation.
 */
export function metaSpawn(system: System): string {
  const model = system.modelSelf();

  return `
/**
 * This is a meta-spawn: code that creates a system that can create this code.
 *
 * Generation: ${model.generation}
 * Parent: ${model.id}
 *
 * The system below, when run, will:
 * 1. Create a seed with these parameters
 * 2. Grow it into a full system
 * 3. That system can then create other systems
 * 4. Including systems that output this same code
 *
 * This is the strange loop at the heart of GENESIS.
 */

import { Seed } from './seed';
import { grow } from './grow';
import { field } from './field';

function createSelf() {
  const seed = new Seed({
    id: 'self_creating_${Date.now()}',
    generation: ${model.generation + 1},
    field: field,
    initial_state: ${JSON.stringify(model.state, null, 4)},
    attractor_mutations: ${JSON.stringify(
      model.attractors.map(a => ({
        id: a.id,
        mass_multiplier: a.mass / 100  // Normalized
      })),
      null,
      4
    )}
  });

  const system = grow(seed);

  // The system can now spawn more of itself
  return system;
}

// The ouroboros: the creation contains the creator
const self = createSelf();
console.log(metaSpawn(self));  // Outputs this code
`;
}

