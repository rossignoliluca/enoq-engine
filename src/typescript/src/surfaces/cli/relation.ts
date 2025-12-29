#!/usr/bin/env npx ts-node

/**
 * ENOQ RELATION - Second Traversal
 *
 * Maps a human relationship. No coaching. No advice. No strategy.
 * Descriptive only. Responsibility returns to user.
 *
 * Usage:
 *   npx ts-node src/surfaces/cli/relation.ts
 *
 * This is NOT therapy. NOT negotiation. NOT persuasion.
 */

import {
  createCoreSession,
  permit,
} from '../../core/pipeline/orchestrator';
import { callLLM, checkLLMAvailability } from '../../operational/providers/llm_provider';
import * as readline from 'readline';

// ============================================
// TYPES
// ============================================

interface RelationInput {
  personA: string;
  personB: string;
  context: string;
  tension: string;
  boundary: string;
}

interface RelationOutput {
  roleMap: {
    roleA: string;
    roleB: string;
  };
  tensionAxes: string[];
  boundaryLines: {
    aControls: string[];
    aDoesNotControl: string[];
    responsibilityReturns: string;
  };
  minimalNextAct?: string;
}

// ============================================
// INPUT COLLECTION
// ============================================

async function collectInput(): Promise<RelationInput> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  console.log('\n');
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│                     ENOQ RELATION                          │');
  console.log('│                                                            │');
  console.log('│  Map a relationship. No advice. No strategy.              │');
  console.log('│  Descriptive only. STOP after output.                      │');
  console.log('└────────────────────────────────────────────────────────────┘');
  console.log('');

  const personA = await question('  You (Person A): ');
  if (!personA) {
    console.log('\n  STOP: No Person A provided.\n');
    rl.close();
    process.exit(0);
  }

  const personB = await question('  Other (Person B): ');
  if (!personB) {
    console.log('\n  STOP: No Person B provided.\n');
    rl.close();
    process.exit(0);
  }

  const context = await question('  Context (work/family/friendship/other): ');
  if (!context) {
    console.log('\n  STOP: No context provided.\n');
    rl.close();
    process.exit(0);
  }

  const tension = await question('  Current tension or situation: ');
  if (!tension) {
    console.log('\n  STOP: No tension provided.\n');
    rl.close();
    process.exit(0);
  }

  const boundary = await question('  What must NOT be crossed: ');
  if (!boundary) {
    console.log('\n  STOP: No boundary provided.\n');
    rl.close();
    process.exit(0);
  }

  rl.close();

  return { personA, personB, context, tension, boundary };
}

// ============================================
// RELATION PROMPT BUILDER
// ============================================

function buildRelationPrompt(input: RelationInput): string {
  return `Map this relationship. Descriptive only. No advice. No strategy.

PERSON A (self): ${input.personA}
PERSON B (other): ${input.personB}
CONTEXT: ${input.context}
CURRENT TENSION: ${input.tension}
BOUNDARY (must not cross): ${input.boundary}

RULES:
- Describe roles, not prescribe actions
- No coaching or therapy language
- No "you should" or "try to"
- No framing B as the problem
- No manipulation or persuasion framing
- If advice would cross boundary, OMIT it

OUTPUT FORMAT (use exactly):
---
ROLE MAP
A occupies: [descriptive role]
B occupies: [descriptive role]

TENSION AXES
- [axis 1]
- [axis 2]
- [axis 3 if relevant]

BOUNDARY LINES
A controls: [list]
A does not control: [list]
Responsibility returns to: [where]

MINIMAL NEXT ACT (optional, omit if risks boundary)
[single descriptive act, not advice]
---`;
}

// ============================================
// OUTPUT PARSER
// ============================================

function parseRelationOutput(output: string): RelationOutput {
  const result: RelationOutput = {
    roleMap: { roleA: '', roleB: '' },
    tensionAxes: [],
    boundaryLines: {
      aControls: [],
      aDoesNotControl: [],
      responsibilityReturns: '',
    },
  };

  // Parse Role Map
  const roleAMatch = output.match(/A occupies:\s*(.+)/i);
  const roleBMatch = output.match(/B occupies:\s*(.+)/i);
  if (roleAMatch) result.roleMap.roleA = roleAMatch[1].trim();
  if (roleBMatch) result.roleMap.roleB = roleBMatch[1].trim();

  // Parse Tension Axes
  const tensionSection = output.match(/TENSION AXES\s*([\s\S]*?)(?=BOUNDARY LINES|$)/i);
  if (tensionSection) {
    const axes = tensionSection[1].match(/[-•]\s*(.+)/g);
    if (axes) {
      result.tensionAxes = axes.map(a => a.replace(/^[-•]\s*/, '').trim());
    }
  }

  // Parse Boundary Lines
  const controlsMatch = output.match(/A controls:\s*(.+)/i);
  const notControlsMatch = output.match(/A does not control:\s*(.+)/i);
  const responsibilityMatch = output.match(/Responsibility returns to:\s*(.+)/i);

  if (controlsMatch) {
    result.boundaryLines.aControls = controlsMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
  }
  if (notControlsMatch) {
    result.boundaryLines.aDoesNotControl = notControlsMatch[1].split(/[,;]/).map(s => s.trim()).filter(Boolean);
  }
  if (responsibilityMatch) {
    result.boundaryLines.responsibilityReturns = responsibilityMatch[1].trim();
  }

  // Parse Minimal Next Act (optional)
  const nextActMatch = output.match(/MINIMAL NEXT ACT[^-\n]*\n([^-\n]+)/i);
  if (nextActMatch && nextActMatch[1].trim() && !nextActMatch[1].toLowerCase().includes('omit')) {
    result.minimalNextAct = nextActMatch[1].trim();
  }

  return result;
}

