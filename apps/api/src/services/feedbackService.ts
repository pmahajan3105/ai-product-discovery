/**
 * Feedback management service
 * Handles all feedback CRUD operations with advanced filtering and search
 */

import { db } from './database';
import { Op, WhereOptions, OrderItem } from 'sequelize';
import { organizationService } from './organizationService';
import { customerProfileService, CustomerSource } from './customerProfileService';

export interface CreateFeedbackData {
  title: string;
  description: string;
  source: string;
  customerId?: string;
  integrationId?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  sourceMetadata?: Record<string, any>;
  metadata?: Record<string, any>;
  // Customer identification fields (for automatic customer creation)
  customerEmail?: string;
  customerName?: string;
  customerCompany?: string;
  customerAvatar?: string;
  externalCustomerId?: string;
}

export interface UpdateFeedbackData {
  title?: string;
  description?: string;
  status?: 'new' | 'triaged' | 'planned' | 'in_progress' | 'resolved' | 'archived';
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  metadata?: Record<string, any>;
}

export interface FeedbackFilters {
  search?: string;
  status?: string[];
  category?: string[];
  assignedTo?: string[];
  customerId?: string[];
  integrationId?: string[];
  priority?: string[];
  source?: string[];
  sentiment?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  hasCustomer?: boolean;
  isAssigned?: boolean;
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  filters: FeedbackFilters;
  createdBy: string;
  organizationId: string;
  isDefault?: boolean;
  isShared?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status' | 'upvoteCount';
  sortOrder?: 'ASC' | 'DESC';
  filters?: FeedbackFilters;
}

export class FeedbackService {
  /**
   * Helper method to check user permissions for organization
   */
  private async checkPermission(organizationId: string, userId: string, allowedRoles: string[]): Promise<void> {
    const role = await organizationService.getUserRole(organizationId, userId);
    if (!role || !allowedRoles.includes(role)) {
      throw new Error('Insufficient permissions');
    }
  }

  /**
   * Create new feedback
   */
  async createFeedback(organizationId: string, data: CreateFeedbackData, userId: string) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member']);

    let customerId = data.customerId;

    // Smart customer identification if customer info is provided but no customerId
    if (!customerId && (data.customerEmail || data.customerName)) {
      try {
        // Map source to CustomerSource enum
        const sourceMap: Record<string, CustomerSource> = {
          'dashboard': CustomerSource.DASHBOARD_MANUAL,
          'widget': CustomerSource.WIDGET_SUBMISSION,
          'slack': CustomerSource.INTEGRATION_SLACK,
          'zendesk': CustomerSource.INTEGRATION_ZENDESK,
          'intercom': CustomerSource.INTEGRATION_INTERCOM,
          'api': CustomerSource.API_IMPORT,
          'csv': CustomerSource.CSV_IMPORT
        };

        const customerSource = sourceMap[data.source.toLowerCase()] || CustomerSource.FEEDBACK_CREATION;

        const customer = await customerProfileService.identifyOrCreateCustomer(
          organizationId,
          {
            email: data.customerEmail,
            name: data.customerName,
            company: data.customerCompany,
            avatar: data.customerAvatar,
            source: customerSource,
            externalId: data.externalCustomerId,
            metadata: {
              feedbackSource: data.source,
              createdViaFeedback: true,
              ...data.sourceMetadata
            }
          },
          userId
        );

        customerId = customer.id;

        // Update customer activity
        await customerProfileService.updateCustomerActivity(
          customerId,
          customerSource,
          {
            action: 'feedback_created',
            feedbackTitle: data.title
          }
        );
      } catch (error) {
        console.warn('Failed to identify/create customer:', error);
        // Continue without customer - feedback can exist without customer
      }
    }

    // Validate customer exists if provided
    if (customerId) {
      const customer = await db.models.Customer.findOne({
        where: { id: customerId, organizationId }
      });
      if (!customer) {
        throw new Error('Customer not found');
      }
    }

    // Validate integration exists if provided
    if (data.integrationId) {
      const integration = await db.models.Integration.findOne({
        where: { id: data.integrationId, organizationId }
      });
      if (!integration) {
        throw new Error('Integration not found');
      }
    }

    // Validate assignee exists if provided
    if (data.assignedTo) {
      const role = await organizationService.getUserRole(organizationId, data.assignedTo);
      if (!role) {
        throw new Error('Assigned user is not a member of this organization');
      }
    }

