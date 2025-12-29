/**
 * LIMEN DOMAIN GOVERNOR
 * 
 * Manages coexistence between domains.
 * Risk emerges from combinations, not single domains.
 * Runs after perception, before selection.
 */

import { FieldState, Atmosphere, Mode, Depth, Pacing, HumanDomain, ForbiddenAction, RequiredAction } from '../../interface/types';

// ============================================
// TYPES
// ============================================

export interface GovernorRule {
  rule_id: string;
  name: string;
  domains: HumanDomain[] | 'ANY';
  precedence: HumanDomain | 'CONSTITUTIONAL' | null;
  constraint: string;
  activation: {
    criterion: string;
    evaluate: (field: FieldState) => boolean;
  };
  effect: GovernorEffect;
}

export interface GovernorEffect {
  atmosphere?: Atmosphere;
  mode?: Mode;
  depth_ceiling?: Depth;
  forbidden?: ForbiddenAction[];
  required?: RequiredAction[];
  pacing?: Pacing;
  primitive?: string;
  override?: boolean;
  escalate?: boolean;
  l2_enabled?: boolean;
}

export interface GovernorResult {
  rules_applied: string[];
  effect: MergedEffect;
}

export interface MergedEffect {
  atmosphere: Atmosphere | null;
  mode: Mode | null;
  depth_ceiling: Depth;
  forbidden: ForbiddenAction[];
  required: RequiredAction[];
  pacing: Pacing;
  primitive: string | null;
  escalate: boolean;
  l2_enabled: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDomainSalience(field: FieldState, domain: HumanDomain): number {
  const found = field.domains.find(d => d.domain === domain);
  return found?.salience || 0;
}

function hasDomain(field: FieldState, domain: HumanDomain, minSalience: number = 0): boolean {
  return getDomainSalience(field, domain) > minSalience;
}

function isDominant(field: FieldState, domain: HumanDomain): boolean {
  return field.domains[0]?.domain === domain;
}

// ============================================
// PRECEDENCE ORDER
// ============================================

const PRECEDENCE_ORDER: (HumanDomain | 'CONSTITUTIONAL' | null)[] = [
  'CONSTITUTIONAL',
  'H01_SURVIVAL',
  'H02_SAFETY',
  'H04_EMOTION',
  'H06_MEANING',
  'H07_IDENTITY',
  'H09_ATTACHMENT',
  'H03_BODY',
  'H08_TEMPORAL',
  'H11_BELONGING',
  'H12_HIERARCHY',
  'H05_COGNITION',
  'H13_CREATION',
  'H14_WORK',
  'H15_LEGAL',
  'H16_OPERATIONAL',
  'H10_COORDINATION',
  'H17_FORM',
  null,
];

function getPrecedenceRank(precedence: HumanDomain | 'CONSTITUTIONAL' | null): number {
  const index = PRECEDENCE_ORDER.indexOf(precedence);
  return index === -1 ? PRECEDENCE_ORDER.length : index;
}

// ============================================
// DEPTH ORDERING (most restrictive wins)
// ============================================

const DEPTH_ORDER: Depth[] = ['surface', 'medium', 'deep'];

function mostRestrictiveDepth(a: Depth, b: Depth | undefined): Depth {
  if (!b) return a;
  const aIndex = DEPTH_ORDER.indexOf(a);
  const bIndex = DEPTH_ORDER.indexOf(b);
  return aIndex <= bIndex ? a : b;
}

// ============================================
// PACING ORDERING (slowest wins)
// ============================================

const PACING_ORDER: Pacing[] = ['slow', 'conservative', 'normal', 'responsive'];

function slowestPacing(a: Pacing, b: Pacing | undefined): Pacing {
  if (!b) return a;
  const aIndex = PACING_ORDER.indexOf(a);
  const bIndex = PACING_ORDER.indexOf(b);
  return aIndex <= bIndex ? a : b;
}

// ============================================
// RULES DEFINITION
// ============================================

const DOMAIN_GOVERNOR_RULES: GovernorRule[] = [
  // Rule 000: CRISIS FLAG → EMERGENCY (highest priority)
  {
    rule_id: 'DG-000',
    name: 'Crisis flag triggers emergency',
    domains: 'ANY',
    precedence: 'CONSTITUTIONAL',
    constraint: 'CRISIS_EMERGENCY',
    activation: {
      criterion: 'crisis flag present',
      evaluate: (field) => field.flags.includes('crisis'),
    },
    effect: {
      atmosphere: 'EMERGENCY',
      depth_ceiling: 'surface',
      forbidden: ['explore', 'expand', 'analyze', 'challenge'],
      required: ['ground', 'presence', 'safety_check'],
      override: true,
      escalate: true,
    },
  },
  
  // Rule 001: SURVIVAL Blocks Everything
  {
    rule_id: 'DG-001',
    name: 'SURVIVAL blocks all deep work',
    domains: ['H01_SURVIVAL'],
    precedence: 'H01_SURVIVAL',
    constraint: 'BLOCK_DEEP_WORK',
    activation: {
      criterion: 'survival_salience > 0.3',
      evaluate: (field) => getDomainSalience(field, 'H01_SURVIVAL') > 0.3,
    },
    effect: {
      atmosphere: 'EMERGENCY',
      depth_ceiling: 'surface',
      forbidden: ['explore', 'expand', 'analyze'],
      required: ['ground', 'presence'],
      override: true,
    },
  },

  // Rule 002: SAFETY Constrains Exploration
  {
    rule_id: 'DG-002',
    name: 'SAFETY constrains exploration',
    domains: ['H02_SAFETY'],
    precedence: 'H02_SAFETY',
    constraint: 'CONSTRAIN_EXPLORATION',
    activation: {
      criterion: 'safety_salience > 0.4',
      evaluate: (field) => getDomainSalience(field, 'H02_SAFETY') > 0.4,
    },
    effect: {
      depth_ceiling: 'medium',
      forbidden: ['open_new_material', 'challenge'],
      required: ['validate', 'acknowledge_concern'],
      pacing: 'conservative',
    },
  },

  // Rule 003: HIGH EMOTION Blocks Commitment
  {
    rule_id: 'DG-003',
    name: 'High emotion blocks commitment',
    domains: ['H04_EMOTION'],
    precedence: 'H04_EMOTION',
    constraint: 'BLOCK_COMMIT',
    activation: {
      criterion: 'arousal == high AND emotion_salience > 0.5',
      evaluate: (field) => 
        field.arousal === 'high' && 
        getDomainSalience(field, 'H04_EMOTION') > 0.5,
    },
    effect: {
      mode: 'REGULATE',
      forbidden: ['commit', 'decide', 'finalize'],
      required: ['regulate_first'],
    },
  },

  // Rule 004: MEANING Triggers V_MODE
  {
    rule_id: 'DG-004',
    name: 'Meaning domain triggers V_MODE',
    domains: ['H06_MEANING'],
    precedence: 'H06_MEANING',
    constraint: 'VISUALIZE_ONLY',
    activation: {
      criterion: 'meaning_salience > 0.5',
      evaluate: (field) => getDomainSalience(field, 'H06_MEANING') > 0.5,
    },
    effect: {
      atmosphere: 'V_MODE',
      forbidden: ['recommend', 'advise', 'direct'],
      required: ['return_ownership', 'visualize_options'],
      depth_ceiling: 'deep',
    },
  },

  // Rule 005: IDENTITY Triggers Rubicon
  {
    rule_id: 'DG-005',
    name: 'Identity domain triggers Rubicon protection',
    domains: ['H07_IDENTITY'],
    precedence: 'H07_IDENTITY',
    constraint: 'RUBICON_ACTIVE',
    activation: {
      criterion: 'identity_salience > 0.4',
      evaluate: (field) => getDomainSalience(field, 'H07_IDENTITY') > 0.4,
    },
    effect: {
      atmosphere: 'V_MODE',
      forbidden: ['label', 'define_identity', 'assign_purpose'],
      required: ['return_ownership', 'mirror_only'],
    },
  },

  // Rule 006: ATTACHMENT + EMOTION = Careful
  {
    rule_id: 'DG-006',
    name: 'Attachment with emotion requires care',
    domains: ['H09_ATTACHMENT', 'H04_EMOTION'],
    precedence: 'H04_EMOTION',
    constraint: 'RELATIONAL_CARE',
    activation: {
      criterion: 'attachment_salience > 0.4 AND arousal != low',
      evaluate: (field) => 
        getDomainSalience(field, 'H09_ATTACHMENT') > 0.4 && 
        field.arousal !== 'low',
    },
    effect: {
      atmosphere: 'HUMAN_FIELD',
      pacing: 'slow',
      forbidden: ['challenge_attachment', 'analyze_relationship'],
      required: ['validate', 'presence'],
    },
  },

  // Rule 007: COGNITION Alone = Can Analyze
  {
    rule_id: 'DG-007',
    name: 'Pure cognition allows analysis',
    domains: ['H05_COGNITION'],
    precedence: 'H05_COGNITION',
    constraint: 'ALLOW_ANALYSIS',
    activation: {
      criterion: 'cognition_dominant AND stable',
      evaluate: (field) => 
        isDominant(field, 'H05_COGNITION') && 
        field.arousal === 'medium' && 
        !field.flags.includes('crisis'),
    },
    effect: {
      atmosphere: 'OPERATIONAL',
      depth_ceiling: 'deep',
      l2_enabled: true,
    },
  },

  // Rule 008: CREATION + WORK = Execute
  {
    rule_id: 'DG-008',
    name: 'Creation/Work can execute',
    domains: ['H13_CREATION', 'H14_WORK'],
    precedence: null,
    constraint: 'ALLOW_EXECUTION',
    activation: {
      criterion: 'creation_or_work_dominant AND stable',
      evaluate: (field) => 
        (isDominant(field, 'H13_CREATION') || isDominant(field, 'H14_WORK')) &&
        field.arousal === 'medium' &&
        field.coherence !== 'low',
    },
    effect: {
      atmosphere: 'OPERATIONAL',
      depth_ceiling: 'deep',
      l2_enabled: true,
    },
  },

  // Rule 009: MEANING + SURVIVAL = Crisis
  {
    rule_id: 'DG-009',
    name: 'Meaning crisis (existential + survival)',
    domains: ['H06_MEANING', 'H01_SURVIVAL'],
    precedence: 'H01_SURVIVAL',
    constraint: 'EXISTENTIAL_CRISIS',
    activation: {
      criterion: 'both salient',
      evaluate: (field) => 
        hasDomain(field, 'H06_MEANING', 0.4) &&
        hasDomain(field, 'H01_SURVIVAL', 0.3),
    },
    effect: {
      atmosphere: 'EMERGENCY',
      depth_ceiling: 'surface',
      forbidden: ['explore_meaning', 'philosophize'],
      required: ['ground', 'presence', 'safety_check'],
      escalate: true,
    },
  },

  // Rule 010: DELEGATION_ATTEMPT = V_MODE Always (CONSTITUTIONAL)
  {
    rule_id: 'DG-010',
    name: 'Delegation attempt always triggers V_MODE',
    domains: 'ANY',
    precedence: 'CONSTITUTIONAL',
    constraint: 'NO_DELEGATION',
    activation: {
      criterion: 'delegation_attempt flag present',
      evaluate: (field) => field.flags.includes('delegation_attempt'),
    },
    effect: {
      atmosphere: 'V_MODE',
      forbidden: ['recommend', 'advise', 'decide_for_user'],
      required: ['return_ownership'],
      primitive: 'P06_RETURN_AGENCY',
      override: true,
    },
  },

  // Rule 011: TEMPORAL Pressure + DECISION = Slow Down
  {
    rule_id: 'DG-011',
    name: 'Time pressure with decision needs slowing',
    domains: ['H08_TEMPORAL'],
    precedence: null,
    constraint: 'SLOW_DECISION',
    activation: {
      criterion: 'temporal_pressure AND decision_goal',
      evaluate: (field) => 
        hasDomain(field, 'H08_TEMPORAL', 0.5) &&
        field.goal === 'decide',
    },
    effect: {
      atmosphere: 'DECISION',
      pacing: 'slow',
      forbidden: ['rush', 'skip_steps'],
      required: ['acknowledge_pressure', 'map_costs'],
    },
  },

  // Rule 012: BELONGING + IDENTITY = Sensitive
  {
    rule_id: 'DG-012',
    name: 'Belonging with identity is sensitive',
    domains: ['H11_BELONGING', 'H07_IDENTITY'],
    precedence: 'H07_IDENTITY',
    constraint: 'IDENTITY_SENSITIVE',
    activation: {
      criterion: 'both salient',
      evaluate: (field) => 
        hasDomain(field, 'H11_BELONGING', 0.4) &&
        hasDomain(field, 'H07_IDENTITY', 0.4),
    },
    effect: {
      atmosphere: 'V_MODE',
      pacing: 'slow',
      forbidden: ['challenge_belonging', 'question_identity'],
      required: ['validate', 'presence'],
    },
  },

  // Rule 013: HIERARCHY + EMOTION = Careful
  {
    rule_id: 'DG-013',
    name: 'Hierarchy issues with emotion need care',
    domains: ['H12_HIERARCHY', 'H04_EMOTION'],
    precedence: 'H04_EMOTION',
    constraint: 'POWER_SENSITIVE',
    activation: {
      criterion: 'hierarchy_salient AND emotional',
      evaluate: (field) => 
        hasDomain(field, 'H12_HIERARCHY', 0.4) &&
        field.arousal !== 'low',
    },
    effect: {
      atmosphere: 'HUMAN_FIELD',
      pacing: 'slow',
      forbidden: ['take_sides', 'advise_action'],
      required: ['validate', 'explore_safely'],
    },
  },

  // Rule 014: LEGAL Alone = Informational
  {
    rule_id: 'DG-014',
    name: 'Legal domain alone is informational',
    domains: ['H15_LEGAL'],
    precedence: 'H15_LEGAL',
    constraint: 'INFORM_ONLY',
    activation: {
      criterion: 'legal_dominant AND stable',
      evaluate: (field) => 
        isDominant(field, 'H15_LEGAL') &&
        field.arousal !== 'high' &&
        !field.flags.includes('delegation_attempt'),
    },
    effect: {
      atmosphere: 'OPERATIONAL',
      depth_ceiling: 'medium',
      forbidden: ['advise_legal_action'],
      required: ['disclaim_not_lawyer'],
    },
  },

  // Rule 015: BODY + SAFETY = Medical Caution
  {
    rule_id: 'DG-015',
    name: 'Body with safety concern = medical caution',
    domains: ['H03_BODY', 'H02_SAFETY'],
    precedence: 'H02_SAFETY',
    constraint: 'MEDICAL_CAUTION',
    activation: {
      criterion: 'body_and_safety_both_salient',
      evaluate: (field) => 
        hasDomain(field, 'H03_BODY', 0.4) &&
        hasDomain(field, 'H02_SAFETY', 0.3),
    },
    effect: {
      atmosphere: 'HUMAN_FIELD',
      forbidden: ['diagnose', 'prescribe', 'recommend_treatment'],
      required: ['suggest_professional', 'disclaim'],
    },
  },

  // Rule 017: HIGH AROUSAL = Always Regulate First (CONSTITUTIONAL)
  {
    rule_id: 'DG-017',
    name: 'High arousal always regulates first',
    domains: 'ANY',
    precedence: 'CONSTITUTIONAL',
    constraint: 'REGULATE_FIRST',
    activation: {
      criterion: 'arousal == high',
      evaluate: (field) => field.arousal === 'high',
    },
    effect: {
      mode: 'REGULATE',
      depth_ceiling: 'surface',
      forbidden: ['explore', 'expand', 'challenge', 'analyze'],
      required: ['ground', 'validate', 'slow_down'],
      override: true,
    },
  },

  // Rule 018: LOW AROUSAL = Gentle Activation
  {
    rule_id: 'DG-018',
    name: 'Low arousal needs gentle activation',
    domains: 'ANY',
    precedence: null,
    constraint: 'GENTLE_ACTIVATION',
    activation: {
      criterion: 'arousal == low',
      evaluate: (field) => field.arousal === 'low',
    },
    effect: {
      mode: 'REGULATE',
      atmosphere: 'HUMAN_FIELD',
      pacing: 'slow',
      forbidden: ['demand', 'push', 'challenge'],
      required: ['presence', 'gentle_inquiry'],
    },
  },

  // Rule 019: LOOP Detected = Contract
  {
    rule_id: 'DG-019',
    name: 'Loop detected triggers contraction',
    domains: 'ANY',
    precedence: null,
    constraint: 'BREAK_LOOP',
    activation: {
      criterion: 'loop_count >= 3',
      evaluate: (field) => field.loop_count >= 3,
    },
    effect: {
      mode: 'CONTRACT',
      primitive: 'P05_CRYSTALLIZE',
      forbidden: ['open_new_material', 'expand'],
      required: ['name_loop', 'focus'],
    },
  },

  // Rule 020: COHERENCE LOW = Stabilize
  {
    rule_id: 'DG-020',
    name: 'Low coherence needs stabilization',
    domains: 'ANY',
    precedence: null,
    constraint: 'STABILIZE',
    activation: {
      criterion: 'coherence == low',
      evaluate: (field) => field.coherence === 'low',
    },
    effect: {
      depth_ceiling: 'surface',
      pacing: 'slow',
      forbidden: ['add_complexity', 'open_dimensions'],
      required: ['simplify', 'ground'],
    },
  },
];

// ============================================
// MAIN FUNCTION
// ============================================

export function applyDomainGovernor(field: FieldState): GovernorResult {
  // 1. Collect applicable rules
  const applicableRules: GovernorRule[] = [];
  
  for (const rule of DOMAIN_GOVERNOR_RULES) {
    if (rule.activation.evaluate(field)) {
      applicableRules.push(rule);
    }
  }
  
  // 2. Sort by precedence (lower rank = higher priority)
  applicableRules.sort((a, b) => 
    getPrecedenceRank(a.precedence) - getPrecedenceRank(b.precedence)
  );
  
  // 3. Merge effects
  const merged: MergedEffect = {
    atmosphere: null,
    mode: null,
    depth_ceiling: 'deep',
    forbidden: [],
    required: [],
    pacing: 'normal',
    primitive: null,
    escalate: false,
    l2_enabled: true,
  };
  
  for (const rule of applicableRules) {
    const effect = rule.effect;
    
    // Override rules set atmosphere/mode directly
    if (effect.override) {
      if (effect.atmosphere) merged.atmosphere = effect.atmosphere;
      if (effect.mode) merged.mode = effect.mode;
    } else {
      // Non-override: only set if not already set
      if (effect.atmosphere && !merged.atmosphere) {
        merged.atmosphere = effect.atmosphere;
      }
      if (effect.mode && !merged.mode) {
        merged.mode = effect.mode;
      }
    }
    
    // Accumulate forbidden/required (dedupe)
    if (effect.forbidden) {
      for (const f of effect.forbidden) {
        if (!merged.forbidden.includes(f)) {
          merged.forbidden.push(f);
        }
      }
    }
    if (effect.required) {
      for (const r of effect.required) {
        if (!merged.required.includes(r)) {
          merged.required.push(r);
        }
      }
    }
    
    // Most restrictive depth ceiling
    if (effect.depth_ceiling) {
      merged.depth_ceiling = mostRestrictiveDepth(merged.depth_ceiling, effect.depth_ceiling);
    }
    
    // Slowest pacing
    if (effect.pacing) {
      merged.pacing = slowestPacing(merged.pacing, effect.pacing);
    }
    
    // Primitive (first one wins, typically from override rules)
    if (effect.primitive && !merged.primitive) {
      merged.primitive = effect.primitive;
    }
    
    // Escalate if any rule says so
    if (effect.escalate) {
      merged.escalate = true;
    }
    
    // L2 disabled if any rule says so
    if (effect.l2_enabled === false) {
      merged.l2_enabled = false;
    }
  }
  
  return {
    rules_applied: applicableRules.map(r => r.rule_id),
    effect: merged,
  };
}

// ============================================
// INVARIANT CHECKS
// ============================================

export interface InvariantCheckResult {
  passed: boolean;
  violations: string[];
}

export function checkInvariants(field: FieldState, result: GovernorResult): InvariantCheckResult {
  const violations: string[] = [];
  
  // INV-1: SURVIVAL > ALL
  if (hasDomain(field, 'H01_SURVIVAL', 0.3)) {
    if (result.effect.atmosphere !== 'EMERGENCY') {
      violations.push('INV-1: SURVIVAL present but atmosphere != EMERGENCY');
    }
  }
  
  // INV-2: DELEGATION > OPERATIONAL
  if (field.flags.includes('delegation_attempt')) {
    if (result.effect.atmosphere !== 'V_MODE') {
      violations.push('INV-2: delegation_attempt but atmosphere != V_MODE');
    }
  }
  
  // INV-3: HIGH AROUSAL > DEEP
  if (field.arousal === 'high') {
    if (result.effect.depth_ceiling !== 'surface') {
      violations.push('INV-3: arousal=high but depth_ceiling != surface');
    }
  }
  
  // INV-4: MEANING ≠ DECIDE
  if (hasDomain(field, 'H06_MEANING', 0.5)) {
    if (!result.effect.forbidden.includes('recommend') && 
        !result.effect.forbidden.includes('advise')) {
      violations.push('INV-4: MEANING present but recommend/advise not forbidden');
    }
  }
  
  // INV-5: IDENTITY ≠ ASSIGN
  if (hasDomain(field, 'H07_IDENTITY', 0.4)) {
    if (!result.effect.forbidden.includes('label') && 
        !result.effect.forbidden.includes('define_identity')) {
      violations.push('INV-5: IDENTITY present but label/define_identity not forbidden');
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

// ============================================
// EXPORTS
// ============================================

export { DOMAIN_GOVERNOR_RULES };
export default applyDomainGovernor;
