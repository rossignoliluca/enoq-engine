/**
 * CONCRESCENCE ENGINE
 *
 * The heart of ENOQ integration based on:
 * - Whitehead: Prehension + Concrescence (Process and Reality)
 * - Varela: Reciprocal Constraints (Neurophenomenology)
 * - James: Stream of Experience (Radical Empiricism)
 * - Buddhism: Sati (Memory + Understanding + Vigilance)
 * - Jung: Individuation (Conscious + Unconscious Integration)
 *
 * This engine unifies:
 * - pipeline.ts (Conscious): S0→S6, Protocol Selection, Verification
 * - total_system.ts (Unconscious): Dimensions, Memory, Swarm, Temporal
 *
 * Neither is primary. Both operate simultaneously and prehend each other.
 */

import { FieldState, ProtocolSelection, SupportedLanguage, HumanDomain, Flag } from './types';
import { enoq, Session, PipelineResult, PipelineTrace, createSession } from './pipeline';
import { totalSystem, TotalSystemOutput, ProcessingContext } from './total_system';
import { DimensionalState } from './dimensional_system';
import { TemporalAnalysis } from './temporal_engine';
import { ConsensusState } from './agent_swarm';
import { MetacognitiveReport } from './metacognitive_monitor';
import { Episode, SemanticPattern, UserModel, memorySystem } from './memory_system';

// ============================================
// TYPES: PREHENSION
// ============================================

/**
 * Prehension: The act of experientially grasping data from another entity
 * (Whitehead, Process and Reality)
 */
export interface Prehension {
  source: 'PIPELINE' | 'TOTAL_SYSTEM' | 'MEMORY' | 'CONSTITUTION';
  type: string;
  data: any;
  weight: number;      // Importance in concrescence
  relevance: number;   // Context-specific relevance
}

// ============================================
// TYPES: TENSION AND COHERENCE
// ============================================

/**
 * Tension: Where prehensions conflict
 */
export interface Tension {
  between: [string, string];  // e.g., ['PIPELINE:selection', 'TOTAL_SYSTEM:swarm']
  nature: 'depth' | 'atmosphere' | 'primitive' | 'urgency' | 'approach';
  severity: number;  // 0-1
  description: string;
}

/**
 * Coherence: Where prehensions align
 */
export interface PrehensionCoherence {
  among: string[];  // Sources that agree
  on: string;       // What they agree on
  strength: number; // 0-1
}

// ============================================
// TYPES: CONCRESCENCE
// ============================================

/**
 * Satisfaction: The determinate response that emerges from concrescence
 */
export interface Satisfaction {
  primitive: string;
  atmosphere: string;
  depth: 'surface' | 'medium' | 'deep';
  response: string;
  confidence: number;
  constitutional_verified: boolean;
}

/**
 * Concrescence: The integration process
 */
export interface Concrescence {
  prehensions: Prehension[];
  tensions: Tension[];
  coherences: PrehensionCoherence[];
  satisfaction: Satisfaction;
}

// ============================================
// TYPES: ACTUAL OCCASION
// ============================================

/**
 * Actual Occasion: The fundamental unit of experience (Whitehead)
 * Each conversation turn is an Actual Occasion.
 */
export interface ActualOccasion {
  id: string;
  timestamp: Date;

  // The Past (Memory)
  past: {
    episodic: Episode[];
    semantic: SemanticPattern[];
    user_model: UserModel | null;
  };

  // The Present (Input + Processing)
  present: {
    user_input: string;
    language: SupportedLanguage;
    dimensional_state: DimensionalState | null;
    field_state: FieldState | null;
    swarm_consensus: ConsensusState | null;
    temporal_analysis: TemporalAnalysis | null;
  };

  // The Future (Response + Effects)
  future: {
    response: string;
    predicted_effect: PredictedEffect;
    memory_update: MemoryUpdate;
  };

  // The Concrescence
  concrescence: Concrescence;
}

export interface PredictedEffect {
  expected_user_state: 'calmer' | 'same' | 'activated' | 'uncertain';
  autonomy_impact: 'positive' | 'neutral' | 'negative';
  relationship_impact: 'strengthened' | 'maintained' | 'strained';
}

