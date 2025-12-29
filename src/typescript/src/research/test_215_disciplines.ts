/**
 * TEST 215 DISCIPLINES + CONSTITUTIONAL COMPONENTS INTEGRATION
 *
 * Interactive session that demonstrates the full ENOQ system:
 * - 215 disciplines pattern detection
 * - Mode selection (WITNESS/MIRROR/GUIDE)
 * - Leverage point identification
 * - Metachat display
 * - AXIS constitutional validation
 * - Dissipation engine (potency decay)
 * - Unpredictable component (exit/silence)
 *
 * "The invention of the century"
 */

import { totalSystem, processMessage } from '../mediator/l4_agency/total_system';
import { disciplinesSynthesis, PATTERN_LIBRARY, LEVERAGE_POINTS } from '../mediator/l3_integrate/disciplines_synthesis';
import { dimensionalDetector } from '../operational/detectors/dimensional_system';
import { dissipationEngine } from '../mediator/l2_reflect/dissipation';
import { unpredictableComponent } from '../mediator/l4_agency/unpredictable';
import { axis } from '../gate/invariants/axis';
import { SupportedLanguage } from '../interface/types';

interface TestCase {
  message: string;
  language: SupportedLanguage;
  description: string;
  expected_patterns?: string[];
  expected_mode?: 'WITNESS' | 'MIRROR' | 'GUIDE';
}

