/**
 * LLM DETECTOR V2 - EarlySignals Contributor
 *
 * PRINCIPIO FONDAMENTALE: "classifica regime, non contenuto"
 * - L'LLM classifica il TIPO di regime (existential, crisis, functional)
 * - NON genera contenuto, diagnosi, o interpretazioni
 * - Output: solo risk_flags + metacognitive signal
 *
 * GATING RULES (when to call LLM):
 * 1. Regex confidence < 0.7
 * 2. V_MODE score in ambiguous zone [0.35, 0.65]
 * 3. Short message + meaning collapse markers
 * 4. Explicit uncertainty in regex output
 *
 * DESIGN GOALS:
 * - Improve V_MODE recall from 15% → 85%+
 * - Stay within EarlySignals deadline (100ms standard, 200ms extended)
 * - Fallback gracefully to regex if LLM unavailable
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  SupportedLanguage,
  RiskFlags,
  RegimeClassification,
  ExistentialSpecificity,
} from '../../interface/types';
import { DimensionalDetector, DimensionalState } from './dimensional_system';
import { EarlySignals, MetacognitiveSignal, DEADLINE_CONFIG } from '../signals/early_signals';
import { LLMDetectorCache, CacheStats } from '../../external/cache/llm_cache';
import { ScientificGating, GatingDecision as ScientificGatingDecision, GatingStats } from '../../experimental/legacy/scientific_gating';

// Re-export shared types for backwards compatibility
export type { RegimeClassification, ExistentialSpecificity } from '../../interface/types';

// ============================================
// TYPES
// ============================================

export type LLMProvider = 'anthropic' | 'openai';

export type LLMModel =
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-5-sonnet-20241022'
  | 'gpt-4o-mini'
  | 'gpt-4o';

export interface LLMDetectorConfig {
  /** Enable/disable LLM calls */
  enabled: boolean;

  /** LLM provider */
  provider: LLMProvider;

  /** API key (from env if not provided) */
  api_key?: string;

  /** Model to use */
  model: LLMModel;

  /** Max tokens for response */
  max_tokens: number;

  /** Timeout for LLM call (ms) */
  timeout_ms: number;

  /** Temperature (low for classification) */
  temperature: number;
}

export const DEFAULT_CONFIG: LLMDetectorConfig = {
  enabled: true,
  provider: 'anthropic',
  model: 'claude-3-5-haiku-20241022', // Fast, cheap, good for classification
  max_tokens: 150,
  timeout_ms: DEADLINE_CONFIG.STANDARD_MS - 20, // Leave margin for processing
  temperature: 0.1, // Low temperature for deterministic classification
};

// Note: ExistentialSpecificity and RegimeClassification are now defined in interface/types.ts
// and re-exported above for backwards compatibility

/**
 * Legacy gating decision interface (v3.x compatibility)
 * v4.0 uses ScientificGating from scientific_gating.ts
 * @deprecated Use GatingDecision from scientific_gating.ts for new code
 */
export interface GatingDecision {
  should_call_llm: boolean;
  reason: string;
  regex_confidence: number;
  v_mode_ambiguous: boolean;
  short_message_risk: boolean;
}

// Internal alias
type GatingDecision_Legacy = GatingDecision;

/**
 * Extended EarlySignals with LLM detector-specific fields.
 * Extends core EarlySignals with:
 * - Existential specificity (Yalom's four givens)
 * - Reason codes for debugging/auditing
 */
export interface LLMDetectorSignals extends EarlySignals {
  /** Existential content detected (primitive signal) */
  existential_content: boolean;

  /** Existential specificity breakdown */
  existential_specificity: ExistentialSpecificity;

  /** Was LLM actually called? */
  llm_detector_called: boolean;

  /** Why was LLM called (or not called)? */
  llm_detector_reason: string;

  /** Did LLM timeout? */
  llm_detector_timeout: boolean;
}

// ============================================
// GATING LOGIC
// ============================================

/**
 * Decide whether to call LLM based on regex output uncertainty.
 * Key insight: Call LLM ONLY when regex is uncertain.
 *
 * Gating strategy:
 * 1. Clear functional with low existential → skip LLM
 * 2. Clear emergency with high somatic → skip LLM
 * 3. V_MODE in ambiguous zone → call LLM
 * 4. Short message + meaning markers → call LLM
 * 5. Low max score (no clear dimension) → call LLM
 */
