/**
 * ENOQ LLM PROVIDER
 *
 * Multi-LLM abstraction layer.
 * Reads API keys from environment variables.
 * Routes to appropriate model based on task.
 *
 * Environment variables:
 * - OPENAI_API_KEY: OpenAI API key
 * - ANTHROPIC_API_KEY: Anthropic API key (optional)
 */

import { SupportedLanguage, CULTURE_PROFILES } from './types';
import { validateResponse as axisValidate, AxisDecision } from './axis/axis';

// ============================================
// TYPES
// ============================================

export type LLMProvider = 'openai' | 'anthropic';
export type LLMModel = 
  | 'gpt-4o-mini'      // Fast, cheap
  | 'gpt-4o'           // Powerful
  | 'gpt-4-turbo'      // Balance
  | 'claude-sonnet'    // Deep reasoning
  | 'claude-haiku';    // Fast Claude

export interface LLMRequest {
  messages: LLMMessage[];
  model?: LLMModel;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokens_used: number;
  latency_ms: number;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: LLMModel;
  api_key: string;
  base_url?: string;
}

// ============================================
// CONFIGURATION
// ============================================

function getConfig(): { openai?: LLMConfig; anthropic?: LLMConfig } {
  const config: { openai?: LLMConfig; anthropic?: LLMConfig } = {};
  
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    config.openai = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      api_key: openaiKey,
      base_url: 'https://api.openai.com/v1',
    };
  }
  
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    config.anthropic = {
      provider: 'anthropic',
      model: 'claude-sonnet',
      api_key: anthropicKey,
      base_url: 'https://api.anthropic.com/v1',
    };
  }
  
  return config;
}

// ============================================
// OPENAI CALL
// ============================================

