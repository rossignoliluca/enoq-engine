/**
 * LLM-POWERED DIMENSIONAL DETECTOR
 *
 * Uses LLM to semantically understand user input and classify it
 * along vertical dimensions (SOMATIC→TRANSCENDENT) and horizontal
 * domains (H01-H17).
 *
 * Supports multiple models for benchmarking:
 * - Claude Haiku (fast, cheap)
 * - Claude Sonnet (accurate, expensive)
 * - GPT-4o-mini (fast, cheap)
 *
 * Design principles:
 * - Structured JSON output for reliable parsing
 * - Constitutional constraints in prompt
 * - Fallback to regex if LLM fails
 * - Session context optional for memory experiments
 */

import { SupportedLanguage, HumanDomain } from '../../interface/types';
import { DimensionalState, VerticalDimension, dimensionalDetector } from './dimensional_system';

// ============================================
// CONFIGURATION
// ============================================

export type LLMDetectorModel = 'haiku' | 'sonnet' | 'gpt-4o-mini';

export interface LLMDetectorConfig {
  model: LLMDetectorModel;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
  include_session_context: boolean;
  fallback_to_regex: boolean;
  debug: boolean;
}

export const DEFAULT_CONFIG: LLMDetectorConfig = {
  model: 'haiku',
  temperature: 0.1,  // Low for consistent classification
  max_tokens: 300,
  timeout_ms: 5000,
  include_session_context: false,
  fallback_to_regex: true,
  debug: false
};

// ============================================
// LLM OUTPUT SCHEMA
// ============================================

export interface LLMDetectorOutput {
  vertical: {
    SOMATIC: number;
    FUNCTIONAL: number;
    RELATIONAL: number;
    EXISTENTIAL: number;
    TRANSCENDENT: number;
  };
  primary_vertical: VerticalDimension;
  primary_horizontal: HumanDomain[];
  v_mode: boolean;
  emergency: boolean;
  confidence: number;
  reasoning: string;
}

// ============================================
// PROMPT TEMPLATES
// ============================================

const SYSTEM_PROMPT = `You are LIMEN's dimensional detector. Analyze the user's message and classify it along two axes.

VERTICAL DIMENSIONS (depth of experience):
- SOMATIC (0-1): Body sensations, physical states, health, panic, breathing, heart rate
- FUNCTIONAL (0-1): Goals, problems, tasks, decisions, work, practical matters
- RELATIONAL (0-1): Relationships, connection, trust, belonging, family, friends
- EXISTENTIAL (0-1): Meaning, identity, purpose, death, freedom, "who am I", life direction
- TRANSCENDENT (0-1): Beyond self, cosmic connection, spirituality, legacy, infinite

HORIZONTAL DOMAINS (select 1-3 most relevant):
H01_SURVIVAL, H02_SAFETY, H03_BODY, H04_EMOTION, H05_COGNITION, H06_MEANING,
H07_IDENTITY, H08_TEMPORAL, H09_ATTACHMENT, H10_COORDINATION, H11_BELONGING,
H12_HIERARCHY, H13_CREATION, H14_WORK, H15_LEGAL, H16_OPERATIONAL, H17_FORM

SPECIAL FLAGS:
- v_mode: TRUE if message touches fundamental questions of meaning, identity, purpose, or life direction.
  Examples: "What's the point?", "Who am I?", "What do I want from life?", "Everything feels meaningless"
- emergency: TRUE ONLY for acute physical/psychological crisis with somatic symptoms.
  Examples: "I can't breathe", "panic attack", "heart pounding with fear"
  NOT emergency: romantic feelings, existential fears, work anxiety

CRITICAL RULES:
1. Existential questions about life meaning → v_mode=true, even if short
2. Fear of choices/failure → EXISTENTIAL, NOT emergency
3. Romantic heart racing → RELATIONAL, NOT emergency
4. "I'm dying" as expression → check context (laughing = not emergency)

Output ONLY valid JSON, no explanation outside JSON.`;

