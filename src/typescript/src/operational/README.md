# operational/

> **Legacy active structure.** Canonical target is `src/typescript/src/core/` (modules + pipeline + signals).

> **Operational Geometry** - How to route and detect.

## Purpose

The operational layer handles routing decisions, input classification, and signal processing. Unlike `gate/` (which restricts), operational **routes and classifies**.

## Structure

```
operational/
├── detectors/        # Dimensional, SOTA, Hybrid, Ultimate
├── gating/           # Unified gating (canonical), NP gating
├── providers/        # LLM providers
└── signals/          # Signal processing
```

## Key Components

| Component | Purpose | Output |
|-----------|---------|--------|
| **Dimensional Detector** | 5V + 17H classification | `DimensionalState` |
| **Ultimate Detector** | Orchestrates all detectors | Unified detection |
| **LLM Detector v2** | Regime classification | `RegimeClassification` |
| **Unified Gating** | Single routing point | Call/Skip decision |
| **NP Gating** | Neyman-Pearson classifier | Threshold decision |

## Canonical Gating (unified_gating.ts)

```
Input → STAGE 0: Safety invariants
      → STAGE 1: Cache lookup
      → STAGE 2: Hard skip rules
      → STAGE 3: NP gating (τ=0.85)
      → Decision: CALL_LLM or SKIP
```

**Achievement**: 69% LLM call reduction on realistic traffic.

## Detection Pipeline

```
Message → Fast Regex (~2ms)
             ↓
        SOTA/Hybrid (async, if available)
             ↓
        Ultimate Detector (orchestration)
             ↓
        DimensionalState {
          v_mode_triggered,
          emergency_detected,
          vertical_scores,
          horizontal_scores
        }
```

## Import Rules

```
interface/ ← gate/ ← operational/ ← mediator/
```

- **operational/** imports: `interface/`, `gate/`
- **operational/** is imported by: `mediator/`, `runtime/`

## Key Files

| File | Purpose |
|------|---------|
| `detectors/dimensional_system.ts` | Core regex detector |
| `detectors/ultimate_detector.ts` | Orchestration layer |
| `gating/unified_gating.ts` | **Canonical** routing |
| `gating/np_gating.ts` | Neyman-Pearson threshold |
