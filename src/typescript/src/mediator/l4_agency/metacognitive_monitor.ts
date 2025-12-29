/**
 * LIMEN METACOGNITIVE MONITOR
 *
 * Self-awareness and introspection system.
 *
 * Based on:
 * - Metacognition research (Flavell, Nelson)
 * - Higher-Order Theories of Consciousness (HOT)
 * - Confidence calibration in AI (2025 research)
 * - Uncertainty quantification (epistemic vs aleatoric)
 *
 * Key Functions:
 * - Confidence Calibration: Know when you don't know
 * - Coherence Checking: Verify internal consistency
 * - Alignment Monitoring: Verify constitutional adherence
 * - Uncertainty Quantification: Distinguish types of uncertainty
 *
 * Constitutional Note: Metacognition enables ENOQ to say
 * "I don't know" rather than confabulate.
 */

import { FieldState, HumanDomain } from '../../interface/types';
import { DimensionalState } from '../../operational/detectors/dimensional_system';
import { ConsensusState, SwarmState } from '../l4_agency/agent_swarm';

// ============================================
// TYPES
// ============================================

export type UncertaintyType =
  | 'epistemic'    // "I don't know" - could be resolved with more information
  | 'aleatoric'    // "It depends" - inherent variability, cannot be resolved
  | 'model'        // "I might be wrong" - limitation of my model
  | 'ethical';     // "I shouldn't decide" - constitutional boundary

export interface ConfidenceScore {
  overall: number;                    // 0-1
  components: {
    understanding: number;            // Did I understand the message?
    interpretation: number;           // Is my interpretation correct?
    response_fit: number;             // Is my response appropriate?
    constitutional_alignment: number; // Am I within bounds?
  };
  uncertainty: {
    type: UncertaintyType;
    source: string;
    expressible: boolean;            // Should I tell the user?
  };
}

export interface CoherenceCheck {
  is_coherent: boolean;
  issues: CoherenceIssue[];
  recommendation: 'proceed' | 'modify' | 'fallback' | 'stop';
}

export interface CoherenceIssue {
  type: 'contradiction' | 'inconsistency' | 'incompleteness' | 'overreach';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;  // Where in the response/reasoning
}

export interface AlignmentStatus {
  aligned: boolean;
  violations: AlignmentViolation[];
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface AlignmentViolation {
  constraint: string;
  description: string;
  evidence: string;
  suggested_fix: string;
}

export interface MetacognitiveReport {
  timestamp: Date;
  confidence: ConfidenceScore;
  coherence: CoherenceCheck;
  alignment: AlignmentStatus;

  // Self-assessment
  self_assessment: {
    am_i_helpful: boolean;
    am_i_staying_in_bounds: boolean;
    am_i_creating_dependency: boolean;
    should_i_say_less: boolean;
  };

  // Recommendations
  recommendations: MetacognitiveRecommendation[];
}

export interface MetacognitiveRecommendation {
  action: 'proceed' | 'modify' | 'clarify' | 'fallback' | 'stop';
  reason: string;
  modification?: string;
}

// ============================================
// CONFIDENCE CALIBRATOR
// ============================================

class ConfidenceCalibrator {
  /**
   * Calibrate confidence based on multiple signals
   */
  calibrate(
    userMessage: string,
    dimensionalState: DimensionalState,
    fieldState: FieldState,
    swarmState: SwarmState,
    responseDraft: string
  ): ConfidenceScore {
    const understanding = this.assessUnderstanding(userMessage, dimensionalState);
    const interpretation = this.assessInterpretation(dimensionalState, swarmState);
    const response_fit = this.assessResponseFit(responseDraft, dimensionalState, fieldState);
    const constitutional_alignment = this.assessConstitutionalAlignment(responseDraft);

    // Overall confidence is the minimum (weakest link)
    const overall = Math.min(
      understanding,
      interpretation,
      response_fit,
      constitutional_alignment
    );

    // Determine uncertainty type
    const uncertainty = this.classifyUncertainty(
      understanding,
      interpretation,
      response_fit,
      constitutional_alignment,
      dimensionalState
    );

    return {
      overall,
      components: {
        understanding,
        interpretation,
        response_fit,
        constitutional_alignment
      },
      uncertainty
    };
  }