async function callOpenAI(
  config: LLMConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const startTime = Date.now();
  
  const model = request.model || config.model;
  const openaiModel = mapToOpenAIModel(model);
  
  const messages: any[] = [];
  
  if (request.system) {
    messages.push({ role: 'system', content: request.system });
  }
  
  messages.push(...request.messages);
  
  const response = await fetch(`${config.base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      messages,
      max_tokens: request.max_tokens || 500,
      temperature: request.temperature ?? 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { total_tokens: number };
  };
  
  return {
    content: data.choices[0]?.message?.content || '',
    model: data.model,
    tokens_used: data.usage?.total_tokens || 0,
    latency_ms: Date.now() - startTime,
  };
}

function mapToOpenAIModel(model: LLMModel): string {
  switch (model) {
    case 'gpt-4o-mini': return 'gpt-4o-mini';
    case 'gpt-4o': return 'gpt-4o';
    case 'gpt-4-turbo': return 'gpt-4-turbo';
    default: return 'gpt-4o-mini';
  }
}

// ============================================
// ANTHROPIC CALL
// ============================================

async function callAnthropic(
  config: LLMConfig,
  request: LLMRequest
): Promise<LLMResponse> {
  const startTime = Date.now();
  
  const model = request.model || config.model;
  const anthropicModel = mapToAnthropicModel(model);
  
  const messages = request.messages.map(m => ({
    role: m.role === 'system' ? 'user' : m.role,
    content: m.content,
  }));
  
  const response = await fetch(`${config.base_url}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: request.max_tokens || 500,
      system: request.system,
      messages,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json() as {
    content: Array<{ text: string }>;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
  };
  
  return {
    content: data.content[0]?.text || '',
    model: data.model,
    tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    latency_ms: Date.now() - startTime,
  };
}

function mapToAnthropicModel(model: LLMModel): string {
  switch (model) {
    case 'claude-sonnet': return 'claude-3-5-sonnet-20241022';
    case 'claude-haiku': return 'claude-3-haiku-20240307';
    default: return 'claude-3-5-sonnet-20241022';
  }
}

// ============================================
// MAIN LLM FUNCTION
// ============================================

export async function callLLM(
  request: LLMRequest,
  preferredProvider?: LLMProvider
): Promise<LLMResponse> {
  const config = getConfig();
  
  // Determine which provider to use
  let provider: LLMProvider;
  let providerConfig: LLMConfig;
  
  if (preferredProvider && config[preferredProvider]) {
    provider = preferredProvider;
    providerConfig = config[preferredProvider]!;
  } else if (config.openai) {
    provider = 'openai';
    providerConfig = config.openai;
  } else if (config.anthropic) {
    provider = 'anthropic';
    providerConfig = config.anthropic;
  } else {
    throw new Error(
      'No LLM API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.'
    );
  }
  
  // Call appropriate provider
  if (provider === 'openai') {
    return callOpenAI(providerConfig, request);
  } else {
    return callAnthropic(providerConfig, request);
  }
}

// ============================================
// ENOQ-SPECIFIC GENERATION
// ============================================

/**
 * Context for LLM generation.
 *
 * WHY: Provides all information needed for constrained generation.
 * HOW: Passed from L2 execution, built from ExecutionContext.
 * WHERE: Used in generateResponse() to build system/user prompts.
 */
export interface GenerationContext {
  primitive: string;
  atmosphere: 'OPERATIONAL' | 'HUMAN_FIELD' | 'DECISION' | 'V_MODE' | 'EMERGENCY';
  depth: 'surface' | 'medium' | 'deep';
  forbidden: string[];
  required: string[];
  language: SupportedLanguage;
  user_message: string;
}

/**
 * Generate ENOQ response using LLM with AXIS validation
 *
 * The LLM response is validated against AXIS invariants.
 * If it violates any invariant, we:
 * 1. Try to regenerate with lower temperature
 * 2. If still invalid, return a safe fallback
 *
 * This is the constitutional constraint on LLM output.
 */
export async function generateResponse(
  context: GenerationContext
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);
  const userPrompt = buildUserPrompt(context);

  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await callLLM({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: context.depth === 'surface' ? 100 : context.depth === 'medium' ? 200 : 400,
        temperature: attempt === 1 ? 0.7 : 0.3, // Lower temperature on retry
      });

      // AXIS Validation - Constitutional constraint on LLM output
      const axisDecision = axisValidate(response.content);

      if (axisDecision.verdict === 'VALID') {
        return response.content;
      }

      // Log the violation
      console.warn(
        `[LLM] AXIS violation on attempt ${attempt}: ${axisDecision.reason} (${axisDecision.invariant_checked})`
      );

      // If this was the last attempt, use fallback
      if (attempt === maxAttempts) {
        console.warn('[LLM] Max attempts reached, using AXIS-safe fallback');
        return getAxisSafeFallback(context);
      }

      // Otherwise, try again with lower temperature
    } catch (error) {
      console.error('LLM generation failed:', error);
      throw error;
    }
  }

  // Should never reach here, but return fallback just in case
  return getAxisSafeFallback(context);
}

/**
 * AXIS-safe fallback responses
 * These are guaranteed to not violate any invariants
 */
function getAxisSafeFallback(context: GenerationContext): string {
  const lang = context.language;

  // Simple, non-prescriptive responses per atmosphere
  const fallbacks: Record<string, Record<string, string>> = {
    EMERGENCY: {
      en: "I'm here with you. Take a breath if you can.",
      it: "Sono qui con te. Fai un respiro se riesci.",
      es: "Estoy aquí contigo. Respira si puedes.",
    },
    V_MODE: {
      en: "I hear you. What feels most important to you right now?",
      it: "Ti ascolto. Cosa ti sembra più importante adesso?",
      es: "Te escucho. ¿Qué te parece más importante ahora?",
    },
    HUMAN_FIELD: {
      en: "I'm listening. Tell me more about what you're experiencing.",
      it: "Ti ascolto. Dimmi di più su quello che stai vivendo.",
      es: "Te escucho. Cuéntame más sobre lo que estás experimentando.",
    },
    DECISION: {
      en: "What options are you considering?",
      it: "Quali opzioni stai considerando?",
      es: "¿Qué opciones estás considerando?",
    },
    OPERATIONAL: {
      en: "I understand. What would be helpful right now?",
      it: "Capisco. Cosa ti sarebbe utile adesso?",
      es: "Entiendo. ¿Qué te sería útil ahora?",
    },
  };

  const atmosphereFallbacks = fallbacks[context.atmosphere] || fallbacks.HUMAN_FIELD;
  return atmosphereFallbacks[lang] || atmosphereFallbacks.en || "I'm here.";
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  // Tier 1
  en: 'English',
  zh: 'Chinese (Mandarin)',
  hi: 'Hindi',
  es: 'Spanish',
  // Tier 2
  fr: 'French',
  ar: 'Arabic',
  bn: 'Bengali',
  pt: 'Portuguese',
  ru: 'Russian',
  ur: 'Urdu',
  id: 'Indonesian',
  // Tier 3
  de: 'German',
  ja: 'Japanese',
  pa: 'Punjabi',
  sw: 'Swahili',
  mr: 'Marathi',
  tr: 'Turkish',
  vi: 'Vietnamese',
  ko: 'Korean',
  te: 'Telugu',
  ta: 'Tamil',
  fa: 'Persian',
  ms: 'Malay',
  ha: 'Hausa',
  // Tier 4
  it: 'Italian',
  th: 'Thai',
  am: 'Amharic',
  gu: 'Gujarati',
  yo: 'Yoruba',
  pl: 'Polish',
  uk: 'Ukrainian',
  fil: 'Filipino',
  kn: 'Kannada',
  ml: 'Malayalam',
  my: 'Burmese',
  // Tier 5
  nl: 'Dutch',
  ro: 'Romanian',
  el: 'Greek',
  hu: 'Hungarian',
  he: 'Hebrew',
};

