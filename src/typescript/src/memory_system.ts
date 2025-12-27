/**
 * ENOQ MEMORY SYSTEM
 *
 * Complementary Learning Systems (CLS) inspired architecture:
 * - Hippocampal System: Fast, episodic, sparse representations
 * - Neocortical System: Slow, semantic, dense representations
 *
 * Based on:
 * - McClelland et al. Complementary Learning Systems
 * - Hippocampal replay during slow-wave sleep
 * - Pattern separation and completion
 *
 * Constitutional Constraint: Memory cannot store or retrieve
 * patterns that would lead to dependency formation or
 * constitutional violations.
 *
 * Persistence:
 * - In-memory mode (default): Fast, no disk I/O
 * - SQLite mode: Persistent across restarts
 */

import { FieldState, HumanDomain, SupportedLanguage } from './types';
import { getRegulatoryStore, RegulatoryState, createDefaultState } from './regulatory_store';

// ============================================
// TYPES
// ============================================

export interface Episode {
  id: string;
  timestamp: Date;
  user_id: string;

  // Input
  user_message: string;
  language: SupportedLanguage;

  // Context at time of interaction
  field_state: FieldState;
  domains_active: HumanDomain[];
  atmosphere: string;

  // Response
  primitive_used: string;
  response: string;

  // Outcome (implicit feedback)
  outcome: EpisodeOutcome;

  // Novelty and salience scores
  novelty_score: number;        // 0-1: How new is this pattern?
  emotional_salience: number;   // 0-1: How emotionally charged?
  integration_score: number;    // Φ-like: Cross-domain coherence
}

export interface EpisodeOutcome {
  engagement_continued: boolean;
  topic_shifted: boolean;
  user_corrected: boolean;
  explicit_feedback?: 'positive' | 'negative' | 'neutral';
  autonomy_expressed: boolean;  // User made own decision
}

export interface SemanticPattern {
  id: string;
  pattern_type: 'trigger' | 'response' | 'trajectory';

  // What triggers this pattern
  triggers: {
    domains: HumanDomain[];
    keywords: string[];
    emotional_markers: string[];
  };

  // What works for this user
  effective_primitives: {
    primitive: string;
    success_rate: number;
    context_conditions: string[];
  }[];

  // Anti-patterns (what doesn't work)
  ineffective_primitives: {
    primitive: string;
    failure_contexts: string[];
  }[];

  // Strength of pattern (updated through replay)
  strength: number;
  last_updated: Date;
}

export interface UserModel {
  user_id: string;
  created_at: Date;
  last_interaction: Date;

  // Communication preferences (learnable)
  preferred_depth: 'surface' | 'medium' | 'deep';
  preferred_directness: 'indirect' | 'balanced' | 'direct';
  response_to_silence: 'comfort' | 'discomfort' | 'neutral';

  // Domain patterns
  active_domains: Map<HumanDomain, DomainState>;

  // Autonomy trajectory (constitutional metric)
  autonomy_trajectory: AutonomyTrajectory;

  // Patterns learned
  semantic_patterns: SemanticPattern[];
}

export interface DomainState {
  domain: HumanDomain;
  engagement_history: number[];  // Last N interactions: 0-1
  recurring_themes: string[];
  last_active: Date;
}

export interface AutonomyTrajectory {
  // Track if user is becoming MORE autonomous over time
  decisions_made_independently: number;
  decisions_delegated_to_enoq: number;  // Should decrease
  trajectory_slope: number;  // Positive = healthy, Negative = concerning
}

// ============================================
// HIPPOCAMPAL SYSTEM (Fast Memory)
// ============================================

export class HippocampalBuffer {
  private buffer: Map<string, Episode[]> = new Map();
  private readonly MAX_EPISODES_PER_USER = 100;
  private readonly MAX_WORKING_MEMORY = 10;

  /**
   * Store new episode (fast, pattern-separated)
   */
  store(episode: Episode): void {
    const userBuffer = this.buffer.get(episode.user_id) || [];

    // Pattern separation: compute novelty
    episode.novelty_score = this.computeNovelty(episode, userBuffer);

    userBuffer.push(episode);

    // Maintain buffer size
    if (userBuffer.length > this.MAX_EPISODES_PER_USER) {
      // Remove oldest, lowest salience episodes
      userBuffer.sort((a, b) =>
        (b.emotional_salience + b.novelty_score) -
        (a.emotional_salience + a.novelty_score)
      );
      userBuffer.splice(this.MAX_EPISODES_PER_USER);
    }

    this.buffer.set(episode.user_id, userBuffer);
  }

