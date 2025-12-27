/**
 * Tests for RegulatoryStore
 *
 * Constitutional Law Tests (LAW-01, LAW-02, LAW-03)
 * + Standard CRUD, TTL, Migration, WAL, GDPR tests
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import {
  SQLiteStore,
  InMemoryStore,
  FallbackStore,
  RegulatoryState,
  createDefaultState,
  resetRegulatoryStore
} from '../regulatory_store';

// Test directory
const TEST_DB_DIR = path.join(__dirname, '../../test-data');
const TEST_DB_PATH = path.join(TEST_DB_DIR, 'test_regulatory.sqlite');

// Cleanup helper
function cleanup(): void {
  resetRegulatoryStore();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  if (fs.existsSync(TEST_DB_PATH + '-wal')) {
    fs.unlinkSync(TEST_DB_PATH + '-wal');
  }
  if (fs.existsSync(TEST_DB_PATH + '-shm')) {
    fs.unlinkSync(TEST_DB_PATH + '-shm');
  }
}

// ============================================
// CONSTITUTIONAL LAW TESTS
// These tests verify ENOQ's core invariants
// ============================================

describe('Constitutional Laws', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * LAW-01: No user content persisted
   * The schema must NOT contain columns for messages, responses, or profiles
   */
  it('LAW-01: Schema contains NO user content columns', () => {
    const store = new SQLiteStore({ dbPath: TEST_DB_PATH });
    store.save(createDefaultState('test_user'));

    // Directly inspect the schema
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const columns = db.prepare("PRAGMA table_info(field_state)").all() as any[];
    const columnNames = columns.map(c => c.name);

    // These columns MUST exist (regulatory state)
    expect(columnNames).toContain('subject_id');
    expect(columnNames).toContain('potency');
    expect(columnNames).toContain('withdrawal_bias');
    expect(columnNames).toContain('loop_count');
    expect(columnNames).toContain('delegation_trend');
    expect(columnNames).toContain('expires_at');

    // These columns MUST NOT exist (user content)
    expect(columnNames).not.toContain('message');
    expect(columnNames).not.toContain('user_message');
    expect(columnNames).not.toContain('response');
    expect(columnNames).not.toContain('content');
    expect(columnNames).not.toContain('text');
    expect(columnNames).not.toContain('summary');
    expect(columnNames).not.toContain('profile');
    expect(columnNames).not.toContain('user_model');
    expect(columnNames).not.toContain('embedding');

    db.close();
    store.close();
  });

  /**
   * LAW-02: TTL enforced - all data expires
   * No regulatory state may persist beyond its TTL
   */
  it('LAW-02: TTL is enforced - expired data is not returned', () => {
    const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

    // Create state with very short TTL (already expired)
    const expiredState: RegulatoryState = {
      ...createDefaultState('expired_user'),
      expires_at: Date.now() - 1000  // 1 second ago
    };
    store.save(expiredState);

    // State should NOT be retrievable (even though it's in DB)
    const retrieved = store.get('expired_user');
    expect(retrieved).toBeNull();

    // Purge should remove it
    const purged = store.purgeExpired();
    expect(purged).toBe(1);

    store.close();
  });

  /**
   * LAW-03: GDPR delete removes ALL subject data
   * After delete, no trace of subject may remain
   */
  it('LAW-03: GDPR delete removes all subject data', () => {
    const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

    // Create state for user
    store.save(createDefaultState('gdpr_user'));
    expect(store.get('gdpr_user')).not.toBeNull();

    // Delete user data
    store.delete('gdpr_user');

    // Verify complete removal
    expect(store.get('gdpr_user')).toBeNull();

    // Verify at database level (no rows remain)
    const db = new Database(TEST_DB_PATH, { readonly: true });
    const row = db.prepare(
      "SELECT COUNT(*) as count FROM field_state WHERE subject_id = ?"
    ).get('gdpr_user') as { count: number };

    expect(row.count).toBe(0);

    db.close();
    store.close();
  });
});

// ============================================
// STANDARD TESTS
// ============================================

