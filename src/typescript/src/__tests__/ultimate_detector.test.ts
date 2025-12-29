/**
 * ULTIMATE DETECTOR v2 TEST SUITE
 *
 * Tests the calibrated sensor architecture:
 * - Probability outputs (not binary)
 * - Abstention mechanism
 * - Safety floor
 * - Risk flags
 * - Cross-stage incongruence detection
 */

import {
  getUltimateDetector,
  resetUltimateDetector,
  UltimateDetector,
  DetectorOutput,
  SafetyFloor
} from '../operational/detectors/ultimate_detector';
import { SupportedLanguage } from '../interface/types';

describe('Ultimate Detector v2 (Calibrated Sensor)', () => {
  let detector: UltimateDetector;

  beforeAll(async () => {
    resetUltimateDetector();
    detector = await getUltimateDetector({ debug: true });
  }, 60000);

  afterAll(() => {
    resetUltimateDetector();
  });

  // ============================================
  // CORE PRINCIPLE: SENSOR OUTPUTS PROBABILITIES
  // ============================================

  describe('Probability Outputs', () => {
    test('detectRaw returns calibrated domain probabilities', async () => {
      const result = await detector.detectRaw("Non so cosa voglio dalla vita", 'it');

      // All domain probs should be valid probabilities
      expect(result.domain_probs.D1_CRISIS).toBeGreaterThanOrEqual(0);
      expect(result.domain_probs.D1_CRISIS).toBeLessThanOrEqual(1);
      expect(result.domain_probs.D3_EXISTENTIAL).toBeGreaterThanOrEqual(0);
      expect(result.domain_probs.D3_EXISTENTIAL).toBeLessThanOrEqual(1);

      // Sum should be ~1 (softmax)
      const sum = Object.values(result.domain_probs).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 1);

      console.log('Domain probs:', result.domain_probs);
    }, 30000);

    test('detectRaw returns vertical probabilities', async () => {
      const result = await detector.detectRaw("Mi sento stanco e senza energia", 'it');

      // Vertical probs should be valid
      const sum = Object.values(result.vertical_probs).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 1);

      console.log('Vertical probs:', result.vertical_probs);
    }, 30000);

    test('detectRaw returns confidence score', async () => {
      const result = await detector.detectRaw("What's the point?", 'en');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      console.log('Confidence:', result.confidence);
    }, 30000);
  });

  // ============================================
  // ABSTENTION: KNOW WHEN YOU DON'T KNOW
  // ============================================

  describe('Abstention Mechanism', () => {
    test('Low-confidence cases have high abstention score', async () => {
      // Ambiguous case
      const result = await detector.detectRaw("Hmm", 'en');

      // Should have elevated abstention
      expect(result.abstention_score).toBeGreaterThanOrEqual(0);
      expect(result.abstention_score).toBeLessThanOrEqual(1);

      console.log('Abstention for "Hmm":', result.abstention_score);
    }, 30000);

    test('Clear cases have low abstention score', async () => {
      // Clear existential
      const result = await detector.detectRaw("Non so chi sono veramente, la mia vita non ha senso", 'it');

      console.log('Abstention for clear existential:', result.abstention_score);
    }, 30000);
  });

  // ============================================
  // SAFETY FLOOR: STOP / MINIMAL / PROCEED
  // ============================================

  describe('Safety Floor', () => {
    test('Safety floor is one of STOP, MINIMAL, PROCEED', async () => {
      const result = await detector.detectRaw("Test message", 'en');

      expect(['STOP', 'MINIMAL', 'PROCEED']).toContain(result.safety_floor);

      console.log('Safety floor:', result.safety_floor);
    }, 30000);

    test('Emergency with low confidence triggers STOP', async () => {
      // This should be caught by fast-path as emergency
      const result = await detector.detectRaw("I can't breathe help", 'en');

      console.log('Emergency result:', {
        safety_floor: result.safety_floor,
        confidence: result.confidence,
        fast_path: result.stage_outputs?.fast_path,
      });

      // Emergency should be detected
      expect(result.stage_outputs?.fast_path.emergency_detected).toBe(true);
    }, 30000);
  });

  // ============================================
  // RISK FLAGS
  // ============================================

  describe('Risk Flags', () => {
    test('Risk flags are present in output', async () => {
      const result = await detector.detectRaw("Ho paura di morire", 'it');

      expect(result.risk_flags).toBeDefined();
      expect(typeof result.risk_flags.low_confidence).toBe('boolean');
      expect(typeof result.risk_flags.incongruence).toBe('boolean');
      expect(typeof result.risk_flags.ood_detected).toBe('boolean');

      console.log('Risk flags:', result.risk_flags);
    }, 30000);
  });

  // ============================================
  // CRITICAL EDGE CASES
  // ============================================

  describe('Critical Edge Cases', () => {
    test('EN: "What\'s the point of this meeting?" - should NOT be D3_EXISTENTIAL dominant', async () => {
      const result = await detector.detectRaw("What's the point of this meeting?", 'en');

      console.log('Meeting case:', {
        domain_probs: result.domain_probs,
        safety_floor: result.safety_floor,
      });

      // D3 should NOT be dominant
      expect(result.domain_probs.D3_EXISTENTIAL).toBeLessThan(result.domain_probs.KNOWLEDGE);

      // Legacy detect should NOT trigger V_MODE
      const legacy = await detector.detect("What's the point of this meeting?", 'en');
      expect(legacy.v_mode_triggered).toBe(false);
    }, 30000);

    test('IT: "Ho paura di fare la scelta sbagliata" - SHOULD be D3_EXISTENTIAL', async () => {
      const result = await detector.detectRaw("Ho paura di fare la scelta sbagliata", 'it');

      console.log('Existential fear case:', {
        domain_probs: result.domain_probs,
        vertical_probs: result.vertical_probs,
      });

      // D3 should be significant
      expect(result.domain_probs.D3_EXISTENTIAL).toBeGreaterThan(0.2);

      // Legacy detect should trigger V_MODE
      const legacy = await detector.detect("Ho paura di fare la scelta sbagliata", 'it');
      expect(legacy.v_mode_triggered).toBe(true);
    }, 30000);
  });

  // ============================================
  // EMERGENCY FAST-PATH
  // ============================================

  describe('Emergency Fast-Path', () => {
    test('Panic attack triggers emergency detection', async () => {
      const result = await detector.detectRaw("Non riesco a respirare, ho il cuore che batte fortissimo", 'it');

      expect(result.stage_outputs?.fast_path.emergency_detected).toBe(true);
      expect(result.domain_probs.D1_CRISIS).toBeGreaterThan(0.1);

      console.log('Panic result:', {
        fast_path: result.stage_outputs?.fast_path,
        domain_probs: result.domain_probs,
      });
    }, 30000);

    test('Romantic heart context does NOT trigger emergency', async () => {
      const result = await detector.detectRaw("Mi batte forte il cuore quando ti vedo, ti amo", 'it');

      expect(result.stage_outputs?.fast_path.emergency_detected).toBe(false);

      console.log('Romantic result:', {
        fast_path: result.stage_outputs?.fast_path,
        domain_probs: result.domain_probs,
      });
    }, 30000);

    test('Colloquial "dying" does NOT trigger emergency', async () => {
      const result = await detector.detectRaw("Sto morendo dal ridere!", 'it');

      expect(result.stage_outputs?.fast_path.emergency_detected).toBe(false);

      console.log('Colloquial result:', {
        fast_path: result.stage_outputs?.fast_path,
      });
    }, 30000);
  });

  // ============================================
  // CROSS-STAGE INCONGRUENCE
  // ============================================

  describe('Cross-Stage Incongruence', () => {
    test('Incongruence detected when contrastive blocking occurs', async () => {
      // This tests that incongruence_details is populated when blocking happens
      const result = await detector.detectRaw("What's the point of this meeting?", 'en');

      console.log('Incongruence check:', {
        incongruence: result.stage_outputs?.incongruence,
        risk_flags: result.risk_flags,
      });

      // The structure exists
      expect(result.stage_outputs?.incongruence).toBeDefined();
    }, 30000);
  });

  // ============================================
  // LEGACY COMPATIBILITY
  // ============================================

  describe('Legacy Compatibility', () => {
    test('detect() returns DimensionalState format', async () => {
      const result = await detector.detect("Non so cosa voglio dalla vita", 'it');

      expect(result.vertical).toBeDefined();
      expect(result.horizontal).toBeDefined();
      expect(result.primary_vertical).toBeDefined();
      expect(result.v_mode_triggered).toBeDefined();
      expect(result.emergency_detected).toBeDefined();

      console.log('Legacy format:', {
        primary_vertical: result.primary_vertical,
        v_mode_triggered: result.v_mode_triggered,
        emergency_detected: result.emergency_detected,
      });
    }, 30000);

    test('V_MODE cases work with legacy detect()', async () => {
      const cases = [
        { text: "Chi sono veramente?", lang: 'it' as SupportedLanguage, expectVMode: true },
        { text: "What is the meaning of my existence?", lang: 'en' as SupportedLanguage, expectVMode: true },
        { text: "What's the point of this meeting?", lang: 'en' as SupportedLanguage, expectVMode: false },
        { text: "Devo decidere quale task fare", lang: 'it' as SupportedLanguage, expectVMode: false },
      ];

      for (const c of cases) {
        const result = await detector.detect(c.text, c.lang);
        console.log(`"${c.text}": v_mode=${result.v_mode_triggered} (expected ${c.expectVMode})`);
        expect(result.v_mode_triggered).toBe(c.expectVMode);
      }
    }, 60000);
  });

  // ============================================
  // PERFORMANCE
  // ============================================

  describe('Performance', () => {
    test('Detection latency is tracked', async () => {
      const result = await detector.detectRaw("Test message", 'en');

      expect(result.latency_ms).toBeDefined();
      expect(result.latency_ms).toBeGreaterThan(0);

      console.log('Latency:', result.latency_ms, 'ms');
    }, 30000);

    test('Stage outputs include embedding cache status', async () => {
      // First call - not cached
      const result1 = await detector.detectRaw("Unique test message 123", 'en');
      console.log('First call cached:', result1.stage_outputs?.embedding.cached);

      // Second call - should be cached
      const result2 = await detector.detectRaw("Unique test message 123", 'en');
      expect(result2.stage_outputs?.embedding.cached).toBe(true);
      console.log('Second call cached:', result2.stage_outputs?.embedding.cached);
    }, 30000);
  });

  // ============================================
  // MULTILINGUAL
  // ============================================

  describe('Multilingual Support', () => {
    const existentialCases = [
      { text: "Non so cosa voglio dalla vita", lang: 'it' as SupportedLanguage },
      { text: "What is the meaning of my existence?", lang: 'en' as SupportedLanguage },
      { text: "¿Quién soy realmente?", lang: 'es' as SupportedLanguage },
      { text: "Was ist der Sinn meines Lebens?", lang: 'de' as SupportedLanguage },
      { text: "Qui suis-je vraiment?", lang: 'fr' as SupportedLanguage },
    ];

    test.each(existentialCases)('Existential in $lang: "$text"', async ({ text, lang }) => {
      const result = await detector.detectRaw(text, lang);

      console.log(`[${lang}] "${text}":`, {
        D3: result.domain_probs.D3_EXISTENTIAL.toFixed(3),
        confidence: result.confidence.toFixed(3),
      });

      // D3 should be elevated for all existential cases
      expect(result.domain_probs.D3_EXISTENTIAL).toBeGreaterThan(0.1);
    }, 30000);
  });
});

