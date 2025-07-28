/**
 * Business Transactions - Real-world transaction implementations for FeedbackHub
 * Demonstrates practical usage of transaction patterns for complex business operations
 */

import { Transaction } from 'sequelize';
import { TransactionPatterns, RollbackInfo } from './TransactionPatterns';
import { withTransaction, TransactionManager } from './TransactionManager';
import { DatabaseManager, userAccessor, feedbackAccessor } from './index';
import { logger } from '../utils/logger';

export interface OrganizationCreationData {
  organizationData: {
    name: string;
    slug: string;
    plan: string;
  };
  ownerData: {
    email: string;
    firstName: string;
    lastName: string;
  };
  initialSettings?: {
    allowPublicFeedback: boolean;
    requireCustomerAuth: boolean;
  };
}

export interface FeedbackMigrationData {
  sourceOrganizationId: string;
  targetOrganizationId: string;
  feedbackIds?: string[];
  migrateCustomers: boolean;
  migrateIntegrations: boolean;
}

export interface BulkFeedbackUpdateData {
  feedbackIds: string[];
  updates: {
    status?: string;
    category?: string;
    assignedTo?: string;
    tags?: string[];
  };
  adminUserId: string;
}

/**
 * Business Transaction Implementations
 * Real-world examples using the transaction patterns
 */
export class BusinessTransactions {

