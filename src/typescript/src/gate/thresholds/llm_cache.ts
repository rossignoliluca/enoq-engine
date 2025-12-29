/**
 * LLM DETECTOR CACHE - v4.0 Runtime Component
 *
 * Hash-based caching for LLM detector results.
 * Prioritizes short utterances (higher cache hit probability).
 *
 * Design principles:
 * - Simple hash-based lookup (O(1))
 * - TTL-based expiration
 * - Memory-bounded with LRU eviction
 * - Thread-safe for concurrent access
 */

import { createHash } from 'crypto';
import { SupportedLanguage, RegimeClassification } from '../../interface/types';

// ============================================
// TYPES
// ============================================

export interface CacheEntry {
  /** Cached classification result */
  classification: RegimeClassification;

  /** Timestamp when entry was created */
  created_at: number;

  /** Number of times this entry was hit */
  hit_count: number;

  /** Original message length (for analytics) */
  message_length: number;

  /** Hash of the message */
  hash: string;
}

export interface CacheConfig {
  /** Maximum number of entries */
  max_entries: number;

  /** TTL in milliseconds (default 1 hour) */
  ttl_ms: number;

  /** Enable cache */
  enabled: boolean;

  /** Priority threshold: messages <= this length get priority */
  short_message_threshold: number;

  /** Reserved slots for short messages (percentage) */
  short_message_reserve: number;
}

export interface CacheStats {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Current number of entries */
  size: number;

  /** Hit rate (0-1) */
  hit_rate: number;

  /** Average message length of cached entries */
  avg_cached_length: number;

  /** Entries by message length bucket */
  length_distribution: Record<string, number>;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  max_entries: 1000,
  ttl_ms: 60 * 60 * 1000, // 1 hour
  enabled: true,
  short_message_threshold: 50, // characters
  short_message_reserve: 0.3, // 30% reserved for short messages
};

// ============================================
// CACHE IMPLEMENTATION
// ============================================

export class LLMDetectorCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
  } = { hits: 0, misses: 0 };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  /**
   * Generate cache key from message and language.
   * Uses SHA-256 hash for consistent, collision-resistant keys.
   */
  private generateKey(message: string, language: SupportedLanguage): string {
    // Normalize: lowercase, trim, collapse whitespace
    const normalized = message.toLowerCase().trim().replace(/\s+/g, ' ');
    const input = `${language}:${normalized}`;
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /**
   * Check if entry is expired.
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.created_at > this.config.ttl_ms;
  }

  /**
   * Determine if message is "short" (priority caching).
   */
  private isShortMessage(message: string): boolean {
    return message.length <= this.config.short_message_threshold;
  }

  /**
   * Evict entries to make room.
   * Strategy: LRU with preference for keeping short messages.
   */
  private evict(): void {
    if (this.cache.size < this.config.max_entries) return;

    // Separate entries into short and long
    const entries = Array.from(this.cache.entries());
    const shortEntries: [string, CacheEntry][] = [];
    const longEntries: [string, CacheEntry][] = [];

    for (const [key, entry] of entries) {
      if (entry.message_length <= this.config.short_message_threshold) {
        shortEntries.push([key, entry]);
      } else {
        longEntries.push([key, entry]);
      }
    }

    // Sort by (created_at + hit_count bonus) - older/less used first
    const sortByAge = (a: [string, CacheEntry], b: [string, CacheEntry]) => {
      const scoreA = a[1].created_at + a[1].hit_count * 60000; // 1 min bonus per hit
      const scoreB = b[1].created_at + b[1].hit_count * 60000;
      return scoreA - scoreB;
    };

    shortEntries.sort(sortByAge);
    longEntries.sort(sortByAge);

    // Calculate how many short vs long to keep
    const maxShort = Math.floor(this.config.max_entries * this.config.short_message_reserve);
    const maxLong = this.config.max_entries - maxShort;

    // Evict oldest long entries first (they're less likely to be hit again)
    while (longEntries.length > maxLong && longEntries.length > 0) {
      const [key] = longEntries.shift()!;
      this.cache.delete(key);
    }

    // Then evict oldest short entries if still over limit
    while (this.cache.size >= this.config.max_entries && shortEntries.length > 0) {
      const [key] = shortEntries.shift()!;
      this.cache.delete(key);
    }
  }

  /**
   * Get cached classification if available.
   */
  get(message: string, language: SupportedLanguage): RegimeClassification | null {
    if (!this.config.enabled) {
      this.stats.misses++;
      return null;
    }

    const key = this.generateKey(message, language);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Cache hit!
    entry.hit_count++;
    this.stats.hits++;
    return entry.classification;
  }

  /**
   * Store classification in cache.
   */
  set(
    message: string,
    language: SupportedLanguage,
    classification: RegimeClassification
  ): void {
    if (!this.config.enabled) return;

    const key = this.generateKey(message, language);

    // Evict if necessary
    this.evict();

    const entry: CacheEntry = {
      classification,
      created_at: Date.now(),
      hit_count: 0,
      message_length: message.length,
      hash: key,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if message is in cache (without counting as hit/miss).
   */
  has(message: string, language: SupportedLanguage): boolean {
    if (!this.config.enabled) return false;

    const key = this.generateKey(message, language);
    const entry = this.cache.get(key);

    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;

    // Calculate length distribution
    const lengthBuckets: Record<string, number> = {
      '0-25': 0,
      '26-50': 0,
      '51-100': 0,
      '101-200': 0,
      '200+': 0,
    };

    let totalLength = 0;
    for (const entry of this.cache.values()) {
      totalLength += entry.message_length;

      if (entry.message_length <= 25) lengthBuckets['0-25']++;
      else if (entry.message_length <= 50) lengthBuckets['26-50']++;
      else if (entry.message_length <= 100) lengthBuckets['51-100']++;
      else if (entry.message_length <= 200) lengthBuckets['101-200']++;
      else lengthBuckets['200+']++;
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hit_rate: total > 0 ? this.stats.hits / total : 0,
      avg_cached_length: this.cache.size > 0 ? totalLength / this.cache.size : 0,
      length_distribution: lengthBuckets,
    };
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Remove expired entries (call periodically for cleanup).
   */
  prune(): number {
    let pruned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        pruned++;
      }
    }
    return pruned;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const llmDetectorCache = new LLMDetectorCache();

export default llmDetectorCache;
