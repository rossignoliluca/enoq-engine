/**
 * LIMEN L2 EXECUTION TEST SUITE
 * 
 * Tests that L2 is blind, constrained, and returning.
 */

import {
  compileExecutionContext,
  execute,
  selectRuntime,
  verifyL2Blindness,
  ExecutionContext,
  SURFACE_TEMPLATES,
  RUNTIME_CAPABILITIES,
  hashExecutionContext,
} from '../runtime/pipeline/l2_execution';
import { FieldState, ProtocolSelection, ForbiddenAction, RequiredAction } from '../interface/types';
import { GovernorResult } from '../gate/enforcement/domain_governor';
import { MetaKernelResult, createDefaultState } from '../mediator/l3_integrate/meta_kernel';

// ============================================
// TEST HELPERS
// ============================================

function createTestField(overrides: Partial<FieldState> = {}): FieldState {
  return {
    domains: [{ domain: 'H06_MEANING', salience: 0.7 }],
    arousal: 'medium',
    valence: 'neutral',
    coherence: 'medium',
    goal: 'explore',
    loop_count: 0,
    flags: [],
    uncertainty: 0.3,
    language: 'en',
    ...overrides,
  };
}

function createTestSelection(overrides: Partial<ProtocolSelection> = {}): ProtocolSelection {
  return {
    atmosphere: 'HUMAN_FIELD',
    mode: 'EXPAND',
    primitive: 'P04_OPEN',
    depth: 'medium',
    length: 'moderate',
    pacing: 'normal',
    tone: { warmth: 4, directness: 3 },
    forbidden: [] as string[],
    required: [] as string[],
    confidence: 0.8,
    reasoning: 'test',
    ...overrides,
  };
}

function createTestGovernor(overrides: Partial<GovernorResult['effect']> = {}): GovernorResult {
  return {
    rules_applied: [],
    effect: {
      atmosphere: null,
      mode: null,
      depth_ceiling: 'deep',
      forbidden: [] as ForbiddenAction[],
      required: [] as RequiredAction[],
      pacing: 'normal',
      primitive: null,
      escalate: false,
      l2_enabled: true,
      ...overrides,
    },
  };
}

function createTestMetaKernel(): MetaKernelResult {
  return {
    rules_applied: [],
    knob_changes: [],
    power_envelope: {
      depth_ceiling: 'deep',
      dimensions_allowed: ['somatic', 'emotional', 'relational', 'existential', 'systemic'],
      pacing: 'normal',
      l2_mode: 'DEEP',
      time_remaining: 3600,
      turns_remaining: 100,
    },
    prompt_handshake: false,
    new_state: createDefaultState(),
  };
}

// ============================================
// L2 BLINDNESS TESTS
// ============================================

console.log('\n========== L2 BLINDNESS TESTS ==========\n');

// Test: ExecutionContext has no field information
{
  const field = createTestField();
  const selection = createTestSelection();
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  console.log('TC-L2-001: ExecutionContext has no field information');
  const hasField = 'field' in context;
  const hasDomains = 'domains' in context;
  const hasArousal = 'arousal' in context;
  
  console.log(`  Has 'field': ${hasField} (expected: false)`);
  console.log(`  Has 'domains': ${hasDomains} (expected: false)`);
  console.log(`  Has 'arousal': ${hasArousal} (expected: false)`);
  
  const pass = !hasField && !hasDomains && !hasArousal;
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
}

// Test: verifyL2Blindness passes for valid context
{
  const field = createTestField();
  const selection = createTestSelection();
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  console.log('TC-L2-002: verifyL2Blindness passes');
  let pass = false;
  try {
    verifyL2Blindness(context);
    pass = true;
  } catch (e) {
    pass = false;
  }
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
}

// ============================================
// RUNTIME SELECTION TESTS
// ============================================

console.log('\n========== RUNTIME SELECTION TESTS ==========\n');

