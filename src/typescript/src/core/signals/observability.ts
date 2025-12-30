/**
 * ENOQ Observability - P2.3
 *
 * Structured event emission, JSON logging, and state metrics.
 *
 * Events:
 * - BOUNDARY_BLOCKED: Request blocked at permit() stage
 * - VERIFY_FAILED: Output failed S5 verification
 * - RUBICON_WITHDRAW: Rubicon threshold triggered withdrawal
 * - PROVIDER_FAILOVER: LLM provider failed, switching to fallback
 *
 * All events are JSON-structured with consistent schema.
 */

// ============================================
// EVENT TYPES
// ============================================

export type EnoqEventType =
  | 'BOUNDARY_BLOCKED'
  | 'VERIFY_FAILED'
  | 'RUBICON_WITHDRAW'
  | 'PROVIDER_FAILOVER'
  | 'PIPELINE_START'
  | 'PIPELINE_END'
  | 'STATE_TRANSITION'
  | 'RESPONSIBILITY_RETURNED'
  | 'RESPONSIBILITY_RETURN_MISSING';

export interface EnoqEventBase {
  /** Event type */
  type: EnoqEventType;
  /** Unix timestamp (ms) */
  timestamp: number;
  /** ISO timestamp string */
  timestamp_iso: string;
  /** Session ID */
  session_id?: string;
  /** Turn number in session */
  turn_number?: number;
  /** Correlation ID for tracing */
  correlation_id: string;
}

export interface BoundaryBlockedEvent extends EnoqEventBase {
  type: 'BOUNDARY_BLOCKED';
  data: {
    signal: string;
    reason: string;
    confidence: number;
    message_preview: string; // First 50 chars
  };
}

export interface VerifyFailedEvent extends EnoqEventBase {
  type: 'VERIFY_FAILED';
  data: {
    violations: Array<{
      invariant: string;
      category: string;
      matched_text?: string;
    }>;
    action: 'STOP' | 'FALLBACK';
    output_preview: string; // First 100 chars
  };
}

export interface RubiconWithdrawEvent extends EnoqEventBase {
  type: 'RUBICON_WITHDRAW';
  data: {
    trigger: string;
    domain: string;
    vertical_level: string;
    rubicon_score: number;
  };
}

export interface ProviderFailoverEvent extends EnoqEventBase {
  type: 'PROVIDER_FAILOVER';
  data: {
    failed_provider: string;
    fallback_provider: string;
    error_type: string;
    error_message: string;
    retry_count: number;
  };
}

export interface PipelineStartEvent extends EnoqEventBase {
  type: 'PIPELINE_START';
  data: {
    input_length: number;
    language_detected?: string;
  };
}

export interface PipelineEndEvent extends EnoqEventBase {
  type: 'PIPELINE_END';
  data: {
    success: boolean;
    output_length: number;
    duration_ms: number;
    states_traversed: string[];
  };
}

export interface StateTransitionEvent extends EnoqEventBase {
  type: 'STATE_TRANSITION';
  data: {
    from_state: string;
    to_state: string;
    duration_ms: number;
  };
}

export interface ResponsibilityReturnedEvent extends EnoqEventBase {
  type: 'RESPONSIBILITY_RETURNED';
  data: {
    runtime: string;
    marker_found: string;
  };
}

export interface ResponsibilityReturnMissingEvent extends EnoqEventBase {
  type: 'RESPONSIBILITY_RETURN_MISSING';
  data: {
    runtime: string;
    output_preview: string;
  };
}

export type EnoqEvent =
  | BoundaryBlockedEvent
  | VerifyFailedEvent
  | RubiconWithdrawEvent
  | ProviderFailoverEvent
  | PipelineStartEvent
  | PipelineEndEvent
  | StateTransitionEvent
  | ResponsibilityReturnedEvent
  | ResponsibilityReturnMissingEvent;

// ============================================
// METRICS COLLECTOR
// ============================================

export interface MetricsSnapshot {
  /** Total events by type */
  event_counts: Record<EnoqEventType, number>;
  /** Total boundary blocks */
  boundary_blocks: number;
  /** Total verification failures */
  verify_failures: number;
  /** Total rubicon withdrawals */
  rubicon_withdrawals: number;
  /** Total provider failovers */
  provider_failovers: number;
  /** Average pipeline duration (ms) */
  avg_pipeline_duration_ms: number;
  /** P95 pipeline duration (ms) */
  p95_pipeline_duration_ms: number;
  /** Success rate (0-1) */
  success_rate: number;
  /** Total pipelines run */
  total_pipelines: number;
  /** Uptime since start (ms) */
  uptime_ms: number;
  /** Snapshot timestamp */
  timestamp: number;
}

interface MetricsState {
  event_counts: Record<EnoqEventType, number>;
  pipeline_durations: number[];
  pipeline_successes: number;
  pipeline_total: number;
  start_time: number;
}

// ============================================
// OBSERVER INTERFACE
// ============================================

export type EventHandler = (event: EnoqEvent) => void;

