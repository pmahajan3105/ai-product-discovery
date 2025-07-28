/**
 * Migration: Add Performance Indexes
 * Adds critical indexes for optimal query performance
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Adding performance indexes...');

    // Feedback table indexes for common queries
    await queryInterface.addIndex('feedback', ['organization_id'], {
      name: 'idx_feedback_organization_id'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'status'], {
      name: 'idx_feedback_org_status'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'created_at'], {
      name: 'idx_feedback_org_created'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'priority'], {
      name: 'idx_feedback_org_priority'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'category'], {
      name: 'idx_feedback_org_category'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'assigned_to'], {
      name: 'idx_feedback_org_assigned'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'customer_id'], {
      name: 'idx_feedback_org_customer'
    });

    await queryInterface.addIndex('feedback', ['organization_id', 'sentiment'], {
      name: 'idx_feedback_org_sentiment'
    });

    // Search optimization - full text search indexes
    await queryInterface.addIndex('feedback', ['organization_id', 'title'], {
      name: 'idx_feedback_org_title'
    });

    // Compound index for complex search queries
    await queryInterface.addIndex('feedback', 
      ['organization_id', 'status', 'priority', 'created_at'], {
      name: 'idx_feedback_search_compound'
    });

    // Customer table indexes
    await queryInterface.addIndex('customers', ['organization_id'], {
      name: 'idx_customers_organization_id'
    });

    await queryInterface.addIndex('customers', ['organization_id', 'email'], {
      name: 'idx_customers_org_email'
    });

    await queryInterface.addIndex('customers', ['organization_id', 'created_at'], {
      name: 'idx_customers_org_created'
    });

    // Integration table indexes
    await queryInterface.addIndex('integrations', ['organization_id'], {
      name: 'idx_integrations_organization_id'
    });

    await queryInterface.addIndex('integrations', ['organization_id', 'status'], {
      name: 'idx_integrations_org_status'
    });

    // Comments table indexes
    await queryInterface.addIndex('comments', ['feedback_id'], {
      name: 'idx_comments_feedback_id'
    });

    await queryInterface.addIndex('comments', ['feedback_id', 'created_at'], {
      name: 'idx_comments_feedback_created'
    });

    // Organization users table indexes
    await queryInterface.addIndex('organization_users', ['organization_id'], {
      name: 'idx_org_users_organization_id'
    });

    await queryInterface.addIndex('organization_users', ['user_id'], {
      name: 'idx_org_users_user_id'
    });

    await queryInterface.addIndex('organization_users', ['organization_id', 'role'], {
      name: 'idx_org_users_org_role'
    });

    // AI-specific indexes for performance
    if (await queryInterface.tableExists('feedback_embeddings')) {
      await queryInterface.addIndex('feedback_embeddings', ['organization_id'], {
        name: 'idx_embeddings_organization_id'
      });

      await queryInterface.addIndex('feedback_embeddings', ['feedback_id'], {
        name: 'idx_embeddings_feedback_id'
      });

      await queryInterface.addIndex('feedback_embeddings', ['organization_id', 'created_at'], {
        name: 'idx_embeddings_org_created'
      });
    }

    if (await queryInterface.tableExists('ai_categorization_logs')) {
      await queryInterface.addIndex('ai_categorization_logs', ['organization_id'], {
        name: 'idx_ai_logs_organization_id'
      });

      await queryInterface.addIndex('ai_categorization_logs', ['feedback_id'], {
        name: 'idx_ai_logs_feedback_id'
      });

      await queryInterface.addIndex('ai_categorization_logs', ['organization_id', 'created_at'], {
        name: 'idx_ai_logs_org_created'
      });
    }

    // Filter presets indexes
    if (await queryInterface.tableExists('filter_presets')) {
      await queryInterface.addIndex('filter_presets', ['organization_id'], {
        name: 'idx_filter_presets_organization_id'
      });

      await queryInterface.addIndex('filter_presets', ['created_by'], {
        name: 'idx_filter_presets_created_by'
      });

      await queryInterface.addIndex('filter_presets', ['organization_id', 'is_shared'], {
        name: 'idx_filter_presets_org_shared'
      });
    }

    console.log('✅ Performance indexes added successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removing performance indexes...');

    // Remove all indexes in reverse order
    const indexes = [
      'idx_feedback_organization_id',
      'idx_feedback_org_status',
      'idx_feedback_org_created',
      'idx_feedback_org_priority',
      'idx_feedback_org_category',
      'idx_feedback_org_assigned',
      'idx_feedback_org_customer',
      'idx_feedback_org_sentiment',
      'idx_feedback_org_title',
      'idx_feedback_search_compound',
      'idx_customers_organization_id',
      'idx_customers_org_email',
      'idx_customers_org_created',
      'idx_integrations_organization_id',
      'idx_integrations_org_status',
      'idx_comments_feedback_id',
      'idx_comments_feedback_created',
      'idx_org_users_organization_id',
      'idx_org_users_user_id',
      'idx_org_users_org_role',
      'idx_embeddings_organization_id',
      'idx_embeddings_feedback_id',
      'idx_embeddings_org_created',
      'idx_ai_logs_organization_id',
      'idx_ai_logs_feedback_id',
      'idx_ai_logs_org_created',
      'idx_filter_presets_organization_id',
      'idx_filter_presets_created_by',
      'idx_filter_presets_org_shared'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('feedback', indexName);
      } catch (error) {
        // Index might not exist, continue
        console.warn(`Index ${indexName} not found, skipping...`);
      }
    }

    console.log('✅ Performance indexes removed successfully');
  }
};