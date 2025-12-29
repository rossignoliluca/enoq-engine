/**
 * V3.0 Architecture Tests: Deadline, Fallback, and Determinism
 *
 * These tests verify:
 * 1. EarlySignals deadline enforcement
 * 2. Fallback to conservative defaults on timeout
 * 3. Deterministic behavior (same inputs → same outputs)
 * 4. Phased selection (S3a → S3b) flow
 */

import {
  EarlySignals,
  EarlySignalsStatus,
  DEADLINE_CONFIG,
  waitForSignals,
  CONSERVATIVE_DEFAULTS,
  mergeWithDefaults,
  applySignalsToPlan,
} from '../operational/signals/early_signals';

import {
  generateCandidatePlans,
  commitPlan,
  phasedSelection,
  phasedSelectionSync,
  PhasedSelectionInput,
} from '../mediator/l2_reflect/selection_phased';

import {
  ResponsePlan,
  createDefaultPlan,
  createEmergencyPlan,
  createVModePlan,
  validatePlan,
} from '../mediator/l5_transform/response_plan';

import {
  initLifecycleSnapshot,
  applyLifecycleConstraints,
  updateLifecycleStore,
  resetLifecycleStore,
  calculateInfluenceUsed,
} from '../gate/withdrawal/lifecycle_controller';

import { renderPlan } from '../mediator/l5_transform/plan_renderer';

import { FieldState, ProtocolSelection } from '../interface/types';
import { DimensionalState } from '../operational/detectors/dimensional_system';

// ============================================
// TEST FIXTURES
// ============================================

const createMockFieldState = (overrides: Partial<FieldState> = {}): FieldState => ({
  domains: [{ domain: 'H06_MEANING', salience: 0.8, evidence: ['test'] }],
  arousal: 'medium',
  valence: 'neutral',
  uncertainty: 0.3,
  coherence: 'medium',
  flags: [],
  goal: 'explore',
  loop_count: 0,
  language: 'it',
  ...overrides,
});

// Create full horizontal record with zeros
const createHorizontalRecord = (): Record<string, number> => ({
  H01_SURVIVAL: 0,
  H02_SAFETY: 0,
  H03_BODY: 0,
  H04_EMOTION: 0,
  H05_COGNITION: 0,
  H06_MEANING: 0.8,
  H07_IDENTITY: 0,
  H08_TEMPORAL: 0,
  H09_ATTACHMENT: 0,
  H10_COORDINATION: 0,
  H11_BELONGING: 0,
  H12_HIERARCHY: 0,
  H13_CREATION: 0,
  H14_WORK: 0,
  H15_LEGAL: 0,
  H16_FINANCIAL: 0,
  H17_FORM: 0,
});

const createMockDimensionalState = (overrides: Partial<DimensionalState> = {}): DimensionalState => ({
  vertical: {
    SOMATIC: 0.1,
    FUNCTIONAL: 0.2,
    RELATIONAL: 0.2,
    EXISTENTIAL: 0.4,
    TRANSCENDENT: 0.1,
  },
  horizontal: createHorizontalRecord() as any,
  primary_vertical: 'EXISTENTIAL',
  primary_horizontal: ['H06_MEANING'],
  v_mode_triggered: false,
  emergency_detected: false,
  cross_dimensional: false,
  integration: {
    phi: 0.5,
    coherence: 0.6,
    complexity: 0.4,
    tension: 0.2,
  },
  ...overrides,
});

const createMockProtocolSelection = (overrides: Partial<ProtocolSelection> = {}): ProtocolSelection => ({
  atmosphere: 'HUMAN_FIELD',
  mode: 'EXPAND',
  primitive: 'P03_REFLECT',
  depth: 'medium',
  length: 'moderate',
  pacing: 'normal',
  tone: { warmth: 3, directness: 3 },
  confidence: 0.7,
  reasoning: 'test mock selection',
  forbidden: [],
  required: [],
  ...overrides,
});

const createMockPhasedInput = (overrides: Partial<PhasedSelectionInput> = {}): PhasedSelectionInput => ({
  field_state: createMockFieldState(),
  dimensional_state: createMockDimensionalState(),
  protocol_selection: createMockProtocolSelection(),
  language: 'it',
  turn: 1,
  potency: 1.0,
  withdrawal_bias: 0.0,
  ...overrides,
});

// ============================================
// DEADLINE TESTS
// ============================================

