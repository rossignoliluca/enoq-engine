/**
 * pipeline - Orchestrazione stati
 *
 * CANONICAL EXPORTS from orchestrator.ts (Slice 2)
 * Legacy re-exports from runtime/pipeline/ for backwards compatibility
 *
 * See README.md for module documentation.
 */

// ============================================
// CANONICAL: Core orchestrator (Slice 2)
// ============================================
export {
  enoqCore,
  createCoreSession,
  CoreConfig,
  CoreResult,
  PipelineState,
  PipelineSignal,
  SignalEmitter,
} from './orchestrator';

// Re-export boundary/verification types used in CoreResult
export type { BoundaryDecision } from '../modules/boundary';
export type { VerificationDecision } from '../modules/verification';

// ============================================
// LEGACY: Runtime pipeline (backwards compat)
// ============================================
export * from '../../runtime/pipeline/pipeline';
export * from '../../runtime/pipeline/l2_execution';
