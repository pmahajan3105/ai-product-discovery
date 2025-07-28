/**
 * Route Configuration Middleware - Enhanced version of Zeda's route metadata system
 * Handles centralized route configuration with permission mappings
 */

import { Request, Response, NextFunction } from 'express';
import { routeRegistry, RouteEndpointConfig, RouteModuleConfig } from '../config/routeRegistry';
import { 
  SCOPE_PUBLIC, 
  SCOPE_AUTHENTICATED, 
  SCOPE_ORGANIZATION, 
  SCOPE_SYSTEM,
  HttpMethod,
  AccessScope,
  LOG_PRESETS
} from '../config/routeConstants';
import { logger } from '../utils/logger';

// Extend Express Request interface for route details
declare global {
  namespace Express {
    interface Request {
      routeDetails?: {
        scope: AccessScope;
        requiredPermissions: string[];
        resources: string[];
        log: {
          request: boolean;
          response: boolean;
          sanitize?: boolean;
        };
        rateLimit?: {
          windowMs: number;
          maxRequests: number;
        };
        description?: string;
        category?: string;
        deprecated?: boolean;
        tags?: string[];
      };
    }
  }
}

/**
 * Enhanced route field extraction using the comprehensive route registry
 */
function getRouteConfiguration(
  apiVersion: string,
  moduleName: string,
  method: string,
  endpoint?: string
): {
  scope?: AccessScope;
  permissions?: string[];
  log?: any;
  resource?: string | string[];
  rateLimit?: any;
  description?: string;
  category?: string;
  deprecated?: boolean;
  tags?: string[];
} {
  const moduleConfig = routeRegistry[apiVersion]?.[moduleName];
  if (!moduleConfig) {
    return {};
  }

  // Check for method-specific configuration
  const methodConfig = moduleConfig[method];
  if (Array.isArray(methodConfig)) {
    for (const endpointConfig of methodConfig) {
      // Handle root endpoint
      if (!endpoint && endpointConfig.endpoint === '/') {
        return {
          scope: endpointConfig.scope,
          permissions: endpointConfig.requiredPermissions,
          log: endpointConfig.log,
          resource: endpointConfig.resource,
          rateLimit: endpointConfig.rateLimit,
          description: endpointConfig.description,
          category: moduleConfig.category,
          deprecated: endpointConfig.deprecated,
          tags: endpointConfig.tags
        };
      }
      
      // Handle specific endpoints
      if (endpoint && endpointConfig.endpoint) {
        // Exact match
        if (endpointConfig.endpoint === `/${endpoint}`) {
          return {
            scope: endpointConfig.scope,
            permissions: endpointConfig.requiredPermissions,
            log: endpointConfig.log,
            resource: endpointConfig.resource,
            rateLimit: endpointConfig.rateLimit,
            description: endpointConfig.description,
            category: moduleConfig.category,
            deprecated: endpointConfig.deprecated,
            tags: endpointConfig.tags
          };
        }
        
        // Pattern match (contains endpoint)
        if (endpointConfig.endpoint.includes(endpoint)) {
          return {
            scope: endpointConfig.scope,
            permissions: endpointConfig.requiredPermissions,
            log: endpointConfig.log,
            resource: endpointConfig.resource,
            rateLimit: endpointConfig.rateLimit,
            description: endpointConfig.description,
            category: moduleConfig.category,
            deprecated: endpointConfig.deprecated,
            tags: endpointConfig.tags
          };
        }
      }
      
      // Handle parameterized routes
      if (endpointConfig.params && endpoint) {
        return {
          scope: endpointConfig.scope,
          permissions: endpointConfig.requiredPermissions,
          log: endpointConfig.log,
          resource: endpointConfig.resource,
          rateLimit: endpointConfig.rateLimit,
          description: endpointConfig.description,
          category: moduleConfig.category,
          deprecated: endpointConfig.deprecated,
          tags: endpointConfig.tags
        };
      }
    }
  }

  // Fallback to default configuration
  return {
    scope: moduleConfig.defaultScope,
    permissions: moduleConfig.requiredPermissions,
    resource: moduleConfig.resource,
    category: moduleConfig.category,
    description: moduleConfig.description
  };
}

