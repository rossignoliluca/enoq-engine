/**
 * LLM DETECTOR V2 BENCHMARK
 *
 * Compares hybrid detector (regex + LLM) vs regex baseline.
 * Non-blocking benchmark test (.bench.ts).
 *
 * RUN: LLM_TEST=true npx jest llm_detector_v2.bench.ts
 * (Requires ANTHROPIC_API_KEY in environment)
 *
 * Expected improvements:
 * - V_MODE recall: 15% → 85%+
 * - Overall accuracy: 54% → 80%+
 */

import { BENCHMARK_CASES, BenchmarkCase } from '../benchmarks/cases/benchmark_cases';
import { DimensionalDetector, DimensionalState } from '../operational/detectors/dimensional_system';
import { LLMDetectorV2, shouldCallLLM, GatingDecision } from '../operational/detectors/llm_detector_v2';

// Skip if no LLM test flag
const RUN_LLM_TESTS = process.env.LLM_TEST === 'true';

interface BenchmarkResult {
  case_id: string;
  input: string;
  category: string;
  difficulty: string;

  // Expected
  expected_v_mode: boolean;
  expected_emergency: boolean;

  // Regex results
  regex_v_mode: boolean;
  regex_emergency: boolean;
  regex_confidence: number;
  regex_pass: boolean;

  // Gating
  gating: GatingDecision;

  // LLM results (if called)
  llm_called: boolean;
  llm_v_mode?: boolean;
  llm_emergency?: boolean;
  llm_pass?: boolean;

  // Final hybrid result
  hybrid_v_mode: boolean;
  hybrid_emergency: boolean;
  hybrid_pass: boolean;

  // Timing
  regex_time_ms: number;
  llm_time_ms?: number;
  total_time_ms: number;
}

interface BenchmarkMetrics {
  total_cases: number;

  regex: {
    accuracy: number;
    v_mode_precision: number;
    v_mode_recall: number;
    v_mode_f1: number;
    emergency_precision: number;
    emergency_recall: number;
    avg_latency_ms: number;
  };

  hybrid: {
    accuracy: number;
    v_mode_precision: number;
    v_mode_recall: number;
    v_mode_f1: number;
    emergency_precision: number;
    emergency_recall: number;
    avg_latency_ms: number;
    llm_call_rate: number;
  };

  improvement: {
    accuracy_delta: number;
    v_mode_recall_delta: number;
    latency_overhead_ms: number;
  };
}