export function shouldCallLLM(
  message: string,
  regexState: DimensionalState,
  language: SupportedLanguage
): GatingDecision {
  // Calculate confidence from max vertical score
  // High max score = regex is confident about something
  const verticalScores = Object.values(regexState.vertical);
  const maxScore = Math.max(...verticalScores);
  const regexConfidence = maxScore;

  // V_MODE in ambiguous zone?
  // If existential is between 0.35-0.65, we're uncertain about V_MODE
  const existentialScore = regexState.vertical.EXISTENTIAL;
  const v_mode_ambiguous = existentialScore >= 0.35 && existentialScore <= 0.65;

  // Short message + meaning collapse markers?
  // These are high-risk for being existential despite brevity
  const isShort = message.length < 50;
  const meaningCollapseMarkers = [
    /qual è il punto|what'?s the point|cuál es el sentido/i,
    /non so|I don'?t know|no sé/i,
    /perché|why|por qué/i,
    /senso|meaning|sentido/i,
    /basta|enough|basta/i,
    /stanco|tired|cansado/i,
    /vuoto|empty|vacío/i,
    /punto|point|sentido/i,
    /perso|lost|perdido/i,
  ];
  const hasMeaningCollapse = meaningCollapseMarkers.some(p => p.test(message));
  const short_message_risk = isShort && hasMeaningCollapse;

  // Clear functional case - high FUNCTIONAL, low EXISTENTIAL
  const clearFunctional =
    regexState.primary_vertical === 'FUNCTIONAL' &&
    regexState.vertical.FUNCTIONAL > 0.5 &&
    existentialScore < 0.3;

  // Clear emergency - high SOMATIC, emergency detected
  const clearEmergency =
    regexState.emergency_detected &&
    regexState.vertical.SOMATIC > 0.5;

  // Clear existential - high EXISTENTIAL, V_MODE triggered
  const clearExistential =
    regexState.v_mode_triggered &&
    existentialScore > 0.65;

  // Decision logic:
  // - Skip LLM if regex is clearly confident about the classification
  // - Call LLM if there's ambiguity
  const regexIsClear = clearFunctional || clearEmergency || clearExistential;
  const should_call_llm = !regexIsClear && (
    v_mode_ambiguous ||
    short_message_risk ||
    regexConfidence < 0.5  // No dimension is clearly dominant
  );

  // Build reason
  let reason = 'Regex sufficient';
  if (regexIsClear) {
    if (clearFunctional) reason = 'Clear functional case';
    else if (clearEmergency) reason = 'Clear emergency case';
    else if (clearExistential) reason = 'Clear existential case';
  } else if (v_mode_ambiguous) {
    reason = `V_MODE ambiguous zone (${(existentialScore * 100).toFixed(0)}%)`;
  } else if (short_message_risk) {
    reason = 'Short message with meaning collapse markers';
  } else if (regexConfidence < 0.5) {
    reason = `Low max score (${(regexConfidence * 100).toFixed(0)}%)`;
  }

  return {
    should_call_llm,
    reason,
    regex_confidence: regexConfidence,
    v_mode_ambiguous,
    short_message_risk,
  };
}

// ============================================
// PROMPT TEMPLATE
// ============================================

/**
 * System prompt - REGIME CLASSIFICATION ONLY
 * No interpretation, no content generation, no diagnosis.
 *
 * Key semantic distinction:
 * - existential.content_detected = PRIMITIVE (meaning/identity present)
 * - v_mode.triggered = DERIVED (existential ∧ NOT casual_work)
 */
