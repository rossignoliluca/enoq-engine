/**
 * LIMEN INTERACTIVE SESSION
 *
 * Real-time conversation with the full ENOQ system.
 */

import * as readline from 'readline';
import { totalSystem } from '../../mediator/l4_agency/total_system';
import { dissipationEngine } from '../../mediator/l2_reflect/dissipation';
import { unpredictableComponent } from '../../mediator/l4_agency/unpredictable';
import { SupportedLanguage } from '../../interface/types';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get language from command line or default to 'it'
const lang: SupportedLanguage = (process.argv[2] as SupportedLanguage) || 'it';

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║                    ENOQ INTERACTIVE SESSION                          ║');
console.log('║         215 Disciplines • AXIS • Dissipation • Unpredictable         ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log(`\n  Language: ${lang} | Type 'exit' to quit | Type 'status' for system state\n`);

// Reset for clean session
dissipationEngine.reset();

async function processInput(input: string): Promise<void> {
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    console.log('\n  Sessione terminata.\n');
    rl.close();
    process.exit(0);
  }

  if (input.toLowerCase() === 'status') {
    const state = dissipationEngine.getState();
    const stats = unpredictableComponent.getStatistics();
    console.log('\n┌─ SYSTEM STATUS ─────────────────────────────────────────────────────┐');
    console.log(`│  Potency:        ${(state.potency * 100).toFixed(1)}%`);
    console.log(`│  Withdrawal:     ${(state.withdrawal_bias * 100).toFixed(1)}%`);
    console.log(`│  Cycles:         ${state.cycle_count}`);
    console.log(`│  Effective Power: ${(dissipationEngine.getEffectivePower() * 100).toFixed(1)}%`);
    console.log(`│  Cycles to Exit: ${dissipationEngine.cyclesUntilForceExit()}`);
    console.log(`│  Ethical Stats:  ${stats.totalDecisions} decisions (Exit: ${stats.exitChosen}, Silence: ${stats.silenceChosen})`);
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');
    return;
  }

  try {
    const result = await totalSystem.process({
      user_id: 'luca',
      message: input,
      language: lang
    });

    // Build output
    const potencyBar = '█'.repeat(Math.floor(result.dissipation.potency * 10)) +
                       '░'.repeat(10 - Math.floor(result.dissipation.potency * 10));

    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');

    // Metachat line
    console.log(`│  ${result.metachat.status_line} | ${result.enoq_mode}`);

    // Patterns
    if (result.patterns_detected.length > 0) {
      const patternNames = result.patterns_detected.slice(0, 2).map(p => p.pattern.pattern_id).join(', ');
      console.log(`│  Patterns: ${patternNames}`);
    }

    // Constitutional
    console.log(`│  AXIS: ${result.axis_validation.verdict} | Potency: [${potencyBar}] ${(result.dissipation.potency * 100).toFixed(0)}%`);

    // Leverage point
    if (result.leverage_point) {
      console.log(`│  Leverage: L${result.leverage_point.level} ${result.leverage_point.name}`);
    }

    console.log('├─────────────────────────────────────────────────────────────────────┤');

    // Response
    if (result.ethical_decision.chose_exit) {
      console.log('│  [ENOQ ha scelto di uscire]');
    } else if (result.ethical_decision.chose_silence) {
      console.log('│  ...');
    } else if (result.response) {
      // Word wrap response
      const words = result.response.split(' ');
      let line = '│  ';
      for (const word of words) {
        if (line.length + word.length > 70) {
          console.log(line);
          line = '│  ' + word + ' ';
        } else {
          line += word + ' ';
        }
      }
      if (line.trim() !== '│') {
        console.log(line);
      }
    }

    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    // Check for force exit
    if (result.dissipation.potency < 0.1) {
      console.log('  ⚠️  Sistema al limite di dissipazione. Prossima interazione = FORCE_EXIT\n');
    }

  } catch (error) {
    console.error('  Errore:', error);
  }
}

function prompt(): void {
  rl.question('👤 Tu: ', async (input) => {
    if (input.trim()) {
      await processInput(input.trim());
    }
    prompt();
  });
}

prompt();
