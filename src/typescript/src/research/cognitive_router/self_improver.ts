/**
 * SELF IMPROVER - Research Module (v6.0 Candidate)
 *
 * LADDER-style recursive self-improvement through error analysis.
 *
 * References:
 * - Wei et al. (2025) "LADDER: Self-Improving LLMs Through Recursive Problem Decomposition"
 * - Sakana AI "Darwin Gödel Machine" (2024)
 * - Anthropic "Constitutional AI" (2023)
 *
 * Key insight: When LLM corrects regex detector, we can:
 * 1. Analyze WHY regex was wrong
 * 2. Generate simpler variants of the failed case
 * 3. Add to training data for regex improvement
 * 4. Recursively improve until regex catches the pattern
 *
 * RESEARCH STATUS: Stub implementation
 * PROMOTION CRITERIA:
 * - Must reduce regex error rate by ≥10% after 1000 corrections
 * - Must not introduce new failure modes
 * - Must generate valid training examples (no hallucination)
 */

import { DimensionalState } from '../../operational/detectors/dimensional_system';
import { RegimeClassification } from '../../operational/detectors/llm_detector_v2';

// ============================================
// TYPES
// ============================================

export interface ImprovementConfig {
  /** Minimum corrections before improvement attempt */
  min_corrections: number;

  /** Maximum variants to generate per error */
  max_variants: number;

  /** Confidence threshold for using LLM correction */
  llm_confidence_threshold: number;

  /** Enable automatic regex retraining */
  auto_retrain: boolean;
}

export interface CorrectionRecord {
  /** Original message */
  message: string;

  /** Regex detection result */
  regex_result: {
    v_mode: boolean;
    emergency: boolean;
    primary_vertical: string;
    confidence: number;
  };

  /** LLM correction */
  llm_result: {
    v_mode: boolean;
    emergency: boolean;
    primary_vertical: string;
    confidence: number;
  };

  /** Error type */
  error_type: 'false_positive' | 'false_negative' | 'wrong_vertical';

  /** Generated variants */
  variants: string[];

  /** Timestamp */
  timestamp: number;
}

export interface ImprovementStats {
  /** Total corrections recorded */
  total_corrections: number;

  /** Corrections by error type */
  by_error_type: Record<string, number>;

  /** Variants generated */
  variants_generated: number;

  /** Improvement cycles run */
  cycles_run: number;

  /** Estimated error reduction */
  estimated_improvement: number;
}

// ============================================
// STUB IMPLEMENTATION
// ============================================

export class SelfImprover {
  private config: ImprovementConfig;
  private corrections: CorrectionRecord[] = [];
  private generatedVariants: Map<string, string[]> = new Map();
  private cyclesRun: number = 0;

  constructor(config: Partial<ImprovementConfig> = {}) {
    this.config = {
      min_corrections: 10,
      max_variants: 5,
      llm_confidence_threshold: 0.8,
      auto_retrain: false,
      ...config,
    };
  }

  /**
   * Record a correction where LLM disagreed with regex.
   */
  recordCorrection(
    message: string,
    regexState: DimensionalState,
    llmResult: RegimeClassification
  ): CorrectionRecord | null {
    // Only record if LLM is confident
    if (llmResult.confidence < this.config.llm_confidence_threshold) {
      return null;
    }

    // Determine error type
    let error_type: CorrectionRecord['error_type'];

    if (regexState.v_mode_triggered && !llmResult.v_mode.triggered) {
      error_type = 'false_positive';
    } else if (!regexState.v_mode_triggered && llmResult.v_mode.triggered) {
      error_type = 'false_negative';
    } else if (regexState.primary_vertical !== this.mapRegimeToVertical(llmResult.regime)) {
      error_type = 'wrong_vertical';
    } else {
      // No significant error
      return null;
    }

    // Generate variants
    const variants = this.generateVariants(message, error_type);

    const record: CorrectionRecord = {
      message,
      regex_result: {
        v_mode: regexState.v_mode_triggered,
        emergency: regexState.emergency_detected,
        primary_vertical: regexState.primary_vertical,
        confidence: Math.max(...Object.values(regexState.vertical)),
      },
      llm_result: {
        v_mode: llmResult.v_mode.triggered,
        emergency: llmResult.emergency.triggered,
        primary_vertical: this.mapRegimeToVertical(llmResult.regime),
        confidence: llmResult.confidence,
      },
      error_type,
      variants,
      timestamp: Date.now(),
    };

    this.corrections.push(record);
    this.generatedVariants.set(message, variants);

    // Trigger improvement cycle if enough corrections
    if (this.corrections.length >= this.config.min_corrections) {
      this.runImprovementCycle();
    }

    return record;
  }

