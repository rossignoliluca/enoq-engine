/**
 * LIMEN PIPELINE - S0 → S6 ORCHESTRATOR
 *
 * The thread that connects everything.
 * Input → Gate → Perceive → Select → Act → Verify → Return
 *
 * This is ENOQ.
 */

import { FieldState, ProtocolSelection, GoalType, Flag, GateSignal, GateReasonCode, SupportedLanguage } from '../../interface/types';
import { perceive } from '../../mediator/l1_clarify/perception';
import { select } from '../../mediator/l2_reflect/selection';
import { applyDomainGovernor, GovernorResult } from '../../gate/enforcement/domain_governor';
import {
  applyMetaKernel,
  MetaKernelState,
  SessionTelemetry,
  TurnTelemetry,
  createDefaultState as createDefaultMetaKernelState,
} from '../../mediator/l3_integrate/meta_kernel';
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
} from '../../gate/verification/S5_verify';
import {
  GateClient,
  GateResult,
  GateSignalEffect,
  interpretGateSignal,
  getGateClient,
  GateClientConfig,
} from '../../operational/providers/gate_client';
import {
  EmbeddedGate,
  EmbeddedGateResult,
  GateSignalEffect as EmbeddedGateEffect,
  getEmbeddedGate,
  interpretEmbeddedGateSignal,
} from '../../operational/providers/gate_embedded';
import {
  curveSelection,
  getFieldTraceInfo,
  FieldTraceInfo
} from '../experimental/field_integration';
import { DimensionalState } from '../../operational/detectors/dimensional_system';
import { hybridDetector } from '../../operational/detectors/hybrid_detector';
import {
  getUltimateDetector,
  UltimateDetector,
  DetectorOutput,
  SafetyFloor,
  RiskFlags
} from '../../operational/detectors/ultimate_detector';
import {
  ManifoldState,
  InputState,
  FieldConfig,
  DEFAULT_FIELD_CONFIG,
  createInitialState as createInitialManifoldState,
  stateFromInput,
  evolve as evolveManifold,
  diagnostics as manifoldDiagnostics,
  FieldDiagnostics
} from '../../mediator/l2_reflect/stochastic_field';
import {
  curveSelectionWithManifold,
  CurvatureResult,
  CurvatureEntry,
  getCurvatureSeverity
} from '../../mediator/l2_reflect/selection_curver';
import {
  getRegulatoryStore,
  RegulatoryState,
  createDefaultState as createDefaultRegulatoryState,
  IRegulatoryStore
} from '../../gate/withdrawal/regulatory_store';

// v5.1 Unified Gating (single routing point for LLM calls)
import {
  UnifiedGating,
  UnifiedGatingDecision,
  UnifiedGatingStats,
  SkipReason,
} from '../../operational/gating/unified_gating';
import { DimensionalDetector } from '../../operational/detectors/dimensional_system';

// ============================================
// NEW ARCHITECTURE IMPORTS (v3.0)
// Response Plan, EarlySignals, Phased Selection, Lifecycle
// ============================================

import {
  ResponsePlan,
  PlanObservability,
  validatePlan,
} from '../../mediator/l5_transform/response_plan';

import {
  EarlySignals,
  EarlySignalsStatus,
  DEADLINE_CONFIG,
  waitForSignals,
  CONSERVATIVE_DEFAULTS,
} from '../../operational/signals/early_signals';

import {
  bridgeWithDeadline,
  generateFastSignals,
  BridgeInput,
} from '../../mediator/l4_agency/total_system_bridge';

import {
  generateCandidatePlans,
  commitPlan,
  phasedSelection,
  PhasedSelectionInput,
  PhasedSelectionResult,
} from '../../mediator/l2_reflect/selection_phased';

import {
  initLifecycleSnapshot,
  getLifecycleSnapshot,
  applyLifecycleConstraints,
  updateLifecycleStore,
  calculateInfluenceUsed,
  LifecycleSnapshot,
  TurnOutcome,
} from '../../gate/withdrawal/lifecycle_controller';

import {
  renderPlan,
  RenderResult,
} from '../../mediator/l5_transform/plan_renderer';

import {
  verifyAndFixPlan,
  PlanVerification,
} from '../../gate/verification/plan_act_verifier';

// ============================================
// PIPELINE CONFIG
// ============================================

export interface PipelineConfig {
  // Gate configuration
  // 'embedded' = local classifier (default, zero latency)
  // 'http' = remote gate-runtime service
  // 'disabled' = skip gate entirely
  gate_mode?: 'embedded' | 'http' | 'disabled';
  gate_enabled: boolean;  // Deprecated: use gate_mode instead
  gate_url?: string;
  gate_timeout_ms?: number;

  // Ultimate Detector config (default: true for 100% accuracy)
  use_ultimate_detector?: boolean;
  ultimate_detector_debug?: boolean;

  // Regulatory Store config (cross-session state)
  // If user_id provided, loads/saves regulatory state across sessions
  user_id?: string;
  regulatory_store_enabled?: boolean;

  // v3.0 Architecture (default: false for backward compatibility)
  // When true, uses:
  // - Phased selection (S3a/S3b)
  // - EarlySignals with deadline
  // - ResponsePlan + template renderer
  // - Lifecycle controller
  use_v3_architecture?: boolean;

  // v3.0 EarlySignals deadline (default: 100ms)
  early_signals_deadline_ms?: number;

  // v5.1 Unified Gating (single routing point for LLM calls)
  // Combines: Cache + Hard Skip + NP Gating
  // Target: <50% LLM call rate with 100% V_MODE recall
  use_unified_gating?: boolean;
  unified_gating_debug?: boolean;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  gate_mode: 'embedded',  // Default to embedded (zero latency, no HTTP)
  gate_enabled: true,
  gate_url: process.env.GATE_RUNTIME_URL || 'http://localhost:3000',
  gate_timeout_ms: 1000,
  use_ultimate_detector: true, // Default to ultimate detector (100% accuracy)
  ultimate_detector_debug: Boolean(process.env.ENOQ_DEBUG),
  regulatory_store_enabled: true, // Default to enabled for cross-session learning
  use_v3_architecture: false,  // v3.0: disabled by default for backward compatibility
  early_signals_deadline_ms: DEADLINE_CONFIG.STANDARD_MS,  // v3.0: 100ms default
  use_unified_gating: true,  // v5.1: enabled by default (reduces LLM calls 50%+)
  unified_gating_debug: Boolean(process.env.ENOQ_DEBUG),
};

// Ultimate detector singleton (lazy init)
let ultimateDetector: UltimateDetector | null = null;

// v5.1 Unified Gating singleton (lazy init)
let unifiedGatingInstance: UnifiedGating | null = null;
let dimensionalDetectorInstance: DimensionalDetector | null = null;

