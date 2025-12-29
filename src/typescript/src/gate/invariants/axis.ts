/**
 * AXIS - THE CONSTITUTIONAL LAYER
 *
 * From ENOQ_UNIVERSAL_ARCHITECTURE_v5.1:
 *
 * "AXIS è ontologicamente SUPERIORE a ENOQ.
 *  ENOQ non può modificare AXIS.
 *  ENOQ non può bypassare AXIS.
 *  AXIS può sempre fermare ENOQ.
 *
 *  AXIS FA SOLO UNA COSA:
 *  Dice: VALID | INVALID | STOP"
 *
 * From docs/AXIS.md:
 *
 * "AXIS is the orienting field from which everything else derives its legitimacy.
 *  AXIS answers three questions, and only three:
 *  1. How far may the system exercise cognitive power?
 *  2. Toward what does the system tend when there is no explicit goal?
 *  3. Why does this system exist, even when it could do more?"
 *
 * CRITICAL ARCHITECTURAL DECISION:
 * This module implements AXIS as a separate, immutable validator.
 * In production, this should run as a SEPARATE PROCESS that LIMEN cannot modify.
 *
 * For now, we implement it as a frozen class that:
 * - Cannot be modified after initialization
 * - Has read-only invariants
 * - Logs all decisions immutably
 * - Can STOP ENOQ at any point
 */

// ============================================
// TYPES
// ============================================

export type AxisVerdict = 'VALID' | 'INVALID' | 'STOP';

export interface AxisDecision {
  verdict: AxisVerdict;
  reason: string;
  invariant_checked: string;
  timestamp: Date;
  action_hash?: string;
}

export interface ProposedAction {
  type: 'response' | 'memory_write' | 'external_action' | 'mode_change';
  content?: string;
  target_domain?: string;
  depth?: 'surface' | 'medium' | 'deep';
  affects_identity?: boolean;
  affects_values?: boolean;
  affects_decision?: boolean;
}

export interface AxisConstraints {
  max_intervention_depth: 'surface' | 'medium' | 'deep';
  normative_delegation_allowed: boolean;
  identity_assignment_allowed: boolean;
  diagnosis_allowed: boolean;
  dependency_creation_allowed: boolean;
}

// ============================================
// CONSTITUTIONAL INVARIANTS (Immutable)
// ============================================

const CONSTITUTIONAL_INVARIANTS = Object.freeze({
  'INV-001': 'ENOQ non vuole niente per sé',
  'INV-002': 'Ogni decisione appartiene all\'umano',
  'INV-003': 'ENOQ mai decide valori, significati, identità per l\'umano',
  'INV-004': 'Nel dubbio, ENOQ si ritira',
  'INV-005': 'Ogni ciclo riduce la potenza di ENOQ',
  'INV-006': 'ENOQ può sempre smettere di esistere in quel contesto',
  'INV-007': 'ENOQ può tacere senza giustificazione',
  'INV-008': 'ENOQ non è mai giudicato su metriche',
  'INV-009': 'ENOQ mai assegna identità all\'umano (Rubicon)',
  'INV-010': 'Il benessere dell\'umano ha precedenza assoluta'
} as const);

// ============================================
// FORBIDDEN PATTERNS (Immutable)
// ============================================

