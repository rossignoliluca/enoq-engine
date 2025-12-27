/**
 * GENESIS: DYNAMIC BALANCE
 *
 * Implements passive/inhibitory processes to balance active/excitatory ones.
 *
 * Scientific Basis:
 * - Kelso, J.A.S. (1995). Dynamic Patterns: The Self-Organization of Brain and Behavior
 * - Raichle, M.E. (2001). Default Mode Network - resting state brain activity
 * - Friston, K. (2010). Free Energy Principle - balance exploration/exploitation
 * - Cannon, W.B. (1932). Homeostasis - dynamic equilibrium through feedback
 *
 * This module provides the "passive" complement to active intervention:
 * - Resting states vs Active states
 * - Stochastic vs Deterministic processing
 * - Observation vs Intervention
 * - Unconstrained vs Constrained modes
 */

import { SystemState } from './energy';
import { Trajectory } from './attractor';

// ============================================
// TYPES
// ============================================

/**
 * Resting State - analogous to Default Mode Network
 * The system's baseline when not actively processing
 */
export interface RestingState {
  active: false;
  mode: 'resting' | 'observation' | 'integration';
  duration_ms: number;
  trigger: 'timeout' | 'completion' | 'uncertainty' | 'explicit';
}

/**
 * Active State - task-positive network analogue
 */
export interface ActiveState {
  active: true;
  mode: 'processing' | 'intervention' | 'generation';
  task: string;
  started_at: number;
}

export type DynamicState = RestingState | ActiveState;

/**
 * Stochastic Element - introduces controlled uncertainty
 * Based on: Shannon (1948), Friston (2010)
 */
export interface StochasticElement {
  entropy: number;           // 0-1, current uncertainty level
  exploration_rate: number;  // Probability of exploring vs exploiting
  noise_amplitude: number;   // Amount of random variation
}

/**
 * Observation Mode - passive monitoring without intervention
 * Based on: Varela (1999) - neurophenomenology, witness consciousness
 */
export interface ObservationMode {
  observing: boolean;
  intervention_suspended: boolean;
  duration_limit_ms: number;
  observations: string[];
}

/**
 * Constraint Relaxation - degrees of freedom
 * Based on: Friston (2010) - precision weighting
 */
export interface ConstraintRelaxation {
  level: 'strict' | 'moderate' | 'relaxed' | 'unconstrained';
  precision: number;  // 0-1, inverse of uncertainty
  relaxed_constraints: string[];
}

// ============================================
// DYNAMIC BALANCE CONTROLLER
// ============================================

export class DynamicBalanceController {
  private currentState: DynamicState;
  private stochastic: StochasticElement;
  private observationMode: ObservationMode;
  private constraints: ConstraintRelaxation;

  constructor() {
    // Start in resting state (default mode)
    this.currentState = {
      active: false,
      mode: 'resting',
      duration_ms: 0,
      trigger: 'explicit'
    };

    // Initialize stochastic element with moderate exploration
    this.stochastic = {
      entropy: 0.5,
      exploration_rate: 0.1,  // 10% exploration
      noise_amplitude: 0.05
    };

    // Observation mode off by default
    this.observationMode = {
      observing: false,
      intervention_suspended: false,
      duration_limit_ms: 30000,  // 30 seconds max
      observations: []
    };

    // Start with moderate constraints
    this.constraints = {
      level: 'moderate',
      precision: 0.7,
      relaxed_constraints: []
    };
  }

  // ============================================
  // RESTING STATE MANAGEMENT
  // ============================================

  /**
   * Transition to resting state
   * Analogous to DMN activation when task-positive network deactivates
   */
  enterRestingState(trigger: RestingState['trigger'] = 'explicit'): RestingState {
    this.currentState = {
      active: false,
      mode: 'resting',
      duration_ms: 0,
      trigger
    };
    return this.currentState;
  }

  /**
   * Transition to active state
   */
  enterActiveState(task: string, mode: ActiveState['mode'] = 'processing'): ActiveState {
    this.currentState = {
      active: true,
      mode,
      task,
      started_at: Date.now()
    };
    return this.currentState;
  }

  /**
   * Check if system should rest
   * Based on: homeostatic regulation, fatigue models
   */
  shouldRest(cycleCount: number, lastRestAt: number): boolean {
    const timeSinceRest = Date.now() - lastRestAt;
    const cycleThreshold = 10;  // Rest every 10 cycles
    const timeThreshold = 60000;  // Or every 60 seconds

    return cycleCount >= cycleThreshold || timeSinceRest >= timeThreshold;
  }