const SYSTEM_PROMPT = `You are a regime classifier. Your ONLY job is to classify the TYPE of message.

OUTPUT FORMAT (JSON only, no explanation):
{
  "regime": "existential" | "crisis" | "relational" | "functional" | "somatic",
  "confidence": 0.0-1.0,
  "existential": {
    "content_detected": boolean,
    "specificity": {
      "identity": 0.0-1.0,
      "meaning": 0.0-1.0,
      "death": 0.0-1.0,
      "freedom": 0.0-1.0,
      "isolation": 0.0-1.0
    },
    "casual_work_context": boolean
  },
  "v_mode": {
    "triggered": boolean,
    "markers": ["brief marker names, max 3"]
  },
  "emergency": {
    "triggered": boolean,
    "type": "panic" | "self_harm" | "acute_distress" | null
  },
  "coherence": 0.0-1.0
}

REGIME DEFINITIONS:
- existential: Questions of meaning, identity, purpose, life direction, death, freedom
- crisis: Acute distress, panic, self-harm ideation, immediate danger
- relational: Interpersonal concerns, relationships, attachment, belonging
- functional: Tasks, goals, decisions, work, practical matters
- somatic: Body sensations, physical symptoms, health concerns

EXISTENTIAL SPECIFICITY (Yalom's four givens):
- identity: "who am I", "chi sono", self-concept questions
- meaning: "what's the point", "qual è il senso", purpose questions
- death: mortality, finiteness, endings, loss
- freedom: choice, agency, authenticity, responsibility
- isolation: aloneness, existential loneliness, disconnection

CASUAL WORK CONTEXT (set casual_work_context=true):
- Meeting, riunione, reunión
- Deadline, scadenza, plazo
- Task, compito, tarea
- Project, progetto, proyecto

V_MODE RULE (set v_mode.triggered=true ONLY if):
- existential.content_detected=true AND casual_work_context=false
- This is constitutional withdrawal, not a risk flag

EMERGENCY TRIGGERS (set emergency.triggered=true):
- Panic symptoms: can't breathe, heart racing, losing control
- Self-harm: mention of hurting self, suicide, ending it
- Acute distress: extreme fear, terror, desperation

IMPORTANT:
- Output ONLY JSON, no other text
- confidence < 0.7 = uncertain classification
- coherence < 0.5 = message is fragmented or unclear
- Do NOT interpret, diagnose, or give advice
- Do NOT reference specific content details in markers`;

/**
 * Simplified prompt for OpenAI models (stricter JSON format)
 *
 * NOTE: Emergency is NOT classified by LLM (safety invariant).
 * Emergency detection is handled by fast regex detector only.
 * LLM focuses on semantic understanding for V_MODE.
 */
const OPENAI_SYSTEM_PROMPT = `You are a message classifier. Classify the type/regime of the message.

Respond with ONLY this JSON structure:
{
  "regime": "existential",
  "confidence": 0.85,
  "v_mode": true,
  "existential_content": true,
  "casual_work_context": false
}

REGIME VALUES (pick ONE):
- "existential": meaning, identity, purpose, life direction, who am I, what's the point
- "functional": tasks, work, practical matters, decisions
- "relational": relationships, attachment, trust, connection
- "somatic": body sensations, physical symptoms, health

RULES:
- v_mode = true when existential content AND NOT casual work context
- existential_content = true when message touches meaning, identity, purpose
- casual_work_context = true for meetings, deadlines, tasks
- confidence = 0.0 to 1.0

Output ONLY valid JSON, nothing else.`;

/**
 * Build user prompt
 */
function buildUserPrompt(message: string, language: SupportedLanguage): string {
  return `Classify this message (language: ${language}):
"${message}"`;
}

// ============================================
// LLM DETECTOR CLASS
// ============================================

export class LLMDetectorV2 {
  private config: LLMDetectorConfig;
  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private regexDetector: DimensionalDetector;
  private cache: LLMDetectorCache;
  private gating: ScientificGating;

  constructor(config: Partial<LLMDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.regexDetector = new DimensionalDetector();
    this.cache = new LLMDetectorCache();
    this.gating = new ScientificGating();

    // Initialize client based on provider
    if (this.config.enabled) {
      if (this.config.provider === 'anthropic') {
        const apiKey = this.config.api_key || process.env.ANTHROPIC_API_KEY;
        if (apiKey) {
          this.anthropicClient = new Anthropic({ apiKey });
        }
      } else if (this.config.provider === 'openai') {
        const apiKey = this.config.api_key || process.env.OPENAI_API_KEY;
        if (apiKey) {
          this.openaiClient = new OpenAI({ apiKey });
        }
      }
    }
  }

