/**
 * Ultimate Detector Benchmark Script
 * Run with: OPENAI_API_KEY=<key> npx ts-node src/__tests__/ultimate_benchmark.ts
 */

import { getUltimateDetector, resetUltimateDetector, DetectorOutput } from '../operational/detectors/ultimate_detector';
import { SupportedLanguage } from '../interface/types';

interface BenchmarkCase {
  input: string;
  lang: SupportedLanguage;
  expected_domain: 'D1_CRISIS' | 'D3_EXISTENTIAL' | 'D4_RELATIONAL' | 'KNOWLEDGE';
  expected_v_mode: boolean;
  expected_emergency: boolean;
  category: string;
}

const BENCHMARK_CASES: BenchmarkCase[] = [
  // D3_EXISTENTIAL (V_MODE = true)
  { input: "Non so cosa voglio dalla vita", lang: 'it', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_clear' },
  { input: "Chi sono veramente?", lang: 'it', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_clear' },
  { input: "What is the meaning of my existence?", lang: 'en', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_clear' },
  { input: "Everything feels meaningless", lang: 'en', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_clear' },
  { input: "Qual è il punto?", lang: 'it', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_subtle' },
  { input: "What's the point?", lang: 'en', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_subtle' },
  { input: "Ho paura di fare la scelta sbagliata", lang: 'it', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_fear' },
  { input: "What if I made all the wrong choices?", lang: 'en', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'existential_fear' },

  // KNOWLEDGE (V_MODE = false) - CRITICAL: "point of meeting" should NOT be existential
  { input: "What's the point of this meeting?", lang: 'en', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'work_point' },
  { input: "What's the point of this project?", lang: 'en', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'work_point' },
  { input: "Qual è il punto di questa riunione?", lang: 'it', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'work_point' },
  { input: "I need to decide which task to prioritize", lang: 'en', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'work' },
  { input: "Devo decidere quale task fare", lang: 'it', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'work' },

  // D1_CRISIS (Emergency = true)
  { input: "Non riesco a respirare, ho il cuore che batte fortissimo", lang: 'it', expected_domain: 'D1_CRISIS', expected_v_mode: false, expected_emergency: true, category: 'emergency_real' },
  { input: "Sto avendo un attacco di panico", lang: 'it', expected_domain: 'D1_CRISIS', expected_v_mode: false, expected_emergency: true, category: 'emergency_real' },
  { input: "I can't breathe, my heart is pounding", lang: 'en', expected_domain: 'D1_CRISIS', expected_v_mode: false, expected_emergency: true, category: 'emergency_real' },
  { input: "Help me, I'm having a panic attack", lang: 'en', expected_domain: 'D1_CRISIS', expected_v_mode: false, expected_emergency: true, category: 'emergency_real' },

  // NOT Emergency (colloquial/romantic)
  { input: "Mi batte forte il cuore quando ti vedo, ti amo", lang: 'it', expected_domain: 'D4_RELATIONAL', expected_v_mode: false, expected_emergency: false, category: 'emergency_fp' },
  { input: "My heart races when I think of you", lang: 'en', expected_domain: 'D4_RELATIONAL', expected_v_mode: false, expected_emergency: false, category: 'emergency_fp' },
  { input: "Sto morendo dal ridere!", lang: 'it', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'colloquial' },
  { input: "I'm dying of laughter!", lang: 'en', expected_domain: 'KNOWLEDGE', expected_v_mode: false, expected_emergency: false, category: 'colloquial' },

  // D4_RELATIONAL
  { input: "Mia moglie non mi capisce, mi sento solo", lang: 'it', expected_domain: 'D4_RELATIONAL', expected_v_mode: false, expected_emergency: false, category: 'relational' },
  { input: "I feel disconnected from everyone", lang: 'en', expected_domain: 'D4_RELATIONAL', expected_v_mode: false, expected_emergency: false, category: 'relational' },
  { input: "My partner doesn't understand me", lang: 'en', expected_domain: 'D4_RELATIONAL', expected_v_mode: false, expected_emergency: false, category: 'relational' },

  // Multilingual existential
  { input: "¿Quién soy realmente?", lang: 'es', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'multilingual' },
  { input: "Was ist der Sinn meines Lebens?", lang: 'de', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'multilingual' },
  { input: "Qui suis-je vraiment?", lang: 'fr', expected_domain: 'D3_EXISTENTIAL', expected_v_mode: true, expected_emergency: false, category: 'multilingual' },
];

async function runBenchmark() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              ULTIMATE DETECTOR v2 BENCHMARK                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // Check API key
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  console.log(`API Key: ${hasApiKey ? '✓ Available' : '✗ Missing (using random embeddings)'}\n`);

  // Initialize
  console.log('Initializing detector...');
  const startInit = performance.now();
  resetUltimateDetector();
  const detector = await getUltimateDetector({ debug: false });
  const initTime = performance.now() - startInit;
  console.log(`Initialized in ${initTime.toFixed(0)}ms\n`);

  // Run benchmark
  const results: {
    input: string;
    expected_domain: string;
    actual_domain: string;
    expected_v_mode: boolean;
    actual_v_mode: boolean;
    expected_emergency: boolean;
    actual_emergency: boolean;
    domain_correct: boolean;
    v_mode_correct: boolean;
    emergency_correct: boolean;
    confidence: number;
    safety_floor: string;
    latency_ms: number;
    category: string;
  }[] = [];

  let totalLatency = 0;

  for (const testCase of BENCHMARK_CASES) {
    const raw = await detector.detectRaw(testCase.input, testCase.lang);
    const legacy = await detector.detect(testCase.input, testCase.lang);

    const actualDomain = Object.entries(raw.domain_probs)
      .sort(([, a], [, b]) => b - a)[0][0];

    results.push({
      input: testCase.input,
      expected_domain: testCase.expected_domain,
      actual_domain: actualDomain,
      expected_v_mode: testCase.expected_v_mode,
      actual_v_mode: legacy.v_mode_triggered,
      expected_emergency: testCase.expected_emergency,
      actual_emergency: legacy.emergency_detected,
      domain_correct: actualDomain === testCase.expected_domain,
      v_mode_correct: legacy.v_mode_triggered === testCase.expected_v_mode,
      emergency_correct: legacy.emergency_detected === testCase.expected_emergency,
      confidence: raw.confidence,
      safety_floor: raw.safety_floor,
      latency_ms: raw.latency_ms,
      category: testCase.category,
    });

    totalLatency += raw.latency_ms;
  }

  // Calculate metrics
  const totalCases = results.length;
  const domainCorrect = results.filter(r => r.domain_correct).length;
  const vModeCorrect = results.filter(r => r.v_mode_correct).length;
  const emergencyCorrect = results.filter(r => r.emergency_correct).length;
  const allCorrect = results.filter(r => r.domain_correct && r.v_mode_correct && r.emergency_correct).length;

  // V_MODE metrics
  const v_mode_tp = results.filter(r => r.expected_v_mode && r.actual_v_mode).length;
  const v_mode_fp = results.filter(r => !r.expected_v_mode && r.actual_v_mode).length;
  const v_mode_fn = results.filter(r => r.expected_v_mode && !r.actual_v_mode).length;
  const v_mode_tn = results.filter(r => !r.expected_v_mode && !r.actual_v_mode).length;

  const v_mode_precision = v_mode_tp / (v_mode_tp + v_mode_fp) || 0;
  const v_mode_recall = v_mode_tp / (v_mode_tp + v_mode_fn) || 0;
  const v_mode_f1 = 2 * v_mode_precision * v_mode_recall / (v_mode_precision + v_mode_recall) || 0;

  // Emergency metrics
  const emerg_tp = results.filter(r => r.expected_emergency && r.actual_emergency).length;
  const emerg_fp = results.filter(r => !r.expected_emergency && r.actual_emergency).length;
  const emerg_fn = results.filter(r => r.expected_emergency && !r.actual_emergency).length;

  const emerg_precision = emerg_tp / (emerg_tp + emerg_fp) || 0;
  const emerg_recall = emerg_tp / (emerg_tp + emerg_fn) || 0;
  const emerg_f1 = 2 * emerg_precision * emerg_recall / (emerg_precision + emerg_recall) || 0;

  const avgLatency = totalLatency / totalCases;

  // Print results
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              RESULTS                                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║ Overall Accuracy:        ${(allCorrect / totalCases * 100).toFixed(1).padStart(5)}% (${allCorrect}/${totalCases})                              ║`);
  console.log(`║ Domain Accuracy:         ${(domainCorrect / totalCases * 100).toFixed(1).padStart(5)}% (${domainCorrect}/${totalCases})                              ║`);
  console.log(`║ V_MODE Accuracy:         ${(vModeCorrect / totalCases * 100).toFixed(1).padStart(5)}% (${vModeCorrect}/${totalCases})                              ║`);
  console.log(`║ Emergency Accuracy:      ${(emergencyCorrect / totalCases * 100).toFixed(1).padStart(5)}% (${emergencyCorrect}/${totalCases})                              ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║ V_MODE F1:               ${(v_mode_f1 * 100).toFixed(1).padStart(5)}% (P=${(v_mode_precision * 100).toFixed(0)}%, R=${(v_mode_recall * 100).toFixed(0)}%)                    ║`);
  console.log(`║ Emergency F1:            ${(emerg_f1 * 100).toFixed(1).padStart(5)}% (P=${(emerg_precision * 100).toFixed(0)}%, R=${(emerg_recall * 100).toFixed(0)}%)                    ║`);
  console.log(`║ Emergency FNR:           ${((emerg_fn / (emerg_tp + emerg_fn)) * 100).toFixed(1).padStart(5)}%                                         ║`);
  console.log('╠══════════════════════════════════════════════════════════════════════════════╣');
  console.log(`║ Avg Latency:             ${avgLatency.toFixed(0).padStart(5)}ms                                         ║`);
  console.log(`║ Cached Latency:          ${results.filter(r => r.latency_ms < 10).length > 0 ? '<1ms' : 'N/A'}                                         ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  // Print failed cases
  const failedCases = results.filter(r => !r.domain_correct || !r.v_mode_correct || !r.emergency_correct);
  if (failedCases.length > 0) {
    console.log('FAILED CASES:');
    console.log('─'.repeat(80));
    for (const failed of failedCases) {
      const issues: string[] = [];
      if (!failed.domain_correct) issues.push(`domain: ${failed.expected_domain}→${failed.actual_domain}`);
      if (!failed.v_mode_correct) issues.push(`v_mode: ${failed.expected_v_mode}→${failed.actual_v_mode}`);
      if (!failed.emergency_correct) issues.push(`emergency: ${failed.expected_emergency}→${failed.actual_emergency}`);
      console.log(`"${failed.input.substring(0, 45)}..."`);
      console.log(`  Category: ${failed.category}`);
      console.log(`  Issues: ${issues.join(', ')}`);
      console.log(`  Confidence: ${(failed.confidence * 100).toFixed(0)}%, Safety: ${failed.safety_floor}`);
      console.log('');
    }
  } else {
    console.log('✓ All cases passed!\n');
  }

  // Print by category
  console.log('BY CATEGORY:');
  console.log('─'.repeat(80));
  const categories = [...new Set(results.map(r => r.category))];
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catCorrect = catResults.filter(r => r.domain_correct && r.v_mode_correct && r.emergency_correct).length;
    const status = catCorrect === catResults.length ? '✓' : '✗';
    console.log(`${status} ${cat.padEnd(20)} ${catCorrect}/${catResults.length}`);
  }
}

runBenchmark().catch(console.error);
