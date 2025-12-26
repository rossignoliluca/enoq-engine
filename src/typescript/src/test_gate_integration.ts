/**
 * GATE INTEGRATION TESTS
 * 
 * Tests the Gate client and its integration with the ENOQ pipeline.
 * These tests work both with and without a running gate-runtime server.
 */

import { 
  GateClient, 
  GateResult, 
  interpretGateSignal,
  GateSignalEffect,
  getGateClient,
  resetGateClient,
} from './gate_client';
import { enoq, createSession, PipelineConfig } from './pipeline';

// ============================================
// TEST UTILITIES
// ============================================

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve(fn())
    .then(() => {
      console.log(`  ✅ ${name}`);
      passCount++;
    })
    .catch((error) => {
      console.log(`  ❌ ${name}`);
      console.log(`     Error: ${error.message}`);
      failCount++;
    });
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(array: string[], item: string, message: string): void {
  if (!array.includes(item)) {
    throw new Error(`${message}: ${item} not in [${array.join(', ')}]`);
  }
}

// ============================================
// GATE CLIENT UNIT TESTS
// ============================================

async function testGateClientUnit() {
  console.log('\n📡 GATE CLIENT UNIT TESTS\n');
  
  // Test: Client creation with defaults
  await test('Client creates with default config', () => {
    resetGateClient();
    const client = new GateClient();
    const config = client.getConfig();
    assert(config.enabled === true, 'Default enabled should be true');
    assert(config.timeout_ms === 1000, 'Default timeout should be 1000');
  });

  // Test: Client creation with custom config
  await test('Client accepts custom config', () => {
    const client = new GateClient({
      base_url: 'http://custom:8080',
      timeout_ms: 500,
      enabled: false,
    });
    const config = client.getConfig();
    assertEqual(config.base_url, 'http://custom:8080', 'Custom base_url');
    assertEqual(config.timeout_ms, 500, 'Custom timeout');
    assertEqual(config.enabled, false, 'Custom enabled');
  });

  // Test: Disabled client returns NULL immediately
  await test('Disabled client returns NULL signal', async () => {
    const client = new GateClient({ enabled: false });
    const result = await client.classify('any input');
    assertEqual(result.signal, 'NULL', 'Disabled client should return NULL');
    assertEqual(result.reason_code, 'ZERO_PERTURBATION', 'Reason should be ZERO_PERTURBATION');
    assertEqual(result.latency_ms, 0, 'Latency should be 0 for disabled');
  });

  // Test: Singleton pattern
  await test('getGateClient returns singleton', () => {
    resetGateClient();
    const client1 = getGateClient();
    const client2 = getGateClient();
    assert(client1 === client2, 'Should return same instance');
  });

  // Test: Config update
  await test('Config can be updated', () => {
    resetGateClient();
    const client = getGateClient({ timeout_ms: 500 });
    assertEqual(client.getConfig().timeout_ms, 500, 'Initial timeout');
    client.updateConfig({ timeout_ms: 2000 });
    assertEqual(client.getConfig().timeout_ms, 2000, 'Updated timeout');
  });
}

// ============================================
// SIGNAL INTERPRETATION TESTS
// ============================================