describe('RegulatoryStore', () => {
  beforeEach(() => {
    cleanup();
  });

  afterAll(() => {
    cleanup();
    if (fs.existsSync(TEST_DB_DIR)) {
      fs.rmdirSync(TEST_DB_DIR, { recursive: true });
    }
  });

  describe('InMemoryStore', () => {
    it('stores and retrieves state', () => {
      const store = new InMemoryStore();
      const state = createDefaultState('user_1');

      store.save(state);
      const retrieved = store.get('user_1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.potency).toBe(1.0);
      expect(retrieved?.withdrawal_bias).toBe(0.0);
    });

    it('returns null for non-existent subject', () => {
      const store = new InMemoryStore();
      expect(store.get('unknown')).toBeNull();
    });

    it('updates existing state', () => {
      const store = new InMemoryStore();
      store.save(createDefaultState('user_1'));

      store.update('user_1', { potency: 0.5, loop_count: 3 });

      const retrieved = store.get('user_1');
      expect(retrieved?.potency).toBe(0.5);
      expect(retrieved?.loop_count).toBe(3);
    });

    it('deletes state', () => {
      const store = new InMemoryStore();
      store.save(createDefaultState('user_1'));

      store.delete('user_1');

      expect(store.get('user_1')).toBeNull();
    });

    it('expires state after TTL', () => {
      const store = new InMemoryStore();
      const state = createDefaultState('user_1', 100); // 100ms TTL

      store.save(state);
      expect(store.get('user_1')).not.toBeNull();

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(store.get('user_1')).toBeNull();
          resolve();
        }, 150);
      });
    });

    it('purges expired entries', () => {
      const store = new InMemoryStore();

      // Add expired state
      const expired: RegulatoryState = {
        ...createDefaultState('user_expired'),
        expires_at: Date.now() - 1000
      };
      store.save(expired);

      // Add valid state
      store.save(createDefaultState('user_valid'));

      const purged = store.purgeExpired();
      expect(purged).toBe(1);
      expect(store.getStats().subjects).toBe(1);
    });
  });

  describe('SQLiteStore', () => {
    it('creates database and schema', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

      expect(fs.existsSync(TEST_DB_PATH)).toBe(true);

      store.close();
    });

    it('stores and retrieves state', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });
      const state = createDefaultState('user_1');

      store.save(state);
      const retrieved = store.get('user_1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.potency).toBe(1.0);
      expect(retrieved?.subject_id).toBe('user_1');

      store.close();
    });

    it('updates state', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });
      store.save(createDefaultState('user_1'));

      store.update('user_1', {
        potency: 0.7,
        withdrawal_bias: 0.2,
        delegation_trend: 0.1
      });

      const retrieved = store.get('user_1');
      expect(retrieved?.potency).toBe(0.7);
      expect(retrieved?.withdrawal_bias).toBe(0.2);
      expect(retrieved?.delegation_trend).toBe(0.1);

      store.close();
    });

    it('deletes state (GDPR)', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });
      store.save(createDefaultState('user_1'));

      store.delete('user_1');

      expect(store.get('user_1')).toBeNull();
      store.close();
    });

    it('does not return expired state', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

      const expired: RegulatoryState = {
        ...createDefaultState('user_expired'),
        expires_at: Date.now() - 1000
      };
      store.save(expired);

      expect(store.get('user_expired')).toBeNull();
      store.close();
    });

    it('purges expired entries', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

      // Add expired
      store.save({
        ...createDefaultState('user_1'),
        expires_at: Date.now() - 1000
      });
      store.save({
        ...createDefaultState('user_2'),
        expires_at: Date.now() - 1000
      });

      // Add valid
      store.save(createDefaultState('user_3'));

      const purged = store.purgeExpired();
      expect(purged).toBe(2);
      expect(store.getStats().subjects).toBe(1);

      store.close();
    });

    it('returns correct stats', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

      store.save(createDefaultState('user_1'));
      store.save(createDefaultState('user_2'));

      const stats = store.getStats();
      expect(stats.subjects).toBe(2);
      expect(stats.dbSizeBytes).toBeGreaterThan(0);

      store.close();
    });

    it('persists across restarts', () => {
      // First instance
      const store1 = new SQLiteStore({ dbPath: TEST_DB_PATH });
      store1.save(createDefaultState('persistent_user'));
      store1.update('persistent_user', { potency: 0.42 });
      store1.close();

      // Second instance
      const store2 = new SQLiteStore({ dbPath: TEST_DB_PATH });
      const retrieved = store2.get('persistent_user');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.potency).toBe(0.42);

      store2.close();
    });

    it('uses WAL mode', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });
      store.save(createDefaultState('user_1'));

      // WAL file should exist after write
      expect(fs.existsSync(TEST_DB_PATH + '-wal')).toBe(true);

      store.close();
    });
  });

  describe('FallbackStore', () => {
    it('uses SQLite when available', () => {
      const store = new FallbackStore({ dbPath: TEST_DB_PATH });

      expect(store.isUsingFallback()).toBe(false);

      store.save(createDefaultState('user_1'));
      expect(fs.existsSync(TEST_DB_PATH)).toBe(true);

      store.close();
    });

    it('falls back to memory on SQLite error', () => {
      // Use invalid path to force fallback
      const store = new FallbackStore({ dbPath: '/nonexistent/path/db.sqlite' });

      expect(store.isUsingFallback()).toBe(true);

      // Should still work
      store.save(createDefaultState('user_1'));
      expect(store.get('user_1')).not.toBeNull();

      store.close();
    });
  });

  describe('Migration System', () => {
    it('applies migrations on first run', () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

      // Table should exist
      store.save(createDefaultState('test'));
      expect(store.get('test')).not.toBeNull();

      store.close();
    });

    it('preserves data across schema versions', () => {
      // Create with v1
      const store1 = new SQLiteStore({ dbPath: TEST_DB_PATH });
      store1.save(createDefaultState('preserved_user'));
      store1.close();

      // Reopen (simulates upgrade)
      const store2 = new SQLiteStore({ dbPath: TEST_DB_PATH });
      expect(store2.get('preserved_user')).not.toBeNull();
      store2.close();
    });
  });

  describe('Concurrency (WAL)', () => {
    it('handles concurrent reads and writes', async () => {
      const store = new SQLiteStore({ dbPath: TEST_DB_PATH });

      // Concurrent writes
      const writes = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(store.save(createDefaultState(`user_${i}`)))
      );
      await Promise.all(writes);

      // Concurrent reads
      const reads = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(store.get(`user_${i}`))
      );
      const results = await Promise.all(reads);

      expect(results.every(r => r !== null)).toBe(true);

      store.close();
    });
  });
});

describe('createDefaultState', () => {
  it('creates state with correct defaults', () => {
    const state = createDefaultState('test_user');

    expect(state.subject_id).toBe('test_user');
    expect(state.potency).toBe(1.0);
    expect(state.withdrawal_bias).toBe(0.0);
    expect(state.loop_count).toBe(0);
    expect(state.delegation_trend).toBe(0.0);
    expect(state.expires_at).toBeGreaterThan(Date.now());
  });

  it('respects custom TTL', () => {
    const ttl = 1000; // 1 second
    const state = createDefaultState('test_user', ttl);

    const expectedExpiry = Date.now() + ttl;
    expect(state.expires_at).toBeGreaterThanOrEqual(expectedExpiry - 100);
    expect(state.expires_at).toBeLessThanOrEqual(expectedExpiry + 100);
  });
});
