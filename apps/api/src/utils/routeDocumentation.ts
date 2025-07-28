/**
 * Route Documentation Generator - Automatically generates API documentation from route registry
 * Enhanced version that creates comprehensive API documentation
 */

import { routeRegistry, RouteEndpointConfig } from '../config/routeRegistry';
// Removed unused imports ROUTE_CATEGORIES, ROUTE_STATUS_CODES
import { logger } from './logger';

export interface ApiDocEndpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  category: string;
  scope: string;
  permissions: string[];
  parameters?: ApiDocParameter[];
  requestBody?: ApiDocRequestBody;
  responses: ApiDocResponse[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  deprecated?: boolean;
  tags?: string[];
}

export interface ApiDocParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type: string;
  description?: string;
}

export interface ApiDocRequestBody {
  required: boolean;
  contentType: string;
  schema: any;
  examples?: any;
}

export interface ApiDocResponse {
  status: number;
  description: string;
  schema?: any;
  examples?: any;
}

export interface ApiDocumentation {
  info: {
    title: string;
    version: string;
    description: string;
    baseUrl: string;
  };
  categories: string[];
  endpoints: ApiDocEndpoint[];
  totalEndpoints: number;
  generatedAt: string;
}

/**
 * Generate comprehensive API documentation from route registry
 */
export function generateApiDocumentation(): ApiDocumentation {
  const endpoints: ApiDocEndpoint[] = [];
  const categories = new Set<string>();

  try {
    Object.keys(routeRegistry).forEach(version => {
      Object.keys(routeRegistry[version]).forEach(module => {
        const moduleConfig = routeRegistry[version][module];
        
        if (moduleConfig.category) {
          categories.add(moduleConfig.category);
        }

        Object.keys(moduleConfig).forEach(method => {
          if (Array.isArray(moduleConfig[method])) {
            moduleConfig[method].forEach((endpointConfig: RouteEndpointConfig) => {
              const endpoint = generateEndpointDoc(
                version,
                module,
                method,
                endpointConfig,
                moduleConfig
              );
              endpoints.push(endpoint);
            });
          }
        });
      });
    });

    return {
      info: {
        title: 'FeedbackHub API',
        version: '1.0.0',
        description: 'Comprehensive feedback management API with role-based access control',
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api'
      },
      categories: Array.from(categories).sort(),
      endpoints: endpoints.sort((a, b) => {
        // Sort by category, then by path
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.path.localeCompare(b.path);
      }),
      totalEndpoints: endpoints.length,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Failed to generate API documentation', error);
    throw error;
  }
}

/**
 * Generate documentation for a single endpoint
 */
function generateEndpointDoc(
  version: string,
  module: string,
  method: string,
  endpointConfig: RouteEndpointConfig,
  moduleConfig: any
): ApiDocEndpoint {
  const basePath = `/api/${version}/${module}`;
  const fullPath = basePath + endpointConfig.endpoint;
  
  return {
    method: method.toUpperCase(),
    path: fullPath,
    summary: endpointConfig.description || `${method} ${module}${endpointConfig.endpoint}`,
    description: generateEndpointDescription(endpointConfig, moduleConfig),
    category: moduleConfig.category || 'Uncategorized',
    scope: endpointConfig.scope,
    permissions: endpointConfig.requiredPermissions || [],
    parameters: generateParameters(endpointConfig),
    requestBody: generateRequestBody(method, module, endpointConfig),
    responses: generateResponses(method, endpointConfig),
    rateLimit: endpointConfig.rateLimit,
    deprecated: endpointConfig.deprecated,
    tags: endpointConfig.tags
  };
}

/**
 * Generate detailed endpoint description
 */
function generateEndpointDescription(
  endpointConfig: RouteEndpointConfig,
  moduleConfig: any
): string {
  let description = endpointConfig.description || '';
  
  if (moduleConfig.description) {
    description += `\n\nModule: ${moduleConfig.description}`;
  }
  
  if (endpointConfig.requiredPermissions?.length > 0) {
    description += `\n\nRequired Permissions: ${endpointConfig.requiredPermissions.join(', ')}`;
  }
  
  if (endpointConfig.rateLimit) {
    description += `\n\nRate Limit: ${endpointConfig.rateLimit.maxRequests} requests per ${endpointConfig.rateLimit.windowMs / 1000} seconds`;
  }
  
  if (endpointConfig.deprecated) {
    description += '\n\n⚠️ **DEPRECATED**: This endpoint is deprecated and may be removed in future versions.';
  }
  
  return description.trim();
}

/**
 * Generate parameters for endpoint
 */
function generateParameters(endpointConfig: RouteEndpointConfig): ApiDocParameter[] {
  const parameters: ApiDocParameter[] = [];
  
  // Add path parameters
  if (endpointConfig.params || endpointConfig.endpoint.includes(':')) {
    const pathParams = extractPathParameters(endpointConfig.endpoint);
    pathParams.forEach(param => {
      parameters.push({
        name: param,
        in: 'path',
        required: true,
        type: 'string',
        description: `${param} identifier`
      });
    });
  }
  
  // Add common query parameters based on endpoint type
  if (endpointConfig.endpoint === '/') {
    parameters.push(
      {
        name: 'page',
        in: 'query',
        required: false,
        type: 'integer',
        description: 'Page number for pagination (default: 1)'
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        type: 'integer',
        description: 'Number of items per page (default: 20, max: 100)'
      },
      {
        name: 'search',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Search query string'
      }
    );
  }
  
  return parameters;
}

/**
 * Extract path parameters from endpoint path
 */
function extractPathParameters(endpoint: string): string[] {
  const matches = endpoint.match(/:(\w+)/g);
  return matches ? matches.map(match => match.substring(1)) : [];
}

/**
 * Generate request body schema for endpoint
 */
function generateRequestBody(
  method: string,
  module: string,
  endpointConfig: RouteEndpointConfig
): ApiDocRequestBody | undefined {
  if (!['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    return undefined;
  }
  
  // Generate basic schema based on module and endpoint
  const schema = generateRequestSchema(module, endpointConfig);
  
  return {
    required: true,
    contentType: 'application/json',
    schema,
    examples: generateRequestExamples(module, endpointConfig)
  };
}

/**
 * Generate request schema based on module type
 */
function generateRequestSchema(module: string, endpointConfig: RouteEndpointConfig): any {
  const baseSchema = {
    type: 'object',
    properties: {},
    required: []
  };
  
  switch (module) {
    case 'feedback':
      if (endpointConfig.endpoint === '/') {
        return {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', minLength: 1 },
            customerEmail: { type: 'string', format: 'email' },
            source: { type: 'string', enum: ['manual', 'email', 'integration', 'api'] },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            tags: { type: 'array', items: { type: 'string' } },
            customFields: { type: 'object' }
          },
          required: ['title', 'description']
        };
      }
      break;
      
    case 'customers':
      if (endpointConfig.endpoint === '/') {
        return {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string', minLength: 1 },
            company: { type: 'string' },
            metadata: { type: 'object' }
          },
          required: ['email']
        };
      }
      break;
      
    case 'organizations':
      if (endpointConfig.endpoint === '/') {
        return {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string' },
            settings: { type: 'object' }
          },
          required: ['name']
        };
      }
      break;
  }
  
  return baseSchema;
}

