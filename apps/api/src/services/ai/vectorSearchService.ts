/**
 * Vector Search Service
 * Handles semantic search using embeddings for RAG chat functionality
 * 
 * Key Features:
 * - Generate embeddings for feedback items
 * - Semantic similarity search
 * - Company context weighting
 * - Bulk embedding processing
 * - Search result ranking
 */

import { openaiService } from './openaiService';
import { db } from '../database';
import { Op } from 'sequelize';

export interface SearchResult {
  feedbackId: string;
  title: string;
  description: string;
  similarity: number;
  metadata?: any;
  customerInfo?: any;
}

export interface SearchQuery {
  text: string;
  organizationId: string;
  limit?: number;
  minSimilarity?: number;
  filters?: {
    categories?: string[];
    sentiments?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    customerSegments?: string[];
  };
}

export interface EmbeddingBatch {
  feedbackId: string;
  text: string;
  organizationId: string;
}

export class VectorSearchService {
  /**
   * Generate and store embedding for single feedback item
   */
  async generateEmbedding(feedbackId: string, organizationId: string): Promise<void> {
    try {
      // Get feedback data
      const feedback = await db.models.Feedback.findOne({
        where: { id: feedbackId, organizationId },
        attributes: ['id', 'title', 'description']
      });

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      // Combine title and description for embedding
      const text = `${feedback.title}\n\n${feedback.description}`;

      // Generate embedding
      const embeddingResult = await openaiService.generateEmbedding(text);

      // Store or update embedding
      await db.models.FeedbackEmbedding.upsert({
        feedbackId: feedback.id,
        organizationId,
        embedding: embeddingResult.embedding,
        text: embeddingResult.text,
        tokens: embeddingResult.tokens,
        model: 'text-embedding-3-large'
      });

    } catch (error) {
      console.error('Error generating embedding for feedback:', feedbackId, error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple feedback items
   */
  async generateBatchEmbeddings(batch: EmbeddingBatch[]): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ feedbackId: string; error: string }>;
  }> {
    const results = {
      processed: batch.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ feedbackId: string; error: string }>
    };

    // Process in chunks to avoid rate limits
    const chunkSize = 10;
    const chunks = this.chunkArray(batch, chunkSize);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (item) => {
        try {
          await this.generateEmbedding(item.feedbackId, item.organizationId);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            feedbackId: item.feedbackId,
            error: (error as Error).message
          });
        }
      });

      await Promise.all(chunkPromises);

      // Rate limiting delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(1000);
      }
    }

    return results;
  }

  /**
   * Search for similar feedback using semantic search
   */
  async searchSimilar(query: SearchQuery): Promise<SearchResult[]> {
    try {
      // Generate embedding for search query
      const queryEmbedding = await openaiService.generateEmbedding(query.text);

      // Get all embeddings for the organization
      const whereClause: any = { organizationId: query.organizationId };
      
      // Apply filters if provided
      if (query.filters) {
        if (query.filters.dateRange) {
          whereClause.createdAt = {
            [Op.between]: [query.filters.dateRange.start, query.filters.dateRange.end]
          };
        }
      }

      const embeddings = await db.models.FeedbackEmbedding.findAll({
        where: whereClause,
        include: [{
          model: db.models.Feedback,
          as: 'feedback',
          attributes: ['id', 'title', 'description', 'category', 'sentiment', 'metadata'],
          include: [{
            model: db.models.Customer,
            as: 'customer',
            attributes: ['name', 'email', 'company'],
            required: false
          }]
        }],
        limit: query.limit ? query.limit * 2 : 100 // Get more to filter after similarity calculation
      });

      // Calculate similarities
      const results: SearchResult[] = [];
      
      for (const embedding of embeddings) {
        const similarity = this.calculateCosineSimilarity(
          queryEmbedding.embedding,
          embedding.embedding as number[]
        );

        // Apply similarity threshold
        if (similarity >= (query.minSimilarity || 0.3)) {
          // Apply category/sentiment filters
          const feedback = embedding.feedback;
          if (this.passesFilters(feedback, query.filters)) {
            results.push({
              feedbackId: feedback.id,
              title: feedback.title,
              description: feedback.description,
              similarity,
              metadata: feedback.metadata,
              customerInfo: feedback.customer ? {
                name: feedback.customer.name,
                email: feedback.customer.email,
                company: feedback.customer.company
              } : undefined
            });
          }
        }
      }

      // Sort by similarity (descending) and apply limit
      results.sort((a, b) => b.similarity - a.similarity);
      
      return results.slice(0, query.limit || 10);

    } catch (error) {
      console.error('Error in semantic search:', error);
      throw error;
    }
  }

  /**
   * Get embedding statistics for organization
   */
  async getEmbeddingStats(organizationId: string): Promise<{
    totalEmbeddings: number;
    totalTokens: number;
    averageTokens: number;
    modelDistribution: Record<string, number>;
    oldestEmbedding: Date | null;
    newestEmbedding: Date | null;
  }> {
    const stats = await db.models.FeedbackEmbedding.findAll({
      where: { organizationId },
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'total'],
        [db.sequelize.fn('SUM', db.sequelize.col('tokens')), 'totalTokens'],
        [db.sequelize.fn('AVG', db.sequelize.col('tokens')), 'avgTokens'],
        [db.sequelize.fn('MIN', db.sequelize.col('createdAt')), 'oldest'],
        [db.sequelize.fn('MAX', db.sequelize.col('createdAt')), 'newest']
      ],
      raw: true,
      group: ['model']
    });

    const modelDistribution = await db.models.FeedbackEmbedding.findAll({
      where: { organizationId },
      attributes: [
        'model',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['model'],
      raw: true
    });

    const totalStats = stats[0] as any || {};
    
    return {
      totalEmbeddings: parseInt(totalStats.total) || 0,
      totalTokens: parseInt(totalStats.totalTokens) || 0,
      averageTokens: parseFloat(totalStats.avgTokens) || 0,
      modelDistribution: modelDistribution.reduce((acc: any, item: any) => {
        acc[item.model] = parseInt(item.count);
        return acc;
      }, {}),
      oldestEmbedding: totalStats.oldest ? new Date(totalStats.oldest) : null,
      newestEmbedding: totalStats.newest ? new Date(totalStats.newest) : null
    };
  }

  /**
   * Refresh embeddings for organization (useful after model updates)
   */
  async refreshEmbeddings(organizationId: string, batchSize: number = 50): Promise<{
    refreshed: number;
    skipped: number;
    errors: number;
  }> {
    // Get all feedback without embeddings or with old embeddings
    const feedback = await db.models.Feedback.findAll({
      where: { organizationId },
      attributes: ['id', 'title', 'description'],
      include: [{
        model: db.models.FeedbackEmbedding,
        as: 'embedding',
        required: false,
        where: {
          model: { [Op.ne]: 'text-embedding-3-large' } // Refresh old model embeddings
        }
      }],
      limit: batchSize
    });

    const batch: EmbeddingBatch[] = feedback.map(f => ({
      feedbackId: f.id,
      text: `${f.title}\n\n${f.description}`,
      organizationId
    }));

    const result = await this.generateBatchEmbeddings(batch);
    
    return {
      refreshed: result.successful,
      skipped: 0,
      errors: result.failed
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Check if feedback passes the applied filters
   */
  private passesFilters(feedback: any, filters?: SearchQuery['filters']): boolean {
    if (!filters) return true;

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!feedback.category || !filters.categories.includes(feedback.category)) {
        return false;
      }
    }

    // Sentiment filter
    if (filters.sentiments && filters.sentiments.length > 0) {
      if (!feedback.sentiment || !filters.sentiments.includes(feedback.sentiment)) {
        return false;
      }
    }

    // Customer segment filter (would need customer data)
    if (filters.customerSegments && filters.customerSegments.length > 0) {
      // TODO: Implement customer segment filtering
    }

    return true;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const vectorSearchService = new VectorSearchService();