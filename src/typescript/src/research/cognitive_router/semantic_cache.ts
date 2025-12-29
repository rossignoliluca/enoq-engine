/**
 * SEMANTIC CACHE - Research Module (v5.0 Candidate)
 *
 * Embedding-based cache that finds similar queries, not just exact matches.
 *
 * References:
 * - GPT Semantic Cache (2024) - 68% hit rate, 40% latency reduction
 * - Bang et al. "GPT Cache: Reducing LLM Costs" (2023)
 *
 * Key insight: Many user queries are semantically similar even if
 * lexically different. "What's the point?" ≈ "Why does it matter?"
 *
 * RESEARCH STATUS: Stub implementation
 * PROMOTION CRITERIA:
 * - Must achieve ≥50% cache hit rate on benchmark
 * - Must maintain ≥95% accuracy on cache hits
 * - Must add ≤10ms latency for similarity search
 */

import { RegimeClassification } from '../../operational/detectors/llm_detector_v2';
import { SupportedLanguage } from '../../interface/types';

// ============================================
// TYPES
// ============================================

export interface SemanticCacheConfig {
  /** Maximum entries in cache */
  max_entries: number;

  /** Similarity threshold for cache hit (0-1) */
  similarity_threshold: number;

  /** Embedding dimension */
  embedding_dim: number;

  /** TTL in milliseconds */
  ttl_ms: number;

  /** Embedding model to use */
  embedding_model: 'local' | 'openai' | 'sentence-transformers';
}

export interface CacheEntry {
  /** Original message */
  message: string;

  /** Language */
  language: SupportedLanguage;

  /** Embedding vector */
  embedding: number[];

  /** Cached classification */
  classification: RegimeClassification;

  /** Timestamp */
  created_at: number;

  /** Hit count */
  hits: number;
}

export interface SemanticCacheStats {
  /** Total queries */
  total_queries: number;

  /** Exact matches */
  exact_hits: number;

  /** Semantic matches */
  semantic_hits: number;

  /** Misses */
  misses: number;

  /** Average similarity on hits */
  avg_similarity: number;

  /** Cache size */
  size: number;
}

// ============================================
// STUB IMPLEMENTATION
// ============================================

export class SemanticCache {
  private config: SemanticCacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats = {
    total_queries: 0,
    exact_hits: 0,
    semantic_hits: 0,
    misses: 0,
    similarities: [] as number[],
  };

  constructor(config: Partial<SemanticCacheConfig> = {}) {
    this.config = {
      max_entries: 1000,
      similarity_threshold: 0.85,
      embedding_dim: 384, // MiniLM default
      ttl_ms: 3600000, // 1 hour
      embedding_model: 'local',
      ...config,
    };
  }

  /**
   * Get cached classification for message.
   * First tries exact match, then semantic similarity.
   */
  async get(
    message: string,
    language: SupportedLanguage
  ): Promise<{ classification: RegimeClassification; similarity: number } | null> {
    this.stats.total_queries++;

    const normalized = this.normalize(message);

    // Try exact match first
    const exactKey = `${language}:${normalized}`;
    if (this.cache.has(exactKey)) {
      const entry = this.cache.get(exactKey)!;
      if (!this.isExpired(entry)) {
        entry.hits++;
        this.stats.exact_hits++;
        return { classification: entry.classification, similarity: 1.0 };
      }
      this.cache.delete(exactKey);
    }

    // TODO: Implement semantic similarity search
    // For now, stub that returns null (no semantic match)
    // In full implementation:
    // 1. Compute embedding for message
    // 2. Find most similar cached embedding
    // 3. If similarity > threshold, return cached result

    this.stats.misses++;
    return null;
  }

  /**
   * Store classification in cache with embedding.
   */
  async set(
    message: string,
    language: SupportedLanguage,
    classification: RegimeClassification
  ): Promise<void> {
    const normalized = this.normalize(message);
    const key = `${language}:${normalized}`;

    // TODO: Compute actual embedding
    // For now, use placeholder
    const embedding = this.computeEmbedding(normalized);

    const entry: CacheEntry = {
      message: normalized,
      language,
      embedding,
      classification,
      created_at: Date.now(),
      hits: 0,
    };

    // Evict if necessary
    if (this.cache.size >= this.config.max_entries) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
  }

  /**
   * Compute embedding for text.
   * TODO: Implement actual embedding computation.
   */
  private computeEmbedding(text: string): number[] {
    // Placeholder: random embedding
    // In production: use sentence-transformers or OpenAI embeddings
    const embedding = new Array(this.config.embedding_dim);
    for (let i = 0; i < this.config.embedding_dim; i++) {
      // Simple hash-based "embedding" for testing
      embedding[i] = Math.sin(text.charCodeAt(i % text.length) + i) * 0.5 + 0.5;
    }
    return embedding;
  }

  /**
   * Compute cosine similarity between embeddings.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar cached entry.
   */
  private findMostSimilar(
    embedding: number[]
  ): { entry: CacheEntry; similarity: number } | null {
    let bestEntry: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) continue;

      const similarity = this.cosineSimilarity(embedding, entry.embedding);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestEntry = entry;
      }
    }

    if (bestEntry && bestSimilarity >= this.config.similarity_threshold) {
      return { entry: bestEntry, similarity: bestSimilarity };
    }

    return null;
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.created_at > this.config.ttl_ms;
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.created_at < oldestTime) {
        oldestTime = entry.created_at;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  getStats(): SemanticCacheStats {
    const avgSimilarity =
      this.stats.similarities.length > 0
        ? this.stats.similarities.reduce((a, b) => a + b, 0) /
          this.stats.similarities.length
        : 0;

    return {
      total_queries: this.stats.total_queries,
      exact_hits: this.stats.exact_hits,
      semantic_hits: this.stats.semantic_hits,
      misses: this.stats.misses,
      avg_similarity: avgSimilarity,
      size: this.cache.size,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      total_queries: 0,
      exact_hits: 0,
      semantic_hits: 0,
      misses: 0,
      similarities: [],
    };
  }
}

export default SemanticCache;
