/**
 * User Controller
 * Handles user profile management HTTP requests
 * Following Zeda patterns for validation and error handling
 */

import { Request, Response, NextFunction } from 'express';
import { userService, CreateUserData, UpdateUserProfileData } from '../services/userService';
import { SessionRequest } from 'supertokens-node/framework/express';
import Joi from 'joi';

// Validation schemas following Zeda patterns
const createUserProfileSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  profileImage: Joi.string().uri().optional(),
  organization: Joi.string().max(100).optional()
});

const updateUserProfileSchema = Joi.object({
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  profileImage: Joi.string().uri().optional(),
  organization: Joi.string().max(100).optional()
});

const searchUsersSchema = Joi.object({
  q: Joi.string().min(3).max(100).required(),
  limit: Joi.number().integer().min(1).max(50).optional().default(10)
});

export class UserController {
  /**
   * Create user profile (called after SuperTokens registration)
   * This bridges SuperTokens auth with our user profile system
   */
  async createUserProfile(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = createUserProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const userData: CreateUserData = {
        id: userId,
        ...value
      };

      const user = await userService.createUserProfile(userData);

      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const user = await userService.getUserProfile(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = updateUserProfileSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const user = await userService.updateUserProfile(userId, value as UpdateUserProfileData);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark user email as verified
   * Called by SuperTokens webhook or manual verification
   */
  async markEmailVerified(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const user = await userService.markEmailVerified(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const organizations = await userService.getUserOrganizations(userId);

      res.json({
        success: true,
        data: organizations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users by email (for invitations)
   * Following Zeda pattern with privacy controls
   */
  async searchUsers(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      // Validate query parameters
      const { error, value } = searchUsersSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const users = await userService.searchUsersByEmail(value.q, value.limit);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const stats = await userService.getUserStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user activity
   * Called automatically by middleware for activity tracking
   */
  async updateActivity(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      
      // Extract activity data from request
      const activityData = {
        action: req.body.action || 'api_call',
        metadata: {
          endpoint: req.originalUrl,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ...req.body.metadata
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      await userService.updateLastActivity(userId, activityData);

      res.json({
        success: true,
        message: 'Activity updated'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user profile
   * Note: This only deletes profile data, SuperTokens handles auth deletion
   */
  async deleteUserProfile(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const result = await userService.deleteUserProfile(userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID (for admin/organization management)
   */
  async getUserById(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const currentUserId = req.session!.getUserId();

      // Basic permission check - could be enhanced with role-based access
      if (userId !== currentUserId) {
        // For now, only allow users to access their own profile
        // TODO: Add organization admin checks for user management
        return res.status(403).json({
          error: 'Access Denied',
          message: 'You can only access your own user profile'
        });
      }

      const user = await userService.getUserProfile(userId);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user has organization access
   * Utility endpoint for frontend permission checks
   */
  async checkOrganizationAccess(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const hasAccess = await userService.hasOrganizationAccess(userId, organizationId);
      const role = hasAccess ? await userService.getUserRoleInOrganization(userId, organizationId) : null;

      res.json({
        success: true,
        data: {
          hasAccess,
          role,
          userId,
          organizationId
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();