# ORGAN MAP

**Purpose:** Maps existing code to the nine ENOQ organs
**Status:** Living document (updated as code evolves)
**Reference:** AXIS/ORGANS.md

---

## Overview

This document maps every module in ENOQ-CORE to its corresponding organ. Code that doesn't map to an organ is either:
1. **Cross-cutting** (serves multiple organs)
2. **Infrastructure** (build, test, types)
3. **Research** (experimental, not production)

---

## Organ → Code Mapping

### LIMEN (Threshold)

**Function:** Boundary organ. Filters input, protects integrity.

| Path | Purpose | Status |
|------|---------|--------|
| `gate/classifier/` | D1-D4 classification | ✅ Active |
| `gate/classifier/types.ts` | GateSignal, ReasonCode types | ✅ Active |
| `gate/classifier/signals.ts` | Domain signal lexicon | ✅ Active |
| `gate/classifier/classifier.ts` | EmbeddedGate, classify() | ✅ Active |
| `gate/protocols/` | Response protocols per signal | ✅ Active |
| `gate/protocols/response_protocol.ts` | D1-D4-NULL protocols | ✅ Active |
| `operational/providers/gate_client.ts` | HTTP client for remote gate | ✅ Active |
| `operational/providers/gate_embedded.ts` | Local embedded classifier | ✅ Active |

---

### SENSUS (Perception)

**Function:** Perception organ. Reads the living field, multi-modal.

| Path | Purpose | Status |
|------|---------|--------|
| `mediator/l1_clarify/perception.ts` | FieldState extraction | ✅ Active |
| `operational/detectors/dimensional_system.ts` | V1-V5, H01-H17 detection | ✅ Active |
| `operational/detectors/ultimate_detector.ts` | Calibrated LLM detector | ✅ Active |
| `operational/detectors/llm_detector.ts` | LLM-based regime detection | ✅ Active |
| `operational/detectors/llm_detector_v2.ts` | Enhanced LLM detection | ✅ Active |
| `operational/detectors/existential_lexicon.ts` | Existential keyword patterns | ✅ Active |
| `operational/detectors/hybrid_detector.ts` | Fallback combination | ✅ Active |
| `operational/detectors/sota_detector.ts` | State-of-art (research) | 🔬 Research |

---

### NEXUS (Memory)

**Function:** Memory organ. Episodic + semantic + procedural.

| Path | Purpose | Status |
|------|---------|--------|
| `mediator/l4_agency/memory_system.ts` | Session memory | ✅ Active |
| `runtime/pipeline/pipeline.ts` (Session) | Session state management | ✅ Active |
| `gate/thresholds/llm_cache.ts` | LLM result caching | ✅ Active |

**Gap:** No explicit episodic/semantic/procedural separation yet.

---

### LOGOS (Reason)

**Function:** Reasoning organ. Planning, selection, coordination.

| Path | Purpose | Status |
|------|---------|--------|
| `mediator/l2_reflect/selection.ts` | Protocol/mode selection | ✅ Active |
| `mediator/l2_reflect/selection_phased.ts` | v3.0 phased selection | ✅ Active |
| `mediator/l2_reflect/selection_curver.ts` | Selection curvature | ✅ Active |
| `operational/gating/unified_gating.ts` | Unified routing strategy | ✅ Active |
| `operational/gating/np_gating.ts` | Neyman-Pearson gating | ✅ Active |
| `operational/gating/scientific_gating.ts` | Statistical gating | ✅ Active |

---

### ERGON (Work)

**Function:** Execution organ. Produces output.

| Path | Purpose | Status |
|------|---------|--------|
| `mediator/l5_transform/generation.ts` | LLM generation | ✅ Active |
| `mediator/l5_transform/plan_renderer.ts` | ResponsePlan → text | ✅ Active |
| `mediator/l5_transform/response_plan.ts` | Plan types | ✅ Active |
| `mediator/l5_transform/agent_responses.ts` | Agent response patterns | ✅ Active |
| `runtime/pipeline/l2_execution.ts` | Execution context | ✅ Active |

---

### CHRONOS (Time)

**Function:** Temporal organ. Past patterns, prediction.

| Path | Purpose | Status |
|------|---------|--------|
| `mediator/l4_agency/temporal_engine.ts` | Time-aware processing | ✅ Active |
| `mediator/l2_reflect/stochastic_field.ts` | Langevin dynamics (time) | ✅ Active |
| `mediator/l2_reflect/dissipation.ts` | Energy dissipation | ✅ Active |

**Gap:** Minimal explicit temporal reasoning. Needs enhancement.

---

### TELOS (End)

**Function:** Verification organ. S5_VERIFY, completion, withdrawal.

| Path | Purpose | Status |
|------|---------|--------|
| `gate/verification/S5_verify.ts` | Constitutional verification | ✅ Active |
| `gate/verification/plan_act_verifier.ts` | Plan validation | ✅ Active |
| `gate/withdrawal/lifecycle_controller.ts` | Influence budget | ✅ Active |
| `gate/withdrawal/regulatory_store.ts` | Cross-session autonomy | ✅ Active |

