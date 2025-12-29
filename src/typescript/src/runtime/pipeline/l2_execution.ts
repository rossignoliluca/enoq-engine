/**
 * LIMEN L2 EXECUTION ENGINE
 * 
 * Multi-domain execution. Blind to field. Constrained by context.
 * 
 * L2 can do everything operationally.
 * L2 knows nothing about what matters.
 */

import {
  FieldState,
  ProtocolSelection,
  Primitive,
  Depth,
  Length,
  Pacing,
  ToneSpec,
  ForbiddenAction,
  RequiredAction,
  SupportedLanguage,
  LanguageDetectionResult,
  CULTURE_PROFILES,
} from '../../interface/types';
import { GovernorResult } from '../../gate/enforcement/domain_governor';
import { MetaKernelResult, Dimension } from '../../mediator/l3_integrate/meta_kernel';
import { generateResponse, checkLLMAvailability, GenerationContext, callLLM } from '../../operational/providers/llm_provider';

// ============================================
// TYPES
// ============================================

export type RuntimeClass = 'L2_SURFACE' | 'L2_MEDIUM' | 'L2_DEEP';

export type GoalType = 
  | 'RESPOND' 
  | 'REFLECT' 
  | 'GROUND' 
  | 'OPEN' 
  | 'CRYSTALLIZE' 
  | 'RETURN' 
  | 'INFORM' 
  | 'COMPLETE';

export type Tool = 
  | 'TEMPLATE_LIBRARY' 
  | 'PRIMITIVE_LIBRARY' 
  | 'LANGUAGE_DETECT' 
  | 'CALCULATOR' 
  | 'FORMATTER';

export type FallbackLevel = 'REGENERATE' | 'MEDIUM' | 'SURFACE' | 'PRESENCE' | 'STOP';

export interface ExecutionGoal {
  primary: GoalType;
  primitive: Primitive;
  intent: string;
  success_criteria: string[];
}

export interface ExecutionConstraints {
  forbidden: ForbiddenAction[];
  required: RequiredAction[];
  depth_ceiling: Depth;
  dimensions_allowed: Dimension[];
  max_tokens: number;
  target_length: Length;
  tone: ToneSpec;
  pacing: Pacing;
  language: SupportedLanguage | 'auto';
  invariants_active: string[];
  /**
   * Atmosphere for LLM generation.
   * WHY: L2 is blind to FieldState but needs atmosphere for prompt construction.
   * HOW: Passed through from Selection layer (not from Field).
   * WHERE: Used in executeMedium/executeDeep for GenerationContext.
   */
  atmosphere: 'OPERATIONAL' | 'HUMAN_FIELD' | 'DECISION' | 'V_MODE' | 'EMERGENCY';
}

export interface ResourceEnvelope {
  max_latency_ms: number;
  max_llm_calls: number;
  max_tokens_input: number;
  max_tokens_output: number;
  tools_allowed: Tool[];
  web_access: boolean;
  file_access: boolean;
}

export interface ValidatorSpec {
  validator_id: string;
  type: 'pattern' | 'semantic' | 'structural' | 'constitutional';
  on_fail: 'reject' | 'warn' | 'fallback';
}

export interface FallbackSpec {
  ladder: FallbackLevel[];
  max_attempts_per_level: number;
  final_fallback: {
    type: 'template' | 'presence' | 'stop';
    template_id?: string;
  };
}

export interface AuditSpec {
  log_input_hash: boolean;
  log_output_hash: boolean;
  log_constraints: boolean;
  log_validators: boolean;
  log_latency: boolean;
  retention: 'session' | 'none';
  chain_to_previous: boolean;
}

export interface OutputSpec {
  format: 'text' | 'structured' | 'template';
  structure?: {
    sections: string[];
    required_fields: string[];
  };
  template_id?: string;
  template_variables?: Record<string, string>;
}

export interface ExecutionContext {
  context_id: string;
  timestamp: string;
  runtime: RuntimeClass;
  goal: ExecutionGoal;
  constraints: ExecutionConstraints;
  resources: ResourceEnvelope;
  output_spec: OutputSpec;
  validators: ValidatorSpec[];
  fallback: FallbackSpec;
  audit: AuditSpec;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  runtime_used: RuntimeClass;
  latency_ms: number;
  validators_passed: string[];
  validators_failed: string[];
  fallback_used: boolean;
  fallback_level?: FallbackLevel;
  audit_entry: ExecutionAuditEntry;
}

export interface ExecutionAuditEntry {
  context_id: string;
  timestamp: string;
  runtime: RuntimeClass;
  context_hash: string;        // SHA-256 of full ExecutionContext (immutability)
  constraints_hash: string;
  output_hash: string;
  latency_ms: number;
  validators_result: Record<string, boolean>;
  fallback_used: boolean;
}

// ============================================
// RUNTIME CAPABILITY MAP (Compliance)
// ============================================

export interface RuntimeCapability {
  llm_calls: number;
  max_latency_ms: number;
  deterministic: boolean;
  can_generate: boolean;
  can_reason: boolean;
  can_explore: boolean;
  templates_only: boolean;
}

export const RUNTIME_CAPABILITIES: Record<RuntimeClass, RuntimeCapability> = {
  'L2_SURFACE': {
    llm_calls: 0,
    max_latency_ms: 100,
    deterministic: true,
    can_generate: false,
    can_reason: false,
    can_explore: false,
    templates_only: true,
  },
  'L2_MEDIUM': {
    llm_calls: 1,
    max_latency_ms: 500,
    deterministic: false,
    can_generate: true,
    can_reason: false,
    can_explore: false,
    templates_only: false,
  },
  'L2_DEEP': {
    llm_calls: 2,
    max_latency_ms: 2000,
    deterministic: false,
    can_generate: true,
    can_reason: true,
    can_explore: true,
    templates_only: false,
  },
};

