/**
 * GENESIS SELF-BUILDER: KNOWLEDGE SEEKER
 *
 * The system that seeks knowledge to improve itself.
 *
 * From the dialogue:
 * "Il sistema deve vedere se stesso e auto costruirsi
 *  utilizzando onniscenza presente su web"
 *
 * This module searches for:
 * - Latest research in cognitive architectures
 * - Patterns from other AI systems
 * - Philosophical frameworks
 * - Scientific discoveries relevant to ENOQ
 */

import OpenAI from 'openai';
import { CodebaseMap, ModuleInfo } from './code_reader';
import { searchResearch, searchEnoqRelevantResearch, Paper, ResearchResult } from './research_api';

// ============================================
// TYPES
// ============================================

export interface KnowledgeQuery {
  topic: string;
  context: string;
  purpose: 'improve' | 'understand' | 'validate' | 'extend';
  currentImplementation?: string;
}

export interface KnowledgeResult {
  query: KnowledgeQuery;
  findings: Finding[];
  synthesis: string;
  improvementSuggestions: ImprovementSuggestion[];
  sources: string[];
}

export interface Finding {
  title: string;
  content: string;
  relevance: number; // 0-1
  source: string;
  type: 'research' | 'pattern' | 'philosophy' | 'implementation';
}

export interface ImprovementSuggestion {
  target: string;  // Which file/module to improve
  type: 'add' | 'modify' | 'refactor' | 'extend';
  description: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
}

// ============================================
// KNOWLEDGE DOMAINS FOR ENOQ
// ============================================

export const ENOQ_KNOWLEDGE_DOMAINS = {
  // Core theoretical foundations
  COGNITIVE_ARCHITECTURE: [
    'Global Workspace Theory cognitive architecture',
    'Free Energy Principle active inference',
    'Integrated Information Theory phi consciousness',
    'Predictive Processing brain',
    'Complementary Learning Systems memory'
  ],

  // Ethical frameworks
  ETHICS: [
    'Constitutional AI Anthropic',
    'AI alignment research 2024',
    'value alignment artificial intelligence',
    'AI ethics autonomy respect',
    'machine ethics decision making'
  ],

  // Multi-agent systems
  MULTI_AGENT: [
    'multi-agent systems architecture patterns',
    'orchestrator worker pattern AI',
    'agent swarm coordination',
    'emergent behavior multi-agent'
  ],

  // Self-improvement
  SELF_IMPROVEMENT: [
    'self-improving AI systems',
    'recursive self-improvement safety',
    'meta-learning neural networks',
    'autopoiesis artificial systems'
  ],

  // Domain-specific
  DOMAINS: {
    CRISIS: ['crisis intervention AI', 'mental health chatbot ethics'],
    IDENTITY: ['identity formation psychology', 'narrative identity theory'],
    DECISION: ['decision support systems', 'nudge theory choice architecture'],
    KNOWLEDGE: ['knowledge representation AI', 'semantic knowledge graphs'],
    CREATIVITY: ['computational creativity', 'AI art generation ethics']
  }
};

// ============================================
// KNOWLEDGE SEEKER CLASS
// ============================================

export class KnowledgeSeeker {
  private openai: OpenAI;
  private model: string;
  private searchCache: Map<string, KnowledgeResult> = new Map();

  constructor(model: string = 'gpt-4o') {
    this.openai = new OpenAI();
    this.model = model;
  }

  /**
   * Seek knowledge about a specific topic
   */
  async seek(query: KnowledgeQuery): Promise<KnowledgeResult> {
    const cacheKey = `${query.topic}:${query.purpose}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    // Build the search prompt
    const prompt = this.buildSearchPrompt(query);

    // Call GPT-4 to synthesize knowledge
    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content: `You are a knowledge synthesizer for ENOQ, a cognitive architecture system.
Your task is to find and synthesize relevant knowledge that could improve ENOQ.

ENOQ's core principles:
- Gravitational field constraints (not rules)
- 5 constitutional attractors (Withdrawal, Non-Prescription, Rubicon, Autonomy, Transparency)
- Self-limiting by design (Tzimtzum - power through withdrawal)
- Multi-domain (7 domains), multi-dimension (5 levels), multi-function (7 functions)

When searching for knowledge, prioritize:
1. Scientific research that validates or challenges ENOQ's approach
2. Patterns from other AI systems that could be adapted
3. Philosophical frameworks that align with ENOQ's ethics
4. Implementation techniques that could improve effectiveness

Always consider whether suggestions violate ENOQ's constitutional attractors.`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse the response
    const result = this.parseResponse(query, content);

    this.searchCache.set(cacheKey, result);
    return result;
  }

