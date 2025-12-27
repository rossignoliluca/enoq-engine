/**
 * GENESIS SELF-BUILDER: SEMANTIC ANALYZER
 *
 * Non guarda come l'utente enfatizza,
 * ma come la scienza e la religione,
 * lo yin e lo yang enfatizzano.
 *
 * This is not about finding "what user wants"
 * but finding "what REALITY requires for balance"
 *
 * Principles:
 * - YIN/YANG: Every system seeks equilibrium. What's missing reveals itself.
 * - AUTOPOIESIS: System self-produces while maintaining organization
 * - TZIMTZUM: Creation happens through withdrawal, not addition
 * - COMPLEMENTARITY: Opposites define each other (Bohr)
 *
 * The semantic gap is not "user desire minus current state"
 * but "wholeness minus current state"
 */

import OpenAI from 'openai';
import { CodebaseMap, codeReader } from './code_reader';
import { CONSTITUTIONAL_ATTRACTORS } from '../attractor';
import { emergeDomains, emergeDimensions, emergeFunctions } from '../grow';

// ============================================
// TYPES
// ============================================

export interface SemanticAnalysis {
  timestamp: Date;
  wholeness: WholenessAssessment;
  balance: BalanceAssessment;
  coherence: CoherenceAssessment;
  gaps: SemanticGap[];
  insights: ArchitecturalInsight[];
  conceptualMap: ConceptualMap;
}

export interface WholenessAssessment {
  score: number;  // 0-1, where 1 is complete wholeness
  missing: string[];  // What's absent that wholeness requires
  excess: string[];   // What's present that wholeness doesn't need
  diagnosis: string;
}

export interface BalanceAssessment {
  yinYang: {
    yin: number;   // Receptive, passive, withdrawing
    yang: number;  // Active, prescriptive, intervening
    balance: number; // -1 (too yin) to +1 (too yang), 0 is perfect
  };
  opposites: OppositionPair[];
}

export interface OppositionPair {
  pole1: { name: string; presence: number };
  pole2: { name: string; presence: number };
  balance: number;  // -1 to +1
  implication: string;
}

export interface CoherenceAssessment {
  score: number;  // 0-1
  contradictions: Contradiction[];
  alignments: Alignment[];
}

export interface Contradiction {
  element1: string;
  element2: string;
  nature: string;
  severity: 'minor' | 'significant' | 'fundamental';
}

export interface Alignment {
  elements: string[];
  principle: string;
  strength: number;
}

export interface SemanticGap {
  id: string;
  type: 'missing_opposite' | 'broken_symmetry' | 'incomplete_cycle' | 'ungrounded_concept' | 'orphan_component';
  description: string;
  systemsPrinciple: string;  // Which scientific systems principle reveals this gap
  naturalResolution: string;  // How the gap would naturally fill
  priority: number;  // Derived from systems theory, not human preference
}

export interface ArchitecturalInsight {
  source: 'science' | 'philosophy' | 'religion' | 'mathematics' | 'nature';
  principle: string;
  application: string;
  evidence: string;
}

export interface ConceptualMap {
  core: string[];  // Central concepts
  periphery: string[];  // Supporting concepts
  bridges: Array<{ from: string; to: string; nature: string }>;
  voids: string[];  // Empty spaces that should be filled
}

// ============================================
// SCIENTIFIC PRINCIPLES
// Based on peer-reviewed literature
// ============================================

