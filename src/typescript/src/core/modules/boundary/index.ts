/**
 * boundary (LIMEN) - Soglia e classificazione
 *
 * CANONICAL: boundary.ts exports (Slice 2)
 * LEGACY: gate/classifier/, gate/protocols/ re-exports
 *
 * See README.md for module documentation.
 */

// ============================================
// CANONICAL: Core boundary API (Slice 2)
// ============================================
export {
  permit,
  getDomain,
  isGated,
  BoundaryContext,
  BoundaryDecision,
} from './boundary';

// ============================================
// LEGACY: Gate re-exports (backwards compat)
// ============================================
export * from '../../../gate/classifier';
export * from '../../../gate/protocols';