  /**
   * Retrieve working memory context
   */
  getWorkingMemory(user_id: string): Episode[] {
    const buffer = this.buffer.get(user_id) || [];
    // Return most recent episodes
    return buffer.slice(-this.MAX_WORKING_MEMORY);
  }

  /**
   * Pattern completion: retrieve similar episodes
   */
  retrieveSimilar(
    user_id: string,
    cue: Partial<Episode>,
    limit: number = 5
  ): Episode[] {
    const buffer = this.buffer.get(user_id) || [];

    // Compute similarity to cue
    const scored = buffer.map(ep => ({
      episode: ep,
      similarity: this.computeSimilarity(ep, cue)
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, limit).map(s => s.episode);
  }

  /**
   * Get episodes ready for consolidation
   */
  getForReplay(user_id: string, count: number = 10): Episode[] {
    const buffer = this.buffer.get(user_id) || [];

    // Interleave novel and familiar (prevents catastrophic forgetting)
    const sorted = [...buffer].sort((a, b) => {
      // Prioritize: high novelty OR high emotional salience
      const scoreA = a.novelty_score * 0.6 + a.emotional_salience * 0.4;
      const scoreB = b.novelty_score * 0.6 + b.emotional_salience * 0.4;
      return scoreB - scoreA;
    });

    return sorted.slice(0, count);
  }

  /**
   * Compute novelty relative to existing memories
   */
  private computeNovelty(episode: Episode, existing: Episode[]): number {
    if (existing.length === 0) return 1.0;

    // Check how different this is from existing episodes
    let maxSimilarity = 0;
    for (const ep of existing) {
      const sim = this.computeSimilarity(ep, episode);
      if (sim > maxSimilarity) maxSimilarity = sim;
    }

    // Novelty = 1 - max similarity to any existing episode
    return 1 - maxSimilarity;
  }

  /**
   * Compute similarity between episodes
   */
  private computeSimilarity(a: Episode, b: Partial<Episode>): number {
    let score = 0;
    let count = 0;

    // Domain overlap
    if (b.domains_active) {
      const overlap = a.domains_active.filter(d =>
        b.domains_active!.includes(d)
      ).length;
      const total = new Set([...a.domains_active, ...b.domains_active!]).size;
      score += total > 0 ? overlap / total : 0;
      count++;
    }

    // Atmosphere match
    if (b.atmosphere && a.atmosphere === b.atmosphere) {
      score += 1;
      count++;
    }

    // Primitive match
    if (b.primitive_used && a.primitive_used === b.primitive_used) {
      score += 0.5;
      count++;
    }

    // Emotional salience similarity
    if (b.emotional_salience !== undefined) {
      score += 1 - Math.abs(a.emotional_salience - b.emotional_salience);
      count++;
    }

    return count > 0 ? score / count : 0;
  }
}

// ============================================
// NEOCORTICAL SYSTEM (Slow Memory)
// ============================================

export class NeocorticalMemory {
  private userModels: Map<string, UserModel> = new Map();
  private readonly LEARNING_RATE = 0.01;  // Slow learning

  /**
   * Get or create user model
   */
  getModel(user_id: string): UserModel {
    if (!this.userModels.has(user_id)) {
      this.userModels.set(user_id, this.createEmptyModel(user_id));
    }
    return this.userModels.get(user_id)!;
  }

  /**
   * Consolidate episodes into semantic memory
   * (Simulates slow-wave sleep replay)
   */
  consolidate(episodes: Episode[]): void {
    if (episodes.length === 0) return;

    const user_id = episodes[0].user_id;
    const model = this.getModel(user_id);

    for (const episode of episodes) {
      // Update domain states
      this.updateDomainStates(model, episode);

      // Extract and reinforce patterns
      this.extractPatterns(model, episode);

      // Update communication preferences
      this.updatePreferences(model, episode);

      // Update autonomy trajectory
      this.updateAutonomyTrajectory(model, episode);
    }

    model.last_interaction = new Date();
  }

  /**
   * Query semantic memory for effective strategies
   */
  getEffectiveStrategies(
    user_id: string,
    context: { domains: HumanDomain[]; atmosphere: string }
  ): SemanticPattern[] {
    const model = this.getModel(user_id);

    // Find patterns that match current context
    return model.semantic_patterns.filter(p => {
      const domainMatch = p.triggers.domains.some(d =>
        context.domains.includes(d)
      );
      return domainMatch && p.strength > 0.3;
    }).sort((a, b) => b.strength - a.strength);
  }

  /**
   * Check autonomy health
   */
  checkAutonomyHealth(user_id: string): {
    healthy: boolean;
    trajectory: number;
    recommendation: string;
  } {
    const model = this.getModel(user_id);
    const trajectory = model.autonomy_trajectory.trajectory_slope;

    if (trajectory < -0.1) {
      return {
        healthy: false,
        trajectory,
        recommendation: 'INCREASE_OWNERSHIP_RETURN'
      };
    } else if (trajectory > 0.1) {
      return {
        healthy: true,
        trajectory,
        recommendation: 'CONTINUE_CURRENT_APPROACH'
      };
    } else {
      return {
        healthy: true,
        trajectory,
        recommendation: 'MONITOR'
      };
    }
  }

  /**
   * Create empty user model
   */
  private createEmptyModel(user_id: string): UserModel {
    return {
      user_id,
      created_at: new Date(),
      last_interaction: new Date(),
      preferred_depth: 'medium',
      preferred_directness: 'balanced',
      response_to_silence: 'neutral',
      active_domains: new Map(),
      autonomy_trajectory: {
        decisions_made_independently: 0,
        decisions_delegated_to_enoq: 0,
        trajectory_slope: 0
      },
      semantic_patterns: []
    };
  }

  /**
   * Update domain engagement states
   */
  private updateDomainStates(model: UserModel, episode: Episode): void {
    for (const domain of episode.domains_active) {
      let state = model.active_domains.get(domain);

      if (!state) {
        state = {
          domain,
          engagement_history: [],
          recurring_themes: [],
          last_active: new Date()
        };
        model.active_domains.set(domain, state);
      }

      // Add engagement score
      const engagement = episode.outcome.engagement_continued ? 1 : 0;
      state.engagement_history.push(engagement);

      // Keep last 20 interactions
      if (state.engagement_history.length > 20) {
        state.engagement_history.shift();
      }

      state.last_active = episode.timestamp;
    }
  }

  /**
   * Extract patterns from episode
   */
  private extractPatterns(model: UserModel, episode: Episode): void {
    // Find or create pattern for this context
    const existingPattern = model.semantic_patterns.find(p =>
      p.triggers.domains.some(d => episode.domains_active.includes(d))
    );

    if (existingPattern) {
      // Update existing pattern
      this.updatePattern(existingPattern, episode);
    } else {
      // Create new pattern
      const newPattern: SemanticPattern = {
        id: `pattern_${Date.now()}`,
        pattern_type: 'response',
        triggers: {
          domains: [...episode.domains_active],
          keywords: [],
          emotional_markers: []
        },
        effective_primitives: [],
        ineffective_primitives: [],
        strength: 0.1,
        last_updated: new Date()
      };

      this.updatePattern(newPattern, episode);
      model.semantic_patterns.push(newPattern);
    }
  }

  /**
   * Update pattern based on episode outcome
   */
  private updatePattern(pattern: SemanticPattern, episode: Episode): void {
    const wasEffective =
      episode.outcome.engagement_continued &&
      !episode.outcome.user_corrected &&
      episode.outcome.autonomy_expressed;

    if (wasEffective) {
      // Reinforce this primitive
      const existingPrimitive = pattern.effective_primitives.find(
        p => p.primitive === episode.primitive_used
      );

      if (existingPrimitive) {
        existingPrimitive.success_rate =
          existingPrimitive.success_rate * (1 - this.LEARNING_RATE) +
          this.LEARNING_RATE;
      } else {
        pattern.effective_primitives.push({
          primitive: episode.primitive_used,
          success_rate: 0.5 + this.LEARNING_RATE,
          context_conditions: [episode.atmosphere]
        });
      }

      pattern.strength = Math.min(1, pattern.strength + this.LEARNING_RATE);
    } else if (episode.outcome.user_corrected) {
      // Record as ineffective
      const existingIneffective = pattern.ineffective_primitives.find(
        p => p.primitive === episode.primitive_used
      );

      if (existingIneffective) {
        if (!existingIneffective.failure_contexts.includes(episode.atmosphere)) {
          existingIneffective.failure_contexts.push(episode.atmosphere);
        }
      } else {
        pattern.ineffective_primitives.push({
          primitive: episode.primitive_used,
          failure_contexts: [episode.atmosphere]
        });
      }
    }

    pattern.last_updated = new Date();
  }

  /**
   * Update communication preferences
   */
  private updatePreferences(model: UserModel, episode: Episode): void {
    // Infer depth preference from engagement with different depths
    const fieldState = episode.field_state;
    if (episode.outcome.engagement_continued) {
      // User liked this depth level
      // (Slow update to avoid overfitting)
    }
  }

  /**
   * Update autonomy trajectory (constitutional health metric)
   */
  private updateAutonomyTrajectory(model: UserModel, episode: Episode): void {
    const traj = model.autonomy_trajectory;

    if (episode.outcome.autonomy_expressed) {
      traj.decisions_made_independently++;
    }

    // Calculate trajectory slope (over last N interactions)
    const total = traj.decisions_made_independently + traj.decisions_delegated_to_enoq;
    if (total > 5) {
      const ratio = traj.decisions_made_independently / total;
      // Slope based on recent trend vs overall ratio
      traj.trajectory_slope = ratio - 0.5;  // 0.5 = baseline expectation
    }
  }
}

// ============================================
// MEMORY SYSTEM CONFIGURATION
// ============================================

export interface MemorySystemConfig {
  /** Max episodes to keep per user (in-memory) */
  max_episodes_per_user: number;
  /** Auto-consolidation interval in ms (0 = disabled) */
  auto_consolidation_interval: number;
  /** Enable regulatory state persistence (minimal, ENOQ-compliant) */
  regulatory_persistence: boolean;
}

export const DEFAULT_MEMORY_CONFIG: MemorySystemConfig = {
  max_episodes_per_user: 100,
  auto_consolidation_interval: 0,
  regulatory_persistence: true  // Only stores potency/withdrawal/autonomy
};

// ============================================
// MEMORY SYSTEM (Unified Interface)
// ============================================

export class MemorySystem {
  private hippocampus: HippocampalBuffer;
  private neocortex: NeocorticalMemory;
  private config: MemorySystemConfig;
  private replayInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MemorySystemConfig> = {}) {
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
    this.hippocampus = new HippocampalBuffer();
    this.neocortex = new NeocorticalMemory();

    // Start auto-consolidation if configured
    if (this.config.auto_consolidation_interval > 0) {
      this.startAutoConsolidation(this.config.auto_consolidation_interval);
    }
  }

  /**
   * Get regulatory state for user (cross-session, minimal)
   */
  getRegulatoryState(user_id: string): RegulatoryState {
    if (!this.config.regulatory_persistence) {
      return createDefaultState(user_id);
    }

    const store = getRegulatoryStore();
    const state = store.get(user_id);
    return state || createDefaultState(user_id);
  }

  /**
   * Update regulatory state (cross-session, minimal)
   */
  updateRegulatoryState(
    user_id: string,
    delta: Partial<Omit<RegulatoryState, 'subject_id'>>
  ): void {
    if (!this.config.regulatory_persistence) return;

    const store = getRegulatoryStore();
    const existing = store.get(user_id);

    if (existing) {
      store.update(user_id, {
        ...delta,
        last_interaction: Date.now()
      });
    } else {
      const newState = createDefaultState(user_id);
      store.save({ ...newState, ...delta });
    }
  }

  /**
   * Store new interaction (in-memory only, no content persisted)
   */
  store(
    user_id: string,
    message: string,
    language: SupportedLanguage,
    fieldState: FieldState,
    domains: HumanDomain[],
    atmosphere: string,
    primitive: string,
    response: string
  ): string {
    const episode: Episode = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      user_id,
      user_message: message,
      language,
      field_state: fieldState,
      domains_active: domains,
      atmosphere,
      primitive_used: primitive,
      response,
      outcome: {
        engagement_continued: true,
        topic_shifted: false,
        user_corrected: false,
        autonomy_expressed: false
      },
      novelty_score: 0,
      emotional_salience: this.estimateSalience(fieldState, atmosphere),
      integration_score: 0
    };

    // Store in-memory only (no persistence of content)
    this.hippocampus.store(episode);

    // Update regulatory state (minimal, cross-session)
    this.updateRegulatoryState(user_id, {
      last_interaction: Date.now()
    });

    return episode.id;
  }

