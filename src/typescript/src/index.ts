/**
 * ENOQ - Autopoietic Viable System for Human Empowerment
 *
 * Architecture:
 * - interface/: Shared contracts and types
 * - gate/: Normative gating (classification, enforcement, verification)
 * - operational/: Routing & detection (detectors, gating, providers)
 * - mediator/: Cognitive processing (L1-L5 layers)
 * - runtime/: Execution layer (pipeline, I/O)
 *
 * Scientific basis:
 * - Whitehead: Process Philosophy, Concrescence
 * - Maturana/Varela: Autopoiesis
 * - Beer: Viable System Model
 * - Friston: Free Energy Principle
 * - Baars: Global Workspace Theory
 *
 * PRIMARY API: enoq() - Full pipeline processing
 */

// ============================================
// INTERFACE - Shared Types
// ============================================

export * from './interface/types';

// ============================================
// MEDIATOR - Cognitive Processing Layers
// ============================================

// L0 - Intake
export {
  DimensionalDetector,
  DimensionalState,
} from './operational/detectors/dimensional_system';

export {
  getUltimateDetector,
  UltimateDetector,
  DetectorOutput,
} from './operational/detectors/ultimate_detector';

export {
  scanExistentialLexicon,
  getBoostedExistentialScore,
  LexiconMatch,
  LexiconResult,
} from './operational/detectors/existential_lexicon';

export {
  GateClient,
  GateResult,
  interpretGateSignal,
  getGateClient,
  resetGateClient,
  GateClientConfig,
} from './operational/providers/gate_client';

export {
  EmbeddedGate,
  getEmbeddedGate,
  interpretEmbeddedGateSignal,
} from './operational/providers/gate_embedded';

// L1 - Clarify
export { perceive } from './mediator/l1_clarify/perception';

// L2 - Reflect
export { select } from './mediator/l2_reflect/selection';

export {
  ManifoldState,
  InputState,
  FieldConfig,
  DEFAULT_FIELD_CONFIG,
  createInitialState as createInitialManifoldState,
  stateFromInput,
  evolve as evolveManifold,
  diagnostics as manifoldDiagnostics,
} from './mediator/l2_reflect/stochastic_field';

export {
  curveSelectionWithManifold,
  CurvatureResult,
  CurvatureEntry,
} from './mediator/l2_reflect/selection_curver';

// L3 - Integrate
export {
  applyMetaKernel,
  MetaKernelState,
  SessionTelemetry,
  TurnTelemetry,
} from './mediator/l3_integrate/meta_kernel';

// L4 - Agency
export {
  TotalSystemOrchestrator,
  totalSystem,
  processMessage,
} from './mediator/l4_agency/total_system';

// L5 - Transform
export { generate } from './mediator/l5_transform/generation';
export { renderPlan } from './mediator/l5_transform/plan_renderer';

// Concrescence
export {
  ConcrescenceEngine,
  concrescenceEngine,
  processWithConcrescence,
} from './mediator/concrescence/concrescence_engine';

// ============================================
// GATE - Normative Control
// ============================================

// Geometry Operational
export {
  UnifiedGating,
  unifiedGating,
  UnifiedGatingConfig,
  UnifiedGatingDecision,
  UnifiedGatingStats,
  SkipReason,
  DEFAULT_UNIFIED_CONFIG,
} from './operational/gating/unified_gating';

// NPGating is internal to UnifiedGating - not exported publicly
// Use UnifiedGating for all gating needs

// Thresholds
export {
  LLMDetectorCache,
  CacheConfig,
  CacheStats,
} from './external/cache/llm_cache';

// Geometry Normative
export { applyDomainGovernor, GovernorResult } from './gate/enforcement/domain_governor';

// Verification
export { default as verify, S5Result, S5Input, AuditEntry, FallbackLevel, getFallbackOutput } from './gate/verification/S5_verify';

// ============================================
// RUNTIMES - Execution Layers
// ============================================

export {
  enoq,
  createSession,
  Session,
  Turn,
  PipelineTrace,
  PipelineResult,
  PipelineConfig,
  conversationLoop,
  concrescenceConversationLoop,
} from './runtime/pipeline/pipeline';

export {
  compileExecutionContext,
  execute,
  ExecutionContext,
  ExecutionResult,
} from './runtime/pipeline/l2_execution';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { processWithConcrescence, concrescenceEngine } from './mediator/concrescence/concrescence_engine';
import { perceive } from './mediator/l1_clarify/perception';
import { select } from './mediator/l2_reflect/selection';
import { generate } from './mediator/l5_transform/generation';
import { PipelineInput, PipelineOutput, SupportedLanguage } from './interface/types';

/**
 * MAIN ENTRY POINT - Process through unified Concrescence
 */
export async function process(
  message: string,
  language: SupportedLanguage = 'en'
): Promise<{ response: string; debug?: any }> {
  const result = await processWithConcrescence(message, undefined, language);
  return {
    response: result.response,
    debug: {
      occasion_id: result.occasion.id,
      primitive: result.occasion.concrescence.satisfaction.primitive,
      atmosphere: result.occasion.concrescence.satisfaction.atmosphere,
      confidence: result.occasion.concrescence.satisfaction.confidence,
    },
  };
}

/**
 * Simple response function
 */
export async function respond(
  message: string,
  language: SupportedLanguage = 'en'
): Promise<string> {
  const result = await process(message, language);
  return result.response;
}

/**
 * Legacy synchronous process function
 * @deprecated Use process() or enoq() instead
 */
export function processSync(input: PipelineInput): PipelineOutput {
  const fieldState = perceive(input.message, input.conversation_history);
  const protocol = select(fieldState);
  const output = generate(protocol, fieldState, input.message);

  return {
    response: output.text,
    trace: {
      field_state: fieldState,
      selection: protocol,
      generation: output,
    },
  };
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  process,
  respond,
  processWithConcrescence,
  concrescenceEngine,
  processSync,
};
