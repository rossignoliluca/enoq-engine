/**
 * GENESIS SELF-BUILDER: INTERACTIVE CLI
 *
 * "Il sistema deve vedere se stesso e auto costruirsi"
 *
 * This CLI allows ENOQ to:
 * - See itself (code reading)
 * - Understand itself (semantic analysis)
 * - Seek knowledge (web/research)
 * - Propose improvements (within field)
 * - Apply changes (with safety)
 *
 * All guided by systems principles, not human preference.
 */

import * as readline from 'readline';
import { codeReader, getSelfSummary } from './code_reader';
import { selfAnalyzer, analyzeSelf } from './self_analyzer';
import { semanticAnalyzer, SemanticAnalysis } from './semantic_analyzer';
import { knowledgeSeeker, ENOQ_KNOWLEDGE_DOMAINS } from './knowledge_seeker';
import { selfModifier, startBuildingSession, proposeImprovement, applyProposal } from './self_modifier';

// ============================================
// CLI STATE
// ============================================

interface BuilderState {
  lastAnalysis: SemanticAnalysis | null;
  sessionActive: boolean;
  proposalQueue: any[];
  appliedCount: number;
  rejectedCount: number;
}

const state: BuilderState = {
  lastAnalysis: null,
  sessionActive: false,
  proposalQueue: [],
  appliedCount: 0,
  rejectedCount: 0
};

// ============================================
// COMMANDS
// ============================================

