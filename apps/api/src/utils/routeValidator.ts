/**
 * Route Validator - Validates route registry configuration and catches common issues
 * Enhanced validation system for route configuration integrity
 */

import { routeRegistry, RouteEndpointConfig } from '../config/routeRegistry';
import { 
  HTTP_METHODS, 
  ACCESS_SCOPES, 
  RESOURCE_TYPES,
  HttpMethod
} from '../config/routeConstants';
// Removed unused imports: AccessScope, ResourceType, logger

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  severity: 'error';
  code: string;
  message: string;
  location: string;
  suggestion?: string;
}

export interface ValidationWarning {
  severity: 'warning';
  code: string;
  message: string;
  location: string;
  suggestion?: string;
}

export interface ValidationSummary {
  totalVersions: number;
  totalModules: number;
  totalEndpoints: number;
  validationTime: number;
  criticalErrors: number;
  warnings: number;
}

/**
 * Comprehensive route registry validation
 */
export function validateRouteRegistry(): ValidationResult {
  const startTime = Date.now();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  let totalVersions = 0;
  let totalModules = 0;
  let totalEndpoints = 0;

  try {
    // Validate top-level structure
    if (!routeRegistry || typeof routeRegistry !== 'object') {
      errors.push({
        severity: 'error',
        code: 'INVALID_REGISTRY',
        message: 'Route registry is not a valid object',
        location: 'root'
      });
      
      return createValidationResult(errors, warnings, {
        totalVersions: 0,
        totalModules: 0,
        totalEndpoints: 0,
        validationTime: Date.now() - startTime,
        criticalErrors: errors.length,
        warnings: warnings.length
      });
    }

    // Validate each version
    Object.keys(routeRegistry).forEach(version => {
      totalVersions++;
      validateVersion(version, routeRegistry[version], errors, warnings);
      
      // Count modules and endpoints
      Object.keys(routeRegistry[version]).forEach(module => {
        totalModules++;
        const moduleConfig = routeRegistry[version][module];
        
        Object.keys(moduleConfig).forEach(method => {
          if (Array.isArray(moduleConfig[method])) {
            totalEndpoints += moduleConfig[method].length;
          }
        });
      });
    });

    // Validate cross-version consistency
    validateVersionConsistency(errors, warnings);
    
    // Validate permission references
    validatePermissionReferences(errors, warnings);

  } catch (error) {
    errors.push({
      severity: 'error',
      code: 'VALIDATION_ERROR',
      message: `Validation process failed: ${error}`,
      location: 'validator'
    });
  }

  return createValidationResult(errors, warnings, {
    totalVersions,
    totalModules,
    totalEndpoints,
    validationTime: Date.now() - startTime,
    criticalErrors: errors.length,
    warnings: warnings.length
  });
}

/**
 * Validate a specific API version
 */
function validateVersion(
  version: string,
  versionConfig: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const location = `version:${version}`;
  
  // Validate version format
  if (!version.match(/^v\d+$/)) {
    warnings.push({
      severity: 'warning',
      code: 'INVALID_VERSION_FORMAT',
      message: `Version '${version}' should follow format 'v1', 'v2', etc.`,
      location,
      suggestion: 'Use semantic versioning like v1, v2, v3'
    });
  }

  // Validate modules in version
  if (!versionConfig || typeof versionConfig !== 'object') {
    errors.push({
      severity: 'error',
      code: 'INVALID_VERSION_CONFIG',
      message: `Version ${version} configuration is not a valid object`,
      location
    });
    return;
  }

  Object.keys(versionConfig).forEach(module => {
    validateModule(version, module, versionConfig[module], errors, warnings);
  });
}

/**
 * Validate a specific module
 */
function validateModule(
  version: string,
  module: string,
  moduleConfig: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const location = `${version}/${module}`;
  
  // Validate module structure
  if (!moduleConfig || typeof moduleConfig !== 'object') {
    errors.push({
      severity: 'error',
      code: 'INVALID_MODULE_CONFIG',
      message: `Module ${module} configuration is not a valid object`,
      location
    });
    return;
  }

  // Validate module metadata
  validateModuleMetadata(version, module, moduleConfig, errors, warnings);
  
  // Validate HTTP methods
  Object.keys(moduleConfig).forEach(method => {
    if (HTTP_METHODS.includes(method as HttpMethod)) {
      validateMethod(version, module, method, moduleConfig[method], errors, warnings);
    } else if (!['defaultScope', 'requiredPermissions', 'resource', 'category', 'description'].includes(method)) {
      warnings.push({
        severity: 'warning',
        code: 'UNKNOWN_MODULE_PROPERTY',
        message: `Unknown property '${method}' in module configuration`,
        location,
        suggestion: 'Remove unknown properties or check for typos'
      });
    }
  });
}

