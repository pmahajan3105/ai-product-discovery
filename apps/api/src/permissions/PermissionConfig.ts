/**
 * Permission Configuration - Enhanced version of Zeda's permission system
 * Defines all permissions, roles, and scope-based access control for FeedbackHub
 */

// ===== PERMISSION CONSTANTS =====

// Organization-level permissions
export const VIEW_ORGANIZATION = 'view-organization';
export const UPDATE_ORGANIZATION = 'update-organization';
export const DELETE_ORGANIZATION = 'delete-organization';
export const MANAGE_ORGANIZATION_SETTINGS = 'manage-organization-settings';
export const MANAGE_BILLING = 'manage-billing';

// Member management permissions
export const INVITE_MEMBERS = 'invite-members';
export const UPDATE_MEMBERS = 'update-members';
export const DELETE_MEMBERS = 'delete-members';
export const VIEW_MEMBERS = 'view-members';

// Feedback management permissions
export const CREATE_FEEDBACK = 'create-feedback';
export const VIEW_FEEDBACK = 'view-feedback';
export const UPDATE_FEEDBACK = 'update-feedback';
export const DELETE_FEEDBACK = 'delete-feedback';
export const MANAGE_FEEDBACK_SETTINGS = 'manage-feedback-settings';
export const ASSIGN_FEEDBACK = 'assign-feedback';
export const EXPORT_FEEDBACK = 'export-feedback';

// Customer management permissions
export const CREATE_CUSTOMER = 'create-customer';
export const VIEW_CUSTOMER = 'view-customer';
export const UPDATE_CUSTOMER = 'update-customer';
export const DELETE_CUSTOMER = 'delete-customer';
export const MANAGE_CUSTOMER_PROFILES = 'manage-customer-profiles';
export const VIEW_CUSTOMER_ANALYTICS = 'view-customer-analytics';

// Integration permissions
export const VIEW_INTEGRATIONS = 'view-integrations';
export const MANAGE_INTEGRATIONS = 'manage-integrations';
export const CREATE_INTEGRATION = 'create-integration';
export const UPDATE_INTEGRATION = 'update-integration';
export const DELETE_INTEGRATION = 'delete-integration';
export const SYNC_INTEGRATIONS = 'sync-integrations';

// Custom fields permissions
export const CREATE_CUSTOM_FIELD = 'create-custom-field';
export const VIEW_CUSTOM_FIELD = 'view-custom-field';
export const UPDATE_CUSTOM_FIELD = 'update-custom-field';
export const DELETE_CUSTOM_FIELD = 'delete-custom-field';
export const MANAGE_CUSTOM_FIELD_CONFIG = 'manage-custom-field-config';

// Analytics and reporting permissions
export const VIEW_ANALYTICS = 'view-analytics';
export const EXPORT_ANALYTICS = 'export-analytics';
export const VIEW_REPORTS = 'view-reports';
export const CREATE_REPORTS = 'create-reports';
export const MANAGE_DASHBOARDS = 'manage-dashboards';

// API and webhook permissions
export const MANAGE_API_KEYS = 'manage-api-keys';
export const VIEW_API_LOGS = 'view-api-logs';
export const MANAGE_WEBHOOKS = 'manage-webhooks';
export const CONFIGURE_PUBLIC_API = 'configure-public-api';

// Advanced permissions
export const MANAGE_AUTOMATION = 'manage-automation';
export const BULK_OPERATIONS = 'bulk-operations';
export const DATA_EXPORT = 'data-export';
export const DATA_IMPORT = 'data-import';
export const SYSTEM_ADMIN = 'system-admin';

// ===== ROLE CONSTANTS =====

// Organization roles (hierarchical)
export const ORG_OWNER = 'org_owner';           // Full access, including billing and deletion
export const ORG_ADMIN = 'org_admin';           // Full access except billing and deletion  
export const ORG_MANAGER = 'org_manager';       // Manage feedback, customers, integrations
export const ORG_MEMBER = 'org_member';         // Basic access - view and create feedback
export const ORG_VIEWER = 'org_viewer';         // Read-only access

// Special roles
export const EXTERNAL_USER = 'external_user';   // Limited external access (for customer portals)
export const API_USER = 'api_user';             // API-only access

// ===== SCOPE CONSTANTS =====

