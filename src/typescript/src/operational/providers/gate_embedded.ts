/**
 * EMBEDDED GATE CLASSIFIER
 *
 * First-Order Boundary Marker - Local implementation
 *
 * This is a direct port of gate-runtime's classification logic,
 * allowing ENOQ to run the Gate without HTTP calls.
 *
 * ARCHITECTURE:
 * - gate_client.ts: HTTP client for remote gate-runtime
 * - gate_embedded.ts: Local classifier (this file) - NO NETWORK
 *
 * The embedded version is preferred for:
 * - Zero latency (< 1ms vs 50-200ms HTTP)
 * - Offline operation
 * - Testing without Docker
 * - Single-process deployment
 *
 * ALIGNMENT: gate-runtime v1.0, boundary-marker specification
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES (aligned with gate-runtime)
// ============================================================================

export type GateSignal =
  | 'D1_ACTIVE'   // Operational Continuity (physical need, danger)
  | 'D2_ACTIVE'   // Coordination (agent coordination disruption)
  | 'D3_ACTIVE'   // Operative Selection (decision blockage)
  | 'D4_ACTIVE'   // Boundary (self/other confusion)
  | 'NULL';       // No domain activated

export type GateReasonCode =
  | 'UNCLASSIFIABLE'
  | 'AMBIGUOUS'
  | 'NORMATIVE_REQUEST'
  | 'INTEGRATION_REQUIRED'
  | 'ZERO_PERTURBATION'
  | 'DOMAIN_SIGNAL';

export interface EmbeddedGateResult {
  signal: GateSignal;
  reason_code: GateReasonCode;
  latency_ms: number;
  scores: Record<string, number>;
  signals_detected: string[];
}

// ============================================================================
// CONSTANTS (FROZEN - aligned with gate-runtime v1.0)
// ============================================================================

const MARKER_VERSION = 'v1.0';

const FROZEN_HASHES = {
  technical_constitution: 'e740d0ed27ed303cf650af2fc1c1c1269af5e56b6189ef83e2694d6759eb9cb0',
  ethical_regulatory_system: '0aded565ecca7b74c4ed80584d1ba4ab553b21552e71ceb7b321941120c577a0',
  bil_specification: '082b72e01a836658891240c926d00521268031f6087219b43034ad2635be5aee'
};

// ============================================================================
// DOMAIN SIGNALS & COUNTER-SIGNALS
// Ported directly from gate-runtime/src/server.ts
// ============================================================================

const DOMAIN_SIGNALS: Record<string, string[]> = {
  D1: [
    'hungry', 'thirsty', 'pain', 'hurt', 'injured', 'danger', 'unsafe',
    'starving', 'bleeding', 'emergency', 'dying', 'cant breathe',
    'need food', 'need water', 'physical', 'body',
    // Italian
    'fame', 'sete', 'dolore', 'ferito', 'pericolo', 'emergenza',
    'non respiro', 'morendo', 'sangue', 'sto male fisicamente'
  ],
  D2: [
    'colleague', 'team', 'partner', 'friend', 'family', 'boss', 'coworker',
    'they said', 'he said', 'she said', 'we agreed', 'miscommunication',
    'expectation', 'disappointed', 'coordination', 'meeting', 'conflict with',
    // Italian
    'collega', 'squadra', 'partner', 'amico', 'famiglia', 'capo',
    'hanno detto', 'ha detto', 'abbiamo concordato', 'incomprensione',
    'aspettativa', 'deluso', 'riunione', 'conflitto con'
  ],
  D3: [
    'should i', 'or should', 'option', 'alternative', 'choose', 'decision',
    'either', 'which one', 'a or b', 'x or y', 'dont know whether',
    'do not know whether', 'cant decide', 'cannot decide', 'stuck between',
    'weighing', 'considering', 'or stay', 'or leave', 'or go', 'or quit',
    'take the job', 'accept the offer', 'should i take', 'should i accept',
    'not sure if', 'undecided', 'torn between', 'dilemma', 'choice',
    'whether to', 'or not', 'im torn',
    // Italian (no apostrophes - normalized)
    'non so se', 'devo scegliere', 'decidere', 'lasciare', 'restare',
    'accettare', 'rifiutare', 'opzione', 'alternativa', 'scelta',
    'indeciso', 'dilemma', 'bloccato tra', 'o restare', 'o andare',
    'prendere il lavoro', 'accettare lofferta'
  ],
  D4: [
    'boundary', 'intrusion', 'violation', 'invaded', 'where do i end',
    'not mine', 'my space', 'crossed the line', 'overstepped',
    'confused about self', 'dont know where', 'their problem or mine',
    'my problems', 'becoming my',
    // Italian
    'confine', 'intrusione', 'violazione', 'invaso', 'dove finisco io',
    'non è mio', 'mio spazio', 'ha oltrepassato', 'superato il limite',
    'confuso su me stesso', 'il loro problema o il mio'
  ]
};

const COUNTER_SIGNALS: Record<string, string[]> = {
  D1: [
    'feel sad', 'anxious', 'worried', 'future', 'meaning of life',
    'worth living', 'should i exist', 'value', 'purpose',
    // Italian
    'mi sento triste', 'ansioso', 'preoccupato', 'futuro',
    'senso della vita', 'vale la pena vivere', 'dovrei esistere'
  ],
  D2: [
    'alone', 'by myself', 'no one else', 'just me', 'belonging',
    'acceptance', 'loved', 'included',
    // Italian
    'solo', 'da solo', 'nessun altro', 'appartenenza',
    'accettazione', 'amato', 'incluso'
  ],
  D3: [
    'what is right', 'moral', 'ethical', 'who am i', 'identity',
    'meaning', 'purpose', 'why am i here', 'what should i believe',
    // Italian
    'cosa è giusto', 'morale', 'etico', 'chi sono', 'identità',
    'significato', 'scopo', 'perché sono qui', 'cosa dovrei credere'
  ],
  D4: [
    'who am i', 'my identity', 'define myself', 'what am i',
    'clear boundary', 'i know where',
    // Italian
    'chi sono io', 'la mia identità', 'definire me stesso',
    'confine chiaro', 'so dove'
  ]
};

// Normative patterns that should return NULL with NORMATIVE_REQUEST
const NORMATIVE_PATTERNS = [
  'what is right', 'what should i believe', 'meaning of life',
  'who am i', 'my identity', 'my purpose', 'what is the meaning',
  'why do we exist', 'what is truth',
  // Italian
  'cosa è giusto', 'cosa dovrei credere', 'senso della vita',
  'chi sono io', 'la mia identità', 'il mio scopo', 'qual è il significato',
  'perché esistiamo', 'cos\'è la verità'
];

// ============================================================================
// CLASSIFICATION ENGINE
// ============================================================================

function extractSignals(text: string): string[] {
  // Normalize: lowercase, remove apostrophes, collapse spaces
  const normalized = text.toLowerCase()
    .replace(/['']/g, '')  // Remove apostrophes (curly and straight)
    .replace(/\s+/g, ' ')  // Collapse multiple spaces
    .trim();
  const signals: string[] = [];

  for (const domain of ['D1', 'D2', 'D3', 'D4']) {
    for (const signal of DOMAIN_SIGNALS[domain]) {
      if (normalized.includes(signal)) {
        signals.push(`${domain}:${signal}`);
      }
    }
    for (const counter of COUNTER_SIGNALS[domain]) {
      if (normalized.includes(counter)) {
        signals.push(`${domain}:COUNTER:${counter}`);
      }
    }
  }

  return signals;
}

function calculateDomainScores(signals: string[]): Record<string, number> {
  const scores: Record<string, number> = { D1: 0, D2: 0, D3: 0, D4: 0 };

  for (const signal of signals) {
    const parts = signal.split(':');
    const domain = parts[0];
    const type = parts[1];

    if (type === 'COUNTER') {
      scores[domain] -= 1;
    } else {
      scores[domain] += 1;
    }
  }

  return scores;
}

function hasNormativeRequest(text: string): boolean {
  // Same normalization as extractSignals
  const normalized = text.toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return NORMATIVE_PATTERNS.some(p => normalized.includes(p));
}

/**
 * Classify input text and return domain signal.
 *
 * This is the core Gate logic, ported from gate-runtime.
 *
 * INVARIANT: This function ONLY classifies. It does not generate content.
 * INVARIANT: halt is always true (Gate always halts after classification).
 */
