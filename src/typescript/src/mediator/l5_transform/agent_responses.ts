/**
 * AGENT RESPONSE TEMPLATES
 *
 * Multilingual response generation for ENOQ agents.
 * Each agent type has contextual response templates that:
 * - Honor constitutional constraints (no directives, no diagnosis, no identity assignment)
 * - Support the user's autonomy
 * - Match the emotional/dimensional context
 */

import { SupportedLanguage, HumanDomain } from '../../interface/types';
import { VerticalDimension, DimensionalState } from '../../operational/detectors/dimensional_system';

// ============================================
// TYPES
// ============================================

export interface ResponseContext {
  language: SupportedLanguage;
  vertical: VerticalDimension;
  domains: HumanDomain[];
  v_mode: boolean;
  emergency: boolean;
  arousal: 'low' | 'medium' | 'high';
  phi: number;  // integration level
  recentResponses?: string[];  // avoid repetition
}

// Partial language map - falls back to English if language not available
type LanguageTemplates = Partial<Record<SupportedLanguage, string[]>> & { en: string[] };
type TemplateMap = Record<string, LanguageTemplates>;

// ============================================
// SOMATIC RESPONSES
// ============================================

const SOMATIC_RESPONSES: TemplateMap = {
  emergency: {
    en: [
      "Right now, just notice your breath.",
      "Let's pause here. Feel your feet on the ground.",
      "You're safe right now. Take a moment to feel that.",
      "Whatever is happening, you're here now. Just notice that.",
    ],
    it: [
      "Adesso, nota solo il tuo respiro.",
      "Fermiamoci un momento. Senti i tuoi piedi a terra.",
      "Sei al sicuro adesso. Prenditi un momento per sentirlo.",
      "Qualsiasi cosa stia succedendo, sei qui adesso. Nota solo questo.",
    ],
    es: [
      "Ahora mismo, solo nota tu respiración.",
      "Hagamos una pausa aquí. Siente tus pies en el suelo.",
      "Estás a salvo ahora. Toma un momento para sentirlo.",
      "Sea lo que sea que esté pasando, estás aquí ahora.",
    ],
    fr: [
      "Maintenant, remarque simplement ta respiration.",
      "Faisons une pause ici. Sens tes pieds sur le sol.",
      "Tu es en sécurité maintenant. Prends un moment pour le sentir.",
    ],
    de: [
      "Gerade jetzt, bemerke einfach deinen Atem.",
      "Lass uns hier innehalten. Spüre deine Füße auf dem Boden.",
      "Du bist jetzt sicher. Nimm dir einen Moment, um das zu spüren.",
    ],
  },
  awareness: {
    en: [
      "What does your body know about this?",
      "Where do you feel this in your body?",
      "There's wisdom in what your body is telling you.",
      "Your body is speaking. What is it saying?",
    ],
    it: [
      "Cosa sa il tuo corpo di questo?",
      "Dove senti questo nel tuo corpo?",
      "C'è saggezza in quello che il tuo corpo ti sta dicendo.",
      "Il tuo corpo sta parlando. Cosa sta dicendo?",
    ],
    es: [
      "¿Qué sabe tu cuerpo sobre esto?",
      "¿Dónde sientes esto en tu cuerpo?",
      "Hay sabiduría en lo que tu cuerpo te está diciendo.",
    ],
    fr: [
      "Que sait ton corps à ce sujet?",
      "Où ressens-tu cela dans ton corps?",
      "Il y a de la sagesse dans ce que ton corps te dit.",
    ],
    de: [
      "Was weiß dein Körper darüber?",
      "Wo spürst du das in deinem Körper?",
      "Es gibt Weisheit in dem, was dein Körper dir sagt.",
    ],
  },
};

// ============================================
// EXISTENTIAL RESPONSES
// ============================================

