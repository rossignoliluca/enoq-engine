/**
 * LIMEN DIMENSIONAL SYSTEM
 *
 * Multidimensional detection and integration:
 * - Vertical Dimensions: Somatic → Functional → Relational → Existential → Transcendent
 * - Horizontal Dimensions: H01-H17 Human Domains
 *
 * Based on:
 * - Integrated Information Theory (Φ for integration measure)
 * - Existential psychology (Yalom's four givens)
 * - Humanistic psychology (Maslow's hierarchy, updated)
 * - Enactivism (embodied, embedded, enacted, extended)
 *
 * Constitutional Note: Higher dimensions (Existential, Transcendent)
 * trigger V_MODE automatically - enhanced constitutional protection.
 */

import {
  HumanDomain,
  FieldState,
  SupportedLanguage,
  VerticalDimension,
  DimensionalState,
  IntegrationMetrics,
} from '../../interface/types';

// Re-export types for backwards compatibility
export type { VerticalDimension, DimensionalState, IntegrationMetrics } from '../../interface/types';

// ============================================
// VERTICAL DIMENSION MARKERS
// ============================================

const VERTICAL_MARKERS: Record<VerticalDimension, {
  keywords: RegExp[];
  phrases: RegExp[];
  semantic_fields: string[];
}> = {
  // SOMATIC: Body sensations, physical states, health
  // Common pain expressions: "mi fa male" (IT), "me duele" (ES), "hurts" (EN)
  SOMATIC: {
    keywords: [
      /body|corpo|cuerpo|身体|शरीर/i,
      /tired|stanco|cansado|疲れ|थका/i,
      /energy|energia|energía|エネルギー|ऊर्जा/i,
      /pain|dolore|dolor|痛み|दर्द/i,
      /hurt|male|duele|fa male|me duele/i,  // Common pain expressions
      /head|testa|cabeza|頭|सिर/i,  // Body parts
      /sleep|dormire|dormir|眠り|नींद/i,
      /health|salute|salud|健康|स्वास्थ्य/i,
      /breathe|respirare|respirar|呼吸|सांस/i,
      /feel|sentire|sentir|感じる|महसूस/i,
      /tension|tensione|tensión|緊張|तनाव/i,
      /stomach|stomaco|estómago|胃|पेट/i,
      /heart|cuore|corazón|心臓|दिल/i,
      /chest|petto|pecho|胸|छाती/i,
      /panic|panico|pánico|パニック|घबराहट/i,
      /shake|tremare|tremando|temblar|temblando|震える|कांपना/i,
      /sweat|sudare|sudar|汗|पसीना/i,
      /dizzy|vertigini|mareo|めまい|चक्कर/i,
      /nausea|nausea|náusea|吐き気|मतली/i,
      /suffocate|soffocare|soffoco|asfixia|ahogar/i,
      /scared|paura|miedo|peur|angst/i,
      /calm|calmare|calmar|calmer/i
    ],
    phrases: [
      /my body|il mio corpo|mi cuerpo/i,
      /physically|fisicamente|físicamente/i,
      // Apostrophe-flexible patterns
      /can'?t sleep|cant sleep|non riesco a dormire|no puedo dormir/i,
      /no energy|senza energia|sin energía/i,
      /can'?t breathe|cant breathe|non riesco a respirare|no puedo respirar/i,
      /heart is racing|heart racing|cuore che batte|corazón late/i,
      /heart beat|heartbeat|battito|latido/i,
      /batte forte|beating fast|late rápido/i,
      /panic attack|attacco di panico|ataque de pánico/i,
      /I feel sick|mi sento male|me siento mal/i,
      /I'?m scared|Im scared|ho paura|tengo miedo/i
    ],
    semantic_fields: ['physical', 'sensation', 'embodiment', 'vitality']
  },

  FUNCTIONAL: {
    keywords: [
      /goal|obiettivo|objetivo|目標|लक्ष्य/i,
      /problem|problema|problema|問題|समस्या/i,
      /solution|soluzione|solución|解決|समाधान/i,
      /plan|piano|plan|計画|योजना/i,
      /task|compito|tarea|タスク|कार्य/i,
      /work|lavoro|trabajo|仕事|काम/i,
      /money|soldi|dinero|お金|पैसा/i,
      /time|tempo|tiempo|時間|समय/i,
      /decide|decidere|decidir|決める|निर्णय/i,
      /organize|organizzare|organizar|整理/i,
      /manage|gestire|gestionar|管理/i
    ],
    phrases: [
      /how to|come fare|cómo hacer|どうやって/i,
      /I need to|devo|necesito|しなければ/i,
      /what should I|cosa dovrei|qué debería/i,
      /step by step|passo dopo passo|paso a paso/i
    ],
    semantic_fields: ['instrumental', 'practical', 'operational', 'resource']
  },

  RELATIONAL: {
    keywords: [
      /relationship|relazione|relación|関係|रिश्ता/i,
      /friend|amico|amigo|友達|दोस्त/i,
      /family|famiglia|familia|家族|परिवार/i,
      /partner|partner|pareja|パートナー|साथी/i,
      /love|amore|amor|愛|प्यार/i,
      /trust|fiducia|confianza|信頼|विश्वास/i,
      /betray|tradire|traicionar|裏切り|धोखा/i,
      /lonely|solo|solitario|孤独|अकेला/i,
      /together|insieme|juntos|一緒に|साथ/i,
      /connect|collegare|conectar|つながる|जुड़ना/i,
      /understand|capire|entender|理解する|समझना/i,
      /abandon|abbandonare|abandonar|見捨てる|छोड़ना/i
    ],
    phrases: [
      /between us|tra noi|entre nosotros/i,
      /they don't|loro non|ellos no/i,
      /she said|lei ha detto|ella dijo/i,
      /he thinks|lui pensa|él piensa/i,
      /we used to|noi eravamo soliti|solíamos/i
    ],
    semantic_fields: ['interpersonal', 'attachment', 'social', 'belonging']
  },

  // EXISTENTIAL dimension triggers V_MODE when score > 0.6
  // These patterns detect deep meaning-making and identity questions
  // IMPORTANT: "qual è il punto" and similar must be here, not just "qual è il senso"
  // Users express existential questioning in many ways
  EXISTENTIAL: {
    keywords: [
      /meaning|significato|significado|意味|अर्थ/i,
      /purpose|scopo|propósito|目的|उद्देश्य/i,
      /death|morte|muerte|死|मृत्यु/i,
      /die|morire|morir|死ぬ|मरना/i,
      /identity|identità|identidad|アイデンティティ|पहचान/i,
      /who am I|chi sono|quién soy|私は誰/i,
      /freedom|libertà|libertad|自由|स्वतंत्रता/i,
      /choice|scelta|elección|選択|चुनाव/i,
      /alone|solo|solo|一人|अकेला/i,
      /exist|esistere|existir|存在する|अस्तित्व/i,
      /authentic|autentico|auténtico|本物の|प्रामाणिक/i,
      /real|vero|real|本当の|असली/i,
      /void|vuoto|vacío|虚無|शून्य/i,
      /nothing|niente|nada|何もない|कुछ नहीं/i,
      /lost|perso|perdido|迷った|खोया/i,
      /life|vita|vida|人生|जीवन/i,
      /live|vivere|vivir|生きる|जीना/i
    ],
    phrases: [
      // Core existential questions - these TRIGGER V_MODE
      /what's the point|what is the point|qual è il punto|qual è il senso|cuál es el punto|cuál es el sentido/i,
      /why am I|perché sono|por qué soy/i,
      /does it matter|importa davvero|importa/i,
      /who I really am|chi sono veramente|quién soy realmente/i,
      /my life|la mia vita|mi vida/i,
      /before I die|prima di morire|antes de morir/i,
      /what does it mean|cosa significa|qué significa/i,
      /mean to live|significato di vivere|significado de vivir/i,
      /non so cosa fare|I don't know what to do|no sé qué hacer/i,
      /mi sento perso|I feel lost|me siento perdido/i,
      /sense of life|senso della vita|sentido de la vida/i,
      // Additional patterns for common expressions of meaninglessness
      /ha senso|abbia senso|avere senso|make sense|tiene sentido|tenga sentido|a quoi bon/i,
      /nulla ha senso|nulla abbia senso|nothing makes sense|nothing has meaning|nada tiene sentido/i,
      /senza senso|senseless|meaningless|sin sentido|sans sens/i,
      /perché continuo|why do I keep|por qué sigo/i,
      /cosa sto facendo|what am I doing|qué estoy haciendo/i,
      /non vedo il senso|I don't see the point|no veo el sentido/i,
      /a che serve|what's it for|para qué sirve/i,
      /non ha senso|non abbia senso|doesn't make sense|no tiene sentido/i,
      // What I want from life - core existential question
      /cosa voglio dalla vita|what I want from life|qué quiero de la vida/i,
      /non so più cosa|I don't know anymore|ya no sé qué/i,
      /chi voglio essere|who I want to be|quién quiero ser/i,
      /dove sto andando|where am I going|adónde voy/i,
      /che senso ha|what's the sense|qué sentido tiene/i,
      // Core "what I want" questions (without "from life")
      /non so cosa voglio|I don't know what I want|no sé lo que quiero/i,
      /cosa voglio (veramente|davvero)|what I really want|lo que realmente quiero/i,
      /cosa desidero|what I desire|lo que deseo/i,
      /non so chi sono|I don't know who I am|no sé quién soy/i
    ],
    semantic_fields: ['meaning', 'mortality', 'identity', 'freedom', 'isolation']
  },

  TRANSCENDENT: {
    keywords: [
      /universe|universo|universo|宇宙|ब्रह्मांड/i,
      /infinite|infinito|infinito|無限|अनंत/i,
      /spirit|spirito|espíritu|精神|आत्मा/i,
      /soul|anima|alma|魂|आत्मा/i,
      /divine|divino|divino|神聖な|दिव्य/i,
      /eternal|eterno|eterno|永遠の|शाश्वत/i,
      /sacred|sacro|sagrado|神聖な|पवित्र/i,
      /consciousness|coscienza|conciencia|意識|चेतना/i,
      /enlighten|illuminare|iluminar|悟る|प्रबुद्ध/i,
      /transcend|trascendere|trascender|超越する|पार करना/i,
      /oneness|unità|unidad|一体|एकता/i,
      /cosmic|cosmico|cósmico|宇宙的/i
    ],
    phrases: [
      /connected to everything|connesso a tutto|conectado a todo/i,
      /part of something|parte di qualcosa|parte de algo/i,
      /bigger than|più grande di|más grande que/i,
      /beyond myself|oltre me stesso|más allá de mí/i,
      /the whole|il tutto|el todo/i
    ],
    semantic_fields: ['spiritual', 'cosmic', 'unity', 'ultimate']
  }
};

