# surfaces/cli

Command-line interfaces for ENOQ.

---

## Commands

### `enoq mail` (v6.9)

First traversal through ENOQ geometry. Drafts a difficult email.

```bash
npx ts-node src/surfaces/cli/mail.ts
```

**Input:**
- Recipient (who)
- Context (situation)
- Intent (what you want to achieve)
- Constraints (optional)

**Output:**
- 2-3 email drafts (no ranking)
- Neutral rationale (how they differ)
- STOP (no follow-up)

**Rules (AXIS enforced):**
- No recommendation of "best" option
- No persuasion language
- No continued interaction
- Mandatory STOP after output

**Architecture: FAST PATH**

```
permit() → act(callLLM) → verifyOutput() → stop
```

FAST PATH is for task execution (email drafts, not reflection). The geometry is preserved: boundary check (permit), constitutional verification (verify), mandatory stop. Never skip verify/stop.

---

## Legacy

The interactive session (`cli.ts`) re-exports from `runtime/io/`:

```bash
npx ts-node src/runtime/io/interactive_session.ts
```

---

## Philosophy

CLI surfaces are single-pass traversals. Input → Process → Output → STOP.

No loops. No refinement. No "want to improve?"

The user crosses the Rubicon alone.
