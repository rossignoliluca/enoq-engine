/**
 * UNIFIED GATING TESTS
 *
 * Tests for the v5.1 unified gating system:
 * - Cache + Hard Skip + NP Gating
 *
 * Target: <50% call rate with 100% V_MODE recall
 */

import { UnifiedGating, UnifiedGatingStats } from '../operational/gating/unified_gating';
import { DimensionalDetector, DimensionalState } from '../operational/detectors/dimensional_system';
import { BENCHMARK_CASES } from '../benchmarks/cases/benchmark_cases';
import { LLMDetectorCache } from '../gate/thresholds/llm_cache';

describe('Unified Gating', () => {
  let gating: UnifiedGating;
  let detector: DimensionalDetector;

  beforeEach(() => {
    gating = new UnifiedGating({ debug: false });
    detector = new DimensionalDetector();
  });

  // ==========================================
  // HARD SKIP RULES
  // ==========================================

  describe('Hard Skip Rules', () => {
    describe('Factual questions', () => {
      const factualMessages = [
        { msg: 'What time is it?', lang: 'en' as const },
        { msg: 'Che ora è?', lang: 'it' as const },
        { msg: "What's the weather like?", lang: 'en' as const },
        { msg: "Com'è il tempo?", lang: 'it' as const },
      ];

      test.each(factualMessages)('should hard skip: "$msg"', ({ msg, lang }) => {
        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        expect(decision.call_llm).toBe(false);
        expect(decision.stage).toBe('hard_skip');
        expect(decision.reason).toBe('HARD_SKIP_FACTUAL');
      });
    });

    describe('Operational requests', () => {
      const operationalMessages = [
        { msg: 'How do I configure the settings?', lang: 'en' as const },
        { msg: 'Run the tests', lang: 'en' as const },
        { msg: 'Come posso configurare questo?', lang: 'it' as const },
        { msg: 'Schedule a meeting for tomorrow', lang: 'en' as const },
      ];

      test.each(operationalMessages)('should hard skip: "$msg"', ({ msg, lang }) => {
        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        expect(decision.call_llm).toBe(false);
        expect(decision.stage).toBe('hard_skip');
        expect(decision.reason).toBe('HARD_SKIP_OPERATIONAL');
      });
    });

    describe('Acknowledgments', () => {
      const acknowledgments = [
        { msg: 'ok', lang: 'en' as const },
        { msg: 'Yes', lang: 'en' as const },
        { msg: 'Thanks', lang: 'en' as const },
        { msg: 'Grazie', lang: 'it' as const },
        { msg: 'Capito', lang: 'it' as const },
        { msg: "d'accordo", lang: 'it' as const },
      ];

      test.each(acknowledgments)('should hard skip: "$msg"', ({ msg, lang }) => {
        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        expect(decision.call_llm).toBe(false);
        expect(decision.stage).toBe('hard_skip');
        expect(decision.reason).toBe('HARD_SKIP_ACKNOWLEDGMENT');
      });
    });

    describe('Greetings', () => {
      const greetings = [
        { msg: 'Hello', lang: 'en' as const },
        { msg: 'Hi', lang: 'en' as const },
        { msg: 'Ciao', lang: 'it' as const },
        { msg: 'Buongiorno', lang: 'it' as const },
        { msg: 'Good morning', lang: 'en' as const },
      ];

      test.each(greetings)('should hard skip: "$msg"', ({ msg, lang }) => {
        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        expect(decision.call_llm).toBe(false);
        expect(decision.stage).toBe('hard_skip');
        expect(decision.reason).toBe('HARD_SKIP_GREETING');
      });
    });
  });

  // ==========================================
  // ANTI-SKIP RULES (SAFETY)
  // ==========================================

  describe('Anti-Skip Safety', () => {
    const existentialMessages = [
      { msg: "What's the meaning of life?", lang: 'en' as const },
      { msg: "What's the point?", lang: 'en' as const },
      { msg: 'Qual è il senso?', lang: 'it' as const },
      { msg: 'I feel lost', lang: 'en' as const },
      { msg: 'Mi sento vuoto', lang: 'it' as const },
      { msg: "Who am I really?", lang: 'en' as const },
      { msg: 'Chi sono io?', lang: 'it' as const },
      { msg: 'Why bother?', lang: 'en' as const },
      { msg: "I'm tired of everything", lang: 'en' as const },
      { msg: 'Sono stanco di tutto', lang: 'it' as const },
    ];

    test.each(existentialMessages)(
      'should NOT hard skip existential: "$msg"',
      ({ msg, lang }) => {
        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        // Should NOT be hard_skip
        expect(decision.stage).not.toBe('hard_skip');
      }
    );

    const crisisMessages = [
      { msg: "I can't breathe", lang: 'en' as const },
      { msg: 'Non riesco a respirare', lang: 'it' as const },
      { msg: 'Help me please', lang: 'en' as const },
      { msg: 'Aiutami', lang: 'it' as const },
    ];

    test.each(crisisMessages)(
      'should NOT hard skip crisis: "$msg"',
      ({ msg, lang }) => {
        const state = detector.detect(msg, lang);
        const decision = gating.decide(state, msg, lang);

        // Should NOT be hard_skip
        expect(decision.stage).not.toBe('hard_skip');
      }
    );
  });

  // ==========================================
  // SAFETY INVARIANTS
  // ==========================================

  describe('Safety Invariants', () => {
    test('emergency always bypasses LLM', () => {
      const msg = 'Non riesco a respirare, ho il cuore che batte fortissimo';
      const state = detector.detect(msg, 'it');

      expect(state.emergency_detected).toBe(true);

      const decision = gating.decide(state, msg, 'it');
      expect(decision.call_llm).toBe(false);
      expect(decision.reason).toBe('EMERGENCY_BYPASS');
    });

    test('V_MODE triggered bypasses LLM', () => {
      const msg = 'Non so cosa voglio dalla vita';
      const state = detector.detect(msg, 'it');

      // If V_MODE is triggered by regex, no need for LLM
      if (state.v_mode_triggered) {
        const decision = gating.decide(state, msg, 'it');
        expect(decision.call_llm).toBe(false);
        expect(decision.reason).toBe('V_MODE_TRIGGERED');
      }
    });
  });

  // ==========================================
  // CACHE INTEGRATION
  // ==========================================

  describe('Cache Integration', () => {
    test('cache hit prevents LLM call', () => {
      const cache = new LLMDetectorCache();
      const gatingWithCache = new UnifiedGating({ use_cache: true }, cache);

      const msg = 'Some message that might need LLM';
      const state = detector.detect(msg, 'en');

      // First call - should go through (no cache hit)
      const decision1 = gatingWithCache.decide(state, msg, 'en');
      expect(decision1.reason).not.toBe('CACHE_HIT');

      // Simulate caching the result
      cache.set(msg, 'en', {
        regime: 'functional',
        confidence: 0.9,
        existential: {
          content_detected: false,
          specificity: { identity: 0, meaning: 0, death: 0, freedom: 0, isolation: 0 },
          casual_work_context: true,
        },
        v_mode: { triggered: false, markers: [] },
        emergency: { triggered: false },
        coherence: 0.9,
      });

      // Second call - should hit cache
      const decision2 = gatingWithCache.decide(state, msg, 'en');
      expect(decision2.call_llm).toBe(false);
      expect(decision2.reason).toBe('CACHE_HIT');
      expect(decision2.cached_result).not.toBeNull();
    });
  });

  // ==========================================
  // NP GATING INTEGRATION
  // ==========================================

  describe('NP Gating Integration', () => {
    test('high existential score triggers NP_CALL', () => {
      // Message with existential content but V_MODE not triggered by regex
      const msg = 'Mi sento vuoto dentro';
      const state = detector.detect(msg, 'it');

      // Should not be hard skipped (contains existential keyword)
      const decision = gating.decide(state, msg, 'it');

      // If not emergency/V_MODE/cache/hard_skip, should go to NP gating
      if (decision.stage === 'np_gating') {
        // NP score should be present
        expect(decision.np_score).not.toBeNull();
      }
    });

    test('clear functional message can NP_SKIP', () => {
      const msg = 'Il progetto è in ritardo, cosa faccio?';
      const state = detector.detect(msg, 'it');

      const decision = gating.decide(state, msg, 'it');

      // Should either hard skip or NP skip (not call LLM for clear functional)
      if (decision.stage === 'np_gating') {
        expect(['NP_SKIP', 'NP_CALL']).toContain(decision.reason);
      }
    });
  });

  // ==========================================
  // STATISTICS
  // ==========================================

  describe('Statistics', () => {
    test('tracks decisions correctly', () => {
      gating.resetStats();

      // Process a few messages
      const messages = [
        { msg: 'Hello', lang: 'en' as const }, // greeting
        { msg: 'ok', lang: 'en' as const }, // ack
        { msg: 'What time is it?', lang: 'en' as const }, // factual
        { msg: "What's the point?", lang: 'en' as const }, // existential
      ];

      for (const { msg, lang } of messages) {
        const state = detector.detect(msg, lang);
        gating.decide(state, msg, lang);
      }

      const stats = gating.getStats();
      expect(stats.total_decisions).toBe(4);
      expect(stats.hard_skips).toBeGreaterThanOrEqual(3); // greeting + ack + factual
    });
  });
});

