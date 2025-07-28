/**
 * Auth API Service
 * Frontend service for authentication and profile management
 * Bridges SuperTokens with our user profile system
 */

import { apiClient, ApiResponse } from './apiClient';

export interface SetupProfileRequest {
  firstName?: string;
  lastName?: string;
  organization?: string;
  profileImage?: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organization?: string;
  profileImage?: string;
  isEmailVerified: boolean;
  lastActivityTime: string;
  organizations: Array<{
    id: string;
    name: string;
    uniqueName: string;
    image?: string;
    membership?: {
      role: string;
      joinedAt: string;
    };
  }>;
}

export interface ProfileStatus {
  profileExists: boolean;
  isComplete: boolean;
  needsSetup: boolean;
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
    hasOrganizations: boolean;
  } | null;
}

export interface AuthStatus {
  session: {
    sessionHandle: string;
    userId: string;
    accessTokenPayload: any;
  };
  profile: UserProfile | null;
  needsProfileSetup: boolean;
}

export class AuthApiService {
  /**
   * Setup user profile after authentication
   */
  async setupProfile(data: SetupProfileRequest): Promise<ApiResponse<UserProfile>> {
    return apiClient.post('/auth/setup-profile', data);
  }

  /**
   * Check profile setup status
   */
  async getProfileStatus(): Promise<ApiResponse<ProfileStatus>> {
    return apiClient.get('/auth/profile-status');
  }

  /**
   * Get comprehensive auth and profile status
   */
  async getAuthStatus(): Promise<ApiResponse<AuthStatus>> {
    return apiClient.get('/auth/status');
  }

  /**
   * Sync profile data from SuperTokens
   */
  async syncProfile(force: boolean = false): Promise<ApiResponse<UserProfile>> {
    return apiClient.post('/auth/sync-profile', { force });
  }

  /**
   * Complete email verification
   */
  async completeEmailVerification(): Promise<ApiResponse<UserProfile>> {
    return apiClient.post('/auth/complete-email-verification');
  }

  /**
   * Handle signout cleanup
   */
  async handleSignout(): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/signout');
  }

  /**
   * Handle account deletion cleanup
   */
  async handleAccountDeletion(): Promise<ApiResponse<void>> {
    return apiClient.delete('/auth/account');
  }
}

// Export singleton instance
export const authApi = new AuthApiService();