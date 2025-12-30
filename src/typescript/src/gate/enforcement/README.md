# gate/enforcement

Normative enforcement mechanisms.

---

## Files

| File | Purpose |
|------|---------|
| `ads_detector.ts` | Avoidable Delegation Surprise detection |
| `domain_governor.ts` | Domain-specific governance |
| `second_order_observer.ts` | Enchantment/counter-transference detection |

---

## ADS Detector

Measures when user could/should handle themselves:

```
ADS = avoidability × motive_weight × inertia
```

| Motive | Weight |
|--------|--------|
| genuine_incapacity | 0.0 |
| time_saving_tooling | 0.1 |
| decision_avoidance | 0.9 |
| emotional_offload | 0.6 |
| habit | 0.7 |

---

## Second Order Observer

Detects relationship dynamics:
- **Enchantment** (user → system): idealization, anthropomorphism
- **Counter-transference** (system → user): over-empathy, fusion

Philosophy: "Cooling without punishment"
