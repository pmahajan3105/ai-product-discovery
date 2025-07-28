/**
 * Authorization Middleware - Enhanced version of Zeda's permission enforcement
 * Handles route-level permission checking with scope-based access control
 */

import { Request, Response, NextFunction } from 'express';
import { PermissionController, UserPermissionContext } from '../permissions/PermissionController';
import { 
  SCOPE_PUBLIC, 
  SCOPE_AUTHENTICATED, 
  SCOPE_ORGANIZATION, 
  SCOPE_SYSTEM 
} from '../permissions/PermissionConfig';
import { ResponseBuilder } from '../utils/ResponseBuilder';
import { logger } from '../utils/logger';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user_id?: string;
      workspace_id?: string;
      organization_id?: string;
      userData?: any;
      routeDetails?: {
        scope: string;
        requiredPermissions: string[];
        resources?: string[];
        log?: {
          request: boolean;
          response: boolean;
        };
      };
      permissionContext?: UserPermissionContext;
    }
  }
}

export interface AuthorizationOptions {
  scope?: string;
  permissions?: string[];
  resource?: string;
  action?: string;
  allowOwnership?: boolean;
  skipForPublic?: boolean;
}

/**
 * Main authorization middleware factory
 */
export function authorize(options: AuthorizationOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startTime = Date.now();
      
      // Get route details (set by route configuration middleware)
      const routeDetails = req.routeDetails;
      const scope = options.scope || routeDetails?.scope || SCOPE_AUTHENTICATED;
      const requiredPermissions = options.permissions || routeDetails?.requiredPermissions || [];

      // Handle public routes
      if (scope === SCOPE_PUBLIC || (options.skipForPublic && !req.user_id)) {
        logger.debug('Public route access granted', { 
          path: req.path, 
          method: req.method,
          scope 
        });
        return next();
      }

      // Check if user is authenticated
      if (!req.user_id) {
        logger.warn('Unauthenticated access attempt', { 
          path: req.path, 
          method: req.method,
          ip: req.ip 
        });
        
        return ResponseBuilder.unauthorized(res, 'Authentication required');
      }

      // Build permission context
      const permissionContext: UserPermissionContext = {
        userId: req.user_id,
        organizationId: req.organization_id || req.workspace_id,
        scope,
        metadata: {
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      };

      // Store context for later use
      req.permissionContext = permissionContext;

      // Perform permission check
      const permissionResult = await PermissionController.hasRequiredPermissions(
        permissionContext,
        requiredPermissions
      );

      // Handle permission check failure
      if (!permissionResult.granted) {
        logger.warn('Permission check failed', {
          userId: req.user_id,
          organizationId: permissionContext.organizationId,
          scope,
          requiredPermissions,
          userPermissions: permissionResult.userPermissions,
          reason: permissionResult.reason,
          path: req.path,
          method: req.method
        });

        return ResponseBuilder.forbidden(res, permissionResult.reason || 'Insufficient permissions', {
          requiredPermissions,
          userPermissions: permissionResult.userPermissions,
          scope
        });
      }

      // Handle resource-specific authorization
      if (options.resource && options.action) {
        const resourceResult = await PermissionController.canPerformAction(
          req.user_id,
          permissionContext.organizationId!,
          options.resource,
          options.action,
          {
            resourceId: req.params.id,
            allowOwnership: options.allowOwnership
          }
        );

        if (!resourceResult.granted) {
          logger.warn('Resource action check failed', {
            userId: req.user_id,
            organizationId: permissionContext.organizationId,
            resource: options.resource,
            action: options.action,
            resourceId: req.params.id,
            reason: resourceResult.reason
          });

          return ResponseBuilder.forbidden(res, resourceResult.reason || 'Resource access denied');
        }
      }

      // Log successful authorization
      const duration = Date.now() - startTime;
      logger.debug('Authorization successful', {
        userId: req.user_id,
        organizationId: permissionContext.organizationId,
        scope,
        requiredPermissions,
        userPermissions: permissionResult.userPermissions,
        path: req.path,
        method: req.method,
        duration
      });

      next();

    } catch (error) {
      logger.error('Authorization middleware error', error, {
        userId: req.user_id,
        organizationId: req.organization_id || req.workspace_id,
        path: req.path,
        method: req.method
      });

      return ResponseBuilder.internalServerError(res, 'Authorization check failed');
    }
  };
}

