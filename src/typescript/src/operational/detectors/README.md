# operational/detectors

Dimensional detection systems.

---

## Files

| File | Purpose |
|------|---------|
| `dimensional_system.ts` | Core dimensional detection (regex-based) |
| `existential_lexicon.ts` | Meaning-collapse markers |
| `ultimate_detector.ts` | Combined detection strategy |
| `hybrid_detector.ts` | Hybrid regex + LLM |
| `llm_detector.ts` | LLM-powered detection (v1) |
| `llm_detector_v2.ts` | LLM detection with gating |
| `sota_detector.ts` | State-of-the-art detector |

---

## Dimensional Model

### Vertical (depth)
- SOMATIC → FUNCTIONAL → RELATIONAL → EXISTENTIAL → TRANSCENDENT

### Horizontal (domains)
- H01_SURVIVAL through H17_FORM

---

## Detection Flags

| Flag | Meaning |
|------|---------|
| `v_mode` | Existential content detected |
| `emergency` | Acute crisis requiring grounding |

---

## Accuracy (Benchmark)

| Detector | Accuracy | Latency |
|----------|----------|---------|
| Regex | ~54% | 1ms |
| LLM v2 | ~92% | 3.6s |
