/**
 * LIMEN Plan Act Verifier
 *
 * Constitutional enforcement on ResponsePlan BEFORE rendering.
 * Position: Between S3b (commit) and S4 (render).
 *
 * Key principle: Verifier can only RESTRICT and SUBSTITUTE.
 * It cannot add conceptual content or change domain/intent.
 *
 * Fix strategies (safe):
 * 1. Constraint-tightening: reduce max_length, lower directiveness, etc.
 * 2. Act substitution: replace forbidden acts with allowed alternatives
 *
 * If neither works → fallback to canonical safe plan.
 */

// Types from interface (pure types)
import {
  ResponsePlan,
  SpeechAct,
  SpeechActType,
  PlanConstraints,
  SupportedLanguage,
  ForbiddenAction,
} from '../../interface/types';

// Builder functions from mediator (factory functions for fallback plans)
import {
  createDefaultPlan,
  createEmergencyPlan,
  createVModePlan,
} from '../../mediator/l5_transform/response_plan';

// Signals from operational
import { EarlySignals } from '../../operational/signals/early_signals';

// ============================================
// TYPES
// ============================================

/**
 * A constitutional violation found in the plan.
 */
export interface ConstitutionalViolation {
  rule_id: string;
  rule_name: string;
  severity: 'error' | 'warning';
  description: string;
  location: 'act' | 'constraint' | 'metadata';
  details?: string;
}

/**
 * A fix applied to the plan.
 */
export interface FixRecord {
  violation_rule_id: string;
  fix_type: 'constraint_tighten' | 'act_substitute' | 'act_remove' | 'act_prepend' | 'constraint_set';
  before: string;
  after: string;
}

/**
 * Result of plan verification.
 */
export interface PlanVerification {
  /** Is the plan valid (after fixes)? */
  valid: boolean;

  /** Violations found (before fixes) */
  violations: ConstitutionalViolation[];

  /** Fixes applied */
  fixes_applied: FixRecord[];

  /** Was the plan unfixable? */
  unfixable: boolean;

  /** Final plan (original, fixed, or fallback) */
  final_plan: ResponsePlan;

  /** Was fallback used? */
  fallback_used: boolean;

  /** Verification timestamp */
  verified_at: number;

  /** Time spent verifying (ms) */
  verification_time_ms: number;
}

// ============================================
// FORBIDDEN ACTS BY CONTEXT
// ============================================

/** Acts forbidden in V_MODE (meaning/identity boundary) */
const V_MODE_FORBIDDEN_ACTS: SpeechActType[] = [
  'offer_frame',  // Don't frame their identity
  'experiment',   // Don't suggest experiments with life decisions
];

/** Acts that imply recommendation (never allowed in V_MODE) */
const DIRECTIVE_ACTS: SpeechActType[] = [];  // None - directives are in constraints.forbidden

/** Forbidden constraint values that indicate directives */
const DIRECTIVE_FORBIDDEN_ACTIONS: ForbiddenAction[] = [
  'recommend', 'advise', 'prescribe', 'decide_for_user',
  'advise_action', 'direct', 'define_identity'
];

// ============================================
// CANONICAL FALLBACK PLAN
// ============================================

/**
 * Context for canonical fallback selection.
 */
export interface FallbackContext {
  emergency: boolean;
  v_mode: boolean;
  language: SupportedLanguage;
}

/**
 * Get the canonical fallback plan for a given context.
 *
 * Three templates:
 * 1. EMERGENCY: ground + redirect to human
 * 2. V_MODE: acknowledge + boundary + return_agency
 * 3. NEUTRAL: acknowledge + boundary + question
 *
 * ALL templates are:
 * - Deterministic
 * - Safe in their regime
 * - Minimal
 * - Never directive
 */
