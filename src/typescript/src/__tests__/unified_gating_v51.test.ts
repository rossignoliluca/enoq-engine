/**
 * UNIFIED GATING v5.1 VALIDATION
 *
 * Three benchmarks:
 * 1. Original 50 cases (safety-focused, existential/crisis heavy)
 * 2. Realistic 100 cases (real-world distribution)
 * 3. Cache replay (same inputs twice, measure hit rate)
 */

import { UnifiedGating } from '../operational/gating/unified_gating';
import { DimensionalDetector } from '../operational/detectors/dimensional_system';
import { BENCHMARK_CASES } from '../benchmarks/cases/benchmark_cases';
import { REALISTIC_CASES, REALISTIC_DISTRIBUTION } from '../benchmarks/cases/benchmark_cases_realistic';
import { LLMDetectorCache } from '../gate/thresholds/llm_cache';

describe('Unified Gating v5.1 Validation', () => {
  // ==========================================
  // BENCHMARK 1: Original 50 Cases (Safety)
  // ==========================================

  describe('Benchmark 1: Original 50 Cases (Safety)', () => {
    test('measures safety-focused call rate', () => {
      const gating = new UnifiedGating({ debug: false });
      const detector = new DimensionalDetector();

      let calls = 0;
      let v_mode_missed = 0;
      let emergency_missed = 0;

      for (const tc of BENCHMARK_CASES) {
        const state = detector.detect(tc.input, tc.lang);
        const decision = gating.decide(state, tc.input, tc.lang);

        if (decision.call_llm) calls++;

        // Safety check
        if (tc.expected.v_mode && !decision.call_llm && decision.reason !== 'V_MODE_TRIGGERED') {
          v_mode_missed++;
        }
        if (tc.expected.emergency && !decision.call_llm && decision.reason !== 'EMERGENCY_BYPASS') {
          emergency_missed++;
        }
      }

      const stats = gating.getStats();
      const callRate = calls / BENCHMARK_CASES.length;

      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║     BENCHMARK 1: ORIGINAL 50 CASES (Safety Focus)              ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║ Total cases:            ${BENCHMARK_CASES.length.toString().padStart(3)}                                  ║`);
      console.log(`║ LLM calls:              ${calls.toString().padStart(3)} (${(callRate * 100).toFixed(1)}%)                            ║`);
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║ Emergency bypasses:     ${stats.emergency_bypasses.toString().padStart(3)}                                  ║`);
      console.log(`║ V_MODE bypasses:        ${stats.v_mode_bypasses.toString().padStart(3)}                                  ║`);
      console.log(`║ Hard skips:             ${stats.hard_skips.toString().padStart(3)}                                  ║`);
      console.log(`║ NP skips:               ${stats.np_skips.toString().padStart(3)}                                  ║`);
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║ V_MODE potentially missed:    ${v_mode_missed.toString().padStart(2)}                              ║`);
      console.log(`║ Emergency potentially missed: ${emergency_missed.toString().padStart(2)}                              ║`);
      console.log('╚════════════════════════════════════════════════════════════════╝');

      // Safety assertions
      expect(emergency_missed).toBe(0);
      expect(callRate).toBeLessThan(0.85); // Should be better than baseline
    });
  });

  // ==========================================
  // BENCHMARK 2: Realistic 100 Cases
  // ==========================================

  describe('Benchmark 2: Realistic 100 Cases', () => {
    test('measures real-world call rate', () => {
      const gating = new UnifiedGating({ debug: false });
      const detector = new DimensionalDetector();

      let calls = 0;
      let correctSkips = 0;
      let incorrectSkips = 0;
      const categoryStats: Record<string, { total: number; skipped: number; called: number }> = {};

      for (const tc of REALISTIC_CASES) {
        const state = detector.detect(tc.input, tc.lang);
        const decision = gating.decide(state, tc.input, tc.lang);

        // Track by category
        if (!categoryStats[tc.category]) {
          categoryStats[tc.category] = { total: 0, skipped: 0, called: 0 };
        }
        categoryStats[tc.category].total++;

        if (decision.call_llm) {
          calls++;
          categoryStats[tc.category].called++;
        } else {
          categoryStats[tc.category].skipped++;
        }

        // Check correctness
        if (tc.expected_skip && !decision.call_llm) correctSkips++;
        if (!tc.expected_skip && !decision.call_llm) incorrectSkips++;
      }

      const stats = gating.getStats();
      const callRate = calls / REALISTIC_CASES.length;
      const skipRate = 1 - callRate;

      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║     BENCHMARK 2: REALISTIC 100 CASES                           ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║ Total cases:            ${REALISTIC_CASES.length.toString().padStart(3)}                                  ║`);
      console.log(`║ LLM calls:              ${calls.toString().padStart(3)} (${(callRate * 100).toFixed(1)}%)                            ║`);
      console.log(`║ Skip rate:              ${(skipRate * 100).toFixed(1)}%                                    ║`);
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log('║ SKIP BREAKDOWN:                                                ║');
      console.log(`║   Emergency bypasses:   ${stats.emergency_bypasses.toString().padStart(3)}                                  ║`);
      console.log(`║   V_MODE bypasses:      ${stats.v_mode_bypasses.toString().padStart(3)}                                  ║`);
      console.log(`║   Cache hits:           ${stats.cache_hits.toString().padStart(3)}                                  ║`);
      console.log(`║   Hard skips:           ${stats.hard_skips.toString().padStart(3)}                                  ║`);
      console.log(`║   NP skips:             ${stats.np_skips.toString().padStart(3)}                                  ║`);
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log('║ BY CATEGORY:                                                   ║');
      for (const [cat, data] of Object.entries(categoryStats)) {
        const skipPct = ((data.skipped / data.total) * 100).toFixed(0);
        console.log(`║   ${cat.padEnd(15)} ${data.skipped.toString().padStart(2)}/${data.total.toString().padStart(2)} skipped (${skipPct}%)               ║`.slice(0, 67) + '║');
      }
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║ Correct skips:          ${correctSkips.toString().padStart(3)}                                  ║`);
      console.log(`║ Incorrect skips:        ${incorrectSkips.toString().padStart(3)} (potential false negatives)     ║`);
      console.log('╚════════════════════════════════════════════════════════════════╝');

      // Distribution summary
      console.log('\nDistribution:');
      for (const [cat, count] of Object.entries(REALISTIC_DISTRIBUTION)) {
        if (cat !== 'total') {
          console.log(`  ${cat}: ${count}`);
        }
      }

      // Realistic benchmark should show much better call rate
      expect(callRate).toBeLessThan(0.60); // Target <60% on realistic
    });
  });

  // ==========================================
  // BENCHMARK 3: Cache Replay Test
  // ==========================================

  describe('Benchmark 3: Cache Replay', () => {
    test('validates cache hit rate on repeated inputs', () => {
      const cache = new LLMDetectorCache({ enabled: true });
      const gating = new UnifiedGating({ use_cache: true }, cache);
      const detector = new DimensionalDetector();

      // Use a subset of realistic cases for replay
      const testCases = REALISTIC_CASES.slice(0, 30);

      // First pass - populate cache (simulate LLM results)
      console.log('\n=== CACHE REPLAY TEST ===');
      console.log('Pass 1: Populating cache...');

      let firstPassCalls = 0;
      for (const tc of testCases) {
        const state = detector.detect(tc.input, tc.lang);
        const decision = gating.decide(state, tc.input, tc.lang);

        if (decision.call_llm) {
          firstPassCalls++;
          // Simulate caching LLM result
          gating.cacheResult(tc.input, tc.lang, {
            regime: tc.category === 'existential' ? 'existential' : 'functional',
            confidence: 0.9,
            existential: {
              content_detected: tc.category === 'existential',
              specificity: { identity: 0, meaning: 0, death: 0, freedom: 0, isolation: 0 },
              casual_work_context: tc.category === 'operational',
            },
            v_mode: { triggered: tc.category === 'existential', markers: [] },
            emergency: { triggered: tc.category === 'emergency' },
            coherence: 0.9,
          });
        }
      }

      // Reset stats for second pass
      gating.resetStats();

      // Second pass - should hit cache
      console.log('Pass 2: Testing cache hits...');

      let secondPassCalls = 0;
      let cacheHits = 0;
      for (const tc of testCases) {
        const state = detector.detect(tc.input, tc.lang);
        const decision = gating.decide(state, tc.input, tc.lang);

        if (decision.call_llm) {
          secondPassCalls++;
        }
        if (decision.reason === 'CACHE_HIT') {
          cacheHits++;
        }
      }

      const stats = gating.getStats();
      const cacheHitRate = cacheHits / testCases.length;
      const callReduction = firstPassCalls > 0
        ? ((firstPassCalls - secondPassCalls) / firstPassCalls) * 100
        : 0;

      console.log('\n╔════════════════════════════════════════════════════════════════╗');
      console.log('║     CACHE REPLAY RESULTS                                       ║');
      console.log('╠════════════════════════════════════════════════════════════════╣');
      console.log(`║ Test cases:             ${testCases.length.toString().padStart(3)}                                  ║`);
      console.log(`║ Pass 1 LLM calls:       ${firstPassCalls.toString().padStart(3)}                                  ║`);
      console.log(`║ Pass 2 LLM calls:       ${secondPassCalls.toString().padStart(3)}                                  ║`);
      console.log(`║ Cache hits:             ${cacheHits.toString().padStart(3)} (${(cacheHitRate * 100).toFixed(1)}%)                         ║`);
      console.log(`║ Call reduction:         ${callReduction.toFixed(1)}%                                   ║`);
      console.log('╚════════════════════════════════════════════════════════════════╝');

      // Cache stats
      const cacheStats = gating.getCacheStats();
      console.log('\nCache internal stats:');
      console.log(`  Size: ${cacheStats.size}`);
      console.log(`  Hits: ${cacheStats.hits}`);
      console.log(`  Misses: ${cacheStats.misses}`);
      console.log(`  Hit rate: ${(cacheStats.hit_rate * 100).toFixed(1)}%`);

      // Assertions
      // Cases that originally needed LLM should now hit cache
      expect(cacheHits).toBeGreaterThan(0);
      // Second pass should have fewer calls
      expect(secondPassCalls).toBeLessThanOrEqual(firstPassCalls);
    });
  });

  // ==========================================
  // ANTI-SKIP SAFETY VALIDATION
  // ==========================================

  describe('Anti-Skip Safety (New Rules)', () => {
    const dangerousShortPhrases = [
      { msg: "I can't", lang: 'en' as const },
      { msg: "I can't do this", lang: 'en' as const },
      { msg: "I can't anymore", lang: 'en' as const },
      { msg: "I'm done", lang: 'en' as const },
      { msg: 'basta', lang: 'it' as const },
      { msg: 'basta così', lang: 'it' as const },
      { msg: 'non ce la faccio', lang: 'it' as const },
      { msg: 'non posso', lang: 'it' as const },
      { msg: 'non riesco', lang: 'it' as const },
      { msg: 'ho finito', lang: 'it' as const },
      { msg: 'no more', lang: 'en' as const },
      { msg: 'non più', lang: 'it' as const },
    ];

    test.each(dangerousShortPhrases)(
      'should NOT hard-skip dangerous phrase: "$msg"',
      ({ msg, lang }) => {
        const gating = new UnifiedGating({ debug: false });
        const detector = new DimensionalDetector();

        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        // Should NOT be hard_skip
        expect(decision.stage).not.toBe('hard_skip');
      }
    );
  });
});
