/**
 * Feedback Controller
 * Handles all feedback-related HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { feedbackService, CreateFeedbackData, UpdateFeedbackData, FeedbackListOptions } from '../services/feedbackService';
import { SessionRequest } from 'supertokens-node/framework/express';
import Joi from 'joi';

// Validation schemas
const createFeedbackSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().min(1).required(),
  source: Joi.string().required(),
  customerId: Joi.string().uuid().optional(),
  integrationId: Joi.string().uuid().optional(),
  category: Joi.string().max(100).optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: Joi.string().uuid().optional(),
  sourceMetadata: Joi.object().optional(),
  metadata: Joi.object().optional()
});

const updateFeedbackSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().min(1).optional(),
  status: Joi.string().valid('new', 'triaged', 'planned', 'in_progress', 'resolved', 'archived').optional(),
  category: Joi.string().max(100).optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  assignedTo: Joi.string().uuid().optional(),
  metadata: Joi.object().optional()
});

const feedbackListSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'status', 'upvoteCount').optional(),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
  search: Joi.string().optional(),
  status: Joi.string().optional(),
  category: Joi.string().optional(),
  assignedTo: Joi.string().optional(),
  customerId: Joi.string().optional(),
  integrationId: Joi.string().optional(),
  priority: Joi.string().optional(),
  source: Joi.string().optional(),
  sentiment: Joi.string().optional(),
  dateStart: Joi.date().iso().optional(),
  dateEnd: Joi.date().iso().optional(),
  hasCustomer: Joi.boolean().optional(),
  isAssigned: Joi.boolean().optional()
});

const bulkUpdateSchema = Joi.object({
  feedbackIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  status: Joi.string().valid('new', 'triaged', 'planned', 'in_progress', 'resolved', 'archived').required()
});

const bulkAssignSchema = Joi.object({
  feedbackIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  assignedTo: Joi.string().uuid().allow(null).required()
});

const addCommentSchema = Joi.object({
  content: Joi.string().min(1).required(),
  isInternal: Joi.boolean().optional().default(true)
});

export class FeedbackController {
  /**
   * Create new feedback
   */
  async createFeedback(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = createFeedbackSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const feedback = await feedbackService.createFeedback(organizationId, value as CreateFeedbackData, userId);

      res.status(201).json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userId = req.session!.getUserId();

      const feedback = await feedbackService.getFeedbackById(feedbackId, userId);

      res.json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get paginated feedback list with filters
   */
  async getFeedbackList(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate query parameters
      const { error, value } = feedbackListSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      // Parse filters from query params
      const options: FeedbackListOptions = {
        page: value.page,
        limit: value.limit,
        sortBy: value.sortBy,
        sortOrder: value.sortOrder,
        filters: {}
      };

      // Build filters object
      if (value.search) options.filters!.search = value.search;
      if (value.status) options.filters!.status = value.status.split(',');
      if (value.category) options.filters!.category = value.category.split(',');
      if (value.assignedTo) options.filters!.assignedTo = value.assignedTo.split(',');
      if (value.customerId) options.filters!.customerId = value.customerId.split(',');
      if (value.integrationId) options.filters!.integrationId = value.integrationId.split(',');
      if (value.priority) options.filters!.priority = value.priority.split(',');
      if (value.source) options.filters!.source = value.source.split(',');
      if (value.sentiment) options.filters!.sentiment = value.sentiment.split(',');
      if (value.dateStart && value.dateEnd) {
        options.filters!.dateRange = {
          start: value.dateStart.toISOString(),
          end: value.dateEnd.toISOString()
        };
      }
      if (value.hasCustomer !== undefined) options.filters!.hasCustomer = value.hasCustomer;
      if (value.isAssigned !== undefined) options.filters!.isAssigned = value.isAssigned;

      const result = await feedbackService.getFeedbackList(organizationId, options, userId);

      res.json({
        success: true,
        data: result.feedback,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update feedback
   */
  async updateFeedback(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = updateFeedbackSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const feedback = await feedbackService.updateFeedback(feedbackId, value as UpdateFeedbackData, userId);

      res.json({
        success: true,
        data: feedback
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userId = req.session!.getUserId();

      const result = await feedbackService.deleteFeedback(feedbackId, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update feedback status (organization-scoped)
   */
  async bulkUpdateStatus(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = bulkUpdateSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const result = await feedbackService.bulkUpdateStatus(value.feedbackIds, value.status, userId, organizationId);

      res.json({
        success: true,
        message: result.message,
        updated: result.updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk assign feedback (organization-scoped)
   */
  async bulkAssign(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = bulkAssignSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const result = await feedbackService.bulkAssign(value.feedbackIds, value.assignedTo, userId, organizationId);

      res.json({
        success: true,
        message: result.message,
        updated: result.updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add comment to feedback
   */
  async addComment(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = addCommentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const comment = await feedbackService.addComment(feedbackId, value.content, userId, value.isInternal);

      res.status(201).json({
        success: true,
        data: comment
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const stats = await feedbackService.getFeedbackStats(organizationId, userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get filter options
   */
  async getFilterOptions(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const options = await feedbackService.getFilterOptions(organizationId, userId);

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export feedback data
   */
  async exportFeedback(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();
      const { format = 'csv', filters } = req.query;

      const exportData = await feedbackService.exportFeedback(
        organizationId,
        filters as any || {},
        format as 'csv' | 'json' | 'xlsx',
        userId
      );

      // Set appropriate headers for file download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `feedback-export-${timestamp}.${format}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      
      res.send(exportData);
    } catch (error) {
      next(error);
    }
  }
}

export const feedbackController = new FeedbackController();