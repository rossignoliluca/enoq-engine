# REPO CONTRACT

**Frozen rules. Do not violate.**

---

## Canonical Rules (v6.8+)

1. **`enoqCore()` is the canonical entry point**
   - Located: `core/pipeline/orchestrator.ts`
   - All surfaces must use `enoqCore()`, not `enoq()`
   - Pipeline: PERMIT → SENSE → ... → VERIFY → STOP

2. **`experimental/` must NOT be imported from core**
   - `core/` cannot have any import from `experimental/`
   - Enforced by `npm run axis-check`

3. **`surfaces/` and `external/` cannot import from `core/modules/`**
   - Boundary protection: external code cannot bypass geometry
   - Enforced by `npm run axis-check`

4. **`npm run axis-check` must PASS before deployment**
   - Verifies import boundaries
   - Verifies orchestrator path (permit, verify, stop)
   - Verifies enforcement presence (INV-003, INV-009, INV-011)
   - Exit 0 = PASS, Exit 1 = DO NOT DEPLOY

5. **`external/cache/` is the only location for caching**
   - No caching logic elsewhere in codebase

6. **Empty canonical directories are intentional scaffolds**
   - `external/connectors/` - ingress adapters
   - `external/storage/` - persistence adapters
   - `surfaces/api/` - HTTP API surface
   - `surfaces/sdk/` - SDK surface
   - See README.md in each directory

7. **Responsibility Returned is a required invariant (v7.9+)**
   - Every runtime output must return ownership to the human
   - Canonical markers per runtime:
     - MAIL: "Sending and editing remains your choice."
     - RELATION: "Next action remains yours."
     - DECISION: "Decision ownership remains with you."
   - Missing marker triggers RESPONSIBILITY_RETURN_MISSING event
   - No advice, no coaching, no extra interaction

---

## Enforcement

```
npm run axis-check
```

**Violation = drift. Fix immediately or revert.**
