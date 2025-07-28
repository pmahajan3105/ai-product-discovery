/**
 * Integration Sync Routes
 * API routes for managing integration synchronization configuration
 */

import express from 'express';
import { integrationSyncController } from '../controllers/integrationSyncController';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';

const router = express.Router();

// Apply session verification to all routes
router.use(verifySession());

/**
 * Get sync configuration for an integration
 */
router.get('/:integrationId/config', async (req, res) => {
  await integrationSyncController.getSyncConfig(req, res);
});

/**
 * Update sync configuration
 */
router.put('/:integrationId/config', async (req, res) => {
  await integrationSyncController.updateSyncConfig(req, res);
});

/**
 * Create or update a sync rule
 */
router.post('/:integrationId/rules', async (req, res) => {
  await integrationSyncController.createSyncRule(req, res);
});

/**
 * Delete a sync rule
 */
router.delete('/:integrationId/rules/:ruleId', async (req, res) => {
  await integrationSyncController.deleteSyncRule(req, res);
});

/**
 * Test a sync rule with sample data
 */
router.post('/:integrationId/test-rule', async (req, res) => {
  await integrationSyncController.testSyncRule(req, res);
});

/**
 * Get sync statistics and health metrics
 */
router.get('/:integrationId/stats', async (req, res) => {
  await integrationSyncController.getSyncStats(req, res);
});

/**
 * Trigger manual sync
 */
router.post('/:integrationId/sync', async (req, res) => {
  await integrationSyncController.triggerManualSync(req, res);
});

export default router;