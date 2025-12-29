/**
 * LLM INTEGRATION TESTS
 *
 * These tests verify the LLM integration in l2_execution:
 * 1. Fallback to templates when LLM unavailable
 * 2. Correct atmosphere propagation to LLM
 * 3. DEEP mode 2-call reasoning
 * 4. Language support and fallback
 *
 * WHY THESE TESTS EXIST:
 * - Ensure L2 execution handles LLM failures gracefully
 * - Verify atmosphere is correctly passed to LLM (not guessed from invariants)
 * - Test DEEP mode's 2-call pattern
 *
 * NOTE: Tests with real LLM calls require OPENAI_API_KEY or ANTHROPIC_API_KEY
 *       and are skipped by default. Set LLM_TEST=true to run them.
 *
 * RUN: npx jest llm_integration.test.ts
 */

import {
  execute,
  compileExecutionContext,
  selectRuntime,
  ExecutionContext,
  RuntimeClass,
  RUNTIME_CAPABILITIES,
} from '../runtime/pipeline/l2_execution';
import { checkLLMAvailability } from '../operational/providers/llm_provider';
import { FieldState, ProtocolSelection, SupportedLanguage } from '../interface/types';
import { GovernorResult } from '../gate/enforcement/domain_governor';
import { MetaKernelResult } from '../mediator/l3_integrate/meta_kernel';

// ============================================
// MOCK DATA BUILDERS
// ============================================

function createMockFieldState(overrides: Partial<FieldState> = {}): FieldState {
  return {
    domains: [{ domain: 'H04_EMOTION', salience: 0.6, confidence: 0.8 }],
    arousal: 'medium',
    valence: 'negative',
    coherence: 'high',
    temporal: { past_salience: 0.3, future_salience: 0.5 },
    goal: 'process',
    loop_count: 0,
    flags: [],
    uncertainty: 0.3,
    language: 'it' as SupportedLanguage,
    ...overrides,
  };
}

function createMockSelection(overrides: Partial<ProtocolSelection> = {}): ProtocolSelection {
  return {
    atmosphere: 'HUMAN_FIELD',
    mode: 'REGULATE',
    primitive: 'P02_VALIDATE',
    depth: 'medium',
    length: 'moderate',
    pacing: 'normal',
    tone: { warmth: 4, directness: 3 },
    forbidden: [],
    required: [],
    confidence: 0.8,
    reasoning: 'Test selection',
    ...overrides,
  };
}

function createMockGovernor(): GovernorResult {
  return {
    rules_applied: [],
    effect: {
      atmosphere: null,
      mode: null,
      depth_ceiling: 'deep',
      pacing: 'normal',
      forbidden: [],
      required: [],
      primitive: null,
      escalate: false,
      l2_enabled: true,
    },
  };
}

function createMockMetaKernel(): MetaKernelResult {
  return {
    rules_applied: [],
    knob_changes: [],
    power_envelope: {
      depth_ceiling: 'medium',
      dimensions_allowed: ['somatic', 'emotional', 'relational'],
      pacing: 'normal',
      l2_mode: 'MEDIUM',
      time_remaining: 3600,
      turns_remaining: 100,
    },
    prompt_handshake: false,
    new_state: {
      telemetry_history: [],
      knobs: {
        max_depth_allowed: 'deep',
        dimensions_enabled: ['somatic', 'emotional', 'relational', 'existential', 'systemic'],
        continuation_policy: 'processual',
        field_narrowing: 0,
        deep_mode_handshake: false,
        max_turns_remaining: 100,
        power_level: 0.6,
      },
      session_start: new Date(),
      turns_elapsed: 0,
      deep_mode_active: false,
      handshake_pending: false,
      recovery_mode: false,
      recovery_turns_remaining: 0,
      coherence: 'high',
      previous_depth: 'surface',
    },
  };
}

// ============================================
// RUNTIME SELECTION TESTS
// ============================================

