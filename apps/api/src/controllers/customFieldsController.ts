/**
 * Custom Fields Controller
 * Handles HTTP requests for custom field management
 */

import { Response, NextFunction } from 'express';
import { customFieldsService, CreateCustomFieldRequest, UpdateCustomFieldRequest, CustomFieldValue } from '../services/customFieldsService';
import { SessionRequest } from 'supertokens-node/framework/express';
import Joi from 'joi';

// Validation schemas
const createCustomFieldSchema = Joi.object({
  name: Joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9_]+$/).required(),
  label: Joi.string().min(1).max(100).required(),
  type: Joi.string().valid('text', 'number', 'boolean', 'date', 'select', 'multiselect', 'url', 'email').required(),
  required: Joi.boolean().optional(),
  options: Joi.array().items(Joi.string().min(1).max(100)).optional(),
  placeholder: Joi.string().max(200).optional(),
  helpText: Joi.string().max(500).optional(),
  validation: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    pattern: Joi.string().optional(),
    maxLength: Joi.number().min(1).max(10000).optional()
  }).optional()
});

const updateCustomFieldSchema = Joi.object({
  label: Joi.string().min(1).max(100).optional(),
  required: Joi.boolean().optional(),
  options: Joi.array().items(Joi.string().min(1).max(100)).optional(),
  placeholder: Joi.string().max(200).optional(),
  helpText: Joi.string().max(500).optional(),
  validation: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    pattern: Joi.string().optional(),
    maxLength: Joi.number().min(1).max(10000).optional()
  }).optional(),
  isActive: Joi.boolean().optional()
});

const reorderFieldsSchema = Joi.object({
  fieldIds: Joi.array().items(Joi.string()).min(1).required()
});

const setFieldValuesSchema = Joi.object({
  values: Joi.array().items(
    Joi.object({
      fieldId: Joi.string().required(),
      value: Joi.any().required(),
      displayValue: Joi.string().optional()
    })
  ).required()
});

export class CustomFieldsController {
  /**
   * Create new custom field definition
   */
  async createCustomField(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = createCustomFieldSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const customField = await customFieldsService.createCustomField(
        organizationId,
        value as CreateCustomFieldRequest,
        userId
      );

      res.status(201).json({
        success: true,
        data: customField
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all custom field definitions for organization
   */
  async getCustomFields(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const customFields = await customFieldsService.getCustomFields(organizationId, userId);

      res.json({
        success: true,
        data: customFields
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update custom field definition
   */
  async updateCustomField(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, fieldId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = updateCustomFieldSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const customField = await customFieldsService.updateCustomField(
        organizationId,
        fieldId,
        value as UpdateCustomFieldRequest,
        userId
      );

      res.json({
        success: true,
        data: customField
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete custom field definition
   */
  async deleteCustomField(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, fieldId } = req.params;
      const userId = req.session!.getUserId();

      await customFieldsService.deleteCustomField(organizationId, fieldId, userId);

      res.json({
        success: true,
        message: 'Custom field deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reorder custom fields
   */
  async reorderCustomFields(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = reorderFieldsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const customFields = await customFieldsService.reorderCustomFields(
        organizationId,
        value.fieldIds,
        userId
      );

      res.json({
        success: true,
        data: customFields
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set custom field values for feedback
   */
  async setFeedbackCustomFields(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = setFieldValuesSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      await customFieldsService.setFeedbackCustomFields(
        feedbackId,
        value.values as CustomFieldValue[],
        userId
      );

      res.json({
        success: true,
        message: 'Custom field values updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get custom field values for feedback
   */
  async getFeedbackCustomFields(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userId = req.session!.getUserId();

      const customFields = await customFieldsService.getFeedbackCustomFieldsWithDefinitions(
        feedbackId,
        userId
      );

      res.json({
        success: true,
        data: customFields
      });
    } catch (error) {
      next(error);
    }
  }
}

export const customFieldsController = new CustomFieldsController();