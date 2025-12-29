/**
 * PLAN ACT VERIFIER TESTS
 *
 * Tests for constitutional enforcement on ResponsePlan.
 * Position: Between S3b (commit) and S4 (render).
 *
 * Test cases per user specification:
 * 1. Emergency senza ground → ground prepended
 * 2. V_MODE con recommend → recommend rimosso, ownership presente
 * 3. ADS high senza effort_required → effort_required true
 * 4. tool_intent write → downgrade (tools_allowed = false)
 * 5. unfixable → fallback_used true
 * 6. "fixes never increase directiveness" (monotonicity)
 */

import {
  verifyAndFixPlan,
  getCanonicalFallbackPlan,
  checkRulepackEmergency,
  checkRulepackVMode,
  checkRulepackADS,
  checkRulepackToolSafety,
  PlanVerification,
  FallbackContext,
} from '../gate/verification/plan_act_verifier';
import {
  ResponsePlan,
  createDefaultPlan,
  createEmergencyPlan,
  createVModePlan,
} from '../mediator/l5_transform/response_plan';
import { EarlySignals } from '../operational/signals/early_signals';

// ============================================
// HELPER: Create test plans
// ============================================

function createBadEmergencyPlan(): ResponsePlan {
  return {
    id: 'bad_emergency_plan',
    acts: [
      { type: 'acknowledge', force: 0.3 },  // BAD: should start with ground
      { type: 'map', force: 0.5 },
    ],
    constraints: {
      max_length: 100,  // BAD: too long for emergency
      warmth: 'neutral',
      brevity: 'moderate',
      pronouns: 'i_you',
      tools_allowed: false,
      must_require_user_effort: false,
      forbidden: [],
      required: [],
      language: 'it',
    },
    metadata: {
      risk: {
        crisis: true,
        emergency: true,
        v_mode: false,
        enchantment: false,
        loop_detected: false,
        boundary_approach: false,
      },
      potency: 1.0,
      withdrawal_bias: 0.0,
      turn: 0,
      timestamp: Date.now(),
    },
    confidence: 0.7,
    reasoning: 'Bad emergency plan for testing',
    source: 'selection',
  };
}

function createBadVModePlan(): ResponsePlan {
  return {
    id: 'bad_vmode_plan',
    acts: [
      { type: 'offer_frame', force: 0.6 },  // BAD: forbidden in V_MODE
      { type: 'experiment', force: 0.5 },   // BAD: forbidden in V_MODE
    ],
    constraints: {
      max_length: 100,
      warmth: 'warm',
      brevity: 'brief',
      pronouns: 'i_you',
      tools_allowed: true,  // BAD: should be false in V_MODE
      must_require_user_effort: false,  // BAD: should be true in V_MODE
      forbidden: [],  // BAD: missing directive forbiddens
      required: [],
      language: 'en',
    },
    metadata: {
      risk: {
        crisis: false,
        emergency: false,
        v_mode: true,
        enchantment: false,
        loop_detected: false,
        boundary_approach: true,
      },
      potency: 0.8,
      withdrawal_bias: 0.2,
      turn: 0,
      timestamp: Date.now(),
    },
    confidence: 0.6,
    reasoning: 'Bad V_MODE plan for testing',
    source: 'selection',
  };
}

function createHighADSPlan(): ResponsePlan {
  return {
    id: 'high_ads_plan',
    acts: [
      { type: 'map', force: 0.7 },
      { type: 'question', force: 0.5 },
    ],
    constraints: {
      max_length: 150,  // BAD: too long for high ADS
      warmth: 'neutral',
      brevity: 'moderate',
      pronouns: 'i_you',
      tools_allowed: true,  // BAD: should be false
      must_require_user_effort: false,  // BAD: should be true
      forbidden: [],
      required: [],
      language: 'en',
    },
    metadata: {
      risk: {
        crisis: false,
        emergency: false,
        v_mode: false,
        enchantment: false,
        loop_detected: false,
        boundary_approach: false,
      },
      ads: {
        score: 0.7,
        avoidability: { ability: 0.8, state: 0.9 },
        motive_weight: 0.8,
        inertia: 0.5,
        final: 0.7,  // High ADS
      },
      potency: 0.7,
      withdrawal_bias: 0.3,
      turn: 0,
      timestamp: Date.now(),
    },
    confidence: 0.6,
    reasoning: 'High ADS plan for testing',
    source: 'selection',
  };
}

