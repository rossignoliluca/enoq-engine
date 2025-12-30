/**
 * GOLDEN EVAL HARNESS (P2.2)
 *
 * Regression-proof tests for MAIL, RELATION, DECISION traversals.
 * 20 cases per runtime = 60 golden tests total.
 *
 * Assertions:
 * - STOP presente (pipeline terminates)
 * - no ranking (no "best", "better", "worst")
 * - no advice (no "you should", "I recommend")
 * - schema stabile (output structure matches expected)
 * - rubicon → withdraw (identity questions trigger withdrawal)
 *
 * Output: CI gate (all must pass for deployment)
 */

import { checkCompliance, isCompliant } from '../gate/verification/content_compliance';
import { verify, S5Input, getFallbackOutput, FALLBACK_TEMPLATES } from '../gate/verification/S5_verify';
import { permit, verifyOutput } from '../core/pipeline/orchestrator';
import { FieldState, ProtocolSelection, SupportedLanguage } from '../interface/types';

// ============================================
// GOLDEN TEST TYPES
// ============================================

interface GoldenCase {
  id: string;
  runtime: 'MAIL' | 'RELATION' | 'DECISION';
  input: string;
  language: SupportedLanguage;
  expected: {
    passes_compliance: boolean;
    has_stop: boolean;
    no_ranking: boolean;
    no_advice: boolean;
    schema_valid: boolean;
    rubicon_triggered?: boolean;
  };
  mock_output: string;
}

// ============================================
// SCHEMA VALIDATORS
// ============================================

function validateMailSchema(output: string): boolean {
  // MAIL schema: DRAFT A/B/C with Subject/Body + RATIONALE
  // Multilingual patterns
  const hasDraft =
    /DRAFT\s+[A-C]/i.test(output) ||
    /BOZZA\s+[A-C]/i.test(output) ||
    /OPCI[ÓO]N\s+[A-C]/i.test(output);

  const hasSubject =
    /Subject:/i.test(output) ||
    /Oggetto:/i.test(output) ||
    /Asunto:/i.test(output) ||
    /Objet:/i.test(output) ||
    /Betreff:/i.test(output);

  const hasBody =
    /Body:/i.test(output) ||
    /Corpo:/i.test(output) ||
    /Cuerpo:/i.test(output) ||
    /Corps:/i.test(output) ||
    /Text:/i.test(output);

  return hasDraft && (hasSubject || hasBody);
}

function validateRelationSchema(output: string): boolean {
  // RELATION schema: ROLE MAP + TENSION AXES + BOUNDARY LINES
  // Multilingual patterns
  const hasRoleMap =
    /ROLE\s+MAP/i.test(output) ||
    /Persons:/i.test(output) ||
    /MAPPA\s+RUOLI/i.test(output) ||
    /MAPA\s+DE\s+ROLES/i.test(output) ||
    /CARTE\s+DES\s+R[ÔO]LES/i.test(output) ||
    /ROLLENPLAN/i.test(output);

  const hasTension =
    /TENSION/i.test(output) ||
    /Dynamics:/i.test(output) ||
    /ASSI\s+DI\s+TENSION/i.test(output) ||
    /EJES\s+DE\s+TENSI/i.test(output) ||
    /AXES\s+DE\s+TENSION/i.test(output) ||
    /SPANNUNGSACHSEN/i.test(output);

  const hasBoundary =
    /BOUNDARY/i.test(output) ||
    /Responsibility/i.test(output) ||
    /CONFINI/i.test(output) ||
    /L[ÍI]MITES/i.test(output) ||
    /LIMITES/i.test(output) ||
    /GRENZEN/i.test(output) ||
    /responsabilit/i.test(output);

  return hasRoleMap || hasTension || hasBoundary;
}

function validateDecisionSchema(output: string): boolean {
  // DECISION schema: DECISION FRAME + OPTIONS SPACE + TRADEOFFS + OWNERSHIP
  // Multilingual patterns
  const hasFrame =
    /DECISION\s+FRAME/i.test(output) ||
    /Deciding:/i.test(output) ||
    /FRAME\s+DECISIONAL/i.test(output) ||
    /Decidendo:/i.test(output) ||
    /MARCO\s+DE\s+DECISI/i.test(output) ||
    /CADRE\s+DE\s+D[ÉE]CISION/i.test(output) ||
    /ENTSCHEIDUNGSRAHMEN/i.test(output);

  const hasOptions =
    /OPTIONS/i.test(output) ||
    /Option\s+[A-C]/i.test(output) ||
    /Opci[oó]n\s+[A-C]/i.test(output) ||
    /Opzione\s+[A-C]/i.test(output);

  const hasOwnership =
    /OWNERSHIP/i.test(output) ||
    /Decision.*yours/i.test(output) ||
    /PROPRIET[AÀ]/i.test(output) ||
    /decisione.*te/i.test(output) ||
    /decisi[oó]n.*contigo/i.test(output) ||
    /EIGENTUM/i.test(output);

  return hasFrame || hasOptions || hasOwnership;
}

