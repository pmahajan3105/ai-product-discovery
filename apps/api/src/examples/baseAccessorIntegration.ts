/**
 * Base Accessor Integration Examples
 * Shows how to integrate the new Base Accessor Pattern with existing services
 * Demonstrates migration from direct model usage to accessor pattern
 */

import { Transaction } from 'sequelize';
import { 
  DatabaseManager, 
  userAccessor, 
  feedbackAccessor,
  createQuery,
  createTransaction,
  BaseAccessor,
  QueryBuilder
} from '../db';
import { logger } from '../utils/logger';

/**
 * Example 1: User Service Integration
 * Shows how to migrate from direct model usage to accessor pattern
 */
export class EnhancedUserService {
  // Use the specialized user accessor
  private userAccessor = DatabaseManager.users;

  /**
   * Create user with enhanced validation and logging
   */
  async createUser(userData: any): Promise<any> {
    try {
      // The accessor handles validation, logging, and error handling
      return await this.userAccessor.createUser(userData);
    } catch (error) {
      logger.error('User service: Failed to create user', error);
      throw error;
    }
  }

  /**
   * Get users with search and pagination - leveraging query builder
   */
  async getUsers(searchTerm?: string, page: number = 1, size: number = 20) {
    try {
      // Use the accessor's built-in search functionality
      return await this.userAccessor.getUsersWithSearch(searchTerm, page, size);
    } catch (error) {
      logger.error('User service: Failed to get users', error);
      throw error;
    }
  }

  /**
   * Complex user query using QueryBuilder
   */
  async getActiveUsersInOrganization(organizationId: string, daysSinceActivity: number = 30) {
    try {
      // Build complex query using QueryBuilder
      const query = createQuery
        .forOrganization(organizationId)
        .filterRecent(daysSinceActivity)
        .addInclude({
          model: DatabaseManager.db.models.OrganizationUser,
          where: { organizationId },
          required: true
        })
        .addOrderBy('lastActivityTime', 'DESC');

      // Execute using base accessor methods
      const users = await this.userAccessor.findAll({}, {
        ...query.getQuery()
      });

      return users;
    } catch (error) {
      logger.error('User service: Failed to get active users in organization', error, {
        organizationId,
        daysSinceActivity
      });
      throw error;
    }
  }

  /**
   * Bulk operations with transaction management
   */
  async bulkUpdateUsers(userIds: string[], updateData: any, adminUserId: string) {
    return await createTransaction.named(
      `bulkUpdateUsers:${adminUserId}`,
      async (transaction) => {
        try {
          logger.info('Starting bulk user update', {
            userCount: userIds.length,
            adminUserId
          });

          const results = [];

          // Update users one by one to trigger validation and logging
          for (const userId of userIds) {
            const result = await this.userAccessor.updateProfile(
              userId, 
              updateData, 
              transaction
            );
            results.push(result);
          }

          logger.info('Bulk user update completed successfully', {
            updatedCount: results.filter(r => r !== null).length,
            adminUserId
          });

          return results;
        } catch (error) {
          logger.error('Bulk user update failed', error, { userIds, adminUserId });
          throw error;
        }
      }
    );
  }
}

/**
 * Example 2: Feedback Service Integration
 * Shows advanced usage with analytics and complex queries
 */
export class EnhancedFeedbackService {
  private feedbackAccessor = DatabaseManager.feedback;

  /**
   * Create feedback with auto-enrichment
   */
  async createFeedback(feedbackData: any): Promise<any> {
    return await createTransaction.withRetry(
      async (transaction) => {
        try {
          // Create feedback using accessor (includes validation and sentiment analysis)
          const feedback = await this.feedbackAccessor.createFeedback(
            feedbackData, 
            transaction
          );

          // Update customer engagement metrics
          if (feedback.customerId) {
            await this.updateCustomerEngagement(feedback.customerId, transaction);
          }

          return feedback;
        } catch (error) {
          logger.error('Feedback service: Failed to create feedback', error);
          throw error;
        }
      },
      3 // Retry up to 3 times on transaction conflicts
    );
  }