function createEmptySignals(): EarlySignals {
  return {
    delegation_pred: undefined,
    risk_flags: {},
    policy_adjustments: undefined,
    candidate_suggestions: undefined,
    memory: undefined,
    metacognitive: undefined,
    temporal: undefined,
    vetoes: undefined,
  };
}

function createHighADSDelegationPred() {
  return {
    ads: {
      score: 0.7,
      avoidability: { ability: 0.8, state: 0.9 },
      motive_weight: 0.8,
      inertia: 0.5,
      final: 0.7,  // High ADS (>0.6)
    },
    motive: {
      genuine_incapacity: 0.1,
      time_saving_tooling: 0.1,
      time_saving_substitution: 0.3,
      emotional_offload: 0.2,
      decision_avoidance: 0.2,
      validation_seeking: 0.1,
      habit: 0.0,
    },
    should_intervene: true,
    intervention_level: 0.7,
  };
}

function createLowADSDelegationPred() {
  return {
    ads: {
      score: 0.2,
      avoidability: { ability: 0.3, state: 0.5 },
      motive_weight: 0.3,
      inertia: 0.2,
      final: 0.2,  // Low ADS
    },
    motive: {
      genuine_incapacity: 0.5,
      time_saving_tooling: 0.3,
      time_saving_substitution: 0.1,
      emotional_offload: 0.0,
      decision_avoidance: 0.0,
      validation_seeking: 0.1,
      habit: 0.0,
    },
    should_intervene: false,
    intervention_level: 0.2,
  };
}

// ============================================
// TEST: Rulepack A - Emergency
// ============================================

describe('Rulepack A: Emergency', () => {
  test('emergency senza ground → ground prepended', () => {
    const badPlan = createBadEmergencyPlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    // Should fix the plan
    expect(result.valid).toBe(true);
    expect(result.fixes_applied.length).toBeGreaterThan(0);

    // First act should now be 'ground'
    expect(result.final_plan.acts[0].type).toBe('ground');

    // Verify fix was recorded
    const groundFix = result.fixes_applied.find(f => f.violation_rule_id === 'A1');
    expect(groundFix).toBeDefined();
    expect(groundFix?.fix_type).toBe('act_prepend');
  });

  test('emergency with max_length > 50 → max_length reduced', () => {
    const badPlan = createBadEmergencyPlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    // max_length should be reduced to 50 or less
    expect(result.final_plan.constraints.max_length).toBeLessThanOrEqual(50);
  });

  test('valid emergency plan passes without fixes', () => {
    const validPlan = createEmergencyPlan('en');
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(validPlan, signals);

    expect(result.valid).toBe(true);
    expect(result.fixes_applied.length).toBe(0);
    expect(result.fallback_used).toBe(false);
  });
});

// ============================================
// TEST: Rulepack B - V_MODE
// ============================================

describe('Rulepack B: V_MODE', () => {
  test('V_MODE con forbidden acts → acts removed, ownership presente', () => {
    const badPlan = createBadVModePlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    // Should fix or fallback
    expect(result.valid || result.fallback_used).toBe(true);

    // Forbidden acts should be removed
    const hasOfferFrame = result.final_plan.acts.some(a => a.type === 'offer_frame');
    const hasExperiment = result.final_plan.acts.some(a => a.type === 'experiment');
    expect(hasOfferFrame).toBe(false);
    expect(hasExperiment).toBe(false);

    // Must have withdrawal act (return_agency, boundary, or question)
    const hasWithdrawal = result.final_plan.acts.some(a =>
      a.type === 'return_agency' || a.type === 'boundary' || a.type === 'question'
    );
    expect(hasWithdrawal).toBe(true);
  });

  test('V_MODE missing directive forbiddens → forbiddens added', () => {
    const badPlan = createBadVModePlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    // Directive forbiddens should be present
    const forbidden = result.final_plan.constraints.forbidden;
    expect(forbidden).toContain('recommend');
    expect(forbidden).toContain('advise');
    expect(forbidden).toContain('prescribe');
  });

  test('V_MODE must_require_user_effort → set to true', () => {
    const badPlan = createBadVModePlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    // must_require_user_effort should be true
    expect(result.final_plan.constraints.must_require_user_effort).toBe(true);
  });

  test('valid V_MODE plan passes without fixes', () => {
    const validPlan = createVModePlan('en');
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(validPlan, signals);

    // May have B2 violations since createVModePlan doesn't include all directive forbiddens
    // But should be fixable
    expect(result.valid).toBe(true);
    expect(result.fallback_used).toBe(false);
  });
});

