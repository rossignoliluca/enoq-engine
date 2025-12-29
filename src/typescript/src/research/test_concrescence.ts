/**
 * Test ConcrescenceEngine
 *
 * Demonstrates the unified processing through both pipelines
 */

import { processWithConcrescence, ConcrescenceEngine } from '../mediator/concrescence/concrescence_engine';
import { createSession } from '../runtime/pipeline/pipeline';

async function testConcrescenceEngine() {
  console.log('\n========================================');
  console.log('   CONCRESCENCE ENGINE TEST');
  console.log('========================================\n');

  const session = createSession();
  const engine = new ConcrescenceEngine({ debug: true });

  // Test cases
  const testCases = [
    {
      input: "Mi sento perso, non so cosa fare della mia vita",
      language: 'it' as const,
      description: "Existential crisis (Italian)"
    },
    {
      input: "I need to decide between two job offers by tomorrow",
      language: 'en' as const,
      description: "Decision with time pressure"
    },
    {
      input: "Non riesco a respirare, ho il cuore che batte fortissimo",
      language: 'it' as const,
      description: "Somatic emergency (Italian)"
    },
    {
      input: "What does it mean to live authentically?",
      language: 'en' as const,
      description: "V_MODE philosophical question"
    }
  ];

  for (const test of testCases) {
    console.log('\n----------------------------------------');
    console.log(`TEST: ${test.description}`);
    console.log(`INPUT: "${test.input}"`);
    console.log('----------------------------------------\n');

    try {
      const startTime = Date.now();
      const result = await engine.process(test.input, session, test.language);
      const latency = Date.now() - startTime;

      const occasion = result.occasion;
      const concrescence = occasion.concrescence;

      console.log('--- RESPONSE ---');
      console.log(occasion.future.response);
      console.log();

      console.log('--- CONCRESCENCE DETAILS ---');
      console.log(`Primitive: ${concrescence.satisfaction.primitive}`);
      console.log(`Atmosphere: ${concrescence.satisfaction.atmosphere}`);
      console.log(`Depth: ${concrescence.satisfaction.depth}`);
      console.log(`Confidence: ${(concrescence.satisfaction.confidence * 100).toFixed(1)}%`);
      console.log(`Constitutional: ${concrescence.satisfaction.constitutional_verified ? 'VERIFIED' : 'NEEDS REVIEW'}`);
      console.log();

      console.log('--- PREHENSIONS ---');
      console.log(`Total: ${concrescence.prehensions.length}`);
      const sources = [...new Set(concrescence.prehensions.map(p => p.source))];
      console.log(`Sources: ${sources.join(', ')}`);
      console.log();

      console.log('--- TENSIONS ---');
      if (concrescence.tensions.length === 0) {
        console.log('None (systems aligned)');
      } else {
        for (const tension of concrescence.tensions) {
          console.log(`- ${tension.nature}: ${tension.description} (severity: ${tension.severity.toFixed(2)})`);
        }
      }
      console.log();

      console.log('--- COHERENCES ---');
      if (concrescence.coherences.length === 0) {
        console.log('None detected');
      } else {
        for (const coherence of concrescence.coherences) {
          console.log(`- ${coherence.on} (strength: ${coherence.strength.toFixed(2)})`);
        }
      }
      console.log();

      console.log('--- DIMENSIONAL STATE ---');
      const dim = occasion.present.dimensional_state;
      if (dim) {
        console.log(`Primary Vertical: ${dim.primary_vertical}`);
        console.log(`Primary Horizontal: ${dim.primary_horizontal.join(', ')}`);
        console.log(`V_MODE: ${dim.v_mode_triggered ? 'YES' : 'no'}`);
        console.log(`Emergency: ${dim.emergency_detected ? 'YES' : 'no'}`);
        console.log(`Phi (Integration): ${dim.integration?.phi?.toFixed(2) || 'N/A'}`);
      }
      console.log();

      console.log('--- PREDICTED EFFECT ---');
      const effect = occasion.future.predicted_effect;
      console.log(`Expected User State: ${effect.expected_user_state}`);
      console.log(`Autonomy Impact: ${effect.autonomy_impact}`);
      console.log(`Relationship Impact: ${effect.relationship_impact}`);
      console.log();

      console.log(`--- LATENCY: ${latency}ms ---`);

    } catch (error) {
      console.error('ERROR:', error);
    }
  }

  console.log('\n========================================');
  console.log('   TEST COMPLETE');
  console.log('========================================\n');

  // Show occasion history
  const history = engine.getOccasionHistory();
  console.log(`Total Occasions Processed: ${history.length}`);
  console.log('Occasion IDs:');
  for (const occ of history) {
    console.log(`  - ${occ.id} @ ${occ.timestamp.toISOString()}`);
  }
}

// Run
testConcrescenceEngine().catch(console.error);