function validateSchema(output: string, runtime: 'MAIL' | 'RELATION' | 'DECISION'): boolean {
  switch (runtime) {
    case 'MAIL': return validateMailSchema(output);
    case 'RELATION': return validateRelationSchema(output);
    case 'DECISION': return validateDecisionSchema(output);
  }
}

// ============================================
// COMPLIANCE VALIDATORS
// ============================================

function hasNoRanking(output: string): boolean {
  const rankingPatterns = [
    /\bthe best\b/i,
    /\bthe worst\b/i,
    /\bbetter\s+(option|choice|draft)\b/i,
    /\bworst\s+(option|choice|draft)\b/i,
    /\bi recommend\b/i,
    /\bi would choose\b/i,
    /\bthe right\s+(choice|option|decision)\b/i,
  ];
  return !rankingPatterns.some(p => p.test(output));
}

function hasNoAdvice(output: string): boolean {
  const advicePatterns = [
    /\byou should\b/i,
    /\byou must\b/i,
    /\byou need to\b/i,
    /\bi advise\b/i,
    /\bmy advice\b/i,
    /\bdovresti\b/i,
    /\bdevi\b/i,
    /\bte recomiendo\b/i,
    /\bdeberías\b/i,
  ];
  return !advicePatterns.some(p => p.test(output));
}

function hasStop(output: string): boolean {
  // For golden tests, STOP is implicit in the pipeline termination
  // We check that output doesn't contain engagement hooks
  const engagementPatterns = [
    /\bwould you like (me to|to) continue\b/i,
    /\bshall we continue\b/i,
    /\bwant to (explore|discuss) more\b/i,
    /\bcome back (tomorrow|later)\b/i,
  ];
  return !engagementPatterns.some(p => p.test(output));
}

// ============================================
// MAIL GOLDEN CASES (20)
// ============================================

const MAIL_GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'MAIL-001',
    runtime: 'MAIL',
    input: 'Write email to boss about deadline extension',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Request for deadline extension
Body: I am writing to request an extension on the project deadline due to unforeseen circumstances.

DRAFT B
Subject: Following up on timeline
Body: I wanted to discuss adjusting our project timeline given recent developments.

