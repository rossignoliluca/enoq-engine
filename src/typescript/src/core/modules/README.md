# core/modules

Canonical module wrappers for ENOQ Engine.

---

## Structure

```
modules/
├── boundary/       # Request classification (wraps gate/classifier)
├── verification/   # Output verification (wraps gate/verification)
├── perception/     # Input perception (stub)
├── reasoning/      # Reasoning engine (stub)
├── execution/      # Action execution (stub)
├── memory/         # Memory system (stub)
├── temporal/       # Temporal reasoning (stub)
├── metacognition/  # Self-monitoring (stub)
└── defense/        # Defense mechanisms (stub)
```

---

## Active Modules

| Module | Status | Wraps |
|--------|--------|-------|
| `boundary/` | Active | `gate/classifier/` |
| `verification/` | Active | `gate/verification/S5_verify` |

---

## Wiring Pattern

Core modules provide stable APIs that delegate to implementation in `gate/`:

```typescript
// core/modules/boundary/index.ts
export async function permit(input: string): Promise<PermitResult> {
  // Delegates to gate/classifier
}
```

This allows `gate/` to evolve independently while `core/` remains stable.
