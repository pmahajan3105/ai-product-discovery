/**
 * Feedback Routes
 * RESTful API endpoints for feedback management
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { feedbackController } from '../controllers/feedbackController';

const router = Router();

// All feedback routes require authentication
router.use(verifySession());

/**
 * Organization-specific feedback routes
 */

// POST /api/organizations/:organizationId/feedback - Create new feedback
router.post('/:organizationId/feedback', feedbackController.createFeedback.bind(feedbackController));

// GET /api/organizations/:organizationId/feedback - Get feedback list with filters
router.get('/:organizationId/feedback', feedbackController.getFeedbackList.bind(feedbackController));

// GET /api/organizations/:organizationId/feedback/stats - Get feedback statistics
router.get('/:organizationId/feedback/stats', feedbackController.getFeedbackStats.bind(feedbackController));

// GET /api/organizations/:organizationId/feedback/filters - Get available filter options
router.get('/:organizationId/feedback/filters', feedbackController.getFilterOptions.bind(feedbackController));

// GET /api/organizations/:organizationId/feedback/export - Export feedback data
router.get('/:organizationId/feedback/export', feedbackController.exportFeedback.bind(feedbackController));

/**
 * Individual feedback routes
 */

// GET /api/feedback/:feedbackId - Get feedback by ID
router.get('/feedback/:feedbackId', feedbackController.getFeedbackById.bind(feedbackController));

// PUT /api/feedback/:feedbackId - Update feedback
router.put('/feedback/:feedbackId', feedbackController.updateFeedback.bind(feedbackController));

// DELETE /api/feedback/:feedbackId - Delete feedback
router.delete('/feedback/:feedbackId', feedbackController.deleteFeedback.bind(feedbackController));

// POST /api/feedback/:feedbackId/comments - Add comment to feedback
router.post('/feedback/:feedbackId/comments', feedbackController.addComment.bind(feedbackController));

/**
 * Bulk operations (organization-scoped)
 */

// PUT /api/organizations/:organizationId/feedback/bulk/status - Bulk update feedback status
router.put('/:organizationId/feedback/bulk/status', feedbackController.bulkUpdateStatus.bind(feedbackController));

// PUT /api/organizations/:organizationId/feedback/bulk/assign - Bulk assign feedback
router.put('/:organizationId/feedback/bulk/assign', feedbackController.bulkAssign.bind(feedbackController));

export default router;