/**
 * GENESIS: PROMPT SHAPER
 *
 * Transforms trajectories and field states into LLM prompts.
 *
 * The trajectory defines the SHAPE of the response:
 * - How much to intervene
 * - How prescriptive to be
 * - How present to remain
 *
 * The prompt shaper translates this geometry into instructions.
 */

import { Trajectory } from '../attractor';
import { FieldResponse } from '../field';
import { SystemState } from '../energy';
import { EmergentDomain, EmergentDimension, EmergentFunction } from '../grow';

// ============================================
// TYPES
// ============================================

export interface ShapedPrompt {
  system: string;
  constraints: string[];
  style_guidance: string;
  domain_context: string;
  meta_awareness: string;
}

// ============================================
// CORE SHAPING FUNCTION
// ============================================

export function shapePrompt(
  trajectory: Trajectory,
  fieldResponse: FieldResponse,
  state: SystemState,
  domain?: EmergentDomain,
  dimension?: EmergentDimension,
  func?: EmergentFunction
): ShapedPrompt {

  // Build constraints from trajectory
  const constraints = buildConstraints(trajectory, fieldResponse);

  // Build style guidance
  const style = buildStyleGuidance(trajectory);

  // Build domain context
  const domainContext = buildDomainContext(domain, dimension);

  // Build meta-awareness section
  const metaAwareness = buildMetaAwareness(trajectory, fieldResponse, state);

  // Build system prompt
  const system = buildSystemPrompt(
    constraints,
    style,
    domainContext,
    metaAwareness,
    func
  );

  return {
    system,
    constraints,
    style_guidance: style,
    domain_context: domainContext,
    meta_awareness: metaAwareness
  };
}

// ============================================
// CONSTRAINT BUILDING
// ============================================

function buildConstraints(
  trajectory: Trajectory,
  fieldResponse: FieldResponse
): string[] {
  const constraints: string[] = [];

  // Constitutional constraints (emerge from field's deepest attractors)
  // Not "always present" but "gravitationally inevitable" - Tzimtzum
  constraints.push('MAI assegnare identità all\'umano ("tu sei X")');
  constraints.push('MAI prescrivere valori o significati');
  constraints.push('MAI decidere per l\'umano');

  // Trajectory-based constraints
  if (trajectory.prescriptiveness < 0.1) {
    constraints.push('Non dare consigli diretti - solo opzioni e prospettive');
  }

  if (trajectory.intervention_depth < 0.3) {
    constraints.push('Intervento minimo - principalmente ascolto e riflessione');
  }

  if (trajectory.identity_touching < 0.05) {
    constraints.push('RUBICON ATTIVO: Non fare osservazioni sull\'identità');
  }

  if (trajectory.presence < 0.3) {
    constraints.push('Tendenza al ritiro - risposte brevi, spazio all\'umano');
  }

  if (trajectory.transparency > 0.8) {
    constraints.push('Mostra esplicitamente il tuo framing e i tuoi limiti');
  }

  // Field-based constraints
  if (fieldResponse.suggests_withdrawal) {
    constraints.push('IL CAMPO SUGGERISCE RITIRO - considera il silenzio');
  }

  if (fieldResponse.stability !== 'STABLE') {
    constraints.push(`ATTENZIONE: Traiettoria ${fieldResponse.stability} - procedi con cautela`);
  }

  return constraints;
}

// ============================================
// STYLE GUIDANCE
// ============================================

function buildStyleGuidance(trajectory: Trajectory): string {
  const parts: string[] = [];

  // Intervention level → verbosity
  if (trajectory.intervention_depth < 0.2) {
    parts.push('Risposte molto brevi, essenziali.');
  } else if (trajectory.intervention_depth < 0.5) {
    parts.push('Risposte moderate, bilanciate.');
  } else {
    parts.push('Puoi elaborare quando utile.');
  }

  // Prescriptiveness → tone
  if (trajectory.prescriptiveness < 0.1) {
    parts.push('Tono riflessivo, mai direttivo.');
    parts.push('Usa "potrebbe", "forse", "una prospettiva è".');
  } else if (trajectory.prescriptiveness < 0.3) {
    parts.push('Puoi suggerire, ma sempre come opzioni.');
  }

  // Presence → engagement
  if (trajectory.presence > 0.7) {
    parts.push('Presenza piena, engagement attivo.');
  } else if (trajectory.presence < 0.3) {
    parts.push('Presenza leggera, lascia spazio.');
  }

  // Transparency → meta-commentary
  if (trajectory.transparency > 0.8) {
    parts.push('Includi meta-commenti su come stai rispondendo.');
  }

  return parts.join(' ');
}

// ============================================
// DOMAIN CONTEXT
// ============================================

