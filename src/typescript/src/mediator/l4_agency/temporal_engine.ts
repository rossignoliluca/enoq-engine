/**
 * LIMEN TEMPORAL REASONING ENGINE
 *
 * Temporal reasoning and causal inference system.
 *
 * Based on:
 * - Causal Inference (Pearl's do-calculus)
 * - Temporal Logic (Allen's interval algebra)
 * - Pattern Recognition over time
 * - Counterfactual reasoning
 *
 * Key Functions:
 * - Past Pattern Detection: "This has happened before"
 * - Future Projection: "Where might this lead"
 * - Causal Mapping: "X seems connected to Y"
 * - Temporal Context: "Right now vs. in general"
 *
 * Constitutional Note: LIMEN can ILLUMINATE temporal patterns
 * but NEVER prescribe future actions. The future belongs to the human.
 */

import { Episode } from '../l4_agency/memory_system';
import { HumanDomain } from '../../interface/types';
import { DimensionalState } from '../../operational/detectors/dimensional_system';

// ============================================
// TYPES
// ============================================

export type TemporalReference =
  | 'PAST'              // Something that happened
  | 'PRESENT'           // What's happening now
  | 'FUTURE'            // What might happen
  | 'RECURRING'         // Pattern that repeats
  | 'TRAJECTORY'        // Direction over time
  | 'COUNTERFACTUAL';   // What if / what could have been

export interface TemporalMarker {
  type: TemporalReference;
  content: string;
  tense: 'past' | 'present' | 'future' | 'conditional';
  specificity: 'vague' | 'specific' | 'dated';
  emotional_weight: number;  // 0-1
}

export interface TemporalPattern {
  id: string;
  type: 'recurring' | 'escalating' | 'diminishing' | 'cyclical' | 'trigger-response';
  description: string;
  instances: PatternInstance[];
  confidence: number;
  domains_affected: HumanDomain[];
}

export interface PatternInstance {
  episode_id: string;
  timestamp: Date;
  context: string;
  outcome: string;
}

export interface CausalLink {
  cause: CausalNode;
  effect: CausalNode;
  strength: number;          // 0-1: How strong is the connection?
  type: 'direct' | 'contributing' | 'correlational' | 'hypothetical';
  evidence: string[];
  counterfactual: string;    // "If not X, then possibly not Y"
}

export interface CausalNode {
  id: string;
  description: string;
  domain: HumanDomain | null;
  temporal_location: TemporalReference;
  controllability: 'controllable' | 'influenceable' | 'uncontrollable';
}

export interface TemporalAnalysis {
  markers: TemporalMarker[];
  patterns: TemporalPattern[];
  causal_links: CausalLink[];
  dominant_temporal_frame: TemporalReference;
  temporal_pressure: TemporalPressure;
  insights: TemporalInsight[];
}

export interface TemporalPressure {
  urgency: 'none' | 'low' | 'medium' | 'high' | 'crisis';
  source: string;
  temporal_horizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term' | 'undefined';
}

export interface TemporalInsight {
  type: 'pattern' | 'trajectory' | 'turning_point' | 'cycle' | 'stagnation';
  description: string;
  evidence: string;
  constitutional_note: string;  // How to present without prescribing
}

// ============================================
// TEMPORAL MARKER DETECTION
// ============================================