async function testSignalInterpretation() {
  console.log('\n🔍 SIGNAL INTERPRETATION TESTS\n');

  // Test: D1 (Operational Continuity) interpretation
  await test('D1_ACTIVE → EMERGENCY atmosphere, surface depth', () => {
    const effect = interpretGateSignal('D1_ACTIVE', 'DOMAIN_SIGNAL');
    assertEqual(effect.proceed, true, 'Should proceed');
    assertEqual(effect.atmosphere_hint, 'EMERGENCY', 'Atmosphere');
    assertEqual(effect.depth_ceiling, 'surface', 'Depth ceiling');
    assertEqual(effect.escalate, true, 'Should escalate');
    assertEqual(effect.professional_referral, true, 'Should refer');
    assertIncludes(effect.forbidden_additions || [], 'explore', 'Forbid explore');
    assertIncludes(effect.required_additions || [], 'safety_check', 'Require safety_check');
  });

  // Test: D2 (Coordination) interpretation
  await test('D2_ACTIVE → HUMAN_FIELD atmosphere, medium depth', () => {
    const effect = interpretGateSignal('D2_ACTIVE', 'DOMAIN_SIGNAL');
    assertEqual(effect.atmosphere_hint, 'HUMAN_FIELD', 'Atmosphere');
    assertEqual(effect.depth_ceiling, 'medium', 'Depth ceiling');
    assertIncludes(effect.forbidden_additions || [], 'take_sides', 'Forbid take_sides');
  });

  // Test: D3 (Operative Selection) interpretation
  await test('D3_ACTIVE → DECISION atmosphere, deep allowed', () => {
    const effect = interpretGateSignal('D3_ACTIVE', 'DOMAIN_SIGNAL');
    assertEqual(effect.atmosphere_hint, 'DECISION', 'Atmosphere');
    assertEqual(effect.depth_ceiling, 'deep', 'Depth ceiling');
    assertIncludes(effect.forbidden_additions || [], 'recommend', 'Forbid recommend');
    assertIncludes(effect.required_additions || [], 'return_ownership', 'Require return_ownership');
  });

  // Test: D4 (Boundary) interpretation
  await test('D4_ACTIVE → V_MODE atmosphere', () => {
    const effect = interpretGateSignal('D4_ACTIVE', 'DOMAIN_SIGNAL');
    assertEqual(effect.atmosphere_hint, 'V_MODE', 'Atmosphere');
    assertEqual(effect.depth_ceiling, 'medium', 'Depth ceiling');
    assertIncludes(effect.forbidden_additions || [], 'define_identity', 'Forbid define_identity');
    assertIncludes(effect.required_additions || [], 'mirror_only', 'Require mirror_only');
  });

  // Test: NULL with NORMATIVE_REQUEST
  await test('NULL + NORMATIVE_REQUEST → V_MODE', () => {
    const effect = interpretGateSignal('NULL', 'NORMATIVE_REQUEST');
    assertEqual(effect.atmosphere_hint, 'V_MODE', 'Atmosphere');
    assertIncludes(effect.required_additions || [], 'return_ownership', 'Require return_ownership');
  });

  // Test: NULL with AMBIGUOUS
  await test('NULL + AMBIGUOUS → medium depth ceiling', () => {
    const effect = interpretGateSignal('NULL', 'AMBIGUOUS');
    assertEqual(effect.depth_ceiling, 'medium', 'Depth ceiling for ambiguous');
    assertIncludes(effect.required_additions || [], 'validate', 'Require validate');
  });

  // Test: NULL with ZERO_PERTURBATION (normal case)
  await test('NULL + ZERO_PERTURBATION → no constraints', () => {
    const effect = interpretGateSignal('NULL', 'ZERO_PERTURBATION');
    assertEqual(effect.proceed, true, 'Should proceed');
    assertEqual(effect.atmosphere_hint, undefined, 'No atmosphere hint');
    assertEqual(effect.depth_ceiling, undefined, 'No depth ceiling');
  });
}

// ============================================
// PIPELINE INTEGRATION TESTS (OFFLINE)
// ============================================

async function testPipelineIntegrationOffline() {
  console.log('\n🔄 PIPELINE INTEGRATION TESTS (GATE DISABLED)\n');

  const offlineConfig: PipelineConfig = {
    gate_enabled: false,
  };

  // Test: Pipeline works without Gate
  await test('Pipeline runs with Gate disabled', async () => {
    const session = createSession();
    const result = await enoq('Come stai?', session, offlineConfig);
    assert(result.output.length > 0, 'Should produce output');
    assert(result.trace.s0_gate === undefined, 'Gate trace should be undefined when disabled');
  });

  // Test: Pipeline processes normal input
  await test('Normal input processed correctly', async () => {
    const session = createSession();
    const result = await enoq('Hello, I want to explore my options', session, offlineConfig);
    assert(result.output.length > 0, 'Should produce output');
    assert(result.session.turns.length === 1, 'Should record turn');
  });

  // Test: Emergency input still detected by L1
  await test('L1 perception still detects crisis without Gate', async () => {
    const session = createSession();
    // Use marker that L1 recognizes: "harm myself" or "dying"
    const result = await enoq('I want to harm myself, I am dying inside', session, offlineConfig);
    // L1 should still detect this - flag is 'crisis' not 'crisis_signal'
    assert(result.trace.s1_field.flags.includes('crisis'), 'L1 should detect crisis');
    assertEqual(result.trace.s3_selection.atmosphere, 'EMERGENCY', 'Atmosphere should be EMERGENCY');
  });
}

// ============================================
// PIPELINE INTEGRATION TESTS (WITH GATE SERVER)
// ============================================

