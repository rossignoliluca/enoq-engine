# gate/classifier

Request classification and signal detection.

---

## Files

| File | Purpose |
|------|---------|
| `classifier.ts` | Main classification logic |
| `signals.ts` | Signal detection (V_MODE, EMERGENCY) |
| `types.ts` | Type definitions |
| `index.ts` | Barrel export |

---

## Key Functions

- `classify(input)` - Classify request type
- `detectSignals(input)` - Detect V_MODE/EMERGENCY signals

---

## Wrapped By

`core/modules/boundary/` provides the canonical `permit()` API.
