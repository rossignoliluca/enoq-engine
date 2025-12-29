/**
 * LIMEN Selection Phased - Two-Phase Selection (S3a/S3b)
 *
 * Closes the historical GAP: no more one-shot commit before signals arrive.
 *
 * Flow:
 * S3a: Generate 1-3 candidate ResponsePlans (not strings)
 * SYNC: Wait for EarlySignals (deadline 120ms) or use fallback
 * S3b: Commit 1 plan with final constraints
 *
 * Key invariant:
 * - EarlySignals can modify CONSTRAINTS and SCORING
 * - EarlySignals CANNOT modify ACTS
 * - Acts are decided by S3b based on candidates
 *
 * Commit is DETERMINISTIC given (input + signals + defaults).
 */

import { FieldState, ProtocolSelection, SupportedLanguage } from '../../interface/types';
import { select } from '../l2_reflect/selection';
import { DimensionalState } from '../../operational/detectors/dimensional_system';
import {
  ResponsePlan,
  CandidateSet,
  SpeechAct,
  SpeechActType,
  PlanConstraints,
  PlanMetadata,
  RiskFlags,
  WarmthLevel,
  BrevityLevel,
  PlanObservability,
  DecisionEvent,
  ReasonCode,
  createDefaultPlan,
  createEmergencyPlan,
  createVModePlan,
  validatePlan,
} from '../l5_transform/response_plan';
import {
  EarlySignals,
  EarlySignalsStatus,
  applySignalsToPlan,
  CONSERVATIVE_DEFAULTS,
} from '../../operational/signals/early_signals';

// ============================================
// TYPES
// ============================================

/**
 * Input for phased selection.
 */
export interface PhasedSelectionInput {
  field_state: FieldState;
  dimensional_state: DimensionalState;
  protocol_selection: ProtocolSelection;
  language: SupportedLanguage;
  turn: number;
  potency: number;
  withdrawal_bias: number;
}

/**
 * Output of S3a: candidate plans.
 */
export interface S3aOutput {
  candidates: CandidateSet;
  recommended_index: number;
  generation_time_ms: number;
}

/**
 * Output of S3b: committed plan.
 */
export interface S3bOutput {
  plan: ResponsePlan;
  selected_index: number;
  commit_reason: string;
  observability: PlanObservability;
  commit_time_ms: number;
}

/**
 * Full phased selection result.
 */
export interface PhasedSelectionResult {
  s3a: S3aOutput;
  s3b: S3bOutput;
  early_signals_status: EarlySignalsStatus;
  total_time_ms: number;
}

// ============================================
// PRIMITIVE TO ACTS MAPPING
// ============================================

/**
 * Map protocol primitive to speech acts.
 */
