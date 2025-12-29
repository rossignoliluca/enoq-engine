/**
 * LIMEN HYBRID DIMENSIONAL DETECTOR
 *
 * Combines SOTA (embedding-based) detector with regex fallback.
 *
 * Architecture:
 * - SOTA: 74% accuracy, 91% V_MODE F1 (when API key available)
 * - Regex: 56% accuracy, 48% V_MODE F1 (instant fallback)
 *
 * Features:
 * - Async detectAsync() for SOTA with automatic fallback
 * - Sync detect() for immediate regex results (backward compat)
 * - Configurable via environment variables
 * - Graceful degradation on API failures
 *
 * Usage:
 * ```typescript
 * import { hybridDetector } from './hybrid_detector';
 *
 * // Async (recommended - uses SOTA when available)
 * const state = await hybridDetector.detectAsync(message, language, context);
 *
 * // Sync (always regex, for backward compatibility)
 * const state = hybridDetector.detect(message, language, context);
 * ```
 *
 * Configuration:
 * - OPENAI_API_KEY: Required for SOTA (embedding service)
 * - ENOQ_USE_SOTA: Set to "false" to force regex-only mode
 * - ENOQ_DEBUG: Enable debug logging
 */

import { SupportedLanguage, FieldState } from '../../interface/types';
import {
  dimensionalDetector,
  dimensionalIntegrator,
  DimensionalState,
  DimensionalInsight,
  VerticalDimension
} from './dimensional_system';
import {
  SOTADetector,
  getSOTADetector,
  resetSOTADetector
} from './sota_detector';

// ============================================
// CONFIGURATION
// ============================================

export interface HybridDetectorConfig {
  /** Force regex-only mode (ignore SOTA) */
  force_regex?: boolean;

  /** Enable debug logging */
  debug?: boolean;

  /** Timeout for SOTA detection in ms (default: 5000) */
  sota_timeout_ms?: number;

  /** Fallback to regex on SOTA failure */
  fallback_on_error?: boolean;
}

const DEFAULT_CONFIG: HybridDetectorConfig = {
  force_regex: process.env.ENOQ_USE_SOTA === 'false',
  debug: Boolean(process.env.ENOQ_DEBUG),
  sota_timeout_ms: 5000,
  fallback_on_error: true
};

// ============================================
// HYBRID DETECTOR
// ============================================

export class HybridDimensionalDetector {
  private config: HybridDetectorConfig;
  private sotaDetector: SOTADetector | null = null;
  private sotaInitializing: Promise<SOTADetector> | null = null;
  private sotaAvailable: boolean | null = null;

  constructor(config: HybridDetectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if SOTA detector is available (has API key)
   */
  isSOTAAvailable(): boolean {
    if (this.config.force_regex) return false;
    if (this.sotaAvailable !== null) return this.sotaAvailable;

    // Check for API key
    const hasKey = Boolean(process.env.OPENAI_API_KEY);
    this.sotaAvailable = hasKey;
    return hasKey;
  }

  /**
   * Initialize SOTA detector (lazy, async)
   */
  private async initializeSOTA(): Promise<SOTADetector | null> {
    if (!this.isSOTAAvailable()) return null;

    if (this.sotaDetector) return this.sotaDetector;

    // Prevent multiple simultaneous initializations
    if (this.sotaInitializing) {
      return this.sotaInitializing;
    }

    this.sotaInitializing = (async () => {
      try {
        if (this.config.debug) {
          console.log('[HYBRID] Initializing SOTA detector...');
        }

        const detector = await getSOTADetector({ debug: this.config.debug });
        this.sotaDetector = detector;

        if (this.config.debug) {
          console.log('[HYBRID] SOTA detector initialized');
        }

        return detector;
      } catch (error) {
        console.warn('[HYBRID] Failed to initialize SOTA detector:', error);
        this.sotaAvailable = false;
        throw error;
      } finally {
        this.sotaInitializing = null;
      }
    })();

    return this.sotaInitializing;
  }

  /**
   * SYNC detection using regex only (backward compatible)
   *
   * Use this when you need immediate results and can't await.
   * Accuracy: ~56%
   */
  detect(
    message: string,
    language: SupportedLanguage,
    context?: {
      previous_state?: DimensionalState;
      field_state?: FieldState;
    }
  ): DimensionalState {
    return dimensionalDetector.detect(message, language, context);
  }

  /**
   * ASYNC detection using SOTA with regex fallback
   *
   * Use this for best accuracy when you can await.
   * Accuracy: ~74% (SOTA) / ~56% (fallback)
   */
  async detectAsync(
    message: string,
    language: SupportedLanguage,
    context?: {
      previous_state?: DimensionalState;
      field_state?: FieldState;
    }
  ): Promise<DimensionalState> {
    // Try SOTA first
    if (this.isSOTAAvailable()) {
      try {
        const detector = await this.initializeSOTA();

        if (detector) {
          // Apply timeout
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('SOTA timeout')), this.config.sota_timeout_ms);
          });

          const result = await Promise.race([
            detector.detect(message, language, context),
            timeoutPromise
          ]);

          if (this.config.debug) {
            console.log(`[HYBRID] SOTA result: v_mode=${result.v_mode_triggered}, emergency=${result.emergency_detected}, primary=${result.primary_vertical}`);
          }

          return result;
        }
      } catch (error) {
        if (this.config.debug) {
          console.warn('[HYBRID] SOTA detection failed, falling back to regex:', error);
        }

        if (!this.config.fallback_on_error) {
          throw error;
        }
      }
    }

    // Fallback to regex
    if (this.config.debug) {
      console.log('[HYBRID] Using regex fallback');
    }

    return this.detect(message, language, context);
  }

  /**
   * Get detection method info
   */
  getMethodInfo(): {
    method: 'SOTA' | 'REGEX';
    accuracy: number;
    v_mode_f1: number;
    latency_estimate_ms: number;
  } {
    if (this.isSOTAAvailable() && this.sotaDetector?.isInitialized()) {
      return {
        method: 'SOTA',
        accuracy: 0.74,
        v_mode_f1: 0.91,
        latency_estimate_ms: 500
      };
    }

    return {
      method: 'REGEX',
      accuracy: 0.56,
      v_mode_f1: 0.48,
      latency_estimate_ms: 2
    };
  }

  /**
   * Reset detector state (useful for testing)
   */
  reset(): void {
    this.sotaDetector = null;
    this.sotaInitializing = null;
    this.sotaAvailable = null;
    resetSOTADetector();
  }

  /**
   * Pre-warm the detector (call at app startup)
   */
  async warmup(): Promise<void> {
    if (this.isSOTAAvailable()) {
      await this.initializeSOTA();
    }
  }
}

// ============================================
// SINGLETON EXPORTS
// ============================================

export const hybridDetector = new HybridDimensionalDetector();

// Re-export integrator utilities
export { dimensionalIntegrator, DimensionalInsight, VerticalDimension };

export default hybridDetector;
