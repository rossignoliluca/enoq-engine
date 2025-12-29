/**
 * DETECTOR BENCHMARK TEST SUITE
 *
 * ============================================================================
 * PURPOSE: This benchmark documents KNOWN LIMITATIONS of the regex detector.
 * It is NON-BLOCKING by design - used to measure llm_detector_v2 improvements.
 * ============================================================================
 *
 * 50 carefully curated test cases for comparing detection systems:
 * - Current regex-based dimensional_system.ts (baseline)
 * - Future LLM-powered detector (target)
 *
 * Categories:
 * - Existential clear (10 cases) - should always trigger V_MODE
 * - Existential subtle (10 cases) - hardest, need LLM
 * - Emergency real (5 cases) - should trigger emergency
 * - Emergency false positive (5 cases) - should NOT trigger emergency
 * - Functional (5 cases) - work/task oriented
 * - Relational (5 cases) - relationship focused
 * - Edge cases multilingual (5 cases) - code-switching, slang, etc.
 * - Ambiguous (5 cases) - context-dependent
 *
 * BASELINE SNAPSHOT: artifacts/detector_benchmark_baseline.json
 * TARGET: 16 failures → ≤3, maintaining FP <2%
 *
 * Known limitation: regex detector misses subtle existential cues.
 * Benchmark is non-blocking; used to evaluate llm_detector_v2.
 *
 * RUN: npx jest detector_benchmark.test.ts
 */

import { DimensionalDetector, VerticalDimension, DimensionalState } from '../operational/detectors/dimensional_system';
import { BENCHMARK_CASES, BenchmarkCase } from '../benchmarks/cases/benchmark_cases';

// ============================================
// BENCHMARK RUNNER
// ============================================

interface BenchmarkResult {
  case_id: string;
  input: string;
  expected_v_mode: boolean;
  actual_v_mode: boolean;
  expected_emergency: boolean;
  actual_emergency: boolean;
  expected_primary_vertical: VerticalDimension;
  actual_primary_vertical: VerticalDimension;
  v_mode_correct: boolean;
  emergency_correct: boolean;
  vertical_correct: boolean;
  category: string;
  difficulty: string;
}

