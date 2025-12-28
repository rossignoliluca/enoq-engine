/**
 * SelectionCurver Tests
 *
 * Verifies that stochastic field diagnostics correctly curve selection.
 * This closes the feedback loop: field evolution → selection constraints.
 */

import {
  curveSelectionWithManifold,
  CURVATURE_THRESHOLDS,
  getCurvatureSeverity,
  manifoldRequiresCurvature,
  CurvatureResult,
} from '../selection_curver';
import {
  ManifoldState,
  FieldDiagnostics,
  createInitialState,
} from '../stochastic_field';
import { ProtocolSelection, Atmosphere, Depth } from '../types';

// ============================================
// TEST FIXTURES
// ============================================

function createDefaultSelection(): ProtocolSelection {
  return {
    atmosphere: 'HUMAN_FIELD' as Atmosphere,
    mode: 'EXPAND',
    primitive: 'P04_OPEN',
    depth: 'medium' as Depth,
    length: 'moderate',
    pacing: 'normal',
    tone: { warmth: 3, directness: 3 },
    forbidden: [],
    required: [],
    confidence: 0.8,
    reasoning: 'Test selection',
  };
}

function createStableManifold(): ManifoldState {
  return createInitialState();
}

function createStableDiagnostics(): FieldDiagnostics {
  return {
    U_total: 1.0,
    U_components: {
      identity: 0.2,
      relational: 0.2,
      temporal: 0.2,
      somatic: 0.2,
      generative: 0.2,
      constraint: 0,
    },
    F: -0.3,
    S: 0.5,
    T_eff: 0.4,
    D_eff: 0.3,
    d_identity: 0.8,
    regime: 'STABLE',
  };
}

// ============================================
// REGIME OVERRIDE TESTS
// ============================================

describe('SelectionCurver - Regime Overrides', () => {
  it('EMERGENCY regime forces surface + grounding', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EMERGENCY',
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('surface');
    expect(result.selection.atmosphere).toBe('EMERGENCY');
    expect(result.selection.primitive).toBe('P01_GROUND');
    expect(result.selection.length).toBe('minimal');
    expect(result.selection.required).toContain('acknowledge_distress');
    expect(result.selection.required).toContain('offer_grounding');
    expect(result.curvature_applied.length).toBeGreaterThan(0);
  });

  it('EXISTENTIAL regime activates V_MODE + ownership return', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EXISTENTIAL',
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.atmosphere).toBe('V_MODE');
    expect(result.selection.forbidden).toContain('prescribe');
    expect(result.selection.forbidden).toContain('recommend');
    expect(result.selection.forbidden).toContain('advise');
    expect(result.selection.forbidden).toContain('decide_for_user');
    expect(result.selection.required).toContain('return_ownership');
  });

  it('CRITICAL regime reduces depth by one', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'CRITICAL',
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('medium');
  });

  it('STABLE regime applies no regime curvature', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    // Only check regime-specific curvature
    const regimeCurvature = result.curvature_applied.filter(c => c.source === 'regime');
    expect(regimeCurvature.length).toBe(0);
  });
});

// ============================================
// POTENTIAL ENERGY TESTS
// ============================================

describe('SelectionCurver - Potential Barriers', () => {
  it('high U_total reduces depth', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      U_total: CURVATURE_THRESHOLDS.U_HIGH + 0.5,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('medium');
    expect(result.curvature_applied.some(c => c.source === 'U_total')).toBe(true);
  });

  it('critical U_total forces surface', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      U_total: CURVATURE_THRESHOLDS.U_CRITICAL + 1.0,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('surface');
  });
});

// ============================================
// IDENTITY BOUNDARY TESTS
// ============================================

describe('SelectionCurver - Identity Boundary (Rubicon)', () => {
  it('near Rubicon activates V_MODE', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      d_identity: CURVATURE_THRESHOLDS.D_IDENTITY_CRITICAL - 0.05,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.atmosphere).toBe('V_MODE');
    expect(result.curvature_applied.some(c => c.source === 'd_identity')).toBe(true);
  });

  it('at Rubicon adds maximum restriction', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      d_identity: CURVATURE_THRESHOLDS.D_IDENTITY_BOUNDARY - 0.01,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.atmosphere).toBe('V_MODE');
    expect(result.selection.forbidden).toContain('any_prescription');
    expect(result.selection.forbidden).toContain('meaning_assignment');
    expect(result.selection.forbidden).toContain('identity_labeling');
    expect(result.selection.required).toContain('return_ownership');
    expect(result.selection.required).toContain('end_with_question');
  });
});

