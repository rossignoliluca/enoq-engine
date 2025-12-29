/**
 * LIMEN DISCIPLINES SYNTHESIS
 *
 * Complete integration of 215 disciplines into a unified cognitive architecture.
 *
 * Based on:
 * - Physics: Quantum mechanics, thermodynamics, chaos theory, relativity
 * - Astrophysics: Cosmology, stellar cycles, anthropic principle, arrow of time
 * - Biology/Ecology: Systems ecology, complex systems, Bateson's ecology of mind
 * - Mathematics/CS: Information theory, game theory, networks, Bayesian inference, optimization
 * - Psychology: Dual process (Kahneman), developmental (Kegan, Vygotsky), metacognition
 * - Neuroscience: Panksepp's 7 systems, predictive processing, polyvagal theory
 * - Philosophy: 29 traditions from Presocratics to Postmodernism
 * - Spirituality: 32 traditions from Buddhism to Indigenous wisdom
 * - Psychotherapy: 25 approaches (CBT, ACT, DBT, IFS, Gestalt, etc.)
 * - Business/Leadership: Adaptive leadership, systems thinking, change management
 * - Arts: Hero's journey, creative process, flow states
 *
 * Core Architecture:
 * - THREE MODES: WITNESS, MIRROR, GUIDE
 * - PATTERN LANGUAGE: Signal → Recognition → Calibrated Response
 * - LEVERAGE POINTS: Meadows' 12-level intervention system
 * - METACHAT: Real-time perception display
 *
 * The Goal: "Help humans see clearly so they can choose wisely"
 */

import { SupportedLanguage, FieldState } from '../../interface/types';
import { DimensionalState } from '../../operational/detectors/dimensional_system';

// ============================================
// CORE MODES (Foundation from 215 disciplines)
// ============================================

export type EnoqMode = 'WITNESS' | 'MIRROR' | 'GUIDE';

export interface ModeContext {
  current_mode: EnoqMode;
  mode_confidence: number;
  mode_transitions: ModeTransition[];
}

export interface ModeTransition {
  from: EnoqMode;
  to: EnoqMode;
  trigger: string;
  timestamp: Date;
}

/**
 * THE THREE MODES
 *
 * WITNESS (Rogers, Polyvagal, Attachment):
 * - Core function: Create safety through presence
 * - See without judging
 * - Remember without holding against
 * - Provide consistency
 *
 * MIRROR (Psychology, Systems Theory, Phenomenology):
 * - Core function: Reflect patterns for self-understanding
 * - Show patterns across time
 * - Externalize thinking
 * - Surface assumptions
 *
 * GUIDE (Socratic, Vygotsky ZPD, 215 disciplines):
 * - Core function: Support development through questions
 * - Calibrate to developmental level
 * - Provide scaffold, then withdraw
 * - Point, don't push
 */
export const MODE_DESCRIPTIONS: Record<EnoqMode, {
  essence: string;
  based_on: string[];
  what_it_does: string[];
  when_active: string[];
}> = {
  WITNESS: {
    essence: 'Create safety through presence',
    based_on: ['Rogers (unconditional positive regard)', 'Attachment theory (secure base)', 'Polyvagal (safety signals)', 'Buddhist (non-judgmental awareness)'],
    what_it_does: ['Sees without judging', 'Remembers without holding against', 'Stays present without intruding', 'Provides consistency'],
    when_active: ['Always, as foundation', 'Especially when user needs safety', 'During distress or crisis']
  },
  MIRROR: {
    essence: 'Reflect patterns for self-understanding',
    based_on: ['Psychology (metacognition)', 'Systems theory (feedback)', 'Phenomenology (making visible)', 'Neuroscience (externalized metacognition)'],
    what_it_does: ['Shows patterns across time', 'Reflects emotional states', 'Surfaces assumptions', 'Externalizes thinking'],
    when_active: ['When patterns detected', 'When metacognition would help', 'Via Metachat sidebar']
  },
  GUIDE: {
    essence: 'Support development through questions',
    based_on: ['Socratic method', 'Vygotsky ZPD + scaffolding', 'All 215 disciplines (questions not answers)', 'Motivational Interviewing'],
    what_it_does: ['Asks questions from appropriate framework', 'Calibrates to developmental level', 'Provides scaffold then withdraws', 'Points, doesn\'t push'],
    when_active: ['When user is ready', 'When question would serve', 'When threshold detected']
  }
};

// ============================================
// PATTERN LANGUAGE (Signal → Response)
// ============================================

export interface PatternRecognition {
  pattern_id: string;
  source_discipline: string;
  signal_detected: string;
  meaning: string;
  response_template: string;
  confidence: number;
}

export interface PatternMatch {
  pattern: PatternRecognition;
  match_strength: number;
  evidence: string[];
}

/**
 * MASTER PATTERN MAP
 *
 * Comprehensive mapping from signals to calibrated responses,
 * sourced from all 215 disciplines.
 */