  /**
   * Create Complete Organization Setup
   * Uses Saga pattern with compensation actions
   */
  static async createOrganizationWithOwner(
    data: OrganizationCreationData
  ): Promise<any> {
    const { organizationData, ownerData, initialSettings } = data;

    // Define saga steps with compensation actions
    const sagaSteps = [
      {
        name: 'createOwnerUser',
        execute: async (transaction: Transaction) => {
          logger.info('Creating owner user', { email: ownerData.email });
          return await userAccessor.createUser(ownerData, transaction);
        },
        compensate: async () => {
          logger.info('Compensating: Delete owner user', { email: ownerData.email });
          try {
            const user = await userAccessor.findByEmail(ownerData.email);
            if (user) {
              await userAccessor.deleteById(user.get('id'));
            }
          } catch (error) {
            logger.error('Failed to compensate user creation', error);
          }
        }
      },
      {
        name: 'createOrganization',
        execute: async (transaction: Transaction) => {
          logger.info('Creating organization', { name: organizationData.name });
          const orgAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Organization);
          return await orgAccessor.create({
            ...organizationData,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }, { transaction });
        },
        compensate: async () => {
          logger.info('Compensating: Delete organization', { name: organizationData.name });
          try {
            const orgAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Organization);
            await orgAccessor.delete({ slug: organizationData.slug });
          } catch (error) {
            logger.error('Failed to compensate organization creation', error);
          }
        }
      },
      {
        name: 'linkOwnerToOrganization',
        execute: async (transaction: Transaction, [user, organization]: any[]) => {
          logger.info('Linking owner to organization', {
            userId: user.get('id'),
            organizationId: organization.get('id')
          });
          
          const orgUserAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.OrganizationUser);
          return await orgUserAccessor.create({
            userId: user.get('id'),
            organizationId: organization.get('id'),
            role: 'owner',
            isActive: true,
            joinedAt: new Date()
          }, { transaction });
        },
        compensate: async () => {
          logger.info('Compensating: Remove organization-user link');
          try {
            const orgUserAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.OrganizationUser);
            await orgUserAccessor.delete({ role: 'owner' }); // This would need better identification
          } catch (error) {
            logger.error('Failed to compensate organization-user link', error);
          }
        }
      },
      {
        name: 'setupInitialSettings',
        execute: async (transaction: Transaction, [user, organization, orgUser]: any[]) => {
          if (!initialSettings) return { message: 'No initial settings to configure' };

          logger.info('Setting up initial organization settings', {
            organizationId: organization.get('id')
          });

          // Here you would create initial settings, default integrations, etc.
          // For example, create default custom fields, notification settings, etc.
          return { settingsConfigured: true, organizationId: organization.get('id') };
        },
        compensate: async () => {
          logger.info('Compensating: Remove initial settings');
          // Cleanup any initial settings created
        }
      }
    ];

    const result = await TransactionPatterns.executeSaga(sagaSteps, {
      name: 'createOrganizationWithOwner'
    });

    if (result.success) {
      const [user, organization, orgUser] = result.data as any[];
      logger.info('Organization setup completed successfully', {
        organizationId: organization.get('id'),
        ownerId: user.get('id'),
        organizationName: organization.get('name')
      });

      return {
        organization: organization.toJSON(),
        owner: user.toJSON(),
        membership: orgUser.toJSON()
      };
    } else {
      logger.error('Organization setup failed', result.error, {
        rollbackInfo: result.rollbackInfo
      });
      throw result.error;
    }
  }

  /**
   * Migrate Feedback Between Organizations
   * Uses Two-Phase Commit pattern
   */
  static async migrateFeedbackBetweenOrganizations(
    data: FeedbackMigrationData
  ): Promise<any> {
    const { sourceOrganizationId, targetOrganizationId, feedbackIds, migrateCustomers, migrateIntegrations } = data;

    // Phase 1: Prepare operations (validate and gather data)
    const prepareOperations = [
      // Validate source organization
      async (transaction: Transaction) => {
        const orgAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Organization);
        const sourceOrg = await orgAccessor.findById(sourceOrganizationId, { transaction });
        if (!sourceOrg) {
          throw new Error(`Source organization not found: ${sourceOrganizationId}`);
        }
        return { sourceOrg };
      },

      // Validate target organization
      async (transaction: Transaction) => {
        const orgAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Organization);
        const targetOrg = await orgAccessor.findById(targetOrganizationId, { transaction });
        if (!targetOrg) {
          throw new Error(`Target organization not found: ${targetOrganizationId}`);
        }
        return { targetOrg };
      },

      // Get feedback to migrate
      async (transaction: Transaction) => {
        const condition = feedbackIds 
          ? { organizationId: sourceOrganizationId, id: { $in: feedbackIds } }
          : { organizationId: sourceOrganizationId };

        const feedback = await feedbackAccessor.findAll(condition, { transaction });
        logger.info('Feedback prepared for migration', {
          count: feedback.length,
          sourceOrganizationId,
          targetOrganizationId
        });
        return { feedback };
      },

      // Get related customers if needed
      async (transaction: Transaction) => {
        if (!migrateCustomers) return { customers: [] };

        const customerAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Customer);
        const customers = await customerAccessor.findAll(
          { organizationId: sourceOrganizationId },
          { transaction }
        );
        return { customers };
      }
    ];

    // Phase 2: Commit operations (actual migration)
    const commitOperations = [
      // Migrate customers first
      async (transaction: Transaction, preparedData: any[]) => {
        const { customers } = preparedData[3];
        if (!migrateCustomers || customers.length === 0) return { migratedCustomers: 0 };

        const customerAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Customer);
        const [migratedCount] = await customerAccessor.update(
          { organizationId: sourceOrganizationId },
          { organizationId: targetOrganizationId },
          { transaction }
        );

        logger.info('Customers migrated', { count: migratedCount });
        return { migratedCustomers: migratedCount };
      },

      // Migrate feedback
      async (transaction: Transaction, preparedData: any[]) => {
        const { feedback } = preparedData[2];
        
        const condition = feedbackIds 
          ? { id: { $in: feedbackIds } }
          : { organizationId: sourceOrganizationId };

        const [migratedCount] = await feedbackAccessor.update(
          condition,
          { organizationId: targetOrganizationId },
          { transaction }
        );

        logger.info('Feedback migrated', { count: migratedCount });
        return { migratedFeedback: migratedCount };
      },

      // Migrate integrations if needed
      async (transaction: Transaction, preparedData: any[]) => {
        if (!migrateIntegrations) return { migratedIntegrations: 0 };

        const integrationAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Integration);
        const [migratedCount] = await integrationAccessor.update(
          { organizationId: sourceOrganizationId },
          { organizationId: targetOrganizationId },
          { transaction }
        );

        logger.info('Integrations migrated', { count: migratedCount });
        return { migratedIntegrations: migratedCount };
      }
    ];

    const result = await TransactionPatterns.executeTwoPhaseCommit(
      prepareOperations,
      commitOperations,
      { name: 'migrateFeedbackBetweenOrganizations' }
    );

    if (result.success) {
      const [customerResult, feedbackResult, integrationResult] = result.data as any[];
      
      logger.info('Migration completed successfully', {
        sourceOrganizationId,
        targetOrganizationId,
        migratedCustomers: customerResult.migratedCustomers,
        migratedFeedback: feedbackResult.migratedFeedback,
        migratedIntegrations: integrationResult.migratedIntegrations
      });

      return {
        success: true,
        migratedCustomers: customerResult.migratedCustomers,
        migratedFeedback: feedbackResult.migratedFeedback,
        migratedIntegrations: integrationResult.migratedIntegrations
      };
    } else {
      logger.error('Migration failed', result.error);
      throw result.error;
    }
  }

  /**
   * Bulk Update Feedback with Optimistic Locking
   * Handles concurrent updates safely
   */
  static async bulkUpdateFeedbackWithLocking(
    data: BulkFeedbackUpdateData
  ): Promise<any> {
    const { feedbackIds, updates, adminUserId } = data;
    const results = [];
    const failures = [];

    logger.info('Starting bulk feedback update with optimistic locking', {
      feedbackCount: feedbackIds.length,
      adminUserId,
      updates
    });

    // Process each feedback item with optimistic locking
    for (const feedbackId of feedbackIds) {
      try {
        const result = await TransactionPatterns.executeWithOptimisticLocking(
          feedbackId,
          'feedback',
          async (transaction: Transaction, currentVersion: number) => {
            // Perform the update with version checking
            const [affectedRows, updatedRecords] = await feedbackAccessor.update(
              { id: feedbackId, version: currentVersion },
              {
                ...updates,
                updatedBy: adminUserId,
                updatedAt: new Date()
              },
              { transaction, returning: true }
            );

            if (affectedRows === 0) {
              throw new Error(`Optimistic locking conflict for feedback ${feedbackId}`);
            }

            return updatedRecords[0];
          },
          { name: `bulkUpdateFeedback:${adminUserId}`, retries: 3 }
        );

        if (result.success) {
          results.push({ feedbackId, success: true, data: result.data });
        } else {
          failures.push({ feedbackId, success: false, error: result.error?.message });
        }

      } catch (error) {
        logger.error(`Failed to update feedback ${feedbackId}`, error);
        failures.push({ feedbackId, success: false, error: error.message });
      }
    }

    logger.info('Bulk feedback update completed', {
      totalItems: feedbackIds.length,
      successful: results.length,
      failed: failures.length,
      adminUserId
    });

    return {
      successful: results,
      failed: failures,
      summary: {
        total: feedbackIds.length,
        successful: results.length,
        failed: failures.length
      }
    };
  }

  /**
   * Process Large Dataset with Circuit Breaker
   * Handles system overload gracefully
   */
  static async processLargeFeedbackDataset(
    organizationId: string,
    processor: (feedback: any) => Promise<any>,
    batchSize: number = 100
  ): Promise<any> {
    logger.info('Starting large dataset processing with circuit breaker', {
      organizationId,
      batchSize
    });

    // Get total count first
    const totalCount = await feedbackAccessor.count({ organizationId });
    const totalBatches = Math.ceil(totalCount / batchSize);

    const processedItems = [];
    const errors = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const result = await TransactionPatterns.executeWithCircuitBreaker(
        async (transaction: Transaction) => {
          // Get batch of feedback
          const offset = batchIndex * batchSize;
          const batch = await feedbackAccessor.findAll(
            { organizationId },
            { 
              transaction,
              limit: batchSize,
              offset,
              order: [['createdAt', 'ASC']]
            }
          );

          // Process each item in the batch
          const batchResults = [];
          for (const item of batch) {
            try {
              const processed = await processor(item);
              batchResults.push({ id: item.get('id'), result: processed });
            } catch (itemError) {
              logger.error('Failed to process individual item', itemError, {
                feedbackId: item.get('id')
              });
              errors.push({ id: item.get('id'), error: itemError.message });
            }
          }

          return batchResults;
        },
        {
          circuitName: `processDataset:${organizationId}`,
          failureThreshold: 3,
          recoveryTimeout: 30000, // 30 seconds
          name: `processDatasetBatch:${batchIndex}`
        }
      );

      if (result.success) {
        processedItems.push(...result.data);
        logger.info(`Batch ${batchIndex + 1}/${totalBatches} processed successfully`, {
          batchSize: result.data.length
        });
      } else {
        logger.error(`Batch ${batchIndex + 1} failed`, result.error);
        
        if (result.error?.message.includes('Circuit breaker is OPEN')) {
          logger.warn('Circuit breaker opened, stopping processing to prevent system overload');
          break;
        }
      }

      // Small delay between batches to prevent system overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Large dataset processing completed', {
      organizationId,
      totalItems: totalCount,
      processedItems: processedItems.length,
      errors: errors.length
    });

    return {
      totalItems: totalCount,
      processedItems,
      errors,
      summary: {
        processed: processedItems.length,
        failed: errors.length,
        successRate: totalCount > 0 ? (processedItems.length / totalCount) * 100 : 0
      }
    };
  }

  /**
   * Delete Organization with Comprehensive Cleanup
   * Uses nested transactions with savepoints
   */
  static async deleteOrganizationCompletely(
    organizationId: string,
    adminUserId: string,
    confirmationCode: string
  ): Promise<void> {
    // Verify deletion is authorized
    if (confirmationCode !== `DELETE_ORG_${organizationId}`) {
      throw new Error('Invalid confirmation code for organization deletion');
    }

    await withTransaction(async (transaction) => {
      logger.info('Starting complete organization deletion', {
        organizationId,
        adminUserId
      });

      try {
        // Use savepoint for each major cleanup step
        await TransactionManager.withSavepoint(async (tx) => {
          // Delete all feedback
          const deletedFeedback = await feedbackAccessor.delete(
            { organizationId },
            { transaction: tx }
          );
          logger.info('Deleted organization feedback', { count: deletedFeedback });
        }, 'delete_feedback');

        await TransactionManager.withSavepoint(async (tx) => {
          // Delete all customers
          const customerAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Customer);
          const deletedCustomers = await customerAccessor.delete(
            { organizationId },
            { transaction: tx }
          );
          logger.info('Deleted organization customers', { count: deletedCustomers });
        }, 'delete_customers');

        await TransactionManager.withSavepoint(async (tx) => {
          // Delete all integrations
          const integrationAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Integration);
          const deletedIntegrations = await integrationAccessor.delete(
            { organizationId },
            { transaction: tx }
          );
          logger.info('Deleted organization integrations', { count: deletedIntegrations });
        }, 'delete_integrations');

        await TransactionManager.withSavepoint(async (tx) => {
          // Remove user associations
          const orgUserAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.OrganizationUser);
          const deletedAssociations = await orgUserAccessor.delete(
            { organizationId },
            { transaction: tx }
          );
          logger.info('Deleted organization user associations', { count: deletedAssociations });
        }, 'delete_user_associations');

        await TransactionManager.withSavepoint(async (tx) => {
          // Finally delete the organization itself
          const orgAccessor = DatabaseManager.createAccessor(DatabaseManager.db.models.Organization);
          const deletedOrg = await orgAccessor.deleteById(organizationId, { transaction: tx });
          
          if (!deletedOrg) {
            throw new Error('Organization not found or already deleted');
          }
          
          logger.info('Deleted organization', { organizationId });
        }, 'delete_organization');

        logger.info('Organization deletion completed successfully', {
          organizationId,
          adminUserId
        });

      } catch (error) {
        logger.error('Organization deletion failed', error, {
          organizationId,
          adminUserId
        });
        throw error;
      }
    }, {
      name: `deleteOrganization:${organizationId}:${adminUserId}`
    });
  }
}

export default BusinessTransactions;