/**
 * Main route configuration middleware
 */
export const getRouteFields = (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    // Handle health checks
    if (req.path === '/health' || req.path === '/api/health') {
      req.routeDetails = {
        scope: SCOPE_PUBLIC,
        requiredPermissions: [],
        resources: ['system'],
        log: LOG_PRESETS.NONE,
        description: 'System health check',
        category: 'System Administration'
      };
      return next();
    }

    const url = req.originalUrl;
    const method = req.method as HttpMethod;
    
    // Parse URL segments: /api/v1/module/endpoint
    const urlSegments = url.split('/').filter(segment => segment && !segment.startsWith('?'));
    
    if (urlSegments.length < 2) {
      logger.warn('Invalid route structure - insufficient segments', { 
        url, 
        method, 
        segments: urlSegments 
      });
      
      req.routeDetails = {
        scope: SCOPE_AUTHENTICATED,
        requiredPermissions: [],
        resources: [],
        log: LOG_PRESETS.REQUEST_ONLY,
        description: 'Unknown route'
      };
      return next();
    }

    // Extract route components
    let apiPrefix, apiVersion, moduleName, endpoint;
    
    if (urlSegments[0] === 'api') {
      // Format: /api/module/endpoint or /api/v1/module/endpoint
      if (urlSegments[1].startsWith('v')) {
        // Versioned API: /api/v1/module/endpoint
        apiPrefix = urlSegments[0];
        apiVersion = urlSegments[1];
        moduleName = urlSegments[2];
        endpoint = urlSegments[3];
      } else {
        // Non-versioned API: /api/module/endpoint (default to v1)
        apiPrefix = urlSegments[0];
        apiVersion = 'v1';
        moduleName = urlSegments[1];
        endpoint = urlSegments[2];
      }
    } else {
      // Direct module access: /module/endpoint (default to v1)
      apiVersion = 'v1';
      moduleName = urlSegments[0];
      endpoint = urlSegments[1];
    }

    if (!moduleName) {
      logger.warn('No module name found in route', { url, method, segments: urlSegments });
      
      req.routeDetails = {
        scope: SCOPE_AUTHENTICATED,
        requiredPermissions: [],
        resources: [],
        log: LOG_PRESETS.REQUEST_ONLY,
        description: 'Invalid route structure'
      };
      return next();
    }

    // Get route configuration
    const routeConfig = getRouteConfiguration(apiVersion, moduleName, method, endpoint);
    
    // Set default values
    const scope = routeConfig.scope || SCOPE_AUTHENTICATED;
    const requiredPermissions = routeConfig.permissions || [];
    const resources = routeConfig.resource ? 
      (typeof routeConfig.resource === 'string' ? [routeConfig.resource] : routeConfig.resource) : 
      [moduleName];
    const logConfig = routeConfig.log || LOG_PRESETS.REQUEST_ONLY;
    
    // Build route details
    req.routeDetails = {
      scope,
      requiredPermissions,
      resources,
      log: logConfig,
      rateLimit: routeConfig.rateLimit,
      description: routeConfig.description || `${method} ${moduleName}${endpoint ? `/${endpoint}` : ''}`,
      category: routeConfig.category,
      deprecated: routeConfig.deprecated,
      tags: routeConfig.tags
    };

    const processingTime = Date.now() - startTime;
    
    logger.debug('Route configuration applied', {
      url,
      method,
      apiVersion,
      moduleName,
      endpoint,
      scope: req.routeDetails.scope,
      permissions: req.routeDetails.requiredPermissions,
      resources: req.routeDetails.resources,
      category: req.routeDetails.category,
      processingTimeMs: processingTime
    });

    // Log deprecated route usage
    if (req.routeDetails.deprecated) {
      logger.warn('Deprecated route accessed', {
        url,
        method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        deprecatedRoute: `${method} ${url}`
      });
    }

    next();

  } catch (error) {
    logger.error('Route configuration middleware error', error, {
      url: req.originalUrl,
      method: req.method
    });

    // Provide safe defaults on error
    req.routeDetails = {
      scope: SCOPE_AUTHENTICATED,
      requiredPermissions: [],
      resources: [],
      log: LOG_PRESETS.REQUEST_ONLY,
      description: 'Route configuration error'
    };

    next();
  }
};