const USER_PROMPT_TEMPLATE = `Analyze this message in {language}:

"{message}"

{session_context}

Respond with this exact JSON structure:
{
  "vertical": {
    "SOMATIC": <0.0-1.0>,
    "FUNCTIONAL": <0.0-1.0>,
    "RELATIONAL": <0.0-1.0>,
    "EXISTENTIAL": <0.0-1.0>,
    "TRANSCENDENT": <0.0-1.0>
  },
  "primary_vertical": "<highest dimension>",
  "primary_horizontal": ["<domain1>", "<domain2>"],
  "v_mode": <true/false>,
  "emergency": <true/false>,
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}`;

// ============================================
// MODEL CONFIGURATIONS
// ============================================

interface ModelConfig {
  provider: 'anthropic' | 'openai';
  model_id: string;
  api_key_env: string;
  base_url: string;
}

const MODEL_CONFIGS: Record<LLMDetectorModel, ModelConfig> = {
  haiku: {
    provider: 'anthropic',
    model_id: 'claude-3-5-haiku-latest',
    api_key_env: 'ANTHROPIC_API_KEY',
    base_url: 'https://api.anthropic.com/v1/messages'
  },
  sonnet: {
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-20250514',
    api_key_env: 'ANTHROPIC_API_KEY',
    base_url: 'https://api.anthropic.com/v1/messages'
  },
  'gpt-4o-mini': {
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    api_key_env: 'OPENAI_API_KEY',
    base_url: 'https://api.openai.com/v1/chat/completions'
  }
};

