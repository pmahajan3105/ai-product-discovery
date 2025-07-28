/**
 * AI Routes
 * API endpoints for AI-powered feedback analysis and chat
 */

import { Router } from 'express';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { aiController } from '../controllers/aiController';
import { aiErrorHandler } from '../middleware/aiErrorHandler';

const router = Router();

// Apply authentication to all AI routes
router.use(verifySession());

// Company Profile Management
router.post('/organizations/:organizationId/profile', 
  aiController.createOrUpdateProfile.bind(aiController)
);

router.get('/organizations/:organizationId/profile',
  
  aiController.getProfile.bind(aiController)
);

router.get('/organizations/:organizationId/context',
  
  aiController.getCompanyContext.bind(aiController)
);

// Feedback Categorization
router.post('/categorize/single',
  
  aiController.categorizeFeedback.bind(aiController)
);

router.post('/categorize/batch',
  
  aiController.batchCategorize.bind(aiController)
);

router.post('/organizations/:organizationId/feedback/:feedbackId/correction',
  
  aiController.submitCorrection.bind(aiController)
);

// Analytics and Stats
router.get('/organizations/:organizationId/categorization/stats',
  
  aiController.getCategorizationStats.bind(aiController)
);

router.get('/organizations/:organizationId/review/pending',
  
  aiController.getPendingReviewItems.bind(aiController)
);

// Insights Generation
router.post('/organizations/:organizationId/insights/generate',
  
  aiController.generateInsights.bind(aiController)
);

// RAG Chat
router.post('/organizations/:organizationId/chat',
  
  aiController.chatWithFeedback.bind(aiController)
);

// Chat Session Management
router.post('/organizations/:organizationId/chat/sessions',
  
  aiController.createChatSession.bind(aiController)
);

router.get('/organizations/:organizationId/chat/sessions',
  
  aiController.listChatSessions.bind(aiController)
);

router.get('/chat/sessions/:sessionId',
  
  aiController.getChatSession.bind(aiController)
);

// System Status
router.get('/availability',
  aiController.checkAvailability.bind(aiController)
);

// Apply AI-specific error handling to all routes
router.use(aiErrorHandler);

export default router;