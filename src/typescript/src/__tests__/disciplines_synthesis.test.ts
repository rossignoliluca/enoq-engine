/**
 * DISCIPLINES SYNTHESIS TESTS
 *
 * Tests for the 215 disciplines pattern detection system.
 *
 * WHY THESE TESTS EXIST:
 * - Verify pattern detection across physics, psychology, philosophy, etc.
 * - Test mode selection (WITNESS/MIRROR/GUIDE)
 * - Ensure Metachat display generation works
 * - Validate leverage point detection
 *
 * RUN: npx jest disciplines_synthesis.test.ts
 */

import {
  disciplinesSynthesis,
  PATTERN_LIBRARY,
  LEVERAGE_POINTS,
  MODE_DESCRIPTIONS,
  EnoqMode,
  PatternMatch,
  getPatternsByCategory,
  getPatternResponse
} from '../mediator/l3_integrate/disciplines_synthesis';
import { DimensionalState } from '../operational/detectors/dimensional_system';
import { FieldState, SupportedLanguage } from '../interface/types';

// ============================================
// TEST HELPERS
// ============================================

function createMockDimensionalState(overrides: Partial<DimensionalState> = {}): DimensionalState {
  const baseHorizontal: Record<string, number> = {
    H01_SURVIVAL: 0,
    H02_SAFETY: 0,
    H03_BODY: 0,
    H04_EMOTION: 0.3,
    H05_COGNITION: 0.2,
    H06_MEANING: 0.1,
    H07_IDENTITY: 0.1,
    H08_TEMPORAL: 0,
    H09_ATTACHMENT: 0,
    H10_COORDINATION: 0,
    H11_BELONGING: 0,
    H12_HIERARCHY: 0,
    H13_CREATION: 0,
    H14_WORK: 0,
    H15_LEGAL: 0,
    H16_OPERATIONAL: 0,
    H17_FORM: 0
  };

  return {
    vertical: {
      SOMATIC: 0.1,
      FUNCTIONAL: 0.2,
      RELATIONAL: 0.3,
      EXISTENTIAL: 0.2,
      TRANSCENDENT: 0.1
    },
    horizontal: baseHorizontal as any,
    primary_vertical: 'RELATIONAL',
    primary_horizontal: [],
    v_mode_triggered: false,
    emergency_detected: false,
    cross_dimensional: false,
    integration: {
      phi: 0.5,
      complexity: 3,
      coherence: 0.6,
      tension: 0.3
    },
    ...overrides
  };
}

function createMockFieldState(overrides: Partial<FieldState> = {}): FieldState {
  return {
    domains: [],
    arousal: 'medium',
    valence: 'neutral',
    coherence: 'medium',
    goal: 'explore',
    loop_count: 0,
    flags: [],
    uncertainty: 0.5,
    language: 'en' as SupportedLanguage,
    ...overrides
  };
}

// ============================================
// PATTERN LIBRARY TESTS
// ============================================

