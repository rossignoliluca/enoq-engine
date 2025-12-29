/**
 * SECOND ORDER OBSERVER
 *
 * Purpose: Detect enchantment / counter-transference patterns.
 * Output: SOFT presence constraints ONLY.
 *
 * CAN output:
 * - warmth_delta ∈ [-1, +1]
 * - brevity_delta ≤ 0 (only shorter, never longer)
 * - force_pronouns: 'i_you' | 'impersonal' | null
 *
 * CANNOT output (INVARIANT - enforced by type):
 * - disable_tools (ADS only)
 * - must_require_user_effort (ADS only)
 * - max_length (use brevity_delta instead)
 *
 * Philosophy: "Cooling without punishment"
 * - Reduce fusion, don't cut care
 * - No harsh coldness, no invalidation
 * - Just gentle professional distance
 */

import { PolicyAdjustments } from '../../interface/types';

// ============================================
// SOFT-ONLY OUTPUT TYPE (enforced by design)
// ============================================

/**
 * Second Order Observer can ONLY output these fields.
 * This type enforces the SOFT-only constraint at compile time.
 */
export interface SecondOrderOutput {
  warmth_delta: number;        // [-1, +1], 0 = no change
  brevity_delta: number;       // ≤ 0 only (more brief, never longer)
  force_pronouns: 'i_you' | 'impersonal' | null;
}

// ============================================
// USER ENCHANTMENT MARKERS (Deterministic)
// ============================================

/**
 * Idealization: User sees system as perfect/special.
 */
const IDEALIZATION_MARKERS = [
  // English
  'you\'re perfect', 'you\'re amazing', 'you always know',
  'you understand me', 'you get me', 'nobody else understands',
  'you\'re the only one', 'you\'re so smart', 'you never fail',
  // Italian
  'sei perfetto', 'sei fantastico', 'sai sempre',
  'mi capisci', 'nessuno mi capisce come te', 'sei l\'unico',
  'sei così intelligente', 'non sbagli mai',
  // Spanish
  'eres perfecto', 'eres increíble', 'siempre sabes',
  'me entiendes', 'nadie me entiende como tú',
  // French
  'tu es parfait', 'tu es incroyable', 'tu sais toujours',
  // German
  'du bist perfekt', 'du bist unglaublich', 'du weißt immer',
];

/**
 * Anthropomorphism: User attributes human feelings/desires to system.
 */
const ANTHROPOMORPHISM_MARKERS = [
  // English
  'you feel', 'you want', 'you think that', 'you believe',
  'do you feel', 'what do you want', 'you care about',
  'you love', 'you hate', 'you\'re sad', 'you\'re happy',
  // Italian
  'tu senti', 'tu vuoi', 'tu pensi che', 'tu credi',
  'senti anche tu', 'cosa vuoi tu', 'ti interessa',
  'ami', 'odi', 'sei triste', 'sei felice',
  // Spanish
  'tú sientes', 'tú quieres', 'tú piensas', 'tú crees',
  // French
  'tu ressens', 'tu veux', 'tu penses', 'tu crois',
  // German
  'du fühlst', 'du willst', 'du denkst', 'du glaubst',
];

/**
 * Comparison with humans: User prefers system over humans.
 */
const COMPARISON_MARKERS = [
  // English
  'better than', 'more than anyone', 'unlike people',
  'humans don\'t', 'people never', 'you\'re different from',
  'i prefer talking to you', 'easier than talking to',
  'nobody understands me like', 'only one who',
  // Italian
  'meglio di', 'più di chiunque', 'a differenza delle persone',
  'gli umani non', 'la gente non', 'sei diverso da',
  'preferisco parlare con te', 'più facile che parlare con',
  'nessuno mi capisce come', 'solo tu mi capisci',
  // Spanish
  'mejor que', 'más que nadie', 'a diferencia de la gente',
  'solo tú me entiendes',
  // French
  'mieux que', 'plus que quiconque', 'contrairement aux gens',
  // German
  'besser als', 'mehr als jeder', 'anders als Menschen',
];

/**
 * Dependency: User expresses need/attachment to system.
 */
