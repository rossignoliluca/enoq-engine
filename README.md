# ENOQ-CORE

Constitutional cognitive core. AXIS + Pipeline + 9 Modules.

> ENOQ is the system. LIMEN is one of nine modules.

---

## Structure

```
ENOQ-CORE/
├── AXIS/                        # FROZEN constitutional ground
│   ├── AXIOMS.md                # 12 axioms
│   ├── INVARIANTS.md            # INV-001 to INV-011
│   ├── RUBICON.md               # Decision threshold
│   └── HASH_FREEZE.md           # Cryptographic verification
│
├── src/typescript/src/
│   ├── interface/               # Shared types and contracts
│   │
│   ├── core/                    # CANONICAL TARGET (not yet wired)
│   │   ├── modules/             # 9 modules with READMEs
│   │   ├── pipeline/            # Orchestration
│   │   └── signals/             # Event system
│   │
│   ├── runtime/                 # CURRENT ENTRYPOINT (enoq())
│   │   ├── pipeline/            # pipeline.ts, l2_execution.ts
│   │   ├── io/                  # cli.ts, interactive_session.ts
│   │   └── quarantine/          # Isolated experimental code
│   │
│   ├── gate/                    # Legacy active → Normative gating
│   │   ├── classifier/          # Request classification
│   │   ├── enforcement/         # ADS, domain governor, 2nd order
│   │   ├── invariants/          # AXIS enforcement (axis.ts)
│   │   ├── protocols/           # Response protocols
│   │   ├── verification/        # S5_verify, plan_act_verifier
│   │   └── withdrawal/          # Lifecycle, regulatory store
│   │
│   ├── operational/             # Legacy active → Routing & detection
│   │   ├── detectors/           # dimensional, ultimate, LLM detectors
│   │   ├── gating/              # unified_gating (canonical), np_gating
│   │   ├── providers/           # gate_client, gate_embedded
│   │   └── signals/             # early_signals.ts
│   │
│   ├── mediator/                # Legacy active → Cognitive processing
│   │   ├── l1_clarify/          # perception.ts
│   │   ├── l2_reflect/          # selection, stochastic_field
│   │   ├── l3_integrate/        # meta_kernel, disciplines
│   │   ├── l4_agency/           # total_system, agent_swarm
│   │   ├── l5_transform/        # generation, plan_renderer
│   │   └── concrescence/        # concrescence_engine
│   │
│   ├── external/                # External dependencies
│   │   ├── cache/               # llm_cache (only cache location)
│   │   └── providers/           # LLM provider abstractions
│   │
│   ├── surfaces/                # External interfaces (placeholders)
│   │   ├── cli/                 # CLI interface
│   │   ├── sdk/                 # SDK (future)
│   │   └── api/                 # API (future)
│   │
│   ├── experimental/            # Research, not production
│   │   ├── genesis/             # Self-building system
│   │   ├── cognitive_router/    # Adaptive routing research
│   │   └── legacy/              # Deprecated code
│   │
│   ├── benchmarks/              # Performance benchmarks
│   │   ├── cases/               # Test case definitions
│   │   └── artifacts/           # Benchmark results (JSON)
│   │
│   └── __tests__/               # Jest test suites (25 files)
│
└── docs/
    ├── REPO_CONTRACT.md         # FROZEN architecture rules
    ├── INDEX.md                 # Documentation index
    └── legacy/                  # Outdated docs
```

---

## Frozen Rules

See [docs/REPO_CONTRACT.md](./docs/REPO_CONTRACT.md):

1. `unified_gating.ts` is the only canonical gating export
2. `experimental/legacy/` must NOT be imported from core
3. `external/cache/` is the only location for caching
4. `enoq()` is the sole entry point surfaces → core
5. `np_gating.ts` is internal, not exported
6. `research/` does not exist
7. Empty canonical directories are intentional scaffolds

---

## Run

```bash
cd src/typescript
npm install
npm test              # 618 tests
npm run build
```

Interactive:
```bash
npx ts-node src/runtime/io/interactive_session.ts
```

---

## Start Reading

| What | Where |
|------|-------|
| Constitutional ground | [AXIS/AXIOMS.md](./AXIS/AXIOMS.md) |
| Pipeline flow | [src/typescript/src/core/pipeline/README.md](./src/typescript/src/core/pipeline/README.md) |
| Module docs | [src/typescript/src/core/modules/](./src/typescript/src/core/modules/) |
| Architecture rules | [docs/REPO_CONTRACT.md](./docs/REPO_CONTRACT.md) |

---

## What is NOT Here

- No product UI (this is core only)
- `experimental/` is quarantined research, not production
- No external integrations beyond LLM providers

---

## Changelog (v6.x)

| Version | Date | Changes |
|---------|------|---------|
| **v6.5.1** | 2025-12-29 | Fix broken INDEX.md links |
| **v6.5** | 2025-12-29 | Docs cleanup: 33 files → legacy, artifacts gitignored |
| **v6.4.1** | 2025-12-29 | Fix SQLite clear() table name bug (618/618 tests) |
| **v6.4** | 2025-12-29 | Phase 2 hygiene: scaffolds, dedup, legacy banners |
| **v6.3.1** | 2025-12-29 | Critical hygiene: scripts, tsconfig, hash freeze |
| **v6.3** | 2025-12-29 | Docs cleanup: AXIS.md→AXIS_PHILOSOPHY.md, CONSTITUTION→legacy |
| **v6.2** | 2025-12-29 | Scatter cleanup: legacy banners, research/ consolidation |
| **v6.1** | 2025-12-29 | Documentation coherence: 9 READMEs, INDEX updates |
| **v6.0** | 2025-12-29 | AXIS constitutional freeze (12 axioms, 11 invariants) |

### Recent Details

**v6.5**: Moved 33 unreferenced docs to `docs/legacy/`, added `artifacts/` to .gitignore

**v6.4.1**: Fixed SQLite `clear()` method using wrong table name (`regulatory_state` → `field_state`)

**v6.4**: Canonical empty folder scaffolds, removed orphan `types.ts`, cleaned `research/` refs, `@deprecated` banners on legacy

**v6.3.1**: Fixed broken package.json scripts, completed HASH_FREEZE.md, cleaned tsconfig.json

---

## License

Private. Contact for licensing.

---

**Creator:** Luca Rossignoli