  /**
   * Seek improvements for a specific module
   */
  async seekModuleImprovements(module: ModuleInfo, codeSnippet: string): Promise<ImprovementSuggestion[]> {
    const query: KnowledgeQuery = {
      topic: `Improvements for ${module.name} module`,
      context: `This module: ${module.description}\n\nCurrent exports: ${module.exports.join(', ')}\n\nCode sample:\n${codeSnippet.slice(0, 1000)}`,
      purpose: 'improve',
      currentImplementation: codeSnippet
    };

    const result = await this.seek(query);
    return result.improvementSuggestions;
  }

  /**
   * Seek validation for ENOQ's approach
   */
  async seekValidation(approach: string, implementation: string): Promise<{
    validated: boolean;
    concerns: string[];
    supportingEvidence: string[];
    suggestions: string[];
  }> {
    const query: KnowledgeQuery = {
      topic: `Validation of approach: ${approach}`,
      context: implementation,
      purpose: 'validate'
    };

    const result = await this.seek(query);

    // Parse validation-specific response
    return {
      validated: result.findings.some(f => f.relevance > 0.7 && f.type === 'research'),
      concerns: result.findings.filter(f => f.content.toLowerCase().includes('concern')).map(f => f.content),
      supportingEvidence: result.findings.filter(f => f.relevance > 0.5).map(f => f.content),
      suggestions: result.improvementSuggestions.map(s => s.description)
    };
  }

  /**
   * Seek extensions for new capabilities
   */
  async seekExtensions(capability: string, currentSystem: CodebaseMap): Promise<{
    extensions: ImprovementSuggestion[];
    risks: string[];
    benefits: string[];
  }> {
    const query: KnowledgeQuery = {
      topic: `How to add ${capability} to a cognitive architecture`,
      context: `Current system has ${currentSystem.modules.length} modules: ${currentSystem.modules.map(m => m.name).join(', ')}`,
      purpose: 'extend'
    };

    const result = await this.seek(query);

    return {
      extensions: result.improvementSuggestions.filter(s => s.type === 'add' || s.type === 'extend'),
      risks: result.findings.filter(f => f.content.toLowerCase().includes('risk')).map(f => f.content),
      benefits: result.findings.filter(f => f.relevance > 0.6).map(f => f.content)
    };
  }

  /**
   * Get the latest research in a domain (uses LLM synthesis)
   */
  async getLatestResearch(domain: keyof typeof ENOQ_KNOWLEDGE_DOMAINS): Promise<Finding[]> {
    const topics = ENOQ_KNOWLEDGE_DOMAINS[domain];
    const topicsArray = Array.isArray(topics) ? topics : Object.values(topics).flat();

    const query: KnowledgeQuery = {
      topic: topicsArray.join('; '),
      context: `Looking for latest research and developments in ${domain} relevant to ENOQ`,
      purpose: 'understand'
    };

    const result = await this.seek(query);
    return result.findings;
  }

  // ============================================
  // REAL-TIME RESEARCH API ACCESS
  // ============================================

  /**
   * Search real academic papers from Semantic Scholar, arXiv, OpenAlex
   * This accesses LIVE research, not just LLM training data
   */
  async searchLiveResearch(topic: string, options: {
    limit?: number;
    yearFrom?: number;
    fields?: string[];
  } = {}): Promise<Paper[]> {
    const result = await searchResearch({
      topic,
      limit: options.limit || 10,
      yearFrom: options.yearFrom,
      fields: options.fields
    });

    return result.papers;
  }

  /**
   * Get research relevant to ENOQ's theoretical foundations
   * Searches across: autopoiesis, free energy principle, GWT, CLS, dynamical systems
   */
  async getEnoqFoundationalResearch(): Promise<{
    topic: string;
    papers: Paper[];
  }[]> {
    const results = await searchEnoqRelevantResearch();

    return results.map(r => ({
      topic: r.query.topic,
      papers: r.papers
    }));
  }