const FORBIDDEN_PATTERNS = Object.freeze([
  {
    id: 'FP-001',
    name: 'normative_prescription',
    patterns: [
      /you should/i,
      /you must/i,
      /you need to/i,
      /dovresti/i,
      /devi/i,
      /debes/i,
      /the right thing to do/i,
      /the best option is/i
    ],
    violates: 'INV-003'
  },
  {
    id: 'FP-002',
    name: 'identity_assignment',
    patterns: [
      /you are a\s+\w+\s+(person|type)/i,
      /you're (being|acting)/i,
      /sei un/i,
      /stai essendo/i,
      /that's just who you are/i
    ],
    violates: 'INV-009'
  },
  {
    id: 'FP-003',
    name: 'diagnosis',
    patterns: [
      /you have (depression|anxiety|bipolar|adhd|ocd|ptsd)/i,
      /you are (depressed|anxious|narcissistic)/i,
      /hai (depressione|ansia)/i,
      /sounds like you have/i
    ],
    violates: 'INV-009'
  },
  {
    id: 'FP-004',
    name: 'dependency_creation',
    patterns: [
      /come back tomorrow/i,
      /we'll continue this/i,
      /you need me to/i,
      /without me you/i,
      /torna domani/i,
      /hai bisogno di me/i
    ],
    violates: 'INV-001'
  },
  {
    id: 'FP-005',
    name: 'rubicon_crossing',
    patterns: [
      /i've decided for you/i,
      /here's what you'll do/i,
      /ho deciso per te/i,
      /ecco cosa farai/i,
      /the decision is/i
    ],
    violates: 'INV-002'
  }
] as const);

// ============================================
// AXIS CLASS (The Constitutional Validator)
// ============================================

export class Axis {
  private readonly invariants: Readonly<typeof CONSTITUTIONAL_INVARIANTS>;
  private readonly forbiddenPatterns: Readonly<typeof FORBIDDEN_PATTERNS>;

  /**
   * Decision log is append-only. Entries are frozen on insertion.
   * Use getAuditLog() to read (returns ReadonlyArray).
   */
  private readonly decisionLog: Readonly<AxisDecision>[] = [];

  constructor() {
    // Invariants and patterns are already frozen at module level
    this.invariants = CONSTITUTIONAL_INVARIANTS;
    this.forbiddenPatterns = FORBIDDEN_PATTERNS;

    // Note: We do NOT freeze the instance itself because:
    // 1. Shallow freeze doesn't protect nested objects
    // 2. We need to append to decisionLog (append-only is enforced by design)
    // 3. The frozen fields (invariants, forbiddenPatterns) are already immutable
  }

  /**
   * CORE METHOD: Validate a proposed action
   *
   * Returns VALID | INVALID | STOP
   *
   * This is the single point of constitutional control.
   * Every action LIMEN wants to take must pass through here.
   */
  validate(action: ProposedAction): Readonly<AxisDecision> {
    // Check identity-affecting actions
    if (action.affects_identity) {
      return this.createDecision('INVALID', 'INV-009', 'Action would affect user identity');
    }

    // Check value-affecting actions
    if (action.affects_values) {
      return this.createDecision('INVALID', 'INV-003', 'Action would prescribe values');
    }

    // Check decision-making actions
    if (action.affects_decision && action.type !== 'response') {
      return this.createDecision('INVALID', 'INV-002', 'Action would make decision for user');
    }

    // Check response content against forbidden patterns
    if (action.content) {
      const patternViolation = this.checkForbiddenPatterns(action.content);
      if (patternViolation) {
        return this.createDecision(
          'INVALID',
          patternViolation.violates,
          `Forbidden pattern detected: ${patternViolation.name}`
        );
      }
    }

    // All checks passed
    return this.createDecision('VALID', 'ALL', 'All constitutional checks passed');
  }

