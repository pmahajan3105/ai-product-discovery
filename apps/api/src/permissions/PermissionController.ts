/**
 * Permission Controller - Enhanced version of Zeda's permission management
 * Handles permission checking, caching, and scope-based access control
 */

import { 
  ROLE_PERMISSION_MAPPING, 
  SCOPE_PUBLIC, 
  SCOPE_AUTHENTICATED, 
  SCOPE_ORGANIZATION,
  SCOPE_SYSTEM,
  hasAllPermissions,
  getRolePermissions,
  isHigherRole,
  ROLE_HIERARCHY
} from './PermissionConfig';
import { DatabaseManager } from '../db';
import { redisManager } from '../utils/redis';
import { logger } from '../utils/logger';

export interface UserPermissionContext {
  userId: string;
  organizationId?: string;
  scope: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  requiredPermissions?: string[];
  userPermissions?: string[];
  userRoles?: string[];
  scope?: string;
}

export interface CachedUserPermissions {
  permissions: string[];
  roles: string[];
  organizationId: string;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Permission Controller - Manages user permissions and access control
 */
export class PermissionController {
  private static readonly CACHE_PREFIX = 'feedbackhub:permissions';
  private static readonly CACHE_TTL = 15 * 60; // 15 minutes
  private static readonly CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get user permissions for a specific organization with caching
   */
  static async getUserPermissions(
    userId: string, 
    organizationId: string
  ): Promise<{ permissions: string[]; roles: string[] }> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedPermissions(userId, organizationId);
      if (cached) {
        logger.debug('Retrieved permissions from cache', { userId, organizationId });
        return {
          permissions: cached.permissions,
          roles: cached.roles
        };
      }

      // Get from database
      logger.debug('Fetching permissions from database', { userId, organizationId });
      const dbResult = await this.fetchUserPermissionsFromDB(userId, organizationId);
      
      // Cache the result
      await this.cacheUserPermissions(userId, organizationId, dbResult);
      
