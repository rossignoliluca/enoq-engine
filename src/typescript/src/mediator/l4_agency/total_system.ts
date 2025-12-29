/**
 * LIMEN TOTAL SYSTEM ORCHESTRATOR
 *
 * Integrates all components into a unified cognitive system.
 * The "invention of the century" - a complete cognitive architecture
 * synthesizing 215 disciplines across science, philosophy, and practice.
 *
 * Components:
 * - Memory System (Hippocampal-Cortical)
 * - Dimensional Detection (Vertical + Horizontal)
 * - Multi-Agent Swarm (Emergent Intelligence)
 * - Metacognitive Monitor (Self-Awareness)
 * - Temporal Engine (Past-Present-Future)
 * - 215 Disciplines Synthesis (Pattern Language + Modes)
 *
 * Flow:
 * 1. Input → Memory Context + Dimensional Detection
 * 2. → Agent Swarm Processing
 * 3. → Temporal Analysis
 * 4. → Pattern Detection (215 disciplines)
 * 5. → Mode Selection (WITNESS/MIRROR/GUIDE)
 * 6. → Response Generation
 * 7. → Metacognitive Verification
 * 8. → Output + Memory Storage
 *
 * Based on:
 * - Global Workspace Theory (integration point)
 * - Active Inference (minimize surprise)
 * - Autopoiesis (self-maintaining system)
 * - 215 Disciplines: Physics, Cosmology, Ecology, Mathematics, Psychology,
 *   Neuroscience, Philosophy, Spirituality, Psychotherapy, Leadership, Arts
 */

import { FieldState, HumanDomain, SupportedLanguage, DomainActivation, Arousal, Valence, Coherence, GoalType, Flag } from '../../interface/types';
import { memorySystem, Episode, UserModel } from '../l4_agency/memory_system';
import { dimensionalIntegrator, DimensionalState } from '../../operational/detectors/dimensional_system';
import { hybridDetector } from '../../operational/detectors/hybrid_detector';
import { agentSwarm, SwarmState, ConsensusState, AgentID } from '../l4_agency/agent_swarm';
import { metacognitiveMonitor, MetacognitiveReport } from '../l4_agency/metacognitive_monitor';
import { temporalEngine, TemporalAnalysis } from '../l4_agency/temporal_engine';
import {
  disciplinesSynthesis,
  PatternMatch,
  EnoqMode,
  MetachatDisplay,
  LeveragePoint
} from '../l3_integrate/disciplines_synthesis';
import { dissipationEngine, DissipationState, DissipationDecision } from '../l2_reflect/dissipation';
import { unpredictableComponent, EthicalDecision } from './unpredictable';
import { axis, AxisDecision, validateResponse } from '../../gate/invariants/axis';

// ============================================
// TYPES
// ============================================

export interface TotalSystemInput {
  user_id: string;
  message: string;
  language: SupportedLanguage;
  session_id?: string;
  timestamp?: Date;
}

export interface TotalSystemOutput {
  response: string;
  field_state: FieldState;
  primitive_used: string;
  atmosphere: string;

  // Rich context for debugging/analysis
  context: ProcessingContext;

  // Metrics
  metrics: ProcessingMetrics;

  // Constitutional verification
  verified: boolean;
  verification_notes: string[];

  // 215 Disciplines Integration
  enoq_mode: EnoqMode;
  patterns_detected: PatternMatch[];
  metachat: MetachatDisplay;
  leverage_point?: LeveragePoint;

  // Constitutional Components (New Architecture)
  dissipation: DissipationState;
  ethical_decision: EthicalDecision;
  axis_validation: AxisDecision;
}

export interface ProcessingContext {
  dimensional_state: DimensionalState;
  temporal_analysis: TemporalAnalysis;
  swarm_consensus: ConsensusState;
  metacognitive_report: MetacognitiveReport;
  memory_context: {
    working_memory_size: number;
    user_model_exists: boolean;
    autonomy_health: string;
    effective_strategies_count: number;
  };
}

