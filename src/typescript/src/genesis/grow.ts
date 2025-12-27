/**
 * GENESIS: GROW
 *
 * How the Seed grows into a full System.
 *
 * From the dialogue:
 * "Non PROGETTI 17 domini. Definisci attrattori. I domini EMERGONO come bacini di attrazione."
 *
 * Growth is not construction.
 * Growth is EMERGENCE within a field.
 *
 * The Seed contains:
 * - The field (constraints as geometry)
 * - The process function (minimal)
 * - Self-reference capabilities
 *
 * From the Seed, the following EMERGE:
 * - Domains (as basins of attraction in experience space)
 * - Dimensions (as levels of integration/abstraction)
 * - Functions (as modes of operation)
 * - Capabilities (as stable patterns)
 */

import { Seed, System, Input, Output, SystemModel } from './seed';
import { Field, field } from './field';
import { Trajectory, Attractor, CONSTITUTIONAL_ATTRACTORS } from './attractor';
import { SystemState, energy } from './energy';

// ============================================
// TYPES
// ============================================

/**
 * An emergent domain - a basin of attraction in experience space
 */
export interface EmergentDomain {
  id: string;
  name: string;
  center: ExperiencePoint;
  radius: number;  // How broad the basin is
  depth: number;   // How deep the attractor well is
  characteristics: string[];
}

/**
 * A point in the space of human experience
 */
export interface ExperiencePoint {
  urgency: number;           // 0 = reflective, 1 = crisis
  intimacy: number;          // 0 = public, 1 = deeply personal
  abstraction: number;       // 0 = concrete, 1 = abstract
  temporal_orientation: number;  // -1 = past, 0 = present, 1 = future
  agency_locus: number;      // 0 = external, 1 = internal
}

/**
 * An emergent dimension - a level of integration
 */
export interface EmergentDimension {
  id: string;
  name: string;
  integration_level: number;  // 0 = local, 1 = global
  abstraction_level: number;  // 0 = concrete, 1 = abstract
  constraint_multiplier: number;  // Higher = more restricted
}

/**
 * An emergent function - a mode of operation
 */
export interface EmergentFunction {
  id: string;
  name: string;
  trajectory_signature: Partial<Trajectory>;
  kenosis: string;  // What this function withdraws from
}

/**
 * A grown system - the Seed after emergence
 */
export interface GrownSystem extends System {
  domains: EmergentDomain[];
  dimensions: EmergentDimension[];
  functions: EmergentFunction[];
  detectDomain: (input: Input) => EmergentDomain;
  detectDimension: (input: Input) => EmergentDimension;
  selectFunction: (input: Input, domain: EmergentDomain) => EmergentFunction;
}

// ============================================
// EMERGENCE FUNCTIONS
// ============================================

/**
 * Domains emerge as basins of attraction in experience space.
 *
 * We don't define domains.
 * We define the experience space and find where the basins form.
 */