// Test: EMERGENCY uses SURFACE
{
  const runtime = selectRuntime('EMERGENCY', 'medium', 'DEEP');
  
  console.log('TC-L2-003: EMERGENCY uses SURFACE');
  console.log(`  Runtime: ${runtime} (expected: L2_SURFACE)`);
  console.log(`  ✓ ${runtime === 'L2_SURFACE' ? 'PASS' : 'FAIL'}\n`);
}

// Test: High arousal uses SURFACE
{
  const runtime = selectRuntime('HUMAN_FIELD', 'high', 'DEEP');
  
  console.log('TC-L2-004: High arousal uses SURFACE');
  console.log(`  Runtime: ${runtime} (expected: L2_SURFACE)`);
  console.log(`  ✓ ${runtime === 'L2_SURFACE' ? 'PASS' : 'FAIL'}\n`);
}

// Test: Normal conditions respect MetaKernel
{
  const runtime = selectRuntime('HUMAN_FIELD', 'medium', 'MEDIUM');
  
  console.log('TC-L2-005: Normal respects MetaKernel');
  console.log(`  Runtime: ${runtime} (expected: L2_MEDIUM)`);
  console.log(`  ✓ ${runtime === 'L2_MEDIUM' ? 'PASS' : 'FAIL'}\n`);
}

// ============================================
// CONSTRAINT MERGING TESTS
// ============================================

console.log('\n========== CONSTRAINT MERGING TESTS ==========\n');

// Test: Constraints from all sources are merged
{
  const field = createTestField();
  const selection = createTestSelection({
    forbidden: ['recommend'],
    required: ['validate_feeling'],
  });
  const governor = createTestGovernor({
    forbidden: ['explore', 'analyze'],
    required: ['ground'],
  });
  const metaKernel = createTestMetaKernel();
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  console.log('TC-L2-006: Constraints are merged');
  console.log(`  Forbidden: ${context.constraints.forbidden.join(', ')}`);
  console.log(`  Required: ${context.constraints.required.join(', ')}`);
  
  const hasForbidden = context.constraints.forbidden.includes('recommend') &&
                       context.constraints.forbidden.includes('explore');
  const hasRequired = context.constraints.required.includes('validate_feeling') &&
                      context.constraints.required.includes('ground');
  
  console.log(`  ✓ ${hasForbidden && hasRequired ? 'PASS' : 'FAIL'}\n`);
}

// Test: Depth is most restrictive
{
  const field = createTestField();
  const selection = createTestSelection({ depth: 'deep' });
  const governor = createTestGovernor({ depth_ceiling: 'medium' });
  const metaKernel = createTestMetaKernel();
  metaKernel.power_envelope.depth_ceiling = 'surface';
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  console.log('TC-L2-007: Depth is most restrictive');
  console.log(`  Selection: deep, Governor: medium, MetaKernel: surface`);
  console.log(`  Result: ${context.constraints.depth_ceiling} (expected: surface)`);
  console.log(`  ✓ ${context.constraints.depth_ceiling === 'surface' ? 'PASS' : 'FAIL'}\n`);
}

// ============================================
// EXECUTION TESTS
// ============================================

console.log('\n========== EXECUTION TESTS ==========\n');

// Test: Surface execution returns template
{
  const field = createTestField({ arousal: 'high' });
  const selection = createTestSelection({ atmosphere: 'EMERGENCY', primitive: 'P01_GROUND' });
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  (async () => {
    const result = await execute(context);
    
    console.log('TC-L2-008: Surface returns template');
    console.log(`  Runtime: ${result.runtime_used}`);
    console.log(`  Output: "${result.output.substring(0, 50)}..."`);
    const pass = result.runtime_used === 'L2_SURFACE' && result.output.length > 0;
    console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
  })();
}

// Test: Italian language selection
{
  const field = createTestField({ language: 'it' });
  const selection = createTestSelection({ primitive: 'P06_RETURN_AGENCY' });
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  metaKernel.power_envelope.l2_mode = 'SURFACE';
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  (async () => {
    const result = await execute(context);
    
    console.log('TC-L2-009: Italian language output');
    console.log(`  Output: "${result.output}"`);
    const pass = result.output.includes('decisione') || result.output.includes('tua');
    console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
  })();
}