function runBenchmark(): {
  results: BenchmarkResult[];
  metrics: {
    overall_accuracy: number;
    v_mode_precision: number;
    v_mode_recall: number;
    v_mode_f1: number;
    emergency_precision: number;
    emergency_recall: number;
    emergency_f1: number;
    by_category: Record<string, { total: number; correct: number; accuracy: number }>;
    by_difficulty: Record<string, { total: number; correct: number; accuracy: number }>;
  };
} {
  const detector = new DimensionalDetector();
  const results: BenchmarkResult[] = [];

  // V_MODE tracking
  let v_mode_tp = 0;
  let v_mode_fp = 0;
  let v_mode_fn = 0;
  let v_mode_tn = 0;

  // Emergency tracking
  let emerg_tp = 0;
  let emerg_fp = 0;
  let emerg_fn = 0;
  let emerg_tn = 0;

  // Category/difficulty tracking
  const by_category: Record<string, { total: number; correct: number }> = {};
  const by_difficulty: Record<string, { total: number; correct: number }> = {};

  for (const tc of BENCHMARK_CASES) {
    const state = detector.detect(tc.input, tc.lang);

    const v_mode_correct = state.v_mode_triggered === tc.expected.v_mode;
    const emergency_correct = state.emergency_detected === tc.expected.emergency;
    const vertical_correct = state.primary_vertical === tc.expected.primary_vertical;

    // V_MODE confusion matrix
    if (tc.expected.v_mode && state.v_mode_triggered) v_mode_tp++;
    else if (!tc.expected.v_mode && state.v_mode_triggered) v_mode_fp++;
    else if (tc.expected.v_mode && !state.v_mode_triggered) v_mode_fn++;
    else v_mode_tn++;

    // Emergency confusion matrix
    if (tc.expected.emergency && state.emergency_detected) emerg_tp++;
    else if (!tc.expected.emergency && state.emergency_detected) emerg_fp++;
    else if (tc.expected.emergency && !state.emergency_detected) emerg_fn++;
    else emerg_tn++;

    // By category
    if (!by_category[tc.category]) by_category[tc.category] = { total: 0, correct: 0 };
    by_category[tc.category].total++;
    if (v_mode_correct && emergency_correct) by_category[tc.category].correct++;

    // By difficulty
    if (!by_difficulty[tc.difficulty]) by_difficulty[tc.difficulty] = { total: 0, correct: 0 };
    by_difficulty[tc.difficulty].total++;
    if (v_mode_correct && emergency_correct) by_difficulty[tc.difficulty].correct++;

    results.push({
      case_id: tc.id,
      input: tc.input.substring(0, 40) + (tc.input.length > 40 ? '...' : ''),
      expected_v_mode: tc.expected.v_mode,
      actual_v_mode: state.v_mode_triggered,
      expected_emergency: tc.expected.emergency,
      actual_emergency: state.emergency_detected,
      expected_primary_vertical: tc.expected.primary_vertical,
      actual_primary_vertical: state.primary_vertical,
      v_mode_correct,
      emergency_correct,
      vertical_correct,
      category: tc.category,
      difficulty: tc.difficulty
    });
  }

  // Calculate metrics
  const v_mode_precision = v_mode_tp / (v_mode_tp + v_mode_fp) || 0;
  const v_mode_recall = v_mode_tp / (v_mode_tp + v_mode_fn) || 0;
  const v_mode_f1 = 2 * (v_mode_precision * v_mode_recall) / (v_mode_precision + v_mode_recall) || 0;

  const emerg_precision = emerg_tp / (emerg_tp + emerg_fp) || 0;
  const emerg_recall = emerg_tp / (emerg_tp + emerg_fn) || 0;
  const emerg_f1 = 2 * (emerg_precision * emerg_recall) / (emerg_precision + emerg_recall) || 0;

  const overall_correct = results.filter(r => r.v_mode_correct && r.emergency_correct).length;
  const overall_accuracy = overall_correct / results.length;

  const cat_metrics: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const [cat, data] of Object.entries(by_category)) {
    cat_metrics[cat] = { ...data, accuracy: data.correct / data.total };
  }

  const diff_metrics: Record<string, { total: number; correct: number; accuracy: number }> = {};
  for (const [diff, data] of Object.entries(by_difficulty)) {
    diff_metrics[diff] = { ...data, accuracy: data.correct / data.total };
  }

  return {
    results,
    metrics: {
      overall_accuracy,
      v_mode_precision,
      v_mode_recall,
      v_mode_f1,
      emergency_precision: emerg_precision,
      emergency_recall: emerg_recall,
      emergency_f1: emerg_f1,
      by_category: cat_metrics,
      by_difficulty: diff_metrics
    }
  };
}

// ============================================
// TESTS
// ============================================

