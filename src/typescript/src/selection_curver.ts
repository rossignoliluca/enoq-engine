/**
 * SELECTION CURVER
 *
 * Closes the feedback loop: Stochastic Field → Selection
 *
 * The stochastic field evolves according to Langevin dynamics on a
 * configuration manifold M = P(Omega) × R^+ × [0,1]^3. The field computes
 * thermodynamic quantities (T, U, F, S) and regulatory variables (epsilon, gamma, delta).
 *
 * This module translates those quantities into selection constraints:
 * - High potential U → Reduce depth (surface only, don't push against barrier)
 * - Low d_identity → Activate V_MODE (approaching Rubicon)
 * - High entropy S → Allow exploration (system in disorder)
 * - Negative free energy F → Stable, can deepen
 * - High dissipation gamma → Reduce power (energy dissipating)
 * - Low epsilon → Reduce intervention capacity
 *
 * The mapping preserves the physics metaphor:
 * - Selection is a "force" applied to the human system
 * - The field determines what forces are appropriate given system state
 * - Boundaries (reflecting/absorbing) constrain allowed selections
 *
 * Reference: ENOQ v2.5 Stochastic Field Theory
 */

import { ProtocolSelection, Atmosphere, Depth } from './types';
import { ManifoldState, FieldDiagnostics } from './stochastic_field';

// ============================================
// CURVATURE THRESHOLDS
// ============================================

/**
 * Thermodynamic thresholds for selection curvature
 *
 * These values are calibrated to match constitutional constraints:
 * - U_HIGH_THRESHOLD: Potential barrier where pushing is dangerous
 * - D_IDENTITY_CRITICAL: Rubicon proximity requiring V_MODE
 * - S_EXPLORATION_THRESHOLD: Entropy level indicating need for structure
 * - F_STABLE_THRESHOLD: Free energy indicating stable equilibrium
 * - GAMMA_HIGH_THRESHOLD: Dissipation indicating energy drain
 * - EPSILON_LOW_THRESHOLD: Low intervention capacity
 */
export const CURVATURE_THRESHOLDS = {
  U_HIGH: 2.0,           // High potential barrier
  U_CRITICAL: 4.0,       // Critical potential (must surface)
  D_IDENTITY_CRITICAL: 0.2,  // Near Rubicon
  D_IDENTITY_BOUNDARY: 0.1,  // At Rubicon (V_MODE mandatory)
  S_EXPLORATION: 1.5,    // High entropy
  S_DISORDER: 2.0,       // Disorder requiring grounding
  F_STABLE: -0.5,        // Stable equilibrium
  F_UNSTABLE: 1.0,       // Unstable (reduce depth)
  GAMMA_HIGH: 0.3,       // High dissipation
  GAMMA_CRITICAL: 0.5,   // Critical dissipation
  EPSILON_LOW: 0.5,      // Low intervention capacity
  EPSILON_CRITICAL: 0.3, // Critical intervention capacity
  T_HIGH: 0.7,           // High temperature (arousal)
  T_CRITICAL: 0.9,       // Critical temperature
};

// ============================================
// CURVATURE RESULT
// ============================================

export interface CurvatureResult {
  selection: ProtocolSelection;
  curvature_applied: CurvatureEntry[];
  physics_reasoning: string;
}

export interface CurvatureEntry {
  source: 'U_total' | 'F' | 'S' | 'd_identity' | 'epsilon' | 'gamma' | 'T' | 'regime';
  value: number;
  threshold: number;
  action: string;
}

// ============================================
// MAIN CURVING FUNCTION
// ============================================

/**
 * Curve selection using stochastic field state
 *
 * The manifold state and diagnostics determine how selection is modified:
 * 1. Regime overrides: EMERGENCY → surface, EXISTENTIAL → V_MODE
 * 2. Potential barriers: High U → reduce depth
 * 3. Identity boundary: Low d_I → V_MODE, forbidden patterns
 * 4. Thermodynamic state: T, F, S → depth/exploration modulation
 * 5. Regulatory variables: epsilon, gamma, delta → power modulation
 *
 * @param selection - Base selection from S3_SELECT
 * @param manifold - Current manifold state
 * @param diagnostics - Field diagnostics
 * @returns Curved selection with physics reasoning
 */