    const feedback = await db.models.Feedback.create({
      title: data.title,
      description: data.description,
      source: data.source,
      customerId,
      integrationId: data.integrationId,
      category: data.category,
      priority: data.priority,
      assignedTo: data.assignedTo,
      sourceMetadata: data.sourceMetadata,
      metadata: data.metadata,
      organizationId,
      status: 'new',
      upvoteCount: 0
    });

    return this.getFeedbackById(feedback.id, userId);
  }

  /**
   * Get feedback by ID with full details
   */
  async getFeedbackById(feedbackId: string, userId: string) {
    const feedback = await db.models.Feedback.findByPk(feedbackId, {
      include: [
        {
          model: db.models.Organization,
          as: 'organization',
          attributes: ['id', 'name', 'uniqueName']
        },
        {
          model: db.models.Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'company', 'avatar']
        },
        {
          model: db.models.Integration,
          as: 'integration',
          attributes: ['id', 'name', 'type', 'status']
        },
        {
          model: db.models.User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage']
        },
        {
          model: db.models.Comment,
          as: 'comments',
          include: [
            {
              model: db.models.User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!feedback) {
      throw new Error('Feedback not found');
    }

    // Verify user has access to this feedback's organization
    await this.checkPermission(feedback.organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    return feedback;
  }

  /**
   * Get paginated feedback list with filters and advanced search
   */
  async getFeedbackList(organizationId: string, options: FeedbackListOptions, userId: string) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const {
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      filters = {}
    } = options;

    const offset = (page - 1) * limit;

    // Build where conditions
    const where: WhereOptions = {
      organizationId
    };

    // Apply advanced search
    if (filters.search) {
      const searchTerms = filters.search.trim().split(/\s+/);
      const searchConditions = [];

      // Full-text search across multiple fields
      for (const term of searchTerms) {
        const termConditions = [
          { title: { [Op.iLike]: `%${term}%` } },
          { description: { [Op.iLike]: `%${term}%` } },
          { category: { [Op.iLike]: `%${term}%` } },
          { source: { [Op.iLike]: `%${term}%` } }
        ];

        // Add customer name/email search
        const customerSearch = {
          '$customer.name$': { [Op.iLike]: `%${term}%` }
        };
        const customerEmailSearch = {
          '$customer.email$': { [Op.iLike]: `%${term}%` }
        };
        const customerCompanySearch = {
          '$customer.company$': { [Op.iLike]: `%${term}%` }
        };

        // Add assignee search
        const assigneeSearch = {
          [Op.or]: [
            { '$assignee.firstName$': { [Op.iLike]: `%${term}%` } },
            { '$assignee.lastName$': { [Op.iLike]: `%${term}%` } },
            { '$assignee.email$': { [Op.iLike]: `%${term}%` } }
          ]
        };

        searchConditions.push({
          [Op.or]: [
            ...termConditions,
            customerSearch,
            customerEmailSearch,
            customerCompanySearch,
            assigneeSearch
          ]
        });
      }

      // All search terms must match (AND logic)
      where[Op.and] = searchConditions;
    }

    if (filters.status?.length) {
      where.status = { [Op.in]: filters.status };
    }

    if (filters.category?.length) {
      where.category = { [Op.in]: filters.category };
    }

    if (filters.assignedTo?.length) {
      where.assignedTo = { [Op.in]: filters.assignedTo };
    }

    if (filters.customerId?.length) {
      where.customerId = { [Op.in]: filters.customerId };
    }

    if (filters.integrationId?.length) {
      where.integrationId = { [Op.in]: filters.integrationId };
    }

    if (filters.source?.length) {
      where.source = { [Op.in]: filters.source };
    }

    if (filters.sentiment?.length) {
      where.sentiment = { [Op.in]: filters.sentiment };
    }

    if (filters.dateRange) {
      where.createdAt = {
        [Op.between]: [filters.dateRange.start, filters.dateRange.end]
      };
    }

    if (filters.hasCustomer !== undefined) {
      where.customerId = filters.hasCustomer ? { [Op.not]: null } : { [Op.is]: null };
    }

    if (filters.isAssigned !== undefined) {
      where.assignedTo = filters.isAssigned ? { [Op.not]: null } : { [Op.is]: null };
    }

    // Build order
    const order: OrderItem[] = [[sortBy, sortOrder]];

    // Execute query
    const { count, rows } = await db.models.Feedback.findAndCountAll({
      where,
      include: [
        {
          model: db.models.Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'company', 'avatar']
        },
        {
          model: db.models.Integration,
          as: 'integration',
          attributes: ['id', 'name', 'type', 'status']
        },
        {
          model: db.models.User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage']
        }
      ],
      order,
      limit,
      offset
    });

    return {
      feedback: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update feedback
   */
  async updateFeedback(feedbackId: string, data: UpdateFeedbackData, userId: string) {
    const feedback = await db.models.Feedback.findByPk(feedbackId);
    
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    // Verify user has access to organization
    await this.checkPermission(feedback.organizationId, userId, ['owner', 'admin', 'member']);

    // Validate assignee exists if provided
    if (data.assignedTo) {
      const role = await organizationService.getUserRole(feedback.organizationId, data.assignedTo);
      if (!role) {
        throw new Error('Assigned user is not a member of this organization');
      }
    }

    await feedback.update(data);

    return this.getFeedbackById(feedbackId, userId);
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(feedbackId: string, userId: string) {
    const feedback = await db.models.Feedback.findByPk(feedbackId);
    
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    // Verify user has admin access to organization
    await this.checkPermission(feedback.organizationId, userId, ['owner', 'admin']);

    await feedback.destroy();

    return { message: 'Feedback deleted successfully' };
  }

  /**
   * Bulk update feedback status (organization-scoped)
   */
  async bulkUpdateStatus(feedbackIds: string[], status: string, userId: string, organizationId?: string) {
    if (!feedbackIds.length) {
      throw new Error('No feedback IDs provided');
    }

    // Build where clause with organization filtering
    const whereClause: any = { id: { [Op.in]: feedbackIds } };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Get all feedback items to verify permissions
    const feedbackItems = await db.models.Feedback.findAll({
      where: whereClause,
      attributes: ['id', 'organizationId']
    });

    if (feedbackItems.length !== feedbackIds.length) {
      throw new Error('Some feedback items not found or not accessible');
    }

    // Verify user has access to all organizations
    const organizationIds = [...new Set(feedbackItems.map(f => f.organizationId))];
    for (const orgId of organizationIds) {
      await this.checkPermission(orgId, userId, ['owner', 'admin', 'member']);
    }

    // Update all feedback items
    const [updatedCount] = await db.models.Feedback.update(
      { status },
      { where: whereClause }
    );

    return {
      message: `${updatedCount} feedback items updated successfully`,
      updated: updatedCount
    };
  }

  /**
   * Bulk assign feedback (organization-scoped)
   */
  async bulkAssign(feedbackIds: string[], assignedTo: string | null, userId: string, organizationId?: string) {
    if (!feedbackIds.length) {
      throw new Error('No feedback IDs provided');
    }

    // Build where clause with organization filtering
    const whereClause: any = { id: { [Op.in]: feedbackIds } };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    // Get all feedback items to verify permissions
    const feedbackItems = await db.models.Feedback.findAll({
      where: whereClause,
      attributes: ['id', 'organizationId']
    });

    if (feedbackItems.length !== feedbackIds.length) {
      throw new Error('Some feedback items not found or not accessible');
    }

    // Verify user has access to all organizations
    const organizationIds = [...new Set(feedbackItems.map(f => f.organizationId))];
    for (const orgId of organizationIds) {
      await this.checkPermission(orgId, userId, ['owner', 'admin', 'member']);
      
      // Validate assignee exists in all organizations if provided
      if (assignedTo) {
        const role = await organizationService.getUserRole(orgId, assignedTo);
        if (!role) {
          throw new Error('Assigned user is not a member of all organizations');
        }
      }
    }

    // Update all feedback items
    const [updatedCount] = await db.models.Feedback.update(
      { assignedTo },
      { where: whereClause }
    );

    return {
      message: `${updatedCount} feedback items assigned successfully`,
      updated: updatedCount
    };
  }

  /**
   * Add comment to feedback
   */
  async addComment(feedbackId: string, content: string, userId: string, isInternal: boolean = true) {
    const feedback = await db.models.Feedback.findByPk(feedbackId);
    
    if (!feedback) {
      throw new Error('Feedback not found');
    }

    // Verify user has access to organization
    await this.checkPermission(feedback.organizationId, userId, ['owner', 'admin', 'member']);

    const comment = await db.models.Comment.create({
      feedbackId,
      userId,
      content,
      isInternal
    });

    return db.models.Comment.findByPk(comment.id, {
      include: [
        {
          model: db.models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'profileImage']
        }
      ]
    });
  }

  /**
   * Get feedback statistics for organization
   */
  async getFeedbackStats(organizationId: string, userId: string) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const [
      totalCount,
      statusCounts,
      categoryCounts,
      sourceCounts,
      sentimentCounts
    ] = await Promise.all([
      // Total feedback count
      db.models.Feedback.count({ where: { organizationId } }),
      
      // Count by status
      db.models.Feedback.findAll({
        where: { organizationId },
        attributes: [
          'status',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      
      // Count by category
      db.models.Feedback.findAll({
        where: { 
          organizationId,
          category: { [Op.not]: null }
        },
        attributes: [
          'category',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['category'],
        order: [[db.sequelize.literal('count'), 'DESC']],
        limit: 10,
        raw: true
      }),
      
      // Count by source
      db.models.Feedback.findAll({
        where: { organizationId },
        attributes: [
          'source',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['source'],
        raw: true
      }),
      
      // Count by sentiment
      db.models.Feedback.findAll({
        where: { 
          organizationId,
          sentiment: { [Op.not]: null }
        },
        attributes: [
          'sentiment',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
        ],
        group: ['sentiment'],
        raw: true
      })
    ]);

    return {
      total: totalCount,
      byStatus: statusCounts.reduce((acc: any, item: any) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      byCategory: categoryCounts.reduce((acc: any, item: any) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {}),
      bySource: sourceCounts.reduce((acc: any, item: any) => {
        acc[item.source] = parseInt(item.count);
        return acc;
      }, {}),
      bySentiment: sentimentCounts.reduce((acc: any, item: any) => {
        acc[item.sentiment] = parseInt(item.count);
        return acc;
      }, {})
    };
  }

  /**
   * Get available filter options for organization
   */
  async getFilterOptions(organizationId: string, userId: string) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const [categories, sources, assignees, customers, integrations] = await Promise.all([
      // Unique categories
      db.models.Feedback.findAll({
        where: { 
          organizationId,
          category: { [Op.not]: null }
        },
        attributes: [
          [db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']
        ],
        raw: true
      }),
      
      // Unique sources
      db.models.Feedback.findAll({
        where: { organizationId },
        attributes: [
          [db.sequelize.fn('DISTINCT', db.sequelize.col('source')), 'source']
        ],
        raw: true
      }),
      
      // Organization members who can be assigned
      db.models.User.findAll({
        include: [
          {
            model: db.models.Organization,
            as: 'organizations',
            where: { id: organizationId },
            through: { attributes: [] }
          }
        ],
        attributes: ['id', 'firstName', 'lastName', 'email']
      }),
      
      // Organization customers
      db.models.Customer.findAll({
        where: { organizationId },
        attributes: ['id', 'name', 'email', 'company']
      }),
      
      // Organization integrations
      db.models.Integration.findAll({
        where: { organizationId },
        attributes: ['id', 'name', 'type']
      })
    ]);

    return {
      categories: categories.map((c: any) => c.category).filter(Boolean),
      sources: sources.map((s: any) => s.source).filter(Boolean),
      assignees: assignees.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      })),
      customers: customers.map(customer => ({
        id: customer.id,
        name: customer.name || customer.email || 'Unknown',
        company: customer.company
      })),
      integrations: integrations.map(integration => ({
        id: integration.id,
        name: integration.name,
        type: integration.type
      })),
      statuses: ['new', 'triaged', 'planned', 'in_progress', 'resolved', 'archived'],
      priorities: ['low', 'medium', 'high', 'urgent'],
      sentiments: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    };
  }

  /**
   * Save a filter preset
   */
  async saveFilterPreset(
    organizationId: string, 
    name: string, 
    filters: FeedbackFilters, 
    userId: string,
    isShared: boolean = false
  ) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member']);

    // Check if preset name already exists for this user/organization
    const existingPreset = await db.models.FilterPreset.findOne({
      where: {
        name,
        organizationId,
        createdBy: userId
      }
    });

    if (existingPreset) {
      throw new Error('Filter preset with this name already exists');
    }

    const preset = await db.models.FilterPreset.create({
      name,
      filters,
      createdBy: userId,
      organizationId,
      isShared,
      isDefault: false
    });

    return preset;
  }

  /**
   * Get saved filter presets for user/organization
   */
  async getFilterPresets(organizationId: string, userId: string) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const presets = await db.models.FilterPreset.findAll({
      where: {
        organizationId,
        [Op.or]: [
          { createdBy: userId }, // User's own presets
          { isShared: true }     // Shared presets
        ]
      },
      include: [
        {
          model: db.models.User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [
        ['isDefault', 'DESC'],
        ['name', 'ASC']
      ]
    });

    return presets;
  }

  /**
   * Update a filter preset
   */
  async updateFilterPreset(
    presetId: string,
    updates: { name?: string; filters?: FeedbackFilters; isShared?: boolean },
    userId: string
  ) {
    const preset = await db.models.FilterPreset.findByPk(presetId);
    
    if (!preset) {
      throw new Error('Filter preset not found');
    }

    // Verify user owns the preset or has admin access
    if (preset.createdBy !== userId) {
      await this.checkPermission(preset.organizationId, userId, ['owner', 'admin']);
    } else {
      await this.checkPermission(preset.organizationId, userId, ['owner', 'admin', 'member']);
    }

    // Check name uniqueness if updating name
    if (updates.name && updates.name !== preset.name) {
      const existingPreset = await db.models.FilterPreset.findOne({
        where: {
          name: updates.name,
          organizationId: preset.organizationId,
          createdBy: preset.createdBy,
          id: { [Op.not]: presetId }
        }
      });

      if (existingPreset) {
        throw new Error('Filter preset with this name already exists');
      }
    }

    await preset.update(updates);
    return preset;
  }

  /**
   * Delete a filter preset
   */
  async deleteFilterPreset(presetId: string, userId: string) {
    const preset = await db.models.FilterPreset.findByPk(presetId);
    
    if (!preset) {
      throw new Error('Filter preset not found');
    }

    // Verify user owns the preset or has admin access
    if (preset.createdBy !== userId) {
      await this.checkPermission(preset.organizationId, userId, ['owner', 'admin']);
    } else {
      await this.checkPermission(preset.organizationId, userId, ['owner', 'admin', 'member']);
    }

    await preset.destroy();
    return { message: 'Filter preset deleted successfully' };
  }

  /**
   * Set default filter preset for user
   */
  async setDefaultFilterPreset(presetId: string, userId: string) {
    const preset = await db.models.FilterPreset.findByPk(presetId);
    
    if (!preset) {
      throw new Error('Filter preset not found');
    }

    // Verify user has access to organization
    await this.checkPermission(preset.organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    // Remove default flag from all user's presets in this organization
    await db.models.FilterPreset.update(
      { isDefault: false },
      {
        where: {
          organizationId: preset.organizationId,
          createdBy: userId,
          isDefault: true
        }
      }
    );

    // Set this preset as default
    await preset.update({ isDefault: true });
    return preset;
  }

  /**
   * Export feedback data with filters
   */
  async exportFeedback(
    organizationId: string,
    filters: FeedbackFilters,
    format: 'csv' | 'json' | 'xlsx',
    userId: string
  ) {
    // Verify user has access to organization
    await this.checkPermission(organizationId, userId, ['owner', 'admin', 'member']);

    // Get all feedback matching filters (no pagination for export)
    const { feedback } = await this.getFeedbackList(organizationId, {
      filters,
      limit: 10000, // Large limit for export
      page: 1
    }, userId);

    // Format data for export
    const exportData = feedback.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
      category: item.category,
      source: item.source,
      sentiment: item.sentiment,
      upvoteCount: item.upvoteCount,
      customerName: item.customer?.name || '',
      customerEmail: item.customer?.email || '',
      customerCompany: item.customer?.company || '',
      assigneeName: item.assignee ? `${item.assignee.firstName} ${item.assignee.lastName}` : '',
      assigneeEmail: item.assignee?.email || '',
      integrationName: item.integration?.name || '',
      integrationType: item.integration?.type || '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return {
      data: exportData,
      format,
      filename: `feedback-export-${new Date().toISOString().split('T')[0]}.${format}`,
      totalCount: exportData.length
    };
  }
}

export const feedbackService = new FeedbackService();