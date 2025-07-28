/**
 * Feedback Accessor - Specialized database operations for Feedback model
 * Extends BaseAccessor with Feedback-specific operations
 */

import { Transaction } from 'sequelize';
import { BaseAccessor, AnyObj, QueryResult } from '../BaseAccessor';
import { QueryBuilder, QueryBuilderFactory } from '../QueryBuilder';
import { TransactionManager } from '../TransactionManager';
import { db, FeedbackAttributes } from '../../services/database';
import { logger } from '../../utils/logger';

export interface FeedbackSearchOptions {
  organizationId: string;
  searchTerm?: string;
  status?: string[];
  category?: string[];
  sentiment?: string[];
  source?: string[];
  assignedTo?: string;
  customerId?: string;
  integrationId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  byStatus: Record<string, number>;
  bySentiment: Record<string, number>;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  averageSentimentScore: number;
  trendsOverTime: Array<{
    date: string;
    count: number;
    sentiment: number;
  }>;
}

export class FeedbackAccessor extends BaseAccessor {
  constructor() {
    super(db.models.Feedback);
  }

  /**
   * Create feedback with validation and auto-categorization
   */
  async createFeedback(
    feedbackData: Partial<FeedbackAttributes>,
    transaction?: Transaction
  ): Promise<any> {
    try {
      // Validate required fields
      if (!feedbackData.organizationId || !feedbackData.title || !feedbackData.description) {
        throw new Error('OrganizationId, title, and description are required');
      }

      // Auto-assign status if not provided
      if (!feedbackData.status) {
        feedbackData.status = 'new';
      }

      // Auto-detect sentiment if not provided (simplified example)
      if (!feedbackData.sentiment && !feedbackData.sentimentScore) {
        const sentiment = this.detectSentiment(feedbackData.description);
        feedbackData.sentiment = sentiment.label;
        feedbackData.sentimentScore = sentiment.score;
      }

      logger.info('Creating new feedback', {
        organizationId: feedbackData.organizationId,
        source: feedbackData.source,
        sentiment: feedbackData.sentiment
      });

      const feedback = await this.create(feedbackData, { transaction });

      logger.info('Feedback created successfully', {
        feedbackId: feedback.get('id'),
        organizationId: feedbackData.organizationId
      });

      return feedback;
    } catch (error) {
      logger.error('Failed to create feedback', error, {
        organizationId: feedbackData.organizationId
      });
      throw error;
    }
  }

