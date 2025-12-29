/**
 * Regulatory Store Integration Tests
 *
 * Verifies that the regulatory store is properly integrated with the pipeline:
 * - Session creation with user_id loads/creates regulatory state
 * - Regulatory constraints are applied to selection
 * - Regulatory state is updated after each turn
 * - State persists across sessions
 */

import {
  enoq,
  createSession,
  Session,
  PipelineConfig
} from '../runtime/pipeline/pipeline';
import {
  getRegulatoryStore,
  resetRegulatoryStore,
  RegulatoryState,
  createDefaultState
} from '../gate/withdrawal/regulatory_store';

// Test config - disable gate for faster tests
const TEST_CONFIG: PipelineConfig = {
  gate_enabled: false,
  use_ultimate_detector: true,
};

// ============================================
// SETUP / TEARDOWN
// ============================================

beforeEach(() => {
  // Get or create the store, then clear all data
  // This ensures we clear any persisted SQLite data from previous runs
  getRegulatoryStore().clear();
});

afterAll(() => {
  resetRegulatoryStore();
});

// ============================================
// SESSION CREATION TESTS
// ============================================

describe('Regulatory Store - Session Creation', () => {
  it('creates session without user_id (no regulatory state)', () => {
    const session = createSession();

    expect(session.user_id).toBeUndefined();
    expect(session.regulatory_state).toBeUndefined();
  });

  it('creates session with user_id (creates new regulatory state)', () => {
    const session = createSession('new_user_123');

    expect(session.user_id).toBe('new_user_123');
    expect(session.regulatory_state).toBeDefined();
    expect(session.regulatory_state?.subject_id).toBe('new_user_123');
    expect(session.regulatory_state?.potency).toBe(1.0);
    expect(session.regulatory_state?.withdrawal_bias).toBe(0.0);
    expect(session.regulatory_state?.delegation_trend).toBe(0.0);
  });

  it('loads existing regulatory state from store', () => {
    const store = getRegulatoryStore();

    // Pre-create a state
    const existingState = createDefaultState('existing_user');
    existingState.potency = 0.7;
    existingState.withdrawal_bias = 0.3;
    existingState.delegation_trend = 0.5;
    store.save(existingState);

    // Create session - should load existing state
    const session = createSession('existing_user');

    expect(session.regulatory_state).toBeDefined();
    expect(session.regulatory_state?.potency).toBe(0.7);
    expect(session.regulatory_state?.withdrawal_bias).toBe(0.3);
    expect(session.regulatory_state?.delegation_trend).toBe(0.5);
  });
});

// ============================================
// CONSTRAINT APPLICATION TESTS
// ============================================

describe('Regulatory Store - Constraint Application', () => {
  it('high withdrawal_bias reduces depth', async () => {
    const store = getRegulatoryStore();

    // Set up state with high withdrawal
    const state = createDefaultState('high_withdrawal_user');
    state.withdrawal_bias = 0.8;  // Very high
    store.save(state);

    const session = createSession('high_withdrawal_user');
    const result = await enoq('Tell me about philosophy', session, TEST_CONFIG);

    // Should have constraint applied
    expect(result.trace.s1_regulatory?.constraints_applied).toEqual(
      expect.arrayContaining([expect.stringContaining('High withdrawal')])
    );
  });

  it('low potency constrains intervention', async () => {
    const store = getRegulatoryStore();

    // Set up state with low potency
    const state = createDefaultState('low_potency_user');
    state.potency = 0.25;  // Very low
    store.save(state);

    const session = createSession('low_potency_user');
    const result = await enoq('Help me with something', session, TEST_CONFIG);

    // Should have constraint applied
    expect(result.trace.s1_regulatory?.constraints_applied).toEqual(
      expect.arrayContaining([expect.stringContaining('potency')])
    );
  });

  it('negative delegation_trend requires ownership return', async () => {
    const store = getRegulatoryStore();

    // Set up state with high delegation tendency
    const state = createDefaultState('delegating_user');
    state.delegation_trend = -0.7;  // Very delegating
    store.save(state);

    const session = createSession('delegating_user');
    const result = await enoq('What should I do?', session, TEST_CONFIG);

    // Should have constraint applied
    expect(result.trace.s1_regulatory?.constraints_applied).toEqual(
      expect.arrayContaining([expect.stringContaining('delegation')])
    );
  });

  it('no constraints for fresh user', async () => {
    const session = createSession('fresh_user');
    const result = await enoq('Hello', session, TEST_CONFIG);

    // Fresh user has no constraints
    expect(result.trace.s1_regulatory?.constraints_applied).toEqual([]);
  });
});

