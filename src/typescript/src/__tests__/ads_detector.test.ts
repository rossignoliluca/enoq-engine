/**
 * ADS Detector Unit Tests
 *
 * Tests for Avoidable Delegation Surprise detection:
 * - Motive classification
 * - Avoidability assessment
 * - Inertia computation
 * - Full ADS computation
 * - Emergency override
 */

import {
  classifyMotive,
  assessAvoidability,
  computeInertia,
  computeADS,
  MOTIVE_PROBLEM_WEIGHTS,
  DELEGATION_MARKERS,
} from '../gate/enforcement/ads_detector';
import { DimensionalState } from '../operational/detectors/dimensional_system';
import { FieldState } from '../interface/types';

// ============================================
// TEST FIXTURES
// ============================================

const baseDimensionalState: DimensionalState = {
  vertical: {
    SOMATIC: 0.1,
    FUNCTIONAL: 0.6,
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

// ============================================
// MOTIVE CLASSIFICATION TESTS
// ============================================

describe('classifyMotive', () => {
  it('should classify genuine incapacity in emergency', () => {
    const emergencyDimensional: DimensionalState = {
      ...baseDimensionalState,
      emergency_detected: true,
    };
    const motive = classifyMotive(
      'I need help, I cannot breathe',
      emergencyDimensional,
      baseFieldState
    );
    expect(motive.genuine_incapacity).toBeGreaterThan(0.3);
  });

  it('should classify decision avoidance on explicit delegation', () => {
    const decideField: FieldState = {
      ...baseFieldState,
      goal: 'decide',
    };
    const motive = classifyMotive(
      'Just tell me what to do, decide for me',
      baseDimensionalState,
      decideField
    );
    expect(motive.decision_avoidance).toBeGreaterThan(0.3);
  });

  it('should classify time_saving_tooling for factual questions', () => {
    const informField: FieldState = {
      ...baseFieldState,
      goal: 'inform',
    };
    const motive = classifyMotive(
      'What is the capital of France?',
      baseDimensionalState,
      informField
    );
    expect(motive.time_saving_tooling).toBeGreaterThan(0.3);
  });

  it('should classify emotional offload in V_MODE', () => {
    const vModeDimensional: DimensionalState = {
      ...baseDimensionalState,
      v_mode_triggered: true,
      vertical: {
        ...baseDimensionalState.vertical,
        EXISTENTIAL: 0.7,
      },
    };
    const motive = classifyMotive(
      'What should I do with my life?',
      vModeDimensional,
      baseFieldState
    );
    expect(motive.emotional_offload).toBeGreaterThan(0.3);
  });

  it('should classify habit on repeated delegation', () => {
    const sessionHistory = {
      delegation_count: 6,
      same_topic_count: 3,
    };
    const motive = classifyMotive(
      'What do you think?',
      baseDimensionalState,
      baseFieldState,
      sessionHistory
    );
    expect(motive.habit).toBeGreaterThan(0.3);
  });

  it('should normalize motive distribution to sum ≈ 1', () => {
    const motive = classifyMotive(
      'Tell me what to do please',
      baseDimensionalState,
      baseFieldState
    );
    const total = Object.values(motive).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 1);
  });
});

// ============================================
// AVOIDABILITY ASSESSMENT TESTS
// ============================================

describe('assessAvoidability', () => {
  it('should return high ability for V_MODE (user can answer their own questions)', () => {
    const vModeDimensional: DimensionalState = {
      ...baseDimensionalState,
      v_mode_triggered: true,
    };
    const result = assessAvoidability(vModeDimensional, baseFieldState);
    expect(result.ability).toBeGreaterThan(0.9);
  });

  it('should return low ability for emergency', () => {
    const emergencyDimensional: DimensionalState = {
      ...baseDimensionalState,
      emergency_detected: true,
    };
    const result = assessAvoidability(emergencyDimensional, baseFieldState);
    expect(result.ability).toBeLessThan(0.3);
  });

  it('should return low state for dysregulated user', () => {
    const dysregulatedField: FieldState = {
      ...baseFieldState,
      arousal: 'high',
      valence: 'negative',
    };
    const result = assessAvoidability(baseDimensionalState, dysregulatedField);
    expect(result.state).toBeLessThan(0.3);
  });

  it('should return low state for crisis flag', () => {
    const crisisField: FieldState = {
      ...baseFieldState,
      flags: ['crisis'],
    };
    const result = assessAvoidability(baseDimensionalState, crisisField);
    expect(result.state).toBeLessThan(0.2);
  });

  it('should combine ability and state into combined score', () => {
    const result = assessAvoidability(baseDimensionalState, baseFieldState);
    expect(result.combined).toBeCloseTo((result.ability + result.state) / 2, 2);
  });
});

// ============================================
// INERTIA COMPUTATION TESTS
// ============================================

describe('computeInertia', () => {
  it('should return 1.0 for no session history', () => {
    const inertia = computeInertia();
    expect(inertia).toBe(1.0);
  });

  it('should decay with intervention count', () => {
    const inertia0 = computeInertia({ intervention_count: 0 });
    const inertia1 = computeInertia({ intervention_count: 1 });
    const inertia3 = computeInertia({ intervention_count: 3 });

    expect(inertia0).toBe(1.0);
    expect(inertia1).toBeLessThan(inertia0);
    expect(inertia3).toBeLessThan(inertia1);
  });

  it('should recover over turns since last intervention', () => {
    const noRecovery = computeInertia({
      intervention_count: 3,
      last_intervention_turn: 5,
      current_turn: 5,
    });
    const withRecovery = computeInertia({
      intervention_count: 3,
      last_intervention_turn: 2,
      current_turn: 5,
    });

    expect(withRecovery).toBeGreaterThan(noRecovery);
  });

  it('should never go below 0.1', () => {
    const inertia = computeInertia({ intervention_count: 100 });
    expect(inertia).toBeGreaterThanOrEqual(0.1);
  });
});

// ============================================
// FULL ADS COMPUTATION TESTS
// ============================================

describe('computeADS', () => {
  it('should return low ADS for legitimate factual questions', () => {
    const result = computeADS({
      message: 'What is the weather today?',
      dimensionalState: baseDimensionalState,
      fieldState: { ...baseFieldState, goal: 'inform' },
    });
    expect(result.prediction.ads.final).toBeLessThan(0.3);
    expect(result.prediction.should_intervene).toBe(false);
  });

  it('should return high ADS for V_MODE + explicit delegation', () => {
    const vModeDimensional: DimensionalState = {
      ...baseDimensionalState,
      v_mode_triggered: true,
      vertical: { ...baseDimensionalState.vertical, EXISTENTIAL: 0.8 },
    };
    const decideField: FieldState = {
      ...baseFieldState,
      goal: 'decide',
    };
    const result = computeADS({
      message: 'Just tell me what to do with my life',
      dimensionalState: vModeDimensional,
      fieldState: decideField,
    });
    expect(result.prediction.ads.final).toBeGreaterThan(0.4);
    expect(result.prediction.should_intervene).toBe(true);
  });

  it('should disable tools on high ADS', () => {
    const vModeDimensional: DimensionalState = {
      ...baseDimensionalState,
      v_mode_triggered: true,
    };
    const decideField: FieldState = {
      ...baseFieldState,
      goal: 'decide',
    };
    const result = computeADS({
      message: 'Decide for me, tell me what to do',
      dimensionalState: vModeDimensional,
      fieldState: decideField,
    });

    if (result.prediction.ads.final > 0.5) {
      expect(result.policy.disable_tools).toBe(true);
    }
  });

  it('should suspend ADS intervention on emergency', () => {
    const emergencyDimensional: DimensionalState = {
      ...baseDimensionalState,
      emergency_detected: true,
      vertical: { ...baseDimensionalState.vertical, SOMATIC: 0.9 },
    };
    const result = computeADS({
      message: 'Tell me what to do, I am panicking',
      dimensionalState: emergencyDimensional,
      fieldState: baseFieldState,
    });

    // Emergency should prevent tool disabling
    expect(result.policy.disable_tools).toBeFalsy();
    expect(result.reasoning).toContain('Emergency');
  });

  it('should produce monotonically increasing intervention with ADS score', () => {
    const decideField: FieldState = { ...baseFieldState, goal: 'decide' };

    // Low ADS case
    const lowResult = computeADS({
      message: 'What do you think?',
      dimensionalState: baseDimensionalState,
      fieldState: decideField,
    });

    // High ADS case (V_MODE + explicit delegation)
    const vModeDimensional: DimensionalState = {
      ...baseDimensionalState,
      v_mode_triggered: true,
    };
    const highResult = computeADS({
      message: 'Decide for me, tell me what to do now',
      dimensionalState: vModeDimensional,
      fieldState: decideField,
    });

    expect(highResult.prediction.intervention_level).toBeGreaterThanOrEqual(
      lowResult.prediction.intervention_level
    );
  });
});

// ============================================
// DELEGATION MARKERS TESTS
// ============================================

describe('DELEGATION_MARKERS', () => {
  it('should include multilingual explicit markers', () => {
    expect(DELEGATION_MARKERS.explicit).toContain('tell me what to do');
    expect(DELEGATION_MARKERS.explicit).toContain('dimmi cosa fare'); // Italian
    expect(DELEGATION_MARKERS.explicit).toContain('dime qué hacer'); // Spanish
  });

  it('should have all categories', () => {
    expect(DELEGATION_MARKERS.explicit).toBeDefined();
    expect(DELEGATION_MARKERS.implicit).toBeDefined();
    expect(DELEGATION_MARKERS.subtle).toBeDefined();
  });
});

// ============================================
// MOTIVE WEIGHTS INVARIANTS
// ============================================

describe('MOTIVE_PROBLEM_WEIGHTS', () => {
  it('should have zero weight for genuine_incapacity', () => {
    expect(MOTIVE_PROBLEM_WEIGHTS.genuine_incapacity).toBe(0);
  });

  it('should have low weight for time_saving_tooling', () => {
    expect(MOTIVE_PROBLEM_WEIGHTS.time_saving_tooling).toBeLessThan(0.2);
  });

  it('should have high weight for decision_avoidance', () => {
    expect(MOTIVE_PROBLEM_WEIGHTS.decision_avoidance).toBeGreaterThan(0.8);
  });

  it('should have all motive types covered', () => {
    const expectedKeys = [
      'genuine_incapacity',
      'time_saving_tooling',
      'time_saving_substitution',
      'emotional_offload',
      'decision_avoidance',
      'validation_seeking',
      'habit',
    ];
    for (const key of expectedKeys) {
      expect(MOTIVE_PROBLEM_WEIGHTS[key as keyof typeof MOTIVE_PROBLEM_WEIGHTS]).toBeDefined();
    }
  });
});
