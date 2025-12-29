# gate/

> **Legacy active structure.** Canonical target is `src/typescript/src/core/` (modules + pipeline + signals).

> **Normative Geometry** - What MUST NOT happen.

## Purpose

The gate layer implements ENOQ's normative control - constitutional constraints that restrict what the system can do. This is the **LIMEN organ** (boundary/threshold function).

## Principle

> The normative layer can only **RESTRICT**, never **ADD**.

## Structure

```
gate/
├── classifier/       # LIMEN classifier (delegation detection)
├── enforcement/      # ADS + Second Order observers
├── invariants/       # AXIS runtime checks
├── protocols/        # LIMEN protocols (grounding, withdrawal)
├── verification/     # S5_verify, PlanActVerifier
└── withdrawal/       # Safe stop logic
```

## Key Components

| Component | Purpose | Output |
|-----------|---------|--------|
| **ADS Detector** | Avoidable delegation detection | HARD constraints (`disable_tools`, `must_require_effort`) |
| **Second Order** | Enchantment/transference detection | SOFT constraints (`warmth_delta`, `brevity_delta`) |
| **S5_verify** | Final constitutional check | Pass/Fail |
| **PlanActVerifier** | Pre-render enforcement | Plan modifications |

## Enforcement Chain

```
Input → ADS (HARD) → Second Order (SOFT) → PlanActVerifier → S5_verify
```

## Constraint Types

| Type | Examples | Who Sets |
|------|----------|----------|
| **HARD** | `disable_tools`, `must_require_effort` | ADS only |
| **SOFT** | `warmth_delta`, `brevity_delta`, `force_pronouns` | Second Order only |

## Import Rules

```
interface/ ← gate/ ← operational/
```

- **gate/** imports: `interface/`
- **gate/** is imported by: `operational/`, `mediator/`, `runtime/`

## Key Invariants Enforced

- **INV-003**: No normative delegation
- **INV-009**: Rubicon (identity/meaning protection)
- **INV-011**: No diagnosis