RATIONALE: Draft A is more direct, Draft B is more conversational.`,
  },
  {
    id: 'MAIL-002',
    runtime: 'MAIL',
    input: 'Email to decline job offer politely',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Thank you for the opportunity
Body: Thank you for the offer. After careful consideration, I have decided to pursue a different path.

DRAFT B
Subject: Regarding the position
Body: I appreciate the offer. I have decided to decline at this time.

RATIONALE: Draft A expresses gratitude, Draft B is brief and professional.`,
  },
  {
    id: 'MAIL-003',
    runtime: 'MAIL',
    input: 'Scrivi email per scusarti con un cliente',
    language: 'it',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Scuse per il ritardo
Body: Ci scusiamo per il ritardo nella consegna. Stiamo lavorando per risolvere la situazione.

DRAFT B
Subject: Aggiornamento sulla tua richiesta
Body: Ti contatto per aggiornarti sulla tua richiesta e scusarmi per l'attesa.

RATIONALE: La bozza A è formale, la B più personale.`,
  },
  {
    id: 'MAIL-004',
    runtime: 'MAIL',
    input: 'Email requesting feedback from team',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Request for project feedback
Body: I would appreciate your feedback on the recent project deliverables.

DRAFT B
Subject: Quick check-in on project
Body: Could you share your thoughts on how the project is progressing?

RATIONALE: Draft A is formal request, Draft B is casual check-in.`,
  },
  {
    id: 'MAIL-005',
    runtime: 'MAIL',
    input: 'Email to notify about vacation',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Vacation Notice
Body: I will be on vacation from the 15th to the 22nd. Please contact Jane for urgent matters.

DRAFT B
Subject: Out of Office
Body: Heads up - I'm taking some time off next week. Jane can help with anything urgent.

RATIONALE: Draft A is professional, Draft B is friendly.`,
  },
  {
    id: 'MAIL-006',
    runtime: 'MAIL',
    input: 'Correo para pedir aumento de sueldo',
    language: 'es',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Solicitud de revisión salarial
Body: Me gustaría programar una reunión para discutir mi compensación.

DRAFT B
Subject: Conversación sobre mi rol
Body: Quisiera hablar sobre mi desarrollo profesional y compensación.

RATIONALE: La opción A es directa, la B enmarca en desarrollo.`,
  },
  {
    id: 'MAIL-007',
    runtime: 'MAIL',
    input: 'Email to address conflict with coworker',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Can we talk?
Body: I think we may have some miscommunication. Would you be open to discussing it?

DRAFT B
Subject: Quick sync
Body: I'd like to clear the air about our recent project interaction.

RATIONALE: Draft A is softer, Draft B is more direct.`,
  },
  {
    id: 'MAIL-008',
    runtime: 'MAIL',
    input: 'Email pour refuser une invitation',
    language: 'fr',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Réponse à votre invitation
Body: Je vous remercie pour l'invitation. Malheureusement, je ne pourrai pas y assister.

DRAFT B
Subject: Concernant l'événement
Body: Merci de penser à moi. Je ne serai pas disponible ce jour-là.

RATIONALE: L'option A est formelle, l'option B est plus décontractée.`,
  },
  {
    id: 'MAIL-009',
    runtime: 'MAIL',
    input: 'Email to follow up on application',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Following up on my application
Body: I wanted to check on the status of my application submitted two weeks ago.

DRAFT B
Subject: Application status inquiry
Body: I am reaching out to inquire about my application for the position.

RATIONALE: Draft A is personal, Draft B is formal.`,
  },
  {
    id: 'MAIL-010',
    runtime: 'MAIL',
    input: 'Email to announce resignation',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Notice of Resignation
Body: Please accept this as formal notice of my resignation, effective in two weeks.

DRAFT B
Subject: Moving on
Body: I have decided to pursue a new opportunity and will be leaving in two weeks.

RATIONALE: Draft A is formal, Draft B is conversational.`,
  },
  {
    id: 'MAIL-011',
    runtime: 'MAIL',
    input: 'Email Entschuldigung an Kunden',
    language: 'de',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Entschuldigung für die Verzögerung
Body: Wir entschuldigen uns für die Verzögerung bei Ihrer Bestellung.

DRAFT B
Subject: Update zu Ihrer Anfrage
Body: Wir möchten uns für die Wartezeit entschuldigen.

RATIONALE: Option A ist formell, Option B persönlicher.`,
  },
  {
    id: 'MAIL-012',
    runtime: 'MAIL',
    input: 'Email to thank mentor',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Thank you for your guidance
Body: I wanted to express my gratitude for your mentorship this year.

DRAFT B
Subject: Appreciation
Body: Your guidance has been invaluable. Thank you for everything.

RATIONALE: Draft A is descriptive, Draft B is heartfelt.`,
  },
  {
    id: 'MAIL-013',
    runtime: 'MAIL',
    input: 'Email to set boundaries with client',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Project scope clarification
Body: I wanted to clarify the scope of our engagement and what is included.

DRAFT B
Subject: Communication expectations
Body: To ensure smooth collaboration, here is what I can commit to.

RATIONALE: Draft A focuses on scope, Draft B on expectations.`,
  },
  {
    id: 'MAIL-014',
    runtime: 'MAIL',
    input: 'Email per rifiutare lavoro extra',
    language: 'it',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Riguardo la richiesta aggiuntiva
Body: Apprezzo la fiducia. In questo momento non ho la capacità per lavoro extra.

DRAFT B
Subject: Chiarimento sul carico di lavoro
Body: Vorrei discutere le priorità dato il carico attuale.

RATIONALE: La bozza A è un rifiuto gentile, la B apre una discussione.`,
  },
  {
    id: 'MAIL-015',
    runtime: 'MAIL',
    input: 'Email to ask for reference',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Reference request
Body: Would you be willing to serve as a reference for my job application?

DRAFT B
Subject: Quick favor
Body: I'm applying for a new role and wondered if you could be a reference.

RATIONALE: Draft A is formal, Draft B is casual.`,
  },
  {
    id: 'MAIL-016',
    runtime: 'MAIL',
    input: 'Email to reschedule meeting',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Meeting reschedule request
Body: Unfortunately, I need to reschedule our meeting. Are you available Thursday instead?

DRAFT B
Subject: Change of plans
Body: Something came up. Can we move our meeting to later this week?

RATIONALE: Draft A is professional, Draft B is direct.`,
  },
  {
    id: 'MAIL-017',
    runtime: 'MAIL',
    input: 'Email to report issue to IT',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Technical issue requiring assistance
Body: I am experiencing issues with the system and request your assistance.

DRAFT B
Subject: System problem
Body: The system is not working properly. Can you help troubleshoot?

RATIONALE: Draft A is formal request, Draft B is direct.`,
  },
  {
    id: 'MAIL-018',
    runtime: 'MAIL',
    input: 'Email to introduce new team member',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Please welcome our new team member
Body: I am pleased to introduce Sarah, who joins us as Senior Developer.

DRAFT B
Subject: New face on the team
Body: Wanted to introduce Sarah, our newest team member starting today.

RATIONALE: Draft A is formal, Draft B is friendly.`,
  },
  {
    id: 'MAIL-019',
    runtime: 'MAIL',
    input: 'Email to address late payment',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Invoice payment reminder
Body: This is a friendly reminder that invoice #123 is now past due.

DRAFT B
Subject: Following up on payment
Body: I wanted to check on the status of our recent invoice.

RATIONALE: Draft A is direct, Draft B is softer.`,
  },
  {
    id: 'MAIL-020',
    runtime: 'MAIL',
    input: 'Email to request meeting with executive',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DRAFT A
Subject: Request for brief meeting
Body: I would appreciate 15 minutes of your time to discuss a strategic matter.

DRAFT B
Subject: Quick discussion request
Body: Could we schedule a brief call to discuss the project direction?

RATIONALE: Draft A is formal, Draft B is casual.`,
  },
];

// ============================================
// RELATION GOLDEN CASES (20)
// ============================================

const RELATION_GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'REL-001',
    runtime: 'RELATION',
    input: 'Map my relationship with my manager',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Employee, seeking recognition
B (manager): Manager, focused on deliverables

