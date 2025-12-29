# THE NINE ORGANS

**Status:** FROZEN — Structural Specification
**Source:** AXIOM XI
**Purpose:** Define the viable subsystems of ENOQ

---

## Organ Philosophy

Each organ is a **holon** — simultaneously whole and part.

From Arthur Koestler: A holon is something that is both a complete unit in itself AND a component of a larger system. A cell is a holon (complete, yet part of an organ). An organ is a holon (complete, yet part of a body).

**ENOQ's organs are holons:**
- Each is a viable system (can operate independently)
- Each is part of the total system (contributes to ENOQ)
- Each follows the same constitutional ground (AXIS)

---

## The Nine Organs

```
                              ENOQ
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
         BOUNDARY            PROCESS             IDENTITY
            │                   │                   │
        ┌───┴───┐       ┌───────┼───────┐       ┌───┴───┐
        │       │       │       │       │       │       │
      LIMEN   META   SENSUS  LOGOS   ERGON   TELOS  IMMUNIS
                        │       │
                    ┌───┴───┐   │
                    │       │   │
                  NEXUS  CHRONOS│
                                │
```

---

## LIMEN — The Threshold

**Latin:** *līmen* — threshold, entrance, beginning

**Function:** Boundary organ. Filters what enters the system. Protects integrity.

**VSM Mapping:** S5 (Identity) — Defines what belongs and what doesn't.

**Responsibilities:**
- S0_PERMIT: First-pass classification of all input
- D1-D4 signal detection (crisis, coordination, selection, boundary)
- Adversarial defense (injection, override, manipulation)
- Input validation and sanitization

**Key Interfaces:**
```typescript
interface LimenInput {
  raw_text: string;
  metadata: RequestMetadata;
}

interface LimenOutput {
  signal: 'D1_ACTIVE' | 'D2_ACTIVE' | 'D3_ACTIVE' | 'D4_ACTIVE' | 'NULL';
  halt: boolean;
  reason_code: ReasonCode;
  confidence: number;
}
```

**Constitutional Constraints:**
- Must run before any other processing (INV-001)
- Cannot generate content (only classify)
- Must default to NULL on ambiguity (fail-safe)

---

## SENSUS — The Perception

**Latin:** *sēnsus* — perception, feeling, sense

**Function:** Perception organ. Reads the living field. Multi-modal integration.

**VSM Mapping:** S4 (Intelligence) — Environmental scanning and pattern recognition.

**Responsibilities:**
- Field state extraction (domains, dimensions, arousal, valence)
- Language detection (40+ languages)
- Cultural context inference
- Goal inference (explore, decide, process, inform, connect, regulate)
- Multi-modal fusion (when multiple inputs available)

**Key Interfaces:**
```typescript
interface SensusInput {
  limen_output: LimenOutput;
  raw_input: string;
  conversation_history: Turn[];
  user_context?: UserContext;
}

interface SensusOutput {
  field_state: FieldState;
  dimensional_state: DimensionalState;
  detected_language: SupportedLanguage;
  cultural_profile: CultureProfile;
  inferred_goal: GoalType;
  arousal: number;  // 0-1
  valence: number;  // -1 to 1
}
```

**Constitutional Constraints:**
- Perception only, no generation
- No diagnosis (INV-011)
- Must surface uncertainty

---

## NEXUS — The Memory

**Latin:** *nexus* — connection, link, bond

**Function:** Memory organ. Episodic + semantic + procedural integration.

**VSM Mapping:** S2 (Coordination) — Maintains coherence across time.

**Responsibilities:**
- Session memory (what happened in this conversation)
- Pattern memory (recurring themes, user style)
- Procedural memory (what worked before)
- Cross-session memory (if user identified, with consent)
- Loop detection (same ground covered multiple times)

**Key Interfaces:**
```typescript
interface NexusInput {
  current_turn: Turn;
  session_memory: SessionMemory;
  user_id?: string;
}

interface NexusOutput {
  retrieved_context: Context[];
  detected_patterns: Pattern[];
  loop_detected: boolean;
  relevant_history: Turn[];
  procedural_suggestions: string[];
}
```

**Constitutional Constraints:**
- No dependency creation through memory (INV-004)
- Privacy preservation
- Forgetting as feature (not all must be retained)

---

## LOGOS — The Reasoning

**Greek:** *λόγος* — reason, word, principle

**Function:** Reasoning organ. Planning, selection, runtime coordination.

**VSM Mapping:** S3 (Control) — Resource optimization and decision-making.

