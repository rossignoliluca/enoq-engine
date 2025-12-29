# LIMEN System Map

## Directory Structure

```
src/
├── interface/              # Shared type definitions (pure types, no logic)
│   └── types.ts           # All shared types: DimensionalState, RiskFlags, ADSScore, etc.
│
├── gate/                   # Normative control layer (thalamic-style inhibition)
│   ├── invariants/        # Constitutional constraints (AXIS)
│   │   └── axis.ts        # INV-003, INV-009, INV-011 enforcement
│   ├── thresholds/        # Gating thresholds and caching
│   │   └── llm_cache.ts   # LRU cache for LLM detector results
│   ├── emergency/         # Crisis detection and handling
│   │   └── crisis_detector.ts
│   ├── withdrawal/        # System withdrawal logic
│   │   ├── lifecycle_controller.ts
│   │   └── regulatory_store.ts
│   ├── verification/      # Constitutional enforcement
│   │   ├── S5_verify.ts   # Final constitutional check
│   │   └── plan_act_verifier.ts
│   └── enforcement/       # Normative enforcement modules
│       ├── domain_governor.ts
│       ├── ads_detector.ts          # Avoidable Delegation Surprise
│       └── second_order_observer.ts # Enchantment detection
│
├── operational/            # Operational geometry (routing, detection, gating)
│   ├── detectors/         # Input classification
│   │   ├── dimensional_system.ts    # 5V + 17H dimensional detection
│   │   ├── ultimate_detector.ts     # Unified detector orchestrator
│   │   ├── hybrid_detector.ts       # Regex + LLM hybrid
│   │   ├── llm_detector_v2.ts       # LLM-powered regime classification
│   │   ├── llm_detector.ts          # Legacy LLM detector
│   │   ├── sota_detector.ts         # State-of-the-art detector
│   │   └── existential_lexicon.ts   # Meaning-collapse markers
│   ├── gating/            # Routing decisions
│   │   ├── unified_gating.ts        # v5.1 single routing point
│   │   ├── np_gating.ts             # Neyman-Pearson classifier
│   │   └── scientific_gating.ts     # Scientific gating logic
│   ├── providers/         # External service clients
│   │   ├── llm_provider.ts
│   │   ├── gate_client.ts
│   │   └── gate_embedded.ts
│   └── signals/           # Early signal processing
│       └── early_signals.ts
│
├── mediator/              # Cognitive mediation engine
│   ├── l1_clarify/        # Perception layer
│   │   └── perception.ts
│   ├── l2_reflect/        # Selection layer
│   │   ├── selection.ts
│   │   ├── stochastic_field.ts      # Langevin dynamics
│   │   └── selection_curver.ts
│   ├── l3_integrate/      # Integration layer
│   │   └── meta_kernel.ts           # 215 disciplines synthesis
│   ├── l4_agency/         # Agency layer
│   │   ├── total_system.ts          # Total system orchestrator
│   │   └── agent_swarm.ts           # Domain specialists
│   ├── l5_transform/      # Transform layer
│   │   ├── generation.ts
│   │   ├── plan_renderer.ts
│   │   └── response_plan.ts         # ResponsePlan types + builders
│   └── concrescence/      # Whiteheadian process integration
│       └── concrescence_engine.ts
│
├── runtime/               # Execution layer
│   ├── pipeline/          # Main processing pipeline
│   │   ├── pipeline.ts              # enoq() main entry point
│   │   └── l2_execution.ts
│   └── io/                # Input/output handlers
│       ├── cli.ts
│       ├── interactive_session.ts
│       └── agent_responses.ts
│
├── research/              # Experimental code (isolated)
│   ├── genesis/           # GENESIS system experiments
│   │   ├── grow.ts
│   │   ├── field_integration.ts
│   │   └── ...
│   ├── enoq_cli.ts       # Standalone ENOQ CLI (uses genesis)
│   └── server.ts         # HTTP server (uses genesis)
│
├── benchmarks/            # Test cases and benchmarks
│   └── benchmark_cases_realistic.ts
│
└── __tests__/             # Jest test files
    └── *.test.ts
```

## Dependency Rules

```
interface/ <── gate/ <── operational/ <── mediator/ <── runtime/
                                                           │
                                                           ↓
                                                       research/
                                                       (isolated)
```

### Import Rules

| From         | Can Import                           | Cannot Import              |
|--------------|--------------------------------------|----------------------------|
| interface/   | (nothing)                            | everything                 |
| gate/        | interface/                           | operational/, mediator/, runtime/, research/ |
| operational/ | interface/, gate/                    | mediator/, runtime/, research/ |
| mediator/    | interface/, gate/, operational/      | runtime/, research/        |
| runtime/     | interface/, gate/, operational/, mediator/ | research/ (exception: field_integration) |
| research/    | anything                             | (cannot be imported by production) |

### Known Architectural Coupling (Documented Exceptions)

| From | To | Reason |
|------|----|--------|
| gate/verification/ | mediator/l5_transform/response_plan | ResponsePlan types for verification |
| gate/withdrawal/ | mediator/l5_transform/response_plan | ResponsePlan for lifecycle |
| operational/signals/ | mediator/l5_transform/response_plan | ResponsePlan in EarlySignals |
| mediator/concrescence/ | runtime/pipeline | enoq() function for session management |
| mediator/l4_agency/ | runtime/io | agent_responses for domain responses |
| runtime/pipeline/ | research/genesis | field_integration (to be moved) |

## Key Files by Function

### Entry Points
- `runtime/pipeline/pipeline.ts` - Main `enoq()` function
- `index.ts` - Package exports

### Constitutional Enforcement
- `gate/invariants/axis.ts` - AXIS constitutional rules
- `gate/verification/S5_verify.ts` - Final constitutional check
- `gate/verification/plan_act_verifier.ts` - Pre-render enforcement

### Detection
- `operational/detectors/ultimate_detector.ts` - Orchestrates all detectors
- `operational/detectors/dimensional_system.ts` - 5V + 17H detection
- `operational/detectors/llm_detector_v2.ts` - LLM regime classification

### Gating
- `operational/gating/unified_gating.ts` - v5.1 single routing point (69% skip rate)
- `operational/gating/np_gating.ts` - Neyman-Pearson classifier

### Processing
- `mediator/l3_integrate/meta_kernel.ts` - 215 disciplines integration
- `mediator/concrescence/concrescence_engine.ts` - Whiteheadian process

### Types
- `interface/types.ts` - All shared types
- `mediator/l5_transform/response_plan.ts` - ResponsePlan and builder functions

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/check-imports.sh` | Verify import boundary rules |
| `npm test` | Run all Jest tests |
| `npm run build` | Build TypeScript |
