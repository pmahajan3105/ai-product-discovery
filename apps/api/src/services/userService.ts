/**
 * User Service
 * Handles user profile management following Zeda patterns
 * 
 * Key architectural decisions:
 * - User profile separate from authentication (SuperTokens handles auth)
 * - Simple but extensible role system
 * - Activity tracking for security and analytics
 * - Clean validation and error handling
 */

import { db } from './database';
import { Op } from 'sequelize';

export interface CreateUserData {
  id: string; // SuperTokens user ID
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  organization?: string;
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  organization?: string;
}

export interface UserActivityData {
  action: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class UserService {
  /**
   * Create user profile (called after SuperTokens auth)
   * Following Zeda pattern of separating profile from auth
   */
  async createUserProfile(data: CreateUserData) {
    // Check if user already exists
    const existingUser = await db.models.User.findByPk(data.id);
    if (existingUser) {
      throw new Error('User profile already exists');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }

    // Create user profile
    const user = await db.models.User.create({
      id: data.id,
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      profileImage: data.profileImage,
      organization: data.organization,
      isEmailVerified: false, // Will be updated when SuperTokens confirms verification
      lastActivityTime: new Date()
    });

    return this.getUserProfile(user.id);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string) {
    const user = await db.models.User.findByPk(userId, {
      include: [
        {
          model: db.models.Organization,
          as: 'organizations',
          through: {
            attributes: ['role', 'joinedAt'],
            as: 'membership'
          },
          attributes: ['id', 'name', 'uniqueName', 'image']
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   * Following Zeda pattern of validating updates
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileData) {
    const user = await db.models.User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate inputs
    if (data.firstName !== undefined && data.firstName.length > 50) {
      throw new Error('First name too long (max 50 characters)');
    }
    
    if (data.lastName !== undefined && data.lastName.length > 50) {
      throw new Error('Last name too long (max 50 characters)');
    }

    if (data.organization !== undefined && data.organization.length > 100) {
      throw new Error('Organization name too long (max 100 characters)');
    }

    // Update profile
    await user.update({
      ...data,
      lastActivityTime: new Date()
    });

    return this.getUserProfile(userId);
  }

  /**
   * Update user's last activity time
   * Following Zeda pattern for activity tracking
   */
  async updateLastActivity(userId: string, activityData?: UserActivityData) {
    const user = await db.models.User.findByPk(userId);
    if (!user) {
      return; // Fail silently for activity updates
    }

    await user.update({
      lastActivityTime: new Date()
    });

    // Log activity if provided (for future analytics)
    if (activityData) {
      // Could store in separate activity log table later
      console.log(`User ${userId} activity:`, activityData);
    }
  }

  /**
   * Mark user email as verified
   * Called when SuperTokens confirms email verification
   */
  async markEmailVerified(userId: string) {
    const user = await db.models.User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await user.update({
      isEmailVerified: true,
      emailVerifiedTime: new Date(),
      lastActivityTime: new Date()
    });

    return this.getUserProfile(userId);
  }

  /**
   * Get user's organizations with roles
   * Following Zeda pattern for workspace relationships
   */
  async getUserOrganizations(userId: string) {
    const user = await db.models.User.findByPk(userId, {
      include: [
        {
          model: db.models.Organization,
          as: 'organizations',
          through: {
            attributes: ['role', 'joinedAt'],
            as: 'membership'
          },
          attributes: ['id', 'name', 'uniqueName', 'description', 'image', 'createdAt']
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.organizations || [];
  }

  /**
   * Check if user has access to organization
   * Following Zeda pattern for permission checking
   */
  async hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    const membership = await db.models.OrganizationUser.findOne({
      where: {
        userId,
        organizationId
      }
    });

    return !!membership;
  }

  /**
   * Get user's role in organization
   * Following Zeda pattern for role checking
   */
  async getUserRoleInOrganization(userId: string, organizationId: string): Promise<string | null> {
    const membership = await db.models.OrganizationUser.findOne({
      where: {
        userId,
        organizationId
      },
      attributes: ['role']
    });

    return membership?.role || null;
  }

  /**
   * Search users by email (for invitations)
   * Following Zeda pattern with privacy controls
   */
  async searchUsersByEmail(query: string, limit: number = 10): Promise<any[]> {
    if (query.length < 3) {
      throw new Error('Search query too short (minimum 3 characters)');
    }

    const users = await db.models.User.findAll({
      where: {
        email: {
          [Op.iLike]: `%${query}%`
        }
      },
      attributes: ['id', 'email', 'firstName', 'lastName', 'profileImage'],
      limit,
      order: [['email', 'ASC']]
    });

    return users;
  }

  /**
   * Get user statistics
   * Following Zeda pattern for admin insights
   */
  async getUserStats(userId: string) {
    const user = await this.getUserProfile(userId);
    
    const [organizationCount, feedbackCount] = await Promise.all([
      db.models.OrganizationUser.count({
        where: { userId }
      }),
      db.models.Feedback.count({
        include: [
          {
            model: db.models.Organization,
            as: 'organization',
            include: [
              {
                model: db.models.User,
                as: 'users',
                where: { id: userId },
                through: { attributes: [] }
              }
            ]
          }
        ]
      })
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        joinedAt: user.createdAt,
        lastActivity: user.lastActivityTime,
        isEmailVerified: user.isEmailVerified
      },
      stats: {
        organizationCount,
        feedbackCount,
        isActive: user.lastActivityTime ? 
          (new Date().getTime() - new Date(user.lastActivityTime).getTime()) < (30 * 24 * 60 * 60 * 1000) : // 30 days
          false
      }
    };
  }

  /**
   * Delete user profile (soft delete following Zeda pattern)
   * Note: SuperTokens handles auth deletion separately
   */
  async deleteUserProfile(userId: string) {
    const user = await db.models.User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is owner of any organizations
    const ownedOrganizations = await db.models.OrganizationUser.findAll({
      where: {
        userId,
        role: 'owner'
      }
    });

    if (ownedOrganizations.length > 0) {
      throw new Error('Cannot delete user who owns organizations. Transfer ownership first.');
    }

    // Remove from all organizations
    await db.models.OrganizationUser.destroy({
      where: { userId }
    });

    // Soft delete user (could implement actual soft delete with isDeleted flag)
    await user.destroy();

    return { message: 'User profile deleted successfully' };
  }
}

export const userService = new UserService();