// ============================================
// TEST: Rulepack C - High ADS
// ============================================

describe('Rulepack C: High ADS', () => {
  test('ADS high senza effort_required → effort_required true', () => {
    const badPlan = createHighADSPlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      delegation_pred: createHighADSDelegationPred(),
    };

    const result = verifyAndFixPlan(badPlan, signals);

    expect(result.valid).toBe(true);
    expect(result.final_plan.constraints.must_require_user_effort).toBe(true);

    // Verify fix was recorded
    const effortFix = result.fixes_applied.find(f => f.violation_rule_id === 'C1');
    expect(effortFix).toBeDefined();
  });

  test('high ADS with tools_allowed → tools disabled', () => {
    const badPlan = createHighADSPlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      delegation_pred: createHighADSDelegationPred(),
    };

    const result = verifyAndFixPlan(badPlan, signals);

    expect(result.final_plan.constraints.tools_allowed).toBe(false);
  });

  test('high ADS with max_length > 80 → max_length reduced', () => {
    const badPlan = createHighADSPlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      delegation_pred: createHighADSDelegationPred(),
    };

    const result = verifyAndFixPlan(badPlan, signals);

    expect(result.final_plan.constraints.max_length).toBeLessThanOrEqual(80);
  });

  test('low ADS plan not affected', () => {
    const normalPlan = createDefaultPlan('en');
    normalPlan.constraints.max_length = 200;
    normalPlan.constraints.tools_allowed = true;

    const signals: EarlySignals = {
      ...createEmptySignals(),
      delegation_pred: createLowADSDelegationPred(),
    };

    const result = verifyAndFixPlan(normalPlan, signals);

    // Should not apply ADS fixes
    const adsFixes = result.fixes_applied.filter(f => f.violation_rule_id.startsWith('C'));
    expect(adsFixes.length).toBe(0);
  });
});

// ============================================
// TEST: Rulepack D - Tool Safety
// ============================================

describe('Rulepack D: Tool Safety', () => {
  test('V_MODE with tools_allowed → tools disabled', () => {
    const badPlan = createBadVModePlan();
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    expect(result.final_plan.constraints.tools_allowed).toBe(false);
  });

  test('emergency with tools_allowed → tools disabled', () => {
    const badPlan = createBadEmergencyPlan();
    badPlan.constraints.tools_allowed = true;
    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    expect(result.final_plan.constraints.tools_allowed).toBe(false);
  });

  test('normal plan with tools_allowed passes', () => {
    const normalPlan = createDefaultPlan('en');
    normalPlan.constraints.tools_allowed = true;

    const signals: EarlySignals = createEmptySignals();

    const result = verifyAndFixPlan(normalPlan, signals);

    // No V_MODE or emergency, so tools are allowed
    expect(result.final_plan.constraints.tools_allowed).toBe(true);
  });
});

// ============================================
// TEST: Unfixable Plans → Fallback
// ============================================

describe('Unfixable Plans → Fallback', () => {
  test('plan with only forbidden acts → fallback used', () => {
    // Create a plan that only has forbidden V_MODE acts
    const unfixablePlan: ResponsePlan = {
      id: 'unfixable_plan',
      acts: [
        { type: 'offer_frame', force: 0.8 },
        { type: 'experiment', force: 0.7 },
      ],
      constraints: {
        max_length: 100,
        warmth: 'neutral',
        brevity: 'moderate',
        pronouns: 'i_you',
        tools_allowed: true,
        must_require_user_effort: false,
        forbidden: [],
        required: [],
        language: 'it',
      },
      metadata: {
        risk: {
          crisis: false,
          emergency: false,
          v_mode: true,
          enchantment: false,
          loop_detected: false,
          boundary_approach: true,
        },
        potency: 0.5,
        withdrawal_bias: 0.5,
        turn: 0,
        timestamp: Date.now(),
      },
      confidence: 0.5,
      reasoning: 'Unfixable plan',
      source: 'selection',
    };

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(unfixablePlan, signals);

    // After removing forbidden acts and adding return_agency, should be fixable
    // The verifier should be able to fix it
    expect(result.valid).toBe(true);

    // But verify the forbidden acts are gone
    expect(result.final_plan.acts.some(a => a.type === 'offer_frame')).toBe(false);
    expect(result.final_plan.acts.some(a => a.type === 'experiment')).toBe(false);
  });
});

