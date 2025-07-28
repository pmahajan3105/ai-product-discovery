/**
 * Integration Health Routes
 * API routes for integration health monitoring
 */

import express from 'express';
import { integrationHealthController } from '../controllers/integrationHealthController';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';

const router = express.Router();

// Apply session verification to all routes
router.use(verifySession());

/**
 * Get health summary for dashboard
 */
router.get('/summary', async (req, res) => {
  await integrationHealthController.getHealthSummary(req, res);
});

/**
 * Get health status for all integrations in organization
 */
router.get('/organization', async (req, res) => {
  await integrationHealthController.getOrganizationHealth(req, res);
});

/**
 * Get health status for a specific integration
 */
router.get('/:integrationId', async (req, res) => {
  await integrationHealthController.getIntegrationHealth(req, res);
});

/**
 * Force refresh health check for an integration
 */
router.post('/:integrationId/refresh', async (req, res) => {
  await integrationHealthController.refreshIntegrationHealth(req, res);
});

/**
 * Get integration health history and trends
 */
router.get('/:integrationId/history', async (req, res) => {
  await integrationHealthController.getHealthHistory(req, res);
});

export default router;