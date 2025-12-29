# LIMEN Documentation

> Start here. This is the single entrypoint for all LIMEN documentation.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [README](/README.md) | Project overview, quick start |
| [CONTRIBUTING](/src/typescript/CONTRIBUTING.md) | 3 rules for contributors |
| [ARCHITECTURE](/src/typescript/docs/ARCHITECTURE.md) | System architecture (v5.2) |
| [SYSTEM_MAP](/src/typescript/docs/SYSTEM_MAP.md) | Directory structure guide |

---

## Core Documentation

### Architecture

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](/src/typescript/docs/ARCHITECTURE.md) | Layer overview, import boundaries |
| [SYSTEM_MAP.md](/src/typescript/docs/SYSTEM_MAP.md) | File-by-file directory guide |
| [ADR Index](/src/typescript/docs/decisions/) | Architecture Decision Records |

### Constitution (Invariants)

| Document | Purpose |
|----------|---------|
| [CONSTITUTION.md](./CONSTITUTION.md) | Core principles and laws |
| [AXIS.md](./AXIS.md) | Constitutional invariants (INV-003, INV-009, INV-011) |
| [META_KERNEL.md](./META_KERNEL.md) | 215 disciplines synthesis |

### Specifications

| Document | Purpose |
|----------|---------|
| [V-MODE-SPEC.md](./V-MODE-SPEC.md) | V_MODE detection and handling |
| [S5_VERIFY_SPEC.md](./S5_VERIFY_SPEC.md) | Constitutional verification |
| [THRESHOLD.md](./THRESHOLD.md) | Gating thresholds |
| [DOMAINS-ONTOLOGY.md](./DOMAINS-ONTOLOGY.md) | 17 horizontal domains |

### Runtime

| Document | Purpose |
|----------|---------|
| [V5_1_ROUTING.md](/src/typescript/docs/V5_1_ROUTING.md) | Unified gating system |
| [V4_ROUTING.md](/src/typescript/docs/V4_ROUTING.md) | Previous routing (reference) |

---

## Architecture Decision Records (ADR)

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-000](/src/typescript/docs/decisions/ADR_000_two_geometries.md) | Two Geometries + Threshold | Accepted |
| [ADR-001](/src/typescript/docs/decisions/ADR_001_plan_first.md) | Plan-First Decision | Accepted |
| [ADR-002](/src/typescript/docs/decisions/ADR_002_monotonic_tightening.md) | Monotonic Tightening | Accepted |
| [ADR-003](/src/typescript/docs/decisions/ADR_003_research_isolation.md) | Research Isolation | Accepted |
| [ADR-004](/src/typescript/docs/decisions/ADR_004_unified_gating.md) | Unified Gating (v5.1) | Accepted |
| [ADR-005](/src/typescript/docs/decisions/ADR_005_rename_limen.md) | Rename to LIMEN | Accepted |
| [ADR-006](/src/typescript/docs/decisions/ADR_006_gate_mediator_architecture.md) | GATE-MEDIATOR Architecture | Accepted |

---

## Import Boundaries

```
interface/ <-- gate/ <-- operational/ <-- mediator/ <-- runtime/
```

See [CONTRIBUTING.md](/src/typescript/CONTRIBUTING.md) for rules.

---

## Legacy Documentation

> Historical documents from before the LIMEN architecture.

- [docs/legacy/](./legacy/) - Outdated ENOQ-era documentation

---

*LIMEN (Latin: "threshold") - Cognitive Control System for Human Flourishing*