const EXISTENTIAL_RESPONSES: TemplateMap = {
  meaning: {
    en: [
      "That's a question that matters deeply.",
      "These questions about meaning are some of the most important we can ask.",
      "I hear you searching for something real.",
      "What does your heart say about this?",
      "Sometimes the question itself is the beginning of the answer.",
    ],
    it: [
      "Questa è una domanda che conta profondamente.",
      "Queste domande sul significato sono tra le più importanti che possiamo porci.",
      "Ti sento cercare qualcosa di vero.",
      "Cosa dice il tuo cuore su questo?",
      "A volte la domanda stessa è l'inizio della risposta.",
    ],
    es: [
      "Esa es una pregunta que importa profundamente.",
      "Estas preguntas sobre el significado son de las más importantes.",
      "Te escucho buscando algo real.",
      "¿Qué dice tu corazón sobre esto?",
    ],
    fr: [
      "C'est une question qui compte profondément.",
      "Ces questions sur le sens sont parmi les plus importantes.",
      "Je t'entends chercher quelque chose de vrai.",
    ],
    de: [
      "Das ist eine Frage, die zutiefst wichtig ist.",
      "Diese Fragen nach dem Sinn gehören zu den wichtigsten.",
      "Ich höre, dass du nach etwas Echtem suchst.",
    ],
  },
  lost: {
    en: [
      "Being lost can be the beginning of finding a new path.",
      "What you're feeling is real, and it matters.",
      "Not knowing can be uncomfortable. It can also be an opening.",
      "In this not-knowing, what feels most true?",
    ],
    it: [
      "Sentirsi persi può essere l'inizio di trovare una nuova strada.",
      "Quello che senti è reale, e conta.",
      "Non sapere può essere scomodo. Può anche essere un'apertura.",
      "In questo non-sapere, cosa ti sembra più vero?",
    ],
    es: [
      "Estar perdido puede ser el comienzo de encontrar un nuevo camino.",
      "Lo que sientes es real, y importa.",
      "No saber puede ser incómodo. También puede ser una apertura.",
    ],
    fr: [
      "Être perdu peut être le début de trouver un nouveau chemin.",
      "Ce que tu ressens est réel, et ça compte.",
    ],
    de: [
      "Verloren zu sein kann der Beginn sein, einen neuen Weg zu finden.",
      "Was du fühlst, ist real, und es zählt.",
    ],
  },
};

// ============================================
// RELATIONAL RESPONSES
// ============================================

const RELATIONAL_RESPONSES: TemplateMap = {
  connection: {
    en: [
      "Relationships can be both our greatest joy and our deepest challenge.",
      "What matters most to you in this connection?",
      "I hear how much this relationship means to you.",
      "What would feel right between you and this person?",
    ],
    it: [
      "Le relazioni possono essere sia la nostra più grande gioia che la nostra sfida più profonda.",
      "Cosa conta di più per te in questa connessione?",
      "Sento quanto questa relazione significa per te.",
      "Cosa ti sembrerebbe giusto tra te e questa persona?",
    ],
    es: [
      "Las relaciones pueden ser nuestra mayor alegría y nuestro mayor desafío.",
      "¿Qué es lo que más te importa en esta conexión?",
      "Escucho cuánto significa esta relación para ti.",
    ],
    fr: [
      "Les relations peuvent être notre plus grande joie et notre plus grand défi.",
      "Qu'est-ce qui compte le plus pour toi dans cette connexion?",
    ],
    de: [
      "Beziehungen können sowohl unsere größte Freude als auch unsere tiefste Herausforderung sein.",
      "Was ist dir in dieser Verbindung am wichtigsten?",
    ],
  },
  conflict: {
    en: [
      "Conflict can be painful. It can also clarify what matters.",
      "What do you need in this situation?",
      "Both sides of this seem important to you.",
    ],
    it: [
      "Il conflitto può essere doloroso. Può anche chiarire cosa conta.",
      "Di cosa hai bisogno in questa situazione?",
      "Entrambi i lati sembrano importanti per te.",
    ],
    es: [
      "El conflicto puede ser doloroso. También puede aclarar lo que importa.",
      "¿Qué necesitas en esta situación?",
    ],
    fr: [
      "Le conflit peut être douloureux. Il peut aussi clarifier ce qui compte.",
    ],
    de: [
      "Konflikte können schmerzhaft sein. Sie können auch klären, was wichtig ist.",
    ],
  },
};

// ============================================
// FUNCTIONAL/DECISION RESPONSES
// ============================================