  /**
   * Get feedback with comprehensive search and filtering
   */
  async searchFeedback(options: FeedbackSearchOptions): Promise<QueryResult<any>> {
    try {
      const {
        organizationId,
        searchTerm,
        status,
        category,
        sentiment,
        source,
        assignedTo,
        customerId,
        integrationId,
        dateRange,
        page = 1,
        size = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = options;

      const queryBuilder = QueryBuilderFactory.forOrganization(organizationId)
        .addPagination(page, size)
        .addOrderBy(sortBy, sortOrder);

      // Add includes for related data
      queryBuilder
        .addInclude({
          model: db.models.Customer,
          required: false,
          attributes: ['id', 'name', 'email', 'company']
        })
        .addInclude({
          model: db.models.Integration,
          required: false,
          attributes: ['id', 'name', 'type']
        })
        .addInclude({
          model: db.models.User,
          as: 'assignedUser',
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email']
        });

      // Search in title and description
      if (searchTerm) {
        const searchConditions = [
          { title: { $iLike: `%${searchTerm}%` } },
          { description: { $iLike: `%${searchTerm}%` } }
        ];
        queryBuilder.filterByMultiple(searchConditions);
      }

      // Filter by status
      if (status && status.length > 0) {
        queryBuilder.filterByIn('status', status);
      }

      // Filter by category
      if (category && category.length > 0) {
        queryBuilder.filterByIn('category', category);
      }

      // Filter by sentiment
      if (sentiment && sentiment.length > 0) {
        queryBuilder.filterByIn('sentiment', sentiment);
      }

      // Filter by source
      if (source && source.length > 0) {
        queryBuilder.filterByIn('source', source);
      }

      // Filter by assigned user
      if (assignedTo) {
        queryBuilder.filterByField('assignedTo', assignedTo);
      }

      // Filter by customer
      if (customerId) {
        queryBuilder.filterByField('customerId', customerId);
      }

      // Filter by integration
      if (integrationId) {
        queryBuilder.filterByField('integrationId', integrationId);
      }

      // Filter by date range
      if (dateRange) {
        queryBuilder.filterByDateRange('createdAt', dateRange.startDate, dateRange.endDate);
      }

      const query = queryBuilder.getQuery();

      // Execute search
      const [feedback, totalCount] = await Promise.all([
        this.model.findAll(query),
        this.model.count({ where: query.where, include: query.include })
      ]);

      const totalPages = Math.ceil(totalCount / size);

      logger.debug('Feedback search completed', {
        organizationId,
        totalCount,
        page,
        size,
        hasFilters: !!(searchTerm || status || category || sentiment || source)
      });

      return {
        data: feedback,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to search feedback', error, { options });
      throw error;
    }
  }

  /**
   * Update feedback status with history tracking
   */
  async updateStatus(
    feedbackId: string,
    newStatus: string,
    userId?: string,
    notes?: string,
    transaction?: Transaction
  ): Promise<any | null> {
    try {
      const feedback = await this.findById(feedbackId);
      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const oldStatus = feedback.get('status');

      logger.info('Updating feedback status', {
        feedbackId,
        oldStatus,
        newStatus,
        userId
      });

      // Update the feedback
      const updatedFeedback = await this.updateById(
        feedbackId,
        {
          status: newStatus,
          assignedTo: userId || feedback.get('assignedTo')
        },
        { transaction }
      );

      // Here you would typically create a status history record
      // For now, just log the change
      logger.info('Feedback status updated successfully', {
        feedbackId,
        oldStatus,
        newStatus,
        userId
      });

      return updatedFeedback;
    } catch (error) {
      logger.error('Failed to update feedback status', error, {
        feedbackId,
        newStatus,
        userId
      });
      throw error;
    }
  }

  /**
   * Bulk update feedback items
   */
  async bulkUpdate(
    feedbackIds: string[],
    updateData: Partial<FeedbackAttributes>,
    userId?: string
  ): Promise<number> {
    return await TransactionManager.withTransaction(async (transaction) => {
      try {
        logger.info('Starting bulk feedback update', {
          feedbackCount: feedbackIds.length,
          updateFields: Object.keys(updateData),
          userId
        });

        const [affectedRows] = await this.update(
          { id: { $in: feedbackIds } },
          updateData,
          { transaction }
        );

        logger.info('Bulk feedback update completed', {
          affectedRows,
          feedbackCount: feedbackIds.length
        });

        return affectedRows;
      } catch (error) {
        logger.error('Failed to bulk update feedback', error, {
          feedbackIds,
          updateData,
          userId
        });
        throw error;
      }
    }, {
      name: `bulkUpdateFeedback:${userId}`
    });
  }

  /**
   * Get feedback analytics for organization
   */
  async getAnalytics(
    organizationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<FeedbackAnalytics> {
    try {
      logger.debug('Generating feedback analytics', { organizationId, dateRange });

      const baseQuery = new QueryBuilder()
        .filterByOrganization(organizationId);

      if (dateRange) {
        baseQuery.filterByDateRange('createdAt', dateRange.startDate, dateRange.endDate);
      }

      const whereCondition = baseQuery.getQuery().where;

      // Execute analytics queries in parallel
      const [
        totalFeedback,
        statusCounts,
        sentimentCounts,
        sourceCounts,
        categoryCounts,
        sentimentAvg
      ] = await Promise.all([
        this.count(whereCondition),
        this.executeRawQuery(`
          SELECT status, COUNT(*) as count 
          FROM feedback 
          WHERE "organizationId" = :organizationId
          ${dateRange ? 'AND "createdAt" BETWEEN :startDate AND :endDate' : ''}
          GROUP BY status
        `, {
          organizationId,
          ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
        }),
        this.executeRawQuery(`
          SELECT sentiment, COUNT(*) as count 
          FROM feedback 
          WHERE "organizationId" = :organizationId 
          AND sentiment IS NOT NULL
          ${dateRange ? 'AND "createdAt" BETWEEN :startDate AND :endDate' : ''}
          GROUP BY sentiment
        `, {
          organizationId,
          ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
        }),
        this.executeRawQuery(`
          SELECT source, COUNT(*) as count 
          FROM feedback 
          WHERE "organizationId" = :organizationId
          ${dateRange ? 'AND "createdAt" BETWEEN :startDate AND :endDate' : ''}
          GROUP BY source
        `, {
          organizationId,
          ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
        }),
        this.executeRawQuery(`
          SELECT category, COUNT(*) as count 
          FROM feedback 
          WHERE "organizationId" = :organizationId 
          AND category IS NOT NULL
          ${dateRange ? 'AND "createdAt" BETWEEN :startDate AND :endDate' : ''}
          GROUP BY category
        `, {
          organizationId,
          ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
        }),
        this.executeRawQuery(`
          SELECT AVG("sentimentScore") as average 
          FROM feedback 
          WHERE "organizationId" = :organizationId 
          AND "sentimentScore" IS NOT NULL
          ${dateRange ? 'AND "createdAt" BETWEEN :startDate AND :endDate' : ''}
        `, {
          organizationId,
          ...(dateRange && { startDate: dateRange.startDate, endDate: dateRange.endDate })
        })
      ]);

      // Get trends over time (last 30 days)
      const trendsQuery = `
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as count,
          AVG("sentimentScore") as sentiment
        FROM feedback 
        WHERE "organizationId" = :organizationId
        AND "createdAt" >= :thirtyDaysAgo
        GROUP BY DATE("createdAt")
        ORDER BY date
      `;

      const trends = await this.executeRawQuery(trendsQuery, {
        organizationId,
        thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      });

      // Format analytics response
      const analytics: FeedbackAnalytics = {
        totalFeedback,
        byStatus: this.formatCounts(statusCounts),
        bySentiment: this.formatCounts(sentimentCounts),
        bySource: this.formatCounts(sourceCounts),
        byCategory: this.formatCounts(categoryCounts),
        averageSentimentScore: parseFloat(sentimentAvg[0]?.average || '0'),
        trendsOverTime: trends.map((trend: any) => ({
          date: trend.date,
          count: parseInt(trend.count),
          sentiment: parseFloat(trend.sentiment || '0')
        }))
      };

      logger.debug('Feedback analytics generated', {
        organizationId,
        totalFeedback: analytics.totalFeedback
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to get feedback analytics', error, { organizationId });
      throw error;
    }
  }

  /**
   * Get similar feedback based on content similarity
   */
  async getSimilarFeedback(
    feedbackId: string,
    organizationId: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      // This is a simplified similarity search
      // In production, you'd want to use full-text search or vector similarity
      const feedback = await this.findById(feedbackId);
      if (!feedback) {
        return [];
      }

      const keywords = this.extractKeywords(feedback.get('description'));
      
      if (keywords.length === 0) {
        return [];
      }

      const queryBuilder = new QueryBuilder()
        .filterByOrganization(organizationId)
        .filterByOperator('id', '$ne', feedbackId)
        .addLimit(limit);

      // Search for feedback containing similar keywords
      const keywordConditions = keywords.map(keyword => ({
        description: { $iLike: `%${keyword}%` }
      }));

      queryBuilder.filterByMultiple(keywordConditions);

      const similarFeedback = await this.model.findAll(queryBuilder.getQuery());

      logger.debug('Found similar feedback', {
        feedbackId,
        similarCount: similarFeedback.length
      });

      return similarFeedback;
    } catch (error) {
      logger.error('Failed to get similar feedback', error, { feedbackId });
      throw error;
    }
  }

  /**
   * Simple sentiment detection (placeholder - would use ML in production)
   */
  private detectSentiment(text: string): { label: string; score: number } {
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'perfect', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'useless'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    
    if (totalSentimentWords === 0) {
      return { label: 'neutral', score: 0 };
    }

    const score = (positiveCount - negativeCount) / totalSentimentWords;
    
    if (score > 0.5) return { label: 'very_positive', score };
    if (score > 0) return { label: 'positive', score };
    if (score < -0.5) return { label: 'very_negative', score };
    if (score < 0) return { label: 'negative', score };
    
    return { label: 'neutral', score };
  }

  /**
   * Extract keywords from text (simplified)
   */
  private extractKeywords(text: string): string[] {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were', 'been', 'be'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));

    // Return unique words
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Format count results for analytics
   */
  private formatCounts(counts: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    counts.forEach(item => {
      const key = item[Object.keys(item)[0]]; // First column (status, sentiment, etc.)
      const count = parseInt(item.count);
      result[key] = count;
    });
    return result;
  }
}

// Export singleton instance
export const feedbackAccessor = new FeedbackAccessor();
export default feedbackAccessor;