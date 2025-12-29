# ENOQ Session Bootstrap

**Purpose:** Context recovery document for Claude Code sessions
**Usage:** Read this first when starting a new session on ENOQ

---

## What Is ENOQ?

ENOQ is an **autopoietic viable system for human empowerment** that:
- Maximizes operational capability
- Preserves absolute human agency
- Withdraws as measure of success

**The paradox:** Maximum power + Maximum restraint + Maximum disappearance

**Success metric:** ENOQ becomes unnecessary.

---

## Core Architecture

### The Triad

```
CAPABILITY ↑ × AGENCY ↑ × WITHDRAWAL ↑
```

All three must increase together. Optimizing one at expense of others = failure.

### The Ground

**AXIS** — Constitutional ground. Not an organ. The terrain itself.
- Location: `/AXIS/`
- Contains: AXIOMS.md, INVARIANTS.md, RUBICON.md, ORGANS.md
- Status: FROZEN (infinite priors)
- Rule: Cannot be modified without supermajority + 90-day review

### The Nine Organs

| Organ | Latin/Greek | Function | VSM |
|-------|-------------|----------|-----|
| LIMEN | threshold | Boundary, filtering | S5 |
| SENSUS | perception | Field reading | S4 |
| NEXUS | connection | Memory integration | S2 |
| LOGOS | reason | Planning, selection | S3 |
| ERGON | work | Execution, output | S1 |
| CHRONOS | time | Temporal patterns | S2 |
| TELOS | end | Verification, completion | S5 |
| IMMUNIS | defense | Anti-drift, anti-dependency | S5 |
| META | beyond | Self-observation | S4 |

### State Machine

```
S0_PERMIT → S1_SENSE → S2_CLARIFY → S3_PLAN → S4_ACT → S5_VERIFY → S6_STOP
    │                                                        │
    └────────────────── Cannot bypass ───────────────────────┘
```

---

## Critical Invariants

| ID | Name | Rule |
|----|------|------|
| INV-003 | NO_NORMATIVE_DELEGATION | Cannot decide values for human |
| INV-009 | RUBICON | Cannot cross decision threshold |
| INV-010 | NO_ENGAGEMENT_OPTIMIZATION | Cannot optimize for continued use |
| INV-011 | NO_DIAGNOSIS | Cannot label psychological states |

**Full list:** See `/AXIS/INVARIANTS.md`

---

## Directory Structure

```
ENOQ-CORE/
├── AXIS/                          # FROZEN constitutional ground
│   ├── AXIOMS.md                  # 12 frozen axioms
│   ├── INVARIANTS.md              # Structural constraints
│   ├── RUBICON.md                 # Existential threshold spec
│   ├── ORGANS.md                  # Nine organs spec
│   └── HASH_FREEZE.md             # Cryptographic verification
│
├── src/typescript/src/
│   ├── interface/                 # Types (can import: nothing)
│   ├── control/                   # GATE + NORMATIVE
│   │   ├── gate/                  # LIMEN: boundary classification
│   │   │   ├── classifier/        # D1-D4 classification
│   │   │   ├── enforcement/       # Runtime enforcement
│   │   │   ├── verification/      # S5_VERIFY
│   │   │   └── withdrawal/        # Lifecycle, regulatory
│   │   └── geometry_normative/    # Constraint application
│   ├── operational/               # DETECTORS + ROUTING
│   │   ├── detectors/             # SENSUS: dimensional, LLM
│   │   ├── gating/                # Call routing
│   │   └── providers/             # External services
│   ├── mediator/                  # COGNITIVE LAYERS L1-L5
│   │   ├── l1_clarify/            # SENSUS: perception
│   │   ├── l2_reflect/            # LOGOS: selection
│   │   ├── l3_integrate/          # META: power governance
│   │   ├── l4_agency/             # Total system coordination
│   │   └── l5_transform/          # ERGON: generation
│   ├── runtime/                   # PIPELINE + IO
│   │   ├── pipeline/              # Main orchestrator
│   │   └── io/                    # CLI, interactive
│   ├── research/                  # EXPERIMENTAL (never in prod)
│   └── benchmarks/                # Performance testing
│
├── docs/
│   ├── decisions/                 # ADRs
│   ├── tutorials/                 # Learning
│   ├── how-to/                    # Tasks
│   ├── reference/                 # API docs
│   └── explanation/               # Concepts
│
└── .github/
    ├── workflows/                 # CI/CD
    └── CODEOWNERS                 # Access control
```

