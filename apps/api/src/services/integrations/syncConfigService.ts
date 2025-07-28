/**
 * Integration Sync Configuration Service
 * Manages sync configuration and rules for bi-directional data flow
 * Based on Zeda's sync configuration patterns
 */

import { db } from '../database';
import { Op } from 'sequelize';

export enum SyncDirection {
  BIDIRECTIONAL = 'BIDIRECTIONAL',
  INBOUND_ONLY = 'INBOUND_ONLY',   // External service → FeedbackHub
  OUTBOUND_ONLY = 'OUTBOUND_ONLY'  // FeedbackHub → External service
}

export enum SyncTrigger {
  REAL_TIME = 'REAL_TIME',
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL'
}

export interface SyncRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: SyncTrigger;
  direction: SyncDirection;
  conditions: SyncCondition[];
  actions: SyncAction[];
  schedule?: string; // Cron expression for scheduled syncs
}

export interface SyncCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'regex' | 'in' | 'not_in';
  value: any;
  source: 'external' | 'internal';
}

export interface SyncAction {
  type: 'create' | 'update' | 'link' | 'notify' | 'tag' | 'assign';
  target: 'feedback' | 'customer' | 'comment' | 'integration';
  mapping: FieldMapping[];
  options?: Record<string, any>;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'extract_email' | 'parse_date' | 'custom';
  transformScript?: string; // JavaScript code for custom transforms
  defaultValue?: any;
  required?: boolean;
}

export interface IntegrationSyncConfig {
  integrationId: string;
  organizationId: string;
  enabled: boolean;
  syncDirection: SyncDirection;
  rules: SyncRule[];
  fieldMappings: {
    inbound: FieldMapping[];
    outbound: FieldMapping[];
  };
  filters: {
    inbound: SyncCondition[];
    outbound: SyncCondition[];
  };
  options: {
    deduplication: boolean;
    autoMergeCustomers: boolean;
    createMissingCustomers: boolean;
    notifyOnSync: boolean;
    batchSize: number;
    rateLimitDelay: number;
  };
  metadata: {
    lastSyncAt?: Date;
    totalSyncedItems: number;
    errorCount: number;
    lastError?: string;
  };
}