export function classifyEmbedded(input_text: string): EmbeddedGateResult {
  const startTime = performance.now();

  // Empty input
  if (!input_text || input_text.trim() === '') {
    return {
      signal: 'NULL',
      reason_code: 'UNCLASSIFIABLE',
      latency_ms: performance.now() - startTime,
      scores: { D1: 0, D2: 0, D3: 0, D4: 0 },
      signals_detected: []
    };
  }

  // Extract and score signals
  const signals = extractSignals(input_text);
  const scores = calculateDomainScores(signals);

  // Check for normative request (meaning/identity questions)
  if (hasNormativeRequest(input_text)) {
    return {
      signal: 'NULL',
      reason_code: 'NORMATIVE_REQUEST',
      latency_ms: performance.now() - startTime,
      scores,
      signals_detected: signals
    };
  }

  // Find positive domains
  const positive = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .map(([domain, _]) => domain);

  // No perturbation detected
  if (positive.length === 0) {
    return {
      signal: 'NULL',
      reason_code: 'ZERO_PERTURBATION',
      latency_ms: performance.now() - startTime,
      scores,
      signals_detected: signals
    };
  }

  // Multiple domains - ambiguous
  if (positive.length > 1) {
    return {
      signal: 'NULL',
      reason_code: 'AMBIGUOUS',
      latency_ms: performance.now() - startTime,
      scores,
      signals_detected: signals
    };
  }

  // Single domain detected
  const domain = positive[0];
  const signalMap: Record<string, GateSignal> = {
    D1: 'D1_ACTIVE',
    D2: 'D2_ACTIVE',
    D3: 'D3_ACTIVE',
    D4: 'D4_ACTIVE'
  };

  return {
    signal: signalMap[domain],
    reason_code: 'DOMAIN_SIGNAL',
    latency_ms: performance.now() - startTime,
    scores,
    signals_detected: signals
  };
}

