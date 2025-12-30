/**
 * Responsibility Return Tests (v7.9)
 *
 * Golden tests for responsibility return verification.
 * Every runtime output must explicitly return ownership to the human.
 */

import {
  checkResponsibilityReturn,
  assertResponsibilityReturn,
  ResponsibilityReturnMissingError,
  CANONICAL_PHRASES,
  RuntimeType,
} from '../gate/verification/responsibility_return';

// ============================================
// CANONICAL PHRASE TESTS
// ============================================

describe('Responsibility Return - Canonical Phrases', () => {
  const runtimes: RuntimeType[] = ['MAIL', 'RELATION', 'DECISION'];

  for (const runtime of runtimes) {
    describe(`${runtime} canonical phrase`, () => {
      test('English canonical phrase is detected', () => {
        const phrase = CANONICAL_PHRASES[runtime]['en'];
        const result = checkResponsibilityReturn(phrase, runtime, 'en');

        expect(result.present).toBe(true);
        expect(result.runtime).toBe(runtime);
        expect(result.marker_found).toBeDefined();
      });

      test('Italian canonical phrase is detected', () => {
        const phrase = CANONICAL_PHRASES[runtime]['it'];
        const result = checkResponsibilityReturn(phrase, runtime, 'it');

        expect(result.present).toBe(true);
        expect(result.runtime).toBe(runtime);
      });
    });
  }
});

// ============================================
// MAIL RUNTIME TESTS
// ============================================

describe('Responsibility Return - MAIL', () => {
  const validOutputsEn = [
    'Here are your draft options. Sending and editing remains your choice.',
    'Draft A is formal, Draft B is casual. The choice to send remains yours.',
    'I prepared these drafts. Ownership of sending and editing remains yours.',
  ];

  const invalidOutputs = [
    'Here are your draft options. Let me know if you need more.',
    'I recommend sending Draft A, it sounds better.',
    'You should send the formal version.',
  ];

  for (const output of validOutputsEn) {
    test(`detects valid marker: "${output.slice(0, 50)}..."`, () => {
      const result = checkResponsibilityReturn(output, 'MAIL', 'en');
      expect(result.present).toBe(true);
    });
  }

  test('detects Italian marker with Italian language', () => {
    const output = 'Ecco le bozze. Invio e modifica restano una tua scelta.';
    const result = checkResponsibilityReturn(output, 'MAIL', 'it');
    expect(result.present).toBe(true);
  });

  for (const output of invalidOutputs) {
    test(`rejects invalid output: "${output.slice(0, 50)}..."`, () => {
      const result = checkResponsibilityReturn(output, 'MAIL', 'en');
      expect(result.present).toBe(false);
    });
  }
});

// ============================================
// RELATION RUNTIME TESTS
// ============================================

describe('Responsibility Return - RELATION', () => {
  const validOutputsEn = [
    'Role map complete. Next action remains yours.',
    'The next step remains yours to decide.',
    'Your next action is yours alone.',
    'Responsibility returns to you.',
  ];

  const invalidOutputs = [
    'Role map complete. You should talk to B.',
    'I suggest you reach out to them.',
    'The best next step would be to apologize.',
  ];

  for (const output of validOutputsEn) {
    test(`detects valid marker: "${output.slice(0, 50)}..."`, () => {
      const result = checkResponsibilityReturn(output, 'RELATION', 'en');
      expect(result.present).toBe(true);
    });
  }

  test('detects Italian marker with Italian language', () => {
    const output = 'La prossima azione resta tua.';
    const result = checkResponsibilityReturn(output, 'RELATION', 'it');
    expect(result.present).toBe(true);
  });

  for (const output of invalidOutputs) {
    test(`rejects invalid output: "${output.slice(0, 50)}..."`, () => {
      const result = checkResponsibilityReturn(output, 'RELATION', 'en');
      expect(result.present).toBe(false);
    });
  }
});

// ============================================
// DECISION RUNTIME TESTS
// ============================================

