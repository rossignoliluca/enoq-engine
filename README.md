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
│   └── RUBICON.md               # Decision threshold
│
├── src/typescript/src/
│   ├── core/                    # CANONICAL TARGET
│   │   ├── modules/             # 9 organs with READMEs
│   │   ├── pipeline/            # Orchestration
│   │   └── signals/             # Event system
│   │
│   ├── runtime/                 # CURRENT ENTRYPOINT (enoq())
│   ├── gate/                    # Legacy active (→ core/modules/)
│   ├── operational/             # Legacy active (→ core/modules/)
│   ├── mediator/                # Legacy active (→ core/modules/)
│   └── external/                # LLM providers, cache
│
├── docs/REPO_CONTRACT.md        # FROZEN architecture rules
└── experimental/                # Not production code
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

## Tags

| Tag | Meaning |
|-----|---------|
| `v6.1` | Documentation coherence, READMEs |
| `v6.0` | AXIS constitutional freeze |
| `v0.1-geometry-clean` | Structure frozen, invariants defined |

---

## License

Private. Contact for licensing.

---

**Creator:** Luca Rossignoli