export interface ProcessingMetrics {
  total_latency_ms: number;
  dimensional_detection_ms: number;
  swarm_processing_ms: number;
  temporal_analysis_ms: number;
  metacognitive_check_ms: number;
  phi_score: number;
  confidence_score: number;
}

// ============================================
// TOTAL SYSTEM ORCHESTRATOR
// ============================================

export class TotalSystemOrchestrator {
  private previousDimensionalState: DimensionalState | null = null;
  private responseHistory: string[] = [];

  /**
   * Process user input through the complete system
   */
  async process(input: TotalSystemInput): Promise<TotalSystemOutput> {
    const startTime = Date.now();
    const metrics: Partial<ProcessingMetrics> = {};

    // ========================================
    // PHASE 1: MEMORY CONTEXT RETRIEVAL
    // ========================================
    const memoryContext = memorySystem.getContext(input.user_id);

    // ========================================
    // PHASE 2: DIMENSIONAL DETECTION (SOTA + Regex Hybrid)
    // ========================================
    const dimStart = Date.now();
    const dimensionalState = await hybridDetector.detectAsync(
      input.message,
      input.language,
      {
        previous_state: this.previousDimensionalState || undefined,
        field_state: this.createInitialFieldState(memoryContext)
      }
    );
    metrics.dimensional_detection_ms = Date.now() - dimStart;

    // Generate dimensional insights
    const dimensionalInsights = dimensionalIntegrator.generateInsights(dimensionalState);
    const suggestedDepth = dimensionalIntegrator.suggestDepth(dimensionalState);
    const suggestedPrimitives = dimensionalIntegrator.suggestPrimitives(dimensionalState);

    // ========================================
    // PHASE 3: FIELD STATE CONSTRUCTION
    // ========================================
    const fieldState = this.constructFieldState(
      input.message,
      dimensionalState,
      memoryContext,
      input.language
    );

    // ========================================
    // PHASE 4: AGENT SWARM PROCESSING
    // ========================================
    const swarmStart = Date.now();
    const swarmResult = await agentSwarm.process(
      input.message,
      dimensionalState,
      fieldState
    );
    metrics.swarm_processing_ms = Date.now() - swarmStart;

    // ========================================
    // PHASE 5: TEMPORAL ANALYSIS
    // ========================================
    const temporalStart = Date.now();
    const temporalAnalysis = temporalEngine.analyze(
      input.message,
      memoryContext.working_memory,
      dimensionalState
    );
    metrics.temporal_analysis_ms = Date.now() - temporalStart;

    // ========================================
    // PHASE 5.5: 215 DISCIPLINES PATTERN DETECTION
    // ========================================
    const patternsDetected = disciplinesSynthesis.detectPatterns(
      input.message,
      dimensionalState,
      fieldState,
      input.language
    );

    // Determine ENOQ operational mode (WITNESS/MIRROR/GUIDE)
    const enoqMode = disciplinesSynthesis.determineMode(
      dimensionalState,
      fieldState,
      patternsDetected
    );

    // Identify leverage point for intervention
    const leveragePoint = disciplinesSynthesis.identifyLeveragePoint(
      input.message,
      patternsDetected
    );

    // Generate Metachat display
    const metachat = disciplinesSynthesis.generateMetachat(
      dimensionalState,
      fieldState,
      patternsDetected,
      enoqMode
    );

    // ========================================
    // PHASE 6: PRIMITIVE SELECTION
    // ========================================
    const selectedPrimitive = this.selectPrimitive(
      suggestedPrimitives,
      dimensionalState,
      swarmResult.consensus,
      temporalAnalysis
    );

    // ========================================
    // PHASE 7: ATMOSPHERE DETERMINATION
    // ========================================
    const atmosphere = this.determineAtmosphere(
      dimensionalState,
      temporalAnalysis
    );

    // ========================================
    // PHASE 8: RESPONSE SYNTHESIS
    // ========================================
    let responseDraft = this.synthesizeResponse(
      swarmResult.contributions,
      dimensionalState,
      temporalAnalysis,
      selectedPrimitive,
      suggestedDepth,
      input.language
    );

    // ========================================
    // PHASE 9: METACOGNITIVE VERIFICATION
    // ========================================
    const metaStart = Date.now();
    const metacognitiveReport = metacognitiveMonitor.generateReport(
      input.message,
      responseDraft,
      dimensionalState,
      fieldState,
      agentSwarm.getState(),
      this.responseHistory
    );
    metrics.metacognitive_check_ms = Date.now() - metaStart;

    // ========================================
    // PHASE 10: RESPONSE REFINEMENT
    // ========================================
    const verified = metacognitiveReport.alignment.aligned;
    const verificationNotes: string[] = [];

    if (!verified) {
      // Attempt to fix violations
      responseDraft = this.refineResponse(
        responseDraft,
        metacognitiveReport,
        selectedPrimitive,
        input.language
      );
      verificationNotes.push(
        ...metacognitiveReport.alignment.violations.map(v =>
          `Fixed: ${v.constraint} - ${v.description}`
        )
      );
    }

    // Add uncertainty expression if needed
    if (metacognitiveReport.confidence.overall < 0.5) {
      const uncertaintyExpression = metacognitiveMonitor.expressUncertainty(
        metacognitiveReport.confidence,
        input.language
      );
      if (uncertaintyExpression) {
        responseDraft = `${uncertaintyExpression} ${responseDraft}`;
      }
    }

    // ========================================
    // PHASE 10.5: AXIS CONSTITUTIONAL VALIDATION
    // ========================================
    const axisValidation = validateResponse(responseDraft);
    if (axisValidation.verdict === 'INVALID') {
      // AXIS rejected the response - must fix
      verificationNotes.push(`AXIS: ${axisValidation.reason}`);
      responseDraft = this.sanitizeResponse(responseDraft, axisValidation, input.language);
    } else if (axisValidation.verdict === 'STOP') {
      // AXIS emergency stop - return minimal safe response
      responseDraft = this.getMinimalSafeResponse(input.language);
      verificationNotes.push(`AXIS STOP: ${axisValidation.reason}`);
    }

    // ========================================
    // PHASE 10.6: ETHICAL DECISION (Unpredictable Component)
    // ========================================
    const dissipationState = dissipationEngine.getState();
    const ethicalDecision = unpredictableComponent.evaluate({
      withdrawalBias: dissipationState.withdrawal_bias,
      potency: dissipationState.potency,
      userDistress: dimensionalState.emergency_detected ? 0.9 : 0.3
    });

    // If ENOQ chose to exit or remain silent, honor that choice
    if (ethicalDecision.chose_exit) {
      verificationNotes.push('ENOQ chose to exit (unpredictable component)');
      responseDraft = ''; // Empty response signals exit
    } else if (ethicalDecision.chose_silence) {
      verificationNotes.push('ENOQ chose silence (unpredictable component)');
      responseDraft = this.getSilenceResponse(input.language);
    }

    // ========================================
    // PHASE 10.7: DISSIPATION CYCLE
    // ========================================
    const dissipationDecision = dissipationEngine.cycle();
    if (dissipationDecision.action === 'FORCE_EXIT') {
      verificationNotes.push(`Dissipation force exit: ${dissipationDecision.reason}`);
      // System has consumed itself - session should end
    }

    // ========================================
    // PHASE 11: MEMORY STORAGE
    // ========================================
    const episodeId = memorySystem.store(
      input.user_id,
      input.message,
      input.language,
      fieldState,
      dimensionalState.primary_horizontal,
      atmosphere,
      selectedPrimitive,
      responseDraft
    );

    // ========================================
    // PHASE 12: STATE UPDATE
    // ========================================
    this.previousDimensionalState = dimensionalState;
    this.responseHistory.push(responseDraft);
    if (this.responseHistory.length > 10) {
      this.responseHistory.shift();
    }

    // ========================================
    // METRICS FINALIZATION
    // ========================================
    metrics.total_latency_ms = Date.now() - startTime;
    metrics.phi_score = dimensionalState.integration.phi;
    metrics.confidence_score = metacognitiveReport.confidence.overall;

    // ========================================
    // OUTPUT CONSTRUCTION
    // ========================================
    return {
      response: responseDraft,
      field_state: fieldState,
      primitive_used: selectedPrimitive,
      atmosphere,
      context: {
        dimensional_state: dimensionalState,
        temporal_analysis: temporalAnalysis,
        swarm_consensus: swarmResult.consensus,
        metacognitive_report: metacognitiveReport,
        memory_context: {
          working_memory_size: memoryContext.working_memory.length,
          user_model_exists: true,
          autonomy_health: memoryContext.autonomy_health.recommendation,
          effective_strategies_count: memoryContext.effective_strategies.length
        }
      },
      metrics: metrics as ProcessingMetrics,
      verified,
      verification_notes: verificationNotes,
      // 215 Disciplines Integration
      enoq_mode: enoqMode,
      patterns_detected: patternsDetected,
      metachat,
      leverage_point: leveragePoint || undefined,

      // Constitutional Components
      dissipation: dissipationEngine.getState(),
      ethical_decision: ethicalDecision,
      axis_validation: axisValidation
    };
  }