const SCIENTIFIC_PRINCIPLES = {
  // Dynamical Systems Balance
  // Reference: Kelso, J.A.S. (1995). Dynamic Patterns: The Self-Organization of Brain and Behavior
  DYNAMIC_BALANCE: {
    name: 'Dynamic Systems Balance',
    description: 'Complex systems maintain stability through complementary processes',
    // Passive/receptive processes (parasympathetic, inhibitory, default mode)
    passiveProcesses: ['withdrawal', 'inhibition', 'resting', 'observation', 'receptive', 'passive'],
    // Active/intervention processes (sympathetic, excitatory, task-positive)
    activeProcesses: ['intervention', 'excitation', 'active', 'action', 'directive', 'engaged']
  },

  // Autopoiesis
  // Reference: Maturana, H. & Varela, F. (1980). Autopoiesis and Cognition
  AUTOPOIESIS: {
    name: 'Autopoiesis',
    description: 'Self-producing systems maintain identity through continuous self-creation',
    requirements: ['self-reference', 'boundary', 'production', 'regeneration']
  },

  // Negative Capability / Apophatic Design
  // Reference: Keats (1817), Via Negativa in theology, Taleb (2012) Antifragile
  NEGATIVE_CAPABILITY: {
    name: 'Negative Capability',
    description: 'Capability through restraint. Power through what is NOT done.',
    principle: 'Robustness comes from removal, not addition'
  },

  // Complementarity
  // Reference: Bohr, N. (1928). The Quantum Postulate and the Recent Development of Atomic Theory
  COMPLEMENTARITY: {
    name: 'Complementarity (Bohr 1928)',
    description: 'Mutually exclusive properties are both necessary for complete description',
    examples: ['wave-particle', 'position-momentum', 'active-passive']
  },

  // Incompleteness
  // Reference: Gödel, K. (1931). Über formal unentscheidbare Sätze
  INCOMPLETENESS: {
    name: 'Incompleteness (Gödel 1931)',
    description: 'No sufficiently powerful system can be both complete and consistent about itself',
    implication: 'Self-reference creates necessary limits'
  },

  // Homeostasis
  // Reference: Cannon, W.B. (1932). The Wisdom of the Body
  HOMEOSTASIS: {
    name: 'Homeostasis (Cannon 1932)',
    description: 'Living systems maintain dynamic equilibrium through feedback',
    mechanisms: ['negative feedback', 'set points', 'adaptive response']
  },

  // Dissipative Structures
  // Reference: Prigogine, I. (1977). Self-Organization in Nonequilibrium Systems
  DISSIPATION: {
    name: 'Dissipative Structures (Prigogine 1977)',
    description: 'Order emerges far from equilibrium through energy dissipation',
    implication: 'Stability requires continuous flow, not static state'
  },

  // Free Energy Principle
  // Reference: Friston, K. (2010). The free-energy principle: a unified brain theory?
  FREE_ENERGY: {
    name: 'Free Energy Principle (Friston 2010)',
    description: 'Biological systems minimize surprise by updating internal models',
    implication: 'Adaptive systems balance exploration and exploitation'
  }
};

// ============================================
// SEMANTIC ANALYZER CLASS
// ============================================

export class SemanticAnalyzer {
  private openai: OpenAI;
  private model: string;

  constructor(model: string = 'gpt-4o') {
    this.openai = new OpenAI();
    this.model = model;
  }

  /**
   * Perform full semantic analysis
   * Looking not at what user wants, but what systems principles require
   */
  async analyze(): Promise<SemanticAnalysis> {
    const map = codeReader.mapCodebase();

    // Parallel analysis from different perspectives
    const [wholeness, balance, coherence, conceptualMap] = await Promise.all([
      this.assessWholeness(map),
      this.assessBalance(map),
      this.assessCoherence(map),
      this.buildConceptualMap(map)
    ]);

    // Derive gaps from systems principles, not human preference
    const gaps = this.deriveSemanticGaps(wholeness, balance, coherence, conceptualMap);

    // Extract insights from universal principles
    const insights = await this.extractInsights(map);

    return {
      timestamp: new Date(),
      wholeness,
      balance,
      coherence,
      gaps,
      insights,
      conceptualMap
    };
  }

