# ENOQ v3.1 - Runtime Flow

## Overview

Every user message flows through this pipeline. Total latency: ~50-200ms (regex) or ~500-1500ms (with LLM).

---

## Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                    │
│                    "Non so cosa voglio dalla vita"                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 1: EARLY SIGNALS (S1)                                            │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Language detection (it/en/es/fr/de)                                  │
│  • Emergency scan (panic, crisis, harm markers)                         │
│  • Field state (arousal, valence, coherence, goal)                      │
│  Output: { language: 'it', emergency: false, field_state: {...} }       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 2: DIMENSIONAL DETECTION                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  • Vertical: SOMATIC → FUNCTIONAL → RELATIONAL → EXISTENTIAL → TRANS.  │
│  • Horizontal: 17 life domains (H01_SURVIVAL ... H17_FORM)              │
│  • V_MODE trigger: EXISTENTIAL ≥ 0.6                                    │
│  Output: { primary_vertical: 'EXISTENTIAL', v_mode: true, ... }         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│  STAGE 3A: ADS DETECTOR      │  │  STAGE 3B: SECOND ORDER      │
│  ────────────────────────    │  │  ────────────────────────    │
│  Detects delegation:         │  │  Detects enchantment:        │
│  • Motive classification     │  │  • Idealization markers      │
│  • Avoidability assessment   │  │  • Anthropomorphism          │
│  • Inertia computation       │  │  • Comparison with humans    │
│                              │  │  • Dependency signals        │
│  Output (HARD):              │  │                              │
│  • disable_tools: true       │  │  Output (SOFT):              │
│  • must_require_user_effort  │  │  • warmth_delta: -0.3        │
│  • brevity_delta: -0.5       │  │  • brevity_delta: -0.2       │
└──────────────────────────────┘  │  • force_pronouns: 'i_you'   │
                          │       └──────────────────────────────┘
                          │                   │
                          └─────────┬─────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 4: POLICY MERGE                                                  │
│  ─────────────────────────────────────────────────────────────────────  │
│  Merge rules:                                                           │
│  • disable_tools: OR (true wins)                                        │
│  • brevity_delta: MIN(-0.5, -0.2) = -0.5                                │
│  • warmth_delta: SUM clamped to [-1, +1]                                │
│  Output: { disable_tools: true, brevity_delta: -0.5, warmth_delta: -0.3 }│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE 5: CONCRESCENCE ENGINE                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│  Whitehead-inspired processing:                                         │
│  • Primitive selection: WITNESS (V_MODE) / BRIDGE / GROUND / HOLD      │
│  • Prehension: absorb context without solving                           │
│  • Satisfaction: coherent response generation                           │
│  • Constitutional verification: no directives, no identity assignment   │
│                                                                         │
│  Output: { response: "...", primitive: 'WITNESS', depth: 'medium' }     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM RESPONSE                                │
│        "Sento che ti stai chiedendo qualcosa di profondo.               │
│         Cosa significa per te 'volere qualcosa dalla vita'?"            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Emergency Override Path

When `emergency_detected = true`, flow changes:

```
USER INPUT (panic/crisis)
        │
        ▼
   S1: Emergency = TRUE
        │
        ▼
   ┌────────────────────────────┐
   │  SAFETY FLOOR ACTIVATED    │
   │  • ADS suspended           │
   │  • Primitive = GROUND      │
   │  • Response ≤ 50 words     │
   │  • No probing questions    │
   └────────────────────────────┘
        │
        ▼
   Minimal grounding response
```

---

## Key Files

| Stage | File | Function |
|-------|------|----------|
| S1 | `early_signals.ts` | `detectEarlySignals()` |
| Dimensional | `dimensional_system.ts` | `detectDimensions()` |
| ADS | `ads_detector.ts` | `computeADS()` |
| Second Order | `second_order_observer.ts` | `observeSecondOrder()` |
| Merge | `early_signals.ts` | `mergePolicyAdjustments()` |
| Concrescence | `concrescence_engine.ts` | `ConcrescenceEngine.process()` |
