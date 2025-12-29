# ADR-006: GATE-MEDIATOR-OPERATIONAL Architecture

## Status
Accepted (Updated 2024-12-28)

## Date
2024-12-28

## Context

LIMEN is a cognitive control system. The previous structure mixed operational and normative concerns across epistemic layers. We needed a cleaner separation that reflects the system's actual cognitive architecture.

## Decision

LIMEN is now composed of four primary subsystems:

```
LIMEN (the system)
├── INTERFACE    - Shared contracts and types
├── GATE         - Normative gating & inhibitory control
├── OPERATIONAL  - Routing, detection, gating decisions
├── MEDIATOR     - Cognitive mediation engine (L1-L5)
└── RUNTIME      - Execution layer (pipeline, IO)
```

### INTERFACE (Contracts)
- `interface/types.ts` - All shared type definitions
  - DimensionalState, VerticalDimension, IntegrationMetrics
  - RiskFlags, ADSScore, MotiveDistribution
  - PolicyAdjustments, DelegationPrediction
  - RegimeClassification, ExistentialSpecificity

### GATE (Normative Control)
The gate provides inhibitory and regulatory control:
- `gate/invariants/` - Constitutional constraints (axis.ts)
- `gate/thresholds/` - LLM cache
- `gate/emergency/` - Crisis detection
- `gate/withdrawal/` - Lifecycle control, regulatory store
- `gate/verification/` - S5 verification, plan-act verifier
- `gate/enforcement/` - Domain governor, ADS detector, second-order observer

### OPERATIONAL (Routing & Detection)
Operational geometry for routing decisions:
- `operational/detectors/` - Dimensional detection, LLM detectors, ultimate detector
- `operational/gating/` - Unified gating, NP gating, scientific gating
- `operational/providers/` - LLM providers, gate client
- `operational/signals/` - Early signals processing

### MEDIATOR (Cognitive Processing)
The mediator processes information through L1-L5 layers:
- `mediator/l1_clarify/` - Perception
- `mediator/l2_reflect/` - Selection, stochastic field
- `mediator/l3_integrate/` - Meta-kernel, disciplines synthesis
- `mediator/l4_agency/` - Total system, agent swarm
- `mediator/l5_transform/` - Generation, plan rendering, response planning
- `mediator/concrescence/` - Whiteheadian process integration

### RUNTIME (Execution Layer)
The execution layer:
- `runtime/pipeline/` - enoq() main entry point, L2 execution
- `runtime/io/` - CLI, interactive session, agent responses

### RESEARCH (Experimental - Isolated)
- `research/genesis/` - GENESIS experiments
- `research/enoq_cli.ts` - Standalone CLI
- `research/server.ts` - HTTP server

## Dependency Rules

```
interface/ <── gate/ <── operational/ <── mediator/ <── runtime/
                                                          │
                                                          ↓
                                                      research/
```

**CRITICAL RULES**:
- `interface/` MUST NOT import anything
- `gate/` imports ONLY from `interface/`
- `operational/` imports from `interface/`, `gate/`
- `mediator/` imports from `interface/`, `gate/`, `operational/`
- `runtime/` imports from `interface/`, `gate/`, `operational/`, `mediator/`
- `research/` is ISOLATED (cannot be imported by production code)

### Known Architectural Coupling (Documented)

| From | To | Reason |
|------|----|--------|
| gate/verification/ | mediator/l5_transform/response_plan | ResponsePlan types |
| gate/withdrawal/ | mediator/l5_transform/response_plan | ResponsePlan types |
| operational/signals/ | mediator/l5_transform/response_plan | ResponsePlan types |
| mediator/concrescence/ | runtime/pipeline | enoq() function |
| runtime/pipeline/ | research/genesis | field_integration |

## Enforcement

Import boundaries are enforced by:
1. `scripts/check-imports.sh` - Shell script for CI
2. TypeScript compilation (fails on broken imports)

## Canonical Sentence

> LIMEN is a cognitive control system composed of a normative gate, an operational geometry, and a cognitive mediator, with a runtime execution layer.

## Consequences

- Clear four-layer separation: interface → gate → operational → mediator → runtime
- Normative concerns in gate/, operational concerns in operational/
- Shared types in interface/ prevent circular dependencies
- Research code is isolated from production
- Import boundaries are enforced by scripts
