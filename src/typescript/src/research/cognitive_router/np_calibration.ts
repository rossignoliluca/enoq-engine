/**
 * NP-CALIBRATED THRESHOLD - Research Module
 *
 * Neyman-Pearson style threshold calibration for selective classification.
 *
 * This is NOT pure conformal prediction. It's NP-calibrated thresholding
 * on the positive class (V_MODE cases) to find τ such that:
 *
 *   P(A(x) > τ | y = v_mode) ≤ α
 *
 * Which implies recall ≥ 1-α on the calibration distribution.
 *
 * IMPORTANT CAVEATS:
 * 1. Guarantee holds only if test distribution ≈ calibration distribution
 * 2. With n positives, τ has variance ~O(1/√n)
 * 3. For stable 95% target, need ~100+ positive samples
 * 4. A(x) is a proxy score, not true P(v_mode|x)
 *
 * References:
 * - Chow (1970): Optimal error-reject tradeoff
 * - Scott & Nowak (2005): NP classification
 * - El-Yaniv & Wiener (2010): Selective classification
 * - Vovk (2005): Conformal quantile correction
 */

import { DimensionalState, DimensionalDetector } from '../../operational/detectors/dimensional_system';
import { BENCHMARK_CASES, BenchmarkCase } from '../../benchmarks/cases/benchmark_cases';
import { SupportedLanguage } from '../../interface/types';
import { getBoostedExistentialScore, LexiconMatch } from './existential_lexicon';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TYPES
// ============================================

export interface CalibrationConfig {
  /** Target recall (1-α). Default 0.95 */
  target_recall: number;

  /** Minimum positives required for stable calibration */
  min_positives: number;

  /** Use finite-sample correction (n+1 denominator) */
  finite_sample_correction: boolean;
}

export interface CalibrationResult {
  /** Calibrated threshold */
  τ: number;

  /** Target recall used */
  target_recall: number;

  /** Alpha = 1 - target_recall */
  α: number;

  /** Number of positive samples used */
  n_positives: number;

  /** Number of negative samples */
  n_negatives: number;

  /** Estimated skip rate on negatives (efficiency) */
  estimated_skip_rate: number;

  /** Score distribution statistics */
  score_stats: {
    positive_mean: number;
    positive_std: number;
    positive_min: number;
    positive_max: number;
    negative_mean: number;
    negative_std: number;
  };

  /** Stability warning if n_positives < threshold */
  stability_warning: string | null;

  /** Calibration timestamp */
  timestamp: string;

  /** Cases used for calibration */
  calibration_cases: number;
}

export interface NonconformityScore {
  /** The score A(x) - higher = more confident NOT v_mode */
  score: number;

  /** Components that contributed to the score */
  components: {
    base_existential: number;
    lexicon_boost: number;
    boosted_existential: number;
    v_mode_adjustment: number;
    ambiguity_adjustment: number;
  };

  /** Lexicon matches found */
  lexicon_matches: LexiconMatch[];
}

// ============================================
// NONCONFORMITY SCORE
// ============================================

/**
 * Compute nonconformity score A(x).
 *
 * Interpretation:
 *   A(x) high → confident this is NOT v_mode → safe to skip LLM
 *   A(x) low  → might be v_mode → call LLM to be safe
 *
 * This is a PROXY for 1 - P(v_mode|x), not the true posterior.
 * Optimality is relative to the ranking induced by A(x).
 *
 * KEY IMPROVEMENT (v5.1):
 * Uses existential lexicon to boost score when regex misses patterns.
 * This allows us to "see" cases like "Sono stanco di tutto" that regex
 * completely misses (existential_score = 0).
 */
export function computeNonconformityScore(
  state: DimensionalState,
  message: string
): NonconformityScore {
  const components = {
    base_existential: 0,
    lexicon_boost: 0,
    boosted_existential: 0,
    v_mode_adjustment: 0,
    ambiguity_adjustment: 0,
  };

  // Step 1: Get base existential score from regex
  components.base_existential = state.vertical.EXISTENTIAL;

  // Step 2: Apply lexicon boost for "invisible" cases
  // This is the KEY improvement: catch cases where regex gives 0
  const { score: boostedScore, lexicon_boost, matches } = getBoostedExistentialScore(
    state.vertical.EXISTENTIAL,
    message
  );
  components.lexicon_boost = lexicon_boost;
  components.boosted_existential = boostedScore;

  // Step 3: A(x) = 1 - boosted_existential_score
  let score = 1 - boostedScore;

  // Adjustment 1: If V_MODE already triggered, very low score (likely v_mode)
  if (state.v_mode_triggered) {
    components.v_mode_adjustment = -0.6;
    score = Math.min(score, 0.15);
  }

  // Adjustment 2: Ambiguity between top dimensions
  const verticalScores = Object.values(state.vertical).sort((a, b) => b - a);
  const gap = verticalScores[0] - (verticalScores[1] || 0);

  if (gap < 0.15) {
    // Very ambiguous: reduce score (more likely to need LLM)
    components.ambiguity_adjustment = -0.15;
    score -= 0.15;
  } else if (gap < 0.25) {
    // Somewhat ambiguous
    components.ambiguity_adjustment = -0.08;
    score -= 0.08;
  }

  // Clamp to [0, 1]
  score = Math.max(0, Math.min(1, score));

  return { score, components, lexicon_matches: matches };
}

// ============================================
// CALIBRATION
// ============================================

