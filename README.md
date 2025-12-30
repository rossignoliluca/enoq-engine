# enoq-engine

ENOQ Engine — Constitutional geometric motor (permit → verify → stop).

> Autopoietic viable system for human empowerment.

**Standard:** [ENOQ Standard v1.0 (Draft)](./STANDARD/ENOQ_STANDARD_v1.0_DRAFT.md)

---

## Structure

```
enoq-engine/
├── AXIS/                        # FROZEN constitutional ground
│   ├── AXIOMS.md                # 12 axioms
│   ├── INVARIANTS.md            # INV-001 to INV-011
│   ├── RUBICON.md               # Decision threshold
│   ├── HASH_FREEZE.md           # Cryptographic verification
│   └── IMPLEMENTATION_MAP.md    # INV → file path mapping
│
├── src/typescript/src/
│   ├── interface/               # Shared types and contracts
│   │
│   ├── core/                    # CANONICAL ENTRYPOINT (v6.7+)
│   │   ├── modules/             # boundary + verification (wrap gate/)
│   │   ├── pipeline/            # orchestrator.ts → enoqCore()
│   │   ├── axis-runtime/        # CONTRACT.md (guardrail)
│   │   └── signals/             # Event system (stub)
│   │
│   ├── runtime/                 # DELEGATED by core (middle processing)
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

## Architecture Notes

### Core Modules Wiring

`core/modules/` contains canonical wrappers that delegate to the real implementations in `gate/`:

| Module | Wraps | Purpose |
|--------|-------|---------|
| `boundary.ts` | `gate/classifier/` | Request classification + V_MODE/EMERGENCY detection |
| `verification.ts` | `gate/verification/S5_verify` | Output verification against AXIS invariants |

This is intentional:
- **Core** provides the canonical API (`permit()`, `verifyOutput()`)
- **Gate** contains the implementation logic
- This separation allows gate to evolve independently while core remains stable

### Entry Points

```
enoqCore() ← CANONICAL (core/pipeline/orchestrator.ts)
    ↓
    permit() → runtimeEnoq() → verify() → STOP

enoq() ← DEPRECATED (runtime/pipeline/pipeline.ts)
    ↓
    Runtime processing only, no constitutional checks
```

---

## Frozen Rules

See [docs/REPO_CONTRACT.md](./docs/REPO_CONTRACT.md):

1. `enoqCore()` is the canonical entry point (v6.7+)
2. `experimental/` must NOT be imported from core
3. `surfaces/` and `external/` cannot import from `core/modules/`
4. `npm run axis-check` must PASS before deployment
5. `external/cache/` is the only location for caching
6. Empty canonical directories are intentional scaffolds

---

## Run

```bash
cd src/typescript
npm install
npm test              # 676 tests
npm run build
npm run axis-check    # MUST PASS
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
| Invariant enforcement | [AXIS/IMPLEMENTATION_MAP.md](./AXIS/IMPLEMENTATION_MAP.md) |
| Pipeline flow | [src/typescript/src/core/pipeline/README.md](./src/typescript/src/core/pipeline/README.md) |
| Module docs | [src/typescript/src/core/modules/](./src/typescript/src/core/modules/) |
| Architecture rules | [docs/REPO_CONTRACT.md](./docs/REPO_CONTRACT.md) |

---

## What is NOT Here

- No product UI (this is core only)
- `experimental/` is quarantined research, not production
- No external integrations beyond LLM providers

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| **v8.0** | 2025-12-30 | **CORE FREEZE** - Infrastructure stable |
| **v7.9** | 2025-12-30 | Responsibility Return invariant hardening |
| **v7.8** | 2025-12-30 | P6: Connectors (Email + Webhook) |
| **v7.7** | 2025-12-30 | P5: Storage & Audit (SQLite) |
| **v7.6** | 2025-12-30 | P4: API Thin (Fastify wrapper) |
| **v7.5** | 2025-12-30 | P3: SDK-first surfaces (mail/relation/decision) |
| **v7.4** | 2025-12-30 | P2: Core hardening (content compliance, golden tests) |
| **v7.3** | 2025-12-30 | P1: enoqCore canonical, EnoqError types |
| **v7.2** | 2025-12-30 | P0: 58 new tests, import fixes |
| **v7.1** | 2025-12-30 | DECISION traversal |
| **v7.0** | 2025-12-30 | RELATION traversal |
| **v6.9** | 2025-12-29 | MAIL traversal |
| **v6.8** | 2025-12-29 | AXIS-CHECK guardrail |
| **v6.0** | 2025-12-29 | AXIS constitutional freeze |

### Recent Details

**v7.5**: P3 SDK-first Surfaces - Public SDK with 3 functions: `mail()`, `relation()`, `decision()`. Thin wrapper over enoqCore (PERMIT → ACT → VERIFY → STOP). Stable types (MailInput, MailOutput, SDKResult, ComplianceFlags). Contract tests (24 tests). README with examples. NO server, NO auth, NO storage - just SDK.

**v7.4**: P2 Core Hardening - Content compliance engine (NORMATIVE/RANKING/ENGAGEMENT/PERSUASION patterns across 5 languages), golden test harness (60 tests for MAIL/RELATION/DECISION), observability module (events: BOUNDARY_BLOCKED, VERIFY_FAILED, RUBICON_WITHDRAW, PROVIDER_FAILOVER + metrics + JSON logging), axis-check extended to 18 verification points across 6 groups. Tests: 879.

**v7.3**: P1 stabilization - enoqCore canonical entry (enoq deprecated), EnoqError base class with typed codes (API/CONFIG/VALIDATION/PIPELINE/INVARIANT), LLM fallback chain (Anthropic→OpenAI). Architecture notes in README. Tests: 676/692.

**v7.2**: P0 stabilization - 58 new tests (orchestrator, pipeline, traversals), import violations fixed (runtime→experimental, operational→experimental, gate→mediator), axis-check extended (12 checks). Tests: 676/692.

**v7.1**: DECISION traversal - clarifies decisions: `npx ts-node src/surfaces/cli/decision.ts`. No recommendations. Rubicon detection (INV-009).

**v7.0.1**: RELATION wording - "Responsibility returns to: A (your agency)" + "B owns: their feelings/reactions".

**v7.0**: RELATION traversal - maps human relationships: `npx ts-node src/surfaces/cli/relation.ts`. No coaching. No advice. Descriptive only.

**v6.9.1**: FAST PATH architecture - `permit() → act(callLLM) → verify → stop`. Re-export from orchestrator for axis-check compliance.

**v6.9**: MAIL traversal - first end-to-end crossing: `npx ts-node src/surfaces/cli/mail.ts`

**v6.8**: AXIS-CHECK guardrail - `npm run axis-check` verifies import boundaries and orchestrator path

**v6.7**: Slice 2 wiring - `permit()` in boundary, `verifyOutput()` in verification, orchestrator uses core modules

**v6.6**: Slice 1 wiring - `enoqCore()` canonical entry point wrapping runtime

**v6.5**: Moved 33 unreferenced docs to `docs/legacy/`, added `artifacts/` to .gitignore

**v6.4.1**: Fixed SQLite `clear()` method using wrong table name (`regulatory_state` → `field_state`)

**v6.4**: Canonical empty folder scaffolds, removed orphan `types.ts`, cleaned `research/` refs, `@deprecated` banners on legacy

**v6.3.1**: Fixed broken package.json scripts, completed HASH_FREEZE.md, cleaned tsconfig.json

---

## License

Private. Contact for licensing.

---

**Creator:** Luca Rossignoli
