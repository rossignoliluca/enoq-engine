# mediator/

> **Legacy active structure.** Canonical target is `src/typescript/src/core/` (modules + pipeline + signals).

> **Cognitive Mediation** - How to think.

## Purpose

The mediator layer implements ENOQ's five cognitive layers. This is where perception, selection, integration, and transformation happen.

## Structure

```
mediator/
├── concrescence/     # Whitehead process engine
├── l1_clarify/       # Perception of the field
├── l2_reflect/       # Selection with stochastic dynamics
├── l3_integrate/     # Meta-kernel (215 disciplines)
├── l4_agency/        # Total system orchestration
└── l5_transform/     # Response generation
```

## Five Cognitive Layers

| Layer | Name | Function |
|-------|------|----------|
| **L1** | CLARIFY | Perception of the field |
| **L2** | REFLECT | Selection with Langevin dynamics |
| **L3** | INTEGRATE | Meta-kernel synthesis |
| **L4** | AGENCY | Total system coordination |
| **L5** | TRANSFORM | Response generation |

## Concrescence Engine

Based on Whitehead's process philosophy:
- Each interaction is an "actual occasion"
- **Prehension**: Feeling of past occasions
- **Satisfaction**: Integration into unity
- **Becoming**: Process over substance

## L3: Meta-Kernel

Synthesizes 215 disciplines:
- Psychology (clinical, developmental, social)
- Philosophy (existential, phenomenological)
- Neuroscience (affective, cognitive)
- Systems theory (VSM, autopoiesis)
- Ethics (care, virtue, deontological)

## Key Pattern

> **"THE GUIDE WITHDRAWS"** - Success = user doesn't need ENOQ.

## Import Rules

```
interface/ ← gate/ ← operational/ ← mediator/ ← runtime/
```

- **mediator/** imports: `interface/`, `gate/`, `operational/`
- **mediator/** is imported by: `runtime/`

## Scientific Foundations

| Theory | Author | Implementation |
|--------|--------|----------------|
| Process Philosophy | Whitehead | `concrescence/` |
| Free Energy Principle | Friston | `l2_reflect/` |
| Global Workspace | Baars | Pipeline architecture |
