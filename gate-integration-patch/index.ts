/**
 * ENOQ L1 PIPELINE
 * 
 * The complete perception-action pipeline.
 * Input → Gate → Perception → Selection → Generation → Verify → Output
 */

import { perceive } from './perception';
import { select } from './selection';
import { generate } from './generation';
import { PipelineInput, PipelineOutput } from './types';

// ============================================
// MAIN PIPELINE
// ============================================

export function process(input: PipelineInput): PipelineOutput {
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
      generation: output
    }
  };
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

export function respond(message: string): string {
  const result = process({ message });
  return result.response;
}

// ============================================
// DEBUG FUNCTION
// ============================================

export function debug(message: string): void {
  const result = process({ message });
  
  console.log('\n' + '='.repeat(60));
  console.log('INPUT:', message);
  console.log('='.repeat(60));
  
  console.log('\n--- PERCEPTION ---');
  console.log('Domains:', result.trace.field_state.domains.map(d => 
    `${d.domain} (${d.salience.toFixed(2)})`
  ).join(', '));
  console.log('Arousal:', result.trace.field_state.arousal);
  console.log('Valence:', result.trace.field_state.valence);
  console.log('Goal:', result.trace.field_state.goal);
  console.log('Flags:', result.trace.field_state.flags.join(', ') || 'none');
  console.log('Uncertainty:', result.trace.field_state.uncertainty.toFixed(2));
  
  console.log('\n--- SELECTION ---');
  console.log('Atmosphere:', result.trace.selection.atmosphere);
  console.log('Mode:', result.trace.selection.mode);
  console.log('Primitive:', result.trace.selection.primitive);
  console.log('Depth:', result.trace.selection.depth);
  console.log('Length:', result.trace.selection.length);
  console.log('Pacing:', result.trace.selection.pacing);
  console.log('Forbidden:', result.trace.selection.forbidden.slice(0, 3).join(', '));
  console.log('Reasoning:', result.trace.selection.reasoning);
  
  console.log('\n--- GENERATION ---');
  console.log('Response:', result.response);
  console.log('Tokens:', result.trace.generation.length_tokens);
  console.log('Time:', result.trace.generation.generation_time_ms, 'ms');
  console.log('='.repeat(60) + '\n');
}

// ============================================
// EXPORTS
// ============================================

export { perceive } from './perception';
export { select } from './selection';
export { generate } from './generation';
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

// Full pipeline exports
export { 
  enoq, 
  createSession, 
  Session, 
  Turn, 
  PipelineTrace,
  PipelineResult,
  PipelineConfig,
} from './pipeline';

export default { process, respond, debug };