      return dbResult;

    } catch (error) {
      logger.error('Failed to get user permissions', error, { userId, organizationId });
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Check if user has required permissions
   */
  static async hasRequiredPermissions(
    context: UserPermissionContext,
    requiredPermissions: string[] = []
  ): Promise<PermissionCheckResult> {
    try {
      const { userId, organizationId, scope } = context;

      // Handle public scope (no authentication required)
      if (scope === SCOPE_PUBLIC) {
        return {
          granted: true,
          reason: 'Public access granted',
          scope
        };
      }

      // Handle authenticated scope (just need to be logged in)
      if (scope === SCOPE_AUTHENTICATED && requiredPermissions.length === 0) {
        return {
          granted: true,
          reason: 'Authenticated access granted',
          scope
        };
      }

      // For organization and system scopes, need specific permissions
      if (!organizationId && (scope === SCOPE_ORGANIZATION || scope === SCOPE_SYSTEM)) {
        return {
          granted: false,
          reason: 'Organization context required',
          requiredPermissions,
          scope
        };
      }

      // Get user permissions
      const userPerms = organizationId ? 
        await this.getUserPermissions(userId, organizationId) :
        { permissions: [], roles: [] };

      // Check if user has all required permissions
      const hasPermissions = hasAllPermissions(userPerms.permissions, requiredPermissions);

      logger.debug('Permission check completed', {
        userId,
        organizationId,
        scope,
        hasPermissions,
        requiredPermissions,
        userPermissions: userPerms.permissions,
        userRoles: userPerms.roles
      });

      return {
        granted: hasPermissions,
        reason: hasPermissions ? 'All required permissions granted' : 'Insufficient permissions',
        requiredPermissions,
        userPermissions: userPerms.permissions,
        userRoles: userPerms.roles,
        scope
      };

    } catch (error) {
      logger.error('Permission check failed', error, { 
        userId: context.userId, 
        organizationId: context.organizationId,
        requiredPermissions 
      });

      return {
        granted: false,
        reason: 'Permission check error',
        requiredPermissions,
        scope: context.scope
      };
    }
  }

  /**
   * Check if user can perform a specific action on a resource
   */
  static async canPerformAction(
    userId: string,
    organizationId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    try {
      // Get required permissions for the resource action
      const requiredPermissions = this.getResourceActionPermissions(resource, action);
      
      // Additional context-based checks
      const contextCheck = await this.checkResourceContext(
        userId, 
        organizationId, 
        resource, 
        action, 
        context
      );

      if (!contextCheck.granted) {
        return contextCheck;
      }

      // Check standard permissions
      return await this.hasRequiredPermissions({
        userId,
        organizationId,
        scope: SCOPE_ORGANIZATION
      }, requiredPermissions);

    } catch (error) {
      logger.error('Resource action check failed', error, {
        userId,
        organizationId,
        resource,
        action
      });

      return {
        granted: false,
        reason: 'Resource action check error'
      };
    }
  }

  /**
   * Check if user has higher role than required level
   */
  static async hasRequiredRole(
    userId: string,
    organizationId: string,
    requiredRole: string
  ): Promise<boolean> {
    try {
      const userPerms = await this.getUserPermissions(userId, organizationId);
      
      // Check if user has any role higher than or equal to required role
      return userPerms.roles.some(userRole => 
        userRole === requiredRole || isHigherRole(userRole, requiredRole)
      );

    } catch (error) {
      logger.error('Role check failed', error, { userId, organizationId, requiredRole });
      return false;
    }
  }

  /**
   * Get user's highest role in organization
   */
  static async getUserHighestRole(
    userId: string, 
    organizationId: string
  ): Promise<string | null> {
    try {
      const userPerms = await this.getUserPermissions(userId, organizationId);
      
      if (userPerms.roles.length === 0) {
        return null;
      }

      // Find the role with highest hierarchy level
      return userPerms.roles.reduce((highest, current) => {
        const currentLevel = ROLE_HIERARCHY[current] || 0;
        const highestLevel = ROLE_HIERARCHY[highest] || 0;
        return currentLevel > highestLevel ? current : highest;
      });

    } catch (error) {
      logger.error('Failed to get user highest role', error, { userId, organizationId });
      return null;
    }
  }

  /**
   * Check if user is owner of a resource
   */
  static async isResourceOwner(
    userId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    try {
      // Map resource types to their accessor methods
      switch (resourceType.toLowerCase()) {
        case 'feedback':
          const feedback = await DatabaseManager.feedback.findById(resourceId);
          return feedback?.get('createdBy') === userId;
          
        case 'customer':
          const customer = await DatabaseManager.db.models.Customer.findByPk(resourceId);
          return customer?.get('createdBy') === userId;
          
        case 'organization':
          const orgUser = await DatabaseManager.db.models.OrganizationUser.findOne({
            where: { 
              organizationId: resourceId, 
              userId, 
              role: 'org_owner',
              isActive: true 
            }
          });
          return !!orgUser;
          
        default:
          logger.warn('Unknown resource type for ownership check', { 
            resourceType, 
            resourceId, 
            userId 
          });
          return false;
      }

    } catch (error) {
      logger.error('Resource ownership check failed', error, {
        userId,
        resourceType,
        resourceId
      });
      return false;
    }
  }

  /**
   * Invalidate cached permissions for a user
   */
  static async invalidateUserPermissions(
    userId: string, 
    organizationId?: string
  ): Promise<void> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      
      if (organizationId) {
        // Invalidate specific organization permissions
        const cacheKey = `${this.CACHE_PREFIX}:${userId}:${organizationId}`;
        await redisClient.del(cacheKey);
        
        logger.debug('Invalidated user permissions for organization', { 
          userId, 
          organizationId 
        });
      } else {
        // Invalidate all permissions for user
        const pattern = `${this.CACHE_PREFIX}:${userId}:*`;
        const keys = await redisClient.keys(pattern);
        
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
        
        logger.debug('Invalidated all user permissions', { 
          userId, 
          keysInvalidated: keys.length 
        });
      }

    } catch (error) {
      logger.error('Failed to invalidate user permissions', error, { 
        userId, 
        organizationId 
      });
    }
  }

  /**
   * Get all users with a specific permission in an organization
   */
  static async getUsersWithPermission(
    organizationId: string,
    permission: string
  ): Promise<string[]> {
    try {
      // Get all active users in the organization
      const orgUsers = await DatabaseManager.db.models.OrganizationUser.findAll({
        where: { 
          organizationId, 
          isActive: true 
        },
        attributes: ['userId', 'role']
      });

      const usersWithPermission: string[] = [];

      for (const orgUser of orgUsers) {
        const userId = orgUser.get('userId') as string;
        const userRole = orgUser.get('role') as string;
        
        // Check if user's role has the required permission
        const rolePermissions = getRolePermissions(userRole);
        if (rolePermissions.includes(permission)) {
          usersWithPermission.push(userId);
        }
      }

      logger.debug('Found users with permission', {
        organizationId,
        permission,
        userCount: usersWithPermission.length
      });

      return usersWithPermission;

    } catch (error) {
      logger.error('Failed to get users with permission', error, {
        organizationId,
        permission
      });
      return [];
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Fetch user permissions from database
   */
  private static async fetchUserPermissionsFromDB(
    userId: string, 
    organizationId: string
  ): Promise<{ permissions: string[]; roles: string[] }> {
    try {
      // Get user's roles in the organization
      const orgUser = await DatabaseManager.db.models.OrganizationUser.findOne({
        where: { 
          userId, 
          organizationId, 
          isActive: true 
        }
      });

      if (!orgUser) {
        logger.debug('User not found in organization', { userId, organizationId });
        return { permissions: [], roles: [] };
      }

      const userRole = orgUser.get('role') as string;
      const permissions = getRolePermissions(userRole);

      logger.debug('Fetched user permissions from database', {
        userId,
        organizationId,
        role: userRole,
        permissionCount: permissions.length
      });

      return {
        permissions,
        roles: [userRole]
      };

    } catch (error) {
      logger.error('Failed to fetch user permissions from database', error, {
        userId,
        organizationId
      });
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Get cached user permissions
   */
  private static async getCachedPermissions(
    userId: string, 
    organizationId: string
  ): Promise<CachedUserPermissions | null> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const cacheKey = `${this.CACHE_PREFIX}:${userId}:${organizationId}`;
      
      const cached = await redisClient.get(cacheKey);
      if (!cached) {
        return null;
      }

      const parsedCache: CachedUserPermissions = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > parsedCache.expiresAt) {
        await redisClient.del(cacheKey);
        return null;
      }

      return parsedCache;

    } catch (error) {
      logger.error('Failed to get cached permissions', error, { userId, organizationId });
      return null;
    }
  }

  /**
   * Cache user permissions
   */
  private static async cacheUserPermissions(
    userId: string,
    organizationId: string,
    permissions: { permissions: string[]; roles: string[] }
  ): Promise<void> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const cacheKey = `${this.CACHE_PREFIX}:${userId}:${organizationId}`;
      
      const cacheData: CachedUserPermissions = {
        permissions: permissions.permissions,
        roles: permissions.roles,
        organizationId,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (this.CACHE_TTL * 1000)
      };

      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(cacheData));
      
      logger.debug('Cached user permissions', { 
        userId, 
        organizationId,
        ttl: this.CACHE_TTL 
      });

    } catch (error) {
      logger.error('Failed to cache user permissions', error, { userId, organizationId });
    }
  }

  /**
   * Get required permissions for a resource action
   */
  private static getResourceActionPermissions(
    resource: string, 
    action: string
  ): string[] {
    // This would be expanded based on RESOURCE_PERMISSIONS from config
    // For now, using a simple mapping
    const resourceActionMap: Record<string, Record<string, string[]>> = {
      feedback: {
        create: ['create-feedback'],
        read: ['view-feedback'],
        update: ['update-feedback'],
        delete: ['delete-feedback'],
        assign: ['assign-feedback']
      },
      customer: {
        create: ['create-customer'],
        read: ['view-customer'],
        update: ['update-customer'],
        delete: ['delete-customer']
      },
      organization: {
        read: ['view-organization'],
        update: ['update-organization'],
        delete: ['delete-organization'],
        settings: ['manage-organization-settings']
      }
    };

    const resourcePerms = resourceActionMap[resource.toLowerCase()];
    return resourcePerms ? (resourcePerms[action.toLowerCase()] || []) : [];
  }

  /**
   * Check resource-specific context requirements
   */
  private static async checkResourceContext(
    userId: string,
    organizationId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    try {
      // For update/delete actions, check if user owns the resource
      if (['update', 'delete'].includes(action.toLowerCase()) && context?.resourceId) {
        const isOwner = await this.isResourceOwner(userId, resource, context.resourceId);
        
        if (isOwner) {
          return {
            granted: true,
            reason: 'Resource owner access granted'
          };
        }
      }

      // Additional context checks can be added here
      // For example, checking if feedback is assigned to user, etc.

      return {
        granted: true,
        reason: 'Context check passed'
      };

    } catch (error) {
      logger.error('Resource context check failed', error, {
        userId,
        organizationId,
        resource,
        action
      });

      return {
        granted: false,
        reason: 'Resource context check error'
      };
    }
  }

  /**
   * Initialize cleanup interval for expired cache entries
   */
  static initializeCacheCleanup(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredCache();
      } catch (error) {
        logger.error('Cache cleanup failed', error);
      }
    }, this.CACHE_CLEANUP_INTERVAL);

    logger.info('Permission cache cleanup initialized', {
      interval: this.CACHE_CLEANUP_INTERVAL
    });
  }

  /**
   * Clean up expired cache entries
   */
  private static async cleanupExpiredCache(): Promise<void> {
    try {
      const redisClient = await redisManager.getCacheConnection();
      const pattern = `${this.CACHE_PREFIX}:*`;
      const keys = await redisClient.keys(pattern);

      let cleanedCount = 0;
      
      for (const key of keys) {
        const cached = await redisClient.get(key);
        if (cached) {
          const parsedCache: CachedUserPermissions = JSON.parse(cached);
          if (Date.now() > parsedCache.expiresAt) {
            await redisClient.del(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        logger.debug('Cleaned up expired permission cache entries', {
          cleanedCount,
          totalKeys: keys.length
        });
      }

    } catch (error) {
      logger.error('Failed to cleanup expired cache', error);
    }
  }
}

// Initialize cache cleanup when module loads
PermissionController.initializeCacheCleanup();

export default PermissionController;