/**
 * Middleware to check specific permissions
 */
export function requirePermissions(...permissions: string[]) {
  return authorize({ permissions });
}

/**
 * Middleware to check organization scope access
 */
export function requireOrganizationAccess(permissions: string[] = []) {
  return authorize({ 
    scope: SCOPE_ORGANIZATION, 
    permissions 
  });
}

/**
 * Middleware to check system admin access
 */
export function requireSystemAccess(permissions: string[] = []) {
  return authorize({ 
    scope: SCOPE_SYSTEM, 
    permissions 
  });
}

/**
 * Middleware for resource ownership check
 */
export function requireResourceOwnership(resource: string, action: string = 'update') {
  return authorize({ 
    resource, 
    action, 
    allowOwnership: true 
  });
}

/**
 * Higher-order middleware for role-based access
 */
export function requireRole(requiredRole: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user_id || !req.organization_id) {
        return ResponseBuilder.unauthorized(res, 'Authentication required');
      }

      const hasRole = await PermissionController.hasRequiredRole(
        req.user_id,
        req.organization_id,
        requiredRole
      );

      if (!hasRole) {
        logger.warn('Role check failed', {
          userId: req.user_id,
          organizationId: req.organization_id,
          requiredRole,
          path: req.path
        });

        return ResponseBuilder.forbidden(res, `Role '${requiredRole}' required`);
      }

      next();

    } catch (error) {
      logger.error('Role check middleware error', error, {
        userId: req.user_id,
        organizationId: req.organization_id,
        requiredRole
      });

      return ResponseBuilder.internalServerError(res, 'Role check failed');
    }
  };
}

/**
 * Middleware to attach user's highest role to request
 */
export function attachUserRole() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user_id && req.organization_id) {
        const highestRole = await PermissionController.getUserHighestRole(
          req.user_id,
          req.organization_id
        );

        if (highestRole) {
          req.userData = req.userData || {};
          req.userData.highestRole = highestRole;
        }
      }

      next();

    } catch (error) {
      logger.error('Attach user role middleware error', error, {
        userId: req.user_id,
        organizationId: req.organization_id
      });
      
      // Don't fail the request, just continue without role info
      next();
    }
  };
}

/**
 * Middleware to validate organization context
 */
export function validateOrganizationContext() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract organization ID from various sources
    const organizationId = req.organization_id || 
                          req.workspace_id || 
                          req.params.organizationId || 
                          req.params.workspaceId ||
                          req.body.organizationId ||
                          req.body.workspaceId;

    if (!organizationId) {
      logger.warn('Missing organization context', {
        userId: req.user_id,
        path: req.path,
        method: req.method
      });

      return ResponseBuilder.badRequest(res, 'Organization context required');
    }

    // Normalize the organization ID field
    req.organization_id = organizationId;
    req.workspace_id = organizationId; // For backward compatibility

    next();
  };
}

/**
 * Permission check utility for use in controllers
 */
export async function checkPermission(
  req: Request,
  permissions: string[]
): Promise<{ granted: boolean; reason?: string }> {
  try {
    if (!req.user_id) {
      return { granted: false, reason: 'User not authenticated' };
    }

    const context: UserPermissionContext = {
      userId: req.user_id,
      organizationId: req.organization_id || req.workspace_id,
      scope: SCOPE_ORGANIZATION
    };

    const result = await PermissionController.hasRequiredPermissions(context, permissions);
    
    return {
      granted: result.granted,
      reason: result.reason
    };

  } catch (error) {
    logger.error('Permission check utility error', error, {
      userId: req.user_id,
      permissions
    });

    return { granted: false, reason: 'Permission check failed' };
  }
}

// Export individual middleware functions
export default {
  authorize,
  requirePermissions,
  requireOrganizationAccess,
  requireSystemAccess,
  requireResourceOwnership,
  requireRole,
  attachUserRole,
  validateOrganizationContext,
  checkPermission
};