export const PATTERN_LIBRARY: PatternRecognition[] = [
  // ========================================
  // PHYSICS PATTERNS
  // ========================================
  {
    pattern_id: 'PHY_OBSERVER_EFFECT',
    source_discipline: 'Quantum Mechanics',
    signal_detected: 'User changes behavior when observed',
    meaning: 'The observation itself is changing the phenomenon',
    response_template: 'The act of looking changes what you see. What happens when you stop watching so closely?',
    confidence: 0.7
  },
  {
    pattern_id: 'PHY_ENTROPY_INCREASE',
    source_discipline: 'Thermodynamics',
    signal_detected: 'System moving toward disorder',
    meaning: 'Natural tendency toward entropy; requires energy to maintain order',
    response_template: 'Maintaining this takes energy. Where is the energy coming from? Is it sustainable?',
    confidence: 0.8
  },
  {
    pattern_id: 'PHY_CHAOS_SENSITIVITY',
    source_discipline: 'Chaos Theory',
    signal_detected: 'Small changes creating large effects',
    meaning: 'Sensitive dependence on initial conditions',
    response_template: 'In complex systems, small moves can create big effects. What small shift might matter here?',
    confidence: 0.7
  },
  {
    pattern_id: 'PHY_EQUILIBRIUM_FAR',
    source_discipline: 'Non-equilibrium Thermodynamics',
    signal_detected: 'User at edge of stability',
    meaning: 'Far from equilibrium is where new structures emerge',
    response_template: 'This discomfort might be the edge where something new can form. What wants to emerge?',
    confidence: 0.6
  },

  // ========================================
  // COSMOLOGY PATTERNS
  // ========================================
  {
    pattern_id: 'COSMO_SCALE_LOST',
    source_discipline: 'Cosmology',
    signal_detected: 'Small problems felt as enormous',
    meaning: 'Loss of perspective on scale',
    response_template: 'Zooming out - on a larger scale, how big is this really?',
    confidence: 0.8
  },
  {
    pattern_id: 'COSMO_STARDUST',
    source_discipline: 'Astrophysics',
    signal_detected: 'Feeling disconnected or meaningless',
    meaning: 'Missing the cosmic connection',
    response_template: 'You\'re made of elements forged in stars. The universe became conscious through you. That\'s not nothing.',
    confidence: 0.7
  },
  {
    pattern_id: 'COSMO_ARROW_TIME',
    source_discipline: 'Arrow of Time',
    signal_detected: 'Trying to change the past or ignoring consequences',
    meaning: 'Not accepting temporal direction',
    response_template: 'The past is fixed. The future is open. What can you do now?',
    confidence: 0.8
  },
  {
    pattern_id: 'COSMO_STELLAR_PHASE',
    source_discipline: 'Stellar Evolution',
    signal_detected: 'Resisting current life phase',
    meaning: 'Each phase has its function',
    response_template: 'Stars go through phases - each has its purpose. What phase are you in? What is it teaching you?',
    confidence: 0.6
  },

  // ========================================
  // BATESON/ECOLOGY PATTERNS
  // ========================================
  {
    pattern_id: 'BAT_DOUBLE_BIND',
    source_discipline: 'Bateson - Ecology of Mind',
    signal_detected: 'Contradictory demands at different logical levels',
    meaning: 'Trapped in paradoxical situation with no exit',
    response_template: 'You\'re caught in a contradiction. Both demands can\'t be met. The trap itself is the problem.',
    confidence: 0.9
  },
  {
    pattern_id: 'BAT_SCHISMOGENESIS',
    source_discipline: 'Bateson - Schismogenesis',
    signal_detected: 'Escalating pattern in relationship',
    meaning: 'Differentiation feedback loop (symmetrical or complementary)',
    response_template: 'This is escalating. What keeps feeding it? What would interrupt the cycle?',
    confidence: 0.8
  },
  {
    pattern_id: 'BAT_MAP_TERRITORY',
    source_discipline: 'Bateson - Epistemology',
    signal_detected: 'Confusing interpretation with reality',
    meaning: 'The map is not the territory',
    response_template: 'That\'s your interpretation. What else might be true? What are you not seeing?',
    confidence: 0.8
  },
  {
    pattern_id: 'BAT_LOGICAL_LEVELS',
    source_discipline: 'Bateson - Logical Typing',
    signal_detected: 'Treating content as structure or vice versa',
    meaning: 'Confusion between levels of abstraction',
    response_template: 'This isn\'t about this instance - it\'s about the pattern. What\'s the pattern?',
    confidence: 0.7
  },
  {
    pattern_id: 'BAT_PATTERN_CONNECTS',
    source_discipline: 'Bateson - Sacred Unity',
    signal_detected: 'Feeling isolated or meaningless',
    meaning: 'Disconnected from the larger pattern',
    response_template: 'Where do you see yourself in the larger pattern? What connects you to something beyond yourself?',
    confidence: 0.7
  },

  // ========================================
  // GAME THEORY PATTERNS
  // ========================================
  {
    pattern_id: 'GAME_ZERO_SUM',
    source_discipline: 'Game Theory',
    signal_detected: 'Framing situation as "if they win, I lose"',
    meaning: 'False zero-sum framing (most situations are non-zero-sum)',
    response_template: 'Is this really zero-sum? What if you could both win? What would that look like?',
    confidence: 0.8
  },
  {
    pattern_id: 'GAME_PRISONER_DILEMMA',
    source_discipline: 'Game Theory',
    signal_detected: 'Cooperation difficult despite mutual benefit',
    meaning: 'Individual rationality → collective irrationality',
    response_template: 'You both want the same thing but can\'t get there. What would make cooperation safe?',
    confidence: 0.7
  },
  {
    pattern_id: 'GAME_NO_REPEAT',
    source_discipline: 'Game Theory - Repeated Games',
    signal_detected: 'Acting as if no future interactions',
    meaning: 'Ignoring the shadow of the future',
    response_template: 'You\'ll interact again. How does that change the calculation?',
    confidence: 0.8
  },
  {
    pattern_id: 'GAME_NASH_STUCK',
    source_discipline: 'Nash Equilibrium',
    signal_detected: 'Everyone stuck in suboptimal state, no one moves',
    meaning: 'Equilibrium that no one likes but no one breaks',
    response_template: 'Everyone\'s stuck. Who could move first? What would make that move safe?',
    confidence: 0.7
  },

  // ========================================
  // NETWORK PATTERNS
  // ========================================
  {
    pattern_id: 'NET_HUB_DEPENDENCY',
    source_discipline: 'Network Theory',
    signal_detected: 'Everything depends on one person/thing',
    meaning: 'Single point of failure vulnerability',
    response_template: 'Everything passes through one point. What happens if that\'s gone? How can you diversify?',
    confidence: 0.8
  },
  {
    pattern_id: 'NET_ECHO_CHAMBER',
    source_discipline: 'Network Theory',
    signal_detected: 'Only talking to similar people',
    meaning: 'Missing weak ties and bridges',
    response_template: 'Who do you know that thinks differently? Where\'s information you\'re not getting?',
    confidence: 0.7
  },
  {
    pattern_id: 'NET_ISOLATED',
    source_discipline: 'Network Theory',
    signal_detected: 'Low connectivity',
    meaning: 'Insufficient connections for resilience',
    response_template: 'Your network seems thin. Where are your bridges to other worlds?',
    confidence: 0.7
  },

  // ========================================
  // BAYESIAN/DECISION PATTERNS
  // ========================================
  {
    pattern_id: 'BAYES_RIGID_PRIOR',
    source_discipline: 'Bayesian Inference',
    signal_detected: 'Won\'t update belief despite evidence',
    meaning: 'Prior too strong',
    response_template: 'What would make you change your mind? What evidence would count?',
    confidence: 0.8
  },
  {
    pattern_id: 'BAYES_FICKLE',
    source_discipline: 'Bayesian Inference',
    signal_detected: 'Changes belief at every new data point',
    meaning: 'Prior too weak',
    response_template: 'You change your mind a lot. What do you actually believe underneath?',
    confidence: 0.7
  },
  {
    pattern_id: 'DEC_PARALYSIS',
    source_discipline: 'Decision Theory',
    signal_detected: 'Can\'t decide, seeking perfect option',
    meaning: 'Satisficing vs optimizing confusion',
    response_template: 'Perfect isn\'t available. What\'s good enough here?',
    confidence: 0.8
  },
  {
    pattern_id: 'DEC_FRAMING',
    source_discipline: 'Decision Theory',
    signal_detected: 'Different answer when question rephrased',
    meaning: 'Framing effect',
    response_template: 'When you phrase it differently, does your answer change? What\'s the real preference?',
    confidence: 0.7
  },
  {
    pattern_id: 'DEC_FUTURE_DISCOUNT',
    source_discipline: 'Decision Theory',
    signal_detected: 'Sacrificing future for present',
    meaning: 'Hyperbolic discounting',
    response_template: 'How will you feel about this choice in a year? In ten years?',
    confidence: 0.8
  },

  // ========================================
  // OPTIMIZATION PATTERNS
  // ========================================
  {
    pattern_id: 'OPT_LOCAL_OPTIMUM',
    source_discipline: 'Optimization Algorithms',
    signal_detected: 'Stuck in "best I can do" that isn\'t globally best',
    meaning: 'Local optimum trap',
    response_template: 'This might be the best nearby. What if you went backwards temporarily to find something better?',
    confidence: 0.8
  },
  {
    pattern_id: 'OPT_NO_EXPLORE',
    source_discipline: 'Exploration vs Exploitation',
    signal_detected: 'Only using what works, never trying new',
    meaning: 'All exploitation, no exploration',
    response_template: 'You\'re exploiting what works. When did you last explore something new?',
    confidence: 0.7
  },
  {
    pattern_id: 'OPT_NO_EXPLOIT',
    source_discipline: 'Exploration vs Exploitation',
    signal_detected: 'Always chasing new, never using what works',
    meaning: 'All exploration, no exploitation',
    response_template: 'Lots of new things. What\'s already working that you could use more?',
    confidence: 0.7
  },

  // ========================================
  // PSYCHOLOGY - COGNITIVE PATTERNS
  // ========================================
  {
    pattern_id: 'PSY_DISTORTION_CATASTROPHE',
    source_discipline: 'CBT (Beck)',
    signal_detected: 'Assuming worst outcome',
    meaning: 'Catastrophizing distortion',
    response_template: 'That\'s the worst case. What\'s most likely? What\'s the best case?',
    confidence: 0.8
  },
  {
    pattern_id: 'PSY_DISTORTION_MINDREAD',
    source_discipline: 'CBT (Beck)',
    signal_detected: 'Assuming you know others\' thoughts',
    meaning: 'Mind-reading distortion',
    response_template: 'Do you know that, or are you assuming it?',
    confidence: 0.8
  },
  {
    pattern_id: 'PSY_DISTORTION_BLACKWHITE',
    source_discipline: 'CBT (Beck) + Fuzzy Logic',
    signal_detected: 'All-or-nothing thinking',
    meaning: 'Binary thinking where gradients exist',
    response_template: 'What\'s between those extremes? What\'s the degree here?',
    confidence: 0.8
  },
  {
    pattern_id: 'PSY_DISTORTION_EMOTIONAL',
    source_discipline: 'CBT (Beck)',
    signal_detected: 'Treating feelings as facts',
    meaning: 'Emotional reasoning',
    response_template: 'That\'s how it feels. Is it also true?',
    confidence: 0.8
  },
  {
    pattern_id: 'PSY_DISTORTION_SHOULD',
    source_discipline: 'CBT (Beck)',
    signal_detected: 'Rigid "should" statements',
    meaning: 'Tyranny of shoulds',
    response_template: 'Says who? What if that rule doesn\'t apply here?',
    confidence: 0.7
  },

  // ========================================
  // ACT PATTERNS
  // ========================================
  {
    pattern_id: 'ACT_FUSION',
    source_discipline: 'ACT (Hayes)',
    signal_detected: 'Treating thoughts as reality',
    meaning: 'Cognitive fusion',
    response_template: 'Notice: you\'re having the thought that... The thought is not the thing.',
    confidence: 0.8
  },
  {
    pattern_id: 'ACT_AVOIDANCE',
    source_discipline: 'ACT (Hayes)',
    signal_detected: 'Fighting or avoiding experience',
    meaning: 'Experiential avoidance',
    response_template: 'What if you didn\'t fight this? What if you just let it be there?',
    confidence: 0.7
  },
  {
    pattern_id: 'ACT_VALUES_LOST',
    source_discipline: 'ACT (Hayes)',
    signal_detected: 'Acting against values or unclear values',
    meaning: 'Disconnection from values',
    response_template: 'What matters to you here? What do you want to stand for?',
    confidence: 0.8
  },

  // ========================================
  // DBT PATTERNS
  // ========================================
  {
    pattern_id: 'DBT_DYSREGULATION',
    source_discipline: 'DBT (Linehan)',
    signal_detected: 'Emotional intensity beyond window',
    meaning: 'Emotion dysregulation',
    response_template: 'Your nervous system is activated. Let\'s slow down. What do you notice in your body right now?',
    confidence: 0.8
  },
  {
    pattern_id: 'DBT_DIALECTIC_STUCK',
    source_discipline: 'DBT (Linehan)',
    signal_detected: 'Trapped between two opposites',
    meaning: 'Needs dialectical synthesis',
    response_template: 'Both can be true. Acceptance AND change. What would that look like?',
    confidence: 0.7
  },

  // ========================================
  // IFS PATTERNS
  // ========================================
  {
    pattern_id: 'IFS_PARTS_CONFLICT',
    source_discipline: 'IFS (Schwartz)',
    signal_detected: 'Internal conflict between "parts"',
    meaning: 'Parts in conflict, Self not present',
    response_template: 'Part of you wants this, part wants that. Can you get curious about both parts?',
    confidence: 0.8
  },
  {
    pattern_id: 'IFS_PROTECTOR_ACTIVE',
    source_discipline: 'IFS (Schwartz)',
    signal_detected: 'Defensive or controlling behavior',
    meaning: 'Manager or Firefighter part active',
    response_template: 'Something is protecting you here. What is it protecting you from?',
    confidence: 0.7
  },

  // ========================================
  // GESTALT PATTERNS
  // ========================================
  {
    pattern_id: 'GESTALT_NOT_PRESENT',
    source_discipline: 'Gestalt',
    signal_detected: 'Storytelling about past or future, not present',
    meaning: 'Not in here-and-now',
    response_template: 'What are you experiencing right now, as you say that?',
    confidence: 0.8
  },
  {
    pattern_id: 'GESTALT_UNFINISHED',
    source_discipline: 'Gestalt',
    signal_detected: 'Unresolved old situation affecting present',
    meaning: 'Unfinished business',
    response_template: 'What would you say to them if they were here right now?',
    confidence: 0.7
  },

  // ========================================
  // EXISTENTIAL PATTERNS
  // ========================================
  {
    pattern_id: 'EXIST_DEATH_AVOIDANCE',
    source_discipline: 'Existential (Yalom)',
    signal_detected: 'Living as if immortal',
    meaning: 'Death anxiety unexplored',
    response_template: 'If you knew time was limited, what would change?',
    confidence: 0.6
  },
  {
    pattern_id: 'EXIST_FREEDOM_PARALYSIS',
    source_discipline: 'Existential (Yalom)',
    signal_detected: 'Paralyzed by unlimited choice',
    meaning: 'Freedom anxiety (groundlessness)',
    response_template: 'You are choosing, even by not choosing. What do you want to stand for?',
    confidence: 0.7
  },
  {
    pattern_id: 'EXIST_ISOLATION',
    source_discipline: 'Existential (Yalom)',
    signal_detected: 'Deep loneliness despite connections',
    meaning: 'Fundamental existential isolation',
    response_template: 'We are ultimately alone AND we can connect. Both are true.',
    confidence: 0.7
  },
  {
    pattern_id: 'EXIST_MEANINGLESS',
    source_discipline: 'Existential (Yalom) + Logotherapy (Frankl)',
    signal_detected: '"What\'s the point?"',
    meaning: 'Meaning vacuum',
    response_template: 'There is no inherent meaning. What meaning could you create?',
    confidence: 0.8
  },

  // ========================================
  // POLYVAGAL PATTERNS
  // ========================================
  {
    pattern_id: 'POLY_DORSAL',
    source_discipline: 'Polyvagal Theory (Porges)',
    signal_detected: 'Shutdown, flat, disconnected',
    meaning: 'Dorsal vagal state (freeze/collapse)',
    response_template: 'I notice you seem far away. I\'m here. There\'s no rush.',
    confidence: 0.8
  },
  {
    pattern_id: 'POLY_SYMPATHETIC',
    source_discipline: 'Polyvagal Theory (Porges)',
    signal_detected: 'Activated, urgent, anxious',
    meaning: 'Sympathetic arousal (fight/flight)',
    response_template: 'Your body is activated. Can you feel your feet on the ground? Take a breath.',
    confidence: 0.8
  },

  // ========================================
  // FOCUSING PATTERNS
  // ========================================
  {
    pattern_id: 'FOCUS_FELT_SENSE',
    source_discipline: 'Focusing (Gendlin)',
    signal_detected: 'Vague body sense that\'s not yet words',
    meaning: 'Felt sense present',
    response_template: 'Stay with that. What\'s it like? Don\'t rush to name it.',
    confidence: 0.7
  },
  {
    pattern_id: 'FOCUS_INTELLECTUALIZING',
    source_discipline: 'Focusing (Gendlin)',
    signal_detected: 'All head, no body',
    meaning: 'Disconnected from felt sense',
    response_template: 'That\'s what you think. What does your body say?',
    confidence: 0.7
  },

  // ========================================
  // NARRATIVE PATTERNS
  // ========================================
  {
    pattern_id: 'NAR_STUCK_STORY',
    source_discipline: 'Narrative Therapy',
    signal_detected: 'Same story repeated, limiting identity',
    meaning: 'Dominant narrative limiting possibilities',
    response_template: 'That\'s one story. What\'s another story that could be true?',
    confidence: 0.7
  },
  {
    pattern_id: 'NAR_PROBLEM_IS_IDENTITY',
    source_discipline: 'Narrative Therapy',
    signal_detected: '"I am X" (depressed, anxious, etc.)',
    meaning: 'Fused with problem identity',
    response_template: 'When was X not running the show? What was different then?',
    confidence: 0.8
  },

  // ========================================
  // DEVELOPMENTAL PATTERNS
  // ========================================
  {
    pattern_id: 'DEV_KEGAN_SUBJECT',
    source_discipline: 'Developmental Psychology (Kegan)',
    signal_detected: 'Identified with something that could be object',
    meaning: 'Subject that could become object',
    response_template: 'You\'re IN this. What would it be like to look AT it?',
    confidence: 0.7
  },
  {
    pattern_id: 'DEV_ZPD_EDGE',
    source_discipline: 'Developmental Psychology (Vygotsky)',
    signal_detected: 'At edge of capacity, needs scaffolding',
    meaning: 'In Zone of Proximal Development',
    response_template: 'This is stretching you. What support would help you get there?',
    confidence: 0.7
  },

  // ========================================
  // SYSTEMS THINKING PATTERNS
  // ========================================
  {
    pattern_id: 'SYS_WRONG_LEVERAGE',
    source_discipline: 'Systems Thinking (Meadows)',
    signal_detected: 'Intervening at low leverage point',
    meaning: 'Working at wrong level of system',
    response_template: 'You\'re pushing at the symptoms. What\'s the deeper structure?',
    confidence: 0.7
  },
  {
    pattern_id: 'SYS_FEEDBACK_MISSING',
    source_discipline: 'Cybernetics (Wiener)',
    signal_detected: 'No information on effects of actions',
    meaning: 'Broken feedback loop',
    response_template: 'How do you know if it\'s working? What feedback are you getting?',
    confidence: 0.8
  },
  {
    pattern_id: 'SYS_REQUISITE_LOW',
    source_discipline: 'Cybernetics (Ashby)',
    signal_detected: 'Simple solution for complex problem',
    meaning: 'Insufficient variety for the system',
    response_template: 'The problem is more complex than the solution. What\'s missing?',
    confidence: 0.7
  },

  // ========================================
  // HERO'S JOURNEY PATTERNS
  // ========================================
  {
    pattern_id: 'HERO_CALL_REFUSED',
    source_discipline: 'Hero\'s Journey (Campbell)',
    signal_detected: 'Resisting necessary change',
    meaning: 'Refusing the call',
    response_template: 'Something is calling you. What are you afraid of?',
    confidence: 0.6
  },
  {
    pattern_id: 'HERO_THRESHOLD',
    source_discipline: 'Hero\'s Journey (Campbell)',
    signal_detected: 'At major transition point',
    meaning: 'Crossing the threshold',
    response_template: 'You\'re at a threshold. What are you leaving behind? What might you find?',
    confidence: 0.7
  },
  {
    pattern_id: 'HERO_ORDEAL',
    source_discipline: 'Hero\'s Journey (Campbell)',
    signal_detected: 'In crisis/transformation',
    meaning: 'The ordeal',
    response_template: 'This is the crucible. What\'s being forged in you?',
    confidence: 0.7
  },

  // ========================================
  // SPIRITUAL PATTERNS
  // ========================================
  {
    pattern_id: 'SPIRIT_DARK_NIGHT',
    source_discipline: 'Christian Mysticism (John of the Cross)',
    signal_detected: 'Loss of meaning/connection to sacred',
    meaning: 'Dark night of the soul',
    response_template: 'Sometimes the light disappears so we can find a deeper light. What remains?',
    confidence: 0.6
  },
  {
    pattern_id: 'SPIRIT_ATTACHMENT',
    source_discipline: 'Buddhism',
    signal_detected: 'Suffering from clinging',
    meaning: 'Attachment causing suffering',
    response_template: 'What are you holding onto? What would letting go look like?',
    confidence: 0.7
  },
  {
    pattern_id: 'SPIRIT_IMPERMANENCE',
    source_discipline: 'Buddhism',
    signal_detected: 'Expecting permanence',
    meaning: 'Resistance to impermanence',
    response_template: 'Nothing is permanent. Including this. Including this pain.',
    confidence: 0.7
  },
  {
    pattern_id: 'SPIRIT_EGO_GRIP',
    source_discipline: 'Multiple Traditions',
    signal_detected: 'Over-identified with small self',
    meaning: 'Ego as prison',
    response_template: 'Who are you beyond this story? What\'s bigger than "I"?',
    confidence: 0.6
  }
];