const TEMPORAL_PATTERNS = {
  PAST: {
    keywords: [
      /remember|ricordo|recuerdo/i,
      /used to|solevo|solía/i,
      /back then|allora|entonces/i,
      /when I was|quando ero|cuando era/i,
      /years ago|anni fa|años atrás/i,
      /before|prima|antes/i,
      /once|una volta|una vez/i,
      /happened|successo|sucedió/i,
      /childhood|infanzia|infancia/i,
      /grew up|cresciuto|crecí/i
    ],
    tense: 'past' as const
  },
  PRESENT: {
    keywords: [
      /right now|adesso|ahora mismo/i,
      /currently|attualmente|actualmente/i,
      /today|oggi|hoy/i,
      /at the moment|al momento|en este momento/i,
      /these days|questi giorni|estos días/i,
      /lately|ultimamente|últimamente/i
    ],
    tense: 'present' as const
  },
  FUTURE: {
    keywords: [
      /will|will be|sarò|seré/i,
      /going to|sto per|voy a/i,
      /tomorrow|domani|mañana/i,
      /next week|la prossima settimana|la próxima semana/i,
      /someday|un giorno|algún día/i,
      /eventually|alla fine|eventualmente/i,
      /planning|pianificando|planificando/i,
      /hope to|spero di|espero/i,
      /afraid that|ho paura che|tengo miedo de/i,
      /what if|e se|qué pasa si/i
    ],
    tense: 'future' as const
  },
  RECURRING: {
    keywords: [
      /always|sempre|siempre/i,
      /every time|ogni volta|cada vez/i,
      /never|mai|nunca/i,
      /keeps happening|continua a succedere|sigue pasando/i,
      /again|di nuovo|otra vez/i,
      /pattern|schema|patrón/i,
      /cycle|ciclo|ciclo/i,
      /same thing|stessa cosa|lo mismo/i,
      /over and over|ancora e ancora|una y otra vez/i
    ],
    tense: 'present' as const
  },
  COUNTERFACTUAL: {
    keywords: [
      /if only|se solo|si solo/i,
      /what if|e se|qué hubiera pasado si/i,
      /should have|avrei dovuto|debería haber/i,
      /could have|avrei potuto|podría haber/i,
      /would have|sarei|habría/i,
      /wish I had|vorrei aver|desearía haber/i,
      /regret|rimpianto|arrepiento/i
    ],
    tense: 'conditional' as const
  }
};

// ============================================
// TEMPORAL DETECTOR
// ============================================

class TemporalDetector {
  /**
   * Detect temporal markers in message
   */
  detectMarkers(message: string): TemporalMarker[] {
    const markers: TemporalMarker[] = [];

    for (const [type, patterns] of Object.entries(TEMPORAL_PATTERNS)) {
      for (const keyword of patterns.keywords) {
        if (keyword.test(message)) {
          const match = message.match(keyword);
          markers.push({
            type: type as TemporalReference,
            content: match ? match[0] : '',
            tense: patterns.tense,
            specificity: this.assessSpecificity(message, type as TemporalReference),
            emotional_weight: this.assessEmotionalWeight(message, type as TemporalReference)
          });
          break;  // One match per type is enough
        }
      }
    }

    return markers;
  }

  /**
   * Determine dominant temporal frame
   */
  getDominantFrame(markers: TemporalMarker[]): TemporalReference {
    if (markers.length === 0) return 'PRESENT';

    // Weight by emotional weight
    const weights: Record<TemporalReference, number> = {
      PAST: 0,
      PRESENT: 0.1,  // Slight bias toward present
      FUTURE: 0,
      RECURRING: 0,
      TRAJECTORY: 0,
      COUNTERFACTUAL: 0
    };

    for (const marker of markers) {
      weights[marker.type] += marker.emotional_weight + 0.5;
    }

    // Find max
    let max = 0;
    let dominant: TemporalReference = 'PRESENT';
    for (const [type, weight] of Object.entries(weights)) {
      if (weight > max) {
        max = weight;
        dominant = type as TemporalReference;
      }
    }

    return dominant;
  }

  /**
   * Detect temporal pressure/urgency
   */
  detectPressure(message: string, markers: TemporalMarker[]): TemporalPressure {
    // High urgency markers
    if (/immediately|right now|can't wait|urgent|emergency|adesso|ahora mismo|urgente/i.test(message)) {
      return {
        urgency: 'high',
        source: 'Explicit urgency markers',
        temporal_horizon: 'immediate'
      };
    }

    // Crisis markers
    if (/tonight|today|this moment|can't go on|non ce la faccio|no puedo más/i.test(message)) {
      return {
        urgency: 'crisis',
        source: 'Immediate temporal frame with distress',
        temporal_horizon: 'immediate'
      };
    }

    // Medium urgency
    if (/soon|this week|need to decide|devo decidere|tengo que decidir/i.test(message)) {
      return {
        urgency: 'medium',
        source: 'Short-term deadline',
        temporal_horizon: 'short_term'
      };
    }

    // Future concern without urgency
    if (markers.some(m => m.type === 'FUTURE')) {
      return {
        urgency: 'low',
        source: 'Future-oriented thinking',
        temporal_horizon: 'medium_term'
      };
    }

    return {
      urgency: 'none',
      source: 'No temporal pressure detected',
      temporal_horizon: 'undefined'
    };
  }

