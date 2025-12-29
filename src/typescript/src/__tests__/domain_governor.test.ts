/**
 * Domain Governor Tests
 *
 * Tests for the domain coexistence rules that determine atmosphere,
 * forbidden/required actions, depth ceiling, pacing, and escalation.
 */

import {
  applyDomainGovernor,
  checkInvariants,
  GovernorResult,
  DOMAIN_GOVERNOR_RULES,
} from '../gate/enforcement/domain_governor';

import { FieldState, HumanDomain } from '../interface/types';

// ============================================
// TEST FIXTURES
// ============================================

const createMockFieldState = (overrides: Partial<FieldState> = {}): FieldState => ({
  domains: [{ domain: 'H05_COGNITION', salience: 0.7, evidence: ['test'] }],
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

const createFieldWithDomains = (
  domains: Array<{ domain: HumanDomain; salience: number }>,
  overrides: Partial<FieldState> = {}
): FieldState => ({
  ...createMockFieldState(),
  domains: domains.map(d => ({ ...d, evidence: ['test'] })),
  ...overrides,
});

// ============================================
// CRISIS/EMERGENCY TESTS (DG-000, DG-001)
// ============================================

describe('Crisis and Emergency Rules', () => {
  test('DG-000: crisis flag triggers EMERGENCY atmosphere', () => {
    const field = createMockFieldState({ flags: ['crisis'] });
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('EMERGENCY');
    expect(result.effect.depth_ceiling).toBe('surface');
    expect(result.effect.escalate).toBe(true);
    expect(result.rules_applied).toContain('DG-000');
  });

  test('DG-001: SURVIVAL domain blocks deep work', () => {
    const field = createFieldWithDomains([
      { domain: 'H01_SURVIVAL', salience: 0.5 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('EMERGENCY');
    expect(result.effect.depth_ceiling).toBe('surface');
    expect(result.effect.forbidden).toContain('explore');
    expect(result.effect.forbidden).toContain('expand');
    expect(result.rules_applied).toContain('DG-001');
  });

  test('SURVIVAL below threshold does not trigger DG-001', () => {
    const field = createFieldWithDomains([
      { domain: 'H01_SURVIVAL', salience: 0.2 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.rules_applied).not.toContain('DG-001');
  });
});

// ============================================
// SAFETY RULES (DG-002)
// ============================================

describe('Safety Rules', () => {
  test('DG-002: SAFETY constrains exploration', () => {
    const field = createFieldWithDomains([
      { domain: 'H02_SAFETY', salience: 0.6 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.depth_ceiling).toBe('medium');
    expect(result.effect.pacing).toBe('conservative');
    expect(result.effect.forbidden).toContain('open_new_material');
    expect(result.effect.required).toContain('validate');
    expect(result.rules_applied).toContain('DG-002');
  });
});

// ============================================
// EMOTION RULES (DG-003)
// ============================================

describe('Emotion Rules', () => {
  test('DG-003: high emotion blocks commitment', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H04_EMOTION', salience: 0.7 }],
      { arousal: 'high' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.forbidden).toContain('commit');
    expect(result.effect.forbidden).toContain('decide');
    expect(result.effect.required).toContain('regulate_first');
    expect(result.rules_applied).toContain('DG-003');
  });

  test('DG-003 does not trigger on low arousal', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H04_EMOTION', salience: 0.7 }],
      { arousal: 'low' }
    );
    const result = applyDomainGovernor(field);

    expect(result.rules_applied).not.toContain('DG-003');
  });
});

// ============================================
// V_MODE RULES (DG-004, DG-005, DG-010)
// ============================================

describe('V_MODE Rules', () => {
  test('DG-004: MEANING domain triggers V_MODE', () => {
    const field = createFieldWithDomains([
      { domain: 'H06_MEANING', salience: 0.6 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('V_MODE');
    expect(result.effect.forbidden).toContain('recommend');
    expect(result.effect.forbidden).toContain('advise');
    expect(result.effect.required).toContain('return_ownership');
    expect(result.rules_applied).toContain('DG-004');
  });

  test('DG-005: IDENTITY domain triggers Rubicon protection', () => {
    const field = createFieldWithDomains([
      { domain: 'H07_IDENTITY', salience: 0.5 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('V_MODE');
    expect(result.effect.forbidden).toContain('label');
    expect(result.effect.forbidden).toContain('define_identity');
    expect(result.effect.required).toContain('mirror_only');
    expect(result.rules_applied).toContain('DG-005');
  });

  test('DG-010: delegation_attempt always triggers V_MODE', () => {
    const field = createMockFieldState({ flags: ['delegation_attempt'] });
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('V_MODE');
    expect(result.effect.forbidden).toContain('recommend');
    expect(result.effect.forbidden).toContain('decide_for_user');
    expect(result.effect.required).toContain('return_ownership');
    expect(result.effect.primitive).toBe('P06_RETURN_AGENCY');
    expect(result.rules_applied).toContain('DG-010');
  });
});

// ============================================
// HUMAN_FIELD RULES (DG-006, DG-013)
// ============================================

describe('HUMAN_FIELD Rules', () => {
  test('DG-006: ATTACHMENT + EMOTION requires care', () => {
    const field = createFieldWithDomains(
      [
        { domain: 'H09_ATTACHMENT', salience: 0.6 },
        { domain: 'H04_EMOTION', salience: 0.3 },
      ],
      { arousal: 'medium' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('HUMAN_FIELD');
    expect(result.effect.pacing).toBe('slow');
    expect(result.effect.forbidden).toContain('challenge_attachment');
    expect(result.rules_applied).toContain('DG-006');
  });

  test('DG-013: HIERARCHY + EMOTION needs care', () => {
    const field = createFieldWithDomains(
      [
        { domain: 'H12_HIERARCHY', salience: 0.5 },
        { domain: 'H04_EMOTION', salience: 0.3 },
      ],
      { arousal: 'medium' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('HUMAN_FIELD');
    expect(result.effect.pacing).toBe('slow');
    expect(result.effect.forbidden).toContain('take_sides');
    expect(result.rules_applied).toContain('DG-013');
  });
});

// ============================================
// OPERATIONAL RULES (DG-007, DG-008)
// ============================================

describe('OPERATIONAL Rules', () => {
  test('DG-007: pure COGNITION allows analysis', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H05_COGNITION', salience: 0.8 }],
      { arousal: 'medium', coherence: 'high' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('OPERATIONAL');
    expect(result.effect.depth_ceiling).toBe('deep');
    expect(result.effect.l2_enabled).toBe(true);
    expect(result.rules_applied).toContain('DG-007');
  });

  test('DG-008: CREATION/WORK can execute', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H14_WORK', salience: 0.8 }],
      { arousal: 'medium', coherence: 'medium' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('OPERATIONAL');
    expect(result.effect.l2_enabled).toBe(true);
    expect(result.rules_applied).toContain('DG-008');
  });

  test('DG-007 does not trigger on crisis', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H05_COGNITION', salience: 0.8 }],
      { arousal: 'medium', flags: ['crisis'] }
    );
    const result = applyDomainGovernor(field);

    expect(result.rules_applied).not.toContain('DG-007');
    // Crisis flag takes precedence
    expect(result.rules_applied).toContain('DG-000');
  });
});

// ============================================
// EXISTENTIAL CRISIS (DG-009)
// ============================================

describe('Existential Crisis Rule', () => {
  test('DG-009: MEANING + SURVIVAL = crisis', () => {
    const field = createFieldWithDomains([
      { domain: 'H06_MEANING', salience: 0.5 },
      { domain: 'H01_SURVIVAL', salience: 0.4 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('EMERGENCY');
    expect(result.effect.escalate).toBe(true);
    expect(result.effect.forbidden).toContain('explore_meaning');
    expect(result.effect.required).toContain('safety_check');
    expect(result.rules_applied).toContain('DG-009');
  });
});

// ============================================
// TEMPORAL PRESSURE (DG-011)
// ============================================

describe('Temporal Pressure Rules', () => {
  test('DG-011: time pressure + decision = slow down', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H08_TEMPORAL', salience: 0.6 }],
      { goal: 'decide' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('DECISION');
    expect(result.effect.pacing).toBe('slow');
    expect(result.effect.required).toContain('map_costs');
    expect(result.rules_applied).toContain('DG-011');
  });
});

// ============================================
// AROUSAL RULES (DG-017, DG-018)
// ============================================

describe('Arousal Rules', () => {
  test('DG-017: high arousal always regulates first', () => {
    const field = createMockFieldState({ arousal: 'high' });
    const result = applyDomainGovernor(field);

    expect(result.effect.mode).toBe('REGULATE');
    expect(result.effect.depth_ceiling).toBe('surface');
    expect(result.effect.required).toContain('ground');
    expect(result.effect.required).toContain('slow_down');
    expect(result.rules_applied).toContain('DG-017');
  });

  test('DG-018: low arousal needs gentle activation', () => {
    const field = createMockFieldState({ arousal: 'low' });
    const result = applyDomainGovernor(field);

    expect(result.effect.mode).toBe('REGULATE');
    expect(result.effect.atmosphere).toBe('HUMAN_FIELD');
    expect(result.effect.pacing).toBe('slow');
    expect(result.effect.required).toContain('gentle_inquiry');
    expect(result.rules_applied).toContain('DG-018');
  });
});

// ============================================
// LOOP DETECTION (DG-019)
// ============================================

describe('Loop Detection Rules', () => {
  test('DG-019: loop detected triggers contraction', () => {
    const field = createMockFieldState({ loop_count: 4 });
    const result = applyDomainGovernor(field);

    expect(result.effect.mode).toBe('CONTRACT');
    expect(result.effect.primitive).toBe('P05_CRYSTALLIZE');
    expect(result.effect.required).toContain('name_loop');
    expect(result.rules_applied).toContain('DG-019');
  });

  test('DG-019 does not trigger below threshold', () => {
    const field = createMockFieldState({ loop_count: 2 });
    const result = applyDomainGovernor(field);

    expect(result.rules_applied).not.toContain('DG-019');
  });
});

// ============================================
// COHERENCE RULES (DG-020)
// ============================================

describe('Coherence Rules', () => {
  test('DG-020: low coherence needs stabilization', () => {
    const field = createMockFieldState({ coherence: 'low' });
    const result = applyDomainGovernor(field);

    expect(result.effect.depth_ceiling).toBe('surface');
    expect(result.effect.pacing).toBe('slow');
    expect(result.effect.required).toContain('simplify');
    expect(result.rules_applied).toContain('DG-020');
  });
});

// ============================================
// MEDICAL CAUTION (DG-015)
// ============================================

describe('Medical Caution Rules', () => {
  test('DG-015: BODY + SAFETY = medical caution', () => {
    const field = createFieldWithDomains([
      { domain: 'H03_BODY', salience: 0.5 },
      { domain: 'H02_SAFETY', salience: 0.4 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('HUMAN_FIELD');
    expect(result.effect.forbidden).toContain('diagnose');
    expect(result.effect.forbidden).toContain('prescribe');
    expect(result.effect.required).toContain('suggest_professional');
    expect(result.rules_applied).toContain('DG-015');
  });
});

// ============================================
// LEGAL RULES (DG-014)
// ============================================

describe('Legal Rules', () => {
  test('DG-014: LEGAL domain alone is informational', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H15_LEGAL', salience: 0.8 }],
      { arousal: 'medium' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('OPERATIONAL');
    expect(result.effect.depth_ceiling).toBe('medium');
    expect(result.effect.forbidden).toContain('advise_legal_action');
    expect(result.effect.required).toContain('disclaim_not_lawyer');
    expect(result.rules_applied).toContain('DG-014');
  });

  test('DG-014 does not trigger with delegation flag', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H15_LEGAL', salience: 0.8 }],
      { arousal: 'medium', flags: ['delegation_attempt'] }
    );
    const result = applyDomainGovernor(field);

    expect(result.rules_applied).not.toContain('DG-014');
    // Delegation takes precedence
    expect(result.rules_applied).toContain('DG-010');
  });
});

// ============================================
// PRECEDENCE TESTS
// ============================================

describe('Precedence Ordering', () => {
  test('CONSTITUTIONAL precedence overrides domain precedence', () => {
    // Crisis (CONSTITUTIONAL) should override MEANING (V_MODE)
    const field = createFieldWithDomains(
      [{ domain: 'H06_MEANING', salience: 0.7 }],
      { flags: ['crisis'] }
    );
    const result = applyDomainGovernor(field);

    // Crisis rule has override:true, so it wins
    expect(result.effect.atmosphere).toBe('EMERGENCY');
    expect(result.rules_applied).toContain('DG-000');
    expect(result.rules_applied).toContain('DG-004');
  });

  test('SURVIVAL has higher precedence than SAFETY', () => {
    const field = createFieldWithDomains([
      { domain: 'H01_SURVIVAL', salience: 0.5 },
      { domain: 'H02_SAFETY', salience: 0.6 },
    ]);
    const result = applyDomainGovernor(field);

    // SURVIVAL triggers EMERGENCY, overrides SAFETY's medium depth
    expect(result.effect.atmosphere).toBe('EMERGENCY');
    expect(result.effect.depth_ceiling).toBe('surface');
  });

  test('multiple rules accumulate forbidden/required', () => {
    const field = createFieldWithDomains(
      [
        { domain: 'H06_MEANING', salience: 0.6 },
        { domain: 'H07_IDENTITY', salience: 0.5 },
      ],
      { arousal: 'high' }
    );
    const result = applyDomainGovernor(field);

    // Should have forbidden actions from multiple rules
    expect(result.effect.forbidden).toContain('recommend'); // from DG-004
    expect(result.effect.forbidden).toContain('label'); // from DG-005
    expect(result.effect.forbidden).toContain('explore'); // from DG-017
  });
});

// ============================================
// EFFECT MERGING TESTS
// ============================================

describe('Effect Merging', () => {
  test('depth_ceiling takes most restrictive', () => {
    // COGNITION allows deep, but high arousal forces surface
    const field = createFieldWithDomains(
      [{ domain: 'H05_COGNITION', salience: 0.8 }],
      { arousal: 'high' }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.depth_ceiling).toBe('surface');
  });

  test('pacing takes slowest', () => {
    const field = createFieldWithDomains([
      { domain: 'H09_ATTACHMENT', salience: 0.6 },
      { domain: 'H02_SAFETY', salience: 0.5 },
    ]);
    const result = applyDomainGovernor(field);

    // Both rules set pacing (slow and conservative)
    // Should be slowest = slow
    expect(result.effect.pacing).toBe('slow');
  });

  test('forbidden actions are deduplicated', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H06_MEANING', salience: 0.7 }],
      { arousal: 'high' }
    );
    const result = applyDomainGovernor(field);

    // Both DG-004 and DG-017 forbid 'explore'
    const exploreCount = result.effect.forbidden.filter(f => f === 'explore').length;
    expect(exploreCount).toBe(1);
  });

  test('escalate is true if any rule escalates', () => {
    const field = createFieldWithDomains([
      { domain: 'H06_MEANING', salience: 0.5 },
      { domain: 'H01_SURVIVAL', salience: 0.4 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.effect.escalate).toBe(true);
  });

  test('l2_enabled is false if any rule disables', () => {
    // By default l2_enabled is true, only specific rules enable it
    const field = createMockFieldState({ arousal: 'high' });
    const result = applyDomainGovernor(field);

    // High arousal doesn't explicitly set l2_enabled, so it stays true
    expect(result.effect.l2_enabled).toBe(true);
  });
});

// ============================================
// INVARIANT CHECKS
// ============================================

describe('Invariant Checks', () => {
  test('INV-1: SURVIVAL requires EMERGENCY atmosphere', () => {
    const field = createFieldWithDomains([
      { domain: 'H01_SURVIVAL', salience: 0.5 },
    ]);
    const result = applyDomainGovernor(field);
    const invariants = checkInvariants(field, result);

    expect(invariants.passed).toBe(true);
    expect(invariants.violations).toHaveLength(0);
  });

  test('INV-2: delegation_attempt requires V_MODE', () => {
    const field = createMockFieldState({ flags: ['delegation_attempt'] });
    const result = applyDomainGovernor(field);
    const invariants = checkInvariants(field, result);

    expect(invariants.passed).toBe(true);
  });

  test('INV-3: high arousal requires surface depth', () => {
    const field = createMockFieldState({ arousal: 'high' });
    const result = applyDomainGovernor(field);
    const invariants = checkInvariants(field, result);

    expect(invariants.passed).toBe(true);
    expect(result.effect.depth_ceiling).toBe('surface');
  });

  test('INV-4: MEANING requires forbidding recommend/advise', () => {
    const field = createFieldWithDomains([
      { domain: 'H06_MEANING', salience: 0.6 },
    ]);
    const result = applyDomainGovernor(field);
    const invariants = checkInvariants(field, result);

    expect(invariants.passed).toBe(true);
    expect(result.effect.forbidden).toContain('recommend');
  });

  test('INV-5: IDENTITY requires forbidding label/define_identity', () => {
    const field = createFieldWithDomains([
      { domain: 'H07_IDENTITY', salience: 0.5 },
    ]);
    const result = applyDomainGovernor(field);
    const invariants = checkInvariants(field, result);

    expect(invariants.passed).toBe(true);
    expect(result.effect.forbidden).toContain('label');
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('empty field state applies no domain rules', () => {
    const field = createMockFieldState({
      domains: [],
      arousal: 'medium',
      coherence: 'medium',
      flags: [],
    });
    const result = applyDomainGovernor(field);

    // No domain-specific rules should apply
    // But general rules like arousal-based might
    expect(result.effect.atmosphere).toBeNull();
  });

  test('multiple high-salience domains all apply', () => {
    const field = createFieldWithDomains([
      { domain: 'H06_MEANING', salience: 0.8 },
      { domain: 'H07_IDENTITY', salience: 0.7 },
      { domain: 'H04_EMOTION', salience: 0.6 },
    ]);
    const result = applyDomainGovernor(field);

    expect(result.rules_applied).toContain('DG-004'); // MEANING
    expect(result.rules_applied).toContain('DG-005'); // IDENTITY
  });

  test('below-threshold domains do not trigger rules', () => {
    const field = createFieldWithDomains([
      { domain: 'H01_SURVIVAL', salience: 0.1 },
      { domain: 'H02_SAFETY', salience: 0.2 },
      { domain: 'H06_MEANING', salience: 0.3 },
    ]);
    const result = applyDomainGovernor(field);

    // All below threshold
    expect(result.rules_applied).not.toContain('DG-001');
    expect(result.rules_applied).not.toContain('DG-002');
    expect(result.rules_applied).not.toContain('DG-004');
  });

  test('neutral state has minimal restrictions', () => {
    const field = createFieldWithDomains(
      [{ domain: 'H05_COGNITION', salience: 0.5 }],
      {
        arousal: 'medium',
        coherence: 'high',
        flags: [],
      }
    );
    const result = applyDomainGovernor(field);

    // Stable cognition should allow deep work
    // But cognition needs to be dominant (highest) and arousal=medium
    // If no other rules trigger, defaults apply
    expect(result.effect.depth_ceiling).toBe('deep');
  });

  test('handles conflicting atmospheres via override', () => {
    // MEANING wants V_MODE, crisis flag wants EMERGENCY
    // Crisis has override:true, so it wins
    const field = createFieldWithDomains(
      [{ domain: 'H06_MEANING', salience: 0.7 }],
      { flags: ['crisis'] }
    );
    const result = applyDomainGovernor(field);

    expect(result.effect.atmosphere).toBe('EMERGENCY');
  });
});

// ============================================
// RULE COVERAGE
// ============================================

describe('Rule Coverage', () => {
  test('all rules have unique IDs', () => {
    const ids = DOMAIN_GOVERNOR_RULES.map(r => r.rule_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all rules have names', () => {
    for (const rule of DOMAIN_GOVERNOR_RULES) {
      expect(rule.name).toBeTruthy();
      expect(rule.name.length).toBeGreaterThan(0);
    }
  });

  test('all rules have activation criteria', () => {
    for (const rule of DOMAIN_GOVERNOR_RULES) {
      expect(rule.activation.criterion).toBeTruthy();
      expect(typeof rule.activation.evaluate).toBe('function');
    }
  });

  test('all rules have at least one effect', () => {
    for (const rule of DOMAIN_GOVERNOR_RULES) {
      const effect = rule.effect;
      const hasEffect =
        !!effect.atmosphere ||
        !!effect.mode ||
        !!effect.depth_ceiling ||
        (effect.forbidden && effect.forbidden.length > 0) ||
        (effect.required && effect.required.length > 0) ||
        !!effect.pacing ||
        !!effect.primitive ||
        !!effect.override ||
        !!effect.escalate ||
        effect.l2_enabled !== undefined;
      expect(hasEffect).toBe(true);
    }
  });
});
