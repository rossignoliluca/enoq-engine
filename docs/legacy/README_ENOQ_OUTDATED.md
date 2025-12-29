> **⚠️ OUTDATED DOCUMENT**
>
> This document describes the original ENOQ concept before the LIMEN architecture.
> For current documentation, see [/docs/INDEX.md](/docs/INDEX.md).
>
> Preserved for historical reference only.

---

# ENOQ

**A cognitive system that helps people see clearly and close what needs closing.**

---

## What ENOQ Is

ENOQ is not a chatbot. It is not a coach. It is not therapy.

ENOQ is a system that operates in two modes:

1. **Continuous Use** — Fluid conversation that helps regulate, expand perspective, or contract toward clarity
2. **Protocol** — A structured passage for real closure when someone is ready to cross a threshold

The goal is not engagement. The goal is that people don't need to return.

---

## Repository Structure

```
ENOQ/
│
├── CONSTITUTION/
│   ├── META_KERNEL.md        # The law. Values, limits, what cannot change.
│   ├── BOUNDARY_SPEC.md      # Core/SaaS separation. Technical protection.
│   └── GOVERNANCE.md         # Corporate structure. Who decides what.
│
├── MVP/
│   ├── SYSTEM_PROMPT.md      # Continuous Use mode. Works on any LLM.
│   ├── PROTOCOL_PROMPT.md    # Closure mode. Structured passage.
│   └── GOVERNOR_LOGIC.md     # Gate between modes. Entry conditions.
│
└── README.md                 # This file.
```

---

## Quick Start

### To test Continuous Use:
1. Copy `MVP/SYSTEM_PROMPT.md` content
2. Paste as system prompt in ChatGPT, Claude, or any capable LLM
3. Start a conversation

### To test Protocol:
1. Use SYSTEM_PROMPT for initial conversation
2. When entry conditions are met (see GOVERNOR_LOGIC.md), switch to PROTOCOL_PROMPT
3. Follow the four phases

---

## Core Principles

**Minimum Necessary Response**
Say less. The shortest response that serves is the right response.

**Withdrawal Over Engagement**
Success is measured by people not needing to return.

**Two Modes, Separated**
Continuous Use cannot produce real closure. Real closure happens only through Protocol.

**The Protocol Does Not Learn**
It is fixed, dumb, auditable. It does not optimize or personalize.

---

## The Law

```
No interaction in Continuous Use can produce Real Closure.
Real Closure happens only through ENOQ Protocol.
```

---

## Governance

ENOQ is designed to resist corruption.

- **Foundation** (non-profit) owns the Core
- **Operating Company** (for-profit) builds products
- Core cannot be sold or modified without Foundation approval
- See `CONSTITUTION/GOVERNANCE.md` for full structure

---

## What ENOQ Does Not Do

- Track engagement metrics
- Optimize for retention
- Personalize the Protocol
- Create dependency
- Sell user data
- A/B test closure

---

## License

[To be determined — likely dual license: open for non-commercial, licensed for commercial]

---

## Contact

[To be added]

---

*Built to help people close what needs closing, then leave.*