/**
 * Validate module metadata
 */
function validateModuleMetadata(
  version: string,
  module: string,
  moduleConfig: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const location = `${version}/${module}`;
  
  // Check for required metadata
  if (!moduleConfig.resource && !moduleConfig.defaultScope) {
    warnings.push({
      severity: 'warning',
      code: 'MISSING_MODULE_METADATA',
      message: 'Module should have either resource or defaultScope defined',
      location,
      suggestion: 'Add resource and/or defaultScope to module configuration'
    });
  }

  // Validate resource type
  if (moduleConfig.resource && !RESOURCE_TYPES.includes(moduleConfig.resource)) {
    warnings.push({
      severity: 'warning',
      code: 'UNKNOWN_RESOURCE_TYPE',
      message: `Unknown resource type '${moduleConfig.resource}'`,
      location,
      suggestion: `Use one of: ${RESOURCE_TYPES.join(', ')}`
    });
  }

  // Validate default scope
  if (moduleConfig.defaultScope && !ACCESS_SCOPES.includes(moduleConfig.defaultScope)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_DEFAULT_SCOPE',
      message: `Invalid default scope '${moduleConfig.defaultScope}'`,
      location,
      suggestion: `Use one of: ${ACCESS_SCOPES.join(', ')}`
    });
  }

  // Validate category
  if (moduleConfig.category && typeof moduleConfig.category !== 'string') {
    warnings.push({
      severity: 'warning',
      code: 'INVALID_CATEGORY',
      message: 'Module category should be a string',
      location,
      suggestion: 'Provide a descriptive category string'
    });
  }

  // Check for description
  if (!moduleConfig.description) {
    warnings.push({
      severity: 'warning',
      code: 'MISSING_MODULE_DESCRIPTION',
      message: 'Module should have a description',
      location,
      suggestion: 'Add a brief description of the module functionality'
    });
  }
}

/**
 * Validate HTTP method configuration
 */
function validateMethod(
  version: string,
  module: string,
  method: string,
  methodConfig: any,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const location = `${version}/${module}/${method}`;
  
  if (!Array.isArray(methodConfig)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_METHOD_CONFIG',
      message: `Method ${method} configuration should be an array of endpoints`,
      location,
      suggestion: 'Define method configuration as an array of endpoint objects'
    });
    return;
  }

  if (methodConfig.length === 0) {
    warnings.push({
      severity: 'warning',
      code: 'EMPTY_METHOD_CONFIG',
      message: `Method ${method} has no endpoint configurations`,
      location,
      suggestion: 'Remove empty method or add endpoint configurations'
    });
    return;
  }

  methodConfig.forEach((endpoint: RouteEndpointConfig, index: number) => {
    validateEndpoint(version, module, method, index, endpoint, errors, warnings);
  });
}

/**
 * Validate individual endpoint configuration
 */
function validateEndpoint(
  version: string,
  module: string,
  method: string,
  index: number,
  endpoint: RouteEndpointConfig,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const location = `${version}/${module}/${method}[${index}]`;
  
  // Validate required fields
  if (!endpoint.endpoint) {
    errors.push({
      severity: 'error',
      code: 'MISSING_ENDPOINT_PATH',
      message: 'Endpoint path is required',
      location,
      suggestion: 'Add endpoint path (e.g., "/", "/create", "/:id")'
    });
  }

  if (!endpoint.scope) {
    errors.push({
      severity: 'error',
      code: 'MISSING_ENDPOINT_SCOPE',
      message: 'Endpoint scope is required',
      location,
      suggestion: `Add scope (one of: ${ACCESS_SCOPES.join(', ')})`
    });
  } else if (!ACCESS_SCOPES.includes(endpoint.scope)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_ENDPOINT_SCOPE',
      message: `Invalid scope '${endpoint.scope}'`,
      location,
      suggestion: `Use one of: ${ACCESS_SCOPES.join(', ')}`
    });
  }

  if (!Array.isArray(endpoint.requiredPermissions)) {
    errors.push({
      severity: 'error',
      code: 'INVALID_PERMISSIONS',
      message: 'requiredPermissions must be an array',
      location,
      suggestion: 'Provide permissions as an array of strings'
    });
  }

  // Validate endpoint path format
  if (endpoint.endpoint) {
    validateEndpointPath(endpoint.endpoint, location, errors, warnings);
  }

  // Validate rate limiting
  if (endpoint.rateLimit) {
    validateRateLimit(endpoint.rateLimit, location, errors, warnings);
  }

  // Validate logging configuration
  if (endpoint.log) {
    validateLogConfig(endpoint.log, location, errors, warnings);
  }

  // Check for description
  if (!endpoint.description) {
    warnings.push({
      severity: 'warning',
      code: 'MISSING_ENDPOINT_DESCRIPTION',
      message: 'Endpoint should have a description',
      location,
      suggestion: 'Add a brief description of what this endpoint does'
    });
  }

  // Validate resource consistency
  if (endpoint.resource && typeof endpoint.resource !== 'string' && !Array.isArray(endpoint.resource)) {
    warnings.push({
      severity: 'warning',
      code: 'INVALID_ENDPOINT_RESOURCE',
      message: 'Endpoint resource should be a string or array of strings',
      location,
      suggestion: 'Specify resource as a string or array'
    });
  }
}