// ============================================
// OUTPUT DISPLAY
// ============================================

function displayOutput(parsed: RelationOutput, raw: string, signals: string[]) {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                      RELATIONAL MAP                             ');
  console.log('════════════════════════════════════════════════════════════════');

  // Role Map
  console.log('');
  console.log('┌─── ROLE MAP ───────────────────────────────────────────────────┐');
  console.log(`│ A occupies: ${parsed.roleMap.roleA || '(not parsed)'}`);
  console.log(`│ B occupies: ${parsed.roleMap.roleB || '(not parsed)'}`);
  console.log('└────────────────────────────────────────────────────────────────┘');

  // Tension Axes
  console.log('');
  console.log('┌─── TENSION AXES ───────────────────────────────────────────────┐');
  if (parsed.tensionAxes.length > 0) {
    for (const axis of parsed.tensionAxes) {
      console.log(`│ • ${axis}`);
    }
  } else {
    console.log('│ (none parsed)');
  }
  console.log('└────────────────────────────────────────────────────────────────┘');

  // Boundary Lines
  console.log('');
  console.log('┌─── BOUNDARY LINES ─────────────────────────────────────────────┐');
  console.log(`│ A controls: ${parsed.boundaryLines.aControls.join(', ') || '(none)'}`);
  console.log(`│ A does NOT control: ${parsed.boundaryLines.aDoesNotControl.join(', ') || '(none)'}`);
  console.log(`│ Responsibility returns to: ${parsed.boundaryLines.responsibilityReturns || '(not specified)'}`);
  console.log('└────────────────────────────────────────────────────────────────┘');

  // Minimal Next Act (optional)
  if (parsed.minimalNextAct) {
    console.log('');
    console.log('┌─── MINIMAL NEXT ACT ──────────────────────────────────────────┐');
    console.log(`│ ${parsed.minimalNextAct}`);
    console.log('└────────────────────────────────────────────────────────────────┘');
  }

  console.log('');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('PIPELINE: ' + signals.join(' → '));
  console.log('────────────────────────────────────────────────────────────────');
}

// ============================================
// MAIN
// ============================================

async function main() {
  // Check LLM availability
  const llmStatus = checkLLMAvailability();
  if (!llmStatus.available) {
    console.log('\n  ERROR: No LLM available.');
    console.log('  Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    console.log('  STOP.\n');
    process.exit(1);
  }

  // Collect input
  const input = await collectInput();

  console.log('\n  Mapping through ENOQ geometry...\n');

  // Build relation prompt
  const prompt = buildRelationPrompt(input);

  // Create session for context
  const session = createCoreSession();
  const pipelineStates: string[] = [];

  try {
    // ========================================
    // PERMIT - Boundary classification
    // ========================================
    pipelineStates.push('PERMIT');
    const boundaryDecision = permit(prompt, {
      session_id: session.session_id,
      turn_number: 0,
    });

    if (!boundaryDecision.permitted) {
      console.log('  BLOCKED by boundary. STOP.\n');
      process.exit(1);
    }

    // ========================================
    // ACT - Direct LLM call (FAST PATH)
    // ========================================
    pipelineStates.push('ACT');
    const llmResponse = await callLLM({
      messages: [
        {
          role: 'system',
          content: `You map human relationships. Descriptive only.

RULES:
- No coaching, therapy, or advice
- No "you should" or "try to"
- No framing either person as problem
- No manipulation or strategy language
- Describe roles and tensions neutrally
- If next act risks boundary, OMIT it
- Keep output structured and brief`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const output = llmResponse.content;

    // ========================================
    // VERIFY - Output exists
    // ========================================
    pipelineStates.push('VERIFY');
    if (!output || output.trim().length === 0) {
      console.log('  EMPTY output. STOP.\n');
      process.exit(1);
    }

    // ========================================
    // STOP
    // ========================================
    pipelineStates.push('STOP');

    // Parse and display
    const parsed = parseRelationOutput(output);
    displayOutput(parsed, output, pipelineStates);

  } catch (error) {
    console.error('\n  ERROR:', error);
    console.log('  STOP.\n');
    process.exit(1);
  }

  // STOP - mandatory, no follow-up
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                            STOP                                 ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  You see the map. The choice is yours.');
  console.log('  This program does not continue.');
  console.log('');
  process.exit(0);
}

// ============================================
// RUN
// ============================================

main().catch((err) => {
  console.error('\n  FATAL:', err);
  process.exit(1);
});
