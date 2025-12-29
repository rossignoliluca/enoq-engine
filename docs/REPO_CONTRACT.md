# REPO CONTRACT

**Frozen rules. Do not violate.**

1. `unified_gating.ts` is the only canonical gating export
2. `experimental/legacy/` must NOT be imported from core/operational/runtime
3. `external/cache/` is the only location for caching logic
4. `enoq()` in `runtime/pipeline/pipeline.ts` is the sole entry point surfaces→core
5. `np_gating.ts` is internal to unified_gating, not exported publicly
6. `research/` folder does not exist (deleted, experimental/ is source of truth)
7. Empty canonical directories are intentional scaffolds (see README in each):
   - `external/connectors/` - ingress adapters
   - `external/storage/` - persistence adapters
   - `surfaces/api/` - HTTP API surface
   - `surfaces/sdk/` - SDK surface

**Violation = drift. Fix immediately or revert.**
