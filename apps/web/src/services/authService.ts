/**
 * Authentication Service - Centralized auth operations
 * Provides clean interface for SuperTokens authentication
 */

import Session from 'supertokens-web-js/recipe/session';
import ThirdParty from 'supertokens-web-js/recipe/thirdparty';
import Passwordless from 'supertokens-web-js/recipe/passwordless';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  organizationId?: string;
}

export interface SignInWithEmailParams {
  email: string;
}

export interface AuthServiceError {
  type: 'INVALID_EMAIL' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
}

export class AuthService {
  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      return await Session.doesSessionExist();
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const sessionExists = await Session.doesSessionExist();
      
      if (!sessionExists) {
        return null;
      }

      const userId = await Session.getUserId();
      const payload = await Session.getAccessTokenPayload();
      
      return {
        id: userId,
        email: payload.email || payload.phoneNumber || '',
        name: payload.name || payload.email || payload.phoneNumber || '',
        emailVerified: payload.emailVerified || false,
        organizationId: payload.organizationId
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Sign in with magic link
   */
  static async signInWithEmail(params: SignInWithEmailParams): Promise<{
    success: boolean;
    error?: AuthServiceError;
  }> {
    try {
      const response = await Passwordless.createCode({
        email: params.email
      });

      if (response.status === 'OK') {
        return { success: true };
      } else if (response.status === 'SIGN_IN_UP_NOT_ALLOWED') {
        return {
          success: false,
          error: {
            type: 'INVALID_EMAIL',
            message: 'Sign in not allowed for this email address'
          }
        };
      } else {
        return {
          success: false,
          error: {
            type: 'UNKNOWN_ERROR',
            message: 'Failed to send magic link'
          }
        };
      }
    } catch (error) {
      console.error('Error signing in with email:', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network error occurred. Please try again.'
        }
      };
    }
  }

  /**
   * Verify magic link code
   */
  static async verifyMagicLink(linkCode: string): Promise<{
    success: boolean;
    user?: AuthUser;
    error?: AuthServiceError;
  }> {
    try {
      const response = await Passwordless.consumeCode({
        userInputCode: linkCode
      });

      if (response.status === 'OK') {
        const user = await this.getCurrentUser();
        return { 
          success: true, 
          user: user || undefined 
        };
      } else if (response.status === 'INCORRECT_USER_INPUT_CODE_ERROR') {
        return {
          success: false,
          error: {
            type: 'INVALID_EMAIL',
            message: 'Invalid or expired magic link'
          }
        };
      } else {
        return {
          success: false,
          error: {
            type: 'UNKNOWN_ERROR',
            message: 'Failed to verify magic link'
          }
        };
      }
    } catch (error) {
      console.error('Error verifying magic link:', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network error occurred. Please try again.'
        }
      };
    }
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<void> {
    try {
      const authUrl = await ThirdParty.getAuthorisationURLWithQueryParamsAndSetState({
        thirdPartyId: "google",
        frontendRedirectURI: `${window.location.origin}/auth/callback/google`
      });
      
      window.location.assign(authUrl);
    } catch (error) {
      console.error('Error initiating Google sign in:', error);
      throw new Error('Failed to initiate Google sign in');
    }
  }

  /**
   * Handle OAuth callback
   */
  static async handleOAuthCallback(): Promise<{
    success: boolean;
    user?: AuthUser;
    error?: AuthServiceError;
  }> {
    try {
      const response = await ThirdParty.signInAndUp();

      if (response.status === 'OK') {
        const user = await this.getCurrentUser();
        return { 
          success: true, 
          user: user || undefined 
        };
      } else if (response.status === 'SIGN_IN_UP_NOT_ALLOWED') {
        return {
          success: false,
          error: {
            type: 'INVALID_EMAIL',
            message: 'Sign in not allowed for this account'
          }
        };
      } else {
        return {
          success: false,
          error: {
            type: 'UNKNOWN_ERROR',
            message: 'OAuth authentication failed'
          }
        };
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      return {
        success: false,
        error: {
          type: 'NETWORK_ERROR',
          message: 'Network error occurred during authentication'
        }
      };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<void> {
    try {
      await Session.signOut();
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force redirect even if sign out fails
      window.location.href = '/';
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession(): Promise<boolean> {
    try {
      return await Session.attemptRefreshingSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }

  /**
   * Get session access token for API calls
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      const sessionExists = await Session.doesSessionExist();
      if (!sessionExists) {
        return null;
      }
      
      const payload = await Session.getAccessTokenPayload();
      return payload.accessToken || null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }
}

export default AuthService;