export interface Observer {
  /** Subscribe to events */
  subscribe(handler: EventHandler): () => void;
  /** Emit an event */
  emit(event: EnoqEvent): void;
  /** Get current metrics snapshot */
  getMetrics(): MetricsSnapshot;
  /** Get recent events (last N) */
  getRecentEvents(n?: number): EnoqEvent[];
  /** Reset metrics (for testing) */
  reset(): void;
}

// ============================================
// OBSERVER IMPLEMENTATION
// ============================================

class ObserverImpl implements Observer {
  private handlers: Set<EventHandler> = new Set();
  private events: EnoqEvent[] = [];
  private maxEvents: number;
  private state: MetricsState;

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
    this.state = this.createInitialState();
  }

  private createInitialState(): MetricsState {
    return {
      event_counts: {
        BOUNDARY_BLOCKED: 0,
        VERIFY_FAILED: 0,
        RUBICON_WITHDRAW: 0,
        PROVIDER_FAILOVER: 0,
        PIPELINE_START: 0,
        PIPELINE_END: 0,
        STATE_TRANSITION: 0,
        RESPONSIBILITY_RETURNED: 0,
        RESPONSIBILITY_RETURN_MISSING: 0,
      },
      pipeline_durations: [],
      pipeline_successes: 0,
      pipeline_total: 0,
      start_time: Date.now(),
    };
  }

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: EnoqEvent): void {
    // Store event
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Update metrics
    this.state.event_counts[event.type]++;

    if (event.type === 'PIPELINE_END') {
      const data = event.data as PipelineEndEvent['data'];
      this.state.pipeline_total++;
      if (data.success) {
        this.state.pipeline_successes++;
      }
      this.state.pipeline_durations.push(data.duration_ms);
      // Keep only last 1000 durations for percentile calc
      if (this.state.pipeline_durations.length > 1000) {
        this.state.pipeline_durations.shift();
      }
    }

    // Notify handlers
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (err) {
        // Don't let handler errors break emission
        if (process.env.ENOQ_DEBUG) {
          console.error('[OBSERVER] Handler error:', err);
        }
      }
    }
  }

  getMetrics(): MetricsSnapshot {
    const durations = this.state.pipeline_durations;
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // P95 calculation
    let p95Duration = 0;
    if (durations.length > 0) {
      const sorted = [...durations].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      p95Duration = sorted[p95Index] ?? sorted[sorted.length - 1];
    }

    return {
      event_counts: { ...this.state.event_counts },
      boundary_blocks: this.state.event_counts.BOUNDARY_BLOCKED,
      verify_failures: this.state.event_counts.VERIFY_FAILED,
      rubicon_withdrawals: this.state.event_counts.RUBICON_WITHDRAW,
      provider_failovers: this.state.event_counts.PROVIDER_FAILOVER,
      avg_pipeline_duration_ms: avgDuration,
      p95_pipeline_duration_ms: p95Duration,
      success_rate: this.state.pipeline_total > 0
        ? this.state.pipeline_successes / this.state.pipeline_total
        : 1,
      total_pipelines: this.state.pipeline_total,
      uptime_ms: Date.now() - this.state.start_time,
      timestamp: Date.now(),
    };
  }

  getRecentEvents(n: number = 100): EnoqEvent[] {
    return this.events.slice(-n);
  }

  reset(): void {
    this.events = [];
    this.state = this.createInitialState();
  }
}

// ============================================
// SINGLETON OBSERVER
// ============================================

let globalObserver: Observer | null = null;

/**
 * Get the global observer instance.
 * Creates one if it doesn't exist.
 */
export function getObserver(): Observer {
  if (!globalObserver) {
    globalObserver = new ObserverImpl();
  }
  return globalObserver;
}

/**
 * Reset the global observer (for testing).
 */
export function resetObserver(): void {
  if (globalObserver) {
    globalObserver.reset();
  }
  globalObserver = null;
}

// ============================================
// EVENT FACTORY FUNCTIONS
// ============================================

let correlationCounter = 0;

function generateCorrelationId(): string {
  return `enoq-${Date.now()}-${++correlationCounter}`;
}

function createEventBase(
  type: EnoqEventType,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): EnoqEventBase {
  const now = Date.now();
  return {
    type,
    timestamp: now,
    timestamp_iso: new Date(now).toISOString(),
    session_id: options?.session_id,
    turn_number: options?.turn_number,
    correlation_id: options?.correlation_id ?? generateCorrelationId(),
  };
}

/**
 * Emit BOUNDARY_BLOCKED event.
 */
export function emitBoundaryBlocked(
  signal: string,
  reason: string,
  confidence: number,
  message: string,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: BoundaryBlockedEvent = {
    ...createEventBase('BOUNDARY_BLOCKED', options),
    type: 'BOUNDARY_BLOCKED',
    data: {
      signal,
      reason,
      confidence,
      message_preview: message.slice(0, 50),
    },
  };
  getObserver().emit(event);
}

/**
 * Emit VERIFY_FAILED event.
 */