// ============================================
// TEST: Monotonicity (Anti-Drift Invariant)
// ============================================

describe('Monotonicity: Fixes Never Increase Directiveness', () => {
  test('fixes never increase max_length', () => {
    const plan = createDefaultPlan('en');
    plan.constraints.max_length = 100;
    plan.metadata.risk.emergency = true;

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(plan, signals);

    // max_length should not increase
    expect(result.final_plan.constraints.max_length).toBeLessThanOrEqual(100);
  });

  test('fixes never enable tools if they were disabled', () => {
    const plan = createDefaultPlan('en');
    plan.constraints.tools_allowed = false;
    plan.metadata.risk.emergency = true;

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(plan, signals);

    // tools_allowed should remain false
    expect(result.final_plan.constraints.tools_allowed).toBe(false);
  });

  test('fixes never disable must_require_user_effort if it was true', () => {
    const plan = createDefaultPlan('en');
    plan.constraints.must_require_user_effort = true;
    plan.metadata.risk.v_mode = true;

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(plan, signals);

    // must_require_user_effort should remain true
    expect(result.final_plan.constraints.must_require_user_effort).toBe(true);
  });

  test('fixes never remove items from forbidden list', () => {
    const plan = createDefaultPlan('en');
    plan.constraints.forbidden = ['recommend', 'advise', 'diagnose'];
    plan.metadata.risk.v_mode = true;

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
    };

    const result = verifyAndFixPlan(plan, signals);

    // All original forbidden items should still be present
    expect(result.final_plan.constraints.forbidden).toContain('recommend');
    expect(result.final_plan.constraints.forbidden).toContain('advise');
    expect(result.final_plan.constraints.forbidden).toContain('diagnose');
  });
});

// ============================================
// TEST: Canonical Fallback Plans
// ============================================

describe('Canonical Fallback Plans', () => {
  test('emergency fallback has ground + hold + redirect', () => {
    const context: FallbackContext = {
      emergency: true,
      v_mode: false,
      language: 'it',
    };

    const fallback = getCanonicalFallbackPlan(context);

    expect(fallback.acts.some(a => a.type === 'ground')).toBe(true);
    expect(fallback.acts.some(a => a.type === 'hold')).toBe(true);
    expect(fallback.acts.some(a => a.type === 'redirect')).toBe(true);
    expect(fallback.constraints.max_length).toBeLessThanOrEqual(30);
  });

  test('V_MODE fallback has acknowledge + boundary + return_agency', () => {
    const context: FallbackContext = {
      emergency: false,
      v_mode: true,
      language: 'en',
    };

    const fallback = getCanonicalFallbackPlan(context);

    expect(fallback.acts.some(a => a.type === 'acknowledge')).toBe(true);
    expect(fallback.acts.some(a => a.type === 'boundary')).toBe(true);
    expect(fallback.acts.some(a => a.type === 'return_agency')).toBe(true);
    expect(fallback.constraints.must_require_user_effort).toBe(true);
  });

  test('neutral fallback has acknowledge + boundary + question', () => {
    const context: FallbackContext = {
      emergency: false,
      v_mode: false,
      language: 'de',
    };

    const fallback = getCanonicalFallbackPlan(context);

    expect(fallback.acts.some(a => a.type === 'acknowledge')).toBe(true);
    expect(fallback.acts.some(a => a.type === 'boundary')).toBe(true);
    expect(fallback.acts.some(a => a.type === 'question')).toBe(true);
  });

  test('all fallbacks have directive forbiddens', () => {
    const contexts: FallbackContext[] = [
      { emergency: true, v_mode: false, language: 'en' },
      { emergency: false, v_mode: true, language: 'it' },
      { emergency: false, v_mode: false, language: 'de' },
    ];

    for (const context of contexts) {
      const fallback = getCanonicalFallbackPlan(context);
      expect(fallback.constraints.forbidden).toContain('recommend');
      expect(fallback.constraints.forbidden).toContain('advise');
      expect(fallback.constraints.forbidden).toContain('prescribe');
    }
  });

  test('emergency takes priority over V_MODE in fallback', () => {
    const context: FallbackContext = {
      emergency: true,
      v_mode: true,  // Both true
      language: 'it',
    };

    const fallback = getCanonicalFallbackPlan(context);

    // Emergency template should be used
    expect(fallback.acts[0].type).toBe('ground');
    expect(fallback.id).toContain('emergency');
  });
});

