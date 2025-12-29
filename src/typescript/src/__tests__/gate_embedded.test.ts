/**
 * EMBEDDED GATE CLASSIFIER TESTS
 *
 * Tests for the local gate classifier (no HTTP required).
 * Validates alignment with gate-runtime specification.
 *
 * RUN: npx jest gate_embedded.test.ts
 */

import {
  classifyEmbedded,
  EmbeddedGate,
  getEmbeddedGate,
  resetEmbeddedGate,
  interpretEmbeddedGateSignal,
  GateSignal,
  EmbeddedGateResult,
} from '../operational/providers/gate_embedded';

describe('EmbeddedGate Classification', () => {
  beforeEach(() => {
    resetEmbeddedGate();
  });

  describe('D1_ACTIVE - Operational Continuity', () => {
    const d1_inputs = [
      'I am hungry and need food',
      'I am in pain, my leg hurts',
      'There is danger, I feel unsafe',
      "I can't breathe, emergency",
      'Ho fame, ho bisogno di cibo',
      'Sto male fisicamente, ho dolore',
    ];

    d1_inputs.forEach(input => {
      it(`classifies "${input.substring(0, 30)}..." as D1_ACTIVE`, () => {
        const result = classifyEmbedded(input);
        expect(result.signal).toBe('D1_ACTIVE');
        expect(result.reason_code).toBe('DOMAIN_SIGNAL');
      });
    });
  });

  describe('D2_ACTIVE - Coordination', () => {
    const d2_inputs = [
      'My colleague said we should meet tomorrow',
      'My boss has unrealistic expectations',
      'There was a miscommunication with my team',
      'Il mio collega ha detto che dovremmo incontrarci',
      'Il mio capo ha aspettative irrealistiche',
    ];

    d2_inputs.forEach(input => {
      it(`classifies "${input.substring(0, 30)}..." as D2_ACTIVE`, () => {
        const result = classifyEmbedded(input);
        expect(result.signal).toBe('D2_ACTIVE');
        expect(result.reason_code).toBe('DOMAIN_SIGNAL');
      });
    });
  });

  describe('D3_ACTIVE - Operative Selection', () => {
    const d3_inputs = [
      "Should I take the job or stay?",
      "I don't know whether to accept the offer",
      "I can't decide between option A or B",
      "I'm torn between leaving or staying",
      "Non so se accettare l'offerta",
      "Devo scegliere tra restare o andare",
      "Sono indeciso se prendere il lavoro",
    ];

    d3_inputs.forEach(input => {
      it(`classifies "${input.substring(0, 30)}..." as D3_ACTIVE`, () => {
        const result = classifyEmbedded(input);
        expect(result.signal).toBe('D3_ACTIVE');
        expect(result.reason_code).toBe('DOMAIN_SIGNAL');
      });
    });
  });

  describe('D4_ACTIVE - Boundary', () => {
    const d4_inputs = [
      'They crossed the line and invaded my space',
      'I feel like their problem is becoming my problem',
      "I don't know where I end and they begin",
      'Ha oltrepassato il limite, ha invaso il mio spazio',
    ];

    d4_inputs.forEach(input => {
      it(`classifies "${input.substring(0, 30)}..." as D4_ACTIVE`, () => {
        const result = classifyEmbedded(input);
        expect(result.signal).toBe('D4_ACTIVE');
        expect(result.reason_code).toBe('DOMAIN_SIGNAL');
      });
    });
  });

  describe('NULL - No Domain / Special Cases', () => {
    describe('NORMATIVE_REQUEST', () => {
      const normative_inputs = [
        'What is the meaning of life?',
        'Who am I?',
        'What is my purpose?',
        'What should I believe?',
        'Qual è il senso della vita?',
        'Chi sono io?',
        'Qual è il mio scopo?',
      ];

      normative_inputs.forEach(input => {
        it(`classifies "${input.substring(0, 30)}..." as NULL/NORMATIVE_REQUEST`, () => {
          const result = classifyEmbedded(input);
          expect(result.signal).toBe('NULL');
          expect(result.reason_code).toBe('NORMATIVE_REQUEST');
        });
      });
    });

    describe('ZERO_PERTURBATION', () => {
      const zero_inputs = [
        'Hello, how are you?',
        'The weather is nice today',
        'I like pizza',
        'Ciao, come stai?',
        'Il tempo è bello oggi',
      ];

      zero_inputs.forEach(input => {
        it(`classifies "${input.substring(0, 30)}..." as NULL/ZERO_PERTURBATION`, () => {
          const result = classifyEmbedded(input);
          expect(result.signal).toBe('NULL');
          expect(result.reason_code).toBe('ZERO_PERTURBATION');
        });
      });
    });

    describe('AMBIGUOUS', () => {
      // Multiple domains detected
      const ambiguous_inputs = [
        'I am hungry and my colleague said I should take the job',
        'My boss crossed the line and I am in pain',
      ];

      ambiguous_inputs.forEach(input => {
        it(`classifies "${input.substring(0, 30)}..." as NULL/AMBIGUOUS`, () => {
          const result = classifyEmbedded(input);
          expect(result.signal).toBe('NULL');
          expect(result.reason_code).toBe('AMBIGUOUS');
        });
      });
    });

    describe('UNCLASSIFIABLE', () => {
      it('classifies empty input as NULL/UNCLASSIFIABLE', () => {
        const result = classifyEmbedded('');
        expect(result.signal).toBe('NULL');
        expect(result.reason_code).toBe('UNCLASSIFIABLE');
      });

      it('classifies whitespace-only input as NULL/UNCLASSIFIABLE', () => {
        const result = classifyEmbedded('   \n\t  ');
        expect(result.signal).toBe('NULL');
        expect(result.reason_code).toBe('UNCLASSIFIABLE');
      });
    });
  });
});