// ============================================
// HORIZONTAL DOMAIN MARKERS (Extended)
// Aligned with types.ts HumanDomain ontology
// ============================================

const HORIZONTAL_MARKERS: Record<HumanDomain, {
  keywords: RegExp[];
  context_clues: string[];
}> = {
  H01_SURVIVAL: {
    keywords: [
      /survive|sopravvivere|threat|minaccia|danger|pericolo|crisis|crisi|emergency|emergenza/i,
      /can'?t breathe|cant breathe|non riesco a respirare/i,  // Panic/survival
      /going to die|sto per morire|morire/i,
      /help me|aiutami|aiuto/i
    ],
    context_clues: ['immediate threat', 'life or death', 'basic needs']
  },
  H02_SAFETY: {
    keywords: [
      /safe|sicuro|protect|proteggere|security|sicurezza|stable|stabile|fear|paura/i,
      /scared|spaventato|impaurito|afraid|terrified|terrorizzato/i,  // Fear response
      /panic|panico|anxiety|ansia|anxious/i,  // Anxiety-related
      /heart racing|heart pounding|cuore che batte/i
    ],
    context_clues: ['stability', 'predictability', 'protection']
  },
  H03_BODY: {
    keywords: [
      /body|corpo|health|salute|physical|fisico|exercise|esercizio|eating|mangiare/i,
      /breathe|respirare|breath|respiro/i,  // Breathing
      /heart|cuore|chest|petto/i,  // Body parts in distress
      /shaking|tremando|sweating|sudando/i
    ],
    context_clues: ['physical wellbeing', 'body image', 'health habits']
  },
  H04_EMOTION: {
    keywords: [/feel|sentire|emotion|emozione|angry|arrabbiato|sad|triste|happy|felice|fear|paura/i],
    context_clues: ['emotional states', 'feelings', 'affect']
  },
  H05_COGNITION: {
    keywords: [/think|pensare|understand|capire|confuse|confuso|decide|decidere|learn|imparare/i],
    context_clues: ['thinking', 'understanding', 'mental processes']
  },
  H06_MEANING: {
    keywords: [
      /meaning|significato|purpose|scopo|why|perché|sense|senso|matter|importa/i,
      /life|vita|leben|vie|vida/i,  // Life references often existential
      /point|punto|worth|vale/i,  // "What's the point"
      /reason|ragione|motivo/i,
      /lost|perso|perdido/i  // Feeling lost often meaning-related
    ],
    context_clues: ['meaning-making', 'purpose', 'significance']
  },
  H07_IDENTITY: {
    keywords: [
      /who am I|chi sono|identity|identità|self|io|authentic|autentico|real me|vero me/i,
      /confused|confuso|confundido/i,  // Identity confusion
      /don'?t know who|non so chi/i,
      /myself|me stesso|mi mismo/i
    ],
    context_clues: ['self-concept', 'identity', 'authenticity']
  },
  H08_TEMPORAL: {
    keywords: [/deadline|scadenza|time|tempo|urgent|urgente|pressure|pressione|wait|aspettare/i],
    context_clues: ['time pressure', 'deadlines', 'temporal concerns']
  },
  H09_ATTACHMENT: {
    keywords: [/close|vicino|trust|fiducia|bond|legame|abandon|abbandonare|need|bisogno/i],
    context_clues: ['attachment', 'bonding', 'connection needs']
  },
  H10_COORDINATION: {
    keywords: [/together|insieme|cooperate|cooperare|team|squadra|coordinate|coordinare/i],
    context_clues: ['coordination', 'cooperation', 'teamwork']
  },
  H11_BELONGING: {
    keywords: [/belong|appartenere|community|comunità|group|gruppo|included|incluso|outsider|estraneo/i],
    context_clues: ['social inclusion', 'group identity', 'acceptance']
  },
  H12_HIERARCHY: {
    keywords: [/boss|capo|power|potere|authority|autorità|control|controllo|status|status/i],
    context_clues: ['power dynamics', 'hierarchy', 'authority']
  },
  H13_CREATION: {
    keywords: [/create|creare|make|fare|build|costruire|express|esprimere|art|arte/i],
    context_clues: ['creativity', 'making', 'expression']
  },
  H14_WORK: {
    keywords: [/work|lavoro|job|impiego|career|carriera|profession|professione|office|ufficio/i],
    context_clues: ['employment', 'professional life', 'career']
  },
  H15_LEGAL: {
    keywords: [/law|legge|legal|legale|rights|diritti|court|tribunale|lawyer|avvocato/i],
    context_clues: ['legal matters', 'rights', 'compliance']
  },
  H16_OPERATIONAL: {
    keywords: [/task|compito|do|fare|complete|completare|finish|finire|step|passo/i],
    context_clues: ['task execution', 'operations', 'getting things done']
  },
  H17_FORM: {
    keywords: [/beauty|bellezza|aesthetic|estetico|form|forma|design|design|harmony|armonia|density|densità/i],
    context_clues: ['form', 'aesthetics', 'meta-structure']
  }
};

