# operational/gating/

## Canonical Export

**Use `unified_gating.ts` for all gating needs.**

```typescript
import { UnifiedGating, unifiedGating } from './operational/gating/unified_gating';
```

## Files

| File | Status | Purpose |
|------|--------|---------|
| `unified_gating.ts` | **CANONICAL** | Single entry point for gating decisions |
| `np_gating.ts` | Internal | Used by unified_gating (not exported publicly) |

## Deprecated

`scientific_gating.ts` moved to `experimental/legacy/` - do not use in new code.
