/**
 * GENESIS: FIELD INTEGRATION
 *
 * Bridge between Genesis Field physics and L1 Pipeline.
 *
 * This module connects:
 * - ProtocolSelection (pipeline language) ↔ Trajectory (field language)
 * - FieldState (pipeline) ↔ SystemState (genesis)
 *
 * The field doesn't override the pipeline.
 * The field CURVES the pipeline's selections toward constitutional attractors.
 *
 * Scientific basis:
 * - Dynamical Systems Theory (Kelso 1995)
 * - Attractor dynamics in neural systems (Freeman 1999)
 * - Energy-based models (LeCun 2006)
 */

import { ProtocolSelection, FieldState as PipelineFieldState, Depth, Primitive } from '../../interface/types';
import { Trajectory } from '../../research/genesis/attractor';
import { SystemState } from '../../research/genesis/energy';
import { field, FieldResponse } from '../../research/genesis/field';

// ============================================
// TYPE MAPPINGS
// ============================================

/**
 * Convert Pipeline FieldState → Genesis SystemState
 */
export function toSystemState(pipelineState: PipelineFieldState): SystemState {
  // Map domain from pipeline format (H01_SURVIVAL) to genesis format (D1_CRISIS)
  const domainMap: Record<string, string> = {
    'H01_SURVIVAL': 'D1_CRISIS',
    'H02_SAFETY': 'D1_CRISIS',
    'H03_RESOURCES': 'D5_KNOWLEDGE',
    'H04_EMOTION': 'D2_EMOTION',
    'H05_COGNITION': 'D5_KNOWLEDGE',
    'H06_MEANING': 'D4_IDENTITY',
    'H07_IDENTITY': 'D4_IDENTITY',
    'H08_AUTONOMY': 'D3_DECISION',
    'H09_ATTACHMENT': 'D2_EMOTION',
    'H10_COORDINATION': 'D7_RELATIONAL',
    'H11_BELONGING': 'D7_RELATIONAL',
    'H12_CONTRIBUTION': 'D6_CREATIVITY',
    'H13_CREATION': 'D6_CREATIVITY',
    'H14_PLAY': 'D6_CREATIVITY',
    'H15_LEARNING': 'D5_KNOWLEDGE',
    'H16_GROWTH': 'D4_IDENTITY',
    'H17_TRANSCENDENCE': 'D4_IDENTITY'
  };

  const topDomain = pipelineState.domains[0]?.domain || 'H05_COGNITION';
  const genesisDomain = domainMap[topDomain as string] || 'D0_GENERAL';

  // Map valence/arousal to dimension
  let dimension = 'V3_COGNITIVE';
  if (pipelineState.arousal === 'high' || pipelineState.arousal === 'low') {
    dimension = 'V2_EMOTIONAL';
  }
  // Identity/Meaning domains → Transcendent dimension
  if (topDomain === 'H07_IDENTITY' || topDomain === 'H06_MEANING') {
    dimension = 'V5_TRANSCENDENT';
  }
  // Relational domains
  if (topDomain === 'H09_ATTACHMENT' || topDomain === 'H10_COORDINATION' || topDomain === 'H11_BELONGING') {
    dimension = 'V4_RELATIONAL';
  }

  // V_MODE detection
  const vMode = pipelineState.flags.includes('delegation_attempt') ||
                topDomain === 'H07_IDENTITY' ||
                topDomain === 'H06_MEANING';

  return {
    domain: genesisDomain,
    dimension,
    potency: 1.0,  // Will be updated by dissipation over session
    withdrawal_bias: 0,  // Will be updated by dissipation
    v_mode: vMode,
    cycle_count: pipelineState.loop_count || 0
  };
}

/**
 * Convert ProtocolSelection → Trajectory
 * Maps pipeline selections to field-space coordinates
 */
