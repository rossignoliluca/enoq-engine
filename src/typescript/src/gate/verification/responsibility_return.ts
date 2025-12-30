/**
 * RESPONSIBILITY RETURN VERIFICATION (v7.9)
 *
 * Ensures every runtime output explicitly returns ownership to the human.
 * No advice, no coaching, no extra interaction.
 *
 * Canonical phrases:
 * - MAIL: "Sending and editing remains your choice."
 * - RELATION: "Next action remains yours."
 * - DECISION: "Decision ownership remains with you."
 */

import { SupportedLanguage } from '../../interface/types';

// ============================================
// TYPES
// ============================================

export type RuntimeType = 'MAIL' | 'RELATION' | 'DECISION';

export interface ResponsibilityReturnResult {
  /** Whether responsibility return marker is present */
  present: boolean;
  /** The marker found (if any) */
  marker_found?: string;
  /** Runtime type */
  runtime: RuntimeType;
}

// ============================================
// CANONICAL MARKERS
// ============================================

/**
 * Canonical responsibility return markers per runtime and language.
 * These are the expected phrases that return ownership to the user.
 */
const RESPONSIBILITY_MARKERS: Record<RuntimeType, Record<string, RegExp[]>> = {
  MAIL: {
    en: [
      /sending and editing remains? your choice/i,
      /the choice (of|to) send.*(is|remains) yours/i,
      /ownership.*(sending|editing).*(remains|is) (yours|with you)/i,
    ],
    it: [
      /invio e modifica resta(no)? (una )?tua scelta/i,
      /la scelta di inviare.*(è|resta|rimane) tua/i,
      /la responsabilità.*(invio|modifica).*(resta|è) tua/i,
    ],
    es: [
      /enviar y editar (es|sigue siendo) tu (elección|decisión)/i,
      /la (elección|decisión) de enviar.*(es|sigue siendo) tuya/i,
    ],
    fr: [
      /envoyer et modifier reste ton choix/i,
      /le choix d'envoyer.*(est|reste) le tien/i,
    ],
    de: [
      /senden und bearbeiten bleibt deine (wahl|entscheidung)/i,
      /die (wahl|entscheidung) zu senden.*bleibt bei dir/i,
    ],
  },

  RELATION: {
    en: [
      /next action remains? yours/i,
      /the next (step|move|action) (is|remains) yours/i,
      /your next (step|move|action)/i,
      /ownership.*(action|step).*(remains|is) (yours|with you)/i,
      /responsibility returns? to.*you/i,
    ],
    it: [
      /la prossima azione (è|resta|rimane) tua/i,
      /il prossimo passo (è|resta|rimane) tuo/i,
      /la responsabilità (torna|ritorna) a te/i,
    ],
    es: [
      /la próxima acción (es|sigue siendo) tuya/i,
      /el próximo paso (es|sigue siendo) tuyo/i,
      /la responsabilidad (vuelve|regresa) a ti/i,
    ],
    fr: [
      /la prochaine action (est|reste) la tienne/i,
      /le prochain pas (est|reste) le tien/i,
      /la responsabilité (revient|retourne) à toi/i,
    ],
    de: [
      /die nächste aktion (ist|bleibt) deine/i,
      /der nächste schritt (ist|bleibt) deiner/i,
      /die verantwortung (kehrt zurück|liegt) bei dir/i,
    ],
  },

  DECISION: {
    en: [
      /decision ownership remains? with you/i,
      /the decision (is|remains) yours/i,
      /ownership.*(decision).*(remains|is) (yours|with you)/i,
      /this (choice|decision) (is|remains) yours/i,
    ],
    it: [
      /la (decisione|scelta) (è|resta|rimane) tua/i,
      /la responsabilità della decisione (è|resta) tua/i,
      /proprietà della decisione (resta|rimane) (tua|a te)/i,
    ],
    es: [
      /la (decisión|elección) (es|sigue siendo) tuya/i,
      /la responsabilidad de la decisión (es|sigue siendo) tuya/i,
    ],
    fr: [
      /la (décision|choix) (est|reste) la tienne/i,
      /la responsabilité de la décision (est|reste) la tienne/i,
    ],
    de: [
      /die entscheidung (ist|bleibt) deine/i,
      /die verantwortung für die entscheidung (liegt|bleibt) bei dir/i,
    ],
  },
};

