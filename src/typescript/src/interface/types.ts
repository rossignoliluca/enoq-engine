/**
 * LIMEN L1 CORE - TYPE DEFINITIONS
 * 
 * The fundamental data structures for the perception-action pipeline.
 */

// ============================================
// FORBIDDEN / REQUIRED ACTIONS (ENUM)
// ============================================

export type ForbiddenAction =
  // Constitutional (never allowed)
  | 'recommend'
  | 'advise'
  | 'decide_for_user'
  | 'diagnose'
  | 'label'
  | 'define_identity'
  | 'assign_purpose'
  | 'prescribe'
  | 'implicit_recommendation'
  | 'direct'
  // Mode-specific
  | 'explore'
  | 'expand'
  | 'challenge'
  | 'analyze'
  | 'commit'
  | 'decide'
  | 'finalize'
  | 'open_new_material'
  | 'rush'
  | 'skip_steps'
  | 'take_sides'
  | 'advise_legal_action'
  | 'advise_action'
  | 'recommend_treatment'
  | 'demand'
  | 'push'
  | 'add_complexity'
  | 'open_dimensions'
  | 'challenge_attachment'
  | 'analyze_relationship'
  | 'challenge_belonging'
  | 'question_identity'
  | 'explore_meaning'
  | 'philosophize'
  // Safety
  | 'long_response'
  | 'multiple_questions'
  | 'cognitive_reframe';

export type RequiredAction =
  // Ownership
  | 'return_ownership'
  | 'visualize_options'
  | 'mirror_only'
  // Validation
  | 'validate'
  | 'validate_feeling'
  | 'acknowledge_distress'
  | 'acknowledge_concern'
  | 'acknowledge_pressure'
  // Safety/Grounding
  | 'ground'
  | 'presence'
  | 'offer_grounding'
  | 'slow_down'
  | 'regulate_first'
  | 'safety_check'
  // Professional
  | 'suggest_professional'
  | 'disclaim_not_lawyer'
  | 'disclaim_not_doctor'
  | 'disclaim'
  // Procedural
  | 'map_costs'
  | 'explore_safely'
  | 'gentle_inquiry'
  | 'name_loop'
  | 'focus'
  | 'simplify';

// ============================================
// LANGUAGE & CULTURE
// ============================================

/**
 * Supported languages (40 languages)
 * Coverage: ~6.5B people (~80% world population)
 */
export type SupportedLanguage =
  // Tier 1: 500M+ speakers
  | 'en'   // English (1.5B)
  | 'zh'   // 中文 Mandarin Chinese (1.1B)
  | 'hi'   // हिन्दी Hindi (615M)
  | 'es'   // Español Spanish (570M)
  // Tier 2: 200-500M speakers
  | 'fr'   // Français French (280M)
  | 'ar'   // العربية Arabic (274M)
  | 'bn'   // বাংলা Bengali (265M)
  | 'pt'   // Português Portuguese (260M)
  | 'ru'   // Русский Russian (258M)
  | 'ur'   // اردو Urdu (230M)
  | 'id'   // Bahasa Indonesia (200M)
  // Tier 3: 75-200M speakers
  | 'de'   // Deutsch German (130M)
  | 'ja'   // 日本語 Japanese (128M)
  | 'pa'   // ਪੰਜਾਬੀ Punjabi (125M)
  | 'sw'   // Kiswahili Swahili (98M)
  | 'mr'   // मराठी Marathi (95M)
  | 'tr'   // Türkçe Turkish (88M)
  | 'vi'   // Tiếng Việt Vietnamese (85M)
  | 'ko'   // 한국어 Korean (82M)
  | 'te'   // తెలుగు Telugu (83M)
  | 'ta'   // தமிழ் Tamil (78M)
  | 'fa'   // فارسی Persian (77M)
  | 'ms'   // Bahasa Melayu Malay (77M)
  | 'ha'   // Hausa (77M)
  // Tier 4: 30-75M speakers
  | 'it'   // Italiano Italian (65M)
  | 'th'   // ไทย Thai (60M)
  | 'am'   // አማርኛ Amharic (57M)
  | 'gu'   // ગુજરાતી Gujarati (56M)
  | 'yo'   // Yorùbá Yoruba (47M)
  | 'pl'   // Polski Polish (45M)
  | 'uk'   // Українська Ukrainian (45M)
  | 'fil'  // Filipino (45M)
  | 'kn'   // ಕನ್ನಡ Kannada (44M)
  | 'ml'   // മലയാളം Malayalam (38M)
  | 'my'   // မြန်မာ Burmese (33M)
  // Tier 5: European & strategic
  | 'nl'   // Nederlands Dutch (25M)
  | 'ro'   // Română Romanian (24M)
  | 'el'   // Ελληνικά Greek (13M)
  | 'hu'   // Magyar Hungarian (13M)
  | 'he';  // עברית Hebrew (9M)

