/**
 * THRESHOLD SWEEP - Analyze recall vs call rate tradeoff
 *
 * This shows how different thresholds affect:
 * - V_MODE recall (on positives only, assuming LLM gets it right when called)
 * - Call rate (how often we call LLM)
 */

import { DimensionalDetector } from '../../operational/detectors/dimensional_system';
import { BENCHMARK_CASES } from '../../benchmarks/cases/benchmark_cases';
import { computeNonconformityScore } from './np_calibration';

interface SweepPoint {
  τ: number;
  recall: number;
  call_rate: number;
  false_negatives: number;
  calls: number;
  skips: number;
}

function runThresholdSweep(): SweepPoint[] {
  const detector = new DimensionalDetector();

  // Compute scores for all cases
  const scores: Array<{
    score: number;
    is_v_mode: boolean;
    is_emergency: boolean;
    fast_v_mode: boolean;
  }> = [];

  for (const c of BENCHMARK_CASES) {
    const state = detector.detect(c.input, c.lang);
    const { score } = computeNonconformityScore(state, c.input);
    scores.push({
      score,
      is_v_mode: c.expected.v_mode,
      is_emergency: c.expected.emergency,
      fast_v_mode: state.v_mode_triggered,
    });
  }

  const total = scores.length;
  const positives = scores.filter(s => s.is_v_mode);
  const n_positives = positives.length;

  // Sweep thresholds
  const results: SweepPoint[] = [];
  const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0];

  for (const τ of thresholds) {
    let calls = 0;
    let false_negatives = 0;

    for (const s of scores) {
      // Emergency always bypass
      if (s.is_emergency) continue;

      // V_MODE triggered → skip
      if (s.fast_v_mode) continue;

      // Conformal decision
      if (s.score <= τ) {
        // Call LLM → assume LLM gets it right
        calls++;
      } else {
        // Skip LLM → if this was a positive, it's a false negative
        if (s.is_v_mode) {
          false_negatives++;
        }
      }
    }

    // Recall = (TP) / (TP + FN)
    // TP = positives caught by fast detector OR by LLM call
    // FN = positives with score > τ that were skipped
    const fast_catches = positives.filter(s => s.fast_v_mode).length;
    const llm_catches = positives.filter(s => !s.fast_v_mode && s.score <= τ).length;
    const tp = fast_catches + llm_catches;
    const recall = tp / n_positives;

    const call_rate = calls / total;
    const skips = total - calls - scores.filter(s => s.is_emergency).length -
                  scores.filter(s => s.fast_v_mode).length;

    results.push({
      τ,
      recall,
      call_rate,
      false_negatives,
      calls,
      skips,
    });
  }

  return results;
}

// Main
console.log('\n========================================');
console.log('  THRESHOLD SWEEP: Recall vs Call Rate');
console.log('========================================\n');

const results = runThresholdSweep();

console.log('┌─────────┬──────────┬────────────┬──────┐');
console.log('│    τ    │  Recall  │  Call Rate │  FN  │');
console.log('├─────────┼──────────┼────────────┼──────┤');

for (const r of results) {
  const recallStr = (r.recall * 100).toFixed(1).padStart(6);
  const callStr = (r.call_rate * 100).toFixed(1).padStart(6);
  const fnStr = r.false_negatives.toString().padStart(4);
  console.log(`│  ${r.τ.toFixed(2)}   │  ${recallStr}% │    ${callStr}% │ ${fnStr} │`);
}

console.log('└─────────┴──────────┴────────────┴──────┘');

// Find optimal operating point
console.log('\nRecommended thresholds:');
const target95 = results.find(r => r.recall >= 0.95);
const target90 = results.find(r => r.recall >= 0.90);
const target85 = results.find(r => r.recall >= 0.85);

if (target95) {
  console.log(`  95% recall: τ ≤ ${target95.τ.toFixed(2)} (call rate: ${(target95.call_rate * 100).toFixed(1)}%)`);
}
if (target90) {
  console.log(`  90% recall: τ ≤ ${target90.τ.toFixed(2)} (call rate: ${(target90.call_rate * 100).toFixed(1)}%)`);
}
if (target85) {
  console.log(`  85% recall: τ ≤ ${target85.τ.toFixed(2)} (call rate: ${(target85.call_rate * 100).toFixed(1)}%)`);
}

console.log('\nNote: With only 27 positives, any threshold < 1.0 risks missing some V_MODE cases.');
console.log('      The high-scoring positives are cases where the fast detector completely fails.');