  /**
   * Advanced feedback search with multiple filters
   */
  async searchFeedback(searchOptions: any) {
    try {
      // Use the accessor's advanced search functionality
      return await this.feedbackAccessor.searchFeedback(searchOptions);
    } catch (error) {
      logger.error('Feedback service: Failed to search feedback', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive feedback report
   */
  async generateFeedbackReport(organizationId: string, dateRange?: any) {
    try {
      const [analytics, recentFeedback, trends] = await Promise.all([
        // Get analytics using accessor
        this.feedbackAccessor.getAnalytics(organizationId, dateRange),
        
        // Get recent feedback using query builder
        this.getRecentFeedbackWithDetails(organizationId, 10),
        
        // Get sentiment trends
        this.getSentimentTrends(organizationId, dateRange)
      ]);

      return {
        analytics,
        recentFeedback,
        trends,
        generatedAt: new Date(),
        organizationId
      };
    } catch (error) {
      logger.error('Feedback service: Failed to generate report', error, {
        organizationId
      });
      throw error;
    }
  }

  /**
   * Complex multi-table query using QueryBuilder
   */
  private async getRecentFeedbackWithDetails(organizationId: string, limit: number) {
    const query = new QueryBuilder()
      .filterByOrganization(organizationId)
      .filterRecent(7) // Last 7 days
      .addInclude({
        model: DatabaseManager.db.models.Customer,
        attributes: ['id', 'name', 'email', 'company'],
        required: false
      })
      .addInclude({
        model: DatabaseManager.db.models.User,
        as: 'assignedUser',
        attributes: ['id', 'firstName', 'lastName'],
        required: false
      })
      .addOrderBy('createdAt', 'DESC')
      .addLimit(limit);

    return await this.feedbackAccessor.findAll({}, query.getQuery());
  }

  /**
   * Custom SQL query using raw query execution
   */
  private async getSentimentTrends(organizationId: string, dateRange?: any) {
    const query = `
      SELECT 
        DATE_TRUNC('day', "createdAt") as date,
        sentiment,
        COUNT(*) as count,
        AVG("sentimentScore") as avgScore
      FROM feedback 
      WHERE "organizationId" = :organizationId
      ${dateRange ? 'AND "createdAt" BETWEEN :startDate AND :endDate' : 'AND "createdAt" >= NOW() - INTERVAL \'30 days\''}
      AND sentiment IS NOT NULL
      GROUP BY DATE_TRUNC('day', "createdAt"), sentiment
      ORDER BY date DESC, sentiment
    `;

    return await this.feedbackAccessor.executeRawQuery(query, {
      organizationId,
      ...(dateRange && { 
        startDate: dateRange.startDate, 
        endDate: dateRange.endDate 
      })
    });
  }

  /**
   * Update customer engagement metrics
   */
  private async updateCustomerEngagement(customerId: string, transaction: Transaction) {
    // This would update customer engagement scores, last feedback date, etc.
    // Using a generic accessor for the Customer model since we don't have a specialized one yet
    const customerAccessor = new BaseAccessor(DatabaseManager.db.models.Customer);
    
    await customerAccessor.updateById(
      customerId,
      {
        lastFeedbackAt: new Date(),
        // You could increment engagement scores, update feedback count, etc.
      },
      { transaction }
    );
  }
}

/**
 * Example 3: Cross-Model Operations with Transactions
 * Shows how to coordinate operations across multiple models
 */
export class OrganizationService {
  /**
   * Delete organization and all associated data
   */
  async deleteOrganization(organizationId: string, adminUserId: string): Promise<void> {
    await createTransaction.named(
      `deleteOrganization:${organizationId}:${adminUserId}`,
      async (transaction) => {
        try {
          logger.info('Starting organization deletion', { organizationId, adminUserId });

          // Delete feedback first (to maintain referential integrity)
          const deletedFeedback = await feedbackAccessor.delete(
            { organizationId },
            { transaction }
          );

          // Remove user associations
          await DatabaseManager.db.models.OrganizationUser.destroy({
            where: { organizationId },
            transaction
          });

          // Delete integrations
          await DatabaseManager.db.models.Integration.destroy({
            where: { organizationId },
            transaction
          });

          // Delete customers
          await DatabaseManager.db.models.Customer.destroy({
            where: { organizationId },
            transaction
          });

          // Finally delete the organization
          await DatabaseManager.db.models.Organization.destroy({
            where: { id: organizationId },
            transaction
          });

          logger.info('Organization deletion completed', {
            organizationId,
            deletedFeedback,
            adminUserId
          });
        } catch (error) {
          logger.error('Organization deletion failed', error, {
            organizationId,
            adminUserId
          });
          throw error;
        }
      }
    );
  }

  /**
   * Migrate data between organizations
   */
  async migrateOrganizationData(
    sourceOrgId: string,
    targetOrgId: string,
    adminUserId: string
  ): Promise<void> {
    await createTransaction.batch([
      // Migration operations as separate functions
      async (transaction) => {
        // Migrate feedback
        await feedbackAccessor.update(
          { organizationId: sourceOrgId },
          { organizationId: targetOrgId },
          { transaction }
        );
      },
      async (transaction) => {
        // Migrate customers
        const customerAccessor = new BaseAccessor(DatabaseManager.db.models.Customer);
        await customerAccessor.update(
          { organizationId: sourceOrgId },
          { organizationId: targetOrgId },
          { transaction }
        );
      },
      async (transaction) => {
        // Migrate integrations
        const integrationAccessor = new BaseAccessor(DatabaseManager.db.models.Integration);
        await integrationAccessor.update(
          { organizationId: sourceOrgId },
          { organizationId: targetOrgId },
          { transaction }
        );
      }
    ]);

    logger.info('Organization data migration completed', {
      sourceOrgId,
      targetOrgId,
      adminUserId
    });
  }
}

/**
 * Example 4: Performance Optimization Patterns
 */
export class PerformanceOptimizedService {
  /**
   * Batch loading with pagination to avoid memory issues
   */
  async processFeedbackInBatches(
    organizationId: string,
    processor: (feedback: any[]) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const results = await feedbackAccessor.findWithPagination(
        { organizationId },
        { page, size: batchSize },
        { attributes: ['id', 'title', 'description', 'sentiment'] } // Only load needed fields
      );

      if (results.data.length > 0) {
        await processor(results.data);
        logger.debug(`Processed batch ${page}`, {
          batchSize: results.data.length,
          totalProcessed: page * batchSize
        });
      }

      hasMore = results.hasNextPage;
      page++;
    }
  }

  /**
   * Optimized aggregation query
   */
  async getFeedbackSummary(organizationId: string) {
    // Use raw SQL for complex aggregations
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
        AVG(CASE WHEN "sentimentScore" IS NOT NULL THEN "sentimentScore" END) as avg_sentiment,
        COUNT(DISTINCT "customerId") as unique_customers,
        DATE_TRUNC('month', "createdAt") as month
      FROM feedback 
      WHERE "organizationId" = :organizationId
      AND "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    return await feedbackAccessor.executeRawQuery(summaryQuery, { organizationId });
  }
}

// Export examples for documentation and testing
export default {
  EnhancedUserService,
  EnhancedFeedbackService,
  OrganizationService,
  PerformanceOptimizedService
};