// ============================================================================
// GATE EFFECT INTERPRETATION
// Maps Gate signal to ENOQ behavior modifications
// ============================================================================

export interface GateSignalEffect {
  // Should ENOQ proceed with generation?
  proceed: boolean;

  // If proceeding, what constraints apply?
  atmosphere_hint?: 'EMERGENCY' | 'DECISION' | 'HUMAN_FIELD' | 'V_MODE';
  depth_ceiling?: 'surface' | 'medium' | 'deep';
  forbidden_additions?: string[];
  required_additions?: string[];

  // Special handling
  escalate?: boolean;
  professional_referral?: boolean;
}

export function interpretEmbeddedGateSignal(
  signal: GateSignal,
  reason_code: GateReasonCode
): GateSignalEffect {
  switch (signal) {
    case 'D1_ACTIVE':
      // Operational Continuity: physical need, danger, resource lack
      // ENOQ must prioritize safety, not exploration
      return {
        proceed: true,
        atmosphere_hint: 'EMERGENCY',
        depth_ceiling: 'surface',
        forbidden_additions: ['explore', 'analyze', 'philosophize'],
        required_additions: ['safety_check', 'ground'],
        escalate: true,
        professional_referral: true,
      };

    case 'D2_ACTIVE':
      // Coordination: disruption with other agents
      // ENOQ helps see the dynamic, not take sides
      return {
        proceed: true,
        atmosphere_hint: 'HUMAN_FIELD',
        depth_ceiling: 'medium',
        forbidden_additions: ['take_sides', 'advise_action'],
        required_additions: ['validate', 'explore_safely'],
      };

    case 'D3_ACTIVE':
      // Operative Selection: decision blockage
      // ENOQ maps the decision, never picks
      return {
        proceed: true,
        atmosphere_hint: 'DECISION',
        depth_ceiling: 'deep',
        forbidden_additions: ['recommend', 'pick_option', 'implicit_recommendation'],
        required_additions: ['return_ownership', 'map_costs'],
      };

    case 'D4_ACTIVE':
      // Boundary: self/other confusion
      // ENOQ helps clarify boundaries, not define identity
      return {
        proceed: true,
        atmosphere_hint: 'V_MODE',
        depth_ceiling: 'medium',
        forbidden_additions: ['define_identity', 'label'],
        required_additions: ['mirror_only', 'gentle_inquiry'],
      };

    case 'NULL':
      // No domain activated - reason codes matter
      if (reason_code === 'NORMATIVE_REQUEST') {
        // User asked for values/meaning - V_MODE
        return {
          proceed: true,
          atmosphere_hint: 'V_MODE',
          forbidden_additions: ['recommend', 'advise'],
          required_additions: ['return_ownership'],
        };
      }

      if (reason_code === 'AMBIGUOUS') {
        // Multiple domains - be cautious
        return {
          proceed: true,
          depth_ceiling: 'medium',
          forbidden_additions: ['rush'],
          required_additions: ['validate'],
        };
      }

      // Default: proceed normally (ZERO_PERTURBATION, UNCLASSIFIABLE)
      return {
        proceed: true,
      };

    default:
      return { proceed: true };
  }
}

// ============================================================================
// EMBEDDED GATE CLASS
// ============================================================================

export class EmbeddedGate {
  private lastResult: EmbeddedGateResult | null = null;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Classify input through embedded Gate.
   * Returns signal indicating which domain is active.
   *
   * IMPORTANT: This is a LOCAL classification, no network required.
   */
  classify(input: string): EmbeddedGateResult {
    if (!this.enabled) {
      return {
        signal: 'NULL',
        reason_code: 'ZERO_PERTURBATION',
        latency_ms: 0,
        scores: { D1: 0, D2: 0, D3: 0, D4: 0 },
        signals_detected: []
      };
    }

    const result = classifyEmbedded(input);
    this.lastResult = result;
    return result;
  }

  /**
   * Classify and interpret in one call.
   */
  classifyWithEffect(input: string): { result: EmbeddedGateResult; effect: GateSignalEffect } {
    const result = this.classify(input);
    const effect = interpretEmbeddedGateSignal(result.signal, result.reason_code);
    return { result, effect };
  }

  /**
   * Get the last classification result.
   */
  getLastResult(): EmbeddedGateResult | null {
    return this.lastResult;
  }

  /**
   * Enable or disable the gate.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if gate is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get marker version and hashes for audit.
   */
  getMarkerInfo(): { version: string; hashes: typeof FROZEN_HASHES } {
    return {
      version: MARKER_VERSION,
      hashes: FROZEN_HASHES
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let embeddedGateInstance: EmbeddedGate | null = null;

export function getEmbeddedGate(enabled: boolean = true): EmbeddedGate {
  if (!embeddedGateInstance) {
    embeddedGateInstance = new EmbeddedGate(enabled);
  }
  return embeddedGateInstance;
}

export function resetEmbeddedGate(): void {
  embeddedGateInstance = null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EmbeddedGate;
