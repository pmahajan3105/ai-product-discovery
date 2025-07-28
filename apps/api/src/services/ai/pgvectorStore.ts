/**
 * pgvector Store Integration
 * LangChain integration with PostgreSQL vector storage for semantic search
 * 
 * Key Features:
 * - Native PostgreSQL vector operations
 * - LangChain VectorStore interface compliance
 * - Company context-aware retrieval
 * - Optimized similarity search with filters
 */

import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { db } from '../database';
import { Op } from 'sequelize';

export interface PGVectorStoreConfig {
  organizationId: string;
  tableName?: string;
  embeddingDimension?: number;
  distanceStrategy?: 'cosine' | 'euclidean' | 'innerProduct';
}

export interface SearchFilters {
  categories?: string[];
  sentiments?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  customerSegments?: string[];
  minSimilarity?: number;
}

export class PGVectorStore extends VectorStore {
  private config: Required<PGVectorStoreConfig>;

  constructor(embeddings: Embeddings, config: PGVectorStoreConfig) {
    super(embeddings, {});
    
    this.config = {
      organizationId: config.organizationId,
      tableName: config.tableName || 'feedback_embeddings',
      embeddingDimension: config.embeddingDimension || 1536,
      distanceStrategy: config.distanceStrategy || 'cosine',
    };
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[], options?: { ids?: string[] }): Promise<string[]> {
    const ids: string[] = [];
    
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const id = options?.ids?.[i] || this.generateId();
      
      // Generate embedding for document
      const embedding = await this.embeddings.embedQuery(doc.pageContent);
      
      // Store in database
      await db.models.FeedbackEmbedding.upsert({
        id,
        feedbackId: doc.metadata.feedbackId,
        organizationId: this.config.organizationId,
        embedding: embedding, // Will be converted to vector type by migration
        embedding_vector: embedding, // Native vector column
        text: doc.pageContent,
        tokens: this.estimateTokens(doc.pageContent),
        model: 'text-embedding-3-large',
        metadata: doc.metadata,
      });
      
      ids.push(id);
    }
    
