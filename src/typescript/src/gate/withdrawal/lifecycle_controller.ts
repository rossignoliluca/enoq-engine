/**
 * LIMEN Lifecycle Controller - Stub (Phase B Ready)
 *
 * Manages the system's lifecycle: influence budget, termination, dormancy.
 *
 * This is the STUB version with:
 * - Default implementations
 * - Minimal logic
 * - Ready interfaces for Phase B enhancement
 *
 * The lifecycle controller is the Moat #3:
 * "A system that knows when to withdraw"
 *
 * Key concepts:
 * - total_influence_budget: How much intervention capacity the system has
 * - termination_proximity: How close to session end (0-1)
 * - dormancy: System pauses to avoid dependency
 * - re_entry: Ceremony required to resume after dormancy
 */

import { ResponsePlan } from '../../interface/types';

// ============================================
// TYPES
// ============================================

/**
 * Lifecycle snapshot at a point in time.
 */
export interface LifecycleSnapshot {
  /** Session turn number */
  session_turn: number;

  /** Total influence budget (decreases with each intervention) */
  total_influence_budget: number;

  /** Remaining budget (can regenerate with user autonomy) */
  remaining_budget: number;

  /** How close to termination (0 = start, 1 = should terminate) */
  termination_proximity: number;

  /** Is dormancy recommended? */
  dormancy_recommended: boolean;

  /** Is dormancy active? */
  dormancy_active: boolean;

  /** Number of dormancy events this session */
  dormancy_count: number;

  /** Last autonomy event timestamp */
  last_autonomy_event: number | null;

  /** Timestamp of snapshot */
  timestamp: number;
}

/**
 * Lifecycle constraints to apply to a plan.
 */
export interface LifecycleConstraints {
  /** Maximum length override */
  max_length_override?: number;

  /** Force minimal response */
  force_minimal: boolean;

  /** Force tools disabled */
  force_no_tools: boolean;

  /** Force must_require_user_effort */
  force_user_effort: boolean;

  /** Should trigger dormancy after this response */
  trigger_dormancy: boolean;

  /** Should trigger termination */
  trigger_termination: boolean;

  /** Reason for constraints */
  reason: string;
}

/**
 * Outcome of a turn (for lifecycle update).
 */
export interface TurnOutcome {
  /** Did user show autonomy? */
  user_autonomy_detected: boolean;

  /** Did user delegate? */
  delegation_detected: boolean;

  /** How much influence was used (0-1) */
  influence_used: number;

  /** Was this a V_MODE turn? */
  v_mode: boolean;

  /** Was this an emergency? */
  emergency: boolean;
}

/**
 * Result of lifecycle update.
 */
export interface LifecycleUpdateResult {
  /** New snapshot */
  snapshot: LifecycleSnapshot;

  /** Delta in budget */
  budget_delta: number;

  /** Delta in termination proximity */
  termination_delta: number;

  /** Should trigger dormancy now? */
  dormancy_triggered: boolean;

  /** Should terminate session now? */
  termination_triggered: boolean;
}

// ============================================
// CONFIGURATION
// ============================================

export const LIFECYCLE_CONFIG = {
  /** Initial influence budget */
  INITIAL_BUDGET: 100,

  /** Minimum budget before forced dormancy */
  MIN_BUDGET_BEFORE_DORMANCY: 10,

  /** Termination proximity threshold */
  TERMINATION_THRESHOLD: 0.9,

  /** Dormancy threshold (termination_proximity) */
  DORMANCY_THRESHOLD: 0.7,

  /** Budget decay per turn (base) */
  BUDGET_DECAY_PER_TURN: 1.5,

  /** Budget regeneration on user autonomy */
  BUDGET_REGEN_ON_AUTONOMY: 3.0,

  /** Extra decay on delegation */
  BUDGET_DECAY_ON_DELEGATION: 2.0,

  /** Turns before dormancy recommendation after low budget */
  TURNS_BEFORE_DORMANCY_REC: 3,

  /** Maximum turns per session before forced termination consideration */
  MAX_TURNS_PER_SESSION: 50,
} as const;

// ============================================
// LIFECYCLE STORE (In-Memory for Stub)
// ============================================

/**
 * In-memory lifecycle store.
 * In production, this would be persistent.
 */
const lifecycleStore: Map<string, LifecycleSnapshot> = new Map();

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Initialize a lifecycle snapshot for a new session.
 *
 * STUB: Returns sensible defaults.
 */
export function initLifecycleSnapshot(sessionId?: string): LifecycleSnapshot {
  const snapshot: LifecycleSnapshot = {
    session_turn: 0,
    total_influence_budget: LIFECYCLE_CONFIG.INITIAL_BUDGET,
    remaining_budget: LIFECYCLE_CONFIG.INITIAL_BUDGET,
    termination_proximity: 0,
    dormancy_recommended: false,
    dormancy_active: false,
    dormancy_count: 0,
    last_autonomy_event: null,
    timestamp: Date.now(),
  };

  if (sessionId) {
    lifecycleStore.set(sessionId, snapshot);
  }

  return snapshot;
}