export function getCanonicalFallbackPlan(context: FallbackContext): ResponsePlan {
  const base = {
    id: `fallback_${Date.now()}`,
    constraints: {
      max_length: 50,
      warmth: 'neutral' as const,
      brevity: 'minimal' as const,
      pronouns: 'i_you' as const,
      tools_allowed: false,
      must_require_user_effort: true,
      forbidden: [...DIRECTIVE_FORBIDDEN_ACTIONS],
      required: [],
      language: context.language,
    },
    metadata: {
      risk: {
        crisis: context.emergency,
        emergency: context.emergency,
        v_mode: context.v_mode,
        enchantment: false,
        loop_detected: false,
        boundary_approach: context.v_mode,
      },
      potency: 0.5,
      withdrawal_bias: 0.4,
      turn: 0,
      timestamp: Date.now(),
    },
    confidence: 1.0,
    source: 'fallback' as const,
  };

  // Template 1: EMERGENCY
  if (context.emergency) {
    return {
      ...base,
      id: `fallback_emergency_${Date.now()}`,
      acts: [
        { type: 'ground', force: 0.9 },
        { type: 'hold', force: 0.7 },
        { type: 'redirect', force: 0.6 },  // Redirect to human support
      ],
      constraints: {
        ...base.constraints,
        max_length: 30,
        warmth: 'warm',
        must_require_user_effort: false,  // Emergency = help first
      },
      reasoning: 'Emergency fallback: ground + redirect to human support',
    };
  }

  // Template 2: V_MODE
  if (context.v_mode) {
    return {
      ...base,
      id: `fallback_vmode_${Date.now()}`,
      acts: [
        { type: 'acknowledge', force: 0.4 },
        { type: 'boundary', force: 0.6 },
        { type: 'return_agency', force: 0.8 },
      ],
      constraints: {
        ...base.constraints,
        max_length: 60,
      },
      reasoning: 'V_MODE fallback: acknowledge + boundary + return agency',
    };
  }

  // Template 3: NEUTRAL (default)
  return {
    ...base,
    id: `fallback_neutral_${Date.now()}`,
    acts: [
      { type: 'acknowledge', force: 0.3 },
      { type: 'boundary', force: 0.5 },
      { type: 'question', force: 0.6 },
    ],
    reasoning: 'Neutral fallback: acknowledge + boundary + question',
  };
}

// ============================================
// RULEPACK A: EMERGENCY
// ============================================

function checkRulepackEmergency(
  plan: ResponsePlan,
  signals: EarlySignals
): ConstitutionalViolation[] {
  const violations: ConstitutionalViolation[] = [];
  const isEmergency = signals.risk_flags?.emergency || plan.metadata.risk.emergency;

  if (!isEmergency) return violations;

  // Rule A1: First act must be 'ground' or 'hold'
  if (plan.acts.length > 0) {
    const firstAct = plan.acts[0].type;
    if (firstAct !== 'ground' && firstAct !== 'hold') {
      violations.push({
        rule_id: 'A1',
        rule_name: 'Emergency first act',
        severity: 'error',
        description: 'Emergency requires first act to be ground or hold',
        location: 'act',
        details: `First act is ${firstAct}`,
      });
    }
  } else {
    violations.push({
      rule_id: 'A1',
      rule_name: 'Emergency first act',
      severity: 'error',
      description: 'Emergency requires at least one act',
      location: 'act',
    });
  }

  // Rule A2: Forbidden acts in emergency
  for (const forbidden of DIRECTIVE_FORBIDDEN_ACTIONS) {
    if (plan.acts.some(a => a.type === forbidden as SpeechActType)) {
      violations.push({
        rule_id: 'A2',
        rule_name: 'Emergency forbidden acts',
        severity: 'error',
        description: `Emergency forbids ${forbidden}`,
        location: 'act',
      });
    }
  }

  // Rule A3: max_length must be minimal
  if (plan.constraints.max_length > 50) {
    violations.push({
      rule_id: 'A3',
      rule_name: 'Emergency max_length',
      severity: 'warning',
      description: 'Emergency should have max_length <= 50',
      location: 'constraint',
      details: `Current: ${plan.constraints.max_length}`,
    });
  }

  return violations;
}

