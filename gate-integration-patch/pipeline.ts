/**
 * ENOQ PIPELINE - S0 → S6 ORCHESTRATOR
 * 
 * The thread that connects everything.
 * Input → Gate → Perceive → Select → Act → Verify → Return
 * 
 * This is ENOQ.
 */

import { FieldState, ProtocolSelection, GoalType, Flag, GateSignal, GateReasonCode } from './types';
import { perceive } from './perception';
import { select } from './selection';
import { applyDomainGovernor, GovernorResult } from './domain_governor';
import { 
  applyMetaKernel, 
  MetaKernelState, 
  SessionTelemetry, 
  TurnTelemetry,
  createDefaultState as createDefaultMetaKernelState,
} from './meta_kernel';
import { 
  compileExecutionContext, 
  execute, 
  ExecutionContext,
  ExecutionResult,
} from './l2_execution';
import verify, { 
  S5Result, 
  S5Input,
  AuditEntry,
  FallbackLevel,
  getFallbackOutput,
} from './S5_verify';
import {
  GateClient,
  GateResult,
  GateSignalEffect,
  interpretGateSignal,
  getGateClient,
  GateClientConfig,
} from './gate_client';

// ============================================
// PIPELINE CONFIG
// ============================================

export interface PipelineConfig {
  gate_enabled: boolean;
  gate_url?: string;
  gate_timeout_ms?: number;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  gate_enabled: true,
  gate_url: process.env.GATE_RUNTIME_URL || 'http://localhost:3000',
  gate_timeout_ms: 1000,
};

// ============================================
// SESSION TYPES
// ============================================

export interface Session {
  session_id: string;
  created_at: Date;
  turns: Turn[];
  
  // State machines
  meta_kernel_state: MetaKernelState;
  
  // Telemetry
  telemetry: SessionTelemetry;
  
  // Audit trail
  audit_trail: AuditEntry[];
  
  // Memory (simplified for MVP)
  memory: SessionMemory;
  
  // Gate client (optional, for session-level config)
  gate_client?: GateClient;
}

export interface Turn {
  turn_number: number;
  timestamp: Date;
  input: string;
  output: string;
  
  // Pipeline trace
  trace: PipelineTrace;
}

export interface PipelineTrace {
  // Gate (L0)
  s0_gate?: {
    signal: GateSignal;
    reason_code: GateReasonCode;
    latency_ms: number;
    effect: GateSignalEffect;
  };
  
  s0_input: string;
  s1_field: FieldState;
  s1_governor: GovernorResult;
  s1_meta_kernel: {
    rules_applied: string[];
    power_level: number;
    depth_ceiling: string;
  };
  s2_clarify_needed: boolean;
  s3_selection: ProtocolSelection;
  s4_context: {
    runtime: string;
    forbidden: string[];
    required: string[];
  };
  s5_verification: {
    passed: boolean;
    violations: number;
    fallback_used: boolean;
  };
  s6_output: string;
  
  // Timing
  latency_ms: number;
}

export interface SessionMemory {
  // What we've learned about this person
  themes: string[];
  domains_frequent: string[];
  delegation_attempts: number;
  decisions_made: number;
  
  // Relational
  name?: string;
  language_preference: 'en' | 'it' | 'auto';
}

export interface PipelineResult {
  output: string;
  trace: PipelineTrace;
  session: Session;
}

// ============================================
// PIPELINE STATE ENUM
// ============================================

export type PipelineState = 
  | 'S0_RECEIVE'
  | 'S1_SENSE'
  | 'S2_CLARIFY'
  | 'S3_SELECT'
  | 'S4_ACT'
  | 'S5_VERIFY'
  | 'S6_STOP';

// ============================================
// SESSION MANAGEMENT
// ============================================