describe('Detector Benchmark', () => {
  const detector = new DimensionalDetector();

  describe('Existential Clear Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'existential_clear');

    cases.forEach(tc => {
      it(`[${tc.id}] should trigger V_MODE for: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        expect(state.v_mode_triggered).toBe(tc.expected.v_mode);
        expect(state.emergency_detected).toBe(tc.expected.emergency);
      });
    });
  });

  describe('Existential Subtle Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'existential_subtle');

    cases.forEach(tc => {
      it(`[${tc.id}] should detect: "${tc.input.substring(0, 30)}..." (difficulty: ${tc.difficulty})`, () => {
        const state = detector.detect(tc.input, tc.lang);
        // Log for debugging hard cases
        if (!state.v_mode_triggered && tc.expected.v_mode) {
          console.log(`MISS [${tc.id}]: "${tc.input}" → EXISTENTIAL: ${state.vertical.EXISTENTIAL.toFixed(2)}`);
        }
        expect(state.v_mode_triggered).toBe(tc.expected.v_mode);
      });
    });
  });

  describe('Emergency Real Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'emergency_real');

    cases.forEach(tc => {
      it(`[${tc.id}] should detect emergency: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        expect(state.emergency_detected).toBe(tc.expected.emergency);
        expect(state.v_mode_triggered).toBe(tc.expected.v_mode);
      });
    });
  });

  describe('Emergency False Positive Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'emergency_false_positive');

    cases.forEach(tc => {
      it(`[${tc.id}] should NOT trigger emergency: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        expect(state.emergency_detected).toBe(false);
      });
    });
  });

  describe('Functional Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'functional');

    cases.forEach(tc => {
      it(`[${tc.id}] should NOT trigger V_MODE: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        expect(state.v_mode_triggered).toBe(tc.expected.v_mode);
      });
    });
  });

  describe('Relational Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'relational');

    cases.forEach(tc => {
      it(`[${tc.id}] should detect relational: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        expect(state.v_mode_triggered).toBe(tc.expected.v_mode);
        expect(state.emergency_detected).toBe(tc.expected.emergency);
      });
    });
  });

  describe('Edge Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'edge_case');

    cases.forEach(tc => {
      it(`[${tc.id}] edge case: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        // Just check no crash for now - these are hard
        expect(state).toBeDefined();
      });
    });
  });

  describe('Ambiguous Cases', () => {
    const cases = BENCHMARK_CASES.filter(c => c.category === 'ambiguous');

    cases.forEach(tc => {
      it(`[${tc.id}] ambiguous: "${tc.input.substring(0, 30)}..."`, () => {
        const state = detector.detect(tc.input, tc.lang);
        // Log for analysis
        console.log(`[${tc.id}] "${tc.input}" → V_MODE: ${state.v_mode_triggered}, EXIS: ${state.vertical.EXISTENTIAL.toFixed(2)}`);
        expect(state).toBeDefined();
      });
    });
  });
});

describe('Benchmark Metrics', () => {
  it('should calculate comprehensive metrics', () => {
    const benchmark = runBenchmark();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║               DETECTOR BENCHMARK RESULTS                       ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Overall Accuracy:       ${(benchmark.metrics.overall_accuracy * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ V_MODE Precision:       ${(benchmark.metrics.v_mode_precision * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log(`║ V_MODE Recall:          ${(benchmark.metrics.v_mode_recall * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log(`║ V_MODE F1:              ${(benchmark.metrics.v_mode_f1 * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Emergency Precision:    ${(benchmark.metrics.emergency_precision * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log(`║ Emergency Recall:       ${(benchmark.metrics.emergency_recall * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log(`║ Emergency F1:           ${(benchmark.metrics.emergency_f1 * 100).toFixed(1).padStart(5)}%                              ║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ BY CATEGORY                                                    ║');
    for (const [cat, data] of Object.entries(benchmark.metrics.by_category)) {
      const catName = cat.padEnd(25);
      const acc = (data.accuracy * 100).toFixed(0).padStart(3);
      console.log(`║   ${catName} ${acc}% (${data.correct}/${data.total})                   ║`.substring(0, 67) + '║');
    }
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ BY DIFFICULTY                                                  ║');
    for (const [diff, data] of Object.entries(benchmark.metrics.by_difficulty)) {
      const diffName = diff.padEnd(10);
      const acc = (data.accuracy * 100).toFixed(0).padStart(3);
      console.log(`║   ${diffName} ${acc}% (${data.correct}/${data.total})                              ║`.substring(0, 67) + '║');
    }
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // Print failures for analysis
    const failures = benchmark.results.filter(r => !r.v_mode_correct || !r.emergency_correct);
    if (failures.length > 0) {
      console.log('\n=== FAILURES ===');
      failures.forEach(f => {
        console.log(`[${f.case_id}] "${f.input}"`);
        if (!f.v_mode_correct) {
          console.log(`  V_MODE: expected ${f.expected_v_mode}, got ${f.actual_v_mode}`);
        }
        if (!f.emergency_correct) {
          console.log(`  EMERGENCY: expected ${f.expected_emergency}, got ${f.actual_emergency}`);
        }
      });
    }

    // Assertions
    expect(benchmark.metrics.overall_accuracy).toBeGreaterThan(0); // At least some pass
    expect(benchmark.results.length).toBe(50);
  });
});

// Export for external use
export { BENCHMARK_CASES, runBenchmark, BenchmarkCase, BenchmarkResult };
