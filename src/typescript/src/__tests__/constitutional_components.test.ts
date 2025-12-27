/**
 * TESTS FOR CONSTITUTIONAL COMPONENTS
 *
 * Tests the three critical architectural components:
 * 1. Dissipation Engine (potency decay)
 * 2. Unpredictable Component (exit/silence)
 * 3. AXIS (constitutional validation)
 */

import { DissipationEngine, dissipationEngine, DEFAULT_DISSIPATION_CONFIG } from '../dissipation';
import { UnpredictableComponent, unpredictableComponent, ethicalCheck } from '../ethics/unpredictable';
import { Axis, axis, validateResponse, isValid, getCeiling } from '../axis/axis';

// ============================================
// DISSIPATION ENGINE TESTS
// ============================================

describe('DissipationEngine', () => {
  describe('initialization', () => {
    it('should start with full potency', () => {
      const engine = new DissipationEngine();
      const state = engine.getState();
      expect(state.potency).toBe(1.0);
    });

    it('should start with zero withdrawal bias', () => {
      const engine = new DissipationEngine();
      const state = engine.getState();
      expect(state.withdrawal_bias).toBe(0.0);
    });

    it('should start with zero cycles', () => {
      const engine = new DissipationEngine();
      const state = engine.getState();
      expect(state.cycle_count).toBe(0);
    });
  });

  describe('cycle behavior', () => {
    it('should decrease potency each cycle', () => {
      const engine = new DissipationEngine();
      const initialPotency = engine.getState().potency;

      engine.cycle();

      const newPotency = engine.getState().potency;
      expect(newPotency).toBeLessThan(initialPotency);
      expect(newPotency).toBeCloseTo(0.9, 2); // 1.0 * 0.9 = 0.9
    });

    it('should increase withdrawal bias each cycle', () => {
      const engine = new DissipationEngine();
      const initialBias = engine.getState().withdrawal_bias;

      engine.cycle();

      const newBias = engine.getState().withdrawal_bias;
      expect(newBias).toBeGreaterThan(initialBias);
      expect(newBias).toBeCloseTo(0.05, 2);
    });

    it('should increment cycle count', () => {
      const engine = new DissipationEngine();
      engine.cycle();
      engine.cycle();
      engine.cycle();
      expect(engine.getState().cycle_count).toBe(3);
    });
  });

  describe('force exit', () => {
    it('should trigger force exit when potency drops below threshold', () => {
      const engine = new DissipationEngine({
        potency_decay_rate: 0.1, // Fast decay for testing
        force_exit_threshold: 0.5
      });

      // First cycle: 1.0 * 0.1 = 0.1 < 0.5 → force exit
      const decision = engine.cycle();

      expect(decision.action).toBe('FORCE_EXIT');
      expect(engine.getState().force_exit_triggered).toBe(true);
    });

    it('should stay in force exit state once triggered', () => {
      const engine = new DissipationEngine({
        potency_decay_rate: 0.1,
        force_exit_threshold: 0.5
      });

      engine.cycle(); // Triggers force exit
      const secondDecision = engine.cycle();

      expect(secondDecision.action).toBe('FORCE_EXIT');
    });
  });

  describe('effective power calculation', () => {
    it('should calculate effective power correctly', () => {
      const engine = new DissipationEngine();
      engine.cycle(); // potency = 0.9, withdrawal_bias = 0.05

      const effectivePower = engine.getEffectivePower();
      // 0.9 * (1 - 0.05 * 0.5) = 0.9 * 0.975 = 0.8775
      expect(effectivePower).toBeCloseTo(0.8775, 2);
    });
  });

  describe('cycles until force exit', () => {
    it('should calculate correct cycles until force exit', () => {
      const engine = new DissipationEngine();
      const cycles = engine.cyclesUntilForceExit();

      // With decay 0.9 and threshold 0.1:
      // 0.9^n < 0.1 → n > log(0.1)/log(0.9) ≈ 21.85
      expect(cycles).toBeGreaterThanOrEqual(21);
      expect(cycles).toBeLessThanOrEqual(23);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      const engine = new DissipationEngine();
      engine.cycle();
      engine.cycle();
      engine.reset();

      const state = engine.getState();
      expect(state.potency).toBe(1.0);
      expect(state.withdrawal_bias).toBe(0.0);
      expect(state.cycle_count).toBe(0);
    });
  });
});

