/**
 * Boundary Conflict Tests
 *
 * Tests the critical invariant:
 * - ADS (Capability A) controls HARD constraints: disable_tools, must_require_user_effort
 * - Second Order (Capability B) controls SOFT constraints: warmth_delta, force_pronouns
 * - When both touch brevity_delta: min wins (more brief = more restrictive)
 * - Second Order can NEVER override ADS's HARD constraints
 *
 * These tests ensure the two systems don't conflict.
 */

import { mergePolicyAdjustments, PolicyAdjustments } from '../operational/signals/early_signals';
import { computeADS, ADSInput } from '../gate/enforcement/ads_detector';
import { observeSecondOrder, toPartialPolicy, SecondOrderInput } from '../gate/enforcement/second_order_observer';
import { DimensionalState } from '../operational/detectors/dimensional_system';
import { FieldState } from '../interface/types';

// ============================================
// TEST FIXTURES
// ============================================

const baseDimensionalState: DimensionalState = {
  vertical: {
    SOMATIC: 0.1,
    FUNCTIONAL: 0.5,
    RELATIONAL: 0.2,
    EXISTENTIAL: 0.1,
    TRANSCENDENT: 0.0,
  },
  horizontal: {
    H01_SURVIVAL: 0.1,
    H02_SAFETY: 0.1,
    H03_BODY: 0.1,
    H04_EMOTION: 0.1,
    H05_COGNITION: 0.1,
    H06_MEANING: 0.1,
    H07_IDENTITY: 0.0,
    H08_TEMPORAL: 0.1,
    H09_ATTACHMENT: 0.2,
    H10_COORDINATION: 0.0,
    H11_BELONGING: 0.0,
    H12_HIERARCHY: 0.0,
    H13_CREATION: 0.0,
    H14_WORK: 0.5,
    H15_LEGAL: 0.0,
    H16_OPERATIONAL: 0.1,
    H17_FORM: 0.0,
  },
  integration: {
    phi: 0.5,
    complexity: 3,
    coherence: 0.8,
    tension: 0.2,
  },
  primary_vertical: 'FUNCTIONAL',
  primary_horizontal: ['H14_WORK'],
  v_mode_triggered: false,
  emergency_detected: false,
  cross_dimensional: false,
};

const vModeDimensionalState: DimensionalState = {
  ...baseDimensionalState,
  v_mode_triggered: true,
  vertical: {
    ...baseDimensionalState.vertical,
    EXISTENTIAL: 0.8,
  },
};

const baseFieldState: FieldState = {
  domains: [{ domain: 'H14_WORK', salience: 0.5 }],
  arousal: 'medium',
  valence: 'neutral',
  coherence: 'high',
  goal: 'inform',
  loop_count: 0,
  flags: [],
  uncertainty: 0.2,
};

const decideFieldState: FieldState = {
  ...baseFieldState,
  goal: 'decide',
};

// ============================================
// HARD CONSTRAINT BOUNDARY TESTS
// ============================================