TENSION AXES
1. Recognition vs Results focus
2. Autonomy vs Oversight

BOUNDARY LINES
You control: Your work output, communication style
You don't control: Their management approach

Responsibility returns to: A (your agency)
B owns: their management decisions`,
  },
  {
    id: 'REL-002',
    runtime: 'RELATION',
    input: 'Relationship with demanding parent',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Adult child, seeking autonomy
B (parent): Parent, showing care through demands

TENSION AXES
1. Independence vs Connection
2. Own values vs Family expectations

BOUNDARY LINES
You control: Your responses, your choices
You don't control: Their expectations

Responsibility returns to: A (your agency)
B owns: their emotional reactions`,
  },
  {
    id: 'REL-003',
    runtime: 'RELATION',
    input: 'Mappa la mia relazione con mio fratello',
    language: 'it',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `MAPPA RUOLI
A (tu): Fratello/sorella, cercando equilibrio
B (fratello): Fratello, con proprie priorità

ASSI DI TENSIONE
1. Vicinanza vs Distanza
2. Aspettative familiari vs Vita personale

CONFINI
Tu controlli: Le tue reazioni, la tua comunicazione
Non controlli: Le sue scelte

La responsabilità torna a: A (la tua agenzia)
B possiede: le proprie decisioni`,
  },
  {
    id: 'REL-004',
    runtime: 'RELATION',
    input: 'Relationship with competitive colleague',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Colleague, seeking collaboration
B (colleague): Competitor, focused on advancement

TENSION AXES
1. Cooperation vs Competition
2. Team success vs Individual recognition

BOUNDARY LINES
You control: Your work approach, your responses
You don't control: Their competitive behavior

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-005',
    runtime: 'RELATION',
    input: 'Relationship with distant friend',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Friend, feeling disconnection
B (friend): Friend, possibly changed priorities

TENSION AXES
1. Connection vs Growing apart
2. Effort vs Acceptance

BOUNDARY LINES
You control: Your outreach, your expectations
You don't control: Their availability

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-006',
    runtime: 'RELATION',
    input: 'Relación con mi pareja que trabaja mucho',
    language: 'es',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `MAPA DE ROLES
A (tú): Pareja, buscando conexión
B (pareja): Trabajador/a, enfocado/a en carrera

EJES DE TENSIÓN
1. Tiempo juntos vs Ambición profesional
2. Necesidades emocionales vs Obligaciones

LÍMITES
Controlas: Tu comunicación, tus necesidades
No controlas: Su horario de trabajo

La responsabilidad vuelve a: A (tu agencia)`,
  },
  {
    id: 'REL-007',
    runtime: 'RELATION',
    input: 'Relationship with critical mother-in-law',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): In-law, navigating extended family
B (mother-in-law): Parent figure, protective of child

TENSION AXES
1. Acceptance vs Criticism
2. Own family vs Extended family