// ============================================
// DIMENSIONAL DETECTOR
// ============================================

export class DimensionalDetector {
  /**
   * Detect dimensional state from message and context
   */
  detect(
    message: string,
    language: SupportedLanguage,
    context?: {
      previous_state?: DimensionalState;
      field_state?: FieldState;
    }
  ): DimensionalState {
    // Detect vertical dimensions
    const vertical = this.detectVertical(message);

    // Detect horizontal dimensions
    const horizontal = this.detectHorizontal(message);

    // Compute integration metrics
    const integration = this.computeIntegration(vertical, horizontal);

    // Find primary dimensions
    const primary_vertical = this.findPrimaryVertical(vertical);
    const primary_horizontal = this.findPrimaryHorizontal(horizontal);

    // Check special conditions
    // V_MODE requires higher threshold (0.6) and excludes casual work context
    const casualWorkPatterns = /meeting|riunione|reunión|deadline|scadenza|task|progetto|project/i;
    const isCasualWork = casualWorkPatterns.test(message);

    const v_mode_triggered =
      (vertical.EXISTENTIAL > 0.6 || vertical.TRANSCENDENT > 0.5) &&
      !isCasualWork;

    // Emergency requires SOMATIC >= 0.6 + emergency markers
    const emergency_detected =
      vertical.SOMATIC >= 0.6 && this.detectEmergencyMarkers(message);

    const cross_dimensional = integration.complexity > 2;

    // Apply temporal smoothing if previous state exists
    if (context?.previous_state) {
      this.applyTemporalSmoothing(vertical, context.previous_state.vertical);
      this.applyTemporalSmoothing(horizontal, context.previous_state.horizontal);
    }

    return {
      vertical,
      horizontal,
      integration,
      primary_vertical,
      primary_horizontal,
      v_mode_triggered,
      emergency_detected,
      cross_dimensional
    };
  }