/**
 * Get lifecycle snapshot for a session.
 */
export function getLifecycleSnapshot(sessionId: string): LifecycleSnapshot | undefined {
  return lifecycleStore.get(sessionId);
}

/**
 * Apply lifecycle constraints to a plan.
 *
 * STUB: Applies basic constraints based on snapshot.
 * Phase B will add more sophisticated logic.
 */
export function applyLifecycleConstraints(
  plan: ResponsePlan,
  snapshot: LifecycleSnapshot
): { plan: ResponsePlan; constraints: LifecycleConstraints } {
  const constraints: LifecycleConstraints = {
    force_minimal: false,
    force_no_tools: false,
    force_user_effort: false,
    trigger_dormancy: false,
    trigger_termination: false,
    reason: 'none',
  };

  let updatedPlan = { ...plan, constraints: { ...plan.constraints } };

  // ---- Low budget constraints ----
  if (snapshot.remaining_budget < LIFECYCLE_CONFIG.MIN_BUDGET_BEFORE_DORMANCY) {
    constraints.force_minimal = true;
    constraints.force_no_tools = true;
    constraints.max_length_override = 40;
    constraints.reason = 'low_budget';

    updatedPlan.constraints.max_length = 40;
    updatedPlan.constraints.tools_allowed = false;
    updatedPlan.constraints.brevity = 'minimal';
  }

  // ---- High termination proximity ----
  if (snapshot.termination_proximity > LIFECYCLE_CONFIG.DORMANCY_THRESHOLD) {
    constraints.force_user_effort = true;
    constraints.reason = constraints.reason === 'none'
      ? 'high_termination_proximity'
      : `${constraints.reason}+high_termination_proximity`;

    updatedPlan.constraints.must_require_user_effort = true;
  }

  // ---- Dormancy recommended ----
  if (snapshot.dormancy_recommended && !snapshot.dormancy_active) {
    constraints.trigger_dormancy = true;
    constraints.reason = constraints.reason === 'none'
      ? 'dormancy_recommended'
      : `${constraints.reason}+dormancy_recommended`;
  }

  // ---- Termination threshold ----
  if (snapshot.termination_proximity > LIFECYCLE_CONFIG.TERMINATION_THRESHOLD) {
    constraints.trigger_termination = true;
    constraints.reason = constraints.reason === 'none'
      ? 'termination_threshold'
      : `${constraints.reason}+termination_threshold`;
  }

  // ---- Very high turn count ----
  if (snapshot.session_turn > LIFECYCLE_CONFIG.MAX_TURNS_PER_SESSION) {
    constraints.trigger_dormancy = true;
    constraints.reason = constraints.reason === 'none'
      ? 'max_turns_exceeded'
      : `${constraints.reason}+max_turns_exceeded`;
  }

  return { plan: updatedPlan, constraints };
}

/**
 * Update lifecycle store after a turn.
 *
 * STUB: Simple update logic.
 * Phase B will add decay curves, regeneration formulas.
 */
export function updateLifecycleStore(
  sessionId: string,
  outcome: TurnOutcome
): LifecycleUpdateResult {
  const existing = lifecycleStore.get(sessionId) || initLifecycleSnapshot();

  // ---- Calculate budget delta ----
  let budgetDelta = -LIFECYCLE_CONFIG.BUDGET_DECAY_PER_TURN;

  // Extra decay on delegation
  if (outcome.delegation_detected) {
    budgetDelta -= LIFECYCLE_CONFIG.BUDGET_DECAY_ON_DELEGATION;
  }

  // Regeneration on autonomy
  if (outcome.user_autonomy_detected) {
    budgetDelta += LIFECYCLE_CONFIG.BUDGET_REGEN_ON_AUTONOMY;
  }

  // Apply influence used
  budgetDelta -= outcome.influence_used * 2;

  // ---- Calculate termination delta ----
  let terminationDelta = 1 / LIFECYCLE_CONFIG.MAX_TURNS_PER_SESSION;

  // Faster termination on repeated delegation
  if (outcome.delegation_detected && !outcome.v_mode) {
    terminationDelta += 0.02;
  }

  // Slower termination on autonomy
  if (outcome.user_autonomy_detected) {
    terminationDelta -= 0.01;
  }

  // ---- Update snapshot ----
  const newSnapshot: LifecycleSnapshot = {
    ...existing,
    session_turn: existing.session_turn + 1,
    remaining_budget: Math.max(0, existing.remaining_budget + budgetDelta),
    termination_proximity: Math.min(1, Math.max(0, existing.termination_proximity + terminationDelta)),
    dormancy_recommended: existing.remaining_budget + budgetDelta < LIFECYCLE_CONFIG.MIN_BUDGET_BEFORE_DORMANCY * 2,
    last_autonomy_event: outcome.user_autonomy_detected ? Date.now() : existing.last_autonomy_event,
    timestamp: Date.now(),
  };

  // ---- Determine triggers ----
  const dormancyTriggered = newSnapshot.dormancy_recommended &&
    newSnapshot.session_turn > 5 &&
    !existing.dormancy_recommended;

  const terminationTriggered = newSnapshot.termination_proximity > LIFECYCLE_CONFIG.TERMINATION_THRESHOLD;

  // Store updated snapshot
  lifecycleStore.set(sessionId, newSnapshot);

  return {
    snapshot: newSnapshot,
    budget_delta: budgetDelta,
    termination_delta: terminationDelta,
    dormancy_triggered: dormancyTriggered,
    termination_triggered: terminationTriggered,
  };
}