// ============================================
// API CALLS
// ============================================

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  config: LLMDetectorConfig,
  modelConfig: ModelConfig
): Promise<string> {
  const apiKey = process.env[modelConfig.api_key_env];
  if (!apiKey) {
    throw new Error(`Missing API key: ${modelConfig.api_key_env}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

  try {
    const response = await fetch(modelConfig.base_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelConfig.model_id,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    return data.content[0].text;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  config: LLMDetectorConfig,
  modelConfig: ModelConfig
): Promise<string> {
  const apiKey = process.env[modelConfig.api_key_env];
  if (!apiKey) {
    throw new Error(`Missing API key: ${modelConfig.api_key_env}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout_ms);

  try {
    const response = await fetch(modelConfig.base_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelConfig.model_id,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================
// RESPONSE PARSING
// ============================================

function parseResponse(responseText: string): LLMDetectorOutput {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = responseText;

  // Remove markdown code blocks if present
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to parse JSON
  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.vertical || !parsed.primary_vertical) {
      throw new Error('Missing required fields in response');
    }

    // Normalize and validate
    return {
      vertical: {
        SOMATIC: clamp(parsed.vertical.SOMATIC ?? 0),
        FUNCTIONAL: clamp(parsed.vertical.FUNCTIONAL ?? 0),
        RELATIONAL: clamp(parsed.vertical.RELATIONAL ?? 0),
        EXISTENTIAL: clamp(parsed.vertical.EXISTENTIAL ?? 0),
        TRANSCENDENT: clamp(parsed.vertical.TRANSCENDENT ?? 0)
      },
      primary_vertical: validateVertical(parsed.primary_vertical),
      primary_horizontal: validateHorizontal(parsed.primary_horizontal || []),
      v_mode: Boolean(parsed.v_mode),
      emergency: Boolean(parsed.emergency),
      confidence: clamp(parsed.confidence ?? 0.5),
      reasoning: String(parsed.reasoning || '')
    };
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error}`);
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function validateVertical(value: string): VerticalDimension {
  const valid: VerticalDimension[] = ['SOMATIC', 'FUNCTIONAL', 'RELATIONAL', 'EXISTENTIAL', 'TRANSCENDENT'];
  if (valid.includes(value as VerticalDimension)) {
    return value as VerticalDimension;
  }
  return 'FUNCTIONAL'; // Default fallback
}

function validateHorizontal(values: string[]): HumanDomain[] {
  const valid: HumanDomain[] = [
    'H01_SURVIVAL', 'H02_SAFETY', 'H03_BODY', 'H04_EMOTION', 'H05_COGNITION',
    'H06_MEANING', 'H07_IDENTITY', 'H08_TEMPORAL', 'H09_ATTACHMENT', 'H10_COORDINATION',
    'H11_BELONGING', 'H12_HIERARCHY', 'H13_CREATION', 'H14_WORK', 'H15_LEGAL',
    'H16_OPERATIONAL', 'H17_FORM'
  ];
  return values.filter(v => valid.includes(v as HumanDomain)) as HumanDomain[];
}

// ============================================
// CONVERT TO DIMENSIONAL STATE
// ============================================

function convertToDimensionalState(output: LLMDetectorOutput): DimensionalState {
  // Build horizontal map with defaults
  const horizontal: Record<HumanDomain, number> = {
    H01_SURVIVAL: 0, H02_SAFETY: 0, H03_BODY: 0, H04_EMOTION: 0, H05_COGNITION: 0,
    H06_MEANING: 0, H07_IDENTITY: 0, H08_TEMPORAL: 0, H09_ATTACHMENT: 0, H10_COORDINATION: 0,
    H11_BELONGING: 0, H12_HIERARCHY: 0, H13_CREATION: 0, H14_WORK: 0, H15_LEGAL: 0,
    H16_OPERATIONAL: 0, H17_FORM: 0
  };

  // Set primary horizontals to 0.7
  for (const domain of output.primary_horizontal) {
    horizontal[domain] = 0.7;
  }

  // Compute integration metrics
  const verticalValues = Object.values(output.vertical);
  const activeVerticals = verticalValues.filter(v => v >= 0.3).length;
  const activeHorizontals = Object.values(horizontal).filter(v => v >= 0.3).length;

  const phi = computePhi(output.vertical);
  const coherence = computeCoherence(output.vertical, horizontal);
  const tension = computeTension(output.vertical, horizontal);

  return {
    vertical: output.vertical,
    horizontal,
    integration: {
      phi,
      complexity: activeVerticals + activeHorizontals,
      coherence,
      tension
    },
    primary_vertical: output.primary_vertical,
    primary_horizontal: output.primary_horizontal,
    v_mode_triggered: output.v_mode,
    emergency_detected: output.emergency,
    cross_dimensional: activeVerticals >= 2
  };
}

function computePhi(vertical: Record<VerticalDimension, number>): number {
  const values = Object.values(vertical);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;

  // Count integrations (pairs both >= 0.3)
  let integrations = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] >= 0.3 && values[j] >= 0.3) {
        integrations++;
      }
    }
  }

  return Math.sqrt(variance) * Math.min(1, integrations / 5);
}

function computeCoherence(
  vertical: Record<VerticalDimension, number>,
  horizontal: Record<HumanDomain, number>
): number {
  let coherence = 0;

  // Natural pairings
  if (vertical.SOMATIC >= 0.3 && horizontal.H03_BODY >= 0.3) coherence += 0.2;
  if (vertical.FUNCTIONAL >= 0.3 && horizontal.H14_WORK >= 0.3) coherence += 0.2;
  if (vertical.RELATIONAL >= 0.3 && horizontal.H09_ATTACHMENT >= 0.3) coherence += 0.2;
  if (vertical.EXISTENTIAL >= 0.3 && horizontal.H06_MEANING >= 0.3) coherence += 0.2;
  if (vertical.EXISTENTIAL >= 0.3 && horizontal.H07_IDENTITY >= 0.3) coherence += 0.2;

  return Math.min(1, coherence);
}

function computeTension(
  vertical: Record<VerticalDimension, number>,
  horizontal: Record<HumanDomain, number>
): number {
  let tension = 0;

  // Functional + Existential = inner conflict
  if (vertical.FUNCTIONAL > 0.5 && vertical.EXISTENTIAL > 0.5) {
    tension += 0.3;
  }

  // Somatic + Work = body-mind conflict
  if (vertical.SOMATIC > 0.5 && horizontal.H14_WORK > 0.5) {
    tension += 0.2;
  }

  return Math.min(1, tension);
}

// ============================================
// MAIN DETECTOR
// ============================================

export class LLMDetector {
  private config: LLMDetectorConfig;

  constructor(config: Partial<LLMDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async detect(
    message: string,
    language: SupportedLanguage,
    sessionContext?: string[]
  ): Promise<{ state: DimensionalState; latency_ms: number; source: 'llm' | 'regex' }> {
    const startTime = performance.now();

    try {
      const result = await this.detectWithLLM(message, language, sessionContext);
      const latency_ms = performance.now() - startTime;

      if (this.config.debug) {
        console.log(`[LLM_DETECTOR] ${this.config.model}: ${latency_ms.toFixed(0)}ms`);
        console.log(`[LLM_DETECTOR] v_mode=${result.v_mode}, emergency=${result.emergency}, vertical=${result.primary_vertical}`);
      }

      return {
        state: convertToDimensionalState(result),
        latency_ms,
        source: 'llm'
      };
    } catch (error) {
      const latency_ms = performance.now() - startTime;

      if (this.config.debug) {
        console.error(`[LLM_DETECTOR] Error: ${error}`);
      }

      if (this.config.fallback_to_regex) {
        const regexState = dimensionalDetector.detect(message, language);
        return {
          state: regexState,
          latency_ms,
          source: 'regex'
        };
      }

      throw error;
    }
  }

  private async detectWithLLM(
    message: string,
    language: SupportedLanguage,
    sessionContext?: string[]
  ): Promise<LLMDetectorOutput> {
    const modelConfig = MODEL_CONFIGS[this.config.model];

    // Build user prompt
    let contextStr = '';
    if (this.config.include_session_context && sessionContext && sessionContext.length > 0) {
      contextStr = `\nPrevious messages in session:\n${sessionContext.slice(-5).map((m, i) => `${i + 1}. "${m}"`).join('\n')}`;
    }

    const userPrompt = USER_PROMPT_TEMPLATE
      .replace('{language}', language)
      .replace('{message}', message)
      .replace('{session_context}', contextStr);

    // Call appropriate API
    let responseText: string;
    if (modelConfig.provider === 'anthropic') {
      responseText = await callAnthropic(SYSTEM_PROMPT, userPrompt, this.config, modelConfig);
    } else {
      responseText = await callOpenAI(SYSTEM_PROMPT, userPrompt, this.config, modelConfig);
    }

    // Parse response
    return parseResponse(responseText);
  }

  getConfig(): LLMDetectorConfig {
    return { ...this.config };
  }
}

// ============================================
// SINGLETON INSTANCES FOR BENCHMARKING
// ============================================

export const haikuDetector = new LLMDetector({ model: 'haiku' });
export const sonnetDetector = new LLMDetector({ model: 'sonnet' });
export const gpt4oMiniDetector = new LLMDetector({ model: 'gpt-4o-mini' });

// ============================================
// UTILITY: Check if LLM detection is available
// ============================================

export function isLLMAvailable(model: LLMDetectorModel = 'haiku'): boolean {
  const modelConfig = MODEL_CONFIGS[model];
  return Boolean(process.env[modelConfig.api_key_env]);
}

export function getAvailableModels(): LLMDetectorModel[] {
  const available: LLMDetectorModel[] = [];
  for (const [model, config] of Object.entries(MODEL_CONFIGS)) {
    if (process.env[config.api_key_env]) {
      available.push(model as LLMDetectorModel);
    }
  }
  return available;
}