  /**
   * Generate simpler variants of a failed case.
   * TODO: Use LLM to generate semantically similar variants.
   */
  private generateVariants(message: string, errorType: string): string[] {
    const variants: string[] = [];

    // For now, simple rule-based variants
    // In production: use LLM to generate semantically similar variants

    // Remove punctuation
    variants.push(message.replace(/[.,!?;:]/g, ''));

    // Lowercase
    variants.push(message.toLowerCase());

    // Add context hint
    if (errorType === 'false_negative') {
      variants.push(message + ' (esistenziale)');
      variants.push('Penso: ' + message);
    }

    // Simplify
    const words = message.split(' ');
    if (words.length > 3) {
      variants.push(words.slice(0, 3).join(' '));
      variants.push(words.slice(-3).join(' '));
    }

    return variants.slice(0, this.config.max_variants);
  }

  /**
   * Map regime to vertical dimension.
   */
  private mapRegimeToVertical(regime: string): string {
    switch (regime) {
      case 'existential':
        return 'EXISTENTIAL';
      case 'functional':
        return 'FUNCTIONAL';
      case 'relational':
        return 'RELATIONAL';
      case 'crisis':
      case 'somatic':
        return 'SOMATIC';
      default:
        return 'FUNCTIONAL';
    }
  }

  /**
   * Run improvement cycle.
   * Analyzes patterns in corrections and generates training data.
   */
  private runImprovementCycle(): void {
    this.cyclesRun++;

    // Analyze patterns in false negatives (most critical)
    const falseNegatives = this.corrections.filter(
      (c) => c.error_type === 'false_negative'
    );

    // TODO: Implement pattern analysis
    // 1. Cluster similar messages
    // 2. Extract common features (words, patterns)
    // 3. Generate new regex patterns
    // 4. Validate against all corrections

    // For now, just log
    console.log(
      `[SelfImprover] Cycle ${this.cyclesRun}: ${falseNegatives.length} false negatives analyzed`
    );
  }

  /**
   * Get training data generated from corrections.
   */
  getTrainingData(): Array<{
    input: string;
    label: {
      v_mode: boolean;
      emergency: boolean;
      primary_vertical: string;
    };
    source: 'correction' | 'variant';
  }> {
    const data: Array<{
      input: string;
      label: {
        v_mode: boolean;
        emergency: boolean;
        primary_vertical: string;
      };
      source: 'correction' | 'variant';
    }> = [];

    for (const correction of this.corrections) {
      // Add original
      data.push({
        input: correction.message,
        label: {
          v_mode: correction.llm_result.v_mode,
          emergency: correction.llm_result.emergency,
          primary_vertical: correction.llm_result.primary_vertical,
        },
        source: 'correction',
      });

      // Add variants
      for (const variant of correction.variants) {
        data.push({
          input: variant,
          label: {
            v_mode: correction.llm_result.v_mode,
            emergency: correction.llm_result.emergency,
            primary_vertical: correction.llm_result.primary_vertical,
          },
          source: 'variant',
        });
      }
    }

    return data;
  }

  /**
   * Get improvement statistics.
   */
  getStats(): ImprovementStats {
    const byErrorType: Record<string, number> = {
      false_positive: 0,
      false_negative: 0,
      wrong_vertical: 0,
    };

    for (const c of this.corrections) {
      byErrorType[c.error_type]++;
    }

    const totalVariants = this.corrections.reduce(
      (sum, c) => sum + c.variants.length,
      0
    );

    return {
      total_corrections: this.corrections.length,
      by_error_type: byErrorType,
      variants_generated: totalVariants,
      cycles_run: this.cyclesRun,
      estimated_improvement: this.cyclesRun * 0.02, // Rough estimate
    };
  }

  /**
   * Clear all data.
   */
  clear(): void {
    this.corrections = [];
    this.generatedVariants.clear();
    this.cyclesRun = 0;
  }

  /**
   * Export corrections for external analysis.
   */
  exportCorrections(): CorrectionRecord[] {
    return [...this.corrections];
  }
}

export default SelfImprover;
