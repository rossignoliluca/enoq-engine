# operational/providers

Gate provider implementations.

---

## Files

| File | Purpose |
|------|---------|
| `gate_client.ts` | Remote gate client |
| `gate_embedded.ts` | Embedded gate (in-process) |
| `llm_provider.ts` | LLM provider abstraction |

---

## Provider Pattern

Providers abstract the location of the gate:
- **Embedded**: Gate runs in same process
- **Client**: Gate runs as remote service

Both implement the same interface for swappability.