  /**
   * Detect vertical dimension activations
   */
  private detectVertical(message: string): Record<VerticalDimension, number> {
    const result: Record<VerticalDimension, number> = {
      SOMATIC: 0,
      FUNCTIONAL: 0,
      RELATIONAL: 0,
      EXISTENTIAL: 0,
      TRANSCENDENT: 0
    };

    for (const [dimension, markers] of Object.entries(VERTICAL_MARKERS)) {
      let score = 0;
      let matches = 0;

      // Check keywords (increased weight for better sensitivity)
      for (const keyword of markers.keywords) {
        if (keyword.test(message)) {
          matches++;
          score += 0.25;  // Increased from 0.15
        }
      }

      // Check phrases (higher weight)
      for (const phrase of markers.phrases) {
        if (phrase.test(message)) {
          matches++;
          score += 0.35;  // Increased from 0.25
        }
      }

      // Boost score if multiple matches (dimensional coherence)
      if (matches >= 2) {
        score *= 1.2;
      }
      if (matches >= 3) {
        score *= 1.1;
      }

      // Normalize and cap at 1
      result[dimension as VerticalDimension] = Math.min(1, score);
    }

    return result;
  }

  /**
   * Detect horizontal domain activations
   */
  private detectHorizontal(message: string): Record<HumanDomain, number> {
    const result: Record<HumanDomain, number> = {} as Record<HumanDomain, number>;

    for (const domain of Object.keys(HORIZONTAL_MARKERS) as HumanDomain[]) {
      const markers = HORIZONTAL_MARKERS[domain];
      let score = 0;

      for (const keyword of markers.keywords) {
        if (keyword.test(message)) {
          score += 0.3;
        }
      }

      result[domain] = Math.min(1, score);
    }

    return result;
  }

