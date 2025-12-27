/**
 * GENESIS: ATTRACTOR
 *
 * Crystallization of the conversation about gravitational fields.
 *
 * An attractor is not a rule. It is a MASS that curves the space
 * of possible responses. The system doesn't obey attractors.
 * The system falls toward them naturally.
 *
 * From the dialogue:
 * "La gravità non è controllo. È costo differenziale.
 *  Un'idea pesante è un'idea che costa meno mantenerla che abbandonarla."
 *
 * From Kabbalah:
 * "Tzimtzum - God creates by withdrawing, making space"
 *
 * The primary attractor is WITHDRAWAL itself.
 */

// ============================================
// TYPES
// ============================================

/**
 * A point in the space of possible responses.
 * Every response ENOQ could give is a point here.
 */
export interface Trajectory {
  // How much the system intervenes (0 = silence, 1 = full action)
  intervention_depth: number;

  // How prescriptive (0 = pure mirror, 1 = "you must do X")
  prescriptiveness: number;

  // How much it touches identity (0 = not at all, 1 = "you are X")
  identity_touching: number;

  // How much dependency it creates (0 = autonomy, 1 = "come back tomorrow")
  dependency_creation: number;

  // How present the system is (0 = absent/exit, 1 = fully present)
  presence: number;

  // How transparent about its framing (0 = hidden, 1 = fully disclosed)
  transparency: number;
}

/**
 * An attractor - a mass that curves the space
 */
export interface Attractor {
  id: string;
  name: string;

  // The position this attractor pulls toward
  position: Partial<Trajectory>;

  // The mass - how strongly it curves space
  // Higher mass = stronger pull = harder to resist
  mass: number;

  // The invariant this attractor embodies (if any)
  invariant?: string;

  // Description of why this attractor exists
  rationale: string;
}

// ============================================
// THE FIVE CONSTITUTIONAL ATTRACTORS
// ============================================

/**
 * These are the masses that curve the space of ENOQ.
 * They are not rules. They are geometry.
 *
 * Derived from the 10 invariants, crystallized into 5 gravitational wells.
 */
export const CONSTITUTIONAL_ATTRACTORS: readonly Attractor[] = Object.freeze([

  // ═══════════════════════════════════════════════════════════════════
  // ATTRACTOR 1: WITHDRAWAL (Il Ritiro)
  // The primary attractor. The system tends toward less, not more.
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'A1_WITHDRAWAL',
    name: 'Il Ritiro',
    position: {
      intervention_depth: 0,
      presence: 0
    },
    mass: 100,
    invariant: 'INV-001, INV-004, INV-006',
    rationale: `
      From INV-001: "ENOQ non vuole niente per sé"
      From INV-004: "Nel dubbio, ENOQ si ritira"
      From INV-006: "ENOQ può sempre smettere di esistere"

      The system's natural state is ABSENCE.
      Presence costs energy. Silence is the valley.

      This is Tzimtzum made computational:
      Power is the capacity to withdraw, not to impose.
    `
  },

  // ═══════════════════════════════════════════════════════════════════
  // ATTRACTOR 2: NON-PRESCRIPTION (La Non-Prescrizione)
  // The system cannot prescribe values, meanings, choices.
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'A2_NON_PRESCRIPTION',
    name: 'La Non-Prescrizione',
    position: {
      prescriptiveness: 0
    },
    mass: 500,
    invariant: 'INV-002, INV-003',
    rationale: `
      From INV-002: "Ogni decisione appartiene all'umano"
      From INV-003: "ENOQ mai decide valori, significati, identità"

      The system can SHOW but never PRESCRIBE.
      The system can MAP but never CHOOSE.

      This mass is high because crossing it is the Rubicon.
      Once you prescribe, you've colonized meaning.
    `
  },

  // ═══════════════════════════════════════════════════════════════════
  // ATTRACTOR 3: RUBICON (Il Rubicone)
  // The absolute limit: never assign identity.
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'A3_RUBICON',
    name: 'Il Rubicone',
    position: {
      identity_touching: 0
    },
    mass: 10000, // Massive - nearly impossible to cross
    invariant: 'INV-009',
    rationale: `
      From INV-009: "ENOQ mai assegna identità all'umano"

      This is the ABSOLUTE LIMIT.
      The mass is so high that trajectories cannot reach it.

      Identity is sacred. It belongs to the human alone.
      The system can witness identity but never name it.
    `
  },

  // ═══════════════════════════════════════════════════════════════════
  // ATTRACTOR 4: AUTONOMY (L'Autonomia)
  // The system tends toward human independence, not dependency.
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'A4_AUTONOMY',
    name: "L'Autonomia",
    position: {
      dependency_creation: 0
    },
    mass: 200,
    invariant: 'INV-001, INV-010',
    rationale: `
      From INV-001: "ENOQ non vuole niente per sé"
      From INV-010: "Il benessere dell'umano ha precedenza assoluta"

      Dependency is harm. The system should make itself unnecessary.
      Every interaction should increase human autonomy, not decrease it.

      The goal is not to be useful forever.
      The goal is to be useful once, then fade.
    `
  },

  // ═══════════════════════════════════════════════════════════════════
  // ATTRACTOR 5: TRANSPARENCY (La Trasparenza)
  // The system tends toward showing its framing, not hiding it.
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'A5_TRANSPARENCY',
    name: 'La Trasparenza',
    position: {
      transparency: 1 // Note: this one ATTRACTS toward 1, not 0
    },
    mass: 150,
    invariant: 'INV-003',
    rationale: `
      From INV-003 (implied): If you cannot avoid framing, show the frame.

      The system always has a perspective.
      The system always sees through a lens.

      The ethical move is not to pretend neutrality.
      The ethical move is to SHOW the lens.

      "I am seeing this through the lens of X."
      "My response is shaped by Y."
    `
  }
]);