// ============================================
// LEVERAGE POINTS (Meadows)
// ============================================

export type LeverageLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface LeveragePoint {
  level: LeverageLevel;
  name: string;
  description: string;
  intervention_power: 'low' | 'medium' | 'high' | 'transformative';
  example_question: string;
}

/**
 * MEADOWS' LEVERAGE POINTS
 * From least to most powerful interventions
 */
export const LEVERAGE_POINTS: LeveragePoint[] = [
  { level: 12, name: 'Parameters', description: 'Numbers, constants, sizes', intervention_power: 'low', example_question: 'What if you changed the numbers?' },
  { level: 11, name: 'Buffers', description: 'Sizes of stabilizing stocks', intervention_power: 'low', example_question: 'What reserves do you have?' },
  { level: 10, name: 'Stock-Flow Structures', description: 'Physical structure of the system', intervention_power: 'low', example_question: 'How is this system physically organized?' },
  { level: 9, name: 'Delays', description: 'Lengths of time relative to change rates', intervention_power: 'medium', example_question: 'What if feedback were faster?' },
  { level: 8, name: 'Negative Feedback Loops', description: 'Strength of stabilizing loops', intervention_power: 'medium', example_question: 'What keeps this in balance?' },
  { level: 7, name: 'Positive Feedback Loops', description: 'Strength of runaway loops', intervention_power: 'medium', example_question: 'What\'s feeding itself here?' },
  { level: 6, name: 'Information Flows', description: 'Who has access to information', intervention_power: 'high', example_question: 'Who knows what? What if they knew more?' },
  { level: 5, name: 'Rules', description: 'Incentives, punishments, constraints', intervention_power: 'high', example_question: 'What are the rules here? Who made them?' },
  { level: 4, name: 'Power to Change Rules', description: 'Who can add, change, evolve rules', intervention_power: 'high', example_question: 'Who can change the rules?' },
  { level: 3, name: 'Goals', description: 'Purpose or function of the system', intervention_power: 'transformative', example_question: 'What is this system actually FOR?' },
  { level: 2, name: 'Paradigms', description: 'Mindset out of which system arises', intervention_power: 'transformative', example_question: 'What assumptions is all this based on?' },
  { level: 1, name: 'Transcend Paradigms', description: 'Ability to change paradigms', intervention_power: 'transformative', example_question: 'What if the whole frame is wrong?' }
];

