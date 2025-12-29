/**
 * LIMEN Total System Bridge
 *
 * Connects TotalSystem to the pipeline via EarlySignals.
 *
 * Key principle: TotalSystem produces SIGNALS, not content.
 * Each sub-module contributes its part without blocking others.
 *
 * Mappings:
 * - memory_system → MemoryPrior (patterns, user traits, context)
 * - agent_swarm → VetoSignal (safety vetoes only)
 * - metacognitive_monitor → MetacognitiveSignal (uncertainty, coherence)
 * - temporal_engine → TemporalSignal (inertia, time pressure)
 * - disciplines_synthesis → CandidateSuggestion (max 1-2)
 * - dissipation → PolicyAdjustments (withdrawal, potency)
 *
 * NO sub-module produces text in the hot loop.
 */

import { SupportedLanguage, FieldState } from '../../interface/types';
import { DimensionalState } from '../../operational/detectors/dimensional_system';
import {
  EarlySignals,
  EarlySignalsStatus,
  MemoryPrior,
  VetoSignal,
  MetacognitiveSignal,
  TemporalSignal,
  CandidateSuggestion,
  PolicyAdjustments,
  DelegationPrediction,
  PolicyAdjustmentTrace,
  mergePolicyAdjustments,
  DEADLINE_CONFIG,
  waitForSignals,
  mergeSignals,
  CONSERVATIVE_DEFAULTS,
} from '../../operational/signals/early_signals';
import { ADSScore, MotiveDistribution, RiskFlags } from '../l5_transform/response_plan';

// Import ADS detector
import { computeADS, ADSInput, ADSResult } from '../../gate/enforcement/ads_detector';

// Import Second Order Observer
import {
  observeSecondOrder,
  toPartialPolicy,
  shouldSetEnchantmentFlag,
  SecondOrderInput,
  SecondOrderResult,
  SecondOrderDetection,
} from '../../gate/enforcement/second_order_observer';

// Import TotalSystem components
import { memorySystem } from '../l4_agency/memory_system';
import { agentSwarm } from '../l4_agency/agent_swarm';
import { metacognitiveMonitor } from '../l4_agency/metacognitive_monitor';
import { temporalEngine } from '../l4_agency/temporal_engine';
import { disciplinesSynthesis } from '../l3_integrate/disciplines_synthesis';
import { dissipationEngine } from '../l2_reflect/dissipation';

// Import LLM detector v2 (regime classification)
import { llmDetectorV2, LLMDetectorSignals, ExistentialSpecificity } from '../../operational/detectors/llm_detector_v2';

// ============================================
// BRIDGE INPUT
// ============================================

export interface BridgeInput {
  user_id: string;
  message: string;
  language: SupportedLanguage;
  field_state: FieldState;
  dimensional_state: DimensionalState;
  session_id?: string;

  /** Profile controls which contributors run */
  profile?: 'minimal' | 'standard' | 'full';

  /** Recent system responses for Second Order Observer (last 3-6) */
  recent_system_responses?: string[];

  /** Session history for ADS inertia computation */
  session_history?: {
    delegation_count: number;
    same_topic_count: number;
    intervention_count: number;
    last_intervention_turn?: number;
    current_turn?: number;
  };
}

// ============================================
// INDIVIDUAL SIGNAL EXTRACTORS
// ============================================

/**
 * Extract MemoryPrior from MemorySystem.
 * Max 2-3 patterns, no PII, just traits.
 */