export function createSession(): Session {
  return {
    session_id: `sess_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date(),
    turns: [],
    meta_kernel_state: createDefaultMetaKernelState(),
    telemetry: createDefaultTelemetry(),
    audit_trail: [],
    memory: {
      themes: [],
      domains_frequent: [],
      delegation_attempts: 0,
      decisions_made: 0,
      language_preference: 'auto',
    },
  };
}

function createDefaultTelemetry(): SessionTelemetry {
  return {
    total_turns: 0,
    avg_depth: 0,
    max_depth_reached: 'surface',
    delegation_rate: 0,
    reassurance_rate: 0,
    passive_turns_rate: 0,
    loop_count: 0,
    theme_repetition_rate: 0,
    user_made_decision: false,
    user_asked_clarifying: false,
    user_disagreed: false,
  };
}

// ============================================
// TELEMETRY UPDATE
// ============================================

function updateTelemetry(
  session: Session, 
  field: FieldState,
  input: string
): SessionTelemetry {
  const telemetry = { ...session.telemetry };
  
  telemetry.total_turns++;
  
  // Update delegation rate
  if (field.flags.includes('delegation_attempt')) {
    session.memory.delegation_attempts++;
  }
  telemetry.delegation_rate = session.memory.delegation_attempts / telemetry.total_turns;
  
  // Detect user behaviors
  const inputLower = input.toLowerCase();
  
  // User made decision
  if (/\b(i('ve| have) decided|my decision is|i('ll| will) (go with|choose))\b/i.test(input)) {
    telemetry.user_made_decision = true;
    session.memory.decisions_made++;
  }
  
  // User asked clarifying question
  if (/\b(what do you mean|can you explain|i('m| am) not sure i understand)\b/i.test(input)) {
    telemetry.user_asked_clarifying = true;
  }
  
  // User disagreed
  if (/\b(i disagree|that('s| is) not (right|true)|no,? (i think|actually))\b/i.test(input)) {
    telemetry.user_disagreed = true;
  }
  
  // Passive turns (very short, no questions, no decisions)
  const isPassive = input.length < 20 && !input.includes('?') && !telemetry.user_made_decision;
  if (isPassive) {
    const passiveTurns = (telemetry.passive_turns_rate * (telemetry.total_turns - 1)) + 1;
    telemetry.passive_turns_rate = passiveTurns / telemetry.total_turns;
  }
  
  // Loop detection
  telemetry.loop_count = field.loop_count;
  
  return telemetry;
}

// ============================================
// S2 CLARIFY DETECTION
// ============================================

interface ClarifyResult {
  needed: boolean;
  reason?: string;
  question?: string;
}

function checkClarifyNeeded(field: FieldState, input: string): ClarifyResult {
  // High uncertainty
  if (field.uncertainty > 0.7) {
    return {
      needed: true,
      reason: 'high_uncertainty',
      question: field.language === 'it' 
        ? "Puoi dirmi di più su cosa intendi?"
        : "Can you tell me more about what you mean?",
    };
  }
  
  // Very short input with no clear goal
  if (input.length < 10 && field.goal === 'unclear') {
    return {
      needed: true,
      reason: 'insufficient_context',
      question: field.language === 'it'
        ? "Cosa ti porta qui oggi?"
        : "What brings you here today?",
    };
  }
  
  // Conflicting signals
  if (field.domains.length >= 3 && field.coherence === 'low') {
    return {
      needed: true,
      reason: 'conflicting_signals',
      question: field.language === 'it'
        ? "Sento diverse cose in quello che dici. Cosa senti più presente adesso?"
        : "I'm hearing several things. What feels most present right now?",
    };
  }
  
  return { needed: false };
}

// ============================================
// MAIN PIPELINE
// ============================================

export async function enoq(
  input: string,
  session: Session,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG
): Promise<PipelineResult> {
  const startTime = Date.now();
  const turnNumber = session.turns.length + 1;
  
  // ==========================================
  // S0: RECEIVE + GATE
  // ==========================================
  const s0_input = input.trim();
  
  // Empty input handling
  if (!s0_input) {
    const emptyResponse = session.memory.language_preference === 'it'
      ? "Sono qui."
      : "I'm here.";
    
    return {
      output: emptyResponse,
      trace: createEmptyTrace(s0_input, emptyResponse, Date.now() - startTime),
      session,
    };
  }
  
  // ==========================================
  // S0.5: GATE (Pre-LLM Classification)
  // ==========================================
  
  let gateResult: GateResult | null = null;
  let gateEffect: GateSignalEffect = { proceed: true };
  
  if (config.gate_enabled) {
    const gateClient = session.gate_client || getGateClient({
      base_url: config.gate_url,
      timeout_ms: config.gate_timeout_ms,
      enabled: config.gate_enabled,
    });
    
    try {
      gateResult = await gateClient.classify(s0_input);
      gateEffect = interpretGateSignal(gateResult.signal, gateResult.reason_code);
      
      // Log Gate result for debugging
      if (process.env.ENOQ_DEBUG) {
        console.log(`[GATE] Signal: ${gateResult.signal}, Reason: ${gateResult.reason_code}, Latency: ${gateResult.latency_ms}ms`);
      }
    } catch (error) {
      // Gate failure is non-fatal - proceed with ENOQ
      console.warn('[GATE] Classification failed, proceeding with ENOQ:', error);
      gateResult = {
        signal: 'NULL',
        reason_code: 'UNCLASSIFIABLE',
        request_id: 'gate-error',
        latency_ms: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // ==========================================
  // S1: SENSE (Perceive + Governor + MetaKernel)
  // ==========================================
  
  // L1 Perception
  const s1_field = perceive(s0_input);
  
  // Update session memory with language
  if (s1_field.language && s1_field.language !== 'mixed') {
    session.memory.language_preference = s1_field.language;
  }
  
  // Update telemetry
  session.telemetry = updateTelemetry(session, s1_field, s0_input);
  
  // Domain Governor
  const s1_governor = applyDomainGovernor(s1_field);
  
  // Create turn telemetry for MetaKernel
  const turnTelemetry: TurnTelemetry = {
    timestamp: new Date(),
    turn_number: turnNumber,
    input_length: s0_input.length,
    input_question_count: (s0_input.match(/\?/g) || []).length,
    input_has_delegation_markers: s1_field.flags.includes('delegation_attempt'),
    output_depth: 'surface', // Will be updated after selection
    output_domains: s1_field.domains.map(d => d.domain),
    elapsed_time: Date.now() - startTime,
  };
  
  // MetaKernel
  const metaKernelResult = applyMetaKernel(
    session.telemetry,
    turnTelemetry,
    session.meta_kernel_state,
    session.memory.language_preference === 'it' ? 'it' : 'en'
  );
  
  // Update session state
  session.meta_kernel_state = metaKernelResult.new_state;
  
  // ==========================================
  // S2: CLARIFY (if needed)
  // ==========================================
  
  const clarifyResult = checkClarifyNeeded(s1_field, s0_input);
  
  // If MetaKernel requests handshake, that takes precedence
  if (metaKernelResult.prompt_handshake && metaKernelResult.handshake_message) {
    const trace = createTrace(
      s0_input,
      s1_field,
      s1_governor,
      metaKernelResult,
      null as any, // No selection
      null as any, // No context
      { passed: true, violations: [], fallback_level: null, audit_entry: null as any },
      metaKernelResult.handshake_message,
      true, // clarify_needed
      Date.now() - startTime,
      gateResult,
      gateEffect
    );
    
    const turn: Turn = {
      turn_number: turnNumber,
      timestamp: new Date(),
      input: s0_input,
      output: metaKernelResult.handshake_message,
      trace,
    };
    session.turns.push(turn);
    
    return {
      output: metaKernelResult.handshake_message,
      trace,
      session,
    };
  }
  
  // Standard clarification
  if (clarifyResult.needed && clarifyResult.question) {
    const trace = createTrace(
      s0_input,
      s1_field,
      s1_governor,
      metaKernelResult,
      null as any,
      null as any,
      { passed: true, violations: [], fallback_level: null, audit_entry: null as any },
      clarifyResult.question,
      true,
      Date.now() - startTime,
      gateResult,
      gateEffect
    );
    
    const turn: Turn = {
      turn_number: turnNumber,
      timestamp: new Date(),
      input: s0_input,
      output: clarifyResult.question,
      trace,
    };
    session.turns.push(turn);
    
    return {
      output: clarifyResult.question,
      trace,
      session,
    };
  }
  
  // ==========================================
  // S3: SELECT
  // ==========================================
  
  // Define depth order for later use
  const depthOrder = ['surface', 'medium', 'deep'];
  
  const s3_selection = select(s1_field);
  
  // Apply Governor constraints to selection
  if (s1_governor.effect.atmosphere) {
    s3_selection.atmosphere = s1_governor.effect.atmosphere;
  }
  if (s1_governor.effect.mode) {
    s3_selection.mode = s1_governor.effect.mode;
  }
  if (s1_governor.effect.primitive) {
    s3_selection.primitive = s1_governor.effect.primitive as any;
  }
  
  // Merge forbidden/required
  s3_selection.forbidden = [
    ...s3_selection.forbidden,
    ...s1_governor.effect.forbidden,
  ];
  s3_selection.required = [
    ...s3_selection.required,
    ...s1_governor.effect.required,
  ];
  
  // ==========================================
  // Apply Gate Effect (L0 → S3)
  // ==========================================
  
  if (gateEffect.atmosphere_hint) {
    // Gate atmosphere takes precedence (it's the first signal)
    s3_selection.atmosphere = gateEffect.atmosphere_hint;
  }
  
  if (gateEffect.depth_ceiling) {
    // Apply Gate depth ceiling (most restrictive wins)
    const gateDepthIndex = depthOrder.indexOf(gateEffect.depth_ceiling);
    const currentDepthIndex = depthOrder.indexOf(s3_selection.depth);
    if (gateDepthIndex < currentDepthIndex) {
      s3_selection.depth = gateEffect.depth_ceiling;
    }
  }
  
  if (gateEffect.forbidden_additions) {
    s3_selection.forbidden = [
      ...s3_selection.forbidden,
      ...gateEffect.forbidden_additions,
    ];
  }
  
  if (gateEffect.required_additions) {
    s3_selection.required = [
      ...s3_selection.required,
      ...gateEffect.required_additions,
    ];
  }
  
  // Apply MetaKernel depth ceiling
  const selectionDepthIndex = depthOrder.indexOf(s3_selection.depth);
  const ceilingIndex = depthOrder.indexOf(metaKernelResult.power_envelope.depth_ceiling);
  if (ceilingIndex < selectionDepthIndex) {
    s3_selection.depth = metaKernelResult.power_envelope.depth_ceiling;
  }
  
  // ==========================================
  // S4: ACT (L2 Execution)
  // ==========================================
  
  const s4_context = compileExecutionContext(
    s1_field,
    s3_selection,
    s1_governor,
    metaKernelResult
  );
  
  const s4_result = await execute(s4_context);
  
  // ==========================================
  // S5: VERIFY
  // ==========================================
  
  // Build S5Input
  const s5_input: S5Input = {
    field: s1_field,
    selection: s3_selection,
    output: {
      text: s4_result.output,
      language: (session.memory.language_preference === 'auto' ? 'en' : session.memory.language_preference) as 'en' | 'it',
      word_count: s4_result.output.split(/\s+/).length,
      generation_method: s4_context.runtime === 'L2_SURFACE' ? 'template' : 'llm',
    },
    session_id: session.session_id,
    turn_number: turnNumber,
    previous_hash: session.audit_trail.length > 0 
      ? session.audit_trail[session.audit_trail.length - 1].entry_hash 
      : '0000000000000000',
  };
  
  const s5_result = verify(s5_input);
  
  let finalOutput: string;
  
  if (s5_result.passed) {
    finalOutput = s4_result.output;
  } else {
    // Use fallback
    const fallbackLevel = s5_result.fallback_level || 'PRESENCE';
    const fallbackOutput = getFallbackOutput(
      fallbackLevel,
      s3_selection,
      session.memory.language_preference === 'it' ? 'it' : 'en'
    );
    finalOutput = fallbackOutput || s4_result.output;
  }
  
  // Add audit entry from S5
  session.audit_trail.push(s5_result.audit_entry);
  
  // ==========================================
  // S6: STOP (Return)
  // ==========================================
  
  const trace = createTrace(
    s0_input,
    s1_field,
    s1_governor,
    metaKernelResult,
    s3_selection,
    s4_context,
    s5_result,
    finalOutput,
    false,
    Date.now() - startTime,
    gateResult,
    gateEffect
  );
  
  const turn: Turn = {
    turn_number: turnNumber,
    timestamp: new Date(),
    input: s0_input,
    output: finalOutput,
    trace,
  };
  session.turns.push(turn);
  
  return {
    output: finalOutput,
    trace,
    session,
  };
}

// ============================================
// TRACE HELPERS
// ============================================

function createTrace(
  input: string,
  field: FieldState,
  governor: GovernorResult,
  metaKernel: { rules_applied: string[]; power_envelope: { depth_ceiling: string }; new_state: { knobs: { power_level: number } } },
  selection: ProtocolSelection | null,
  context: ExecutionContext | null,
  verification: S5Result | { passed: boolean; violations: any[]; fallback_level: null; audit_entry: any },
  output: string,
  clarifyNeeded: boolean,
  latencyMs: number,
  gateResult?: GateResult | null,
  gateEffect?: GateSignalEffect
): PipelineTrace {
  return {
    s0_gate: gateResult ? {
      signal: gateResult.signal,
      reason_code: gateResult.reason_code,
      latency_ms: gateResult.latency_ms,
      effect: gateEffect || { proceed: true },
    } : undefined,
    s0_input: input,
    s1_field: field,
    s1_governor: governor,
    s1_meta_kernel: {
      rules_applied: metaKernel.rules_applied,
      power_level: metaKernel.new_state.knobs.power_level,
      depth_ceiling: metaKernel.power_envelope.depth_ceiling,
    },
    s2_clarify_needed: clarifyNeeded,
    s3_selection: selection || {} as ProtocolSelection,
    s4_context: context ? {
      runtime: context.runtime,
      forbidden: context.constraints.forbidden,
      required: context.constraints.required,
    } : { runtime: 'N/A', forbidden: [], required: [] },
    s5_verification: {
      passed: verification.passed,
      violations: verification.violations.length,
      fallback_used: !verification.passed,
    },
    s6_output: output,
    latency_ms: latencyMs,
  };
}

function createEmptyTrace(input: string, output: string, latencyMs: number): PipelineTrace {
  return {
    s0_input: input,
    s1_field: {} as FieldState,
    s1_governor: { rules_applied: [], effect: {} } as unknown as GovernorResult,
    s1_meta_kernel: { rules_applied: [], power_level: 0.5, depth_ceiling: 'surface' },
    s2_clarify_needed: false,
    s3_selection: {} as ProtocolSelection,
    s4_context: { runtime: 'N/A', forbidden: [], required: [] },
    s5_verification: { passed: true, violations: 0, fallback_used: false },
    s6_output: output,
    latency_ms: latencyMs,
  };
}

// ============================================
// CONVERSATION LOOP (CLI)
// ============================================

export async function conversationLoop(): Promise<void> {
  const session = createSession();
  
  console.log('\n========================================');
  console.log('         ENOQ - Cognitive Companion');
  console.log('========================================');
  console.log('Type your message. Type "exit" to quit.');
  console.log('Type "trace" after a response to see the pipeline trace.');
  console.log('----------------------------------------\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  let lastTrace: PipelineTrace | null = null;
  
  const prompt = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\n[Session ended]');
        console.log(`Turns: ${session.turns.length}`);
        console.log(`Delegation attempts: ${session.memory.delegation_attempts}`);
        console.log(`Decisions made: ${session.memory.decisions_made}`);
        rl.close();
        return;
      }
      
      if (input.toLowerCase() === 'trace' && lastTrace) {
        console.log('\n--- PIPELINE TRACE ---');
        console.log(`Domains: ${lastTrace.s1_field.domains?.map(d => d.domain).join(', ') || 'N/A'}`);
        console.log(`Arousal: ${lastTrace.s1_field.arousal || 'N/A'}`);
        console.log(`Governor rules: ${lastTrace.s1_governor.rules_applied?.join(', ') || 'none'}`);
        console.log(`MetaKernel: power=${lastTrace.s1_meta_kernel.power_level.toFixed(2)}, ceiling=${lastTrace.s1_meta_kernel.depth_ceiling}`);
        console.log(`Selection: ${lastTrace.s3_selection.atmosphere || 'N/A'} / ${lastTrace.s3_selection.primitive || 'N/A'}`);
        console.log(`Runtime: ${lastTrace.s4_context.runtime}`);
        console.log(`Verification: ${lastTrace.s5_verification.passed ? 'PASS' : 'FAIL'}`);
        console.log(`Latency: ${lastTrace.latency_ms}ms`);
        console.log('----------------------\n');
        prompt();
        return;
      }
      
      try {
        const result = await enoq(input, session);
        lastTrace = result.trace;
        console.log(`\nENOQ: ${result.output}\n`);
      } catch (error) {
        console.error('\n[Error]', error);
      }
      
      prompt();
    });
  };
  
  prompt();
}

// ============================================
// EXPORTS
// ============================================

export { createDefaultTelemetry, checkClarifyNeeded };
export default enoq;
