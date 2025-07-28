/**
 * Create Organizations Table Migration
 * Sets up the main organization table with all necessary fields and constraints
 */

import { BaseMigration, MigrationContext } from '../../BaseMigration';

export default class CreateOrganizationsTableMigration extends BaseMigration {
  constructor() {
    super({
      name: 'create-organizations-table',
      version: '1.0.0',
      description: 'Create organizations table with audit fields and constraints',
      estimatedTime: '< 1 minute',
      dependencies: []
    });
  }

  async run(context: MigrationContext): Promise<void> {
    this.logProgress(context, 'Creating organizations table');
    
    try {
      // Create organizations table
      await this.createTableWithAudit(context, 'organizations', {
        id: {
          type: context.dataTypes.UUID,
          primaryKey: true,
          defaultValue: context.dataTypes.UUIDV4,
          comment: 'Organization unique identifier'
        },
        name: {
          type: context.dataTypes.STRING(255),
          allowNull: false,
          comment: 'Organization name'
        },
        slug: {
          type: context.dataTypes.STRING(100),
          allowNull: false,
          unique: true,
          comment: 'URL-friendly organization identifier'
        },
        domain: {
          type: context.dataTypes.STRING(255),
          allowNull: true,
          comment: 'Organization domain (e.g., company.com)'
        },
        settings: {
          type: context.dataTypes.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Organization configuration settings'
        },
        subscription_plan: {
          type: context.dataTypes.ENUM('free', 'starter', 'professional', 'enterprise'),
          allowNull: false,
          defaultValue: 'free',
          comment: 'Current subscription plan'
        },
        subscription_status: {
          type: context.dataTypes.ENUM('active', 'canceled', 'past_due', 'trialing'),
          allowNull: false,
          defaultValue: 'active',
          comment: 'Subscription status'
        },
        trial_ends_at: {
          type: context.dataTypes.DATE,
          allowNull: true,
          comment: 'When trial period ends'
        },
        billing_email: {
          type: context.dataTypes.STRING(255),
          allowNull: true,
          comment: 'Email for billing notifications'
        },
        is_active: {
          type: context.dataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Whether organization is active'
        },
        metadata: {
          type: context.dataTypes.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Additional metadata'
        }
      }, {
        comment: 'Organizations - main tenant table for multi-tenancy'
      });

      // Create standard indexes
      await this.createStandardIndexes(context, 'organizations', [
        {
          name: 'idx_organizations_slug',
          fields: ['slug'],
          unique: true
        },
        {
          name: 'idx_organizations_domain',
          fields: ['domain']
        },
        {
          name: 'idx_organizations_subscription',
          fields: ['subscription_plan', 'subscription_status']
        },
        {
          name: 'idx_organizations_active',
          fields: ['is_active']
        }
      ]);

      // Add audit triggers for PostgreSQL
      await this.addAuditTriggers(context, 'organizations');

      // Add check constraints
      await this.executeSQL(context, `
        ALTER TABLE organizations 
        ADD CONSTRAINT chk_organizations_slug_format 
        CHECK (slug ~* '^[a-z0-9-]+$' AND length(slug) >= 2);
      `);

      await this.executeSQL(context, `
        ALTER TABLE organizations 
        ADD CONSTRAINT chk_organizations_name_length 
        CHECK (length(trim(name)) >= 1);
      `);

      // Validate data integrity
      await this.validateDataIntegrity(context, [
        {
          name: 'organizations_table_created',
          sql: `SELECT COUNT(*) as count FROM information_schema.tables 
                WHERE table_name = 'organizations'`,
          expectedResult: { count: '1' }
        }
      ]);

      this.logProgress(context, 'Organizations table created successfully', {
        tableCreated: 'organizations',
        indexesCreated: 5,
        constraintsAdded: 2
      });

    } catch (error) {
      this.logProgress(context, 'Failed to create organizations table', { 
        error: error.message 
      });
      throw error;
    }
  }

  async rollback(context: MigrationContext): Promise<void> {
    this.logProgress(context, 'Rolling back organizations table creation');
    
    try {
      // Check if table exists before attempting to drop
      const tableExists = await this.tableExists(context, 'organizations');
      
      if (tableExists) {
        // Drop triggers first
        await this.executeSQL(context, `
          DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
          DROP FUNCTION IF EXISTS update_organizations_updated_at();
        `);

        // Drop table (indexes and constraints are automatically dropped)
        await context.queryInterface.dropTable('organizations', {
          transaction: context.transaction
        });

        this.logProgress(context, 'Organizations table dropped successfully');
      } else {
        this.logProgress(context, 'Organizations table does not exist, skipping rollback');
      }

    } catch (error) {
      this.logProgress(context, 'Failed to rollback organizations table', { 
        error: error.message 
      });
      throw error;
    }
  }

  async validate(context: MigrationContext): Promise<boolean> {
    try {
      // Check if we can create an organization (validates constraints)
      const testOrg = {
        name: 'Test Organization',
        slug: 'test-org-' + Date.now(),
        subscription_plan: 'free',
        subscription_status: 'active'
      };

      await this.executeSQL(context, `
        INSERT INTO organizations (id, name, slug, subscription_plan, subscription_status, is_active)
        VALUES (gen_random_uuid(), :name, :slug, :plan, :status, true)
      `, {
        name: testOrg.name,
        slug: testOrg.slug,
        plan: testOrg.subscription_plan,
        status: testOrg.subscription_status
      });

      // Clean up test data
      await this.executeSQL(context, `
        DELETE FROM organizations WHERE slug = :slug
      `, { slug: testOrg.slug });

      return true;

    } catch (error) {
      context.logger.error('Organizations table validation failed', error);
      return false;
    }
  }
}