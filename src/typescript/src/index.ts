/**
 * ENOQ - SISTEMA OPERATIVO TOTALE PER L'ESISTENZA UMANA
 *
 * Unified cognitive architecture integrating:
 * - Pipeline (Conscious Layer): S0→S6 perception-action flow
 * - TotalSystem (Unconscious Layer): Memory, Swarm, Temporal, Metacognitive
 * - ConcrescenceEngine (Integration): Whiteheadian synthesis of both
 *
 * Scientific basis:
 * - Whitehead: Process Philosophy, Prehension, Concrescence
 * - Varela: Reciprocal Constraints, Neurophenomenology
 * - Baars: Global Workspace Theory
 * - Friston: Free Energy Principle, Active Inference
 *
 * PRIMARY API: processWithConcrescence() - Full cognitive processing
 * LEGACY API: enoq() - Pipeline only (backward compatible)
 */

import { perceive } from './perception';
import { select } from './selection';
import { generate } from './generation';
import { PipelineInput, PipelineOutput, SupportedLanguage } from './types';

// ============================================
// CONCRESCENCE ENGINE (PRIMARY API)
// ============================================

export {
  ConcrescenceEngine,
  concrescenceEngine,
  processWithConcrescence,
  ActualOccasion,
  Concrescence,
  Satisfaction,
  Prehension,
  Tension,
  PrehensionCoherence,
  ConcrescenceConfig,
} from './concrescence_engine';

// Re-export for convenience
import { processWithConcrescence, concrescenceEngine } from './concrescence_engine';

/**
 * MAIN ENTRY POINT - Process through unified Concrescence
 *
 * This is the recommended way to use ENOQ.
 * It runs both Pipeline and TotalSystem in parallel,
 * then integrates their outputs through Whiteheadian concrescence.
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
      tensions: result.occasion.concrescence.tensions.length,
      coherences: result.occasion.concrescence.coherences.length,
      constitutional_verified: result.occasion.concrescence.satisfaction.constitutional_verified,
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

// ============================================
// LEGACY API (Backward Compatibility)
// ============================================

/**
 * Legacy synchronous process function
 * Uses simple pipeline only (no TotalSystem, no Concrescence)
 * @deprecated Use process() or processWithConcrescence() instead
 */
export function processSync(input: PipelineInput): PipelineOutput {
  // STEP 1: PERCEPTION
  const fieldState = perceive(input.message, input.conversation_history);

  // STEP 2: SELECTION
  const protocol = select(fieldState);

  // STEP 3: GENERATION
  const output = generate(protocol, fieldState, input.message);

  // Return with full trace
  return {
    response: output.text,
    trace: {
      field_state: fieldState,
      selection: protocol,
      generation: output,
    },
  };
}

/**
 * Legacy respond function (synchronous)
 * @deprecated Use respond() instead
 */
export function respondSync(message: string): string {
  const result = processSync({ message });
  return result.response;
}

// ============================================
// DEBUG FUNCTION
// ============================================

export async function debug(message: string, language: SupportedLanguage = 'en'): Promise<void> {
  const result = await processWithConcrescence(message, undefined, language);
  const occasion = result.occasion;

  console.log('\n' + '='.repeat(70));
  console.log('ENOQ CONCRESCENCE DEBUG');
  console.log('='.repeat(70));
  console.log('INPUT:', message);
  console.log('LANGUAGE:', language);

  console.log('\n--- OCCASION ---');
  console.log('ID:', occasion.id);
  console.log('Timestamp:', occasion.timestamp.toISOString());

  console.log('\n--- PRESENT (Dimensional State) ---');
  if (occasion.present.dimensional_state) {
    console.log('Primary Vertical:', occasion.present.dimensional_state.primary_vertical);
    console.log('Primary Horizontal:', occasion.present.dimensional_state.primary_horizontal.join(', '));
    console.log('V_MODE:', occasion.present.dimensional_state.v_mode_triggered);
    console.log('Emergency:', occasion.present.dimensional_state.emergency_detected);
    console.log('Phi:', occasion.present.dimensional_state.integration.phi.toFixed(3));
  }

  console.log('\n--- FIELD STATE ---');
  if (occasion.present.field_state) {
    console.log('Domains:', occasion.present.field_state.domains?.map(d =>
      `${d.domain} (${d.salience.toFixed(2)})`
    ).join(', ') || 'N/A');
    console.log('Arousal:', occasion.present.field_state.arousal);
    console.log('Valence:', occasion.present.field_state.valence);
    console.log('Goal:', occasion.present.field_state.goal);
  }

  console.log('\n--- CONCRESCENCE ---');
  console.log('Prehensions:', occasion.concrescence.prehensions.length);
  console.log('Tensions:', occasion.concrescence.tensions.map(t =>
    `${t.nature} (${t.severity.toFixed(2)})`
  ).join(', ') || 'none');
  console.log('Coherences:', occasion.concrescence.coherences.map(c =>
    `${c.on} (${c.strength.toFixed(2)})`
  ).join(', ') || 'none');

  console.log('\n--- SATISFACTION ---');
  console.log('Primitive:', occasion.concrescence.satisfaction.primitive);
  console.log('Atmosphere:', occasion.concrescence.satisfaction.atmosphere);
  console.log('Depth:', occasion.concrescence.satisfaction.depth);
  console.log('Confidence:', occasion.concrescence.satisfaction.confidence.toFixed(2));
  console.log('Constitutional:', occasion.concrescence.satisfaction.constitutional_verified ? 'PASS' : 'FAIL');

  console.log('\n--- RESPONSE ---');
  console.log(occasion.future.response);

  console.log('\n--- PREDICTED EFFECT ---');
  console.log('Expected State:', occasion.future.predicted_effect.expected_user_state);
  console.log('Autonomy Impact:', occasion.future.predicted_effect.autonomy_impact);

  console.log('='.repeat(70) + '\n');
}

// ============================================
// COMPONENT EXPORTS
// ============================================

// Perception
export { perceive } from './perception';

// Selection
export { select } from './selection';

// Generation
export { generate } from './generation';

// Types
export * from './types';

// Gate client exports
export {
  GateClient,
  GateResult,
  GateSignalEffect,
  interpretGateSignal,
  getGateClient,
  resetGateClient,
  GateClientConfig,
} from './gate_client';

// Full pipeline exports (L1)
export {
  enoq,
  createSession,
  Session,
  Turn,
  PipelineTrace,
  PipelineResult,
  PipelineConfig,
  conversationLoop,
  concrescenceConversationLoop,  // Recommended CLI using full Concrescence
} from './pipeline';

// Total System exports (L2)
export {
  TotalSystemOrchestrator,
  totalSystem,
  processMessage,
  TotalSystemInput,
  TotalSystemOutput,
  ProcessingContext,
  ProcessingMetrics,
} from './total_system';

// Genesis exports
export {
  createENOQ,
  field,
  creator,
} from './genesis';

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  // Primary API
  process,
  respond,
  debug,
  processWithConcrescence,
  concrescenceEngine,

  // Legacy (sync)
  processSync,
  respondSync,
};
