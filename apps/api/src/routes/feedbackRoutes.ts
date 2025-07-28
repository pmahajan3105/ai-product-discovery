/**
 * Feedback Routes
 * RESTful API endpoints for feedback management
 * Updated to use actual FeedbackController implementations
 */

import { Router, Response } from 'express';
import { requireOrganizationAccess } from '../middleware/authorizationMiddleware';
import { feedbackController } from '../controllers/feedbackController';
import { SessionRequest } from 'supertokens-node/framework/express';
import { 
  VIEW_FEEDBACK, 
  CREATE_FEEDBACK, 
  UPDATE_FEEDBACK, 
  DELETE_FEEDBACK,
  ASSIGN_FEEDBACK
} from '../permissions/PermissionConfig';

const router = Router();

/**
 * GET /api/organizations/:organizationId/feedback
 * Get paginated feedback list with filtering
 */
router.get('/',
  requireOrganizationAccess([VIEW_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.getFeedbackList(req, res, () => {});
  }
);

/**
 * POST /api/organizations/:organizationId/feedback
 * Create new feedback
 */
router.post('/',
  requireOrganizationAccess([CREATE_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.createFeedback(req, res, () => {});
  }
);

/**
 * GET /api/organizations/:organizationId/feedback/stats
 * Get feedback statistics
 */
router.get('/stats',
  requireOrganizationAccess([VIEW_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.getFeedbackStats(req, res, () => {});
  }
);

/**
 * GET /api/organizations/:organizationId/feedback/filter-options
 * Get available filter options
 */
router.get('/filter-options',
  requireOrganizationAccess([VIEW_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.getFilterOptions(req, res, () => {});
  }
);

/**
 * GET /api/organizations/:organizationId/feedback/:feedbackId
 * Get feedback by ID
 */
router.get('/:feedbackId',
  requireOrganizationAccess([VIEW_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.getFeedbackById(req, res, () => {});
  }
);

/**
 * PATCH /api/organizations/:organizationId/feedback/:feedbackId
 * Update feedback
 */
router.patch('/:feedbackId',
  requireOrganizationAccess([UPDATE_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.updateFeedback(req, res, () => {});
  }
);

/**
 * DELETE /api/organizations/:organizationId/feedback/:feedbackId
 * Delete feedback
 */
router.delete('/:feedbackId',
  requireOrganizationAccess([DELETE_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.deleteFeedback(req, res, () => {});
  }
);

/**
 * POST /api/organizations/:organizationId/feedback/:feedbackId/comments
 * Add comment to feedback
 */
router.post('/:feedbackId/comments',
  requireOrganizationAccess([VIEW_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.addComment(req, res, () => {});
  }
);

/**
 * POST /api/organizations/:organizationId/feedback/bulk/update-status
 * Bulk update feedback status
 */
router.post('/bulk/update-status',
  requireOrganizationAccess([UPDATE_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.bulkUpdateStatus(req, res, () => {});
  }
);

/**
 * POST /api/organizations/:organizationId/feedback/bulk/assign
 * Bulk assign feedback
 */
router.post('/bulk/assign',
  requireOrganizationAccess([ASSIGN_FEEDBACK]),
  async (req: SessionRequest, res: Response) => {
    await feedbackController.bulkAssign(req, res, () => {});
  }
);

export default router;