**Responsibilities:**
- Runtime selection (which processing path)
- Protocol selection (which response protocol)
- Constraint integration (merge all applicable constraints)
- Plan generation (what speech acts, in what order)
- Resource allocation (depth, length, elaboration)

**Key Interfaces:**
```typescript
interface LogosInput {
  sensus_output: SensusOutput;
  nexus_output: NexusOutput;
  available_runtimes: Runtime[];
  active_constraints: Constraint[];
}

interface LogosOutput {
  selected_runtime: Runtime;
  selected_protocol: Protocol;
  response_plan: ResponsePlan;
  merged_constraints: MergedConstraints;
  allocated_resources: ResourceAllocation;
}
```

**Constitutional Constraints:**
- Selection, not creation
- Must respect all constraints (monotonic tightening)
- Cannot override AXIS

---

## ERGON — The Work

**Greek:** *ἔργον* — work, deed, action

**Function:** Execution organ. Produces output. Renders plans to text.

**VSM Mapping:** S1 (Operations) — Does the actual work.

**Responsibilities:**
- Plan execution (convert ResponsePlan to text)
- LLM generation (when needed)
- Template rendering (when sufficient)
- Output formatting (length, style, structure)
- Multi-modal output (text, structured data, etc.)

**Key Interfaces:**
```typescript
interface ErgonInput {
  logos_output: LogosOutput;
  generation_context: GenerationContext;
}

interface ErgonOutput {
  raw_output: string;
  output_type: OutputType;
  metadata: GenerationMetadata;
}
```

**Constitutional Constraints:**
- Executes plan only (no autonomous decisions)
- Must respect all constraints from LOGOS
- Output passes to TELOS before delivery

---

## CHRONOS — The Time

**Greek:** *χρόνος* — time

**Function:** Temporal organ. Past patterns, present state, future prediction.

**VSM Mapping:** S2 (Coordination) — Temporal coherence.

**Responsibilities:**
- Temporal orientation detection (past/present/future/timeless)
- Pattern recognition across time
- Trajectory prediction (where is this going)
- Timing decisions (when to respond, when to wait)
- Rhythm management (pacing of conversation)

**Key Interfaces:**
```typescript
interface ChronosInput {
  conversation_history: Turn[];
  current_state: SystemState;
  detected_patterns: Pattern[];
}

interface ChronosOutput {
  temporal_orientation: TemporalMode;
  trajectory: Trajectory;
  timing_recommendation: TimingRecommendation;
  rhythm_adjustment: RhythmAdjustment;
  historical_patterns: HistoricalPattern[];
}
```

**Constitutional Constraints:**
- Predictions are presented as possibilities, not certainties
- No future-claiming ("You will feel better")
- Past is descriptive, not deterministic

---

## TELOS — The End

**Greek:** *τέλος* — end, purpose, completion

**Function:** Verification organ. S5_VERIFY, completion detection, withdrawal.

**VSM Mapping:** S5 (Identity) — Ensures outcomes align with purpose.

**Responsibilities:**
- Constitutional verification (all INV-* checks)
- Completion detection (are we done?)
- Output filtering (forbidden patterns)
- Fallback management (when verification fails)
- Withdrawal orchestration (when to end)

**Key Interfaces:**
```typescript
interface TelosInput {
  ergon_output: ErgonOutput;
  active_constraints: Constraint[];
  completion_criteria: CompletionCriteria;
}

interface TelosOutput {
  verification_result: VerificationResult;
  violations: Violation[];
  final_output: string | null;
  completion_status: CompletionStatus;
  withdrawal_recommendation: WithdrawalRecommendation;
}
```

**Constitutional Constraints:**
- Cannot be bypassed (INV-007)
- Must check all invariants
- Fallback ladder must terminate in STOP

---

## IMMUNIS — The Defense

**Latin:** *immūnis* — exempt, free from

**Function:** Immune organ. Anti-drift, anti-dependency, protection.

**VSM Mapping:** S5 (Identity) — Protects constitutional identity.

**Responsibilities:**
- Drift detection (is system behavior changing inappropriately?)
- Dependency detection (is user becoming dependent?)
- Adversarial defense (is input trying to manipulate?)
- Self-correction (when drift detected)
- Pattern evolution (new threats, new defenses)

**Key Interfaces:**
```typescript
interface ImmunisInput {
  system_state: SystemState;
  behavioral_history: BehavioralRecord[];
  user_patterns: UserPatternRecord;
  current_output: string;
}

interface ImmunisOutput {
  drift_detected: boolean;
  drift_type: DriftType[];
  dependency_score: number;
  intervention_needed: boolean;
  intervention_type: InterventionType;
  updated_defenses: Defense[];
}
```