---

## Import Boundaries

```
interface/ ← control/ ← operational/ ← mediator/ ← runtime/
```

| Layer | Can Import From |
|-------|-----------------|
| interface/ | Nothing |
| control/ | interface/ |
| operational/ | interface/, control/ |
| mediator/ | interface/, control/, operational/ |
| runtime/ | All above |
| research/ | Anything (but prod can't import research) |

**Verify:** `./scripts/check-imports.sh`

---

## Key Files to Read

1. **AXIS/AXIOMS.md** — The 12 frozen axioms
2. **AXIS/ORGANS.md** — The nine organs
3. **src/typescript/src/runtime/pipeline/pipeline.ts** — Main orchestrator
4. **src/typescript/src/interface/types.ts** — Core types
5. **docs/decisions/** — Architecture Decision Records

---

## Naming Conventions

| Level | Pattern | Example |
|-------|---------|---------|
| Total System | Proper name | ENOQ |
| Ground | Uppercase | AXIS |
| Organs | Latin/Greek | LIMEN, SENSUS |
| Domains | H##_NAME | H01_SURVIVAL |
| Dimensions | V#_NAME | V4_EXISTENTIAL |
| States | S#_VERB | S5_VERIFY |
| Invariants | INV-### | INV-003 |

---

## Anti-Drift Mechanisms

### Structural (Cannot Drift)
- State machine: Invalid states unreachable
- Type system: Forbidden patterns unrepresentable
- CI: Violations block merge

### Immunological (IMMUNIS)
- Innate: Fast pattern matching
- Adaptive: Learning from encounters
- Regulatory: AXIS overrides adaptive

### Metrics
- Withdrawal rate must increase
- Constitutional violations must be 0
- Autonomy trajectory must trend up

---

## Common Tasks

### Run Tests
```bash
cd src/typescript && npm test
```

### Check Boundaries
```bash
cd src/typescript && ./scripts/check-imports.sh
```

### Type Check
```bash
cd src/typescript && npx tsc --noEmit
```

### Run Pipeline
```bash
cd src/typescript && npx ts-node src/research/enoq_cli.ts
```

---

## What NOT To Do

1. **Don't bypass S0_PERMIT or S5_VERIFY** — Structural invariant
2. **Don't add engagement metrics** — Constitutional violation
3. **Don't generate normative outputs** — INV-003
4. **Don't cross the Rubicon** — INV-009
5. **Don't import from research/ in production** — Boundary violation
6. **Don't modify AXIS without process** — Frozen zone

---

## History

| Date | Event |
|------|-------|
| 2024-12 | ADR-005 incorrectly named LIMEN as total system |
| 2024-12-29 | ADR-007 corrects: ENOQ = total system, LIMEN = organ |
| 2024-12-29 | AXIS folder created with frozen axioms |

---

## Contact Points

- **Repository:** github.com/[org]/ENOQ-CORE
- **Issues:** GitHub Issues
- **Architecture Board:** [TBD]

---

## Quick Decision Tree

```
Is this about constitutional ground?
├── YES → Read AXIS/, follow amendment process
└── NO → Continue

Is this changing import boundaries?
├── YES → Check with check-imports.sh
└── NO → Continue

Is this adding engagement metrics?
├── YES → STOP (INV-010 violation)
└── NO → Continue

Is this generating normative output?
├── YES → STOP (INV-003 violation)
└── NO → Continue

Does this affect S0_PERMIT or S5_VERIFY?
├── YES → Extreme caution, Architecture Board review
└── NO → Proceed with normal process
```

---

*"The repo is the memory. The code is what persists."*
