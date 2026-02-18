/**
 * RAG (Retrieval Augmented Generation) Memory System
 * Uses pgvector for semantic search with efficiency optimizations:
 * - HNSW indexing (already applied in DB)
 * - Batch inserts for reduced roundtrips
 * - Embedding cache to avoid duplicate embeddings
 * - Dimensionality reduction (1536 → 384 dims)
 */

import { query, getClient } from './db/postgres';

// Configuration - can be overridden via environment
const BATCH_SIZE = 50;
const EMBEDDING_CACHE_THRESHOLD = 0.9; // Cosine similarity threshold for cache hit
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || '384'); // Reduced dimension for storage
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const RAG_TELEMETRY = process.env.RAG_TELEMETRY === 'true';

/**
 * Reduce embedding dimensions using simple chunk averaging
 * Reduces from 1536 to target dimensions (default 384)
 * This is a fast approximation - for production, consider PCA
 */
function reduceDimensions(embedding: number[], targetDim: number): number[] {
  if (embedding.length <= targetDim) {
    return embedding;
  }
  
  const sourceDim = embedding.length;
  const ratio = sourceDim / targetDim;
  const result: number[] = new Array(targetDim);
  
  for (let i = 0; i < targetDim; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.floor((i + 1) * ratio);
    // Average the values in this chunk
    let sum = 0;
    let count = 0;
    for (let j = start; j < end && j < sourceDim; j++) {
      sum += embedding[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }
  
  return result;
}

// In-memory cache for recent embeddings (simple LRU-ish)
const embeddingCache: Map<string, { embedding: number[]; timestamp: number }> = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Types
export interface Memory {
  id: string;
  content: string;
  source: 'conversation' | 'codebase' | 'feature' | 'memory' | 'trace';
  timestamp: number;
  embedding?: number[];
}

/**
 * Add a protected codebase memory (not overwritten by chat)
 */
export async function addCodebaseMemory(
  content: string,
  filePath: string,
  id?: string
): Promise<string> {
  const memoryId = id || `code_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const timestamp = Date.now();
  const embedding = await generateEmbedding(content);

  // Build vector string directly to avoid pg parameter escaping issues
  const vectorStr = embeddingToPgVector(embedding);
  
  // Use raw query with direct interpolation - protected source type
  await query(
    `INSERT INTO ari_memories (id, content, source, timestamp, embedding)
     VALUES ($1, $2, 'codebase', ${timestamp}, ${vectorStr})
     ON CONFLICT (id) DO NOTHING`,
    [memoryId, `${filePath}\n\n${content}`]
  );

  return memoryId;
}

/**
 * Store a trace execution in memory for semantic search
 */
export async function storeTrace(
  executionId: string,
  agentId: string,
  decisionContext: string,
  outcome: string,
  metadata?: Record<string, any>
): Promise<string> {
  const content = `[Trace] ${agentId}: ${decisionContext.slice(0, 500)} → ${outcome.slice(0, 200)}`;
  const id = `trace_${executionId}_${Date.now()}`;
  
  return addMemory(content, 'trace', id);
}

/**
 * Search similar traces - for Trace Viewer Enhancement
 */
export async function searchSimilarTraces(
  queryText: string,
  limit: number = 5
): Promise<SearchResult[]> {
  return searchMemories(queryText, limit, 'trace');
}

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  timestamp: number;
  similarity: number;
}

/**
 * Generate embedding for text using configurable provider
 * Supports OpenAI, Anthropic, or Gemini embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check cache first
  const cacheKey = text.slice(0, 100); // Use prefix as cache key
  const cached = embeddingCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding;
  }

  let embedding: number[];

  // Try OpenAI first (most common)
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        embedding = data.data[0].embedding;
      }
    } catch (e) {
      console.warn('OpenAI embedding failed, trying Anthropic:', e);
    }
  }

  // Fallback to Anthropic
  if (!embedding && ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'amazon-nova-micro-v1',
          messages: [{ role: 'user', content: text }],
          max_tokens: 1,
        }),
      });
      
      // Anthropic embeddings response format
      if (response.ok) {
        const data = await response.json();
        embedding = data.embedding;
      }
    } catch (e) {
      console.warn('Anthropic embedding failed:', e);
    }
  }

  // Fallback to Gemini
  if (!embedding && GEMINI_API_KEY) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: { parts: [{ text }] },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        embedding = data.embedding.values;
      }
    } catch (e) {
      console.warn('Gemini embedding failed:', e);
    }
  }

  // Fallback to OpenRouter (uses OpenAI-compatible endpoint)
  if (!embedding && OPENROUTER_KEY) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Ari',
        },
        body: JSON.stringify({
          model: 'openai/text-embedding-3-small',
          input: text,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        embedding = data.data[0].embedding;
      }
    } catch (e) {
      console.warn('OpenRouter embedding failed:', e);
    }
  }

  if (!embedding) {
    throw new Error('No embedding provider available. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_KEY');
  }

  // Apply dimensionality reduction if needed
  if (EMBEDDING_DIM && embedding.length > EMBEDDING_DIM) {
    embedding = reduceDimensions(embedding, EMBEDDING_DIM);
  }

  // Add to cache
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    // Simple eviction: clear oldest half
    const entries = Array.from(embeddingCache.entries());
    entries.slice(0, CACHE_MAX_SIZE / 2).forEach(([key]) => embeddingCache.delete(key));
  }
  embeddingCache.set(cacheKey, { embedding, timestamp: Date.now() });

  return embedding;
}

/**
 * Convert embedding array to pgvector format string
 */
function embeddingToPgVector(embedding: number[]): string {
  // Use square brackets for pgvector - this is the correct format
  const values = embedding.map(v => v.toFixed(6)).join(',');
  return `'[${values}]'`;
}

/**
 * Check if similar content already exists (embedding cache)
 * Returns existing ID if similarity > threshold
 */
export async function findSimilarEmbedding(
  embedding: number[],
  threshold: number = EMBEDDING_CACHE_THRESHOLD
): Promise<string | null> {
  const vectorStr = embeddingToPgVector(embedding);
  
  const result = await query<{ id: string }>(
    `SELECT id FROM ari_memories 
     WHERE embedding <=> ${vectorStr} < ${1 - threshold} 
     LIMIT 1`
  );
  
  return result.rows[0]?.id || null;
}

/**
 * Add a single memory
 */
export async function addMemory(
  content: string,
  source: Memory['source'] = 'memory',
  id?: string
): Promise<string> {
  const memoryId = id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const timestamp = Date.now();
  const embedding = await generateEmbedding(content);

  // Check for existing similar memory (deduplication)
  const existingId = await findSimilarEmbedding(embedding);
  if (existingId) {
    return existingId; // Skip insert, return existing
  }

  // Build vector string directly to avoid pg parameter escaping issues
  const vectorStr = embeddingToPgVector(embedding);
  
  // Use raw query with direct interpolation
  await query(
    `INSERT INTO ari_memories (id, content, source, timestamp, embedding)
     VALUES ($1, $2, $3, $4, ${vectorStr})
     ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, timestamp = EXCLUDED.timestamp`,
    [memoryId, content, source, timestamp]
  );

  return memoryId;
}

/**
 * Batch insert memories - efficiency improvement #2
 * Reduces roundtrips by inserting multiple rows in one transaction
 */
export async function batchAddMemories(
  memories: Array<{ content: string; source: Memory['source']; id?: string }>
): Promise<string[]> {
  if (memories.length === 0) return [];

  const client = await getClient();
  const insertedIds: string[] = [];

  try {
    await client.query('BEGIN');

    for (const mem of memories) {
      const memoryId = mem.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const timestamp = Date.now();
      
      // Generate embedding
      const embedding = await generateEmbedding(mem.content);
      
      // Check for existing similar (deduplication within batch)
      const existingId = await findSimilarEmbedding(embedding);
      if (existingId) {
        insertedIds.push(existingId);
        continue;
      }

      // Build vector string directly to avoid pg parameter escaping issues
      const vectorStr = embeddingToPgVector(embedding);

      await client.query(
        `INSERT INTO ari_memories (id, content, source, timestamp, embedding)
         VALUES ($1, $2, $3, $4, ${vectorStr})
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content`,
        [memoryId, mem.content, mem.source, timestamp]
      );
      
      insertedIds.push(memoryId);
    }

    await client.query('COMMIT');
    return insertedIds;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store a conversation exchange
 */
export async function storeConversation(
  userMessage: string,
  ariResponse: string,
  metadata?: Record<string, any>
): Promise<{ userId: string; ariId: string }> {
  const timestamp = Date.now();
  
  // Store both messages
  const userId = await addMemory(userMessage, 'conversation');
  const ariId = await addMemory(ariResponse, 'conversation');

  return { userId, ariId };
}

/**
 * Search memories using pgvector - now uses HNSW index for speed
 */
export async function searchMemories(
  searchQuery: string,
  limit: number = 5,
  sourceFilter?: Memory['source']
): Promise<SearchResult[]> {
  const startTime = Date.now()
  
  const queryEmbedding = await generateEmbedding(searchQuery);
  const vectorStr = embeddingToPgVector(queryEmbedding);
  
  let sql = `
    SELECT id, content, source, timestamp, 
           embedding <=> ${vectorStr} AS similarity
    FROM ari_memories`;
  
  const params: any[] = [];
  if (sourceFilter) {
    sql += ` WHERE source = $1`;
    params.push(sourceFilter);
  }
  
  sql += ` ORDER BY embedding <=> ${vectorStr} LIMIT ${limit}`;
  
  const result = await query<SearchResult>(sql, params);
  
  // Record telemetry if enabled
  if (RAG_TELEMETRY) {
    const latency = Date.now() - startTime
    console.log(`[RAG] search latency=${latency}ms results=${result.rows.length}`)
  }
  
  return result.rows;
}

/**
 * Search memories using pgvector similarity (direct PG query)
 */
export async function searchMemoriesPG(
  searchQuery: string,
  limit: number = 5
): Promise<SearchResult[]> {
  return searchMemories(searchQuery, limit);
}

/**
 * Get all memories, optionally filtered by source
 */
export async function getMemories(source?: Memory['source']): Promise<Memory[]> {
  let sql = 'SELECT id, content, source, timestamp FROM ari_memories';
  const params: any[] = [];
  
  if (source) {
    sql += ' WHERE source = $1';
    params.push(source);
  }
  
  sql += ' ORDER BY timestamp DESC';
  
  const result = await query<Memory>(sql, params);
  return result.rows;
}

/**
 * Delete a memory by ID
 */
export async function deleteMemory(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM ari_memories WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Prune old/low-relevance memories
 * Useful for keeping DB lean - run periodically
 */
export async function pruneMemories(
  olderThanDays: number = 90,
  similarityThreshold: number = 0.5
): Promise<number> {
  const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
  
  const result = await query(
    `DELETE FROM ari_memories 
     WHERE timestamp < $1 
     AND source = 'conversation'
     AND NOT EXISTS (
       SELECT 1 FROM ari_memories m2
       WHERE m2.timestamp >= $1
       AND m2.embedding <=> ari_memories.embedding < ${1 - similarityThreshold}
     )`,
    [cutoffTime]
  );
  
  return result.rowCount ?? 0;
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<{
  total: number;
  bySource: Record<string, number>;
}> {
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM ari_memories'
  );
  
  const sourceResult = await query<{ source: string; count: string }>(
    'SELECT source, COUNT(*) as count FROM ari_memories GROUP BY source'
  );
  
  const bySource: Record<string, number> = {};
  sourceResult.rows.forEach(row => {
    bySource[row.source] = parseInt(row.count, 10);
  });
  
  return {
    total: parseInt(countResult.rows[0].count, 10),
    bySource,
  };
}

/**
 * Initialize RAG - ensure table exists ( idempotent)
 */
export async function initializeRAG(): Promise<void> {
  // Create table if not exists
  await query(`
    CREATE TABLE IF NOT EXISTS ari_memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      embedding vector(384)
    )
  `);
  
  // Note: HNSW index should already exist from migration
  // But we can ensure it's there
  await query(`
    CREATE INDEX IF NOT EXISTS idx_memories_embedding_hnsw 
    ON ari_memories USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `);
  
  console.log('RAG initialized with HNSW indexing');
}

// Legacy alias for backwards compatibility
export const initializeARIKnowledge = initializeRAG;
