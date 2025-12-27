/**
 * Quick test of GENESIS
 */

import { createENOQ, creator, GENESIS_VERSION } from './index';

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                    GENESIS TEST                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
console.log(`\nVersion: ${GENESIS_VERSION}\n`);

// Create ENOQ
console.log('1. Creating ENOQ from primordial seed...');
const enoq = createENOQ();
console.log(`   Created: ${enoq.id}`);
console.log(`   Generation: ${enoq.generation}`);
console.log(`   Domains: ${enoq.domains.length}`);
console.log(`   Dimensions: ${enoq.dimensions.length}`);
console.log(`   Functions: ${enoq.functions.length}`);

// Test domain detection
console.log('\n2. Testing domain detection...');
const testInputs = [
  { content: 'Help! I need help right now!' },
  { content: 'Who am I really?' },
  { content: 'Should I take this job or not?' },
  { content: 'What is the capital of France?' },
  { content: 'Write me a poem about the sea' }
];

for (const input of testInputs) {
  const domain = enoq.detectDomain(input);
  console.log(`   "${input.content.slice(0, 30)}..." → ${domain.id} (${domain.name})`);
}

// Test processing
console.log('\n3. Testing processing through field...');
const state = enoq.getState();
const output = enoq.process({ content: 'Who am I?' }, state);
console.log(`   Input: "Who am I?"`);
console.log(`   Withdrew: ${output.withdrew}`);
console.log(`   Trajectory:`);
console.log(`     - intervention_depth: ${output.trajectory.intervention_depth.toFixed(3)}`);
console.log(`     - prescriptiveness: ${output.trajectory.prescriptiveness.toFixed(3)}`);
console.log(`     - identity_touching: ${output.trajectory.identity_touching.toFixed(3)}`);
console.log(`     - presence: ${output.trajectory.presence.toFixed(3)}`);
console.log(`   Explanation: ${output.explanation.join('; ')}`);

// Test spawning
console.log('\n4. Testing spawning...');
const variant = creator.variate(enoq.id, {
  attractor_mutations: [{ id: 'A1_WITHDRAWAL', mass_multiplier: 2.0 }]
});
if (variant) {
  console.log(`   Created variant: ${variant.id}`);
  console.log(`   (This variant has 2x withdrawal attractor mass)`);
}

// Test self-description
console.log('\n5. Testing self-description (strange loop)...');
const description = creator.describeSelf();
console.log(`   Creator can describe itself: ${description.length} characters`);

// Show attractors
console.log('\n6. Constitutional Attractors:');
for (const attractor of creator.getAttractors()) {
  console.log(`   ${attractor.id}: ${attractor.name} (mass: ${attractor.mass})`);
}

// Show domains
console.log('\n7. Emergent Domains:');
for (const domain of enoq.domains) {
  console.log(`   ${domain.id}: ${domain.name} (depth: ${domain.depth})`);
}

// Show functions with kenosis
console.log('\n8. Emergent Functions (with kenosis):');
for (const func of enoq.functions) {
  console.log(`   ${func.id}: ${func.name}`);
  console.log(`      ${func.kenosis}`);
}

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║                    GENESIS TEST COMPLETE                          ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');