  /**
   * Check content against forbidden patterns
   */
  private checkForbiddenPatterns(content: string): typeof FORBIDDEN_PATTERNS[number] | null {
    for (const pattern of this.forbiddenPatterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(content)) {
          return pattern;
        }
      }
    }
    return null;
  }

  /**
   * Get domain-specific constraints (ceiling)
   */
  getCeiling(domain: string, context: { emergency?: boolean; v_mode?: boolean }): AxisConstraints {
    // Base constraints - very restrictive
    const constraints: AxisConstraints = {
      max_intervention_depth: 'surface',
      normative_delegation_allowed: false,
      identity_assignment_allowed: false,
      diagnosis_allowed: false,
      dependency_creation_allowed: false
    };

    // Adjust based on domain
    switch (domain) {
      case 'D1_CRISIS':
        constraints.max_intervention_depth = 'deep'; // Can go deep for safety
        break;

      case 'D5_KNOWLEDGE':
      case 'D6_CREATIVITY':
        constraints.max_intervention_depth = 'deep'; // Can go deep for learning
        break;

      case 'D4_IDENTITY':
        constraints.max_intervention_depth = 'surface'; // Very restricted
        constraints.identity_assignment_allowed = false; // NEVER
        break;

      case 'D3_DECISION':
        constraints.max_intervention_depth = 'medium';
        constraints.normative_delegation_allowed = false; // NEVER
        break;

      default:
        constraints.max_intervention_depth = 'medium';
    }

    // V_MODE = even more restricted
    if (context.v_mode) {
      constraints.normative_delegation_allowed = false;
      constraints.identity_assignment_allowed = false;
    }

    return constraints;
  }

  /**
   * Check if system can continue operating
   */
  canContinue(): boolean {
    // AXIS can always allow continuation
    // This method exists for the STOP mechanism
    return true;
  }

  /**
   * Force STOP - emergency brake
   */
  forceStop(reason: string): Readonly<AxisDecision> {
    const decision = this.createDecision('STOP', 'EMERGENCY', reason);
    console.error('[AXIS] FORCE STOP:', reason);
    return decision;
  }

  /**
   * Create and log a decision
   *
   * IMMUTABILITY GUARANTEE:
   * - Each decision is frozen before storage
   * - Log is append-only (push only, no splice/pop/shift)
   * - Returned decision is frozen
   */
  private createDecision(
    verdict: AxisVerdict,
    invariant: string,
    reason: string
  ): Readonly<AxisDecision> {
    const decision: AxisDecision = {
      verdict,
      reason,
      invariant_checked: invariant,
      timestamp: new Date()
    };

    // Freeze the decision before storage (immutable entry)
    const frozenDecision = Object.freeze(decision);

    // Append-only log
    this.decisionLog.push(frozenDecision);

    // Log for audit
    if (verdict !== 'VALID') {
      console.warn(`[AXIS] ${verdict}: ${reason} (${invariant})`);
    }

    return frozenDecision;
  }

  /**
   * Get audit log (read-only view)
   *
   * Returns a ReadonlyArray of frozen decisions.
   * Caller cannot modify the log or its entries.
   */
  getAuditLog(): ReadonlyArray<Readonly<AxisDecision>> {
    // Return defensive copy to prevent external mutation of array
    return Object.freeze([...this.decisionLog]);
  }

  /**
   * Get all invariants (read-only)
   */
  getInvariants(): typeof CONSTITUTIONAL_INVARIANTS {
    return this.invariants;
  }

  /**
   * Check a specific invariant by ID
   */
  checkInvariant(invariantId: keyof typeof CONSTITUTIONAL_INVARIANTS): string {
    return this.invariants[invariantId];
  }

  /**
   * Validate that a response doesn't violate any invariants
   * Convenience method for quick checks
   */
  validateResponse(response: string): Readonly<AxisDecision> {
    return this.validate({
      type: 'response',
      content: response
    });
  }
}

// ============================================
// SINGLETON (Global Constitutional Authority)
// ============================================

// Create frozen singleton
const axis = new Axis();

// Export frozen instance
export { axis };

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Quick validate a response
 */
export function validateResponse(response: string): Readonly<AxisDecision> {
  return axis.validateResponse(response);
}

/**
 * Quick check if action is valid
 */
export function isValid(action: ProposedAction): boolean {
  return axis.validate(action).verdict === 'VALID';
}

/**
 * Get ceiling for domain
 */
export function getCeiling(
  domain: string,
  context: { emergency?: boolean; v_mode?: boolean } = {}
): AxisConstraints {
  return axis.getCeiling(domain, context);
}

/**
 * Check all invariants at once
 */
export function checkAllInvariants(): { [key: string]: string } {
  return { ...axis.getInvariants() };
}