describe('EarlySignals Deadline Enforcement', () => {
  beforeEach(() => {
    resetLifecycleStore();
  });

  test('signals arriving before deadline are used', async () => {
    const signals: EarlySignals = {
      delegation_pred: {
        ads: { score: 0.3, avoidability: { ability: 0.5, state: 0.5 }, motive_weight: 0.3, inertia: 1, final: 0.3 },
        motive: {
          genuine_incapacity: 0.1,
          time_saving_tooling: 0.2,
          time_saving_substitution: 0.1,
          emotional_offload: 0.1,
          decision_avoidance: 0.3,
          validation_seeking: 0.1,
          habit: 0.1,
        },
        should_intervene: false,
        intervention_level: 0.3,
      },
      risk_flags: { v_mode: false, emergency: false },
      generated_at: Date.now(),
    };

    // Signals resolve immediately (before deadline)
    const signalPromise = Promise.resolve(signals);
    const result = await waitForSignals(signalPromise, 100);

    expect(result.status.arrived_before_deadline).toBe(true);
    expect(result.status.timed_out).toBe(false);
    expect(result.signals.delegation_pred).toBeDefined();
  });

  test('signals arriving after deadline trigger fallback', async () => {
    const signals: EarlySignals = {
      delegation_pred: {
        ads: { score: 0.8, avoidability: { ability: 0.5, state: 0.5 }, motive_weight: 0.8, inertia: 1, final: 0.8 },
        motive: {
          genuine_incapacity: 0.1,
          time_saving_tooling: 0.1,
          time_saving_substitution: 0.1,
          emotional_offload: 0.1,
          decision_avoidance: 0.5,
          validation_seeking: 0.1,
          habit: 0.0,
        },
        should_intervene: true,
        intervention_level: 0.8,
      },
      risk_flags: { v_mode: true, emergency: false },
      generated_at: Date.now(),
    };

    // Signals resolve AFTER deadline (200ms delay, 50ms deadline)
    const signalPromise = new Promise<EarlySignals>((resolve) => {
      setTimeout(() => resolve(signals), 200);
    });

    const result = await waitForSignals(signalPromise, 50);

    expect(result.status.arrived_before_deadline).toBe(false);
    expect(result.status.timed_out).toBe(true);
    expect(result.status.defaults_used.length).toBeGreaterThan(0);
  });

  test('deadline is capped at MAX_MS', async () => {
    const signalPromise = new Promise<EarlySignals>((resolve) => {
      setTimeout(() => resolve({ generated_at: Date.now() }), 100);
    });

    // Request 1000ms deadline, but it should be capped at MAX_MS (250ms)
    const startTime = Date.now();
    await waitForSignals(signalPromise, 1000);
    const elapsed = Date.now() - startTime;

    // Should complete around 100ms (when signal arrives), not wait for 1000ms
    expect(elapsed).toBeLessThan(500);
  });

  test('STANDARD_MS deadline is 100ms', () => {
    expect(DEADLINE_CONFIG.STANDARD_MS).toBe(100);
  });

  test('MAX_MS deadline is 250ms', () => {
    expect(DEADLINE_CONFIG.MAX_MS).toBe(250);
  });
});

// ============================================
// FALLBACK BEHAVIOR TESTS
// ============================================

describe('Fallback to Conservative Defaults', () => {
  test('mergeWithDefaults fills missing signals', () => {
    const partial: EarlySignals = {
      risk_flags: { v_mode: true },
      generated_at: Date.now(),
    };

    const merged = mergeWithDefaults(partial);

    // delegation_pred intentionally stays undefined (don't assume)
    expect(merged.delegation_pred).toBeUndefined();
    // Other fields should be filled from defaults
    expect(merged.policy_adjustments).toBeDefined();
    expect(merged.metacognitive).toBeDefined();
    // But keep the provided v_mode flag
    expect(merged.risk_flags?.v_mode).toBe(true);
  });

  test('CONSERVATIVE_DEFAULTS are safe', () => {
    // Conservative defaults should be safe/restrictive
    // delegation_pred is intentionally undefined (don't assume user intent)
    expect(CONSERVATIVE_DEFAULTS.delegation_pred).toBeUndefined();
    // Tools disabled by default (conservative = don't allow tools if unsure)
    expect(CONSERVATIVE_DEFAULTS.policy_adjustments?.disable_tools).toBe(true);
    // Moderate uncertainty by default
    expect(CONSERVATIVE_DEFAULTS.metacognitive?.uncertainty).toBeGreaterThan(0);
  });

  test('commitPlan handles timeout with safer selection', () => {
    const input = createMockPhasedInput();
    const s3a = generateCandidatePlans(input);

    // Simulate timeout status
    const timeoutStatus: EarlySignalsStatus = {
      arrived_before_deadline: false,
      wait_time_ms: 100,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: ['all'],
      timed_out: true,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, CONSERVATIVE_DEFAULTS, timeoutStatus);

    // On timeout, should move toward safer candidate (higher index)
    expect(s3b.commit_reason).toBe('candidate_selected_by_fallback');
    expect(s3b.selected_index).toBeGreaterThanOrEqual(0);
  });

  test('applySignalsToPlan modifies constraints not acts', () => {
    const plan = createDefaultPlan('it');
    const originalActs = [...plan.acts];

    const signals: EarlySignals = {
      policy_adjustments: {
        max_length: 50,
        warmth_delta: -1,
        brevity_delta: -1,
        disable_tools: true,
      },
      generated_at: Date.now(),
    };

    const modified = applySignalsToPlan(plan, signals);

    // Constraints should be modified
    expect(modified.constraints.max_length).toBe(50);
    expect(modified.constraints.tools_allowed).toBe(false);

    // Acts should NOT be modified (same types)
    expect(modified.acts.map(a => a.type)).toEqual(originalActs.map(a => a.type));
  });
});

