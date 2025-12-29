# ADR-000: Two Geometries + Threshold

## Status
Accepted (Updated 2024-12-28)

## Context
The system requires separation between operational decisions (routing, caching, detection) and normative decisions (enforcement, constitutional constraints). Mixing these concerns leads to:
- Unclear responsibility boundaries
- Difficulty reasoning about safety guarantees
- Coupling between optimization and invariants

## Decision
Implement **Two Geometries** architecture:

### Geometry Operational (`operational/`)
- Routing decisions (`gating/unified_gating.ts`, `gating/np_gating.ts`)
- Caching (`gate/thresholds/llm_cache.ts`)
- Detection (`detectors/dimensional_system.ts`, `detectors/ultimate_detector.ts`)
- LLM providers (`providers/llm_provider.ts`, `providers/gate_client.ts`)
- Early signals (`signals/early_signals.ts`)

### Geometry Normative (`gate/`)
- Constitutional enforcement (`invariants/axis.ts`, `verification/S5_verify.ts`)
- Plan verification (`verification/plan_act_verifier.ts`)
- Domain governance (`enforcement/domain_governor.ts`)
- Second-order observation (`enforcement/second_order_observer.ts`, `enforcement/ads_detector.ts`)
- Regulatory rules (`withdrawal/lifecycle_controller.ts`, `withdrawal/regulatory_store.ts`)

### Import Rules (HARD)
- `gate/` imports ONLY from `interface/`
- `operational/` imports from `interface/`, `gate/`
- `runtime/` MUST NOT import from `research/`
- `research/` is isolated (cannot be imported by production code)
- Shared types are in `interface/types.ts`

### Threshold
The threshold between geometries is the `DimensionalState` type - operational geometry computes it, normative geometry constrains responses based on it.

## Consequences
- Clear separation of concerns
- Safety invariants can be reasoned about independently
- Optimization work doesn't affect normative constraints
- Testing can focus on each geometry separately

## Tests
- `scripts/check-imports.sh` validates import boundaries
- All invariants (INV-003, INV-009, INV-011) verified in gate/ tests
