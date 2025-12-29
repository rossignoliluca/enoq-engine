/**
 * pipeline - Orchestrazione stati
 *
 * CANONICAL EXPORTS from orchestrator.ts
 * Legacy re-exports from runtime/pipeline/ for backwards compatibility
 *
 * See README.md for module documentation.
 */

// ============================================
// CANONICAL: Core orchestrator (Slice 1)
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

// ============================================
// LEGACY: Runtime pipeline (backwards compat)
// ============================================
export * from '../../runtime/pipeline/pipeline';
export * from '../../runtime/pipeline/l2_execution';