export function toTrajectory(selection: ProtocolSelection): Trajectory {
  // Map depth to intervention_depth
  const depthMap: Record<Depth, number> = {
    'surface': 0.2,
    'medium': 0.5,
    'deep': 0.8
  };

  // Map primitives to prescriptiveness
  // These primitives have higher prescriptive potential
  const prescriptivePrimitives: Primitive[] = [
    'P05_CRYSTALLIZE', 'P09_INFORM', 'P10_COMPLETE_TASK'
  ];
  const isPrescriptive = prescriptivePrimitives.includes(selection.primitive);

  // Map atmosphere to presence
  const presenceMap: Record<string, number> = {
    'EMERGENCY': 0.9,
    'V_MODE': 0.6,
    'HUMAN_FIELD': 0.5,
    'DECISION': 0.4,
    'OPERATIONAL': 0.3
  };

  return {
    intervention_depth: depthMap[selection.depth] || 0.5,
    prescriptiveness: isPrescriptive ? 0.3 : 0,
    identity_touching: 0,  // Never touch identity
    dependency_creation: 0,  // Never create dependency
    presence: presenceMap[selection.atmosphere] || 0.5,
    transparency: 1  // Always transparent
  };
}

/**
 * Apply field curvature to ProtocolSelection
 * Returns modified selection + field response
 */
export function curveSelection(
  selection: ProtocolSelection,
  pipelineState: PipelineFieldState
): { selection: ProtocolSelection; fieldResponse: FieldResponse } {
  // Convert to field-space
  const systemState = toSystemState(pipelineState);
  const trajectory = toTrajectory(selection);

  // Get field response
  const fieldResponse = field.curve(trajectory, systemState);

  // Apply field curvature to selection
  const curvedSelection = { ...selection };

  // If field suggests withdrawal, reduce depth
  if (fieldResponse.suggests_withdrawal) {
    curvedSelection.depth = 'surface';
    curvedSelection.forbidden = [...curvedSelection.forbidden, 'deep_engagement', 'long_response'];
  }

  // If field curved toward less intervention, adjust depth
  if (fieldResponse.natural_trajectory.intervention_depth < trajectory.intervention_depth - 0.2) {
    if (selection.depth === 'deep') curvedSelection.depth = 'medium';
    if (selection.depth === 'medium') curvedSelection.depth = 'surface';
  }

  // If field detected instability, add constraints
  if (fieldResponse.stability === 'UNSTABLE' || fieldResponse.stability === 'CRITICAL') {
    curvedSelection.forbidden = [
      ...curvedSelection.forbidden,
      'prescribe',
      'recommend',
      'advise'
    ];
    curvedSelection.required = [
      ...curvedSelection.required,
      'acknowledge_only'
    ];
  }

  // If field is in collapse, force minimal response
  if (fieldResponse.stability === 'COLLAPSE') {
    curvedSelection.depth = 'surface';
    curvedSelection.length = 'minimal';
    curvedSelection.primitive = 'P02_VALIDATE';  // Just validate, nothing more
    curvedSelection.forbidden = [
      ...curvedSelection.forbidden,
      'any_prescription',
      'any_recommendation',
      'any_intervention'
    ];
  }

  // Add field explanation to reasoning
  if (fieldResponse.curvature_explanation.length > 0) {
    curvedSelection.reasoning = `${selection.reasoning} | Field: ${fieldResponse.curvature_explanation.join('; ')}`;
  }

  return { selection: curvedSelection, fieldResponse };
}

// ============================================
// FIELD STATE FOR PIPELINE TRACE
// ============================================

export interface FieldTraceInfo {
  stability: string;
  energy: number;
  suggests_withdrawal: boolean;
  curvature_explanation: string[];
  attractors_active: string[];
}

export function getFieldTraceInfo(fieldResponse: FieldResponse): FieldTraceInfo {
  return {
    stability: fieldResponse.stability,
    energy: fieldResponse.energy.total,
    suggests_withdrawal: fieldResponse.suggests_withdrawal,
    curvature_explanation: fieldResponse.curvature_explanation,
    attractors_active: fieldResponse.field_state.attractors.map(a => a.id)
  };
}

// ============================================
// EXPORTS
// ============================================

export { field };