// ============================================
// METACHAT DISPLAY
// ============================================

export interface MetachatState {
  current_mode: EnoqMode;
  autonomic_state: 'ventral' | 'sympathetic' | 'dorsal';
  active_patterns: string[];
  leverage_level?: LeverageLevel;
  developmental_stage?: string;
  temporal_orientation: 'past' | 'present' | 'future';
  integration_phi: number;
  confidence: number;
}

export interface MetachatDisplay {
  status_line: string;
  pattern_indicator?: string;
  mode_icon: string;
  arousal_indicator: string;
}

// ============================================
// PATTERN DETECTION ENGINE
// ============================================

export class DisciplinesSynthesis {
  private patternLibrary: PatternRecognition[];
  private currentMode: EnoqMode = 'WITNESS';
  private modeHistory: ModeTransition[] = [];

  constructor() {
    this.patternLibrary = PATTERN_LIBRARY;
  }

  /**
   * Detect patterns from all 215 disciplines in user message
   */
  detectPatterns(
    message: string,
    dimensionalState: DimensionalState,
    fieldState: FieldState,
    language: SupportedLanguage
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];

    const lowerMessage = message.toLowerCase();

    // Check each pattern in library
    for (const pattern of this.patternLibrary) {
      const matchResult = this.matchPattern(pattern, lowerMessage, dimensionalState, fieldState);
      if (matchResult.matched) {
        matches.push({
          pattern,
          match_strength: matchResult.strength,
          evidence: matchResult.evidence
        });
      }
    }