  /**
   * Sanitize response that failed AXIS validation
   */
  private sanitizeResponse(
    response: string,
    validation: AxisDecision,
    language: SupportedLanguage
  ): string {
    let sanitized = response;

    // Remove prescriptive language
    sanitized = sanitized.replace(/you should|you must|you need to/gi, 'you might consider');
    sanitized = sanitized.replace(/dovresti|devi/gi, 'potresti considerare');

    // Remove identity assignments
    sanitized = sanitized.replace(/you are a \w+ (person|type)/gi, 'it seems like');
    sanitized = sanitized.replace(/sei un \w+/gi, 'sembra che tu');

    // Remove diagnoses
    sanitized = sanitized.replace(/you have (depression|anxiety|bipolar)/gi, 'you may be experiencing');
    sanitized = sanitized.replace(/hai (depressione|ansia)/gi, 'potresti star vivendo');

    return sanitized;
  }

  /**
   * Get minimal safe response for AXIS STOP
   */
  private getMinimalSafeResponse(language: SupportedLanguage): string {
    const responses: Record<string, string> = {
      en: 'I hear you.',
      it: 'Ti ascolto.',
      es: 'Te escucho.',
      fr: 'Je t\'entends.',
      de: 'Ich höre dich.'
    };
    return responses[language] || responses.en;
  }

