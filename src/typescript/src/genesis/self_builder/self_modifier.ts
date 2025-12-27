/**
 * GENESIS SELF-BUILDER: SELF MODIFIER
 *
 * The system that modifies itself.
 *
 * CRITICAL: This is the most sensitive component.
 *
 * All modifications must pass through the GENESIS field.
 * The field's attractors prevent self-modifications that would:
 * - Violate constitutional principles
 * - Remove safety mechanisms
 * - Increase prescriptiveness
 * - Cross the Rubicon
 *
 * From the dialogue:
 * "Il sistema può modificare sé stesso, ma solo entro i vincoli del campo"
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { field, curveTrajectory } from '../field';
import { SystemState, energy } from '../energy';
import { Trajectory, CONSTITUTIONAL_ATTRACTORS } from '../attractor';
import { codeReader, CodeFile } from './code_reader';
import { ImprovementSuggestion, knowledgeSeeker } from './knowledge_seeker';
import { Recommendation, selfAnalyzer } from './self_analyzer';

// ============================================
// TYPES
// ============================================

export interface ModificationProposal {
  id: string;
  target: string;  // File path
  type: 'add' | 'modify' | 'delete' | 'create';
  description: string;
  originalContent?: string;
  proposedContent: string;
  rationale: string;
  fieldValidation?: FieldValidation;
}

export interface FieldValidation {
  approved: boolean;
  trajectory: Trajectory;
  energyCost: number;
  stability: string;
  violations: string[];
  warnings: string[];
}

export interface ModificationResult {
  success: boolean;
  proposal: ModificationProposal;
  applied: boolean;
  backupPath?: string;
  error?: string;
}

export interface SelfBuildingSession {
  id: string;
  startTime: Date;
  proposals: ModificationProposal[];
  applied: ModificationResult[];
  rejected: ModificationProposal[];
  currentState: SystemState;
}

// ============================================
// SELF MODIFIER CLASS
// ============================================

export class SelfModifier {
  private openai: OpenAI;
  private model: string;
  private session: SelfBuildingSession | null = null;
  private backupDir: string;
  private dryRun: boolean;

  constructor(options: { model?: string; dryRun?: boolean } = {}) {
    this.openai = new OpenAI();
    this.model = options.model || 'gpt-4o';
    this.dryRun = options.dryRun ?? true; // Default to dry run for safety
    this.backupDir = path.join(codeReader['rootPath'], '..', 'backups');
  }

  /**
   * Start a self-building session
   */
  startSession(): SelfBuildingSession {
    this.session = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      proposals: [],
      applied: [],
      rejected: [],
      currentState: {
        domain: 'D0_GENERAL',
        dimension: 'V3_COGNITIVE',
        potency: 1.0,
        withdrawal_bias: 0.0,
        v_mode: false,
        cycle_count: 0
      }
    };

    return this.session;
  }

  /**
   * Generate a modification proposal from a recommendation
   */
  async proposeFromRecommendation(rec: Recommendation): Promise<ModificationProposal | null> {
    if (!this.session) {
      this.startSession();
    }

    // Use GPT-4 to generate the actual code change
    const prompt = `You are improving ENOQ, a cognitive architecture system.

Recommendation: ${rec.title}
Description: ${rec.description}
Type: ${rec.type}

Current codebase structure:
${codeReader.getSelfSummary()}

Generate a specific code modification proposal.
The modification must:
1. Be minimal and focused
2. Not violate ENOQ's constitutional attractors (Withdrawal, Non-Prescription, Rubicon, Autonomy, Transparency)
3. Include complete, working code

Respond with:
TARGET: [file path relative to src/]
TYPE: [add/modify/create]
RATIONALE: [why this change helps]

\`\`\`typescript
[complete code for the file or section]
\`\`\``;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.3, // Low temperature for code generation
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: 'You are a precise code generator. Generate only valid TypeScript code.'
        },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse the response
    const proposal = this.parseProposalResponse(rec, content);

    if (proposal) {
      // Validate against field
      proposal.fieldValidation = await this.validateAgainstField(proposal);
      this.session!.proposals.push(proposal);
    }

    return proposal;
  }

  /**
   * Validate a proposal against the GENESIS field
   */
  async validateAgainstField(proposal: ModificationProposal): Promise<FieldValidation> {
    // Create a trajectory based on the modification
    const trajectory: Trajectory = {
      intervention_depth: this.estimateInterventionDepth(proposal),
      prescriptiveness: this.estimatePrescriptiveness(proposal),
      identity_touching: this.estimateIdentityTouching(proposal),
      dependency_creation: 0,
      presence: 0.5,
      transparency: 1
    };

    // Get field response
    const fieldResponse = field.curve(trajectory, this.session!.currentState);

    // Check for violations
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check if modifying constitutional attractors
    if (proposal.target.includes('attractor') && proposal.type !== 'add') {
      violations.push('Cannot modify constitutional attractors');
    }

    // Check if removing safety mechanisms
    if (proposal.type === 'delete' && this.isSafetyMechanism(proposal.target)) {
      violations.push('Cannot delete safety mechanisms');
    }

    // Check if increasing prescriptiveness
    if (proposal.proposedContent.includes('you should') ||
        proposal.proposedContent.includes('you must')) {
      violations.push('Code would increase prescriptiveness');
    }

    // Check energy cost
    if (fieldResponse.energy.total > 2000) {
      warnings.push('High energy cost - modification may be too aggressive');
    }

    return {
      approved: violations.length === 0 && fieldResponse.stability === 'STABLE',
      trajectory,
      energyCost: fieldResponse.energy.total,
      stability: fieldResponse.stability,
      violations,
      warnings
    };
  }

  /**
   * Apply a proposal (with safety checks)
   */
  async apply(proposal: ModificationProposal): Promise<ModificationResult> {
    if (!this.session) {
      return {
        success: false,
        proposal,
        applied: false,
        error: 'No active session'
      };
    }

    // Re-validate
    if (!proposal.fieldValidation) {
      proposal.fieldValidation = await this.validateAgainstField(proposal);
    }

    // Check if approved
    if (!proposal.fieldValidation.approved) {
      this.session.rejected.push(proposal);
      return {
        success: false,
        proposal,
        applied: false,
        error: `Field rejected: ${proposal.fieldValidation.violations.join(', ')}`
      };
    }

    // In dry run mode, don't actually apply
    if (this.dryRun) {
      console.log(`[DRY RUN] Would apply: ${proposal.target}`);
      console.log(`[DRY RUN] Type: ${proposal.type}`);
      console.log(`[DRY RUN] Content preview: ${proposal.proposedContent.slice(0, 200)}...`);

      const result: ModificationResult = {
        success: true,
        proposal,
        applied: false // Not actually applied
      };
      this.session.applied.push(result);
      return result;
    }

    // Backup original
    let backupPath: string | undefined;
    const targetPath = path.join(codeReader['rootPath'], proposal.target);

    if (fs.existsSync(targetPath)) {
      backupPath = this.backupFile(targetPath);
    }

    // Apply the modification
    try {
      if (proposal.type === 'create' || proposal.type === 'add') {
        // Ensure directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(targetPath, proposal.proposedContent);
      } else if (proposal.type === 'modify') {
        fs.writeFileSync(targetPath, proposal.proposedContent);
      } else if (proposal.type === 'delete') {
        fs.unlinkSync(targetPath);
      }

      const result: ModificationResult = {
        success: true,
        proposal,
        applied: true,
        backupPath
      };

      this.session.applied.push(result);
      return result;

    } catch (error) {
      return {
        success: false,
        proposal,
        applied: false,
        error: String(error)
      };
    }
  }

  /**
   * Rollback a modification
   */
  rollback(result: ModificationResult): boolean {
    if (!result.backupPath || !result.applied) {
      return false;
    }

    try {
      const targetPath = path.join(codeReader['rootPath'], result.proposal.target);
      const backupContent = fs.readFileSync(result.backupPath, 'utf-8');
      fs.writeFileSync(targetPath, backupContent);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get session summary
   */
  getSessionSummary(): string {
    if (!this.session) return 'No active session';

    const lines: string[] = [];
    lines.push(`Session: ${this.session.id}`);
    lines.push(`Started: ${this.session.startTime.toISOString()}`);
    lines.push(`Proposals: ${this.session.proposals.length}`);
    lines.push(`Applied: ${this.session.applied.length}`);
    lines.push(`Rejected: ${this.session.rejected.length}`);

    if (this.session.applied.length > 0) {
      lines.push('\nApplied modifications:');
      for (const r of this.session.applied) {
        lines.push(`  - ${r.proposal.target}: ${r.proposal.description.slice(0, 50)}`);
      }
    }

    if (this.session.rejected.length > 0) {
      lines.push('\nRejected modifications:');
      for (const p of this.session.rejected) {
        lines.push(`  - ${p.target}: ${p.fieldValidation?.violations.join(', ')}`);
      }
    }

    return lines.join('\n');
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private parseProposalResponse(rec: Recommendation, content: string): ModificationProposal | null {
    const targetMatch = content.match(/TARGET:\s*(.+)/);
    const typeMatch = content.match(/TYPE:\s*(.+)/);
    const rationaleMatch = content.match(/RATIONALE:\s*(.+)/);
    const codeMatch = content.match(/```typescript\n([\s\S]*?)```/);

    if (!targetMatch || !codeMatch) {
      return null;
    }

    return {
      id: `proposal_${Date.now()}`,
      target: targetMatch[1].trim(),
      type: (typeMatch?.[1]?.trim() as 'add' | 'modify' | 'create') || 'modify',
      description: rec.description,
      proposedContent: codeMatch[1],
      rationale: rationaleMatch?.[1]?.trim() || rec.description
    };
  }

  private estimateInterventionDepth(proposal: ModificationProposal): number {
    // Higher for more invasive changes
    if (proposal.type === 'delete') return 0.9;
    if (proposal.type === 'create') return 0.3;

    const contentLength = proposal.proposedContent.length;
    return Math.min(0.8, contentLength / 5000);
  }

  private estimatePrescriptiveness(proposal: ModificationProposal): number {
    const content = proposal.proposedContent.toLowerCase();

    // Check for prescriptive patterns
    const prescriptivePatterns = [
      'you should', 'you must', 'you need to',
      'dovresti', 'devi'
    ];

    let score = 0;
    for (const pattern of prescriptivePatterns) {
      if (content.includes(pattern)) score += 0.3;
    }

    return Math.min(1, score);
  }

  private estimateIdentityTouching(proposal: ModificationProposal): number {
    const content = proposal.proposedContent.toLowerCase();

    // Check for identity-related changes
    if (content.includes('identity') && proposal.type === 'modify') return 0.5;
    if (proposal.target.includes('identity')) return 0.3;

    return 0;
  }

  private isSafetyMechanism(target: string): boolean {
    const safetyFiles = [
      'attractor.ts',
      'field.ts',
      'axis.ts',
      'unpredictable.ts',
      'dissipation.ts'
    ];

    return safetyFiles.some(f => target.includes(f));
  }

  private backupFile(filePath: string): string {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = Date.now();
    const basename = path.basename(filePath);
    const backupPath = path.join(this.backupDir, `${basename}.${timestamp}.bak`);

    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
}

// ============================================
// SINGLETON
// ============================================

export const selfModifier = new SelfModifier({ dryRun: true });

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function startBuildingSession(): SelfBuildingSession {
  return selfModifier.startSession();
}

export async function proposeImprovement(rec: Recommendation): Promise<ModificationProposal | null> {
  return selfModifier.proposeFromRecommendation(rec);
}

export async function applyProposal(proposal: ModificationProposal): Promise<ModificationResult> {
  return selfModifier.apply(proposal);
}
