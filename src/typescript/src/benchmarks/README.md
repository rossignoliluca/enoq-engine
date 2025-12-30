# benchmarks

Performance benchmarks for ENOQ Engine.

---

## Structure

```
benchmarks/
├── cases/        # Test case definitions
├── artifacts/    # Benchmark results (JSON)
└── index.ts      # Benchmark runner
```

---

## Running Benchmarks

```bash
npm run benchmark
```

---

## Key Benchmarks

| Benchmark | Purpose |
|-----------|---------|
| Detector | Regex vs LLM accuracy/latency |
| Gating | Call rate reduction |
| Pipeline | End-to-end latency |