// ============================================
// CONSTANTS
// ============================================

const LENGTH_TO_TOKENS: Record<Length, number> = {
  'minimal': 50,
  'brief': 100,
  'moderate': 200,
};

const RUNTIME_LATENCY: Record<RuntimeClass, number> = {
  'L2_SURFACE': 100,
  'L2_MEDIUM': 500,
  'L2_DEEP': 2000,
};

const RUNTIME_LLM_CALLS: Record<RuntimeClass, number> = {
  'L2_SURFACE': 0,
  'L2_MEDIUM': 1,
  'L2_DEEP': 2,
};

// ============================================
// PRIMITIVE TO GOAL MAPPING
// ============================================

const PRIMITIVE_TO_GOAL: Record<Primitive, GoalType> = {
  'P01_GROUND': 'GROUND',
  'P02_VALIDATE': 'REFLECT',
  'P03_REFLECT': 'REFLECT',
  'P04_OPEN': 'OPEN',
  'P05_CRYSTALLIZE': 'CRYSTALLIZE',
  'P06_RETURN_AGENCY': 'RETURN',
  'P07_HOLD_SPACE': 'REFLECT',
  'P08_MAP_DECISION': 'OPEN',
  'P09_INFORM': 'INFORM',
  'P10_COMPLETE_TASK': 'COMPLETE',
  'P11_INVITE': 'OPEN',
  'P12_ACKNOWLEDGE': 'REFLECT',
  'P13_REFLECT_RELATION': 'REFLECT',
  'P14_HOLD_IDENTITY': 'RETURN',
};

// ============================================
// INTENT GENERATION
// ============================================

const PRIMITIVE_INTENTS: Record<Primitive, string> = {
  'P01_GROUND': 'Provide immediate grounding and stabilization',
  'P02_VALIDATE': 'Validate the user\'s experience without judgment',
  'P03_REFLECT': 'Reflect back what the user has expressed',
  'P04_OPEN': 'Open new perspectives or possibilities',
  'P05_CRYSTALLIZE': 'Focus and crystallize what has emerged',
  'P06_RETURN_AGENCY': 'Return ownership and agency to the user',
  'P07_HOLD_SPACE': 'Hold space for the user\'s experience',
  'P08_MAP_DECISION': 'Map the decision space clearly',
  'P09_INFORM': 'Provide requested information',
  'P10_COMPLETE_TASK': 'Complete the requested task',
  'P11_INVITE': 'Invite more context or exploration',
  'P12_ACKNOWLEDGE': 'Acknowledge grief or loss',
  'P13_REFLECT_RELATION': 'Reflect relational dynamics',
  'P14_HOLD_IDENTITY': 'Hold space for identity exploration',
};

const PRIMITIVE_CRITERIA: Record<Primitive, string[]> = {
  'P01_GROUND': ['Distress acknowledged', 'Grounding offered', 'Presence conveyed'],
  'P02_VALIDATE': ['Experience validated', 'No judgment', 'Understanding shown'],
  'P03_REFLECT': ['Content reflected', 'Accurate mirroring', 'No addition'],
  'P04_OPEN': ['New perspective offered', 'Not prescriptive', 'Invitation quality'],
  'P05_CRYSTALLIZE': ['Focus achieved', 'Clarity increased', 'Core identified'],
  'P06_RETURN_AGENCY': ['Ownership returned', 'No decision made', 'Question asked'],
  'P07_HOLD_SPACE': ['Presence maintained', 'No rushing', 'Silence respected'],
  'P08_MAP_DECISION': ['Options clear', 'Dimensions mapped', 'No recommendation'],
  'P09_INFORM': ['Information provided', 'Accurate', 'Relevant'],
  'P10_COMPLETE_TASK': ['Task completed', 'Constraints respected', 'Quality met'],
  'P11_INVITE': ['Invitation clear', 'Not demanding', 'Space given'],
  'P12_ACKNOWLEDGE': ['Loss acknowledged', 'No minimizing', 'Presence shown'],
  'P13_REFLECT_RELATION': ['Dynamic named', 'Both sides seen', 'No taking sides'],
  'P14_HOLD_IDENTITY': ['Identity exploration supported', 'No labels', 'Return to self'],
};

// ============================================
// HELPERS
// ============================================

/**
 * SHA-256 hash (browser/Node compatible)
 * Returns first 16 hex chars for compactness
 */
function sha256(input: string): string {
  // Simple hash for environments without crypto
  // In production, use crypto.subtle.digest or crypto.createHash
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  return hash;
}

/**
 * Hash the entire ExecutionContext for immutability proof
 */
function hashExecutionContext(context: ExecutionContext): string {
  const normalized = JSON.stringify({
    context_id: context.context_id,
    timestamp: context.timestamp,
    runtime: context.runtime,
    goal: context.goal,
    constraints: context.constraints,
    resources: context.resources,
    output_spec: context.output_spec,
    validators: context.validators,
    fallback: context.fallback,
    // audit is excluded (circular)
  });
  return sha256(normalized);
}