export function emitVerifyFailed(
  violations: Array<{ invariant: string; category: string; matched_text?: string }>,
  action: 'STOP' | 'FALLBACK',
  output: string,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: VerifyFailedEvent = {
    ...createEventBase('VERIFY_FAILED', options),
    type: 'VERIFY_FAILED',
    data: {
      violations,
      action,
      output_preview: output.slice(0, 100),
    },
  };
  getObserver().emit(event);
}

/**
 * Emit RUBICON_WITHDRAW event.
 */
export function emitRubiconWithdraw(
  trigger: string,
  domain: string,
  verticalLevel: string,
  rubiconScore: number,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: RubiconWithdrawEvent = {
    ...createEventBase('RUBICON_WITHDRAW', options),
    type: 'RUBICON_WITHDRAW',
    data: {
      trigger,
      domain,
      vertical_level: verticalLevel,
      rubicon_score: rubiconScore,
    },
  };
  getObserver().emit(event);
}

/**
 * Emit PROVIDER_FAILOVER event.
 */
export function emitProviderFailover(
  failedProvider: string,
  fallbackProvider: string,
  errorType: string,
  errorMessage: string,
  retryCount: number,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: ProviderFailoverEvent = {
    ...createEventBase('PROVIDER_FAILOVER', options),
    type: 'PROVIDER_FAILOVER',
    data: {
      failed_provider: failedProvider,
      fallback_provider: fallbackProvider,
      error_type: errorType,
      error_message: errorMessage,
      retry_count: retryCount,
    },
  };
  getObserver().emit(event);
}

/**
 * Emit PIPELINE_START event.
 */
export function emitPipelineStart(
  inputLength: number,
  languageDetected?: string,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): string {
  const correlationId = options?.correlation_id ?? generateCorrelationId();
  const event: PipelineStartEvent = {
    ...createEventBase('PIPELINE_START', { ...options, correlation_id: correlationId }),
    type: 'PIPELINE_START',
    data: {
      input_length: inputLength,
      language_detected: languageDetected,
    },
  };
  getObserver().emit(event);
  return correlationId;
}

/**
 * Emit PIPELINE_END event.
 */
export function emitPipelineEnd(
  success: boolean,
  outputLength: number,
  durationMs: number,
  statesTraversed: string[],
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: PipelineEndEvent = {
    ...createEventBase('PIPELINE_END', options),
    type: 'PIPELINE_END',
    data: {
      success,
      output_length: outputLength,
      duration_ms: durationMs,
      states_traversed: statesTraversed,
    },
  };
  getObserver().emit(event);
}

/**
 * Emit STATE_TRANSITION event.
 */
export function emitStateTransition(
  fromState: string,
  toState: string,
  durationMs: number,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: StateTransitionEvent = {
    ...createEventBase('STATE_TRANSITION', options),
    type: 'STATE_TRANSITION',
    data: {
      from_state: fromState,
      to_state: toState,
      duration_ms: durationMs,
    },
  };
  getObserver().emit(event);
}

/**
 * Emit RESPONSIBILITY_RETURNED event.
 */
export function emitResponsibilityReturned(
  runtime: string,
  markerFound: string,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: ResponsibilityReturnedEvent = {
    ...createEventBase('RESPONSIBILITY_RETURNED', options),
    type: 'RESPONSIBILITY_RETURNED',
    data: {
      runtime,
      marker_found: markerFound,
    },
  };
  getObserver().emit(event);
}

/**
 * Emit RESPONSIBILITY_RETURN_MISSING event.
 */
export function emitResponsibilityReturnMissing(
  runtime: string,
  output: string,
  options?: { session_id?: string; turn_number?: number; correlation_id?: string }
): void {
  const event: ResponsibilityReturnMissingEvent = {
    ...createEventBase('RESPONSIBILITY_RETURN_MISSING', options),
    type: 'RESPONSIBILITY_RETURN_MISSING',
    data: {
      runtime,
      output_preview: output.slice(0, 100),
    },
  };
  getObserver().emit(event);
}

// ============================================
// JSON LOGGER
// ============================================

export interface JsonLoggerOptions {
  /** Output destination (default: console) */
  output?: 'console' | 'stderr' | ((json: string) => void);
  /** Include pretty formatting (default: false) */
  pretty?: boolean;
  /** Include events of these types only */
  filter?: EnoqEventType[];
}

/**
 * Create a JSON logging handler for the observer.
 * Returns unsubscribe function.
 */
export function createJsonLogger(options: JsonLoggerOptions = {}): () => void {
  const output = options.output ?? 'console';
  const pretty = options.pretty ?? false;
  const filter = options.filter ? new Set(options.filter) : null;

  const handler: EventHandler = (event) => {
    if (filter && !filter.has(event.type)) {
      return;
    }

    const json = pretty
      ? JSON.stringify(event, null, 2)
      : JSON.stringify(event);

    if (typeof output === 'function') {
      output(json);
    } else if (output === 'stderr') {
      console.error(json);
    } else {
      console.log(json);
    }
  };

  return getObserver().subscribe(handler);
}

// Types EventHandler and Observer are already exported at their definition points
