# surfaces/cli

Command-line interfaces for ENOQ.

---

## Runtimes Moved

The MAIL/RELATION/DECISION runtimes have moved to:

**[enoq-runtimes](https://github.com/rossignoliluca/enoq-runtimes)**

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