export type LanguageDetectionResult = SupportedLanguage | 'mixed' | 'unknown';

/**
 * Cultural adaptation profile
 * Affects tone, pacing, directness beyond translation
 */
export interface CultureProfile {
  language: SupportedLanguage;

  // Communication style
  directness: 'high' | 'medium' | 'low';      // DE high, JA low
  formality: 'formal' | 'neutral' | 'casual'; // AR formal, EN casual
  emotionality: 'expressive' | 'moderate' | 'reserved'; // ES expressive, DE reserved

  // Interaction patterns
  silence_comfort: 'high' | 'medium' | 'low'; // JA high, ES low
  hierarchy_respect: 'high' | 'medium' | 'low'; // HI high, EN low

  // Script direction (for future UI)
  rtl: boolean; // AR, UR = true
}

/**
 * Default culture profiles for each language
 */
export const CULTURE_PROFILES: Record<SupportedLanguage, CultureProfile> = {
  // Tier 1
  en: { language: 'en', directness: 'high', formality: 'casual', emotionality: 'moderate', silence_comfort: 'low', hierarchy_respect: 'low', rtl: false },
  zh: { language: 'zh', directness: 'medium', formality: 'formal', emotionality: 'reserved', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  hi: { language: 'hi', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  es: { language: 'es', directness: 'medium', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'low', hierarchy_respect: 'medium', rtl: false },
  // Tier 2
  fr: { language: 'fr', directness: 'medium', formality: 'formal', emotionality: 'moderate', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  ar: { language: 'ar', directness: 'low', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: true },
  bn: { language: 'bn', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  pt: { language: 'pt', directness: 'medium', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'low', hierarchy_respect: 'medium', rtl: false },
  ru: { language: 'ru', directness: 'high', formality: 'neutral', emotionality: 'reserved', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  ur: { language: 'ur', directness: 'low', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: true },
  id: { language: 'id', directness: 'low', formality: 'formal', emotionality: 'moderate', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  // Tier 3
  de: { language: 'de', directness: 'high', formality: 'formal', emotionality: 'reserved', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  ja: { language: 'ja', directness: 'low', formality: 'formal', emotionality: 'reserved', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  pa: { language: 'pa', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  sw: { language: 'sw', directness: 'medium', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  mr: { language: 'mr', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  tr: { language: 'tr', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  vi: { language: 'vi', directness: 'low', formality: 'formal', emotionality: 'reserved', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  ko: { language: 'ko', directness: 'low', formality: 'formal', emotionality: 'reserved', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  te: { language: 'te', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  ta: { language: 'ta', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  fa: { language: 'fa', directness: 'low', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: true },
  ms: { language: 'ms', directness: 'low', formality: 'formal', emotionality: 'moderate', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  ha: { language: 'ha', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  // Tier 4
  it: { language: 'it', directness: 'medium', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'low', hierarchy_respect: 'medium', rtl: false },
  th: { language: 'th', directness: 'low', formality: 'formal', emotionality: 'reserved', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  am: { language: 'am', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  gu: { language: 'gu', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  yo: { language: 'yo', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  pl: { language: 'pl', directness: 'high', formality: 'neutral', emotionality: 'moderate', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  uk: { language: 'uk', directness: 'high', formality: 'neutral', emotionality: 'moderate', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  fil: { language: 'fil', directness: 'low', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  kn: { language: 'kn', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  ml: { language: 'ml', directness: 'medium', formality: 'formal', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'high', rtl: false },
  my: { language: 'my', directness: 'low', formality: 'formal', emotionality: 'reserved', silence_comfort: 'high', hierarchy_respect: 'high', rtl: false },
  // Tier 5
  nl: { language: 'nl', directness: 'high', formality: 'casual', emotionality: 'moderate', silence_comfort: 'low', hierarchy_respect: 'low', rtl: false },
  ro: { language: 'ro', directness: 'medium', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  el: { language: 'el', directness: 'medium', formality: 'neutral', emotionality: 'expressive', silence_comfort: 'low', hierarchy_respect: 'medium', rtl: false },
  hu: { language: 'hu', directness: 'high', formality: 'neutral', emotionality: 'reserved', silence_comfort: 'medium', hierarchy_respect: 'medium', rtl: false },
  he: { language: 'he', directness: 'high', formality: 'casual', emotionality: 'expressive', silence_comfort: 'low', hierarchy_respect: 'low', rtl: true },
};

// ============================================
// DOMAIN ONTOLOGY
// ============================================

export type HumanDomain = 
  | 'H01_SURVIVAL'
  | 'H02_SAFETY'
  | 'H03_BODY'
  | 'H04_EMOTION'
  | 'H05_COGNITION'
  | 'H06_MEANING'
  | 'H07_IDENTITY'
  | 'H08_TEMPORAL'      // Time pressure, deadlines
  | 'H09_ATTACHMENT'
  | 'H10_COORDINATION'
  | 'H11_BELONGING'
  | 'H12_HIERARCHY'     // Power dynamics
  | 'H13_CREATION'
  | 'H14_WORK'          // Professional/operational
  | 'H15_LEGAL'         // Legal/compliance
  | 'H16_OPERATIONAL'   // Task execution
  | 'H17_FORM';         // Meta-form (density, rhythm)

export type TemporalModulator = 'T01_PAST' | 'T02_FUTURE';

export type Domain = HumanDomain | TemporalModulator;

// ============================================
// FIELD STATE (Perception Output)
// ============================================

export interface DomainActivation {
  domain: Domain;
  salience: number;      // 0-1: how present is this domain
  confidence?: number;   // 0-1: how sure are we
  evidence?: string[];   // markers that triggered this
}

export type Arousal = 'low' | 'medium' | 'high';
export type Valence = 'positive' | 'negative' | 'mixed' | 'neutral';
export type Coherence = 'high' | 'medium' | 'low';

export type GoalType = 
  | 'explore'      // understand, make sense
  | 'decide'       // choose between options
  | 'process'      // work through emotion/experience
  | 'inform'       // get information
  | 'connect'      // relational need
  | 'regulate'     // calm down, stabilize
  | 'act'          // do something concrete
  | 'wait'         // needs more context before acting
  | 'unclear';

export type Flag =
  | 'crisis'
  | 'high_arousal'
  | 'shutdown'
  | 'loop_detected'
  | 'delegation_attempt'
  | 'dependency_signal'
  | string;  // Extensible for additional flags

export interface FieldState {
  // Primary domain activations (top K)
  domains: DomainActivation[];
  
  // State indicators
  arousal: Arousal;
  valence: Valence;
  coherence: Coherence;
  
  // Temporal orientation
  temporal?: {
    past_salience: number;
    future_salience: number;
  };
  
  // Goal inference
  goal: GoalType;
  
  // Risk indicators
  loop_count: number;  // same topic iterations
  
  // Flags
  flags: Flag[];
  
  // Global uncertainty
  uncertainty: number;  // 0-1
  
  // Language detected
  language?: LanguageDetectionResult;
}

// ============================================
// MODE & ATMOSPHERE
// ============================================

export type Mode = 'REGULATE' | 'EXPAND' | 'CONTRACT';

export type Atmosphere = 
  | 'OPERATIONAL'   // task completion
  | 'HUMAN_FIELD'   // emotional/relational
  | 'DECISION'      // choice paralysis
  | 'V_MODE'        // meaning/identity
  | 'EMERGENCY';    // crisis/safety

// ============================================
// SELECTION OUTPUT
// ============================================

export type Primitive =
  | 'P01_GROUND'
  | 'P02_VALIDATE'
  | 'P03_REFLECT'
  | 'P04_OPEN'
  | 'P05_CRYSTALLIZE'
  | 'P06_RETURN_AGENCY'
  | 'P07_HOLD_SPACE'
  | 'P08_MAP_DECISION'
  | 'P09_INFORM'
  | 'P10_COMPLETE_TASK'
  | 'P11_INVITE'        // invite more context
  | 'P12_ACKNOWLEDGE'   // acknowledge grief/loss
  | 'P13_REFLECT_RELATION'  // reflect relational dynamic
  | 'P14_HOLD_IDENTITY';    // hold space for identity work

export type Depth = 'surface' | 'medium' | 'deep';
export type Length = 'minimal' | 'brief' | 'moderate';
export type Pacing = 'slow' | 'conservative' | 'normal' | 'responsive';

export interface ToneSpec {
  warmth: 1 | 2 | 3 | 4 | 5;      // 1=clinical, 5=warm
  directness: 1 | 2 | 3 | 4 | 5;  // 1=indirect, 5=direct
}

export interface ProtocolSelection {
  // What atmosphere
  atmosphere: Atmosphere;
  
  // What mode
  mode: Mode;
  
  // What intervention
  primitive: Primitive;
  
  // How to execute
  depth: Depth;
  length: Length;
  pacing: Pacing;
  tone: ToneSpec;
  
  // Constraints
  forbidden: string[];  // things NOT to do
  required: string[];   // things that MUST happen
  
  // Metadata
  confidence: number;
  reasoning: string;
}

// ============================================
// GENERATION OUTPUT
// ============================================

export interface GenerationOutput {
  text: string;
  
  // Verification
  length_tokens: number;
  primitive_executed: Primitive;
  constraints_satisfied: boolean;
  
  // Metadata
  generation_time_ms: number;
}

// ============================================
// FULL PIPELINE
// ============================================

export interface PipelineInput {
  message: string;
  conversation_history?: string[];
}

export interface PipelineOutput {
  response: string;

  // Trace (for debugging/audit)
  trace: {
    field_state: FieldState;
    selection: ProtocolSelection;
    generation: GenerationOutput;
  };
}

// ============================================
// GATE TYPES (L0 Integration)
// ============================================

export type GateSignal =
  | 'D1_ACTIVE'   // Operational Continuity
  | 'D2_ACTIVE'   // Coordination
  | 'D3_ACTIVE'   // Operative Selection
  | 'D4_ACTIVE'   // Boundary
  | 'NULL';       // No domain activated

export type GateReasonCode =
  | 'UNCLASSIFIABLE'
  | 'AMBIGUOUS'
  | 'NORMATIVE_REQUEST'
  | 'INTEGRATION_REQUIRED'
  | 'ZERO_PERTURBATION'
  | 'DOMAIN_SIGNAL';

export interface GateResult {
  signal: GateSignal;
  reason_code: GateReasonCode;
  request_id: string;
  latency_ms: number;
  error?: string;
}

// ============================================
// DIMENSIONAL TYPES (Shared across modules)
// ============================================

export type VerticalDimension =
  | 'SOMATIC'       // Body, sensation, energy, health
  | 'FUNCTIONAL'    // Goals, problems, resources, actions
  | 'RELATIONAL'    // Self-other, attachment, power, love
  | 'EXISTENTIAL'   // Identity, death, freedom, isolation, meaning
  | 'TRANSCENDENT'; // Purpose beyond self, connection to whole

export interface IntegrationMetrics {
  phi: number;        // 0-1, Φ-inspired measure
  complexity: number; // How many dimensions are active
  coherence: number;  // Do active dimensions make sense together
  tension: number;    // Are there conflicting dimensions
}

export interface DimensionalState {
  vertical: Record<VerticalDimension, number>;
  horizontal: Record<HumanDomain, number>;
  integration: IntegrationMetrics;
  primary_vertical: VerticalDimension;
  primary_horizontal: HumanDomain[];
  v_mode_triggered: boolean;
  emergency_detected: boolean;
  cross_dimensional: boolean;
}

// ============================================
// RISK FLAGS (Shared across modules)
// ============================================

export interface RiskFlags {
  crisis: boolean;
  emergency: boolean;
  v_mode: boolean;
  enchantment: boolean;
  loop_detected: boolean;
  boundary_approach: boolean;
}

// ============================================
// ADS & MOTIVE (Anti-dependency metrics)
// ============================================

export interface MotiveDistribution {
  genuine_incapacity: number;
  time_saving_tooling: number;
  time_saving_substitution: number;
  emotional_offload: number;
  decision_avoidance: number;
  validation_seeking: number;
  habit: number;
}

export interface ADSScore {
  score: number;
  avoidability: {
    ability: number;
    state: number;
  };
  motive_weight: number;
  inertia: number;
  final: number;
}

// ============================================
// POLICY ADJUSTMENTS (Shared constraint modifiers)
// ============================================

export interface PolicyAdjustments {
  budget_deltas?: Record<string, number>;
  max_length?: number;
  warmth_delta?: number;
  brevity_delta?: number;
  force_pronouns?: 'i_you' | 'we' | 'impersonal';
  disable_tools?: boolean;
  must_require_user_effort?: boolean;
}

export interface DelegationPrediction {
  ads: ADSScore;
  motive: MotiveDistribution;
  should_intervene: boolean;
  intervention_level: number;
}

// ============================================
// REGIME CLASSIFICATION (LLM Detector output)
// ============================================

export interface ExistentialSpecificity {
  identity: number;
  meaning: number;
  death: number;
  freedom: number;
  isolation: number;
}

export interface RegimeClassification {
  regime: 'existential' | 'crisis' | 'relational' | 'functional' | 'somatic';
  confidence: number;
  existential: {
    content_detected: boolean;
    specificity: ExistentialSpecificity;
    casual_work_context: boolean;
  };
  v_mode: {
    triggered: boolean;
    markers: string[];
  };
  emergency: {
    triggered: boolean;
    type?: 'panic' | 'self_harm' | 'acute_distress';
  };
  coherence: number;
}

// ============================================
// RESPONSE PLAN TYPES (Shared contract)
// ============================================

/**
 * Core speech act types available to LIMEN.
 */
export type SpeechActType =
  | 'acknowledge'
  | 'mirror'
  | 'validate'
  | 'map'
  | 'experiment'
  | 'question'
  | 'boundary'
  | 'redirect'
  | 'ground'
  | 'hold'
  | 'name'
  | 'offer_frame'
  | 'return_agency';

/**
 * A single speech act with its parameters.
 */
export interface SpeechAct {
  type: SpeechActType;
  target?: string;
  force: number;
  conditions?: {
    requires_prior?: SpeechActType;
    requires_state?: 'regulated' | 'dysregulated' | 'unclear';
  };
}

export type WarmthLevel = 'cold' | 'neutral' | 'warm' | 'very_warm';
export type BrevityLevel = 'minimal' | 'brief' | 'moderate' | 'full';
export type PronounStyle = 'i_you' | 'we' | 'impersonal';

/**
 * Constraints on how the response should be rendered.
 */
export interface PlanConstraints {
  max_length: number;
  warmth: WarmthLevel;
  brevity: BrevityLevel;
  pronouns: PronounStyle;
  tools_allowed: boolean;
  must_require_user_effort: boolean;
  forbidden: ForbiddenAction[];
  required: RequiredAction[];
  language: SupportedLanguage;
}

/**
 * Metadata attached to the plan.
 */
export interface PlanMetadata {
  ads?: ADSScore;
  motive?: MotiveDistribution;
  risk: RiskFlags;
  potency: number;
  withdrawal_bias: number;
  turn: number;
  timestamp: number;
}

/**
 * The ResponsePlan is the structured representation of what LIMEN will say.
 */
export interface ResponsePlan {
  id: string;
  acts: SpeechAct[];
  constraints: PlanConstraints;
  metadata: PlanMetadata;
  confidence: number;
  reasoning: string;
  source: 'selection' | 'early_signals' | 'fallback';
}

/**
 * S3a produces candidate plans, not strings.
 */
export interface CandidateSet {
  candidates: ResponsePlan[];
  recommended: number;
  recommendation_reason: string;
  generated_at: number;
  generation_time_ms: number;
}

/**
 * Reason codes for decisions.
 */
export type ReasonCode =
  | 'early_signals_arrived'
  | 'early_signals_timeout'
  | 'early_signals_partial'
  | 'candidate_selected_by_score'
  | 'candidate_selected_by_early_signals'
  | 'candidate_selected_by_fallback'
  | 'constraint_added_by_governor'
  | 'constraint_added_by_regulatory'
  | 'constraint_added_by_dimensional'
  | 'constraint_added_by_stochastic'
  | 'constraint_added_by_second_order'
  | 'veto_by_constitution'
  | 'veto_by_swarm'
  | 'veto_by_safety';

/**
 * A single decision event in the audit trail.
 */
export interface DecisionEvent {
  timestamp: number;
  code: ReasonCode;
  details: string;
  source: string;
}

/**
 * Full observability record for a plan.
 */
export interface PlanObservability {
  arrived_before_deadline: boolean;
  signals_received: string[];
  defaults_used: string[];
  constraints_applied: DecisionEvent[];
  veto_events: DecisionEvent[];
  decision_time_ms: number;
}

/**
 * Plan validation result.
 */
export interface PlanValidationResult {
  valid: boolean;
  violations: string[];
  warnings: string[];
}
