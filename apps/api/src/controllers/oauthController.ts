/**
 * OAuth Controller
 * Handles HTTP requests for OAuth integration flows
 */

import { Request, Response, NextFunction } from 'express';
import { SessionRequest } from 'supertokens-node/framework/express';
import { oauthConnectionService, IntegrationType } from '../services/oauth/connectionService';
import { organizationService } from '../services/organizationService';
import Joi from 'joi';

// Validation schemas
const authUrlSchema = Joi.object({
  integrationType: Joi.string().valid(...Object.values(IntegrationType)).required(),
  config: Joi.object().optional()
});

const oauthCallbackSchema = Joi.object({
  code: Joi.string().required(),
  state: Joi.string().required(),
  integrationType: Joi.string().valid(...Object.values(IntegrationType)).required(),
  config: Joi.object().optional()
});

const updateConnectionSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  isActive: Joi.boolean().optional(),
  metadata: Joi.object().optional()
});

export class OAuthController {
  /**
   * Get OAuth authorization URL
   */
  async getAuthorizationUrl(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role || !['owner', 'admin'].includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only organization owners and admins can create integrations'
        });
      }

      // Validate request body
      const { error, value } = authUrlSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const { integrationType, config } = value;

      // Generate authorization URL
      const { url, state } = await oauthConnectionService.getAuthorizationUrl(
        integrationType as IntegrationType,
        organizationId,
        config
      );

      res.json({
        success: true,
        data: {
          authorizationUrl: url,
          state,
          integrationType
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;

      // Validate query parameters
      const { error, value } = oauthCallbackSchema.validate({
        ...req.query,
        ...req.body
      });

      if (error) {
        return res.status(400).json({
          error: 'Invalid OAuth callback parameters',
          details: error.details.map(d => d.message)
        });
      }

      const { code, state, integrationType, config } = value;

      // Create connection from authorization code
      const connection = await oauthConnectionService.createConnectionFromAuthCode(
        code,
        state,
        organizationId,
        integrationType as IntegrationType,
        config
      );

      // Successful connection - redirect to success page or return JSON
      if (req.headers.accept?.includes('application/json')) {
        res.json({
          success: true,
          data: {
            connectionId: connection.id,
            name: connection.name,
            type: connection.type,
            status: connection.status
          }
        });
      } else {
        // Redirect to success page in web app
        res.redirect(`${process.env.WEB_APP_URL}/integrations?success=true&type=${integrationType}&connectionId=${connection.id}`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      
      // Handle error - redirect to error page or return JSON error
      if (req.headers.accept?.includes('application/json')) {
        next(error);
      } else {
        const errorMessage = encodeURIComponent(error instanceof Error ? error.message : 'OAuth connection failed');
        res.redirect(`${process.env.WEB_APP_URL}/integrations?error=true&message=${errorMessage}`);
      }
    }
  }

  /**
   * Get all OAuth connections for organization
   */
  async getConnections(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this organization'
        });
      }

      const connections = await oauthConnectionService.getConnections(organizationId);

      // Filter sensitive data for non-admin users
      const filteredConnections = connections.map(connection => {
        const { credentials, ...safeConnection } = connection;
        
        return {
          ...safeConnection,
          hasCredentials: !!credentials,
          // Include basic credential info for admins
          ...((['owner', 'admin'].includes(role)) && {
            credentialType: credentials?.tokenType,
            hasRefreshToken: !!credentials?.refreshToken,
            tokenExpiry: credentials?.expiresAt
          })
        };
      });

      res.json({
        success: true,
        data: filteredConnections
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific OAuth connection
   */
  async getConnection(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, connectionId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You are not a member of this organization'
        });
      }

      const connection = await oauthConnectionService.getConnection(connectionId, organizationId);

      if (!connection) {
        return res.status(404).json({
          error: 'Connection not found'
        });
      }

      // Filter sensitive data
      const { credentials, ...safeConnection } = connection;

      res.json({
        success: true,
        data: {
          ...safeConnection,
          hasCredentials: !!credentials,
          // Include basic credential info for admins
          ...((['owner', 'admin'].includes(role)) && {
            credentialType: credentials?.tokenType,
            hasRefreshToken: !!credentials?.refreshToken,
            tokenExpiry: credentials?.expiresAt
          })
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update OAuth connection
   */
  async updateConnection(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, connectionId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role || !['owner', 'admin'].includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only organization owners and admins can update integrations'
        });
      }

      // Validate request body
      const { error, value } = updateConnectionSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const updatedConnection = await oauthConnectionService.updateConnection(
        connectionId,
        organizationId,
        value
      );

      if (!updatedConnection) {
        return res.status(404).json({
          error: 'Connection not found'
        });
      }

      // Filter sensitive data
      const { credentials, ...safeConnection } = updatedConnection;

      res.json({
        success: true,
        data: {
          ...safeConnection,
          hasCredentials: !!credentials
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete OAuth connection
   */
  async deleteConnection(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, connectionId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role || !['owner', 'admin'].includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only organization owners and admins can delete integrations'
        });
      }

      await oauthConnectionService.deleteConnection(connectionId, organizationId);

      res.json({
        success: true,
        message: 'Connection deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test OAuth connection health
   */
  async testConnection(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, connectionId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role || !['owner', 'admin'].includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only organization owners and admins can test integrations'
        });
      }

      const healthResult = await oauthConnectionService.testConnection(connectionId, organizationId);

      res.json({
        success: true,
        data: healthResult
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh OAuth token
   */
  async refreshToken(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, connectionId } = req.params;
      const userId = req.session!.getUserId();

      // Check permissions
      const role = await organizationService.getUserRole(organizationId, userId);
      if (!role || !['owner', 'admin'].includes(role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only organization owners and admins can refresh tokens'
        });
      }

      const refreshedCredentials = await oauthConnectionService.refreshTokenIfNeeded(connectionId, organizationId);

      res.json({
        success: true,
        data: {
          tokenType: refreshedCredentials.tokenType,
          expiresAt: refreshedCredentials.expiresAt,
          scope: refreshedCredentials.scope
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available integration types
   */
  async getIntegrationTypes(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const integrationTypes = Object.values(IntegrationType).map(type => ({
        type,
        name: type.charAt(0) + type.slice(1).toLowerCase(),
        capabilities: this.getIntegrationCapabilities(type),
        requiresConfig: type === IntegrationType.ZENDESK,
        configFields: type === IntegrationType.ZENDESK ? ['subdomain'] : []
      }));

      res.json({
        success: true,
        data: integrationTypes
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get integration capabilities by type
   */
  private getIntegrationCapabilities(type: IntegrationType): string[] {
    const capabilities: Record<IntegrationType, string[]> = {
      [IntegrationType.SLACK]: [
        'Send notifications to channels',
        'Create feedback from messages',
        'Bi-directional sync',
        'Custom slash commands'
      ],
      [IntegrationType.ZENDESK]: [
        'Create tickets from feedback',
        'Sync ticket status',
        'Import existing tickets',
        'Custom field mapping'
      ],
      [IntegrationType.INTERCOM]: [
        'Create conversations from feedback',
        'Sync conversation status',
        'Contact management',
        'Custom attributes'
      ]
    };

    return capabilities[type] || [];
  }
}

export const oauthController = new OAuthController();