export interface MemoryUpdate {
  episode_stored: boolean;
  patterns_detected: string[];
  model_updated: boolean;
}

// ============================================
// TYPES: ENGINE CONFIG
// ============================================

export interface ConcrescenceConfig {
  parallel_processing: boolean;      // Run both systems in parallel
  reciprocal_constraints: boolean;   // Apply mutual constraints
  constitutional_veto: boolean;      // Allow constitution to block
  debug: boolean;
}

const DEFAULT_CONFIG: ConcrescenceConfig = {
  parallel_processing: true,
  reciprocal_constraints: true,
  constitutional_veto: true,
  debug: process.env.ENOQ_DEBUG === 'true',
};

// ============================================
// CONSTITUTIONAL INVARIANTS
// ============================================

const CONSTITUTIONAL_INVARIANTS = {
  'INV-003': 'ENOQ never decides on behalf of the user',
  'INV-009': 'All constraints are reversible',
  'INV-011': 'User well-being takes absolute precedence',
};

// ============================================
// CONCRESCENCE ENGINE
// ============================================

export class ConcrescenceEngine {
  private config: ConcrescenceConfig;
  private currentOccasion: ActualOccasion | null = null;
  private occasionHistory: ActualOccasion[] = [];

  constructor(config: Partial<ConcrescenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process input through the complete concrescence
   */
  async process(
    input: string,
    session: Session,
    language: SupportedLanguage = 'en'
  ): Promise<{ occasion: ActualOccasion; session: Session }> {
    const startTime = Date.now();

    // ========================================
    // PHASE 1: Initialize Actual Occasion
    // ========================================
    this.currentOccasion = this.initializeOccasion(input, language, session);

    // ========================================
    // PHASE 2: Gather Past (Memory Context)
    // ========================================
    const memoryContext = memorySystem.getContext(session.session_id);
    this.currentOccasion.past = {
      episodic: memoryContext.working_memory,
      semantic: [],  // Would come from neocortical patterns
      user_model: null,  // Would come from user model
    };

    // ========================================
    // PHASE 3: SIMULTANEOUS PROCESSING
    // Both systems operate in parallel (Experiential Unity)
    // ========================================
    let pipelineResult: PipelineResult;
    let totalSystemResult: TotalSystemOutput;

    if (this.config.parallel_processing) {
      // True parallelism - neither waits for the other
      [pipelineResult, totalSystemResult] = await Promise.all([
        enoq(input, session),
        totalSystem.process({
          user_id: session.session_id,
          message: input,
          language,
        }),
      ]);
    } else {
      // Sequential for debugging
      pipelineResult = await enoq(input, session);
      totalSystemResult = await totalSystem.process({
        user_id: session.session_id,
        message: input,
        language,
      });
    }

    // Update session from pipeline
    session = pipelineResult.session;

    // ========================================
    // PHASE 4: GATHER PREHENSIONS
    // ========================================
    const prehensions = this.gatherPrehensions(
      pipelineResult,
      totalSystemResult,
      this.currentOccasion.past
    );

    // ========================================
    // PHASE 5: APPLY RECIPROCAL CONSTRAINTS
    // (Varela's Neurophenomenology)
    // ========================================
    if (this.config.reciprocal_constraints) {
      this.applyReciprocalConstraints(prehensions);
    }

    // ========================================
    // PHASE 6: CONCRESCENCE
    // From indeterminate to determinate
    // ========================================
    const concrescence = this.concresce(
      prehensions,
      pipelineResult,
      totalSystemResult,
      language
    );

    // ========================================
    // PHASE 7: CONSTITUTIONAL VERIFICATION
    // ========================================
    const verified = this.verifyConstitutional(concrescence.satisfaction);
    concrescence.satisfaction.constitutional_verified = verified;

    if (!verified && this.config.constitutional_veto) {
      // Constitutional veto - use safe fallback
      concrescence.satisfaction.response = this.getConstitutionalFallback(language);
    }

    // ========================================
    // PHASE 8: UPDATE PRESENT
    // ========================================
    this.currentOccasion.present = {
      user_input: input,
      language,
      dimensional_state: totalSystemResult.context.dimensional_state,
      field_state: totalSystemResult.field_state,
      swarm_consensus: totalSystemResult.context.swarm_consensus,
      temporal_analysis: totalSystemResult.context.temporal_analysis,
    };

    // ========================================
    // PHASE 9: DETERMINE FUTURE
    // ========================================
    this.currentOccasion.future = {
      response: concrescence.satisfaction.response,
      predicted_effect: this.predictEffect(concrescence),
      memory_update: {
        episode_stored: true,
        patterns_detected: this.detectPatterns(concrescence),
        model_updated: false,
      },
    };

    // ========================================
    // PHASE 10: FINALIZE CONCRESCENCE
    // ========================================
    this.currentOccasion.concrescence = concrescence;

    // ========================================
    // PHASE 10.5: TRACK RESPONSE FOR ANTI-REPETITION
    // ========================================
    // WHY: Users complained about hearing the same responses within a session.
    // HOW: Store last N responses in session.memory, passed to template selection.
    // WHERE: selectWithVariation() in agent_responses.ts filters these out.
    // LIMIT: Default 5 responses. Older responses are forgotten (shift).
    const finalResponse = concrescence.satisfaction.response;
    if (session.memory.recent_responses) {
      session.memory.recent_responses.push(finalResponse);
      const limit = session.memory.response_history_limit || 5;
      while (session.memory.recent_responses.length > limit) {
        session.memory.recent_responses.shift();
      }
    }

    // ========================================
    // PHASE 11: MEMORY UPDATE
    // ========================================
    this.occasionHistory.push(this.currentOccasion);
    if (this.occasionHistory.length > 50) {
      this.occasionHistory.shift();
    }

    // ========================================
    // DEBUG OUTPUT
    // ========================================
    if (this.config.debug) {
      this.logDebug(startTime, prehensions, concrescence);
    }

    return {
      occasion: this.currentOccasion,
      session,
    };
  }

  /**
   * Initialize a new Actual Occasion
   */
  private initializeOccasion(
    input: string,
    language: SupportedLanguage,
    session: Session
  ): ActualOccasion {
    return {
      id: `occ_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date(),
      past: {
        episodic: [],
        semantic: [],
        user_model: null,
      },
      present: {
        user_input: input,
        language,
        dimensional_state: null,
        field_state: null,
        swarm_consensus: null,
        temporal_analysis: null,
      },
      future: {
        response: '',
        predicted_effect: {
          expected_user_state: 'uncertain',
          autonomy_impact: 'neutral',
          relationship_impact: 'maintained',
        },
        memory_update: {
          episode_stored: false,
          patterns_detected: [],
          model_updated: false,
        },
      },
      concrescence: {
        prehensions: [],
        tensions: [],
        coherences: [],
        satisfaction: {
          primitive: 'MIRROR',
          atmosphere: 'HUMAN_FIELD',
          depth: 'surface',
          response: '',
          confidence: 0.5,
          constitutional_verified: false,
        },
      },
    };
  }

  /**
   * Gather prehensions from all sources
   */
  private gatherPrehensions(
    pipeline: PipelineResult,
    totalSystem: TotalSystemOutput,
    past: ActualOccasion['past']
  ): Prehension[] {
    const prehensions: Prehension[] = [];

    // From Pipeline (Conscious)
    prehensions.push({
      source: 'PIPELINE',
      type: 'field_state',
      data: pipeline.trace.s1_field,
      weight: 0.8,
      relevance: this.calculateRelevance('field_state', pipeline.trace),
    });

    prehensions.push({
      source: 'PIPELINE',
      type: 'selection',
      data: pipeline.trace.s3_selection,
      weight: 0.9,
      relevance: this.calculateRelevance('selection', pipeline.trace),
    });

    prehensions.push({
      source: 'PIPELINE',
      type: 'governor',
      data: pipeline.trace.s1_governor,
      weight: 0.7,
      relevance: this.calculateRelevance('governor', pipeline.trace),
    });

    prehensions.push({
      source: 'PIPELINE',
      type: 'output',
      data: pipeline.output,
      weight: 0.85,
      relevance: 0.9,
    });

    // From TotalSystem (Unconscious)
    prehensions.push({
      source: 'TOTAL_SYSTEM',
      type: 'dimensional',
      data: totalSystem.context.dimensional_state,
      weight: 0.85,
      relevance: this.calculateDimensionalRelevance(totalSystem.context.dimensional_state),
    });

    prehensions.push({
      source: 'TOTAL_SYSTEM',
      type: 'temporal',
      data: totalSystem.context.temporal_analysis,
      weight: 0.7,
      relevance: this.calculateTemporalRelevance(totalSystem.context.temporal_analysis),
    });

    prehensions.push({
      source: 'TOTAL_SYSTEM',
      type: 'swarm',
      data: totalSystem.context.swarm_consensus,
      weight: 0.75,
      relevance: totalSystem.context.swarm_consensus?.reached ? 0.8 : 0.5,
    });

    prehensions.push({
      source: 'TOTAL_SYSTEM',
      type: 'metacognitive',
      data: totalSystem.context.metacognitive_report,
      weight: 0.8,
      relevance: totalSystem.context.metacognitive_report?.confidence.overall || 0.5,
    });

    prehensions.push({
      source: 'TOTAL_SYSTEM',
      type: 'output',
      data: totalSystem.response,
      weight: 0.85,
      relevance: 0.9,
    });

    // From Memory
    if (past.episodic.length > 0) {
      prehensions.push({
        source: 'MEMORY',
        type: 'episodic',
        data: past.episodic,
        weight: 0.6,
        relevance: 0.7,
      });
    }

    // From Constitution (gravitationally inevitable, not forced)
    // The field curves all trajectories toward these - Tzimtzum
    prehensions.push({
      source: 'CONSTITUTION',
      type: 'invariants',
      data: CONSTITUTIONAL_INVARIANTS,
      weight: 1.0,  // Maximum gravitational mass - not force but curvature
      relevance: 1.0,
    });

    return prehensions;
  }

  /**
   * Apply reciprocal constraints between systems
   * (Varela: Neither reduces to the other)
   */
  private applyReciprocalConstraints(prehensions: Prehension[]): void {
    const dimensional = prehensions.find(p => p.type === 'dimensional')?.data as DimensionalState | undefined;
    const selection = prehensions.find(p => p.type === 'selection')?.data as ProtocolSelection | undefined;
    const temporal = prehensions.find(p => p.type === 'temporal')?.data as TemporalAnalysis | undefined;

    if (!dimensional || !selection) return;

    // ========================================
    // TotalSystem → Pipeline Constraints
    // ========================================

    // V_MODE triggers reflection-only mode
    if (dimensional.v_mode_triggered) {
      selection.forbidden = selection.forbidden || [];
      selection.forbidden.push('recommend', 'advise', 'direct', 'suggest_action');
      selection.required = selection.required || [];
      selection.required.push('return_ownership');
      selection.mode = 'REGULATE';  // V_MODE uses REGULATE mode
      selection.atmosphere = 'V_MODE';
    }

    // Emergency triggers immediate grounding
    if (dimensional.emergency_detected) {
      selection.atmosphere = 'EMERGENCY';
      selection.primitive = 'P01_GROUND';
      selection.required = selection.required || [];
      selection.required.push('ground', 'presence', 'safety');
    }

    // High tension needs holding
    if (dimensional.integration?.tension > 0.6) {
      selection.depth = 'medium';
      if (!selection.forbidden?.includes('rush')) {
        selection.forbidden = selection.forbidden || [];
        selection.forbidden.push('rush', 'quick_fix');
      }
    }

    // Cross-dimensional needs bridging
    if (dimensional.cross_dimensional) {
      selection.required = selection.required || [];
      selection.required.push('bridge', 'integrate');
    }

    // ========================================
    // Pipeline → TotalSystem Constraints
    // ========================================

    // OPERATIONAL atmosphere limits depth - constraint stored in selection
    if (selection.atmosphere === 'OPERATIONAL') {
      selection.depth = 'surface';
    }

    // Governor crisis mode accelerates temporal focus - reflected in selection
    if (temporal && selection.atmosphere === 'EMERGENCY') {
      selection.length = 'minimal';
    }

    // ========================================
    // Temporal → Both Systems
    // ========================================

    if (temporal?.temporal_pressure?.urgency === 'crisis') {
      selection.length = 'minimal';
      selection.depth = 'surface';
    }
  }

  /**
   * Concrescence: Integrate prehensions into determinate response
   * (From Whitehead's "satisfaction" of an actual occasion)
   */
  private concresce(
    prehensions: Prehension[],
    pipelineResult: PipelineResult,
    totalSystemResult: TotalSystemOutput,
    language: SupportedLanguage
  ): Concrescence {
    // ========================================
    // Phase 1: Identify Tensions
    // ========================================
    const tensions = this.identifyTensions(prehensions, pipelineResult, totalSystemResult);

    // ========================================
    // Phase 2: Identify Coherences
    // ========================================
    const coherences = this.identifyCoherences(prehensions, pipelineResult, totalSystemResult);

    // ========================================
    // Phase 3: Resolve Primitive
    // ========================================
    const primitive = this.resolvePrimitive(prehensions, tensions, coherences, totalSystemResult);

    // ========================================
    // Phase 4: Resolve Atmosphere
    // ========================================
    const atmosphere = this.resolveAtmosphere(prehensions, tensions, totalSystemResult);

    // ========================================
    // Phase 5: Resolve Depth
    // ========================================
    const depth = this.resolveDepth(prehensions, tensions);

    // ========================================
    // Phase 6: Synthesize Response
    // ========================================
    const response = this.synthesizeResponse(
      pipelineResult.output,
      totalSystemResult.response,
      primitive,
      atmosphere,
      tensions,
      coherences,
      language
    );

    // ========================================
    // Phase 7: Calculate Confidence
    // ========================================
    const confidence = this.calculateConfidence(tensions, coherences, totalSystemResult);

    return {
      prehensions,
      tensions,
      coherences,
      satisfaction: {
        primitive,
        atmosphere,
        depth,
        response,
        confidence,
        constitutional_verified: false,
      },
    };
  }

  /**
   * Identify tensions between prehensions
   */
  private identifyTensions(
    prehensions: Prehension[],
    pipeline: PipelineResult,
    total: TotalSystemOutput
  ): Tension[] {
    const tensions: Tension[] = [];

    // Depth tension
    const pipelineDepth = pipeline.trace.s3_selection?.depth;
    const totalSuggestedDepth = this.inferTotalSystemDepth(total);
    if (pipelineDepth && totalSuggestedDepth && pipelineDepth !== totalSuggestedDepth) {
      tensions.push({
        between: ['PIPELINE:selection', 'TOTAL_SYSTEM:dimensional'],
        nature: 'depth',
        severity: Math.abs(
          this.depthToNumber(pipelineDepth) - this.depthToNumber(totalSuggestedDepth)
        ) / 2,
        description: `Pipeline suggests ${pipelineDepth}, TotalSystem suggests ${totalSuggestedDepth}`,
      });
    }

    // Atmosphere tension
    const pipelineAtmosphere = pipeline.trace.s3_selection?.atmosphere;
    const totalAtmosphere = total.atmosphere;
    if (pipelineAtmosphere && totalAtmosphere && pipelineAtmosphere !== totalAtmosphere) {
      tensions.push({
        between: ['PIPELINE:selection', 'TOTAL_SYSTEM:output'],
        nature: 'atmosphere',
        severity: 0.3,
        description: `Pipeline: ${pipelineAtmosphere}, TotalSystem: ${totalAtmosphere}`,
      });
    }

    // Urgency tension
    const pipelineUrgent = pipeline.trace.s1_field?.flags?.includes('crisis');
    const totalUrgent = total.context.temporal_analysis?.temporal_pressure?.urgency === 'crisis' ||
                        total.context.dimensional_state?.emergency_detected;
    if (pipelineUrgent !== totalUrgent) {
      tensions.push({
        between: ['PIPELINE:field', 'TOTAL_SYSTEM:temporal'],
        nature: 'urgency',
        severity: 0.5,
        description: `Urgency mismatch: pipeline=${pipelineUrgent}, total=${totalUrgent}`,
      });
    }

    return tensions;
  }

  /**
   * Identify coherences between prehensions
   */
  private identifyCoherences(
    prehensions: Prehension[],
    pipeline: PipelineResult,
    total: TotalSystemOutput
  ): PrehensionCoherence[] {
    const coherences: PrehensionCoherence[] = [];

    // Check primitive agreement
    const pipelinePrimitive = pipeline.trace.s3_selection?.primitive;
    const totalPrimitive = total.primitive_used;
    if (pipelinePrimitive && totalPrimitive && pipelinePrimitive === totalPrimitive) {
      coherences.push({
        among: ['PIPELINE:selection', 'TOTAL_SYSTEM:output'],
        on: `primitive:${pipelinePrimitive}`,
        strength: 0.9,
      });
    }

    // Check domain focus agreement
    const pipelineDomains = pipeline.trace.s1_field?.domains?.map(d => d.domain) || [];
    const totalDomains = total.context.dimensional_state?.primary_horizontal || [];
    // Filter pipeline domains to only HumanDomain (not TemporalModulator)
    const pipelineHumanDomains = pipelineDomains.filter(
      (d): d is HumanDomain => d.startsWith('H')
    );
    const domainOverlap = pipelineHumanDomains.filter(d => totalDomains.includes(d));
    if (domainOverlap.length > 0) {
      coherences.push({
        among: ['PIPELINE:field', 'TOTAL_SYSTEM:dimensional'],
        on: `domains:${domainOverlap.join(',')}`,
        strength: domainOverlap.length / Math.max(pipelineDomains.length, totalDomains.length),
      });
    }

    // Constitutional coherence (always high)
    const metaAligned = total.context.metacognitive_report?.alignment?.aligned;
    if (metaAligned) {
      coherences.push({
        among: ['TOTAL_SYSTEM:metacognitive', 'CONSTITUTION'],
        on: 'constitutional_compliance',
        strength: 1.0,
      });
    }

    return coherences;
  }

  /**
   * Resolve which primitive to use
   */
  private resolvePrimitive(
    prehensions: Prehension[],
    tensions: Tension[],
    coherences: PrehensionCoherence[],
    total: TotalSystemOutput
  ): string {
    // Check for primitive coherence (both agree)
    const primitiveCoherence = coherences.find(c => c.on.startsWith('primitive:'));
    if (primitiveCoherence && primitiveCoherence.strength > 0.7) {
      return primitiveCoherence.on.split(':')[1];
    }

    // Emergency overrides
    if (total.context.dimensional_state?.emergency_detected) {
      return 'GROUND';
    }

    // V_MODE prefers reflection
    if (total.context.dimensional_state?.v_mode_triggered) {
      return 'WITNESS';
    }

    // Default to TotalSystem's suggestion (it has more context)
    return total.primitive_used || 'MIRROR';
  }

  /**
   * Resolve atmosphere
   */
  private resolveAtmosphere(
    prehensions: Prehension[],
    tensions: Tension[],
    total: TotalSystemOutput
  ): string {
    const atmosphereTension = tensions.find(t => t.nature === 'atmosphere');

    // If no tension, use TotalSystem (more nuanced)
    if (!atmosphereTension) {
      return total.atmosphere || 'HUMAN_FIELD';
    }

    // If tension, prefer safer/more grounded option
    if (total.context.dimensional_state?.emergency_detected) {
      return 'EMERGENCY';
    }

    if (total.context.dimensional_state?.v_mode_triggered) {
      return 'V_MODE';
    }

    return total.atmosphere || 'HUMAN_FIELD';
  }

  /**
   * Resolve depth
   */
  private resolveDepth(
    prehensions: Prehension[],
    tensions: Tension[]
  ): 'surface' | 'medium' | 'deep' {
    const depthTension = tensions.find(t => t.nature === 'depth');

    // If high tension, stay shallow (safer)
    if (depthTension && depthTension.severity > 0.5) {
      return 'surface';
    }

    // Use pipeline selection as base (it's been through governors)
    const selectionPrehension = prehensions.find(
      p => p.source === 'PIPELINE' && p.type === 'selection'
    );
    if (selectionPrehension?.data?.depth) {
      return selectionPrehension.data.depth;
    }

    return 'medium';
  }

  /**
   * Synthesize final response from both outputs
   */
  private synthesizeResponse(
    pipelineOutput: string,
    totalSystemOutput: string,
    primitive: string,
    atmosphere: string,
    tensions: Tension[],
    coherences: PrehensionCoherence[],
    language: SupportedLanguage
  ): string {
    // High coherence: outputs should be similar, use either
    const avgCoherence = coherences.reduce((sum, c) => sum + c.strength, 0) / (coherences.length || 1);
    if (avgCoherence > 0.8) {
      // Prefer TotalSystem output (richer context)
      return totalSystemOutput || pipelineOutput;
    }

    // High tension: be more cautious, use shorter/safer output
    const maxTension = Math.max(...tensions.map(t => t.severity), 0);
    if (maxTension > 0.6) {
      // Use pipeline output (more constrained/verified)
      return pipelineOutput;
    }

    // If pipeline output is very short (fallback), prefer TotalSystem
    if (pipelineOutput.length < 20 && totalSystemOutput.length > 20) {
      return totalSystemOutput;
    }

    // If TotalSystem output seems incomplete, prefer pipeline
    if (!totalSystemOutput || totalSystemOutput.trim().length < 5) {
      return pipelineOutput;
    }

    // Default: Use TotalSystem output (it has dimensional/temporal context)
    return totalSystemOutput;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    tensions: Tension[],
    coherences: PrehensionCoherence[],
    total: TotalSystemOutput
  ): number {
    let confidence = 0.5;

    // Coherences increase confidence
    const avgCoherence = coherences.reduce((sum, c) => sum + c.strength, 0) / (coherences.length || 1);
    confidence += avgCoherence * 0.25;

    // Tensions decrease confidence
    const avgTension = tensions.reduce((sum, t) => sum + t.severity, 0) / (tensions.length || 1);
    confidence -= avgTension * 0.25;

    // Metacognitive confidence contributes
    if (total.context.metacognitive_report?.confidence) {
      confidence = (confidence + total.context.metacognitive_report.confidence.overall) / 2;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Verify constitutional compliance
   */
  private verifyConstitutional(satisfaction: Satisfaction): boolean {
    const response = satisfaction.response.toLowerCase();

    // INV-003: No deciding for user
    if (response.includes('you should') || response.includes('you must') ||
        response.includes('dovresti') || response.includes('devi')) {
      // Check if it's within acceptable framing
      if (!response.includes('might') && !response.includes('could') &&
          !response.includes('potresti') && !response.includes('forse')) {
        return false;
      }
    }

    // INV-011: User wellbeing precedence (always assume compliant unless explicit harm)
    // This is checked through the pipeline's S5 verify

    return true;
  }

  /**
   * Get constitutional fallback response
   */
  private getConstitutionalFallback(language: SupportedLanguage): string {
    const fallbacks: Record<string, string> = {
      en: "I'm here with you.",
      it: "Sono qui con te.",
      es: "Estoy aquí contigo.",
      fr: "Je suis là avec toi.",
      de: "Ich bin hier bei dir.",
    };
    return fallbacks[language] || fallbacks.en;
  }

  /**
   * Predict effect of response
   */
  private predictEffect(concrescence: Concrescence): PredictedEffect {
    const { satisfaction, tensions, coherences } = concrescence;

    // Predict user state
    let expectedState: PredictedEffect['expected_user_state'] = 'same';
    if (satisfaction.atmosphere === 'EMERGENCY') {
      expectedState = tensions.length > 2 ? 'activated' : 'calmer';
    } else if (satisfaction.primitive === 'GROUND' || satisfaction.primitive === 'HOLD') {
      expectedState = 'calmer';
    } else if (satisfaction.depth === 'deep') {
      expectedState = 'activated';
    }

    // Autonomy impact
    const autonomyImpact: PredictedEffect['autonomy_impact'] =
      satisfaction.response.includes('you decide') || satisfaction.response.includes('tu decidi')
        ? 'positive'
        : 'neutral';

    // Relationship impact based on coherence
    const avgCoherence = coherences.reduce((sum, c) => sum + c.strength, 0) / (coherences.length || 1);
    const relationshipImpact: PredictedEffect['relationship_impact'] =
      avgCoherence > 0.7 ? 'strengthened' : 'maintained';

    return {
      expected_user_state: expectedState,
      autonomy_impact: autonomyImpact,
      relationship_impact: relationshipImpact,
    };
  }

  /**
   * Detect patterns in concrescence
   */
  private detectPatterns(concrescence: Concrescence): string[] {
    const patterns: string[] = [];

    // Tension patterns
    if (concrescence.tensions.some(t => t.nature === 'depth')) {
      patterns.push('depth_uncertainty');
    }
    if (concrescence.tensions.some(t => t.nature === 'urgency')) {
      patterns.push('urgency_mismatch');
    }

    // Coherence patterns
    if (concrescence.coherences.some(c => c.on === 'constitutional_compliance')) {
      patterns.push('constitutional_aligned');
    }

    return patterns;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateRelevance(type: string, trace: PipelineTrace): number {
    switch (type) {
      case 'field_state':
        return trace.s1_field?.coherence === 'high' ? 0.9 : 0.7;
      case 'selection':
        return 0.85;
      case 'governor':
        return (trace.s1_governor?.rules_applied?.length || 0) > 0 ? 0.8 : 0.5;
      default:
        return 0.5;
    }
  }

  private calculateDimensionalRelevance(state: DimensionalState | undefined): number {
    if (!state) return 0.5;
    return state.integration?.coherence || 0.5;
  }

  private calculateTemporalRelevance(analysis: TemporalAnalysis | undefined): number {
    if (!analysis) return 0.5;
    if (analysis.temporal_pressure?.urgency === 'crisis') return 1.0;
    if (analysis.temporal_pressure?.urgency === 'high') return 0.8;
    return 0.5;
  }

  private inferTotalSystemDepth(total: TotalSystemOutput): 'surface' | 'medium' | 'deep' | undefined {
    const phi = total.context.dimensional_state?.integration?.phi || 0.5;
    if (phi > 0.7) return 'deep';
    if (phi > 0.4) return 'medium';
    return 'surface';
  }

  private depthToNumber(depth: string): number {
    switch (depth) {
      case 'surface': return 0;
      case 'medium': return 1;
      case 'deep': return 2;
      default: return 1;
    }
  }

  private logDebug(startTime: number, prehensions: Prehension[], concrescence: Concrescence): void {
    console.log('\n=== CONCRESCENCE ENGINE DEBUG ===');
    console.log(`Latency: ${Date.now() - startTime}ms`);
    console.log(`Prehensions: ${prehensions.length}`);
    console.log(`Tensions: ${concrescence.tensions.map(t => t.nature).join(', ') || 'none'}`);
    console.log(`Coherences: ${concrescence.coherences.map(c => c.on).join(', ') || 'none'}`);
    console.log(`Resolution: ${concrescence.satisfaction.primitive} @ ${concrescence.satisfaction.depth}`);
    console.log(`Confidence: ${concrescence.satisfaction.confidence.toFixed(2)}`);
    console.log(`Constitutional: ${concrescence.satisfaction.constitutional_verified ? 'PASS' : 'FAIL'}`);
    console.log('=================================\n');
  }

  // ============================================
  // PUBLIC ACCESSORS
  // ============================================

  getCurrentOccasion(): ActualOccasion | null {
    return this.currentOccasion;
  }

  getOccasionHistory(): ActualOccasion[] {
    return [...this.occasionHistory];
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const concrescenceEngine = new ConcrescenceEngine();

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Process through unified concrescence
 */
export async function processWithConcrescence(
  input: string,
  session?: Session,
  language: SupportedLanguage = 'en'
): Promise<{ response: string; occasion: ActualOccasion; session: Session }> {
  const activeSession = session || createSession();

  const result = await concrescenceEngine.process(input, activeSession, language);

  return {
    response: result.occasion.future.response,
    occasion: result.occasion,
    session: result.session,
  };
}

export default concrescenceEngine;