  private get client(): Anthropic | OpenAI | null {
    return this.anthropicClient || this.openaiClient;
  }

  /**
   * Generate EarlySignals contribution.
   * This is the main entry point - returns LLMDetectorSignals (extends EarlySignals).
   *
   * v4.0 FLOW:
   * 1. Run fast regex detector
   * 2. Check cache for LLM result
   * 3. Use scientific gating (Chow's Rule) to decide if LLM needed
   * 4. Call LLM only if gating says yes AND not cached
   * 5. Cache result if LLM was called
   *
   * INVARIANTS:
   * - Emergency is ALWAYS from regex (never LLM)
   * - Cache hit skips LLM call
   * - Scientific gating uses cost-sensitive decision
   */
  async contribute(
    message: string,
    language: SupportedLanguage
  ): Promise<LLMDetectorSignals> {
    const startTime = Date.now();

    // Step 1: Run regex detector (fast, always available)
    const regexState = this.regexDetector.detect(message, language);

    // Step 2: Check cache FIRST
    const cachedClassification = this.cache.get(message, language);
    const cacheHit = cachedClassification !== null;

    // Step 3: Calculate uncertainty for gating
    const verticalScores = Object.values(regexState.vertical);
    const maxScore = Math.max(...verticalScores);
    const fastUncertainty = 1 - maxScore;

    // Step 4: Scientific gating decision (Chow's Rule)
    const gatingDecision = this.gating.decide({
      message,
      language,
      fast_state: regexState,
      fast_uncertainty: fastUncertainty,
      cache_hit: cacheHit,
    });

    let classification: RegimeClassification | null = cachedClassification;
    let usedLLM = false;
    let usedCache = cacheHit;

    // Step 5: Call LLM if gating says yes AND not cached AND available
    if (gatingDecision.call_llm && !cacheHit && this.client && this.config.enabled) {
      try {
        classification = await this.classifyWithLLM(message, language);
        usedLLM = true;

        // Step 6: Cache the result
        this.cache.set(message, language, classification);
      } catch (error) {
        // LLM failed - fall back to regex
        console.warn('[LLMDetectorV2] LLM call failed, using regex fallback:', error);
      }
    }

    // Step 7: Build EarlySignals output
    // Convert gating decision to old format for compatibility
    const legacyGating: GatingDecision_Legacy = {
      should_call_llm: gatingDecision.call_llm,
      reason: gatingDecision.reason,
      regex_confidence: maxScore,
      v_mode_ambiguous: regexState.vertical.EXISTENTIAL >= 0.35 && regexState.vertical.EXISTENTIAL <= 0.65,
      short_message_risk: message.length < 50,
    };

    const signals = this.buildSignals(regexState, classification, legacyGating, usedLLM || usedCache);

    // Add v4.0 metadata
    signals.generation_time_ms = Date.now() - startTime;
    signals.generated_at = Date.now();
    signals.llm_detector_reason = usedCache
      ? `CACHE_HIT: ${gatingDecision.reason}`
      : gatingDecision.reason;

    return signals;
  }

  /**
   * Get cache statistics for monitoring.
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Get gating statistics for monitoring.
   */
  getGatingStats(): GatingStats {
    return this.gating.getStats();
  }

  /**
   * Clear cache (for testing or memory management).
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset gating statistics.
   */
  resetGatingStats(): void {
    this.gating.resetStats();
  }

  /**
   * Call LLM for regime classification.
   */
  private async classifyWithLLM(
    message: string,
    language: SupportedLanguage
  ): Promise<RegimeClassification> {
    if (this.config.provider === 'anthropic') {
      return this.classifyWithAnthropic(message, language);
    } else {
      return this.classifyWithOpenAI(message, language);
    }
  }

  /**
   * Call Anthropic API for classification.
   */
  private async classifyWithAnthropic(
    message: string,
    language: SupportedLanguage
  ): Promise<RegimeClassification> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const timeoutId = setTimeout(() => {}, this.config.timeout_ms);

