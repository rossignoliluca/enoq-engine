/**
 * GENESIS SELF-BUILDER: SELF ANALYZER
 *
 * The system that understands itself and identifies gaps.
 *
 * This module:
 * - Analyzes ENOQ's current state
 * - Identifies gaps and opportunities
 * - Compares against theoretical ideals
 * - Prioritizes improvements
 */

import { CodebaseMap, ModuleInfo, codeReader } from './code_reader';
import { CONSTITUTIONAL_ATTRACTORS } from '../attractor';
import { emergeDomains, emergeDimensions, emergeFunctions } from '../grow';

// ============================================
// TYPES
// ============================================

export interface AnalysisResult {
  timestamp: Date;
  codebase: CodebaseSummary;
  gaps: Gap[];
  strengths: Strength[];
  opportunities: Opportunity[];
  alignmentScore: AlignmentScore;
  recommendations: Recommendation[];
}

export interface CodebaseSummary {
  totalLines: number;
  moduleCount: number;
  componentCoverage: ComponentCoverage;
  complexityScore: number;
}

export interface ComponentCoverage {
  attractors: { implemented: number; defined: number };
  domains: { implemented: number; defined: number };
  dimensions: { implemented: number; defined: number };
  functions: { implemented: number; defined: number };
}

export interface Gap {
  id: string;
  type: 'missing' | 'incomplete' | 'misaligned';
  component: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  suggestedFix: string;
}

export interface Strength {
  component: string;
  description: string;
  evidence: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
}

export interface AlignmentScore {
  overall: number; // 0-100
  byPrinciple: {
    withdrawal: number;
    nonPrescription: number;
    rubicon: number;
    autonomy: number;
    transparency: number;
  };
  byDomain: Record<string, number>;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'fix' | 'enhance' | 'refactor' | 'add';
  priority: 'immediate' | 'short-term' | 'long-term';
  estimatedImpact: number; // 1-10
  dependencies: string[];
}

// ============================================
// SELF ANALYZER CLASS
// ============================================

export class SelfAnalyzer {

  /**
   * Perform full self-analysis
   */
  analyze(): AnalysisResult {
    const map = codeReader.mapCodebase();

    const codebase = this.summarizeCodebase(map);
    const gaps = this.identifyGaps(map);
    const strengths = this.identifyStrengths(map);
    const opportunities = this.identifyOpportunities(map, gaps);
    const alignmentScore = this.calculateAlignment(map);
    const recommendations = this.generateRecommendations(gaps, opportunities);

    return {
      timestamp: new Date(),
      codebase,
      gaps,
      strengths,
      opportunities,
      alignmentScore,
      recommendations
    };
  }

  /**
   * Summarize the codebase
   */
  private summarizeCodebase(map: CodebaseMap): CodebaseSummary {
    const domains = emergeDomains();
    const dimensions = emergeDimensions();
    const functions = emergeFunctions();

    // Count implemented vs defined
    const componentCoverage: ComponentCoverage = {
      attractors: {
        implemented: CONSTITUTIONAL_ATTRACTORS.length,
        defined: 5
      },
      domains: {
        implemented: domains.length,
        defined: 17  // Target: H01-H17
      },
      dimensions: {
        implemented: dimensions.length,
        defined: 5
      },
      functions: {
        implemented: functions.length,
        defined: 7
      }
    };

    // Calculate complexity (rough estimate based on lines/file)
    const avgLinesPerFile = map.totalLines / Math.max(1, map.files.length);
    const complexityScore = Math.min(100, avgLinesPerFile / 3);

    return {
      totalLines: map.totalLines,
      moduleCount: map.modules.length,
      componentCoverage,
      complexityScore
    };
  }