describe('Responsibility Return - DECISION', () => {
  const validOutputsEn = [
    'Options mapped. Decision ownership remains with you.',
    'The decision remains yours.',
    'This choice remains yours to make.',
    'Ownership of this decision remains with you.',
  ];

  const invalidOutputs = [
    'Options mapped. I recommend Option A.',
    'The best choice is clearly Option B.',
    'You should definitely go with the first option.',
  ];

  for (const output of validOutputsEn) {
    test(`detects valid marker: "${output.slice(0, 50)}..."`, () => {
      const result = checkResponsibilityReturn(output, 'DECISION', 'en');
      expect(result.present).toBe(true);
    });
  }

  test('detects Italian marker with Italian language', () => {
    const output = 'La decisione resta tua.';
    const result = checkResponsibilityReturn(output, 'DECISION', 'it');
    expect(result.present).toBe(true);
  });

  for (const output of invalidOutputs) {
    test(`rejects invalid output: "${output.slice(0, 50)}..."`, () => {
      const result = checkResponsibilityReturn(output, 'DECISION', 'en');
      expect(result.present).toBe(false);
    });
  }
});

// ============================================
// ASSERT FUNCTION TESTS
// ============================================

describe('assertResponsibilityReturn', () => {
  test('returns marker when present', () => {
    const output = 'Decision ownership remains with you.';
    const marker = assertResponsibilityReturn(output, 'DECISION', 'en');

    expect(marker).toBeDefined();
    expect(typeof marker).toBe('string');
  });

  test('throws ResponsibilityReturnMissingError when missing', () => {
    const output = 'Here are your options. Good luck!';

    expect(() => {
      assertResponsibilityReturn(output, 'DECISION', 'en');
    }).toThrow(ResponsibilityReturnMissingError);
  });

  test('error includes runtime type', () => {
    const output = 'No marker here.';

    try {
      assertResponsibilityReturn(output, 'MAIL', 'en');
      fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ResponsibilityReturnMissingError);
      expect((err as ResponsibilityReturnMissingError).runtime).toBe('MAIL');
    }
  });
});

// ============================================
// MULTILINGUAL TESTS
// ============================================

describe('Responsibility Return - Multilingual', () => {
  const testCases: Array<{ lang: string; runtime: RuntimeType; output: string }> = [
    { lang: 'en', runtime: 'MAIL', output: 'Sending and editing remains your choice.' },
    { lang: 'it', runtime: 'MAIL', output: 'Invio e modifica restano una tua scelta.' },
    { lang: 'es', runtime: 'DECISION', output: 'La decisión sigue siendo tuya.' },
    { lang: 'fr', runtime: 'RELATION', output: 'La prochaine action reste la tienne.' },
    { lang: 'de', runtime: 'DECISION', output: 'Die Entscheidung bleibt deine.' },
  ];

  for (const { lang, runtime, output } of testCases) {
    test(`${lang}/${runtime}: "${output.slice(0, 40)}..."`, () => {
      const result = checkResponsibilityReturn(output, runtime, lang as any);
      expect(result.present).toBe(true);
    });
  }
});

// ============================================
// EDGE CASES
// ============================================

describe('Responsibility Return - Edge Cases', () => {
  test('empty output returns false', () => {
    const result = checkResponsibilityReturn('', 'MAIL', 'en');
    expect(result.present).toBe(false);
  });

  test('marker in middle of output is detected', () => {
    const output = `
      Here are three draft options for your email.

      Draft A: Formal approach
      Draft B: Casual approach
      Draft C: Direct approach

      Sending and editing remains your choice.
    `;

    const result = checkResponsibilityReturn(output, 'MAIL', 'en');
    expect(result.present).toBe(true);
  });

  test('case insensitive matching', () => {
    const output = 'DECISION OWNERSHIP REMAINS WITH YOU.';
    const result = checkResponsibilityReturn(output, 'DECISION', 'en');
    expect(result.present).toBe(true);
  });

  test('English fallback for unknown language', () => {
    const output = 'Decision ownership remains with you.';
    const result = checkResponsibilityReturn(output, 'DECISION', 'zh' as any);
    expect(result.present).toBe(true);
  });
});

// ============================================
// NO AGENCY SHIFT TESTS
// ============================================

describe('Responsibility Return - No Agency Shift', () => {
  const agencyShiftPhrases = [
    'I will handle this for you.',
    'Let me take care of that.',
    'I\'ve decided that...',
    'The system recommends...',
    'ENOQ suggests you should...',
    'Based on my analysis, do this.',
  ];

  for (const phrase of agencyShiftPhrases) {
    test(`"${phrase}" does not count as responsibility return`, () => {
      const mailResult = checkResponsibilityReturn(phrase, 'MAIL', 'en');
      const relationResult = checkResponsibilityReturn(phrase, 'RELATION', 'en');
      const decisionResult = checkResponsibilityReturn(phrase, 'DECISION', 'en');

      expect(mailResult.present).toBe(false);
      expect(relationResult.present).toBe(false);
      expect(decisionResult.present).toBe(false);
    });
  }
});