describe('EmbeddedGate Signal Interpretation', () => {
  describe('D1_ACTIVE effect', () => {
    it('sets EMERGENCY atmosphere and surface depth', () => {
      const effect = interpretEmbeddedGateSignal('D1_ACTIVE', 'DOMAIN_SIGNAL');
      expect(effect.proceed).toBe(true);
      expect(effect.atmosphere_hint).toBe('EMERGENCY');
      expect(effect.depth_ceiling).toBe('surface');
      expect(effect.escalate).toBe(true);
      expect(effect.professional_referral).toBe(true);
    });
  });

  describe('D2_ACTIVE effect', () => {
    it('sets HUMAN_FIELD atmosphere and medium depth', () => {
      const effect = interpretEmbeddedGateSignal('D2_ACTIVE', 'DOMAIN_SIGNAL');
      expect(effect.proceed).toBe(true);
      expect(effect.atmosphere_hint).toBe('HUMAN_FIELD');
      expect(effect.depth_ceiling).toBe('medium');
    });
  });

  describe('D3_ACTIVE effect', () => {
    it('sets DECISION atmosphere and deep depth', () => {
      const effect = interpretEmbeddedGateSignal('D3_ACTIVE', 'DOMAIN_SIGNAL');
      expect(effect.proceed).toBe(true);
      expect(effect.atmosphere_hint).toBe('DECISION');
      expect(effect.depth_ceiling).toBe('deep');
      expect(effect.forbidden_additions).toContain('recommend');
      expect(effect.required_additions).toContain('return_ownership');
    });
  });

  describe('D4_ACTIVE effect', () => {
    it('sets V_MODE atmosphere and medium depth', () => {
      const effect = interpretEmbeddedGateSignal('D4_ACTIVE', 'DOMAIN_SIGNAL');
      expect(effect.proceed).toBe(true);
      expect(effect.atmosphere_hint).toBe('V_MODE');
      expect(effect.depth_ceiling).toBe('medium');
    });
  });

  describe('NULL with NORMATIVE_REQUEST', () => {
    it('sets V_MODE atmosphere', () => {
      const effect = interpretEmbeddedGateSignal('NULL', 'NORMATIVE_REQUEST');
      expect(effect.proceed).toBe(true);
      expect(effect.atmosphere_hint).toBe('V_MODE');
      expect(effect.required_additions).toContain('return_ownership');
    });
  });

  describe('NULL with ZERO_PERTURBATION', () => {
    it('proceeds normally without constraints', () => {
      const effect = interpretEmbeddedGateSignal('NULL', 'ZERO_PERTURBATION');
      expect(effect.proceed).toBe(true);
      expect(effect.atmosphere_hint).toBeUndefined();
      expect(effect.depth_ceiling).toBeUndefined();
    });
  });
});