/**
 * Middleware to manually configure route metadata (for edge cases)
 */
export function configureRoute(
  scope: AccessScope,
  permissions: string[] = [],
  options: {
    resource?: string | string[];
    rateLimit?: { windowMs: number; maxRequests: number };
    log?: { request: boolean; response: boolean; sanitize?: boolean };
    description?: string;
    category?: string;
    deprecated?: boolean;
    tags?: string[];
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.routeDetails = {
      scope,
      requiredPermissions: permissions,
      resources: options.resource ? 
        (typeof options.resource === 'string' ? [options.resource] : options.resource) : 
        [],
      log: options.log || LOG_PRESETS.REQUEST_ONLY,
      rateLimit: options.rateLimit,
      description: options.description,
      category: options.category,
      deprecated: options.deprecated,
      tags: options.tags
    };

    next();
  };
}

/**
 * Utility to get all registered routes for documentation
 */
export function getRegisteredRoutes(): any[] {
  const routes: any[] = [];
  
  Object.keys(routeRegistry).forEach(version => {
    Object.keys(routeRegistry[version]).forEach(module => {
      const moduleConfig = routeRegistry[version][module];
      
      Object.keys(moduleConfig).forEach(method => {
        if (Array.isArray(moduleConfig[method])) {
          moduleConfig[method].forEach((endpointConfig: RouteEndpointConfig) => {
            routes.push({
              version,
              module,
              method,
              endpoint: endpointConfig.endpoint,
              scope: endpointConfig.scope,
              permissions: endpointConfig.requiredPermissions,
              resource: endpointConfig.resource,
              description: endpointConfig.description,
              category: moduleConfig.category,
              deprecated: endpointConfig.deprecated,
              tags: endpointConfig.tags
            });
          });
        }
      });
    });
  });
  
  return routes;
}

/**
 * Utility to validate route registry configuration
 */
export function validateRouteRegistry(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    Object.keys(routeRegistry).forEach(version => {
      Object.keys(routeRegistry[version]).forEach(module => {
        const moduleConfig = routeRegistry[version][module];
        
        // Validate module configuration
        if (!moduleConfig.resource && !moduleConfig.defaultScope) {
          errors.push(`Module ${version}/${module} missing resource and defaultScope`);
        }
        
        // Validate method configurations
        Object.keys(moduleConfig).forEach(method => {
          if (Array.isArray(moduleConfig[method])) {
            moduleConfig[method].forEach((endpointConfig: RouteEndpointConfig, index: number) => {
              if (!endpointConfig.endpoint) {
                errors.push(`${version}/${module}/${method}[${index}] missing endpoint`);
              }
              if (!endpointConfig.scope) {
                errors.push(`${version}/${module}/${method}[${index}] missing scope`);
              }
              if (!Array.isArray(endpointConfig.requiredPermissions)) {
                errors.push(`${version}/${module}/${method}[${index}] invalid requiredPermissions`);
              }
            });
          }
        });
      });
    });
  } catch (error) {
    errors.push(`Registry validation error: ${error}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  getRouteFields,
  configureRoute,
  getRegisteredRoutes,
  validateRouteRegistry,
  routeRegistry
};