function getUnifiedGating(debug: boolean = false): UnifiedGating {
  if (!unifiedGatingInstance) {
    unifiedGatingInstance = new UnifiedGating({ debug });
  }
  return unifiedGatingInstance;
}

function getDimensionalDetector(): DimensionalDetector {
  if (!dimensionalDetectorInstance) {
    dimensionalDetectorInstance = new DimensionalDetector();
  }
  return dimensionalDetectorInstance;
}

// ============================================
// SESSION TYPES
// ============================================

export interface Session {
  session_id: string;
  user_id?: string;  // Optional: enables cross-session regulatory state
  created_at: Date;
  turns: Turn[];

  // State machines
  meta_kernel_state: MetaKernelState;

  // Stochastic field state (Langevin dynamics)
  manifold_state: ManifoldState;

  // Cross-session regulatory state (loaded from store if user_id provided)
  regulatory_state?: RegulatoryState;

  // Lifecycle state (v3.0 - influence budget, termination, dormancy)
  lifecycle_snapshot: LifecycleSnapshot;

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

  // Ultimate Detector output (calibrated sensor)
  s1_detector?: {
    domain_probs: {
      D1_CRISIS: number;
      D3_EXISTENTIAL: number;
      D4_RELATIONAL: number;
      KNOWLEDGE: number;
    };
    confidence: number;
    abstention_score: number;
    safety_floor: SafetyFloor;
    risk_flags: RiskFlags;
    latency_ms: number;
    v_mode_triggered: boolean;
    emergency_detected: boolean;
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

  // Stochastic field diagnostics
  s3_stochastic?: {
    regime: 'STABLE' | 'CRITICAL' | 'EMERGENCY' | 'EXISTENTIAL';
    epsilon: number;       // Intervention capacity
    gamma: number;         // Dissipation coefficient
    delta: number;         // Agency transfer gradient
    T: number;             // Effective temperature
    D: number;             // Diffusion coefficient
    U_total: number;       // Total potential energy
    F: number;             // Free energy
    S: number;             // Entropy
    d_identity: number;    // Distance to identity boundary
    absorbed: boolean;     // Hit absorbing boundary (emergency)
    curvature_severity: number;  // 0-1, how much field curved selection
    curvature_applied: string[];  // Which curvatures were applied
    physics_reasoning: string;    // Physics-based explanation
  };

  // Cross-session regulatory state (autonomy tracking)
  s1_regulatory?: {
    potency: number;           // Intervention capacity (0-1)
    withdrawal_bias: number;   // System withdrawal tendency (0-1)
    delegation_trend: number;  // -1 (delegating) to +1 (independent)
    loop_count: number;        // Repetitive pattern count
    constraints_applied: string[];  // How regulatory state curved selection
  };

  // v5.1: Unified Gating (LLM call routing)
  s1_unified_gating?: {
    call_llm: boolean;         // Did we call LLM detector?
    stage: 'cache' | 'hard_skip' | 'np_gating' | 'safety';
    reason: SkipReason;        // Why did we skip/call?
    np_score: number | null;   // NP gating score (if used)
    latency_ms: number;        // Gating decision time
  };

  // v3.0: Phased Selection (S3a/S3b)
  s3_phased?: {
    candidates_count: number;
    recommended_index: number;
    selected_index: number;
    early_signals_arrived: boolean;
    early_signals_contributors: string[];
    commit_reason: string;
    plan_id: string;
  };

  // v3.0: Early Signals Status
  s1_early_signals?: {
    arrived_before_deadline: boolean;
    wait_time_ms: number;
    signals_received: string[];
    defaults_used: string[];
    deadline_used: number;
  };

  // v3.0: Lifecycle
  s6_lifecycle?: {
    influence_used: number;
    remaining_budget: number;
    termination_proximity: number;
    dormancy_recommended: boolean;
    constraints_applied: string[];
  };

  // v3.0: Plan Rendering
  s4_render?: {
    template_used: boolean;
    llm_used: boolean;
    acts_rendered: string[];
    constraint_warnings: string[];
    render_time_ms: number;
  };

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

export function createSession(userId?: string): Session {
  // Load regulatory state from store if user_id provided
  let regulatoryState: RegulatoryState | undefined;
  if (userId) {
    const store = getRegulatoryStore();
    const existing = store.get(userId);
    if (existing) {
      regulatoryState = existing;
      if (process.env.ENOQ_DEBUG) {
        console.log(`[REGULATORY] Loaded state for ${userId}: potency=${existing.potency.toFixed(2)}, withdrawal=${existing.withdrawal_bias.toFixed(2)}, trend=${existing.delegation_trend.toFixed(2)}`);
      }
    } else {
      // Create new regulatory state for this user
      regulatoryState = createDefaultRegulatoryState(userId);
      store.save(regulatoryState);
      if (process.env.ENOQ_DEBUG) {
        console.log(`[REGULATORY] Created new state for ${userId}`);
      }
    }
  }

  // Generate session ID
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;

  // Initialize lifecycle snapshot (v3.0)
  const lifecycleSnapshot = initLifecycleSnapshot(sessionId);

  return {
    session_id: sessionId,
    user_id: userId,
    created_at: new Date(),
    turns: [],
    meta_kernel_state: createDefaultMetaKernelState(),
    manifold_state: createInitialManifoldState(),  // Stochastic field initial state
    regulatory_state: regulatoryState,  // Cross-session regulatory state
    lifecycle_snapshot: lifecycleSnapshot,  // v3.0: Influence budget, termination, dormancy
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

// ============================================
// STOCHASTIC FIELD HELPERS
// ============================================

/**
 * Convert FieldState (L1 perception) to InputState (stochastic field)
 *
 * Maps psychological concepts to thermodynamic quantities:
 * - arousal → thermal excitation
 * - uncertainty → entropy contribution
 * - coherence → correlation length
 * - domains → existential/somatic/relational loads
 */
function fieldStateToInputState(field: FieldState, content: string): InputState {
  // Compute existential load from domains (use salience property)
  const existentialDomains = ['H06_MEANING', 'H07_IDENTITY', 'H10_TIME', 'H14_DEATH'];
  const existentialLoad = field.domains
    .filter(d => existentialDomains.includes(d.domain))
    .reduce((sum, d) => sum + d.salience, 0) / Math.max(1, field.domains.length);

  // Compute somatic activation
  const somaticDomains = ['H01_SURVIVAL', 'H02_BODY'];
  const somaticActivation = field.domains
    .filter(d => somaticDomains.includes(d.domain))
    .reduce((sum, d) => sum + d.salience, 0) / Math.max(1, field.domains.length);

  // Compute relational valence
  const relationalDomains = ['H04_ATTACHMENT', 'H05_BELONGING', 'H09_TRUST'];
  const relationalScore = field.domains
    .filter(d => relationalDomains.includes(d.domain))
    .reduce((sum, d) => sum + d.salience, 0) / Math.max(1, field.domains.length);
  const relationalValence = relationalScore * 2 - 1;  // Map [0,1] → [-1,1]

  // Temporal orientation from flags
  let temporalOrientation = 0;
  if (field.flags.includes('rumination' as any) || field.flags.includes('regret' as any)) {
    temporalOrientation = -0.5;
  } else if (field.flags.includes('anxiety' as any) || field.flags.includes('planning' as any)) {
    temporalOrientation = 0.5;
  }

  // Novelty from coherence (low coherence = novel/unexpected)
  const coherenceNum = field.coherence === 'high' ? 0.9 : field.coherence === 'low' ? 0.3 : 0.6;
  const novelty = field.coherence === 'high' ? 0.3 :
                  field.coherence === 'low' ? 0.8 : 0.5;

  // Map arousal from string to number if needed
  const arousalNum = typeof field.arousal === 'number' ? field.arousal :
                     field.arousal === 'high' ? 0.8 :
                     field.arousal === 'low' ? 0.2 : 0.5;

  return {
    content,
    arousal: arousalNum,
    uncertainty: field.uncertainty,
    coherence: coherenceNum,
    existential_load: Math.min(1, existentialLoad * 1.5),  // Amplify slightly
    somatic_activation: Math.min(1, somaticActivation * 1.5),
    relational_valence: relationalValence,
    temporal_orientation: temporalOrientation,
    novelty
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
// V3.0 FLOW HELPER
// Phased Selection + EarlySignals + Plan Renderer
// ============================================

interface V3FlowInput {
  s0_input: string;
  s1_field: FieldState;
  dimensionalState: DimensionalState;
  language: SupportedLanguage;
  session: Session;
  protocol_selection: ProtocolSelection;
  deadline_ms: number;
}

interface V3FlowResult {
  output: string;
  phased_result: PhasedSelectionResult;
  render_result: RenderResult;
  lifecycle_update: {
    influence_used: number;
    constraints: string[];
  };
}

async function executeV3Flow(input: V3FlowInput): Promise<V3FlowResult> {
  const { s0_input, s1_field, dimensionalState, language, session, protocol_selection, deadline_ms } = input;

  // Build bridge input for EarlySignals
  const bridgeInput: BridgeInput = {
    user_id: session.user_id || 'anonymous',
    message: s0_input,
    language,
    field_state: s1_field,
    dimensional_state: dimensionalState,
    session_id: session.session_id,
  };

  // Build phased selection input
  const phasedInput: PhasedSelectionInput = {
    field_state: s1_field,
    dimensional_state: dimensionalState,
    protocol_selection,
    language,
    turn: session.turns.length + 1,
    potency: session.regulatory_state?.potency ?? 1.0,
    withdrawal_bias: session.regulatory_state?.withdrawal_bias ?? 0.0,
  };

  // ---- START PARALLEL: EarlySignals + S3a ----
  // S3a generates candidates while we wait for EarlySignals

  // Start EarlySignals generation with deadline
  const earlySignalsPromise = bridgeWithDeadline(bridgeInput, deadline_ms);

  // Execute phased selection (S3a + wait + S3b)
  const phasedResult = await phasedSelection(phasedInput, earlySignalsPromise);

  // ---- APPLY LIFECYCLE CONSTRAINTS ----
  const { plan: lifecyclePlan, constraints: lifecycleConstraints } = applyLifecycleConstraints(
    phasedResult.s3b.plan,
    session.lifecycle_snapshot
  );

  // ---- VALIDATE PLAN ----
  const planValidation = validatePlan(lifecyclePlan);
  if (!planValidation.valid && process.env.ENOQ_DEBUG) {
    console.log(`[V3] Plan validation warnings: ${planValidation.warnings.join(', ')}`);
    if (planValidation.violations.length > 0) {
      console.log(`[V3] Plan validation violations: ${planValidation.violations.join(', ')}`);
    }
  }

  // ---- VERIFY AND FIX PLAN (Constitutional Enforcement) ----
  // This is the constitutional verifier between S3b and S4
  // It can only RESTRICT or SUBSTITUTE, never add content
  //
  // Note: We construct minimal EarlySignals from the plan's metadata
  // since the full signals aren't passed through PhasedSelectionResult
  const minimalSignals: EarlySignals = {
    risk_flags: lifecyclePlan.metadata.risk,
    delegation_pred: lifecyclePlan.metadata.ads ? {
      ads: lifecyclePlan.metadata.ads,
      motive: lifecyclePlan.metadata.motive ?? {
        genuine_incapacity: 0,
        time_saving_tooling: 0,
        time_saving_substitution: 0,
        emotional_offload: 0,
        decision_avoidance: 0,
        validation_seeking: 0,
        habit: 0,
      },
      should_intervene: (lifecyclePlan.metadata.ads?.final ?? 0) > 0.6,
      intervention_level: lifecyclePlan.metadata.ads?.final ?? 0,
    } : undefined,
  };
  const planVerification = verifyAndFixPlan(lifecyclePlan, minimalSignals);

  // Use the verified/fixed plan for rendering
  const verifiedPlan = planVerification.final_plan;

  if (process.env.ENOQ_DEBUG && planVerification.fixes_applied.length > 0) {
    console.log(`[V3] PlanActVerifier fixes: ${planVerification.fixes_applied.length}`);
    for (const fix of planVerification.fixes_applied) {
      console.log(`  - [${fix.violation_rule_id}] ${fix.fix_type}: ${fix.before} → ${fix.after}`);
    }
    if (planVerification.fallback_used) {
      console.log(`[V3] PlanActVerifier used fallback plan`);
    }
  }

  // ---- RENDER PLAN TO TEXT ----
  const renderResult = renderPlan(verifiedPlan);

  // ---- CALCULATE INFLUENCE USED ----
  const influenceUsed = calculateInfluenceUsed(lifecyclePlan);

  // Log v3.0 flow for debugging
  if (process.env.ENOQ_DEBUG) {
    console.log(`[V3] Candidates: ${phasedResult.s3a.candidates.candidates.length}`);
    console.log(`[V3] EarlySignals arrived: ${phasedResult.early_signals_status.arrived_before_deadline}`);
    console.log(`[V3] Contributors: ${phasedResult.early_signals_status.signals_received}`);
    console.log(`[V3] Plan ID: ${verifiedPlan.id}`);
    console.log(`[V3] Acts: ${verifiedPlan.acts.map(a => a.type).join(', ')}`);
    console.log(`[V3] Verifier: valid=${planVerification.valid}, fixes=${planVerification.fixes_applied.length}, fallback=${planVerification.fallback_used}`);
    console.log(`[V3] Rendered: ${renderResult.acts_rendered.join(', ')}`);
    if (renderResult.constraint_warnings.length > 0) {
      console.log(`[V3] Render warnings: ${renderResult.constraint_warnings.join(', ')}`);
    }
  }

  return {
    output: renderResult.text,
    phased_result: phasedResult,
    render_result: renderResult,
    lifecycle_update: {
      influence_used: influenceUsed,
      constraints: lifecycleConstraints.reason !== 'none' ? [lifecycleConstraints.reason] : [],
    },
  };
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
  // Supports: embedded (local), http (remote), disabled
  // ==========================================

  let gateResult: GateResult | null = null;
  let gateEffect: GateSignalEffect = { proceed: true };

  // Determine gate mode (gate_mode takes precedence over gate_enabled)
  const gateMode = config.gate_mode ?? (config.gate_enabled ? 'embedded' : 'disabled');

  if (gateMode === 'embedded') {
    // EMBEDDED GATE: Local classification, zero latency
    const embeddedGate = getEmbeddedGate(true);
    const embeddedResult = embeddedGate.classify(s0_input);

    // Convert to GateResult format for compatibility
    gateResult = {
      signal: embeddedResult.signal,
      reason_code: embeddedResult.reason_code,
      request_id: `embedded_${Date.now()}`,
      latency_ms: embeddedResult.latency_ms,
    };
    gateEffect = interpretEmbeddedGateSignal(embeddedResult.signal, embeddedResult.reason_code);

    // Log Gate result for debugging
    if (process.env.ENOQ_DEBUG) {
      console.log(`[GATE:EMBEDDED] Signal: ${gateResult.signal}, Reason: ${gateResult.reason_code}, Latency: ${gateResult.latency_ms.toFixed(2)}ms`);
      if (embeddedResult.signals_detected.length > 0) {
        console.log(`[GATE:EMBEDDED] Signals: ${embeddedResult.signals_detected.join(', ')}`);
      }
    }

  } else if (gateMode === 'http') {
    // HTTP GATE: Remote gate-runtime service
    const gateClient = session.gate_client || getGateClient({
      base_url: config.gate_url,
      timeout_ms: config.gate_timeout_ms,
      enabled: true,
    });

    try {
      gateResult = await gateClient.classify(s0_input);
      gateEffect = interpretGateSignal(gateResult.signal, gateResult.reason_code);

      // Log Gate result for debugging
      if (process.env.ENOQ_DEBUG) {
        console.log(`[GATE:HTTP] Signal: ${gateResult.signal}, Reason: ${gateResult.reason_code}, Latency: ${gateResult.latency_ms}ms`);
      }
    } catch (error) {
      // HTTP Gate failure - fallback to embedded
      console.warn('[GATE:HTTP] Classification failed, falling back to embedded:', error);

      const embeddedGate = getEmbeddedGate(true);
      const embeddedResult = embeddedGate.classify(s0_input);

      gateResult = {
        signal: embeddedResult.signal,
        reason_code: embeddedResult.reason_code,
        request_id: `embedded_fallback_${Date.now()}`,
        latency_ms: embeddedResult.latency_ms,
        error: error instanceof Error ? error.message : 'HTTP gate failed, used embedded fallback',
      };
      gateEffect = interpretEmbeddedGateSignal(embeddedResult.signal, embeddedResult.reason_code);
    }
  }
  // gateMode === 'disabled': gateResult stays null, gateEffect stays { proceed: true }

  // ==========================================
  // S1: SENSE (Perceive + Governor + MetaKernel)
  // ==========================================

  // Build conversation history from session turns for loop detection
  const conversationHistory = session.turns.map(t => t.input);

  // L1 Perception (with history for loop detection)
  const s1_field = perceive(s0_input, conversationHistory);

  // ==========================================
  // DIMENSIONAL DETECTION + UNIFIED GATING (v5.1)
  //
  // Flow:
  // 1. Fast regex detection (DimensionalDetector) → ~1-5ms
  // 2. Unified Gating decision (Cache/HardSkip/NP) → ~1ms
  // 3. If call_llm=true → Ultimate Detector → ~200-500ms
  // 4. If call_llm=false → use regex result (cached or skipped)
  //
  // Result: 50%+ LLM call reduction with 100% V_MODE recall
  // ==========================================

  // Determine language: use detected language from L1, fallback to session preference
  // This ensures Italian input on first turn gets Italian response
  const detectedLang = s1_field.language && s1_field.language !== 'mixed' && s1_field.language !== 'unknown'
    ? s1_field.language
    : null;
  const language = detectedLang || (session.memory.language_preference === 'auto' ? 'en' : session.memory.language_preference);
  let dimensionalState: DimensionalState;
  let detectorOutput: DetectorOutput | null = null;

  // v5.1: Unified Gating decision
  let gatingDecision: UnifiedGatingDecision | null = null;
  let gatingLatencyMs = 0;

  // Default to ultimate detector if not explicitly disabled
  const useUltimateDetector = config.use_ultimate_detector ?? true;
  const useUnifiedGating = config.use_unified_gating ?? true;

  // STEP 1: Fast regex detection for gating decision
  const gatingStartTime = Date.now();
  const fastDimensionalDetector = getDimensionalDetector();
  const fastDimensionalState = fastDimensionalDetector.detect(s0_input, language, { field_state: s1_field });

  // STEP 2: Unified Gating decides if LLM is needed
  if (useUnifiedGating) {
    const gating = getUnifiedGating(config.unified_gating_debug ?? false);
    gatingDecision = gating.decide(fastDimensionalState, s0_input, language);
    gatingLatencyMs = Date.now() - gatingStartTime;

    if (process.env.ENOQ_DEBUG) {
      console.log(`[UNIFIED_GATING] ${gatingDecision.reason} → call_llm=${gatingDecision.call_llm} (${gatingLatencyMs}ms)`);
      if (gatingDecision.np_score !== null) {
        console.log(`[UNIFIED_GATING] NP score: ${(gatingDecision.np_score * 100).toFixed(0)}%`);
      }
    }
  }

  // STEP 3: Call LLM only if gating says so (or gating disabled)
  if (!useUnifiedGating || gatingDecision?.call_llm) {
    // Need LLM detection
    if (useUltimateDetector) {
      try {
        // Lazy init ultimate detector
        if (!ultimateDetector) {
          ultimateDetector = await getUltimateDetector({
            debug: config.ultimate_detector_debug
          });
        }

        // Get calibrated sensor output
        detectorOutput = await ultimateDetector.detectRaw(s0_input, language);
        dimensionalState = await ultimateDetector.detect(s0_input, language, { field_state: s1_field });

        // Cache the result for future use
        if (useUnifiedGating && gatingDecision) {
          const gating = getUnifiedGating();
          gating.cacheResult(s0_input, language, {
            regime: dimensionalState.v_mode_triggered ? 'existential' : 'functional',
            confidence: detectorOutput.confidence,
            existential: {
              content_detected: dimensionalState.v_mode_triggered,
              specificity: { identity: 0, meaning: 0, death: 0, freedom: 0, isolation: 0 },
              casual_work_context: dimensionalState.primary_vertical === 'FUNCTIONAL',
            },
            v_mode: { triggered: dimensionalState.v_mode_triggered, markers: [] },
            emergency: { triggered: dimensionalState.emergency_detected },
            coherence: 0.9,
          });
        }

        // Log detector output
        if (process.env.ENOQ_DEBUG) {
          console.log(`[ULTIMATE] D1=${detectorOutput.domain_probs.D1_CRISIS.toFixed(2)} D3=${detectorOutput.domain_probs.D3_EXISTENTIAL.toFixed(2)}`);
          console.log(`[ULTIMATE] Safety: ${detectorOutput.safety_floor}, Confidence: ${(detectorOutput.confidence * 100).toFixed(0)}%`);
          if (detectorOutput.risk_flags.low_confidence) console.log(`[ULTIMATE] ⚠ LOW CONFIDENCE`);
          if (detectorOutput.risk_flags.ood_detected) console.log(`[ULTIMATE] ⚠ OOD DETECTED`);
        }

      } catch (error) {
        console.warn('[ULTIMATE] Detection failed, falling back to hybrid:', error);
        dimensionalState = await hybridDetector.detectAsync(s0_input, language, { field_state: s1_field });
      }
    } else {
      // Use legacy hybrid detector
      dimensionalState = await hybridDetector.detectAsync(s0_input, language, { field_state: s1_field });
    }
  } else {
    // Gating said skip LLM - use fast regex result (or cached)
    if (gatingDecision?.cached_result) {
      // Use cached LLM result
      dimensionalState = {
        ...fastDimensionalState,
        v_mode_triggered: gatingDecision.cached_result.v_mode.triggered,
        emergency_detected: gatingDecision.cached_result.emergency.triggered,
      };
      if (process.env.ENOQ_DEBUG) {
        console.log(`[UNIFIED_GATING] Using cached result: v_mode=${dimensionalState.v_mode_triggered}, emergency=${dimensionalState.emergency_detected}`);
      }
    } else {
      // Use fast regex result
      dimensionalState = fastDimensionalState;
      if (process.env.ENOQ_DEBUG) {
        console.log(`[UNIFIED_GATING] Using regex result: v_mode=${dimensionalState.v_mode_triggered}, emergency=${dimensionalState.emergency_detected}`);
      }
    }
  }

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

  // ==========================================
  // SAFETY FLOOR ENFORCEMENT
  // The detector is a sensor - AXIS interprets the floor
  // ==========================================

  if (detectorOutput?.safety_floor === 'STOP') {
    // Detector recommends maximum restraint
    // This is a sensor output, not a decision - but we apply constitutional minimum
    if (process.env.ENOQ_DEBUG) {
      console.log(`[SAFETY] Floor=STOP: applying maximum restraint`);
    }
  }

  // Update session memory with language
  if (s1_field.language && s1_field.language !== 'mixed' && s1_field.language !== 'unknown') {
    session.memory.language_preference = s1_field.language;
  }

  // ==========================================
  // S1.5: STOCHASTIC FIELD EVOLUTION
  // Langevin dynamics on configuration manifold
  // dq = -∇U dt/(1+γ) + √(2D) dB_H
  // ==========================================

  // Create stochastic input, incorporating dimensional detection results
  const baseStochasticInput = fieldStateToInputState(s1_field, s0_input);
  const stochasticInput: InputState = {
    ...baseStochasticInput,
    // Override with dimensional detection (more accurate than L1 domains alone)
    existential_load: dimensionalState.v_mode_triggered
      ? Math.max(baseStochasticInput.existential_load, 0.8)
      : baseStochasticInput.existential_load,
    somatic_activation: dimensionalState.emergency_detected
      ? Math.max(baseStochasticInput.somatic_activation, 0.9)  // Force above threshold
      : baseStochasticInput.somatic_activation,
  };

  const stochasticEvolution = evolveManifold(
    session.manifold_state,
    stochasticInput,
    DEFAULT_FIELD_CONFIG
  );

  // Update session manifold state
  session.manifold_state = stochasticEvolution.state;

  // Get diagnostics
  const stochasticDiagnostics = manifoldDiagnostics(
    session.manifold_state,
    stochasticInput,
    DEFAULT_FIELD_CONFIG
  );

  // Log stochastic field for debugging
  if (process.env.ENOQ_DEBUG) {
    console.log(`[STOCHASTIC] Regime: ${stochasticDiagnostics.regime}, T=${session.manifold_state.T.toFixed(3)}, ε=${session.manifold_state.epsilon.toFixed(3)}`);
    console.log(`[STOCHASTIC] U=${stochasticDiagnostics.U_total.toFixed(2)}, F=${stochasticDiagnostics.F.toFixed(2)}, S=${stochasticDiagnostics.S.toFixed(3)}`);
    if (stochasticEvolution.absorbed) {
      console.log(`[STOCHASTIC] ABSORBED: Emergency grounding triggered`);
    }
  }

  // If stochastic field triggered emergency absorption, override
  if (stochasticEvolution.absorbed && !dimensionalState.emergency_detected) {
    dimensionalState = {
      ...dimensionalState,
      emergency_detected: true,
      primary_vertical: 'SOMATIC'
    };
    if (process.env.ENOQ_DEBUG) {
      console.log(`[STOCHASTIC] Override: Emergency detected via absorbing boundary`);
    }
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
      gateEffect,
      undefined, // fieldTraceInfo
      detectorOutput,
      dimensionalState,
      { diagnostics: stochasticDiagnostics, manifold: session.manifold_state, absorbed: stochasticEvolution.absorbed, curvature: undefined },
      session.regulatory_state ? { state: session.regulatory_state, constraints_applied: [] } : undefined,
      gatingDecision ? { decision: gatingDecision, latency_ms: gatingLatencyMs } : undefined
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
      gateEffect,
      undefined, // fieldTraceInfo
      detectorOutput,
      dimensionalState,
      { diagnostics: stochasticDiagnostics, manifold: session.manifold_state, absorbed: stochasticEvolution.absorbed, curvature: undefined },
      session.regulatory_state ? { state: session.regulatory_state, constraints_applied: [] } : undefined,
      gatingDecision ? { decision: gatingDecision, latency_ms: gatingLatencyMs } : undefined
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
  // V3.0 ARCHITECTURE BRANCH
  // If enabled, use phased selection + EarlySignals + plan renderer
  // This replaces the legacy S3.5→S4→S5→S6 flow
  // ==========================================

  if (config.use_v3_architecture) {
    const deadline_ms = config.early_signals_deadline_ms ?? DEADLINE_CONFIG.STANDARD_MS;

    if (process.env.ENOQ_DEBUG) {
      console.log(`[V3] Architecture enabled, deadline=${deadline_ms}ms`);
    }

    // Execute v3.0 flow: phased selection + EarlySignals + plan renderer
    const v3Result = await executeV3Flow({
      s0_input,
      s1_field,
      dimensionalState,
      language,
      session,
      protocol_selection: s3_selection,
      deadline_ms,
    });

    // Build v3.0 trace
    const v3Trace: PipelineTrace = {
      s0_gate: gateResult ? {
        signal: gateResult.signal,
        reason_code: gateResult.reason_code,
        latency_ms: gateResult.latency_ms,
        effect: gateEffect,
      } : undefined,
      s0_input,
      s1_field,
      s1_governor,
      s1_meta_kernel: {
        rules_applied: metaKernelResult.rules_applied,
        power_level: metaKernelResult.new_state.knobs.power_level,
        depth_ceiling: metaKernelResult.power_envelope.depth_ceiling,
      },
      s1_detector: detectorOutput ? {
        domain_probs: detectorOutput.domain_probs,
        confidence: detectorOutput.confidence,
        abstention_score: detectorOutput.abstention_score,
        safety_floor: detectorOutput.safety_floor,
        risk_flags: detectorOutput.risk_flags,
        latency_ms: detectorOutput.latency_ms,
        v_mode_triggered: dimensionalState.v_mode_triggered,
        emergency_detected: dimensionalState.emergency_detected,
      } : undefined,
      s2_clarify_needed: false,
      s3_selection,
      s3_stochastic: {
        regime: stochasticDiagnostics.regime,
        epsilon: session.manifold_state.epsilon,
        gamma: session.manifold_state.gamma,
        delta: session.manifold_state.delta,
        T: session.manifold_state.T,
        D: session.manifold_state.D,
        U_total: stochasticDiagnostics.U_total,
        F: stochasticDiagnostics.F,
        S: stochasticDiagnostics.S,
        d_identity: stochasticDiagnostics.d_identity,
        absorbed: stochasticEvolution.absorbed,
        curvature_severity: 0,
        curvature_applied: [],
        physics_reasoning: 'v3.0: curvature handled by EarlySignals',
      },
      s1_regulatory: session.regulatory_state ? {
        potency: session.regulatory_state.potency,
        withdrawal_bias: session.regulatory_state.withdrawal_bias,
        delegation_trend: session.regulatory_state.delegation_trend,
        loop_count: session.regulatory_state.loop_count,
        constraints_applied: [],
      } : undefined,
      s4_context: {
        runtime: 'V3_PHASED_SELECTION',
        forbidden: v3Result.phased_result.s3b.plan.constraints.forbidden || [],
        required: v3Result.phased_result.s3b.plan.constraints.required || [],
      },
      s5_verification: {
        passed: true,  // v3.0: validation happens in executeV3Flow
        violations: 0,
        fallback_used: false,
      },
      s6_output: v3Result.output,
      // v3.0 specific fields
      // Convert signals_received object to string[]
      s3_phased: {
        candidates_count: v3Result.phased_result.s3a.candidates.candidates.length,
        recommended_index: v3Result.phased_result.s3a.recommended_index,
        selected_index: v3Result.phased_result.s3b.selected_index,
        early_signals_arrived: v3Result.phased_result.early_signals_status.arrived_before_deadline,
        early_signals_contributors: Object.entries(v3Result.phased_result.early_signals_status.signals_received)
          .filter(([_, received]) => received)
          .map(([signal]) => signal),
        commit_reason: v3Result.phased_result.s3b.commit_reason,
        plan_id: v3Result.phased_result.s3b.plan.id,
      },
      s1_early_signals: {
        arrived_before_deadline: v3Result.phased_result.early_signals_status.arrived_before_deadline,
        wait_time_ms: v3Result.phased_result.early_signals_status.wait_time_ms,
        signals_received: Object.entries(v3Result.phased_result.early_signals_status.signals_received)
          .filter(([_, received]) => received)
          .map(([signal]) => signal),
        defaults_used: v3Result.phased_result.early_signals_status.defaults_used,
        deadline_used: deadline_ms,
      },
      s6_lifecycle: {
        influence_used: v3Result.lifecycle_update.influence_used,
        remaining_budget: session.lifecycle_snapshot.remaining_budget,
        termination_proximity: session.lifecycle_snapshot.termination_proximity,
        dormancy_recommended: session.lifecycle_snapshot.dormancy_recommended,
        constraints_applied: v3Result.lifecycle_update.constraints,
      },
      s4_render: {
        template_used: v3Result.render_result.template_used,
        llm_used: v3Result.render_result.llm_used,
        acts_rendered: v3Result.render_result.acts_rendered,
        constraint_warnings: v3Result.render_result.constraint_warnings,
        render_time_ms: v3Result.render_result.render_time_ms,
      },
      latency_ms: Date.now() - startTime,
    };

    // Create turn
    const v3Turn: Turn = {
      turn_number: turnNumber,
      timestamp: new Date(),
      input: s0_input,
      output: v3Result.output,
      trace: v3Trace,
    };
    session.turns.push(v3Turn);

    // Update lifecycle store
    const turnOutcome: TurnOutcome = {
      user_autonomy_detected: session.telemetry.user_made_decision || session.telemetry.user_disagreed,
      delegation_detected: s1_field.flags.includes('delegation_attempt'),
      influence_used: v3Result.lifecycle_update.influence_used,
      v_mode: dimensionalState.v_mode_triggered,
      emergency: dimensionalState.emergency_detected,
    };
    const lifecycleUpdate = updateLifecycleStore(session.session_id, turnOutcome);
    session.lifecycle_snapshot = lifecycleUpdate.snapshot;

    // Update regulatory state (same logic as legacy flow)
    if (session.regulatory_state && session.user_id) {
      const reg = session.regulatory_state;
      const now = Date.now();

      if (s1_field.flags.includes('delegation_attempt')) {
        reg.delegation_trend = Math.max(-1, reg.delegation_trend - 0.1);
      }
      if (session.telemetry.user_made_decision) {
        reg.delegation_trend = Math.min(1, reg.delegation_trend + 0.15);
      }
      if (dimensionalState.v_mode_triggered) {
        reg.withdrawal_bias = Math.min(1, reg.withdrawal_bias + 0.05);
      }
      reg.loop_count = s1_field.loop_count;
      reg.potency = Math.max(0.1, reg.potency - 0.02);
      reg.last_interaction = now;
      reg.expires_at = now + 24 * 60 * 60 * 1000;

      const store = getRegulatoryStore();
      store.save(reg);

      if (process.env.ENOQ_DEBUG) {
        console.log(`[V3 REGULATORY] Updated: potency=${reg.potency.toFixed(2)}, withdrawal=${reg.withdrawal_bias.toFixed(2)}, trend=${reg.delegation_trend.toFixed(2)}`);
      }
    }

    // Log lifecycle status
    if (process.env.ENOQ_DEBUG) {
      console.log(`[V3 LIFECYCLE] Budget: ${lifecycleUpdate.snapshot.remaining_budget.toFixed(1)}/${lifecycleUpdate.snapshot.total_influence_budget}`);
      console.log(`[V3 LIFECYCLE] Termination: ${(lifecycleUpdate.snapshot.termination_proximity * 100).toFixed(1)}%`);
      if (lifecycleUpdate.dormancy_triggered) {
        console.log(`[V3 LIFECYCLE] DORMANCY TRIGGERED`);
      }
    }

    return {
      output: v3Result.output,
      trace: v3Trace,
      session,
    };
  }

  // ==========================================
  // LEGACY FLOW (v2.x) - when use_v3_architecture is false
  // ==========================================

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
  // S3.55: STOCHASTIC FIELD CURVATURE
  // Langevin dynamics → Selection constraints
  // Closes feedback loop: field evolves → selection curves
  // ==========================================

  const stochasticCurvature = curveSelectionWithManifold(
    s3_selection,
    session.manifold_state,
    stochasticDiagnostics
  );
  s3_selection = stochasticCurvature.selection;

  // Log stochastic curvature for debugging
  if (process.env.ENOQ_DEBUG) {
    const severity = getCurvatureSeverity(session.manifold_state, stochasticDiagnostics);
    if (stochasticCurvature.curvature_applied.length > 0) {
      console.log(`[STOCHASTIC CURVATURE] Severity: ${(severity * 100).toFixed(0)}%`);
      for (const c of stochasticCurvature.curvature_applied) {
        console.log(`[STOCHASTIC CURVATURE] ${c.source}: ${c.action}`);
      }
    }
  }

  // ==========================================
  // S3.57: REGULATORY CONSTRAINTS
  // Cross-session autonomy tracking → Selection constraints
  // System withdrawal as user becomes independent
  // ==========================================

  const regulatoryConstraints: string[] = [];

  if (session.regulatory_state) {
    const reg = session.regulatory_state;

    // High withdrawal_bias → System should withdraw, reduce depth
    if (reg.withdrawal_bias > 0.7) {
      s3_selection.depth = 'surface';
      regulatoryConstraints.push(`High withdrawal (${(reg.withdrawal_bias * 100).toFixed(0)}%): forced surface`);
    } else if (reg.withdrawal_bias > 0.4) {
      const depthOrder: ('surface' | 'medium' | 'deep')[] = ['surface', 'medium', 'deep'];
      const currentIdx = depthOrder.indexOf(s3_selection.depth);
      if (currentIdx > 0) {
        s3_selection.depth = depthOrder[currentIdx - 1];
        regulatoryConstraints.push(`Moderate withdrawal (${(reg.withdrawal_bias * 100).toFixed(0)}%): reduced depth to ${s3_selection.depth}`);
      }
    }

    // Low potency → System has limited intervention capacity
    if (reg.potency < 0.3) {
      s3_selection.depth = 'surface';
      s3_selection.length = 'minimal';
      regulatoryConstraints.push(`Low potency (${(reg.potency * 100).toFixed(0)}%): minimal intervention`);
    } else if (reg.potency < 0.6) {
      if (s3_selection.length === 'moderate') {
        s3_selection.length = 'brief';
      }
      regulatoryConstraints.push(`Reduced potency (${(reg.potency * 100).toFixed(0)}%): brief responses`);
    }

    // Positive delegation_trend (user becoming independent) → Allow exploration, reduce prescription
    if (reg.delegation_trend > 0.5) {
      s3_selection.forbidden = [...new Set([
        ...s3_selection.forbidden,
        'prescribe',
        'direct_advice'
      ])];
      regulatoryConstraints.push(`High independence (trend=${reg.delegation_trend.toFixed(2)}): reduced prescription`);
    }

    // Negative delegation_trend (user delegating more) → Be careful, may need V_MODE
    if (reg.delegation_trend < -0.5 && s3_selection.atmosphere !== 'EMERGENCY') {
      s3_selection.required = [...new Set([
        ...s3_selection.required,
        'return_ownership'
      ])];
      regulatoryConstraints.push(`High delegation (trend=${reg.delegation_trend.toFixed(2)}): ownership return required`);
    }

    // High loop_count → Already handled in stochastic field, but reinforce
    if (reg.loop_count > 5) {
      s3_selection.required = [...new Set([
        ...s3_selection.required,
        'break_pattern'
      ])];
      regulatoryConstraints.push(`Loop detected (${reg.loop_count}): pattern break required`);
    }

    // Log regulatory constraints
    if (process.env.ENOQ_DEBUG && regulatoryConstraints.length > 0) {
      console.log(`[REGULATORY] Constraints applied:`);
      for (const c of regulatoryConstraints) {
        console.log(`[REGULATORY]   ${c}`);
      }
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
  // BUT: V_MODE and EMERGENCY atmospheres from stochastic/dimensional detection take precedence
  if (s1_governor.effect.atmosphere &&
      s3_selection.atmosphere !== 'V_MODE' &&
      s3_selection.atmosphere !== 'EMERGENCY') {
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
    // Gate atmosphere hints, but V_MODE/EMERGENCY from stochastic/dimensional detection take precedence
    // (they are more calibrated than keyword-based Gate)
    if (s3_selection.atmosphere !== 'V_MODE' && s3_selection.atmosphere !== 'EMERGENCY') {
      s3_selection.atmosphere = gateEffect.atmosphere_hint;
    }
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
    getFieldTraceInfo(fieldResponse),
    detectorOutput,
    dimensionalState,
    { diagnostics: stochasticDiagnostics, manifold: session.manifold_state, absorbed: stochasticEvolution.absorbed, curvature: stochasticCurvature },
    session.regulatory_state ? { state: session.regulatory_state, constraints_applied: regulatoryConstraints } : undefined,
    gatingDecision ? { decision: gatingDecision, latency_ms: gatingLatencyMs } : undefined
  );

  const turn: Turn = {
    turn_number: turnNumber,
    timestamp: new Date(),
    input: s0_input,
    output: finalOutput,
    trace,
  };
  session.turns.push(turn);

  // ==========================================
  // UPDATE REGULATORY STATE (Cross-session learning)
  // ==========================================

  if (session.regulatory_state && session.user_id) {
    const reg = session.regulatory_state;
    const now = Date.now();

    // Update delegation_trend based on this turn's behavior
    if (s1_field.flags.includes('delegation_attempt')) {
      // User delegating → trend becomes more negative
      reg.delegation_trend = Math.max(-1, reg.delegation_trend - 0.1);
    }
    if (session.telemetry.user_made_decision) {
      // User made decision → trend becomes more positive
      reg.delegation_trend = Math.min(1, reg.delegation_trend + 0.15);
    }

    // Update withdrawal_bias based on V_MODE triggers
    if (dimensionalState.v_mode_triggered) {
      // V_MODE triggered → slight increase in withdrawal bias
      reg.withdrawal_bias = Math.min(1, reg.withdrawal_bias + 0.05);
    }

    // Update loop_count from field state
    reg.loop_count = s1_field.loop_count;

    // Decay potency slightly each turn (regenerates when not in use)
    reg.potency = Math.max(0.1, reg.potency - 0.02);

    // Update timestamps
    reg.last_interaction = now;
    reg.expires_at = now + 24 * 60 * 60 * 1000;  // 24h TTL

    // Save to store
    const store = getRegulatoryStore();
    store.save(reg);

    // Log regulatory update
    if (process.env.ENOQ_DEBUG) {
      console.log(`[REGULATORY] Updated: potency=${reg.potency.toFixed(2)}, withdrawal=${reg.withdrawal_bias.toFixed(2)}, trend=${reg.delegation_trend.toFixed(2)}`);
    }
  }

  return {
    output: finalOutput,
    trace,
    session,
  };
}

// ============================================
// TRACE HELPERS
// ============================================

interface StochasticTraceInfo {
  diagnostics: FieldDiagnostics;
  manifold: ManifoldState;
  absorbed: boolean;
  curvature?: CurvatureResult;
}

interface RegulatoryTraceInfo {
  state: RegulatoryState;
  constraints_applied: string[];
}

interface UnifiedGatingTraceInfo {
  decision: UnifiedGatingDecision;
  latency_ms: number;
}

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
  fieldTraceInfo?: FieldTraceInfo,
  detectorOutput?: DetectorOutput | null,
  dimensionalState?: DimensionalState,
  stochasticInfo?: StochasticTraceInfo,
  regulatoryInfo?: RegulatoryTraceInfo,
  unifiedGatingInfo?: UnifiedGatingTraceInfo
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
    s1_detector: detectorOutput ? {
      domain_probs: detectorOutput.domain_probs,
      confidence: detectorOutput.confidence,
      abstention_score: detectorOutput.abstention_score,
      safety_floor: detectorOutput.safety_floor,
      risk_flags: detectorOutput.risk_flags,
      latency_ms: detectorOutput.latency_ms,
      v_mode_triggered: dimensionalState?.v_mode_triggered || false,
      emergency_detected: dimensionalState?.emergency_detected || false,
    } : undefined,
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
    s3_stochastic: stochasticInfo ? {
      regime: stochasticInfo.diagnostics.regime,
      epsilon: stochasticInfo.manifold.epsilon,
      gamma: stochasticInfo.manifold.gamma,
      delta: stochasticInfo.manifold.delta,
      T: stochasticInfo.manifold.T,
      D: stochasticInfo.manifold.D,
      U_total: stochasticInfo.diagnostics.U_total,
      F: stochasticInfo.diagnostics.F,
      S: stochasticInfo.diagnostics.S,
      d_identity: stochasticInfo.diagnostics.d_identity,
      absorbed: stochasticInfo.absorbed,
      curvature_severity: stochasticInfo.curvature
        ? getCurvatureSeverity(stochasticInfo.manifold, stochasticInfo.diagnostics)
        : 0,
      curvature_applied: stochasticInfo.curvature
        ? stochasticInfo.curvature.curvature_applied.map(c => c.action)
        : [],
      physics_reasoning: stochasticInfo.curvature
        ? stochasticInfo.curvature.physics_reasoning
        : 'No curvature applied',
    } : undefined,
    s1_regulatory: regulatoryInfo ? {
      potency: regulatoryInfo.state.potency,
      withdrawal_bias: regulatoryInfo.state.withdrawal_bias,
      delegation_trend: regulatoryInfo.state.delegation_trend,
      loop_count: regulatoryInfo.state.loop_count,
      constraints_applied: regulatoryInfo.constraints_applied,
    } : undefined,
    s1_unified_gating: unifiedGatingInfo ? {
      call_llm: unifiedGatingInfo.decision.call_llm,
      stage: unifiedGatingInfo.decision.stage,
      reason: unifiedGatingInfo.decision.reason,
      np_score: unifiedGatingInfo.decision.np_score,
      latency_ms: unifiedGatingInfo.latency_ms,
    } : undefined,
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
        // Stochastic Field info
        if (lastTrace.s3_stochastic) {
          console.log(`Stochastic: regime=${lastTrace.s3_stochastic.regime}, T=${lastTrace.s3_stochastic.T.toFixed(3)}, ε=${lastTrace.s3_stochastic.epsilon.toFixed(3)}`);
          console.log(`Stochastic: U=${lastTrace.s3_stochastic.U_total.toFixed(2)}, F=${lastTrace.s3_stochastic.F.toFixed(2)}, S=${lastTrace.s3_stochastic.S.toFixed(3)}`);
          console.log(`Stochastic: γ=${lastTrace.s3_stochastic.gamma.toFixed(3)}, δ=${lastTrace.s3_stochastic.delta.toFixed(3)}, d_I=${lastTrace.s3_stochastic.d_identity.toFixed(3)}`);
          if (lastTrace.s3_stochastic.absorbed) {
            console.log(`Stochastic: ABSORBED (emergency grounding)`);
          }
          if (lastTrace.s3_stochastic.curvature_severity > 0) {
            console.log(`Curvature: severity=${(lastTrace.s3_stochastic.curvature_severity * 100).toFixed(0)}%`);
            for (const action of lastTrace.s3_stochastic.curvature_applied) {
              console.log(`  → ${action}`);
            }
          }
        }
        // Regulatory state info
        if (lastTrace.s1_regulatory) {
          console.log(`Regulatory: potency=${(lastTrace.s1_regulatory.potency * 100).toFixed(0)}%, withdrawal=${(lastTrace.s1_regulatory.withdrawal_bias * 100).toFixed(0)}%, trend=${lastTrace.s1_regulatory.delegation_trend.toFixed(2)}`);
          if (lastTrace.s1_regulatory.constraints_applied.length > 0) {
            console.log(`Regulatory constraints:`);
            for (const c of lastTrace.s1_regulatory.constraints_applied) {
              console.log(`  → ${c}`);
            }
          }
        }
        // Unified Gating info (v5.1)
        if (lastTrace.s1_unified_gating) {
          console.log(`Gating: ${lastTrace.s1_unified_gating.reason} → call_llm=${lastTrace.s1_unified_gating.call_llm} (${lastTrace.s1_unified_gating.latency_ms}ms)`);
          if (lastTrace.s1_unified_gating.np_score !== null) {
            console.log(`  NP score: ${(lastTrace.s1_unified_gating.np_score * 100).toFixed(0)}%`);
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
  const { ConcrescenceEngine } = await import('../../mediator/concrescence/concrescence_engine');

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