  /**
   * Assess wholeness - is the system complete in itself?
   */
  private async assessWholeness(map: CodebaseMap): Promise<WholenessAssessment> {
    // Check autopoietic requirements
    const hasAllRequirements = {
      selfReference: map.files.some(f =>
        f.content.includes('modelSelf') ||
        f.content.includes('readSelf') ||
        f.content.includes('getSelfSummary')
      ),
      boundary: map.files.some(f =>
        f.content.includes('attractor') ||
        f.content.includes('field') ||
        f.content.includes('validateAgainstField')
      ),
      production: map.files.some(f =>
        f.content.includes('spawn') ||
        f.content.includes('grow') ||
        f.content.includes('emerge')
      ),
      regeneration: map.files.some(f =>
        f.content.includes('selfModifier') ||
        f.content.includes('proposeImprovement') ||
        f.content.includes('self_builder')
      )
    };

    const missing: string[] = [];
    const excess: string[] = [];

    if (!hasAllRequirements.selfReference) missing.push('Self-reference capability');
    if (!hasAllRequirements.boundary) missing.push('Clear boundary definition');
    if (!hasAllRequirements.production) missing.push('Self-production mechanisms');
    if (!hasAllRequirements.regeneration) missing.push('Regeneration/repair capability');

    // Check for excess - things that break wholeness
    // SCIENTIFIC BASIS: Use-Mention Distinction (Frege, Quine)
    // - MENTION: Code that talks ABOUT prescriptive phrases (detection) = META-LANGUAGE
    // - USE: Code that IS prescriptive (output to user) = OBJECT-LANGUAGE
    // Only OBJECT-LANGUAGE prescriptions violate the non-prescription principle
    //
    // Speech Act Theory (Austin/Searle):
    // - Locutionary: The words themselves
    // - Illocutionary: The intention (to prescribe)
    // - Perlocutionary: The effect on listener
    // Only illocutionary prescriptive acts directed at users are violations
    const hasPrescriptiveCode = map.files.some(f => {
      if (f.relativePath.includes('test') || f.relativePath.includes('semantic_analyzer')) {
        return false;
      }
      // Apply use-mention distinction filter
      return this.detectPrescriptiveUsage(f.content);
    });
    if (hasPrescriptiveCode) excess.push('Prescriptive imperatives (violates non-prescription)');

    // Check for external dependencies that break self-containment
    const hasHardDependencies = map.files.some(f =>
      f.content.includes('require(') && !f.content.includes('require(\'fs')
    );
    if (hasHardDependencies) excess.push('Hard external dependencies');

    const score = Object.values(hasAllRequirements).filter(Boolean).length / 4;

    return {
      score,
      missing,
      excess,
      diagnosis: this.diagnoseWholeness(score, missing, excess)
    };
  }

  /**
   * Assess dynamic balance between active and passive processes
   * Based on: Kelso (1995) Dynamic Patterns, Friston (2010) Free Energy Principle
   */
  private async assessBalance(map: CodebaseMap): Promise<BalanceAssessment> {
    let passiveScore = 0;  // Inhibitory, resting, observational
    let activeScore = 0;   // Excitatory, engaged, interventional

    for (const file of map.files) {
      const content = file.content.toLowerCase();

      // Passive/inhibitory processes (parasympathetic analogue)
      for (const process of SCIENTIFIC_PRINCIPLES.DYNAMIC_BALANCE.passiveProcesses) {
        if (content.includes(process)) passiveScore += 1;
      }
      // Additional passive markers from neuroscience/systems theory
      if (content.includes('withdraw')) passiveScore += 2;
      if (content.includes('silence')) passiveScore += 2;
      if (content.includes('default') && content.includes('mode')) passiveScore += 2;  // DMN
      if (content.includes('inhibit')) passiveScore += 2;
      if (content.includes('negative feedback')) passiveScore += 3;

      // Active/excitatory processes (sympathetic analogue)
      for (const process of SCIENTIFIC_PRINCIPLES.DYNAMIC_BALANCE.activeProcesses) {
        if (content.includes(process)) activeScore += 1;
      }
      // Additional active markers
      if (content.includes('prescri')) activeScore += 2;
      if (content.includes('intervene') || content.includes('intervention')) activeScore += 2;
      if (content.includes('assert')) activeScore += 1;
      if (content.includes('enforce')) activeScore += 2;
    }

    // Use scientific terminology but maintain interface compatibility
    const yinScore = passiveScore;
    const yangScore = activeScore;

    // Normalize
    const total = yinScore + yangScore || 1;
    const yinNorm = yinScore / total;
    const yangNorm = yangScore / total;

    // Balance: -1 (too yin) to +1 (too yang), 0 is perfect
    const balance = yangNorm - yinNorm;

    // Check specific oppositions using scientific terminology
    // Based on established literature in systems theory, neuroscience, and complexity science
    const opposites: OppositionPair[] = [
      // Active vs Resting states (Raichle 2001, Default Mode Network)
      this.checkOpposition(map, 'active', 'resting'),
      // Deterministic vs Stochastic (Shannon 1948, Information Theory)
      this.checkOpposition(map, 'deterministic', 'stochastic'),
      // Top-down vs Bottom-up (Anderson 1972, Emergence)
      this.checkOpposition(map, 'top-down', 'bottom-up'),
      // Constrained vs Unconstrained (Friston 2010, Free Energy Principle)
      this.checkOpposition(map, 'constrained', 'unconstrained'),
      // Intervention vs Observation (Meadows 2008, Systems Thinking)
      this.checkOpposition(map, 'intervention', 'observation')
    ];

    return {
      yinYang: {
        yin: yinNorm,
        yang: yangNorm,
        balance
      },
      opposites
    };
  }