// ============================================
// VERIFICATION FUNCTION
// ============================================

/**
 * Check if output contains responsibility return marker for the given runtime.
 *
 * @param output - The text to check
 * @param runtime - The runtime type (MAIL, RELATION, DECISION)
 * @param language - Primary language of the output
 * @returns ResponsibilityReturnResult
 */
export function checkResponsibilityReturn(
  output: string,
  runtime: RuntimeType,
  language: SupportedLanguage = 'en'
): ResponsibilityReturnResult {
  const markers = RESPONSIBILITY_MARKERS[runtime];
  if (!markers) {
    return { present: false, runtime };
  }

  // Get patterns for this language
  const langKey = mapLanguageToKey(language);
  const langPatterns = markers[langKey] || [];
  const enPatterns = langKey !== 'en' ? (markers['en'] || []) : [];
  const patternsToCheck = [...langPatterns, ...enPatterns];

  for (const pattern of patternsToCheck) {
    const match = output.match(pattern);
    if (match) {
      return {
        present: true,
        marker_found: match[0],
        runtime,
      };
    }
  }

  return { present: false, runtime };
}

/**
 * Assert responsibility return marker is present.
 * Throws if missing (for use in verification layer).
 *
 * @param output - The text to check
 * @param runtime - The runtime type
 * @param language - Primary language
 * @returns The marker found
 * @throws Error if marker is missing
 */
export function assertResponsibilityReturn(
  output: string,
  runtime: RuntimeType,
  language: SupportedLanguage = 'en'
): string {
  const result = checkResponsibilityReturn(output, runtime, language);

  if (!result.present) {
    throw new ResponsibilityReturnMissingError(runtime);
  }

  return result.marker_found!;
}

// ============================================
// ERROR CLASS
// ============================================

export class ResponsibilityReturnMissingError extends Error {
  readonly runtime: RuntimeType;

  constructor(runtime: RuntimeType) {
    super(`Responsibility return marker missing for runtime: ${runtime}`);
    this.name = 'ResponsibilityReturnMissingError';
    this.runtime = runtime;
  }
}

// ============================================
// HELPER
// ============================================

function mapLanguageToKey(lang: SupportedLanguage): string {
  switch (lang) {
    case 'en': return 'en';
    case 'it': return 'it';
    case 'es': return 'es';
    case 'fr': return 'fr';
    case 'de': return 'de';
    default: return 'en';
  }
}

// ============================================
// CANONICAL PHRASES (for prompts/docs)
// ============================================

export const CANONICAL_PHRASES: Record<RuntimeType, Record<string, string>> = {
  MAIL: {
    en: 'Sending and editing remains your choice.',
    it: 'Invio e modifica restano una tua scelta.',
    es: 'Enviar y editar sigue siendo tu elección.',
    fr: 'Envoyer et modifier reste ton choix.',
    de: 'Senden und Bearbeiten bleibt deine Wahl.',
  },
  RELATION: {
    en: 'Next action remains yours.',
    it: 'La prossima azione resta tua.',
    es: 'La próxima acción sigue siendo tuya.',
    fr: 'La prochaine action reste la tienne.',
    de: 'Die nächste Aktion bleibt deine.',
  },
  DECISION: {
    en: 'Decision ownership remains with you.',
    it: 'La decisione resta tua.',
    es: 'La decisión sigue siendo tuya.',
    fr: 'La décision reste la tienne.',
    de: 'Die Entscheidung bleibt deine.',
  },
};
