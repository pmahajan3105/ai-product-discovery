/**
 * Auth Bridge Service
 * Bridges SuperTokens authentication with our database operations
 * 
 * Key responsibilities:
 * - Handle SuperTokens user lifecycle events
 * - Synchronize auth state with user profiles
 * - Manage email verification flow
 * - Handle auth-to-profile data mapping
 */

import { userService } from './userService';
import { RecipeUserId } from 'supertokens-node/lib/build/types';

export interface SuperTokensUserData {
  id: string;
  email: string;
  emailVerified?: boolean;
  loginMethods?: Array<{
    email?: string;
    verified: boolean;
    recipeId: string;
  }>;
}

export interface ProfileCreationData {
  firstName?: string;
  lastName?: string;
  profileImage?: string;
  organization?: string;
  source?: 'signup' | 'oauth' | 'invite';
}

export class AuthBridgeService {
  /**
   * Handle new user signup - create user profile after SuperTokens user creation
   * This is called from SuperTokens override functions
   */
  async handleUserSignup(superTokensUser: SuperTokensUserData, profileData?: ProfileCreationData) {
    try {
      console.log(`🔗 Creating user profile for SuperTokens user: ${superTokensUser.id}`);

      // Extract primary email (SuperTokens can have multiple login methods)
      const primaryEmail = this.getPrimaryEmail(superTokensUser);
      if (!primaryEmail) {
        throw new Error('No email found for user');
      }

      // Check if profile already exists (avoid duplicates)
      try {
        await userService.getUserProfile(superTokensUser.id);
        console.log(`ℹ️ User profile already exists for: ${superTokensUser.id}`);
        return;
      } catch (error) {
        // Profile doesn't exist, continue with creation
      }

      // Create user profile with data from SuperTokens + additional profile data
      await userService.createUserProfile({
        id: superTokensUser.id,
        email: primaryEmail,
        firstName: profileData?.firstName || '',
        lastName: profileData?.lastName || '',
        profileImage: profileData?.profileImage,
        organization: profileData?.organization
      });

      // Mark email as verified if SuperTokens says it's verified
      if (superTokensUser.emailVerified || this.isEmailVerified(superTokensUser, primaryEmail)) {
        await userService.markEmailVerified(superTokensUser.id);
      }

      console.log(`✅ User profile created successfully for: ${superTokensUser.id}`);
    } catch (error) {
      console.error(`❌ Failed to create user profile for ${superTokensUser.id}:`, error);
      // Don't throw here - we don't want to break the auth flow
      // The user can manually create their profile later if needed
    }
  }

  /**
   * Handle email verification - sync verification status with our database
   */
  async handleEmailVerification(userId: string, email: string) {
    try {
      console.log(`📧 Handling email verification for user: ${userId}, email: ${email}`);
      
      await userService.markEmailVerified(userId);
      
      console.log(`✅ Email verification synced for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to sync email verification for ${userId}:`, error);
      // Log but don't throw - verification can be handled later
    }
  }

  /**
   * Handle user signin - update activity and sync any missing profile data
   */
  async handleUserSignin(superTokensUser: SuperTokensUserData) {
    try {
      console.log(`🔐 Handling signin for user: ${superTokensUser.id}`);

      // Update last activity
      await userService.updateLastActivity(superTokensUser.id, {
        action: 'user_signin',
        metadata: {
          loginMethod: this.getLoginMethod(superTokensUser),
          timestamp: new Date().toISOString()
        }
      });

      // Check if email verification status has changed
      const primaryEmail = this.getPrimaryEmail(superTokensUser);
      if (primaryEmail && this.isEmailVerified(superTokensUser, primaryEmail)) {
        try {
          const profile = await userService.getUserProfile(superTokensUser.id);
          if (!profile.isEmailVerified) {
            await userService.markEmailVerified(superTokensUser.id);
          }
        } catch (error) {
          console.warn(`Could not sync email verification status for ${superTokensUser.id}:`, error);
        }
      }

    } catch (error) {
      console.error(`❌ Failed to handle signin for ${superTokensUser.id}:`, error);
      // Don't throw - signin should succeed even if profile sync fails
    }
  }

  /**
   * Extract primary email from SuperTokens user data
   */
  private getPrimaryEmail(superTokensUser: SuperTokensUserData): string | null {
    // Direct email property (for email/password users)
    if (superTokensUser.email) {
      return superTokensUser.email;
    }

    // Extract from login methods (for OAuth users)
    if (superTokensUser.loginMethods?.length) {
      for (const method of superTokensUser.loginMethods) {
        if (method.email) {
          return method.email;
        }
      }
    }

    return null;
  }

  /**
   * Check if email is verified in SuperTokens
   */
  private isEmailVerified(superTokensUser: SuperTokensUserData, email: string): boolean {
    // Check emailVerified property first
    if (superTokensUser.emailVerified !== undefined) {
      return superTokensUser.emailVerified;
    }

    // Check login methods for verification status
    if (superTokensUser.loginMethods?.length) {
      const emailMethod = superTokensUser.loginMethods.find(method => method.email === email);
      return emailMethod?.verified || false;
    }

    return false;
  }

  /**
   * Get login method from SuperTokens user data
   */
  private getLoginMethod(superTokensUser: SuperTokensUserData): string {
    if (superTokensUser.loginMethods?.length) {
      return superTokensUser.loginMethods[0].recipeId || 'unknown';
    }
    return 'email-password';
  }

  /**
   * Ensure user profile exists - create if missing
   * This is useful for users who signed up before profile system was implemented
   */
  async ensureUserProfile(userId: string, email: string) {
    try {
      await userService.getUserProfile(userId);
      return; // Profile exists
    } catch (error) {
      // Profile doesn't exist, create it
      console.log(`🔧 Creating missing user profile for: ${userId}`);
      
      await userService.createUserProfile({
        id: userId,
        email: email,
        firstName: '',
        lastName: ''
      });
    }
  }

  /**
   * Handle user deletion - clean up profile data
   * Called when user deletes their account through SuperTokens
   */
  async handleUserDeletion(userId: string) {
    try {
      console.log(`🗑️ Handling user deletion for: ${userId}`);
      
      await userService.deleteUserProfile(userId);
      
      console.log(`✅ User profile deleted for: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to delete user profile for ${userId}:`, error);
      // Log but don't throw - account deletion should proceed
    }
  }

  /**
   * Sync user data from SuperTokens to our database
   * Useful for manual data consistency checks
   */
  async syncUserData(superTokensUser: SuperTokensUserData) {
    try {
      const primaryEmail = this.getPrimaryEmail(superTokensUser);
      if (!primaryEmail) {
        throw new Error('No email found for user');
      }

      // Ensure profile exists
      await this.ensureUserProfile(superTokensUser.id, primaryEmail);

      // Update email verification status
      if (this.isEmailVerified(superTokensUser, primaryEmail)) {
        await userService.markEmailVerified(superTokensUser.id);
      }

      // Update activity
      await userService.updateLastActivity(superTokensUser.id, {
        action: 'data_sync',
        metadata: { timestamp: new Date().toISOString() }
      });

      console.log(`✅ User data synced for: ${superTokensUser.id}`);
    } catch (error) {
      console.error(`❌ Failed to sync user data for ${superTokensUser.id}:`, error);
      throw error;
    }
  }
}

export const authBridgeService = new AuthBridgeService();