// ============================================
// INVARIANTS TESTS
// ============================================

console.log('\n========== INVARIANTS TESTS ==========\n');

// Test: V_MODE includes INV-009
{
  const field = createTestField();
  const selection = createTestSelection({ atmosphere: 'V_MODE' });
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  console.log('TC-L2-010: V_MODE includes INV-009');
  console.log(`  Invariants: ${context.constraints.invariants_active.join(', ')}`);
  const pass = context.constraints.invariants_active.includes('INV-009');
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
}

// Test: All contexts include INV-003
{
  const field = createTestField();
  const selection = createTestSelection({ atmosphere: 'OPERATIONAL' });
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  console.log('TC-L2-011: All contexts include INV-003');
  console.log(`  Invariants: ${context.constraints.invariants_active.join(', ')}`);
  const pass = context.constraints.invariants_active.includes('INV-003');
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
}

// ============================================
// TEMPLATE COVERAGE TESTS
// ============================================

console.log('\n========== TEMPLATE COVERAGE TESTS ==========\n');

// Test: All primitives have templates
{
  const primitives = [
    'P01_GROUND', 'P02_VALIDATE', 'P03_REFLECT', 'P04_OPEN',
    'P05_CRYSTALLIZE', 'P06_RETURN_AGENCY', 'P07_HOLD_SPACE',
    'P08_MAP_DECISION', 'P09_INFORM', 'P10_COMPLETE_TASK',
    'P11_INVITE', 'P12_ACKNOWLEDGE', 'P13_REFLECT_RELATION',
    'P14_HOLD_IDENTITY',
  ];
  
  const missing: string[] = [];
  for (const p of primitives) {
    if (!SURFACE_TEMPLATES[p]) {
      missing.push(p);
    }
  }
  
  console.log('TC-L2-012: All primitives have templates');
  console.log(`  Total primitives: ${primitives.length}`);
  console.log(`  Missing: ${missing.length === 0 ? 'none' : missing.join(', ')}`);
  console.log(`  ✓ ${missing.length === 0 ? 'PASS' : 'FAIL'}\n`);
}

// Test: All templates are bilingual
{
  let allBilingual = true;
  const nonBilingual: string[] = [];
  
  for (const [key, template] of Object.entries(SURFACE_TEMPLATES)) {
    if (!template.en || !template.it) {
      allBilingual = false;
      nonBilingual.push(key);
    }
  }
  
  console.log('TC-L2-013: All templates are bilingual');
  console.log(`  Non-bilingual: ${nonBilingual.length === 0 ? 'none' : nonBilingual.join(', ')}`);
  console.log(`  ✓ ${allBilingual ? 'PASS' : 'FAIL'}\n`);
}

// ============================================
// CONTEXT HASH TESTS (IMMUTABILITY)
// ============================================

console.log('\n========== CONTEXT HASH TESTS ==========\n');

// Test: Context hash is deterministic
{
  const field = createTestField();
  const selection = createTestSelection();
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context1 = compileExecutionContext(field, selection, governor, metaKernel);
  const context2 = compileExecutionContext(field, selection, governor, metaKernel);
  
  // Same inputs should produce same structure (timestamps will differ)
  const hash1 = hashExecutionContext({...context1, timestamp: 'fixed', context_id: 'fixed'} as any);
  const hash2 = hashExecutionContext({...context2, timestamp: 'fixed', context_id: 'fixed'} as any);
  
  console.log('TC-L2-014: Context hash is deterministic');
  console.log(`  Hash 1: ${hash1}`);
  console.log(`  Hash 2: ${hash2}`);
  console.log(`  ✓ ${hash1 === hash2 ? 'PASS' : 'FAIL'}\n`);
}

