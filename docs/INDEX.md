# ENOQ Documentation

> Start here. This is the single entrypoint for all ENOQ documentation.

---

## Canonical Entrypoints

| Path | Role |
|------|------|
| [AXIS/](/AXIS/) | Constitutional ground (frozen) |
| [REPO_CONTRACT.md](./REPO_CONTRACT.md) | Repository rules (6 frozen) |
| [src/typescript/src/core/](/src/typescript/src/core/) | **Canonical target** (modules + pipeline + signals) |
| [src/typescript/src/runtime/](/src/typescript/src/runtime/) | Current entrypoint (`enoq()`) |

---

## Quick Links

| Document | Description |
|----------|-------------|
| [README](/README.md) | Project overview, quick start |
| [CONTRIBUTING](/src/typescript/CONTRIBUTING.md) | 3 rules for contributors |
| [ARCHITECTURE](/src/typescript/docs/ARCHITECTURE.md) | System architecture (v6.0) |
| [SYSTEM_MAP](/src/typescript/docs/SYSTEM_MAP.md) | Directory structure guide |

---

## Constitutional Ground (AXIS)

> AXIS is frozen. These documents define ENOQ's identity.

| Document | Purpose |
|----------|---------|
| [AXIOMS](/AXIS/AXIOMS.md) | 12 frozen axioms (infinite priors) |
| [INVARIANTS](/AXIS/INVARIANTS.md) | 11 structural constraints |
| [RUBICON](/AXIS/RUBICON.md) | Existential threshold specification |
| [ORGANS](/AXIS/ORGANS.md) | Nine organs specification |
| [HASH_FREEZE](/AXIS/HASH_FREEZE.md) | Cryptographic verification |

---

## Core Documentation

### Architecture

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](/src/typescript/docs/ARCHITECTURE.md) | Layer overview, import boundaries |
| [SYSTEM_MAP.md](/src/typescript/docs/SYSTEM_MAP.md) | File-by-file directory guide |
| [ORGAN_MAP.md](./ORGAN_MAP.md) | Code → organs mapping |
| [ADR Index](/src/typescript/docs/decisions/) | Architecture Decision Records |

### Session Recovery

| Document | Purpose |
|----------|---------|
| [SESSION_BOOTSTRAP.md](./SESSION_BOOTSTRAP.md) | Claude context recovery |
| [ARCHITECTURE_TOTAL.md](./ARCHITECTURE_TOTAL.md) | Master architecture reference |

### Specifications

| Document | Purpose |
|----------|---------|
| [V-MODE-SPEC.md](./V-MODE-SPEC.md) | V_MODE detection and handling |
| [S5_VERIFY_SPEC.md](./S5_VERIFY_SPEC.md) | Constitutional verification |
| [THRESHOLD.md](./THRESHOLD.md) | Gating thresholds |
| [DOMAINS-ONTOLOGY.md](./DOMAINS-ONTOLOGY.md) | 17 horizontal domains |

### Runtime

> For current routing, see [ARCHITECTURE.md](/src/typescript/docs/ARCHITECTURE.md).
> Legacy routing docs moved to [docs/legacy/](./legacy/).

---

## Architecture Decision Records (ADR)

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-000](/src/typescript/docs/decisions/ADR_000_two_geometries.md) | Two Geometries + Threshold | Accepted |
| [ADR-001](/src/typescript/docs/decisions/ADR_001_plan_first.md) | Plan-First Decision | Accepted |
| [ADR-002](/src/typescript/docs/decisions/ADR_002_monotonic_tightening.md) | Monotonic Tightening | Accepted |
| [ADR-003](/src/typescript/docs/decisions/ADR_003_research_isolation.md) | Research Isolation | Accepted |
| [ADR-004](/src/typescript/docs/decisions/ADR_004_unified_gating.md) | Unified Gating (v5.1) | Accepted |
| [ADR-005](/src/typescript/docs/decisions/ADR_005_rename_kernel_limen.md) | Rename to LIMEN | **SUPERSEDED by ADR-007** |
| [ADR-006](/src/typescript/docs/decisions/ADR_006_gate_mediator_architecture.md) | GATE-MEDIATOR Architecture | Accepted |
| [ADR-007](/src/typescript/docs/decisions/ADR_007_enoq_canonical_architecture.md) | ENOQ Canonical Architecture | **ACCEPTED (Canonical)** |

---

## The Nine Organs

| Organ | Function | VSM |
|-------|----------|-----|
| **LIMEN** | Boundary, filtering | S5 |
| **SENSUS** | Perception, field reading | S4 |
| **NEXUS** | Memory | S2 |
| **LOGOS** | Planning, selection | S3 |
| **ERGON** | Execution, output | S1 |
| **CHRONOS** | Temporal patterns | S2 |
| **TELOS** | Verification, withdrawal | S5 |
| **IMMUNIS** | Anti-drift, anti-dependency | S5 |
| **META** | Self-observation | S4 |

---

## Import Boundaries

**Current (legacy active):**
```
interface/ <-- gate/ <-- operational/ <-- mediator/ <-- runtime/
```

**Canonical target:**
```
core/interface/ <-- core/modules/ <-- core/pipeline/ <-- core/signals/
```

See [CONTRIBUTING.md](/src/typescript/CONTRIBUTING.md) for rules.

---

## Legacy Documentation

> Historical documents from before the v6.0 architecture.

- [docs/legacy/](./legacy/) - Outdated pre-v6.0 documentation

---

*ENOQ: Autopoietic Viable System for Human Empowerment*
*LIMEN is one of nine organs (threshold/boundary function)*