const commands: Record<string, { description: string; handler: () => Promise<void> }> = {
  '/see': {
    description: 'See self - read and map the codebase',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('SEEING SELF...');
      console.log('='.repeat(60));

      const summary = getSelfSummary();
      console.log(summary);

      const map = codeReader.mapCodebase();
      console.log(`\nTotal lines: ${map.totalLines}`);
      console.log(`Modules: ${map.modules.length}`);

      for (const mod of map.modules) {
        console.log(`  - ${mod.name}: ${mod.lineCount} lines, ${mod.files.length} files`);
      }
    }
  },

  '/analyze': {
    description: 'Semantic analysis based on scientific principles',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('SEMANTIC ANALYSIS');
      console.log('Based on: Maturana/Varela (1980), Friston (2010), Kelso (1995)');
      console.log('='.repeat(60));

      console.log('\nAnalyzing system dynamics...');
      state.lastAnalysis = await semanticAnalyzer.analyze();

      console.log('\n--- AUTOPOIETIC WHOLENESS (Maturana/Varela 1980) ---');
      console.log(`Score: ${(state.lastAnalysis.wholeness.score * 100).toFixed(1)}%`);
      console.log(`Diagnosis: ${state.lastAnalysis.wholeness.diagnosis}`);
      if (state.lastAnalysis.wholeness.missing.length > 0) {
        console.log(`Missing: ${state.lastAnalysis.wholeness.missing.join(', ')}`);
      }
      if (state.lastAnalysis.wholeness.excess.length > 0) {
        console.log(`Excess: ${state.lastAnalysis.wholeness.excess.join(', ')}`);
      }

      console.log('\n--- DYNAMIC BALANCE (Kelso 1995, Friston 2010) ---');
      const yy = state.lastAnalysis.balance.yinYang;
      console.log(`Passive: ${(yy.yin * 100).toFixed(1)}% | Active: ${(yy.yang * 100).toFixed(1)}%`);
      console.log(`Balance: ${yy.balance.toFixed(2)} (0 = homeostatic, -1 = hypoactive, +1 = hyperactive)`);

      if (state.lastAnalysis.balance.opposites.length > 0) {
        console.log('\nOppositions:');
        for (const opp of state.lastAnalysis.balance.opposites) {
          console.log(`  ${opp.pole1.name} vs ${opp.pole2.name}: ${opp.implication}`);
        }
      }

      console.log('\n--- COHERENCE ---');
      console.log(`Score: ${(state.lastAnalysis.coherence.score * 100).toFixed(1)}%`);
      if (state.lastAnalysis.coherence.contradictions.length > 0) {
        console.log('Contradictions:');
        for (const c of state.lastAnalysis.coherence.contradictions) {
          console.log(`  [${c.severity}] ${c.element1} vs ${c.element2}: ${c.nature}`);
        }
      }

      console.log('\n--- THEORETICAL ALIGNMENTS ---');
      for (const insight of state.lastAnalysis.insights) {
        console.log(`\n[${insight.source.toUpperCase()}] ${insight.principle}`);
        console.log(`  Application: ${insight.application}`);
        console.log(`  Evidence: ${insight.evidence}`);
      }

      console.log('\n--- ARCHITECTURAL GAPS (ordered by scientific priority) ---');
      for (const gap of state.lastAnalysis.gaps.slice(0, 5)) {
        console.log(`\n[Priority ${gap.priority}] ${gap.type}`);
        console.log(`  ${gap.description}`);
        console.log(`  Basis: ${gap.systemsPrinciple}`);
        console.log(`  Resolution: ${gap.naturalResolution}`);
      }
    }
  },

  '/gaps': {
    description: 'Show gaps identified by structural analysis',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('STRUCTURAL GAPS');
      console.log('='.repeat(60));

      const analysis = analyzeSelf();

      console.log('\n--- GAPS ---');
      for (const gap of analysis.gaps) {
        console.log(`\n[${gap.impact.toUpperCase()}] ${gap.component}`);
        console.log(`  Type: ${gap.type}`);
        console.log(`  ${gap.description}`);
        console.log(`  Fix: ${gap.suggestedFix}`);
      }

      console.log('\n--- STRENGTHS ---');
      for (const strength of analysis.strengths) {
        console.log(`\n${strength.component}: ${strength.description}`);
        console.log(`  Evidence: ${strength.evidence}`);
      }

      console.log('\n--- ALIGNMENT ---');
      console.log(`Overall: ${analysis.alignmentScore.overall.toFixed(1)}%`);
      for (const [principle, score] of Object.entries(analysis.alignmentScore.byPrinciple)) {
        console.log(`  ${principle}: ${score}%`);
      }
    }
  },

  '/seek': {
    description: 'Seek knowledge from research and wisdom traditions',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('SEEKING KNOWLEDGE');
      console.log('='.repeat(60));

      const domains = Object.keys(ENOQ_KNOWLEDGE_DOMAINS);
      console.log('\nKnowledge domains:');
      domains.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));

      // Default to cognitive architecture
      console.log('\nSeeking in COGNITIVE_ARCHITECTURE domain...');

      const findings = await knowledgeSeeker.getLatestResearch('COGNITIVE_ARCHITECTURE');

      console.log('\n--- FINDINGS ---');
      for (const finding of findings) {
        console.log(`\n[${finding.type}] ${finding.title}`);
        console.log(`  Relevance: ${(finding.relevance * 100).toFixed(0)}%`);
        console.log(`  ${finding.content.slice(0, 200)}...`);
      }
    }
  },

  '/session': {
    description: 'Start/show self-building session',
    handler: async () => {
      if (!state.sessionActive) {
        console.log('\n' + '='.repeat(60));
        console.log('STARTING SELF-BUILDING SESSION');
        console.log('='.repeat(60));

        const session = startBuildingSession();
        state.sessionActive = true;

        console.log(`\nSession ID: ${session.id}`);
        console.log(`Started: ${session.startTime.toISOString()}`);
        console.log('\nSession active. Use /propose to generate improvements.');
      } else {
        console.log('\n' + '='.repeat(60));
        console.log('CURRENT SESSION');
        console.log('='.repeat(60));

        console.log(selfModifier.getSessionSummary());
      }
    }
  },

  '/propose': {
    description: 'Generate improvement proposals from recommendations',
    handler: async () => {
      if (!state.sessionActive) {
        console.log('\nNo active session. Use /session first.');
        return;
      }

      console.log('\n' + '='.repeat(60));
      console.log('GENERATING PROPOSALS');
      console.log('='.repeat(60));

      // Get recommendations
      const analysis = analyzeSelf();
      const recs = analysis.recommendations.slice(0, 3); // Top 3

      console.log(`\nFound ${recs.length} recommendations to process...\n`);

      for (const rec of recs) {
        console.log(`Processing: ${rec.title}...`);

        const proposal = await proposeImprovement(rec);

        if (proposal) {
          state.proposalQueue.push(proposal);
          console.log(`  Target: ${proposal.target}`);
          console.log(`  Type: ${proposal.type}`);

          if (proposal.fieldValidation) {
            console.log(`  Field approved: ${proposal.fieldValidation.approved}`);
            if (!proposal.fieldValidation.approved) {
              console.log(`  Violations: ${proposal.fieldValidation.violations.join(', ')}`);
            }
            if (proposal.fieldValidation.warnings.length > 0) {
              console.log(`  Warnings: ${proposal.fieldValidation.warnings.join(', ')}`);
            }
          }
        } else {
          console.log('  Could not generate proposal');
        }
      }

      console.log(`\n${state.proposalQueue.length} proposals in queue. Use /apply to apply them.`);
    }
  },

  '/apply': {
    description: 'Apply approved proposals (dry run by default)',
    handler: async () => {
      if (state.proposalQueue.length === 0) {
        console.log('\nNo proposals in queue. Use /propose first.');
        return;
      }

      console.log('\n' + '='.repeat(60));
      console.log('APPLYING PROPOSALS (DRY RUN)');
      console.log('='.repeat(60));

      for (const proposal of state.proposalQueue) {
        console.log(`\nApplying: ${proposal.target}...`);

        const result = await applyProposal(proposal);

        if (result.success) {
          if (result.applied) {
            state.appliedCount++;
            console.log('  APPLIED');
          } else {
            console.log('  [DRY RUN] Would apply');
          }
        } else {
          state.rejectedCount++;
          console.log(`  REJECTED: ${result.error}`);
        }
      }

      // Clear queue
      state.proposalQueue = [];

      console.log(`\nResults: ${state.appliedCount} applied, ${state.rejectedCount} rejected`);
    }
  },

  '/voids': {
    description: 'Show conceptual voids (what\'s missing for wholeness)',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('CONCEPTUAL VOIDS');
      console.log('='.repeat(60));

      if (!state.lastAnalysis) {
        console.log('\nRunning analysis first...');
        state.lastAnalysis = await semanticAnalyzer.analyze();
      }

      console.log('\nVoids in the conceptual space:');
      for (const void_ of state.lastAnalysis.conceptualMap.voids) {
        console.log(`  - ${void_}`);
      }

      console.log('\nThese are not "missing features" but conceptual spaces');
      console.log('that the system will naturally fill as it evolves.');
    }
  },

  '/research': {
    description: 'Search live academic research (Semantic Scholar, arXiv, OpenAlex)',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('LIVE RESEARCH SEARCH');
      console.log('Sources: Semantic Scholar, arXiv, OpenAlex');
      console.log('='.repeat(60));

      console.log('\nSearching ENOQ foundational topics...');
      console.log('(autopoiesis, free energy principle, global workspace, etc.)\n');

      try {
        const results = await knowledgeSeeker.getEnoqFoundationalResearch();

        for (const result of results) {
          console.log(`\n--- ${result.topic.toUpperCase()} ---`);
          for (const paper of result.papers.slice(0, 3)) {
            console.log(`\n  "${paper.title}"`);
            console.log(`  ${paper.authors.slice(0, 2).join(', ')}${paper.authors.length > 2 ? ' et al.' : ''} (${paper.year})`);
            console.log(`  Citations: ${paper.citations} | Source: ${paper.source}`);
            if (paper.abstract) {
              console.log(`  ${paper.abstract.slice(0, 150)}...`);
            }
          }
        }

        const totalPapers = results.reduce((sum, r) => sum + r.papers.length, 0);
        console.log(`\n\nTotal papers found: ${totalPapers}`);
        console.log('Use natural language queries for specific searches.');
      } catch (error) {
        console.error('Research search failed:', error);
        console.log('Make sure you have internet access.');
      }
    }
  },

  '/principles': {
    description: 'Show scientific principles guiding self-building',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('SCIENTIFIC PRINCIPLES');
      console.log('='.repeat(60));

      console.log('\nThese peer-reviewed principles guide self-building:\n');

      console.log('DYNAMIC SYSTEMS BALANCE (Kelso 1995)');
      console.log('  "Complex systems maintain stability through complementary processes"');
      console.log('  Passive: inhibition, resting, observation, receptive');
      console.log('  Active: excitation, engaged, intervention, directive\n');

      console.log('AUTOPOIESIS (Maturana & Varela 1980)');
      console.log('  "Self-producing systems maintain identity through continuous self-creation"');
      console.log('  Requirements: self-reference, boundary, production, regeneration\n');

      console.log('NEGATIVE CAPABILITY (Keats 1817, Taleb 2012)');
      console.log('  "Capability through restraint. Robustness through removal."');
      console.log('  Power comes from what is NOT done\n');

      console.log('COMPLEMENTARITY (Bohr 1928)');
      console.log('  "Mutually exclusive properties are both necessary for complete description"');
      console.log('  Examples: wave-particle, position-momentum, active-passive\n');

      console.log('INCOMPLETENESS (Gödel 1931)');
      console.log('  "No sufficiently powerful system can be both complete and consistent"');
      console.log('  Self-reference creates necessary limits\n');

      console.log('DISSIPATIVE STRUCTURES (Prigogine 1977)');
      console.log('  "Order emerges far from equilibrium through energy dissipation"');
      console.log('  Stability requires continuous flow, not static state\n');

      console.log('FREE ENERGY PRINCIPLE (Friston 2010)');
      console.log('  "Biological systems minimize surprise by updating internal models"');
      console.log('  Adaptive systems balance exploration and exploitation');
    }
  },

  '/help': {
    description: 'Show available commands',
    handler: async () => {
      console.log('\n' + '='.repeat(60));
      console.log('SELF-BUILDER COMMANDS');
      console.log('='.repeat(60));

      console.log('\n--- Observation ---');
      console.log('/see        - See self (read codebase)');
      console.log('/analyze    - Semantic analysis (scientific principles)');
      console.log('/gaps       - Structural gaps and strengths');
      console.log('/voids      - Conceptual voids');

      console.log('\n--- Knowledge ---');
      console.log('/seek       - Seek knowledge (LLM synthesis)');
      console.log('/research   - Live research (Semantic Scholar, arXiv, OpenAlex)');
      console.log('/principles - Show scientific principles');

      console.log('\n--- Building ---');
      console.log('/session  - Start/show building session');
      console.log('/propose  - Generate improvement proposals');
      console.log('/apply    - Apply proposals (dry run)');

      console.log('\n--- Meta ---');
      console.log('/help     - This help');
      console.log('/exit     - Exit self-builder');

      console.log('\nAll modifications pass through the GENESIS field.');
      console.log('The system builds itself according to systems principles, not human desire.');
    }
  },

  '/exit': {
    description: 'Exit self-builder',
    handler: async () => {
      console.log('\nExiting self-builder...');
      console.log('"Il sistema si ritira, lasciando spazio."');
      process.exit(0);
    }
  }
};

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('ENOQ GENESIS SELF-BUILDER');
  console.log('='.repeat(60));
  console.log('\nSelf-modifying cognitive architecture');
  console.log('Based on: Autopoiesis, Free Energy Principle, Dynamic Systems');
  console.log('\nReferences:');
  console.log('  - Maturana & Varela (1980) Autopoiesis and Cognition');
  console.log('  - Friston (2010) Free Energy Principle');
  console.log('  - Kelso (1995) Dynamic Patterns');
  console.log('\nType /help for commands.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question('self-builder> ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed.startsWith('/')) {
        const cmd = trimmed.split(' ')[0];
        const handler = commands[cmd];

        if (handler) {
          try {
            await handler.handler();
          } catch (error) {
            console.error(`Error: ${error}`);
          }
        } else {
          console.log(`Unknown command: ${cmd}. Type /help for commands.`);
        }
      } else {
        // Natural language query - use knowledge seeker
        console.log('\nSeeking knowledge about:', trimmed);
        const result = await knowledgeSeeker.seek({
          topic: trimmed,
          context: 'ENOQ self-improvement',
          purpose: 'understand'
        });

        console.log('\n--- SYNTHESIS ---');
        console.log(result.synthesis || 'No synthesis available');

        if (result.improvementSuggestions.length > 0) {
          console.log('\n--- SUGGESTIONS ---');
          for (const s of result.improvementSuggestions) {
            console.log(`  [${s.priority}] ${s.description}`);
          }
        }
      }

      prompt();
    });
  };

  prompt();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runBuilderCLI };