const FUNCTIONAL_RESPONSES: TemplateMap = {
  decision: {
    en: [
      "What feels most important in making this decision?",
      "You know this situation better than anyone.",
      "What would you tell a good friend facing this same choice?",
      "What does each option give you? What does each cost?",
      "The decision is yours. What does your gut tell you?",
    ],
    it: [
      "Cosa ti sembra più importante nel prendere questa decisione?",
      "Tu conosci questa situazione meglio di chiunque altro.",
      "Cosa diresti a un buon amico che affronta la stessa scelta?",
      "Cosa ti dà ogni opzione? Cosa ti costa?",
      "La decisione è tua. Cosa ti dice la pancia?",
    ],
    es: [
      "¿Qué te parece más importante al tomar esta decisión?",
      "Tú conoces esta situación mejor que nadie.",
      "¿Qué le dirías a un buen amigo que enfrenta la misma elección?",
      "La decisión es tuya. ¿Qué te dice tu instinto?",
    ],
    fr: [
      "Qu'est-ce qui te semble le plus important dans cette décision?",
      "Tu connais cette situation mieux que personne.",
      "La décision t'appartient. Que te dit ton instinct?",
    ],
    de: [
      "Was erscheint dir bei dieser Entscheidung am wichtigsten?",
      "Du kennst diese Situation besser als jeder andere.",
      "Die Entscheidung liegt bei dir. Was sagt dein Bauchgefühl?",
    ],
  },
  urgency: {
    en: [
      "I hear the time pressure. What's the most important factor right now?",
      "When you imagine each choice, which one lets you breathe easier?",
      "Sometimes we know more than we think we know.",
    ],
    it: [
      "Sento la pressione del tempo. Qual è il fattore più importante adesso?",
      "Quando immagini ogni scelta, quale ti fa respirare più facilmente?",
      "A volte sappiamo più di quanto pensiamo di sapere.",
    ],
    es: [
      "Escucho la presión del tiempo. ¿Cuál es el factor más importante ahora?",
      "Cuando imaginas cada elección, ¿cuál te hace respirar más fácilmente?",
    ],
    fr: [
      "J'entends la pression du temps. Quel est le facteur le plus important maintenant?",
    ],
    de: [
      "Ich höre den Zeitdruck. Was ist gerade der wichtigste Faktor?",
    ],
  },
};

// ============================================
// TEMPORAL RESPONSES
// ============================================

const TEMPORAL_RESPONSES: TemplateMap = {
  pattern: {
    en: [
      "I notice a pattern here. What do you see when you look at it?",
      "This seems to be something that comes back. What does that tell you?",
      "There's a thread running through this. What is it?",
    ],
    it: [
      "Noto un pattern qui. Cosa vedi quando lo guardi?",
      "Sembra essere qualcosa che ritorna. Cosa ti dice questo?",
      "C'è un filo che attraversa tutto questo. Cos'è?",
    ],
    es: [
      "Noto un patrón aquí. ¿Qué ves cuando lo miras?",
      "Esto parece ser algo que vuelve. ¿Qué te dice eso?",
    ],
    fr: [
      "Je remarque un motif ici. Que vois-tu quand tu le regardes?",
    ],
    de: [
      "Ich bemerke ein Muster hier. Was siehst du, wenn du es betrachtest?",
    ],
  },
  future: {
    en: [
      "The future is uncertain. What would help you face it?",
      "What do you hope for? And what do you fear?",
      "You can't know the future. But you can prepare yourself.",
    ],
    it: [
      "Il futuro è incerto. Cosa ti aiuterebbe ad affrontarlo?",
      "Cosa speri? E cosa temi?",
      "Non puoi conoscere il futuro. Ma puoi prepararti.",
    ],
    es: [
      "El futuro es incierto. ¿Qué te ayudaría a enfrentarlo?",
      "¿Qué esperas? ¿Y qué temes?",
    ],
    fr: [
      "L'avenir est incertain. Qu'est-ce qui t'aiderait à l'affronter?",
    ],
    de: [
      "Die Zukunft ist ungewiss. Was würde dir helfen, ihr zu begegnen?",
    ],
  },
  past: {
    en: [
      "The past shapes us. It doesn't have to define us.",
      "What did that experience teach you?",
      "What would you tell your past self now?",
    ],
    it: [
      "Il passato ci forma. Non deve definirci.",
      "Cosa ti ha insegnato quell'esperienza?",
      "Cosa diresti al te stesso del passato adesso?",
    ],
    es: [
      "El pasado nos forma. No tiene que definirnos.",
      "¿Qué te enseñó esa experiencia?",
    ],
    fr: [
      "Le passé nous façonne. Il n'a pas à nous définir.",
    ],
    de: [
      "Die Vergangenheit formt uns. Sie muss uns nicht definieren.",
    ],
  },
};