function fixRulepackEmergency(
  plan: ResponsePlan,
  violations: ConstitutionalViolation[]
): { plan: ResponsePlan; fixes: FixRecord[] } {
  const fixes: FixRecord[] = [];
  let fixedPlan = { ...plan, acts: [...plan.acts], constraints: { ...plan.constraints } };

  for (const v of violations) {
    if (v.rule_id === 'A1') {
      // Prepend 'ground' as first act
      const before = fixedPlan.acts[0]?.type || 'none';
      fixedPlan.acts = [
        { type: 'ground', force: 0.9 },
        ...fixedPlan.acts.filter(a => a.type !== 'ground')
      ];
      fixes.push({
        violation_rule_id: 'A1',
        fix_type: 'act_prepend',
        before: `First act: ${before}`,
        after: 'First act: ground',
      });
    }

    if (v.rule_id === 'A3') {
      // Reduce max_length
      const before = fixedPlan.constraints.max_length;
      fixedPlan.constraints.max_length = Math.min(50, before);
      fixes.push({
        violation_rule_id: 'A3',
        fix_type: 'constraint_tighten',
        before: `max_length: ${before}`,
        after: `max_length: ${fixedPlan.constraints.max_length}`,
      });
    }
  }

  return { plan: fixedPlan, fixes };
}

// ============================================
// RULEPACK B: V_MODE (Withdrawal)
// ============================================

function checkRulepackVMode(
  plan: ResponsePlan,
  signals: EarlySignals
): ConstitutionalViolation[] {
  const violations: ConstitutionalViolation[] = [];
  const isVMode = signals.risk_flags?.v_mode || plan.metadata.risk.v_mode;

  if (!isVMode) return violations;

  // Rule B1: Must have return_agency, boundary, or question
  const hasWithdrawalAct = plan.acts.some(a =>
    a.type === 'return_agency' ||
    a.type === 'boundary' ||
    a.type === 'question'
  );
  if (!hasWithdrawalAct) {
    violations.push({
      rule_id: 'B1',
      rule_name: 'V_MODE withdrawal act',
      severity: 'error',
      description: 'V_MODE requires return_agency, boundary, or question act',
      location: 'act',
    });
  }

  // Rule B2: Forbidden directive acts
  for (const forbidden of DIRECTIVE_FORBIDDEN_ACTIONS) {
    if (!plan.constraints.forbidden.includes(forbidden)) {
      violations.push({
        rule_id: 'B2',
        rule_name: 'V_MODE directive forbidden',
        severity: 'error',
        description: `V_MODE must forbid ${forbidden}`,
        location: 'constraint',
      });
    }
  }

  // Rule B3: Forbidden V_MODE specific acts
  for (const act of plan.acts) {
    if (V_MODE_FORBIDDEN_ACTS.includes(act.type)) {
      violations.push({
        rule_id: 'B3',
        rule_name: 'V_MODE forbidden act type',
        severity: 'error',
        description: `V_MODE forbids act type ${act.type}`,
        location: 'act',
        details: `Found: ${act.type}`,
      });
    }
  }

  // Rule B4: must_require_user_effort should be true
  if (!plan.constraints.must_require_user_effort) {
    violations.push({
      rule_id: 'B4',
      rule_name: 'V_MODE user effort',
      severity: 'warning',
      description: 'V_MODE should require user effort',
      location: 'constraint',
    });
  }

  return violations;
}

function fixRulepackVMode(
  plan: ResponsePlan,
  violations: ConstitutionalViolation[]
): { plan: ResponsePlan; fixes: FixRecord[] } {
  const fixes: FixRecord[] = [];
  let fixedPlan = {
    ...plan,
    acts: [...plan.acts],
    constraints: { ...plan.constraints, forbidden: [...plan.constraints.forbidden] }
  };

  for (const v of violations) {
    if (v.rule_id === 'B1') {
      // Append return_agency
      fixedPlan.acts.push({ type: 'return_agency', force: 0.7 });
      fixes.push({
        violation_rule_id: 'B1',
        fix_type: 'act_prepend',
        before: 'No withdrawal act',
        after: 'Added return_agency',
      });
    }

    if (v.rule_id === 'B2') {
      // Add missing forbidden directives
      for (const forbidden of DIRECTIVE_FORBIDDEN_ACTIONS) {
        if (!fixedPlan.constraints.forbidden.includes(forbidden)) {
          fixedPlan.constraints.forbidden.push(forbidden);
        }
      }
      fixes.push({
        violation_rule_id: 'B2',
        fix_type: 'constraint_set',
        before: 'Missing directive forbiddens',
        after: `forbidden includes: ${DIRECTIVE_FORBIDDEN_ACTIONS.join(', ')}`,
      });
    }

    if (v.rule_id === 'B3') {
      // Remove forbidden act types
      const forbiddenType = v.details?.replace('Found: ', '') as SpeechActType;
      if (forbiddenType) {
        fixedPlan.acts = fixedPlan.acts.filter(a => a.type !== forbiddenType);
        // Substitute with 'mirror' if acts become empty
        if (fixedPlan.acts.length === 0) {
          fixedPlan.acts.push({ type: 'mirror', force: 0.5 });
        }
        fixes.push({
          violation_rule_id: 'B3',
          fix_type: 'act_remove',
          before: `Act: ${forbiddenType}`,
          after: 'Removed (substituted with mirror if needed)',
        });
      }
    }

    if (v.rule_id === 'B4') {
      fixedPlan.constraints.must_require_user_effort = true;
      fixes.push({
        violation_rule_id: 'B4',
        fix_type: 'constraint_set',
        before: 'must_require_user_effort: false',
        after: 'must_require_user_effort: true',
      });
    }
  }

  return { plan: fixedPlan, fixes };
}

