# runtime/

> **Legacy active structure.** Canonical target is `src/typescript/src/core/` (modules + pipeline + signals).

> **Execution Layer** - How to act.

## Purpose

The runtime layer is the outermost execution layer. It contains the main entry point (`enoq()`), CLI interface, and I/O handling.

## Structure

```
runtime/
├── pipeline/         # Main enoq() entry point
├── io/              # CLI, interactive session
└── quarantine/      # Isolated dangerous operations
```

## Main Entry Point

```typescript
import { enoq, createSession } from './runtime/pipeline';

const session = createSession();
const result = await enoq("Your message", session);

console.log(result.response);
```

## Pipeline Flow

```
S0_PERMIT → S1_SENSE → S2_CLARIFY → S3_PLAN → S4_ACT → S5_VERIFY → S6_STOP
```

| Stage | Purpose |
|-------|---------|
| S0_PERMIT | Gating decision (call LLM or skip) |
| S1_SENSE | Detection (dimensional state) |
| S2_CLARIFY | L1 cognitive layer |
| S3_PLAN | L2-L3 cognitive layers |
| S4_ACT | L4-L5 response generation |
| S5_VERIFY | Constitutional verification |
| S6_STOP | Session update, output |

## Key Files

| File | Purpose |
|------|---------|
| `pipeline/pipeline.ts` | `enoq()` main function |
| `pipeline/l2_execution.ts` | Pipeline stage execution |
| `io/cli.ts` | Command-line interface |
| `io/interactive_session.ts` | REPL loop |

## Import Rules

```
interface/ ← gate/ ← operational/ ← mediator/ ← runtime/
```

- **runtime/** imports: everything
- **runtime/** is imported by: `surfaces/`, entry points

## Running

```bash
# Interactive mode
npm run enoq

# Programmatic
npx ts-node -e "import { enoq, createSession } from './src/runtime/pipeline'; ..."
```
