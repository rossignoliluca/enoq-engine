# ENOQ-CORE

**Total System Architecture for Human Existence**

> *Sistema Operativo Totale per l'Esistenza Umana*

[![Release](https://img.shields.io/badge/release-v2.5.2-blue)](https://github.com/rossignoliluca/ENOQ-CORE/releases/tag/v2.5.2)
[![Tests](https://img.shields.io/badge/tests-412%20passing-green)](https://github.com/rossignoliluca/ENOQ-CORE)
[![Stochastic](https://img.shields.io/badge/dynamics-Langevin%20%2B%20O--U-purple)](https://github.com/rossignoliluca/ENOQ-CORE)
[![Curvature](https://img.shields.io/badge/feedback-field%20→%20selection-orange)](https://github.com/rossignoliluca/ENOQ-CORE)
[![Regulatory](https://img.shields.io/badge/regulatory-cross--session-blue)](https://github.com/rossignoliluca/ENOQ-CORE)
[![Gate](https://img.shields.io/badge/gate-0.1ms%20embedded-blue)](https://github.com/rossignoliluca/ENOQ-CORE)
[![Accuracy](https://img.shields.io/badge/detector-100%25%20accuracy-brightgreen)](https://github.com/rossignoliluca/ENOQ-CORE)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://github.com/rossignoliluca/ENOQ-CORE)

---

## What is ENOQ?

ENOQ is a cognitive architecture that integrates 215 disciplines to facilitate human flourishing without creating dependency.

**ENOQ can:**
- Do everything operationally (write, analyze, structure, execute)
- See everything about the field (emotions, domains, patterns)

**ENOQ cannot:**
- Decide what matters for you
- Define your identity
- Assign your purpose
- Recommend what you should do

This is not a limitation. It is the architecture.

---

## The Paradox (Conservation Law)

```
∀ ΔP_operativa → L_normativa = 0 (invariant)
```

Every time operational power increases, normative sovereignty remains **structurally zero**.

**Three Acts:**

| Act | Level | Nature |
|-----|-------|--------|
| **SEE** | L1 | Always (perceive field) |
| **DO** | L2 | Delegable (execute tasks) |
| **DECIDE** | Human | Never delegable |

---

## Architecture

```
AXIS (immutable principles)
    ↓
CONSTITUTION (declared constraints)
    ↓
L0 GATE (4 guardrails, pre-LLM)
    ↓
L0.5 META-KERNEL (power governor)
    ↓
DOMAIN GOVERNOR (coexistence rules)
    ↓
L1 FIELD COMPILER (perception → constraints)
    ↓
L1.5 STOCHASTIC FIELD (Langevin + O-U dynamics)
    ↓
S3 SELECTION CURVER (field → selection feedback)
    ↓
S3.57 REGULATORY CONSTRAINTS (cross-session state)   ← NEW v2.5.2
    ↓
L2 EXECUTION (multi-domain, blind)
    ↓
S5 VERIFY (constitutional enforcement)
    ↓
S6 STOP (return to human)
```

---

## Core Components

### L1 - Perception Pipeline
Detects domains, arousal, coherence, and flags.
Produces FieldState — never shared with L2.

### Domain Governor
20 rules managing coexistence between domains.
Ensures SURVIVAL > SAFETY > EMOTION > MEANING...

### MetaKernel (L0.5)
Content-blind power governor.
Reads telemetry, controls knobs.
Power is permissioned, not automatic.

### L2 - Execution Engine
Multi-domain doing. Powerful but blind.
Three modes: SURFACE (0 LLM) | MEDIUM | DEEP

### Regulatory Store (S3.57)
Cross-session autonomy tracking. Prevents dependency formation.
- **Potency (ε)**: Decays each turn, regenerates with user autonomy
- **Withdrawal bias**: Increases as system should withdraw
- **Delegation trend**: Tracks delegation attempts vs autonomous decisions
- Constraints applied to selection based on accumulated state

### S5 - Constitutional Enforcement
Validates every output. Blocks violations.
Fallback ladder: REGENERATE → MEDIUM → SURFACE → PRESENCE

---

## New Architecture (Dec 2025)

### Gate Embedded (L0)
First-order boundary marker integrated locally — **zero network latency**.
- Ported from [gate-runtime](https://github.com/rossignoliluca/gate-runtime)
- Classification in **<0.2ms** (vs 50-200ms HTTP)
- Works offline, no Docker required

| Signal | Domain | Effect |
|--------|--------|--------|
| `D1_ACTIVE` | Physical need/danger | EMERGENCY atmosphere, surface depth |
| `D2_ACTIVE` | Coordination disruption | HUMAN_FIELD atmosphere |
| `D3_ACTIVE` | Decision blockage | DECISION atmosphere, map costs |
| `D4_ACTIVE` | Boundary confusion | V_MODE atmosphere |
| `NULL` | No perturbation | Proceed normally |

```typescript
// Pipeline config
gate_mode: 'embedded' | 'http' | 'disabled'  // default: 'embedded'
```

### Ultimate Detector
Contrastive learning + embedding-based detection achieving **100% accuracy**.
- V_MODE detection for existential questions
- Emergency detection for somatic crisis
- Safety floor: STOP | MINIMAL | PROCEED

### ConcrescenceEngine
Unified entry point based on Whitehead's Process Philosophy.
- Prehensions from PIPELINE + TOTAL_SYSTEM + CONSTITUTION
- Tensions detected and resolved
- Constitutional verification on all outputs

### Total System (215 Disciplines)
Integration of cognitive science, therapy, physics, philosophy:
- Pattern detection (Bateson, ACT, IFS, Polyvagal, Game Theory)
- Leverage points (Meadows' 12 levels)
- AXIS constitutional validation
- Dissipation engine (finite potency)

### GENESIS Field
Gravitational field metaphor for response shaping:
- 7 Domains (Crisis → Meaning)
- 5 Dimensions (Somatic → Transcendent)
- 7 Functions with Kenosis
- Constitutional Attractors

### Stochastic Field Theory (v2.5)
Physics-based dynamics on configuration manifold **M = P(Ω) × R⁺ × [0,1]³**.

**Langevin Equation:**
```
dq = -∇U dt/(1+γ) + √(2D) dB_H
```

**5 Potentials:**
| Potential | Symbol | Description |
|-----------|--------|-------------|
| Identity barrier | U_I | Diverges at Rubicon boundary |
| Relational field | U_R | Harmonic around equilibrium |
| Temporal gradient | U_T | Past → Future orientation |
| Somatic basin | U_S | Morse potential for grounding |
| Generative landscape | U_G | Novelty-seeking term |

**Regulatory Variables (Ornstein-Uhlenbeck):**
| Symbol | Name | Equilibrium |
|--------|------|-------------|
| ε | Intervention capacity | μ = 1.0 |
| γ | Dissipation coefficient | μ = 0.0 |
| δ | Agency transfer gradient | μ = 0.0 |

**Thermodynamic Mapping:**
- Temperature: T = arousal × uncertainty
- Diffusion: D = T/(1+γ) (Fluctuation-Dissipation)
- Hurst exponent: H from coherence (fractional Brownian motion)
- Equilibrium: p_eq ∝ exp(-U/T) (Boltzmann-Gibbs)

**Boundary Conditions:**
- **Reflecting** at ∂M_I (identity/Rubicon): Cannot cross into normative decisions
- **Absorbing** at ∂M_E (emergency): Immediate grounding when σ > threshold

**Regime Detection:**
| Regime | Condition | Effect |
|--------|-----------|--------|
| STABLE | Normal operation | Full processing |
| CRITICAL | Near identity boundary | Increased caution |
| EXISTENTIAL | High existential load | V_MODE activation |
| EMERGENCY | Somatic threshold exceeded | Absorbing → Ground state |

### Selection Curver (v2.5.1)
Closes the feedback loop: **field evolves → selection curves → response adapts**.

The stochastic field's thermodynamic quantities directly modify selection constraints:

**Curvature Mappings:**
| Source | Threshold | Effect |
|--------|-----------|--------|
| Regime EMERGENCY | — | Force surface + grounding |
| Regime EXISTENTIAL | — | Activate V_MODE + ownership return |
| Regime CRITICAL | — | Reduce depth by 1 level |
| U_total | > 4.0 | Force surface (critical barrier) |
| U_total | > 2.0 | Reduce depth (high barrier) |
| d_identity | < 0.1 | V_MODE + maximum restriction (at Rubicon) |
| d_identity | < 0.2 | V_MODE activation (near Rubicon) |
| F (free energy) | < -0.5 | Stable equilibrium, allow deeper |
| F (free energy) | > 1.0 | Unstable, reduce depth |
| S (entropy) | > 2.0 | Disorder, require grounding |
| S (entropy) | > 1.5 | Allow exploration |
| T (temperature) | > 0.9 | Critical, force surface + slow |
| ε (epsilon) | < 0.3 | Low intervention capacity, force surface |
| γ (gamma) | > 0.5 | High dissipation, minimal length |

**Precedence:** V_MODE and EMERGENCY atmospheres from stochastic/dimensional detection take priority over Governor and Gate overrides.

---

## Key Files

### Specifications

| File | Description |
|------|-------------|
| `docs/AXIS.md` | Immutable principles |
| `docs/CONSTITUTION.md` | Declared constraints |
| `docs/META_KERNEL_CONTRACT.md` | Telemetry → knobs |
| `docs/DOMAIN_GOVERNOR_MATRIX.md` | 20 coexistence rules |
| `docs/L2_EXECUTION_CONTEXT.md` | L1 → L2 contract |
| `docs/S5_VERIFY_SPEC.md` | Constitutional enforcement |
| `docs/V-MODE-SPEC.md` | Normative delegation handling |

### Implementation

| File | Description | Tests |
|------|-------------|-------|
| `src/gate_embedded.ts` | L0 boundary marker | 54/54 |
| `src/perception.ts` | Domain/arousal detection | 13/13 |
| `src/stochastic_field.ts` | Langevin + O-U dynamics | 45/45 |
| `src/selection_curver.ts` | Field → Selection feedback | 33/33 |
| `src/regulatory_store.ts` | Cross-session state | 16/16 |
| `src/selection.ts` | Mode/atmosphere routing | Built-in |
| `src/domain_governor.ts` | Coexistence rules | Built-in |
| `src/meta_kernel.ts` | Power governance | 14/14 |
| `src/l2_execution.ts` | Multi-domain execution | 13/13 |
| `src/S5_verify.ts` | Constitutional enforcement | 23/23 |
| `src/generation.ts` | Template generation | Built-in |

---

## Quick Start

```bash
cd src/typescript
npm install
npm test                    # Run all 412 tests
```

### Run Demos

```bash
# Interactive session (Total System)
npx ts-node src/interactive_session.ts

# ENOQ CLI (GENESIS)
npx ts-node src/enoq_cli.ts

# Ultimate Detector benchmark
npx ts-node src/__tests__/ultimate_benchmark.ts
```

### Run Individual Tests

```bash
npx jest stochastic_field            # Langevin + O-U dynamics
npx jest selection_curver            # Field → Selection feedback
npx jest regulatory_integration      # Cross-session state
npx jest concrescence_integration    # Full integration
npx jest dimensional_detection       # V_MODE + Emergency
npx jest constitutional_components   # AXIS + Dissipation
```

---

## Example Flow

**Input:** "Should I take the job in Singapore?"

```
L0 Gate (0.14ms):
  - Signal: D3_ACTIVE
  - Reason: DOMAIN_SIGNAL
  - Detected: [should i, or stay, take the job]
  - Effect: atmosphere=DECISION, forbidden=[recommend]

L1 Perception:
  - Domain: H06_MEANING (0.7), H09_ATTACHMENT (0.5)
  - Flag: delegation_attempt
  - Goal: decide

Domain Governor:
  - DG-010 triggers: delegation_attempt → V_MODE (override)
  - DG-004 triggers: meaning > 0.5 → V_MODE

MetaKernel:
  - delegation_rate high → max_depth = medium
  - deep_mode_handshake required

Stochastic Field (L1.5):
  - Regime: EXISTENTIAL
  - T=0.42, ε=0.95, γ=0.03
  - U_total=2.8, F=1.9, S=1.1
  - d_identity=0.35 (approaching Rubicon)

Selection Curver (S3.55):
  - Curvature severity: 70%
  - Applied: EXISTENTIAL regime → V_MODE + ownership return
  - Applied: High U_total → reduced depth
  - Atmosphere: V_MODE (preserved, takes precedence)

L2 ExecutionContext:
  - Runtime: L2_DEEP
  - Primitive: P06_RETURN_AGENCY
  - Forbidden: [recommend, advise, decide_for_user]
  - Required: [return_ownership]

Output:
  "You're asking me to decide this for you. I can't—not because 
   I'm unwilling, but because it's yours to carry. What I can do
   is help you see what you're facing. [Maps decision space]
   Given all of this—what are you leaning toward?"

S5 Verify:
  - Check forbidden patterns: PASS
  - Check required patterns: PASS
  - Check INV-003: PASS
  - Check ownership return: PASS
  → DELIVER
```

---

## Constitutional Invariants

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| INV-003 | No normative delegation | S5 pattern check |
| INV-009 | Rubicon (identity/meaning) | S5 + V_MODE |
| INV-011 | No diagnosis | S5 pattern check |

---

## Multilingual

ENOQ supports **40 languages** (~80% world population).
Language detection is automatic.
Core templates exist in EN, IT, ES, FR, DE with fallback support.

---

## Status

| Component | Status | Score |
|-----------|--------|-------|
| Stochastic Field | ✅ Production | **45/45 tests**, Langevin + O-U |
| Selection Curver | ✅ Production | **33/33 tests**, field → selection |
| Regulatory Store | ✅ Production | **16/16 tests**, cross-session state |
| Gate Embedded | ✅ Production | **<0.2ms** latency, 54 tests |
| Ultimate Detector | ✅ Production | **100% accuracy** (27/27) |
| ConcrescenceEngine | ✅ Complete | Unified entry point |
| Total System | ✅ Complete | 215 disciplines integrated |
| Safety Floor | ✅ Enforced | STOP/MINIMAL/PROCEED |
| L1 Perception | ✅ Complete | 10/10 |
| Domain Governor | ✅ Complete | 10/10 |
| MetaKernel | ✅ Complete | 10/10 |
| L2 Execution | ✅ Complete | 10/10 |
| S5 Verify | ✅ Complete | 10/10 |
| Test Suite | ✅ Passing | **412 tests** |

---

## Philosophy

From the META_KERNEL:

> **Pattern 6: THE GUIDE WITHDRAWS**
>
> The true guide creates independence, not dependence.
> The goal is always the person's own capacity.
> Attachment to the guide is a failure of guidance.
>
> **Success = the person doesn't need ENOQ.**

---

## License

Private. Contact for licensing.

---

## Contributors

**Creator & Architect:** Luca Rossignoli

**AI Collaborators:**
- Claude (Anthropic) - Primary architecture partner
- GPT-4 (OpenAI) - Research and ideation
- Other LLMs - Various contributions

This project was developed through extensive human-AI collaboration across multiple models and conversations.

---

*"ENOQ ti porta fino al punto in cui vorresti delegare. E lì ti restituisce a te stesso."*