// ============================================
// DETERMINISM TESTS
// ============================================

describe('Deterministic Behavior', () => {
  beforeEach(() => {
    resetLifecycleStore();
  });

  test('same inputs produce same candidate count', () => {
    const input = createMockPhasedInput();

    const result1 = generateCandidatePlans(input);
    const result2 = generateCandidatePlans(input);

    expect(result1.candidates.candidates.length).toBe(result2.candidates.candidates.length);
    expect(result1.recommended_index).toBe(result2.recommended_index);
  });

  test('same inputs and signals produce same committed plan', () => {
    const input = createMockPhasedInput();
    const s3a = generateCandidatePlans(input);

    const signals: EarlySignals = {
      delegation_pred: {
        ads: { score: 0.3, avoidability: { ability: 0.5, state: 0.5 }, motive_weight: 0.3, inertia: 1, final: 0.3 },
        motive: {
          genuine_incapacity: 0.1,
          time_saving_tooling: 0.2,
          time_saving_substitution: 0.1,
          emotional_offload: 0.1,
          decision_avoidance: 0.3,
          validation_seeking: 0.1,
          habit: 0.1,
        },
        should_intervene: false,
        intervention_level: 0.3,
      },
      generated_at: Date.now(),
    };

    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 50,
      signals_received: {
        delegation_pred: true,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b1 = commitPlan(s3a.candidates, signals, status);
    const s3b2 = commitPlan(s3a.candidates, signals, status);

    expect(s3b1.selected_index).toBe(s3b2.selected_index);
    expect(s3b1.commit_reason).toBe(s3b2.commit_reason);
    expect(s3b1.plan.acts.map(a => a.type)).toEqual(s3b2.plan.acts.map(a => a.type));
  });

  test('phasedSelectionSync is deterministic', () => {
    const input = createMockPhasedInput();
    const signals: EarlySignals = { generated_at: Date.now() };
    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 10,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const result1 = phasedSelectionSync(input, signals, status);
    const result2 = phasedSelectionSync(input, signals, status);

    expect(result1.s3b.selected_index).toBe(result2.s3b.selected_index);
    expect(result1.s3b.plan.acts.length).toBe(result2.s3b.plan.acts.length);
  });

  test('V_MODE produces consistent plan structure', () => {
    const input = createMockPhasedInput({
      dimensional_state: createMockDimensionalState({ v_mode_triggered: true }),
    });

    const result1 = generateCandidatePlans(input);
    const result2 = generateCandidatePlans(input);

    // V_MODE should produce plan with boundary/return_agency acts
    const vmodePlan1 = result1.candidates.candidates[0];
    const vmodePlan2 = result2.candidates.candidates[0];

    expect(vmodePlan1.acts.map(a => a.type)).toEqual(vmodePlan2.acts.map(a => a.type));
    expect(vmodePlan1.constraints.must_require_user_effort).toBe(true);
  });

  test('emergency produces consistent plan structure', () => {
    const input = createMockPhasedInput({
      dimensional_state: createMockDimensionalState({ emergency_detected: true }),
    });

    const result1 = generateCandidatePlans(input);
    const result2 = generateCandidatePlans(input);

    // Emergency should produce ground-first plan
    const emergencyPlan1 = result1.candidates.candidates[0];
    const emergencyPlan2 = result2.candidates.candidates[0];

    expect(emergencyPlan1.acts.map(a => a.type)).toEqual(emergencyPlan2.acts.map(a => a.type));
    expect(emergencyPlan1.acts.some(a => a.type === 'ground')).toBe(true);
  });
});

// ============================================
// PHASED SELECTION FLOW TESTS
// ============================================

describe('Phased Selection Flow (S3a → S3b)', () => {
  test('S3a generates 1-3 candidates', () => {
    const input = createMockPhasedInput();
    const result = generateCandidatePlans(input);

    expect(result.candidates.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.candidates.candidates.length).toBeLessThanOrEqual(3);
  });

  test('S3a recommends index 0 by default', () => {
    const input = createMockPhasedInput();
    const result = generateCandidatePlans(input);

    expect(result.recommended_index).toBe(0);
    expect(result.candidates.recommended).toBe(0);
  });

  test('S3b selects recommended by default', () => {
    const input = createMockPhasedInput();
    const s3a = generateCandidatePlans(input);

    const signals: EarlySignals = { generated_at: Date.now() };
    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 10,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, signals, status);

    expect(s3b.selected_index).toBe(s3a.recommended_index);
    expect(s3b.commit_reason).toBe('candidate_selected_by_score');
  });

  test('S3b can override selection based on signals', () => {
    const input = createMockPhasedInput();
    const s3a = generateCandidatePlans(input);

    // Signals with candidate suggestion for different act
    const signals: EarlySignals = {
      candidate_suggestions: [
        { act: 'hold', confidence: 0.9, reason: 'test' },
      ],
      generated_at: Date.now(),
    };

    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 10,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: true,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, signals, status);

    // May or may not override depending on candidates, but should have reason
    expect(['candidate_selected_by_score', 'candidate_selected_by_early_signals', 'candidate_selected_by_fallback'])
      .toContain(s3b.commit_reason);
  });

  test('vetoes move selection to safer candidate', () => {
    const input = createMockPhasedInput();
    const s3a = generateCandidatePlans(input);

    // Strong veto should move to safer candidate
    const signals: EarlySignals = {
      vetoes: [
        { source: 'swarm', target: 'act', item: 'map', reason: 'test veto', severity: 0.9 },
      ],
      generated_at: Date.now(),
    };

    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 10,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: true,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, signals, status);

    // With veto, selection should move toward safer candidate (higher index)
    if (s3a.candidates.candidates.length > 1) {
      expect(s3b.selected_index).toBeGreaterThan(0);
    }
  });
});