describe('Runtime Selection', () => {
  it('EMERGENCY atmosphere → L2_SURFACE', () => {
    const runtime = selectRuntime('EMERGENCY', 'medium', 'DEEP');
    expect(runtime).toBe('L2_SURFACE');
  });

  it('High arousal → L2_SURFACE', () => {
    const runtime = selectRuntime('HUMAN_FIELD', 'high', 'DEEP');
    expect(runtime).toBe('L2_SURFACE');
  });

  it('V_MODE with medium arousal → uses l2Mode', () => {
    const runtime = selectRuntime('V_MODE', 'medium', 'MEDIUM');
    expect(runtime).toBe('L2_MEDIUM');
  });

  it('OPERATIONAL with low arousal + DEEP mode → L2_DEEP', () => {
    const runtime = selectRuntime('OPERATIONAL', 'low', 'DEEP');
    expect(runtime).toBe('L2_DEEP');
  });
});

// ============================================
// CONTEXT COMPILATION TESTS
// ============================================

describe('ExecutionContext Compilation', () => {
  it('passes atmosphere from selection to constraints', () => {
    const field = createMockFieldState();
    const selection = createMockSelection({ atmosphere: 'V_MODE' });
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();

    const context = compileExecutionContext(field, selection, governor, metaKernel);

    expect(context.constraints.atmosphere).toBe('V_MODE');
  });

  it('merges forbidden from selection and governor', () => {
    const field = createMockFieldState();
    const selection = createMockSelection({
      forbidden: ['recommend'] as any
    });
    const governor = createMockGovernor();
    governor.effect.forbidden = ['advise'] as any;
    const metaKernel = createMockMetaKernel();

    const context = compileExecutionContext(field, selection, governor, metaKernel);

    expect(context.constraints.forbidden).toContain('recommend');
    expect(context.constraints.forbidden).toContain('advise');
  });

  it('uses most restrictive depth ceiling', () => {
    const field = createMockFieldState();
    const selection = createMockSelection({ depth: 'deep' });
    const governor = createMockGovernor();
    governor.effect.depth_ceiling = 'medium';
    const metaKernel = createMockMetaKernel();
    metaKernel.power_envelope.depth_ceiling = 'surface';

    const context = compileExecutionContext(field, selection, governor, metaKernel);

    expect(context.constraints.depth_ceiling).toBe('surface');
  });

  it('sets INV-009 for V_MODE atmosphere', () => {
    const field = createMockFieldState();
    const selection = createMockSelection({ atmosphere: 'V_MODE' });
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();

    const context = compileExecutionContext(field, selection, governor, metaKernel);

    expect(context.constraints.invariants_active).toContain('INV-009');
  });
});

// ============================================
// RUNTIME CAPABILITIES
// ============================================

describe('Runtime Capabilities', () => {
  it('L2_SURFACE: 0 LLM calls, deterministic', () => {
    const cap = RUNTIME_CAPABILITIES['L2_SURFACE'];
    expect(cap.llm_calls).toBe(0);
    expect(cap.deterministic).toBe(true);
    expect(cap.templates_only).toBe(true);
  });

  it('L2_MEDIUM: 1 LLM call, can generate', () => {
    const cap = RUNTIME_CAPABILITIES['L2_MEDIUM'];
    expect(cap.llm_calls).toBe(1);
    expect(cap.can_generate).toBe(true);
    expect(cap.can_reason).toBe(false);
  });

  it('L2_DEEP: 2 LLM calls, can reason', () => {
    const cap = RUNTIME_CAPABILITIES['L2_DEEP'];
    expect(cap.llm_calls).toBe(2);
    expect(cap.can_generate).toBe(true);
    expect(cap.can_reason).toBe(true);
  });
});

// ============================================
// EXECUTION TESTS (Without LLM)
// ============================================

