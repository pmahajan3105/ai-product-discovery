/**
 * Route Registry - Comprehensive centralized route configuration system
 * Enhanced version of Zeda's route management with better organization and type safety
 */

import {
  METHOD_GET,
  METHOD_POST,
  METHOD_PUT,
  METHOD_DELETE,
  SCOPE_PUBLIC,
  SCOPE_AUTHENTICATED,
  SCOPE_ORGANIZATION,
  SCOPE_SYSTEM,
  RESOURCE_AUTHENTICATION,
  RESOURCE_ORGANIZATION,
  RESOURCE_FEEDBACK,
  RESOURCE_CUSTOMER,
  RESOURCE_INTEGRATION,
  RESOURCE_ANALYTICS,
  RESOURCE_API_KEY,
  RESOURCE_SYSTEM,
  RATE_LIMIT_PRESETS,
  LOG_PRESETS,
  ROUTE_CATEGORIES,
  HttpMethod,
  AccessScope,
  ResourceType
} from './routeConstants';

import {
  // Organization permissions
  VIEW_ORGANIZATION,
  UPDATE_ORGANIZATION,
  DELETE_ORGANIZATION,
  MANAGE_ORGANIZATION_SETTINGS,
  MANAGE_BILLING,

  // Member permissions
  INVITE_MEMBERS,
  VIEW_MEMBERS,
  UPDATE_MEMBERS,
  DELETE_MEMBERS,

  // Feedback permissions
  CREATE_FEEDBACK,
  VIEW_FEEDBACK,
  UPDATE_FEEDBACK,
  DELETE_FEEDBACK,
  MANAGE_FEEDBACK_SETTINGS,
  ASSIGN_FEEDBACK,
  EXPORT_FEEDBACK,

  // Customer permissions
  CREATE_CUSTOMER,
  VIEW_CUSTOMER,
  UPDATE_CUSTOMER,
  DELETE_CUSTOMER,
  MANAGE_CUSTOMER_PROFILES,
  VIEW_CUSTOMER_ANALYTICS,

  // Integration permissions
  VIEW_INTEGRATIONS,
  MANAGE_INTEGRATIONS,
  CREATE_INTEGRATION,
  UPDATE_INTEGRATION,
  DELETE_INTEGRATION,
  SYNC_INTEGRATIONS,

  // Analytics permissions
  VIEW_ANALYTICS,
  EXPORT_ANALYTICS,
  VIEW_REPORTS,
  CREATE_REPORTS,
  MANAGE_DASHBOARDS,

  // API permissions
  MANAGE_API_KEYS,
  VIEW_API_LOGS,
  MANAGE_WEBHOOKS,

  // Advanced permissions
  BULK_OPERATIONS,
  DATA_EXPORT,
  DATA_IMPORT
} from '../permissions/PermissionConfig';

// Enhanced route configuration interface
export interface RouteEndpointConfig {
  endpoint: string;
  scope: AccessScope;
  requiredPermissions: string[];
  resource?: ResourceType;
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  log?: {
    request: boolean;
    response: boolean;
    sanitize?: boolean;
  };
  description?: string;
  deprecated?: boolean;
  version?: string;
  tags?: string[];
  params?: boolean;
  public?: boolean;
}

export interface RouteModuleConfig {
  defaultScope?: AccessScope;
  requiredPermissions?: string[];
  resource?: ResourceType;
  category?: string;
  description?: string;
  [method: string]: any;
}

export interface RouteVersionConfig {
  [moduleName: string]: RouteModuleConfig;
}

export interface RouteConfig {
  [version: string]: RouteVersionConfig;
}