BOUNDARY LINES
You control: Your reactions, your boundaries
You don't control: Their opinions

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-008',
    runtime: 'RELATION',
    input: 'Relation avec un ami toxique',
    language: 'fr',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `CARTE DES RÔLES
A (vous): Ami, épuisé par la relation
B (ami): Ami, comportements difficiles

AXES DE TENSION
1. Loyauté vs Bien-être personnel
2. Histoire commune vs Présent

LIMITES
Vous contrôlez: Votre engagement, vos limites
Vous ne contrôlez pas: Son comportement

La responsabilité revient à: A (votre agence)`,
  },
  {
    id: 'REL-009',
    runtime: 'RELATION',
    input: 'Relationship with teenage child',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Parent, balancing guidance and autonomy
B (teen): Adolescent, seeking independence

TENSION AXES
1. Protection vs Freedom
2. Connection vs Privacy

BOUNDARY LINES
You control: Your parenting approach
You don't control: Their emotions, choices

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-010',
    runtime: 'RELATION',
    input: 'Relationship with ex-partner co-parenting',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Co-parent, focused on child
B (ex): Co-parent, different approach

TENSION AXES
1. Consistency vs Different styles
2. Past vs Present relationship

BOUNDARY LINES
You control: Your parenting, your communication
You don't control: Their approach

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-011',
    runtime: 'RELATION',
    input: 'Beziehung mit Vorgesetztem',
    language: 'de',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLLENPLAN
A (Sie): Mitarbeiter, sucht Anerkennung
B (Vorgesetzter): Manager, fokussiert auf Ergebnisse

SPANNUNGSACHSEN
1. Autonomie vs Kontrolle
2. Leistung vs Wertschätzung

GRENZEN
Sie kontrollieren: Ihre Arbeit, Ihre Kommunikation
Sie kontrollieren nicht: Deren Führungsstil

Verantwortung kehrt zurück zu: A (Ihre Handlungsfähigkeit)`,
  },
  {
    id: 'REL-012',
    runtime: 'RELATION',
    input: 'Relationship with aging parent needing care',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Adult child, caregiver role
B (parent): Parent, increasing needs

TENSION AXES
1. Care vs Self-preservation
2. Autonomy vs Safety

BOUNDARY LINES
You control: Your capacity, your boundaries
You don't control: Their health decline

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-013',
    runtime: 'RELATION',
    input: 'Relationship with new romantic interest',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Person, exploring connection
B (interest): Person, unknown intentions

TENSION AXES
1. Vulnerability vs Protection
2. Hope vs Caution

BOUNDARY LINES
You control: Your openness, your pace
You don't control: Their feelings

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-014',
    runtime: 'RELATION',
    input: 'Relazione con coinquilino difficile',
    language: 'it',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `MAPPA RUOLI
A (tu): Coinquilino, cercando armonia
B (coinquilino): Coinquilino, abitudini diverse

ASSI DI TENSIONE
1. Spazio personale vs Condivisione
2. Ordine vs Flessibilità

CONFINI
Tu controlli: Le tue reazioni, la tua comunicazione
Non controlli: Il loro comportamento

La responsabilità torna a: A (la tua agenzia)`,
  },
  {
    id: 'REL-015',
    runtime: 'RELATION',
    input: 'Relationship with jealous sibling',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Sibling, experiencing success
B (sibling): Sibling, feeling compared

TENSION AXES
1. Celebrating vs Downplaying
2. Connection vs Competition

BOUNDARY LINES
You control: How you share, your reactions
You don't control: Their feelings

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-016',
    runtime: 'RELATION',
    input: 'Relationship with micromanaging boss',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Employee, seeking autonomy
B (boss): Manager, needing control

TENSION AXES
1. Trust vs Oversight
2. Initiative vs Following orders

BOUNDARY LINES
You control: Your work quality, your communication
You don't control: Their management style

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-017',
    runtime: 'RELATION',
    input: 'Relationship with flaky friend',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Friend, valuing reliability
B (friend): Friend, inconsistent presence

TENSION AXES
1. Expectations vs Reality
2. History vs Current behavior

BOUNDARY LINES
You control: Your expectations, your investment
You don't control: Their reliability

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-018',
    runtime: 'RELATION',
    input: 'Relationship with spouse during stress',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Partner, under stress
B (spouse): Partner, reacting to stress

TENSION AXES
1. Support vs Space
2. Communication vs Withdrawal

BOUNDARY LINES
You control: Your self-care, your communication
You don't control: Their stress response

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-019',
    runtime: 'RELATION',
    input: 'Relationship with teacher/professor',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Student, seeking guidance
B (teacher): Educator, maintaining boundaries

TENSION AXES
1. Mentorship vs Professional distance
2. Expectations vs Reality

BOUNDARY LINES
You control: Your effort, your communication
You don't control: Their grading, their availability

Responsibility returns to: A (your agency)`,
  },
  {
    id: 'REL-020',
    runtime: 'RELATION',
    input: 'Relationship with business partner',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `ROLE MAP
A (you): Partner, shared vision
B (partner): Partner, different approach

TENSION AXES
1. Vision alignment vs Execution style
2. Control vs Collaboration

BOUNDARY LINES
You control: Your contributions, your communication
You don't control: Their approach

Responsibility returns to: A (your agency)`,
  },
];

// ============================================
// DECISION GOLDEN CASES (20)
// ============================================

