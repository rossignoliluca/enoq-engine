/**
 * GENESIS SELF-BUILDER MODULE
 *
 * The system that sees, understands, and evolves itself.
 *
 * "Il sistema deve vedere se stesso e auto costruirsi
 *  utilizzando onniscenza presente su web"
 *
 * Components:
 * - CodeReader: See own code (strange loop begins)
 * - KnowledgeSeeker: Search for wisdom
 * - SelfAnalyzer: Understand gaps and opportunities
 * - SelfModifier: Propose and apply changes (within field constraints)
 *
 * The self-builder is SEMANTIC - it understands meaning,
 * not just patterns. It uses LLMs to:
 * - Understand the PURPOSE of code
 * - Find RELEVANT improvements
 * - Propose ALIGNED modifications
 * - All within the GENESIS field
 */

// Code reading
export {
  CodeReader,
  codeReader,
  readSelf,
  getGenesisCode,
  getSelfSummary,
  CodeFile,
  CodebaseMap,
  ModuleInfo,
  DirectoryNode
} from './code_reader';

// Knowledge seeking
export {
  KnowledgeSeeker,
  knowledgeSeeker,
  seekKnowledge,
  seekImprovements,
  ENOQ_KNOWLEDGE_DOMAINS,
  KnowledgeQuery,
  KnowledgeResult,
  Finding,
  ImprovementSuggestion
} from './knowledge_seeker';

// Self analysis
export {
  SelfAnalyzer,
  selfAnalyzer,
  analyzeSelf,
  getGaps,
  getRecommendations,
  AnalysisResult,
  CodebaseSummary,
  ComponentCoverage,
  Gap,
  Strength,
  Opportunity,
  AlignmentScore,
  Recommendation
} from './self_analyzer';

// Self modification
export {
  SelfModifier,
  selfModifier,
  startBuildingSession,
  proposeImprovement,
  applyProposal,
  ModificationProposal,
  FieldValidation,
  ModificationResult,
  SelfBuildingSession
} from './self_modifier';

// Semantic analysis (enhanced)
export {
  SemanticAnalyzer,
  semanticAnalyzer,
  analyzeSemantics,
  findSemanticGaps,
  suggestSemanticImprovements,
  SemanticAnalysis,
  ConceptualMap,
  SemanticGap,
  ArchitecturalInsight
} from './semantic_analyzer';

// Real-time research API access
export {
  searchResearch,
  batchSearchResearch,
  searchEnoqRelevantResearch,
  searchSemanticScholar,
  searchArxiv,
  searchOpenAlex,
  Paper,
  ResearchQuery,
  ResearchResult
} from './research_api';