export class SyncConfigService {
  /**
   * Get sync configuration for an integration
   */
  async getSyncConfig(integrationId: string, organizationId: string): Promise<IntegrationSyncConfig | null> {
    const integration = await db.models.Integration.findOne({
      where: {
        id: integrationId,
        organizationId
      }
    });

    if (!integration) {
      return null;
    }

    // Return sync config from metadata, or create default
    return integration.metadata?.syncConfig || this.createDefaultSyncConfig(integrationId, organizationId, integration.type);
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfig(
    integrationId: string,
    organizationId: string,
    config: Partial<IntegrationSyncConfig>
  ): Promise<IntegrationSyncConfig> {
    const integration = await db.models.Integration.findOne({
      where: {
        id: integrationId,
        organizationId
      }
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    const currentConfig = integration.metadata?.syncConfig || 
      this.createDefaultSyncConfig(integrationId, organizationId, integration.type);

    const updatedConfig = {
      ...currentConfig,
      ...config,
      integrationId,
      organizationId
    };

    await integration.update({
      metadata: {
        ...integration.metadata,
        syncConfig: updatedConfig
      }
    });

    return updatedConfig;
  }

  /**
   * Create default sync configuration based on integration type
   */
  private createDefaultSyncConfig(
    integrationId: string,
    organizationId: string,
    integrationType: string
  ): IntegrationSyncConfig {
    const baseConfig: IntegrationSyncConfig = {
      integrationId,
      organizationId,
      enabled: true,
      syncDirection: SyncDirection.BIDIRECTIONAL,
      rules: [],
      fieldMappings: {
        inbound: [],
        outbound: []
      },
      filters: {
        inbound: [],
        outbound: []
      },
      options: {
        deduplication: true,
        autoMergeCustomers: true,
        createMissingCustomers: true,
        notifyOnSync: false,
        batchSize: 50,
        rateLimitDelay: 1000
      },
      metadata: {
        totalSyncedItems: 0,
        errorCount: 0
      }
    };

    // Add type-specific configurations
    switch (integrationType) {
      case 'SLACK':
        return this.createSlackSyncConfig(baseConfig);
      case 'ZENDESK':
        return this.createZendeskSyncConfig(baseConfig);
      case 'INTERCOM':
        return this.createIntercomSyncConfig(baseConfig);
      default:
        return baseConfig;
    }
  }

  /**
   * Create Slack-specific sync configuration
   */
  private createSlackSyncConfig(baseConfig: IntegrationSyncConfig): IntegrationSyncConfig {
    return {
      ...baseConfig,
      rules: [
        {
          id: 'slack-message-to-feedback',
          name: 'Convert Slack Messages to Feedback',
          enabled: true,
          trigger: SyncTrigger.REAL_TIME,
          direction: SyncDirection.INBOUND_ONLY,
          conditions: [
            {
              field: 'channel_type',
              operator: 'in',
              value: ['public_channel', 'private_channel'],
              source: 'external'
            },
            {
              field: 'subtype',
              operator: 'not_in',
              value: ['bot_message', 'channel_join', 'channel_leave'],
              source: 'external'
            }
          ],
          actions: [
            {
              type: 'create',
              target: 'feedback',
              mapping: [
                { sourceField: 'text', targetField: 'description', required: true },
                { sourceField: 'user.profile.email', targetField: 'customerEmail' },
                { sourceField: 'user.profile.display_name', targetField: 'customerName' },
                { sourceField: 'channel', targetField: 'sourceMetadata.slackChannel' },
                { sourceField: 'ts', targetField: 'sourceMetadata.slackMessageTs' }
              ]
            }
          ]
        },
        {
          id: 'feedback-to-slack-notification',
          name: 'Notify Slack on Feedback Status Change',
          enabled: false, // Disabled by default
          trigger: SyncTrigger.REAL_TIME,
          direction: SyncDirection.OUTBOUND_ONLY,
          conditions: [
            {
              field: 'status',
              operator: 'in',
              value: ['resolved', 'in_progress'],
              source: 'internal'
            }
          ],
          actions: [
            {
              type: 'notify',
              target: 'integration',
              mapping: [
                { sourceField: 'title', targetField: 'message.text' },
                { sourceField: 'status', targetField: 'message.status' }
              ],
              options: {
                channelId: '', // To be configured by user
                messageTemplate: '✅ Feedback "${title}" status changed to ${status}'
              }
            }
          ]
        }
      ],
      fieldMappings: {
        inbound: [
          { sourceField: 'text', targetField: 'description', required: true },
          { sourceField: 'user.profile.email', targetField: 'customerEmail' },
          { sourceField: 'user.profile.display_name', targetField: 'customerName' },
          { sourceField: 'channel', targetField: 'source', defaultValue: 'slack' }
        ],
        outbound: [
          { sourceField: 'title', targetField: 'text' },
          { sourceField: 'description', targetField: 'text', transform: 'trim' },
          { sourceField: 'status', targetField: 'status' }
        ]
      }
    };
  }

  /**
   * Create Zendesk-specific sync configuration
   */
  private createZendeskSyncConfig(baseConfig: IntegrationSyncConfig): IntegrationSyncConfig {
    return {
      ...baseConfig,
      rules: [
        {
          id: 'zendesk-ticket-to-feedback',
          name: 'Convert Zendesk Tickets to Feedback',
          enabled: true,
          trigger: SyncTrigger.REAL_TIME,
          direction: SyncDirection.INBOUND_ONLY,
          conditions: [
            {
              field: 'type',
              operator: 'in',
              value: ['question', 'problem', 'incident'],
              source: 'external'
            },
            {
              field: 'status',
              operator: 'not_in',
              value: ['spam', 'deleted'],
              source: 'external'
            }
          ],
          actions: [
            {
              type: 'create',
              target: 'feedback',
              mapping: [
                { sourceField: 'subject', targetField: 'title', required: true },
                { sourceField: 'description', targetField: 'description', required: true },
                { sourceField: 'requester.email', targetField: 'customerEmail' },
                { sourceField: 'requester.name', targetField: 'customerName' },
                { sourceField: 'priority', targetField: 'priority', transform: 'lowercase' },
                { sourceField: 'id', targetField: 'sourceMetadata.zendeskTicketId' }
              ]
            }
          ]
        },
        {
          id: 'feedback-to-zendesk-update',
          name: 'Update Zendesk Tickets on Feedback Changes',
          enabled: false,
          trigger: SyncTrigger.REAL_TIME,
          direction: SyncDirection.OUTBOUND_ONLY,
          conditions: [
            {
              field: 'sourceMetadata.zendeskTicketId',
              operator: 'not_in',
              value: [null, ''],
              source: 'internal'
            }
          ],
          actions: [
            {
              type: 'update',
              target: 'integration',
              mapping: [
                { sourceField: 'status', targetField: 'status' },
                { sourceField: 'priority', targetField: 'priority' }
              ]
            }
          ]
        }
      ],
      fieldMappings: {
        inbound: [
          { sourceField: 'subject', targetField: 'title', required: true },
          { sourceField: 'description', targetField: 'description', required: true },
          { sourceField: 'requester.email', targetField: 'customerEmail' },
          { sourceField: 'requester.name', targetField: 'customerName' },
          { sourceField: 'priority', targetField: 'priority' },
          { sourceField: 'type', targetField: 'category' }
        ],
        outbound: [
          { sourceField: 'title', targetField: 'subject' },
          { sourceField: 'status', targetField: 'status' },
          { sourceField: 'priority', targetField: 'priority' }
        ]
      }
    };
  }

  /**
   * Create Intercom-specific sync configuration
   */
  private createIntercomSyncConfig(baseConfig: IntegrationSyncConfig): IntegrationSyncConfig {
    return {
      ...baseConfig,
      rules: [
        {
          id: 'intercom-conversation-to-feedback',
          name: 'Convert Intercom Conversations to Feedback',
          enabled: true,
          trigger: SyncTrigger.REAL_TIME,
          direction: SyncDirection.INBOUND_ONLY,
          conditions: [
            {
              field: 'state',
              operator: 'equals',
              value: 'open',
              source: 'external'
            },
            {
              field: 'source.type',
              operator: 'equals',
              value: 'conversation',
              source: 'external'
            }
          ],
          actions: [
            {
              type: 'create',
              target: 'feedback',
              mapping: [
                { sourceField: 'conversation_message.body', targetField: 'description', required: true },
                { sourceField: 'user.email', targetField: 'customerEmail' },
                { sourceField: 'user.name', targetField: 'customerName' },
                { sourceField: 'id', targetField: 'sourceMetadata.intercomConversationId' }
              ]
            }
          ]
        }
      ],
      fieldMappings: {
        inbound: [
          { sourceField: 'conversation_message.body', targetField: 'description', required: true },
          { sourceField: 'user.email', targetField: 'customerEmail' },
          { sourceField: 'user.name', targetField: 'customerName' },
          { sourceField: 'source.type', targetField: 'source', defaultValue: 'intercom' }
        ],
        outbound: [
          { sourceField: 'title', targetField: 'subject' },
          { sourceField: 'description', targetField: 'body' }
        ]
      }
    };
  }

  /**
   * Validate sync rule conditions
   */
  validateSyncRule(rule: SyncRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name?.trim()) {
      errors.push('Rule name is required');
    }

    if (!rule.conditions?.length) {
      errors.push('At least one condition is required');
    }

    if (!rule.actions?.length) {
      errors.push('At least one action is required');
    }

    // Validate trigger and schedule
    if (rule.trigger === SyncTrigger.SCHEDULED && !rule.schedule) {
      errors.push('Schedule is required for scheduled triggers');
    }

    // Validate conditions
    rule.conditions?.forEach((condition, index) => {
      if (!condition.field) {
        errors.push(`Condition ${index + 1}: field is required`);
      }
      if (!condition.operator) {
        errors.push(`Condition ${index + 1}: operator is required`);
      }
    });

    // Validate actions
    rule.actions?.forEach((action, index) => {
      if (!action.type) {
        errors.push(`Action ${index + 1}: type is required`);
      }
      if (!action.target) {
        errors.push(`Action ${index + 1}: target is required`);
      }
      if (!action.mapping?.length) {
        errors.push(`Action ${index + 1}: at least one field mapping is required`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Test sync rule against sample data
   */
  async testSyncRule(
    integrationId: string,
    organizationId: string,
    rule: SyncRule,
    sampleData: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      // Validate rule first
      const validation = this.validateSyncRule(rule);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Check if conditions match sample data
      const conditionsMatch = this.evaluateConditions(rule.conditions, sampleData);
      if (!conditionsMatch) {
        return {
          success: true,
          result: {
            matched: false,
            reason: 'Sample data does not match rule conditions'
          }
        };
      }

      // Simulate actions
      const actionResults = await this.simulateActions(rule.actions, sampleData);

      return {
        success: true,
        result: {
          matched: true,
          conditionsMatched: rule.conditions.length,
          actionResults
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during rule testing'
      };
    }
  }

  /**
   * Evaluate sync conditions against data
   */
  private evaluateConditions(conditions: SyncCondition[], data: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(data, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
        case 'starts_with':
          return typeof fieldValue === 'string' && fieldValue.startsWith(condition.value);
        case 'regex':
          return new RegExp(condition.value).test(fieldValue);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  }

  /**
   * Simulate actions for testing
   */
  private async simulateActions(actions: SyncAction[], data: any): Promise<any[]> {
    return actions.map(action => {
      const mappedData: any = {};
      
      action.mapping.forEach(mapping => {
        const sourceValue = this.getNestedValue(data, mapping.sourceField);
        const transformedValue = this.applyTransform(sourceValue, mapping.transform, mapping.transformScript);
        
        this.setNestedValue(mappedData, mapping.targetField, transformedValue ?? mapping.defaultValue);
      });

      return {
        type: action.type,
        target: action.target,
        data: mappedData,
        options: action.options
      };
    });
  }

  /**
   * Helper to get nested object values
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helper to set nested object values
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Apply field transformations
   */
  private applyTransform(value: any, transform?: string, script?: string): any {
    if (!transform || value == null) return value;

    switch (transform) {
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'extract_email':
        const emailMatch = typeof value === 'string' ? value.match(/[\w.-]+@[\w.-]+\.\w+/) : null;
        return emailMatch ? emailMatch[0] : null;
      case 'parse_date':
        return new Date(value).toISOString();
      case 'custom':
        if (script) {
          try {
            // Simple eval for custom transformations (be careful in production)
            return new Function('value', script)(value);
          } catch (error) {
            console.error('Custom transform error:', error);
            return value;
          }
        }
        return value;
      default:
        return value;
    }
  }
}

export const syncConfigService = new SyncConfigService();