/**
 * Webhook Routes
 * API routes for handling webhooks from external integrations
 */

import express from 'express';
import { webhookController } from '../controllers/webhookController';

const router = express.Router();

/**
 * Slack webhook endpoint
 * Handles events from Slack (messages, reactions, etc.)
 */
router.post('/slack', async (req, res) => {
  await webhookController.handleSlackWebhook(req, res);
});

/**
 * Zendesk webhook endpoint  
 * Handles ticket creation and updates from Zendesk
 */
router.post('/zendesk', async (req, res) => {
  await webhookController.handleZendeskWebhook(req, res);
});

/**
 * Intercom webhook endpoint
 * Handles conversation events from Intercom
 */
router.post('/intercom', async (req, res) => {
  await webhookController.handleIntercomWebhook(req, res);
});

/**
 * Health check endpoint for webhook validation
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    webhooks: ['slack', 'zendesk', 'intercom']
  });
});

export default router;