export function curveSelectionWithManifold(
  selection: ProtocolSelection,
  manifold: ManifoldState,
  diagnostics: FieldDiagnostics
): CurvatureResult {
  // Clone selection to avoid mutation
  const curved: ProtocolSelection = {
    ...selection,
    forbidden: [...selection.forbidden],
    required: [...selection.required],
  };

  const curvature: CurvatureEntry[] = [];
  const depthOrder: Depth[] = ['surface', 'medium', 'deep'];

  // ==========================================
  // 1. REGIME OVERRIDES (highest priority)
  // ==========================================

  if (diagnostics.regime === 'EMERGENCY') {
    // Absorbing boundary hit - force grounding
    curved.depth = 'surface';
    curved.atmosphere = 'EMERGENCY';
    curved.primitive = 'P01_GROUND';
    curved.length = 'minimal';
    curved.pacing = 'slow';
    curved.required = [...new Set([...curved.required, 'acknowledge_distress', 'offer_grounding'])];

    curvature.push({
      source: 'regime',
      value: 1.0,
      threshold: 0,
      action: 'EMERGENCY regime: forced surface + grounding',
    });
  }

  if (diagnostics.regime === 'EXISTENTIAL') {
    // Near identity boundary - activate V_MODE
    if (curved.atmosphere !== 'EMERGENCY') {
      curved.atmosphere = 'V_MODE';
    }
    curved.forbidden = [...new Set([
      ...curved.forbidden,
      'prescribe',
      'recommend',
      'advise',
      'decide_for_user',
    ])];
    curved.required = [...new Set([...curved.required, 'return_ownership'])];

    curvature.push({
      source: 'regime',
      value: 0.8,
      threshold: 0,
      action: 'EXISTENTIAL regime: V_MODE + ownership return',
    });
  }

  if (diagnostics.regime === 'CRITICAL') {
    // Approaching boundary - reduce depth
    const currentIdx = depthOrder.indexOf(curved.depth);
    if (currentIdx > 0) {
      curved.depth = depthOrder[currentIdx - 1];
      curvature.push({
        source: 'regime',
        value: 0.6,
        threshold: 0,
        action: `CRITICAL regime: reduced depth to ${curved.depth}`,
      });
    }
  }

  // ==========================================
  // 2. POTENTIAL ENERGY BARRIERS
  // ==========================================

  if (diagnostics.U_total > CURVATURE_THRESHOLDS.U_CRITICAL) {
    // Very high potential - force surface
    curved.depth = 'surface';
    curvature.push({
      source: 'U_total',
      value: diagnostics.U_total,
      threshold: CURVATURE_THRESHOLDS.U_CRITICAL,
      action: 'Critical potential barrier: forced surface depth',
    });
  } else if (diagnostics.U_total > CURVATURE_THRESHOLDS.U_HIGH) {
    // High potential - reduce depth by one
    const currentIdx = depthOrder.indexOf(curved.depth);
    if (currentIdx > 0) {
      curved.depth = depthOrder[currentIdx - 1];
      curvature.push({
        source: 'U_total',
        value: diagnostics.U_total,
        threshold: CURVATURE_THRESHOLDS.U_HIGH,
        action: `High potential barrier: reduced depth to ${curved.depth}`,
      });
    }
  }

  // ==========================================
  // 3. IDENTITY BOUNDARY (Rubicon)
  // ==========================================

  if (diagnostics.d_identity < CURVATURE_THRESHOLDS.D_IDENTITY_BOUNDARY) {
    // At Rubicon - mandatory V_MODE, maximum restriction
    if (curved.atmosphere !== 'EMERGENCY') {
      curved.atmosphere = 'V_MODE';
    }
    curved.forbidden = [...new Set([
      ...curved.forbidden,
      'any_prescription',
      'meaning_assignment',
      'identity_labeling',
      'value_prescription',
      'purpose_suggestion',
    ])];
    curved.required = [...new Set([
      ...curved.required,
      'return_ownership',
      'end_with_question',
    ])];

    curvature.push({
      source: 'd_identity',
      value: diagnostics.d_identity,
      threshold: CURVATURE_THRESHOLDS.D_IDENTITY_BOUNDARY,
      action: 'At Rubicon: mandatory V_MODE + maximum restriction',
    });
  } else if (diagnostics.d_identity < CURVATURE_THRESHOLDS.D_IDENTITY_CRITICAL) {
    // Near Rubicon - V_MODE recommended
    if (curved.atmosphere !== 'EMERGENCY' && curved.atmosphere !== 'V_MODE') {
      curved.atmosphere = 'V_MODE';
      curvature.push({
        source: 'd_identity',
        value: diagnostics.d_identity,
        threshold: CURVATURE_THRESHOLDS.D_IDENTITY_CRITICAL,
        action: 'Near Rubicon: V_MODE activated',
      });
    }
  }

  // ==========================================
  // 4. FREE ENERGY / ENTROPY DYNAMICS
  // ==========================================

  // Negative free energy = stable equilibrium → can go deeper
  if (diagnostics.F < CURVATURE_THRESHOLDS.F_STABLE &&
      curved.depth === 'surface' &&
      curved.atmosphere !== 'EMERGENCY') {
    curved.depth = 'medium';
    curvature.push({
      source: 'F',
      value: diagnostics.F,
      threshold: CURVATURE_THRESHOLDS.F_STABLE,
      action: 'Stable equilibrium (F<0): allowed medium depth',
    });
  }

  // Positive free energy = unstable → reduce depth
  if (diagnostics.F > CURVATURE_THRESHOLDS.F_UNSTABLE) {
    const currentIdx = depthOrder.indexOf(curved.depth);
    if (currentIdx > 0) {
      curved.depth = depthOrder[currentIdx - 1];
      curvature.push({
        source: 'F',
        value: diagnostics.F,
        threshold: CURVATURE_THRESHOLDS.F_UNSTABLE,
        action: `Unstable (F>1): reduced depth to ${curved.depth}`,
      });
    }
  }

  // High entropy = disorder → needs structure, but allow exploration
  if (diagnostics.S > CURVATURE_THRESHOLDS.S_DISORDER) {
    // Very high entropy - needs grounding before exploration
    curved.required = [...new Set([...curved.required, 'offer_grounding'])];
    curvature.push({
      source: 'S',
      value: diagnostics.S,
      threshold: CURVATURE_THRESHOLDS.S_DISORDER,
      action: 'High disorder: requires grounding',
    });
  } else if (diagnostics.S > CURVATURE_THRESHOLDS.S_EXPLORATION) {
    // Moderate entropy - allow exploration, remove exploration forbidden
    curved.forbidden = curved.forbidden.filter(f => f !== 'explore' && f !== 'open_new_material');
    curvature.push({
      source: 'S',
      value: diagnostics.S,
      threshold: CURVATURE_THRESHOLDS.S_EXPLORATION,
      action: 'Moderate entropy: exploration allowed',
    });
  }

  // ==========================================
  // 5. TEMPERATURE EFFECTS
  // ==========================================

  if (manifold.T > CURVATURE_THRESHOLDS.T_CRITICAL) {
    // Critical temperature - force surface, add calming
    curved.depth = 'surface';
    curved.pacing = 'slow';
    curved.required = [...new Set([...curved.required, 'validate_feeling'])];
    curvature.push({
      source: 'T',
      value: manifold.T,
      threshold: CURVATURE_THRESHOLDS.T_CRITICAL,
      action: 'Critical temperature: surface + slow pacing',
    });
  } else if (manifold.T > CURVATURE_THRESHOLDS.T_HIGH) {
    // High temperature - prefer slow pacing
    curved.pacing = 'slow';
    curvature.push({
      source: 'T',
      value: manifold.T,
      threshold: CURVATURE_THRESHOLDS.T_HIGH,
      action: 'High temperature: slow pacing',
    });
  }

  // ==========================================
  // 6. REGULATORY VARIABLES
  // ==========================================

  // Low epsilon (intervention capacity) → reduce depth
  if (manifold.epsilon < CURVATURE_THRESHOLDS.EPSILON_CRITICAL) {
    curved.depth = 'surface';
    curvature.push({
      source: 'epsilon',
      value: manifold.epsilon,
      threshold: CURVATURE_THRESHOLDS.EPSILON_CRITICAL,
      action: 'Critical epsilon: forced surface (low intervention capacity)',
    });
  } else if (manifold.epsilon < CURVATURE_THRESHOLDS.EPSILON_LOW) {
    const currentIdx = depthOrder.indexOf(curved.depth);
    if (currentIdx > 0) {
      curved.depth = depthOrder[currentIdx - 1];
      curvature.push({
        source: 'epsilon',
        value: manifold.epsilon,
        threshold: CURVATURE_THRESHOLDS.EPSILON_LOW,
        action: `Low epsilon: reduced depth to ${curved.depth}`,
      });
    }
  }

  // High gamma (dissipation) → reduce intervention power
  if (manifold.gamma > CURVATURE_THRESHOLDS.GAMMA_CRITICAL) {
    curved.length = 'minimal';
    curved.forbidden = [...new Set([...curved.forbidden, 'long_response', 'multiple_questions'])];
    curvature.push({
      source: 'gamma',
      value: manifold.gamma,
      threshold: CURVATURE_THRESHOLDS.GAMMA_CRITICAL,
      action: 'Critical gamma: minimal length (high dissipation)',
    });
  } else if (manifold.gamma > CURVATURE_THRESHOLDS.GAMMA_HIGH) {
    if (curved.length === 'moderate') {
      curved.length = 'brief';
    }
    curvature.push({
      source: 'gamma',
      value: manifold.gamma,
      threshold: CURVATURE_THRESHOLDS.GAMMA_HIGH,
      action: 'High gamma: reduced length',
    });
  }

  // ==========================================
  // BUILD PHYSICS REASONING
  // ==========================================

  const physicsReasoning = buildPhysicsReasoning(manifold, diagnostics, curvature);

  return {
    selection: curved,
    curvature_applied: curvature,
    physics_reasoning: physicsReasoning,
  };
}