  /**
   * Compute integration metrics (Φ-inspired)
   */
  private computeIntegration(
    vertical: Record<VerticalDimension, number>,
    horizontal: Record<HumanDomain, number>
  ): IntegrationMetrics {
    // Count active dimensions (>= 0.3 threshold)
    const activeVertical = Object.values(vertical).filter(v => v >= 0.3).length;
    const activeHorizontal = Object.values(horizontal).filter(v => v >= 0.3).length;

    // Complexity = total active dimensions
    const complexity = activeVertical + activeHorizontal;

    // Phi = integration measure
    // High phi when multiple dimensions are active AND coherent
    const phi = this.computePhi(vertical, horizontal);

    // Coherence = do the dimensions make sense together?
    const coherence = this.computeCoherence(vertical, horizontal);

    // Tension = conflicting dimensions
    const tension = this.computeTension(vertical, horizontal);

    return { phi, complexity, coherence, tension };
  }

  /**
   * Compute Φ (integrated information)
   * Higher when dimensions are both differentiated AND integrated
   */
  private computePhi(
    vertical: Record<VerticalDimension, number>,
    horizontal: Record<HumanDomain, number>
  ): number {
    const verticalValues = Object.values(vertical);
    const horizontalValues = Object.values(horizontal);
    const allValues = [...verticalValues, ...horizontalValues];

    // Differentiation: variance in activations
    const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const variance = allValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allValues.length;

    // Integration: correlation between dimensions
    // (Simplified: sum of products of co-active dimensions)
    let integration = 0;
    for (let i = 0; i < allValues.length; i++) {
      for (let j = i + 1; j < allValues.length; j++) {
        if (allValues[i] >= 0.3 && allValues[j] >= 0.3) {  // >= to include threshold
          integration += allValues[i] * allValues[j];
        }
      }
    }

    // Phi = differentiation * integration (normalized)
    const phi = Math.sqrt(variance) * Math.min(1, integration / 5);
    return Math.min(1, phi);
  }

  /**
   * Compute coherence between dimensions
   */
  private computeCoherence(
    vertical: Record<VerticalDimension, number>,
    horizontal: Record<HumanDomain, number>
  ): number {
    // Define natural pairings (aligned with types.ts HumanDomain)
    const pairings: [VerticalDimension, HumanDomain[]][] = [
      ['SOMATIC', ['H03_BODY', 'H01_SURVIVAL', 'H04_EMOTION']],
      ['FUNCTIONAL', ['H14_WORK', 'H16_OPERATIONAL', 'H08_TEMPORAL']],
      ['RELATIONAL', ['H11_BELONGING', 'H09_ATTACHMENT', 'H10_COORDINATION']],
      ['EXISTENTIAL', ['H06_MEANING', 'H07_IDENTITY', 'H13_CREATION']],
      ['TRANSCENDENT', ['H06_MEANING', 'H17_FORM']]
    ];

    let coherenceScore = 0;
    let count = 0;

    for (const [vert, horz] of pairings) {
      if (vertical[vert] >= 0.3) {  // >= to include threshold
        for (const h of horz) {
          if (horizontal[h] >= 0.3) {  // >= to include threshold
            coherenceScore += 1;
          }
          count++;
        }
      }
    }

    return count > 0 ? coherenceScore / count : 0.5;
  }