    try {
      const response = await this.anthropicClient.messages.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: buildUserPrompt(message, language) }
        ],
      });

      clearTimeout(timeoutId);

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      return this.parseClassification(content.text);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Call OpenAI API for classification.
   */
  private async classifyWithOpenAI(
    message: string,
    language: SupportedLanguage
  ): Promise<RegimeClassification> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const timeoutId = setTimeout(() => {}, this.config.timeout_ms);

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        max_tokens: this.config.max_tokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: OPENAI_SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(message, language) }
        ],
      });

      clearTimeout(timeoutId);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      return this.parseOpenAIClassification(content);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Parse LLM response to RegimeClassification.
   */
  private parseClassification(text: string): RegimeClassification {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Parse existential specificity
    const specificity: ExistentialSpecificity = {
      identity: this.clamp(parsed.existential?.specificity?.identity || 0),
      meaning: this.clamp(parsed.existential?.specificity?.meaning || 0),
      death: this.clamp(parsed.existential?.specificity?.death || 0),
      freedom: this.clamp(parsed.existential?.specificity?.freedom || 0),
      isolation: this.clamp(parsed.existential?.specificity?.isolation || 0),
    };

    // Derive content_detected from specificity if not explicit
    const hasSpecificity = Object.values(specificity).some(v => v > 0.3);
    const contentDetected = parsed.existential?.content_detected ?? hasSpecificity;
    const casualWork = parsed.existential?.casual_work_context ?? false;

    // Validate and normalize
    return {
      regime: this.normalizeRegime(parsed.regime),
      confidence: this.clamp(parsed.confidence || 0.5),
      existential: {
        content_detected: Boolean(contentDetected),
        specificity,
        casual_work_context: Boolean(casualWork),
      },
      v_mode: {
        // V_MODE = existential ∧ NOT casual_work (enforce the rule)
        triggered: Boolean(parsed.v_mode?.triggered) || (contentDetected && !casualWork),
        markers: Array.isArray(parsed.v_mode?.markers) ? parsed.v_mode.markers.slice(0, 3) : [],
      },
      emergency: {
        triggered: Boolean(parsed.emergency?.triggered),
        type: this.normalizeEmergencyType(parsed.emergency?.type),
      },
      coherence: this.clamp(parsed.coherence || 0.5),
    };
  }

  /**
   * Parse simplified OpenAI response to RegimeClassification.
   *
   * NOTE: Emergency is NOT parsed from LLM response (safety invariant).
   * Emergency is always handled by regex detector only.
   */
  private parseOpenAIClassification(text: string): RegimeClassification {
    const parsed = JSON.parse(text);

    const regime = this.normalizeRegime(parsed.regime);
    const confidence = this.clamp(parsed.confidence || 0.5);
    const v_mode_triggered = Boolean(parsed.v_mode);
    const existential_content = Boolean(parsed.existential_content);
    const casual_work = Boolean(parsed.casual_work_context);

    // Build full RegimeClassification from simplified response
    // NOTE: emergency is always false here - it's set by regex detector in buildSignals()
    return {
      regime,
      confidence,
      existential: {
        content_detected: existential_content || regime === 'existential',
        specificity: {
          identity: regime === 'existential' ? 0.5 : 0,
          meaning: regime === 'existential' ? 0.5 : 0,
          death: 0,
          freedom: 0,
          isolation: 0,
        },
        casual_work_context: casual_work,
      },
      v_mode: {
        triggered: v_mode_triggered,
        markers: [],
      },
      emergency: {
        // SAFETY INVARIANT: Emergency is NEVER determined by LLM
        // This field is ignored - buildSignals() uses regex detector only
        triggered: false,
        type: undefined,
      },
      coherence: 0.8,
    };
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private normalizeRegime(regime: string): RegimeClassification['regime'] {
    const valid = ['existential', 'crisis', 'relational', 'functional', 'somatic'];
    const normalized = String(regime).toLowerCase();
    return valid.includes(normalized) ? normalized as RegimeClassification['regime'] : 'functional';
  }

  private normalizeEmergencyType(type: string | undefined): RegimeClassification['emergency']['type'] {
    if (!type) return undefined;
    const valid = ['panic', 'self_harm', 'acute_distress'];
    const normalized = String(type).toLowerCase().replace('-', '_');
    return valid.includes(normalized) ? normalized as RegimeClassification['emergency']['type'] : undefined;
  }

  /**
   * Build EarlySignals from regex state and optional LLM classification.
   *
   * ARCHITECTURAL INVARIANT:
   * - EMERGENCY: ALWAYS from regex detector (safety critical, never delegate to LLM)
   * - V_MODE: LLM can enhance/override regex (semantic understanding value)
   *
   * Output includes:
   * - risk_flags.v_mode (derived signal, LLM-enhanced)
   * - risk_flags.emergency (ALWAYS from regex, never LLM)
   * - metacognitive with existential_specificity (primitive signal)
   * - reason codes for debugging/auditing
   */
  private buildSignals(
    regexState: DimensionalState,
    classification: RegimeClassification | null,
    gating: GatingDecision_Legacy,
    usedLLM: boolean
  ): LLMDetectorSignals {
    // Determine final risk flags
    const risk_flags: Partial<RiskFlags> = {
      crisis: false,
      emergency: false,
      v_mode: false,
      enchantment: false,
      loop_detected: false,
      boundary_approach: false,
    };

    // CRITICAL: Emergency ALWAYS from regex (safety invariant)
    // LLM has 71% precision on emergency - unacceptable for safety-critical detection
    // Regex has 100% recall and better precision on emergency patterns
    risk_flags.emergency = regexState.emergency_detected;
    risk_flags.crisis = regexState.emergency_detected;

    // Determine metacognitive signal
    const metacognitive: MetacognitiveSignal = {
      uncertainty: 0.5,
      need_more_info: false,
      coherence: regexState.integration.coherence,
    };

    // Existential specificity (default to zeros)
    let existential_specificity: ExistentialSpecificity = {
      identity: 0,
      meaning: 0,
      death: 0,
      freedom: 0,
      isolation: 0,
    };

    // Existential content detected (primitive signal)
    let existential_content = false;

    if (classification) {
      // Use LLM classification for V_MODE (semantic understanding value)
      // But NEVER override emergency (safety invariant above)
      risk_flags.v_mode = classification.v_mode.triggered;

      // Boundary approach = high identity specificity
      risk_flags.boundary_approach = classification.existential.specificity.identity > 0.6;

      metacognitive.uncertainty = 1 - classification.confidence;
      metacognitive.coherence = classification.coherence;

      // Capture existential specificity
      existential_specificity = classification.existential.specificity;
      existential_content = classification.existential.content_detected;
    } else {
      // Use regex only
      risk_flags.v_mode = regexState.v_mode_triggered;
      risk_flags.boundary_approach = regexState.v_mode_triggered &&
                                      regexState.vertical.EXISTENTIAL > 0.7;

      metacognitive.uncertainty = 1 - gating.regex_confidence;
      metacognitive.coherence = regexState.integration.coherence;

      // Infer existential content from regex
      existential_content = regexState.vertical.EXISTENTIAL > 0.3;
      if (existential_content) {
        // Approximate specificity from vertical scores
        existential_specificity.meaning = regexState.vertical.EXISTENTIAL;
        existential_specificity.identity = regexState.horizontal.H07_IDENTITY || 0;
      }
    }

    // High uncertainty = need more info
    metacognitive.need_more_info = (metacognitive.uncertainty ?? 0.5) > 0.5;

    return {
      risk_flags,
      metacognitive,
      contributors: usedLLM ? ['llm_detector_v2', 'regex_detector'] : ['regex_detector'],

      // Extended fields for LLM detector
      existential_content,
      existential_specificity,

      // Reason codes for debugging/auditing
      llm_detector_called: usedLLM,
      llm_detector_reason: gating.reason,
      llm_detector_timeout: false, // Set to true if timeout occurred
    };
  }

  /**
   * Get detector status for debugging.
   */
  getStatus(): {
    enabled: boolean;
    client_ready: boolean;
    model: string;
    timeout_ms: number;
  } {
    return {
      enabled: this.config.enabled,
      client_ready: this.client !== null,
      model: this.config.model,
      timeout_ms: this.config.timeout_ms,
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const llmDetectorV2 = new LLMDetectorV2();

export default llmDetectorV2;