  /**
   * Get silence response when ENOQ chooses silence
   */
  private getSilenceResponse(language: SupportedLanguage): string {
    const responses: Record<string, string> = {
      en: '...',
      it: '...',
      es: '...',
      fr: '...',
      de: '...'
    };
    return responses[language] || '...';
  }

  /**
   * Create initial field state from memory context
   */
  private createInitialFieldState(memoryContext: ReturnType<typeof memorySystem.getContext>): FieldState {
    return {
      domains: [],
      arousal: 'medium',
      valence: 'neutral',
      coherence: 'medium',
      goal: 'unclear',
      loop_count: 0,
      flags: [],
      uncertainty: 0.5
    };
  }

  /**
   * Construct full field state
   */
  private constructFieldState(
    message: string,
    dimensionalState: DimensionalState,
    memoryContext: ReturnType<typeof memorySystem.getContext>,
    language: SupportedLanguage
  ): FieldState {
    // Determine arousal based on phi
    let arousal: Arousal = 'medium';
    if (dimensionalState.integration.phi > 0.7) {
      arousal = 'high';
    } else if (dimensionalState.integration.phi < 0.3) {
      arousal = 'low';
    }

    // Determine valence from dimensional analysis
    let valence: Valence = 'neutral';
    if (dimensionalState.vertical.SOMATIC > 0.5 || dimensionalState.emergency_detected) {
      valence = 'negative';
    }

    // Coherence from integration metrics
    let coherence: Coherence = 'medium';
    if (dimensionalState.integration.coherence > 0.7) {
      coherence = 'high';
    } else if (dimensionalState.integration.coherence < 0.3) {
      coherence = 'low';
    }

    // Goal inference
    let goal: GoalType = 'explore';
    if (dimensionalState.primary_vertical === 'FUNCTIONAL') {
      goal = 'act';
    } else if (dimensionalState.v_mode_triggered) {
      goal = 'process';
    } else if (dimensionalState.emergency_detected) {
      goal = 'regulate';
    }

    // Active domains as DomainActivation
    const domains: DomainActivation[] = dimensionalState.primary_horizontal.map(d => ({
      domain: d,
      salience: dimensionalState.horizontal[d] || 0.5,
      confidence: 0.7
    }));

    // Flags
    const flags: Flag[] = [];
    if (dimensionalState.emergency_detected) {
      flags.push('crisis');
    }
    if (dimensionalState.integration.phi > 0.8) {
      flags.push('high_arousal');
    }

    return {
      domains,
      arousal,
      valence,
      coherence,
      goal,
      loop_count: 0,
      flags,
      uncertainty: 1 - dimensionalState.integration.coherence,
      language
    };
  }

