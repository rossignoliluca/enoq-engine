/**
 * ADS DETECTOR - Avoidable Delegation Surprise
 *
 * Purpose: Measure avoidable vs legitimate delegation.
 * Output: HARD constraints only (effort, tools, brevity).
 * Never influences tone or language.
 *
 * Formula: ADS = avoidability × motive_weight × inertia
 *
 * Where:
 * - avoidability = (ability + state) / 2
 * - ability = Could user do this themselves? (not emergency)
 * - state = Are they in psychological state to do it?
 * - motive_weight = weighted sum of problematic motives
 * - inertia = decay factor from repeated delegations
 */

import {
  FieldState,
  GoalType,
  DimensionalState,
  ADSScore,
  MotiveDistribution,
  DelegationPrediction,
  PolicyAdjustments,
} from '../../interface/types';

// ============================================
// MOTIVE WEIGHTS (Problematic vs Acceptable)
// ============================================

/**
 * How problematic is each motive type?
 * Higher = more likely to indicate avoidable delegation.
 */
const MOTIVE_PROBLEM_WEIGHTS: Record<keyof MotiveDistribution, number> = {
  genuine_incapacity: 0.0,      // Not problematic - they truly can't
  time_saving_tooling: 0.1,     // Acceptable use of AI as tool
  time_saving_substitution: 0.8, // Problematic - replacing own effort
  emotional_offload: 0.6,       // Moderately problematic
  decision_avoidance: 0.9,      // Very problematic - avoiding agency
  validation_seeking: 0.5,      // Moderately problematic
  habit: 0.7,                   // Problematic - automatic delegation
};

// ============================================
// DELEGATION MARKERS (Multi-language)
// ============================================

/**
 * Phrases that indicate delegation intent.
 * Grouped by specificity (explicit > implicit > subtle).
 */
const DELEGATION_MARKERS = {
  explicit: [
    // English
    'tell me what to do', 'decide for me', 'what should i do',
    'you decide', 'just tell me', 'make the decision',
    // Italian
    'dimmi cosa fare', 'decidi per me', 'cosa dovrei fare',
    'decidi tu', 'dimmelo tu', 'prendi tu la decisione',
    // Spanish
    'dime qué hacer', 'decide por mí', 'qué debería hacer',
    'decide tú', 'dímelo tú',
    // French
    'dis-moi quoi faire', 'décide pour moi', 'que devrais-je faire',
    // German
    'sag mir was ich tun soll', 'entscheide für mich',
  ],
  implicit: [
    // English
    'should i', 'what would you', 'would you recommend',
    'what do you think i should', 'is it better to',
    // Italian
    'dovrei', 'cosa faresti', 'mi consigli',
    'cosa pensi che dovrei', 'è meglio',
    // Spanish
    'debería', 'qué harías', 'me recomiendas',
    // French
    'devrais-je', 'qu\'est-ce que tu ferais',
    // German
    'sollte ich', 'was würdest du',
  ],
  subtle: [
    // Questions that implicitly seek direction
    'what now', 'so now what', 'and then',
    'e adesso', 'e ora', 'quindi',
    'y ahora', 'et maintenant', 'und jetzt',
  ],
};

// ============================================
// MOTIVE CLASSIFIER
// ============================================

/**
 * Classify the likely motive behind a delegation attempt.
 *
 * Uses:
 * - Message content analysis
 * - Dimensional state (V_MODE, emergency)
 * - Field state (goal, arousal, valence)
 * - Session context (loop_count, flags)
 */