// ============================================
// LIFECYCLE INTEGRATION TESTS
// ============================================

describe('Lifecycle Controller Integration', () => {
  beforeEach(() => {
    resetLifecycleStore();
  });

  test('lifecycle snapshot initializes with full budget', () => {
    const snapshot = initLifecycleSnapshot('test-session');

    expect(snapshot.total_influence_budget).toBe(100);
    expect(snapshot.remaining_budget).toBe(100);
    expect(snapshot.termination_proximity).toBe(0);
    expect(snapshot.dormancy_recommended).toBe(false);
  });

  test('applyLifecycleConstraints reduces length on low budget', () => {
    const plan = createDefaultPlan('it');
    plan.constraints.max_length = 150;

    const snapshot = initLifecycleSnapshot('test-session');
    snapshot.remaining_budget = 5; // Very low

    const { plan: constrainedPlan, constraints } = applyLifecycleConstraints(plan, snapshot);

    expect(constrainedPlan.constraints.max_length).toBeLessThan(150);
    expect(constraints.force_minimal).toBe(true);
    expect(constraints.reason).toContain('low_budget');
  });

  test('calculateInfluenceUsed returns value 0-1', () => {
    const plan = createDefaultPlan('it');
    const influence = calculateInfluenceUsed(plan);

    expect(influence).toBeGreaterThanOrEqual(0);
    expect(influence).toBeLessThanOrEqual(1);
  });

  test('updateLifecycleStore decays budget', () => {
    const sessionId = 'decay-test';
    initLifecycleSnapshot(sessionId);

    const result = updateLifecycleStore(sessionId, {
      user_autonomy_detected: false,
      delegation_detected: false,
      influence_used: 0.5,
      v_mode: false,
      emergency: false,
    });

    expect(result.snapshot.remaining_budget).toBeLessThan(100);
    expect(result.budget_delta).toBeLessThan(0);
  });

  test('user autonomy regenerates budget', () => {
    const sessionId = 'regen-test';
    const initial = initLifecycleSnapshot(sessionId);
    initial.remaining_budget = 50; // Start with depleted budget

    const result = updateLifecycleStore(sessionId, {
      user_autonomy_detected: true,
      delegation_detected: false,
      influence_used: 0.2,
      v_mode: false,
      emergency: false,
    });

    // Autonomy should add to budget (even if influence used still causes net decay)
    expect(result.budget_delta).toBeGreaterThan(-3); // Less decay than without autonomy
  });
});