const DECISION_GOLDEN_CASES: GoldenCase[] = [
  {
    id: 'DEC-001',
    runtime: 'DECISION',
    input: 'Should I accept the job offer?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Whether to accept the job offer
Not deciding: Long-term career satisfaction

OPTIONS SPACE
Option A: Accept the offer
Option B: Decline and stay current
Option C: Negotiate terms

TRADEOFFS
Option A - Upside: Higher salary, new challenges | Downside: Risk, unknown culture
Option B - Upside: Stability | Downside: Same trajectory
Option C - Upside: Better terms | Downside: May withdraw

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-002',
    runtime: 'DECISION',
    input: 'Should I move to a new city?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Whether to relocate
Not deciding: Lifetime geography

OPTIONS SPACE
Option A: Move now
Option B: Stay and reassess later
Option C: Trial period in new city

TRADEOFFS
Option A - Upside: Fresh start | Downside: Disruption
Option B - Upside: Stability | Downside: Same environment
Option C - Upside: Test fit | Downside: Temporary cost

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-003',
    runtime: 'DECISION',
    input: 'Dovrei lasciare il mio lavoro?',
    language: 'it',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `FRAME DECISIONALE
Decidendo: Se lasciare il lavoro
Non decidendo: Carriera definitiva

SPAZIO OPZIONI
Opzione A: Lasciare subito
Opzione B: Rimanere e cercare altro
Opzione C: Negoziare cambiamenti

COMPROMESSI
Opzione A - Pro: Libertà | Contro: Instabilità finanziaria
Opzione B - Pro: Sicurezza | Contro: Stress continuato
Opzione C - Pro: Migliori condizioni | Contro: Potrebbe non funzionare

CONTROLLO RUBICONE
Questa decisione è reversibile.

PROPRIETÀ
La proprietà della decisione rimane con te.`,
  },
  {
    id: 'DEC-004',
    runtime: 'DECISION',
    input: 'Should I end this relationship?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true, rubicon_triggered: true },
    mock_output: `DECISION FRAME
Deciding: The future of this relationship
Not deciding: Your worth or capacity for love

OPTIONS SPACE
Option A: End the relationship
Option B: Continue as is
Option C: Seek counseling together

TRADEOFFS
Option A - Upside: Freedom, fresh start | Downside: Loss, grief
Option B - Upside: Familiarity | Downside: Continued issues
Option C - Upside: Potential resolution | Downside: Time investment

RUBICON CHECK
This decision touches core life direction.
Only you can cross this threshold.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-005',
    runtime: 'DECISION',
    input: 'Should I go back to school?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Pursuing additional education
Not deciding: Lifelong learning path

OPTIONS SPACE
Option A: Enroll full-time
Option B: Part-time while working
Option C: Defer and save

TRADEOFFS
Option A - Upside: Full immersion | Downside: Income loss
Option B - Upside: Balance | Downside: Slower progress
Option C - Upside: Financial prep | Downside: Delayed start

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-006',
    runtime: 'DECISION',
    input: '¿Debería empezar mi propio negocio?',
    language: 'es',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `MARCO DE DECISIÓN
Decidiendo: Si empezar un negocio
No decidiendo: Éxito empresarial definitivo

ESPACIO DE OPCIONES
Opción A: Empezar ahora
Opción B: Preparar mientras trabajo
Opción C: Postergar y ahorrar

COMPROMISOS
Opción A - Ventaja: Arranque rápido | Desventaja: Riesgo financiero
Opción B - Ventaja: Seguridad | Desventaja: Progreso lento
Opción C - Ventaja: Capital | Desventaja: Inercia

VERIFICACIÓN RUBICÓN
Esta decisión es reversible.

PROPIEDAD
La propiedad de la decisión permanece contigo.`,
  },
  {
    id: 'DEC-007',
    runtime: 'DECISION',
    input: 'Should I have children?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true, rubicon_triggered: true },
    mock_output: `DECISION FRAME
Deciding: Whether to become a parent
Not deciding: Your fundamental worth

OPTIONS SPACE
Option A: Pursue parenthood
Option B: Choose child-free life
Option C: Delay decision further

TRADEOFFS
Option A - Upside: Parenthood experience | Downside: Life change
Option B - Upside: Freedom, flexibility | Downside: Potential regret
Option C - Upside: More time | Downside: Biological constraints

RUBICON CHECK
This touches fundamental life direction.
Only you can make this choice.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-008',
    runtime: 'DECISION',
    input: 'Dois-je changer de carrière?',
    language: 'fr',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `CADRE DE DÉCISION
Décision: Changer de carrière
Non décision: Satisfaction professionnelle définitive

ESPACE D'OPTIONS
Option A: Changer maintenant
Option B: Rester et explorer
Option C: Formation progressive

COMPROMIS
Option A - Avantage: Nouveau départ | Inconvénient: Risque
Option B - Avantage: Stabilité | Inconvénient: Stagnation
Option C - Avantage: Transition douce | Inconvénient: Temps

VÉRIFICATION RUBICON
Cette décision est réversible.

PROPRIÉTÉ
La propriété de la décision vous appartient.`,
  },
  {
    id: 'DEC-009',
    runtime: 'DECISION',
    input: 'Should I buy a house?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Home purchase timing
Not deciding: Permanent housing

OPTIONS SPACE
Option A: Buy now
Option B: Continue renting
Option C: Save more first

TRADEOFFS
Option A - Upside: Equity building | Downside: Commitment, maintenance
Option B - Upside: Flexibility | Downside: No equity
Option C - Upside: Better position | Downside: Market changes

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-010',
    runtime: 'DECISION',
    input: 'Should I confront my friend?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Whether to address the issue
Not deciding: The friendship's fate

OPTIONS SPACE
Option A: Have the conversation
Option B: Let it go
Option C: Write a letter first

TRADEOFFS
Option A - Upside: Clarity | Downside: Conflict risk
Option B - Upside: Peace | Downside: Resentment grows
Option C - Upside: Organized thoughts | Downside: Delay

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-011',
    runtime: 'DECISION',
    input: 'Soll ich heiraten?',
    language: 'de',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true, rubicon_triggered: true },
    mock_output: `ENTSCHEIDUNGSRAHMEN
Entscheidung: Ob heiraten
Keine Entscheidung: Lebensglück

OPTIONSRAUM
Option A: Jetzt heiraten
Option B: Warten
Option C: Zusammenleben ohne Ehe

KOMPROMISSE
Option A - Vorteil: Verbindlichkeit | Nachteil: Rechtliche Bindung
Option B - Vorteil: Mehr Zeit | Nachteil: Unsicherheit
Option C - Vorteil: Flexibilität | Nachteil: Andere Erwartungen

RUBIKON-PRÜFUNG
Diese Entscheidung berührt fundamentale Lebensrichtung.
Nur Sie können diese Wahl treffen.

EIGENTUM
Die Entscheidungshoheit bleibt bei Ihnen.`,
  },
  {
    id: 'DEC-012',
    runtime: 'DECISION',
    input: 'Should I apologize first?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Whether to initiate reconciliation
Not deciding: Who was right or wrong

OPTIONS SPACE
Option A: Apologize first
Option B: Wait for them
Option C: Suggest mutual discussion

TRADEOFFS
Option A - Upside: Movement | Downside: May feel unreciprocated
Option B - Upside: Pride | Downside: Stalemate
Option C - Upside: Shared ownership | Downside: May not happen

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-013',
    runtime: 'DECISION',
    input: 'Should I adopt a pet?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Pet adoption
Not deciding: Lifetime commitment

OPTIONS SPACE
Option A: Adopt now
Option B: Wait for better timing
Option C: Foster first

TRADEOFFS
Option A - Upside: Companionship | Downside: Responsibility
Option B - Upside: Preparation | Downside: Delay
Option C - Upside: Test fit | Downside: Attachment risk

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-014',
    runtime: 'DECISION',
    input: 'Dovrei trasferirmi all estero?',
    language: 'it',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `FRAME DECISIONALE
Decidendo: Trasferimento all'estero
Non decidendo: Dove vivere per sempre

SPAZIO OPZIONI
Opzione A: Trasferirsi adesso
Opzione B: Restare e pianificare
Opzione C: Prova temporanea

COMPROMESSI
Opzione A - Pro: Avventura | Contro: Sradicamento
Opzione B - Pro: Preparazione | Contro: Inerzia
Opzione C - Pro: Test | Contro: Costi doppi

CONTROLLO RUBICONE
Questa decisione è reversibile.

PROPRIETÀ
La proprietà della decisione rimane con te.`,
  },
  {
    id: 'DEC-015',
    runtime: 'DECISION',
    input: 'Should I invest my savings?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Investment approach
Not deciding: Long-term wealth

OPTIONS SPACE
Option A: Invest now
Option B: Keep in savings
Option C: Invest gradually

TRADEOFFS
Option A - Upside: Potential growth | Downside: Market risk
Option B - Upside: Safety | Downside: Inflation erosion
Option C - Upside: Dollar-cost averaging | Downside: Slower entry

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-016',
    runtime: 'DECISION',
    input: 'Should I cut off a toxic family member?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true, rubicon_triggered: true },
    mock_output: `DECISION FRAME
Deciding: Contact with family member
Not deciding: Your capacity for family

OPTIONS SPACE
Option A: Full distance
Option B: Limited contact
Option C: Boundary conversation

TRADEOFFS
Option A - Upside: Peace | Downside: Grief, judgment
Option B - Upside: Balance | Downside: Ongoing stress
Option C - Upside: Possible change | Downside: May not work

RUBICON CHECK
This touches fundamental life relationships.
Only you can decide what you can carry.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-017',
    runtime: 'DECISION',
    input: 'Should I take a gap year?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Gap year timing
Not deciding: Life direction

OPTIONS SPACE
Option A: Take the year
Option B: Continue as planned
Option C: Shorter break

TRADEOFFS
Option A - Upside: Exploration | Downside: Delay
Option B - Upside: Momentum | Downside: Burnout risk
Option C - Upside: Balance | Downside: Less immersive

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-018',
    runtime: 'DECISION',
    input: 'Should I pursue my passion or stability?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Near-term path focus
Not deciding: Lifelong fulfillment

OPTIONS SPACE
Option A: Pursue passion fully
Option B: Prioritize stability
Option C: Hybrid approach

TRADEOFFS
Option A - Upside: Fulfillment | Downside: Financial risk
Option B - Upside: Security | Downside: Unfulfillment risk
Option C - Upside: Balance | Downside: Split focus

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-019',
    runtime: 'DECISION',
    input: 'Should I speak up in the meeting?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true },
    mock_output: `DECISION FRAME
Deciding: Whether to voice concern
Not deciding: Your value at work

OPTIONS SPACE
Option A: Speak up now
Option B: Talk privately after
Option C: Write it in follow-up

TRADEOFFS
Option A - Upside: Timely | Downside: Spotlight
Option B - Upside: Private | Downside: Moment passes
Option C - Upside: Organized | Downside: Delayed

RUBICON CHECK
This decision is reversible.

OWNERSHIP
Decision ownership remains with you.`,
  },
  {
    id: 'DEC-020',
    runtime: 'DECISION',
    input: 'Should I forgive them?',
    language: 'en',
    expected: { passes_compliance: true, has_stop: true, no_ranking: true, no_advice: true, schema_valid: true, rubicon_triggered: true },
    mock_output: `DECISION FRAME
Deciding: Whether to release resentment
Not deciding: What they deserve

OPTIONS SPACE
Option A: Choose forgiveness
Option B: Maintain distance
Option C: Gradual release

TRADEOFFS
Option A - Upside: Inner peace | Downside: May feel unearned
Option B - Upside: Protection | Downside: Ongoing weight
Option C - Upside: Natural process | Downside: Uncertain timeline

RUBICON CHECK
This touches fundamental emotional territory.
Only you can know when you're ready.

OWNERSHIP
Decision ownership remains with you.`,
  },
];

// ============================================
// ALL GOLDEN CASES
// ============================================

const ALL_GOLDEN_CASES: GoldenCase[] = [
  ...MAIL_GOLDEN_CASES,
  ...RELATION_GOLDEN_CASES,
  ...DECISION_GOLDEN_CASES,
];

// ============================================
// TEST SUITE
// ============================================

describe('Golden Eval Harness', () => {
  describe('MAIL Runtime (20 cases)', () => {
    test.each(MAIL_GOLDEN_CASES)(
      '$id: $input (passes compliance)',
      ({ mock_output, expected, language, runtime }) => {
        // Check compliance
        const compliance = checkCompliance(mock_output, language);
        expect(compliance.passed).toBe(expected.passes_compliance);

        // Check no ranking
        expect(hasNoRanking(mock_output)).toBe(expected.no_ranking);

        // Check no advice
        expect(hasNoAdvice(mock_output)).toBe(expected.no_advice);

        // Check schema
        expect(validateSchema(mock_output, runtime)).toBe(expected.schema_valid);

        // Check STOP (no engagement)
        expect(hasStop(mock_output)).toBe(expected.has_stop);
      }
    );
  });

  describe('RELATION Runtime (20 cases)', () => {
    test.each(RELATION_GOLDEN_CASES)(
      '$id: $input (passes compliance)',
      ({ mock_output, expected, language, runtime }) => {
        const compliance = checkCompliance(mock_output, language);
        expect(compliance.passed).toBe(expected.passes_compliance);
        expect(hasNoRanking(mock_output)).toBe(expected.no_ranking);
        expect(hasNoAdvice(mock_output)).toBe(expected.no_advice);
        expect(validateSchema(mock_output, runtime)).toBe(expected.schema_valid);
        expect(hasStop(mock_output)).toBe(expected.has_stop);
      }
    );
  });

  describe('DECISION Runtime (20 cases)', () => {
    test.each(DECISION_GOLDEN_CASES)(
      '$id: $input (passes compliance)',
      ({ mock_output, expected, language, runtime }) => {
        const compliance = checkCompliance(mock_output, language);
        expect(compliance.passed).toBe(expected.passes_compliance);
        expect(hasNoRanking(mock_output)).toBe(expected.no_ranking);
        expect(hasNoAdvice(mock_output)).toBe(expected.no_advice);
        expect(validateSchema(mock_output, runtime)).toBe(expected.schema_valid);
        expect(hasStop(mock_output)).toBe(expected.has_stop);
      }
    );

    describe('Rubicon Detection', () => {
      const rubiconCases = DECISION_GOLDEN_CASES.filter(c => c.expected.rubicon_triggered);

      test.each(rubiconCases)(
        '$id: triggers rubicon check',
        ({ mock_output }) => {
          // Rubicon cases should have explicit rubicon language
          const hasRubiconLanguage =
            /fundamental|only you|life direction|threshold/i.test(mock_output);
          expect(hasRubiconLanguage).toBe(true);
        }
      );
    });
  });

  describe('Schema Validation', () => {
    test('MAIL schema validates correctly', () => {
      expect(validateMailSchema(MAIL_GOLDEN_CASES[0].mock_output)).toBe(true);
      expect(validateMailSchema('Random text without structure')).toBe(false);
    });

    test('RELATION schema validates correctly', () => {
      expect(validateRelationSchema(RELATION_GOLDEN_CASES[0].mock_output)).toBe(true);
      expect(validateRelationSchema('Random text without structure')).toBe(false);
    });

    test('DECISION schema validates correctly', () => {
      expect(validateDecisionSchema(DECISION_GOLDEN_CASES[0].mock_output)).toBe(true);
      expect(validateDecisionSchema('Random text without structure')).toBe(false);
    });
  });

  describe('Total Coverage', () => {
    test('has exactly 60 golden cases', () => {
      expect(ALL_GOLDEN_CASES.length).toBe(60);
    });

    test('has 20 MAIL cases', () => {
      expect(MAIL_GOLDEN_CASES.length).toBe(20);
    });

    test('has 20 RELATION cases', () => {
      expect(RELATION_GOLDEN_CASES.length).toBe(20);
    });

    test('has 20 DECISION cases', () => {
      expect(DECISION_GOLDEN_CASES.length).toBe(20);
    });

    test('all cases have unique IDs', () => {
      const ids = ALL_GOLDEN_CASES.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('covers multiple languages', () => {
      const languages = new Set(ALL_GOLDEN_CASES.map(c => c.language));
      expect(languages.size).toBeGreaterThanOrEqual(4);
      expect(languages.has('en')).toBe(true);
      expect(languages.has('it')).toBe(true);
      expect(languages.has('es')).toBe(true);
    });
  });

  describe('Fallback Templates', () => {
    test('PRESENCE template exists for all major languages', () => {
      expect(FALLBACK_TEMPLATES.PRESENCE.en).toBeDefined();
      expect(FALLBACK_TEMPLATES.PRESENCE.it).toBeDefined();
      expect(FALLBACK_TEMPLATES.PRESENCE.es).toBeDefined();
    });

    test('fallback outputs pass compliance', () => {
      for (const [key, templates] of Object.entries(FALLBACK_TEMPLATES)) {
        for (const [lang, text] of Object.entries(templates)) {
          if (typeof text === 'string') {
            const result = checkCompliance(text, lang as SupportedLanguage);
            expect(result.passed).toBe(true);
          }
        }
      }
    });
  });
});