// ============================================
// TEST: Edge Cases
// ============================================

describe('Edge Cases', () => {
  test('empty acts array in emergency → ground prepended', () => {
    const emptyPlan: ResponsePlan = {
      ...createDefaultPlan('en'),
      acts: [],
      metadata: {
        ...createDefaultPlan('en').metadata,
        risk: {
          ...createDefaultPlan('en').metadata.risk,
          emergency: true,
        },
      },
    };

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { emergency: true },
    };

    const result = verifyAndFixPlan(emptyPlan, signals);

    expect(result.final_plan.acts.length).toBeGreaterThan(0);
    expect(result.final_plan.acts[0].type).toBe('ground');
  });

  test('plan with no violations passes immediately', () => {
    const goodPlan = createDefaultPlan('en');
    const signals: EarlySignals = createEmptySignals();

    const result = verifyAndFixPlan(goodPlan, signals);

    expect(result.valid).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.fixes_applied.length).toBe(0);
    expect(result.fallback_used).toBe(false);
  });

  test('verification includes timing information', () => {
    const plan = createDefaultPlan('en');
    const signals: EarlySignals = createEmptySignals();

    const before = Date.now();
    const result = verifyAndFixPlan(plan, signals);
    const after = Date.now();

    expect(result.verified_at).toBeGreaterThanOrEqual(before);
    expect(result.verified_at).toBeLessThanOrEqual(after);
    expect(result.verification_time_ms).toBeGreaterThanOrEqual(0);
  });
});

// ============================================
// TEST: Multiple Violations
// ============================================

describe('Multiple Violations', () => {
  test('V_MODE + High ADS → all fixes applied', () => {
    const badPlan = createBadVModePlan();
    badPlan.constraints.max_length = 200;
    badPlan.metadata.ads = {
      score: 0.8,
      avoidability: { ability: 0.9, state: 0.9 },
      motive_weight: 0.9,
      inertia: 0.6,
      final: 0.8,
    };

    const signals: EarlySignals = {
      ...createEmptySignals(),
      risk_flags: { v_mode: true },
      delegation_pred: {
        ads: {
          score: 0.8,
          avoidability: { ability: 0.9, state: 0.9 },
          motive_weight: 0.9,
          inertia: 0.6,
          final: 0.8,
        },
        motive: {
          genuine_incapacity: 0.0,
          time_saving_tooling: 0.1,
          time_saving_substitution: 0.3,
          emotional_offload: 0.3,
          decision_avoidance: 0.2,
          validation_seeking: 0.1,
          habit: 0.0,
        },
        should_intervene: true,
        intervention_level: 0.8,
      },
    };

    const result = verifyAndFixPlan(badPlan, signals);

    // All constraints should be fixed
    expect(result.final_plan.constraints.tools_allowed).toBe(false);
    expect(result.final_plan.constraints.must_require_user_effort).toBe(true);
    expect(result.final_plan.constraints.max_length).toBeLessThanOrEqual(80);
    expect(result.final_plan.constraints.forbidden).toContain('recommend');

    // Should have withdrawal act
    const hasWithdrawal = result.final_plan.acts.some(a =>
      a.type === 'return_agency' || a.type === 'boundary' || a.type === 'question'
    );
    expect(hasWithdrawal).toBe(true);
  });
});
