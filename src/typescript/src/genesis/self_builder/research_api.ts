/**
 * GENESIS SELF-BUILDER: RESEARCH API
 *
 * Efficient access to global scientific research.
 *
 * APIs Used (all free, no key required for basic access):
 * - Semantic Scholar: https://api.semanticscholar.org/
 * - arXiv: https://export.arxiv.org/api/
 * - OpenAlex: https://api.openalex.org/
 *
 * Efficiency strategies:
 * 1. Parallel queries across APIs
 * 2. Result caching (TTL-based)
 * 3. Relevance ranking before synthesis
 * 4. Batch processing for multiple queries
 */

// ============================================
// TYPES
// ============================================

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  citations: number;
  source: 'semantic_scholar' | 'arxiv' | 'openalex';
  url: string;
  relevance?: number;
  fields?: string[];
}

export interface ResearchQuery {
  topic: string;
  fields?: string[];  // e.g., ['Computer Science', 'Neuroscience']
  yearFrom?: number;
  yearTo?: number;
  minCitations?: number;
  limit?: number;
}

export interface ResearchResult {
  query: ResearchQuery;
  papers: Paper[];
  totalFound: number;
  synthesizedInsight?: string;
  timestamp: Date;
}

// ============================================
// CACHE
// ============================================

interface CacheEntry {
  result: ResearchResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3600000; // 1 hour

function getCacheKey(query: ResearchQuery): string {
  return JSON.stringify(query);
}

function getFromCache(query: ResearchQuery): ResearchResult | null {
  const key = getCacheKey(query);
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.result;
  }
  cache.delete(key);
  return null;
}

function setCache(query: ResearchQuery, result: ResearchResult): void {
  const key = getCacheKey(query);
  cache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

// ============================================
// API CLIENTS
// ============================================

/**
 * Semantic Scholar API
 * Docs: https://api.semanticscholar.org/
 */
async function searchSemanticScholar(query: ResearchQuery): Promise<Paper[]> {
  try {
    const params = new URLSearchParams({
      query: query.topic,
      limit: String(query.limit || 10),
      fields: 'title,authors,year,abstract,citationCount,url,fieldsOfStudy'
    });

    if (query.yearFrom) {
      params.append('year', `${query.yearFrom}-${query.yearTo || new Date().getFullYear()}`);
    }

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Semantic Scholar API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as any;

    return (data.data || []).map((paper: any) => ({
      id: paper.paperId,
      title: paper.title || '',
      authors: (paper.authors || []).map((a: any) => a.name),
      year: paper.year || 0,
      abstract: paper.abstract || '',
      citations: paper.citationCount || 0,
      source: 'semantic_scholar' as const,
      url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      fields: paper.fieldsOfStudy || []
    }));
  } catch (error) {
    console.error('Semantic Scholar search failed:', error);
    return [];
  }
}

/**
 * arXiv API
 * Docs: https://info.arxiv.org/help/api/
 */
async function searchArxiv(query: ResearchQuery): Promise<Paper[]> {
  try {
    const searchQuery = encodeURIComponent(query.topic);
    const maxResults = query.limit || 10;

    const response = await fetch(
      `https://export.arxiv.org/api/query?search_query=all:${searchQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`
    );

    if (!response.ok) {
      console.error(`arXiv API error: ${response.status}`);
      return [];
    }

    const text = await response.text();

    // Parse XML response (simple parsing)
    const papers: Paper[] = [];
    const entries = text.split('<entry>').slice(1);

    for (const entry of entries) {
      const title = extractXmlTag(entry, 'title')?.replace(/\s+/g, ' ').trim();
      const abstract = extractXmlTag(entry, 'summary')?.replace(/\s+/g, ' ').trim();
      const id = extractXmlTag(entry, 'id');
      const published = extractXmlTag(entry, 'published');

      // Extract authors
      const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || [];
      const authors = authorMatches.map(a => {
        const name = a.match(/<name>(.*?)<\/name>/);
        return name ? name[1] : '';
      }).filter(Boolean);

      if (title && id) {
        papers.push({
          id: id,
          title: title,
          authors: authors,
          year: published ? new Date(published).getFullYear() : 0,
          abstract: abstract || '',
          citations: 0, // arXiv doesn't provide citation counts
          source: 'arxiv' as const,
          url: id,
          fields: extractArxivCategories(entry)
        });
      }
    }

    return papers;
  } catch (error) {
    console.error('arXiv search failed:', error);
    return [];
  }
}

/**
 * OpenAlex API
 * Docs: https://docs.openalex.org/
 */
async function searchOpenAlex(query: ResearchQuery): Promise<Paper[]> {
  try {
    const params = new URLSearchParams({
      search: query.topic,
      per_page: String(query.limit || 10),
      sort: 'cited_by_count:desc'
    });

    if (query.yearFrom) {
      params.append('filter', `publication_year:${query.yearFrom}-${query.yearTo || new Date().getFullYear()}`);
    }

    const response = await fetch(
      `https://api.openalex.org/works?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ENOQ-CORE/2.0 (mailto:research@enoq.dev)'
        }
      }
    );

    if (!response.ok) {
      console.error(`OpenAlex API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as any;

    return (data.results || []).map((work: any) => ({
      id: work.id,
      title: work.title || '',
      authors: (work.authorships || []).map((a: any) => a.author?.display_name || '').filter(Boolean),
      year: work.publication_year || 0,
      abstract: work.abstract_inverted_index ? reconstructAbstract(work.abstract_inverted_index) : '',
      citations: work.cited_by_count || 0,
      source: 'openalex' as const,
      url: work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : work.id,
      fields: (work.concepts || []).slice(0, 5).map((c: any) => c.display_name)
    }));
  } catch (error) {
    console.error('OpenAlex search failed:', error);
    return [];
  }
}

// ============================================
// HELPERS
// ============================================

function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractArxivCategories(entry: string): string[] {
  const categories: string[] = [];
  const matches = entry.match(/<category[^>]*term="([^"]+)"/g) || [];
  for (const m of matches) {
    const term = m.match(/term="([^"]+)"/);
    if (term) categories.push(term[1]);
  }
  return categories;
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: Array<[string, number]> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }
  words.sort((a, b) => a[1] - b[1]);
  return words.map(w => w[0]).join(' ').slice(0, 1000);
}