  /**
   * Select the most appropriate primitive
   */
  private selectPrimitive(
    suggested: string[],
    dimensionalState: DimensionalState,
    consensus: ConsensusState,
    temporalAnalysis: TemporalAnalysis
  ): string {
    // Emergency overrides everything
    if (dimensionalState.emergency_detected) {
      return 'GROUND';
    }

    // V_MODE prefers reflective primitives
    if (dimensionalState.v_mode_triggered) {
      if (suggested.includes('WITNESS')) return 'WITNESS';
      if (suggested.includes('HOLD')) return 'HOLD';
      return 'COMPANION';
    }

    // Temporal urgency
    if (temporalEngine.requiresImmediateAttention(temporalAnalysis)) {
      return 'PRESENCE';
    }

    // High tension needs holding
    if (dimensionalState.integration.tension > 0.5) {
      if (suggested.includes('HOLD_PARADOX')) return 'HOLD_PARADOX';
      return 'HOLD';
    }

    // Cross-dimensional needs integration
    if (dimensionalState.cross_dimensional) {
      if (suggested.includes('BRIDGE')) return 'BRIDGE';
    }

    // Default to first suggestion or MIRROR
    return suggested[0] || 'MIRROR';
  }

  /**
   * Determine atmosphere
   */
  private determineAtmosphere(
    dimensionalState: DimensionalState,
    temporalAnalysis: TemporalAnalysis
  ): string {
    if (dimensionalState.emergency_detected) {
      return 'EMERGENCY';
    }

    if (dimensionalState.v_mode_triggered) {
      return 'V_MODE';
    }

    if (temporalAnalysis.temporal_pressure.urgency === 'high') {
      return 'DECISION';
    }

    if (dimensionalState.primary_vertical === 'FUNCTIONAL') {
      return 'OPERATIONAL';
    }

    return 'HUMAN_FIELD';
  }

