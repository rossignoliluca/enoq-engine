# gate/withdrawal

Lifecycle and state management.

---

## Files

| File | Purpose |
|------|---------|
| `lifecycle_controller.ts` | Session lifecycle management |
| `regulatory_store.ts` | Constraint state persistence |

---

## Withdrawal Right (INV-003)

Users can withdraw at any point. This module ensures:
- Clean session termination
- State persistence for continuity
- No blocking of exit