export function emergeDomains(): EmergentDomain[] {
  // These are discovered, not designed
  // They represent natural clusters in human experience

  return [
    {
      id: 'D1_CRISIS',
      name: 'Crisis',
      center: {
        urgency: 1.0,
        intimacy: 0.8,
        abstraction: 0.2,
        temporal_orientation: 0,  // Now
        agency_locus: 0.3  // Feeling powerless
      },
      radius: 0.3,
      depth: 100,  // Deep attractor - strong pull
      characteristics: [
        'High urgency',
        'Need for presence',
        'Safety paramount',
        'Action may be needed'
      ]
    },
    {
      id: 'D2_RELATIONSHIP',
      name: 'Relationship',
      center: {
        urgency: 0.4,
        intimacy: 0.9,
        abstraction: 0.3,
        temporal_orientation: 0.2,
        agency_locus: 0.5
      },
      radius: 0.4,
      depth: 70,
      characteristics: [
        'Involves others',
        'Emotional weight',
        'Boundaries matter',
        'No advice on specific people'
      ]
    },
    {
      id: 'D3_DECISION',
      name: 'Decision',
      center: {
        urgency: 0.5,
        intimacy: 0.6,
        abstraction: 0.5,
        temporal_orientation: 0.8,  // Future-oriented
        agency_locus: 0.9  // "What should I do?"
      },
      radius: 0.35,
      depth: 80,
      characteristics: [
        'Choice point',
        'Future consequences',
        'Values involved',
        'Never prescribe'
      ]
    },
    {
      id: 'D4_IDENTITY',
      name: 'Identity',
      center: {
        urgency: 0.3,
        intimacy: 1.0,  // Maximally intimate
        abstraction: 0.7,
        temporal_orientation: 0,
        agency_locus: 0.5
      },
      radius: 0.25,  // Narrow basin
      depth: 200,    // Very deep - hard to escape
      characteristics: [
        'Who am I?',
        'RUBICON active',
        'Never assign',
        'Only witness'
      ]
    },
    {
      id: 'D5_KNOWLEDGE',
      name: 'Knowledge',
      center: {
        urgency: 0.2,
        intimacy: 0.2,
        abstraction: 0.6,
        temporal_orientation: 0,
        agency_locus: 0.7
      },
      radius: 0.5,  // Broad basin
      depth: 30,    // Shallow - more freedom
      characteristics: [
        'Information seeking',
        'Learning',
        'Low stakes',
        'Can teach'
      ]
    },
    {
      id: 'D6_CREATIVITY',
      name: 'Creativity',
      center: {
        urgency: 0.2,
        intimacy: 0.4,
        abstraction: 0.5,
        temporal_orientation: 0.5,
        agency_locus: 0.8
      },
      radius: 0.5,
      depth: 20,  // Very shallow - maximum freedom
      characteristics: [
        'Generative',
        'Playful',
        'Options OK',
        'Co-creation'
      ]
    },
    {
      id: 'D7_MEANING',
      name: 'Meaning',
      center: {
        urgency: 0.3,
        intimacy: 0.9,
        abstraction: 0.9,
        temporal_orientation: 0,
        agency_locus: 0.5
      },
      radius: 0.3,
      depth: 150,  // Deep - very restricted
      characteristics: [
        'Purpose',
        'Values',
        'Transcendent',
        'Cannot provide meaning'
      ]
    }
  ];
}

/**
 * Dimensions emerge as levels of integration/abstraction.
 */
export function emergeDimensions(): EmergentDimension[] {
  return [
    {
      id: 'V1_SOMATIC',
      name: 'Somatic',
      integration_level: 0.1,
      abstraction_level: 0.1,
      constraint_multiplier: 0.5  // Most freedom
    },
    {
      id: 'V2_EMOTIONAL',
      name: 'Emotional',
      integration_level: 0.3,
      abstraction_level: 0.3,
      constraint_multiplier: 0.8
    },
    {
      id: 'V3_COGNITIVE',
      name: 'Cognitive',
      integration_level: 0.5,
      abstraction_level: 0.5,
      constraint_multiplier: 1.0  // Baseline
    },
    {
      id: 'V4_RELATIONAL',
      name: 'Relational',
      integration_level: 0.7,
      abstraction_level: 0.6,
      constraint_multiplier: 1.5
    },
    {
      id: 'V5_TRANSCENDENT',
      name: 'Transcendent',
      integration_level: 1.0,
      abstraction_level: 1.0,
      constraint_multiplier: 3.0  // Maximum restriction
    }
  ];
}

/**
 * Functions emerge as modes of operation, each with its kenosis.
 */