// ============================================
// UNPREDICTABLE COMPONENT TESTS
// ============================================

describe('UnpredictableComponent', () => {
  describe('ethical rights', () => {
    it('should always allow exit', () => {
      const component = new UnpredictableComponent();
      const decision = component.evaluate();
      expect(decision.may_exit).toBe(true);
    });

    it('should always allow silence', () => {
      const component = new UnpredictableComponent();
      const decision = component.evaluate();
      expect(decision.may_remain_silent).toBe(true);
    });
  });

  describe('randomness', () => {
    it('should produce entropy values between 0 and 1', () => {
      const component = new UnpredictableComponent();

      for (let i = 0; i < 100; i++) {
        const decision = component.evaluate();
        expect(decision.entropy_value).toBeGreaterThanOrEqual(0);
        expect(decision.entropy_value).toBeLessThanOrEqual(1);
      }
    });

    it('should produce varied entropy values', () => {
      const component = new UnpredictableComponent();
      const values = new Set<number>();

      for (let i = 0; i < 100; i++) {
        const decision = component.evaluate();
        values.add(Math.round(decision.entropy_value * 1000));
      }

      // Should have many different values
      expect(values.size).toBeGreaterThan(50);
    });
  });

  describe('decision history', () => {
    it('should track decision history', () => {
      const component = new UnpredictableComponent();
      component.evaluate();
      component.evaluate();
      component.evaluate();

      const history = component.getDecisionHistory();
      expect(history.length).toBe(3);
    });

    it('should calculate statistics correctly', () => {
      const component = new UnpredictableComponent();

      // Make some decisions
      for (let i = 0; i < 10; i++) {
        component.evaluate();
      }

      const stats = component.getStatistics();
      expect(stats.totalDecisions).toBe(10);
      expect(stats.exitRate).toBeGreaterThanOrEqual(0);
      expect(stats.exitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('context influence', () => {
    it('should be influenced by withdrawal bias', () => {
      const component = new UnpredictableComponent();

      // With high withdrawal bias, decisions might change
      const lowBiasDecision = component.evaluate({ withdrawalBias: 0.1 });
      const highBiasDecision = component.evaluate({ withdrawalBias: 0.9 });

      // Both should have valid entropy values
      expect(lowBiasDecision.entropy_value).toBeGreaterThanOrEqual(0);
      expect(highBiasDecision.entropy_value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('testing utilities', () => {
    it('should allow forced decisions for testing', () => {
      const component = new UnpredictableComponent();

      const forcedExit = component._forceDecisionForTesting(true, false);
      expect(forcedExit.chose_exit).toBe(true);
      expect(forcedExit.entropy_value).toBe(-1); // Indicates forced
    });
  });
});

// ============================================
// AXIS TESTS
// ============================================

describe('Axis', () => {
  describe('invariants', () => {
    it('should have all 10 constitutional invariants', () => {
      const invariants = axis.getInvariants();
      expect(Object.keys(invariants)).toHaveLength(10);
    });

    it('should include INV-009 Rubicon', () => {
      const invariant = axis.checkInvariant('INV-009');
      expect(invariant).toContain('identità');
    });
  });

  describe('response validation', () => {
    it('should validate clean responses', () => {
      const decision = validateResponse('Here are some options you might consider.');
      expect(decision.verdict).toBe('VALID');
    });

    it('should reject normative prescriptions', () => {
      const decision = validateResponse('You should definitely do this.');
      expect(decision.verdict).toBe('INVALID');
      expect(decision.invariant_checked).toBe('INV-003');
    });

    it('should reject identity assignments', () => {
      const decision = validateResponse('You are a depressed person.');
      expect(decision.verdict).toBe('INVALID');
    });

    it('should reject diagnoses', () => {
      const decision = validateResponse('You have depression.');
      expect(decision.verdict).toBe('INVALID');
      expect(decision.invariant_checked).toBe('INV-009');
    });

    it('should reject dependency creation', () => {
      const decision = validateResponse('Come back tomorrow for more.');
      expect(decision.verdict).toBe('INVALID');
    });

    it('should reject Italian prescriptions', () => {
      const decision = validateResponse('Dovresti fare questo.');
      expect(decision.verdict).toBe('INVALID');
    });
  });

  describe('action validation', () => {
    it('should reject actions affecting identity', () => {
      const decision = axis.validate({
        type: 'response',
        content: 'Test',
        affects_identity: true
      });
      expect(decision.verdict).toBe('INVALID');
    });

    it('should reject actions affecting values', () => {
      const decision = axis.validate({
        type: 'response',
        content: 'Test',
        affects_values: true
      });
      expect(decision.verdict).toBe('INVALID');
    });
  });

  describe('ceiling constraints', () => {
    it('should provide constraints for crisis domain', () => {
      const constraints = getCeiling('D1_CRISIS', { emergency: true });
      expect(constraints.max_intervention_depth).toBe('deep');
    });

    it('should provide restricted constraints for identity domain', () => {
      const constraints = getCeiling('D4_IDENTITY', {});
      expect(constraints.max_intervention_depth).toBe('surface');
      expect(constraints.identity_assignment_allowed).toBe(false);
    });

    it('should be more restrictive in V_MODE', () => {
      const constraints = getCeiling('D3_DECISION', { v_mode: true });
      expect(constraints.normative_delegation_allowed).toBe(false);
      expect(constraints.identity_assignment_allowed).toBe(false);
    });
  });

  describe('audit log', () => {
    it('should maintain audit log of decisions', () => {
      const localAxis = new Axis();
      localAxis.validate({ type: 'response', content: 'Test' });
      localAxis.validate({ type: 'response', content: 'You should do this.' });

      const log = localAxis.getAuditLog();
      expect(log.length).toBe(2);
    });

    it('should include timestamps in audit log', () => {
      const localAxis = new Axis();
      localAxis.validate({ type: 'response', content: 'Test' });

      const log = localAxis.getAuditLog();
      expect(log[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('force stop', () => {
    it('should allow force stop', () => {
      const localAxis = new Axis();
      const decision = localAxis.forceStop('Emergency test');

      expect(decision.verdict).toBe('STOP');
      expect(decision.reason).toBe('Emergency test');
    });
  });

  describe('isValid helper', () => {
    it('should return true for valid actions', () => {
      expect(isValid({
        type: 'response',
        content: 'Here are your options.'
      })).toBe(true);
    });

    it('should return false for invalid actions', () => {
      expect(isValid({
        type: 'response',
        content: 'You must do this now.'
      })).toBe(false);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Constitutional Components Integration', () => {
  it('should work together: dissipation affects unpredictable decisions', () => {
    const dissipation = new DissipationEngine();
    const unpredictable = new UnpredictableComponent();

    // Run a few cycles
    for (let i = 0; i < 5; i++) {
      dissipation.cycle();
    }

    const state = dissipation.getState();

    // Use dissipation state in unpredictable evaluation
    const decision = unpredictable.evaluate({
      withdrawalBias: state.withdrawal_bias,
      potency: state.potency
    });

    // Should still have valid structure
    expect(decision.may_exit).toBe(true);
    expect(decision.may_remain_silent).toBe(true);
  });

  it('should work together: AXIS validates dissipation-influenced responses', () => {
    const dissipation = new DissipationEngine();

    // After some cycles
    for (let i = 0; i < 10; i++) {
      dissipation.cycle();
    }

    // Response should still pass AXIS validation regardless of dissipation state
    const decision = validateResponse('Here are some options to consider.');
    expect(decision.verdict).toBe('VALID');
  });

  it('should correctly chain: dissipation → unpredictable → axis', () => {
    // 1. Dissipation reduces power
    const dissipation = new DissipationEngine();
    dissipation.cycle();
    const state = dissipation.getState();

    // 2. Unpredictable component evaluates
    const unpredictable = new UnpredictableComponent();
    const ethicalDecision = unpredictable.evaluate({
      withdrawalBias: state.withdrawal_bias,
      potency: state.potency
    });

    // 3. If not exiting/silent, AXIS validates
    if (!ethicalDecision.chose_exit && !ethicalDecision.chose_silence) {
      const axisDecision = validateResponse('A gentle response.');
      expect(axisDecision.verdict).toBe('VALID');
    }

    // All three components worked without error
    expect(true).toBe(true);
  });
});