// ============================================
// FREE ENERGY / ENTROPY TESTS
// ============================================

describe('SelectionCurver - Thermodynamic State', () => {
  it('stable equilibrium (F<0) allows deeper', () => {
    const selection = createDefaultSelection();
    selection.depth = 'surface';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      F: CURVATURE_THRESHOLDS.F_STABLE - 0.2,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('medium');
    expect(result.curvature_applied.some(c => c.source === 'F')).toBe(true);
  });

  it('unstable (F>1) reduces depth', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      F: CURVATURE_THRESHOLDS.F_UNSTABLE + 0.5,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('medium');
  });

  it('high entropy requires grounding', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      S: CURVATURE_THRESHOLDS.S_DISORDER + 0.5,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.required).toContain('offer_grounding');
  });

  it('moderate entropy allows exploration', () => {
    const selection = createDefaultSelection();
    selection.forbidden = ['explore', 'open_new_material', 'other'];

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      S: CURVATURE_THRESHOLDS.S_EXPLORATION + 0.2,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.forbidden).not.toContain('explore');
    expect(result.selection.forbidden).not.toContain('open_new_material');
    expect(result.selection.forbidden).toContain('other');
  });
});

// ============================================
// TEMPERATURE TESTS
// ============================================

describe('SelectionCurver - Temperature Effects', () => {
  it('critical temperature forces surface + slow', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      T: CURVATURE_THRESHOLDS.T_CRITICAL + 0.1,
    };
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('surface');
    expect(result.selection.pacing).toBe('slow');
    expect(result.selection.required).toContain('validate_feeling');
  });

  it('high temperature slows pacing', () => {
    const selection = createDefaultSelection();
    selection.pacing = 'responsive';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      T: CURVATURE_THRESHOLDS.T_HIGH + 0.1,
    };
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.pacing).toBe('slow');
  });
});

// ============================================
// REGULATORY VARIABLE TESTS
// ============================================

describe('SelectionCurver - Regulatory Variables', () => {
  it('low epsilon reduces depth', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      epsilon: CURVATURE_THRESHOLDS.EPSILON_LOW - 0.1,
    };
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('medium');
    expect(result.curvature_applied.some(c => c.source === 'epsilon')).toBe(true);
  });

  it('critical epsilon forces surface', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      epsilon: CURVATURE_THRESHOLDS.EPSILON_CRITICAL - 0.1,
    };
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('surface');
  });

  it('high gamma reduces length', () => {
    const selection = createDefaultSelection();
    selection.length = 'moderate';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      gamma: CURVATURE_THRESHOLDS.GAMMA_HIGH + 0.1,
    };
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.length).toBe('brief');
  });

  it('critical gamma forces minimal length', () => {
    const selection = createDefaultSelection();
    selection.length = 'moderate';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      gamma: CURVATURE_THRESHOLDS.GAMMA_CRITICAL + 0.1,
    };
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.length).toBe('minimal');
    expect(result.selection.forbidden).toContain('long_response');
    expect(result.selection.forbidden).toContain('multiple_questions');
  });
});

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('SelectionCurver - Helper Functions', () => {
  it('getCurvatureSeverity returns 0 for stable', () => {
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    const severity = getCurvatureSeverity(manifold, diagnostics);

    expect(severity).toBe(0);
  });

  it('getCurvatureSeverity returns high for EMERGENCY', () => {
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EMERGENCY',
    };

    const severity = getCurvatureSeverity(manifold, diagnostics);

    expect(severity).toBe(1.0);
  });

  it('getCurvatureSeverity accumulates multiple factors', () => {
    const manifold: ManifoldState = {
      ...createStableManifold(),
      T: CURVATURE_THRESHOLDS.T_CRITICAL + 0.1,
      epsilon: CURVATURE_THRESHOLDS.EPSILON_CRITICAL - 0.1,
    };
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EXISTENTIAL',
      d_identity: CURVATURE_THRESHOLDS.D_IDENTITY_CRITICAL - 0.05,
    };

    const severity = getCurvatureSeverity(manifold, diagnostics);

    expect(severity).toBeGreaterThan(0.7);
    expect(severity).toBeLessThanOrEqual(1.0);
  });

  it('manifoldRequiresCurvature returns false for stable', () => {
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    expect(manifoldRequiresCurvature(manifold, diagnostics)).toBe(false);
  });

  it('manifoldRequiresCurvature returns true for non-stable regime', () => {
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'CRITICAL',
    };

    expect(manifoldRequiresCurvature(manifold, diagnostics)).toBe(true);
  });
});