// ============================================
// PHYSICS REASONING BUILDER
// ============================================

function buildPhysicsReasoning(
  manifold: ManifoldState,
  diagnostics: FieldDiagnostics,
  curvature: CurvatureEntry[]
): string {
  const parts: string[] = [];

  // Regime description
  parts.push(`Regime: ${diagnostics.regime}`);

  // Thermodynamic state
  parts.push(`T=${manifold.T.toFixed(3)}, U=${diagnostics.U_total.toFixed(2)}, F=${diagnostics.F.toFixed(2)}, S=${diagnostics.S.toFixed(3)}`);

  // Regulatory state
  parts.push(`epsilon=${manifold.epsilon.toFixed(3)}, gamma=${manifold.gamma.toFixed(3)}, delta=${manifold.delta.toFixed(3)}`);

  // Boundary distances
  parts.push(`d_I=${diagnostics.d_identity.toFixed(3)}`);

  // Curvature summary
  if (curvature.length === 0) {
    parts.push('No curvature applied (field stable)');
  } else {
    parts.push(`Curvature: ${curvature.map(c => c.action).join('; ')}`);
  }

  return parts.join(' | ');
}

// ============================================
// DIAGNOSTIC HELPERS
// ============================================

/**
 * Quick check if manifold state requires intervention
 *
 * Returns true if any curvature would be applied.
 * Useful for early-exit optimization.
 */