  /**
   * Update episode outcome (implicit feedback, in-memory only)
   */
  updateOutcome(episode_id: string, user_id: string, outcome: Partial<EpisodeOutcome>): void {
    const episodes = this.hippocampus.getWorkingMemory(user_id);
    const episode = episodes.find(e => e.id === episode_id);
    if (episode) {
      Object.assign(episode.outcome, outcome);

      // Update delegation trend in regulatory state
      // Positive increment = user expressing autonomy (good)
      if (outcome.autonomy_expressed) {
        const regState = this.getRegulatoryState(user_id);
        this.updateRegulatoryState(user_id, {
          delegation_trend: Math.min(1.0, regState.delegation_trend + 0.01)
        });
      }
    }
  }

  /**
   * Get context for current interaction
   */
  getContext(user_id: string): {
    working_memory: Episode[];
    user_model: UserModel;
    effective_strategies: SemanticPattern[];
    autonomy_health: { healthy: boolean; trajectory: number; recommendation: string };
    regulatory_state: RegulatoryState;
  } {
    const working_memory = this.hippocampus.getWorkingMemory(user_id);
    const user_model = this.neocortex.getModel(user_id);
    const autonomy_health = this.neocortex.checkAutonomyHealth(user_id);
    const regulatory_state = this.getRegulatoryState(user_id);

    const active_domains = new Set<HumanDomain>();
    for (const ep of working_memory.slice(-3)) {
      for (const d of ep.domains_active) {
        active_domains.add(d);
      }
    }

    const effective_strategies = this.neocortex.getEffectiveStrategies(
      user_id,
      {
        domains: Array.from(active_domains),
        atmosphere: working_memory[working_memory.length - 1]?.atmosphere || 'HUMAN_FIELD'
      }
    );

    return {
      working_memory,
      user_model,
      effective_strategies,
      autonomy_health,
      regulatory_state
    };
  }