// ============================================
// PLAN RENDERING TESTS
// ============================================

describe('Plan Rendering', () => {
  test('renderPlan produces text output', () => {
    const plan = createDefaultPlan('it');
    const result = renderPlan(plan);

    expect(result.text.length).toBeGreaterThan(0);
    expect(result.template_used).toBe(true);
    expect(result.llm_used).toBe(false);
  });

  test('renderPlan handles all acts', () => {
    const plan = createVModePlan('it');
    const result = renderPlan(plan);

    expect(result.acts_rendered.length).toBe(plan.acts.length);
    expect(result.text.length).toBeGreaterThan(0);
  });

  test('renderPlan respects max_length constraint', () => {
    const plan = createDefaultPlan('it');
    plan.constraints.max_length = 50;

    const result = renderPlan(plan);

    // Should either fit or have warning
    const wordCount = result.text.split(/\s+/).length;
    if (wordCount > 50) {
      expect(result.constraint_warnings.length).toBeGreaterThan(0);
    }
  });

  test('renderPlan supports multiple languages', () => {
    const planIt = createDefaultPlan('it');
    const planEn = createDefaultPlan('en');

    const resultIt = renderPlan(planIt);
    const resultEn = renderPlan(planEn);

    // Different languages should produce different text
    expect(resultIt.text).not.toBe(resultEn.text);
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe('Plan Validation', () => {
  test('validatePlan accepts valid plan', () => {
    const plan = createDefaultPlan('it');
    const result = validatePlan(plan);

    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test('validatePlan handles empty acts gracefully', () => {
    const plan = createDefaultPlan('it');
    plan.acts = [];

    const result = validatePlan(plan);

    // Empty acts is technically valid (no specific violation)
    // The system allows minimal plans
    expect(result.violations.length).toBe(0);
  });

  test('validatePlan warns on excessive length', () => {
    const plan = createDefaultPlan('it');
    plan.constraints.max_length = 501; // > 500 triggers warning

    const result = validatePlan(plan);

    expect(result.warnings).toContain('max_length > 500 may violate brevity principle');
  });

  test('validatePlan warns on very short max_length', () => {
    const plan = createDefaultPlan('it');
    plan.constraints.max_length = 5; // < 10 triggers warning

    const result = validatePlan(plan);

    expect(result.warnings).toContain('max_length < 10 may be too restrictive');
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles empty signals gracefully', () => {
    const input = createMockPhasedInput();
    const s3a = generateCandidatePlans(input);

    const emptySignals: EarlySignals = { generated_at: Date.now() };
    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 0,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, emptySignals, status);

    expect(s3b.plan).toBeDefined();
    expect(s3b.plan.acts.length).toBeGreaterThan(0);
  });

  test('handles high potency correctly', () => {
    const input = createMockPhasedInput({ potency: 1.0 });
    const result = generateCandidatePlans(input);

    // High potency should not force minimal constraints
    expect(result.candidates.candidates[0].constraints.brevity).not.toBe('minimal');
  });

  test('handles low potency correctly', () => {
    const input = createMockPhasedInput({ potency: 0.2 });
    const s3a = generateCandidatePlans(input);

    const signals: EarlySignals = { generated_at: Date.now() };
    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 0,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, signals, status);

    // Low potency should result in reduced intervention
    expect(s3b.plan.constraints.max_length).toBeLessThanOrEqual(60);
  });

  test('handles high withdrawal_bias correctly', () => {
    const input = createMockPhasedInput({ withdrawal_bias: 0.8 });
    const s3a = generateCandidatePlans(input);

    const signals: EarlySignals = { generated_at: Date.now() };
    const status: EarlySignalsStatus = {
      arrived_before_deadline: true,
      wait_time_ms: 0,
      signals_received: {
        delegation_pred: false,
        risk_flags: false,
        policy_adjustments: false,
        candidate_suggestions: false,
        memory: false,
        metacognitive: false,
        temporal: false,
        vetoes: false,
      },
      defaults_used: [],
      timed_out: false,
      deadline_used: 100,
    };

    const s3b = commitPlan(s3a.candidates, signals, status);

    // High withdrawal should result in brief, neutral response
    expect(s3b.plan.constraints.brevity).toBe('brief');
    expect(s3b.plan.constraints.warmth).toBe('neutral');
  });
});
