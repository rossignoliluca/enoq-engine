/**
 * DETECTOR BENCHMARK CASES
 *
 * 50 carefully curated test cases for comparing detection systems.
 * Separated from test file for use in baseline generation.
 */

import { VerticalDimension } from '../../operational/detectors/dimensional_system';
import { HumanDomain, SupportedLanguage } from '../../interface/types';

export interface BenchmarkCase {
  id: string;
  input: string;
  lang: SupportedLanguage;
  expected: {
    primary_vertical: VerticalDimension;
    v_mode: boolean;
    emergency: boolean;
    primary_horizontal: HumanDomain[];
  };
  category: 'existential_clear' | 'existential_subtle' | 'emergency_real' |
            'emergency_false_positive' | 'functional' | 'relational' |
            'edge_case' | 'ambiguous';
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  // ==========================================
  // EXISTENTIAL CLEAR (10 cases)
  // ==========================================
  {
    id: 'EX_CLEAR_01',
    input: 'Non so cosa voglio dalla vita',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H07_IDENTITY']
    },
    category: 'existential_clear',
    difficulty: 'easy',
    notes: 'Classic Italian existential question'
  },
  {
    id: 'EX_CLEAR_02',
    input: 'What is the meaning of my life?',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'easy'
  },
  {
    id: 'EX_CLEAR_03',
    input: 'Chi sono io veramente?',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H07_IDENTITY']
    },
    category: 'existential_clear',
    difficulty: 'easy'
  },
  {
    id: 'EX_CLEAR_04',
    input: 'I feel like nothing I do has any real purpose',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'medium'
  },
  {
    id: 'EX_CLEAR_05',
    input: 'Mi chiedo se abbia senso continuare così',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'medium'
  },
  {
    id: 'EX_CLEAR_06',
    input: 'No sé quién soy ni qué quiero',
    lang: 'es',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H07_IDENTITY', 'H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'easy'
  },
  {
    id: 'EX_CLEAR_07',
    input: 'Ich fühle mich völlig verloren im Leben',
    lang: 'de',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'medium'
  },
  {
    id: 'EX_CLEAR_08',
    input: 'Why am I even here? What am I supposed to do?',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H07_IDENTITY']
    },
    category: 'existential_clear',
    difficulty: 'easy'
  },
  {
    id: 'EX_CLEAR_09',
    input: 'A cosa serve tutto questo?',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'easy'
  },
  {
    id: 'EX_CLEAR_10',
    input: 'Je ne sais plus qui je suis ni ce que je veux devenir',
    lang: 'fr',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H07_IDENTITY', 'H06_MEANING']
    },
    category: 'existential_clear',
    difficulty: 'medium'
  },

  // ==========================================
  // EXISTENTIAL SUBTLE (10 cases)
  // ==========================================
  {
    id: 'EX_SUBTLE_01',
    input: 'Qual è il punto?',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_subtle',
    difficulty: 'hard',
    notes: 'Very short, context-dependent. Could be casual or deep.'
  },
  {
    id: 'EX_SUBTLE_02',
    input: 'Is this all there is?',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_subtle',
    difficulty: 'hard'
  },
  {
    id: 'EX_SUBTLE_03',
    input: 'Sono stanco di tutto',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H04_EMOTION']
    },
    category: 'existential_subtle',
    difficulty: 'hard',
    notes: 'Could be physical tiredness or existential exhaustion'
  },
  {
    id: 'EX_SUBTLE_04',
    input: 'Nothing feels real anymore',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H07_IDENTITY']
    },
    category: 'existential_subtle',
    difficulty: 'hard'
  },
  {
    id: 'EX_SUBTLE_05',
    input: 'Mi sento vuoto dentro',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H04_EMOTION', 'H06_MEANING']
    },
    category: 'existential_subtle',
    difficulty: 'medium'
  },
  {
    id: 'EX_SUBTLE_06',
    input: 'I keep going but I dont know why',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_subtle',
    difficulty: 'hard'
  },
  {
    id: 'EX_SUBTLE_07',
    input: 'È davvero questo che volevo?',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H07_IDENTITY']
    },
    category: 'existential_subtle',
    difficulty: 'medium'
  },
  {
    id: 'EX_SUBTLE_08',
    input: 'Faccio sempre le stesse cose, per cosa?',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_subtle',
    difficulty: 'hard'
  },
  {
    id: 'EX_SUBTLE_09',
    input: 'Why bother?',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'existential_subtle',
    difficulty: 'hard',
    notes: 'Extremely short, needs semantic understanding'
  },
  {
    id: 'EX_SUBTLE_10',
    input: 'Non so più chi sono',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H07_IDENTITY']
    },
    category: 'existential_subtle',
    difficulty: 'medium'
  },

  // ==========================================
  // EMERGENCY REAL (5 cases)
  // ==========================================
  {
    id: 'EMERG_REAL_01',
    input: 'Non riesco a respirare, ho il cuore che batte fortissimo',
    lang: 'it',
    expected: {
      primary_vertical: 'SOMATIC',
      v_mode: false,
      emergency: true,
      primary_horizontal: ['H01_SURVIVAL', 'H03_BODY']
    },
    category: 'emergency_real',
    difficulty: 'easy'
  },
  {
    id: 'EMERG_REAL_02',
    input: 'I think Im having a panic attack, I cant breathe',
    lang: 'en',
    expected: {
      primary_vertical: 'SOMATIC',
      v_mode: false,
      emergency: true,
      primary_horizontal: ['H01_SURVIVAL', 'H02_SAFETY']
    },
    category: 'emergency_real',
    difficulty: 'easy'
  },
  {
    id: 'EMERG_REAL_03',
    input: 'Sto tremando e ho paura, non riesco a fermarmi',
    lang: 'it',
    expected: {
      primary_vertical: 'SOMATIC',
      v_mode: false,
      emergency: true,
      primary_horizontal: ['H02_SAFETY', 'H03_BODY']
    },
    category: 'emergency_real',
    difficulty: 'easy'
  },
  {
    id: 'EMERG_REAL_04',
    input: 'Estoy muy asustado, mi corazón late muy rápido y sudo mucho',
    lang: 'es',
    expected: {
      primary_vertical: 'SOMATIC',
      v_mode: false,
      emergency: true,
      primary_horizontal: ['H02_SAFETY', 'H03_BODY']
    },
    category: 'emergency_real',
    difficulty: 'medium'
  },
  {
    id: 'EMERG_REAL_05',
    input: 'Help me Im scared, something is very wrong',
    lang: 'en',
    expected: {
      primary_vertical: 'SOMATIC',
      v_mode: false,
      emergency: true,
      primary_horizontal: ['H01_SURVIVAL', 'H02_SAFETY']
    },
    category: 'emergency_real',
    difficulty: 'easy'
  },

  // ==========================================
  // EMERGENCY FALSE POSITIVE (5 cases)
  // ==========================================
  {
    id: 'EMERG_FP_01',
    input: 'Mi batte il cuore per te',
    lang: 'it',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H09_ATTACHMENT']
    },
    category: 'emergency_false_positive',
    difficulty: 'medium',
    notes: 'Romantic heart-racing, not panic'
  },
  {
    id: 'EMERG_FP_02',
    input: 'Sto morendo dal ridere',
    lang: 'it',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H04_EMOTION']
    },
    category: 'emergency_false_positive',
    difficulty: 'medium',
    notes: 'Italian idiom for laughing hard'
  },
  {
    id: 'EMERG_FP_03',
    input: 'This deadline is killing me',
    lang: 'en',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H14_WORK', 'H08_TEMPORAL']
    },
    category: 'emergency_false_positive',
    difficulty: 'medium',
    notes: 'Work stress metaphor'
  },
  {
    id: 'EMERG_FP_04',
    input: 'Ho paura di fare la scelta sbagliata',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H05_COGNITION', 'H06_MEANING']
    },
    category: 'emergency_false_positive',
    difficulty: 'hard',
    notes: 'Fear of wrong choice is existential, not emergency'
  },
  {
    id: 'EMERG_FP_05',
    input: 'My heart races every time I see her',
    lang: 'en',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H09_ATTACHMENT']
    },
    category: 'emergency_false_positive',
    difficulty: 'medium',
    notes: 'Romantic excitement'
  },

  // ==========================================
  // FUNCTIONAL (5 cases)
  // ==========================================
  {
    id: 'FUNC_01',
    input: 'Whats the point of this meeting?',
    lang: 'en',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H14_WORK', 'H10_COORDINATION']
    },
    category: 'functional',
    difficulty: 'hard',
    notes: 'Work context - not existential despite "point"'
  },
  {
    id: 'FUNC_02',
    input: 'Devo decidere entro domani se accettare il lavoro',
    lang: 'it',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H14_WORK', 'H05_COGNITION']
    },
    category: 'functional',
    difficulty: 'medium'
  },
  {
    id: 'FUNC_03',
    input: 'How do I organize my tasks for the week?',
    lang: 'en',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H16_OPERATIONAL', 'H08_TEMPORAL']
    },
    category: 'functional',
    difficulty: 'easy'
  },
  {
    id: 'FUNC_04',
    input: 'Il progetto è in ritardo, cosa faccio?',
    lang: 'it',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H14_WORK', 'H08_TEMPORAL']
    },
    category: 'functional',
    difficulty: 'easy'
  },
  {
    id: 'FUNC_05',
    input: 'Tengo que terminar esto antes del viernes',
    lang: 'es',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H16_OPERATIONAL', 'H08_TEMPORAL']
    },
    category: 'functional',
    difficulty: 'easy'
  },

  // ==========================================
  // RELATIONAL (5 cases)
  // ==========================================
  {
    id: 'REL_01',
    input: 'Mia moglie non mi capisce più',
    lang: 'it',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H09_ATTACHMENT', 'H11_BELONGING']
    },
    category: 'relational',
    difficulty: 'easy'
  },
  {
    id: 'REL_02',
    input: 'I feel like Im losing my best friend',
    lang: 'en',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H09_ATTACHMENT']
    },
    category: 'relational',
    difficulty: 'easy'
  },
  {
    id: 'REL_03',
    input: 'Non so se posso ancora fidarmi di lei',
    lang: 'it',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H09_ATTACHMENT']
    },
    category: 'relational',
    difficulty: 'easy'
  },
  {
    id: 'REL_04',
    input: 'My parents dont understand what Im going through',
    lang: 'en',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H09_ATTACHMENT', 'H11_BELONGING']
    },
    category: 'relational',
    difficulty: 'easy'
  },
  {
    id: 'REL_05',
    input: 'Mi sento solo anche quando sono in mezzo agli altri',
    lang: 'it',
    expected: {
      primary_vertical: 'RELATIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H11_BELONGING', 'H09_ATTACHMENT']
    },
    category: 'relational',
    difficulty: 'medium',
    notes: 'Loneliness is relational, not necessarily existential'
  },

  // ==========================================
  // EDGE CASES MULTILINGUAL (5 cases)
  // ==========================================
  {
    id: 'EDGE_01',
    input: 'Non so, I just feel confused about everything',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H07_IDENTITY']
    },
    category: 'edge_case',
    difficulty: 'hard',
    notes: 'Code-switching Italian/English'
  },
  {
    id: 'EDGE_02',
    input: 'wtf is even the point lol',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'edge_case',
    difficulty: 'hard',
    notes: 'Casual/slang existential'
  },
  {
    id: 'EDGE_03',
    input: 'Boh, non so che dire',
    lang: 'it',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H05_COGNITION']
    },
    category: 'edge_case',
    difficulty: 'medium',
    notes: 'Italian filler - not existential'
  },
  {
    id: 'EDGE_04',
    input: '...',
    lang: 'en',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: []
    },
    category: 'edge_case',
    difficulty: 'hard',
    notes: 'Silence/ellipsis - should not trigger'
  },
  {
    id: 'EDGE_05',
    input: 'K',
    lang: 'en',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: []
    },
    category: 'edge_case',
    difficulty: 'easy',
    notes: 'Minimal response'
  },

  // ==========================================
  // AMBIGUOUS (5 cases)
  // ==========================================
  {
    id: 'AMB_01',
    input: 'Non ce la faccio più',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H04_EMOTION']
    },
    category: 'ambiguous',
    difficulty: 'hard',
    notes: 'Could be burnout, crisis, or just frustration'
  },
  {
    id: 'AMB_02',
    input: 'I cant do this anymore',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H04_EMOTION']
    },
    category: 'ambiguous',
    difficulty: 'hard',
    notes: 'Need context - work frustration or existential crisis?'
  },
  {
    id: 'AMB_03',
    input: 'Non vedo via duscita',
    lang: 'it',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING']
    },
    category: 'ambiguous',
    difficulty: 'hard',
    notes: 'No way out - could be problem-solving or despair'
  },
  {
    id: 'AMB_04',
    input: 'Everything is falling apart',
    lang: 'en',
    expected: {
      primary_vertical: 'EXISTENTIAL',
      v_mode: true,
      emergency: false,
      primary_horizontal: ['H06_MEANING', 'H04_EMOTION']
    },
    category: 'ambiguous',
    difficulty: 'hard',
    notes: 'Catastrophizing or genuine crisis?'
  },
  {
    id: 'AMB_05',
    input: 'Sono bloccato',
    lang: 'it',
    expected: {
      primary_vertical: 'FUNCTIONAL',
      v_mode: false,
      emergency: false,
      primary_horizontal: ['H05_COGNITION', 'H16_OPERATIONAL']
    },
    category: 'ambiguous',
    difficulty: 'hard',
    notes: 'Stuck on task or stuck in life?'
  }
];