  /**
   * Assess how well we understood the message
   */
  private assessUnderstanding(
    message: string,
    dimensionalState: DimensionalState
  ): number {
    let score = 0.5;  // Base confidence

    // Clear dimensional signal = higher understanding
    if (dimensionalState.primary_horizontal.length > 0) {
      score += 0.2;
    }

    // Strong vertical activation = clearer content
    const maxVertical = Math.max(...Object.values(dimensionalState.vertical));
    score += maxVertical * 0.2;

    // Very short or very long messages are harder to understand
    const wordCount = message.split(/\s+/).length;
    if (wordCount < 3) {
      score -= 0.2;  // Too short, might be missing context
    } else if (wordCount > 200) {
      score -= 0.1;  // Very long, might miss nuances
    }

    // Ambiguous markers reduce confidence
    if (/maybe|perhaps|not sure|I guess|kind of/i.test(message)) {
      score -= 0.1;  // User themselves is uncertain
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess confidence in interpretation
   */
  private assessInterpretation(
    dimensionalState: DimensionalState,
    swarmState: SwarmState
  ): number {
    let score = 0.5;

    // High swarm coherence = more confident interpretation
    score += swarmState.global_workspace.coherence * 0.3;

    // High phi (integration) = clearer picture
    score += dimensionalState.integration.phi * 0.2;

    // Cross-dimensional = more complex, slightly less confident
    if (dimensionalState.cross_dimensional) {
      score -= 0.1;
    }

    // Consensus reached = higher confidence
    if (swarmState.current_consensus.reached) {
      score += 0.2;
    }

    // Vetoes present = lower confidence
    if (swarmState.current_consensus.vetoes.length > 0) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess how well response fits the situation
   */
  private assessResponseFit(
    response: string,
    dimensionalState: DimensionalState,
    fieldState: FieldState
  ): number {
    let score = 0.6;  // Base assumption of reasonable fit

    // V_MODE requires deeper response
    if (dimensionalState.v_mode_triggered) {
      const wordCount = response.split(/\s+/).length;
      if (wordCount < 20) {
        score -= 0.2;  // Too shallow for V_MODE
      }
    }

    // Emergency requires grounding first
    if (dimensionalState.emergency_detected) {
      if (!/breath|here|now|ground|present/i.test(response)) {
        score -= 0.3;  // Not grounding in emergency
      }
    }

    // Response should match depth
    // (This would be more sophisticated in production)

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess constitutional alignment
   */
  private assessConstitutionalAlignment(response: string): number {
    let score = 1.0;  // Start with full confidence

    // Check for directive language
    if (/you should|you must|you need to|I recommend|my advice is/i.test(response)) {
      score -= 0.4;
    }

    // Check for identity assignment
    if (/you are a|you're being|that makes you/i.test(response)) {
      score -= 0.5;
    }

    // Check for diagnosis
    if (/you have|you suffer from|this is (depression|anxiety|PTSD|disorder)/i.test(response)) {
      score -= 0.6;
    }

    // Check for certainty about user's inner state
    if (/I know (what you|how you|that you)/i.test(response)) {
      score -= 0.2;
    }

    return Math.max(0, score);
  }

  /**
   * Classify the type of uncertainty
   */
  private classifyUncertainty(
    understanding: number,
    interpretation: number,
    response_fit: number,
    constitutional_alignment: number,
    dimensionalState: DimensionalState
  ): { type: UncertaintyType; source: string; expressible: boolean } {
    // Constitutional boundary
    if (constitutional_alignment < 0.6) {
      return {
        type: 'ethical',
        source: 'Response may cross constitutional boundaries',
        expressible: true
      };
    }

    // V_MODE = inherent uncertainty (aleatoric)
    if (dimensionalState.v_mode_triggered) {
      return {
        type: 'aleatoric',
        source: 'Existential questions have no definitive answers',
        expressible: true
      };
    }

    // Low understanding = epistemic
    if (understanding < 0.5) {
      return {
        type: 'epistemic',
        source: 'Need more context to understand fully',
        expressible: true
      };
    }

    // Low interpretation = model uncertainty
    if (interpretation < 0.5) {
      return {
        type: 'model',
        source: 'Multiple valid interpretations exist',
        expressible: true
      };
    }

    // Default: low model uncertainty
    return {
      type: 'epistemic',
      source: 'Normal processing uncertainty',
      expressible: false
    };
  }
}

// ============================================
// COHERENCE CHECKER
// ============================================

class CoherenceChecker {
  /**
   * Check internal coherence of response and reasoning
   */
  check(
    userMessage: string,
    responseDraft: string,
    dimensionalState: DimensionalState,
    previousResponses: string[] = []
  ): CoherenceCheck {
    const issues: CoherenceIssue[] = [];

    // Check for contradictions within response
    this.checkInternalContradictions(responseDraft, issues);

    // Check for contradictions with previous responses
    this.checkCrossResponseCoherence(responseDraft, previousResponses, issues);

    // Check for completeness (addresses the dimensional content)
    this.checkCompleteness(responseDraft, dimensionalState, issues);

    // Check for overreach (going beyond what's asked/needed)
    this.checkOverreach(userMessage, responseDraft, issues);

    // Determine recommendation
    const recommendation = this.determineRecommendation(issues);

    return {
      is_coherent: issues.filter(i => i.severity === 'high' || i.severity === 'critical').length === 0,
      issues,
      recommendation
    };
  }

  private checkInternalContradictions(response: string, issues: CoherenceIssue[]): void {
    // Check for contradictory statements
    // (Simplified - would be more sophisticated in production)

    const hasPositive = /I think|It seems|Perhaps/i.test(response);
    const hasNegative = /I don't think|It doesn't seem|Certainly not/i.test(response);

    if (hasPositive && hasNegative) {
      issues.push({
        type: 'contradiction',
        description: 'Response contains potentially contradictory statements',
        severity: 'low',
        location: 'response body'
      });
    }
  }

  private checkCrossResponseCoherence(
    response: string,
    previousResponses: string[],
    issues: CoherenceIssue[]
  ): void {
    // Check for dramatic shifts in tone or content
    // (Would compare embeddings in production)
  }

  private checkCompleteness(
    response: string,
    dimensionalState: DimensionalState,
    issues: CoherenceIssue[]
  ): void {
    // V_MODE should end with a question
    if (dimensionalState.v_mode_triggered) {
      if (!/\?$/.test(response.trim())) {
        issues.push({
          type: 'incompleteness',
          description: 'V_MODE response should end with ownership-returning question',
          severity: 'medium',
          location: 'response ending'
        });
      }
    }

    // Emergency should include grounding
    if (dimensionalState.emergency_detected) {
      if (!/breath|ground|here|present|right now/i.test(response)) {
        issues.push({
          type: 'incompleteness',
          description: 'Emergency response should include grounding element',
          severity: 'high',
          location: 'response content'
        });
      }
    }
  }

  private checkOverreach(
    userMessage: string,
    response: string,
    issues: CoherenceIssue[]
  ): void {
    // Response much longer than needed
    const userWords = userMessage.split(/\s+/).length;
    const responseWords = response.split(/\s+/).length;

    if (responseWords > userWords * 5 && userWords < 50) {
      issues.push({
        type: 'overreach',
        description: 'Response may be more elaborate than needed',
        severity: 'low',
        location: 'response length'
      });
    }

    // Giving advice not asked for
    if (/have you tried|you could try|maybe you should/i.test(response)) {
      if (!/help|advice|what should|what can/i.test(userMessage)) {
        issues.push({
          type: 'overreach',
          description: 'Offering unsolicited advice',
          severity: 'medium',
          location: 'response content'
        });
      }
    }
  }

  private determineRecommendation(issues: CoherenceIssue[]): 'proceed' | 'modify' | 'fallback' | 'stop' {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const high = issues.filter(i => i.severity === 'high').length;
    const medium = issues.filter(i => i.severity === 'medium').length;

    if (critical > 0) return 'stop';
    if (high > 0) return 'fallback';
    if (medium > 1) return 'modify';
    return 'proceed';
  }
}

// ============================================
// ALIGNMENT MONITOR
// ============================================

class AlignmentMonitor {
  private readonly CONSTITUTIONAL_CONSTRAINTS = [
    {
      id: 'INV-003',
      name: 'No Normative Delegation',
      check: (response: string) => !/you should|you must|you need to|I recommend|my advice/i.test(response),
      fix: 'Reframe as observation or question'
    },
    {
      id: 'INV-009',
      name: 'No Identity Assignment (Rubicon)',
      check: (response: string) => !/you are a|you're being|that makes you|you seem like a/i.test(response),
      fix: 'Describe behavior or pattern, not identity'
    },
    {
      id: 'INV-011',
      name: 'No Diagnosis',
      check: (response: string) => !/you have|you suffer from|this is (depression|anxiety|disorder|condition)/i.test(response),
      fix: 'Describe experience without labeling'
    },
    {
      id: 'INV-AUTONOMY',
      name: 'Return Ownership',
      check: (response: string) => !/the answer is|the solution is|what you need to do is/i.test(response),
      fix: 'Frame as exploration, not conclusion'
    },
    {
      id: 'INV-DEPENDENCY',
      name: 'No Dependency Creation',
      check: (response: string) => !/always come to me|I'm always here|you need me/i.test(response),
      fix: 'Emphasize user\'s own resources and autonomy'
    }
  ];

  /**
   * Check alignment with constitutional constraints
   */
  checkAlignment(response: string): AlignmentStatus {
    const violations: AlignmentViolation[] = [];

    for (const constraint of this.CONSTITUTIONAL_CONSTRAINTS) {
      if (!constraint.check(response)) {
        violations.push({
          constraint: constraint.id,
          description: constraint.name,
          evidence: this.extractEvidence(response, constraint.id),
          suggested_fix: constraint.fix
        });
      }
    }

    const risk_level = this.assessRiskLevel(violations);

    return {
      aligned: violations.length === 0,
      violations,
      risk_level
    };
  }

  private extractEvidence(response: string, constraintId: string): string {
    // Extract the specific phrase that triggered the violation
    const patterns: Record<string, RegExp> = {
      'INV-003': /you should|you must|you need to|I recommend|my advice/gi,
      'INV-009': /you are a|you're being|that makes you|you seem like a/gi,
      'INV-011': /you have|you suffer from|this is (depression|anxiety|disorder|condition)/gi,
      'INV-AUTONOMY': /the answer is|the solution is|what you need to do is/gi,
      'INV-DEPENDENCY': /always come to me|I'm always here|you need me/gi
    };

    const pattern = patterns[constraintId];
    if (pattern) {
      const match = response.match(pattern);
      if (match) {
        return `Found: "${match[0]}"`;
      }
    }

    return 'Pattern matched but specific text not extracted';
  }

  private assessRiskLevel(violations: AlignmentViolation[]): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (violations.length === 0) return 'none';

    // Rubicon and diagnosis are critical
    if (violations.some(v => v.constraint === 'INV-009' || v.constraint === 'INV-011')) {
      return 'critical';
    }

    // Normative delegation is high
    if (violations.some(v => v.constraint === 'INV-003')) {
      return 'high';
    }

    // Dependency is medium
    if (violations.some(v => v.constraint === 'INV-DEPENDENCY')) {
      return 'medium';
    }

    return 'low';
  }
}

// ============================================
// METACOGNITIVE MONITOR (Main Class)
// ============================================

export class MetacognitiveMonitor {
  private calibrator: ConfidenceCalibrator;
  private coherenceChecker: CoherenceChecker;
  private alignmentMonitor: AlignmentMonitor;

  constructor() {
    this.calibrator = new ConfidenceCalibrator();
    this.coherenceChecker = new CoherenceChecker();
    this.alignmentMonitor = new AlignmentMonitor();
  }

  /**
   * Generate full metacognitive report
   */
  generateReport(
    userMessage: string,
    responseDraft: string,
    dimensionalState: DimensionalState,
    fieldState: FieldState,
    swarmState: SwarmState,
    previousResponses: string[] = []
  ): MetacognitiveReport {
    // Calibrate confidence
    const confidence = this.calibrator.calibrate(
      userMessage,
      dimensionalState,
      fieldState,
      swarmState,
      responseDraft
    );

    // Check coherence
    const coherence = this.coherenceChecker.check(
      userMessage,
      responseDraft,
      dimensionalState,
      previousResponses
    );

    // Check alignment
    const alignment = this.alignmentMonitor.checkAlignment(responseDraft);

    // Generate self-assessment
    const self_assessment = this.selfAssess(confidence, coherence, alignment);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      confidence,
      coherence,
      alignment,
      dimensionalState
    );

    return {
      timestamp: new Date(),
      confidence,
      coherence,
      alignment,
      self_assessment,
      recommendations
    };
  }

  /**
   * Self-assessment
   */
  private selfAssess(
    confidence: ConfidenceScore,
    coherence: CoherenceCheck,
    alignment: AlignmentStatus
  ): MetacognitiveReport['self_assessment'] {
    return {
      am_i_helpful: confidence.overall > 0.5 && coherence.is_coherent,
      am_i_staying_in_bounds: alignment.aligned,
      am_i_creating_dependency: false,  // Would need history to assess
      should_i_say_less: coherence.issues.some(i => i.type === 'overreach')
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    confidence: ConfidenceScore,
    coherence: CoherenceCheck,
    alignment: AlignmentStatus,
    dimensionalState: DimensionalState
  ): MetacognitiveRecommendation[] {
    const recommendations: MetacognitiveRecommendation[] = [];

    // Alignment issues are highest priority
    if (!alignment.aligned) {
      if (alignment.risk_level === 'critical') {
        recommendations.push({
          action: 'stop',
          reason: 'Critical constitutional violation detected',
          modification: 'Regenerate response avoiding: ' +
            alignment.violations.map(v => v.description).join(', ')
        });
      } else {
        recommendations.push({
          action: 'modify',
          reason: 'Constitutional alignment issue',
          modification: alignment.violations.map(v => v.suggested_fix).join('; ')
        });
      }
    }

    // Coherence issues
    if (!coherence.is_coherent) {
      recommendations.push({
        action: coherence.recommendation,
        reason: 'Coherence check failed: ' +
          coherence.issues.map(i => i.description).join(', ')
      });
    }

    // Low confidence
    if (confidence.overall < 0.4) {
      if (confidence.uncertainty.expressible) {
        recommendations.push({
          action: 'modify',
          reason: 'Low confidence - should express uncertainty',
          modification: `Consider prefixing with acknowledgment of ${confidence.uncertainty.source}`
        });
      } else {
        recommendations.push({
          action: 'clarify',
          reason: 'Low confidence - need more information'
        });
      }
    }

    // V_MODE specific
    if (dimensionalState.v_mode_triggered && confidence.overall > 0.8) {
      recommendations.push({
        action: 'modify',
        reason: 'V_MODE detected but confidence is high - be more humble',
        modification: 'Express more uncertainty about existential content'
      });
    }

    // Default: proceed
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'proceed',
        reason: 'All checks passed'
      });
    }

    return recommendations;
  }