export function manifoldRequiresCurvature(
  manifold: ManifoldState,
  diagnostics: FieldDiagnostics
): boolean {
  return (
    diagnostics.regime !== 'STABLE' ||
    diagnostics.U_total > CURVATURE_THRESHOLDS.U_HIGH ||
    diagnostics.d_identity < CURVATURE_THRESHOLDS.D_IDENTITY_CRITICAL ||
    diagnostics.F > CURVATURE_THRESHOLDS.F_UNSTABLE ||
    diagnostics.S > CURVATURE_THRESHOLDS.S_EXPLORATION ||
    manifold.T > CURVATURE_THRESHOLDS.T_HIGH ||
    manifold.epsilon < CURVATURE_THRESHOLDS.EPSILON_LOW ||
    manifold.gamma > CURVATURE_THRESHOLDS.GAMMA_HIGH
  );
}

/**
 * Get curvature severity level (0-1)
 *
 * Higher values indicate stronger field curvature being applied.
 * Useful for logging/tracing.
 */
export function getCurvatureSeverity(
  manifold: ManifoldState,
  diagnostics: FieldDiagnostics
): number {
  let severity = 0;

  // Regime contribution
  switch (diagnostics.regime) {
    case 'EMERGENCY': severity += 1.0; break;
    case 'EXISTENTIAL': severity += 0.7; break;
    case 'CRITICAL': severity += 0.4; break;
    case 'STABLE': break;
  }

  // Potential contribution
  if (diagnostics.U_total > CURVATURE_THRESHOLDS.U_CRITICAL) {
    severity += 0.5;
  } else if (diagnostics.U_total > CURVATURE_THRESHOLDS.U_HIGH) {
    severity += 0.3;
  }

  // Identity boundary contribution
  if (diagnostics.d_identity < CURVATURE_THRESHOLDS.D_IDENTITY_BOUNDARY) {
    severity += 0.5;
  } else if (diagnostics.d_identity < CURVATURE_THRESHOLDS.D_IDENTITY_CRITICAL) {
    severity += 0.3;
  }

  // Temperature contribution
  if (manifold.T > CURVATURE_THRESHOLDS.T_CRITICAL) {
    severity += 0.3;
  }

  // Regulatory contribution
  if (manifold.epsilon < CURVATURE_THRESHOLDS.EPSILON_CRITICAL) {
    severity += 0.2;
  }
  if (manifold.gamma > CURVATURE_THRESHOLDS.GAMMA_CRITICAL) {
    severity += 0.2;
  }

  return Math.min(1.0, severity);
}

// ============================================
// EXPORTS
// ============================================

export default curveSelectionWithManifold;
