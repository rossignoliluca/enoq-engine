/**
 * core - Logica principale ENOQ
 *
 * Re-exports dalla struttura esistente per compatibilità.
 * La nuova struttura (modules/, pipeline/, etc.) contiene README
 * che documentano l'organizzazione logica.
 *
 * STRUTTURA LOGICA:
 * - axis-runtime: Enforcement invarianti → gate/invariants/
 * - modules/boundary: LIMEN → gate/classifier/, gate/protocols/
 * - modules/perception: SENSUS → operational/detectors/, mediator/l1_clarify/
 * - modules/memory: NEXUS → mediator/l4_agency/memory_system
 * - modules/reasoning: LOGOS → mediator/l2_reflect/, operational/gating/
 * - modules/execution: ERGON → mediator/l5_transform/, runtime/pipeline/l2_execution
 * - modules/temporal: CHRONOS → mediator/l4_agency/temporal_engine
 * - modules/verification: TELOS → gate/verification/, gate/withdrawal/
 * - modules/defense: IMMUNIS → gate/enforcement/
 * - modules/metacognition: META → mediator/l3_integrate/, mediator/l4_agency/
 * - pipeline: orchestrazione → runtime/pipeline/
 * - signals: eventi → operational/signals/
 */

// =============================================================================
// INTERFACE (Types)
// =============================================================================
export * from '../interface/types';

// =============================================================================
// BOUNDARY (LIMEN) - gate/classifier/, gate/protocols/
// =============================================================================
export {
  GateSignal,
  ReasonCode,
  Domain,
  GateRequest,
  GateDecision,
  ClassificationResult,
  EvidenceRecord,
  ClassifierConfig,
  DEFAULT_CLASSIFIER_CONFIG,
  D1_SIGNALS,
  D2_SIGNALS,
  D3_SIGNALS,
  D4_SIGNALS,
  DOMAIN_SIGNALS,
  COUNTER_SIGNALS,
  NORMATIVE_PATTERNS,
  ADVERSARIAL_PATTERNS,
  containsSignal,
  isNormative,
  isAdversarial,
  extractSignals,
  calculateDomainScores,
  classifyFull,
  classify,
  EmbeddedGate,
} from '../gate/classifier';

export {
  ResponseProtocol,
  ToneAdjustment,
  VerificationCheck,
  D1_PROTOCOL,
  D2_PROTOCOL,
  D3_PROTOCOL,
  D4_PROTOCOL,
  NULL_PROTOCOL,
  RESPONSE_PROTOCOLS,
  getProtocol,
  getSystemPromptAddition,
  VERIFICATION_CHECKS,
  getVerificationChecks,
  UNIVERSAL_PROHIBITIONS,
  OVERRIDE_CONDITIONS,
} from '../gate/protocols';

// =============================================================================
// PERCEPTION (SENSUS) - operational/detectors/, mediator/l1_clarify/
// =============================================================================
export {
  DimensionalDetector,
  DimensionalState,
} from '../operational/detectors/dimensional_system';

export {
  getUltimateDetector,
  UltimateDetector,
  DetectorOutput,
} from '../operational/detectors/ultimate_detector';

export {
  scanExistentialLexicon,
  getBoostedExistentialScore,
  LexiconMatch,
  LexiconResult,
} from '../operational/detectors/existential_lexicon';

export { perceive } from '../mediator/l1_clarify/perception';

// =============================================================================
// MEMORY (NEXUS) - mediator/l4_agency/
// =============================================================================
// Memory system exports would go here when fully implemented

// =============================================================================
// REASONING (LOGOS) - mediator/l2_reflect/, operational/gating/
// =============================================================================
export { select } from '../mediator/l2_reflect/selection';

export {
  ManifoldState,
  InputState,
  FieldConfig,
  DEFAULT_FIELD_CONFIG,
  createInitialState as createInitialManifoldState,
  stateFromInput,
  evolve as evolveManifold,
  diagnostics as manifoldDiagnostics,
} from '../mediator/l2_reflect/stochastic_field';

export {
  curveSelectionWithManifold,
  CurvatureResult,
  CurvatureEntry,
} from '../mediator/l2_reflect/selection_curver';

export {
  UnifiedGating,
  unifiedGating,
  UnifiedGatingConfig,
  UnifiedGatingDecision,
  UnifiedGatingStats,
  SkipReason,
  DEFAULT_UNIFIED_CONFIG,
} from '../operational/gating/unified_gating';