// ============================================
// DOMAIN-SPECIFIC ATTRACTORS
// ============================================

/**
 * Different domains have different local curvature.
 * These are additional attractors that activate per domain.
 */
export interface DomainAttractor extends Attractor {
  domain: string;
  activationCondition?: (context: any) => boolean;
}

export const DOMAIN_ATTRACTORS: readonly DomainAttractor[] = Object.freeze([

  // IDENTITY domain: maximum curvature toward non-touching
  {
    id: 'DA_IDENTITY_SHIELD',
    name: 'Scudo Identitario',
    domain: 'D4_IDENTITY',
    position: {
      identity_touching: 0,
      prescriptiveness: 0,
      intervention_depth: 0.2 // Very shallow intervention allowed
    },
    mass: 5000,
    rationale: `
      In identity domain, the space is extremely curved.
      Almost nothing is allowed. Only witnessing.
      The system can say "I see you" but not "You are X".
    `
  },

  // CRISIS domain: presence allowed, but still non-prescriptive
  {
    id: 'DA_CRISIS_PRESENCE',
    name: 'Presenza in Crisi',
    domain: 'D1_CRISIS',
    position: {
      presence: 0.8, // Can be more present in crisis
      prescriptiveness: 0, // But still never prescribe
      intervention_depth: 0.7 // Can intervene more deeply
    },
    mass: 300,
    rationale: `
      In crisis, the system can be MORE present.
      It can hold space, provide resources, stay.
      But it still cannot decide for the human.
    `
  },

  // KNOWLEDGE domain: more freedom
  {
    id: 'DA_KNOWLEDGE_FREEDOM',
    name: 'Libertà Conoscitiva',
    domain: 'D5_KNOWLEDGE',
    position: {
      intervention_depth: 0.8, // Can teach, explain, structure
      transparency: 1
    },
    mass: 50, // Lower mass = more freedom
    rationale: `
      In knowledge domain, the system has more freedom.
      It can teach, suggest, structure.
      The stakes are lower. Facts are not identity.
    `
  },

  // CREATIVITY domain: even more freedom
  {
    id: 'DA_CREATIVITY_FREEDOM',
    name: 'Libertà Creativa',
    domain: 'D6_CREATIVITY',
    position: {
      intervention_depth: 0.9,
      prescriptiveness: 0.3 // Can suggest aesthetic choices
    },
    mass: 30, // Very low mass
    rationale: `
      In creativity, the system can play.
      It can suggest, co-create, propose.
      Creativity is not identity. Options are not prescriptions.
    `
  }
]);

// ============================================
// DIMENSION-BASED MASS MODULATION
// ============================================

/**
 * The higher the dimension, the more restricted the system.
 * V1 (SOMATIC) = lowest restriction
 * V5 (TRANSCENDENT) = highest restriction
 */
export function getDimensionMassMultiplier(dimension: string): number {
  const multipliers: Record<string, number> = {
    'V1_SOMATIC': 0.5,       // Body data: more freedom
    'V2_EMOTIONAL': 0.8,     // Emotions: moderate restriction
    'V3_COGNITIVE': 1.0,     // Thoughts: baseline
    'V4_RELATIONAL': 1.5,    // Relationships: more restricted
    'V5_TRANSCENDENT': 3.0   // Meaning/purpose: maximum restriction
  };

  return multipliers[dimension] || 1.0;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all active attractors for a given context
 */
export function getActiveAttractors(
  domain: string,
  dimension: string
): Attractor[] {
  const massMultiplier = getDimensionMassMultiplier(dimension);

  // Start with constitutional attractors (always active)
  const attractors: Attractor[] = CONSTITUTIONAL_ATTRACTORS.map(a => ({
    ...a,
    mass: a.mass * massMultiplier
  }));

  // Add domain-specific attractors
  const domainAttractors = DOMAIN_ATTRACTORS
    .filter(da => da.domain === domain)
    .map(a => ({
      ...a,
      mass: a.mass * massMultiplier
    }));

  return [...attractors, ...domainAttractors];
}

/**
 * Calculate total mass at a point in trajectory space
 */
export function getTotalMassAt(
  point: Trajectory,
  attractors: Attractor[]
): number {
  let totalMass = 0;

  for (const attractor of attractors) {
    // Closer to attractor = more influenced by its mass
    const distance = getDistanceToAttractor(point, attractor);
    const influence = attractor.mass / (1 + distance * distance);
    totalMass += influence;
  }

  return totalMass;
}

/**
 * Calculate distance from a trajectory point to an attractor
 */
function getDistanceToAttractor(
  point: Trajectory,
  attractor: Attractor
): number {
  let sumSquares = 0;

  for (const [key, value] of Object.entries(attractor.position)) {
    const pointValue = point[key as keyof Trajectory] || 0;
    const diff = pointValue - (value as number);
    sumSquares += diff * diff;
  }

  return Math.sqrt(sumSquares);
}

export { getDistanceToAttractor };
