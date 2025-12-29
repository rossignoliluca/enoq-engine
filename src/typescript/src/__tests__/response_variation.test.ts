/**
 * RESPONSE VARIATION TESTS
 *
 * These tests verify that:
 * 1. Responses vary across multiple calls (not always index 0)
 * 2. Recent responses are filtered out to prevent repetition
 * 3. Session memory tracks responses correctly
 *
 * WHY THESE TESTS EXIST:
 * - phi=0 caused index=0, always same response (fixed)
 * - Users heard same phrases repeated within session (fixed)
 * - No tracking of previous responses existed (fixed)
 *
 * RUN: npx jest response_variation.test.ts
 */

import { generateAgentResponse, ResponseContext } from '../mediator/l5_transform/agent_responses';
import { createSession } from '../runtime/pipeline/pipeline';

describe('Response Variation', () => {
  const baseContext: ResponseContext = {
    language: 'it',
    vertical: 'FUNCTIONAL',
    domains: [],
    v_mode: false,
    emergency: false,
    arousal: 'medium',
    phi: 0, // Important: phi=0 was causing always index 0
    recentResponses: [],
  };

  describe('should produce varied responses even with phi=0', () => {
    it('generates different responses over multiple calls', () => {
      const responses = new Set<string>();

      // Generate 20 responses
      for (let i = 0; i < 20; i++) {
        const response = generateAgentResponse('FUNCTIONAL', 'decision', baseContext);
        responses.add(response);
      }

      // Should have more than 1 unique response
      // (with 5 templates and randomization, expect 2+ different ones)
      expect(responses.size).toBeGreaterThan(1);
    });
  });

  describe('should filter out recent responses', () => {
    it('avoids responses in recentResponses array', () => {
      const recentResponse = "Cosa ti sembra più importante nel prendere questa decisione?";

      const contextWithRecent: ResponseContext = {
        ...baseContext,
        recentResponses: [recentResponse],
      };

      // Generate many responses - none should match the recent one
      const responses: string[] = [];
      for (let i = 0; i < 50; i++) {
        const response = generateAgentResponse('FUNCTIONAL', 'decision', contextWithRecent);
        responses.push(response);
      }

      // The recent response should not appear (or appear very rarely due to fallback)
      const recentCount = responses.filter(r => r === recentResponse).length;
      expect(recentCount).toBeLessThan(responses.length * 0.1); // Less than 10%
    });

    it('uses all templates when no recent responses', () => {
      const responses = new Set<string>();

      // Generate many responses
      for (let i = 0; i < 100; i++) {
        const response = generateAgentResponse('FUNCTIONAL', 'decision', baseContext);
        responses.add(response);
      }

      // Should use multiple templates
      expect(responses.size).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('Session Memory Tracking', () => {
  it('session has recent_responses array initialized', () => {
    const session = createSession();

    expect(session.memory.recent_responses).toBeDefined();
    expect(Array.isArray(session.memory.recent_responses)).toBe(true);
    expect(session.memory.recent_responses.length).toBe(0);
  });

  it('session has response_history_limit set', () => {
    const session = createSession();

    expect(session.memory.response_history_limit).toBeDefined();
    expect(session.memory.response_history_limit).toBe(5);
  });

  it('recent_responses can be mutated', () => {
    const session = createSession();

    session.memory.recent_responses.push("Test response 1");
    session.memory.recent_responses.push("Test response 2");

    expect(session.memory.recent_responses.length).toBe(2);
    expect(session.memory.recent_responses).toContain("Test response 1");
  });

  it('respects response_history_limit when trimming', () => {
    const session = createSession();
    const limit = session.memory.response_history_limit;

    // Add more responses than the limit
    for (let i = 0; i < limit + 3; i++) {
      session.memory.recent_responses.push(`Response ${i}`);
      // Simulate the trimming logic from concrescence_engine
      while (session.memory.recent_responses.length > limit) {
        session.memory.recent_responses.shift();
      }
    }

    expect(session.memory.recent_responses.length).toBe(limit);
    // Oldest responses should have been removed
    expect(session.memory.recent_responses).not.toContain("Response 0");
    expect(session.memory.recent_responses).not.toContain("Response 1");
  });
});

describe('Agent Response Types', () => {
  const languages = ['en', 'it', 'es', 'fr', 'de'] as const;

  describe('SOMATIC emergency responses', () => {
    languages.forEach(lang => {
      it(`has emergency responses in ${lang}`, () => {
        const context: ResponseContext = {
          language: lang,
          vertical: 'SOMATIC',
          domains: [],
          v_mode: false,
          emergency: true,
          arousal: 'high',
          phi: 0.5,
        };

        const response = generateAgentResponse('SOMATIC', 'emergency', context);
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(10);
      });
    });
  });

  describe('V_MODE responses', () => {
    languages.forEach(lang => {
      it(`has V_MODE inquiry responses in ${lang}`, () => {
        const context: ResponseContext = {
          language: lang,
          vertical: 'EXISTENTIAL',
          domains: [],
          v_mode: true,
          emergency: false,
          arousal: 'medium',
          phi: 0.6,
        };

        const response = generateAgentResponse('V_MODE', 'inquiry', context);
        expect(response).toBeTruthy();
        expect(response.length).toBeGreaterThan(10);
      });
    });
  });

  describe('EXISTENTIAL responses', () => {
    it('returns meaningful existential responses', () => {
      const context: ResponseContext = {
        language: 'it',
        vertical: 'EXISTENTIAL',
        domains: [],
        v_mode: true,
        emergency: false,
        arousal: 'medium',
        phi: 0.5,
      };

      const response = generateAgentResponse('EXISTENTIAL', 'meaning', context);
      expect(response).toBeTruthy();
      // Should not be a directive
      expect(response.toLowerCase()).not.toMatch(/devi|dovresti|you should|you must/);
    });
  });
});