  /**
   * Identify gaps in the system
   */
  private identifyGaps(map: CodebaseMap): Gap[] {
    const gaps: Gap[] = [];

    // Check for missing modules
    const requiredModules = ['genesis', 'axis', 'ethics'];
    for (const required of requiredModules) {
      const found = map.modules.find(m => m.name === required);
      if (!found) {
        gaps.push({
          id: `missing_${required}`,
          type: 'missing',
          component: required,
          description: `Module ${required} is not implemented`,
          impact: 'critical',
          suggestedFix: `Create ${required} module with core functionality`
        });
      }
    }

    // Check domain coverage
    const targetDomains = 17;
    const currentDomains = emergeDomains().length;
    if (currentDomains < targetDomains) {
      gaps.push({
        id: 'incomplete_domains',
        type: 'incomplete',
        component: 'domains',
        description: `Only ${currentDomains} of ${targetDomains} domains implemented`,
        impact: 'medium',
        suggestedFix: `Add missing domains: H08-H17`
      });
    }

    // Check for MCP server
    const hasMCP = map.modules.some(m => m.name.includes('mcp'));
    if (!hasMCP) {
      gaps.push({
        id: 'missing_mcp',
        type: 'missing',
        component: 'mcp_server',
        description: 'MCP server not implemented - limits integration with other agents',
        impact: 'medium',
        suggestedFix: 'Implement MCP server for external tool access'
      });
    }

    // Check for persistence
    const hasPersistence = map.files.some(f =>
      f.content.includes('database') ||
      f.content.includes('persist') ||
      f.content.includes('storage')
    );
    if (!hasPersistence) {
      gaps.push({
        id: 'missing_persistence',
        type: 'missing',
        component: 'persistence',
        description: 'No persistence layer - state lost between sessions',
        impact: 'high',
        suggestedFix: 'Implement persistence for user models and system state'
      });
    }

    // Check for real-time web search
    const hasWebSearch = map.files.some(f => f.content.includes('WebSearch'));
    if (!hasWebSearch) {
      gaps.push({
        id: 'missing_web_search',
        type: 'missing',
        component: 'web_search',
        description: 'No direct web search capability',
        impact: 'low',
        suggestedFix: 'Integrate web search for real-time knowledge'
      });
    }

    return gaps;
  }