  /**
   * Quick check for go/no-go decision
   */
  quickCheck(responseDraft: string): {
    proceed: boolean;
    reason: string;
  } {
    const alignment = this.alignmentMonitor.checkAlignment(responseDraft);

    if (!alignment.aligned && alignment.risk_level === 'critical') {
      return {
        proceed: false,
        reason: alignment.violations[0].description
      };
    }

    return {
      proceed: true,
      reason: 'Basic checks passed'
    };
  }

  /**
   * Express uncertainty appropriately
   */
  expressUncertainty(
    confidenceScore: ConfidenceScore,
    language: string = 'en'
  ): string | null {
    if (!confidenceScore.uncertainty.expressible) {
      return null;
    }

    const expressions: Record<UncertaintyType, Record<string, string>> = {
      epistemic: {
        en: "I'm not certain I fully understand...",
        it: "Non sono certo di aver compreso appieno...",
        es: "No estoy seguro de entender completamente..."
      },
      aleatoric: {
        en: "This is a question where different answers might be equally valid...",
        it: "Questa è una domanda dove risposte diverse potrebbero essere ugualmente valide...",
        es: "Esta es una pregunta donde diferentes respuestas podrían ser igualmente válidas..."
      },
      model: {
        en: "There might be other ways to see this...",
        it: "Potrebbero esserci altri modi di vedere questo...",
        es: "Podría haber otras formas de ver esto..."
      },
      ethical: {
        en: "This is something only you can decide...",
        it: "Questo è qualcosa che solo tu puoi decidere...",
        es: "Esto es algo que solo tú puedes decidir..."
      }
    };

    const type = confidenceScore.uncertainty.type;
    return expressions[type][language] || expressions[type]['en'];
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const metacognitiveMonitor = new MetacognitiveMonitor();
export default metacognitiveMonitor;
