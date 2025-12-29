/**
 * core/modules - 9 ENOQ Cognitive Modules
 *
 * Slice 2 wiring: boundary + verification are canonical
 * Other modules are stubs with legacy re-exports
 *
 * Module Map:
 * - boundary (LIMEN): Input classification, response protocols
 * - verification (TELOS): Constitutional verification, fallbacks
 * - perception (SENSUS): Field detection (stub)
 * - reasoning (LOGOS): Protocol selection (stub)
 * - memory (NEXUS): Session memory (stub)
 * - execution (ERGON): Output generation (stub)
 * - temporal (CHRONOS): Temporal reasoning (stub)
 * - defense (IMMUNIS): Enforcement (stub)
 * - metacognition (META): Self-monitoring (stub)
 */

// ============================================
// CANONICAL (Slice 2): boundary + verification
// ============================================

export * from './boundary';
export * from './verification';

// ============================================
// STUBS: Other modules (legacy re-exports)
// ============================================

// These modules will be wired in Slice 3+
// Currently they just have index.ts with re-exports

// perception - mediator/l1_clarify
// reasoning - mediator/l2_reflect
// memory - mediator/l4_agency
// execution - mediator/l5_transform
// temporal - mediator/l4_agency
// defense - gate/enforcement
// metacognition - mediator/l3_integrate