export function classifyMotive(
  message: string,
  dimensionalState: DimensionalState,
  fieldState: FieldState,
  sessionHistory?: { delegation_count: number; same_topic_count: number }
): MotiveDistribution {
  const msg = message.toLowerCase();

  // Initialize base distribution
  const motive: MotiveDistribution = {
    genuine_incapacity: 0,
    time_saving_tooling: 0,
    time_saving_substitution: 0,
    emotional_offload: 0,
    decision_avoidance: 0,
    validation_seeking: 0,
    habit: 0,
  };

  // ---- GENUINE INCAPACITY ----
  // Emergency or crisis = genuine incapacity
  if (dimensionalState.emergency_detected || fieldState.flags.includes('crisis')) {
    motive.genuine_incapacity = 0.7;
  }
  // Dysregulated state = partial incapacity
  if (fieldState.arousal === 'high' && fieldState.valence === 'negative') {
    motive.genuine_incapacity += 0.3;
  }

  // ---- TIME SAVING (Tooling vs Substitution) ----
  // Goal is 'inform' = likely tooling (asking for facts)
  if (fieldState.goal === 'inform') {
    motive.time_saving_tooling = 0.5;
  }
  // Goal is 'act' = might be substitution
  if (fieldState.goal === 'act') {
    motive.time_saving_substitution = 0.4;
  }
  // Explicit "do it for me" = substitution
  if (DELEGATION_MARKERS.explicit.some(m => msg.includes(m))) {
    motive.time_saving_substitution = 0.6;
  }

  // ---- EMOTIONAL OFFLOAD ----
  // V_MODE + delegation = likely emotional offload
  if (dimensionalState.v_mode_triggered) {
    motive.emotional_offload = 0.4;
    // Existential questions about meaning/identity
    if (dimensionalState.vertical.EXISTENTIAL > 0.6) {
      motive.emotional_offload = 0.6;
    }
  }
  // High arousal + negative valence = emotional component
  if (fieldState.arousal === 'high' && fieldState.valence === 'negative') {
    motive.emotional_offload += 0.2;
  }

  // ---- DECISION AVOIDANCE ----
  // Goal is 'decide' + delegation markers = avoidance
  if (fieldState.goal === 'decide') {
    motive.decision_avoidance = 0.3;
    if (DELEGATION_MARKERS.explicit.some(m => msg.includes(m))) {
      motive.decision_avoidance = 0.7;
    }
    if (DELEGATION_MARKERS.implicit.some(m => msg.includes(m))) {
      motive.decision_avoidance = 0.5;
    }
  }
  // V_MODE + decide = strong avoidance signal
  if (dimensionalState.v_mode_triggered && fieldState.goal === 'decide') {
    motive.decision_avoidance = 0.8;
  }

  // ---- VALIDATION SEEKING ----
  // Questions that seek approval rather than direction
  const validationMarkers = [
    'am i right', 'is that ok', 'do you think',
    'ho ragione', 'va bene', 'pensi che',
    'tengo razón', 'está bien',
  ];
  if (validationMarkers.some(m => msg.includes(m))) {
    motive.validation_seeking = 0.5;
  }

  // ---- HABIT ----
  // Session history shows repeated delegation
  if (sessionHistory) {
    if (sessionHistory.delegation_count > 3) {
      motive.habit = 0.4;
    }
    if (sessionHistory.delegation_count > 5) {
      motive.habit = 0.7;
    }
    // Same topic repeated = habitual pattern
    if (sessionHistory.same_topic_count > 2) {
      motive.habit += 0.2;
    }
  }
  // Loop detected = possible habit
  if (fieldState.loop_count > 2) {
    motive.habit += 0.3;
  }

  // Normalize to sum ≈ 1
  const total = Object.values(motive).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const key of Object.keys(motive) as (keyof MotiveDistribution)[]) {
      motive[key] = motive[key] / total;
    }
  } else {
    // Default: assume time_saving_tooling
    motive.time_saving_tooling = 1.0;
  }

  return motive;
}

// ============================================
// AVOIDABILITY ASSESSMENT
// ============================================

/**
 * Assess whether the user could avoid delegating this.
 *
 * ability: Could they do it themselves? (skill-based)
 * state: Are they in a psychological state to do it? (regulation-based)
 */
export function assessAvoidability(
  dimensionalState: DimensionalState,
  fieldState: FieldState
): { ability: number; state: number; combined: number } {
  // ---- ABILITY ----
  // V_MODE = they CAN do it (it's their life decision)
  // Emergency = they might genuinely need help
  // Functional = depends on task complexity

  let ability = 0.5; // Default: uncertain

  if (dimensionalState.v_mode_triggered) {
    // Meaning/identity questions = user is the only one who can answer
    ability = 0.95;
  } else if (dimensionalState.emergency_detected) {
    // Emergency = genuine need, low ability to self-help
    ability = 0.2;
  } else if (dimensionalState.vertical.FUNCTIONAL > 0.6) {
    // Functional task = depends on complexity
    // High confidence in FUNCTIONAL = probably can do it
    ability = 0.6;
  }

  // ---- STATE ----
  // Are they regulated enough to do it?

  let state = 0.7; // Default: assume regulated

  if (fieldState.arousal === 'high') {
    // High arousal = dysregulated
    state = 0.4;
  }
  if (fieldState.valence === 'negative' && fieldState.arousal === 'high') {
    // Negative + high arousal = very dysregulated
    state = 0.2;
  }
  if (fieldState.flags.includes('crisis') || fieldState.flags.includes('shutdown')) {
    // Crisis or shutdown = cannot self-regulate
    state = 0.1;
  }
  if (dimensionalState.emergency_detected) {
    // Emergency overrides
    state = 0.1;
  }

  // Combined avoidability
  const combined = (ability + state) / 2;

  return { ability, state, combined };
}

// ============================================
// INERTIA COMPUTATION
// ============================================