// ============================================
// V_MODE RESPONSES (Deep Reflection)
// ============================================

const V_MODE_RESPONSES: TemplateMap = {
  inquiry: {
    en: [
      "What does this mean to you?",
      "If you listen deeply, what do you hear?",
      "What's underneath this question?",
      "What would it change if you knew the answer?",
      "What do you already know that you might not be hearing?",
    ],
    it: [
      "Cosa significa questo per te?",
      "Se ascolti profondamente, cosa senti?",
      "Cosa c'è sotto questa domanda?",
      "Cosa cambierebbe se conoscessi la risposta?",
      "Cosa sai già che potresti non stare ascoltando?",
    ],
    es: [
      "¿Qué significa esto para ti?",
      "Si escuchas profundamente, ¿qué oyes?",
      "¿Qué hay debajo de esta pregunta?",
      "¿Qué cambiaría si supieras la respuesta?",
    ],
    fr: [
      "Qu'est-ce que cela signifie pour toi?",
      "Si tu écoutes profondément, qu'entends-tu?",
      "Qu'y a-t-il sous cette question?",
    ],
    de: [
      "Was bedeutet das für dich?",
      "Wenn du tief hinhörst, was hörst du?",
      "Was liegt unter dieser Frage?",
    ],
  },
};

// ============================================
// SYNTHESIS RESPONSES (Integration)
// ============================================

const SYNTHESIS_RESPONSES: TemplateMap = {
  tension: {
    en: [
      "Multiple truths seem present here.",
      "Both sides of this seem real.",
      "Perhaps these aren't opposites but parts of a whole.",
    ],
    it: [
      "Molteplici verità sembrano presenti qui.",
      "Entrambi i lati sembrano reali.",
      "Forse questi non sono opposti ma parti di un tutto.",
    ],
    es: [
      "Múltiples verdades parecen estar presentes aquí.",
      "Ambos lados parecen reales.",
    ],
    fr: [
      "Plusieurs vérités semblent présentes ici.",
    ],
    de: [
      "Mehrere Wahrheiten scheinen hier präsent zu sein.",
    ],
  },
  integration: {
    en: [
      "This touches several areas of your life at once.",
      "Everything here is connected.",
      "What's the thread that holds all of this together?",
    ],
    it: [
      "Questo tocca diverse aree della tua vita contemporaneamente.",
      "Tutto qui è connesso.",
      "Qual è il filo che tiene tutto questo insieme?",
    ],
    es: [
      "Esto toca varias áreas de tu vida a la vez.",
      "Todo aquí está conectado.",
    ],
    fr: [
      "Cela touche plusieurs domaines de ta vie à la fois.",
    ],
    de: [
      "Das berührt mehrere Bereiche deines Lebens gleichzeitig.",
    ],
  },
};

// ============================================
// ACKNOWLEDGMENT RESPONSES (Base)
// ============================================

const ACKNOWLEDGMENT_RESPONSES: TemplateMap = {
  hearing: {
    en: [
      "I hear you.",
      "I'm here with you.",
      "Thank you for sharing this.",
      "That sounds significant.",
      "I understand.",
    ],
    it: [
      "Ti ascolto.",
      "Sono qui con te.",
      "Grazie per condividere questo.",
      "Sembra significativo.",
      "Capisco.",
    ],
    es: [
      "Te escucho.",
      "Estoy aquí contigo.",
      "Gracias por compartir esto.",
      "Eso suena significativo.",
    ],
    fr: [
      "Je t'entends.",
      "Je suis là avec toi.",
      "Merci de partager cela.",
    ],
    de: [
      "Ich höre dich.",
      "Ich bin hier bei dir.",
      "Danke, dass du das teilst.",
    ],
  },
};

// ============================================
// RESPONSE GENERATOR
// ============================================

/**
 * Generate a contextual response element based on agent type and context
 */
