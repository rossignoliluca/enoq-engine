# external/providers

LLM provider abstractions.

---

## Files

| File | Purpose |
|------|---------|
| `index.ts` | Provider exports |

---

## Supported Providers

- Anthropic (Claude Haiku, Sonnet)
- OpenAI (GPT-4o, GPT-4o-mini)

---

## Fallback Chain

```
Anthropic → OpenAI → Error
```