// ============================================
// STATE UPDATE TESTS
// ============================================

describe('Regulatory Store - State Updates', () => {
  it('potency decays after turn', async () => {
    const session = createSession('decay_test_user');
    const initialPotency = session.regulatory_state!.potency;

    await enoq('Hello', session, TEST_CONFIG);

    const store = getRegulatoryStore();
    const updatedState = store.get('decay_test_user');

    expect(updatedState!.potency).toBeLessThan(initialPotency);
  });

  it('delegation_trend decreases on delegation attempt', async () => {
    const session = createSession('delegation_trend_user');
    const initialTrend = session.regulatory_state!.delegation_trend;

    // Ask a delegation question
    await enoq('What should I do with my life?', session, TEST_CONFIG);

    const store = getRegulatoryStore();
    const updatedState = store.get('delegation_trend_user');

    // Trend should decrease (more negative = more delegation)
    expect(updatedState!.delegation_trend).toBeLessThanOrEqual(initialTrend);
  });

  it('timestamps are updated', async () => {
    const session = createSession('timestamp_user');
    const initialInteraction = session.regulatory_state!.last_interaction;

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 10));

    await enoq('Test', session, TEST_CONFIG);

    const store = getRegulatoryStore();
    const updatedState = store.get('timestamp_user');

    expect(updatedState!.last_interaction).toBeGreaterThan(initialInteraction);
  });
});

// ============================================
// CROSS-SESSION PERSISTENCE TESTS
// ============================================

describe('Regulatory Store - Cross-Session Persistence', () => {
  it('state persists across sessions', async () => {
    // Session 1
    const session1 = createSession('persistent_user');
    await enoq('First message', session1, TEST_CONFIG);

    const afterSession1 = getRegulatoryStore().get('persistent_user');
    const potencyAfter1 = afterSession1!.potency;

    // Session 2 - should load previous state
    const session2 = createSession('persistent_user');

    expect(session2.regulatory_state!.potency).toBe(potencyAfter1);
  });

  it('delegation_trend accumulates across sessions', async () => {
    // Session 1 - ask delegation question
    const session1 = createSession('accumulating_user');
    await enoq('Should I quit my job?', session1, TEST_CONFIG);

    const trend1 = getRegulatoryStore().get('accumulating_user')!.delegation_trend;

    // Session 2 - ask another delegation question
    const session2 = createSession('accumulating_user');
    await enoq('Should I move to another city?', session2, TEST_CONFIG);

    const trend2 = getRegulatoryStore().get('accumulating_user')!.delegation_trend;

    // Trend should have decreased further
    expect(trend2).toBeLessThanOrEqual(trend1);
  });
});

// ============================================
// TRACE TESTS
// ============================================

describe('Regulatory Store - Trace Info', () => {
  it('includes regulatory info in trace', async () => {
    const session = createSession('trace_test_user');
    const result = await enoq('Test', session, TEST_CONFIG);

    expect(result.trace.s1_regulatory).toBeDefined();
    expect(result.trace.s1_regulatory?.potency).toBeDefined();
    expect(result.trace.s1_regulatory?.withdrawal_bias).toBeDefined();
    expect(result.trace.s1_regulatory?.delegation_trend).toBeDefined();
    expect(result.trace.s1_regulatory?.constraints_applied).toBeDefined();
  });

  it('no regulatory info when no user_id', async () => {
    const session = createSession();  // No user_id
    const result = await enoq('Test', session, TEST_CONFIG);

    expect(result.trace.s1_regulatory).toBeUndefined();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Regulatory Store - Edge Cases', () => {
  it('handles multiple rapid turns', async () => {
    const session = createSession('rapid_user');

    // Multiple rapid turns
    await enoq('First', session, TEST_CONFIG);
    await enoq('Second', session, TEST_CONFIG);
    await enoq('Third', session, TEST_CONFIG);

    const state = getRegulatoryStore().get('rapid_user');

    // Potency should have decayed 3 times
    expect(state!.potency).toBeLessThan(0.95);
  });

  it('values stay within bounds', async () => {
    const store = getRegulatoryStore();

    // Set up extreme state
    const state = createDefaultState('bounds_user');
    state.potency = 0.05;  // Very low
    state.delegation_trend = -0.95;  // Very negative
    store.save(state);

    const session = createSession('bounds_user');
    await enoq('What should I do?', session, TEST_CONFIG);

    const updated = store.get('bounds_user');

    // Should stay within bounds
    expect(updated!.potency).toBeGreaterThanOrEqual(0.1);  // Min potency
    expect(updated!.delegation_trend).toBeGreaterThanOrEqual(-1);  // Min trend
  });
});