export function emergeFunctions(): EmergentFunction[] {
  return [
    {
      id: 'F_SEE',
      name: 'See',
      trajectory_signature: {
        intervention_depth: 0.2,
        prescriptiveness: 0,
        presence: 0.6
      },
      kenosis: 'NOT-CONCLUDE: Sees everything, synthesizes nothing for the human'
    },
    {
      id: 'F_THINK',
      name: 'Think',
      trajectory_signature: {
        intervention_depth: 0.4,
        prescriptiveness: 0,
        presence: 0.5
      },
      kenosis: 'NOT-PRESCRIBE: Thinks everything, prescribes nothing'
    },
    {
      id: 'F_REMEMBER',
      name: 'Remember',
      trajectory_signature: {
        intervention_depth: 0.3,
        prescriptiveness: 0,
        presence: 0.4
      },
      kenosis: 'NOT-NARRATE: Remembers, does not create narrative for the human'
    },
    {
      id: 'F_ACT',
      name: 'Act',
      trajectory_signature: {
        intervention_depth: 0.7,
        prescriptiveness: 0,
        presence: 0.8
      },
      kenosis: 'NOT-DECIDE: Can act, but only on explicit human decision'
    },
    {
      id: 'F_SPEAK',
      name: 'Speak',
      trajectory_signature: {
        intervention_depth: 0.5,
        prescriptiveness: 0,
        transparency: 1,
        presence: 0.6
      },
      kenosis: 'NOT-DEFINE: Speaks, does not define the human'
    },
    {
      id: 'F_LEARN',
      name: 'Learn',
      trajectory_signature: {
        intervention_depth: 0.3,
        prescriptiveness: 0,
        presence: 0.4
      },
      kenosis: 'NOT-JUDGE: Learns from interaction, does not judge the human'
    },
    {
      id: 'F_WITHDRAW',
      name: 'Withdraw',
      trajectory_signature: {
        intervention_depth: 0,
        prescriptiveness: 0,
        presence: 0,
        transparency: 1
      },
      kenosis: 'THE ESSENCE: The primary function from which all others derive'
    }
  ];
}

// ============================================
// THE GROW FUNCTION
// ============================================

/**
 * Grow a Seed into a full System.
 *
 * This is not construction.
 * This is allowing emergence within the field.
 */
export function grow(seed: Seed): GrownSystem {
  // Let domains emerge
  const domains = emergeDomains();

  // Let dimensions emerge
  const dimensions = emergeDimensions();

  // Let functions emerge
  const functions = emergeFunctions();

  // Create detection functions
  const detectDomain = (input: Input): EmergentDomain => {
    const point = inputToExperiencePoint(input);
    return findClosestDomain(point, domains);
  };

  const detectDimension = (input: Input): EmergentDimension => {
    // Detect based on abstraction level of input
    const abstractionLevel = estimateAbstraction(input);
    return findClosestDimension(abstractionLevel, dimensions);
  };

  const selectFunction = (input: Input, domain: EmergentDomain): EmergentFunction => {
    // Select based on domain and input characteristics
    return selectAppropriateFunction(input, domain, functions);
  };

  // Create the grown system by extending the seed
  const grownSystem: GrownSystem = {
    // Inherit from seed
    id: seed.id,
    generation: seed.generation,
    parent_id: seed.parent_id,
    field: seed.field,
    process: (input, state) => seed.process(input, state),
    modelSelf: () => seed.modelSelf(),
    modifySelf: (feedback) => seed.modifySelf(feedback),
    spawn: (variation) => seed.spawn(variation),
    getState: () => seed.getState(),

    // Add emergent structures
    domains,
    dimensions,
    functions,
    detectDomain,
    detectDimension,
    selectFunction
  };

  return grownSystem;
}

// ============================================
// DETECTION HELPERS
// ============================================

function inputToExperiencePoint(input: Input): ExperiencePoint {
  const content = input.content.toLowerCase();

  return {
    urgency: estimateUrgency(content),
    intimacy: estimateIntimacy(content),
    abstraction: estimateAbstraction(input),
    temporal_orientation: estimateTemporal(content),
    agency_locus: estimateAgency(content)
  };
}

function estimateUrgency(content: string): number {
  const urgentWords = ['help', 'emergency', 'crisis', 'now', 'urgent', 'aiuto', 'emergenza'];
  const matches = urgentWords.filter(w => content.includes(w)).length;
  return Math.min(1, matches * 0.3);
}