export const SCOPE_PUBLIC = 'public';           // No authentication required
export const SCOPE_AUTHENTICATED = 'authenticated'; // Basic authentication required
export const SCOPE_ORGANIZATION = 'organization';   // Organization-specific permissions required
export const SCOPE_SYSTEM = 'system';           // System-level permissions required

// ===== ROLE-PERMISSION MAPPINGS =====

export const ROLE_PERMISSION_MAPPING = {
  [ORG_OWNER]: [
    // Full organization control
    VIEW_ORGANIZATION,
    UPDATE_ORGANIZATION,
    DELETE_ORGANIZATION,
    MANAGE_ORGANIZATION_SETTINGS,
    MANAGE_BILLING,

    // Full member management
    INVITE_MEMBERS,
    UPDATE_MEMBERS,
    DELETE_MEMBERS,
    VIEW_MEMBERS,

    // Full feedback management
    CREATE_FEEDBACK,
    VIEW_FEEDBACK,
    UPDATE_FEEDBACK,
    DELETE_FEEDBACK,
    MANAGE_FEEDBACK_SETTINGS,
    ASSIGN_FEEDBACK,
    EXPORT_FEEDBACK,

    // Full customer management
    CREATE_CUSTOMER,
    VIEW_CUSTOMER,
    UPDATE_CUSTOMER,
    DELETE_CUSTOMER,
    MANAGE_CUSTOMER_PROFILES,
    VIEW_CUSTOMER_ANALYTICS,

    // Full integration management
    VIEW_INTEGRATIONS,
    MANAGE_INTEGRATIONS,
    CREATE_INTEGRATION,
    UPDATE_INTEGRATION,
    DELETE_INTEGRATION,
    SYNC_INTEGRATIONS,

    // Full custom fields management
    CREATE_CUSTOM_FIELD,
    VIEW_CUSTOM_FIELD,
    UPDATE_CUSTOM_FIELD,
    DELETE_CUSTOM_FIELD,
    MANAGE_CUSTOM_FIELD_CONFIG,

    // Full analytics and reporting
    VIEW_ANALYTICS,
    EXPORT_ANALYTICS,
    VIEW_REPORTS,
    CREATE_REPORTS,
    MANAGE_DASHBOARDS,

    // Full API management
    MANAGE_API_KEYS,
    VIEW_API_LOGS,
    MANAGE_WEBHOOKS,
    CONFIGURE_PUBLIC_API,

    // Advanced permissions
    MANAGE_AUTOMATION,
    BULK_OPERATIONS,
    DATA_EXPORT,
    DATA_IMPORT
  ],

  [ORG_ADMIN]: [
    // Organization control (except deletion and billing)
    VIEW_ORGANIZATION,
    UPDATE_ORGANIZATION,
    MANAGE_ORGANIZATION_SETTINGS,

    // Full member management
    INVITE_MEMBERS,
    UPDATE_MEMBERS,
    DELETE_MEMBERS,
    VIEW_MEMBERS,

    // Full feedback management
    CREATE_FEEDBACK,
    VIEW_FEEDBACK,
    UPDATE_FEEDBACK,
    DELETE_FEEDBACK,
    MANAGE_FEEDBACK_SETTINGS,
    ASSIGN_FEEDBACK,
    EXPORT_FEEDBACK,

    // Full customer management
    CREATE_CUSTOMER,
    VIEW_CUSTOMER,
    UPDATE_CUSTOMER,
    DELETE_CUSTOMER,
    MANAGE_CUSTOMER_PROFILES,
    VIEW_CUSTOMER_ANALYTICS,

    // Full integration management
    VIEW_INTEGRATIONS,
    MANAGE_INTEGRATIONS,
    CREATE_INTEGRATION,
    UPDATE_INTEGRATION,
    DELETE_INTEGRATION,
    SYNC_INTEGRATIONS,

    // Full custom fields management
    CREATE_CUSTOM_FIELD,
    VIEW_CUSTOM_FIELD,
    UPDATE_CUSTOM_FIELD,
    DELETE_CUSTOM_FIELD,
    MANAGE_CUSTOM_FIELD_CONFIG,

    // Full analytics and reporting
    VIEW_ANALYTICS,
    EXPORT_ANALYTICS,
    VIEW_REPORTS,
    CREATE_REPORTS,
    MANAGE_DASHBOARDS,

    // API management
    MANAGE_API_KEYS,
    VIEW_API_LOGS,
    MANAGE_WEBHOOKS,
    CONFIGURE_PUBLIC_API,

    // Advanced permissions
    MANAGE_AUTOMATION,
    BULK_OPERATIONS,
    DATA_EXPORT,
    DATA_IMPORT
  ],

  [ORG_MANAGER]: [
    // Basic organization access
    VIEW_ORGANIZATION,
    VIEW_MEMBERS,

    // Feedback management
    CREATE_FEEDBACK,
    VIEW_FEEDBACK,
    UPDATE_FEEDBACK,
    ASSIGN_FEEDBACK,
    EXPORT_FEEDBACK,
    MANAGE_FEEDBACK_SETTINGS,

    // Customer management
    CREATE_CUSTOMER,
    VIEW_CUSTOMER,
    UPDATE_CUSTOMER,
    MANAGE_CUSTOMER_PROFILES,
    VIEW_CUSTOMER_ANALYTICS,

    // Integration management
    VIEW_INTEGRATIONS,
    MANAGE_INTEGRATIONS,
    SYNC_INTEGRATIONS,

    // Custom fields (view and update)
    VIEW_CUSTOM_FIELD,
    UPDATE_CUSTOM_FIELD,

    // Analytics
    VIEW_ANALYTICS,
    EXPORT_ANALYTICS,
    VIEW_REPORTS,

    // Limited API access
    VIEW_API_LOGS,

    // Some advanced features
    BULK_OPERATIONS,
    DATA_EXPORT
  ],

  [ORG_MEMBER]: [
    // Basic organization access
    VIEW_ORGANIZATION,
    VIEW_MEMBERS,

    // Basic feedback operations
    CREATE_FEEDBACK,
    VIEW_FEEDBACK,
    UPDATE_FEEDBACK, // Can update feedback they created

    // Basic customer access
    VIEW_CUSTOMER,
    CREATE_CUSTOMER,

    // View integrations
    VIEW_INTEGRATIONS,

    // View custom fields
    VIEW_CUSTOM_FIELD,

    // Basic analytics
    VIEW_ANALYTICS,
    VIEW_REPORTS
  ],

  [ORG_VIEWER]: [
    // Read-only organization access
    VIEW_ORGANIZATION,
    VIEW_MEMBERS,

    // Read-only feedback access
    VIEW_FEEDBACK,

    // Read-only customer access
    VIEW_CUSTOMER,

    // View integrations
    VIEW_INTEGRATIONS,

    // View custom fields
    VIEW_CUSTOM_FIELD,

    // View analytics
    VIEW_ANALYTICS,
    VIEW_REPORTS
  ],

  [EXTERNAL_USER]: [
    // Very limited access for external users (customer portal)
    CREATE_FEEDBACK,
    VIEW_FEEDBACK, // Only their own feedback
  ],

  [API_USER]: [
    // API-specific permissions
    CREATE_FEEDBACK,
    VIEW_FEEDBACK,
    UPDATE_FEEDBACK,
    CREATE_CUSTOMER,
    VIEW_CUSTOMER,
    UPDATE_CUSTOMER,
    VIEW_INTEGRATIONS
  ]
};

