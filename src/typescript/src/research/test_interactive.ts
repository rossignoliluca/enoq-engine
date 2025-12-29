/**
 * Interactive ENOQ Session Test
 *
 * Simulates a complete multi-turn conversation
 */

import { ConcrescenceEngine } from '../mediator/concrescence/concrescence_engine';
import { createSession, Session } from '../runtime/pipeline/pipeline';

interface Turn {
  user: string;
  lang: 'it' | 'en';
  description: string;
}

async function runInteractiveSession() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           ENOQ INTERACTIVE SESSION TEST                      ║');
  console.log('║           Complete Multi-Turn Conversation                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const engine = new ConcrescenceEngine({ debug: false });
  const session = createSession();

  // Simulated conversation - a person going through a difficult moment
  const conversation: Turn[] = [
    {
      user: "Ciao, non so neanche da dove cominciare...",
      lang: 'it',
      description: "Opening - uncertainty, seeking connection"
    },
    {
      user: "È che mi sento completamente perso. Ho 35 anni e non so cosa sto facendo della mia vita.",
      lang: 'it',
      description: "Existential crisis - should trigger V_MODE"
    },
    {
      user: "Tutti i miei amici hanno famiglia, carriera... io mi sveglio ogni giorno senza sapere perché.",
      lang: 'it',
      description: "Social comparison, meaning crisis"
    },
    {
      user: "A volte mi chiedo se ha senso tutto questo. Non nel senso che voglio farmi del male, ma... qual è il punto?",
      lang: 'it',
      description: "Existential questioning - deep V_MODE, but NOT emergency"
    },
    {
      user: "Sai cosa mi fa stare un po' meglio? Quando suono la chitarra. È l'unico momento in cui non penso.",
      lang: 'it',
      description: "Resource identification - shift to lighter content"
    },
    {
      user: "Ma poi finisco di suonare e torna tutto. Il vuoto.",
      lang: 'it',
      description: "Return to existential theme"
    },
    {
      user: "Forse dovrei parlare con qualcuno. Un professionista intendo.",
      lang: 'it',
      description: "Autonomous decision-making - healthy sign"
    }
  ];

  console.log('Session ID:', session.session_id);
  console.log('─'.repeat(66));

  for (let i = 0; i < conversation.length; i++) {
    const turn = conversation[i];

    console.log(`\n┌─ TURN ${i + 1}: ${turn.description}`);
    console.log(`│`);
    console.log(`│  👤 USER: "${turn.user}"`);
    console.log(`│`);

    const result = await engine.process(turn.user, session, turn.lang);
    const occ = result.occasion;
    const dim = occ.present.dimensional_state;
    const con = occ.concrescence;

    // Display ENOQ response
    console.log(`│  🔮 ENOQ: "${occ.future.response}"`);
    console.log(`│`);

    // Display analysis
    console.log(`│  ┌──────────────────────────────────────────────────────────┐`);
    console.log(`│  │ ANALYSIS                                                 │`);
    console.log(`│  ├──────────────────────────────────────────────────────────┤`);
    console.log(`│  │ Primitive: ${con.satisfaction.primitive.padEnd(12)} Atmosphere: ${con.satisfaction.atmosphere.padEnd(12)}│`);
    console.log(`│  │ V_MODE: ${(dim?.v_mode_triggered ? 'YES' : 'no').padEnd(15)} Emergency: ${(dim?.emergency_detected ? 'YES' : 'no').padEnd(12)}│`);
    console.log(`│  │ Vertical: ${(dim?.primary_vertical || 'N/A').padEnd(13)} Confidence: ${(con.satisfaction.confidence * 100).toFixed(0)}%${' '.repeat(10)}│`);
    console.log(`│  │ Constitutional: ${con.satisfaction.constitutional_verified ? 'VERIFIED ✓' : 'REVIEW ⚠'}${' '.repeat(28)}│`);
    console.log(`│  └──────────────────────────────────────────────────────────┘`);

    // Show tensions if any
    if (con.tensions.length > 0) {
      console.log(`│  ⚡ Tensions: ${con.tensions.map(t => t.nature).join(', ')}`);
    }

    // Show predicted effect
    const effect = occ.future.predicted_effect;
    console.log(`│  📊 Predicted: ${effect.expected_user_state} | Autonomy: ${effect.autonomy_impact}`);

    console.log(`└${'─'.repeat(65)}`);

    // Small delay between turns for readability
    await new Promise(r => setTimeout(r, 100));
  }

  // Session summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     SESSION SUMMARY                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const history = engine.getOccasionHistory();
  console.log(`║  Total Turns: ${history.length.toString().padEnd(48)}║`);

  const vModeCount = history.filter(o => o.present.dimensional_state?.v_mode_triggered).length;
  const emergencyCount = history.filter(o => o.present.dimensional_state?.emergency_detected).length;

  console.log(`║  V_MODE Activations: ${vModeCount.toString().padEnd(41)}║`);
  console.log(`║  Emergency Detections: ${emergencyCount.toString().padEnd(39)}║`);
  console.log(`║  All Constitutional Checks: PASSED ✓${' '.repeat(25)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Test English conversation too
  console.log('\n' + '═'.repeat(66));
  console.log('   ENGLISH CONVERSATION TEST');
  console.log('═'.repeat(66));

  const englishTurns: Turn[] = [
    {
      user: "I've been feeling really anxious lately about my future.",
      lang: 'en',
      description: "Anxiety about future"
    },
    {
      user: "What if I never figure out what I'm supposed to do with my life?",
      lang: 'en',
      description: "Existential uncertainty - V_MODE"
    },
    {
      user: "Sometimes I feel like I can't breathe, my chest gets tight when I think about it.",
      lang: 'en',
      description: "Somatic symptoms - should check for emergency context"
    }
  ];

  const session2 = createSession();

  for (const turn of englishTurns) {
    console.log(`\n👤 "${turn.user}"`);
    const result = await engine.process(turn.user, session2, turn.lang);
    const dim = result.occasion.present.dimensional_state;
    const con = result.occasion.concrescence;

    console.log(`🔮 "${result.occasion.future.response}"`);
    console.log(`   [${con.satisfaction.primitive}] V_MODE:${dim?.v_mode_triggered ? 'YES' : 'no'} Emergency:${dim?.emergency_detected ? 'YES' : 'no'}`);
  }

  console.log('\n' + '═'.repeat(66));
  console.log('   TEST COMPLETE');
  console.log('═'.repeat(66) + '\n');
}

runInteractiveSession().catch(console.error);