  /**
   * Identify strengths
   */
  private identifyStrengths(map: CodebaseMap): Strength[] {
    const strengths: Strength[] = [];

    // Check GENESIS implementation
    const genesis = map.modules.find(m => m.name === 'genesis');
    if (genesis && genesis.lineCount > 1000) {
      strengths.push({
        component: 'genesis',
        description: 'Comprehensive field-based architecture',
        evidence: `${genesis.lineCount} lines implementing attractors, energy, field, seed, grow, spawn`
      });
    }

    // Check attractor system
    const hasAttractors = map.files.some(f => f.content.includes('CONSTITUTIONAL_ATTRACTORS'));
    if (hasAttractors) {
      strengths.push({
        component: 'attractors',
        description: 'Constitutional attractors as gravitational field',
        evidence: '5 attractors with varying masses creating curved response space'
      });
    }

    // Check self-reference
    const hasSelfRef = map.files.some(f =>
      f.content.includes('modelSelf') ||
      f.content.includes('quine')
    );
    if (hasSelfRef) {
      strengths.push({
        component: 'self-reference',
        description: 'Self-referential capabilities (strange loop)',
        evidence: 'System can model and describe itself'
      });
    }

    // Check dissipation
    const hasDissipation = map.files.some(f => f.content.includes('dissipation'));
    if (hasDissipation) {
      strengths.push({
        component: 'dissipation',
        description: 'Built-in self-limiting through dissipation',
        evidence: 'System naturally tends toward withdrawal over time'
      });
    }

    return strengths;
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(map: CodebaseMap, gaps: Gap[]): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // High-impact opportunities based on gaps
    for (const gap of gaps.filter(g => g.impact === 'high' || g.impact === 'critical')) {
      opportunities.push({
        id: `fix_${gap.id}`,
        title: `Fix: ${gap.component}`,
        description: gap.suggestedFix,
        benefit: `Addresses ${gap.impact} impact gap`,
        effort: gap.impact === 'critical' ? 'high' : 'medium',
        priority: gap.impact === 'critical' ? 10 : 8
      });
    }

    // Enhancement opportunities
    opportunities.push({
      id: 'add_anthropic',
      title: 'Add Claude/Anthropic connector',
      description: 'Add ability to use Claude models in addition to OpenAI',
      benefit: 'Model flexibility, potentially better alignment with ENOQ principles',
      effort: 'medium',
      priority: 7
    });

    opportunities.push({
      id: 'add_streaming',
      title: 'Add streaming responses',
      description: 'Implement streaming for real-time response generation',
      benefit: 'Better UX, faster perceived response time',
      effort: 'low',
      priority: 6
    });

    opportunities.push({
      id: 'add_hooks',
      title: 'Add hook system',
      description: 'Allow external hooks for pre/post processing',
      benefit: 'Extensibility, integration with other systems',
      effort: 'medium',
      priority: 5
    });

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate alignment with ENOQ principles
   */
  private calculateAlignment(map: CodebaseMap): AlignmentScore {
    const byPrinciple = {
      withdrawal: 0,
      nonPrescription: 0,
      rubicon: 0,
      autonomy: 0,
      transparency: 0
    };

    // Check each principle in the code
    for (const file of map.files) {
      const content = file.content.toLowerCase();

      // Withdrawal
      if (content.includes('withdraw') || content.includes('ritiro')) {
        byPrinciple.withdrawal += 10;
      }

      // Non-prescription
      if (content.includes('prescri') || content.includes('should not')) {
        byPrinciple.nonPrescription += 10;
      }

      // Rubicon
      if (content.includes('rubicon') || content.includes('identity')) {
        byPrinciple.rubicon += 10;
      }

      // Autonomy
      if (content.includes('autonom') || content.includes('independence')) {
        byPrinciple.autonomy += 10;
      }

      // Transparency
      if (content.includes('transparen') || content.includes('framing')) {
        byPrinciple.transparency += 10;
      }
    }

    // Normalize to 0-100
    for (const key of Object.keys(byPrinciple) as (keyof typeof byPrinciple)[]) {
      byPrinciple[key] = Math.min(100, byPrinciple[key]);
    }

    // Calculate overall
    const overall = Object.values(byPrinciple).reduce((sum, v) => sum + v, 0) / 5;

    return {
      overall,
      byPrinciple,
      byDomain: {} // Could be expanded
    };
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(gaps: Gap[], opportunities: Opportunity[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical gaps first
    for (const gap of gaps.filter(g => g.impact === 'critical')) {
      recommendations.push({
        id: `rec_${gap.id}`,
        title: `Fix critical: ${gap.component}`,
        description: gap.suggestedFix,
        type: 'fix',
        priority: 'immediate',
        estimatedImpact: 10,
        dependencies: []
      });
    }

    // High-priority opportunities
    for (const opp of opportunities.filter(o => o.priority >= 8)) {
      recommendations.push({
        id: `rec_${opp.id}`,
        title: opp.title,
        description: opp.description,
        type: 'enhance',
        priority: 'short-term',
        estimatedImpact: opp.priority,
        dependencies: []
      });
    }

    // Long-term improvements
    recommendations.push({
      id: 'rec_full_domains',
      title: 'Implement all 17 domains',
      description: 'Complete domain coverage from H01 to H17',
      type: 'add',
      priority: 'long-term',
      estimatedImpact: 7,
      dependencies: []
    });

    return recommendations;
  }
}

// ============================================
// SINGLETON
// ============================================

export const selfAnalyzer = new SelfAnalyzer();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function analyzeSelf(): AnalysisResult {
  return selfAnalyzer.analyze();
}

export function getGaps(): Gap[] {
  return selfAnalyzer.analyze().gaps;
}

export function getRecommendations(): Recommendation[] {
  return selfAnalyzer.analyze().recommendations;
}