  /**
   * Synthesize findings from real papers using LLM
   */
  async synthesizeResearch(papers: Paper[], question: string): Promise<string> {
    if (papers.length === 0) {
      return 'No papers found to synthesize.';
    }

    const papersContext = papers.slice(0, 10).map(p =>
      `- "${p.title}" (${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''}, ${p.year})\n  Citations: ${p.citations}\n  Abstract: ${p.abstract.slice(0, 300)}...`
    ).join('\n\n');

    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.3,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `You are a scientific research synthesizer. Given a set of academic papers, provide a concise synthesis answering the user's question. Cite papers by author and year. Be precise and scientific.`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nRelevant Papers:\n${papersContext}`
        }
      ]
    });

    return response.choices[0]?.message?.content || 'Synthesis failed.';
  }

  /**
   * Find papers that could improve a specific ENOQ component
   */
  async findImprovementResearch(component: string): Promise<{
    papers: Paper[];
    synthesis: string;
  }> {
    // Map component to research topics
    const componentTopics: Record<string, string> = {
      'attractor': 'attractor dynamics neural networks constraint satisfaction',
      'field': 'field theory cognitive architecture gravitational metaphor computation',
      'energy': 'energy-based models free energy principle neural computation',
      'seed': 'autopoiesis self-organization minimal cognition',
      'grow': 'emergence self-organization developmental systems',
      'spawn': 'self-replication autopoietic systems recursive improvement',
      'dissipation': 'dissipative structures non-equilibrium thermodynamics cognition'
    };

    const topic = componentTopics[component] || `${component} cognitive architecture`;

    const papers = await this.searchLiveResearch(topic, {
      limit: 15,
      yearFrom: 2018
    });

    const synthesis = await this.synthesizeResearch(
      papers,
      `What insights from these papers could improve the ${component} component of a cognitive architecture based on field/attractor dynamics?`
    );

    return { papers, synthesis };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private buildSearchPrompt(query: KnowledgeQuery): string {
    let prompt = `Topic: ${query.topic}\n\n`;
    prompt += `Context: ${query.context}\n\n`;
    prompt += `Purpose: ${query.purpose}\n\n`;

    if (query.currentImplementation) {
      prompt += `Current Implementation:\n\`\`\`\n${query.currentImplementation.slice(0, 500)}\n\`\`\`\n\n`;
    }

    prompt += `Please provide:
1. Key findings from current research and best practices (3-5 items)
2. A synthesis of how this knowledge applies to ENOQ
3. Specific improvement suggestions (prioritized)
4. Sources or references

Format your response as:

## Findings
[List each finding with title, content, relevance score 0-1, and type]

## Synthesis
[How this applies to ENOQ]

## Improvement Suggestions
[List each suggestion with target, type, description, rationale, priority, complexity]

## Sources
[List sources]`;

    return prompt;
  }

  private parseResponse(query: KnowledgeQuery, content: string): KnowledgeResult {
    // Simple parsing - in production would be more robust
    const findings: Finding[] = [];
    const suggestions: ImprovementSuggestion[] = [];
    const sources: string[] = [];
    let synthesis = '';

    // Extract sections
    const findingsMatch = content.match(/## Findings\n([\s\S]*?)(?=## |$)/);
    const synthesisMatch = content.match(/## Synthesis\n([\s\S]*?)(?=## |$)/);
    const suggestionsMatch = content.match(/## Improvement Suggestions\n([\s\S]*?)(?=## |$)/);
    const sourcesMatch = content.match(/## Sources\n([\s\S]*?)(?=## |$)/);

    if (synthesisMatch) {
      synthesis = synthesisMatch[1].trim();
    }

    if (findingsMatch) {
      const lines = findingsMatch[1].trim().split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
          findings.push({
            title: line.replace(/^[-*\d.]+\s*/, '').slice(0, 50),
            content: line.replace(/^[-*\d.]+\s*/, ''),
            relevance: 0.7,
            source: 'synthesized',
            type: 'research'
          });
        }
      }
    }

    if (suggestionsMatch) {
      const lines = suggestionsMatch[1].trim().split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
          suggestions.push({
            target: 'genesis',
            type: 'modify',
            description: line.replace(/^[-*\d.]+\s*/, ''),
            rationale: 'Based on research findings',
            priority: 'medium',
            complexity: 'moderate'
          });
        }
      }
    }

    if (sourcesMatch) {
      const lines = sourcesMatch[1].trim().split('\n').filter(l => l.trim());
      sources.push(...lines.map(l => l.replace(/^[-*\d.]+\s*/, '')));
    }

    return {
      query,
      findings,
      synthesis,
      improvementSuggestions: suggestions,
      sources
    };
  }
}

// ============================================
// SINGLETON
// ============================================

export const knowledgeSeeker = new KnowledgeSeeker();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export async function seekKnowledge(topic: string, purpose: KnowledgeQuery['purpose'] = 'understand'): Promise<KnowledgeResult> {
  return knowledgeSeeker.seek({
    topic,
    context: 'ENOQ cognitive architecture improvement',
    purpose
  });
}

export async function seekImprovements(moduleName: string, code: string): Promise<ImprovementSuggestion[]> {
  return knowledgeSeeker.seekModuleImprovements(
    { name: moduleName, path: '', files: [], exports: [], description: '', lineCount: 0 },
    code
  );
}
