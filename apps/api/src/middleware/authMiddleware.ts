/**
 * Auth Middleware
 * Automatic user profile sync and activity tracking middleware
 * Following Zeda patterns for seamless auth/profile integration
 */

import { Request, Response, NextFunction } from 'express';
import { SessionRequest } from 'supertokens-node/framework/express';
import { authBridgeService } from '../services/authBridgeService';
import { userService } from '../services/userService';

/**
 * Middleware to ensure user profile exists and is synced
 * This runs after SuperTokens verification for all protected routes
 */
export async function ensureUserProfile(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.getUserId();
    
    if (!userId) {
      // No session, let SuperTokens handle this
      return next();
    }

    const userInfo = req.session?.getAccessTokenPayload();

    // Check if user profile exists, create if missing
    try {
      await userService.getUserProfile(userId);
    } catch (error) {
      // Profile doesn't exist, create it
      console.log(`🔧 Auto-creating missing profile for user: ${userId}`);
      
      try {
        await authBridgeService.ensureUserProfile(
          userId,
          userInfo?.email || ''
        );
      } catch (createError) {
        console.error(`❌ Failed to auto-create profile for ${userId}:`, createError);
        // Continue anyway - profile creation can be retried later
      }
    }

    next();
  } catch (error) {
    console.error('Error in ensureUserProfile middleware:', error);
    // Don't block the request, just log the error
    next();
  }
}

/**
 * Middleware to track user activity automatically
 * Updates last activity time for authenticated users
 */
export async function trackUserActivity(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.getUserId();
    
    if (!userId) {
      return next();
    }

    // Skip activity tracking for certain endpoints to avoid noise
    const skipPaths = [
      '/api/users/activity',
      '/api/auth/status',
      '/health'
    ];

    if (skipPaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Track activity asynchronously (don't block the request)
    setImmediate(async () => {
      try {
        await userService.updateLastActivity(userId, {
          action: 'api_request',
          metadata: {
            endpoint: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } catch (error) {
        console.error(`Failed to track activity for user ${userId}:`, error);
        // Fail silently - activity tracking shouldn't break requests
      }
    });

    next();
  } catch (error) {
    console.error('Error in trackUserActivity middleware:', error);
    next();
  }
}

/**
 * Middleware to add user profile information to request context
 * Makes user profile available to controllers without additional database calls
 */
export async function enrichUserContext(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.getUserId();
    
    if (!userId) {
      return next();
    }

    // Add user profile to request context
    try {
      const userProfile = await userService.getUserProfile(userId);
      
      // Add to request object for use in controllers
      (req as any).userProfile = userProfile;
      (req as any).userContext = {
        id: userProfile.id,
        email: userProfile.email,
        name: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
        isEmailVerified: userProfile.isEmailVerified,
        organizations: userProfile.organizations || []
      };
    } catch (error) {
      // Profile doesn't exist, add minimal context
      (req as any).userContext = {
        id: userId,
        email: req.session?.getAccessTokenPayload()?.email || '',
        name: '',
        isEmailVerified: false,
        organizations: []
      };
    }

    next();
  } catch (error) {
    console.error('Error in enrichUserContext middleware:', error);
    next();
  }
}

/**
 * Combined middleware that applies all auth-related enhancements
 * Use this for routes that need full auth context
 */
export function enhanceAuthContext() {
  return [
    ensureUserProfile,
    trackUserActivity,
    enrichUserContext
  ];
}

/**
 * Lightweight middleware that only ensures profile exists
 * Use this for routes that need minimal overhead
 */
export function ensureProfile() {
  return [ensureUserProfile];
}

/**
 * Middleware for admin-only routes
 * Checks if user has admin access to any organization
 */
export async function requireAdminAccess(req: SessionRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.getUserId();
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const userProfile = (req as any).userProfile || await userService.getUserProfile(userId);
    
    // Check if user is admin or owner of any organization
    const hasAdminAccess = userProfile.organizations?.some((org: any) => 
      ['owner', 'admin'].includes(org.membership?.role)
    );

    if (!hasAdminAccess) {
      return res.status(403).json({
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireAdminAccess middleware:', error);
    res.status(500).json({
      error: 'Failed to verify admin access'
    });
  }
}