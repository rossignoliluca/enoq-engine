#!/usr/bin/env npx ts-node

/**
 * LIMEN CLI
 * 
 * Interactive command-line interface for ENOQ.
 * 
 * Usage:
 *   npx ts-node src/cli.ts
 * 
 * Environment:
 *   OPENAI_API_KEY - for LLM generation (optional)
 *   ANTHROPIC_API_KEY - alternative LLM (optional)
 */

import { enoq, createSession, Session } from '../pipeline/pipeline';
import { checkLLMAvailability } from '../../operational/providers/llm_provider';
import * as readline from 'readline';

// ============================================
// CLI INTERFACE
// ============================================

async function main() {
  const session = createSession();
  
  // Check LLM availability
  const llmStatus = checkLLMAvailability();
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║     ███████╗███╗   ██╗ ██████╗  ██████╗                    ║');
  console.log('║     ██╔════╝████╗  ██║██╔═══██╗██╔═══██╗                   ║');
  console.log('║     █████╗  ██╔██╗ ██║██║   ██║██║   ██║                   ║');
  console.log('║     ██╔══╝  ██║╚██╗██║██║   ██║██║▄▄ ██║                   ║');
  console.log('║     ███████╗██║ ╚████║╚██████╔╝╚██████╔╝                   ║');
  console.log('║     ╚══════╝╚═╝  ╚═══╝ ╚═════╝  ╚══▀▀═╝                    ║');
  console.log('║                                                            ║');
  console.log('║              Cognitive Companion                           ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (llmStatus.available) {
    console.log(`  ✓ LLM: ${llmStatus.providers.join(', ')}`);
  } else {
    console.log('  ⚠ LLM: Not available (template mode only)');
    console.log('    Set OPENAI_API_KEY or ANTHROPIC_API_KEY for full responses');
  }
  
  console.log(`  ✓ Session: ${session.session_id}`);
  console.log('');
  console.log('  Commands:');
  console.log('    /trace  - Show last response trace');
  console.log('    /stats  - Show session statistics');
  console.log('    /clear  - Clear screen');
  console.log('    /exit   - End session');
  console.log('');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  let lastTrace: any = null;
  
  const prompt = () => {
    rl.question('You: ', async (input) => {
      const trimmed = input.trim();
      
      // Handle commands
      if (trimmed === '/exit') {
        printSessionEnd(session);
        rl.close();
        return;
      }
      
      if (trimmed === '/trace') {
        printTrace(lastTrace);
        prompt();
        return;
      }
      
      if (trimmed === '/stats') {
        printStats(session);
        prompt();
        return;
      }
      
      if (trimmed === '/clear') {
        console.clear();
        prompt();
        return;
      }
      
      if (trimmed === '') {
        prompt();
        return;
      }
      
      // Process through ENOQ
      try {
        const startTime = Date.now();
        const result = await enoq(trimmed, session);
        const elapsed = Date.now() - startTime;
        
        lastTrace = result.trace;
        
        console.log('');
        console.log(`ENOQ: ${result.output}`);
        console.log('');
        
        // Show minimal trace info
        const domains = result.trace.s1_field.domains?.slice(0, 2).map(d => 
          d.domain.replace('H0', '').replace('H', '').replace('_', ':')
        ).join(', ') || '';
        
        if (domains) {
          console.log(`  [${domains} | ${result.trace.s4_context.runtime} | ${elapsed}ms]`);
          console.log('');
        }
        
      } catch (error) {
        console.error('\n  Error:', error);
        console.log('');
      }
      
      prompt();
    });
  };
  
  prompt();
}

// ============================================
// OUTPUT HELPERS
// ============================================

function printTrace(trace: any) {
  if (!trace) {
    console.log('\n  No trace available. Send a message first.\n');
    return;
  }
  
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│           PIPELINE TRACE                │');
  console.log('├─────────────────────────────────────────┤');
  
  // S1: Perception
  console.log('│ S1 SENSE:');
  const domains = trace.s1_field.domains?.map((d: any) => 
    `${d.domain}(${(d.salience * 100).toFixed(0)}%)`
  ).join(', ') || 'N/A';
  console.log(`│   Domains: ${domains}`);
  console.log(`│   Arousal: ${trace.s1_field.arousal || 'N/A'}`);
  console.log(`│   Flags: ${trace.s1_field.flags?.join(', ') || 'none'}`);
  
  // Governor
  console.log('│ GOVERNOR:');
  console.log(`│   Rules: ${trace.s1_governor.rules_applied?.join(', ') || 'none'}`);
  
  // MetaKernel
  console.log('│ METAKERNEL:');
  console.log(`│   Power: ${(trace.s1_meta_kernel.power_level * 100).toFixed(0)}%`);
  console.log(`│   Ceiling: ${trace.s1_meta_kernel.depth_ceiling}`);
  
  // Selection
  console.log('│ S3 SELECT:');
  console.log(`│   Atmosphere: ${trace.s3_selection.atmosphere || 'N/A'}`);
  console.log(`│   Primitive: ${trace.s3_selection.primitive || 'N/A'}`);
  console.log(`│   Depth: ${trace.s3_selection.depth || 'N/A'}`);
  
  // Execution
  console.log('│ S4 ACT:');
  console.log(`│   Runtime: ${trace.s4_context.runtime}`);
  console.log(`│   Forbidden: ${trace.s4_context.forbidden?.slice(0, 3).join(', ') || 'none'}`);
  
  // Verification
  console.log('│ S5 VERIFY:');
  console.log(`│   Passed: ${trace.s5_verification.passed ? '✓' : '✗'}`);
  console.log(`│   Violations: ${trace.s5_verification.violations}`);
  
  // Timing
  console.log('├─────────────────────────────────────────┤');
  console.log(`│ Latency: ${trace.latency_ms}ms`);
  console.log('└─────────────────────────────────────────┘\n');
}

function printStats(session: Session) {
  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│          SESSION STATISTICS             │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│ Session ID: ${session.session_id.substring(0, 20)}...`);
  console.log(`│ Turns: ${session.turns.length}`);
  console.log(`│ Delegation attempts: ${session.memory.delegation_attempts}`);
  console.log(`│ Decisions made: ${session.memory.decisions_made}`);
  console.log(`│ Language: ${session.memory.language_preference}`);
  console.log(`│ Audit entries: ${session.audit_trail.length}`);
  console.log('├─────────────────────────────────────────┤');
  console.log('│ Telemetry:');
  console.log(`│   Delegation rate: ${(session.telemetry.delegation_rate * 100).toFixed(1)}%`);
  console.log(`│   Passive rate: ${(session.telemetry.passive_turns_rate * 100).toFixed(1)}%`);
  console.log(`│   Loop count: ${session.telemetry.loop_count}`);
  console.log('└─────────────────────────────────────────┘\n');
}

function printSessionEnd(session: Session) {
  console.log('\n');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('  Session ended.');
  console.log('');
  console.log(`  Turns: ${session.turns.length}`);
  console.log(`  Delegation attempts: ${session.memory.delegation_attempts}`);
  console.log(`  Decisions made: ${session.memory.decisions_made}`);
  console.log('');
  
  if (session.memory.decisions_made > session.memory.delegation_attempts) {
    console.log('  You made more decisions than delegations. Good.');
  } else if (session.memory.delegation_attempts > 0) {
    console.log('  You tried to delegate. I returned it to you.');
  }
  
  console.log('');
  console.log('  "ENOQ ti porta fino al punto in cui vorresti delegare.');
  console.log('   E lì ti restituisce a te stesso."');
  console.log('');
}

// ============================================
// RUN
// ============================================

main().catch(console.error);