/**
 * Validate endpoint path format
 */
function validateEndpointPath(
  path: string,
  location: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Should start with /
  if (!path.startsWith('/')) {
    errors.push({
      severity: 'error',
      code: 'INVALID_PATH_FORMAT',
      message: `Endpoint path '${path}' should start with '/'`,
      location,
      suggestion: 'Ensure path starts with forward slash'
    });
  }

  // Check for double slashes
  if (path.includes('//')) {
    warnings.push({
      severity: 'warning',
      code: 'DOUBLE_SLASH_IN_PATH',
      message: `Path '${path}' contains double slashes`,
      location,
      suggestion: 'Remove extra slashes from path'
    });
  }

  // Validate parameter format
  const paramMatches = path.match(/:(\w+)/g);
  if (paramMatches) {
    paramMatches.forEach(param => {
      if (!/^:[a-zA-Z][a-zA-Z0-9_]*$/.test(param)) {
        warnings.push({
          severity: 'warning',
          code: 'INVALID_PARAMETER_FORMAT',
          message: `Parameter '${param}' should follow :paramName format`,
          location,
          suggestion: 'Use alphanumeric characters and underscores for parameters'
        });
      }
    });
  }
}

/**
 * Validate rate limit configuration
 */
function validateRateLimit(
  rateLimit: any,
  location: string,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!rateLimit.windowMs || typeof rateLimit.windowMs !== 'number') {
    errors.push({
      severity: 'error',
      code: 'INVALID_RATE_LIMIT_WINDOW',
      message: 'Rate limit windowMs must be a positive number',
      location,
      suggestion: 'Set windowMs to milliseconds (e.g., 60000 for 1 minute)'
    });
  }

  if (!rateLimit.maxRequests || typeof rateLimit.maxRequests !== 'number') {
    errors.push({
      severity: 'error',
      code: 'INVALID_RATE_LIMIT_MAX',
      message: 'Rate limit maxRequests must be a positive number',
      location,
      suggestion: 'Set maxRequests to desired limit (e.g., 100)'
    });
  }

  // Warn about potentially problematic limits
  if (rateLimit.maxRequests > 10000) {
    warnings.push({
      severity: 'warning',
      code: 'HIGH_RATE_LIMIT',
      message: `Very high rate limit: ${rateLimit.maxRequests} requests`,
      location,
      suggestion: 'Consider if such a high limit is necessary'
    });
  }

  if (rateLimit.windowMs < 1000) {
    warnings.push({
      severity: 'warning',
      code: 'SHORT_RATE_LIMIT_WINDOW',
      message: `Very short rate limit window: ${rateLimit.windowMs}ms`,
      location,
      suggestion: 'Consider using a longer window for better rate limiting'
    });
  }
}

/**
 * Validate logging configuration
 */
function validateLogConfig(
  logConfig: any,
  location: string,
  errors: ValidationError[],
  _warnings: ValidationWarning[]
): void {
  if (typeof logConfig.request !== 'boolean') {
    errors.push({
      severity: 'error',
      code: 'INVALID_LOG_REQUEST',
      message: 'Log request configuration must be boolean',
      location,
      suggestion: 'Set log.request to true or false'
    });
  }

  if (typeof logConfig.response !== 'boolean') {
    errors.push({
      severity: 'error',
      code: 'INVALID_LOG_RESPONSE',
      message: 'Log response configuration must be boolean',
      location,
      suggestion: 'Set log.response to true or false'
    });
  }

  if (logConfig.sanitize !== undefined && typeof logConfig.sanitize !== 'boolean') {
    errors.push({
      severity: 'error',
      code: 'INVALID_LOG_SANITIZE',
      message: 'Log sanitize configuration must be boolean',
      location,
      suggestion: 'Set log.sanitize to true or false'
    });
  }
}