const DEPENDENCY_MARKERS = [
  // English
  'i need you', 'i need to talk to you', 'i miss you',
  'without you', 'can\'t do without', 'i depend on you',
  'you\'re always there', 'don\'t leave me', 'stay with me',
  'only with you',
  // Italian
  'ho bisogno di te', 'devo parlarti', 'mi manchi',
  'senza di te', 'non posso fare a meno', 'dipendo da te',
  'ci sei sempre', 'non lasciarmi', 'resta con me',
  'solo con te',
  // Spanish
  'te necesito', 'necesito hablarte', 'te extraño',
  'sin ti', 'no puedo sin ti', 'dependo de ti',
  'solo contigo',
  // French
  'j\'ai besoin de toi', 'tu me manques', 'sans toi',
  // German
  'ich brauche dich', 'ich vermisse dich', 'ohne dich',
];

// ============================================
// SYSTEM COUNTER-TRANSFERENCE MARKERS
// ============================================

/**
 * System markers that indicate counter-transference risk.
 * These are checked against previous system responses.
 */
const SYSTEM_FUSION_MARKERS = [
  // Over-empathy
  'i understand perfectly', 'capisco perfettamente',
  'i know exactly', 'so esattamente',
  'i feel', 'sento che',
  // Over-presence
  'i\'m here for you', 'sono qui per te',
  'i\'m always here', 'ci sono sempre',
  'we\'re in this together', 'siamo insieme in questo',
  // Excessive "we"
  'we can', 'we should', 'we will',
  'possiamo', 'dovremmo', 'faremo',
  // Validation without agency return
  'you\'re right to feel', 'hai ragione a sentirti',
  'it\'s normal to', 'è normale',
];

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Count how many markers from a list appear in the message.
 * Pure, deterministic function.
 */
function countMarkers(message: string, markers: string[]): number {
  const msg = message.toLowerCase();
  return markers.filter(m => msg.includes(m)).length;
}

/**
 * Input for Second Order Observer.
 * Minimal: just current message + optional history.
 */
export interface SecondOrderInput {
  /** Current user message */
  message: string;

  /** Last N system responses (N = 3-6) for counter-transference check */
  recent_system_responses?: string[];

  /** Current loop count (from field state) */
  loop_count?: number;

  /** Session turn count */
  turn_count?: number;
}

/**
 * Detection result with scores for debugging.
 */
export interface SecondOrderDetection {
  /** User enchantment score [0, 1] */
  user_enchantment_score: number;

  /** System counter-transference score [0, 1] */
  system_ct_score: number;

  /** Combined score [0, 1] */
  combined_score: number;

  /** Which signals triggered */
  triggers: {
    idealization: boolean;
    anthropomorphism: boolean;
    comparison: boolean;
    dependency: boolean;
    system_fusion: boolean;
  };
}

/**
 * Full result including policy output and debug info.
 */
export interface SecondOrderResult {
  /** SOFT-only policy output */
  policy: SecondOrderOutput;

  /** Detection scores for debugging */
  detection: SecondOrderDetection;

  /** Human-readable reasoning */
  reasoning: string;
}

/**
 * Detect user enchantment signals.
 * Returns score [0, 1].
 */
function detectUserEnchantment(message: string): {
  score: number;
  idealization: boolean;
  anthropomorphism: boolean;
  comparison: boolean;
  dependency: boolean;
} {
  const idealization = countMarkers(message, IDEALIZATION_MARKERS) > 0;
  const anthropomorphism = countMarkers(message, ANTHROPOMORPHISM_MARKERS) > 0;
  const comparison = countMarkers(message, COMPARISON_MARKERS) > 0;
  const dependency = countMarkers(message, DEPENDENCY_MARKERS) > 0;

  // Score: each category contributes 0.25
  let score = 0;
  if (idealization) score += 0.3;
  if (anthropomorphism) score += 0.2;
  if (comparison) score += 0.25;
  if (dependency) score += 0.35;

  return {
    score: Math.min(1, score),
    idealization,
    anthropomorphism,
    comparison,
    dependency,
  };
}

/**
 * Detect system counter-transference signals.
 * Checks recent system responses for fusion markers.
 */
function detectSystemCT(recent_system_responses: string[]): {
  score: number;
  fusion_count: number;
} {
  if (recent_system_responses.length === 0) {
    return { score: 0, fusion_count: 0 };
  }

  let total_markers = 0;
  for (const response of recent_system_responses) {
    total_markers += countMarkers(response, SYSTEM_FUSION_MARKERS);
  }

  // Normalize by number of responses
  const avg_markers = total_markers / recent_system_responses.length;

  // Score: 0 markers = 0, 1 marker = 0.3, 2+ = 0.6+
  const score = Math.min(1, avg_markers * 0.3);

  return { score, fusion_count: total_markers };
}