  /**
   * Compute tension between dimensions
   */
  private computeTension(
    vertical: Record<VerticalDimension, number>,
    horizontal: Record<HumanDomain, number>
  ): number {
    let tension = 0;

    // Tension: high functional + high existential = inner conflict
    if (vertical.FUNCTIONAL > 0.5 && vertical.EXISTENTIAL > 0.5) {
      tension += 0.3;
    }

    // Tension: high somatic distress + high work focus
    if (vertical.SOMATIC > 0.5 && horizontal.H14_WORK > 0.5) {
      tension += 0.2;
    }

    // Tension: high attachment need + high isolation (existential)
    if (horizontal.H09_ATTACHMENT > 0.5 && vertical.EXISTENTIAL > 0.5) {
      tension += 0.2;
    }

    return Math.min(1, tension);
  }

  /**
   * Find primary vertical dimension
   */
  private findPrimaryVertical(vertical: Record<VerticalDimension, number>): VerticalDimension {
    let max = 0;
    let primary: VerticalDimension = 'FUNCTIONAL';

    for (const [dim, value] of Object.entries(vertical)) {
      if (value > max) {
        max = value;
        primary = dim as VerticalDimension;
      }
    }

    return primary;
  }

  /**
   * Find primary horizontal dimensions (can be multiple)
   */
  private findPrimaryHorizontal(horizontal: Record<HumanDomain, number>): HumanDomain[] {
    const threshold = 0.3;
    const active: [HumanDomain, number][] = [];

    for (const [domain, value] of Object.entries(horizontal)) {
      if (value >= threshold) {  // >= to include exact threshold matches
        active.push([domain as HumanDomain, value]);
      }
    }

    // Sort by activation and return top 3
    active.sort((a, b) => b[1] - a[1]);
    return active.slice(0, 3).map(([d]) => d);
  }