describe('Pattern Library', () => {
  it('contains patterns from multiple disciplines', () => {
    expect(PATTERN_LIBRARY.length).toBeGreaterThan(40);

    const disciplines = new Set(PATTERN_LIBRARY.map(p => p.source_discipline));
    expect(disciplines.size).toBeGreaterThan(15);

    // Check for key discipline categories
    const hasPhysics = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('PHY_'));
    const hasBateson = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('BAT_'));
    const hasGame = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('GAME_'));
    const hasPsychology = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('PSY_'));
    const hasACT = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('ACT_'));
    const hasExistential = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('EXIST_'));
    const hasPolyvagal = PATTERN_LIBRARY.some(p => p.pattern_id.startsWith('POLY_'));

    expect(hasPhysics).toBe(true);
    expect(hasBateson).toBe(true);
    expect(hasGame).toBe(true);
    expect(hasPsychology).toBe(true);
    expect(hasACT).toBe(true);
    expect(hasExistential).toBe(true);
    expect(hasPolyvagal).toBe(true);
  });

  it('each pattern has required fields', () => {
    PATTERN_LIBRARY.forEach(pattern => {
      expect(pattern.pattern_id).toBeTruthy();
      expect(pattern.source_discipline).toBeTruthy();
      expect(pattern.signal_detected).toBeTruthy();
      expect(pattern.meaning).toBeTruthy();
      expect(pattern.response_template).toBeTruthy();
      expect(pattern.confidence).toBeGreaterThan(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================
// PATTERN DETECTION TESTS
// ============================================

describe('Pattern Detection', () => {
  describe('Bateson Patterns', () => {
    it('detects double bind pattern', () => {
      const message = "I can't win - if I do this they're upset, but if I don't do it they're also upset. There's no way out.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const doubleBind = patterns.find(p => p.pattern.pattern_id === 'BAT_DOUBLE_BIND');
      expect(doubleBind).toBeDefined();
      expect(doubleBind!.match_strength).toBeGreaterThan(0.5);
    });

    it('detects schismogenesis (escalation)', () => {
      const message = "Every time we talk, it gets worse. The arguments keep escalating.";
      const dimState = createMockDimensionalState({ integration: { phi: 0.5, complexity: 3, coherence: 0.4, tension: 0.7 } });
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const schism = patterns.find(p => p.pattern.pattern_id === 'BAT_SCHISMOGENESIS');
      expect(schism).toBeDefined();
    });
  });

  describe('Game Theory Patterns', () => {
    it('detects zero-sum framing', () => {
      const message = "If he wins the promotion, I lose. One of us has to go down.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const zeroSum = patterns.find(p => p.pattern.pattern_id === 'GAME_ZERO_SUM');
      expect(zeroSum).toBeDefined();
      expect(zeroSum!.match_strength).toBeGreaterThan(0.5);
    });
  });

  describe('Cognitive Distortion Patterns', () => {
    it('detects catastrophizing', () => {
      const message = "This is a disaster, it's the worst thing that could happen. Everything is ruined.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState({ arousal: 'high', valence: 'negative' });

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const catastrophe = patterns.find(p => p.pattern.pattern_id === 'PSY_DISTORTION_CATASTROPHE');
      expect(catastrophe).toBeDefined();
    });

    it('detects black/white thinking', () => {
      const message = "It's either perfect or it's completely worthless. There's no in between.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const binary = patterns.find(p => p.pattern.pattern_id === 'PSY_DISTORTION_BLACKWHITE');
      expect(binary).toBeDefined();
    });
  });

  describe('ACT Patterns', () => {
    it('detects cognitive fusion', () => {
      const message = "I am a failure. I'm worthless. It's impossible to change.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const fusion = patterns.find(p => p.pattern.pattern_id === 'ACT_FUSION');
      expect(fusion).toBeDefined();
      expect(fusion!.match_strength).toBeGreaterThan(0.7);
    });
  });

  describe('Polyvagal Patterns', () => {
    it('detects dorsal state', () => {
      const message = "I feel numb. Empty. Disconnected from everything. I can't feel anything.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState({ arousal: 'low', valence: 'negative' });

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const dorsal = patterns.find(p => p.pattern.pattern_id === 'POLY_DORSAL');
      expect(dorsal).toBeDefined();
    });

    it('detects sympathetic state', () => {
      const message = "My heart is racing, I can't calm down, I'm panicking!";
      const dimState = createMockDimensionalState({ emergency_detected: true });
      const fieldState = createMockFieldState({ arousal: 'high' });

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const sympathetic = patterns.find(p => p.pattern.pattern_id === 'POLY_SYMPATHETIC');
      expect(sympathetic).toBeDefined();
    });
  });

  describe('Existential Patterns', () => {
    it('detects meaninglessness', () => {
      const message = "What's the point of all this? Nothing matters anymore. Life seems meaningless.";
      const dimState = createMockDimensionalState({ v_mode_triggered: true });
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const meaningless = patterns.find(p => p.pattern.pattern_id === 'EXIST_MEANINGLESS');
      expect(meaningless).toBeDefined();
    });
  });

  describe('IFS Patterns', () => {
    it('detects parts conflict', () => {
      const message = "Part of me wants to leave, but part of me wants to stay. I'm so torn and divided.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const parts = patterns.find(p => p.pattern.pattern_id === 'IFS_PARTS_CONFLICT');
      expect(parts).toBeDefined();
      expect(parts!.match_strength).toBeGreaterThan(0.6);
    });
  });

  describe('Optimization Patterns', () => {
    it('detects local optimum trap', () => {
      const message = "This is the best I can do. There's no other way. I'm stuck here with only this option.";
      const dimState = createMockDimensionalState();
      const fieldState = createMockFieldState();

      const patterns = disciplinesSynthesis.detectPatterns(message, dimState, fieldState, 'en');

      const localOpt = patterns.find(p => p.pattern.pattern_id === 'OPT_LOCAL_OPTIMUM');
      expect(localOpt).toBeDefined();
    });
  });
});

// ============================================
// MODE DETERMINATION TESTS
// ============================================

describe('Mode Determination', () => {
  it('returns WITNESS for emergency', () => {
    const dimState = createMockDimensionalState({ emergency_detected: true });
    const fieldState = createMockFieldState({ flags: ['crisis'] });
    const patterns: PatternMatch[] = [];

    const mode = disciplinesSynthesis.determineMode(dimState, fieldState, patterns);
    expect(mode).toBe('WITNESS');
  });

  it('returns WITNESS for dorsal state', () => {
    const dimState = createMockDimensionalState();
    const fieldState = createMockFieldState({ arousal: 'low', valence: 'negative' });
    const patterns: PatternMatch[] = [{
      pattern: PATTERN_LIBRARY.find(p => p.pattern_id === 'POLY_DORSAL')!,
      match_strength: 0.8,
      evidence: ['Dorsal indicators']
    }];

    const mode = disciplinesSynthesis.determineMode(dimState, fieldState, patterns);
    expect(mode).toBe('WITNESS');
  });

  it('returns MIRROR when patterns detected', () => {
    const dimState = createMockDimensionalState();
    const fieldState = createMockFieldState({ arousal: 'medium' });
    const patterns: PatternMatch[] = [{
      pattern: PATTERN_LIBRARY.find(p => p.pattern_id === 'BAT_DOUBLE_BIND')!,
      match_strength: 0.8,
      evidence: ['Double bind detected']
    }];

    const mode = disciplinesSynthesis.determineMode(dimState, fieldState, patterns);
    expect(mode).toBe('MIRROR');
  });

  it('returns GUIDE for V_MODE with stable coherence', () => {
    const dimState = createMockDimensionalState({ v_mode_triggered: true });
    const fieldState = createMockFieldState({ coherence: 'high' });
    const patterns: PatternMatch[] = [];

    const mode = disciplinesSynthesis.determineMode(dimState, fieldState, patterns);
    expect(mode).toBe('GUIDE');
  });

  it('returns GUIDE for growth goal', () => {
    const dimState = createMockDimensionalState();
    const fieldState = createMockFieldState({ goal: 'explore' });
    const patterns: PatternMatch[] = [];

    const mode = disciplinesSynthesis.determineMode(dimState, fieldState, patterns);
    expect(mode).toBe('GUIDE');
  });
});

// ============================================
// METACHAT DISPLAY TESTS
// ============================================

describe('Metachat Display', () => {
  it('generates display with mode icon', () => {
    const dimState = createMockDimensionalState();
    const fieldState = createMockFieldState();
    const patterns: PatternMatch[] = [];
    const mode: EnoqMode = 'WITNESS';

    const metachat = disciplinesSynthesis.generateMetachat(dimState, fieldState, patterns, mode);

    expect(metachat.mode_icon).toBe('👁️');
    expect(metachat.status_line).toContain('👁️');
  });

  it('includes phi score in status', () => {
    const dimState = createMockDimensionalState({ integration: { phi: 0.75, complexity: 4, coherence: 0.6, tension: 0.3 } });
    const fieldState = createMockFieldState();
    const patterns: PatternMatch[] = [];
    const mode: EnoqMode = 'MIRROR';

    const metachat = disciplinesSynthesis.generateMetachat(dimState, fieldState, patterns, mode);

    expect(metachat.status_line).toContain('φ:0.75');
  });

  it('shows pattern indicator when patterns detected', () => {
    const dimState = createMockDimensionalState();
    const fieldState = createMockFieldState();
    const patterns: PatternMatch[] = [{
      pattern: PATTERN_LIBRARY.find(p => p.pattern_id === 'BAT_DOUBLE_BIND')!,
      match_strength: 0.8,
      evidence: ['Test']
    }];
    const mode: EnoqMode = 'MIRROR';

    const metachat = disciplinesSynthesis.generateMetachat(dimState, fieldState, patterns, mode);

    expect(metachat.pattern_indicator).toBeDefined();
    expect(metachat.pattern_indicator).toContain('BAT_DOUBLE');
  });

  it('shows arousal indicator', () => {
    const dimState = createMockDimensionalState();
    const fieldState = createMockFieldState({ arousal: 'high' });
    const patterns: PatternMatch[] = [];
    const mode: EnoqMode = 'WITNESS';

    const metachat = disciplinesSynthesis.generateMetachat(dimState, fieldState, patterns, mode);

    expect(metachat.arousal_indicator).toBe('🔴');
  });
});

// ============================================
// LEVERAGE POINT TESTS
// ============================================

describe('Leverage Points', () => {
  it('has 12 levels from Meadows', () => {
    expect(LEVERAGE_POINTS.length).toBe(12);

    const levels = LEVERAGE_POINTS.map(lp => lp.level);
    expect(levels).toContain(1);
    expect(levels).toContain(12);
  });

  it('identifies paradigm-level for fundamental beliefs', () => {
    const message = "Everything I believed is wrong. My whole understanding has collapsed.";
    const patterns: PatternMatch[] = [];

    const leverage = disciplinesSynthesis.identifyLeveragePoint(message, patterns);

    expect(leverage).toBeDefined();
    expect(leverage!.level).toBe(2); // Paradigms
  });

  it('identifies goal-level for purpose questions', () => {
    const message = "What's the point of this job? Why am I even doing this?";
    const patterns: PatternMatch[] = [];

    const leverage = disciplinesSynthesis.identifyLeveragePoint(message, patterns);

    expect(leverage).toBeDefined();
    expect(leverage!.level).toBe(3); // Goals
  });

  it('identifies rules-level for should statements', () => {
    const message = "I have to do this. I must finish. I should be better.";
    const patterns: PatternMatch[] = [];

    const leverage = disciplinesSynthesis.identifyLeveragePoint(message, patterns);

    expect(leverage).toBeDefined();
    expect(leverage!.level).toBe(5); // Rules
  });

  it('identifies feedback loop for cycles', () => {
    const message = "This keeps happening again and again. It's a vicious cycle.";
    const patterns: PatternMatch[] = [];

    const leverage = disciplinesSynthesis.identifyLeveragePoint(message, patterns);

    expect(leverage).toBeDefined();
    expect(leverage!.level).toBe(7); // Positive feedback loops
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  it('getPatternsByCategory returns physics patterns', () => {
    const patterns = getPatternsByCategory('physics');
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every(p => p.pattern_id.startsWith('PHY_') || p.pattern_id.startsWith('COSMO_'))).toBe(true);
  });

  it('getPatternsByCategory returns therapy patterns', () => {
    const patterns = getPatternsByCategory('therapy');
    expect(patterns.length).toBeGreaterThan(5);
  });

  it('getPatternsByCategory returns existential patterns', () => {
    const patterns = getPatternsByCategory('existential');
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every(p => p.pattern_id.startsWith('EXIST_'))).toBe(true);
  });

  it('getPatternResponse returns template for valid ID', () => {
    const response = getPatternResponse('BAT_DOUBLE_BIND');
    expect(response).toBeDefined();
    expect(response).toContain('contradiction');
  });

  it('getPatternResponse returns null for invalid ID', () => {
    const response = getPatternResponse('INVALID_PATTERN');
    expect(response).toBeNull();
  });
});

// ============================================
// MODE DESCRIPTIONS TESTS
// ============================================

describe('Mode Descriptions', () => {
  it('each mode has complete description', () => {
    const modes: EnoqMode[] = ['WITNESS', 'MIRROR', 'GUIDE'];

    modes.forEach(mode => {
      const desc = MODE_DESCRIPTIONS[mode];
      expect(desc.essence).toBeTruthy();
      expect(desc.based_on.length).toBeGreaterThan(0);
      expect(desc.what_it_does.length).toBeGreaterThan(0);
      expect(desc.when_active.length).toBeGreaterThan(0);
    });
  });

  it('WITNESS is based on Rogers', () => {
    const witness = MODE_DESCRIPTIONS.WITNESS;
    expect(witness.based_on.some(b => b.includes('Rogers'))).toBe(true);
  });

  it('GUIDE is based on Socratic method', () => {
    const guide = MODE_DESCRIPTIONS.GUIDE;
    expect(guide.based_on.some(b => b.includes('Socratic'))).toBe(true);
  });
});

// ============================================
// RESPONSE GENERATION TESTS
// ============================================

describe('Response Generation', () => {
  it('generates response for detected patterns', () => {
    const patterns: PatternMatch[] = [{
      pattern: PATTERN_LIBRARY.find(p => p.pattern_id === 'BAT_DOUBLE_BIND')!,
      match_strength: 0.8,
      evidence: ['Test']
    }];
    const mode: EnoqMode = 'MIRROR';

    const response = disciplinesSynthesis.generatePatternResponse(patterns, mode, 'en');

    expect(response).toBeDefined();
    expect(response).toContain('contradiction');
  });

  it('returns null when no patterns', () => {
    const patterns: PatternMatch[] = [];
    const mode: EnoqMode = 'WITNESS';

    const response = disciplinesSynthesis.generatePatternResponse(patterns, mode, 'en');

    expect(response).toBeNull();
  });

  it('softens response in WITNESS mode', () => {
    const patterns: PatternMatch[] = [{
      pattern: PATTERN_LIBRARY.find(p => p.pattern_id === 'GAME_ZERO_SUM')!,
      match_strength: 0.8,
      evidence: ['Test']
    }];
    const mode: EnoqMode = 'WITNESS';

    const response = disciplinesSynthesis.generatePatternResponse(patterns, mode, 'en');

    expect(response).toContain('I notice');
  });
});
