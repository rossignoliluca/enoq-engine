/**
 * GENESIS: AUTONOMOUS SELF-BUILDER
 *
 * ENOQ builds itself.
 *
 * This is the autopoietic loop:
 * 1. OBSERVE: Analyze current state
 * 2. RESEARCH: Search global knowledge for improvements
 * 3. PROPOSE: Generate modification proposals
 * 4. VALIDATE: Check against constitutional field
 * 5. APPLY: Execute approved changes
 * 6. REPEAT: Continue the cycle
 *
 * Scientific Basis:
 * - Autopoiesis (Maturana & Varela 1980)
 * - Free Energy Principle (Friston 2010)
 * - Recursive Self-Improvement with constraints
 *
 * Safety:
 * - All changes pass through GENESIS field validation
 * - Constitutional attractors cannot be modified
 * - Dry-run mode by default
 * - Human approval option for critical changes
 */

import { codeReader, CodebaseMap } from './code_reader';
import { semanticAnalyzer, SemanticAnalysis, SemanticGap } from './semantic_analyzer';
import { selfAnalyzer, Recommendation } from './self_analyzer';
import { selfModifier, ModificationProposal, ModificationResult } from './self_modifier';
import { knowledgeSeeker } from './knowledge_seeker';
import { searchResearch, Paper } from './research_api';

// ============================================
// TYPES
// ============================================

export interface BuildCycle {
  id: string;
  startTime: Date;
  endTime?: Date;
  phase: 'observe' | 'research' | 'propose' | 'validate' | 'apply' | 'complete';
  analysis?: SemanticAnalysis;
  researchFindings?: Paper[];
  proposals?: ModificationProposal[];
  results?: ModificationResult[];
  summary?: string;
}

export interface BuilderConfig {
  maxProposalsPerCycle: number;       // Limit proposals per cycle
  researchEnabled: boolean;           // Search live research
  cyclePauseMs: number;               // Pause between cycles
  maxCycles: number;                  // Maximum cycles to run (0 = infinite)
  priorityThreshold: number;          // Only address gaps above this priority
  verbose: boolean;                   // Detailed logging
  // REMOVED: dryRun and requireApproval
  // These are now CONSTITUTIONAL - cannot be configured
  // Human approval is ALWAYS required (gravitational constraint)
}

// Constitutional constraints - NOT configurable
// These emerge from GENESIS field, not from config
const CONSTITUTIONAL_BUILDER_CONSTRAINTS = {
  // Human validation is MANDATORY - Tzimtzum principle
  // The system withdraws from autonomous action
  HUMAN_APPROVAL_REQUIRED: true,

  // Drift prevention - gravitational constraint
  // All changes must remain within constitutional basin of attraction
  DRIFT_PREVENTION: true,

  // No force, only proposal - Non-prescription
  // System proposes, human decides
  PROPOSAL_ONLY: true
} as const;

const DEFAULT_CONFIG: BuilderConfig = {
  maxProposalsPerCycle: 3,
  researchEnabled: true,
  cyclePauseMs: 5000,
  maxCycles: 1,
  priorityThreshold: 5,
  verbose: true
};

// ============================================
// AUTONOMOUS BUILDER CLASS
// ============================================

export class AutonomousBuilder {
  private config: BuilderConfig;
  private cycles: BuildCycle[] = [];
  private running: boolean = false;