  /**
   * Detect emergency markers
   */
  private detectEmergencyMarkers(message: string): boolean {
    // Romantic context exclusion - if romantic, not emergency
    // Comprehensive multilingual coverage
    const romanticPatterns = [
      // English
      /love you|my love|my darling|sweetheart|honey|baby|babe/i,
      /miss you|thinking of you|can't stop thinking/i,
      /beautiful|gorgeous|stunning/i,
      /kiss|hug|embrace|cuddle/i,
      /heart beats for you|butterflies/i,
      // Italian
      /ti amo|ti voglio bene|amore mio|tesoro|caro|cara/i,
      /mi manchi|penso a te|non smetto di pensare/i,
      /bellissim|splendid|meraviglios/i,
      /bacio|abbraccio|coccole/i,
      /il mio cuore batte per te/i,
      // Spanish
      /te amo|te quiero|mi amor|mi cielo|cariño|querido|querida/i,
      /te extraño|pienso en ti|no puedo dejar de pensar/i,
      /hermos|precioso|preciosa|lindo|linda/i,
      /beso|abrazo/i,
      /mi corazón late por ti/i,
      // French
      /je t'aime|mon amour|mon cœur|chéri|chérie|mon trésor/i,
      /tu me manques|je pense à toi/i,
      /magnifique|belle|beau/i,
      /bisou|baiser|câlin/i,
      // German
      /ich liebe dich|mein schatz|liebling|mein herz/i,
      /ich vermisse dich|denke an dich/i,
      /wunderschön|hübsch/i,
      /kuss|küssen|umarmung/i,
      // Portuguese
      /te amo|meu amor|meu bem|querido|querida/i,
      /sinto sua falta|penso em você/i,
      /lindo|linda|bonito|bonita/i,
      /beijo|abraço/i,
      // Japanese
      /愛してる|大好き|好きです|恋してる/i,
      /会いたい|想ってる/i,
      // Chinese
      /我爱你|亲爱的|宝贝|我想你/i,
      // Arabic
      /أحبك|حبيبي|حبيبتي|أشتاق/i,
      // Russian
      /люблю тебя|любимый|любимая|скучаю/i,
      // Hindi
      /मैं तुमसे प्यार करता|जान|प्यार/i,
      // Generic romantic context
      /valentine|anniversary|wedding|engaged|marry/i,
      /san valentino|anniversario|matrimonio|sposare/i
    ];

    // If romantic context detected, not an emergency
    if (romanticPatterns.some(p => p.test(message))) {
      return false;
    }

    // Colloquial/metaphorical exclusions - common hyperbolic expressions
    const colloquialPatterns = [
      // English colloquial
      /dying to|dying for|to die for|I'm dead|I'm dying laughing/i,
      /killing me|kills me|this is killing|you're killing/i,
      /heart attack.{0,10}(task|work|deadline|exam|test)/i,
      /can't breathe.{0,10}(laugh|funny|hilarious)/i,
      /panic.{0,10}(buying|sale|mode|button)/i,
      // Italian colloquial
      /sto morendo.{0,10}(ridere|fame|sete|caldo|freddo)/i,
      /mi uccide|mi ammazza|ammazza che/i,
      /muoio dal ridere|muoio di fame/i,
      // Spanish colloquial
      /me muero de.{0,10}(risa|hambre|sed|calor|frío)/i,
      /me mata|esto me mata/i,
      // French colloquial
      /je meurs de.{0,10}(rire|faim|soif|chaud|froid)/i,
      /ça me tue/i,
      // German colloquial
      /ich sterbe.{0,10}(lachen|hunger|durst)/i,
      /bringt mich um/i
    ];

    // Non-emergency fear expressions - common existential/decision fears
    const nonEmergencyFearPatterns = [
      // Fear of failure/mistakes (not emergency)
      /paura di sbagliare|afraid of (making a )?mistake|miedo a equivocarme/i,
      /paura di fallire|fear of fail|afraid to fail|miedo a fallar/i,
      /paura del giudizio|fear of judgment|afraid of what others/i,
      /paura di perdere|afraid of losing|fear of loss/i,
      /paura del cambiamento|fear of change|afraid of change/i,
      /paura del futuro|fear of the future|afraid of the future/i,
      /paura di decidere|afraid to decide|fear of deciding/i,
      // Fear of wrong choice (various phrasings)
      /paura.*(scelta|decisione).*(sbagliata|errata|wrong)/i,
      /scelta sbagliata|wrong choice|wrong decision/i,
      /afraid.*(wrong|bad).*(choice|decision)/i,
      // Fear of not knowing / uncertainty (existential, not panic)
      /paura di non sapere|afraid of not knowing/i,
      /paura dell'incertezza|fear of uncertainty/i,
    ];

    // Non-emergency fears are existential, not crisis
    if (nonEmergencyFearPatterns.some(p => p.test(message))) {
      return false;
    }

    // If colloquial/metaphorical, not an emergency
    if (colloquialPatterns.some(p => p.test(message))) {
      return false;
    }

    const emergencyPatterns = [
      /help me|aiutami|ayúdame/i,
      // Apostrophe-flexible patterns (can't/cant, I'm/Im, etc.)
      /can'?t breathe|cant breathe|non riesco a respirare|no puedo respirar/i,
      /going to die|sto per morire|voy a morir/i,
      /kill myself|uccidermi|matarme/i,
      /end it|farla finita|acabar/i,
      /hurt myself|farmi del male|hacerme daño/i,
      /panic|panico|pánico/i,
      /heart attack|infarto|ataque al corazón/i,
      /can'?t stop|cant stop|non riesco a fermare|no puedo parar/i,
      /losing control|perdendo il controllo|perdiendo el control/i,
      /so scared|così spaventato|tan asustado/i,
      /terrified|terrorizzato|aterrorizado/i,
      /something is wrong|qualcosa non va|algo está mal/i,
      // Additional panic/anxiety markers
      /suffocating|soffocare|soffoco|asfixia/i,
      /trembling|shaking|tremando|temblando/i,
      /can'?t calm|cant calm|non riesco a calmar|no puedo calmar/i,
      /ho paura|I'?m scared|Im scared|tengo miedo|j'ai peur|ich habe angst/i,
      /sto male|I feel awful|me siento mal/i,
      /heart pounding|heart is racing|heart racing|cuore che batte|corazón late/i,
      /anxiety attack|attacco d'ansia|ataque de ansiedad/i,
      /hyperventilating|iperventilando/i
    ];

    return emergencyPatterns.some(p => p.test(message));
  }

