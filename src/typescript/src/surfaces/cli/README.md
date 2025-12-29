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

### `enoq relation` (v7.0)

Second traversal. Maps a human relationship. No coaching. No advice.

```bash
npx ts-node src/surfaces/cli/relation.ts
```

**Input:**
- Person A (self)
- Person B (other)
- Context (work/family/friendship/other)
- Current tension or situation
- Boundary (what must NOT be crossed)

**Output:**
- Role Map (what roles A and B occupy)
- Tension Axes (2-3 descriptive axes)
- Boundary Lines (what A controls, doesn't control, where responsibility returns)
- Minimal Next Act (optional, descriptive only)
- STOP (no follow-up)

**Rules (AXIS enforced):**
- No relational advice
- No strategy or optimization
- No framing B as problem
- No "you should" language
- Descriptive only
- Mandatory STOP after output

**Architecture: FAST PATH**

```
permit() → act(callLLM) → verify → stop
```

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