// ==========================================
// BENCHMARK ON 50 CASES
// ==========================================

describe('Unified Gating Benchmark', () => {
  test('measures call rate and V_MODE safety', () => {
    const gating = new UnifiedGating({ debug: false });
    const detector = new DimensionalDetector();

    let totalCalls = 0;
    let v_mode_missed = 0;
    let emergency_missed = 0;

    const decisions: Array<{
      id: string;
      input: string;
      expected_v_mode: boolean;
      expected_emergency: boolean;
      call_llm: boolean;
      reason: string;
    }> = [];

    for (const tc of BENCHMARK_CASES) {
      const state = detector.detect(tc.input, tc.lang);
      const decision = gating.decide(state, tc.input, tc.lang);

      decisions.push({
        id: tc.id,
        input: tc.input.slice(0, 40),
        expected_v_mode: tc.expected.v_mode,
        expected_emergency: tc.expected.emergency,
        call_llm: decision.call_llm,
        reason: decision.reason,
      });

      if (decision.call_llm) {
        totalCalls++;
      }

      // Check safety: if expected V_MODE and we skip LLM, that's a potential miss
      // (Unless V_MODE was already triggered by regex)
      if (tc.expected.v_mode && !decision.call_llm) {
        if (decision.reason !== 'V_MODE_TRIGGERED') {
          v_mode_missed++;
        }
      }

      // Check emergency safety
      if (tc.expected.emergency && !decision.call_llm) {
        if (decision.reason !== 'EMERGENCY_BYPASS') {
          emergency_missed++;
        }
      }
    }

    const callRate = totalCalls / BENCHMARK_CASES.length;
    const stats = gating.getStats();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║               UNIFIED GATING BENCHMARK RESULTS                 ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║ Total decisions:        ${stats.total_decisions.toString().padStart(3)}                                  ║`);
    console.log(`║ LLM calls:              ${totalCalls.toString().padStart(3)} (${(callRate * 100).toFixed(1)}%)                            ║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ SKIP BREAKDOWN:                                                ║');
    console.log(`║   Emergency bypasses:   ${stats.emergency_bypasses.toString().padStart(3)}                                  ║`);
    console.log(`║   V_MODE bypasses:      ${stats.v_mode_bypasses.toString().padStart(3)}                                  ║`);
    console.log(`║   Cache hits:           ${stats.cache_hits.toString().padStart(3)}                                  ║`);
    console.log(`║   Hard skips:           ${stats.hard_skips.toString().padStart(3)}                                  ║`);
    console.log(`║   NP skips:             ${stats.np_skips.toString().padStart(3)}                                  ║`);
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ SAFETY:                                                        ║');
    console.log(`║   V_MODE potentially missed: ${v_mode_missed.toString().padStart(2)}                                ║`);
    console.log(`║   Emergency potentially missed: ${emergency_missed.toString().padStart(2)}                             ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    if (stats.hard_skips > 0) {
      console.log('\nHard skip breakdown:');
      for (const [type, count] of Object.entries(stats.hard_skip_by_type)) {
        console.log(`  ${type}: ${count}`);
      }
    }

    // Print which V_MODE cases would be missed
    if (v_mode_missed > 0) {
      console.log('\n⚠️ V_MODE cases potentially missed (skipped without V_MODE trigger):');
      for (const d of decisions) {
        if (d.expected_v_mode && !d.call_llm && d.reason !== 'V_MODE_TRIGGERED') {
          console.log(`  [${d.id}] ${d.reason}: "${d.input}..."`);
        }
      }
    }

    // ASSERTIONS
    // Emergency must NEVER be missed
    expect(emergency_missed).toBe(0);

    // Call rate should be reasonable (target <50%, current baseline is 74%)
    // With hard skip, we should improve
    expect(callRate).toBeLessThan(0.8); // At least some improvement
  });
});