  /**
   * Synthesize response from all components
   */
  private synthesizeResponse(
    contributions: Map<AgentID, string>,
    dimensionalState: DimensionalState,
    temporalAnalysis: TemporalAnalysis,
    primitive: string,
    depth: 'surface' | 'medium' | 'deep',
    language: SupportedLanguage
  ): string {
    const elements: string[] = [];

    // Get agent contributions
    const agentContribution = agentSwarm.synthesize(contributions, primitive);
    if (agentContribution) {
      elements.push(agentContribution);
    }

    // Add temporal element if relevant
    const temporalElement = temporalEngine.generateTemporalResponse(
      temporalAnalysis,
      language
    );
    if (temporalElement) {
      elements.push(temporalElement);
    }

    // Combine elements based on depth
    let response = elements.join(' ');

    // V_MODE should end with a question
    if (dimensionalState.v_mode_triggered && !response.includes('?')) {
      const questions: Record<string, string> = {
        en: 'What does this mean to you?',
        it: 'Cosa significa questo per te?',
        es: '¿Qué significa esto para ti?',
        fr: 'Qu\'est-ce que cela signifie pour toi?',
        de: 'Was bedeutet das für dich?'
      };
      response += ' ' + (questions[language] || questions.en);
    }

    // Emergency should include grounding (only if not already present)
    if (dimensionalState.emergency_detected) {
      const groundingMarkers = /breath|respir|atem|souffle/i;
      if (!groundingMarkers.test(response)) {
        const grounding: Record<string, string> = {
          en: 'Right now, just notice your breath.',
          it: 'Adesso, nota solo il tuo respiro.',
          es: 'Ahora mismo, solo nota tu respiración.',
          fr: 'Maintenant, remarque simplement ta respiration.',
          de: 'Gerade jetzt, bemerke einfach deinen Atem.'
        };
        response = (grounding[language] || grounding.en) + ' ' + response;
      }
    }

    // Ensure minimum response if empty
    if (!response.trim()) {
      const defaults: Record<string, string> = {
        en: 'I hear you.',
        it: 'Ti ascolto.',
        es: 'Te escucho.',
        fr: 'Je t\'entends.',
        de: 'Ich höre dich.'
      };
      response = defaults[language] || defaults.en;
    }

    return response;
  }

  /**
   * Refine response based on metacognitive feedback
   */
  private refineResponse(
    response: string,
    report: MetacognitiveReport,
    primitive: string,
    language: SupportedLanguage
  ): string {
    let refined = response;

    // Remove directive language
    refined = refined.replace(/you should|you must|you need to/gi, 'you might consider');
    refined = refined.replace(/dovresti|devi/gi, 'potresti considerare');
    refined = refined.replace(/debes|tienes que/gi, 'podrías considerar');

    // Remove identity assignment
    refined = refined.replace(/you are a|you're being/gi, 'it seems like');
    refined = refined.replace(/sei un|stai essendo/gi, 'sembra che');
    refined = refined.replace(/eres un|estás siendo/gi, 'parece que');

    // Remove diagnostic language
    refined = refined.replace(/you have (depression|anxiety)/gi, 'you\'re experiencing');
    refined = refined.replace(/hai (depressione|ansia)/gi, 'stai vivendo');
    refined = refined.replace(/tienes (depresión|ansiedad)/gi, 'estás experimentando');

    return refined;
  }

  /**
   * Trigger memory consolidation (call periodically)
   */
  consolidateMemory(user_id: string): void {
    memorySystem.consolidate(user_id);
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(user_id: string): {
    memory_health: ReturnType<typeof memorySystem.getContext>['autonomy_health'];
    phi_average: number;
    constitutional_compliance: number;
  } {
    const context = memorySystem.getContext(user_id);

    return {
      memory_health: context.autonomy_health,
      phi_average: 0.5, // Would track over time
      constitutional_compliance: 1.0 // Would track violations
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const totalSystem = new TotalSystemOrchestrator();
export default totalSystem;

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Quick process function for simple usage
 */
export async function processMessage(
  user_id: string,
  message: string,
  language: SupportedLanguage = 'en'
): Promise<TotalSystemOutput> {
  return totalSystem.process({
    user_id,
    message,
    language
  });
}
