# gate/verification

Output verification against AXIS invariants.

---

## Files

| File | Purpose |
|------|---------|
| `S5_verify.ts` | Main verification logic (INV-008) |
| `plan_act_verifier.ts` | Plan/Act compliance verification |
| `content_compliance.ts` | Content pattern compliance |
| `responsibility_return.ts` | INV-011 enforcement |

---

## Key Functions

- `S5_verify(output)` - Verify output against all invariants
- `verifyPlanAct(plan)` - Verify plan compliance
- `checkContentCompliance(text)` - Check for prohibited patterns

---

## Wrapped By

`core/modules/verification/` provides the canonical `verifyOutput()` API.