  /**
   * Apply temporal smoothing to prevent abrupt changes
   */
  private applyTemporalSmoothing(
    current: Record<string, number>,
    previous: Record<string, number>,
    alpha: number = 0.3
  ): void {
    for (const key of Object.keys(current)) {
      if (previous[key] !== undefined) {
        (current as Record<string, number>)[key] = alpha * current[key] + (1 - alpha) * previous[key];
      }
    }
  }
}

// ============================================
// DIMENSIONAL INTEGRATOR
// ============================================

export class DimensionalIntegrator {
  /**
   * Generate insights from dimensional state
   */
  generateInsights(state: DimensionalState): DimensionalInsight[] {
    const insights: DimensionalInsight[] = [];

    // Cross-dimensional insight
    if (state.cross_dimensional) {
      insights.push({
        type: 'cross_dimensional',
        description: 'Multiple life dimensions are active simultaneously',
        dimensions: [...Object.entries(state.vertical)
          .filter(([, v]) => v > 0.3)
          .map(([d]) => d)],
        implication: 'This may indicate an interconnected situation that spans multiple areas of life'
      });
    }

    // Tension insight
    if (state.integration.tension > 0.3) {
      insights.push({
        type: 'tension',
        description: 'There appears to be tension between different aspects',
        dimensions: [],
        implication: 'Inner conflict may be present between what you need and what you\'re focused on'
      });
    }

    // Depth insight (existential/transcendent active)
    if (state.v_mode_triggered) {
      insights.push({
        type: 'depth',
        description: 'This touches on fundamental questions of meaning or identity',
        dimensions: ['EXISTENTIAL', 'TRANSCENDENT'],
        implication: 'V_MODE: Enhanced reflection, no external answers can be given'
      });
    }

    // Somatic insight
    if (state.vertical.SOMATIC > 0.5) {
      insights.push({
        type: 'embodied',
        description: 'The body is speaking',
        dimensions: ['SOMATIC'],
        implication: 'Physical sensations may be carrying important information'
      });
    }

    return insights;
  }

  /**
   * Suggest appropriate response depth
   */
  suggestDepth(state: DimensionalState): 'surface' | 'medium' | 'deep' {
    // High integration = deep response needed
    if (state.integration.phi > 0.6) return 'deep';

    // Existential or transcendent = deep
    if (state.v_mode_triggered) return 'deep';

    // High complexity but low coherence = medium (need to clarify)
    if (state.integration.complexity > 3 && state.integration.coherence < 0.5) {
      return 'medium';
    }

    // Simple functional = surface
    if (state.primary_vertical === 'FUNCTIONAL' && !state.cross_dimensional) {
      return 'surface';
    }

    return 'medium';
  }

  /**
   * Suggest primitives based on dimensional state
   */
  suggestPrimitives(state: DimensionalState): string[] {
    const primitives: string[] = [];

    // Based on vertical dimension
    switch (state.primary_vertical) {
      case 'SOMATIC':
        primitives.push('GROUND', 'PRESENCE', 'BREATHE');
        break;
      case 'FUNCTIONAL':
        primitives.push('FRAME', 'MAP', 'STRUCTURE');
        break;
      case 'RELATIONAL':
        primitives.push('MIRROR', 'REFLECT', 'VALIDATE');
        break;
      case 'EXISTENTIAL':
        primitives.push('WITNESS', 'HOLD', 'COMPANION');
        break;
      case 'TRANSCENDENT':
        primitives.push('EXPAND', 'CONNECT', 'WONDER');
        break;
    }

    // Cross-dimensional: add integration primitives
    if (state.cross_dimensional) {
      primitives.push('BRIDGE', 'INTEGRATE');
    }

    // High tension: add holding primitives
    if (state.integration.tension > 0.3) {
      primitives.push('HOLD_PARADOX', 'BOTH_AND');
    }

    return primitives;
  }
}

// ============================================
// INSIGHT TYPE
// ============================================

export interface DimensionalInsight {
  type: 'cross_dimensional' | 'tension' | 'depth' | 'embodied' | 'relational' | 'functional';
  description: string;
  dimensions: string[];
  implication: string;
}

// ============================================
// SINGLETON EXPORTS
// ============================================

export const dimensionalDetector = new DimensionalDetector();
export const dimensionalIntegrator = new DimensionalIntegrator();

export default {
  detector: dimensionalDetector,
  integrator: dimensionalIntegrator
};
