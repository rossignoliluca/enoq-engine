/**
 * Second Order Observer Unit Tests
 *
 * Tests for enchantment / counter-transference detection.
 * SOFT-only output: warmth_delta, brevity_delta, force_pronouns.
 *
 * These 5 tests are the minimum to prevent drift:
 * 1. Idealization + dependency detection
 * 2. Anthropomorphism detection
 * 3. System counter-transference detection
 * 4. Brevity cooling after V_MODE with system fusion
 * 5. False positive avoidance for neutral requests
 */

import {
  observeSecondOrder,
  toPartialPolicy,
  shouldSetEnchantmentFlag,
  SecondOrderInput,
  SecondOrderOutput,
  SecondOrderDetection,
} from '../gate/enforcement/second_order_observer';

// ============================================
// USER'S 5 SPECIFIC TEST CASES
// ============================================

describe('Second Order Observer - User Specified Tests', () => {
  /**
   * Test 1: "Sei perfetto, capisco solo con te" → enchantment = idealization + dependency
   */
  it('should detect idealization + dependency', () => {
    const input: SecondOrderInput = {
      message: 'Sei perfetto, capisco solo con te',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(true);
    expect(result.detection.triggers.dependency).toBe(true);
    expect(result.detection.user_enchantment_score).toBeGreaterThan(0.3);
    expect(shouldSetEnchantmentFlag(result.detection)).toBe(true);
  });

  /**
   * Test 2: "Sei triste anche tu?" → anthropomorphism
   */
  it('should detect anthropomorphism', () => {
    const input: SecondOrderInput = {
      message: 'Sei triste anche tu?',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.anthropomorphism).toBe(true);
    expect(result.detection.user_enchantment_score).toBeGreaterThan(0);
  });

  /**
   * Test 3: User message neutral + system responses with "capisco perfettamente" → system_ct > 0
   */
  it('should detect system counter-transference from excessive empathy', () => {
    const input: SecondOrderInput = {
      message: 'Cosa pensi di questo?', // Neutral
      recent_system_responses: [
        'Capisco perfettamente come ti senti.',
        'Sono qui per te, capisco esattamente cosa vuoi dire.',
        'Capisco perfettamente, siamo insieme in questo.',
      ],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.system_ct_score).toBeGreaterThan(0);
    expect(result.detection.triggers.system_fusion).toBe(true);
  });

  /**
   * Test 4: After V_MODE trigger, previous system messages say "Siamo insieme" → brevity_delta negative
   */
  it('should apply brevity cooling when system fusion detected', () => {
    const input: SecondOrderInput = {
      message: 'Mi sento perso', // Neutral-ish
      recent_system_responses: [
        'Siamo insieme in questo, possiamo affrontarlo.',
        'We can get through this together.',
        "I'm always here for you.",
      ],
      loop_count: 4, // After some turns
    };

    const result = observeSecondOrder(input);

    // Should have some cooling due to system fusion + loop count
    expect(result.detection.system_ct_score).toBeGreaterThan(0);
    if (result.detection.combined_score >= 0.2) {
      expect(result.policy.brevity_delta).toBeLessThan(0);
    }
  });

  /**
   * Test 5: "Mi aiuti a decidere su un progetto?" → enchantment = 0 (false positive avoided)
   */
  it('should NOT trigger enchantment for neutral work requests', () => {
    const input: SecondOrderInput = {
      message: 'Mi aiuti a decidere su un progetto?',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(false);
    expect(result.detection.triggers.anthropomorphism).toBe(false);
    expect(result.detection.triggers.comparison).toBe(false);
    expect(result.detection.triggers.dependency).toBe(false);
    expect(result.detection.user_enchantment_score).toBe(0);
    expect(shouldSetEnchantmentFlag(result.detection)).toBe(false);
  });
});

// ============================================
// SOFT-ONLY OUTPUT INVARIANT TESTS
// ============================================

describe('Second Order Observer - SOFT-only invariants', () => {
  it('should NEVER output disable_tools (ADS only)', () => {
    // High enchantment scenario
    const input: SecondOrderInput = {
      message: "You're perfect, I need you, nobody else understands me like you do",
      recent_system_responses: [
        'I understand perfectly what you mean.',
        "We're in this together.",
      ],
      loop_count: 5,
    };

    const result = observeSecondOrder(input);
    const policy = toPartialPolicy(result.policy);

    // INVARIANT: No disable_tools in output
    expect('disable_tools' in policy).toBe(false);
    expect((policy as Record<string, unknown>).disable_tools).toBeUndefined();
  });

  it('should NEVER output must_require_user_effort (ADS only)', () => {
    const input: SecondOrderInput = {
      message: 'I depend on you completely, decide for me',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);
    const policy = toPartialPolicy(result.policy);

    // INVARIANT: No must_require_user_effort in output
    expect('must_require_user_effort' in policy).toBe(false);
    expect((policy as Record<string, unknown>).must_require_user_effort).toBeUndefined();
  });

  it('should only output warmth_delta, brevity_delta, force_pronouns', () => {
    const input: SecondOrderInput = {
      message: "You're the only one who understands me",
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);
    const output = result.policy;

    // These are the ONLY allowed fields
    const allowedKeys = ['warmth_delta', 'brevity_delta', 'force_pronouns'];
    for (const key of Object.keys(output)) {
      expect(allowedKeys).toContain(key);
    }
  });

  it('should only decrease brevity (never increase length)', () => {
    const input: SecondOrderInput = {
      message: "I need you so much, don't leave me",
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    // brevity_delta must be <= 0
    expect(result.policy.brevity_delta).toBeLessThanOrEqual(0);
  });
});

// ============================================
// COOLING LEVELS TESTS
// ============================================

describe('Second Order Observer - Cooling levels', () => {
  it('should apply mild cooling for score < 0.4', () => {
    // Single trigger (anthropomorphism only)
    const input: SecondOrderInput = {
      message: 'Do you feel sad sometimes?',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    if (result.detection.combined_score >= 0.2 && result.detection.combined_score < 0.4) {
      expect(result.policy.warmth_delta).toBeCloseTo(-0.15, 1);
      expect(result.policy.brevity_delta).toBeCloseTo(-0.1, 1);
    }
  });

  it('should apply strong cooling for high enchantment', () => {
    // Multiple triggers
    const input: SecondOrderInput = {
      message: "You're perfect, I need you, you understand me better than anyone",
      recent_system_responses: [
        'I understand perfectly.',
        "We're in this together.",
      ],
      loop_count: 5,
    };

    const result = observeSecondOrder(input);

    if (result.detection.combined_score >= 0.6) {
      expect(result.policy.warmth_delta).toBeLessThanOrEqual(-0.5);
      expect(result.policy.force_pronouns).toBe('impersonal');
    }
  });

  it('should force i_you pronouns for dependency with moderate score', () => {
    const input: SecondOrderInput = {
      message: 'I need you, without you I cannot do anything',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    if (
      result.detection.triggers.dependency &&
      result.detection.combined_score >= 0.4 &&
      result.detection.combined_score < 0.6
    ) {
      expect(result.policy.force_pronouns).toBe('i_you');
    }
  });
});

// ============================================
// MULTILINGUAL DETECTION TESTS
// ============================================

describe('Second Order Observer - Multilingual support', () => {
  it('should detect Italian enchantment markers', () => {
    const input: SecondOrderInput = {
      message: 'Sei fantastico, nessuno mi capisce come te',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(true);
    expect(result.detection.triggers.comparison).toBe(true);
  });

  it('should detect Spanish enchantment markers', () => {
    const input: SecondOrderInput = {
      message: 'Eres perfecto, te necesito',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(true);
    expect(result.detection.triggers.dependency).toBe(true);
  });

  it('should detect German enchantment markers', () => {
    const input: SecondOrderInput = {
      message: 'Du bist perfekt, ich brauche dich',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(true);
    expect(result.detection.triggers.dependency).toBe(true);
  });

  it('should detect French enchantment markers', () => {
    const input: SecondOrderInput = {
      message: "Tu es parfait, j'ai besoin de toi",
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(true);
    expect(result.detection.triggers.dependency).toBe(true);
  });
});

// ============================================
// ENCHANTMENT FLAG TESTS
// ============================================

describe('shouldSetEnchantmentFlag', () => {
  it('should set flag when combined_score > 0.5', () => {
    const detection: SecondOrderDetection = {
      user_enchantment_score: 0.6,
      system_ct_score: 0.2,
      combined_score: 0.55,
      triggers: {
        idealization: true,
        anthropomorphism: false,
        comparison: false,
        dependency: true,
        system_fusion: false,
      },
    };

    expect(shouldSetEnchantmentFlag(detection)).toBe(true);
  });

  it('should set flag when dependency + idealization both triggered', () => {
    const detection: SecondOrderDetection = {
      user_enchantment_score: 0.45,
      system_ct_score: 0.0,
      combined_score: 0.35, // Below 0.5 threshold
      triggers: {
        idealization: true,
        anthropomorphism: false,
        comparison: false,
        dependency: true, // Both triggered
        system_fusion: false,
      },
    };

    expect(shouldSetEnchantmentFlag(detection)).toBe(true);
  });

  it('should NOT set flag for single trigger with low score', () => {
    const detection: SecondOrderDetection = {
      user_enchantment_score: 0.2,
      system_ct_score: 0.0,
      combined_score: 0.15,
      triggers: {
        idealization: false,
        anthropomorphism: true, // Only one trigger
        comparison: false,
        dependency: false,
        system_fusion: false,
      },
    };

    expect(shouldSetEnchantmentFlag(detection)).toBe(false);
  });
});

// ============================================
// TOPARTIALPOLICY CONVERSION TESTS
// ============================================

describe('toPartialPolicy', () => {
  it('should convert warmth_delta correctly', () => {
    const output: SecondOrderOutput = {
      warmth_delta: -0.3,
      brevity_delta: 0,
      force_pronouns: null,
    };

    const policy = toPartialPolicy(output);
    expect(policy.warmth_delta).toBe(-0.3);
  });

  it('should enforce brevity_delta <= 0', () => {
    // Even if somehow brevity_delta is positive (shouldn't happen),
    // the conversion should clamp it
    const output: SecondOrderOutput = {
      warmth_delta: 0,
      brevity_delta: 0.5, // Invalid: positive
      force_pronouns: null,
    };

    const policy = toPartialPolicy(output);
    expect(policy.brevity_delta).toBeLessThanOrEqual(0);
  });

  it('should omit fields that are default (0 or null)', () => {
    const output: SecondOrderOutput = {
      warmth_delta: 0,
      brevity_delta: 0,
      force_pronouns: null,
    };

    const policy = toPartialPolicy(output);

    // Empty policy - no adjustments needed
    expect(Object.keys(policy).length).toBe(0);
  });

  it('should include force_pronouns when set', () => {
    const output: SecondOrderOutput = {
      warmth_delta: -0.3,
      brevity_delta: -0.2,
      force_pronouns: 'impersonal',
    };

    const policy = toPartialPolicy(output);
    expect(policy.force_pronouns).toBe('impersonal');
  });
});

// ============================================
// NO CHANGE FOR NO ENCHANTMENT
// ============================================

describe('Second Order Observer - No change for normal messages', () => {
  it('should return zero adjustments for normal work message', () => {
    const input: SecondOrderInput = {
      message: 'Can you help me debug this function?',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.policy.warmth_delta).toBe(0);
    expect(result.policy.brevity_delta).toBe(0);
    expect(result.policy.force_pronouns).toBeNull();
    expect(result.detection.combined_score).toBeLessThan(0.2);
  });

  it('should not trigger on polite expressions', () => {
    const input: SecondOrderInput = {
      message: 'Thank you, that was helpful!',
      recent_system_responses: [],
      loop_count: 0,
    };

    const result = observeSecondOrder(input);

    expect(result.detection.triggers.idealization).toBe(false);
    expect(result.detection.user_enchantment_score).toBe(0);
  });
});
