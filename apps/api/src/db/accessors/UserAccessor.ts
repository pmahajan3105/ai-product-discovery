/**
 * User Accessor - Specialized database operations for User model
 * Extends BaseAccessor with User-specific operations
 */

import { Transaction } from 'sequelize';
import { BaseAccessor, AnyObj, QueryResult } from '../BaseAccessor';
import { QueryBuilder, QueryBuilderFactory } from '../QueryBuilder';
import { TransactionManager } from '../TransactionManager';
import { db, UserAttributes } from '../../services/database';
import { logger } from '../../utils/logger';

export class UserAccessor extends BaseAccessor {
  constructor() {
    super(db.models.User);
  }

  /**
   * Create a new user with validation
   */
  async createUser(userData: Partial<UserAttributes>, transaction?: Transaction): Promise<any> {
    try {
      // Validate required fields
      if (!userData.email || !userData.firstName || !userData.lastName) {
        throw new Error('Email, firstName, and lastName are required');
      }

      // Check if user already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error(`User with email ${userData.email} already exists`);
      }

      logger.info('Creating new user', { 
        email: userData.email,
        provider: userData.provider || 'email' 
      });

      const user = await this.create(userData, { transaction });
      
      logger.info('User created successfully', { 
        userId: user.get('id'),
        email: userData.email 
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', error, { email: userData.email });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<any | null> {
    try {
      return await this.findOne({ email: email.toLowerCase().trim() });
    } catch (error) {
      logger.error('Failed to find user by email', error, { email });
      throw error;
    }
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<any | null> {
    try {
      return await this.findOne({ googleId });
    } catch (error) {
      logger.error('Failed to find user by Google ID', error, { googleId });
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateProfile(
    userId: string, 
    profileData: Partial<UserAttributes>,
    transaction?: Transaction
  ): Promise<any | null> {
    try {
      // Remove fields that shouldn't be updated via profile update
      const sanitizedData = { ...profileData };
      delete sanitizedData.id;
      delete sanitizedData.email;
      delete sanitizedData.provider;
      delete sanitizedData.googleId;
      delete sanitizedData.createdAt;
      delete sanitizedData.updatedAt;

      logger.info('Updating user profile', { 
        userId,
        fields: Object.keys(sanitizedData) 
      });

      const updatedUser = await this.updateById(userId, sanitizedData, { transaction });
      
      if (updatedUser) {
        logger.info('User profile updated successfully', { userId });
      } else {
        logger.warn('No user found to update', { userId });
      }

      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user profile', error, { userId });
      throw error;
    }
  }

  /**
   * Update user's last activity time
   */
  async updateLastActivity(
    userId: string, 
    activityData?: { action?: string; metadata?: AnyObj },
    transaction?: Transaction
  ): Promise<void> {
    try {
      const updateData: AnyObj = {
        lastActivityTime: new Date()
      };

      // If activity data is provided, we could store it in a separate activity log
      // For now, just update the timestamp
      
      await this.updateById(userId, updateData, { transaction });
      
      logger.debug('User activity updated', { 
        userId,
        action: activityData?.action 
      });
    } catch (error) {
      logger.error('Failed to update user activity', error, { userId });
      // Don't throw error for activity updates as they're not critical
    }
  }

  /**
   * Get users with pagination and search
   */
  async getUsersWithSearch(
    searchTerm?: string,
    page: number = 1,
    size: number = 20
  ): Promise<QueryResult<any>> {
    try {
      const queryBuilder = QueryBuilderFactory.forPagination(page, size)
        .addOrderBy('createdAt', 'DESC');

      if (searchTerm) {
        const searchConditions = [
          { firstName: { $iLike: `%${searchTerm}%` } },
          { lastName: { $iLike: `%${searchTerm}%` } },
          { email: { $iLike: `%${searchTerm}%` } }
        ];
        queryBuilder.filterByMultiple(searchConditions);
      }

      const query = queryBuilder.getQuery();
      
      // Execute count and find in parallel
      const [users, totalCount] = await Promise.all([
        this.model.findAll(query),
        this.model.count({ where: query.where })
      ]);

      const totalPages = Math.ceil(totalCount / size);

      return {
        data: users,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        currentPage: page,
        totalPages
      };
    } catch (error) {
      logger.error('Failed to get users with search', error, { searchTerm, page, size });
      throw error;
    }
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organizationId: string): Promise<any[]> {
    try {
      const queryBuilder = new QueryBuilder()
        .addInclude({
          model: db.models.OrganizationUser,
          where: { organizationId },
          required: true
        })
        .addOrderBy('firstName', 'ASC');

      const users = await this.model.findAll(queryBuilder.getQuery());
      
      logger.debug('Found users for organization', { 
        organizationId,
        userCount: users.length 
      });

      return users;
    } catch (error) {
      logger.error('Failed to get users by organization', error, { organizationId });
      throw error;
    }
  }

  /**
   * Get active users (users who have been active recently)
   */
  async getActiveUsers(daysSinceLastActivity: number = 30): Promise<any[]> {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - daysSinceLastActivity);

      const queryBuilder = new QueryBuilder()
        .filterByGreaterThanOrEqual('lastActivityTime', sinceDate)
        .addOrderBy('lastActivityTime', 'DESC');

      const users = await this.model.findAll(queryBuilder.getQuery());
      
      logger.debug('Found active users', { 
        daysSinceLastActivity,
        userCount: users.length 
      });

      return users;
    } catch (error) {
      logger.error('Failed to get active users', error, { daysSinceLastActivity });
      throw error;
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string, transaction?: Transaction): Promise<any | null> {
    try {
      logger.info('Verifying user email', { userId });

      const updatedUser = await this.updateById(
        userId, 
        { isEmailVerified: true },
        { transaction }
      );

      if (updatedUser) {
        logger.info('User email verified successfully', { userId });
      } else {
        logger.warn('No user found to verify email', { userId });
      }

      return updatedUser;
    } catch (error) {
      logger.error('Failed to verify user email', error, { userId });
      throw error;
    }
  }

  /**
   * Delete user and associated data
   */
  async deleteUserCompletely(userId: string): Promise<void> {
    await TransactionManager.withTransaction(async (transaction) => {
      try {
        logger.info('Starting complete user deletion', { userId });

        // Delete associated organization memberships
        await db.models.OrganizationUser.destroy({
          where: { userId },
          transaction
        });

        // Update feedback assigned to this user (set to null instead of deleting)
        await db.models.Feedback.update(
          { assignedTo: null },
          { 
            where: { assignedTo: userId },
            transaction 
          }
        );

        // Delete the user
        const deletedCount = await this.deleteById(userId, { transaction });

        if (deletedCount) {
          logger.info('User and associated data deleted successfully', { userId });
        } else {
          logger.warn('No user found to delete', { userId });
          throw new Error('User not found');
        }
      } catch (error) {
        logger.error('Failed to delete user completely', error, { userId });
        throw error;
      }
    }, {
      name: `deleteUser:${userId}`
    });
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    activeUsers: number;
    googleUsers: number;
    emailUsers: number;
  }> {
    try {
      const [
        totalUsers,
        verifiedUsers,
        activeUsers,
        googleUsers,
        emailUsers
      ] = await Promise.all([
        this.count(),
        this.count({ isEmailVerified: true }),
        this.count({ lastActivityTime: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        this.count({ provider: 'google' }),
        this.count({ provider: 'email' })
      ]);

      const stats = {
        totalUsers,
        verifiedUsers,
        activeUsers,
        googleUsers,
        emailUsers
      };

      logger.debug('User statistics generated', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get user statistics', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userAccessor = new UserAccessor();
export default userAccessor;