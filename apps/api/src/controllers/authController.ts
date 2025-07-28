/**
 * Auth Controller
 * Handles authentication-related operations and profile setup
 * Bridges SuperTokens authentication with our user profile system
 */

import { Response, NextFunction } from 'express';
import { authBridgeService } from '../services/authBridgeService';
import { userService } from '../services/userService';
import { SessionRequest } from 'supertokens-node/framework/express';
import Joi from 'joi';
import ResponseBuilder from '../utils/ResponseBuilder';

// Validation schema for profile setup
const setupProfileSchema = Joi.object({
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
  organization: Joi.string().max(100).optional(),
  profileImage: Joi.string().uri().optional(),
  acceptTerms: Joi.boolean().valid(true).required(),
  marketingOptIn: Joi.boolean().optional().default(false)
});

const syncProfileSchema = Joi.object({
  force: Joi.boolean().optional().default(false)
});

export class AuthController {
  /**
   * Setup user profile after successful authentication
   * This is called from the frontend after auth flow completes
   */
  async setupProfile(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const userInfo = req.session!.getAccessTokenPayload();

      // Validate request body
      const { error, value } = setupProfileSchema.validate(req.body);
      if (error) {
        return ResponseBuilder.validationError(res, 
          'Validation Error', 
          error.details.map(d => d.message)
        );
      }

      // Check if profile already exists
      let profileExists = true;
      try {
        await userService.getUserProfile(userId);
      } catch (error) {
        profileExists = false;
      }

      if (profileExists) {
        // Update existing profile
        const updatedProfile = await userService.updateUserProfile(userId, {
          firstName: value.firstName,
          lastName: value.lastName,
          organization: value.organization,
          profileImage: value.profileImage
        });

        return ResponseBuilder.success(res, updatedProfile, 'Profile updated successfully');
      }

      // Create new profile using auth bridge service
      await authBridgeService.handleUserSignup({
        id: userId,
        email: userInfo.email || '',
        emailVerified: userInfo.email_verified || false
      }, {
        firstName: value.firstName,
        lastName: value.lastName,
        organization: value.organization,
        profileImage: value.profileImage,
        source: 'signup'
      });

      const profile = await userService.getUserProfile(userId);

      return ResponseBuilder.created(res, profile, 'Profile created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check profile setup status
   * Used by frontend to determine if profile setup is needed
   */
  async getProfileStatus(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      let profileExists = false;
      let profile = null;
      let isComplete = false;

      try {
        profile = await userService.getUserProfile(userId);
        profileExists = true;
        
        // Check if profile is complete (has required fields)
        isComplete = !!(
          profile.firstName &&
          profile.lastName &&
          profile.email &&
          profile.isEmailVerified
        );
      } catch (error) {
        // Profile doesn't exist
      }

      return ResponseBuilder.success(res, {
        profileExists,
        isComplete,
        needsSetup: !profileExists || !isComplete,
        profile: profileExists ? {
          id: profile?.id,
          email: profile?.email,
          firstName: profile?.firstName,
          lastName: profile?.lastName,
          isEmailVerified: profile?.isEmailVerified,
          hasOrganizations: false
        } : null
      }, 'Profile status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync user data from SuperTokens to our database
   * Useful for fixing data inconsistencies
   */
  async syncProfile(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const userInfo = req.session!.getAccessTokenPayload();

      // Validate request body
      const { error } = syncProfileSchema.validate(req.body);
      if (error) {
        return ResponseBuilder.validationError(res, 
          'Validation Error', 
          error.details.map(d => d.message)
        );
      }

      // Sync user data
      await authBridgeService.syncUserData({
        id: userId,
        email: userInfo.email || '',
        emailVerified: userInfo.email_verified || false
      });

      const profile = await userService.getUserProfile(userId);

      return ResponseBuilder.success(res, profile, 'Profile synced successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete email verification
   * Called when user clicks email verification link
   */
  async completeEmailVerification(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const userInfo = req.session!.getAccessTokenPayload();

      // Handle email verification through auth bridge
      await authBridgeService.handleEmailVerification(
        userId,
        userInfo.email || ''
      );

      const profile = await userService.getUserProfile(userId);

      return ResponseBuilder.success(res, profile, 'Email verification completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle user signout
   * Clean up any necessary session data
   */
  async handleSignout(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      // Update last activity before signout
      await userService.updateLastActivity(userId, {
        action: 'user_signout',
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent')
        }
      });

      return ResponseBuilder.success(res, null, 'Signout handled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authentication status with profile info
   * Enhanced version of SuperTokens session info
   */
  async getAuthStatus(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();
      const session = req.session!;
      const userInfo = session.getAccessTokenPayload();

      // Get profile information
      let profile = null;
      try {
        profile = await userService.getUserProfile(userId);
      } catch (error) {
        // Profile doesn't exist yet
      }

      res.json({
        success: true,
        data: {
          session: {
            sessionHandle: session.getHandle(),
            userId: userId,
            accessTokenPayload: userInfo
          },
          profile: profile ? {
            id: profile.id,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            profileImage: profile.profileImage,
            isEmailVerified: profile.isEmailVerified,
            lastActivityTime: profile.lastActivityTime
          } : null,
          needsProfileSetup: !profile || !profile.firstName || !profile.lastName
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle account deletion
   * Clean up profile data when user deletes their SuperTokens account
   */
  async handleAccountDeletion(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      // Handle user deletion through auth bridge
      await authBridgeService.handleUserDeletion(userId);

      res.json({
        success: true,
        message: 'Account deletion handled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();