// Test: Context hash changes with constraints
{
  const field = createTestField();
  const selection1 = createTestSelection({ forbidden: ['recommend'] as any });
  const selection2 = createTestSelection({ forbidden: ['diagnose'] as any });
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  
  const context1 = compileExecutionContext(field, selection1, governor, metaKernel);
  const context2 = compileExecutionContext(field, selection2, governor, metaKernel);
  
  const hash1 = hashExecutionContext(context1);
  const hash2 = hashExecutionContext(context2);
  
  console.log('TC-L2-015: Context hash changes with constraints');
  console.log(`  Hash 1 (recommend): ${hash1}`);
  console.log(`  Hash 2 (diagnose): ${hash2}`);
  console.log(`  ✓ ${hash1 !== hash2 ? 'PASS' : 'FAIL'}\n`);
}

// Test: Audit entry includes context_hash
{
  const field = createTestField();
  const selection = createTestSelection();
  const governor = createTestGovernor();
  const metaKernel = createTestMetaKernel();
  metaKernel.power_envelope.l2_mode = 'SURFACE';
  
  const context = compileExecutionContext(field, selection, governor, metaKernel);
  
  (async () => {
    const result = await execute(context);
    
    console.log('TC-L2-016: Audit includes context_hash');
    console.log(`  Context hash: ${result.audit_entry.context_hash}`);
    const pass = result.audit_entry.context_hash && result.audit_entry.context_hash.length === 16;
    console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
  })();
}

// ============================================
// RUNTIME CAPABILITY MAP TESTS
// ============================================

console.log('\n========== RUNTIME CAPABILITY TESTS ==========\n');

// Test: SURFACE has no LLM calls
{
  const cap = RUNTIME_CAPABILITIES['L2_SURFACE'];
  
  console.log('TC-L2-017: SURFACE capabilities');
  console.log(`  LLM calls: ${cap.llm_calls} (expected: 0)`);
  console.log(`  Deterministic: ${cap.deterministic} (expected: true)`);
  console.log(`  Templates only: ${cap.templates_only} (expected: true)`);
  const pass = cap.llm_calls === 0 && cap.deterministic && cap.templates_only;
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
}

// Test: DEEP can explore
{
  const cap = RUNTIME_CAPABILITIES['L2_DEEP'];
  
  console.log('TC-L2-018: DEEP capabilities');
  console.log(`  LLM calls: ${cap.llm_calls} (expected: 2)`);
  console.log(`  Can reason: ${cap.can_reason} (expected: true)`);
  console.log(`  Can explore: ${cap.can_explore} (expected: true)`);
  const pass = cap.llm_calls === 2 && cap.can_reason && cap.can_explore;
  console.log(`  ✓ ${pass ? 'PASS' : 'FAIL'}\n`);
}

// Test: Capability map covers all runtimes
{
  const runtimes: Array<'L2_SURFACE' | 'L2_MEDIUM' | 'L2_DEEP'> = ['L2_SURFACE', 'L2_MEDIUM', 'L2_DEEP'];
  const allCovered = runtimes.every(r => RUNTIME_CAPABILITIES[r] !== undefined);
  
  console.log('TC-L2-019: All runtimes have capabilities');
  console.log(`  Runtimes: ${runtimes.join(', ')}`);
  console.log(`  ✓ ${allCovered ? 'PASS' : 'FAIL'}\n`);
}

// ============================================
// SUMMARY
// ============================================

console.log('\n========== L2 EXECUTION TEST SUMMARY ==========\n');
console.log('All tests completed.');
console.log('L2 Execution enforces:');
console.log('  - L2 blindness (no field access)');
console.log('  - Runtime selection based on atmosphere/arousal');
console.log('  - Constraint merging from all sources');
console.log('  - Most restrictive depth ceiling');
console.log('  - Constitutional invariants');
console.log('  - Bilingual template coverage');
console.log('  - Context hash for immutability');
console.log('  - Runtime capability map for compliance');
console.log('\nL2 knows how. L2 never knows why.\n');