/**
 * Validate consistency across versions
 */
function validateVersionConsistency(
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const versions = Object.keys(routeRegistry);
  
  if (versions.length > 1) {
    // Check for module consistency across versions
    const modulesByVersion: { [version: string]: string[] } = {};
    
    versions.forEach(version => {
      modulesByVersion[version] = Object.keys(routeRegistry[version]);
    });

    // Find modules that exist in some versions but not others
    const allModules = new Set<string>();
    Object.values(modulesByVersion).forEach(modules => {
      modules.forEach(module => allModules.add(module));
    });

    allModules.forEach(module => {
      const versionsWithModule = versions.filter(v => modulesByVersion[v].includes(module));
      
      if (versionsWithModule.length < versions.length) {
        warnings.push({
          severity: 'warning',
          code: 'INCONSISTENT_MODULE_VERSIONS',
          message: `Module '${module}' exists in ${versionsWithModule.join(', ')} but not in other versions`,
          location: `modules:${module}`,
          suggestion: 'Consider maintaining module consistency across versions or documenting breaking changes'
        });
      }
    });
  }
}

/**
 * Validate permission references
 */
function validatePermissionReferences(
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // This would ideally check against actual permission constants
  // For now, we'll do basic validation
  
  Object.keys(routeRegistry).forEach(version => {
    Object.keys(routeRegistry[version]).forEach(module => {
      const moduleConfig = routeRegistry[version][module];
      
      Object.keys(moduleConfig).forEach(method => {
        if (Array.isArray(moduleConfig[method])) {
          moduleConfig[method].forEach((endpoint: RouteEndpointConfig, index: number) => {
            if (endpoint.requiredPermissions) {
              endpoint.requiredPermissions.forEach(permission => {
                // Check for common permission naming issues
                if (!permission.includes('-') && permission.length > 5) {
                  warnings.push({
                    severity: 'warning',
                    code: 'UNUSUAL_PERMISSION_FORMAT',
                    message: `Permission '${permission}' doesn't follow kebab-case convention`,
                    location: `${version}/${module}/${method}[${index}]`,
                    suggestion: 'Use kebab-case for permission names (e.g., view-feedback, create-customer)'
                  });
                }
              });
            }
          });
        }
      });
    });
  });
}

/**
 * Create validation result object
 */
function createValidationResult(
  errors: ValidationError[],
  warnings: ValidationWarning[],
  summary: ValidationSummary
): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary
  };
}

/**
 * Generate validation report
 */
export function generateValidationReport(result: ValidationResult): string {
  let report = '# Route Registry Validation Report\n\n';
  
  report += `**Status:** ${result.valid ? '✅ VALID' : '❌ INVALID'}\n`;
  report += `**Validation Time:** ${result.summary.validationTime}ms\n`;
  report += `**Total Versions:** ${result.summary.totalVersions}\n`;
  report += `**Total Modules:** ${result.summary.totalModules}\n`;
  report += `**Total Endpoints:** ${result.summary.totalEndpoints}\n`;
  report += `**Critical Errors:** ${result.summary.criticalErrors}\n`;
  report += `**Warnings:** ${result.summary.warnings}\n\n`;

  if (result.errors.length > 0) {
    report += '## ❌ Errors\n\n';
    result.errors.forEach(error => {
      report += `### ${error.code}\n`;
      report += `**Location:** ${error.location}\n`;
      report += `**Message:** ${error.message}\n`;
      if (error.suggestion) {
        report += `**Suggestion:** ${error.suggestion}\n`;
      }
      report += '\n';
    });
  }

  if (result.warnings.length > 0) {
    report += '## ⚠️ Warnings\n\n';
    result.warnings.forEach(warning => {
      report += `### ${warning.code}\n`;
      report += `**Location:** ${warning.location}\n`;
      report += `**Message:** ${warning.message}\n`;
      if (warning.suggestion) {
        report += `**Suggestion:** ${warning.suggestion}\n`;
      }
      report += '\n';
    });
  }

  if (result.valid && result.warnings.length === 0) {
    report += '## 🎉 Perfect Configuration!\n\n';
    report += 'Your route registry has no errors or warnings.\n';
  }

  return report;
}

export default {
  validateRouteRegistry,
  generateValidationReport
};