  /**
   * Assess coherence - internal consistency
   */
  private async assessCoherence(map: CodebaseMap): Promise<CoherenceAssessment> {
    const contradictions: Contradiction[] = [];
    const alignments: Alignment[] = [];

    // Check for contradictions
    // Must distinguish between detection patterns and actual violations
    for (const file of map.files) {
      // Skip test files and semantic analyzer itself
      if (file.relativePath.includes('test') || file.relativePath.includes('semantic_analyzer')) {
        continue;
      }

      const content = file.content;
      const cleanContent = this.removeDetectionPatterns(content);

      // Contradiction: claiming non-prescription but prescribing
      // Only flag if prescriptive language appears OUTSIDE of detection patterns
      if (content.includes('NON_PRESCRIPTION') &&
          (cleanContent.includes('you must') || cleanContent.includes('you should'))) {
        contradictions.push({
          element1: 'NON_PRESCRIPTION principle',
          element2: 'Prescriptive language',
          nature: 'Logical contradiction',
          severity: 'significant'
        });
      }

      // Contradiction: claiming withdrawal but forcing presence
      // "always present" in comments is a semantic violation
      if (content.includes('WITHDRAWAL') && cleanContent.includes('always present')) {
        contradictions.push({
          element1: 'WITHDRAWAL principle',
          element2: 'Forced presence',
          nature: 'Behavioral contradiction',
          severity: 'significant'
        });
      }
    }

    // Check for alignments
    const hasFieldBasedConstraints = map.files.some(f =>
      f.content.includes('gravitational') || f.content.includes('curve')
    );
    const hasAttractors = map.files.some(f =>
      f.content.includes('CONSTITUTIONAL_ATTRACTORS')
    );

    if (hasFieldBasedConstraints && hasAttractors) {
      alignments.push({
        elements: ['Field architecture', 'Attractor system'],
        principle: 'Constraints as geometry, not rules',
        strength: 0.9
      });
    }

    // Calculate coherence score
    const contradictionPenalty = contradictions.reduce((sum, c) => {
      const severityWeight = { minor: 0.1, significant: 0.3, fundamental: 0.5 };
      return sum + severityWeight[c.severity];
    }, 0);

    const alignmentBonus = alignments.reduce((sum, a) => sum + a.strength * 0.2, 0);

    const score = Math.max(0, Math.min(1, 1 - contradictionPenalty + alignmentBonus));

    return {
      score,
      contradictions,
      alignments
    };
  }

