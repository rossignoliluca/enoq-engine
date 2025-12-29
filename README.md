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
| **v6.4** | 2025-12-29 | Full audit + duplicate cleanup, README structure complete |
| **v6.3** | 2025-12-29 | Docs cleanup: AXIS.md→AXIS_PHILOSOPHY.md, CONSTITUTION→legacy |
| **v6.2** | 2025-12-29 | Scatter cleanup: legacy banners, research/ consolidation |
| **v6.1** | 2025-12-29 | Documentation coherence: 9 READMEs, INDEX updates |
| **v6.0** | 2025-12-29 | AXIS constitutional freeze (12 axioms, 11 invariants) |

### v6.4 Details
- Full repository audit: all 11 folders verified against REPO_CONTRACT
- Removed `experimental/concrescence/` (duplicate of `mediator/concrescence/`)
- Removed `experimental/field_integration.ts` (duplicate of `runtime/quarantine/`)
- README structure diagram now shows all folders (interface, surfaces, benchmarks, __tests__)

### v6.3 Details
- `docs/AXIS.md` → `docs/AXIS_PHILOSOPHY.md` (disambiguate from AXIS/)
- `docs/CONSTITUTION.md` → `docs/legacy/` (duplicated AXIS/INVARIANTS.md)
- `V3_1_RUNTIME_FLOW.md` → `docs/legacy/` (versioned v3.1)
- Updated 7 docs refs to point to AXIS/INVARIANTS.md

### v6.2 Details
- Added "Legacy active structure" banner to gate/, operational/, mediator/, runtime/
- Deleted stale `research/` folder (duplicate of experimental/)
- Fixed broken import in field_integration.ts
- Established canonical structure: core/ = target, runtime/ = current

### v6.1 Details
- Created READMEs for 9 directories (AXIS, interface, gate, operational, mediator, runtime, surfaces, external, docs/legacy)
- Added canonical entrypoints section to docs/INDEX.md
- Updated README structure diagram

### v6.0 Details
- Froze AXIS constitutional documents (AXIOMS, INVARIANTS, RUBICON, ORGANS)
- Created HASH_FREEZE.md with cryptographic verification
- Established docs/REPO_CONTRACT.md with 6 frozen rules

---

## License

Private. Contact for licensing.

---

**Creator:** Luca Rossignoli