/**
 * Generate request examples
 */
function generateRequestExamples(module: string, endpointConfig: RouteEndpointConfig): any {
  switch (module) {
    case 'feedback':
      if (endpointConfig.endpoint === '/') {
        return {
          basic: {
            title: 'Feature Request: Dark Mode',
            description: 'Would love to see a dark mode option in the application',
            customerEmail: 'customer@example.com',
            source: 'manual',
            priority: 'medium',
            tags: ['feature-request', 'ui']
          }
        };
      }
      break;
      
    case 'customers':
      if (endpointConfig.endpoint === '/') {
        return {
          basic: {
            email: 'customer@example.com',
            name: 'John Doe',
            company: 'Example Corp',
            metadata: {
              segment: 'enterprise',
              plan: 'pro'
            }
          }
        };
      }
      break;
  }
  
  return undefined;
}

/**
 * Generate response schemas for endpoint
 */
function generateResponses(method: string, endpointConfig: RouteEndpointConfig): ApiDocResponse[] {
  const responses: ApiDocResponse[] = [];
  
  // Success responses
  switch (method.toUpperCase()) {
    case 'GET':
      responses.push({
        status: 200,
        description: 'Success',
        schema: { type: 'object' }
      });
      break;
      
    case 'POST':
      responses.push({
        status: 201,
        description: 'Created successfully',
        schema: { type: 'object' }
      });
      break;
      
    case 'PUT':
    case 'PATCH':
      responses.push({
        status: 200,
        description: 'Updated successfully',
        schema: { type: 'object' }
      });
      break;
      
    case 'DELETE':
      responses.push({
        status: 200,
        description: 'Deleted successfully',
        schema: { type: 'object' }
      });
      break;
  }
  
  // Common error responses
  responses.push(
    {
      status: 400,
      description: 'Bad Request - Invalid input data'
    },
    {
      status: 401,
      description: 'Unauthorized - Authentication required'
    },
    {
      status: 403,
      description: 'Forbidden - Insufficient permissions'
    },
    {
      status: 404,
      description: 'Not Found - Resource not found'
    },
    {
      status: 500,
      description: 'Internal Server Error'
    }
  );
  
  // Add rate limit error if rate limiting is configured
  if (endpointConfig.rateLimit) {
    responses.push({
      status: 429,
      description: 'Too Many Requests - Rate limit exceeded'
    });
  }
  
  return responses;
}