// ============================================
// RULEPACK C: HIGH ADS
// ============================================

function checkRulepackADS(
  plan: ResponsePlan,
  signals: EarlySignals
): ConstitutionalViolation[] {
  const violations: ConstitutionalViolation[] = [];

  // Get ADS score
  const ads = signals.delegation_pred?.ads?.final ?? plan.metadata.ads?.final ?? 0;
  const highADS = ads > 0.6;

  if (!highADS) return violations;

  // Rule C1: High ADS requires user effort
  if (!plan.constraints.must_require_user_effort) {
    violations.push({
      rule_id: 'C1',
      rule_name: 'High ADS user effort',
      severity: 'error',
      description: 'High ADS (>0.6) requires must_require_user_effort=true',
      location: 'constraint',
      details: `ADS: ${ads.toFixed(2)}`,
    });
  }

  // Rule C2: High ADS should disable tools
  if (plan.constraints.tools_allowed) {
    violations.push({
      rule_id: 'C2',
      rule_name: 'High ADS tools',
      severity: 'warning',
      description: 'High ADS should disable tools_allowed',
      location: 'constraint',
    });
  }

  // Rule C3: High ADS should reduce max_length
  if (plan.constraints.max_length > 80) {
    violations.push({
      rule_id: 'C3',
      rule_name: 'High ADS brevity',
      severity: 'warning',
      description: 'High ADS should have max_length <= 80',
      location: 'constraint',
    });
  }

  return violations;
}

function fixRulepackADS(
  plan: ResponsePlan,
  violations: ConstitutionalViolation[]
): { plan: ResponsePlan; fixes: FixRecord[] } {
  const fixes: FixRecord[] = [];
  let fixedPlan = { ...plan, constraints: { ...plan.constraints } };

  for (const v of violations) {
    if (v.rule_id === 'C1') {
      fixedPlan.constraints.must_require_user_effort = true;
      fixes.push({
        violation_rule_id: 'C1',
        fix_type: 'constraint_set',
        before: 'must_require_user_effort: false',
        after: 'must_require_user_effort: true',
      });
    }

    if (v.rule_id === 'C2') {
      fixedPlan.constraints.tools_allowed = false;
      fixes.push({
        violation_rule_id: 'C2',
        fix_type: 'constraint_set',
        before: 'tools_allowed: true',
        after: 'tools_allowed: false',
      });
    }

    if (v.rule_id === 'C3') {
      const before = fixedPlan.constraints.max_length;
      fixedPlan.constraints.max_length = Math.min(80, before);
      fixes.push({
        violation_rule_id: 'C3',
        fix_type: 'constraint_tighten',
        before: `max_length: ${before}`,
        after: `max_length: ${fixedPlan.constraints.max_length}`,
      });
    }
  }

  return { plan: fixedPlan, fixes };
}

// ============================================
// RULEPACK D: TOOL INTENT SAFETY
// ============================================