---

### IMMUNIS (Defense)

**Function:** Immune organ. Anti-drift, anti-dependency.

| Path | Purpose | Status |
|------|---------|--------|
| `gate/enforcement/domain_governor.ts` | Domain coexistence rules | ✅ Active |
| `gate/enforcement/ads_detector.ts` | Anti-delegation scoring | ✅ Active |
| `gate/enforcement/second_order_observer.ts` | Meta-observation | ✅ Active |
| `gate/invariants/axis.ts` | AXIS enforcement | ✅ Active |
| `gate/classifier/signals.ts` (adversarial) | Adversarial patterns | ✅ Active |

---

### META (Observer)

**Function:** Metacognitive organ. Self-observation, confidence.

| Path | Purpose | Status |
|------|---------|--------|
| `mediator/l3_integrate/meta_kernel.ts` | Power governance | ✅ Active |
| `mediator/l4_agency/metacognitive_monitor.ts` | Self-observation | ✅ Active |
| `mediator/l3_integrate/disciplines_synthesis.ts` | 215 disciplines | ✅ Active |

---

## Cross-Cutting Code

| Path | Purpose | Organs Served |
|------|---------|---------------|
| `interface/types.ts` | Core type definitions | All |
| `runtime/pipeline/pipeline.ts` | Main orchestrator | All |
| `runtime/io/cli.ts` | CLI interface | All |
| `runtime/io/interactive_session.ts` | Interactive mode | All |
| `mediator/l4_agency/total_system.ts` | Total system coord | All |

---

## Infrastructure

| Path | Purpose |
|------|---------|
| `index.ts` | Public API exports |
| `benchmarks/` | Performance testing |
| `__tests__/` | Unit/integration tests |

---

## Research (Not Production)

| Path | Purpose | Organ Target |
|------|---------|--------------|
| `research/cognitive_router/` | Advanced routing | LOGOS |
| `research/genesis/` | Self-building | META |
| `research/test_*.ts` | Experiments | Various |

**Rule:** Production code CANNOT import from `research/`.

---

## Gap Analysis

| Organ | Coverage | Gaps |
|-------|----------|------|
| LIMEN | 🟢 High | None significant |
| SENSUS | 🟢 High | Multi-modal fusion pending |
| NEXUS | 🟡 Medium | Episodic/semantic/procedural separation |
| LOGOS | 🟢 High | None significant |
| ERGON | 🟢 High | None significant |
| CHRONOS | 🟡 Medium | Explicit temporal reasoning |
| TELOS | 🟢 High | None significant |
| IMMUNIS | 🟡 Medium | Adaptive immunity, learning |
| META | 🟡 Medium | Comprehensive self-model |

---

## State Machine Mapping

| State | Primary Organ | Code Location |
|-------|---------------|---------------|
| S0_PERMIT | LIMEN | `gate/classifier/` |
| S1_SENSE | SENSUS | `mediator/l1_clarify/`, `operational/detectors/` |
| S2_CLARIFY | NEXUS | `mediator/l1_clarify/` |
| S3_PLAN | LOGOS | `mediator/l2_reflect/` |
| S4_ACT | ERGON | `mediator/l5_transform/` |
| S5_VERIFY | TELOS | `gate/verification/` |
| S6_STOP | TELOS | `runtime/pipeline/` |

---

## VSM Mapping

| VSM System | Organ(s) | Primary Code |
|------------|----------|--------------|
| S1 Operations | ERGON | `mediator/l5_transform/` |
| S2 Coordination | NEXUS, CHRONOS | `mediator/l4_agency/` |
| S3 Control | LOGOS | `mediator/l2_reflect/` |
| S4 Intelligence | SENSUS, META | `operational/detectors/`, `mediator/l3_integrate/` |
| S5 Identity | AXIS, IMMUNIS, TELOS | `gate/`, `AXIS/` |

---

## Migration Notes

### From gate-runtime

| Original | Migrated To | Status |
|----------|-------------|--------|
| `server.ts` (classify) | `gate/classifier/classifier.ts` | ✅ Done |
| `server.ts` (signals) | `gate/classifier/signals.ts` | ✅ Done |
| `server.ts` (types) | `gate/classifier/types.ts` | ✅ Done |
| `response-protocol.js` | `gate/protocols/response_protocol.ts` | ✅ Done |
| `benchmark/` | `benchmarks/gate/` | 🔄 Pending |
| `db/schema.sql` | (Reference only) | 📋 Archived |

### From boundary-marker

| Original | Migrated To | Status |
|----------|-------------|--------|
| `RESPONSE_PROTOCOL.md` | `gate/protocols/response_protocol.ts` | ✅ Done |
| `GATE_SCHEMA.md` | `docs/specifications/` | 🔄 Pending |
| `benchmark_v5.json` | `benchmarks/datasets/` | 🔄 Pending |
| `test_adversarial.js` | `benchmarks/adversarial/` | 🔄 Pending |

---

*Last updated: 2024-12-29*