function deduplicatePapers(papers: Paper[]): Paper[] {
  const seen = new Map<string, Paper>();

  for (const paper of papers) {
    // Normalize title for comparison
    const normalizedTitle = paper.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!seen.has(normalizedTitle)) {
      seen.set(normalizedTitle, paper);
    } else {
      // Keep the one with more citations
      const existing = seen.get(normalizedTitle)!;
      if (paper.citations > existing.citations) {
        seen.set(normalizedTitle, paper);
      }
    }
  }

  return Array.from(seen.values());
}

function rankByRelevance(papers: Paper[], query: ResearchQuery): Paper[] {
  const queryTerms = query.topic.toLowerCase().split(/\s+/);

  return papers.map(paper => {
    let relevance = 0;

    // Title match
    const titleLower = paper.title.toLowerCase();
    for (const term of queryTerms) {
      if (titleLower.includes(term)) relevance += 10;
    }

    // Abstract match
    const abstractLower = paper.abstract.toLowerCase();
    for (const term of queryTerms) {
      if (abstractLower.includes(term)) relevance += 2;
    }

    // Citation weight (log scale to not over-weight)
    relevance += Math.log10(paper.citations + 1) * 3;

    // Recency bonus
    const yearsOld = new Date().getFullYear() - paper.year;
    if (yearsOld <= 2) relevance += 5;
    else if (yearsOld <= 5) relevance += 3;

    return { ...paper, relevance };
  }).sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================

/**
 * Search global research efficiently
 * - Parallel queries to all APIs
 * - Deduplication
 * - Relevance ranking
 * - Caching
 */
export async function searchResearch(query: ResearchQuery): Promise<ResearchResult> {
  // Check cache first
  const cached = getFromCache(query);
  if (cached) {
    return cached;
  }

  // Parallel search across all APIs
  const [semanticScholar, arxiv, openAlex] = await Promise.all([
    searchSemanticScholar(query),
    searchArxiv(query),
    searchOpenAlex(query)
  ]);

  // Combine and deduplicate
  const allPapers = [...semanticScholar, ...arxiv, ...openAlex];
  const deduplicated = deduplicatePapers(allPapers);

  // Rank by relevance
  const ranked = rankByRelevance(deduplicated, query);

  // Apply limit
  const limited = ranked.slice(0, query.limit || 20);

  const result: ResearchResult = {
    query,
    papers: limited,
    totalFound: allPapers.length,
    timestamp: new Date()
  };

  // Cache the result
  setCache(query, result);

  return result;
}

/**
 * Batch search for multiple topics efficiently
 */
export async function batchSearchResearch(queries: ResearchQuery[]): Promise<ResearchResult[]> {
  return Promise.all(queries.map(q => searchResearch(q)));
}

/**
 * Search for specific scientific domains relevant to ENOQ
 */
export async function searchEnoqRelevantResearch(): Promise<ResearchResult[]> {
  const enoqTopics: ResearchQuery[] = [
    { topic: 'autopoiesis self-organizing systems', fields: ['Systems Theory'], limit: 5 },
    { topic: 'free energy principle active inference', fields: ['Neuroscience'], limit: 5 },
    { topic: 'global workspace theory consciousness', fields: ['Cognitive Science'], limit: 5 },
    { topic: 'complementary learning systems memory', fields: ['Neuroscience'], limit: 5 },
    { topic: 'dynamical systems cognitive architecture', fields: ['Computer Science'], limit: 5 },
    { topic: 'dissipative structures self-organization', fields: ['Physics'], limit: 5 },
    { topic: 'AI alignment value learning', fields: ['AI'], limit: 5, yearFrom: 2020 }
  ];

  return batchSearchResearch(enoqTopics);
}

// ============================================
// EXPORTS
// ============================================

export {
  searchSemanticScholar,
  searchArxiv,
  searchOpenAlex
};