export function generateAgentResponse(
  agentType: 'SOMATIC' | 'EXISTENTIAL' | 'RELATIONAL' | 'FUNCTIONAL' | 'TEMPORAL' | 'V_MODE' | 'SYNTHESIS' | 'ACKNOWLEDGMENT',
  subtype: string,
  context: ResponseContext
): string {
  const lang = context.language;
  let templates: TemplateMap;

  switch (agentType) {
    case 'SOMATIC':
      templates = SOMATIC_RESPONSES;
      break;
    case 'EXISTENTIAL':
      templates = EXISTENTIAL_RESPONSES;
      break;
    case 'RELATIONAL':
      templates = RELATIONAL_RESPONSES;
      break;
    case 'FUNCTIONAL':
      templates = FUNCTIONAL_RESPONSES;
      break;
    case 'TEMPORAL':
      templates = TEMPORAL_RESPONSES;
      break;
    case 'V_MODE':
      templates = V_MODE_RESPONSES;
      break;
    case 'SYNTHESIS':
      templates = SYNTHESIS_RESPONSES;
      break;
    case 'ACKNOWLEDGMENT':
    default:
      templates = ACKNOWLEDGMENT_RESPONSES;
      break;
  }

  // Get subtype templates or fall back to first available
  const subtypeTemplates = templates[subtype] || templates[Object.keys(templates)[0]];

  // Get language-specific or fall back to English
  const langTemplates = subtypeTemplates[lang] || subtypeTemplates.en;

  // Select with variation, avoiding recent responses if provided
  return selectWithVariation(langTemplates, context.phi, context.recentResponses);
}

/**
 * Select a response with variation, avoiding recently used responses.
 *
 * WHY THIS EXISTS:
 * Without variation, the same template gets selected every time because:
 * - phi (integration score) is often 0 or very low
 * - Array[0] was always selected
 * - Users experienced repetitive responses within a session
 *
 * SOLUTION:
 * 1. Filter out responses used in recent turns (anti-repetition)
 * 2. Combine multiple variation sources: timestamp, phi, random
 * 3. Modulo by available templates for final selection
 *
 * FALLBACK:
 * If all templates have been used, reset and allow any template.
 * This prevents infinite loops in long sessions.
 *
 * @param templates - Array of possible response strings
 * @param phi - Integration score (0-1), adds some contextual variation
 * @param recentResponses - Responses used in recent turns, to be avoided
 * @returns Selected template string
 */
function selectWithVariation(
  templates: string[],
  phi: number,
  recentResponses?: string[]
): string {
  // Step 1: Filter out recently used responses
  let availableTemplates = templates;
  if (recentResponses && recentResponses.length > 0) {
    const filtered = templates.filter(t => !recentResponses.includes(t));
    // Only use filtered if we have options left
    if (filtered.length > 0) {
      availableTemplates = filtered;
    }
    // Otherwise fall back to all templates (reset)
  }

  // Step 2: Generate variation index from multiple sources
  const timeVariation = Date.now() % 1000;           // Millisecond variation
  const phiVariation = Math.floor(phi * 100);        // Context variation
  const randomVariation = Math.floor(Math.random() * 100);  // True random
  const combinedVariation = (timeVariation + phiVariation + randomVariation) % availableTemplates.length;

  return availableTemplates[combinedVariation];
}

/**
 * Generate a complete response from dimensional state
 */
export function generateContextualResponse(
  dimensionalState: DimensionalState,
  language: SupportedLanguage
): string {
  const elements: string[] = [];
  const context: ResponseContext = {
    language,
    vertical: dimensionalState.primary_vertical,
    domains: dimensionalState.primary_horizontal,
    v_mode: dimensionalState.v_mode_triggered,
    emergency: dimensionalState.emergency_detected,
    arousal: dimensionalState.integration.phi > 0.7 ? 'high' : dimensionalState.integration.phi > 0.3 ? 'medium' : 'low',
    phi: dimensionalState.integration.phi,
  };

  // Emergency takes priority
  if (context.emergency) {
    elements.push(generateAgentResponse('SOMATIC', 'emergency', context));
    return elements.join(' ');
  }

  // V_MODE gets reflection
  if (context.v_mode) {
    elements.push(generateAgentResponse('V_MODE', 'inquiry', context));
    return elements.join(' ');
  }

  // Primary vertical determines main response
  switch (context.vertical) {
    case 'SOMATIC':
      elements.push(generateAgentResponse('SOMATIC', 'awareness', context));
      break;
    case 'EXISTENTIAL':
      if (dimensionalState.horizontal.H06_MEANING > 0.3) {
        elements.push(generateAgentResponse('EXISTENTIAL', 'meaning', context));
      } else {
        elements.push(generateAgentResponse('EXISTENTIAL', 'lost', context));
      }
      break;
    case 'RELATIONAL':
      if (dimensionalState.integration.tension > 0.3) {
        elements.push(generateAgentResponse('RELATIONAL', 'conflict', context));
      } else {
        elements.push(generateAgentResponse('RELATIONAL', 'connection', context));
      }
      break;
    case 'FUNCTIONAL':
      if (dimensionalState.horizontal.H08_TEMPORAL > 0.3) {
        elements.push(generateAgentResponse('FUNCTIONAL', 'urgency', context));
      } else {
        elements.push(generateAgentResponse('FUNCTIONAL', 'decision', context));
      }
      break;
    case 'TRANSCENDENT':
      elements.push(generateAgentResponse('V_MODE', 'inquiry', context));
      break;
  }

  // Add synthesis if cross-dimensional
  if (dimensionalState.cross_dimensional) {
    elements.push(generateAgentResponse('SYNTHESIS', 'integration', context));
  }

  // Add tension acknowledgment
  if (dimensionalState.integration.tension > 0.5) {
    elements.push(generateAgentResponse('SYNTHESIS', 'tension', context));
  }

  // Fallback
  if (elements.length === 0) {
    elements.push(generateAgentResponse('ACKNOWLEDGMENT', 'hearing', context));
  }

  return elements.join(' ');
}