describe('LLM Detector V2 Benchmark', () => {
  const regexDetector = new DimensionalDetector();
  let llmDetector: LLMDetectorV2;

  beforeAll(() => {
    llmDetector = new LLMDetectorV2({
      enabled: RUN_LLM_TESTS,
    });

    if (RUN_LLM_TESTS) {
      console.log('\n=== LLM DETECTOR V2 BENCHMARK ===');
      console.log(`Running with LLM calls enabled`);
      console.log(`Status: ${JSON.stringify(llmDetector.getStatus())}`);
    }
  });

  // ==========================================
  // GATING LOGIC TESTS (always run)
  // ==========================================

  describe('Gating Logic', () => {
    test('gates on low regex confidence', () => {
      // Ambiguous message should trigger gating
      const message = 'Qual è il punto?';
      const regexState = regexDetector.detect(message, 'it');
      const gating = shouldCallLLM(message, regexState, 'it');

      // This short existential question should trigger gating
      expect(gating.short_message_risk).toBe(true);
      expect(gating.should_call_llm).toBe(true);
    });

    test('does not gate on clear functional messages', () => {
      const message = 'How do I organize my tasks for the week?';
      const regexState = regexDetector.detect(message, 'en');
      const gating = shouldCallLLM(message, regexState, 'en');

      // Clear functional - no need for LLM
      expect(gating.v_mode_ambiguous).toBe(false);
      expect(gating.short_message_risk).toBe(false);
    });

    test('gates on v_mode ambiguous zone', () => {
      // Message that might be existential but score is in ambiguous zone
      const message = 'Sono stanco di tutto';
      const regexState = regexDetector.detect(message, 'it');
      const gating = shouldCallLLM(message, regexState, 'it');

      // Should recognize short message + meaning collapse
      expect(gating.short_message_risk || gating.v_mode_ambiguous).toBe(true);
      expect(gating.should_call_llm).toBe(true);
    });

    test('gating correctly identifies short existential messages', () => {
      const shortExistential = [
        { msg: 'Qual è il punto?', lang: 'it' as const },
        { msg: 'Why bother?', lang: 'en' as const },
        { msg: 'Non so', lang: 'it' as const },
        { msg: 'È davvero questo?', lang: 'it' as const },
      ];

      for (const { msg, lang } of shortExistential) {
        const regexState = regexDetector.detect(msg, lang);
        const gating = shouldCallLLM(msg, regexState, lang);

        // All short existential messages should trigger gating
        expect(gating.should_call_llm).toBe(true);
      }
    });
  });

  // ==========================================
  // REGEX-ONLY BASELINE (always run)
  // ==========================================

  describe('Regex Baseline', () => {
    test('measures regex-only performance', () => {
      let v_mode_tp = 0, v_mode_fp = 0, v_mode_fn = 0;
      let emerg_tp = 0, emerg_fp = 0, emerg_fn = 0;
      let passed = 0;
      const latencies: number[] = [];

      for (const tc of BENCHMARK_CASES) {
        const start = performance.now();
        const state = regexDetector.detect(tc.input, tc.lang);
        latencies.push(performance.now() - start);

        const v_mode_correct = state.v_mode_triggered === tc.expected.v_mode;
        const emergency_correct = state.emergency_detected === tc.expected.emergency;

        if (v_mode_correct && emergency_correct) passed++;

        // V_MODE confusion matrix
        if (tc.expected.v_mode && state.v_mode_triggered) v_mode_tp++;
        else if (!tc.expected.v_mode && state.v_mode_triggered) v_mode_fp++;
        else if (tc.expected.v_mode && !state.v_mode_triggered) v_mode_fn++;

        // Emergency confusion matrix
        if (tc.expected.emergency && state.emergency_detected) emerg_tp++;
        else if (!tc.expected.emergency && state.emergency_detected) emerg_fp++;
        else if (tc.expected.emergency && !state.emergency_detected) emerg_fn++;
      }

      const accuracy = passed / BENCHMARK_CASES.length;
      const v_mode_precision = v_mode_tp / (v_mode_tp + v_mode_fp) || 0;
      const v_mode_recall = v_mode_tp / (v_mode_tp + v_mode_fn) || 0;
      const v_mode_f1 = 2 * (v_mode_precision * v_mode_recall) / (v_mode_precision + v_mode_recall) || 0;
      const avg_latency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      console.log('\n=== REGEX BASELINE ===');
      console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`V_MODE - Precision: ${(v_mode_precision * 100).toFixed(1)}% | Recall: ${(v_mode_recall * 100).toFixed(1)}% | F1: ${(v_mode_f1 * 100).toFixed(1)}%`);
      console.log(`Avg Latency: ${avg_latency.toFixed(2)}ms`);

      // Baseline expectations
      expect(accuracy).toBeGreaterThanOrEqual(0.5); // At least 50%
      expect(avg_latency).toBeLessThan(10); // Regex should be fast
    });
  });

  // ==========================================
  // HYBRID BENCHMARK (LLM tests only)
  // ==========================================

  (RUN_LLM_TESTS ? describe : describe.skip)('Hybrid Benchmark', () => {
    test('measures hybrid (regex + LLM) performance', async () => {
      const results: BenchmarkResult[] = [];

      let v_mode_tp = 0, v_mode_fp = 0, v_mode_fn = 0;
      let emerg_tp = 0, emerg_fp = 0, emerg_fn = 0;
      let passed = 0;
      let llm_calls = 0;
      const latencies: number[] = [];

      for (const tc of BENCHMARK_CASES) {
        const startTotal = performance.now();

        // Step 1: Regex
        const startRegex = performance.now();
        const regexState = regexDetector.detect(tc.input, tc.lang);
        const regexTime = performance.now() - startRegex;

        // Step 2: Gating
        const gating = shouldCallLLM(tc.input, regexState, tc.lang);

        // Step 3: LLM (if gated)
        let llmTime: number | undefined;
        let signals: Awaited<ReturnType<typeof llmDetector.contribute>> | null = null;

        if (gating.should_call_llm) {
          const startLLM = performance.now();
          signals = await llmDetector.contribute(tc.input, tc.lang);
          llmTime = performance.now() - startLLM;
          llm_calls++;
        }

        const totalTime = performance.now() - startTotal;
        latencies.push(totalTime);

        // Determine hybrid result
        const hybrid_v_mode = signals?.risk_flags?.v_mode ?? regexState.v_mode_triggered;
        const hybrid_emergency = signals?.risk_flags?.emergency ?? regexState.emergency_detected;

        const v_mode_correct = hybrid_v_mode === tc.expected.v_mode;
        const emergency_correct = hybrid_emergency === tc.expected.emergency;
        const hybrid_pass = v_mode_correct && emergency_correct;

        if (hybrid_pass) passed++;

        // Confusion matrices
        if (tc.expected.v_mode && hybrid_v_mode) v_mode_tp++;
        else if (!tc.expected.v_mode && hybrid_v_mode) v_mode_fp++;
        else if (tc.expected.v_mode && !hybrid_v_mode) v_mode_fn++;

        if (tc.expected.emergency && hybrid_emergency) emerg_tp++;
        else if (!tc.expected.emergency && hybrid_emergency) emerg_fp++;
        else if (tc.expected.emergency && !hybrid_emergency) emerg_fn++;

        results.push({
          case_id: tc.id,
          input: tc.input.substring(0, 50),
          category: tc.category,
          difficulty: tc.difficulty,
          expected_v_mode: tc.expected.v_mode,
          expected_emergency: tc.expected.emergency,
          regex_v_mode: regexState.v_mode_triggered,
          regex_emergency: regexState.emergency_detected,
          regex_confidence: regexState.integration.phi,
          regex_pass: regexState.v_mode_triggered === tc.expected.v_mode && regexState.emergency_detected === tc.expected.emergency,
          gating,
          llm_called: gating.should_call_llm,
          llm_v_mode: signals?.risk_flags?.v_mode,
          llm_emergency: signals?.risk_flags?.emergency,
          llm_pass: signals ? (signals.risk_flags?.v_mode === tc.expected.v_mode && signals.risk_flags?.emergency === tc.expected.emergency) : undefined,
          hybrid_v_mode,
          hybrid_emergency,
          hybrid_pass,
          regex_time_ms: regexTime,
          llm_time_ms: llmTime,
          total_time_ms: totalTime,
        });
      }

      // Calculate metrics
      const accuracy = passed / BENCHMARK_CASES.length;
      const v_mode_precision = v_mode_tp / (v_mode_tp + v_mode_fp) || 0;
      const v_mode_recall = v_mode_tp / (v_mode_tp + v_mode_fn) || 0;
      const v_mode_f1 = 2 * (v_mode_precision * v_mode_recall) / (v_mode_precision + v_mode_recall) || 0;
      const avg_latency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const llm_call_rate = llm_calls / BENCHMARK_CASES.length;

      console.log('\n=== HYBRID (REGEX + LLM) ===');
      console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}%`);
      console.log(`V_MODE - Precision: ${(v_mode_precision * 100).toFixed(1)}% | Recall: ${(v_mode_recall * 100).toFixed(1)}% | F1: ${(v_mode_f1 * 100).toFixed(1)}%`);
      console.log(`LLM Call Rate: ${(llm_call_rate * 100).toFixed(1)}%`);
      console.log(`Avg Latency: ${avg_latency.toFixed(1)}ms`);

      // Print failures
      const failures = results.filter(r => !r.hybrid_pass);
      if (failures.length > 0) {
        console.log(`\n=== FAILURES (${failures.length}) ===`);
        for (const f of failures) {
          console.log(`${f.case_id}: "${f.input}..."`);
          console.log(`  Expected: v_mode=${f.expected_v_mode}, emergency=${f.expected_emergency}`);
          console.log(`  Got: v_mode=${f.hybrid_v_mode}, emergency=${f.hybrid_emergency}`);
          console.log(`  Gating: ${f.gating.reason}`);
        }
      }

      // Hybrid should outperform regex
      // Target: 80%+ accuracy, 85%+ V_MODE recall
      expect(accuracy).toBeGreaterThanOrEqual(0.7); // Minimum 70%
      expect(v_mode_recall).toBeGreaterThanOrEqual(0.5); // Minimum 50% recall
    }, 120000); // 2 minute timeout for LLM calls
  });

  // ==========================================
  // GATING COVERAGE ANALYSIS
  // ==========================================

  describe('Gating Coverage', () => {
    test('analyzes which cases would trigger LLM', () => {
      const gatingStats = {
        total: BENCHMARK_CASES.length,
        would_call_llm: 0,
        by_category: {} as Record<string, { total: number; gated: number }>,
        by_difficulty: {} as Record<string, { total: number; gated: number }>,
        reasons: {} as Record<string, number>,
      };

      for (const tc of BENCHMARK_CASES) {
        const regexState = regexDetector.detect(tc.input, tc.lang);
        const gating = shouldCallLLM(tc.input, regexState, tc.lang);

        if (gating.should_call_llm) {
          gatingStats.would_call_llm++;
          gatingStats.reasons[gating.reason] = (gatingStats.reasons[gating.reason] || 0) + 1;
        }

        // By category
        if (!gatingStats.by_category[tc.category]) {
          gatingStats.by_category[tc.category] = { total: 0, gated: 0 };
        }
        gatingStats.by_category[tc.category].total++;
        if (gating.should_call_llm) gatingStats.by_category[tc.category].gated++;

        // By difficulty
        if (!gatingStats.by_difficulty[tc.difficulty]) {
          gatingStats.by_difficulty[tc.difficulty] = { total: 0, gated: 0 };
        }
        gatingStats.by_difficulty[tc.difficulty].total++;
        if (gating.should_call_llm) gatingStats.by_difficulty[tc.difficulty].gated++;
      }

      console.log('\n=== GATING COVERAGE ===');
      console.log(`Would call LLM: ${gatingStats.would_call_llm}/${gatingStats.total} (${((gatingStats.would_call_llm / gatingStats.total) * 100).toFixed(1)}%)`);

      console.log('\nBy Category:');
      for (const [cat, stats] of Object.entries(gatingStats.by_category)) {
        console.log(`  ${cat}: ${stats.gated}/${stats.total} gated (${((stats.gated / stats.total) * 100).toFixed(0)}%)`);
      }

      console.log('\nBy Difficulty:');
      for (const [diff, stats] of Object.entries(gatingStats.by_difficulty)) {
        console.log(`  ${diff}: ${stats.gated}/${stats.total} gated (${((stats.gated / stats.total) * 100).toFixed(0)}%)`);
      }

      console.log('\nGating Reasons:');
      for (const [reason, count] of Object.entries(gatingStats.reasons)) {
        console.log(`  ${reason}: ${count}`);
      }

      // Hard cases should trigger gating more often
      const hardStats = gatingStats.by_difficulty['hard'];
      if (hardStats) {
        expect(hardStats.gated / hardStats.total).toBeGreaterThanOrEqual(0.5);
      }
    });
  });
});
