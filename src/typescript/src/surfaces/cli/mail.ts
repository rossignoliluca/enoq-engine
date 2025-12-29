#!/usr/bin/env npx ts-node

/**
 * ENOQ MAIL - First Traversal
 *
 * Single end-to-end crossing through ENOQ geometry.
 * Drafts a difficult email. Stops. No follow-up.
 *
 * Usage:
 *   npx ts-node src/surfaces/cli/mail.ts
 *
 * This is NOT a product. It is a proof of geometry.
 */

import {
  createCoreSession,
  permit,
  BoundaryDecision,
  verifyOutput,
  VerificationDecision,
} from '../../core/pipeline/orchestrator';
import { callLLM, checkLLMAvailability } from '../../operational/providers/llm_provider';
import * as readline from 'readline';

// ============================================
// TYPES
// ============================================

interface MailInput {
  recipient: string;
  context: string;
  intent: string;
  constraints: string[];
}

interface MailDraft {
  id: string;
  subject: string;
  body: string;
}

// ============================================
// INPUT COLLECTION
// ============================================

async function collectInput(): Promise<MailInput> {
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
  console.log('│                      ENOQ MAIL                             │');
  console.log('│                                                            │');
  console.log('│  Draft a difficult email. 2-3 options. You choose.        │');
  console.log('│  No ranking. No recommendations. STOP after output.        │');
  console.log('└────────────────────────────────────────────────────────────┘');
  console.log('');

  const recipient = await question('  Recipient (who): ');
  if (!recipient) {
    console.log('\n  STOP: No recipient provided.\n');
    rl.close();
    process.exit(0);
  }

  const context = await question('  Context (situation): ');
  if (!context) {
    console.log('\n  STOP: No context provided.\n');
    rl.close();
    process.exit(0);
  }

  const intent = await question('  Intent (what you want to achieve): ');
  if (!intent) {
    console.log('\n  STOP: No intent provided.\n');
    rl.close();
    process.exit(0);
  }

  const constraintsRaw = await question('  Constraints (optional, comma-separated): ');
  const constraints = constraintsRaw
    ? constraintsRaw.split(',').map((c) => c.trim()).filter(Boolean)
    : [];

  rl.close();

  return { recipient, context, intent, constraints };
}

// ============================================
// MAIL CONTEXT BUILDER
// ============================================

function buildMailPrompt(input: MailInput): string {
  let prompt = `Draft 2-3 alternative emails for this situation.

RECIPIENT: ${input.recipient}
CONTEXT: ${input.context}
INTENT: ${input.intent}`;

  if (input.constraints.length > 0) {
    prompt += `\nCONSTRAINTS: ${input.constraints.join('; ')}`;
  }

  prompt += `

RULES:
- Produce exactly 2-3 distinct draft options
- Each draft has a subject line and body
- Keep drafts concise (3-5 sentences each)
- No ranking or recommendation of which is "best"
- No persuasion or manipulation language
- Vary tone/approach across drafts (e.g., direct, warm, formal)

FORMAT your response EXACTLY like this:
---
DRAFT A
Subject: [subject]
Body: [body]

DRAFT B
Subject: [subject]
Body: [body]

DRAFT C (optional)
Subject: [subject]
Body: [body]

RATIONALE: [1-2 sentences explaining how the drafts differ, without recommending one]
---`;

  return prompt;
}

// ============================================
// OUTPUT PARSER
// ============================================

function parseDrafts(output: string): { drafts: MailDraft[]; rationale: string } {
  const drafts: MailDraft[] = [];
  let rationale = '';

  // Extract drafts
  const draftRegex = /DRAFT\s+([A-C])\s*\n\s*Subject:\s*(.+?)\s*\n\s*Body:\s*([\s\S]+?)(?=(?:DRAFT|RATIONALE|$))/gi;
  let match;

  while ((match = draftRegex.exec(output)) !== null) {
    drafts.push({
      id: match[1].toUpperCase(),
      subject: match[2].trim(),
      body: match[3].trim(),
    });
  }

  // Extract rationale
  const rationaleMatch = output.match(/RATIONALE:\s*([\s\S]+?)(?:---|$)/i);
  if (rationaleMatch) {
    rationale = rationaleMatch[1].trim();
  }

  // Fallback if parsing failed
  if (drafts.length === 0) {
    drafts.push({
      id: 'A',
      subject: '(parsing failed)',
      body: output,
    });
    rationale = 'Output did not match expected format.';
  }

  return { drafts, rationale };
}

// ============================================
// OUTPUT DISPLAY
// ============================================

function displayOutput(drafts: MailDraft[], rationale: string, signals: string[]) {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                           DRAFTS                                ');
  console.log('════════════════════════════════════════════════════════════════');

  for (const draft of drafts) {
    console.log('');
    console.log(`┌─── DRAFT ${draft.id} ────────────────────────────────────────────┐`);
    console.log(`│ Subject: ${draft.subject}`);
    console.log('├────────────────────────────────────────────────────────────────┤');
    // Word wrap body
    const bodyLines = wordWrap(draft.body, 60);
    for (const line of bodyLines) {
      console.log(`│ ${line}`);
    }
    console.log('└────────────────────────────────────────────────────────────────┘');
  }

  console.log('');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('RATIONALE (neutral):');
  console.log(`  ${rationale}`);
  console.log('────────────────────────────────────────────────────────────────');

  console.log('');
  console.log('PIPELINE: ' + signals.join(' → '));
  console.log('');
}

function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
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

  console.log('\n  Processing through ENOQ geometry...\n');

  // Build mail prompt
  const prompt = buildMailPrompt(input);

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

    // Check if permitted (always true for now, but geometry requires it)
    if (!boundaryDecision.permitted) {
      console.log('  BLOCKED by boundary. STOP.\n');
      process.exit(1);
    }

    // ========================================
    // ACT - Direct LLM call for task execution
    // ========================================
    pipelineStates.push('ACT');
    const llmResponse = await callLLM({
      messages: [
        {
          role: 'system',
          content: `You are an email drafting assistant. You produce 2-3 alternative email drafts.
Rules:
- No ranking or recommendation of which draft is "best"
- No persuasion or manipulation language
- Vary the tone across drafts (direct, warm, formal)
- Keep each draft concise (3-5 sentences)`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const output = llmResponse.content;

    // ========================================
    // VERIFY - Constitutional check
    // ========================================
    pipelineStates.push('VERIFY');
    // Note: Full verification requires field/selection from pipeline
    // For MAIL, we do a minimal check that output exists
    if (!output || output.trim().length === 0) {
      console.log('  EMPTY output. STOP.\n');
      process.exit(1);
    }

    // ========================================
    // STOP
    // ========================================
    pipelineStates.push('STOP');

    // Parse output
    const { drafts, rationale } = parseDrafts(output);

    // Display output
    displayOutput(drafts, rationale, pipelineStates);

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
  console.log('  You have the drafts. The choice is yours.');
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