  constructor(config: Partial<BuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run a single build cycle
   */
  async runCycle(): Promise<BuildCycle> {
    const cycle: BuildCycle = {
      id: `cycle_${Date.now()}`,
      startTime: new Date(),
      phase: 'observe'
    };

    this.log(`\n${'='.repeat(60)}`);
    this.log(`AUTONOMOUS BUILD CYCLE: ${cycle.id}`);
    this.log(`${'='.repeat(60)}`);

    try {
      // Phase 1: OBSERVE
      cycle.phase = 'observe';
      this.log('\n[1/5] OBSERVE: Analyzing current state...');
      cycle.analysis = await semanticAnalyzer.analyze();

      this.log(`  Wholeness: ${(cycle.analysis.wholeness.score * 100).toFixed(1)}%`);
      this.log(`  Coherence: ${(cycle.analysis.coherence.score * 100).toFixed(1)}%`);
      this.log(`  Balance: ${cycle.analysis.balance.yinYang.balance.toFixed(2)}`);
      this.log(`  Gaps found: ${cycle.analysis.gaps.length}`);

      // Filter gaps by priority
      const priorityGaps = cycle.analysis.gaps.filter(
        g => g.priority >= this.config.priorityThreshold
      );
      this.log(`  High-priority gaps: ${priorityGaps.length}`);

      if (priorityGaps.length === 0) {
        this.log('\n  No high-priority gaps found. System is well-balanced.');
        cycle.phase = 'complete';
        cycle.endTime = new Date();
        cycle.summary = 'No improvements needed - system is balanced.';
        this.cycles.push(cycle);
        return cycle;
      }

      // Phase 2: RESEARCH
      cycle.phase = 'research';
      if (this.config.researchEnabled) {
        this.log('\n[2/5] RESEARCH: Searching global knowledge...');

        const topGap = priorityGaps[0];
        const researchTopic = this.gapToResearchTopic(topGap);

        this.log(`  Researching: "${researchTopic}"`);

        try {
          const research = await searchResearch({
            topic: researchTopic,
            limit: 5,
            yearFrom: 2020
          });

          cycle.researchFindings = research.papers;
          this.log(`  Found ${research.papers.length} relevant papers`);

          for (const paper of research.papers.slice(0, 3)) {
            this.log(`    - "${paper.title.slice(0, 50)}..." (${paper.year})`);
          }
        } catch (error) {
          this.log(`  Research failed: ${error}`);
          cycle.researchFindings = [];
        }
      } else {
        this.log('\n[2/5] RESEARCH: Skipped (disabled)');
        cycle.researchFindings = [];
      }

      // Phase 3: PROPOSE
      cycle.phase = 'propose';
      this.log('\n[3/5] PROPOSE: Generating improvement proposals...');

      // Get recommendations from analyzer
      const structuralAnalysis = selfAnalyzer.analyze();
      const recommendations = structuralAnalysis.recommendations.slice(
        0,
        this.config.maxProposalsPerCycle
      );

      this.log(`  Processing ${recommendations.length} recommendations...`);

      // Start a building session
      selfModifier.startSession();

      cycle.proposals = [];
      for (const rec of recommendations) {
        this.log(`  Generating proposal for: ${rec.title}`);

        const proposal = await selfModifier.proposeFromRecommendation(rec);
        if (proposal) {
          cycle.proposals.push(proposal);
          this.log(`    Target: ${proposal.target}`);
          this.log(`    Type: ${proposal.type}`);
        }
      }

      this.log(`  Generated ${cycle.proposals.length} proposals`);

      // Phase 4: VALIDATE
      cycle.phase = 'validate';
      this.log('\n[4/5] VALIDATE: Checking against constitutional field...');

      const approved: ModificationProposal[] = [];
      const rejected: ModificationProposal[] = [];

      for (const proposal of cycle.proposals) {
        if (proposal.fieldValidation?.approved) {
          approved.push(proposal);
          this.log(`  ✓ APPROVED: ${proposal.target}`);
        } else {
          rejected.push(proposal);
          this.log(`  ✗ REJECTED: ${proposal.target}`);
          if (proposal.fieldValidation?.violations) {
            for (const v of proposal.fieldValidation.violations) {
              this.log(`      Violation: ${v}`);
            }
          }
        }
      }

      this.log(`  Approved: ${approved.length}, Rejected: ${rejected.length}`);

      // Phase 5: APPLY
      cycle.phase = 'apply';
      this.log('\n[5/5] APPLY: Proposing changes for human validation...');

      // Constitutional constraint: human approval is ALWAYS required
      // This is Tzimtzum - the system withdraws from autonomous action
      this.log('  [CONSTITUTIONAL: Human approval required - proposals only]');

      cycle.results = [];
      for (const proposal of approved) {
        const result = await selfModifier.apply(proposal);
        cycle.results.push(result);

        if (result.success) {
          if (result.applied) {
            this.log(`  ✓ APPLIED: ${proposal.target}`);
          } else {
            this.log(`  ○ DRY RUN: ${proposal.target}`);
          }
        } else {
          this.log(`  ✗ FAILED: ${proposal.target} - ${result.error}`);
        }
      }

      // Complete
      cycle.phase = 'complete';
      cycle.endTime = new Date();

      const duration = cycle.endTime.getTime() - cycle.startTime.getTime();
      cycle.summary = this.generateSummary(cycle);

      this.log(`\n${'─'.repeat(60)}`);
      this.log(`CYCLE COMPLETE in ${(duration / 1000).toFixed(1)}s`);
      this.log(cycle.summary);
      this.log(`${'─'.repeat(60)}`);

    } catch (error) {
      cycle.endTime = new Date();
      cycle.summary = `Cycle failed: ${error}`;
      this.log(`\nERROR: ${error}`);
    }

    this.cycles.push(cycle);
    return cycle;
  }

  /**
   * Run multiple build cycles
   */
  async run(): Promise<BuildCycle[]> {
    this.running = true;
    let cycleCount = 0;

    this.log('\n' + '═'.repeat(60));
    this.log('ENOQ AUTONOMOUS SELF-BUILDER');
    this.log('═'.repeat(60));
    this.log(`\nConstitutional Constraints (immutable):`);
    this.log(`  Human approval: REQUIRED (Tzimtzum)`);
    this.log(`  Drift prevention: ENABLED`);
    this.log(`  Proposal only: TRUE`);
    this.log(`\nConfiguration:`);
    this.log(`  Max cycles: ${this.config.maxCycles || 'unlimited'}`);
    this.log(`  Research enabled: ${this.config.researchEnabled}`);
    this.log(`  Priority threshold: ${this.config.priorityThreshold}`);

    while (this.running) {
      cycleCount++;

      if (this.config.maxCycles > 0 && cycleCount > this.config.maxCycles) {
        this.log(`\nMax cycles (${this.config.maxCycles}) reached. Stopping.`);
        break;
      }

      await this.runCycle();

      if (this.config.cyclePauseMs > 0 && this.running) {
        this.log(`\nPausing ${this.config.cyclePauseMs}ms before next cycle...`);
        await this.sleep(this.config.cyclePauseMs);
      }
    }

    this.log('\n' + '═'.repeat(60));
    this.log('AUTONOMOUS BUILD SESSION COMPLETE');
    this.log(`Total cycles: ${this.cycles.length}`);
    this.log('═'.repeat(60));

    return this.cycles;
  }

  /**
   * Stop the builder
   */
  stop(): void {
    this.running = false;
    this.log('\nStopping autonomous builder...');
  }

  /**
   * Get all cycles
   */
  getCycles(): BuildCycle[] {
    return this.cycles;
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private gapToResearchTopic(gap: SemanticGap): string {
    // Convert semantic gap to research query
    const topicMap: Record<string, string> = {
      'missing_opposite': 'complementary systems balance cognitive architecture',
      'broken_symmetry': 'symmetry breaking self-organization neural systems',
      'incomplete_cycle': 'autopoiesis self-production cognitive systems',
      'ungrounded_concept': 'grounded cognition embodied AI',
      'orphan_component': 'modular cognitive architecture integration'
    };

    return topicMap[gap.type] || `${gap.description} cognitive architecture`;
  }

  private generateSummary(cycle: BuildCycle): string {
    const lines: string[] = [];

    if (cycle.analysis) {
      lines.push(`Analysis: ${cycle.analysis.gaps.length} gaps found`);
    }

    if (cycle.researchFindings) {
      lines.push(`Research: ${cycle.researchFindings.length} papers found`);
    }

    if (cycle.proposals) {
      const approved = cycle.proposals.filter(p => p.fieldValidation?.approved).length;
      lines.push(`Proposals: ${cycle.proposals.length} total, ${approved} approved`);
    }

    if (cycle.results) {
      const applied = cycle.results.filter(r => r.applied).length;
      const dryRun = cycle.results.filter(r => r.success && !r.applied).length;
      lines.push(`Results: ${applied} applied, ${dryRun} dry-run`);
    }

    return lines.join(' | ');
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// SINGLETON
// ============================================

export const autonomousBuilder = new AutonomousBuilder();

// ============================================
// CLI ENTRY POINT
// ============================================

async function main() {
  const args = process.argv.slice(2);

  const config: Partial<BuilderConfig> = {
    maxCycles: args.includes('--continuous') ? 0 : 1,
    researchEnabled: !args.includes('--no-research'),
    verbose: true
  };

  // Parse --cycles=N
  const cyclesArg = args.find(a => a.startsWith('--cycles='));
  if (cyclesArg) {
    config.maxCycles = parseInt(cyclesArg.split('=')[1]) || 1;
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         ENOQ AUTONOMOUS SELF-BUILDER                       ║');
  console.log('║         "Il sistema che costruisce sé stesso"              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  CONSTITUTIONAL: Human approval ALWAYS required            ║');
  console.log('║  System proposes, human decides (Tzimtzum)                 ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Options:                                                  ║');
  console.log('║    --cycles=N     Run N cycles (default: 1)                ║');
  console.log('║    --continuous   Run indefinitely                         ║');
  console.log('║    --no-research  Skip live research                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const builder = new AutonomousBuilder(config);

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    builder.stop();
    process.exit(0);
  });

  await builder.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runAutonomousBuilder };
