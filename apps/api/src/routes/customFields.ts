/**
 * Custom Fields Routes
 * API routes for custom field management
 */

import { Router } from 'express';
import { customFieldsController } from '../controllers/customFieldsController';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';

export const customFieldsRouter = Router();

// Organization-level custom field management
customFieldsRouter.post(
  '/organizations/:organizationId/custom-fields',
  verifySession(),
  customFieldsController.createCustomField.bind(customFieldsController)
);

customFieldsRouter.get(
  '/organizations/:organizationId/custom-fields',
  verifySession(),
  customFieldsController.getCustomFields.bind(customFieldsController)
);

customFieldsRouter.put(
  '/organizations/:organizationId/custom-fields/:fieldId',
  verifySession(),
  customFieldsController.updateCustomField.bind(customFieldsController)
);

customFieldsRouter.delete(
  '/organizations/:organizationId/custom-fields/:fieldId',
  verifySession(),
  customFieldsController.deleteCustomField.bind(customFieldsController)
);

customFieldsRouter.put(
  '/organizations/:organizationId/custom-fields/reorder',
  verifySession(),
  customFieldsController.reorderCustomFields.bind(customFieldsController)
);

// Feedback-specific custom field values
customFieldsRouter.put(
  '/feedback/:feedbackId/custom-fields',
  verifySession(),
  customFieldsController.setFeedbackCustomFields.bind(customFieldsController)
);

customFieldsRouter.get(
  '/feedback/:feedbackId/custom-fields',
  verifySession(),
  customFieldsController.getFeedbackCustomFields.bind(customFieldsController)
);