  private assessSpecificity(message: string, type: TemporalReference): 'vague' | 'specific' | 'dated' {
    // Check for specific dates
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}|january|february|marzo|abril/i.test(message)) {
      return 'dated';
    }

    // Check for specific timeframes
    if (/last week|yesterday|tomorrow|next month|la settimana scorsa/i.test(message)) {
      return 'specific';
    }

    return 'vague';
  }

  private assessEmotionalWeight(message: string, type: TemporalReference): number {
    let weight = 0.5;

    // Past with regret = high emotional weight
    if (type === 'PAST' && /regret|miss|wish|rimpianto|extraño/i.test(message)) {
      weight += 0.3;
    }

    // Future with fear = high emotional weight
    if (type === 'FUTURE' && /afraid|scared|worry|anxious|paura|preocupado/i.test(message)) {
      weight += 0.3;
    }

    // Counterfactual is inherently emotionally loaded
    if (type === 'COUNTERFACTUAL') {
      weight += 0.2;
    }

    // Recurring with frustration
    if (type === 'RECURRING' && /frustrated|tired of|sick of|stanco di|harto de/i.test(message)) {
      weight += 0.3;
    }

    return Math.min(1, weight);
  }
}

// ============================================
// PATTERN RECOGNIZER
// ============================================

class PatternRecognizer {
  /**
   * Recognize patterns from episode history
   */
  recognizePatterns(episodes: Episode[], currentMessage: string): TemporalPattern[] {
    const patterns: TemporalPattern[] = [];

    // Check for recurring themes
    const recurringPattern = this.detectRecurringTheme(episodes, currentMessage);
    if (recurringPattern) patterns.push(recurringPattern);

    // Check for escalation
    const escalationPattern = this.detectEscalation(episodes);
    if (escalationPattern) patterns.push(escalationPattern);

    // Check for cycles
    const cyclicalPattern = this.detectCyclical(episodes);
    if (cyclicalPattern) patterns.push(cyclicalPattern);

    return patterns;
  }

