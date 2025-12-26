/**
 * ENOQ L1 CORE - TYPE DEFINITIONS
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
  language?: 'en' | 'it' | 'mixed';
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
