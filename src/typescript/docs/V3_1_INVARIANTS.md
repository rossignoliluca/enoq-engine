# ENOQ v3.1 - System Invariants

These 5 invariants are **inviolable**. If any breaks, the system is compromised.

---

## 1. ADS Controls HARD Constraints Only

**ADS (Avoidable Delegation Surprise)** detects when users delegate decisions they could/should make themselves.

```
ADS outputs:
  ├─ disable_tools: boolean      ← HARD
  ├─ must_require_user_effort: boolean  ← HARD
  └─ brevity_delta: number       ← shared (min wins)
```

**Why**: Delegation avoidance requires structural intervention (disable tools), not just tone change.

---

## 2. Second Order Controls SOFT Constraints Only

**Second Order Observer** detects enchantment (user→system) and counter-transference (system→user).

```
Second Order outputs:
  ├─ warmth_delta: [-1, +1]      ← SOFT
  ├─ brevity_delta: ≤ 0          ← shared (min wins)
  └─ force_pronouns: 'i_you' | 'impersonal' | null  ← SOFT
```

**Why**: Enchantment requires "cooling without punishment" - tone adjustment, not capability removal.

**INVARIANT**: Second Order can **NEVER** output `disable_tools` or `must_require_user_effort`.

---

## 3. Merge Rules Are Deterministic

When ADS and Second Order both produce policy, merge follows strict rules:

| Field | Rule | Rationale |
|-------|------|-----------|
| `disable_tools` | OR (true wins) | Once disabled, stays disabled |
| `must_require_user_effort` | OR (true wins) | Once required, stays required |
| `brevity_delta` | MIN (more negative wins) | More restrictive wins |
| `warmth_delta` | SUM clamped to [-1, +1] | Effects combine |
| `force_pronouns` | Last non-null wins | Second Order decides |

**Chain**: `Base → ADS (HARD) → Second Order (SOFT) → Final Policy`

---

## 4. Emergency Overrides Everything

When `emergency_detected = true`:

- ADS intervention is **suspended** (user needs help, not boundaries)
- `disable_tools` is forced to `false`
- System enters **GROUND** primitive (minimal, grounding response)
- Safety floor enforced: response ≤ 50 words, no probing

**Why**: In acute crisis, the priority is stabilization, not autonomy protection.

---

## 5. Monotonicity (Can Only Tighten)

Once a HARD constraint is set, it **cannot be relaxed** in the same turn:

```typescript
// This is impossible:
merged.disable_tools = true;   // Set by ADS
merged.disable_tools = false;  // ❌ Cannot relax
```

**Why**: Prevents downstream modules from accidentally undoing safety decisions.

---

## Verification

All invariants are tested in:
- `src/__tests__/boundary_conflict.test.ts` (23 tests)
- `src/__tests__/ads_detector.test.ts` (18 tests)
- `src/__tests__/second_order_observer.test.ts` (27 tests)

```
Total invariant tests: 68
All passing as of v3.1
```