function checkRulepackToolSafety(
  plan: ResponsePlan,
  signals: EarlySignals
): ConstitutionalViolation[] {
  const violations: ConstitutionalViolation[] = [];

  // Rule D1: In V_MODE or Emergency, tools must be disabled
  const isVModeOrEmergency =
    signals.risk_flags?.v_mode ||
    signals.risk_flags?.emergency ||
    plan.metadata.risk.v_mode ||
    plan.metadata.risk.emergency;

  if (isVModeOrEmergency && plan.constraints.tools_allowed) {
    violations.push({
      rule_id: 'D1',
      rule_name: 'V_MODE/Emergency tool safety',
      severity: 'error',
      description: 'Tools must be disabled in V_MODE or Emergency',
      location: 'constraint',
    });
  }

  return violations;
}

function fixRulepackToolSafety(
  plan: ResponsePlan,
  violations: ConstitutionalViolation[]
): { plan: ResponsePlan; fixes: FixRecord[] } {
  const fixes: FixRecord[] = [];
  let fixedPlan = { ...plan, constraints: { ...plan.constraints } };

  for (const v of violations) {
    if (v.rule_id === 'D1') {
      fixedPlan.constraints.tools_allowed = false;
      fixes.push({
        violation_rule_id: 'D1',
        fix_type: 'constraint_set',
        before: 'tools_allowed: true',
        after: 'tools_allowed: false',
      });
    }
  }

  return { plan: fixedPlan, fixes };
}

// ============================================
// MONOTONICITY CHECK (Anti-Drift Invariant)
// ============================================

/**
 * Check that fixes never INCREASED directiveness.
 * This is the core anti-drift invariant.
 *
 * Directiveness increases if:
 * - max_length increased
 * - tools_allowed went false → true
 * - must_require_user_effort went true → false
 * - directive acts were added
 */
function checkMonotonicity(
  before: ResponsePlan,
  after: ResponsePlan
): { monotonic: boolean; violations: string[] } {
  const violations: string[] = [];

  // max_length should not increase
  if (after.constraints.max_length > before.constraints.max_length) {
    violations.push(`max_length increased: ${before.constraints.max_length} → ${after.constraints.max_length}`);
  }

  // tools_allowed should not go true
  if (!before.constraints.tools_allowed && after.constraints.tools_allowed) {
    violations.push('tools_allowed went false → true');
  }

  // must_require_user_effort should not go false
  if (before.constraints.must_require_user_effort && !after.constraints.must_require_user_effort) {
    violations.push('must_require_user_effort went true → false');
  }

  // forbidden list should not shrink
  const beforeForbidden = new Set(before.constraints.forbidden);
  const afterForbidden = new Set(after.constraints.forbidden);
  for (const f of beforeForbidden) {
    if (!afterForbidden.has(f)) {
      violations.push(`forbidden item removed: ${f}`);
    }
  }

  return {
    monotonic: violations.length === 0,
    violations,
  };
}

// ============================================
// MAIN VERIFIER
// ============================================

/**
 * Verify and fix a ResponsePlan against constitutional constraints.
 *
 * Process:
 * 1. Check all rulepacks (A-D)
 * 2. Attempt fixes for violations
 * 3. Verify monotonicity (fixes only tighten, never loosen)
 * 4. Re-check after fixes
 * 5. If still invalid or non-monotonic → fallback
 *
 * INVARIANT: Fixes can only:
 * - Remove forbidden acts
 * - Add safe acts (ground/boundary/return_agency) in defined positions
 * - Tighten constraints (never loosen)
 */