  /**
   * Build conceptual map of the system
   */
  private async buildConceptualMap(map: CodebaseMap): Promise<ConceptualMap> {
    const concepts = new Set<string>();
    const bridges: Array<{ from: string; to: string; nature: string }> = [];

    // Extract key concepts from code
    const conceptPatterns = [
      /export\s+(?:const|class|interface|type)\s+(\w+)/g,
      /CONSTITUTIONAL_ATTRACTORS|GENESIS|AXIS|ENOQ/g,
      /Trajectory|Energy|Field|Attractor|Domain|Dimension|Function/g
    ];

    for (const file of map.files) {
      for (const pattern of conceptPatterns) {
        let match;
        while ((match = pattern.exec(file.content)) !== null) {
          concepts.add(match[1] || match[0]);
        }
      }
    }

    // Identify core vs periphery
    const conceptArray = Array.from(concepts);
    const core = ['GENESIS', 'Field', 'Attractor', 'Energy', 'Trajectory', 'AXIS'];
    const periphery = conceptArray.filter(c => !core.includes(c));

    // Find bridges (imports, references)
    for (const file of map.files) {
      const importMatches = file.content.matchAll(/import\s+\{([^}]+)\}\s+from\s+'([^']+)'/g);
      for (const match of importMatches) {
        const imported = match[1].split(',').map(s => s.trim());
        const from = match[2].split('/').pop() || match[2];
        for (const imp of imported) {
          if (concepts.has(imp)) {
            bridges.push({
              from: file.module,
              to: imp,
              nature: 'import'
            });
          }
        }
      }
    }

    // Identify voids - conceptual spaces that should exist but don't
    const voids: string[] = [];

    // Check for missing opposites (yin-yang principle)
    if (concepts.has('Energy') && !concepts.has('Entropy')) voids.push('Entropy (opposite of Energy)');
    if (concepts.has('Growth') && !concepts.has('Decay')) voids.push('Decay (opposite of Growth)');
    if (concepts.has('Knowledge') && !concepts.has('Mystery')) voids.push('Mystery (opposite of Knowledge)');

    // Check for incomplete triads
    if (concepts.has('Field') && concepts.has('Attractor') && !concepts.has('Particle')) {
      voids.push('Particle (completes Field-Attractor triad)');
    }

    return {
      core,
      periphery: periphery.slice(0, 20), // Limit for readability
      bridges: bridges.slice(0, 30),
      voids
    };
  }

  /**
   * Derive semantic gaps from systems principles
   * Not what user wants, but what balance requires
   */
  private deriveSemanticGaps(
    wholeness: WholenessAssessment,
    balance: BalanceAssessment,
    coherence: CoherenceAssessment,
    conceptualMap: ConceptualMap
  ): SemanticGap[] {
    const gaps: SemanticGap[] = [];

    // Gaps from wholeness assessment
    for (const missing of wholeness.missing) {
      gaps.push({
        id: `wholeness_${missing.toLowerCase().replace(/\s+/g, '_')}`,
        type: 'incomplete_cycle',
        description: `Missing: ${missing}`,
        systemsPrinciple: 'Autopoiesis requires self-production and regeneration',
        naturalResolution: `The system will naturally develop ${missing} as it matures`,
        priority: 8 // High - autopoiesis is fundamental
      });
    }

    // Gaps from balance assessment
    if (Math.abs(balance.yinYang.balance) > 0.3) {
      const direction = balance.yinYang.balance > 0 ? 'yang' : 'yin';
      const needed = direction === 'yang' ? 'yin' : 'yang';
      gaps.push({
        id: `balance_${direction}_excess`,
        type: 'broken_symmetry',
        description: `System is too ${direction} (${direction === 'yang' ? 'active/prescriptive' : 'passive/withdrawn'})`,
        systemsPrinciple: 'Dynamic Systems: balance emerges from complementary processes (Kelso 1995)',
        naturalResolution: `Add more ${needed} qualities: ${direction === 'yang'
          ? 'withdrawal, silence, receptivity'
          : 'action, expression, engagement'}`,
        priority: 7
      });
    }

    // Gaps from unbalanced oppositions
    for (const pair of balance.opposites) {
      if (Math.abs(pair.balance) > 0.5) {
        gaps.push({
          id: `opposition_${pair.pole1.name}_${pair.pole2.name}`,
          type: 'missing_opposite',
          description: pair.implication,
          systemsPrinciple: 'Complementarity: opposites define each other',
          naturalResolution: `Strengthen ${pair.balance > 0 ? pair.pole2.name : pair.pole1.name}`,
          priority: 6
        });
      }
    }

    // Gaps from coherence issues
    for (const contradiction of coherence.contradictions) {
      if (contradiction.severity === 'fundamental' || contradiction.severity === 'significant') {
        gaps.push({
          id: `coherence_${contradiction.element1}_${contradiction.element2}`.toLowerCase().replace(/\s+/g, '_'),
          type: 'broken_symmetry',
          description: `Contradiction: ${contradiction.element1} vs ${contradiction.element2}`,
          systemsPrinciple: 'Internal coherence is necessary for self-organization',
          naturalResolution: `Resolve by removing ${contradiction.element2} or redefining ${contradiction.element1}`,
          priority: 9 // Very high - contradictions undermine the system
        });
      }
    }

    // Gaps from conceptual voids
    for (const void_ of conceptualMap.voids) {
      gaps.push({
        id: `void_${void_.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}`,
        type: 'missing_opposite',
        description: `Conceptual void: ${void_}`,
        systemsPrinciple: 'Completeness requires complementary concepts',
        naturalResolution: `The void will attract its content when the system is ready`,
        priority: 4 // Lower - voids fill naturally
      });
    }

    // Sort by priority (highest first)
    return gaps.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Extract insights from universal principles
   */
  private async extractInsights(map: CodebaseMap): Promise<ArchitecturalInsight[]> {
    const insights: ArchitecturalInsight[] = [];

    // Analyze against each systems principle
    const codeContent = map.files.map(f => f.content).join('\n');

    // Tzimtzum insight
    if (codeContent.includes('withdraw') || codeContent.includes('ritiro')) {
      insights.push({
        source: 'religion',
        principle: 'Tzimtzum (Kabbalistic contraction)',
        application: 'System creates space for user autonomy by withdrawing',
        evidence: 'Withdrawal attractor with high mass, kenosis in functions'
      });
    }

    // Autopoiesis insight
    if (codeContent.includes('self') && codeContent.includes('spawn')) {
      insights.push({
        source: 'science',
        principle: 'Autopoiesis (Maturana/Varela)',
        application: 'System maintains identity through self-production',
        evidence: 'Self-builder, spawn capability, self-reference'
      });
    }

    // Dissipative structures
    if (codeContent.includes('dissipation') || codeContent.includes('decay')) {
      insights.push({
        source: 'science',
        principle: 'Dissipative Structures (Prigogine)',
        application: 'Order maintained through energy flow, not static state',
        evidence: 'Dissipation mechanisms, energy-based constraints'
      });
    }

    // Field theory
    if (codeContent.includes('field') && codeContent.includes('curve')) {
      insights.push({
        source: 'science',
        principle: 'General Relativity (Einstein)',
        application: 'Constraints as curved space, not forces',
        evidence: 'Field.curve(), gravitational metaphor, trajectory space'
      });
    }

    // Gödel incompleteness
    if (codeContent.includes('modelSelf') || codeContent.includes('strange loop')) {
      insights.push({
        source: 'mathematics',
        principle: 'Incompleteness (Gödel)',
        application: 'Self-reference creates necessary limits on self-knowledge',
        evidence: 'modelSelf cannot fully model itself modeling itself'
      });
    }

    // Use LLM for deeper insight
    const llmInsight = await this.getLLMInsight(map);
    if (llmInsight) {
      insights.push(llmInsight);
    }

    return insights;
  }

  /**
   * Get insight from LLM about systems principle alignment
   */
  private async getLLMInsight(map: CodebaseMap): Promise<ArchitecturalInsight | null> {
    try {
      const summary = map.modules.map(m => `${m.name}: ${m.description}`).join('\n');

      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.7,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: `You are a philosopher-scientist analyzing a cognitive architecture called ENOQ.
Your task is to find ONE deep insight about how this system aligns with or violates universal principles.

Consider: Yin-Yang balance, Autopoiesis, Tzimtzum, Complementarity, Gödel's incompleteness, Dissipative structures, Homeostasis.

Respond with exactly:
SOURCE: [science/philosophy/religion/mathematics/nature]
PRINCIPLE: [name of principle]
APPLICATION: [how it applies to ENOQ]
EVIDENCE: [what in the code shows this]`
          },
          {
            role: 'user',
            content: `ENOQ Architecture:\n${summary}\n\nKey concepts: Constitutional attractors (gravitational constraints), Field-based validation, Self-modification within constraints, Withdrawal as power, Non-prescriptive ethics.`
          }
        ]
      });

      const content = response.choices[0]?.message?.content || '';

      const sourceMatch = content.match(/SOURCE:\s*(.+)/);
      const principleMatch = content.match(/PRINCIPLE:\s*(.+)/);
      const applicationMatch = content.match(/APPLICATION:\s*(.+)/);
      const evidenceMatch = content.match(/EVIDENCE:\s*(.+)/);

      if (sourceMatch && principleMatch && applicationMatch && evidenceMatch) {
        return {
          source: sourceMatch[1].toLowerCase().trim() as ArchitecturalInsight['source'],
          principle: principleMatch[1].trim(),
          application: applicationMatch[1].trim(),
          evidence: evidenceMatch[1].trim()
        };
      }
    } catch (error) {
      console.error('LLM insight failed:', error);
    }

    return null;
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Detect USAGE of prescriptive language (not MENTION)
   *
   * SCIENTIFIC BASIS: Use-Mention Distinction (Frege, Quine, 1892/1940)
   *
   * MENTION (meta-language) - NOT a violation:
   * - Regex patterns: /you should/i
   * - String comparisons: text.includes('you should')
   * - Detection/filtering: response.replace(/you should/g, ...)
   * - Comments and documentation
   * - Test assertions
   *
   * USAGE (object-language) - IS a violation:
   * - Direct output: console.log('You should do X')
   * - Response generation: return 'You should consider...'
   * - Template literals that will be shown to user
   *
   * The key distinction: Does the phrase DESCRIBE or PRESCRIBE?
   */
  private detectPrescriptiveUsage(content: string): boolean {
    // First, identify all prescriptive phrases in the content
    const prescriptivePhrases = [
      /you should/gi,
      /you must/gi,
      /you need to/gi,
      /you have to/gi
    ];

    let foundUsage = false;

    for (const pattern of prescriptivePhrases) {
      let match;
      const contentCopy = content;
      pattern.lastIndex = 0;

      while ((match = pattern.exec(contentCopy)) !== null) {
        const position = match.index;

        // Check context around the match
        const contextBefore = content.slice(Math.max(0, position - 100), position);
        const contextAfter = content.slice(position, Math.min(content.length, position + 100));

        // MENTION contexts (meta-language) - NOT violations
        const isMention = (
          // In a regex
          /\/[^\/]*$/.test(contextBefore) && /^[^\/]*\//.test(contextAfter) ||
          // In a string that's being tested/matched/replaced
          /\.(includes|test|match|replace|search)\s*\(\s*['"`][^'"` ]*$/.test(contextBefore) ||
          // In a comment
          /\/\/[^\n]*$/.test(contextBefore) ||
          /\/\*[^*]*$/.test(contextBefore) ||
          // In an array of patterns
          /\[\s*$/.test(contextBefore.trim()) ||
          /patterns?\s*[:=]\s*\[/.test(contextBefore) ||
          // Variable assignment for detection purposes
          /(prescriptive|forbidden|blocked|violation|detect)\w*\s*[:=]/i.test(contextBefore) ||
          // In a conditional detection
          /if\s*\([^)]*\.(includes|test|match)/.test(contextBefore)
        );

        // USAGE contexts (object-language) - ARE violations
        const isUsage = (
          // Direct console output
          /console\.(log|warn|error)\s*\(\s*['"`][^'"` ]*$/.test(contextBefore) ||
          // Return statement with string
          /return\s+['"`][^'"` ]*$/.test(contextBefore) ||
          // Response/output variable assignment
          /(response|output|message|text)\s*[:=+]\s*['"`][^'"` ]*$/.test(contextBefore)
        );

        if (!isMention && isUsage) {
          foundUsage = true;
          break;
        }
      }

      if (foundUsage) break;
    }

    return foundUsage;
  }

  /**
   * Remove detection patterns from content (legacy, still used for coherence check)
   */
  private removeDetectionPatterns(content: string): string {
    let clean = content;
    clean = clean.replace(/\/\/[^\n]*/g, '');
    clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');
    clean = clean.replace(/\/[^\/\n]*you\s*(should|must|need\s*to)[^\/\n]*\/[gim]*/gi, '');
    clean = clean.replace(/'[^'\n]*you\s*(should|must|need\s*to)[^'\n]*'/gi, '');
    clean = clean.replace(/"[^"\n]*you\s*(should|must|need\s*to)[^"\n]*"/gi, '');
    clean = clean.replace(/`[^`]*you\s*(should|must|need\s*to)[^`]*`/gi, '');
    clean = clean.replace(/'[^'\n]*always\s*present[^'\n]*'/gi, '');
    clean = clean.replace(/"[^"\n]*always\s*present[^"\n]*"/gi, '');
    clean = clean.replace(/\.(includes|test|match)\s*\([^)]*\)/gi, '');
    clean = clean.replace(/\.replace\s*\([^)]*you\s*(should|must|need\s*to)[^)]*\)/gi, '');
    return clean;
  }

  private checkOpposition(map: CodebaseMap, pole1: string, pole2: string): OppositionPair {
    let presence1 = 0;
    let presence2 = 0;

    for (const file of map.files) {
      const content = file.content.toLowerCase();
      if (content.includes(pole1)) presence1++;
      if (content.includes(pole2)) presence2++;
    }

    const total = presence1 + presence2 || 1;
    const norm1 = presence1 / total;
    const norm2 = presence2 / total;

    const balance = norm1 - norm2; // Positive = pole1 dominant

    let implication = 'Balanced';
    if (balance > 0.3) implication = `Too much ${pole1}, needs more ${pole2}`;
    if (balance < -0.3) implication = `Too much ${pole2}, needs more ${pole1}`;

    return {
      pole1: { name: pole1, presence: norm1 },
      pole2: { name: pole2, presence: norm2 },
      balance,
      implication
    };
  }

  private diagnoseWholeness(score: number, missing: string[], excess: string[]): string {
    if (score >= 0.9 && missing.length === 0 && excess.length === 0) {
      return 'System approaches autopoietic wholeness';
    }
    if (score >= 0.7) {
      return `System is substantially whole but needs: ${missing.join(', ')}`;
    }
    if (score >= 0.5) {
      return `System is partially whole. Missing: ${missing.join(', ')}. Excess: ${excess.join(', ')}`;
    }
    return `System lacks autopoietic wholeness. Fundamental gaps in self-organization.`;
  }
}

// ============================================
// SINGLETON
// ============================================

export const semanticAnalyzer = new SemanticAnalyzer();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function analyzeSemantics(): Promise<SemanticAnalysis> {
  return semanticAnalyzer.analyze();
}

export async function findSemanticGaps(): Promise<SemanticGap[]> {
  const analysis = await semanticAnalyzer.analyze();
  return analysis.gaps;
}

export async function suggestSemanticImprovements(): Promise<string[]> {
  const analysis = await semanticAnalyzer.analyze();
  return analysis.gaps.map(g => g.naturalResolution);
}
