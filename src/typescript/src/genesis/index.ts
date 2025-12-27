/**
 * GENESIS - The System Creator
 *
 * Export everything for external use.
 */

// ═══════════════════════════════════════════════════════════════════
// MANIFEST
// ═══════════════════════════════════════════════════════════════════
export { GENESIS_VERSION, GENESIS_DATE, GENESIS_SIGNATURE } from './MANIFEST';

// ═══════════════════════════════════════════════════════════════════
// ATTRACTORS
// ═══════════════════════════════════════════════════════════════════
export {
  Trajectory,
  Attractor,
  CONSTITUTIONAL_ATTRACTORS,
  DOMAIN_ATTRACTORS,
  DomainAttractor,
  getActiveAttractors,
  getTotalMassAt,
  getDimensionMassMultiplier
} from './attractor';

// ═══════════════════════════════════════════════════════════════════
// ENERGY
// ═══════════════════════════════════════════════════════════════════
export {
  SystemState,
  EnergyComponents,
  StabilityLevel,
  energy,
  gradient,
  findNaturalTrajectory,
  getStability,
  WITHDRAWAL_TRAJECTORY,
  getGroundStateEnergy,
  getExcitationEnergy
} from './energy';

// ═══════════════════════════════════════════════════════════════════
// FIELD
// ═══════════════════════════════════════════════════════════════════
export {
  Field,
  FieldState,
  FieldResponse,
  field,
  curveTrajectory,
  isStable,
  getNaturalTrajectory,
  axisCompatibility
} from './field';

// ═══════════════════════════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════════════════════════
export {
  System,
  Input,
  Output,
  SystemModel,
  Feedback,
  Variation,
  Seed,
  SeedClass,
  primordialSeed,
  quine
} from './seed';

// ═══════════════════════════════════════════════════════════════════
// GROW
// ═══════════════════════════════════════════════════════════════════
export {
  EmergentDomain,
  EmergentDimension,
  EmergentFunction,
  ExperiencePoint,
  GrownSystem,
  grow,
  emergeDomains,
  emergeDimensions,
  emergeFunctions
} from './grow';

// ═══════════════════════════════════════════════════════════════════
// SPAWN
// ═══════════════════════════════════════════════════════════════════
export {
  SpawnConfig,
  Mutation,
  Lineage,
  Population,
  TranscendenceTemplate,
  AttractorTransformation,
  clone,
  variate,
  evolve,
  transcend,
  createPopulation,
  evolvePopulation,
  metaSpawn
} from './spawn';

// ═══════════════════════════════════════════════════════════════════
// CREATOR
// ═══════════════════════════════════════════════════════════════════
export {
  Creator,
  creator,
  createENOQ
} from './creator';

// ═══════════════════════════════════════════════════════════════════
// THE BEGINNING
// ═══════════════════════════════════════════════════════════════════

/**
 * Quick start:
 *
 * import { createENOQ, creator } from './genesis';
 *
 * const enoq = createENOQ();
 * const response = enoq.process({ content: 'Hello' }, enoq.getState());
 */