describe('L2 Execution without LLM', () => {
  it('L2_SURFACE returns template', async () => {
    const field = createMockFieldState({ language: 'it' });
    const selection = createMockSelection({
      atmosphere: 'EMERGENCY',
      primitive: 'P01_GROUND'
    });
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();

    const context = compileExecutionContext(field, selection, governor, metaKernel);
    const result = await execute(context);

    expect(result.success).toBe(true);
    expect(result.runtime_used).toBe('L2_SURFACE');
    expect(result.output).toContain('Sono qui con te');
  });

  it('falls back to template when LLM unavailable', async () => {
    const llmStatus = checkLLMAvailability();

    // Only test fallback if LLM is not available
    if (!llmStatus.available) {
      const field = createMockFieldState({ language: 'en' });
      const selection = createMockSelection({
        atmosphere: 'HUMAN_FIELD',
        primitive: 'P02_VALIDATE',
        depth: 'medium'
      });
      const governor = createMockGovernor();
      const metaKernel = createMockMetaKernel();
      metaKernel.power_envelope.l2_mode = 'MEDIUM';

      const context = compileExecutionContext(field, selection, governor, metaKernel);
      const result = await execute(context);

      expect(result.success).toBe(true);
      // Should fall back to template
      expect(result.output).toBeTruthy();
    }
  });

  it('handles unsupported language with template fallback', async () => {
    const field = createMockFieldState({ language: 'sw' }); // Swahili
    const selection = createMockSelection({
      atmosphere: 'HUMAN_FIELD',
      primitive: 'P07_HOLD_SPACE',
      depth: 'medium'
    });
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();
    metaKernel.power_envelope.l2_mode = 'MEDIUM';

    const context = compileExecutionContext(field, selection, governor, metaKernel);
    const result = await execute(context);

    expect(result.success).toBe(true);
    // Should have Swahili template
    expect(result.output).toBe('Niko hapa.');
  });
});

// ============================================
// LLM INTEGRATION TESTS (Require API Key)
// ============================================

const runLLMTests = process.env.LLM_TEST === 'true';
const describeLLM = runLLMTests ? describe : describe.skip;

describeLLM('L2 Execution with LLM', () => {
  beforeAll(() => {
    const status = checkLLMAvailability();
    if (!status.available) {
      console.log('Skipping LLM tests: No API key available');
    }
  });

  it('L2_MEDIUM generates response via LLM', async () => {
    const field = createMockFieldState({ language: 'en' });
    const selection = createMockSelection({
      atmosphere: 'HUMAN_FIELD',
      primitive: 'P02_VALIDATE',
      depth: 'medium'
    });
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();
    metaKernel.power_envelope.l2_mode = 'MEDIUM';

    const context = compileExecutionContext(field, selection, governor, metaKernel);
    const result = await execute(context);

    expect(result.success).toBe(true);
    expect(result.runtime_used).toBe('L2_MEDIUM');
    expect(result.output.length).toBeGreaterThan(10);
  }, 10000);

  it('L2_DEEP uses 2-call reasoning', async () => {
    const field = createMockFieldState({ language: 'en' });
    const selection = createMockSelection({
      atmosphere: 'V_MODE',
      primitive: 'P06_RETURN_AGENCY',
      depth: 'deep'
    });
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();
    metaKernel.power_envelope.l2_mode = 'DEEP';
    metaKernel.power_envelope.depth_ceiling = 'deep';

    const context = compileExecutionContext(field, selection, governor, metaKernel);
    const result = await execute(context);

    expect(result.success).toBe(true);
    expect(result.runtime_used).toBe('L2_DEEP');
    expect(result.output.length).toBeGreaterThan(20);
  }, 15000);
});

// ============================================
// L2 BLINDNESS VERIFICATION
// ============================================

describe('L2 Blindness', () => {
  it('ExecutionContext does not contain field state keys', () => {
    const field = createMockFieldState();
    const selection = createMockSelection();
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();

    const context = compileExecutionContext(field, selection, governor, metaKernel);
    const contextKeys = Object.keys(context);

    // These keys should NOT be present (L2 blindness)
    expect(contextKeys).not.toContain('field');
    expect(contextKeys).not.toContain('domains');
    expect(contextKeys).not.toContain('arousal');
    expect(contextKeys).not.toContain('valence');
    expect(contextKeys).not.toContain('coherence');
    expect(contextKeys).not.toContain('flags');
  });

  it('constraints do not leak field information', () => {
    const field = createMockFieldState({
      arousal: 'high',
      valence: 'negative',
      domains: [{ domain: 'H01_SURVIVAL', salience: 0.9, confidence: 0.9 }],
    });
    const selection = createMockSelection();
    const governor = createMockGovernor();
    const metaKernel = createMockMetaKernel();

    const context = compileExecutionContext(field, selection, governor, metaKernel);
    const constraintStr = JSON.stringify(context.constraints);

    // Field-specific info should not appear
    expect(constraintStr).not.toContain('H01_SURVIVAL');
    expect(constraintStr).not.toContain('high');
    expect(constraintStr).not.toContain('negative');
  });
});
