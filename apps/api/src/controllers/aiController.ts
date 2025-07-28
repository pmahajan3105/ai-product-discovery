/**
 * AI Controller
 * Handles AI-related API endpoints for categorization, chat, and company profiles
 */

import { Request, Response } from 'express';
import { SessionRequest } from 'supertokens-node/framework/express';
import { companyContextService } from '../services/ai/companyContextService';
import { aiCategorizationService } from '../services/ai/aiCategorizationService';
import { langchainService } from '../services/ai/langchainService';
import { ragChatService } from '../services/ai/ragChatService';
import { aiHealthCheckService } from '../services/ai/healthCheckService';
import { ResponseBuilder } from '../utils/ResponseBuilder';

export class AIController {
  /**
   * Create or update company profile
   */
  async createOrUpdateProfile(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();
      
      if (!userId) {
        ResponseBuilder.error(res, 'User not authenticated', 401);
        return;
      }

      const profile = await companyContextService.createOrUpdateProfile(
        organizationId,
        req.body,
        userId
      );

      ResponseBuilder.success(res, profile, 'Company profile updated successfully');
    } catch (error) {
      console.error('Error updating company profile:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Get company profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      const profile = await companyContextService.getProfile(organizationId);
      
      if (!profile) {
        ResponseBuilder.error(res, 'Company profile not found', 404);
        return;
      }

      ResponseBuilder.success(res, profile);
    } catch (error) {
      console.error('Error getting company profile:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Get company context for AI
   */
  async getCompanyContext(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      
      const context = await companyContextService.getCompanyContext(organizationId);
      
      if (!context) {
        ResponseBuilder.error(res, 'Company context not found', 404);
        return;
      }

      ResponseBuilder.success(res, context);
    } catch (error) {
      console.error('Error getting company context:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Categorize single feedback item
   */
  async categorizeFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { feedbackId, organizationId, title, description, customerInfo, source, metadata } = req.body;

      if (!feedbackId || !organizationId || !title || !description) {
        ResponseBuilder.error(res, 'Missing required fields', 400);
        return;
      }

      const result = await aiCategorizationService.categorizeFeedback({
        feedbackId,
        organizationId,
        title,
        description,
        customerInfo,
        source,
        metadata
      });

      ResponseBuilder.success(res, result, 'Feedback categorized successfully');
    } catch (error) {
      console.error('Error categorizing feedback:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Batch categorize multiple feedback items
   */
  async batchCategorize(req: Request, res: Response): Promise<void> {
    try {
      const { requests } = req.body;

      if (!Array.isArray(requests) || requests.length === 0) {
        ResponseBuilder.error(res, 'Invalid requests array', 400);
        return;
      }

      const result = await aiCategorizationService.batchCategorize(requests);

      ResponseBuilder.success(res, result, 'Batch categorization completed');
    } catch (error) {
      console.error('Error in batch categorization:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Submit user correction for AI learning
   */
  async submitCorrection(req: Request, res: Response): Promise<void> {
    try {
      const { feedbackId, organizationId } = req.params;
      const correction = req.body;

      await aiCategorizationService.recategorizeWithCorrection(
        feedbackId,
        organizationId,
        correction
      );

      ResponseBuilder.success(res, null, 'Correction submitted successfully');
    } catch (error) {
      console.error('Error submitting correction:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Get categorization statistics
   */
  async getCategorizationStats(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await aiCategorizationService.getCategorizationStats(organizationId, days);

      ResponseBuilder.success(res, stats);
    } catch (error) {
      console.error('Error getting categorization stats:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Get items pending manual review
   */
  async getPendingReviewItems(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const threshold = parseFloat(req.query.threshold as string) || 0.7;

      const items = await aiCategorizationService.getPendingReviewItems(organizationId, threshold);

      ResponseBuilder.success(res, items);
    } catch (error) {
      console.error('Error getting pending review items:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Generate insights summary
   */
  async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { feedbackSummary } = req.body;

      if (!feedbackSummary) {
        ResponseBuilder.error(res, 'Feedback summary data required', 400);
        return;
      }

      const insights = await langchainService.generateInsights(organizationId, feedbackSummary);

      ResponseBuilder.success(res, insights, 'Insights generated successfully');
    } catch (error) {
      console.error('Error generating insights:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Chat with feedback data (RAG)
   */
  async chatWithFeedback(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { message, sessionId, context, enableStreaming } = req.body;
      const userId = req.session!.getUserId();

      if (!userId) {
        ResponseBuilder.error(res, 'User not authenticated', 401);
        return;
      }

      if (!message || typeof message !== 'string') {
        ResponseBuilder.error(res, 'Message content required', 400);
        return;
      }

      // Use RAG chat service with optional streaming
      const response = await ragChatService.chat({
        sessionId,
        organizationId,
        userId,
        message,
        context,
        enableStreaming: enableStreaming || false,
      });

      ResponseBuilder.success(res, response, 'Chat response generated');
    } catch (error) {
      console.error('Error in RAG chat:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Create new chat session
   */
  async createChatSession(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { title } = req.body;
      const userId = req.session!.getUserId();

      if (!userId) {
        ResponseBuilder.error(res, 'User not authenticated', 401);
        return;
      }

      const session = await ragChatService.createSession(organizationId, userId, title);

      ResponseBuilder.success(res, session, 'Chat session created');
    } catch (error) {
      console.error('Error creating chat session:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Get chat session
   */
  async getChatSession(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.session!.getUserId();

      if (!userId) {
        ResponseBuilder.error(res, 'User not authenticated', 401);
        return;
      }

      const session = await ragChatService.getSession(sessionId, userId);

      if (!session) {
        ResponseBuilder.error(res, 'Chat session not found', 404);
        return;
      }

      ResponseBuilder.success(res, session);
    } catch (error) {
      console.error('Error getting chat session:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * List chat sessions
   */
  async listChatSessions(req: SessionRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      if (!userId) {
        ResponseBuilder.error(res, 'User not authenticated', 401);
        return;
      }

      const sessions = await ragChatService.listSessions(organizationId, userId);

      ResponseBuilder.success(res, sessions);
    } catch (error) {
      console.error('Error listing chat sessions:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }

  /**
   * Check AI service availability
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const detailed = req.query.detailed === 'true';
      
      if (detailed) {
        // Return comprehensive health status
        const health = await aiHealthCheckService.getSystemHealth();
        ResponseBuilder.success(res, health);
      } else {
        // Return simple availability status
        const availability = await aiHealthCheckService.getAvailabilityStatus();
        ResponseBuilder.success(res, availability);
      }
    } catch (error) {
      console.error('Error checking AI availability:', error);
      ResponseBuilder.error(res, (error as Error).message, 500);
    }
  }
}

export const aiController = new AIController();