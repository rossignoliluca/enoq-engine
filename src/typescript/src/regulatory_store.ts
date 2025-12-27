/**
 * ENOQ REGULATORY STORE
 *
 * Minimal persistence for regulatory state only.
 * NO user content, NO messages, NO profiles.
 *
 * Schema:
 * - field_state: potency, withdrawal_bias, loop_count, delegation_trend
 * - All with TTL (expires_at)
 *
 * Principles:
 * - Store HOW we interacted, never WHAT was said
 * - TTL on everything
 * - GDPR-trivial (almost nothing to export)
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// ============================================
// TYPES
// ============================================

export interface RegulatoryState {
  subject_id: string;
  potency: number;           // 0.0-1.0, dissipates over time
  withdrawal_bias: number;   // 0.0-1.0, accumulates
  loop_count: number;        // Detect repetitive patterns
  delegation_trend: number;  // -1 to +1: negative=delegating more, positive=more independent
  last_interaction: number;  // Unix timestamp ms
  expires_at: number;        // Unix timestamp ms
}

export interface StoreConfig {
  dbPath: string;
  defaultTTL: number;  // milliseconds, default 24h
  verbose: boolean;
}

export const DEFAULT_CONFIG: StoreConfig = {
  dbPath: process.env.ENOQ_DB_PATH || path.join(process.cwd(), 'data', 'enoq.sqlite'),
  defaultTTL: 24 * 60 * 60 * 1000,  // 24 hours
  verbose: false
};

// ============================================
// SCHEMA VERSION
// ============================================

const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string> = {
  1: `
    -- Regulatory state only (no content)
    CREATE TABLE IF NOT EXISTS field_state (
      subject_id TEXT PRIMARY KEY,
      potency REAL NOT NULL DEFAULT 1.0,
      withdrawal_bias REAL NOT NULL DEFAULT 0.0,
      loop_count INTEGER NOT NULL DEFAULT 0,
      delegation_trend REAL NOT NULL DEFAULT 0.0,
      last_interaction INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_field_state_expires
      ON field_state(expires_at);

    -- Schema version tracking
    INSERT INTO schema_version (version, applied_at)
      VALUES (1, strftime('%s', 'now') * 1000);
  `
};

// ============================================
// STORE INTERFACE
// ============================================

export interface IRegulatoryStore {
  get(subjectId: string): RegulatoryState | null;
  save(state: RegulatoryState): void;
  update(subjectId: string, delta: Partial<Omit<RegulatoryState, 'subject_id'>>): void;
  delete(subjectId: string): void;
  purgeExpired(): number;
  getStats(): { subjects: number; dbSizeBytes: number };
  close(): void;
}

// ============================================
// IN-MEMORY STORE (fallback)
// ============================================

export class InMemoryStore implements IRegulatoryStore {
  private store = new Map<string, RegulatoryState>();

  get(subjectId: string): RegulatoryState | null {
    const state = this.store.get(subjectId);
    if (!state) return null;
    if (Date.now() > state.expires_at) {
      this.store.delete(subjectId);
      return null;
    }
    return state;
  }

  save(state: RegulatoryState): void {
    this.store.set(state.subject_id, state);
  }

  update(subjectId: string, delta: Partial<Omit<RegulatoryState, 'subject_id'>>): void {
    const current = this.get(subjectId);
    if (!current) return;
    this.store.set(subjectId, { ...current, ...delta });
  }

  delete(subjectId: string): void {
    this.store.delete(subjectId);
  }

  purgeExpired(): number {
    const now = Date.now();
    let purged = 0;
    for (const [id, state] of this.store) {
      if (now > state.expires_at) {
        this.store.delete(id);
        purged++;
      }
    }
    return purged;
  }

  getStats(): { subjects: number; dbSizeBytes: number } {
    return { subjects: this.store.size, dbSizeBytes: 0 };
  }

  close(): void {
    this.store.clear();
  }
}

// ============================================
// SQLITE STORE
// ============================================

export class SQLiteStore implements IRegulatoryStore {
  private db: Database.Database;
  private config: StoreConfig;

  constructor(config: Partial<StoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Ensure directory exists
    if (this.config.dbPath !== ':memory:') {
      const dir = path.dirname(this.config.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Open connection
    this.db = new Database(this.config.dbPath, {
      verbose: this.config.verbose ? console.log : undefined
    });

    // WAL mode + pragmas
    if (this.config.dbPath !== ':memory:') {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('busy_timeout = 2000');
    }

    // Initialize schema
    this.initSchema();
  }

  private initSchema(): void {
    // Create version table first
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    // Get current version
    const row = this.db.prepare(
      'SELECT MAX(version) as v FROM schema_version'
    ).get() as { v: number | null };

    const currentVersion = row?.v || 0;

    // Apply migrations
    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      if (MIGRATIONS[v]) {
        this.db.exec(MIGRATIONS[v]);
      }
    }
  }

  get(subjectId: string): RegulatoryState | null {
    const now = Date.now();

    const row = this.db.prepare(`
      SELECT * FROM field_state
      WHERE subject_id = ? AND expires_at > ?
    `).get(subjectId, now) as any;

    if (!row) return null;

    return {
      subject_id: row.subject_id,
      potency: row.potency,
      withdrawal_bias: row.withdrawal_bias,
      loop_count: row.loop_count,
      delegation_trend: row.delegation_trend,
      last_interaction: row.last_interaction,
      expires_at: row.expires_at
    };
  }

  save(state: RegulatoryState): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO field_state (
        subject_id, potency, withdrawal_bias, loop_count,
        delegation_trend, last_interaction, expires_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      state.subject_id,
      state.potency,
      state.withdrawal_bias,
      state.loop_count,
      state.delegation_trend,
      state.last_interaction,
      state.expires_at,
      Date.now()
    );
  }

  update(subjectId: string, delta: Partial<Omit<RegulatoryState, 'subject_id'>>): void {
    const current = this.get(subjectId);
    if (!current) return;

    const updated: RegulatoryState = {
      ...current,
      ...delta,
      subject_id: subjectId
    };

    this.save(updated);
  }

  delete(subjectId: string): void {
    this.db.prepare('DELETE FROM field_state WHERE subject_id = ?').run(subjectId);
  }

  purgeExpired(): number {
    const result = this.db.prepare(
      'DELETE FROM field_state WHERE expires_at < ?'
    ).run(Date.now());
    return result.changes;
  }

  getStats(): { subjects: number; dbSizeBytes: number } {
    const countRow = this.db.prepare(
      'SELECT COUNT(*) as c FROM field_state WHERE expires_at > ?'
    ).get(Date.now()) as { c: number };

    let size = 0;
    if (this.config.dbPath !== ':memory:' && fs.existsSync(this.config.dbPath)) {
      size = fs.statSync(this.config.dbPath).size;
    }

    return { subjects: countRow.c, dbSizeBytes: size };
  }

  vacuum(): void {
    this.db.exec('VACUUM');
  }

  close(): void {
    this.db.close();
  }
}

// ============================================
// FALLBACK STORE (SQLite → RAM)
// ============================================

export class FallbackStore implements IRegulatoryStore {
  private primary: SQLiteStore | null = null;
  private fallback: InMemoryStore;
  private usingFallback: boolean = false;
  private pendingWrites: RegulatoryState[] = [];
  private config: StoreConfig;

  constructor(config: Partial<StoreConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fallback = new InMemoryStore();

    try {
      this.primary = new SQLiteStore(config);
      this.usingFallback = false;
    } catch (err) {
      console.warn('[RegulatoryStore] SQLite unavailable, using in-memory fallback');
      this.usingFallback = true;
    }
  }

  private getActiveStore(): IRegulatoryStore {
    if (this.usingFallback || !this.primary) {
      return this.fallback;
    }
    return this.primary;
  }

  private tryRecoverPrimary(): void {
    if (!this.usingFallback || this.primary) return;

    try {
      this.primary = new SQLiteStore(this.config);
      this.usingFallback = false;

      // Flush pending writes
      for (const state of this.pendingWrites) {
        this.primary.save(state);
      }
      this.pendingWrites = [];
      console.log('[RegulatoryStore] SQLite recovered, flushed pending writes');
    } catch {
      // Still unavailable
    }
  }

  get(subjectId: string): RegulatoryState | null {
    this.tryRecoverPrimary();
    return this.getActiveStore().get(subjectId);
  }

  save(state: RegulatoryState): void {
    if (this.usingFallback) {
      this.pendingWrites.push(state);
    }
    this.getActiveStore().save(state);
  }

  update(subjectId: string, delta: Partial<Omit<RegulatoryState, 'subject_id'>>): void {
    this.getActiveStore().update(subjectId, delta);
  }

  delete(subjectId: string): void {
    this.getActiveStore().delete(subjectId);
  }

  purgeExpired(): number {
    return this.getActiveStore().purgeExpired();
  }

  getStats(): { subjects: number; dbSizeBytes: number } {
    return this.getActiveStore().getStats();
  }

  isUsingFallback(): boolean {
    return this.usingFallback;
  }

  close(): void {
    if (this.primary) this.primary.close();
    this.fallback.close();
  }
}

// ============================================
// FACTORY + SINGLETON
// ============================================

let storeInstance: IRegulatoryStore | null = null;

export function getRegulatoryStore(config?: Partial<StoreConfig>): IRegulatoryStore {
  if (!storeInstance) {
    storeInstance = new FallbackStore(config);
  }
  return storeInstance;
}

export function resetRegulatoryStore(): void {
  if (storeInstance) {
    storeInstance.close();
    storeInstance = null;
  }
}

// ============================================
// HELPER: Create default state
// ============================================

export function createDefaultState(
  subjectId: string,
  ttl: number = DEFAULT_CONFIG.defaultTTL
): RegulatoryState {
  const now = Date.now();
  return {
    subject_id: subjectId,
    potency: 1.0,
    withdrawal_bias: 0.0,
    loop_count: 0,
    delegation_trend: 0.0,  // 0 = neutral, positive = independent, negative = delegating
    last_interaction: now,
    expires_at: now + ttl
  };
}