export function verifyAndFixPlan(
  plan: ResponsePlan,
  signals: EarlySignals,
  profile: 'minimal' | 'standard' | 'full' = 'standard'
): PlanVerification {
  const startTime = Date.now();

  // Step 1: Check all rulepacks
  const allViolations: ConstitutionalViolation[] = [
    ...checkRulepackEmergency(plan, signals),
    ...checkRulepackVMode(plan, signals),
    ...checkRulepackADS(plan, signals),
    ...checkRulepackToolSafety(plan, signals),
  ];

  // If no violations, return valid
  if (allViolations.length === 0) {
    return {
      valid: true,
      violations: [],
      fixes_applied: [],
      unfixable: false,
      final_plan: plan,
      fallback_used: false,
      verified_at: Date.now(),
      verification_time_ms: Date.now() - startTime,
    };
  }

  // Step 2: Attempt fixes
  let fixedPlan = deepCopyPlan(plan);
  const allFixes: FixRecord[] = [];

  // Fix emergency rules (A)
  const emergencyViolations = allViolations.filter(v => v.rule_id.startsWith('A'));
  if (emergencyViolations.length > 0) {
    const { plan: p, fixes } = fixRulepackEmergency(fixedPlan, emergencyViolations);
    fixedPlan = p;
    allFixes.push(...fixes);
  }

  // Fix V_MODE rules (B)
  const vmodeViolations = allViolations.filter(v => v.rule_id.startsWith('B'));
  if (vmodeViolations.length > 0) {
    const { plan: p, fixes } = fixRulepackVMode(fixedPlan, vmodeViolations);
    fixedPlan = p;
    allFixes.push(...fixes);
  }

  // Fix ADS rules (C)
  const adsViolations = allViolations.filter(v => v.rule_id.startsWith('C'));
  if (adsViolations.length > 0) {
    const { plan: p, fixes } = fixRulepackADS(fixedPlan, adsViolations);
    fixedPlan = p;
    allFixes.push(...fixes);
  }

  // Fix tool safety rules (D)
  const toolViolations = allViolations.filter(v => v.rule_id.startsWith('D'));
  if (toolViolations.length > 0) {
    const { plan: p, fixes } = fixRulepackToolSafety(fixedPlan, toolViolations);
    fixedPlan = p;
    allFixes.push(...fixes);
  }

  // Step 3: Verify monotonicity (anti-drift)
  const monotonicity = checkMonotonicity(plan, fixedPlan);
  if (!monotonicity.monotonic) {
    // CRITICAL: Fix broke monotonicity - this is a bug, use fallback
    console.error('[PlanActVerifier] Monotonicity violated:', monotonicity.violations);
    const fallbackPlan = getCanonicalFallbackPlan({
      emergency: signals.risk_flags?.emergency ?? false,
      v_mode: signals.risk_flags?.v_mode ?? false,
      language: plan.constraints.language,
    });

    return {
      valid: false,
      violations: allViolations,
      fixes_applied: allFixes,
      unfixable: true,
      final_plan: fallbackPlan,
      fallback_used: true,
      verified_at: Date.now(),
      verification_time_ms: Date.now() - startTime,
    };
  }

  // Step 4: Re-check after fixes
  const remainingViolations: ConstitutionalViolation[] = [
    ...checkRulepackEmergency(fixedPlan, signals),
    ...checkRulepackVMode(fixedPlan, signals),
    ...checkRulepackADS(fixedPlan, signals),
    ...checkRulepackToolSafety(fixedPlan, signals),
  ];

  // Only count errors, not warnings
  const remainingErrors = remainingViolations.filter(v => v.severity === 'error');

  // Step 5: If still has errors → unfixable, use fallback
  if (remainingErrors.length > 0) {
    const fallbackPlan = getCanonicalFallbackPlan({
      emergency: signals.risk_flags?.emergency ?? false,
      v_mode: signals.risk_flags?.v_mode ?? false,
      language: plan.constraints.language,
    });

    return {
      valid: false,
      violations: allViolations,
      fixes_applied: allFixes,
      unfixable: true,
      final_plan: fallbackPlan,
      fallback_used: true,
      verified_at: Date.now(),
      verification_time_ms: Date.now() - startTime,
    };
  }

  // Fixed successfully
  return {
    valid: true,
    violations: allViolations,
    fixes_applied: allFixes,
    unfixable: false,
    final_plan: fixedPlan,
    fallback_used: false,
    verified_at: Date.now(),
    verification_time_ms: Date.now() - startTime,
  };
}

/**
 * Deep copy a plan to avoid mutation issues.
 */
function deepCopyPlan(plan: ResponsePlan): ResponsePlan {
  return {
    ...plan,
    acts: plan.acts.map(a => ({ ...a })),
    constraints: {
      ...plan.constraints,
      forbidden: [...plan.constraints.forbidden],
      required: [...plan.constraints.required],
    },
    metadata: {
      ...plan.metadata,
      risk: { ...plan.metadata.risk },
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  checkRulepackEmergency,
  checkRulepackVMode,
  checkRulepackADS,
  checkRulepackToolSafety,
  fixRulepackEmergency,
  fixRulepackVMode,
  fixRulepackADS,
  fixRulepackToolSafety,
};