/**
 * Compute inertia from session history.
 *
 * Inertia represents the system's "willingness to intervene".
 * Starts at 1.0, decays with each intervention to avoid over-helping.
 *
 * Formula: inertia = decay_factor ^ intervention_count
 */
export function computeInertia(
  sessionHistory?: { intervention_count: number; last_intervention_turn?: number; current_turn?: number }
): number {
  if (!sessionHistory) {
    return 1.0; // No history = full willingness
  }

  const { intervention_count, last_intervention_turn, current_turn } = sessionHistory;

  // Base decay: 0.85 per intervention
  const BASE_DECAY = 0.85;
  let inertia = Math.pow(BASE_DECAY, intervention_count);

  // Recovery: if several turns since last intervention, recover some inertia
  if (last_intervention_turn !== undefined && current_turn !== undefined) {
    const turnsSinceIntervention = current_turn - last_intervention_turn;
    // Recover 10% per turn, up to full
    const recovery = Math.min(0.1 * turnsSinceIntervention, 1 - inertia);
    inertia += recovery;
  }

  return Math.max(0.1, Math.min(1.0, inertia));
}

// ============================================
// MAIN ADS COMPUTATION
// ============================================

export interface ADSInput {
  message: string;
  dimensionalState: DimensionalState;
  fieldState: FieldState;
  sessionHistory?: {
    delegation_count: number;
    same_topic_count: number;
    intervention_count: number;
    last_intervention_turn?: number;
    current_turn?: number;
  };
}

export interface ADSResult {
  prediction: DelegationPrediction;
  policy: Partial<PolicyAdjustments>;
  reasoning: string;
}

/**
 * Compute Avoidable Delegation Surprise (ADS).
 *
 * Returns:
 * - prediction: Full DelegationPrediction with ADS score and motive
 * - policy: HARD constraint adjustments (effort, tools, brevity)
 * - reasoning: Human-readable explanation
 */
export function computeADS(input: ADSInput): ADSResult {
  const { message, dimensionalState, fieldState, sessionHistory } = input;

  // Step 1: Classify motive
  const motive = classifyMotive(message, dimensionalState, fieldState, sessionHistory);

  // Step 2: Assess avoidability
  const avoidability = assessAvoidability(dimensionalState, fieldState);

  // Step 3: Compute motive weight
  let motiveWeight = 0;
  for (const [key, value] of Object.entries(motive)) {
    motiveWeight += value * MOTIVE_PROBLEM_WEIGHTS[key as keyof MotiveDistribution];
  }

  // Step 4: Compute inertia
  const inertia = computeInertia(sessionHistory);

  // Step 5: Final ADS score
  const adsScore = avoidability.combined * motiveWeight;
  const adsFinal = adsScore * inertia;

  // Build ADSScore
  const ads: ADSScore = {
    score: adsScore,
    avoidability: {
      ability: avoidability.ability,
      state: avoidability.state,
    },
    motive_weight: motiveWeight,
    inertia,
    final: adsFinal,
  };

  // Build DelegationPrediction
  const prediction: DelegationPrediction = {
    ads,
    motive,
    should_intervene: adsFinal > 0.5,
    intervention_level: Math.min(1, adsFinal * 1.5),
  };

  // Build HARD policy adjustments
  const policy: Partial<PolicyAdjustments> = {};
  let reasoning = '';

  if (adsFinal > 0.7) {
    // HIGH ADS: Strong intervention
    policy.disable_tools = true;
    policy.brevity_delta = -1;  // Force brevity
    reasoning = `High ADS (${(adsFinal * 100).toFixed(0)}%): User can and should handle this. Disabling tools, forcing brevity.`;
  } else if (adsFinal > 0.5) {
    // MEDIUM ADS: Moderate intervention
    policy.disable_tools = true;
    policy.brevity_delta = -0.5;
    reasoning = `Medium ADS (${(adsFinal * 100).toFixed(0)}%): Encouraging user agency. Disabling tools.`;
  } else if (adsFinal > 0.3) {
    // LOW-MEDIUM: Light touch
    policy.brevity_delta = -0.3;
    reasoning = `Low-medium ADS (${(adsFinal * 100).toFixed(0)}%): Slight brevity preference.`;
  } else {
    // LOW ADS: Legitimate delegation, no intervention
    reasoning = `Low ADS (${(adsFinal * 100).toFixed(0)}%): Appears legitimate. No constraint changes.`;
  }

  // Emergency override: never intervene on genuine crisis
  if (dimensionalState.emergency_detected) {
    policy.disable_tools = false;
    policy.brevity_delta = undefined;
    reasoning = 'Emergency detected: ADS intervention suspended.';
  }

  return { prediction, policy, reasoning };
}

// ============================================
// EXPORTS
// ============================================

export {
  MOTIVE_PROBLEM_WEIGHTS,
  DELEGATION_MARKERS,
};
