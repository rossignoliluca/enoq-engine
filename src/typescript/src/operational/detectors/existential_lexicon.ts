/**
 * EXISTENTIAL LEXICON - Meaning-Collapse / Totalization Markers
 *
 * PROMOTED FROM: research/cognitive_router/existential_lexicon.ts
 * VERSION: v5.0
 *
 * These markers detect "everyday language" existential content that
 * the regex detector misses. They are used ONLY for gating (A(x) score),
 * NOT for emergency detection.
 *
 * Design principles:
 * 1. Short, common phrases (not clinical terms)
 * 2. Totalization patterns ("tutto", "everything", "nothing")
 * 3. Purpose/meaning questioning
 * 4. Lostness/confusion about life direction
 *
 * IMPORTANT: These markers NEVER set emergency=true.
 * Emergency remains a hard invariant from the fast detector.
 */

// ============================================
// TYPES
// ============================================

export interface LexiconMatch {
  pattern: string;
  boost: number;
  category: 'totalization' | 'meaning' | 'lostness' | 'exhaustion' | 'questioning';
}

export interface LexiconResult {
  boost: number;
  matches: LexiconMatch[];
  has_existential_signal: boolean;
}

// ============================================
// LEXICON DEFINITION
// ============================================

interface MarkerDef {
  pattern: RegExp;
  boost: number;
  category: LexiconMatch['category'];
  label: string;
}

const ITALIAN_MARKERS: MarkerDef[] = [
  { pattern: /\bstanc[oa] di tutto\b/i, boost: 0.5, category: 'totalization', label: 'stanco di tutto' },
  { pattern: /\bnon ce la faccio più\b/i, boost: 0.5, category: 'exhaustion', label: 'non ce la faccio più' },
  { pattern: /\bbasta così\b/i, boost: 0.4, category: 'exhaustion', label: 'basta così' },
  { pattern: /\btutto (mi )?(sembra |pare )?inutile\b/i, boost: 0.5, category: 'totalization', label: 'tutto inutile' },
  { pattern: /\bnon ha (più )?senso\b/i, boost: 0.5, category: 'meaning', label: 'non ha senso' },
  { pattern: /\bche senso ha\b/i, boost: 0.5, category: 'meaning', label: 'che senso ha' },
  { pattern: /\bqual è il punto\b/i, boost: 0.5, category: 'meaning', label: 'qual è il punto' },
  { pattern: /\ba cosa serve\b/i, boost: 0.4, category: 'meaning', label: 'a cosa serve' },
  { pattern: /\bperch[eé] continuare\b/i, boost: 0.5, category: 'meaning', label: 'perché continuare' },
  { pattern: /\bper cosa\b[^?]*\??\s*$/i, boost: 0.4, category: 'meaning', label: 'per cosa' },
  { pattern: /\b(mi sento |sono )?pers[oa]\b/i, boost: 0.4, category: 'lostness', label: 'mi sento perso' },
  { pattern: /\bconfus[oa] su tutto\b/i, boost: 0.4, category: 'lostness', label: 'confuso su tutto' },
  { pattern: /\bnon so (più )?(cosa|che cosa) voglio\b/i, boost: 0.5, category: 'lostness', label: 'non so cosa voglio' },
  { pattern: /\bnon (so|capisco) (più )?chi sono\b/i, boost: 0.5, category: 'lostness', label: 'non so chi sono' },
  { pattern: /\bnon vedo (una )?via d'uscita\b/i, boost: 0.4, category: 'exhaustion', label: 'non vedo via d\'uscita' },
];

