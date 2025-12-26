/**
 * ENOQ GATE CLIENT
 * 
 * HTTP client for gate-runtime integration.
 * Calls Gate BEFORE any LLM generation.
 * 
 * Gate signals which domain is active, then halts.
 * ENOQ decides what to do with that signal.
 */

import * as crypto from 'crypto';

// ============================================
// TYPES (aligned with gate-runtime)
// ============================================

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

export interface GateRequest {
  request_id: string;
  timestamp: string;
  input_hash: string;
  input_text: string;
  marker_version: string;
  context_scope_id: string;
}

export interface GateDecision {
  request_id: string;
  timestamp: string;
  signal: GateSignal;
  halt: true;
  marker_hash: string;
  reason_code: GateReasonCode;
}

export interface GateClientConfig {
  base_url: string;
  timeout_ms: number;
  marker_version: string;
  context_scope_id: string;
  enabled: boolean;
}

export interface GateResult {
  signal: GateSignal;
  reason_code: GateReasonCode;
  request_id: string;
  latency_ms: number;
  error?: string;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: GateClientConfig = {
  base_url: process.env.GATE_RUNTIME_URL || 'http://localhost:3000',
  timeout_ms: 1000,
  marker_version: 'v1.0',
  context_scope_id: 'enoq-core',
  enabled: true,
};

// ============================================
// HELPERS
// ============================================

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

function hashInput(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// ============================================
// GATE CLIENT CLASS
// ============================================

export class GateClient {
  private config: GateClientConfig;
  private lastResult: GateResult | null = null;

  constructor(config: Partial<GateClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Classify input through Gate runtime.
   * Returns signal indicating which domain is active.
   * 
   * IMPORTANT: This must be called BEFORE any LLM generation.
   */
  async classify(input: string): Promise<GateResult> {
    const startTime = Date.now();
    const request_id = generateRequestId();

    // If Gate is disabled, return NULL (proceed normally)
    if (!this.config.enabled) {
      const result: GateResult = {
        signal: 'NULL',
        reason_code: 'ZERO_PERTURBATION',
        request_id,
        latency_ms: 0,
      };
      this.lastResult = result;
      return result;
    }

    const request: GateRequest = {
      request_id,
      timestamp: new Date().toISOString(),
      input_hash: hashInput(input),
      input_text: input,
      marker_version: this.config.marker_version,
      context_scope_id: this.config.context_scope_id,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

      const response = await fetch(`${this.config.base_url}/gate/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gate returned ${response.status}`);
      }

      const decision = await response.json() as GateDecision;
      
      const result: GateResult = {
        signal: decision.signal,
        reason_code: decision.reason_code,
        request_id: decision.request_id,
        latency_ms: Date.now() - startTime,
      };

      this.lastResult = result;
      return result;

    } catch (error) {
      // On any error, fail safe to NULL (proceed with ENOQ)
      const result: GateResult = {
        signal: 'NULL',
        reason_code: 'UNCLASSIFIABLE',
        request_id,
        latency_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.lastResult = result;
      return result;
    }
  }

  /**
   * Get the last classification result.
   */
  getLastResult(): GateResult | null {
    return this.lastResult;
  }

  /**
   * Check if Gate runtime is available.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.config.base_url}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;

    } catch {
      return false;
    }
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<GateClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration.
   */
  getConfig(): GateClientConfig {
    return { ...this.config };
  }
}

// ============================================
// SIGNAL INTERPRETATION
// ============================================

/**
 * Map Gate signal to ENOQ behavior modifications.
 * 
 * Gate tells us WHAT domain is perturbed.
 * ENOQ decides HOW to respond.
 */
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

export function interpretGateSignal(signal: GateSignal, reason_code: GateReasonCode): GateSignalEffect {
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
      // No domain activated - proceed normally
      // Reason codes matter here
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

      // Default: proceed normally
      return {
        proceed: true,
      };

    default:
      return { proceed: true };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let gateClientInstance: GateClient | null = null;

export function getGateClient(config?: Partial<GateClientConfig>): GateClient {
  if (!gateClientInstance) {
    gateClientInstance = new GateClient(config);
  } else if (config) {
    gateClientInstance.updateConfig(config);
  }
  return gateClientInstance;
}

export function resetGateClient(): void {
  gateClientInstance = null;
}

// ============================================
// EXPORTS
// ============================================

export default GateClient;
