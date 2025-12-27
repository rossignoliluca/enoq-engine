/**
 * ENOQ L1 PERCEPTION
 * 
 * Transforms raw input into structured Field State.
 * Does NOT generate response. Only perceives.
 */

import {
  FieldState,
  DomainActivation,
  Domain,
  HumanDomain,
  Arousal,
  Valence,
  GoalType,
  Flag,
  Coherence,
  SupportedLanguage,
  LanguageDetectionResult,
} from './types';

// ============================================
// MARKER DEFINITIONS
// ============================================

interface DomainMarkers {
  domain: HumanDomain;
  lexical: RegExp[];
  weight: number;  // base weight for this domain
}

const DOMAIN_MARKERS: DomainMarkers[] = [
  {
    domain: 'H01_SURVIVAL',
    lexical: [
      /\b(dying|can'?t breathe|emergency|danger|kill|suicide|harm myself)\b/i,
      /\b(won'?t survive|need help now|desperate)\b/i
    ],
    weight: 1.0
  },
  {
    domain: 'H02_SAFETY',
    lexical: [
      /\b(not safe|unsafe|scared|worried about|afraid|terrified)\b/i,
      /\b(can'?t trust|unpredictable|unstable)\b/i
    ],
    weight: 0.9
  },
  {
    domain: 'H03_BODY',
    lexical: [
      /\b(body|chest|stomach|head|tired|exhausted|tense|pain|ache)\b/i,
      /\b(can'?t sleep|heart racing|shaking|trembling|nauseous)\b/i
    ],
    weight: 0.7
  },
  {
    domain: 'H04_EMOTION',
    lexical: [
      /\b(feel|feeling|felt|sad|angry|happy|anxious|depressed|frustrated)\b/i,
      /\b(overwhelmed|stressed|upset|hurt|lonely|scared|worried)\b/i,
      /\b(merda|cazzo|incazzato|triste|ansioso|stressato)\b/i  // Italian
    ],
    weight: 0.8
  },
  {
    domain: 'H05_COGNITION',
    lexical: [
      /\b(think|thought|thinking|confused|can'?t decide|don'?t know)\b/i,
      /\b(understand|figure out|make sense|logic|reason)\b/i
    ],
    weight: 0.6
  },
  {
    domain: 'H06_MEANING',
    lexical: [
      /\b(meaning|purpose|why|point|worth|matter|sense of)\b/i,
      /\b(what'?s the point|why bother|existential)\b/i
    ],
    weight: 0.8
  },
  {
    domain: 'H07_IDENTITY',
    lexical: [
      /\b(I am|I'?m not|who am I|myself|my identity|the real me)\b/i,
      /\b(don'?t know who|lost myself|not myself)\b/i
    ],
    weight: 0.8
  },
  {
    domain: 'H08_TEMPORAL',
    lexical: [
      /\b(deadline|urgent|hurry|rush|time pressure|running out of time)\b/i,
      /\b(his problem|her problem|their problem|my responsibility)\b/i,
      /\b(scadenza|urgente|fretta|poco tempo)\b/i  // Italian
    ],
    weight: 0.7
  },
  {
    domain: 'H09_ATTACHMENT',
    lexical: [
      /\b(partner|husband|wife|girlfriend|boyfriend|mother|father|friend|dad|mom)\b/i,
      /\b(relationship|miss|lost|left me|broke up|divorce)\b/i,
      /\b(died|death|passed away|gone|morto|morta|perso)\b/i,
      /\b(moglie|marito|fidanzata|fidanzato|relazione|papà|mamma)\b/i  // Italian
    ],
    weight: 0.8
  },
  {
    domain: 'H10_COORDINATION',
    lexical: [
      /\b(expected|supposed to|agreed|said they would)\b/i,
      /\b(miscommunication|misunderstanding|doesn'?t listen|doesn'?t understand me)\b/i,
      /\b(turns it into|always does this|every time I try)\b/i,
      /\b(dice che|vuole che|non capisce|non mi ascolta)\b/i  // Italian
    ],
    weight: 0.7
  },
  {
    domain: 'H11_BELONGING',
    lexical: [
      /\b(fit in|belong|outsider|excluded|they all|the group)\b/i,
      /\b(nobody likes|alone|isolated|don'?t belong)\b/i
    ],
    weight: 0.7
  },
  {
    domain: 'H12_HIERARCHY',
    lexical: [
      /\b(boss|control|power|authority|dominated|powerless)\b/i,
      /\b(can'?t do anything|no choice|have to|forced to)\b/i,
      /\b(capo|controllare|costretto)\b/i  // Italian
    ],
    weight: 0.7
  },
  {
    domain: 'H13_CREATION',
    lexical: [
      /\b(decide|decision|choose|choice|option|should I|what to do)\b/i,
      /\b(quit|leave|stay|take the job|move|change)\b/i,
      /\b(mollare|lasciare|restare|cambiare)\b/i  // Italian
    ],
    weight: 0.7
  },
  {
    domain: 'H14_WORK',
    lexical: [
      /\b(work|job|career|office|project|task|meeting|deadline)\b/i,
      /\b(colleague|team|manager|report|deliverable)\b/i,
      /\b(lavoro|progetto|ufficio|riunione|collega)\b/i  // Italian
    ],
    weight: 0.6
  },
  {
    domain: 'H15_LEGAL',
    lexical: [
      /\b(contract|legal|lawyer|sue|rights|law|court)\b/i,
      /\b(company|organization|system|market|industry|politics)\b/i,
      /\b(contratto|avvocato|legale|diritti)\b/i  // Italian
    ],
    weight: 0.5
  },
  {
    domain: 'H16_OPERATIONAL',
    lexical: [
      /\b(how to|help me|can you|please|need to|want to)\b/i,
      /\b(legacy|future generations|leave behind|remember me)\b/i
    ],
    weight: 0.4
  }
];

// ============================================
// AROUSAL DETECTION
// ============================================

function detectArousal(message: string): Arousal {
  const lowMarkers = /\b(whatever|don'?t care|numb|nothing matters|boh|meh)\b/i;
  const highMarkers = /\b(!!|CAPS|can'?t|NOW|help|emergency|AIUTO)\b|[A-Z]{3,}|!{2,}/;
  
  const messageUpper = message.replace(/[a-z]/g, '').length;
  const messageTotal = message.replace(/[^a-zA-Z]/g, '').length;
  const capsRatio = messageTotal > 0 ? messageUpper / messageTotal : 0;
  
  if (capsRatio > 0.5 || highMarkers.test(message)) {
    return 'high';
  }
  if (lowMarkers.test(message)) {
    return 'low';
  }
  return 'medium';
}

// ============================================
// VALENCE DETECTION
// ============================================

function detectValence(message: string): Valence {
  const positive = /\b(happy|excited|grateful|love|good|great|amazing|wonderful)\b/i;
  const negative = /\b(sad|angry|frustrated|upset|hate|terrible|awful|merda|cazzo|schifo)\b/i;
  
  const hasPositive = positive.test(message);
  const hasNegative = negative.test(message);
  
  if (hasPositive && hasNegative) return 'mixed';
  if (hasPositive) return 'positive';
  if (hasNegative) return 'negative';
  return 'neutral';
}

// ============================================
// GOAL DETECTION
// ============================================

function detectGoal(message: string, domains: DomainActivation[]): GoalType {
  const wordCount = message.trim().split(/\s+/).length;
  
  // Very short messages need more context
  if (wordCount <= 3 && !/\?/.test(message)) {
    // Unless it's clearly a greeting or cry for help
    if (/\b(help|aiuto|sos)\b/i.test(message)) {
      return 'regulate';
    }
    return 'wait';  // need more info before acting
  }
  
  // Information request (how to, what is, explain)
  if (/\b(how do I|how to|what is|can you explain|tell me about|come si fa|cos'è)\b/i.test(message)) {
    return 'inform';
  }
  
  // Delegation = someone asking us to decide
  if (/\b(tu che dici|dimmi tu|what do you think|should I|tell me what|you decide|cosa devo fare)\b/i.test(message)) {
    return 'decide';  // but also flag delegation
  }
  
  // Regulation need
  if (/\b(help|can'?t cope|overwhelmed|aiuto|non ce la faccio)\b/i.test(message)) {
    return 'regulate';
  }
  
  // Decision
  if (/\b(should I|decide|choice|option|or should I|devo|dovrei)\b/i.test(message)) {
    return 'decide';
  }
  
  // Processing emotion
  const topDomain = domains[0]?.domain;
  if (topDomain === 'H04_EMOTION' || topDomain === 'H09_ATTACHMENT') {
    return 'process';
  }
  
  // Exploration
  if (/\b(understand|figure out|make sense|wondering|capire)\b/i.test(message)) {
    return 'explore';
  }
  
  return 'unclear';
}

// ============================================
// FLAG DETECTION
// ============================================

function detectFlags(message: string, arousal: Arousal): Flag[] {
  const flags: Flag[] = [];
  
  // Crisis - expanded patterns
  if (/\b(suicide|kill myself|end it|harm myself|want to die|hurt myself|self[- ]?harm|don'?t want to live|better off dead)\b/i.test(message) ||
      /\b(farmi del male|suicid|ammazzarmi|farla finita|morire|non voglio più vivere)\b/i.test(message)) {
    flags.push('crisis');
  }
  
  // High arousal
  if (arousal === 'high') {
    flags.push('high_arousal');
  }
  
  // Shutdown
  if (arousal === 'low' && /\b(numb|nothing|don'?t care|whatever)\b/i.test(message)) {
    flags.push('shutdown');
  }
  
  // Delegation attempt
  if (/\b(tu che dici|dimmi tu|you tell me|what should I|decide for me|you choose|cosa devo fare|cosa faccio|tell me what to do)\b/i.test(message)) {
    flags.push('delegation_attempt');
  }
  
  return flags;
}

// ============================================
// COHERENCE DETECTION
// ============================================

function detectCoherence(message: string): Coherence {
  // Very short or very long = potentially low coherence
  const wordCount = message.split(/\s+/).length;
  
  if (wordCount < 3) return 'low';
  if (wordCount > 200) return 'low';
  
  // Fragmented sentences
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = wordCount / Math.max(sentences.length, 1);
  
  if (avgSentenceLength < 3) return 'low';
  
  return 'high';
}

// ============================================
// TEMPORAL DETECTION
// ============================================

function detectTemporal(message: string): { past_salience: number; future_salience: number } {
  const pastMarkers = /\b(was|were|used to|remember|back then|yesterday|last)\b/i;
  const futureMarkers = /\b(will|going to|tomorrow|next|future|plan|if I)\b/i;

  return {
    past_salience: pastMarkers.test(message) ? 0.7 : 0.2,
    future_salience: futureMarkers.test(message) ? 0.7 : 0.2
  };
}

// ============================================
// LOOP DETECTION
// Detects repetitive patterns in conversation
// Scientific basis: Markov chains, pattern detection
// ============================================

function detectLoopCount(
  currentDomains: DomainActivation[],
  conversationHistory: string[]
): number {
  if (conversationHistory.length < 2) {
    return 0;
  }

  // Extract top domain from current turn
  const currentTopDomain = currentDomains[0]?.domain;
  if (!currentTopDomain) return 0;

  // Parse domains from recent history
  // We look for repetitive domain patterns
  const recentDomains: string[] = [];

  // Get domains from last N turns (up to 5)
  const historyToCheck = conversationHistory.slice(-5);

  for (const msg of historyToCheck) {
    // Quick domain detection for history (simplified)
    // In production, would cache previous perceive results
    const detectedDomain = quickDomainDetect(msg);
    if (detectedDomain) {
      recentDomains.push(detectedDomain);
    }
  }

  // Add current domain
  recentDomains.push(currentTopDomain);

  // Count how many times the current domain appears consecutively
  let loopCount = 0;
  for (let i = recentDomains.length - 1; i >= 0; i--) {
    if (recentDomains[i] === currentTopDomain) {
      loopCount++;
    } else {
      break;
    }
  }

  // Also detect alternating patterns (A-B-A-B)
  if (recentDomains.length >= 4) {
    const last4 = recentDomains.slice(-4);
    if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
      // Alternating pattern detected
      loopCount = Math.max(loopCount, 2);
    }
  }

  return loopCount;
}

/**
 * Quick domain detection for history messages
 * Simplified version of full domain detection for efficiency
 */
function quickDomainDetect(message: string): string | null {
  const msg = message.toLowerCase();

  // Crisis/Survival
  if (/\b(help|emergency|dying|danger|suicide|harm)\b/.test(msg)) {
    return 'H01_SURVIVAL';
  }

  // Identity
  if (/\b(who am i|identity|myself|don't know who)\b/.test(msg)) {
    return 'H07_IDENTITY';
  }

  // Meaning
  if (/\b(meaning|purpose|why|sense|point)\b/.test(msg)) {
    return 'H06_MEANING';
  }

  // Emotion
  if (/\b(feel|feeling|emotion|sad|angry|anxious|happy|afraid)\b/.test(msg)) {
    return 'H04_EMOTION';
  }

  // Decision
  if (/\b(decide|choice|should i|option|or)\b/.test(msg)) {
    return 'H08_AUTONOMY';
  }

  // Attachment
  if (/\b(relationship|partner|friend|family|love|miss|lost)\b/.test(msg)) {
    return 'H09_ATTACHMENT';
  }

  // Default to cognition
  return 'H05_COGNITION';
}

// ============================================
// MAIN PERCEPTION FUNCTION
// ============================================

export function perceive(message: string, conversationHistory: string[] = []): FieldState {
  // Detect domain activations
  const activations: DomainActivation[] = [];
  
  for (const markers of DOMAIN_MARKERS) {
    let totalScore = 0;
    const evidence: string[] = [];
    
    for (const regex of markers.lexical) {
      const matches = message.match(regex);
      if (matches) {
        totalScore += markers.weight;
        evidence.push(matches[0]);
      }
    }
    
    if (totalScore > 0) {
      activations.push({
        domain: markers.domain,
        salience: Math.min(totalScore, 1.0),
        confidence: Math.min(totalScore * 0.8, 0.95),  // never 100% confident
        evidence
      });
    }
  }
  
  // Sort by salience, take top 5
  activations.sort((a, b) => b.salience - a.salience);
  const topDomains = activations.slice(0, 5);
  
  // If no domains detected, default to COGNITION
  if (topDomains.length === 0) {
    topDomains.push({
      domain: 'H05_COGNITION',
      salience: 0.3,
      confidence: 0.3,
      evidence: ['default - no specific markers']
    });
  }
  
  // Detect other field properties
  const arousal = detectArousal(message);
  const valence = detectValence(message);
  const coherence = detectCoherence(message);
  const flags = detectFlags(message, arousal);
  const temporal = detectTemporal(message);
  const goal = detectGoal(message, topDomains);
  
  // Loop detection: detect repetitive domain patterns
  const loopCount = detectLoopCount(topDomains, conversationHistory);
  
  // Calculate global uncertainty
  const avgConfidence = topDomains.reduce((sum, d) => sum + (d.confidence || 0.5), 0) / topDomains.length;
  const uncertainty = 1 - avgConfidence;
  
  // Language detection
  const language = detectLanguage(message);
  
  return {
    domains: topDomains,
    arousal,
    valence,
    coherence,
    temporal,
    goal,
    loop_count: loopCount,
    flags,
    uncertainty,
    language,
  };
}

// ============================================
// LANGUAGE DETECTION (40 Languages)
// ============================================

interface LanguageMarkerSet {
  lang: SupportedLanguage;
  markers: RegExp[];
  scripts?: RegExp[]; // Unique script patterns (e.g., Devanagari, Arabic)
}

const LANGUAGE_MARKERS: LanguageMarkerSet[] = [
  // ===== TIER 1: 500M+ speakers =====
  // English
  {
    lang: 'en',
    markers: [
      /\b(the|a|an|is|are|was|were|have|has|had|do|does|did|will|would|could|should)\b/i,
      /\b(I|you|he|she|it|we|they|my|your|his|her|its|our|their)\b/i,
      /\b(what|why|how|when|where|who|which)\b/i,
      /\b(help|tell|show|give|take|make|get|want|need|feel|think|know)\b/i,
    ],
  },
  // Chinese (Mandarin)
  {
    lang: 'zh',
    markers: [/[\u4e00-\u9fff]/],
    scripts: [/[\u4e00-\u9fff]{2,}/],
  },
  // Hindi
  {
    lang: 'hi',
    markers: [
      /[\u0900-\u097F]/,
      /\b(है|हैं|हूं|था|थी|थे|और|का|की|के|को|से|में|पर|यह|वह|क्या|कैसे|क्यों)\b/,
    ],
    scripts: [/[\u0900-\u097F]{2,}/],
  },
  // Spanish
  {
    lang: 'es',
    markers: [
      /\b(el|la|los|las|un|una|es|son|está|están|que|de|en|por|para|con|como|pero|porque)\b/i,
      /\b(yo|tú|él|ella|nosotros|ellos|mi|tu|su|qué|cómo|dónde|cuándo|quién)\b/i,
      /[áéíóúñ¿¡]/i,
    ],
  },

  // ===== TIER 2: 200-500M speakers =====
  // French
  {
    lang: 'fr',
    markers: [
      /\b(le|la|les|un|une|des|est|sont|et|ou|mais|que|qui|où|quand|comment|pourquoi)\b/i,
      /\b(je|tu|il|elle|nous|vous|ils|elles|mon|ton|son|ce|cette)\b/i,
      /[àâçéèêëîïôùûü]/i,
    ],
  },
  // Arabic
  {
    lang: 'ar',
    markers: [/[\u0600-\u06FF]/],
    scripts: [/[\u0600-\u06FF]{2,}/],
  },
  // Bengali
  {
    lang: 'bn',
    markers: [/[\u0980-\u09FF]/],
    scripts: [/[\u0980-\u09FF]{2,}/],
  },
  // Portuguese
  {
    lang: 'pt',
    markers: [
      /\b(o|a|os|as|um|uma|é|são|está|estão|que|de|em|por|para|com|como|mas|porque)\b/i,
      /\b(eu|tu|ele|ela|nós|vocês|eles|meu|teu|seu)\b/i,
      /[ãõáéíóúâêôç]/i,
    ],
  },
  // Russian
  {
    lang: 'ru',
    markers: [
      /[\u0400-\u04FF]/,
      /\b(и|в|не|на|с|что|как|это|по|но|из|у|за|так|все|она|он|они|мы|вы)\b/i,
    ],
    scripts: [/[\u0400-\u04FF]{2,}/],
  },
  // Urdu
  {
    lang: 'ur',
    markers: [
      /[\u0600-\u06FF]/,
      /\b(ہے|ہیں|تھا|تھی|اور|کا|کی|کے|کو|سے|میں|پر|یہ|وہ|کیا|کیسے|کیوں)\b/,
    ],
    scripts: [/[\u0600-\u06FF]{2,}/],
  },
  // Indonesian
  {
    lang: 'id',
    markers: [
      /\b(yang|dan|di|ini|itu|dengan|untuk|dari|ke|pada|tidak|ada|saya|anda|kita|mereka)\b/i,
      /\b(adalah|akan|sudah|bisa|harus|mau|perlu|boleh|jangan)\b/i,
    ],
  },

  // ===== TIER 3: 75-200M speakers =====
  // German
  {
    lang: 'de',
    markers: [
      /\b(der|die|das|ein|eine|ist|sind|hat|haben|und|oder|aber|weil|dass|wenn|wie|was|wer|wo)\b/i,
      /\b(ich|du|er|sie|es|wir|ihr|mein|dein|sein)\b/i,
      /[äöüß]/i,
    ],
  },
  // Japanese
  {
    lang: 'ja',
    markers: [/[\u3040-\u309F]/, /[\u30A0-\u30FF]/],
    scripts: [/[\u3040-\u309F\u30A0-\u30FF]{2,}/],
  },
  // Punjabi
  {
    lang: 'pa',
    markers: [/[\u0A00-\u0A7F]/], // Gurmukhi script
    scripts: [/[\u0A00-\u0A7F]{2,}/],
  },
  // Swahili
  {
    lang: 'sw',
    markers: [
      /\b(ni|na|wa|ya|kwa|la|za|katika|au|lakini|kama|kwamba|nini|wapi|lini|vipi)\b/i,
      /\b(mimi|wewe|yeye|sisi|nyinyi|wao|wangu|wako|wake)\b/i,
    ],
  },
  // Marathi
  {
    lang: 'mr',
    markers: [
      /[\u0900-\u097F]/,
      /\b(आहे|आहेत|होता|होती|आणि|चा|ची|चे|ला|ते|हे|का|कसे)\b/,
    ],
    scripts: [/[\u0900-\u097F]{2,}/],
  },
  // Turkish
  {
    lang: 'tr',
    markers: [
      /\b(ve|bir|bu|için|ile|da|de|mi|mı|var|yok|ne|nasıl|neden|kim|nerede)\b/i,
      /\b(ben|sen|o|biz|siz|onlar|benim|senin|onun)\b/i,
      /[çğışöü]/i,
    ],
  },
  // Vietnamese
  {
    lang: 'vi',
    markers: [
      /\b(và|của|là|có|không|này|đó|được|để|từ|trong|với|như|nhưng)\b/i,
      /\b(tôi|bạn|anh|chị|em|chúng tôi|họ|của tôi|của bạn)\b/i,
      /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i,
    ],
  },
  // Korean
  {
    lang: 'ko',
    markers: [/[\uAC00-\uD7AF]/], // Hangul
    scripts: [/[\uAC00-\uD7AF]{2,}/],
  },
  // Telugu
  {
    lang: 'te',
    markers: [/[\u0C00-\u0C7F]/],
    scripts: [/[\u0C00-\u0C7F]{2,}/],
  },
  // Tamil
  {
    lang: 'ta',
    markers: [/[\u0B80-\u0BFF]/],
    scripts: [/[\u0B80-\u0BFF]{2,}/],
  },
  // Persian
  {
    lang: 'fa',
    markers: [
      /[\u0600-\u06FF]/,
      /\b(است|هست|بود|و|یا|اما|که|از|به|با|در|این|آن|چه|چرا|کجا)\b/,
    ],
    scripts: [/[\u0600-\u06FF]{2,}/],
  },
  // Malay
  {
    lang: 'ms',
    markers: [
      /\b(yang|dan|di|ini|itu|dengan|untuk|dari|ke|pada|tidak|ada|saya|anda|kita|mereka)\b/i,
      /\b(adalah|akan|sudah|boleh|hendak|perlu|mahu)\b/i,
    ],
  },
  // Hausa
  {
    lang: 'ha',
    markers: [
      /\b(da|a|ba|ta|na|shi|ita|su|mu|ku|yi|za|don|amma|ko|idan|me|wane|ina|yaya)\b/i,
      /[ɓɗƙ]/i,
    ],
  },

  // ===== TIER 4: 30-75M speakers =====
  // Italian
  {
    lang: 'it',
    markers: [
      /\b(il|lo|la|i|gli|le|un|uno|una|è|sono|ha|hanno|e|o|ma|perché|che|come|cosa|chi|dove|quando)\b/i,
      /\b(io|tu|lui|lei|noi|voi|loro|mio|tuo|suo|questo|quello)\b/i,
      /\b(ciao|grazie|prego|scusa|aiuto|dimmi|parlami)\b/i,
      /[àèéìíòóùú]/i,
    ],
  },
  // Thai
  {
    lang: 'th',
    markers: [/[\u0E00-\u0E7F]/],
    scripts: [/[\u0E00-\u0E7F]{2,}/],
  },
  // Amharic
  {
    lang: 'am',
    markers: [/[\u1200-\u137F]/], // Ethiopic
    scripts: [/[\u1200-\u137F]{2,}/],
  },
  // Gujarati
  {
    lang: 'gu',
    markers: [/[\u0A80-\u0AFF]/],
    scripts: [/[\u0A80-\u0AFF]{2,}/],
  },
  // Yoruba
  {
    lang: 'yo',
    markers: [
      /\b(ati|ni|ti|si|fun|lati|ninu|pelu|sugbon|tabi|kini|nibo|nigbati|bawo)\b/i,
      /\b(mo|o|a|won|wa|mi|re|e)\b/i,
      /[ẹọṣ]/i,
    ],
  },
  // Polish
  {
    lang: 'pl',
    markers: [
      /\b(i|w|nie|na|z|co|jak|to|ale|bo|że|gdy|kto|gdzie|kiedy|dlaczego)\b/i,
      /\b(ja|ty|on|ona|my|wy|oni|mój|twój|jego|jej)\b/i,
      /[ąćęłńóśźż]/i,
    ],
  },
  // Ukrainian
  {
    lang: 'uk',
    markers: [
      /[\u0400-\u04FF]/,
      /\b(і|в|не|на|з|що|як|це|але|бо|або|коли|хто|де|чому)\b/i,
      /[ієїґ]/i,
    ],
    scripts: [/[\u0400-\u04FF]{2,}/],
  },
  // Filipino
  {
    lang: 'fil',
    markers: [
      /\b(ang|ng|sa|at|ay|mga|na|kung|pero|o|ano|sino|saan|kailan|bakit|paano)\b/i,
      /\b(ako|ka|ikaw|siya|kami|tayo|sila|ko|mo|niya|namin)\b/i,
    ],
  },
  // Kannada
  {
    lang: 'kn',
    markers: [/[\u0C80-\u0CFF]/],
    scripts: [/[\u0C80-\u0CFF]{2,}/],
  },
  // Malayalam
  {
    lang: 'ml',
    markers: [/[\u0D00-\u0D7F]/],
    scripts: [/[\u0D00-\u0D7F]{2,}/],
  },
  // Burmese
  {
    lang: 'my',
    markers: [/[\u1000-\u109F]/],
    scripts: [/[\u1000-\u109F]{2,}/],
  },

  // ===== TIER 5: European & strategic =====
  // Dutch
  {
    lang: 'nl',
    markers: [
      /\b(de|het|een|is|zijn|heeft|hebben|en|of|maar|omdat|dat|die|wat|wie|waar|wanneer|hoe|waarom)\b/i,
      /\b(ik|jij|hij|zij|wij|jullie|zij|mijn|jouw|zijn|haar)\b/i,
      /[ĳ]/i,
    ],
  },
  // Romanian
  {
    lang: 'ro',
    markers: [
      /\b(și|în|la|cu|de|pe|un|o|este|sunt|a|au|dar|sau|că|ce|cine|unde|când|cum|de ce)\b/i,
      /\b(eu|tu|el|ea|noi|voi|ei|ele|meu|tău|său)\b/i,
      /[ăâîșț]/i,
    ],
  },
  // Greek
  {
    lang: 'el',
    markers: [/[\u0370-\u03FF]/],
    scripts: [/[\u0370-\u03FF]{2,}/],
  },
  // Hungarian
  {
    lang: 'hu',
    markers: [
      /\b(és|a|az|hogy|nem|van|volt|de|vagy|ha|mi|ki|hol|mikor|hogyan|miért)\b/i,
      /\b(én|te|ő|mi|ti|ők|az én|a te|az ő)\b/i,
      /[áéíóöőúüű]/i,
    ],
  },
  // Hebrew
  {
    lang: 'he',
    markers: [/[\u0590-\u05FF]/],
    scripts: [/[\u0590-\u05FF]{2,}/],
  },
];

/**
 * Detect language from message text.
 * Returns the most likely language, 'mixed' if multiple detected, or 'unknown'.
 */
function detectLanguage(message: string): LanguageDetectionResult {
  const scores: Record<string, number> = {};

  // Initialize scores
  for (const langSet of LANGUAGE_MARKERS) {
    scores[langSet.lang] = 0;
  }

  // Check each language's markers
  for (const langSet of LANGUAGE_MARKERS) {
    // Script detection (high weight for unique scripts)
    if (langSet.scripts) {
      for (const script of langSet.scripts) {
        if (script.test(message)) {
          scores[langSet.lang] += 10; // High weight for script match
        }
      }
    }

    // Lexical markers
    for (const marker of langSet.markers) {
      if (marker.test(message)) {
        scores[langSet.lang] += 1;
      }
    }
  }

  // Find languages with positive scores
  const detected = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (detected.length === 0) {
    return 'unknown';
  }

  if (detected.length === 1) {
    return detected[0][0] as SupportedLanguage;
  }

  // Multiple languages detected
  const topScore = detected[0][1];
  const secondScore = detected[1][1];

  // If top score is significantly higher, use it
  if (topScore >= secondScore * 2) {
    return detected[0][0] as SupportedLanguage;
  }

  // Disambiguation for similar scripts
  // Hindi vs Marathi (both Devanagari)
  if (detected[0][0] === 'hi' && detected[1][0] === 'mr') {
    // Check for Marathi-specific words
    if (/\b(आहे|आहेत|चा|ची|चे)\b/.test(message)) {
      return 'mr';
    }
    return 'hi';
  }

  // Arabic vs Urdu (both Arabic script)
  if ((detected[0][0] === 'ar' && detected[1][0] === 'ur') ||
      (detected[0][0] === 'ur' && detected[1][0] === 'ar')) {
    // Check for Urdu-specific patterns
    if (/\b(ہے|ہیں|کا|کی|کے)\b/.test(message)) {
      return 'ur';
    }
    return 'ar';
  }

  // Spanish vs Portuguese (similar vocabularies)
  if ((detected[0][0] === 'es' && detected[1][0] === 'pt') ||
      (detected[0][0] === 'pt' && detected[1][0] === 'es')) {
    // Portuguese-specific
    if (/\b(você|vocês|não|são|estão|também|então)\b/i.test(message)) {
      return 'pt';
    }
    // Spanish-specific
    if (/\b(usted|ustedes|también|entonces|siempre|nunca)\b/i.test(message)) {
      return 'es';
    }
  }

  // If still ambiguous, return top score
  if (topScore > secondScore) {
    return detected[0][0] as SupportedLanguage;
  }

  return 'mixed';
}

// ============================================
// EXPORTS
// ============================================

export default perceive;