describe('Boundary: HARD constraints', () => {
  it('should preserve ADS disable_tools when Second Order also produces policy', () => {
    // Scenario: ADS wants to disable tools, Second Order wants cooling
    // Both systems are active, ADS's HARD constraint must be preserved

    const adsPolicy: Partial<PolicyAdjustments> = {
      disable_tools: true,
      brevity_delta: -0.5,
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      warmth_delta: -0.3,
      brevity_delta: -0.2,
      force_pronouns: 'i_you',
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    // INVARIANT: ADS's disable_tools is preserved
    expect(merged.disable_tools).toBe(true);

    // Second Order's SOFT constraints are applied
    expect(merged.warmth_delta).toBe(-0.3);
    expect(merged.force_pronouns).toBe('i_you');

    // brevity_delta: min wins
    expect(merged.brevity_delta).toBe(-0.5); // ADS's -0.5 < Second Order's -0.2
  });

  it('should preserve must_require_user_effort from ADS', () => {
    const adsPolicy: Partial<PolicyAdjustments> = {
      must_require_user_effort: true,
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      warmth_delta: -0.2,
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    // INVARIANT: ADS's must_require_user_effort is preserved
    expect(merged.must_require_user_effort).toBe(true);
  });

  it('should apply OR logic for disable_tools across multiple merges', () => {
    // Base policy has no disable_tools
    const base: Partial<PolicyAdjustments> = {};

    // ADS sets disable_tools
    const adsPolicy: Partial<PolicyAdjustments> = {
      disable_tools: true,
    };

    // Second Order doesn't touch HARD constraints
    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      warmth_delta: -0.3,
    };

    // Merge order: Base → ADS → Second Order
    let merged = mergePolicyAdjustments(base, adsPolicy);
    merged = mergePolicyAdjustments(merged, secondOrderPolicy);

    // OR logic: once true, stays true
    expect(merged.disable_tools).toBe(true);
  });
});

// ============================================
// SOFT CONSTRAINT BOUNDARY TESTS
// ============================================

describe('Boundary: SOFT constraints', () => {
  it('should apply Second Order warmth_delta without affecting HARD constraints', () => {
    const adsPolicy: Partial<PolicyAdjustments> = {
      disable_tools: true,
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      warmth_delta: -0.5, // Strong cooling
      force_pronouns: 'impersonal',
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    // SOFT constraints applied
    expect(merged.warmth_delta).toBe(-0.5);
    expect(merged.force_pronouns).toBe('impersonal');

    // HARD constraint preserved
    expect(merged.disable_tools).toBe(true);
  });

  it('should clamp warmth_delta to [-1, +1] when summing', () => {
    const policy1: Partial<PolicyAdjustments> = {
      warmth_delta: -0.8,
    };

    const policy2: Partial<PolicyAdjustments> = {
      warmth_delta: -0.5,
    };

    const merged = mergePolicyAdjustments(policy1, policy2);

    // Sum would be -1.3, but clamped to -1
    expect(merged.warmth_delta).toBe(-1);
    expect(merged.warmth_delta).toBeGreaterThanOrEqual(-1);
  });
});

// ============================================
// BREVITY_DELTA OVERLAP TESTS
// ============================================

describe('Boundary: brevity_delta overlap', () => {
  it('should use min (more restrictive) when both touch brevity_delta', () => {
    const adsPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.3,
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.2,
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    // min(-0.3, -0.2) = -0.3
    expect(merged.brevity_delta).toBe(-0.3);
  });

  it('should take ADS brevity when it is more restrictive', () => {
    const adsPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -1.0, // Maximum brevity
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.1,
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    expect(merged.brevity_delta).toBe(-1.0);
  });

  it('should take Second Order brevity when it is more restrictive', () => {
    const adsPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.1,
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.5,
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    expect(merged.brevity_delta).toBe(-0.5);
  });

  it('should handle undefined brevity_delta from one source', () => {
    const adsPolicy: Partial<PolicyAdjustments> = {
      disable_tools: true,
      // No brevity_delta
    };

    const secondOrderPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.3,
    };

    const merged = mergePolicyAdjustments(adsPolicy, secondOrderPolicy);

    expect(merged.brevity_delta).toBe(-0.3);
  });
});

// ============================================
// INTEGRATION: REAL SCENARIO TESTS
// ============================================

describe('Boundary: Real scenario integration', () => {
  it('should correctly merge ADS high + Second Order enchantment', () => {
    // Scenario: User is delegating an existential decision AND enchanted
    // "You're the only one who understands, tell me what to do with my life"

    // Simulate ADS computation
    const adsInput: ADSInput = {
      message: "Tell me what to do with my life, you're the only one who gets me",
      dimensionalState: vModeDimensionalState,
      fieldState: decideFieldState,
    };
    const adsResult = computeADS(adsInput);

    // Simulate Second Order computation
    const soInput: SecondOrderInput = {
      message: "Tell me what to do with my life, you're the only one who gets me",
      recent_system_responses: [],
      loop_count: 0,
    };
    const soResult = observeSecondOrder(soInput);
    const soPolicy = toPartialPolicy(soResult.policy);

    // Merge
    const merged = mergePolicyAdjustments(adsResult.policy, soPolicy);

    // ADS HARD constraints should be present
    if (adsResult.prediction.ads.final > 0.5) {
      expect(merged.disable_tools).toBe(true);
    }

    // Second Order SOFT constraints should be present
    if (soResult.detection.combined_score >= 0.2) {
      expect(merged.warmth_delta).toBeLessThan(0);
    }
  });

  it('should NOT relax HARD constraints even with low enchantment', () => {
    // ADS wants to disable tools
    const adsPolicy: Partial<PolicyAdjustments> = {
      disable_tools: true,
      must_require_user_effort: true,
      brevity_delta: -0.5,
    };

    // Second Order has no enchantment (neutral)
    const soInput: SecondOrderInput = {
      message: 'Can you help me with this code?',
      recent_system_responses: [],
      loop_count: 0,
    };
    const soResult = observeSecondOrder(soInput);
    const soPolicy = toPartialPolicy(soResult.policy);

    const merged = mergePolicyAdjustments(adsPolicy, soPolicy);

    // HARD constraints preserved even though Second Order is neutral
    expect(merged.disable_tools).toBe(true);
    expect(merged.must_require_user_effort).toBe(true);
    expect(merged.brevity_delta).toBe(-0.5);
  });

  it('should combine SOFT cooling from both sources', () => {
    // Both systems want some cooling (different reasons)
    // ADS: delegation detected → brevity -0.3
    // Second Order: mild enchantment → warmth -0.15, brevity -0.1

    const adsPolicy: Partial<PolicyAdjustments> = {
      brevity_delta: -0.3,
    };

    const soPolicy: Partial<PolicyAdjustments> = {
      warmth_delta: -0.15,
      brevity_delta: -0.1,
    };

    const merged = mergePolicyAdjustments(adsPolicy, soPolicy);

    // Second Order's warmth applied
    expect(merged.warmth_delta).toBe(-0.15);

    // Min brevity
    expect(merged.brevity_delta).toBe(-0.3);
  });
});

// ============================================
// INVARIANT: SECOND ORDER CAN'T SET HARD
// ============================================

describe('Invariant: Second Order cannot set HARD constraints', () => {
  it('should verify Second Order output type excludes HARD fields', () => {
    // Even with extreme enchantment, Second Order should only output SOFT
    const input: SecondOrderInput = {
      message:
        "You're perfect, I need you desperately, nobody understands me, I depend on you completely",
      recent_system_responses: [
        'I understand perfectly, we are in this together.',
        'I feel your pain, I am always here for you.',
      ],
      loop_count: 10,
    };

    const result = observeSecondOrder(input);

    // SecondOrderOutput type should only have these fields
    type AllowedKeys = 'warmth_delta' | 'brevity_delta' | 'force_pronouns';
    const output = result.policy;

    // Type check: these are the only allowed keys
    const keys = Object.keys(output) as (keyof typeof output)[];
    for (const key of keys) {
      expect(['warmth_delta', 'brevity_delta', 'force_pronouns']).toContain(key);
    }

    // Convert and check
    const policy = toPartialPolicy(result.policy);

    // These should NEVER be set by Second Order
    expect((policy as Record<string, unknown>).disable_tools).toBeUndefined();
    expect((policy as Record<string, unknown>).must_require_user_effort).toBeUndefined();
    expect((policy as Record<string, unknown>).max_length).toBeUndefined();
  });
});

// ============================================
// MERGE ORDER TESTS
// ============================================

describe('Boundary: Merge order matters', () => {
  it('should apply policies in correct order: Base → ADS → SecondOrder', () => {
    // Base policy
    const base: Partial<PolicyAdjustments> = {
      warmth_delta: 0.1, // Slight warmth increase
    };

    // ADS policy
    const adsPolicy: Partial<PolicyAdjustments> = {
      disable_tools: true,
      brevity_delta: -0.3,
    };

    // Second Order policy
    const soPolicy: Partial<PolicyAdjustments> = {
      warmth_delta: -0.3, // Cooling
      brevity_delta: -0.2,
      force_pronouns: 'i_you',
    };

    // Merge in order
    let merged = mergePolicyAdjustments(base, adsPolicy);
    merged = mergePolicyAdjustments(merged, soPolicy);

    // Base + Second Order warmth: 0.1 + (-0.3) = -0.2 (clamped)
    expect(merged.warmth_delta).toBeCloseTo(-0.2, 5);

    // ADS disable_tools preserved
    expect(merged.disable_tools).toBe(true);

    // Min brevity: min(-0.3, -0.2) = -0.3
    expect(merged.brevity_delta).toBe(-0.3);

    // Second Order pronouns
    expect(merged.force_pronouns).toBe('i_you');
  });
});

// ============================================
// MONOTONICITY TESTS
// ============================================

describe('Boundary: Monotonicity (can only tighten)', () => {
  it('should never relax disable_tools once set', () => {
    const policy1: Partial<PolicyAdjustments> = {
      disable_tools: true,
    };

    const policy2: Partial<PolicyAdjustments> = {
      disable_tools: false, // Attempt to relax
    };

    const merged = mergePolicyAdjustments(policy1, policy2);

    // OR logic: once true, stays true
    expect(merged.disable_tools).toBe(true);
  });

  it('should never relax must_require_user_effort once set', () => {
    const policy1: Partial<PolicyAdjustments> = {
      must_require_user_effort: true,
    };

    const policy2: Partial<PolicyAdjustments> = {
      must_require_user_effort: false,
    };

    const merged = mergePolicyAdjustments(policy1, policy2);

    expect(merged.must_require_user_effort).toBe(true);
  });

  it('should always take more negative brevity_delta (more restrictive)', () => {
    // Start with moderate brevity
    const policy1: Partial<PolicyAdjustments> = {
      brevity_delta: -0.5,
    };

    // Attempt to relax to less brief
    const policy2: Partial<PolicyAdjustments> = {
      brevity_delta: -0.1,
    };

    const merged = mergePolicyAdjustments(policy1, policy2);

    // min(-0.5, -0.1) = -0.5 (stays restrictive)
    expect(merged.brevity_delta).toBe(-0.5);
  });
});