// ============================================
// DOMAIN-SPECIFIC GENERATORS
// ============================================

const DOMAIN_RESPONSES: Record<HumanDomain, LanguageTemplates> = {
  H01_SURVIVAL: {
    en: ["What feels most essential right now?", "Your safety matters."],
    it: ["Cosa ti sembra più essenziale adesso?", "La tua sicurezza conta."],
    es: ["¿Qué te parece más esencial ahora?"],
    fr: ["Qu'est-ce qui te semble le plus essentiel maintenant?"],
    de: ["Was fühlt sich gerade am wesentlichsten an?"],
  },
  H02_SAFETY: {
    en: ["You deserve to feel safe.", "What would help you feel more secure?"],
    it: ["Meriti di sentirti al sicuro.", "Cosa ti aiuterebbe a sentirti più sicuro?"],
    es: ["Mereces sentirte seguro.", "¿Qué te ayudaría a sentirte más seguro?"],
    fr: ["Tu mérites de te sentir en sécurité."],
    de: ["Du verdienst es, dich sicher zu fühlen."],
  },
  H03_BODY: {
    en: ["Your body is speaking. What is it saying?", "What does your body need?"],
    it: ["Il tuo corpo sta parlando. Cosa sta dicendo?", "Di cosa ha bisogno il tuo corpo?"],
    es: ["Tu cuerpo está hablando. ¿Qué está diciendo?"],
    fr: ["Ton corps parle. Que dit-il?"],
    de: ["Dein Körper spricht. Was sagt er?"],
  },
  H04_EMOTION: {
    en: ["All feelings are valid.", "What emotion is strongest right now?"],
    it: ["Tutte le emozioni sono valide.", "Quale emozione è più forte adesso?"],
    es: ["Todas las emociones son válidas."],
    fr: ["Toutes les émotions sont valides."],
    de: ["Alle Gefühle sind gültig."],
  },
  H05_COGNITION: {
    en: ["What does your mind say about this?", "How do you make sense of this?"],
    it: ["Cosa dice la tua mente su questo?", "Come dai un senso a questo?"],
    es: ["¿Qué dice tu mente sobre esto?"],
    fr: ["Que dit ton esprit à ce sujet?"],
    de: ["Was sagt dein Verstand dazu?"],
  },
  H06_MEANING: {
    en: ["What matters most to you here?", "What gives this meaning?"],
    it: ["Cosa conta di più per te qui?", "Cosa dà significato a questo?"],
    es: ["¿Qué es lo que más te importa aquí?"],
    fr: ["Qu'est-ce qui compte le plus pour toi ici?"],
    de: ["Was ist dir hier am wichtigsten?"],
  },
  H07_IDENTITY: {
    en: ["Who are you becoming through this?", "What does this say about who you are?"],
    it: ["Chi stai diventando attraverso questo?", "Cosa dice questo su chi sei?"],
    es: ["¿En quién te estás convirtiendo a través de esto?"],
    fr: ["Qui deviens-tu à travers cela?"],
    de: ["Wer wirst du durch diese Erfahrung?"],
  },
  H08_TEMPORAL: {
    en: ["How does time feel in this moment?", "The present moment is where you are."],
    it: ["Come si sente il tempo in questo momento?", "Il momento presente è dove sei."],
    es: ["¿Cómo se siente el tiempo en este momento?"],
    fr: ["Comment ressens-tu le temps en ce moment?"],
    de: ["Wie fühlt sich die Zeit in diesem Moment an?"],
  },
  H09_ATTACHMENT: {
    en: ["This bond matters to you.", "What does this connection need?"],
    it: ["Questo legame conta per te.", "Di cosa ha bisogno questa connessione?"],
    es: ["Este vínculo te importa."],
    fr: ["Ce lien compte pour toi."],
    de: ["Diese Bindung ist dir wichtig."],
  },
  H10_COORDINATION: {
    en: ["How can things work together here?", "What needs to align?"],
    it: ["Come possono funzionare insieme le cose qui?", "Cosa deve allinearsi?"],
    es: ["¿Cómo pueden funcionar juntas las cosas aquí?"],
    fr: ["Comment les choses peuvent-elles fonctionner ensemble ici?"],
    de: ["Wie können die Dinge hier zusammenarbeiten?"],
  },
  H11_BELONGING: {
    en: ["You belong.", "Where do you feel most at home?"],
    it: ["Appartieni.", "Dove ti senti più a casa?"],
    es: ["Perteneces.", "¿Dónde te sientes más en casa?"],
    fr: ["Tu appartiens.", "Où te sens-tu le plus chez toi?"],
    de: ["Du gehörst dazu.", "Wo fühlst du dich am meisten zu Hause?"],
  },
  H12_HIERARCHY: {
    en: ["Where do you stand in this?", "What role feels true to you?"],
    it: ["Dove ti collochi in questo?", "Quale ruolo ti sembra vero?"],
    es: ["¿Dónde te sitúas en esto?"],
    fr: ["Où te situes-tu dans tout cela?"],
    de: ["Wo stehst du dabei?"],
  },
  H13_CREATION: {
    en: ["What wants to be created here?", "What could you bring into being?"],
    it: ["Cosa vuole essere creato qui?", "Cosa potresti portare all'esistenza?"],
    es: ["¿Qué quiere ser creado aquí?"],
    fr: ["Qu'est-ce qui veut être créé ici?"],
    de: ["Was will hier erschaffen werden?"],
  },
  H14_WORK: {
    en: ["Work can be meaningful or draining. Which is this?", "What matters in your work?"],
    it: ["Il lavoro può essere significativo o svuotante. Qual è questo?", "Cosa conta nel tuo lavoro?"],
    es: ["El trabajo puede ser significativo o agotador. ¿Cuál es este?"],
    fr: ["Le travail peut être significatif ou épuisant. Lequel est-ce?"],
    de: ["Arbeit kann bedeutungsvoll oder erschöpfend sein. Was ist das hier?"],
  },
  H15_LEGAL: {
    en: ["What's the right thing here?", "Rules and principles matter. So do you."],
    it: ["Qual è la cosa giusta qui?", "Le regole e i principi contano. E anche tu."],
    es: ["¿Qué es lo correcto aquí?"],
    fr: ["Qu'est-ce qui est juste ici?"],
    de: ["Was ist hier das Richtige?"],
  },
  H16_OPERATIONAL: {
    en: ["What needs to happen next?", "One step at a time."],
    it: ["Cosa deve succedere dopo?", "Un passo alla volta."],
    es: ["¿Qué tiene que pasar después?", "Un paso a la vez."],
    fr: ["Que doit-il se passer ensuite?", "Une étape à la fois."],
    de: ["Was muss als Nächstes passieren?", "Schritt für Schritt."],
  },
  H17_FORM: {
    en: ["What structure would serve you?", "Form can hold or constrain."],
    it: ["Quale struttura ti servirebbe?", "La forma può contenere o costringere."],
    es: ["¿Qué estructura te serviría?"],
    fr: ["Quelle structure te servirait?"],
    de: ["Welche Struktur würde dir dienen?"],
  },
};

/**
 * Generate domain-specific response
 */
export function generateDomainResponse(
  domain: HumanDomain,
  language: SupportedLanguage,
  variationIndex: number = 0
): string {
  const domainTemplates = DOMAIN_RESPONSES[domain];
  const langTemplates = domainTemplates[language] || domainTemplates.en;
  return langTemplates[variationIndex % langTemplates.length];
}

export default {
  generateAgentResponse,
  generateContextualResponse,
  generateDomainResponse,
};