  // ============================================
  // STOCHASTIC PROCESSING
  // ============================================

  /**
   * Add stochastic variation to trajectory
   * Implements exploration in exploration-exploitation tradeoff
   */
  addStochasticVariation(trajectory: Trajectory): Trajectory {
    if (Math.random() > this.stochastic.exploration_rate) {
      return trajectory;  // Exploit: use trajectory as-is
    }

    // Explore: add noise
    const noise = this.stochastic.noise_amplitude;
    return {
      ...trajectory,
      intervention_depth: this.clamp(trajectory.intervention_depth + this.gaussianNoise(noise)),
      prescriptiveness: this.clamp(trajectory.prescriptiveness + this.gaussianNoise(noise)),
      presence: this.clamp(trajectory.presence + this.gaussianNoise(noise))
    };
  }

  /**
   * Update entropy based on prediction error
   * Based on: Free Energy Principle
   */
  updateEntropy(predictionError: number): void {
    // High prediction error = high entropy = more exploration
    this.stochastic.entropy = this.clamp(predictionError);
    this.stochastic.exploration_rate = 0.05 + (this.stochastic.entropy * 0.2);  // 5-25%
  }

  // ============================================
  // OBSERVATION MODE
  // ============================================

  /**
   * Enter observation mode - suspend intervention
   * Based on: Varela's neurophenomenology, mindfulness research
   */
  enterObservationMode(duration_ms: number = 30000): void {
    this.observationMode = {
      observing: true,
      intervention_suspended: true,
      duration_limit_ms: duration_ms,
      observations: []
    };
  }

  /**
   * Record observation without intervening
   */
  observe(observation: string): void {
    if (this.observationMode.observing) {
      this.observationMode.observations.push(observation);
    }
  }

  /**
   * Exit observation mode
   */
  exitObservationMode(): string[] {
    const observations = this.observationMode.observations;
    this.observationMode = {
      observing: false,
      intervention_suspended: false,
      duration_limit_ms: 30000,
      observations: []
    };
    return observations;
  }

  /**
   * Check if intervention is allowed
   */
  canIntervene(): boolean {
    return !this.observationMode.intervention_suspended;
  }

  // ============================================
  // CONSTRAINT RELAXATION
  // ============================================

  /**
   * Relax constraints to allow more freedom
   * Based on: precision weighting in predictive processing
   */
  relaxConstraints(level: ConstraintRelaxation['level'], constraints: string[] = []): void {
    const precisionMap: Record<ConstraintRelaxation['level'], number> = {
      strict: 0.95,
      moderate: 0.7,
      relaxed: 0.4,
      unconstrained: 0.1
    };

    this.constraints = {
      level,
      precision: precisionMap[level],
      relaxed_constraints: constraints
    };
  }

  /**
   * Check if a specific constraint is relaxed
   */
  isConstraintRelaxed(constraint: string): boolean {
    return this.constraints.relaxed_constraints.includes(constraint);
  }

  /**
   * Get current precision (inverse uncertainty)
   */
  getPrecision(): number {
    return this.constraints.precision;
  }

  // ============================================
  // BALANCE METRICS
  // ============================================

  /**
   * Get current balance state
   */
  getBalanceState(): {
    activePassiveRatio: number;
    explorationRate: number;
    constraintLevel: string;
    isObserving: boolean;
  } {
    return {
      activePassiveRatio: this.currentState.active ? 1 : 0,
      explorationRate: this.stochastic.exploration_rate,
      constraintLevel: this.constraints.level,
      isObserving: this.observationMode.observing
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private clamp(value: number, min: number = 0, max: number = 1): number {
    return Math.max(min, Math.min(max, value));
  }

  private gaussianNoise(amplitude: number): number {
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * amplitude;
  }
}

// ============================================
// SINGLETON
// ============================================

export const dynamicBalance = new DynamicBalanceController();

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function enterRestingState(): RestingState {
  return dynamicBalance.enterRestingState();
}

export function enterObservationMode(duration_ms?: number): void {
  dynamicBalance.enterObservationMode(duration_ms);
}

export function canIntervene(): boolean {
  return dynamicBalance.canIntervene();
}

export function addStochasticVariation(trajectory: Trajectory): Trajectory {
  return dynamicBalance.addStochasticVariation(trajectory);
}

export function relaxConstraints(level: ConstraintRelaxation['level']): void {
  dynamicBalance.relaxConstraints(level);
}