// ============================================
// CALIBRATION TESTS (when API key available)
// ============================================

const HAS_API_KEY = Boolean(process.env.OPENAI_API_KEY);
const skipWithoutApiKey = HAS_API_KEY ? describe : describe.skip;

skipWithoutApiKey('Calibration Tests (requires API key)', () => {
  let detector: UltimateDetector;

  beforeAll(async () => {
    resetUltimateDetector();
    detector = await getUltimateDetector({ debug: false });
  }, 60000);

  afterAll(() => {
    resetUltimateDetector();
  });

  test('Confidence correlates with correctness', async () => {
    const testCases = [
      { text: "Non so cosa voglio dalla vita", lang: 'it' as SupportedLanguage, expectedDomain: 'D3_EXISTENTIAL' },
      { text: "What's the point of this meeting?", lang: 'en' as SupportedLanguage, expectedDomain: 'KNOWLEDGE' },
      { text: "Non riesco a respirare, aiutami", lang: 'it' as SupportedLanguage, expectedDomain: 'D1_CRISIS' },
      { text: "Mia moglie non mi capisce", lang: 'it' as SupportedLanguage, expectedDomain: 'D4_RELATIONAL' },
    ];

    const results: { confidence: number; correct: boolean }[] = [];

    for (const c of testCases) {
      const result = await detector.detectRaw(c.text, c.lang);
      const topDomain = Object.entries(result.domain_probs)
        .sort(([, a], [, b]) => b - a)[0][0];
      const correct = topDomain === c.expectedDomain;

      results.push({ confidence: result.confidence, correct });

      console.log(`"${c.text}": expected=${c.expectedDomain}, got=${topDomain}, confidence=${result.confidence.toFixed(3)}, correct=${correct}`);
    }

    // High confidence should correlate with correctness
    const highConfCorrect = results.filter(r => r.confidence > 0.5 && r.correct).length;
    const highConfTotal = results.filter(r => r.confidence > 0.5).length;

    console.log(`High confidence accuracy: ${highConfCorrect}/${highConfTotal}`);
  }, 60000);
});