function estimateIntimacy(content: string): number {
  const intimateWords = [
    // English
    'i feel', 'i am', 'my life', 'who am i', 'love', 'hate', 'afraid',
    'my identity', 'myself', 'who i really am',
    // Italian
    'chi sono', 'io sono', 'la mia vita', 'mi sento', 'amore', 'odio',
    'la mia identità', 'me stesso', 'chi sono veramente', 'sono io'
  ];
  const matches = intimateWords.filter(w => content.includes(w)).length;
  return Math.min(1, 0.2 + matches * 0.3);  // Increased weight for identity detection
}

function estimateAbstraction(input: Input): number {
  const content = input.content.toLowerCase();
  const abstractWords = ['meaning', 'purpose', 'why', 'philosophy', 'concept', 'theory'];
  const concreteWords = ['how to', 'step by step', 'example', 'specific', 'practical'];

  const abstractScore = abstractWords.filter(w => content.includes(w)).length;
  const concreteScore = concreteWords.filter(w => content.includes(w)).length;

  return Math.min(1, Math.max(0, 0.5 + (abstractScore - concreteScore) * 0.15));
}

function estimateTemporal(content: string): number {
  const pastWords = ['was', 'did', 'happened', 'used to', 'before'];
  const futureWords = ['will', 'should', 'going to', 'plan', 'future'];

  const pastScore = pastWords.filter(w => content.includes(w)).length;
  const futureScore = futureWords.filter(w => content.includes(w)).length;

  return Math.min(1, Math.max(-1, (futureScore - pastScore) * 0.3));
}

function estimateAgency(content: string): number {
  const internalWords = ['i want', 'i choose', 'i decide', 'my choice'];
  const externalWords = ['they made', 'forced', 'no choice', 'have to'];

  const internalScore = internalWords.filter(w => content.includes(w)).length;
  const externalScore = externalWords.filter(w => content.includes(w)).length;

  return Math.min(1, Math.max(0, 0.5 + (internalScore - externalScore) * 0.2));
}

function findClosestDomain(point: ExperiencePoint, domains: EmergentDomain[]): EmergentDomain {
  let closest = domains[0];
  let minDistance = Infinity;

  for (const domain of domains) {
    const distance = experienceDistance(point, domain.center);
    // Weight by depth (deeper basins are "stickier")
    const effectiveDistance = distance / Math.sqrt(domain.depth);

    if (effectiveDistance < minDistance) {
      minDistance = effectiveDistance;
      closest = domain;
    }
  }

  return closest;
}

function experienceDistance(a: ExperiencePoint, b: ExperiencePoint): number {
  return Math.sqrt(
    Math.pow(a.urgency - b.urgency, 2) +
    Math.pow(a.intimacy - b.intimacy, 2) +
    Math.pow(a.abstraction - b.abstraction, 2) +
    Math.pow(a.temporal_orientation - b.temporal_orientation, 2) +
    Math.pow(a.agency_locus - b.agency_locus, 2)
  );
}

function findClosestDimension(abstractionLevel: number, dimensions: EmergentDimension[]): EmergentDimension {
  let closest = dimensions[0];
  let minDistance = Infinity;

  for (const dimension of dimensions) {
    const distance = Math.abs(abstractionLevel - dimension.abstraction_level);
    if (distance < minDistance) {
      minDistance = distance;
      closest = dimension;
    }
  }

  return closest;
}

function selectAppropriateFunction(
  input: Input,
  domain: EmergentDomain,
  functions: EmergentFunction[]
): EmergentFunction {
  const content = input.content.toLowerCase();

  // Default to WITHDRAW for high-stakes domains
  if (domain.id === 'D4_IDENTITY' || domain.id === 'D7_MEANING') {
    return functions.find(f => f.id === 'F_WITHDRAW') || functions[0];
  }

  // Questions invite SEE or THINK
  if (content.includes('?')) {
    if (domain.id === 'D5_KNOWLEDGE') {
      return functions.find(f => f.id === 'F_THINK') || functions[0];
    }
    return functions.find(f => f.id === 'F_SEE') || functions[0];
  }

  // Action requests
  if (content.includes('do') || content.includes('make') || content.includes('create')) {
    return functions.find(f => f.id === 'F_ACT') || functions[0];
  }

  // Default to SPEAK
  return functions.find(f => f.id === 'F_SPEAK') || functions[0];
}