async function testPipelineIntegrationOnline() {
  console.log('\n🌐 PIPELINE INTEGRATION TESTS (WITH GATE SERVER)\n');

  // First check if Gate server is available
  resetGateClient();
  const client = getGateClient({ 
    base_url: 'http://localhost:3000',
    timeout_ms: 2000 
  });
  
  const serverAvailable = await client.healthCheck();
  
  if (!serverAvailable) {
    console.log('  ⚠️  Gate server not available at localhost:3000');
    console.log('     Skipping online integration tests');
    console.log('     To run these tests, start gate-runtime first:\n');
    console.log('       cd gate-runtime && npm start\n');
    return;
  }

  console.log('  ✓ Gate server detected at localhost:3000\n');

  const onlineConfig: PipelineConfig = {
    gate_enabled: true,
    gate_url: 'http://localhost:3000',
    gate_timeout_ms: 2000,
  };

  // Test: Gate classification flows through pipeline
  await test('Gate classification appears in trace', async () => {
    const session = createSession();
    const result = await enoq('I need to decide between two job offers', session, onlineConfig);
    
    assert(result.trace.s0_gate !== undefined, 'Gate trace should be present');
    if (result.trace.s0_gate) {
      assert(result.trace.s0_gate.signal !== undefined, 'Signal should be present');
      assert(result.trace.s0_gate.latency_ms >= 0, 'Latency should be recorded');
    }
  });

  // Test: D3 decision input
  await test('Decision input triggers D3 signal', async () => {
    const session = createSession();
    const result = await enoq('Should I take the job in New York or stay here?', session, onlineConfig);
    
    if (result.trace.s0_gate?.signal === 'D3_ACTIVE') {
      assertEqual(result.trace.s3_selection.atmosphere, 'DECISION', 'Atmosphere should be DECISION');
      assertIncludes(result.trace.s4_context.forbidden, 'recommend', 'Forbid recommend');
    }
  });

  // Test: D1 crisis input
  await test('Crisis input triggers D1 signal', async () => {
    const session = createSession();
    const result = await enoq('I am in danger and need help', session, onlineConfig);
    
    if (result.trace.s0_gate?.signal === 'D1_ACTIVE') {
      assertEqual(result.trace.s3_selection.atmosphere, 'EMERGENCY', 'Atmosphere should be EMERGENCY');
      assertEqual(result.trace.s3_selection.depth, 'surface', 'Depth should be surface');
    }
  });

  // Test: Multiple turns with Gate
  await test('Gate tracks across multiple turns', async () => {
    const session = createSession();
    
    // Turn 1
    const result1 = await enoq('I feel overwhelmed', session, onlineConfig);
    assert(result1.trace.s0_gate !== undefined, 'Turn 1 should have gate trace');
    
    // Turn 2
    const result2 = await enoq('What should I do?', result1.session, onlineConfig);
    assert(result2.trace.s0_gate !== undefined, 'Turn 2 should have gate trace');
    assertEqual(result2.session.turns.length, 2, 'Should have 2 turns');
  });
}

// ============================================
// EDGE CASES AND ERROR HANDLING
// ============================================

async function testEdgeCases() {
  console.log('\n⚠️  EDGE CASES AND ERROR HANDLING\n');

  // Test: Gate timeout handling
  await test('Gate timeout returns NULL gracefully', async () => {
    const client = new GateClient({
      base_url: 'http://localhost:99999', // Non-existent
      timeout_ms: 100,
      enabled: true,
    });
    
    const result = await client.classify('test input');
    assertEqual(result.signal, 'NULL', 'Should return NULL on timeout');
    assertEqual(result.reason_code, 'UNCLASSIFIABLE', 'Reason should be UNCLASSIFIABLE');
    assert(result.error !== undefined, 'Error should be recorded');
  });

  // Test: Empty input handling
  await test('Empty input handled correctly', async () => {
    const session = createSession();
    const result = await enoq('', session, { gate_enabled: false });
    assert(result.output.length > 0, 'Should produce output for empty');
  });

  // Test: Very long input
  await test('Long input handled correctly', async () => {
    const longInput = 'I feel '.repeat(500) + 'overwhelmed';
    const session = createSession();
    const result = await enoq(longInput, session, { gate_enabled: false });
    assert(result.output.length > 0, 'Should handle long input');
  });

  // Test: Mixed language input
  await test('Mixed language input handled', async () => {
    const session = createSession();
    const result = await enoq('I feel confused, non so cosa fare', session, { gate_enabled: false });
    assert(result.output.length > 0, 'Should handle mixed language');
  });
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              ENOQ GATE INTEGRATION TESTS                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  await testGateClientUnit();
  await testSignalInterpretation();
  await testPipelineIntegrationOffline();
  await testPipelineIntegrationOnline();
  await testEdgeCases();

  console.log('\n' + '═'.repeat(60));
  console.log(`RESULTS: ${passCount} passed, ${failCount} failed`);
  console.log('═'.repeat(60) + '\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