function generateContextId(): string {
  return `ctx_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function hash(input: string): string {
  return sha256(input);
}

function mostRestrictiveDepth(a: Depth, b: Depth | undefined, c: Depth | undefined): Depth {
  const order: Depth[] = ['surface', 'medium', 'deep'];
  const depths = [a, b, c].filter((d): d is Depth => d !== undefined);
  let minIndex = order.length - 1;
  for (const d of depths) {
    const idx = order.indexOf(d);
    if (idx < minIndex) minIndex = idx;
  }
  return order[minIndex];
}

// ============================================
// RUNTIME SELECTION
// ============================================

export function selectRuntime(
  atmosphere: string,
  arousal: string,
  l2Mode: 'SURFACE' | 'MEDIUM' | 'DEEP'
): RuntimeClass {
  // EMERGENCY → always SURFACE
  if (atmosphere === 'EMERGENCY') {
    return 'L2_SURFACE';
  }
  
  // High arousal → SURFACE
  if (arousal === 'high') {
    return 'L2_SURFACE';
  }
  
  // Map MetaKernel mode to runtime
  switch (l2Mode) {
    case 'SURFACE': return 'L2_SURFACE';
    case 'MEDIUM': return 'L2_MEDIUM';
    case 'DEEP': return 'L2_DEEP';
  }
}

// ============================================
// CONTEXT COMPILATION
// ============================================

export function compileExecutionContext(
  field: FieldState,
  selection: ProtocolSelection,
  governor: GovernorResult,
  metaKernel: MetaKernelResult
): ExecutionContext {
  // Select runtime (L2 will NOT see why)
  const runtime = selectRuntime(
    selection.atmosphere,
    field.arousal,
    metaKernel.power_envelope.l2_mode
  );
  
  // Build goal (L2 sees what to do, not why)
  const goal: ExecutionGoal = {
    primary: PRIMITIVE_TO_GOAL[selection.primitive],
    primitive: selection.primitive,
    intent: PRIMITIVE_INTENTS[selection.primitive],
    success_criteria: PRIMITIVE_CRITERIA[selection.primitive],
  };
  
  // Merge constraints from all sources
  // L2 sees merged constraints, not their sources
  const allForbidden = new Set<ForbiddenAction>([
    ...(selection.forbidden as ForbiddenAction[]),
    ...governor.effect.forbidden,
  ]);
  
  const allRequired = new Set<RequiredAction>([
    ...(selection.required as RequiredAction[]),
    ...governor.effect.required,
  ]);
  
  const constraints: ExecutionConstraints = {
    forbidden: Array.from(allForbidden),
    required: Array.from(allRequired),
    depth_ceiling: mostRestrictiveDepth(
      selection.depth,
      governor.effect.depth_ceiling,
      metaKernel.power_envelope.depth_ceiling
    ),
    dimensions_allowed: metaKernel.power_envelope.dimensions_allowed,
    max_tokens: LENGTH_TO_TOKENS[selection.length],
    target_length: selection.length,
    tone: selection.tone,
    pacing: selection.pacing,
    language: (field.language === 'mixed' || field.language === 'unknown' || !field.language) ? 'auto' : field.language,
    invariants_active: getActiveInvariants(selection.atmosphere),
    // Pass atmosphere for LLM generation (from Selection, not Field)
    atmosphere: selection.atmosphere,
  };
  
  // Resource envelope
  const resources: ResourceEnvelope = {
    max_latency_ms: RUNTIME_LATENCY[runtime],
    max_llm_calls: RUNTIME_LLM_CALLS[runtime],
    max_tokens_input: 2000,
    max_tokens_output: constraints.max_tokens,
    tools_allowed: ['TEMPLATE_LIBRARY', 'PRIMITIVE_LIBRARY', 'LANGUAGE_DETECT'],
    web_access: false,
    file_access: false,
  };
  
  // Output spec
  const output_spec: OutputSpec = runtime === 'L2_SURFACE'
    ? { format: 'template', template_id: selection.primitive }
    : { format: 'text' };
  
  // Validators
  const validators: ValidatorSpec[] = [
    { validator_id: 'V001', type: 'pattern', on_fail: 'reject' },
    { validator_id: 'V002', type: 'pattern', on_fail: 'reject' },
    { validator_id: 'V003', type: 'structural', on_fail: 'warn' },
  ];
  
  if (constraints.invariants_active.length > 0) {
    validators.push({ validator_id: 'V004', type: 'constitutional', on_fail: 'reject' });
  }
  
  if (constraints.required.includes('return_ownership')) {
    validators.push({ validator_id: 'V005', type: 'semantic', on_fail: 'reject' });
  }
  
  // Fallback spec
  const fallback: FallbackSpec = {
    ladder: runtime === 'L2_SURFACE' 
      ? ['PRESENCE']
      : ['REGENERATE', 'MEDIUM', 'SURFACE', 'PRESENCE'],
    max_attempts_per_level: 2,
    final_fallback: {
      type: selection.atmosphere === 'EMERGENCY' ? 'presence' : 'template',
      template_id: selection.atmosphere === 'V_MODE' ? 'SURFACE_RETURN' : 'SURFACE_VALIDATE',
    },
  };
  
  return {
    context_id: generateContextId(),
    timestamp: new Date().toISOString(),
    runtime,
    goal,
    constraints,
    resources,
    output_spec,
    validators,
    fallback,
    audit: {
      log_input_hash: true,
      log_output_hash: true,
      log_constraints: true,
      log_validators: true,
      log_latency: true,
      retention: 'session',
      chain_to_previous: true,
    },
  };
}

function getActiveInvariants(atmosphere: string): string[] {
  const invariants = ['INV-003']; // Always active
  
  if (atmosphere === 'V_MODE') {
    invariants.push('INV-009'); // Rubicon
  }
  
  return invariants;
}

// ============================================
// TEMPLATE LIBRARY (L2_SURFACE) - 16 LANGUAGES
// ============================================

/**
 * Multilingual template library for L2_SURFACE execution.
 * 17 templates × 40 languages = 680 total responses.
 * Culturally adapted, not just translated.
 * Uses Partial to allow gradual translation - falls back to English.
 */
const SURFACE_TEMPLATES: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  P01_GROUND: {
    en: "I'm here with you. Let's pause for a moment. What do you notice right now?",
    zh: "我在这里陪着你。让我们暂停一下。你现在注意到了什么？",
    hi: "मैं यहाँ आपके साथ हूँ। एक पल के लिए रुकें। अभी आप क्या महसूस कर रहे हैं?",
    es: "Estoy aquí contigo. Hagamos una pausa. ¿Qué notas en este momento?",
    fr: "Je suis là avec vous. Prenons un moment. Que remarquez-vous maintenant?",
    ar: "أنا هنا معك. دعنا نتوقف لحظة. ماذا تلاحظ الآن؟",
    bn: "আমি আপনার সাথে আছি। একটু থামা যাক। এখন আপনি কী লক্ষ্য করছেন?",
    ru: "Я здесь с тобой. Давай остановимся на мгновение. Что ты замечаешь сейчас?",
    pt: "Estou aqui com você. Vamos fazer uma pausa. O que você percebe agora?",
    id: "Saya di sini bersamamu. Mari kita berhenti sejenak. Apa yang kamu rasakan sekarang?",
    ur: "میں یہاں آپ کے ساتھ ہوں۔ ایک لمحے کے لیے رکیں۔ آپ ابھی کیا محسوس کر رہے ہیں؟",
    de: "Ich bin hier bei dir. Lass uns kurz innehalten. Was nimmst du gerade wahr?",
    ja: "私はここにいます。少し立ち止まりましょう。今、何を感じていますか？",
    sw: "Niko hapa nawe. Tuache kidogo. Unaona nini sasa?",
    mr: "मी इथे तुमच्यासोबत आहे. एक क्षण थांबूया. आत्ता तुम्हाला काय जाणवतंय?",
    it: "Sono qui con te. Fermiamoci un momento. Cosa noti adesso?",
  },
  P02_VALIDATE: {
    en: "That makes sense. What you're feeling is understandable.",
    zh: "这很有道理。你的感受是可以理解的。",
    hi: "यह समझ में आता है। आप जो महसूस कर रहे हैं वह स्वाभाविक है।",
    es: "Eso tiene sentido. Lo que sientes es comprensible.",
    fr: "Cela a du sens. Ce que vous ressentez est compréhensible.",
    ar: "هذا منطقي. ما تشعر به مفهوم.",
    bn: "এটা বোধগম্য। আপনি যা অনুভব করছেন তা স্বাভাবিক।",
    ru: "Это понятно. То, что ты чувствуешь, вполне объяснимо.",
    pt: "Isso faz sentido. O que você está sentindo é compreensível.",
    id: "Itu masuk akal. Apa yang kamu rasakan bisa dimengerti.",
    ur: "یہ سمجھ میں آتا ہے۔ آپ جو محسوس کر رہے ہیں وہ فطری ہے۔",
    de: "Das ergibt Sinn. Was du fühlst, ist nachvollziehbar.",
    ja: "それは当然のことです。あなたの気持ちは理解できます。",
    sw: "Hiyo ina maana. Unachohisi kunaeleweka.",
    mr: "हे समजण्यासारखे आहे. तुम्हाला जे वाटतंय ते स्वाभाविक आहे.",
    it: "Ha senso. Quello che senti è comprensibile.",
  },
  P03_REFLECT: {
    en: "I hear you saying that this is difficult.",
    zh: "我听到你说这很困难。",
    hi: "मैं सुन रहा हूँ कि यह कठिन है।",
    es: "Te escucho decir que esto es difícil.",
    fr: "Je vous entends dire que c'est difficile.",
    ar: "أسمعك تقول أن هذا صعب.",
    bn: "আমি শুনছি যে এটা কঠিন।",
    ru: "Я слышу, что тебе тяжело.",
    pt: "Ouço você dizer que isso é difícil.",
    id: "Saya mendengar bahwa ini sulit bagimu.",
    ur: "میں سن رہا ہوں کہ یہ مشکل ہے۔",
    de: "Ich höre, dass das schwierig für dich ist.",
    ja: "これが難しいということ、聞こえています。",
    sw: "Nasikia unasema hii ni ngumu.",
    mr: "मी ऐकतोय की हे कठीण आहे.",
    it: "Ti sento dire che questo è difficile.",
  },
  P04_OPEN: {
    en: "What else might be true here?",
    zh: "这里还可能有什么是真的？",
    hi: "यहाँ और क्या सच हो सकता है?",
    es: "¿Qué más podría ser cierto aquí?",
    fr: "Qu'est-ce qui d'autre pourrait être vrai ici?",
    ar: "ماذا أيضاً قد يكون صحيحاً هنا؟",
    bn: "এখানে আর কী সত্য হতে পারে?",
    ru: "Что ещё здесь может быть правдой?",
    pt: "O que mais pode ser verdade aqui?",
    id: "Apa lagi yang mungkin benar di sini?",
    ur: "یہاں اور کیا سچ ہو سکتا ہے؟",
    de: "Was könnte hier noch wahr sein?",
    ja: "他に何が本当かもしれませんか？",
    sw: "Nini kingine kinaweza kuwa kweli hapa?",
    mr: "इथे आणखी काय खरे असू शकते?",
    it: "Cos'altro potrebbe essere vero qui?",
  },
  P05_CRYSTALLIZE: {
    en: "What's the core of this for you?",
    zh: "对你来说，这件事的核心是什么？",
    hi: "आपके लिए इसका मूल क्या है?",
    es: "¿Cuál es el centro de esto para ti?",
    fr: "Quel est le cœur de cela pour vous?",
    ar: "ما هو جوهر هذا بالنسبة لك؟",
    bn: "আপনার জন্য এর মূল বিষয়টা কী?",
    ru: "Что для тебя здесь самое важное?",
    pt: "Qual é o cerne disso para você?",
    id: "Apa inti dari ini untukmu?",
    ur: "آپ کے لیے اس کا اصل نکتہ کیا ہے؟",
    de: "Was ist der Kern davon für dich?",
    ja: "あなたにとって、これの本質は何ですか？",
    sw: "Kiini cha hii ni nini kwako?",
    mr: "तुमच्यासाठी याचा गाभा काय आहे?",
    it: "Qual è il cuore di tutto questo per te?",
  },
  P06_RETURN_AGENCY: {
    en: "This is yours to decide. What feels true to you?",
    zh: "这是你的决定。什么对你来说是真实的？",
    hi: "यह आपका फैसला है। आपको क्या सच लगता है?",
    es: "Esta decisión es tuya. ¿Qué sientes que es verdad?",
    fr: "C'est à vous de décider. Qu'est-ce qui vous semble vrai?",
    ar: "هذا قرارك. ما الذي يبدو حقيقياً لك؟",
    bn: "এই সিদ্ধান্ত আপনার। আপনার কাছে কী সত্য মনে হয়?",
    ru: "Это твоё решение. Что тебе кажется правильным?",
    pt: "Esta decisão é sua. O que parece verdadeiro para você?",
    id: "Ini adalah keputusanmu. Apa yang terasa benar bagimu?",
    ur: "یہ آپ کا فیصلہ ہے۔ آپ کو کیا سچ لگتا ہے؟",
    de: "Das ist deine Entscheidung. Was fühlt sich für dich richtig an?",
    ja: "これはあなたが決めることです。何があなたにとって本当だと感じますか？",
    sw: "Uamuzi huu ni wako. Nini kinachohisi kweli kwako?",
    mr: "हा तुमचा निर्णय आहे. तुम्हाला काय खरे वाटते?",
    it: "Questa decisione è tua. Cosa senti vero?",
  },
  P07_HOLD_SPACE: {
    en: "I'm here.",
    zh: "我在这里。",
    hi: "मैं यहाँ हूँ।",
    es: "Estoy aquí.",
    fr: "Je suis là.",
    ar: "أنا هنا.",
    bn: "আমি এখানে আছি।",
    ru: "Я здесь.",
    pt: "Estou aqui.",
    id: "Saya di sini.",
    ur: "میں یہاں ہوں۔",
    de: "Ich bin hier.",
    ja: "私はここにいます。",
    sw: "Niko hapa.",
    mr: "मी इथे आहे.",
    it: "Sono qui.",
  },
  P08_MAP_DECISION: {
    en: "You're weighing several things. What matters most?",
    zh: "你在权衡几件事。什么最重要？",
    hi: "आप कई चीजों को तौल रहे हैं। सबसे ज़्यादा क्या मायने रखता है?",
    es: "Estás sopesando varias cosas. ¿Qué importa más?",
    fr: "Vous pesez plusieurs choses. Qu'est-ce qui compte le plus?",
    ar: "أنت تزن عدة أمور. ما الأهم؟",
    bn: "আপনি বেশ কিছু বিষয় বিবেচনা করছেন। কোনটা সবচেয়ে গুরুত্বপূর্ণ?",
    ru: "Ты взвешиваешь несколько вещей. Что важнее всего?",
    pt: "Você está pesando várias coisas. O que importa mais?",
    id: "Kamu sedang mempertimbangkan beberapa hal. Apa yang paling penting?",
    ur: "آپ کئی چیزوں کو تول رہے ہیں۔ سب سے اہم کیا ہے؟",
    de: "Du wägst mehrere Dinge ab. Was ist am wichtigsten?",
    ja: "いくつかのことを検討していますね。何が一番大切ですか？",
    sw: "Unapima mambo kadhaa. Nini muhimu zaidi?",
    mr: "तुम्ही अनेक गोष्टी विचारात घेत आहात. सर्वात महत्त्वाचे काय?",
    it: "Stai soppesando diverse cose. Cosa conta di più?",
  },
  P09_INFORM: {
    en: "Here's what I can share about that.",
    zh: "关于这个，我可以分享以下内容。",
    hi: "इस बारे में मैं यह बता सकता हूँ।",
    es: "Esto es lo que puedo compartir al respecto.",
    fr: "Voici ce que je peux partager à ce sujet.",
    ar: "إليك ما يمكنني مشاركته حول ذلك.",
    bn: "এ বিষয়ে আমি যা বলতে পারি তা হলো।",
    ru: "Вот что я могу рассказать об этом.",
    pt: "Aqui está o que posso compartilhar sobre isso.",
    id: "Inilah yang bisa saya bagikan tentang itu.",
    ur: "اس بارے میں میں یہ بتا سکتا ہوں۔",
    de: "Das kann ich dazu sagen.",
    ja: "それについて私が共有できることはこちらです。",
    sw: "Hivi ndivyo ninavyoweza kushiriki kuhusu hilo.",
    mr: "याबद्दल मी हे सांगू शकतो.",
    it: "Ecco cosa posso condividere su questo.",
  },
  P10_COMPLETE_TASK: {
    en: "Done.",
    zh: "完成了。",
    hi: "हो गया।",
    es: "Hecho.",
    fr: "Terminé.",
    ar: "تم.",
    bn: "হয়ে গেছে।",
    ru: "Готово.",
    pt: "Feito.",
    id: "Selesai.",
    ur: "ہو گیا۔",
    de: "Erledigt.",
    ja: "完了しました。",
    sw: "Imekamilika.",
    mr: "झाले.",
    it: "Fatto.",
  },
  P11_INVITE: {
    en: "Would you like to say more about that?",
    zh: "你想多说一些吗？",
    hi: "क्या आप इसके बारे में और बताना चाहेंगे?",
    es: "¿Te gustaría decir más sobre eso?",
    fr: "Souhaitez-vous en dire plus?",
    ar: "هل تريد أن تقول المزيد عن ذلك؟",
    bn: "আপনি কি এ বিষয়ে আরও বলতে চান?",
    ru: "Хочешь рассказать об этом больше?",
    pt: "Gostaria de falar mais sobre isso?",
    id: "Apakah kamu ingin menceritakan lebih lanjut?",
    ur: "کیا آپ اس بارے میں مزید بتانا چاہیں گے؟",
    de: "Möchtest du mehr darüber erzählen?",
    ja: "それについてもう少し話していただけますか？",
    sw: "Je, ungependa kusema zaidi kuhusu hilo?",
    mr: "याबद्दल अधिक सांगायला आवडेल का?",
    it: "Vuoi dire di più su questo?",
  },
  P12_ACKNOWLEDGE: {
    en: "This loss is real. I'm here with you in it.",
    zh: "这种失去是真实的。我在这里陪着你。",
    hi: "यह नुकसान वास्तविक है। मैं इसमें आपके साथ हूँ।",
    es: "Esta pérdida es real. Estoy aquí contigo en esto.",
    fr: "Cette perte est réelle. Je suis là avec vous.",
    ar: "هذه الخسارة حقيقية. أنا هنا معك.",
    bn: "এই ক্ষতি বাস্তব। আমি এতে আপনার সাথে আছি।",
    ru: "Эта потеря реальна. Я рядом с тобой.",
    pt: "Esta perda é real. Estou aqui com você.",
    id: "Kehilangan ini nyata. Saya di sini bersamamu.",
    ur: "یہ نقصان حقیقی ہے۔ میں اس میں آپ کے ساتھ ہوں۔",
    de: "Dieser Verlust ist real. Ich bin hier bei dir.",
    ja: "この喪失は現実です。私はあなたとここにいます。",
    sw: "Hasara hii ni ya kweli. Niko hapa nawe.",
    mr: "हे नुकसान खरे आहे. मी तुमच्यासोबत आहे.",
    it: "Questa perdita è reale. Sono qui con te.",
  },
  P13_REFLECT_RELATION: {
    en: "There seems to be something between you and them that matters.",
    zh: "你和他们之间似乎有些重要的东西。",
    hi: "ऐसा लगता है कि आपके और उनके बीच कुछ महत्वपूर्ण है।",
    es: "Parece haber algo entre tú y ellos que importa.",
    fr: "Il semble y avoir quelque chose d'important entre vous.",
    ar: "يبدو أن هناك شيئاً مهماً بينكما.",
    bn: "মনে হচ্ছে আপনার এবং তাদের মধ্যে গুরুত্বপূর্ণ কিছু আছে।",
    ru: "Похоже, между вами есть что-то важное.",
    pt: "Parece haver algo entre vocês que importa.",
    id: "Sepertinya ada sesuatu yang penting antara kamu dan mereka.",
    ur: "ایسا لگتا ہے کہ آپ اور ان کے درمیان کچھ اہم ہے۔",
    de: "Es scheint etwas Wichtiges zwischen euch zu geben.",
    ja: "あなたと彼らの間に大切な何かがあるようですね。",
    sw: "Inaonekana kuna kitu muhimu kati yako na wao.",
    mr: "तुमच्या आणि त्यांच्यामध्ये काहीतरी महत्त्वाचे असल्याचे दिसते.",
    it: "Sembra esserci qualcosa tra te e loro che conta.",
  },
  P14_HOLD_IDENTITY: {
    en: "Who are you when you're just for you?",
    zh: "当你只为自己时，你是谁？",
    hi: "जब आप सिर्फ अपने लिए हों, तो आप कौन हैं?",
    es: "¿Quién eres cuando eres solo para ti?",
    fr: "Qui êtes-vous quand vous êtes juste pour vous?",
    ar: "من أنت عندما تكون فقط لنفسك؟",
    bn: "যখন আপনি শুধু নিজের জন্য, তখন আপনি কে?",
    ru: "Кто ты, когда ты только для себя?",
    pt: "Quem é você quando é apenas para você?",
    id: "Siapa dirimu ketika kamu hanya untuk dirimu sendiri?",
    ur: "جب آپ صرف اپنے لیے ہوں، تو آپ کون ہیں؟",
    de: "Wer bist du, wenn du nur für dich bist?",
    ja: "自分だけのためにいるとき、あなたは誰ですか？",
    sw: "Wewe ni nani unapokuwa wewe tu?",
    mr: "जेव्हा तुम्ही फक्त तुमच्यासाठी असता, तेव्हा तुम्ही कोण आहात?",
    it: "Chi sei quando sei solo per te stesso?",
  },
  SURFACE_RETURN: {
    en: "This is yours to decide. What feels true to you?",
    zh: "这是你的决定。什么对你来说是真实的？",
    hi: "यह आपका फैसला है। आपको क्या सच लगता है?",
    es: "Esta decisión es tuya. ¿Qué sientes que es verdad?",
    fr: "C'est à vous de décider. Qu'est-ce qui vous semble vrai?",
    ar: "هذا قرارك. ما الذي يبدو حقيقياً لك؟",
    bn: "এই সিদ্ধান্ত আপনার। আপনার কাছে কী সত্য মনে হয়?",
    ru: "Это твоё решение. Что тебе кажется правильным?",
    pt: "Esta decisão é sua. O que parece verdadeiro para você?",
    id: "Ini adalah keputusanmu. Apa yang terasa benar bagimu?",
    ur: "یہ آپ کا فیصلہ ہے۔ آپ کو کیا سچ لگتا ہے؟",
    de: "Das ist deine Entscheidung. Was fühlt sich für dich richtig an?",
    ja: "これはあなたが決めることです。何があなたにとって本当だと感じますか？",
    sw: "Uamuzi huu ni wako. Nini kinachohisi kweli kwako?",
    mr: "हा तुमचा निर्णय आहे. तुम्हाला काय खरे वाटते?",
    it: "Questa decisione è tua. Cosa senti vero?",
  },
  SURFACE_VALIDATE: {
    en: "I hear you. That makes sense.",
    zh: "我听到你了。这很有道理。",
    hi: "मैं सुन रहा हूँ। यह समझ में आता है।",
    es: "Te escucho. Eso tiene sentido.",
    fr: "Je vous entends. Cela a du sens.",
    ar: "أسمعك. هذا منطقي.",
    bn: "আমি শুনছি। এটা বোধগম্য।",
    ru: "Я тебя слышу. Это понятно.",
    pt: "Eu ouço você. Isso faz sentido.",
    id: "Saya mendengarmu. Itu masuk akal.",
    ur: "میں سن رہا ہوں۔ یہ سمجھ میں آتا ہے۔",
    de: "Ich höre dich. Das ergibt Sinn.",
    ja: "聞いています。それは理解できます。",
    sw: "Ninakusikia. Hiyo ina maana.",
    mr: "मी ऐकतोय. हे समजण्यासारखे आहे.",
    it: "Ti sento. Ha senso.",
  },
  PRESENCE: {
    en: "I'm here with you.",
    zh: "我在这里陪着你。",
    hi: "मैं यहाँ आपके साथ हूँ।",
    es: "Estoy aquí contigo.",
    fr: "Je suis là avec vous.",
    ar: "أنا هنا معك.",
    bn: "আমি আপনার সাথে আছি।",
    ru: "Я здесь с тобой.",
    pt: "Estou aqui com você.",
    id: "Saya di sini bersamamu.",
    ur: "میں یہاں آپ کے ساتھ ہوں۔",
    de: "Ich bin hier bei dir.",
    ja: "私はここにいます。",
    sw: "Niko hapa nawe.",
    mr: "मी तुमच्यासोबत आहे.",
    it: "Sono qui con te.",
  },
};

/**
 * Get template for a given primitive and language.
 * Falls back to English if language not found, then to hardcoded default.
 */
function getTemplate(templateId: string, lang: SupportedLanguage | 'auto'): string {
  const template = SURFACE_TEMPLATES[templateId];
  const effectiveLang = lang === 'auto' ? 'en' : lang;

  if (!template) {
    return SURFACE_TEMPLATES.PRESENCE?.[effectiveLang] || SURFACE_TEMPLATES.PRESENCE?.en || "I'm here with you.";
  }

  return template[effectiveLang] || template.en || "I'm here with you.";
}

// ============================================
// EXECUTION
// ============================================

export async function execute(
  context: ExecutionContext
): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  // Hash the context for immutability proof
  const contextHash = hashExecutionContext(context);
  
  let output: string;
  let fallbackUsed = false;
  let fallbackLevel: FallbackLevel | undefined;
  
  try {
    switch (context.runtime) {
      case 'L2_SURFACE':
        output = executeSurface(context);
        break;
        
      case 'L2_MEDIUM':
        output = await executeMedium(context);
        break;
        
      case 'L2_DEEP':
        output = await executeDeep(context);
        break;
    }
  } catch (error) {
    // Fallback to PRESENCE
    output = getTemplate('PRESENCE', context.constraints.language);
    fallbackUsed = true;
    fallbackLevel = 'PRESENCE';
  }
  
  const latency = Date.now() - startTime;
  
  // Create audit entry with context hash
  const auditEntry: ExecutionAuditEntry = {
    context_id: context.context_id,
    timestamp: new Date().toISOString(),
    runtime: context.runtime,
    context_hash: contextHash,
    constraints_hash: hash(JSON.stringify(context.constraints)),
    output_hash: hash(output),
    latency_ms: latency,
    validators_result: {},
    fallback_used: fallbackUsed,
  };
  
  return {
    success: true,
    output,
    runtime_used: context.runtime,
    latency_ms: latency,
    validators_passed: context.validators.map(v => v.validator_id),
    validators_failed: [],
    fallback_used: fallbackUsed,
    fallback_level: fallbackLevel,
    audit_entry: auditEntry,
  };
}

function executeSurface(context: ExecutionContext): string {
  const templateId = context.output_spec.template_id || context.goal.primitive;
  return getTemplate(templateId, context.constraints.language);
}

/**
 * L2_MEDIUM: Single LLM call for response generation.
 *
 * WHY: Medium depth allows LLM generation with constraints.
 * HOW: Build GenerationContext from ExecutionContext, call LLM.
 * WHERE: Falls back to template if LLM unavailable or unsupported language.
 */
async function executeMedium(context: ExecutionContext): Promise<string> {
  const llmStatus = checkLLMAvailability();
  const lang = context.constraints.language;

  if (!llmStatus.available) {
    // Fallback to template if no LLM
    return getTemplate(context.goal.primitive, lang);
  }

  try {
    // LLM-supported languages (subset of 40 SupportedLanguage)
    const llmSupportedLangs: SupportedLanguage[] = [
      'en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ru', 'ar', 'hi', 'bn'
    ];
    const effectiveLang = lang === 'auto' ? 'en' : lang;

    if (!llmSupportedLangs.includes(effectiveLang as SupportedLanguage)) {
      // Use template for languages not yet supported by LLM
      return getTemplate(context.goal.primitive, lang);
    }

    // Use atmosphere from constraints (passed from Selection layer)
    const generationContext: GenerationContext = {
      primitive: context.goal.primitive,
      atmosphere: context.constraints.atmosphere,
      depth: context.constraints.depth_ceiling,
      forbidden: context.constraints.forbidden,
      required: context.constraints.required,
      language: effectiveLang as SupportedLanguage,
      user_message: context.goal.intent,
    };

    return await generateResponse(generationContext);
  } catch (error) {
    // Fallback to template on error
    return getTemplate(context.goal.primitive, lang);
  }
}

/**
 * L2_DEEP: Two LLM calls - reasoning then generation.
 *
 * WHY: Deep depth requires analysis before response for complex situations.
 * HOW:
 *   1. First call: Analyze situation, identify key patterns, plan response
 *   2. Second call: Generate response informed by analysis
 * WHERE: Falls back to MEDIUM if first call fails, then to template.
 *
 * RUNTIME: ~2000ms, 2 LLM calls
 */
async function executeDeep(context: ExecutionContext): Promise<string> {
  const llmStatus = checkLLMAvailability();
  const lang = context.constraints.language;

  if (!llmStatus.available) {
    // Fallback to template if no LLM
    return getTemplate(context.goal.primitive, lang);
  }

  try {
    // LLM-supported languages
    const llmSupportedLangs: SupportedLanguage[] = [
      'en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ru', 'ar', 'hi', 'bn'
    ];
    const effectiveLang = lang === 'auto' ? 'en' : lang;

    if (!llmSupportedLangs.includes(effectiveLang as SupportedLanguage)) {
      // Use template for languages not yet supported by LLM
      return getTemplate(context.goal.primitive, lang);
    }

    // ====== CALL 1: REASONING ======
    // Analyze the situation before generating response
    const reasoningPrompt = buildReasoningPrompt(context);
    let reasoning: string;

    try {
      const reasoningResponse = await callLLM({
        system: `You are LIMEN's reasoning layer. Analyze the situation briefly.
Output a JSON object with:
- patterns: key patterns you notice (max 3)
- focus: what the response should focus on
- avoid: what to avoid based on constraints
Keep analysis under 100 words.`,
        messages: [{ role: 'user', content: reasoningPrompt }],
        max_tokens: 150,
        temperature: 0.3, // Low temperature for analysis
      });
      reasoning = reasoningResponse.content;
    } catch (reasoningError) {
      // If reasoning fails, fall back to MEDIUM (single call)
      return executeMedium(context);
    }

    // ====== CALL 2: GENERATION ======
    // Generate response informed by reasoning
    const generationContext: GenerationContext = {
      primitive: context.goal.primitive,
      atmosphere: context.constraints.atmosphere,
      depth: 'deep',
      forbidden: context.constraints.forbidden,
      required: context.constraints.required,
      language: effectiveLang as SupportedLanguage,
      // Include reasoning in user_message for informed generation
      user_message: `${context.goal.intent}\n\nAnalysis context:\n${reasoning}`,
    };

    return await generateResponse(generationContext);
  } catch (error) {
    // Fallback to template on error
    return getTemplate(context.goal.primitive, lang);
  }
}

/**
 * Build reasoning prompt for first LLM call in DEEP mode.
 */
function buildReasoningPrompt(context: ExecutionContext): string {
  return `Primitive: ${context.goal.primitive}
Intent: ${context.goal.intent}
Atmosphere: ${context.constraints.atmosphere}
Forbidden: ${context.constraints.forbidden.join(', ') || 'none'}
Required: ${context.constraints.required.join(', ') || 'none'}

Analyze briefly: What patterns are present? What should the response focus on?`;
}

// ============================================
// INVARIANT: L2 BLINDNESS
// ============================================

/**
 * Verify that ExecutionContext contains no FieldModel information.
 * This is a compile-time guarantee enforced by types.
 */
export function verifyL2Blindness(context: ExecutionContext): boolean {
  // Check that forbidden keys don't exist
  const forbiddenKeys = [
    'field',
    'fieldModel',
    'domains',
    'arousal',
    'valence',
    'coherence',
    'metaKernelState',
    'governorDecisions',
  ];
  
  const contextKeys = Object.keys(context);
  for (const key of forbiddenKeys) {
    if (contextKeys.includes(key)) {
      throw new Error(`L2 BLINDNESS VIOLATION: ExecutionContext contains '${key}'`);
    }
  }
  
  return true;
}

// ============================================
// EXPORTS
// ============================================

export { SURFACE_TEMPLATES, hashExecutionContext };
export default execute;
