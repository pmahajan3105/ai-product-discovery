/**
 * OAuth Routes
 * API routes for OAuth integration management
 */

import { Router } from 'express';
import { oauthController } from '../controllers/oauthController';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';

export const oauthRouter = Router();

// Get available integration types
oauthRouter.get(
  '/oauth/integration-types',
  verifySession(),
  oauthController.getIntegrationTypes.bind(oauthController)
);

// Get OAuth authorization URL
oauthRouter.post(
  '/organizations/:organizationId/oauth/authorize',
  verifySession(),
  oauthController.getAuthorizationUrl.bind(oauthController)
);

// Handle OAuth callback (can be called without session for redirects)
oauthRouter.get(
  '/organizations/:organizationId/oauth/callback',
  oauthController.handleOAuthCallback.bind(oauthController)
);

oauthRouter.post(
  '/organizations/:organizationId/oauth/callback',
  oauthController.handleOAuthCallback.bind(oauthController)
);

// Get all OAuth connections for organization
oauthRouter.get(
  '/organizations/:organizationId/oauth/connections',
  verifySession(),
  oauthController.getConnections.bind(oauthController)
);

// Get specific OAuth connection
oauthRouter.get(
  '/organizations/:organizationId/oauth/connections/:connectionId',
  verifySession(),
  oauthController.getConnection.bind(oauthController)
);

// Update OAuth connection
oauthRouter.put(
  '/organizations/:organizationId/oauth/connections/:connectionId',
  verifySession(),
  oauthController.updateConnection.bind(oauthController)
);

// Delete OAuth connection
oauthRouter.delete(
  '/organizations/:organizationId/oauth/connections/:connectionId',
  verifySession(),
  oauthController.deleteConnection.bind(oauthController)
);

// Test OAuth connection health
oauthRouter.post(
  '/organizations/:organizationId/oauth/connections/:connectionId/test',
  verifySession(),
  oauthController.testConnection.bind(oauthController)
);

// Refresh OAuth token
oauthRouter.post(
  '/organizations/:organizationId/oauth/connections/:connectionId/refresh',
  verifySession(),
  oauthController.refreshToken.bind(oauthController)
);