/**
 * Organization management service
 * Handles organization CRUD operations and user relationships
 */

import { db } from './database';
import { Op } from 'sequelize';

export interface CreateOrganizationData {
  name: string;
  description?: string;
  uniqueName: string;
  image?: string;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  image?: string;
}

export interface OrganizationMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invitedBy?: string;
}

export class OrganizationService {
  /**
   * Create a new organization with the creator as owner
   */
  async createOrganization(data: CreateOrganizationData, createdBy: string) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Check if unique name is available
      const existingOrg = await db.models.Organization.findOne({
        where: { uniqueName: data.uniqueName }
      });

      if (existingOrg) {
        throw new Error('Organization name is already taken');
      }

      // Create organization
      const organization = await db.models.Organization.create({
        ...data,
        createdBy
      }, { transaction });

      // Add creator as owner
      await db.models.OrganizationUser.create({
        organizationId: organization.id,
        userId: createdBy,
        role: 'owner',
        joinedAt: new Date()
      }, { transaction });

      await transaction.commit();

      return this.getOrganizationById(organization.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get organization by ID with members
   */
  async getOrganizationById(organizationId: string) {
    const organization = await db.models.Organization.findByPk(organizationId, {
      include: [
        {
          model: db.models.User,
          as: 'users',
          through: {
            attributes: ['role', 'joinedAt'],
            as: 'membership'
          },
          attributes: ['id', 'email', 'firstName', 'lastName', 'profileImage', 'lastActivityTime']
        },
        {
          model: db.models.User,
          as: 'creator',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    return organization;
  }

  /**
   * Get organizations for a user
   */
  async getUserOrganizations(userId: string) {
    const organizations = await db.models.Organization.findAll({
      include: [
        {
          model: db.models.User,
          as: 'users',
          where: { id: userId },
          through: {
            attributes: ['role', 'joinedAt'],
            as: 'membership'
          }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return organizations;
  }

  /**
   * Update organization details
   */
  async updateOrganization(organizationId: string, data: UpdateOrganizationData, userId: string) {
    // Check if user has admin permissions
    await this.requirePermission(organizationId, userId, ['owner', 'admin']);

    const [updatedCount] = await db.models.Organization.update(data, {
      where: { id: organizationId }
    });

    if (updatedCount === 0) {
      throw new Error('Organization not found or no changes made');
    }

    return this.getOrganizationById(organizationId);
  }

  /**
   * Delete organization (owner only)
   */
  async deleteOrganization(organizationId: string, userId: string) {
    // Check if user is owner
    await this.requirePermission(organizationId, userId, ['owner']);

    const transaction = await db.sequelize.transaction();

    try {
      // Delete all organization data (cascade will handle relationships)
      await db.models.Organization.destroy({
        where: { id: organizationId },
        transaction
      });

      await transaction.commit();
      return { message: 'Organization deleted successfully' };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add member to organization
   */
  async addMember(organizationId: string, memberData: OrganizationMember, invitedBy: string) {
    // Check if inviter has admin permissions
    await this.requirePermission(organizationId, invitedBy, ['owner', 'admin']);

    // Check if user is already a member
    const existingMember = await db.models.OrganizationUser.findOne({
      where: {
        organizationId,
        userId: memberData.userId
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    // Add member
    await db.models.OrganizationUser.create({
      organizationId,
      userId: memberData.userId,
      role: memberData.role,
      invitedBy,
      joinedAt: new Date()
    });

    return this.getOrganizationById(organizationId);
  }

  /**
   * Update member role
   */
  async updateMemberRole(organizationId: string, userId: string, newRole: string, updatedBy: string) {
    // Check if updater has admin permissions
    await this.requirePermission(organizationId, updatedBy, ['owner', 'admin']);

    // Don't allow changing the owner role (business rule)
    const currentMember = await db.models.OrganizationUser.findOne({
      where: { organizationId, userId }
    });

    if (!currentMember) {
      throw new Error('User is not a member of this organization');
    }

    if (currentMember.role === 'owner' && newRole !== 'owner') {
      throw new Error('Cannot change owner role. Transfer ownership first.');
    }

    await db.models.OrganizationUser.update(
      { role: newRole },
      { where: { organizationId, userId } }
    );

    return this.getOrganizationById(organizationId);
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, userId: string, removedBy: string) {
    // Check if remover has admin permissions
    await this.requirePermission(organizationId, removedBy, ['owner', 'admin']);

    // Don't allow removing the owner
    const member = await db.models.OrganizationUser.findOne({
      where: { organizationId, userId }
    });

    if (!member) {
      throw new Error('User is not a member of this organization');
    }

    if (member.role === 'owner') {
      throw new Error('Cannot remove organization owner');
    }

    await db.models.OrganizationUser.destroy({
      where: { organizationId, userId }
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string, userId: string) {
    // Verify user has access to organization
    await this.requirePermission(organizationId, userId, ['owner', 'admin', 'member', 'viewer']);

    const [memberCount, feedbackCount, customerCount, integrationCount] = await Promise.all([
      db.models.OrganizationUser.count({ where: { organizationId } }),
      db.models.Feedback.count({ where: { organizationId } }),
      db.models.Customer.count({ where: { organizationId } }),
      db.models.Integration.count({ where: { organizationId } })
    ]);

    // Get feedback by status
    const feedbackByStatus = await db.models.Feedback.findAll({
      where: { organizationId },
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    return {
      members: memberCount,
      feedback: feedbackCount,
      customers: customerCount,
      integrations: integrationCount,
      feedbackByStatus: feedbackByStatus.reduce((acc: any, item: any) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {})
    };
  }

  /**
   * Check user permission for organization
   */
  async getUserRole(organizationId: string, userId: string): Promise<string | null> {
    const membership = await db.models.OrganizationUser.findOne({
      where: { organizationId, userId },
      attributes: ['role']
    });

    return membership?.role || null;
  }

  /**
   * Require specific permission levels
   */
  private async requirePermission(organizationId: string, userId: string, allowedRoles: string[]) {
    const role = await this.getUserRole(organizationId, userId);
    
    if (!role || !allowedRoles.includes(role)) {
      throw new Error('Insufficient permissions');
    }

    return role;
  }

  /**
   * Check if unique name is available
   */
  async isUniqueNameAvailable(uniqueName: string): Promise<boolean> {
    const existingOrg = await db.models.Organization.findOne({
      where: { uniqueName }
    });

    return !existingOrg;
  }
}

export const organizationService = new OrganizationService();