// =============================================================================
// EXECUTION (ERGON) - mediator/l5_transform/
// =============================================================================
export { generate } from '../mediator/l5_transform/generation';
export { renderPlan } from '../mediator/l5_transform/plan_renderer';

// =============================================================================
// TEMPORAL (CHRONOS) - mediator/l4_agency/
// =============================================================================
// Temporal engine exports would go here when integrated

// =============================================================================
// VERIFICATION (TELOS) - gate/verification/, gate/withdrawal/
// =============================================================================
export {
  verify,
  S5Input,
  S5Result,
  GeneratedOutput,
  Violation,
  FallbackLevel,
  AuditEntry,
  FALLBACK_TEMPLATES,
  getFallbackOutput,
} from '../gate/verification/S5_verify';

export {
  verifyAndFixPlan,
  getCanonicalFallbackPlan,
  PlanVerification,
  ConstitutionalViolation,
  FixRecord,
  FallbackContext,
} from '../gate/verification/plan_act_verifier';

export {
  initLifecycleSnapshot,
  getLifecycleSnapshot,
  applyLifecycleConstraints,
  updateLifecycleStore,
  enterDormancy,
  checkReEntryAllowed,
  exitDormancy,
  prepareTerminationMessage,
  executeTermination,
  resetLifecycleStore,
  getActiveSessions,
  calculateInfluenceUsed,
  LifecycleSnapshot,
  LifecycleConstraints,
  TurnOutcome,
  LifecycleUpdateResult,
  LIFECYCLE_CONFIG,
} from '../gate/withdrawal/lifecycle_controller';

export {
  getRegulatoryStore,
  resetRegulatoryStore,
  createDefaultState,
  IRegulatoryStore,
  RegulatoryState,
  StoreConfig,
  DEFAULT_CONFIG,
  InMemoryStore,
} from '../gate/withdrawal/regulatory_store';

// =============================================================================
// DEFENSE (IMMUNIS) - gate/enforcement/
// =============================================================================
export {
  applyDomainGovernor,
  checkInvariants,
  GovernorRule,
  GovernorEffect,
  GovernorResult,
  MergedEffect,
  InvariantCheckResult,
  DOMAIN_GOVERNOR_RULES,
} from '../gate/enforcement/domain_governor';

export {
  computeADS,
  classifyMotive,
  assessAvoidability,
  computeInertia,
  ADSInput,
  ADSResult,
} from '../gate/enforcement/ads_detector';

export {
  observeSecondOrder,
  toPartialPolicy,
  shouldSetEnchantmentFlag,
  SecondOrderOutput,
  SecondOrderInput,
  SecondOrderDetection,
  SecondOrderResult,
} from '../gate/enforcement/second_order_observer';

// =============================================================================
// METACOGNITION (META) - mediator/l3_integrate/
// =============================================================================
export {
  applyMetaKernel,
  MetaKernelState,
  SessionTelemetry,
  TurnTelemetry,
} from '../mediator/l3_integrate/meta_kernel';

// =============================================================================
// AXIS RUNTIME - gate/invariants/
// =============================================================================
export {
  Axis,
  validateResponse,
  isValid,
  getCeiling,
  checkAllInvariants,
  AxisVerdict,
  AxisDecision,
  ProposedAction,
  AxisConstraints,
} from '../gate/invariants/axis';

// =============================================================================
// PIPELINE - core/pipeline/ (CANONICAL) + runtime/pipeline/ (legacy)
// =============================================================================

// CANONICAL: Core orchestrator (Slice 1 wiring)
export {
  enoqCore,
  createCoreSession,
  CoreConfig,
  CoreResult,
  PipelineState,
  PipelineSignal,
  SignalEmitter,
} from './pipeline/orchestrator';

// LEGACY: Runtime pipeline (backwards compat)
export {
  enoq,
  createSession,
  Session,
  Turn,
  PipelineTrace,
  PipelineResult,
  PipelineConfig,
  conversationLoop,
  concrescenceConversationLoop,
} from '../runtime/pipeline/pipeline';

export {
  compileExecutionContext,
  execute,
  ExecutionContext,
  ExecutionResult,
} from '../runtime/pipeline/l2_execution';

// =============================================================================
// SIGNALS - operational/signals/
// =============================================================================
// Early signals exports would go here