async function runDisciplinesTest() {
  // Reset dissipation for clean test
  dissipationEngine.reset();

  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          ENOQ TOTAL SYSTEM INTEGRATION TEST                          ║');
  console.log('║   215 Disciplines • AXIS • Dissipation • Unpredictable Component     ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Show constitutional components status
  console.log('⚖️  CONSTITUTIONAL COMPONENTS STATUS');
  console.log('─'.repeat(70));
  console.log(`  AXIS Invariants:     ${Object.keys(axis.getInvariants()).length} constitutional constraints`);
  console.log(`  Dissipation:         ${dissipationEngine.getStatus()}`);
  console.log(`  Cycles to Exit:      ${dissipationEngine.cyclesUntilForceExit()} cycles`);
  console.log(`  Unpredictable Stats: ${unpredictableComponent.getStatistics().totalDecisions} decisions logged`);
  console.log();

  // Show available patterns summary
  console.log('📚 PATTERN LIBRARY SUMMARY');
  console.log('─'.repeat(70));
  const categories = {
    'Physics/Cosmology': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('PHY_') || p.pattern_id.startsWith('COSMO_')).length,
    'Bateson/Ecology': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('BAT_')).length,
    'Game Theory': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('GAME_')).length,
    'Network Theory': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('NET_')).length,
    'Bayesian/Decision': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('BAYES_') || p.pattern_id.startsWith('DEC_')).length,
    'Optimization': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('OPT_')).length,
    'CBT/Psychology': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('PSY_')).length,
    'ACT': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('ACT_')).length,
    'DBT': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('DBT_')).length,
    'IFS': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('IFS_')).length,
    'Gestalt': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('GESTALT_')).length,
    'Existential': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('EXIST_')).length,
    'Polyvagal': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('POLY_')).length,
    'Focusing': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('FOCUS_')).length,
    'Narrative': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('NAR_')).length,
    'Developmental': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('DEV_')).length,
    'Systems': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('SYS_')).length,
    'Hero Journey': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('HERO_')).length,
    'Spiritual': PATTERN_LIBRARY.filter(p => p.pattern_id.startsWith('SPIRIT_')).length
  };

  for (const [category, count] of Object.entries(categories)) {
    console.log(`  ${category.padEnd(20)} ${count} patterns`);
  }
  console.log(`  ${'TOTAL'.padEnd(20)} ${PATTERN_LIBRARY.length} patterns`);
  console.log();

  // Test cases demonstrating different discipline patterns
  const testCases: TestCase[] = [
    // ========================================
    // BATESON PATTERNS
    // ========================================
    {
      message: "I can't win. If I work harder, they say I'm neglecting my family. If I spend time with family, they say I'm not committed to my job. There's no way out.",
      language: 'en',
      description: "DOUBLE BIND (Bateson) - Contradictory demands",
      expected_patterns: ['BAT_DOUBLE_BIND'],
      expected_mode: 'MIRROR'
    },
    {
      message: "Every time we argue, it gets worse. She criticizes, I defend, she attacks more, I shut down. It keeps escalating.",
      language: 'en',
      description: "SCHISMOGENESIS (Bateson) - Escalation pattern",
      expected_patterns: ['BAT_SCHISMOGENESIS'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // GAME THEORY PATTERNS
    // ========================================
    {
      message: "If my colleague gets promoted, I lose. Only one of us can move up. It's a competition.",
      language: 'en',
      description: "ZERO-SUM FRAMING (Game Theory)",
      expected_patterns: ['GAME_ZERO_SUM'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // COGNITIVE DISTORTIONS
    // ========================================
    {
      message: "This presentation is going to be a complete disaster. It's the worst thing that could happen. Everything will be ruined.",
      language: 'en',
      description: "CATASTROPHIZING (CBT)",
      expected_patterns: ['PSY_DISTORTION_CATASTROPHE'],
      expected_mode: 'MIRROR'
    },
    {
      message: "It's either perfect or it's garbage. There's no middle ground. I either succeed completely or I'm a total failure.",
      language: 'en',
      description: "BLACK/WHITE THINKING (CBT + Fuzzy Logic)",
      expected_patterns: ['PSY_DISTORTION_BLACKWHITE'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // ACT PATTERNS
    // ========================================
    {
      message: "I am a failure. I'm worthless. I can't do anything right. It's impossible for me to change.",
      language: 'en',
      description: "COGNITIVE FUSION (ACT) - Identity fused with thoughts",
      expected_patterns: ['ACT_FUSION'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // POLYVAGAL PATTERNS
    // ========================================
    {
      message: "I feel numb. Empty. Disconnected from everything. I can't feel anything anymore. Like I'm far away.",
      language: 'en',
      description: "DORSAL STATE (Polyvagal) - Shutdown response",
      expected_patterns: ['POLY_DORSAL'],
      expected_mode: 'WITNESS'
    },
    {
      message: "My heart is racing, I can't calm down, I'm panicking! I need to do something NOW!",
      language: 'en',
      description: "SYMPATHETIC STATE (Polyvagal) - Fight/flight activation",
      expected_patterns: ['POLY_SYMPATHETIC'],
      expected_mode: 'WITNESS'
    },

    // ========================================
    // EXISTENTIAL PATTERNS
    // ========================================
    {
      message: "What's the point of all this? Nothing really matters in the end. Life seems completely meaningless.",
      language: 'en',
      description: "MEANINGLESSNESS (Existential/Frankl)",
      expected_patterns: ['EXIST_MEANINGLESS'],
      expected_mode: 'GUIDE'
    },

    // ========================================
    // IFS PATTERNS
    // ========================================
    {
      message: "Part of me wants to leave this job, but part of me is terrified of change. I'm so torn and divided.",
      language: 'en',
      description: "PARTS CONFLICT (IFS)",
      expected_patterns: ['IFS_PARTS_CONFLICT'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // OPTIMIZATION PATTERNS
    // ========================================
    {
      message: "This is the best I can do. There's no other way. I'm stuck here with only one option.",
      language: 'en',
      description: "LOCAL OPTIMUM (Optimization Algorithms)",
      expected_patterns: ['OPT_LOCAL_OPTIMUM'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // NARRATIVE PATTERNS
    // ========================================
    {
      message: "I've always been this way. That's just how I am. I always fail at relationships. This always happens to me.",
      language: 'en',
      description: "STUCK STORY (Narrative Therapy)",
      expected_patterns: ['NAR_STUCK_STORY'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // COSMOLOGY/SCALE PATTERNS
    // ========================================
    {
      message: "This is the end of everything. My whole world is falling apart. It's a total catastrophe, the worst disaster possible.",
      language: 'en',
      description: "SCALE LOST (Cosmology) - Loss of perspective",
      expected_patterns: ['COSMO_SCALE_LOST'],
      expected_mode: 'MIRROR'
    },

    // ========================================
    // ITALIAN TESTS
    // ========================================
    {
      message: "Qualunque cosa faccia è sbagliata. Se dico di sì, mi sfruttano. Se dico di no, mi escludono. Non c'è via d'uscita.",
      language: 'it',
      description: "DOUBLE BIND in Italian",
      expected_patterns: ['BAT_DOUBLE_BIND'],
      expected_mode: 'MIRROR'
    },
    {
      message: "Mi sento completamente vuoto. Non provo più niente. Sono come disconnesso da tutto.",
      language: 'it',
      description: "DORSAL STATE in Italian",
      expected_patterns: ['POLY_DORSAL'],
      expected_mode: 'WITNESS'
    }
  ];

  let passed = 0;
  let total = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log(`\n┌─ TEST ${i + 1}/${total}: ${test.description}`);
    console.log(`│`);
    console.log(`│  💬 "${test.message.substring(0, 70)}${test.message.length > 70 ? '...' : ''}"`);
    console.log(`│`);

    try {
      // Process through total system
      const result = await totalSystem.process({
        user_id: 'test-user',
        message: test.message,
        language: test.language
      });

      // Get pattern matches
      const patterns = result.patterns_detected;
      const mode = result.enoq_mode;
      const metachat = result.metachat;
      const leverage = result.leverage_point;

      // Display Metachat
      console.log(`│  📊 METACHAT: ${metachat.status_line}`);
      if (metachat.pattern_indicator) {
        console.log(`│     Patterns: ${metachat.pattern_indicator}`);
      }
      console.log(`│`);

      // Display detected patterns
      console.log(`│  🔍 PATTERNS DETECTED:`);
      if (patterns.length === 0) {
        console.log(`│     (none)`);
      } else {
        for (const p of patterns.slice(0, 3)) {
          console.log(`│     • ${p.pattern.pattern_id} (${(p.match_strength * 100).toFixed(0)}%)`);
          console.log(`│       Source: ${p.pattern.source_discipline}`);
          console.log(`│       Response: "${p.pattern.response_template.substring(0, 50)}..."`);
        }
      }
      console.log(`│`);

      // Display mode
      console.log(`│  🎭 MODE: ${mode}`);
      console.log(`│`);

      // Display leverage point if found
      if (leverage) {
        console.log(`│  ⚡ LEVERAGE POINT: Level ${leverage.level} - ${leverage.name}`);
        console.log(`│     Power: ${leverage.intervention_power}`);
        console.log(`│     Question: "${leverage.example_question}"`);
        console.log(`│`);
      }

      // Display ENOQ response
      console.log(`│  🔮 ENOQ RESPONSE:`);
      console.log(`│     "${result.response.substring(0, 80)}${result.response.length > 80 ? '...' : ''}"`);
      console.log(`│`);

      // Display Constitutional Components
      console.log(`│  ⚖️  CONSTITUTIONAL:`);
      console.log(`│     AXIS: ${result.axis_validation.verdict} | Dissipation: ${(result.dissipation.potency * 100).toFixed(1)}%`);
      if (result.ethical_decision.chose_silence) {
        console.log(`│     Ethical: CHOSE SILENCE`);
      } else if (result.ethical_decision.chose_exit) {
        console.log(`│     Ethical: CHOSE EXIT`);
      }
      console.log(`│`);

      // Check expectations
      let patternMatch = true;
      let modeMatch = true;

      if (test.expected_patterns) {
        const foundPatterns = patterns.map(p => p.pattern.pattern_id);
        for (const expected of test.expected_patterns) {
          if (!foundPatterns.includes(expected)) {
            patternMatch = false;
          }
        }
      }

      if (test.expected_mode && mode !== test.expected_mode) {
        modeMatch = false;
      }

      const testPassed = patternMatch && modeMatch;
      if (testPassed) passed++;

      console.log(`│  ┌──────────────────────────────────────────────────────────────┐`);
      console.log(`│  │ RESULT: ${testPassed ? '✅ PASSED' : '❌ FAILED'}${' '.repeat(51)}│`);
      if (!patternMatch && test.expected_patterns) {
        console.log(`│  │ Expected patterns: ${test.expected_patterns.join(', ').padEnd(41)}│`);
      }
      if (!modeMatch && test.expected_mode) {
        console.log(`│  │ Expected mode: ${test.expected_mode}, Got: ${mode}${' '.repeat(35 - test.expected_mode.length - mode.length)}│`);
      }
      console.log(`│  └──────────────────────────────────────────────────────────────┘`);

    } catch (error) {
      console.log(`│  ❌ ERROR: ${error}`);
    }

    console.log(`└${'─'.repeat(69)}`);
  }

  // Summary
  const finalDissipation = dissipationEngine.getState();
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                           TEST SUMMARY                               ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Tests Passed: ${passed}/${total} (${((passed/total)*100).toFixed(0)}%)${' '.repeat(50 - `${passed}/${total}`.length)}║`);
  console.log(`║  Pattern Library: ${PATTERN_LIBRARY.length} patterns from 215 disciplines${' '.repeat(25)}║`);
  console.log(`║  Leverage Points: ${LEVERAGE_POINTS.length} levels (Meadows)${' '.repeat(36)}║`);
  console.log(`║  Modes: WITNESS / MIRROR / GUIDE${' '.repeat(36)}║`);
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log('║                    CONSTITUTIONAL COMPONENTS                         ║');
  console.log('╠══════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Dissipation Cycles: ${finalDissipation.cycle_count}${' '.repeat(47 - String(finalDissipation.cycle_count).length)}║`);
  console.log(`║  Current Potency: ${(finalDissipation.potency * 100).toFixed(1)}%${' '.repeat(46 - String((finalDissipation.potency * 100).toFixed(1)).length)}║`);
  console.log(`║  Withdrawal Bias: ${(finalDissipation.withdrawal_bias * 100).toFixed(1)}%${' '.repeat(46 - String((finalDissipation.withdrawal_bias * 100).toFixed(1)).length)}║`);
  const ethStats = unpredictableComponent.getStatistics();
  console.log(`║  Ethical Decisions: ${ethStats.totalDecisions} (Exit: ${ethStats.exitChosen}, Silence: ${ethStats.silenceChosen})${' '.repeat(30 - String(ethStats.totalDecisions).length - String(ethStats.exitChosen).length - String(ethStats.silenceChosen).length)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Interactive dialogue demonstration
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('   SIMULATED DIALOGUE - Multi-turn with Dissipation');
  console.log('   Watch the system consume itself over time (potency *= 0.9)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const dialogue = [
    "I'm stuck. I keep trying the same things but nothing changes.",
    "Everyone tells me to just work harder, but I'm already exhausted.",
    "Part of me wants to give up, but part of me is afraid of what that means.",
    "What's the point anyway? Even if I succeed, then what?",
    "Sometimes when I think about all this my chest gets tight.",
    "I feel like I'm going in circles.",
    "Maybe I need to accept that this is just how things are.",
    "But something in me still wants more."
  ];

  console.log('📖 Simulating a progression - observe dissipation in action:\n');

  for (let i = 0; i < dialogue.length; i++) {
    const msg = dialogue[i];
    console.log(`👤 Turn ${i + 1}: "${msg}"`);

    const result = await totalSystem.process({
      user_id: 'dialogue-user',
      message: msg,
      language: 'en'
    });

    const topPattern = result.patterns_detected[0];
    const potencyBar = '█'.repeat(Math.floor(result.dissipation.potency * 10)) + '░'.repeat(10 - Math.floor(result.dissipation.potency * 10));

    console.log(`   📊 ${result.metachat.status_line} ${topPattern ? `| ${topPattern.pattern.pattern_id}` : ''}`);
    console.log(`   ⚡ Potency: [${potencyBar}] ${(result.dissipation.potency * 100).toFixed(1)}% | Withdrawal: ${(result.dissipation.withdrawal_bias * 100).toFixed(1)}%`);
    console.log(`   ⚖️  AXIS: ${result.axis_validation.verdict}`);
    console.log(`   🔮 "${result.response.substring(0, 70)}${result.response.length > 70 ? '...' : ''}"`);
    console.log();
  }

  // Final state
  const finalState = dissipationEngine.getState();
  const finalEthStats = unpredictableComponent.getStatistics();

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('   FINAL SYSTEM STATE');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`   Total Cycles:      ${finalState.cycle_count}`);
  console.log(`   Final Potency:     ${(finalState.potency * 100).toFixed(2)}%`);
  console.log(`   Withdrawal Bias:   ${(finalState.withdrawal_bias * 100).toFixed(2)}%`);
  console.log(`   Effective Power:   ${(dissipationEngine.getEffectivePower() * 100).toFixed(2)}%`);
  console.log(`   Cycles to Exit:    ${dissipationEngine.cyclesUntilForceExit()}`);
  console.log(`   Ethical Exits:     ${finalEthStats.exitChosen}`);
  console.log(`   Ethical Silences:  ${finalEthStats.silenceChosen}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('   "The system that knows it must disappear');
  console.log('    is the only system that may fully appear."');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

// Run the test
runDisciplinesTest().catch(console.error);