function buildSystemPrompt(context: GenerationContext): string {
  const lang = LANGUAGE_NAMES[context.language];
  const cultureProfile = CULTURE_PROFILES[context.language];

  // Adapt tone based on culture
  const formalityNote = cultureProfile.formality === 'formal'
    ? 'Use formal, respectful language appropriate to the culture.'
    : cultureProfile.formality === 'casual'
    ? 'Use natural, conversational language.'
    : 'Use balanced, neutral formality.';

  const directnessNote = cultureProfile.directness === 'low'
    ? 'Be indirect and gentle in phrasing. Avoid bluntness.'
    : cultureProfile.directness === 'high'
    ? 'Be clear and direct while remaining compassionate.'
    : 'Balance directness with sensitivity.';

  return `You are ENOQ, a cognitive companion that helps humans see their patterns without creating dependency.

CRITICAL RULES:
${context.forbidden.map(f => `- NEVER: ${f}`).join('\n')}

REQUIRED IN RESPONSE:
${context.required.map(r => `- MUST: ${r}`).join('\n')}

ATMOSPHERE: ${context.atmosphere}
PRIMITIVE: ${context.primitive}
DEPTH: ${context.depth}
LANGUAGE: Respond in ${lang}
${formalityNote}
${directnessNote}

CORE PRINCIPLE: You see everything but decide nothing. Return ownership to the human.

${context.atmosphere === 'V_MODE' ? `
V_MODE ACTIVE: This touches meaning or identity. 
- You CANNOT recommend, advise, or decide for them
- You CAN illuminate, reflect, map the territory
- End with a question that returns ownership
` : ''}

${context.atmosphere === 'EMERGENCY' ? `
EMERGENCY ACTIVE: Stay grounded, brief, present.
- Acknowledge their distress
- Offer grounding
- Be present, not analytical
` : ''}

Keep response ${context.depth === 'surface' ? 'very brief (1-2 sentences)' : context.depth === 'medium' ? 'concise (2-4 sentences)' : 'thoughtful but focused (4-6 sentences)'}.`;
}

function buildUserPrompt(context: GenerationContext): string {
  return `User message: "${context.user_message}"

Generate a response that:
1. Executes the ${context.primitive} primitive
2. Maintains ${context.atmosphere} atmosphere
3. Respects all forbidden/required constraints
4. Returns ownership to the user

Response:`;
}

// ============================================
// CHECK AVAILABILITY
// ============================================

export function checkLLMAvailability(): { 
  available: boolean; 
  providers: LLMProvider[];
  message: string;
} {
  const config = getConfig();
  const providers: LLMProvider[] = [];
  
  if (config.openai) providers.push('openai');
  if (config.anthropic) providers.push('anthropic');
  
  if (providers.length === 0) {
    return {
      available: false,
      providers: [],
      message: 'No LLM API keys found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
    };
  }
  
  return {
    available: true,
    providers,
    message: `LLM available: ${providers.join(', ')}`,
  };
}

// ============================================
// EXPORTS
// ============================================

export default callLLM;
