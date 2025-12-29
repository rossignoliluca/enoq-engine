/**
 * BOUNDARY (LIMEN) - Canonical Entry Point
 *
 * Slice 2 of wiring migration: wraps gate/classifier + gate/protocols.
 *
 * permit() is the canonical API for boundary classification.
 * Returns a decision with routing information for the pipeline.
 *
 * @module core/modules/boundary
 */

import {
  classifyFull,
  ClassificationResult,
  GateSignal,
  Domain,
} from '../../../gate/classifier';

import {
  getProtocol,
  getSystemPromptAddition,
  ResponseProtocol,
} from '../../../gate/protocols';

// ============================================
// TYPES
// ============================================

export interface BoundaryContext {
  /** Session ID for tracing */
  session_id: string;
  /** Turn number in session */
  turn_number: number;
  /** Optional language hint */
  language?: string;
}

export interface BoundaryDecision {
  /** Whether the input is permitted for processing */
  permitted: boolean;
  /** Classification result from LIMEN */
  classification: ClassificationResult;
  /** Response protocol for downstream */
  protocol: ResponseProtocol;
  /** System prompt addition for LLM */
  system_prompt_addition: string;
  /** Timestamp */
  timestamp: number;
}

// ============================================
// PERMIT FUNCTION
// ============================================

/**
 * permit - Canonical boundary check for input
 *
 * Classifies input and determines routing protocol.
 * All inputs are currently permitted (boundary classification
 * determines *how* to respond, not *whether* to respond).
 *
 * @param input - User message to classify
 * @param ctx - Boundary context with session info
 * @returns BoundaryDecision with classification and protocol
 */
export function permit(
  input: string,
  ctx: BoundaryContext
): BoundaryDecision {
  const timestamp = Date.now();

  // Run LIMEN classification
  const classification = classifyFull(input);

  // Get response protocol based on signal
  const protocol = getProtocol(classification.signal);

  // Get system prompt addition for LLM
  const system_prompt_addition = getSystemPromptAddition(classification.signal);

  // All inputs are permitted - boundary determines *how* not *if*
  // Future: could add hard blocks here for adversarial patterns
  const permitted = true;

  return {
    permitted,
    classification,
    protocol,
    system_prompt_addition,
    timestamp,
  };
}

/**
 * getDomain - Extract domain from signal if active
 *
 * @param signal - Gate signal
 * @returns Domain or null if NULL signal
 */
export function getDomain(signal: GateSignal): Domain | null {
  if (signal === 'NULL') return null;
  return signal.replace('_ACTIVE', '') as Domain;
}

/**
 * isGated - Check if input triggered a domain gate
 *
 * @param decision - Boundary decision
 * @returns True if a domain (D1-D4) is active
 */
export function isGated(decision: BoundaryDecision): boolean {
  return decision.classification.signal !== 'NULL';
}

// ============================================
// RE-EXPORTS for convenience
// ============================================

export type { ClassificationResult, GateSignal, Domain, ResponseProtocol };
