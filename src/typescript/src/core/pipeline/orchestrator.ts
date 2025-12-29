/**
 * CORE ORCHESTRATOR - Canonical Entry Point
 *
 * Slice 2 of wiring migration: uses core/modules for boundary + verification.
 *
 * STATES (per README):
 * PERMIT → SENSE → CLARIFY → PLAN → ACT → VERIFY → STOP
 *
 * CURRENT: Core boundary + verification, runtime for middle processing
 * FUTURE: Will orchestrate all core/modules directly
 */

import {
  enoq as runtimeEnoq,
  createSession as runtimeCreateSession,
  Session,
  PipelineResult,
  PipelineConfig,
} from '../../runtime/pipeline/pipeline';

import {
  permit,
  BoundaryDecision,
} from '../modules/boundary';

import {
  verifyOutput,
  VerificationDecision,
} from '../modules/verification';

// ============================================
// SIGNALS (stubs for now)
// ============================================

export type PipelineState =
  | 'PERMIT'
  | 'SENSE'
  | 'CLARIFY'
  | 'PLAN'
  | 'ACT'
  | 'VERIFY'
  | 'STOP';

export interface PipelineSignal {
  state: PipelineState;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SignalEmitter {
  emit(signal: PipelineSignal): void;
  getHistory(): PipelineSignal[];
}

/**
 * Default no-op signal emitter (stub)
 * Will be replaced with real event system in Slice 2+
 */
function createSignalEmitter(): SignalEmitter {
  const history: PipelineSignal[] = [];
  return {
    emit(signal: PipelineSignal) {
      history.push(signal);
      if (process.env.ENOQ_DEBUG) {
        console.log(`[SIGNAL] ${signal.state} @ ${signal.timestamp}`);
      }
    },
    getHistory() {
      return [...history];
    },
  };
}

// ============================================
// CORE ENTRY POINT
// ============================================

export interface CoreConfig extends Partial<PipelineConfig> {
  /** Enable signal emission (default: true) */
  signals_enabled?: boolean;
  /** Enable core boundary classification (default: true) */
  boundary_enabled?: boolean;
  /** Enable core verification (default: true) */
  verification_enabled?: boolean;
}

export interface CoreResult extends PipelineResult {
  /** Signal history for this invocation */
  signals: PipelineSignal[];
  /** Boundary classification decision (Slice 2) */
  boundary?: BoundaryDecision;
  /** Verification decision (Slice 2) */
  verification?: VerificationDecision;
}

/**
 * enoqCore - Canonical entry point for ENOQ processing
 *
 * Slice 2: Uses core/modules for boundary classification.
 * Delegates middle processing to runtime/enoq().
 * Verification runs post-runtime if field/selection available.
 *
 * @param message - User input
 * @param session - Session context (use createCoreSession())
 * @param config - Pipeline configuration
 * @returns CoreResult with response, trace, signals, and boundary decision
 */
export async function enoqCore(
  message: string,
  session: Session,
  config: CoreConfig = {}
): Promise<CoreResult> {
  const emitter = createSignalEmitter();
  const signalsEnabled = config.signals_enabled !== false;
  const boundaryEnabled = config.boundary_enabled !== false;
  const verificationEnabled = config.verification_enabled !== false;

  // ========================================
  // PERMIT - Core boundary classification
  // ========================================
  let boundaryDecision: BoundaryDecision | undefined;

  if (boundaryEnabled) {
    boundaryDecision = permit(message, {
      session_id: session.session_id,
      turn_number: session.turns.length,
    });
  }

  if (signalsEnabled) {
    emitter.emit({
      state: 'PERMIT',
      timestamp: Date.now(),
      metadata: boundaryDecision ? {
        signal: boundaryDecision.classification.signal,
        confidence: boundaryDecision.classification.confidence,
      } : undefined,
    });
  }

  // ========================================
  // SENSE through ACT - Delegate to runtime
  // ========================================
  if (signalsEnabled) {
    emitter.emit({ state: 'SENSE', timestamp: Date.now() });
  }

  // Merge with defaults for runtime compatibility
  const runtimeConfig: PipelineConfig = {
    gate_enabled: config.gate_enabled ?? true,
    ...config,
  };

  const result = await runtimeEnoq(message, session, runtimeConfig);

  // ========================================
  // VERIFY - Core verification (if data available)
  // ========================================
  let verificationDecision: VerificationDecision | undefined;

  if (verificationEnabled && result.trace?.s3_selection && result.trace?.s1_field) {
    if (signalsEnabled) {
      emitter.emit({ state: 'VERIFY', timestamp: Date.now() });
    }

    // Extract language from field (LanguageDetectionResult is the language itself)
    const fieldLang = result.trace.s1_field.language;
    const detectedLang = (fieldLang === 'mixed' || fieldLang === 'unknown' || !fieldLang) ? 'en' : fieldLang;

    verificationDecision = verifyOutput(
      {
        text: result.output,
        field: result.trace.s1_field,
        selection: result.trace.s3_selection,
        language: detectedLang,
      },
      {
        session_id: session.session_id,
        turn_number: session.turns.length,
        previous_hash: 'genesis',
      }
    );
  }

  // ========================================
  // STOP - Always reached
  // ========================================
  if (signalsEnabled) {
    emitter.emit({ state: 'STOP', timestamp: Date.now() });
  }

  return {
    ...result,
    signals: emitter.getHistory(),
    boundary: boundaryDecision,
    verification: verificationDecision,
  };
}

/**
 * createCoreSession - Create session for core pipeline
 *
 * Wrapper over runtime createSession for API consistency.
 */
export function createCoreSession(userId?: string): Session {
  return runtimeCreateSession(userId);
}

// ============================================
// RE-EXPORTS for convenience
// ============================================

export type { Session, PipelineResult, PipelineConfig };