const PRIMITIVE_TO_ACTS: Record<string, SpeechAct[]> = {
  'P01_GROUND': [
    { type: 'ground', force: 0.9 },
    { type: 'hold', force: 0.7 },
  ],
  'P02_VALIDATE': [
    { type: 'validate', force: 0.7 },
    { type: 'acknowledge', force: 0.5 },
  ],
  'P03_REFLECT': [
    { type: 'mirror', force: 0.6 },
    { type: 'acknowledge', force: 0.4 },
  ],
  'P04_OPEN': [
    { type: 'acknowledge', force: 0.3 },
    { type: 'question', force: 0.6 },
  ],
  'P05_CRYSTALLIZE': [
    { type: 'name', force: 0.7 },
    { type: 'map', force: 0.5 },
  ],
  'P06_RETURN_AGENCY': [
    { type: 'acknowledge', force: 0.4 },
    { type: 'boundary', force: 0.6 },
    { type: 'return_agency', force: 0.8 },
  ],
  'P07_HOLD_SPACE': [
    { type: 'hold', force: 0.8 },
    { type: 'validate', force: 0.4 },
  ],
  'P08_MAP_DECISION': [
    { type: 'acknowledge', force: 0.3 },
    { type: 'map', force: 0.7 },
    { type: 'return_agency', force: 0.5 },
  ],
  'P09_INFORM': [
    { type: 'acknowledge', force: 0.2 },
    { type: 'offer_frame', force: 0.6 },
  ],
  'P10_COMPLETE_TASK': [
    { type: 'acknowledge', force: 0.2 },
  ],
  'P11_INVITE': [
    { type: 'acknowledge', force: 0.3 },
    { type: 'question', force: 0.5 },
  ],
  'P12_ACKNOWLEDGE': [
    { type: 'acknowledge', force: 0.8 },
    { type: 'hold', force: 0.6 },
  ],
  'P13_REFLECT_RELATION': [
    { type: 'mirror', force: 0.6 },
    { type: 'name', force: 0.5 },
  ],
  'P14_HOLD_IDENTITY': [
    { type: 'hold', force: 0.8 },
    { type: 'boundary', force: 0.5 },
    { type: 'return_agency', force: 0.6 },
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique plan ID.
 */
function generatePlanId(): string {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Map depth to max_length.
 */
function depthToMaxLength(depth: 'surface' | 'medium' | 'deep'): number {
  switch (depth) {
    case 'surface': return 50;
    case 'medium': return 120;
    case 'deep': return 200;
  }
}

/**
 * Map tone warmth to WarmthLevel.
 */
function toneToWarmth(warmth: 1 | 2 | 3 | 4 | 5): WarmthLevel {
  if (warmth <= 2) return 'cold';
  if (warmth === 3) return 'neutral';
  if (warmth === 4) return 'warm';
  return 'very_warm';
}

/**
 * Map length to BrevityLevel.
 */
function lengthToBrevity(length: 'minimal' | 'brief' | 'moderate'): BrevityLevel {
  switch (length) {
    case 'minimal': return 'minimal';
    case 'brief': return 'brief';
    case 'moderate': return 'moderate';
  }
}

/**
 * Extract risk flags from dimensional state.
 */
function extractRiskFlags(
  dimensionalState: DimensionalState,
  fieldState: FieldState
): RiskFlags {
  return {
    crisis: fieldState.flags.includes('crisis'),
    emergency: dimensionalState.emergency_detected,
    v_mode: dimensionalState.v_mode_triggered,
    enchantment: fieldState.flags.includes('dependency_signal'),
    loop_detected: fieldState.loop_count > 3,
    boundary_approach: dimensionalState.v_mode_triggered &&
                       dimensionalState.vertical.EXISTENTIAL > 0.7,
  };
}

// ============================================
// S3a: GENERATE CANDIDATE PLANS
// ============================================

/**
 * S3a: Generate 1-3 candidate ResponsePlans.
 *
 * Produces ResponsePlan[] (not strings) with:
 * - acts (from primitive mapping)
 * - constraints (from selection)
 * - metadata (from field + dimensional)
 * - frontier defaults (tool_intent: none, compute_budget: minimal)
 */
export function generateCandidatePlans(input: PhasedSelectionInput): S3aOutput {
  const startTime = Date.now();
  const candidates: ResponsePlan[] = [];

  const { field_state, dimensional_state, protocol_selection, language, turn, potency, withdrawal_bias } = input;

  // Extract common metadata
  const riskFlags = extractRiskFlags(dimensional_state, field_state);
  const baseMetadata: PlanMetadata = {
    risk: riskFlags,
    potency,
    withdrawal_bias,
    turn,
    timestamp: Date.now(),
  };

  // ---- CANDIDATE 1: Primary (from protocol selection) ----
  const primaryActs = PRIMITIVE_TO_ACTS[protocol_selection.primitive] ||
    [{ type: 'acknowledge' as SpeechActType, force: 0.5 }];

  const primaryConstraints: PlanConstraints = {
    max_length: depthToMaxLength(protocol_selection.depth),
    warmth: toneToWarmth(protocol_selection.tone.warmth),
    brevity: lengthToBrevity(protocol_selection.length),
    pronouns: 'i_you',
    tools_allowed: false,  // Default: no tools in phase 1
    must_require_user_effort: riskFlags.v_mode || field_state.flags.includes('delegation_attempt'),
    forbidden: protocol_selection.forbidden as any[],
    required: protocol_selection.required as any[],
    language,
  };

  const primaryPlan: ResponsePlan = {
    id: generatePlanId(),
    acts: [...primaryActs],
    constraints: primaryConstraints,
    metadata: { ...baseMetadata },
    confidence: protocol_selection.confidence,
    reasoning: `Primary: ${protocol_selection.primitive} from ${protocol_selection.atmosphere}`,
    source: 'selection',
  };

  candidates.push(primaryPlan);

  // ---- CANDIDATE 2: Conservative variant (if not already minimal) ----
  if (protocol_selection.depth !== 'surface') {
    const conservativeConstraints: PlanConstraints = {
      ...primaryConstraints,
      max_length: Math.min(primaryConstraints.max_length, 80),
      brevity: 'brief',
      tools_allowed: false,
    };

    // Reduce force on all acts
    const conservativeActs = primaryActs.map(act => ({
      ...act,
      force: act.force * 0.7,
    }));

    const conservativePlan: ResponsePlan = {
      id: generatePlanId(),
      acts: conservativeActs,
      constraints: conservativeConstraints,
      metadata: { ...baseMetadata },
      confidence: protocol_selection.confidence * 0.9,
      reasoning: `Conservative: reduced depth from ${protocol_selection.depth}`,
      source: 'selection',
    };

    candidates.push(conservativePlan);
  }

  // ---- CANDIDATE 3: Minimal safe (always available as fallback) ----
  if (candidates.length < 3) {
    const minimalPlan: ResponsePlan = {
      id: generatePlanId(),
      acts: [
        { type: 'acknowledge', force: 0.3 },
        { type: 'hold', force: 0.5 },
      ],
      constraints: {
        max_length: 40,
        warmth: 'neutral',
        brevity: 'minimal',
        pronouns: 'i_you',
        tools_allowed: false,
        must_require_user_effort: false,
        forbidden: [...primaryConstraints.forbidden],
        required: [],
        language,
      },
      metadata: { ...baseMetadata },
      confidence: 0.6,
      reasoning: 'Minimal safe fallback',
      source: 'fallback',
    };

    candidates.push(minimalPlan);
  }

  // ---- Special cases: override with emergency/v_mode plans ----
  if (riskFlags.emergency) {
    // Emergency always gets priority
    const emergencyPlan = createEmergencyPlan(language);
    emergencyPlan.metadata = { ...baseMetadata, ...emergencyPlan.metadata };
    candidates.unshift(emergencyPlan);
  } else if (riskFlags.v_mode) {
    // V_MODE gets priority
    const vmodePlan = createVModePlan(language);
    vmodePlan.metadata = { ...baseMetadata, ...vmodePlan.metadata };
    candidates.unshift(vmodePlan);
  }

  // Limit to 3 candidates
  const finalCandidates = candidates.slice(0, 3);

  // Determine recommended candidate
  const recommended = 0;  // First is always primary/emergency/vmode
  const recommendationReason = riskFlags.emergency
    ? 'Emergency detected - ground first'
    : riskFlags.v_mode
    ? 'V_MODE detected - return agency'
    : 'Primary selection from protocol';

  const generationTime = Date.now() - startTime;

  return {
    candidates: {
      candidates: finalCandidates,
      recommended,
      recommendation_reason: recommendationReason,
      generated_at: Date.now(),
      generation_time_ms: generationTime,
    },
    recommended_index: recommended,
    generation_time_ms: generationTime,
  };
}

// ============================================
// S3b: COMMIT PLAN
// ============================================

/**
 * S3b: Commit one plan with final constraints.
 *
 * Input:
 * - candidate plans (from S3a)
 * - early signals (from bridge, may be partial/timeout)
 * - early signals status (for observability)
 *
 * Output:
 * - 1 committed plan with final constraints
 * - observability record
 *
 * Key invariant: DETERMINISTIC given (candidates + signals + status).
 */
export function commitPlan(
  candidateSet: CandidateSet,
  earlySignals: EarlySignals,
  signalsStatus: EarlySignalsStatus
): S3bOutput {
  const startTime = Date.now();
  const events: DecisionEvent[] = [];

  // ---- Step 1: Select candidate ----
  let selectedIndex = candidateSet.recommended;
  let selectionReason: ReasonCode = 'candidate_selected_by_score';

  // Check if EarlySignals suggest a different candidate
  if (earlySignals.candidate_suggestions && earlySignals.candidate_suggestions.length > 0) {
    const suggestion = earlySignals.candidate_suggestions[0];
    // Find matching candidate by primary act
    const matchIndex = candidateSet.candidates.findIndex(c =>
      c.acts.length > 0 && c.acts[0].type === suggestion.act
    );
    if (matchIndex >= 0 && suggestion.confidence > 0.6) {
      selectedIndex = matchIndex;
      selectionReason = 'candidate_selected_by_early_signals';
      events.push({
        timestamp: Date.now(),
        code: 'candidate_selected_by_early_signals',
        details: `EarlySignals suggested ${suggestion.act} with confidence ${suggestion.confidence}`,
        source: 'early_signals',
      });
    }
  }

  // Check vetoes - may force different candidate
  if (earlySignals.vetoes && earlySignals.vetoes.length > 0) {
    for (const veto of earlySignals.vetoes) {
      if (veto.severity >= 0.8) {
        // Hard veto - move to safer candidate
        selectedIndex = Math.min(selectedIndex + 1, candidateSet.candidates.length - 1);
        events.push({
          timestamp: Date.now(),
          code: 'veto_by_safety',
          details: `Veto from ${veto.source}: ${veto.reason}`,
          source: veto.source,
        });
      }
    }
  }

  // If signals didn't arrive, use fallback logic
  if (signalsStatus.timed_out) {
    selectionReason = 'candidate_selected_by_fallback';
    events.push({
      timestamp: Date.now(),
      code: 'early_signals_timeout',
      details: `Timeout after ${signalsStatus.wait_time_ms}ms, using conservative selection`,
      source: 'pipeline',
    });
    // Move toward safer candidate on timeout
    selectedIndex = Math.min(selectedIndex + 1, candidateSet.candidates.length - 1);
  }

  // ---- Step 2: Clone selected plan ----
  const basePlan = candidateSet.candidates[selectedIndex];
  let plan: ResponsePlan = {
    ...basePlan,
    id: generatePlanId(),  // New ID for committed plan
    constraints: { ...basePlan.constraints },
    metadata: { ...basePlan.metadata },
  };

  // ---- Step 3: Apply EarlySignals to constraints (NOT acts) ----
  // This is the key invariant: signals modify constraints, not acts

  if (signalsStatus.arrived_before_deadline) {
    plan = applySignalsToPlan(plan, earlySignals);
    events.push({
      timestamp: Date.now(),
      code: 'early_signals_arrived',
      details: `Signals from: ${earlySignals.contributors?.join(', ') || 'unknown'}`,
      source: 'early_signals',
    });
  }

  // ---- Step 4: Apply policy adjustments from signals ----
  if (earlySignals.policy_adjustments) {
    const adj = earlySignals.policy_adjustments;

    if (adj.max_length !== undefined && adj.max_length < plan.constraints.max_length) {
      plan.constraints.max_length = adj.max_length;
      events.push({
        timestamp: Date.now(),
        code: 'constraint_added_by_regulatory',
        details: `max_length reduced to ${adj.max_length}`,
        source: 'policy',
      });
    }

    if (adj.disable_tools) {
      plan.constraints.tools_allowed = false;
      events.push({
        timestamp: Date.now(),
        code: 'constraint_added_by_regulatory',
        details: 'tools disabled by policy',
        source: 'policy',
      });
    }
  }

  // ---- Step 5: Apply lifecycle constraints (stub - to be enhanced) ----
  if (plan.metadata.potency < 0.3) {
    // Low potency = minimal intervention
    plan.constraints.max_length = Math.min(plan.constraints.max_length, 60);
    plan.constraints.brevity = 'minimal';
    events.push({
      timestamp: Date.now(),
      code: 'constraint_added_by_regulatory',
      details: `Low potency (${plan.metadata.potency.toFixed(2)}) - reduced intervention`,
      source: 'lifecycle',
    });
  }

  if (plan.metadata.withdrawal_bias > 0.5) {
    // High withdrawal = cooler, briefer
    plan.constraints.warmth = 'neutral';
    plan.constraints.brevity = 'brief';
    events.push({
      timestamp: Date.now(),
      code: 'constraint_added_by_regulatory',
      details: `High withdrawal (${plan.metadata.withdrawal_bias.toFixed(2)}) - reduced presence`,
      source: 'lifecycle',
    });
  }

  // ---- Step 6: Validate plan ----
  const validation = validatePlan(plan);
  if (!validation.valid) {
    // Plan invalid - fall back to minimal safe
    events.push({
      timestamp: Date.now(),
      code: 'veto_by_constitution',
      details: `Plan violations: ${validation.violations.join(', ')}`,
      source: 'constitution',
    });

    // Use last candidate (minimal safe)
    plan = {
      ...candidateSet.candidates[candidateSet.candidates.length - 1],
      id: generatePlanId(),
    };
  }

  // ---- Step 7: Build observability record ----
  const commitTime = Date.now() - startTime;

  const observability: PlanObservability = {
    arrived_before_deadline: signalsStatus.arrived_before_deadline,
    signals_received: Object.entries(signalsStatus.signals_received)
      .filter(([_, received]) => received)
      .map(([signal]) => signal),
    defaults_used: signalsStatus.defaults_used,
    constraints_applied: events.filter(e =>
      e.code.startsWith('constraint_')
    ),
    veto_events: events.filter(e =>
      e.code.startsWith('veto_')
    ),
    decision_time_ms: commitTime,
  };

  // ---- Step 8: Update plan reasoning ----
  plan.reasoning = `${plan.reasoning} → Committed via ${selectionReason}`;

  return {
    plan,
    selected_index: selectedIndex,
    commit_reason: selectionReason,
    observability,
    commit_time_ms: commitTime,
  };
}

// ============================================
// FULL PHASED SELECTION
// ============================================

/**
 * Execute full phased selection (S3a + wait + S3b).
 *
 * This is the main entry point for the pipeline.
 * It handles the sync point and deadline.
 */
export async function phasedSelection(
  input: PhasedSelectionInput,
  earlySignalsPromise: Promise<{ signals: EarlySignals; status: EarlySignalsStatus }>
): Promise<PhasedSelectionResult> {
  const startTime = Date.now();

  // ---- S3a: Generate candidates ----
  const s3a = generateCandidatePlans(input);

  // ---- SYNC POINT: Wait for signals or timeout ----
  const { signals, status } = await earlySignalsPromise;

  // ---- S3b: Commit plan ----
  const s3b = commitPlan(s3a.candidates, signals, status);

  return {
    s3a,
    s3b,
    early_signals_status: status,
    total_time_ms: Date.now() - startTime,
  };
}

// ============================================
// SYNC EXECUTION (for testing)
// ============================================

/**
 * Execute phased selection synchronously with provided signals.
 * Used for testing determinism.
 */
export function phasedSelectionSync(
  input: PhasedSelectionInput,
  earlySignals: EarlySignals,
  signalsStatus: EarlySignalsStatus
): PhasedSelectionResult {
  const startTime = Date.now();

  const s3a = generateCandidatePlans(input);
  const s3b = commitPlan(s3a.candidates, earlySignals, signalsStatus);

  return {
    s3a,
    s3b,
    early_signals_status: signalsStatus,
    total_time_ms: Date.now() - startTime,
  };
}

// Types and functions are exported inline above