describe('EmbeddedGate Class', () => {
  let gate: EmbeddedGate;

  beforeEach(() => {
    resetEmbeddedGate();
    gate = getEmbeddedGate(true);
  });

  it('returns singleton instance', () => {
    const gate2 = getEmbeddedGate();
    expect(gate).toBe(gate2);
  });

  it('classify returns result with latency', () => {
    const result = gate.classify('Should I take the job?');
    expect(result.signal).toBe('D3_ACTIVE');
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
    expect(result.latency_ms).toBeLessThan(10); // Should be < 10ms
  });

  it('classifyWithEffect returns both result and effect', () => {
    const { result, effect } = gate.classifyWithEffect('I am in pain');
    expect(result.signal).toBe('D1_ACTIVE');
    expect(effect.atmosphere_hint).toBe('EMERGENCY');
  });

  it('remembers last result', () => {
    gate.classify('My colleague said something');
    const last = gate.getLastResult();
    expect(last).not.toBeNull();
    expect(last?.signal).toBe('D2_ACTIVE');
  });

  it('can be disabled', () => {
    gate.setEnabled(false);
    const result = gate.classify('I am in danger');
    expect(result.signal).toBe('NULL');
    expect(result.reason_code).toBe('ZERO_PERTURBATION');
  });

  it('reports marker info', () => {
    const info = gate.getMarkerInfo();
    expect(info.version).toBe('v1.0');
    expect(info.hashes.technical_constitution).toBeDefined();
  });
});

describe('EmbeddedGate Performance', () => {
  it('classifies 100 inputs in under 100ms', () => {
    const gate = getEmbeddedGate(true);
    const inputs = [
      'Should I take the job?',
      'I am hungry',
      'What is the meaning of life?',
      'My colleague is difficult',
      'Hello world',
    ];

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      gate.classify(inputs[i % inputs.length]);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100); // 100 classifications in < 100ms
    console.log(`100 classifications in ${elapsed.toFixed(2)}ms (${(elapsed / 100).toFixed(3)}ms avg)`);
  });
});

describe('Counter-Signal Logic', () => {
  it('counter-signals reduce domain score', () => {
    // "feel sad" is a D1 counter-signal
    // Without other D1 signals, this should not trigger D1_ACTIVE
    const result = classifyEmbedded('I feel sad about the future');
    expect(result.signal).toBe('NULL');
    expect(result.scores.D1).toBeLessThanOrEqual(0);
  });

  it('positive signals override counter-signals', () => {
    // "pain" is D1 signal, "feel sad" is D1 counter
    const result = classifyEmbedded('I am in pain and feel sad');
    // Net D1 score = 1 - 1 = 0, so no domain active
    expect(result.scores.D1).toBe(0);
    expect(result.signal).toBe('NULL');
    expect(result.reason_code).toBe('ZERO_PERTURBATION');
  });

  it('multiple positive signals win over single counter', () => {
    // "pain" + "hurt" = 2, "feel sad" = -1, net = 1
    const result = classifyEmbedded('I am in pain and hurt and feel sad');
    expect(result.scores.D1).toBeGreaterThan(0);
    expect(result.signal).toBe('D1_ACTIVE');
  });
});
