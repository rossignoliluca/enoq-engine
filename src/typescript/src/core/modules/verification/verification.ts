/**
 * VERIFICATION (TELOS) - Canonical Entry Point
 *
 * Slice 2 of wiring migration: wraps gate/verification + gate/withdrawal.
 *
 * verifyOutput() is the canonical API for constitutional verification.
 * Checks output against AXIS invariants before delivery.
 *
 * @module core/modules/verification
 */

import {
  verify,
  S5Input,
  S5Result,
  getFallbackOutput,
  FallbackLevel,
  Violation,
  GeneratedOutput,
} from '../../../gate/verification/S5_verify';

import {
  PlanVerification,
} from '../../../gate/verification/plan_act_verifier';

import { FieldState, ProtocolSelection, SupportedLanguage } from '../../../interface/types';

// ============================================
// TYPES
// ============================================

export interface VerificationContext {
  /** Session ID for audit trail */
  session_id: string;
  /** Turn number */
  turn_number: number;
  /** Previous audit hash (for chain) */
  previous_hash: string;
  /** Attempt count for fallback ladder */
  attempt_count?: number;
}

export interface VerificationInput {
  /** Generated output text */
  text: string;
  /** Field state from perception */
  field: FieldState;
  /** Protocol selection from reasoning */
  selection: ProtocolSelection;
  /** Language of output */
  language: SupportedLanguage;
}

export interface VerificationDecision {
  /** Whether output passed all checks */
  passed: boolean;
  /** S5 verification result */
  result: S5Result;
  /** Final output (original or fallback) */
  final_output: string;
  /** Whether fallback was used */
  used_fallback: boolean;
  /** Timestamp */
  timestamp: number;
}

// ============================================
// VERIFY OUTPUT FUNCTION
// ============================================

/**
 * verifyOutput - Canonical verification check for output
 *
 * Runs S5 constitutional verification on generated output.
 * If violations found, applies fallback ladder.
 *
 * @param input - Generated output with context
 * @param ctx - Verification context
 * @returns VerificationDecision with final output
 */
export function verifyOutput(
  input: VerificationInput,
  ctx: VerificationContext
): VerificationDecision {
  const timestamp = Date.now();

  // Build S5 input
  const s5Input: S5Input = {
    field: input.field,
    selection: input.selection,
    output: {
      text: input.text,
      language: input.language,
      word_count: input.text.split(/\s+/).length,
      generation_method: 'llm',
    },
    session_id: ctx.session_id,
    turn_number: ctx.turn_number,
    previous_hash: ctx.previous_hash,
  };

  // Run verification
  const result = verify(s5Input, ctx.attempt_count ?? 0);

  // Determine final output
  let final_output = input.text;
  let used_fallback = false;

  if (!result.passed && result.fallback_level) {
    const fallback = getFallbackOutput(
      result.fallback_level,
      input.selection,
      input.language
    );

    if (fallback) {
      final_output = fallback;
      used_fallback = true;
    }
  }

  return {
    passed: result.passed,
    result,
    final_output,
    used_fallback,
    timestamp,
  };
}

// Note: verifyPlan wrapper removed - verifyAndFixPlan requires (plan, signals, profile)
// and should be called directly with proper context from the pipeline

/**
 * getCriticalViolations - Filter for critical severity violations
 *
 * @param violations - Array of violations
 * @returns Only critical violations
 */
export function getCriticalViolations(violations: Violation[]): Violation[] {
  return violations.filter(v => v.severity === 'critical');
}

/**
 * hasConstitutionalViolation - Check if any constitutional invariant violated
 *
 * @param violations - Array of violations
 * @returns True if constitutional category present
 */
export function hasConstitutionalViolation(violations: Violation[]): boolean {
  return violations.some(v => v.category === 'constitutional');
}

// ============================================
// RE-EXPORTS for convenience
// ============================================

export type {
  S5Result,
  FallbackLevel,
  Violation,
  GeneratedOutput,
  PlanVerification,
};