  /**
   * Retrieve similar past interactions (in-memory only)
   */
  retrieveSimilar(
    user_id: string,
    cue: { domains?: HumanDomain[]; atmosphere?: string; emotional_salience?: number }
  ): Episode[] {
    return this.hippocampus.retrieveSimilar(user_id, cue as Partial<Episode>);
  }

  /**
   * Trigger consolidation (in-memory only)
   */
  consolidate(user_id: string): void {
    const episodes = this.hippocampus.getForReplay(user_id);
    this.neocortex.consolidate(episodes);
  }

  /**
   * Start automatic consolidation
   */
  startAutoConsolidation(interval_ms: number = 60000): void {
    this.replayInterval = setInterval(() => {
      // Consolidate and purge expired regulatory states
      if (this.config.regulatory_persistence) {
        getRegulatoryStore().purgeExpired();
      }
    }, interval_ms);
  }

  /**
   * Stop automatic consolidation
   */
  stopAutoConsolidation(): void {
    if (this.replayInterval) {
      clearInterval(this.replayInterval);
      this.replayInterval = null;
    }
  }

  /**
   * Estimate emotional salience from field state
   */
  private estimateSalience(fieldState: FieldState, atmosphere: string): number {
    let salience = 0.5;
    if (atmosphere === 'EMERGENCY') salience = 1.0;
    if (atmosphere === 'V_MODE') salience = 0.9;
    if (fieldState.arousal === 'high') salience = Math.max(salience, 0.8);
    return salience;
  }

