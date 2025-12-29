/**
 * verification (TELOS) - Verifica costituzionale
 *
 * CANONICAL: verification.ts exports (Slice 2)
 * LEGACY: gate/verification/, gate/withdrawal/ re-exports
 *
 * See README.md for module documentation.
 */

// ============================================
// CANONICAL: Core verification API (Slice 2)
// ============================================
export {
  verifyOutput,
  getCriticalViolations,
  hasConstitutionalViolation,
  VerificationContext,
  VerificationInput,
  VerificationDecision,
} from './verification';

// ============================================
// LEGACY: Gate re-exports (backwards compat)
// ============================================
export * from '../../../gate/verification/S5_verify';
export * from '../../../gate/verification/plan_act_verifier';
export * from '../../../gate/withdrawal/lifecycle_controller';
export * from '../../../gate/withdrawal/regulatory_store';