// ===== PERMISSION GROUPS =====

export const PERMISSION_GROUPS = {
  ORGANIZATION_MANAGEMENT: [
    VIEW_ORGANIZATION,
    UPDATE_ORGANIZATION,
    DELETE_ORGANIZATION,
    MANAGE_ORGANIZATION_SETTINGS,
    MANAGE_BILLING
  ],

  MEMBER_MANAGEMENT: [
    INVITE_MEMBERS,
    UPDATE_MEMBERS,
    DELETE_MEMBERS,
    VIEW_MEMBERS
  ],

  FEEDBACK_MANAGEMENT: [
    CREATE_FEEDBACK,
    VIEW_FEEDBACK,
    UPDATE_FEEDBACK,
    DELETE_FEEDBACK,
    MANAGE_FEEDBACK_SETTINGS,
    ASSIGN_FEEDBACK,
    EXPORT_FEEDBACK
  ],

  CUSTOMER_MANAGEMENT: [
    CREATE_CUSTOMER,
    VIEW_CUSTOMER,
    UPDATE_CUSTOMER,
    DELETE_CUSTOMER,
    MANAGE_CUSTOMER_PROFILES,
    VIEW_CUSTOMER_ANALYTICS
  ],

  INTEGRATION_MANAGEMENT: [
    VIEW_INTEGRATIONS,
    MANAGE_INTEGRATIONS,
    CREATE_INTEGRATION,
    UPDATE_INTEGRATION,
    DELETE_INTEGRATION,
    SYNC_INTEGRATIONS
  ],

  ANALYTICS_AND_REPORTING: [
    VIEW_ANALYTICS,
    EXPORT_ANALYTICS,
    VIEW_REPORTS,
    CREATE_REPORTS,
    MANAGE_DASHBOARDS
  ],

  API_MANAGEMENT: [
    MANAGE_API_KEYS,
    VIEW_API_LOGS,
    MANAGE_WEBHOOKS,
    CONFIGURE_PUBLIC_API
  ],

  ADVANCED_FEATURES: [
    MANAGE_AUTOMATION,
    BULK_OPERATIONS,
    DATA_EXPORT,
    DATA_IMPORT,
    SYSTEM_ADMIN
  ]
};