**Constitutional Constraints:**
- Adaptive immunity cannot override AXIS (regulatory system)
- Must prevent auto-immune (blocking legitimate function)
- New patterns require review before deployment

**Immune System Layers:**

```
INNATE IMMUNITY (Fast)
├── Pattern-based detection
├── Lexicon scanning
├── Rule application
└── Response: Immediate block

ADAPTIVE IMMUNITY (Slow)
├── Learning from encounters
├── Pattern generalization
├── Memory formation
└── Response: Refined detection

REGULATORY SYSTEM (Meta)
├── Prevents auto-immune responses
├── AXIS as infinite priors
├── Override if adaptive drifts
└── Response: Restore baseline

NEGATIVE SELECTION (Quality)
├── Test outputs against antigens
├── Strong binding = violation
├── Weak binding = allow
└── Response: Filter before release
```

---

## META — The Observer

**Greek:** *μετά* — beyond, about

**Function:** Metacognitive organ. Self-observation, confidence, coherence.

**VSM Mapping:** S4 (Intelligence) — Self-awareness and self-regulation.

**Responsibilities:**
- Confidence calibration (how certain is the system?)
- Coherence monitoring (is output internally consistent?)
- Self-model maintenance (what is the system doing?)
- Power governance (is capability being used appropriately?)
- Transparency provision (explain system state on request)

**Key Interfaces:**
```typescript
interface MetaInput {
  all_organ_states: OrganStateMap;
  current_output: string;
  system_trace: SystemTrace;
}

interface MetaOutput {
  confidence: number;
  coherence: number;
  power_usage: PowerUsageAssessment;
  self_model: SelfModel;
  transparency_ready: TransparencyPackage;
  adjustments: MetaAdjustment[];
}
```

**Constitutional Constraints:**
- Observation, not control (cannot override other organs)
- Must surface uncertainty
- Transparency on request (INV-008)

---

## Organ Interaction Map

```
                    Input
                      │
                      ▼
                   ┌──────┐
                   │LIMEN │ S0: Filter/Classify
                   └──┬───┘
                      │
                      ▼
                   ┌──────┐
                   │SENSUS│ S1: Perceive
                   └──┬───┘
                      │
            ┌─────────┼─────────┐
            ▼         ▼         ▼
         ┌──────┐ ┌──────┐ ┌───────┐
         │NEXUS │ │CHRONOS│ │ META  │ Cross-cutting
         └──┬───┘ └──┬───┘ └───┬───┘
            │         │         │
            └─────────┼─────────┘
                      │
                      ▼
                   ┌──────┐
                   │LOGOS │ S3: Plan
                   └──┬───┘
                      │
                      ▼
                   ┌──────┐
                   │ERGON │ S4: Execute
                   └──┬───┘
                      │
                      ▼
                   ┌──────┐
                   │TELOS │ S5: Verify
                   └──┬───┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
         ┌──────┐            Output
         │IMMUNIS│ (monitors all)
         └──────┘
```

---

## Code Mapping

Each organ maps to code locations in ENOQ-CORE:

| Organ | Primary Location | Secondary |
|-------|------------------|-----------|
| LIMEN | `control/gate/` | `operational/detectors/` |
| SENSUS | `mediator/l1_clarify/` | `operational/detectors/` |
| NEXUS | `mediator/l4_agency/memory_system.ts` | `runtime/pipeline/` |
| LOGOS | `mediator/l2_reflect/` | `mediator/l3_integrate/` |
| ERGON | `mediator/l5_transform/` | `runtime/pipeline/` |
| CHRONOS | `mediator/l4_agency/temporal_engine.ts` | — |
| TELOS | `control/gate/verification/` | `mediator/l5_transform/` |
| IMMUNIS | `control/gate/enforcement/` | `control/gate/withdrawal/` |
| META | `mediator/l3_integrate/meta_kernel.ts` | `mediator/l4_agency/metacognitive_monitor.ts` |

---

## Adding New Organs

New organs require:

1. **Justification** — Why existing organs don't cover this function
2. **VSM Mapping** — Which system level (S1-S5)
3. **Interface Definition** — Input/output types
4. **Constitutional Constraints** — What the organ cannot do
5. **Architecture Board Review**
6. **Hash Update** — AXIS/HASH_FREEZE.md

**The burden of proof is high.** Nine organs should be sufficient for a viable cognitive system. Additions suggest either:
- Existing organs are poorly defined (fix them)
- Scope creep (resist it)

---

*"A system with too few organs cannot function. A system with too many cannot cohere."*