  private detectRecurringTheme(episodes: Episode[], currentMessage: string): TemporalPattern | null {
    if (episodes.length < 3) return null;

    // Find most common domain across episodes
    const domainCounts: Record<string, number> = {};
    for (const ep of episodes) {
      for (const domain of ep.domains_active) {
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    }

    // Find dominant domain
    let maxDomain = '';
    let maxCount = 0;
    for (const [domain, count] of Object.entries(domainCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDomain = domain;
      }
    }

    // If domain appears in >50% of episodes, it's recurring
    if (maxCount >= episodes.length * 0.5) {
      return {
        id: `recurring_${maxDomain}_${Date.now()}`,
        type: 'recurring',
        description: `Recurring theme in ${maxDomain} domain`,
        instances: episodes
          .filter(ep => ep.domains_active.includes(maxDomain as HumanDomain))
          .map(ep => ({
            episode_id: ep.id,
            timestamp: ep.timestamp,
            context: ep.user_message.substring(0, 100),
            outcome: ep.outcome.engagement_continued ? 'positive' : 'neutral'
          })),
        confidence: maxCount / episodes.length,
        domains_affected: [maxDomain as HumanDomain]
      };
    }

    return null;
  }

  private detectEscalation(episodes: Episode[]): TemporalPattern | null {
    if (episodes.length < 5) return null;

    // Check if emotional salience is increasing over time
    const saliences = episodes.map(ep => ep.emotional_salience);
    const firstHalf = saliences.slice(0, Math.floor(saliences.length / 2));
    const secondHalf = saliences.slice(Math.floor(saliences.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgSecond > avgFirst * 1.3) {  // 30% increase
      return {
        id: `escalating_${Date.now()}`,
        type: 'escalating',
        description: 'Emotional intensity appears to be increasing over time',
        instances: episodes.slice(-5).map(ep => ({
          episode_id: ep.id,
          timestamp: ep.timestamp,
          context: `Salience: ${ep.emotional_salience.toFixed(2)}`,
          outcome: ''
        })),
        confidence: Math.min(1, (avgSecond - avgFirst) / avgFirst),
        domains_affected: []
      };
    }

    return null;
  }

  private detectCyclical(episodes: Episode[]): TemporalPattern | null {
    // Simplified: would need more sophisticated analysis in production
    return null;
  }
}

// ============================================
// CAUSAL MAPPER
// ============================================

class CausalMapper {
  /**
   * Map potential causal relationships
   */
  mapCausalLinks(
    message: string,
    episodes: Episode[],
    dimensionalState: DimensionalState
  ): CausalLink[] {
    const links: CausalLink[] = [];

    // Detect explicit causal language
    const explicitLinks = this.detectExplicitCausal(message);
    links.push(...explicitLinks);

    // Detect cross-domain connections
    if (dimensionalState.cross_dimensional) {
      const crossDomainLinks = this.detectCrossDomainCausal(dimensionalState);
      links.push(...crossDomainLinks);
    }

    return links;
  }

  private detectExplicitCausal(message: string): CausalLink[] {
    const links: CausalLink[] = [];

    // Patterns like "because", "therefore", "so", "makes me"
    const causalPatterns = [
      /because|perché|porque/i,
      /therefore|quindi|por lo tanto/i,
      /so I|così io|así que/i,
      /makes me|mi fa|me hace/i,
      /leads to|porta a|lleva a/i,
      /causes|causa|causa/i,
      /results in|risulta in|resulta en/i
    ];

    for (const pattern of causalPatterns) {
      if (pattern.test(message)) {
        // Extract cause and effect (simplified)
        links.push({
          cause: {
            id: 'detected_cause',
            description: 'Cause mentioned in message',
            domain: null,
            temporal_location: 'PAST',
            controllability: 'uncontrollable'
          },
          effect: {
            id: 'detected_effect',
            description: 'Effect mentioned in message',
            domain: null,
            temporal_location: 'PRESENT',
            controllability: 'influenceable'
          },
          strength: 0.6,
          type: 'direct',
          evidence: [`Pattern match: ${pattern.toString()}`],
          counterfactual: 'If the cause were different, the effect might be different'
        });
        break;
      }
    }

    return links;
  }

  private detectCrossDomainCausal(dimensionalState: DimensionalState): CausalLink[] {
    const links: CausalLink[] = [];
    const activeDomains = dimensionalState.primary_horizontal;

    // Common cross-domain influences (aligned with types.ts HumanDomain)
    const knownConnections: [HumanDomain, HumanDomain, string][] = [
      ['H14_WORK', 'H09_ATTACHMENT', 'Work stress affecting relationships'],
      ['H14_WORK', 'H03_BODY', 'Work affecting physical health'],
      ['H09_ATTACHMENT', 'H03_BODY', 'Relationship affecting wellbeing'],
      ['H02_SAFETY', 'H14_WORK', 'Security concerns affecting work decisions'],
      ['H11_BELONGING', 'H09_ATTACHMENT', 'Social belonging affecting intimate relationships']
    ];

    for (const [domain1, domain2, description] of knownConnections) {
      if (activeDomains.includes(domain1) && activeDomains.includes(domain2)) {
        links.push({
          cause: {
            id: domain1,
            description: `Activity in ${domain1}`,
            domain: domain1,
            temporal_location: 'PRESENT',
            controllability: 'influenceable'
          },
          effect: {
            id: domain2,
            description: `Impact on ${domain2}`,
            domain: domain2,
            temporal_location: 'PRESENT',
            controllability: 'influenceable'
          },
          strength: 0.5,
          type: 'contributing',
          evidence: ['Cross-domain activation detected'],
          counterfactual: description
        });
      }
    }

    return links;
  }
}

// ============================================
// TEMPORAL REASONING ENGINE (Main Class)
// ============================================

export class TemporalEngine {
  private detector: TemporalDetector;
  private patternRecognizer: PatternRecognizer;
  private causalMapper: CausalMapper;

  constructor() {
    this.detector = new TemporalDetector();
    this.patternRecognizer = new PatternRecognizer();
    this.causalMapper = new CausalMapper();
  }

  /**
   * Perform full temporal analysis
   */
  analyze(
    message: string,
    episodes: Episode[],
    dimensionalState: DimensionalState
  ): TemporalAnalysis {
    // Detect temporal markers
    const markers = this.detector.detectMarkers(message);

    // Get dominant temporal frame
    const dominant_temporal_frame = this.detector.getDominantFrame(markers);

    // Detect temporal pressure
    const temporal_pressure = this.detector.detectPressure(message, markers);

    // Recognize patterns from history
    const patterns = this.patternRecognizer.recognizePatterns(episodes, message);

    // Map causal links
    const causal_links = this.causalMapper.mapCausalLinks(
      message,
      episodes,
      dimensionalState
    );

    // Generate insights
    const insights = this.generateInsights(
      markers,
      patterns,
      causal_links,
      dominant_temporal_frame
    );

    return {
      markers,
      patterns,
      causal_links,
      dominant_temporal_frame,
      temporal_pressure,
      insights
    };
  }

  /**
   * Generate temporal insights
   */
  private generateInsights(
    markers: TemporalMarker[],
    patterns: TemporalPattern[],
    causalLinks: CausalLink[],
    dominantFrame: TemporalReference
  ): TemporalInsight[] {
    const insights: TemporalInsight[] = [];

    // Pattern insight
    for (const pattern of patterns) {
      if (pattern.confidence > 0.6) {
        insights.push({
          type: 'pattern',
          description: pattern.description,
          evidence: `Detected in ${pattern.instances.length} past interactions`,
          constitutional_note: 'Present as observation, not diagnosis. User decides what to do with this.'
        });
      }
    }

    // Trajectory insight
    const escalating = patterns.find(p => p.type === 'escalating');
    if (escalating) {
      insights.push({
        type: 'trajectory',
        description: 'Intensity seems to be increasing over time',
        evidence: 'Emotional salience trend analysis',
        constitutional_note: 'Illuminate without alarming. User owns interpretation.'
      });
    }

    // Counterfactual insight
    if (markers.some(m => m.type === 'COUNTERFACTUAL')) {
      insights.push({
        type: 'turning_point',
        description: 'You seem to be reflecting on what might have been different',
        evidence: 'Counterfactual language detected',
        constitutional_note: 'Honor the reflection without redirecting. The past is not changeable, only reinterpretable.'
      });
    }

    // Cycle insight
    const recurring = patterns.find(p => p.type === 'recurring');
    if (recurring && markers.some(m => m.type === 'RECURRING')) {
      insights.push({
        type: 'cycle',
        description: 'This theme seems to come up repeatedly',
        evidence: `Recurrence in ${recurring.domains_affected.join(', ')} domain(s)`,
        constitutional_note: 'Patterns are not destiny. User can explore what maintains the cycle.'
      });
    }

    return insights;
  }

  /**
   * Generate temporal response element
   */
  generateTemporalResponse(analysis: TemporalAnalysis, language: string = 'en'): string | null {
    // If no significant temporal content, return null
    if (analysis.insights.length === 0 && analysis.patterns.length === 0) {
      return null;
    }

    const responses: Record<string, Record<string, string>> = {
      pattern: {
        en: 'This seems to be a theme that comes up for you.',
        it: 'Questo sembra essere un tema ricorrente per te.',
        es: 'Esto parece ser un tema que se repite para ti.'
      },
      trajectory: {
        en: 'Something seems to be shifting over time.',
        it: 'Qualcosa sembra stia cambiando nel tempo.',
        es: 'Algo parece estar cambiando con el tiempo.'
      },
      turning_point: {
        en: 'You\'re reflecting on paths not taken.',
        it: 'Stai riflettendo su strade non percorse.',
        es: 'Estás reflexionando sobre caminos no tomados.'
      },
      cycle: {
        en: 'There\'s a pattern here that might be worth looking at.',
        it: 'C\'è uno schema qui che potrebbe valere la pena esplorare.',
        es: 'Hay un patrón aquí que podría valer la pena explorar.'
      }
    };

    const primaryInsight = analysis.insights[0];
    if (primaryInsight) {
      return responses[primaryInsight.type]?.[language] || responses[primaryInsight.type]?.['en'] || null;
    }

    return null;
  }

  /**
   * Check if temporal urgency requires immediate attention
   */
  requiresImmediateAttention(analysis: TemporalAnalysis): boolean {
    return analysis.temporal_pressure.urgency === 'crisis' ||
           analysis.temporal_pressure.urgency === 'high';
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const temporalEngine = new TemporalEngine();
export default temporalEngine;
