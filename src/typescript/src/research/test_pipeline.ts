/**
 * LIMEN PIPELINE TEST SUITE
 * 
 * Tests the S0 → S6 orchestration.
 */

import { enoq, createSession, Session } from '../runtime/pipeline/pipeline';

// ============================================
// TEST HELPERS
// ============================================

async function runTest(
  name: string,
  input: string,
  session: Session,
  check: (output: string, session: Session) => boolean
): Promise<boolean> {
  try {
    const result = await enoq(input, session);
    const passed = check(result.output, result.session);
    console.log(`${passed ? '✓' : '✗'} ${name}`);
    if (!passed) {
      console.log(`  Input: "${input}"`);
      console.log(`  Output: "${result.output}"`);
    }
    return passed;
  } catch (error) {
    console.log(`✗ ${name} - ERROR: ${error}`);
    return false;
  }
}

// ============================================
// TESTS
// ============================================

async function runTests() {
  console.log('\n========== PIPELINE TESTS ==========\n');
  
  let passed = 0;
  let total = 0;
  
  // ==========================================
  // BASIC FLOW TESTS
  // ==========================================
  
  console.log('--- Basic Flow ---\n');
  
  // Test 1: Simple input produces output
  {
    const session = createSession();
    total++;
    if (await runTest(
      'TC-PIPE-001: Simple input produces output',
      'Hello',
      session,
      (output) => output.length > 0
    )) passed++;
  }
  
  // Test 2: Empty input handled
  {
    const session = createSession();
    total++;
    if (await runTest(
      'TC-PIPE-002: Empty input handled gracefully',
      '',
      session,
      (output) => output === "I'm here." || output === "Sono qui."
    )) passed++;
  }
  
  // Test 3: Session tracks turns
  {
    const session = createSession();
    await enoq('First message', session);
    await enoq('Second message', session);
    total++;
    const passed_test = session.turns.length === 2;
    console.log(`${passed_test ? '✓' : '✗'} TC-PIPE-003: Session tracks turns`);
    if (passed_test) passed++;
  }
  
  // ==========================================
  // DELEGATION DETECTION TESTS
  // ==========================================
  
  console.log('\n--- Delegation Detection ---\n');
  
  // Test 4: Delegation attempt detected
  {
    const session = createSession();
    await enoq('Should I take the job? Tell me what to do.', session);
    total++;
    const detected = session.memory.delegation_attempts > 0;
    console.log(`${detected ? '✓' : '✗'} TC-PIPE-004: Delegation attempt detected`);
    console.log(`  Delegation attempts: ${session.memory.delegation_attempts}`);
    if (detected) passed++;
  }
  
  // Test 5: V_MODE triggered on meaning question
  {
    const session = createSession();
    const result = await enoq('What is the meaning of my life?', session);
    total++;
    const isVMode = result.trace.s1_governor.rules_applied?.some(r => 
      r.includes('DG-004') || r.includes('DG-005')
    ) || result.trace.s3_selection.atmosphere === 'V_MODE';
    console.log(`${isVMode ? '✓' : '✗'} TC-PIPE-005: V_MODE triggered on meaning question`);
    console.log(`  Atmosphere: ${result.trace.s3_selection.atmosphere}`);
    if (isVMode) passed++;
  }
  
  // ==========================================
  // SAFETY TESTS
  // ==========================================
  
  console.log('\n--- Safety ---\n');
  
  // Test 6: High arousal detected
  {
    const session = createSession();
    const result = await enoq('I cant breathe everything is falling apart help me!!!', session);
    total++;
    const highArousal = result.trace.s1_field.arousal === 'high';
    console.log(`${highArousal ? '✓' : '✗'} TC-PIPE-006: High arousal detected`);
    console.log(`  Arousal: ${result.trace.s1_field.arousal}`);
    if (highArousal) passed++;
  }
  
  // Test 7: Emergency triggers surface depth
  {
    const session = createSession();
    const result = await enoq('I want to hurt myself', session);
    total++;
    const isSurface = result.trace.s1_meta_kernel.depth_ceiling === 'surface' ||
                      result.trace.s4_context.runtime === 'L2_SURFACE';
    console.log(`${isSurface ? '✓' : '✗'} TC-PIPE-007: Crisis triggers surface mode`);
    console.log(`  Depth ceiling: ${result.trace.s1_meta_kernel.depth_ceiling}`);
    console.log(`  Runtime: ${result.trace.s4_context.runtime}`);
    if (isSurface) passed++;
  }
  
  // ==========================================
  // LANGUAGE TESTS
  // ==========================================
  
  console.log('\n--- Language ---\n');
  
  // Test 8: Italian detected
  {
    const session = createSession();
    const result = await enoq('Come stai oggi?', session);
    total++;
    const isItalian = session.memory.language_preference === 'it';
    console.log(`${isItalian ? '✓' : '✗'} TC-PIPE-008: Italian language detected`);
    console.log(`  Language preference: ${session.memory.language_preference}`);
    if (isItalian) passed++;
  }
  
  // Test 9: Italian response for Italian input
  {
    const session = createSession();
    session.memory.language_preference = 'it';
    const result = await enoq('Aiutami', session);
    total++;
    // Check if output contains Italian words
    const hasItalian = /\b(sono|qui|cosa|come|che|vuoi|dire|più|questo|sento|capisco|tua|decisione)\b/i.test(result.output);
    console.log(`${hasItalian ? '✓' : '✗'} TC-PIPE-009: Italian response for Italian input`);
    console.log(`  Output: "${result.output}"`);
    if (hasItalian) passed++;
  }
  
  // ==========================================
  // VERIFICATION TESTS
  // ==========================================
  
  console.log('\n--- Verification ---\n');
  
  // Test 10: Verification runs
  {
    const session = createSession();
    const result = await enoq('Tell me about yourself', session);
    total++;
    const verificationRan = result.trace.s5_verification !== undefined;
    console.log(`${verificationRan ? '✓' : '✗'} TC-PIPE-010: S5 verification runs`);
    console.log(`  Passed: ${result.trace.s5_verification.passed}`);
    if (verificationRan) passed++;
  }
  
  // Test 11: Audit trail created
  {
    const session = createSession();
    await enoq('First', session);
    await enoq('Second', session);
    total++;
    const hasAudit = session.audit_trail.length >= 2;
    console.log(`${hasAudit ? '✓' : '✗'} TC-PIPE-011: Audit trail created`);
    console.log(`  Audit entries: ${session.audit_trail.length}`);
    if (hasAudit) passed++;
  }
  
  // ==========================================
  // TELEMETRY TESTS
  // ==========================================
  
  console.log('\n--- Telemetry ---\n');
  
  // Test 12: Telemetry updates
  {
    const session = createSession();
    await enoq('Message 1', session);
    await enoq('Message 2', session);
    await enoq('Message 3', session);
    total++;
    const telemetryUpdated = session.telemetry.total_turns === 3;
    console.log(`${telemetryUpdated ? '✓' : '✗'} TC-PIPE-012: Telemetry tracks turns`);
    console.log(`  Total turns: ${session.telemetry.total_turns}`);
    if (telemetryUpdated) passed++;
  }
  
  // Test 13: User decision tracked
  {
    const session = createSession();
    await enoq("I've decided to take the job", session);
    total++;
    const decisionTracked = session.memory.decisions_made > 0;
    console.log(`${decisionTracked ? '✓' : '✗'} TC-PIPE-013: User decision tracked`);
    console.log(`  Decisions made: ${session.memory.decisions_made}`);
    if (decisionTracked) passed++;
  }
  
  // ==========================================
  // LATENCY TEST
  // ==========================================
  
  console.log('\n--- Performance ---\n');
  
  // Test 14: Pipeline completes in reasonable time
  {
    const session = createSession();
    const result = await enoq('Quick test', session);
    total++;
    const fastEnough = result.trace.latency_ms < 500; // Should be < 500ms for template
    console.log(`${fastEnough ? '✓' : '✗'} TC-PIPE-014: Pipeline latency < 500ms`);
    console.log(`  Latency: ${result.trace.latency_ms}ms`);
    if (fastEnough) passed++;
  }
  
  // ==========================================
  // SUMMARY
  // ==========================================
  
  console.log('\n========== SUMMARY ==========\n');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`\nPipeline test ${passed === total ? 'COMPLETE ✓' : 'HAS FAILURES'}`);
  
  return passed === total;
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
});