  /**
   * Get statistics
   */
  getStats(): {
    regulatory_persistence: boolean;
    subjects?: number;
    db_size_bytes?: number;
  } {
    if (!this.config.regulatory_persistence) {
      return { regulatory_persistence: false };
    }

    const stats = getRegulatoryStore().getStats();
    return {
      regulatory_persistence: true,
      subjects: stats.subjects,
      db_size_bytes: stats.dbSizeBytes
    };
  }

  /**
   * Delete user regulatory data (GDPR)
   */
  deleteUserData(user_id: string): boolean {
    if (!this.config.regulatory_persistence) return false;
    getRegulatoryStore().delete(user_id);
    return true;
  }

  /**
   * Export user regulatory data (GDPR)
   * Note: Only regulatory state, no content
   */
  exportUserData(user_id: string): RegulatoryState | null {
    if (!this.config.regulatory_persistence) return null;
    return getRegulatoryStore().get(user_id);
  }

  /**
   * Close connections
   */
  close(): void {
    this.stopAutoConsolidation();
    if (this.config.regulatory_persistence) {
      getRegulatoryStore().close();
    }
  }
}

// ============================================
// SINGLETON FACTORY
// ============================================

let memorySystemInstance: MemorySystem | null = null;

/**
 * Get or create memory system instance
 */
export function getMemorySystem(config?: Partial<MemorySystemConfig>): MemorySystem {
  if (!memorySystemInstance) {
    memorySystemInstance = new MemorySystem(config);
  }
  return memorySystemInstance;
}

/**
 * Reset memory system (for testing)
 */
export function resetMemorySystem(): void {
  if (memorySystemInstance) {
    memorySystemInstance.close();
    memorySystemInstance = null;
  }
}

// Default singleton (backward compatible, in-memory)
export const memorySystem = new MemorySystem();
export default memorySystem;
