/**
 * Organization Controller
 * Handles all organization-related HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { organizationService, CreateOrganizationData, UpdateOrganizationData, OrganizationMember } from '../services/organizationService';
import { SessionRequest } from 'supertokens-node/framework/express';
import Joi from 'joi';

// Validation schemas
const createOrganizationSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  uniqueName: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).required(),
  image: Joi.string().uri().optional()
});

const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  image: Joi.string().uri().optional()
});

const addMemberSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid('owner', 'admin', 'member', 'viewer').required()
});

const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid('owner', 'admin', 'member', 'viewer').required()
});

const checkUniqueNameSchema = Joi.object({
  uniqueName: Joi.string().min(3).max(50).pattern(/^[a-z0-9-]+$/).required()
});

export class OrganizationController {
  /**
   * Create new organization
   */
  async createOrganization(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = createOrganizationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const organization = await organizationService.createOrganization(value as CreateOrganizationData, userId);

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;

      const organization = await organizationService.getOrganizationById(organizationId);

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.session!.getUserId();

      const organizations = await organizationService.getUserOrganizations(userId);

      res.json({
        success: true,
        data: organizations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = updateOrganizationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const organization = await organizationService.updateOrganization(organizationId, value as UpdateOrganizationData, userId);

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const result = await organizationService.deleteOrganization(organizationId, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member to organization
   */
  async addMember(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = addMemberSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const organization = await organizationService.addMember(organizationId, value as OrganizationMember, userId);

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, userId: targetUserId } = req.params;
      const userId = req.session!.getUserId();

      // Validate request body
      const { error, value } = updateMemberRoleSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const organization = await organizationService.updateMemberRole(organizationId, targetUserId, value.role, userId);

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId, userId: targetUserId } = req.params;
      const userId = req.session!.getUserId();

      const result = await organizationService.removeMember(organizationId, targetUserId, userId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const stats = await organizationService.getOrganizationStats(organizationId, userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if unique name is available
   */
  async checkUniqueName(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate query parameter
      const { error, value } = checkUniqueNameSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          error: 'Validation Error',
          details: error.details.map(d => d.message)
        });
      }

      const available = await organizationService.isUniqueNameAvailable(value.uniqueName);

      res.json({
        success: true,
        data: {
          uniqueName: value.uniqueName,
          available
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's role in organization
   */
  async getUserRole(req: SessionRequest, res: Response, next: NextFunction) {
    try {
      const { organizationId } = req.params;
      const userId = req.session!.getUserId();

      const role = await organizationService.getUserRole(organizationId, userId);

      res.json({
        success: true,
        data: {
          userId,
          organizationId,
          role
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const organizationController = new OrganizationController();