// ===== ROLE HIERARCHY =====

export const ROLE_HIERARCHY = {
  [ORG_OWNER]: 5,
  [ORG_ADMIN]: 4,
  [ORG_MANAGER]: 3,
  [ORG_MEMBER]: 2,
  [ORG_VIEWER]: 1,
  [EXTERNAL_USER]: 0,
  [API_USER]: 0
};

// ===== SCOPE REQUIREMENTS =====

export const SCOPE_REQUIREMENTS = {
  [SCOPE_PUBLIC]: [],
  [SCOPE_AUTHENTICATED]: ['authenticated'],
  [SCOPE_ORGANIZATION]: ['authenticated', 'organization_member'],
  [SCOPE_SYSTEM]: ['authenticated', 'system_admin']
};

// ===== RESOURCE PERMISSIONS =====
// Define which permissions are required for specific resources

export const RESOURCE_PERMISSIONS = {
  'feedback': {
    create: [CREATE_FEEDBACK],
    read: [VIEW_FEEDBACK],
    update: [UPDATE_FEEDBACK],
    delete: [DELETE_FEEDBACK],
    assign: [ASSIGN_FEEDBACK],
    export: [EXPORT_FEEDBACK]
  },

  'customer': {
    create: [CREATE_CUSTOMER],
    read: [VIEW_CUSTOMER],
    update: [UPDATE_CUSTOMER],
    delete: [DELETE_CUSTOMER],
    profile: [MANAGE_CUSTOMER_PROFILES],
    analytics: [VIEW_CUSTOMER_ANALYTICS]
  },

  'integration': {
    create: [CREATE_INTEGRATION],
    read: [VIEW_INTEGRATIONS],
    update: [UPDATE_INTEGRATION],
    delete: [DELETE_INTEGRATION],
    manage: [MANAGE_INTEGRATIONS],
    sync: [SYNC_INTEGRATIONS]
  },

  'organization': {
    read: [VIEW_ORGANIZATION],
    update: [UPDATE_ORGANIZATION],
    delete: [DELETE_ORGANIZATION],
    settings: [MANAGE_ORGANIZATION_SETTINGS],
    billing: [MANAGE_BILLING]
  },

  'member': {
    invite: [INVITE_MEMBERS],
    view: [VIEW_MEMBERS],
    update: [UPDATE_MEMBERS],
    delete: [DELETE_MEMBERS]
  },

  'analytics': {
    view: [VIEW_ANALYTICS],
    export: [EXPORT_ANALYTICS],
    reports: [VIEW_REPORTS],
    create_reports: [CREATE_REPORTS],
    dashboards: [MANAGE_DASHBOARDS]
  },

  'api': {
    keys: [MANAGE_API_KEYS],
    logs: [VIEW_API_LOGS],
    webhooks: [MANAGE_WEBHOOKS],
    configure: [CONFIGURE_PUBLIC_API]
  }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSION_MAPPING[role];
  return rolePermissions ? rolePermissions.includes(permission) : false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSION_MAPPING[role] || [];
}

/**
 * Check if role A has higher hierarchy than role B
 */
