/**
 * CORE ORCHESTRATOR - Canonical Entry Point
 *
 * Slice 1 of wiring migration: wrapper over runtime/pipeline.
 * Zero logic change, just establishes core as the import target.
 *
 * STATES (per README):
 * PERMIT → SENSE → CLARIFY → PLAN → ACT → VERIFY → STOP
 *
 * CURRENT: Delegates entirely to runtime/enoq()
 * FUTURE: Will orchestrate core/modules directly
 */

import {
  enoq as runtimeEnoq,
  createSession as runtimeCreateSession,
  Session,
  PipelineResult,
  PipelineConfig,
} from '../../runtime/pipeline/pipeline';

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
}

export interface CoreResult extends PipelineResult {
  /** Signal history for this invocation */
  signals: PipelineSignal[];
}

/**
 * enoqCore - Canonical entry point for ENOQ processing
 *
 * This is the wrapper that will eventually orchestrate core/modules.
 * Currently delegates to runtime/enoq() while emitting state signals.
 *
 * @param message - User input
 * @param session - Session context (use createCoreSession())
 * @param config - Pipeline configuration
 * @returns CoreResult with response, trace, and signals
 */
export async function enoqCore(
  message: string,
  session: Session,
  config: CoreConfig = {}
): Promise<CoreResult> {
  const emitter = createSignalEmitter();
  const signalsEnabled = config.signals_enabled !== false;

  // PERMIT - Entry check (stub: always permits for now)
  if (signalsEnabled) {
    emitter.emit({ state: 'PERMIT', timestamp: Date.now() });
  }

  // SENSE through VERIFY - Delegate to runtime
  if (signalsEnabled) {
    emitter.emit({ state: 'SENSE', timestamp: Date.now() });
  }

  // Merge with defaults for runtime compatibility
  const runtimeConfig: PipelineConfig = {
    gate_enabled: config.gate_enabled ?? true,
    ...config,
  };

  const result = await runtimeEnoq(message, session, runtimeConfig);

  // STOP - Always reached
  if (signalsEnabled) {
    emitter.emit({ state: 'STOP', timestamp: Date.now() });
  }

  return {
    ...result,
    signals: emitter.getHistory(),
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