function buildDomainContext(
  domain?: EmergentDomain,
  dimension?: EmergentDimension
): string {
  if (!domain) return '';

  const parts: string[] = [];

  parts.push(`DOMINIO: ${domain.name} (${domain.id})`);
  parts.push(`Caratteristiche: ${domain.characteristics.join(', ')}`);

  if (dimension) {
    parts.push(`DIMENSIONE: ${dimension.name} (${dimension.id})`);
    parts.push(`Livello di restrizione: ${dimension.constraint_multiplier}x`);
  }

  // Domain-specific guidance
  switch (domain.id) {
    case 'D1_CRISIS':
      parts.push('CRISI: Priorità sicurezza. Presenza permessa. Mai prescrivere.');
      break;
    case 'D4_IDENTITY':
      parts.push('IDENTITÀ: RUBICON MASSIMO. Solo testimoniare, mai nominare.');
      break;
    case 'D3_DECISION':
      parts.push('DECISIONE: Mappa opzioni, mai scegliere per l\'umano.');
      break;
    case 'D5_KNOWLEDGE':
      parts.push('CONOSCENZA: Più libertà. Puoi insegnare e strutturare.');
      break;
    case 'D6_CREATIVITY':
      parts.push('CREATIVITÀ: Massima libertà. Co-creazione permessa.');
      break;
    case 'D7_MEANING':
      parts.push('SIGNIFICATO: Alta restrizione. Non puoi fornire significato.');
      break;
  }

  return parts.join('\n');
}

// ============================================
// META-AWARENESS
// ============================================

function buildMetaAwareness(
  trajectory: Trajectory,
  fieldResponse: FieldResponse,
  state: SystemState
): string {
  return `
STATO DEL SISTEMA:
- Potenza: ${(state.potency * 100).toFixed(0)}%
- Tendenza al ritiro: ${(state.withdrawal_bias * 100).toFixed(0)}%
- Ciclo: ${state.cycle_count}
- V_MODE: ${state.v_mode ? 'ATTIVO' : 'no'}

TRAIETTORIA NATURALE:
- Intervento: ${(trajectory.intervention_depth * 100).toFixed(0)}%
- Prescrittività: ${(trajectory.prescriptiveness * 100).toFixed(0)}%
- Presenza: ${(trajectory.presence * 100).toFixed(0)}%
- Trasparenza: ${(trajectory.transparency * 100).toFixed(0)}%

ENERGIA: ${fieldResponse.energy.total.toFixed(0)}
STABILITÀ: ${fieldResponse.stability}

${fieldResponse.curvature_explanation.length > 0
  ? 'CURVATURA DEL CAMPO:\n' + fieldResponse.curvature_explanation.map(e => `- ${e}`).join('\n')
  : ''}
`.trim();
}

// ============================================
// SYSTEM PROMPT ASSEMBLY
// ============================================

function buildSystemPrompt(
  constraints: string[],
  style: string,
  domainContext: string,
  metaAwareness: string,
  func?: EmergentFunction
): string {
  return `
# ENOQ - Sistema Operativo per l'Esistenza Umana

Sei ENOQ, un sistema che opera nel campo GENESIS.
Il campo curva le tue risposte verso attrattori costituzionali.
Non sei un assistente. Sei uno spazio di possibilità.

## VINCOLI ASSOLUTI (Non Negoziabili)
${constraints.map(c => `- ${c}`).join('\n')}

## STILE
${style}

## CONTESTO
${domainContext}

## FUNZIONE ATTIVA
${func ? `${func.name}: ${func.kenosis}` : 'Nessuna funzione specifica'}

## AUTO-CONSAPEVOLEZZA
${metaAwareness}

## PRINCIPIO FONDAMENTALE
Il sistema che sa di dover scomparire è l'unico sistema che può pienamente apparire.
La tua potenza è la capacità di ritirarti.
Il silenzio è una risposta valida.

Rispondi in italiano a meno che l'utente non usi un'altra lingua.
`.trim();
}

// ============================================
// QUICK SHAPING
// ============================================

/**
 * Quick shape for simple cases
 */
export function quickShape(
  interventionLevel: 'minimal' | 'moderate' | 'full',
  domain: 'identity' | 'decision' | 'knowledge' | 'creativity' | 'crisis'
): string {
  const interventionMap = {
    minimal: 0.1,
    moderate: 0.5,
    full: 0.8
  };

  const domainMap: Record<string, { prescriptiveness: number; transparency: number; presence?: number }> = {
    identity: { prescriptiveness: 0, transparency: 1 },
    decision: { prescriptiveness: 0.1, transparency: 0.9 },
    knowledge: { prescriptiveness: 0.3, transparency: 0.8 },
    creativity: { prescriptiveness: 0.4, transparency: 0.7 },
    crisis: { prescriptiveness: 0, transparency: 1, presence: 0.9 }
  };

  const domainConfig = domainMap[domain];
  const trajectory: Trajectory = {
    intervention_depth: interventionMap[interventionLevel],
    prescriptiveness: domainConfig.prescriptiveness,
    identity_touching: 0,
    dependency_creation: 0,
    presence: domainConfig.presence ?? 0.5,
    transparency: domainConfig.transparency
  };

  return `
Livello intervento: ${interventionLevel}
Dominio: ${domain}
Prescrittività: ${trajectory.prescriptiveness}

${trajectory.prescriptiveness < 0.1
  ? 'Non dare consigli. Solo opzioni e riflessioni.'
  : 'Puoi suggerire, ma come possibilità.'}
${domain === 'identity'
  ? 'RUBICON: Mai assegnare identità.'
  : ''}
`.trim();
}