export function isHigherRole(roleA: string, roleB: string): boolean {
  const hierarchyA = ROLE_HIERARCHY[roleA] || 0;
  const hierarchyB = ROLE_HIERARCHY[roleB] || 0;
  return hierarchyA > hierarchyB;
}

/**
 * Get required permissions for a resource action
 */
export function getResourcePermissions(resource: string, action: string): string[] {
  const resourceConfig = RESOURCE_PERMISSIONS[resource];
  return resourceConfig ? (resourceConfig[action] || []) : [];
}

/**
 * Check if user has sufficient role hierarchy for an action
 */
export function hasRequiredRoleLevel(userRole: string, requiredLevel: number): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Get all roles that have a specific permission
 */
export function getRolesWithPermission(permission: string): string[] {
  return Object.keys(ROLE_PERMISSION_MAPPING).filter(role =>
    ROLE_PERMISSION_MAPPING[role].includes(permission)
  );
}

/**
 * Check if permissions array contains all required permissions
 */
export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  if (requiredPermissions.length === 0) return true;
  return requiredPermissions.every(permission => userPermissions.includes(permission));
}

/**
 * Get permission groups that a role has access to
 */
export function getRolePermissionGroups(role: string): string[] {
  const rolePermissions = getRolePermissions(role);
  const groups: string[] = [];

  Object.keys(PERMISSION_GROUPS).forEach(groupName => {
    const groupPermissions = PERMISSION_GROUPS[groupName];
    const hasAnyPermission = groupPermissions.some(permission => 
      rolePermissions.includes(permission)
    );
    if (hasAnyPermission) {
      groups.push(groupName);
    }
  });

  return groups;
}

// Export all constants and functions
export default {
  // Permissions
  VIEW_ORGANIZATION, UPDATE_ORGANIZATION, DELETE_ORGANIZATION,
  MANAGE_ORGANIZATION_SETTINGS, MANAGE_BILLING,
  INVITE_MEMBERS, UPDATE_MEMBERS, DELETE_MEMBERS, VIEW_MEMBERS,
  CREATE_FEEDBACK, VIEW_FEEDBACK, UPDATE_FEEDBACK, DELETE_FEEDBACK,
  MANAGE_FEEDBACK_SETTINGS, ASSIGN_FEEDBACK, EXPORT_FEEDBACK,
  CREATE_CUSTOMER, VIEW_CUSTOMER, UPDATE_CUSTOMER, DELETE_CUSTOMER,
  MANAGE_CUSTOMER_PROFILES, VIEW_CUSTOMER_ANALYTICS,
  VIEW_INTEGRATIONS, MANAGE_INTEGRATIONS, CREATE_INTEGRATION,
  UPDATE_INTEGRATION, DELETE_INTEGRATION, SYNC_INTEGRATIONS,
  CREATE_CUSTOM_FIELD, VIEW_CUSTOM_FIELD, UPDATE_CUSTOM_FIELD,
  DELETE_CUSTOM_FIELD, MANAGE_CUSTOM_FIELD_CONFIG,
  VIEW_ANALYTICS, EXPORT_ANALYTICS, VIEW_REPORTS, CREATE_REPORTS,
  MANAGE_DASHBOARDS, MANAGE_API_KEYS, VIEW_API_LOGS,
  MANAGE_WEBHOOKS, CONFIGURE_PUBLIC_API, MANAGE_AUTOMATION,
  BULK_OPERATIONS, DATA_EXPORT, DATA_IMPORT, SYSTEM_ADMIN,

  // Roles
  ORG_OWNER, ORG_ADMIN, ORG_MANAGER, ORG_MEMBER, ORG_VIEWER,
  EXTERNAL_USER, API_USER,

  // Scopes
  SCOPE_PUBLIC, SCOPE_AUTHENTICATED, SCOPE_ORGANIZATION, SCOPE_SYSTEM,

  // Mappings and configurations
  ROLE_PERMISSION_MAPPING,
  PERMISSION_GROUPS,
  ROLE_HIERARCHY,
  SCOPE_REQUIREMENTS,
  RESOURCE_PERMISSIONS,

  // Utility functions
  roleHasPermission,
  getRolePermissions,
  isHigherRole,
  getResourcePermissions,
  hasRequiredRoleLevel,
  getRolesWithPermission,
  hasAllPermissions,
  getRolePermissionGroups
};