export function extractMemoryPrior(user_id: string): MemoryPrior | undefined {
  try {
    const context = memorySystem.getContext(user_id);

    // Extract patterns from effective_strategies (max 3)
    // SemanticPattern has: pattern_type, triggers, effective_primitives, strength
    const patterns = context.effective_strategies
      .slice(0, 3)
      .map(s => {
        // Build a description from effective primitives
        const primitives = s.effective_primitives?.slice(0, 2).map(p => p.primitive).join(', ') || '';
        return `${s.pattern_type}: ${primitives}`;
      });

    // Extract autonomy state from trajectory
    const autonomyHealthy = context.autonomy_health?.healthy ?? true;
    const autonomyTrajectory = context.autonomy_health?.trajectory ?? 0;

    // Extract user traits from model
    const userTraits: MemoryPrior['user_traits'] = {
      autonomy_level: autonomyHealthy && autonomyTrajectory >= 0 ? 'high' :
                      autonomyTrajectory < -0.3 ? 'low' : 'medium',
      preferred_warmth: 'neutral',  // Would come from user model
      communication_style: 'direct', // Would come from user model
    };

    // Session context (1 line summary)
    const sessionContext = context.working_memory.length > 0
      ? `Previous: ${context.working_memory.length} turns, ${context.autonomy_health?.recommendation || 'continue'}`
      : undefined;

    // Relapse risk based on trajectory
    const relapseRisk = autonomyTrajectory < -0.5 ? 0.7 :
                        autonomyTrajectory < 0 ? 0.5 : 0.2;

    return {
      patterns: patterns.length > 0 ? patterns : undefined,
      user_traits: userTraits,
      session_context: sessionContext,
      relapse_risk: relapseRisk,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract VetoSignals from AgentSwarm.
 * Only safety vetoes, not content suggestions.
 */
export async function extractSwarmVetoes(
  message: string,
  dimensionalState: DimensionalState,
  fieldState: FieldState
): Promise<VetoSignal[]> {
  try {
    // Process through swarm
    const result = await agentSwarm.process(message, dimensionalState, fieldState);

    const vetoes: VetoSignal[] = [];

    // ConsensusState has: reached, primary_interpretation, selected_primitive, response_elements, vetoes[]
    // VetoRecord has: agent, reason, constraint_violated, timestamp
    if (result.consensus.vetoes && result.consensus.vetoes.length > 0) {
      for (const vetoRecord of result.consensus.vetoes) {
        vetoes.push({
          source: 'swarm',
          target: 'act',
          item: vetoRecord.constraint_violated || 'unknown',
          reason: vetoRecord.reason || `Agent ${vetoRecord.agent} veto`,
          severity: 0.8,  // VetoRecord doesn't have severity, default to high
        });
      }
    }

    // Check for AXIS violations in contributions
    for (const [agentId, contribution] of result.contributions) {
      if (contribution.includes('AXIS_VIOLATION') || contribution.includes('CONSTITUTIONAL_BLOCK')) {
        vetoes.push({
          source: 'constitution',
          target: 'plan',
          item: agentId,
          reason: `Agent ${agentId} flagged constitutional issue`,
          severity: 0.9,
        });
      }
    }

    return vetoes;
  } catch {
    return [];
  }
}

/**
 * Extract MetacognitiveSignal from MetacognitiveMonitor.
 */
export function extractMetacognitiveSignal(
  message: string,
  dimensionalState: DimensionalState,
  fieldState: FieldState
): MetacognitiveSignal | undefined {
  try {
    // Get report (with dummy response since we're pre-generation)
    const report = metacognitiveMonitor.generateReport(
      message,
      '', // No response yet
      dimensionalState,
      fieldState,
      agentSwarm.getState(),
      []
    );

    // ConfidenceScore has: overall, components (understanding, interpretation, response_fit, constitutional_alignment), uncertainty
    // CoherenceCheck has: is_coherent, issues[], recommendation

    return {
      uncertainty: 1 - report.confidence.overall,
      need_more_info: report.confidence.components.understanding < 0.5,
      coherence: report.coherence.is_coherent ? 0.8 : 0.3,
      self_awareness: {
        counter_transference_risk: report.confidence.components.response_fit < 0.5,
        projection_risk: false, // Would need deeper analysis
        over_helping_risk: report.alignment.violations.some(v =>
          v.constraint.includes('over-help') || v.constraint.includes('dependency')
        ),
      },
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract TemporalSignal from TemporalEngine.
 */
export function extractTemporalSignal(
  message: string,
  user_id: string,
  dimensionalState: DimensionalState
): TemporalSignal | undefined {
  try {
    const context = memorySystem.getContext(user_id);
    const analysis = temporalEngine.analyze(
      message,
      context.working_memory,
      dimensionalState
    );

    // TemporalAnalysis has: markers, patterns, causal_links, dominant_temporal_frame, temporal_pressure, insights
    // TemporalPressure has: urgency, source, temporal_horizon
    // dominant_temporal_frame is: 'past' | 'present' | 'future'

    // Derive past/future relevance from temporal markers and dominant frame
    // TemporalMarker has type: TemporalReference ('PAST' | 'PRESENT' | 'FUTURE' | 'RECURRING' | 'TRAJECTORY')
    const pastMarkers = analysis.markers?.filter(m => m.type === 'PAST')?.length || 0;
    const futureMarkers = analysis.markers?.filter(m => m.type === 'FUTURE')?.length || 0;
    const totalMarkers = pastMarkers + futureMarkers + 1;

    const pastRelevance = pastMarkers / totalMarkers;
    const futureRelevance = futureMarkers / totalMarkers;

    // Derive inertia from patterns (how stuck is the user in old patterns)
    const stagnationPatterns = analysis.insights?.filter(i => i.type === 'stagnation' || i.type === 'cycle')?.length || 0;
    const inertia = Math.min(1, stagnationPatterns * 0.3 + 0.2);

    return {
      inertia,
      time_pressure: analysis.temporal_pressure?.urgency === 'high' || analysis.temporal_pressure?.urgency === 'crisis',
      past_relevance: pastRelevance,
      future_orientation: futureRelevance,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract CandidateSuggestions from DisciplinesSynthesis.
 * Max 1-2 suggestions.
 */
export function extractCandidateSuggestions(
  message: string,
  dimensionalState: DimensionalState,
  fieldState: FieldState,
  language: SupportedLanguage
): CandidateSuggestion[] {
  try {
    // Get patterns and mode
    const patterns = disciplinesSynthesis.detectPatterns(
      message,
      dimensionalState,
      fieldState,
      language
    );

    const mode = disciplinesSynthesis.determineMode(
      dimensionalState,
      fieldState,
      patterns
    );

    const suggestions: CandidateSuggestion[] = [];

    // Convert mode to act suggestion
    const modeToAct: Record<string, string> = {
      'WITNESS': 'hold',
      'MIRROR': 'mirror',
      'GUIDE': 'map',
    };

    const primaryAct = modeToAct[mode] || 'acknowledge';

    suggestions.push({
      act: primaryAct,
      // PatternMatch has pattern: PatternRecognition, which has signal_detected: string
      target: patterns.length > 0 ? patterns[0].pattern.signal_detected : undefined,
      confidence: 0.7,
      reason: `Mode ${mode} suggests ${primaryAct}`,
    });

    // Add second suggestion if leverage point exists
    const leverage = disciplinesSynthesis.identifyLeveragePoint(message, patterns);
    if (leverage && suggestions.length < 2) {
      suggestions.push({
        act: 'name',
        target: leverage.description,
        confidence: 0.6,
        reason: `Leverage point at level ${leverage.level}`,
      });
    }

    return suggestions.slice(0, 2);  // Max 2
  } catch {
    return [];
  }
}

/**
 * Extract PolicyAdjustments from Dissipation.
 */
export function extractPolicyAdjustments(): PolicyAdjustments | undefined {
  try {
    const state = dissipationEngine.getState();

    return {
      // High withdrawal = reduce max_length
      max_length: state.withdrawal_bias > 0.5 ? 50 : undefined,

      // Low potency = cooler warmth
      warmth_delta: state.potency < 0.3 ? -1 : 0,

      // High withdrawal = more brief
      brevity_delta: state.withdrawal_bias > 0.3 ? -1 : 0,

      // Very low potency = disable tools
      disable_tools: state.potency < 0.2,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract DelegationPrediction using ADS detector.
 *
 * Returns:
 * - DelegationPrediction with ADS score
 * - HARD policy adjustments (disable_tools, must_require_user_effort, brevity_delta)
 */
export function extractDelegationPrediction(
  message: string,
  dimensionalState: DimensionalState,
  fieldState: FieldState,
  sessionHistory?: {
    delegation_count: number;
    same_topic_count: number;
    intervention_count: number;
    last_intervention_turn?: number;
    current_turn?: number;
  }
): { prediction: DelegationPrediction; policy: Partial<PolicyAdjustments>; reasoning: string } | undefined {
  try {
    const adsInput: ADSInput = {
      message,
      dimensionalState,
      fieldState,
      sessionHistory,
    };

    const result = computeADS(adsInput);

    return {
      prediction: result.prediction,
      policy: result.policy,
      reasoning: result.reasoning,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract Second Order Observer signals.
 *
 * Returns:
 * - SOFT policy adjustments only (warmth_delta, force_pronouns, brevity_delta)
 * - Detection scores for debugging
 * - Enchantment flag determination
 */
export function extractSecondOrderSignals(
  message: string,
  recentSystemResponses: string[],
  loopCount: number
): { policy: Partial<PolicyAdjustments>; detection: SecondOrderDetection; reasoning: string; enchantmentFlag: boolean } | undefined {
  try {
    const input: SecondOrderInput = {
      message,
      recent_system_responses: recentSystemResponses,
      loop_count: loopCount,
    };

    const result = observeSecondOrder(input);

    return {
      policy: toPartialPolicy(result.policy),
      detection: result.detection,
      reasoning: result.reasoning,
      enchantmentFlag: shouldSetEnchantmentFlag(result.detection),
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract RiskFlags from dimensional state and field.
 */
export function extractRiskFlags(
  dimensionalState: DimensionalState,
  fieldState: FieldState
): Partial<RiskFlags> {
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
// LLM DETECTOR CONTRIBUTOR
// ============================================

/**
 * LLM detector contribution result.
 * Used to merge with other signals.
 */
export interface LLMDetectorContribution {
  signals: LLMDetectorSignals | null;
  used: boolean;
  reason: string;
}

/**
 * Extract signals from LLM detector v2.
 * Only runs in 'full' profile.
 *
 * Key principle: LLM detector contributes v_mode and existential_specificity,
 * but does NOT override emergency detection (regex is good at that).
 */
export async function extractLLMDetectorSignals(
  message: string,
  language: SupportedLanguage,
  profile: 'minimal' | 'standard' | 'full'
): Promise<LLMDetectorContribution> {
  // Only run in 'full' profile
  if (profile !== 'full') {
    return {
      signals: null,
      used: false,
      reason: `LLM detector skipped (profile=${profile})`,
    };
  }

  try {
    const signals = await llmDetectorV2.contribute(message, language);
    return {
      signals,
      used: signals.llm_detector_called,
      reason: signals.llm_detector_reason,
    };
  } catch (error) {
    return {
      signals: null,
      used: false,
      reason: `LLM detector error: ${error}`,
    };
  }
}

/** Minimum confidence for LLM to override regex */
const LLM_CONFIDENCE_THRESHOLD = 0.65;

/**
 * Merge LLM detector signals with base risk flags.
 *
 * RULE: LLM overrides regex ONLY if LLM is confident (>= threshold).
 * If LLM is uncertain, use "OR" logic (either trigger = trigger).
 * Emergency detection stays with regex (already good at it).
 */
export function mergeWithLLMDetector(
  baseFlags: Partial<RiskFlags>,
  llmSignals: LLMDetectorSignals | null
): Partial<RiskFlags> {
  if (!llmSignals) {
    return baseFlags;
  }

  // LLM confidence = 1 - uncertainty
  const llmConfidence = 1 - (llmSignals.metacognitive?.uncertainty ?? 0.5);
  const llmIsConfident = llmConfidence >= LLM_CONFIDENCE_THRESHOLD;

  // Determine v_mode merge strategy
  let v_mode: boolean;
  if (llmIsConfident) {
    // LLM is confident → trust LLM
    v_mode = llmSignals.risk_flags?.v_mode ?? baseFlags.v_mode ?? false;
  } else {
    // LLM is uncertain → OR logic (either trigger = trigger)
    v_mode = (llmSignals.risk_flags?.v_mode ?? false) || (baseFlags.v_mode ?? false);
  }

  // Same logic for boundary_approach
  let boundary_approach: boolean;
  if (llmIsConfident) {
    boundary_approach = llmSignals.risk_flags?.boundary_approach ?? baseFlags.boundary_approach ?? false;
  } else {
    boundary_approach = (llmSignals.risk_flags?.boundary_approach ?? false) ||
                        (baseFlags.boundary_approach ?? false);
  }

  return {
    ...baseFlags,
    v_mode,
    boundary_approach,
    // Emergency stays with regex (already good at it)
    // emergency: baseFlags.emergency (unchanged)
    // crisis: baseFlags.crisis (unchanged)
  };
}

// ============================================
// MAIN BRIDGE FUNCTION
// ============================================

/**
 * Extended EarlySignals with LLM detector and policy trace metadata.
 */
export interface ExtendedEarlySignals extends EarlySignals {
  /** Existential content detected (primitive) */
  existential_content?: boolean;

  /** Existential specificity breakdown */
  existential_specificity?: ExistentialSpecificity;

  /** LLM detector debug info */
  llm_detector?: {
    called: boolean;
    reason: string;
    timeout: boolean;
  };

  /** Policy adjustment trace (for debugging) */
  policy_trace?: PolicyAdjustmentTrace;

  /** Second Order Observer detection scores */
  second_order_detection?: SecondOrderDetection;
}

/**
 * Generate EarlySignals from TotalSystem components.
 * Runs all extractors in parallel, merges results.
 * Each extractor can fail independently without blocking.
 *
 * profile='full' enables LLM detector for improved v_mode detection.
 */
export async function generateEarlySignals(
  input: BridgeInput
): Promise<ExtendedEarlySignals> {
  const startTime = Date.now();
  const contributors: string[] = [];
  const profile = input.profile || 'standard';

  // Run extractors in parallel (they can fail independently)
  const [
    memoryPrior,
    vetoes,
    metacognitiveSignal,
    temporalSignal,
    candidateSuggestions,
    basePolicyAdjustments,
    adsResult,
    secondOrderResult,
    llmContribution,
  ] = await Promise.all([
    // Memory (fast, sync)
    Promise.resolve(extractMemoryPrior(input.user_id)).then(r => {
      if (r) contributors.push('memory');
      return r;
    }),

    // Swarm vetoes (may be slow)
    extractSwarmVetoes(input.message, input.dimensional_state, input.field_state)
      .then(r => {
        if (r.length > 0) contributors.push('swarm');
        return r;
      })
      .catch(() => []),

    // Metacognitive (sync)
    Promise.resolve(extractMetacognitiveSignal(
      input.message,
      input.dimensional_state,
      input.field_state
    )).then(r => {
      if (r) contributors.push('metacognitive');
      return r;
    }),

    // Temporal (sync)
    Promise.resolve(extractTemporalSignal(
      input.message,
      input.user_id,
      input.dimensional_state
    )).then(r => {
      if (r) contributors.push('temporal');
      return r;
    }),

    // Candidate suggestions (sync)
    Promise.resolve(extractCandidateSuggestions(
      input.message,
      input.dimensional_state,
      input.field_state,
      input.language
    )).then(r => {
      if (r.length > 0) contributors.push('disciplines');
      return r;
    }),

    // Base policy adjustments from dissipation (sync)
    Promise.resolve(extractPolicyAdjustments()).then(r => {
      if (r) contributors.push('dissipation');
      return r;
    }),

    // ADS: Delegation prediction + HARD policy (sync)
    Promise.resolve(extractDelegationPrediction(
      input.message,
      input.dimensional_state,
      input.field_state,
      input.session_history
    )).then(r => {
      if (r) contributors.push('ads');
      return r;
    }),

    // Second Order Observer: SOFT policy (sync)
    Promise.resolve(extractSecondOrderSignals(
      input.message,
      input.recent_system_responses || [],
      input.field_state.loop_count
    )).then(r => {
      if (r) contributors.push('second_order');
      return r;
    }),

    // LLM detector v2 (only in 'full' profile)
    extractLLMDetectorSignals(input.message, input.language, profile)
      .then(r => {
        if (r.used) contributors.push('llm_detector_v2');
        return r;
      })
      .catch((error) => ({
        signals: null,
        used: false,
        reason: `LLM detector error: ${error}`,
      })),
  ]);

  // ---- MERGE POLICY ADJUSTMENTS ----
  // Order: Base → ADS (HARD) → Second Order (SOFT)
  // Rule: min for brevity, OR for disable_tools/must_require_user_effort, sum for warmth
  const adsPolicy = adsResult?.policy ?? {};
  const secondOrderPolicy = secondOrderResult?.policy ?? {};

  // Start with base policy
  let mergedPolicy = basePolicyAdjustments ?? {};

  // Merge ADS policy (HARD constraints)
  mergedPolicy = mergePolicyAdjustments(mergedPolicy, adsPolicy);

  // Merge Second Order policy (SOFT constraints)
  mergedPolicy = mergePolicyAdjustments(mergedPolicy, secondOrderPolicy);

  // Build policy trace for debugging
  const policyTrace: PolicyAdjustmentTrace = {
    ads_policy: adsPolicy,
    second_order_policy: secondOrderPolicy,
    merged_policy: mergedPolicy,
    ads_reasoning: adsResult?.reasoning,
    second_order_reasoning: secondOrderResult?.reasoning,
  };

  // Debug log policy trace
  if (process.env.ENOQ_DEBUG) {
    console.log('[Bridge] ADS:', JSON.stringify(adsPolicy));
    console.log('[Bridge] Second Order:', JSON.stringify(secondOrderPolicy));
    console.log('[Bridge] Merged Policy:', JSON.stringify(mergedPolicy));
  }

  // Extract base risk flags from regex
  const baseRiskFlags = extractRiskFlags(input.dimensional_state, input.field_state);
  contributors.push('risk');

  // Merge with LLM detector signals (LLM has priority for v_mode)
  let riskFlags = mergeWithLLMDetector(baseRiskFlags, llmContribution.signals);

  // Add enchantment flag from Second Order Observer
  if (secondOrderResult?.enchantmentFlag) {
    riskFlags = { ...riskFlags, enchantment: true };
  }

  // Merge metacognitive with LLM detector insights
  let finalMetacognitive = metacognitiveSignal;
  if (llmContribution.signals?.metacognitive) {
    finalMetacognitive = {
      ...metacognitiveSignal,
      // LLM detector provides better coherence estimate
      coherence: llmContribution.signals.metacognitive.coherence ?? metacognitiveSignal?.coherence,
      // Merge uncertainty (take lower = more certain)
      uncertainty: Math.min(
        llmContribution.signals.metacognitive.uncertainty ?? 1,
        metacognitiveSignal?.uncertainty ?? 1
      ),
    };
  }

  const generationTime = Date.now() - startTime;

  return {
    delegation_pred: adsResult?.prediction,
    risk_flags: riskFlags,
    policy_adjustments: mergedPolicy,  // Use merged policy from ADS + Second Order
    candidate_suggestions: candidateSuggestions,
    memory: memoryPrior,
    metacognitive: finalMetacognitive,
    temporal: temporalSignal,
    vetoes,
    generated_at: Date.now(),
    generation_time_ms: generationTime,
    contributors,

    // Extended fields from LLM detector
    existential_content: llmContribution.signals?.existential_content,
    existential_specificity: llmContribution.signals?.existential_specificity,
    llm_detector: {
      called: llmContribution.used,
      reason: llmContribution.reason,
      timeout: llmContribution.signals?.llm_detector_timeout ?? false,
    },

    // Policy trace for debugging
    policy_trace: policyTrace,

    // Second Order detection scores
    second_order_detection: secondOrderResult?.detection,
  };
}

// ============================================
// BRIDGE WITH DEADLINE
// ============================================

/**
 * Run bridge with deadline enforcement.
 * Returns whatever arrived by deadline, plus status.
 */
export async function bridgeWithDeadline(
  input: BridgeInput,
  deadline: number = DEADLINE_CONFIG.STANDARD_MS
): Promise<{ signals: EarlySignals; status: EarlySignalsStatus }> {
  const signalPromise = generateEarlySignals(input);
  return waitForSignals(signalPromise, deadline);
}

// ============================================
// FAST PATH (Sync-only signals)
// ============================================

/**
 * Generate only sync signals (no async operations).
 * Use when deadline is very tight or for fallback.
 */
export function generateFastSignals(input: BridgeInput): EarlySignals {
  const startTime = Date.now();
  const contributors: string[] = [];

  // Only sync extractors
  const memoryPrior = extractMemoryPrior(input.user_id);
  if (memoryPrior) contributors.push('memory');

  const metacognitiveSignal = extractMetacognitiveSignal(
    input.message,
    input.dimensional_state,
    input.field_state
  );
  if (metacognitiveSignal) contributors.push('metacognitive');

  const temporalSignal = extractTemporalSignal(
    input.message,
    input.user_id,
    input.dimensional_state
  );
  if (temporalSignal) contributors.push('temporal');

  const policyAdjustments = extractPolicyAdjustments();
  if (policyAdjustments) contributors.push('dissipation');

  const delegationPred = extractDelegationPrediction(
    input.message,
    input.dimensional_state,
    input.field_state
  );
  if (delegationPred) contributors.push('ads');

  const riskFlags = extractRiskFlags(input.dimensional_state, input.field_state);
  contributors.push('risk');

  // ============================================
  // POLICY MERGE: ADS (HARD) → Second Order (SOFT)
  // ============================================

  // Extract Second Order Observer signals
  const secondOrderResult = extractSecondOrderSignals(
    input.message,
    input.recent_system_responses ?? [],
    input.field_state.loop_count
  );
  if (secondOrderResult) contributors.push('second_order');

  // Merge policies in order: Base → ADS → Second Order
  let mergedPolicy = policyAdjustments ?? {};
  if (delegationPred?.policy) {
    mergedPolicy = mergePolicyAdjustments(mergedPolicy, delegationPred.policy);
  }
  if (secondOrderResult?.policy) {
    mergedPolicy = mergePolicyAdjustments(mergedPolicy, secondOrderResult.policy);
  }

  // Add enchantment flag to risk flags if detected
  let finalRiskFlags = riskFlags;
  if (secondOrderResult?.enchantmentFlag) {
    finalRiskFlags = { ...riskFlags, enchantment: true };
  }

  // Build policy trace for debugging
  const policyTrace: PolicyAdjustmentTrace = {
    ads_policy: delegationPred?.policy ?? {},
    second_order_policy: secondOrderResult?.policy ?? {},
    merged_policy: mergedPolicy as PolicyAdjustments,
    ads_reasoning: delegationPred?.reasoning,
    second_order_reasoning: secondOrderResult?.reasoning,
  };

  const result: ExtendedEarlySignals = {
    delegation_pred: delegationPred?.prediction,
    risk_flags: finalRiskFlags,
    policy_adjustments: mergedPolicy,
    candidate_suggestions: [],  // Skip async disciplines
    memory: memoryPrior,
    metacognitive: metacognitiveSignal,
    temporal: temporalSignal,
    vetoes: [],  // Skip async swarm
    generated_at: Date.now(),
    generation_time_ms: Date.now() - startTime,
    contributors,
    policy_trace: policyTrace,
    second_order_detection: secondOrderResult?.detection,
  };
  return result;
}

// Types and functions are exported inline above