    return ids;
  }

  /**
   * Add vectors directly (for bulk operations)
   */
  async addVectors(vectors: number[][], documents: Document[], options?: { ids?: string[] }): Promise<string[]> {
    const ids: string[] = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      const doc = documents[i];
      const id = options?.ids?.[i] || this.generateId();
      
      await db.models.FeedbackEmbedding.upsert({
        id,
        feedbackId: doc.metadata.feedbackId,
        organizationId: this.config.organizationId,
        embedding: vector,
        embedding_vector: vector,
        text: doc.pageContent,
        tokens: this.estimateTokens(doc.pageContent),
        model: 'text-embedding-3-large',
        metadata: doc.metadata,
      });
      
      ids.push(id);
    }
    
    return ids;
  }

  /**
   * Similarity search with score
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
    filter?: SearchFilters
  ): Promise<[Document, number][]> {
    // Generate query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    // Build SQL query with filters
    const whereClause = this.buildWhereClause(filter);
    const distanceFunction = this.getDistanceFunction();
    
    // Execute similarity search
    const results = await db.sequelize.query(`
      SELECT 
        fe.*,
        f.title,
        f.description,
        f.category,
        f.sentiment,
        f.metadata as feedback_metadata,
        c.name as customer_name,
        c.email as customer_email,
        c.company as customer_company,
        (fe.embedding_vector ${distanceFunction} $1) as distance
      FROM ${this.config.tableName} fe
      JOIN feedback f ON fe.feedback_id = f.id
      LEFT JOIN customers c ON f.customer_id = c.id
      WHERE fe.organization_id = $2
        ${whereClause.sql}
        ${filter?.minSimilarity ? `AND (fe.embedding_vector ${distanceFunction} $1) <= $${whereClause.params.length + 3}` : ''}
      ORDER BY distance ASC
      LIMIT $${whereClause.params.length + (filter?.minSimilarity ? 4 : 3)}
    `, {
      bind: [
        JSON.stringify(queryEmbedding),
        this.config.organizationId,
        ...whereClause.params,
        ...(filter?.minSimilarity ? [1 - filter.minSimilarity] : []),
        k
      ],
      type: db.sequelize.QueryTypes.SELECT
    });

    // Convert results to LangChain documents with scores
    return (results as any[]).map(row => {
      const document = new Document({
        pageContent: `${row.title}\n\n${row.description}`,
        metadata: {
          feedbackId: row.feedback_id,
          title: row.title,
          category: row.category,
          sentiment: row.sentiment,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          customerCompany: row.customer_company,
          ...row.feedback_metadata,
        },
      });
      
      // Convert distance to similarity score (0-1)
      const similarityScore = 1 - row.distance;
      
      return [document, similarityScore] as [Document, number];
    });
  }

  /**
   * Similarity search (documents only)
   */
  async similaritySearch(
    query: string,
    k: number = 5,
    filter?: SearchFilters
  ): Promise<Document[]> {
    const results = await this.similaritySearchWithScore(query, k, filter);
    return results.map(([doc]) => doc);
  }

  /**
   * Max marginal relevance search
   */
  async maxMarginalRelevanceSearch(
    query: string,
    options: {
      k?: number;
      fetchK?: number;
      lambda?: number;
      filter?: SearchFilters;
    }
  ): Promise<Document[]> {
    const k = options.k || 5;
    const fetchK = options.fetchK || k * 2;
    const lambda = options.lambda || 0.5;
    
    // Get initial candidates
    const candidates = await this.similaritySearchWithScore(query, fetchK, options.filter);
    
    if (candidates.length === 0) return [];
    if (candidates.length <= k) return candidates.map(([doc]) => doc);
    
    // Implement MMR algorithm
    const selected: Document[] = [];
    const remaining = [...candidates];
    
    // Start with the most similar document
    selected.push(remaining.shift()![0]);
    
    while (selected.length < k && remaining.length > 0) {
      let bestScore = -Infinity;
      let bestIndex = 0;
      
      for (let i = 0; i < remaining.length; i++) {
        const [candidate, similarity] = remaining[i];
        
        // Calculate max similarity to already selected documents
        let maxSim = 0;
        for (const selectedDoc of selected) {
          const sim = await this.calculateDocumentSimilarity(candidate, selectedDoc);
          maxSim = Math.max(maxSim, sim);
        }
        
        // MMR score: λ * similarity - (1-λ) * max_similarity_to_selected
        const mmrScore = lambda * similarity - (1 - lambda) * maxSim;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }
      
      selected.push(remaining.splice(bestIndex, 1)[0][0]);
    }
    
    return selected;
  }

  /**
   * Delete documents by feedback IDs
   */
  async delete(options: { feedbackIds: string[] }): Promise<void> {
    await db.models.FeedbackEmbedding.destroy({
      where: {
        feedbackId: { [Op.in]: options.feedbackIds },
        organizationId: this.config.organizationId,
      },
    });
  }

  /**
   * Create PGVectorStore from documents
   */
  static async fromDocuments(
    documents: Document[],
    embeddings: Embeddings,
    config: PGVectorStoreConfig
  ): Promise<PGVectorStore> {
    const store = new PGVectorStore(embeddings, config);
    await store.addDocuments(documents);
    return store;
  }

  /**
   * Create PGVectorStore from existing data
   */
  static async fromExistingIndex(
    embeddings: Embeddings,
    config: PGVectorStoreConfig
  ): Promise<PGVectorStore> {
    return new PGVectorStore(embeddings, config);
  }

  /**
   * Build WHERE clause for filtering
   */
  private buildWhereClause(filter?: SearchFilters): { sql: string; params: any[] } {
    if (!filter) return { sql: '', params: [] };
    
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 3; // Start after organizationId parameter
    
    if (filter.categories && filter.categories.length > 0) {
      conditions.push(`f.category = ANY($${paramIndex})`);
      params.push(filter.categories);
      paramIndex++;
    }
    
    if (filter.sentiments && filter.sentiments.length > 0) {
      conditions.push(`f.sentiment = ANY($${paramIndex})`);
      params.push(filter.sentiments);
      paramIndex++;
    }
    
    if (filter.dateRange) {
      conditions.push(`f.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filter.dateRange.start, filter.dateRange.end);
      paramIndex += 2;
    }
    
    const sql = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    return { sql, params };
  }

  /**
   * Get distance function based on strategy
   */
  private getDistanceFunction(): string {
    switch (this.config.distanceStrategy) {
      case 'cosine':
        return '<=>'; // Cosine distance
      case 'euclidean':
        return '<->'; // Euclidean distance
      case 'innerProduct':
        return '<#>'; // Inner product distance
      default:
        return '<=>'; // Default to cosine
    }
  }

  /**
   * Calculate similarity between two documents
   */
  private async calculateDocumentSimilarity(doc1: Document, doc2: Document): Promise<number> {
    // Simple similarity based on shared metadata or content overlap
    const content1 = doc1.pageContent.toLowerCase();
    const content2 = doc2.pageContent.toLowerCase();
    
    // Jaccard similarity of words
    const words1 = new Set(content1.split(/\s+/));
    const words2 = new Set(content2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Estimate token count for text
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate unique ID for document
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export { PGVectorStore };