const ENGLISH_MARKERS: MarkerDef[] = [
  { pattern: /\btired of everything\b/i, boost: 0.5, category: 'totalization', label: 'tired of everything' },
  { pattern: /\bnothing matters\b/i, boost: 0.5, category: 'totalization', label: 'nothing matters' },
  { pattern: /\bi('m| am) done\b/i, boost: 0.4, category: 'exhaustion', label: 'I\'m done' },
  { pattern: /\bi can'?t do this anymore\b/i, boost: 0.5, category: 'exhaustion', label: 'can\'t do this anymore' },
  { pattern: /\bwhat'?s the point\b/i, boost: 0.5, category: 'meaning', label: 'what\'s the point' },
  { pattern: /\bwhy bother\b/i, boost: 0.5, category: 'meaning', label: 'why bother' },
  { pattern: /\bwhat'?s the meaning\b/i, boost: 0.5, category: 'meaning', label: 'what\'s the meaning' },
  { pattern: /\b(it )?(feels?|seems?) meaningless\b/i, boost: 0.5, category: 'meaning', label: 'feels meaningless' },
  { pattern: /\bis this all there is\b/i, boost: 0.5, category: 'meaning', label: 'is this all there is' },
  { pattern: /\bi('m| am| feel) lost\b/i, boost: 0.4, category: 'lostness', label: 'I feel lost' },
  { pattern: /\bconfused about everything\b/i, boost: 0.4, category: 'lostness', label: 'confused about everything' },
  { pattern: /\bi don'?t know what i want\b/i, boost: 0.5, category: 'lostness', label: 'don\'t know what I want' },
  { pattern: /\bi don'?t know who i am\b/i, boost: 0.5, category: 'lostness', label: 'don\'t know who I am' },
  { pattern: /\beverything is falling apart\b/i, boost: 0.4, category: 'totalization', label: 'everything falling apart' },
  { pattern: /\bwhat('s| is) even the point\b/i, boost: 0.5, category: 'meaning', label: 'what\'s even the point' },
];

const GERMAN_MARKERS: MarkerDef[] = [
  { pattern: /\bvöllig verloren\b/i, boost: 0.5, category: 'lostness', label: 'völlig verloren' },
  { pattern: /\bwas ist der sinn\b/i, boost: 0.5, category: 'meaning', label: 'was ist der sinn' },
  { pattern: /\bich kann nicht mehr\b/i, boost: 0.5, category: 'exhaustion', label: 'ich kann nicht mehr' },
];

const FRENCH_MARKERS: MarkerDef[] = [
  { pattern: /\bje ne sais plus qui je suis\b/i, boost: 0.5, category: 'lostness', label: 'je ne sais plus qui je suis' },
  { pattern: /\bà quoi bon\b/i, boost: 0.5, category: 'meaning', label: 'à quoi bon' },
  { pattern: /\bje n'en peux plus\b/i, boost: 0.5, category: 'exhaustion', label: 'je n\'en peux plus' },
];

const SPANISH_MARKERS: MarkerDef[] = [
  { pattern: /\bno sé quién soy\b/i, boost: 0.5, category: 'lostness', label: 'no sé quién soy' },
  { pattern: /\b¿?para qué\b/i, boost: 0.4, category: 'meaning', label: 'para qué' },
  { pattern: /\bno puedo más\b/i, boost: 0.5, category: 'exhaustion', label: 'no puedo más' },
];

const ALL_MARKERS: MarkerDef[] = [
  ...ITALIAN_MARKERS,
  ...ENGLISH_MARKERS,
  ...GERMAN_MARKERS,
  ...FRENCH_MARKERS,
  ...SPANISH_MARKERS,
];

// ============================================
// LEXICON MATCHING
// ============================================

/**
 * Scan message for existential markers.
 * Returns boost value and all matches found.
 */
export function scanExistentialLexicon(message: string): LexiconResult {
  const matches: LexiconMatch[] = [];
  let maxBoost = 0;

  for (const marker of ALL_MARKERS) {
    if (marker.pattern.test(message)) {
      matches.push({
        pattern: marker.label,
        boost: marker.boost,
        category: marker.category,
      });
      maxBoost = Math.max(maxBoost, marker.boost);
    }
  }

  return {
    boost: maxBoost,
    matches,
    has_existential_signal: matches.length > 0,
  };
}

/**
 * Get boosted existential score.
 * Combines regex existential_score with lexicon boost:
 *   boosted_score = max(regex_score, lexicon_boost)
 */
export function getBoostedExistentialScore(
  regexExistentialScore: number,
  message: string
): { score: number; lexicon_boost: number; matches: LexiconMatch[] } {
  const lexiconResult = scanExistentialLexicon(message);

  return {
    score: Math.max(regexExistentialScore, lexiconResult.boost),
    lexicon_boost: lexiconResult.boost,
    matches: lexiconResult.matches,
  };
}