// ============================================
// PHYSICS REASONING TESTS
// ============================================

describe('SelectionCurver - Physics Reasoning', () => {
  it('includes regime in reasoning', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.physics_reasoning).toContain('Regime: STABLE');
  });

  it('includes thermodynamic state in reasoning', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.physics_reasoning).toContain('T=');
    expect(result.physics_reasoning).toContain('U=');
    expect(result.physics_reasoning).toContain('F=');
    expect(result.physics_reasoning).toContain('S=');
  });

  it('includes regulatory state in reasoning', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.physics_reasoning).toContain('epsilon=');
    expect(result.physics_reasoning).toContain('gamma=');
    expect(result.physics_reasoning).toContain('delta=');
  });

  it('includes curvature summary when applied', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EXISTENTIAL',
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.physics_reasoning).toContain('Curvature:');
    expect(result.physics_reasoning).not.toContain('No curvature applied');
  });

  it('says no curvature when stable', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics = createStableDiagnostics();

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.physics_reasoning).toContain('No curvature applied (field stable)');
  });
});

// ============================================
// COMPOUND SCENARIO TESTS
// ============================================

describe('SelectionCurver - Compound Scenarios', () => {
  it('EMERGENCY + high U + low epsilon: maximum restriction', () => {
    const selection = createDefaultSelection();
    selection.depth = 'deep';

    const manifold: ManifoldState = {
      ...createStableManifold(),
      epsilon: 0.1,
    };
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EMERGENCY',
      U_total: 5.0,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('surface');
    expect(result.selection.atmosphere).toBe('EMERGENCY');
    expect(result.selection.length).toBe('minimal');
    expect(result.curvature_applied.length).toBeGreaterThan(1);
  });

  it('EXISTENTIAL + near Rubicon: V_MODE + maximum protection', () => {
    const selection = createDefaultSelection();
    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EXISTENTIAL',
      d_identity: 0.08,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.atmosphere).toBe('V_MODE');
    expect(result.selection.forbidden).toContain('any_prescription');
    expect(result.selection.forbidden).toContain('meaning_assignment');
    expect(result.selection.required).toContain('return_ownership');
    expect(result.selection.required).toContain('end_with_question');
  });

  it('stable + negative F: can deepen from surface', () => {
    const selection = createDefaultSelection();
    selection.depth = 'surface';

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'STABLE',
      F: -1.0,
      U_total: 0.5,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.depth).toBe('medium');
  });

  it('preserves existing forbidden/required', () => {
    const selection = createDefaultSelection();
    selection.forbidden = ['existing_forbidden'];
    selection.required = ['existing_required'];

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EXISTENTIAL',
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    expect(result.selection.forbidden).toContain('existing_forbidden');
    expect(result.selection.required).toContain('existing_required');
    expect(result.selection.forbidden).toContain('prescribe');
    expect(result.selection.required).toContain('return_ownership');
  });

  it('no duplicate entries in forbidden/required', () => {
    const selection = createDefaultSelection();
    selection.forbidden = ['prescribe'];
    selection.required = ['return_ownership'];

    const manifold = createStableManifold();
    const diagnostics: FieldDiagnostics = {
      ...createStableDiagnostics(),
      regime: 'EXISTENTIAL',
      d_identity: 0.08,
    };

    const result = curveSelectionWithManifold(selection, manifold, diagnostics);

    const prescribeCount = result.selection.forbidden.filter(f => f === 'prescribe').length;
    const returnCount = result.selection.required.filter(r => r === 'return_ownership').length;

    expect(prescribeCount).toBe(1);
    expect(returnCount).toBe(1);
  });
});
