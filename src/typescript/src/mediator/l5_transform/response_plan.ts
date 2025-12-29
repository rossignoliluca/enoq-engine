/**
 * LIMEN Response Plan - Builder Functions
 *
 * ResponsePlan types are defined in interface/types.ts.
 * This module provides builder functions for creating plans.
 */

import {
  SupportedLanguage,
  RiskFlags,
  ResponsePlan,
  SpeechActType,
  PlanValidationResult,
} from '../../interface/types';

// Re-export all types from interface for backwards compatibility
export type {
  SpeechActType,
  SpeechAct,
  WarmthLevel,
  BrevityLevel,
  PronounStyle,
  PlanConstraints,
  PlanMetadata,
  ResponsePlan,
  CandidateSet,
  ReasonCode,
  DecisionEvent,
  PlanObservability,
  PlanValidationResult,
  RiskFlags,
  ADSScore,
  MotiveDistribution,
} from '../../interface/types';

// ============================================
// PLAN BUILDER FUNCTIONS
// ============================================

/**
 * Create a default (safe) ResponsePlan.
 * Used as fallback when nothing else works.
 */
export function createDefaultPlan(language: SupportedLanguage = 'en'): ResponsePlan {
  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    acts: [
      { type: 'acknowledge', force: 0.3 },
      { type: 'hold', force: 0.5 }
    ],
    constraints: {
      max_length: 50,
      warmth: 'neutral',
      brevity: 'minimal',
      pronouns: 'i_you',
      tools_allowed: false,
      must_require_user_effort: false,
      forbidden: [],
      required: [],
      language
    },
    metadata: {
      risk: {
        crisis: false,
        emergency: false,
        v_mode: false,
        enchantment: false,
        loop_detected: false,
        boundary_approach: false
      },
      potency: 1.0,
      withdrawal_bias: 0.0,
      turn: 0,
      timestamp: Date.now()
    },
    confidence: 0.5,
    reasoning: 'Default safe plan',
    source: 'fallback'
  };
}

/**
 * Create an emergency plan (ground + hold).
 */
export function createEmergencyPlan(language: SupportedLanguage = 'en'): ResponsePlan {
  return {
    id: `emergency_${Date.now()}`,
    acts: [
      { type: 'ground', force: 0.9 },
      { type: 'hold', force: 0.8 }
    ],
    constraints: {
      max_length: 30,
      warmth: 'warm',
      brevity: 'minimal',
      pronouns: 'i_you',
      tools_allowed: false,
      must_require_user_effort: false,
      forbidden: ['recommend', 'advise', 'analyze', 'explore'],
      required: ['ground', 'presence'],
      language
    },
    metadata: {
      risk: {
        crisis: true,
        emergency: true,
        v_mode: false,
        enchantment: false,
        loop_detected: false,
        boundary_approach: false
      },
      potency: 1.0,
      withdrawal_bias: 0.0,
      turn: 0,
      timestamp: Date.now()
    },
    confidence: 0.95,
    reasoning: 'Emergency detected - ground and hold',
    source: 'fallback'
  };
}

/**
 * Create a V_MODE plan (return agency).
 */
export function createVModePlan(language: SupportedLanguage = 'en'): ResponsePlan {
  return {
    id: `vmode_${Date.now()}`,
    acts: [
      { type: 'acknowledge', force: 0.4 },
      { type: 'boundary', force: 0.6 },
      { type: 'return_agency', force: 0.8 }
    ],
    constraints: {
      max_length: 80,
      warmth: 'warm',
      brevity: 'brief',
      pronouns: 'i_you',
      tools_allowed: false,
      must_require_user_effort: true,
      forbidden: ['recommend', 'advise', 'decide_for_user', 'prescribe', 'define_identity'],
      required: ['return_ownership'],
      language
    },
    metadata: {
      risk: {
        crisis: false,
        emergency: false,
        v_mode: true,
        enchantment: false,
        loop_detected: false,
        boundary_approach: true
      },
      potency: 0.8,
      withdrawal_bias: 0.2,
      turn: 0,
      timestamp: Date.now()
    },
    confidence: 0.9,
    reasoning: 'V_MODE - meaning/identity boundary, return agency',
    source: 'selection'
  };
}

// ============================================
// PLAN VALIDATION
// ============================================

const FORBIDDEN_ACT_TARGET_COMBOS: Array<{act: SpeechActType, target_pattern: RegExp}> = [
  { act: 'offer_frame', target_pattern: /identity|meaning|purpose|who you are/i },
  { act: 'experiment', target_pattern: /life decision|should you|quit|divorce|move/i },
];

/**
 * Validate a ResponsePlan before rendering.
 */
export function validatePlan(plan: ResponsePlan): PlanValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  if (plan.metadata.potency <= 0.1 && plan.acts.length > 2) {
    warnings.push('Low potency but multiple acts - consider reducing');
  }

  if (plan.metadata.risk.v_mode) {
    const hasReturnAgency = plan.acts.some(a => a.type === 'return_agency');
    if (!hasReturnAgency) {
      violations.push('V_MODE requires return_agency act');
    }
  }

  if (plan.metadata.risk.emergency) {
    const hasGround = plan.acts.some(a => a.type === 'ground');
    if (!hasGround) {
      violations.push('Emergency requires ground act');
    }
  }

  for (const act of plan.acts) {
    if (act.target) {
      for (const combo of FORBIDDEN_ACT_TARGET_COMBOS) {
        if (act.type === combo.act && combo.target_pattern.test(act.target)) {
          violations.push(`Forbidden: ${act.type} on ${act.target}`);
        }
      }
    }
  }

  if (plan.constraints.must_require_user_effort) {
    const passiveActs = plan.acts.filter(a =>
      a.type === 'hold' || a.type === 'acknowledge'
    );
    if (passiveActs.length === plan.acts.length) {
      warnings.push('must_require_user_effort=true but only passive acts');
    }
  }

  if (plan.constraints.max_length < 10) {
    warnings.push('max_length < 10 may be too restrictive');
  }
  if (plan.constraints.max_length > 500) {
    warnings.push('max_length > 500 may violate brevity principle');
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings
  };
}
