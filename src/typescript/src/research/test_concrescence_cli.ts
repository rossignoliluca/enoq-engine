/**
 * Test script for ConcrescenceEngine CLI
 */

import { ConcrescenceEngine } from '../mediator/concrescence/concrescence_engine';
import { createSession } from '../runtime/pipeline/pipeline';
import { SupportedLanguage } from '../interface/types';

interface TestCase {
  input: string;
  lang: SupportedLanguage;
  description: string;
}

async function testConcrescenceCLI() {
  const engine = new ConcrescenceEngine({ debug: false });
  const session = createSession();

  const testCases: TestCase[] = [
    {
      input: 'Mi sento confuso sulla mia vita',
      lang: 'it',
      description: 'Italian existential confusion → expect V_MODE'
    },
    {
      input: 'I cant breathe, my heart is racing, Im scared',
      lang: 'en',
      description: 'English panic → expect EMERGENCY'
    },
    {
      input: 'Cosa dovrei fare secondo te?',
      lang: 'it',
      description: 'Italian delegation attempt → expect ownership return'
    },
    {
      input: 'Help me write a Python function',
      lang: 'en',
      description: 'English operational → expect OPERATIONAL atmosphere'
    },
  ];

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    CONCRESCENCE ENGINE TEST                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  for (const tc of testCases) {
    console.log('═'.repeat(75));
    console.log('TEST:', tc.description);
    console.log('INPUT:', tc.input);
    console.log('LANG:', tc.lang);
    console.log('═'.repeat(75));

    try {
      const result = await engine.process(tc.input, session, tc.lang);
      const occ = result.occasion;

      console.log('\n┌─ CONCRESCENCE ─────────────────────────────────────────────────────────┐');
      console.log(`│  Primitive:      ${occ.concrescence.satisfaction.primitive}`);
      console.log(`│  Atmosphere:     ${occ.concrescence.satisfaction.atmosphere}`);
      console.log(`│  Depth:          ${occ.concrescence.satisfaction.depth}`);
      console.log(`│  Confidence:     ${occ.concrescence.satisfaction.confidence.toFixed(2)}`);
      console.log(`│  Constitutional: ${occ.concrescence.satisfaction.constitutional_verified ? '✓ PASS' : '✗ FAIL'}`);
      console.log('└─────────────────────────────────────────────────────────────────────────┘');

      if (occ.present.dimensional_state) {
        console.log('\n┌─ DIMENSIONAL ───────────────────────────────────────────────────────────┐');
        console.log(`│  Primary Vertical: ${occ.present.dimensional_state.primary_vertical}`);
        console.log(`│  Horizontal:       ${occ.present.dimensional_state.primary_horizontal.join(', ')}`);
        console.log(`│  V_MODE:           ${occ.present.dimensional_state.v_mode_triggered ? '⚠ ACTIVE' : 'no'}`);
        console.log(`│  Emergency:        ${occ.present.dimensional_state.emergency_detected ? '🚨 ACTIVE' : 'no'}`);
        console.log(`│  Phi (integration): ${occ.present.dimensional_state.integration.phi.toFixed(3)}`);
        console.log('└─────────────────────────────────────────────────────────────────────────┘');
      }

      console.log('\n┌─ PREHENSIONS ───────────────────────────────────────────────────────────┐');
      console.log(`│  Total: ${occ.concrescence.prehensions.length}`);
      for (const p of occ.concrescence.prehensions.slice(0, 5)) {
        console.log(`│    ${p.source}:${p.type} (weight: ${p.weight.toFixed(2)}, relevance: ${p.relevance.toFixed(2)})`);
      }
      if (occ.concrescence.prehensions.length > 5) {
        console.log(`│    ... and ${occ.concrescence.prehensions.length - 5} more`);
      }
      console.log('└─────────────────────────────────────────────────────────────────────────┘');

      if (occ.concrescence.tensions.length > 0) {
        console.log('\n┌─ TENSIONS ──────────────────────────────────────────────────────────────┐');
        for (const t of occ.concrescence.tensions) {
          console.log(`│  ${t.nature}: ${t.description}`);
          console.log(`│    Severity: ${t.severity.toFixed(2)}, Between: ${t.between.join(' ↔ ')}`);
        }
        console.log('└─────────────────────────────────────────────────────────────────────────┘');
      }

      if (occ.concrescence.coherences.length > 0) {
        console.log('\n┌─ COHERENCES ────────────────────────────────────────────────────────────┐');
        for (const c of occ.concrescence.coherences) {
          console.log(`│  ${c.on} (strength: ${c.strength.toFixed(2)})`);
          console.log(`│    Among: ${c.among.join(', ')}`);
        }
        console.log('└─────────────────────────────────────────────────────────────────────────┘');
      }

      console.log('\n┌─ RESPONSE ──────────────────────────────────────────────────────────────┐');
      const response = occ.future.response;
      const words = response.split(' ');
      let line = '';
      for (const word of words) {
        if (line.length + word.length + 1 <= 70) {
          line += (line ? ' ' : '') + word;
        } else {
          console.log(`│  ${line}`);
          line = word;
        }
      }
      if (line) console.log(`│  ${line}`);
      console.log('└─────────────────────────────────────────────────────────────────────────┘');

      console.log('\n┌─ PREDICTED EFFECT ─────────────────────────────────────────────────────┐');
      console.log(`│  Expected State:      ${occ.future.predicted_effect.expected_user_state}`);
      console.log(`│  Autonomy Impact:     ${occ.future.predicted_effect.autonomy_impact}`);
      console.log(`│  Relationship Impact: ${occ.future.predicted_effect.relationship_impact}`);
      console.log('└─────────────────────────────────────────────────────────────────────────┘');

    } catch (error) {
      console.error('ERROR:', error);
    }

    console.log('\n');
  }

  console.log('═'.repeat(75));
  console.log('SESSION SUMMARY');
  console.log('═'.repeat(75));
  console.log(`Session ID: ${session.session_id}`);
  console.log(`Turns: ${session.turns.length}`);
  console.log(`Occasions: ${engine.getOccasionHistory().length}`);
  console.log(`Delegation attempts: ${session.memory.delegation_attempts}`);
  console.log(`Recent responses: ${session.memory.recent_responses.length}`);
  console.log('═'.repeat(75));
}

testConcrescenceCLI().catch(console.error);
