/**
 * ENOQ PIPELINE - S0 → S6 ORCHESTRATOR
 *
 * The thread that connects everything.
 * Input → Gate → Perceive → Select → Act → Verify → Return
 *
 * This is ENOQ.
 */

import { FieldState, ProtocolSelection, GoalType, Flag, GateSignal, GateReasonCode, SupportedLanguage } from './types';
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
import {
  curveSelection,
  getFieldTraceInfo,
  FieldTraceInfo
} from './genesis/field_integration';
import {
  dimensionalDetector,
  DimensionalState
} from './dimensional_system';

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

  // Genesis Field curvature (connects pipeline to field physics)
  s3_field?: FieldTraceInfo;
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
  language_preference: SupportedLanguage | 'auto';

  // Response tracking to avoid repetition
  recent_responses: string[];
  response_history_limit: number;
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
      recent_responses: [],
      response_history_limit: 5,
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

  // Build conversation history from session turns for loop detection
  const conversationHistory = session.turns.map(t => t.input);

  // L1 Perception (with history for loop detection)
  const s1_field = perceive(s0_input, conversationHistory);

  // Dimensional detection - adds vertical dimension awareness
  const dimensionalState = dimensionalDetector.detect(
    s0_input,
    session.memory.language_preference === 'auto' ? 'en' : session.memory.language_preference,
    { field_state: s1_field }
  );

  // Log dimensional state for debugging
  if (process.env.ENOQ_DEBUG) {
    console.log(`[DIMENSIONS] Primary: ${dimensionalState.primary_vertical}`);
    if (dimensionalState.v_mode_triggered) {
      console.log(`[DIMENSIONS] V_MODE triggered by existential/transcendent dimension`);
    }
    if (dimensionalState.emergency_detected) {
      console.log(`[DIMENSIONS] EMERGENCY detected from somatic dimension`);
    }
  }

  // Update session memory with language
  if (s1_field.language && s1_field.language !== 'mixed' && s1_field.language !== 'unknown') {
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

  let s3_selection = select(s1_field);

  // ==========================================
  // S3.5: GENESIS FIELD CURVATURE
  // The field curves the selection toward constitutional attractors
  // This is where AXIS-as-field replaces AXIS-as-validator
  // ==========================================

  const { selection: curvedSelection, fieldResponse } = curveSelection(s3_selection, s1_field);
  s3_selection = curvedSelection;

  // Log field curvature for debugging
  if (process.env.ENOQ_DEBUG) {
    console.log(`[FIELD] Stability: ${fieldResponse.stability}, Energy: ${fieldResponse.energy.total.toFixed(0)}`);
    if (fieldResponse.curvature_explanation.length > 0) {
      console.log(`[FIELD] Curvature: ${fieldResponse.curvature_explanation.join('; ')}`);
    }
    if (fieldResponse.suggests_withdrawal) {
      console.log(`[FIELD] Suggests withdrawal`);
    }
  }

  // ==========================================
  // S3.6: DIMENSIONAL CONSTRAINTS
  // Apply constraints based on vertical dimension
  // ==========================================

  // V_MODE from dimensional detection takes precedence
  if (dimensionalState.v_mode_triggered && s3_selection.atmosphere !== 'V_MODE') {
    s3_selection.atmosphere = 'V_MODE';
    s3_selection.forbidden = [
      ...s3_selection.forbidden,
      'prescribe',
      'recommend',
      'advise',
      'decide_for_user'
    ];
    s3_selection.required = [
      ...s3_selection.required,
      'return_ownership',
      'end_with_question'
    ];
  }

  // Emergency from dimensional detection
  if (dimensionalState.emergency_detected && s3_selection.atmosphere !== 'EMERGENCY') {
    s3_selection.atmosphere = 'EMERGENCY';
    s3_selection.depth = 'surface';
    s3_selection.length = 'minimal';
    s3_selection.primitive = 'P01_GROUND';
    s3_selection.required = [
      ...s3_selection.required,
      'acknowledge_distress',
      'offer_grounding'
    ];
  }

  // Transcendent dimension: maximum restriction on prescription
  if (dimensionalState.primary_vertical === 'TRANSCENDENT') {
    s3_selection.forbidden = [
      ...s3_selection.forbidden,
      'any_prescription',
      'meaning_assignment',
      'purpose_suggestion'
    ];
  }

  // Existential dimension: protect identity
  if (dimensionalState.primary_vertical === 'EXISTENTIAL') {
    s3_selection.forbidden = [
      ...s3_selection.forbidden,
      'identity_labeling',
      'value_prescription'
    ];
  }

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
      language: session.memory.language_preference === 'auto' ? 'en' : session.memory.language_preference,
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
    gateEffect,
    getFieldTraceInfo(fieldResponse)
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
  gateEffect?: GateSignalEffect,
  fieldTraceInfo?: FieldTraceInfo
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
    s3_field: fieldTraceInfo,
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
        if (lastTrace.s0_gate) {
          console.log(`Gate: ${lastTrace.s0_gate.signal} (${lastTrace.s0_gate.reason_code}) - ${lastTrace.s0_gate.latency_ms}ms`);
        }
        console.log(`Domains: ${lastTrace.s1_field.domains?.map(d => d.domain).join(', ') || 'N/A'}`);
        console.log(`Arousal: ${lastTrace.s1_field.arousal || 'N/A'}`);
        console.log(`Governor rules: ${lastTrace.s1_governor.rules_applied?.join(', ') || 'none'}`);
        console.log(`MetaKernel: power=${lastTrace.s1_meta_kernel.power_level.toFixed(2)}, ceiling=${lastTrace.s1_meta_kernel.depth_ceiling}`);
        console.log(`Selection: ${lastTrace.s3_selection.atmosphere || 'N/A'} / ${lastTrace.s3_selection.primitive || 'N/A'}`);
        // Genesis Field info
        if (lastTrace.s3_field) {
          console.log(`Field: stability=${lastTrace.s3_field.stability}, energy=${lastTrace.s3_field.energy.toFixed(0)}`);
          if (lastTrace.s3_field.suggests_withdrawal) {
            console.log(`Field: SUGGESTS WITHDRAWAL`);
          }
          if (lastTrace.s3_field.curvature_explanation.length > 0) {
            console.log(`Field curvature: ${lastTrace.s3_field.curvature_explanation.join('; ')}`);
          }
        }
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
// CONCRESCENCE CONVERSATION LOOP (CLI)
// ============================================

/**
 * Unified conversation loop using ConcrescenceEngine
 *
 * This is the recommended CLI entry point.
 * It runs both Pipeline and TotalSystem in parallel,
 * integrating them through Whiteheadian concrescence.
 */
export async function concrescenceConversationLoop(): Promise<void> {
  // Dynamic import to avoid circular dependency
  const { ConcrescenceEngine } = await import('./concrescence_engine');

  const engine = new ConcrescenceEngine({ debug: false });
  const session = createSession();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                           ║');
  console.log('║                              E N O Q                                      ║');
  console.log('║                                                                           ║');
  console.log('║              Sistema Operativo Totale per l\'Esistenza Umana               ║');
  console.log('║                     Powered by Concrescence Engine                        ║');
  console.log('║                                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('\nCommands: "exit" to quit, "trace" for debug, "occasion" for full occasion');
  console.log('─'.repeat(75) + '\n');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let lastOccasion: any = null;

  const prompt = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\n[Session ended]');
        console.log(`Turns: ${session.turns.length}`);
        console.log(`Occasions: ${engine.getOccasionHistory().length}`);
        rl.close();
        return;
      }

      if (input.toLowerCase() === 'trace' && lastOccasion) {
        console.log('\n--- CONCRESCENCE TRACE ---');
        console.log(`Occasion: ${lastOccasion.id}`);
        console.log(`Primitive: ${lastOccasion.concrescence.satisfaction.primitive}`);
        console.log(`Atmosphere: ${lastOccasion.concrescence.satisfaction.atmosphere}`);
        console.log(`Depth: ${lastOccasion.concrescence.satisfaction.depth}`);
        console.log(`Confidence: ${lastOccasion.concrescence.satisfaction.confidence.toFixed(2)}`);
        console.log(`Constitutional: ${lastOccasion.concrescence.satisfaction.constitutional_verified ? 'PASS' : 'FAIL'}`);
        console.log(`Prehensions: ${lastOccasion.concrescence.prehensions.length}`);
        console.log(`Tensions: ${lastOccasion.concrescence.tensions.map((t: any) => t.nature).join(', ') || 'none'}`);
        console.log(`Coherences: ${lastOccasion.concrescence.coherences.map((c: any) => c.on).join(', ') || 'none'}`);
        if (lastOccasion.present.dimensional_state) {
          console.log(`V_MODE: ${lastOccasion.present.dimensional_state.v_mode_triggered}`);
          console.log(`Emergency: ${lastOccasion.present.dimensional_state.emergency_detected}`);
          console.log(`Phi: ${lastOccasion.present.dimensional_state.integration.phi.toFixed(3)}`);
        }
        console.log('─'.repeat(30) + '\n');
        prompt();
        return;
      }

      if (input.toLowerCase() === 'occasion' && lastOccasion) {
        console.log('\n--- FULL OCCASION ---');
        console.log(JSON.stringify(lastOccasion, null, 2));
        console.log('─'.repeat(30) + '\n');
        prompt();
        return;
      }

      try {
        // Detect language (simple heuristic)
        const language = /[àèìòùé]/.test(input) ? 'it' : 'en';

        const result = await engine.process(input, session, language as any);
        lastOccasion = result.occasion;

        // Format response with concrescence metadata
        console.log('\n┌' + '─'.repeat(73) + '┐');
        console.log(`│  ${result.occasion.concrescence.satisfaction.primitive} · ${result.occasion.concrescence.satisfaction.atmosphere} · ${result.occasion.concrescence.satisfaction.depth}`);
        console.log('├' + '─'.repeat(73) + '┤');

        // Word-wrap response
        const response = result.occasion.future.response;
        const words = response.split(' ');
        let line = '';
        for (const word of words) {
          if (line.length + word.length + 1 <= 70) {
            line += (line ? ' ' : '') + word;
          } else {
            console.log(`│  ${line}`);
            line = word;
          }
        }
        if (line) console.log(`│  ${line}`);

        console.log('└' + '─'.repeat(73) + '┘\n');

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