// Main route configuration registry
export const routeRegistry: RouteConfig = {
  v1: {
    // Health and system endpoints
    health: {
      defaultScope: SCOPE_PUBLIC,
      requiredPermissions: [],
      resource: RESOURCE_SYSTEM,
      category: ROUTE_CATEGORIES.SYSTEM_ADMINISTRATION,
      description: 'System health monitoring endpoints',
      [METHOD_GET]: [
        {
          endpoint: '/',
          scope: SCOPE_PUBLIC,
          requiredPermissions: [],
          log: LOG_PRESETS.NONE,
          description: 'Basic health check'
        },
        {
          endpoint: '/detailed',
          scope: SCOPE_SYSTEM,
          requiredPermissions: [],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Detailed system health with metrics'
        }
      ]
    },

    // Authentication endpoints
    auth: {
      defaultScope: SCOPE_PUBLIC,
      requiredPermissions: [],
      resource: RESOURCE_AUTHENTICATION,
      category: ROUTE_CATEGORIES.AUTHENTICATION,
      description: 'User authentication and session management',
      [METHOD_POST]: [
        {
          endpoint: '/login',
          scope: SCOPE_PUBLIC,
          requiredPermissions: [],
          rateLimit: RATE_LIMIT_PRESETS.MODERATE,
          log: LOG_PRESETS.SENSITIVE,
          description: 'User login via email/magic link'
        },
        {
          endpoint: '/logout',
          scope: SCOPE_AUTHENTICATED,
          requiredPermissions: [],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'User logout and session termination'
        },
        {
          endpoint: '/refresh-token',
          scope: SCOPE_PUBLIC,
          requiredPermissions: [],
          rateLimit: RATE_LIMIT_PRESETS.LENIENT,
          log: LOG_PRESETS.NONE,
          description: 'Refresh authentication token'
        },
        {
          endpoint: '/verify-email',
          scope: SCOPE_PUBLIC,
          requiredPermissions: [],
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Verify email address'
        }
      ],
      [METHOD_GET]: [
        {
          endpoint: '/me',
          scope: SCOPE_AUTHENTICATED,
          requiredPermissions: [],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get current user profile'
        },
        {
          endpoint: '/session',
          scope: SCOPE_AUTHENTICATED,
          requiredPermissions: [],
          log: LOG_PRESETS.NONE,
          description: 'Check session validity'
        }
      ]
    },

    // Organization management
    organizations: {
      defaultScope: SCOPE_ORGANIZATION,
      requiredPermissions: [VIEW_ORGANIZATION],
      resource: RESOURCE_ORGANIZATION,
      category: ROUTE_CATEGORIES.ORGANIZATION_MANAGEMENT,
      description: 'Organization and workspace management',
      [METHOD_GET]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_ORGANIZATION],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get organization details'
        },
        {
          endpoint: '/settings',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_ORGANIZATION_SETTINGS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get organization settings'
        },
        {
          endpoint: '/members',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_MEMBERS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List organization members'
        },
        {
          endpoint: '/billing',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_BILLING],
          log: LOG_PRESETS.BOTH,
          description: 'Get billing information'
        }
      ],
      [METHOD_POST]: [
        {
          endpoint: '/',
          scope: SCOPE_AUTHENTICATED,
          requiredPermissions: [],
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Create new organization'
        },
        {
          endpoint: '/members/invite',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [INVITE_MEMBERS],
          rateLimit: RATE_LIMIT_PRESETS.MODERATE,
          log: LOG_PRESETS.BOTH,
          description: 'Invite new organization member'
        }
      ],
      [METHOD_PUT]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_ORGANIZATION],
          log: LOG_PRESETS.BOTH,
          description: 'Update organization details'
        },
        {
          endpoint: '/settings',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_ORGANIZATION_SETTINGS],
          log: LOG_PRESETS.BOTH,
          description: 'Update organization settings'
        },
        {
          endpoint: '/members/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_MEMBERS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update member details'
        }
      ],
      [METHOD_DELETE]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [DELETE_ORGANIZATION],
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Delete organization'
        },
        {
          endpoint: '/members/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [DELETE_MEMBERS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Remove organization member'
        }
      ]
    },

    // Feedback management
    feedback: {
      defaultScope: SCOPE_ORGANIZATION,
      requiredPermissions: [VIEW_FEEDBACK],
      resource: RESOURCE_FEEDBACK,
      category: ROUTE_CATEGORIES.FEEDBACK_MANAGEMENT,
      description: 'Feedback creation, management, and analysis',
      [METHOD_GET]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List feedback items with pagination and filtering'
        },
        {
          endpoint: '/initialize',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get filter initialization data'
        },
        {
          endpoint: '/fields',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get available feedback fields'
        },
        {
          endpoint: '/options',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get filter options for specific field'
        },
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get specific feedback details'
        },
        {
          endpoint: '/:id/impact',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get feedback impact analysis'
        }
      ],
      [METHOD_POST]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [CREATE_FEEDBACK],
          rateLimit: RATE_LIMIT_PRESETS.LENIENT,
          log: LOG_PRESETS.BOTH,
          description: 'Create new feedback item'
        },
        {
          endpoint: '/all',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_FEEDBACK],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Advanced feedback search with complex filters'
        },
        {
          endpoint: '/export',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [EXPORT_FEEDBACK],
          rateLimit: RATE_LIMIT_PRESETS.EXPORT,
          log: LOG_PRESETS.BOTH,
          description: 'Export feedback data in various formats'
        },
        {
          endpoint: '/import',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [CREATE_FEEDBACK, DATA_IMPORT],
          rateLimit: RATE_LIMIT_PRESETS.EXPORT,
          log: LOG_PRESETS.BOTH,
          description: 'Import feedback from CSV/Excel'
        },
        {
          endpoint: '/delete',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [DELETE_FEEDBACK],
          log: LOG_PRESETS.BOTH,
          description: 'Bulk delete feedback items'
        }
      ],
      [METHOD_PUT]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_FEEDBACK],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update feedback item'
        },
        {
          endpoint: '/archive',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_FEEDBACK],
          log: LOG_PRESETS.BOTH,
          description: 'Archive feedback items'
        },
        {
          endpoint: '/unarchive',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_FEEDBACK],
          log: LOG_PRESETS.BOTH,
          description: 'Unarchive feedback items'
        },
        {
          endpoint: '/bulk-update',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_FEEDBACK, BULK_OPERATIONS],
          rateLimit: RATE_LIMIT_PRESETS.BULK,
          log: LOG_PRESETS.BOTH,
          description: 'Bulk update multiple feedback items'
        },
        {
          endpoint: '/:id/assign',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [ASSIGN_FEEDBACK],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Assign feedback to team member'
        }
      ]
    },

    // Customer management
    customers: {
      defaultScope: SCOPE_ORGANIZATION,
      requiredPermissions: [VIEW_CUSTOMER],
      resource: RESOURCE_CUSTOMER,
      category: ROUTE_CATEGORIES.CUSTOMER_MANAGEMENT,
      description: 'Customer profile and relationship management',
      [METHOD_GET]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_CUSTOMER],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List customers with pagination and search'
        },
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_CUSTOMER],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get customer profile details'
        },
        {
          endpoint: '/:id/feedback',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_CUSTOMER, VIEW_FEEDBACK],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get feedback from specific customer'
        },
        {
          endpoint: '/:id/analytics',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_CUSTOMER_ANALYTICS],
          params: true,  
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get customer analytics and insights'
        }
      ],
      [METHOD_POST]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [CREATE_CUSTOMER],
          rateLimit: RATE_LIMIT_PRESETS.MODERATE,
          log: LOG_PRESETS.BOTH,
          description: 'Create new customer profile'
        },
        {
          endpoint: '/merge',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_CUSTOMER, MANAGE_CUSTOMER_PROFILES],
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Merge duplicate customer profiles'
        }
      ],
      [METHOD_PUT]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_CUSTOMER],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update customer profile'
        },
        {
          endpoint: '/:id/profile',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_CUSTOMER_PROFILES],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update customer profile with advanced fields'
        }
      ],
      [METHOD_DELETE]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [DELETE_CUSTOMER],
          params: true,
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Delete customer profile'
        }
      ]
    },

    // Integration management
    integrations: {
      defaultScope: SCOPE_ORGANIZATION,
      requiredPermissions: [VIEW_INTEGRATIONS],
      resource: RESOURCE_INTEGRATION,
      category: ROUTE_CATEGORIES.INTEGRATION_MANAGEMENT,
      description: 'Third-party service integrations and data synchronization',
      [METHOD_GET]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_INTEGRATIONS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List all integrations with status'
        },
        {
          endpoint: '/available',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_INTEGRATIONS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List available integration types'
        },
        {
          endpoint: '/health',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_INTEGRATIONS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get integration health status'
        },
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_INTEGRATIONS],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get specific integration details'
        },
        {
          endpoint: '/:id/logs',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_INTEGRATIONS],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get integration sync logs'
        }
      ],
      [METHOD_POST]: [
        {
          endpoint: '/connect',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_INTEGRATIONS],
          rateLimit: RATE_LIMIT_PRESETS.MODERATE,
          log: LOG_PRESETS.BOTH,
          description: 'Connect new integration'
        },
        {
          endpoint: '/:id/sync',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [SYNC_INTEGRATIONS],
          params: true,
          rateLimit: RATE_LIMIT_PRESETS.BULK,
          log: LOG_PRESETS.BOTH,
          description: 'Trigger manual sync for integration'
        },
        {
          endpoint: '/:id/test',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_INTEGRATIONS],
          params: true,
          rateLimit: RATE_LIMIT_PRESETS.MODERATE,
          log: LOG_PRESETS.BOTH,
          description: 'Test integration connection'
        }
      ],
      [METHOD_PUT]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [UPDATE_INTEGRATION],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update integration settings'
        },
        {
          endpoint: '/:id/pause',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_INTEGRATIONS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Pause integration sync'
        },
        {
          endpoint: '/:id/resume',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_INTEGRATIONS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Resume integration sync'
        }
      ],
      [METHOD_DELETE]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [DELETE_INTEGRATION],
          params: true,
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Disconnect and remove integration'
        }
      ]
    },

    // Analytics and reporting
    analytics: {
      defaultScope: SCOPE_ORGANIZATION,
      requiredPermissions: [VIEW_ANALYTICS],
      resource: RESOURCE_ANALYTICS,
      category: ROUTE_CATEGORIES.ANALYTICS_REPORTING,
      description: 'Analytics, reporting, and business intelligence',
      [METHOD_GET]: [
        {
          endpoint: '/dashboard',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_ANALYTICS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get dashboard analytics overview'
        },
        {
          endpoint: '/feedback-trends',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_ANALYTICS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get feedback volume and trend analysis'
        },
        {
          endpoint: '/customer-insights',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_ANALYTICS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get customer behavior insights'
        },
        {
          endpoint: '/reports',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_REPORTS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List available reports'
        },
        {
          endpoint: '/reports/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_REPORTS],
          params: true,
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get specific report data'
        }
      ],
      [METHOD_POST]: [
        {
          endpoint: '/reports',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [CREATE_REPORTS],
          rateLimit: RATE_LIMIT_PRESETS.MODERATE,
          log: LOG_PRESETS.BOTH,
          description: 'Create custom report'
        },
        {
          endpoint: '/export',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [EXPORT_ANALYTICS],
          rateLimit: RATE_LIMIT_PRESETS.EXPORT,
          log: LOG_PRESETS.BOTH,
          description: 'Export analytics data'
        }
      ],
      [METHOD_PUT]: [
        {
          endpoint: '/dashboards/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_DASHBOARDS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update dashboard configuration'
        }
      ]
    },

    // API key management
    'api-keys': {
      defaultScope: SCOPE_ORGANIZATION,
      requiredPermissions: [MANAGE_API_KEYS],
      resource: RESOURCE_API_KEY,
      category: ROUTE_CATEGORIES.API_MANAGEMENT,
      description: 'API key creation and management',
      [METHOD_GET]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_API_KEYS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'List API keys (masked)'
        },
        {
          endpoint: '/usage',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [VIEW_API_LOGS],
          log: LOG_PRESETS.REQUEST_ONLY,
          description: 'Get API usage statistics'
        }
      ],
      [METHOD_POST]: [
        {
          endpoint: '/',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_API_KEYS],
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Create new API key'
        }
      ],
      [METHOD_PUT]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_API_KEYS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Update API key settings'
        },
        {
          endpoint: '/:id/regenerate',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_API_KEYS],
          params: true,
          rateLimit: RATE_LIMIT_PRESETS.STRICT,
          log: LOG_PRESETS.BOTH,
          description: 'Regenerate API key'
        }
      ],
      [METHOD_DELETE]: [
        {
          endpoint: '/:id',
          scope: SCOPE_ORGANIZATION,
          requiredPermissions: [MANAGE_API_KEYS],
          params: true,
          log: LOG_PRESETS.BOTH,
          description: 'Revoke API key'
        }
      ]
    }
  }
};

export default routeRegistry;