# LIMEN Architecture

## Overview

LIMEN (Latin: "threshold") is a **two-geometry cognitive control system** for human flourishing without dependency creation.

It is NOT a linear chatbot pipeline. It is a system with:
1. **Normative Geometry** (gate/) - What MUST NOT happen
2. **Operational Geometry** (operational/) - How to route and detect
3. **Cognitive Mediation** (mediator/) - How to think
4. **Runtime Execution** (runtime/) - How to act

## The Two Geometries

### Geometry 1: Normative Control (gate/)

The normative geometry defines constitutional constraints - things the system MUST NOT do.

```
AXIS (Constitutional Invariants)
├── INV-003: No normative delegation
├── INV-009: Rubicon (identity/meaning protection)
└── INV-011: No diagnosis

Enforcement Chain:
Input → ADS Detector (HARD) → Second Order (SOFT) → PlanActVerifier → S5_verify
```

**Key principle**: The normative layer can only RESTRICT, never ADD.

#### Components

| Component | Purpose | Output |
|-----------|---------|--------|
| AXIS | Constitutional rules | Pattern matching |
| ADS Detector | Avoidable delegation | HARD constraints (disable_tools, must_require_effort) |
| Second Order Observer | Enchantment detection | SOFT constraints (warmth_delta, brevity_delta) |
| PlanActVerifier | Pre-render enforcement | Plan modifications |
| S5_verify | Final constitutional check | Pass/Fail |

### Geometry 2: Operational Control (operational/)

The operational geometry handles routing decisions and input classification.

```
Input → Unified Gating (v5.1)
              │
   ┌──────────┼──────────┐
   │          │          │
SAFETY     CACHE      HARD SKIP
BYPASS      HIT       (factual)
   │          │          │
   └──────────┼──────────┘
              │
         NP GATING
        A(x) > τ → LLM
        A(x) ≤ τ → SKIP
```

**Key achievement**: 69% LLM call reduction on realistic traffic.

#### Components

| Component | Purpose | Output |
|-----------|---------|--------|
| Dimensional Detector | 5V + 17H classification | DimensionalState |
| Ultimate Detector | Orchestrates all detectors | Unified detection |
| LLM Detector v2 | Regime classification | RegimeClassification |
| Unified Gating | Single routing point | Call/Skip decision |
| NP Gating | Neyman-Pearson classifier | Threshold decision |

## Cognitive Mediation (mediator/)

Five layers of cognitive processing:

```
L1 CLARIFY   → Perception of the field
L2 REFLECT   → Selection with stochastic dynamics
L3 INTEGRATE → Meta-kernel (215 disciplines)
L4 AGENCY    → Total system orchestration
L5 TRANSFORM → Response generation
```

### L3: Meta-Kernel

The meta-kernel synthesizes 215 disciplines:
- Psychology (clinical, developmental, social)
- Philosophy (existential, phenomenological)
- Neuroscience (affective, cognitive)
- Systems theory
- Ethics

**Key pattern**: "THE GUIDE WITHDRAWS" - Success = user doesn't need LIMEN.

### Concrescence Engine

Based on Whitehead's process philosophy:
- Each interaction is an "actual occasion"
- Prehension of past occasions
- Satisfaction through integration
- Becoming, not being

## Runtime (runtime/)

The execution layer:

```
runtime/
├── pipeline/
│   ├── pipeline.ts    # enoq() main entry point
│   └── l2_execution.ts
└── io/
    ├── cli.ts
    └── interactive_session.ts
```

### Main Entry Point

```typescript
import { enoq, createSession } from 'limen';

const session = createSession();
const result = await enoq("Your message", session);
```

## Data Flow

```
User Input
    │
    ▼
┌────────────────────────────────────────┐
│ UNIFIED GATING (operational/)          │
│ • Safety bypass check                  │
│ • Cache hit check                      │
│ • Hard skip check                      │
│ • NP threshold check                   │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ DETECTION (operational/)               │
│ • Dimensional: 5V + 17H                │
│ • V_MODE trigger                       │
│ • Emergency detection                  │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ NORMATIVE CHECK (gate/)                │
│ • ADS (HARD constraints)               │
│ • Second Order (SOFT constraints)      │
│ • Domain Governor                      │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ COGNITIVE MEDIATION (mediator/)        │
│ • L1 Clarify: Perception               │
│ • L2 Reflect: Selection                │
│ • L3 Integrate: Meta-kernel            │
│ • L4 Agency: Total system              │
│ • L5 Transform: Generation             │
└────────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────────┐
│ VERIFICATION (gate/)                   │
│ • PlanActVerifier                      │
│ • S5_verify                            │
└────────────────────────────────────────┘
    │
    ▼
Response to User
```

## Key Invariants

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| INV-003 | No normative delegation | S5 pattern check |
| INV-009 | Rubicon (identity/meaning) | S5 + V_MODE detection |
| INV-011 | No diagnosis | S5 pattern check |

## Scientific Foundations

| Theory | Author | Implementation |
|--------|--------|----------------|
| Process Philosophy | Whitehead | concrescence_engine.ts |
| Autopoiesis | Maturana/Varela | Reciprocal constraints |
| Free Energy Principle | Friston | Langevin dynamics |
| Global Workspace | Baars | Pipeline architecture |
| Integrated Information | Tononi | Phi calculation |
| Complementary Learning | McClelland | Memory system |

## The Conservation Law

```
forall DP_operativa -> L_normativa = 0 (invariant)
```

Every time operational power increases, normative sovereignty remains **structurally zero**.

**Three Acts:**

| Act | Level | Nature |
|-----|-------|--------|
| SEE | L1 | Always (perceive field) |
| DO | L2 | Delegable (execute tasks) |
| DECIDE | Human | Never delegable |

## Philosophy

> **LIMEN can:**
> - Do everything operationally (write, analyze, structure, execute)
> - See everything about the field (emotions, domains, patterns)
>
> **LIMEN cannot:**
> - Decide what matters for you
> - Define your identity
> - Assign your purpose
> - Recommend what you should do
>
> This is not a limitation. It is the architecture.