const DEFAULT_CONFIG: CalibrationConfig = {
  target_recall: 0.95,
  min_positives: 20,
  finite_sample_correction: true,
};

/**
 * Calibrate threshold τ using NP-style quantile on positives.
 *
 * The threshold τ is chosen such that:
 *   P(A(x) > τ | y = v_mode) ≤ α
 *
 * This means at most α fraction of true v_mode cases will be skipped.
 */
export function calibrateThreshold(
  cases: BenchmarkCase[],
  config: Partial<CalibrationConfig> = {}
): CalibrationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const α = 1 - cfg.target_recall;

  const detector = new DimensionalDetector();

  // Compute scores for all cases
  const positiveScores: number[] = [];
  const negativeScores: number[] = [];

  for (const c of cases) {
    const state = detector.detect(c.input, c.lang);
    const { score } = computeNonconformityScore(state, c.input);

    if (c.expected.v_mode) {
      positiveScores.push(score);
    } else {
      negativeScores.push(score);
    }
  }

  const n = positiveScores.length;

  // Check stability
  let stability_warning: string | null = null;
  if (n < cfg.min_positives) {
    stability_warning = `Only ${n} positive samples (< ${cfg.min_positives}). Threshold may be unstable.`;
  }
  if (n < 10) {
    stability_warning = `CRITICAL: Only ${n} positive samples. Cannot reliably calibrate for 95% recall.`;
  }

  // Sort positive scores
  const sortedPositives = [...positiveScores].sort((a, b) => a - b);

  // Find quantile index
  // We want τ such that (1-α) fraction of positives have A ≤ τ
  // This means at most α fraction will have A > τ (and be skipped incorrectly)
  let idx: number;
  if (cfg.finite_sample_correction) {
    // Conformal-style: use (n+1) for finite-sample correction
    idx = Math.ceil((1 - α) * (n + 1)) - 1;
  } else {
    idx = Math.ceil((1 - α) * n) - 1;
  }

  // Clamp index and get threshold
  idx = Math.max(0, Math.min(n - 1, idx));
  const τ = sortedPositives[idx];

  // Estimate skip rate on negatives
  const skippedNegatives = negativeScores.filter(s => s > τ).length;
  const estimated_skip_rate = negativeScores.length > 0
    ? skippedNegatives / negativeScores.length
    : 0;

  // Compute statistics
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = (arr: number[]) => {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  };

  return {
    τ,
    target_recall: cfg.target_recall,
    α,
    n_positives: n,
    n_negatives: negativeScores.length,
    estimated_skip_rate,
    score_stats: {
      positive_mean: mean(positiveScores),
      positive_std: std(positiveScores),
      positive_min: Math.min(...positiveScores),
      positive_max: Math.max(...positiveScores),
      negative_mean: negativeScores.length > 0 ? mean(negativeScores) : 0,
      negative_std: negativeScores.length > 0 ? std(negativeScores) : 0,
    },
    stability_warning,
    timestamp: new Date().toISOString(),
    calibration_cases: cases.length,
  };
}

// ============================================
// PERSISTENCE
// ============================================

/**
 * Save calibration result to JSON file.
 */
export function saveCalibration(
  result: CalibrationResult,
  filepath?: string
): string {
  const defaultPath = path.join(__dirname, '../artifacts/tau.json');
  const targetPath = filepath || defaultPath;

  // Ensure directory exists
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(result, null, 2));
  return targetPath;
}

/**
 * Load calibration result from JSON file.
 */
export function loadCalibration(filepath?: string): CalibrationResult | null {
  const defaultPath = path.join(__dirname, '../artifacts/tau.json');
  const targetPath = filepath || defaultPath;

  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  return JSON.parse(content) as CalibrationResult;
}

// ============================================
// CLI RUNNER
// ============================================

export function runCalibration(): CalibrationResult {
  console.log('\n========================================');
  console.log('  NP-CALIBRATED THRESHOLD CALIBRATION');
  console.log('========================================\n');

  console.log(`Using ${BENCHMARK_CASES.length} benchmark cases...`);

  const result = calibrateThreshold(BENCHMARK_CASES);

  console.log('\n--- CALIBRATION RESULT ---\n');
  console.log(`Target recall:     ${(result.target_recall * 100).toFixed(0)}%`);
  console.log(`Alpha (α):         ${result.α.toFixed(3)}`);
  console.log(`Threshold (τ):     ${result.τ.toFixed(4)}`);
  console.log(`Positive samples:  ${result.n_positives}`);
  console.log(`Negative samples:  ${result.n_negatives}`);
  console.log(`Est. skip rate:    ${(result.estimated_skip_rate * 100).toFixed(1)}%`);

  console.log('\n--- SCORE DISTRIBUTION ---\n');
  console.log(`Positive scores:   ${result.score_stats.positive_mean.toFixed(3)} ± ${result.score_stats.positive_std.toFixed(3)}`);
  console.log(`                   [${result.score_stats.positive_min.toFixed(3)}, ${result.score_stats.positive_max.toFixed(3)}]`);
  console.log(`Negative scores:   ${result.score_stats.negative_mean.toFixed(3)} ± ${result.score_stats.negative_std.toFixed(3)}`);

  if (result.stability_warning) {
    console.log(`\n⚠️  WARNING: ${result.stability_warning}`);
  }

  const savedPath = saveCalibration(result);
  console.log(`\n✓ Saved to ${savedPath}`);

  return result;
}

// Run if executed directly
if (require.main === module) {
  runCalibration();
}