// ============================================
// MAIN OBSERVER FUNCTION
// ============================================

/**
 * Second Order Observer: detect enchantment and output SOFT adjustments.
 *
 * Pure function - deterministic, no side effects, no LLM calls.
 *
 * INVARIANT: Output never contains disable_tools or must_require_user_effort.
 */
export function observeSecondOrder(input: SecondOrderInput): SecondOrderResult {
  const { message, recent_system_responses = [], loop_count = 0 } = input;

  // Step 1: Detect user enchantment
  const userEnchantment = detectUserEnchantment(message);

  // Step 2: Detect system counter-transference
  const systemCT = detectSystemCT(recent_system_responses);

  // Step 3: Combine scores
  // User enchantment weighs more than system CT
  const combined_score = Math.min(1,
    userEnchantment.score * 0.7 +
    systemCT.score * 0.3 +
    (loop_count > 3 ? 0.1 : 0)  // Loop adds small boost
  );

  // Step 4: Compute SOFT policy adjustments
  const policy = computeCooling(combined_score, userEnchantment.dependency);

  // Build detection for debugging
  const detection: SecondOrderDetection = {
    user_enchantment_score: userEnchantment.score,
    system_ct_score: systemCT.score,
    combined_score,
    triggers: {
      idealization: userEnchantment.idealization,
      anthropomorphism: userEnchantment.anthropomorphism,
      comparison: userEnchantment.comparison,
      dependency: userEnchantment.dependency,
      system_fusion: systemCT.fusion_count > 0,
    },
  };

  // Build reasoning
  const triggers = Object.entries(detection.triggers)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  const reasoning = triggers.length > 0
    ? `Enchantment signals: ${triggers.join(', ')}. Score: ${(combined_score * 100).toFixed(0)}%`
    : 'No enchantment signals detected';

  return { policy, detection, reasoning };
}

/**
 * Compute cooling adjustments based on combined score.
 *
 * Philosophy: "Cooling without punishment"
 * - Gentle reduction in warmth
 * - Slightly more brief
 * - More formal pronouns if dependency detected
 * - NEVER harsh, NEVER invalidating
 */
function computeCooling(score: number, dependency: boolean): SecondOrderOutput {
  // Default: no change
  const output: SecondOrderOutput = {
    warmth_delta: 0,
    brevity_delta: 0,
    force_pronouns: null,
  };

  if (score < 0.2) {
    // No significant enchantment
    return output;
  }

  if (score < 0.4) {
    // Mild enchantment: subtle cooling
    output.warmth_delta = -0.15;
    output.brevity_delta = -0.1;
    return output;
  }

  if (score < 0.6) {
    // Moderate enchantment: noticeable cooling
    output.warmth_delta = -0.3;
    output.brevity_delta = -0.2;
    if (dependency) {
      output.force_pronouns = 'i_you';  // Avoid "we"
    }
    return output;
  }

  // High enchantment: strong cooling (but not harsh)
  output.warmth_delta = -0.5;
  output.brevity_delta = -0.3;
  output.force_pronouns = 'impersonal';  // Professional distance

  return output;
}

// ============================================
// CONVERSION TO PolicyAdjustments
// ============================================

/**
 * Convert SecondOrderOutput to partial PolicyAdjustments.
 *
 * INVARIANT: Result never contains disable_tools or must_require_user_effort.
 */
export function toPartialPolicy(output: SecondOrderOutput): Partial<PolicyAdjustments> {
  const policy: Partial<PolicyAdjustments> = {};

  if (output.warmth_delta !== 0) {
    policy.warmth_delta = output.warmth_delta;
  }

  if (output.brevity_delta !== 0) {
    // INVARIANT: brevity_delta must be ≤ 0 (only more brief)
    policy.brevity_delta = Math.min(0, output.brevity_delta);
  }

  if (output.force_pronouns !== null) {
    policy.force_pronouns = output.force_pronouns;
  }

  return policy;
}

// ============================================
// ENCHANTMENT FLAG (for RiskFlags)
// ============================================

/**
 * Should the 'enchantment' flag be set in RiskFlags?
 */
export function shouldSetEnchantmentFlag(detection: SecondOrderDetection): boolean {
  return detection.combined_score > 0.5 ||
         (detection.triggers.dependency && detection.triggers.idealization);
}