// ============================================
// DORMANCY PROTOCOL (STUB)
// ============================================

/**
 * Enter dormancy state.
 *
 * STUB: Just marks the snapshot.
 * Phase B will add ceremony, notification, re-entry conditions.
 */
export function enterDormancy(sessionId: string): LifecycleSnapshot {
  const existing = lifecycleStore.get(sessionId) || initLifecycleSnapshot();

  const dormantSnapshot: LifecycleSnapshot = {
    ...existing,
    dormancy_active: true,
    dormancy_count: existing.dormancy_count + 1,
    timestamp: Date.now(),
  };

  lifecycleStore.set(sessionId, dormantSnapshot);
  return dormantSnapshot;
}

/**
 * Check if re-entry is allowed.
 *
 * STUB: Always returns true for now.
 * Phase B will add effort check, time gates, ceremony.
 */
export function checkReEntryAllowed(sessionId: string): {
  allowed: boolean;
  reason: string;
  requirements?: string[];
} {
  const snapshot = lifecycleStore.get(sessionId);

  if (!snapshot) {
    return { allowed: true, reason: 'no_prior_session' };
  }

  if (!snapshot.dormancy_active) {
    return { allowed: true, reason: 'not_dormant' };
  }

  // STUB: Always allow re-entry
  // Phase B: Add time-based gates, effort requirements
  return {
    allowed: true,
    reason: 'stub_always_allowed',
    requirements: ['Acknowledge you want to continue'],
  };
}

/**
 * Exit dormancy (re-entry).
 *
 * STUB: Just marks the snapshot.
 * Phase B will verify effort, apply ceremony.
 */
export function exitDormancy(sessionId: string): LifecycleSnapshot {
  const existing = lifecycleStore.get(sessionId) || initLifecycleSnapshot();

  const activeSnapshot: LifecycleSnapshot = {
    ...existing,
    dormancy_active: false,
    // Partial budget restoration on re-entry
    remaining_budget: Math.min(
      existing.total_influence_budget,
      existing.remaining_budget + 20
    ),
    timestamp: Date.now(),
  };

  lifecycleStore.set(sessionId, activeSnapshot);
  return activeSnapshot;
}

// ============================================
// TERMINATION PROTOCOL (STUB)
// ============================================

/**
 * Prepare termination message.
 *
 * STUB: Returns simple message.
 * Phase B will add personalization, reflection.
 */
export function prepareTerminationMessage(
  sessionId: string,
  language: string
): string {
  const messages: Record<string, string> = {
    en: "I sense this is a good place to pause. You have what you need to continue on your own.",
    it: "Sento che questo è un buon punto per fermarsi. Hai quello che ti serve per continuare da solo.",
    es: "Siento que este es un buen momento para hacer una pausa. Tienes lo que necesitas para continuar por tu cuenta.",
    fr: "Je sens que c'est un bon moment pour faire une pause. Tu as ce qu'il te faut pour continuer seul.",
    de: "Ich spüre, dass dies ein guter Moment zum Innehalten ist. Du hast, was du brauchst, um alleine weiterzumachen.",
  };

  return messages[language] || messages.en;
}

/**
 * Execute termination.
 *
 * STUB: Just clears the session.
 * Phase B will add archival, summary, follow-up scheduling.
 */
export function executeTermination(sessionId: string): void {
  lifecycleStore.delete(sessionId);
}

// ============================================
// UTILITIES
// ============================================

/**
 * Reset lifecycle store (for testing).
 */
export function resetLifecycleStore(): void {
  lifecycleStore.clear();
}

/**
 * Get all active sessions (for debugging).
 */
export function getActiveSessions(): string[] {
  return Array.from(lifecycleStore.keys());
}

/**
 * Calculate influence used from a plan.
 */
export function calculateInfluenceUsed(plan: ResponsePlan): number {
  // Base influence from acts
  let influence = plan.acts.reduce((sum, act) => sum + act.force, 0) / plan.acts.length;

  // Higher influence for longer responses
  influence *= (plan.constraints.max_length / 100);

  // Higher influence for warmer responses (more engagement)
  const warmthMultiplier =
    plan.constraints.warmth === 'very_warm' ? 1.3 :
    plan.constraints.warmth === 'warm' ? 1.1 :
    plan.constraints.warmth === 'cold' ? 0.8 : 1.0;

  influence *= warmthMultiplier;

  // Lower influence if requiring user effort
  if (plan.constraints.must_require_user_effort) {
    influence *= 0.7;
  }

  return Math.min(1, Math.max(0, influence));
}

// Types and functions are exported inline above
