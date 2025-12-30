# external/cache

LLM response caching.

---

## Files

| File | Purpose |
|------|---------|
| `llm_cache.ts` | LRU cache for LLM responses |

---

## Note

This is the ONLY location for caching in the codebase (REPO_CONTRACT rule #5).

---

## Features

- LRU eviction policy
- TTL support
- Hit/miss statistics