/**
 * Generate OpenAPI/Swagger specification
 */
export function generateOpenApiSpec(): any {
  const documentation = generateApiDocumentation();
  
  const spec = {
    openapi: '3.0.0',
    info: documentation.info,
    servers: [
      {
        url: documentation.info.baseUrl,
        description: 'FeedbackHub API Server'
      }
    ],
    tags: documentation.categories.map(category => ({
      name: category,
      description: `${category} related endpoints`
    })),
    paths: {} as Record<string, any>,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Authentication required' }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Insufficient permissions' }
                }
              }
            }
          }
        }
      }
    }
  };
  
  // Convert endpoints to OpenAPI paths
  documentation.endpoints.forEach(endpoint => {
    if (!spec.paths[endpoint.path]) {
      spec.paths[endpoint.path] = {};
    }
    
    spec.paths[endpoint.path][endpoint.method.toLowerCase()] = {
      summary: endpoint.summary,
      description: endpoint.description,
      tags: [endpoint.category],
      security: endpoint.scope !== 'PUBLIC' ? [{ bearerAuth: [] }] : [],
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses.reduce((acc, response) => {
        acc[response.status] = {
          description: response.description,
          content: response.schema ? {
            'application/json': {
              schema: response.schema,
              examples: response.examples
            }
          } : undefined
        };
        return acc;
      }, {}),
      deprecated: endpoint.deprecated
    };
  });
  
  return spec;
}

/**
 * Generate markdown documentation
 */
export function generateMarkdownDocs(): string {
  const documentation = generateApiDocumentation();
  
  let markdown = `# ${documentation.info.title}\n\n`;
  markdown += `${documentation.info.description}\n\n`;
  markdown += `**Version:** ${documentation.info.version}  \n`;
  markdown += `**Base URL:** ${documentation.info.baseUrl}  \n`;
  markdown += `**Generated:** ${new Date(documentation.generatedAt).toLocaleString()}  \n`;
  markdown += `**Total Endpoints:** ${documentation.totalEndpoints}\n\n`;
  
  // Table of Contents
  markdown += '## Table of Contents\n\n';
  documentation.categories.forEach(category => {
    const categoryEndpoints = documentation.endpoints.filter(e => e.category === category);
    markdown += `- [${category}](#${category.toLowerCase().replace(/\s+/g, '-')}) (${categoryEndpoints.length} endpoints)\n`;
  });
  markdown += '\n';
  
  // Endpoints by category
  documentation.categories.forEach(category => {
    const categoryEndpoints = documentation.endpoints.filter(e => e.category === category);
    
    markdown += `## ${category}\n\n`;
    
    categoryEndpoints.forEach(endpoint => {
      markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
      markdown += `${endpoint.summary}\n\n`;
      
      if (endpoint.description) {
        markdown += `${endpoint.description}\n\n`;
      }
      
      if (endpoint.permissions.length > 0) {
        markdown += `**Required Permissions:** ${endpoint.permissions.join(', ')}\n\n`;
      }
      
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        markdown += '**Parameters:**\n\n';
        markdown += '| Name | Type | Required | Description |\n';
        markdown += '|------|------|----------|-------------|\n';
        endpoint.parameters.forEach(param => {
          markdown += `| ${param.name} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description || ''} |\n`;
        });
        markdown += '\n';
      }
      
      if (endpoint.rateLimit) {
        markdown += `**Rate Limit:** ${endpoint.rateLimit.maxRequests} requests per ${endpoint.rateLimit.windowMs / 1000} seconds\n\n`;
      }
      
      if (endpoint.deprecated) {
        markdown += '⚠️ **This endpoint is deprecated**\n\n';
      }
      
      markdown += '---\n\n';
    });
  });
  
  return markdown;
}

export default {
  generateApiDocumentation,
  generateOpenApiSpec,
  generateMarkdownDocs
};