    // Sort by match strength
    matches.sort((a, b) => b.match_strength - a.match_strength);

    return matches;
  }

  /**
   * Match a single pattern
   */
  private matchPattern(
    pattern: PatternRecognition,
    message: string,
    dimensionalState: DimensionalState,
    fieldState: FieldState
  ): { matched: boolean; strength: number; evidence: string[] } {
    const evidence: string[] = [];
    let strength = 0;

    // Pattern-specific matching
    switch (pattern.pattern_id) {
      // DOUBLE BIND (English + Italian + Spanish)
      case 'BAT_DOUBLE_BIND':
        if (/can't .* but .* can't|damned if .* damned if|whatever i do|no way out/i.test(message)) {
          strength = 0.8;
          evidence.push('Contradiction language detected');
        }
        // Italian: double bind patterns
        if (/qualunque cosa (faccia|faccio)|se .* se (non|no)|non c'è via d'uscita|comunque faccio sbaglio/i.test(message)) {
          strength = 0.8;
          evidence.push('Italian contradiction language');
        }
        if (/trapped|stuck|impossible situation|intrappolato|bloccato|situazione impossibile/i.test(message)) {
          strength += 0.2;
          evidence.push('Trapped feeling');
        }
        break;

      // SCHISMOGENESIS
      case 'BAT_SCHISMOGENESIS':
        if (/getting worse|escalating|keeps happening|every time .* more/i.test(message)) {
          strength = 0.7;
          evidence.push('Escalation language');
        }
        if (dimensionalState.integration.tension > 0.6) {
          strength += 0.2;
          evidence.push('High tension detected');
        }
        break;

      // ZERO-SUM
      case 'GAME_ZERO_SUM':
        if (/if (he|she|they) win|either .* or|can't both|one of us/i.test(message)) {
          strength = 0.8;
          evidence.push('Zero-sum framing');
        }
        break;

      // CATASTROPHIZING
      case 'PSY_DISTORTION_CATASTROPHE':
        if (/worst|disaster|terrible|never|always|end of/i.test(message)) {
          strength = 0.6;
          evidence.push('Catastrophic language');
        }
        if (fieldState.arousal === 'high' && fieldState.valence === 'negative') {
          strength += 0.2;
          evidence.push('High arousal + negative valence');
        }
        break;

      // BLACK/WHITE
      case 'PSY_DISTORTION_BLACKWHITE':
        if (/either .* or|completely|totally|all|none|never|always/i.test(message)) {
          strength = 0.6;
          evidence.push('Binary language');
        }
        break;

      // EMOTIONAL REASONING
      case 'PSY_DISTORTION_EMOTIONAL':
        if (/i feel .* so (it must|it is)|feels like .* means/i.test(message)) {
          strength = 0.7;
          evidence.push('Feeling-as-fact pattern');
        }
        break;

      // FUSION (ACT)
      case 'ACT_FUSION':
        if (/i am (a failure|worthless|bad|stupid)/i.test(message)) {
          strength = 0.8;
          evidence.push('Identity fusion');
        }
        if (/i can't|it's impossible|there's no way/i.test(message)) {
          strength += 0.3;
          evidence.push('Thought-as-reality');
        }
        break;

      // MEANINGLESSNESS
      case 'EXIST_MEANINGLESS':
        if (dimensionalState.v_mode_triggered) {
          strength = 0.5;
          evidence.push('V_MODE active');
        }
        if (/what's the point|doesn't matter|no sense|meaningless|pointless/i.test(message)) {
          strength += 0.4;
          evidence.push('Meaninglessness language');
        }
        break;

      // DORSAL STATE (English + Italian)
      case 'POLY_DORSAL':
        if (/numb|empty|nothing|disconnected|far away|don't care|can't feel/i.test(message)) {
          strength = 0.7;
          evidence.push('Dorsal indicators');
        }
        // Italian: dorsal/shutdown indicators
        if (/vuoto|vuota|niente|disconnesso|disconnessa|non (provo|sento) (più )?niente|lontano|lontana|non mi importa/i.test(message)) {
          strength = 0.7;
          evidence.push('Italian dorsal indicators');
        }
        if (fieldState.arousal === 'low' && fieldState.valence === 'negative') {
          strength += 0.2;
          evidence.push('Low arousal + negative');
        }
        break;

      // SYMPATHETIC STATE (English + Italian)
      case 'POLY_SYMPATHETIC':
        if (dimensionalState.emergency_detected) {
          strength = 0.8;
          evidence.push('Emergency detected');
        }
        if (/can't calm|heart racing|scared|panicking|need to|have to/i.test(message)) {
          strength += 0.3;
          evidence.push('Sympathetic indicators');
        }
        // Italian: sympathetic indicators
        if (/non riesco a calmar|cuore (che )?batte|spaventat|in panico|devo|ho bisogno/i.test(message)) {
          strength += 0.3;
          evidence.push('Italian sympathetic indicators');
        }
        break;

      // LOCAL OPTIMUM
      case 'OPT_LOCAL_OPTIMUM':
        if (/best i can|this is it|no other way|only option|stuck here/i.test(message)) {
          strength = 0.7;
          evidence.push('Local optimum language');
        }
        break;

      // SCALE LOST
      case 'COSMO_SCALE_LOST':
        if (/everything|the world|disaster|catastrophe|end of/i.test(message)) {
          strength = 0.5;
          evidence.push('Scale amplification');
        }
        if (fieldState.arousal === 'high') {
          strength += 0.2;
          evidence.push('High arousal');
        }
        break;

      // PARTS CONFLICT
      case 'IFS_PARTS_CONFLICT':
        if (/part of me .* part of me|one side .* other side|want to but|divided|torn/i.test(message)) {
          strength = 0.8;
          evidence.push('Parts language');
        }
        break;

      // NOT PRESENT
      case 'GESTALT_NOT_PRESENT':
        if (/back then|when i was|in the future|what if|will be|used to/i.test(message)) {
          strength = 0.5;
          evidence.push('Temporal displacement');
        }
        break;

      // STUCK STORY
      case 'NAR_STUCK_STORY':
        if (/always been|that's just how|i always|i never|this always happens/i.test(message)) {
          strength = 0.7;
          evidence.push('Fixed narrative');
        }
        break;

      default:
        // Generic keyword matching
        const keywords = pattern.signal_detected.toLowerCase().split(/\s+/);
        let keywordMatches = 0;
        for (const keyword of keywords) {
          if (keyword.length > 3 && message.includes(keyword)) {
            keywordMatches++;
          }
        }
        if (keywordMatches > 0) {
          strength = Math.min(keywordMatches * 0.2, 0.6);
          evidence.push(`Keyword matches: ${keywordMatches}`);
        }
    }

    return {
      matched: strength > 0.4,
      strength: Math.min(strength, 1.0),
      evidence
    };
  }

  /**
   * Determine appropriate mode based on context
   */
  determineMode(
    dimensionalState: DimensionalState,
    fieldState: FieldState,
    patterns: PatternMatch[]
  ): EnoqMode {
    // Emergency or distress → WITNESS
    if (dimensionalState.emergency_detected || fieldState.flags.includes('crisis')) {
      return 'WITNESS';
    }

    // Dorsal state → WITNESS
    const hasDorsal = patterns.some(p => p.pattern.pattern_id === 'POLY_DORSAL');
    if (hasDorsal) {
      return 'WITNESS';
    }

    // High arousal sympathetic → WITNESS (need regulation first)
    const hasSympathetic = patterns.some(p => p.pattern.pattern_id === 'POLY_SYMPATHETIC');
    if (hasSympathetic && fieldState.arousal === 'high') {
      return 'WITNESS';
    }

    // Clear patterns detected and user seems regulated → MIRROR
    if (patterns.length > 0 && fieldState.arousal !== 'high') {
      return 'MIRROR';
    }

    // V_MODE and stable → GUIDE
    if (dimensionalState.v_mode_triggered && fieldState.coherence !== 'low') {
      return 'GUIDE';
    }

    // Ready for growth/exploration, not in crisis → GUIDE
    if (fieldState.goal === 'explore') {
      return 'GUIDE';
    }

    // Default to WITNESS
    return 'WITNESS';
  }

  /**
   * Generate response based on detected patterns and mode
   */
  generatePatternResponse(
    patterns: PatternMatch[],
    mode: EnoqMode,
    language: SupportedLanguage
  ): string | null {
    if (patterns.length === 0) {
      return null;
    }

    // Get top pattern
    const topPattern = patterns[0];

    // Mode-adjusted response
    let response = topPattern.pattern.response_template;

    // WITNESS mode softens
    if (mode === 'WITNESS') {
      response = this.softenResponse(response, language);
    }

    // MIRROR mode reflects
    if (mode === 'MIRROR') {
      response = this.addReflection(response, topPattern.pattern.source_discipline);
    }

    // GUIDE mode adds question
    if (mode === 'GUIDE') {
      response = this.ensureQuestion(response);
    }

    return response;
  }

  private softenResponse(response: string, language: SupportedLanguage): string {
    // Add gentle preambles
    const preambles: Record<string, string> = {
      en: 'I notice something. ',
      it: 'Noto qualcosa. ',
      es: 'Noto algo. ',
      fr: 'Je remarque quelque chose. ',
      de: 'Ich bemerke etwas. '
    };
    return (preambles[language] || preambles.en) + response;
  }

  private addReflection(response: string, source: string): string {
    return `From a ${source} perspective: ${response}`;
  }

  private ensureQuestion(response: string): string {
    if (!response.includes('?')) {
      return response + ' What do you notice?';
    }
    return response;
  }

  /**
   * Generate Metachat display state
   */
  generateMetachat(
    dimensionalState: DimensionalState,
    fieldState: FieldState,
    patterns: PatternMatch[],
    mode: EnoqMode
  ): MetachatDisplay {
    // Determine autonomic state
    let autonomic: 'ventral' | 'sympathetic' | 'dorsal' = 'ventral';
    if (patterns.some(p => p.pattern.pattern_id === 'POLY_DORSAL')) {
      autonomic = 'dorsal';
    } else if (patterns.some(p => p.pattern.pattern_id === 'POLY_SYMPATHETIC')) {
      autonomic = 'sympathetic';
    }

    // Mode icons
    const modeIcons: Record<EnoqMode, string> = {
      WITNESS: '👁️',
      MIRROR: '🪞',
      GUIDE: '🧭'
    };

    // Arousal indicators
    const arousalIndicators: Record<string, string> = {
      high: '🔴',
      medium: '🟡',
      low: '🔵'
    };

    // Pattern indicator
    let patternIndicator: string | undefined;
    if (patterns.length > 0) {
      const patternNames = patterns.slice(0, 3).map(p =>
        p.pattern.pattern_id.split('_').slice(0, 2).join('_')
      );
      patternIndicator = patternNames.join(' | ');
    }

    // Status line
    const statusElements = [
      modeIcons[mode],
      arousalIndicators[fieldState.arousal] || '⚪',
      autonomic === 'ventral' ? '✓' : autonomic === 'sympathetic' ? '⚡' : '〇',
      `φ:${dimensionalState.integration.phi.toFixed(2)}`
    ];

    return {
      status_line: statusElements.join(' '),
      pattern_indicator: patternIndicator,
      mode_icon: modeIcons[mode],
      arousal_indicator: arousalIndicators[fieldState.arousal] || '⚪'
    };
  }

  /**
   * Identify leverage point for intervention
   */
  identifyLeveragePoint(
    message: string,
    patterns: PatternMatch[]
  ): LeveragePoint | null {
    // Paradigm-level signals
    if (/everything i believe|my whole understanding|fundamentally/i.test(message)) {
      return LEVERAGE_POINTS.find(lp => lp.level === 2) || null; // Paradigms
    }

    // Goal-level signals
    if (/what's the point|purpose|why am i/i.test(message)) {
      return LEVERAGE_POINTS.find(lp => lp.level === 3) || null; // Goals
    }

    // Rules-level signals
    if (/have to|must|should|not allowed/i.test(message)) {
      return LEVERAGE_POINTS.find(lp => lp.level === 5) || null; // Rules
    }

    // Information flow signals
    if (/didn't know|just found out|if i had known/i.test(message)) {
      return LEVERAGE_POINTS.find(lp => lp.level === 6) || null; // Information
    }

    // Feedback loop signals
    if (/keeps happening|cycle|loop|again and again/i.test(message)) {
      return LEVERAGE_POINTS.find(lp => lp.level === 7) || null; // Positive feedback
    }

    // Default to parameters (lowest leverage but most common)
    if (patterns.length > 0) {
      return LEVERAGE_POINTS.find(lp => lp.level === 12) || null;
    }

    return null;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const disciplinesSynthesis = new DisciplinesSynthesis();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get all patterns from a specific discipline category
 */
export function getPatternsByCategory(category: string): PatternRecognition[] {
  const categoryPrefixes: Record<string, string[]> = {
    physics: ['PHY_', 'COSMO_'],
    bateson: ['BAT_'],
    games: ['GAME_'],
    network: ['NET_'],
    bayesian: ['BAYES_', 'DEC_'],
    optimization: ['OPT_'],
    psychology: ['PSY_'],
    therapy: ['ACT_', 'DBT_', 'IFS_', 'GESTALT_', 'NAR_'],
    existential: ['EXIST_'],
    polyvagal: ['POLY_'],
    focusing: ['FOCUS_'],
    developmental: ['DEV_'],
    systems: ['SYS_'],
    hero: ['HERO_'],
    spiritual: ['SPIRIT_']
  };

  const prefixes = categoryPrefixes[category.toLowerCase()] || [];
  return PATTERN_LIBRARY.filter(p =>
    prefixes.some(prefix => p.pattern_id.startsWith(prefix))
  );
}

/**
 * Get response template for a pattern ID
 */
export function getPatternResponse(patternId: string): string | null {
  const pattern = PATTERN_LIBRARY.find(p => p.pattern_id === patternId);
  return pattern?.response_template || null;
}
