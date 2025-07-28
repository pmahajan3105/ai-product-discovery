/**
 * Integration Health Monitor Service
 * Provides health checking and monitoring capabilities for integrations
 * Based on Zeda's monitoring patterns with simplified approach
 */

import { db } from '../database';
import { oauthConnectionService } from '../oauth/connectionService';
import { SlackOAuth2Provider } from '../oauth/providers/slackProvider';
import { ZendeskOAuth2Provider } from '../oauth/providers/zendeskProvider';
import { IntercomOAuth2Provider } from '../oauth/providers/intercomProvider';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN'
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  RATE_LIMITED = 'RATE_LIMITED',
  ERROR = 'ERROR'
}

export interface IntegrationHealth {
  integrationId: string;
  organizationId: string;
  type: string;
  name: string;
  status: HealthStatus;
  connectionStatus: ConnectionStatus;
  lastCheckedAt: Date;
  lastSyncAt?: Date;
  lastErrorAt?: Date;
  metrics: {
    successCount: number;
    failureCount: number;
    totalEvents: number;
    successRate: number;
    avgResponseTime?: number;
  };
  errors: {
    recentErrors: string[];
    criticalErrorCount: number;
    lastError?: string;
  };
  details: {
    tokenExpiresAt?: Date;
    configValid: boolean;
    webhookActive: boolean;
    lastTestResult?: any;
  };
}

export interface HealthCheckResult {
  success: boolean;
  status: ConnectionStatus;
  responseTime: number;
  error?: string;
  details?: any;
}

export class HealthMonitorService {
  /**
   * Check health of a specific integration
   */
  async checkIntegrationHealth(integrationId: string, organizationId: string): Promise<IntegrationHealth> {
    try {
      // Get integration details
      const integration = await db.models.Integration.findOne({
        where: {
          id: integrationId,
          organizationId
        }
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      // Get connection details
      const connection = await oauthConnectionService.getConnection(integrationId, organizationId);
      if (!connection) {
        return this.createUnhealthyStatus(integration, 'No connection found');
      }

      // Perform health check
      const healthCheck = await this.performHealthCheck(connection);
      
      // Get metrics from metadata
      const metrics = this.extractMetrics(integration.metadata);
      
      // Determine overall health status
      const overallStatus = this.determineHealthStatus(healthCheck, metrics);

      return {
        integrationId,
        organizationId,
        type: integration.type,
        name: integration.name,
        status: overallStatus,
        connectionStatus: healthCheck.status,
        lastCheckedAt: new Date(),
        lastSyncAt: integration.metadata?.lastSyncAt ? new Date(integration.metadata.lastSyncAt) : undefined,
        lastErrorAt: integration.metadata?.lastErrorAt ? new Date(integration.metadata.lastErrorAt) : undefined,
        metrics: {
          successCount: metrics.successCount,
          failureCount: metrics.failureCount,
          totalEvents: metrics.successCount + metrics.failureCount,
          successRate: metrics.totalEvents > 0 ? (metrics.successCount / metrics.totalEvents * 100) : 100,
          avgResponseTime: healthCheck.responseTime
        },
        errors: {
          recentErrors: metrics.recentErrors.slice(0, 5), // Last 5 errors
          criticalErrorCount: metrics.criticalErrorCount,
          lastError: integration.metadata?.lastError
        },
        details: {
          tokenExpiresAt: connection.credentials?.expires_at ? new Date(connection.credentials.expires_at) : undefined,
          configValid: this.validateConfig(connection),
          webhookActive: this.checkWebhookStatus(connection),
          lastTestResult: healthCheck.details
        }
      };
    } catch (error) {
      console.error('Error checking integration health:', error);
      
      return {
        integrationId,
        organizationId,
        type: 'unknown',
        name: 'Unknown',
        status: HealthStatus.UNKNOWN,
        connectionStatus: ConnectionStatus.ERROR,
        lastCheckedAt: new Date(),
        metrics: {
          successCount: 0,
          failureCount: 1,
          totalEvents: 1,
          successRate: 0
        },
        errors: {
          recentErrors: [error instanceof Error ? error.message : 'Unknown error'],
          criticalErrorCount: 1,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        },
        details: {
          configValid: false,
          webhookActive: false
        }
      };
    }
  }

  /**
   * Check health of all integrations for an organization
   */
  async checkOrganizationHealth(organizationId: string): Promise<IntegrationHealth[]> {
    const integrations = await db.models.Integration.findAll({
      where: { organizationId }
    });

    const healthChecks = await Promise.allSettled(
      integrations.map(integration => 
        this.checkIntegrationHealth(integration.id, organizationId)
      )
    );

    return healthChecks
      .filter((result): result is PromiseFulfilledResult<IntegrationHealth> => result.status === 'fulfilled')
      .map(result => result.value);
  }

  /**
   * Perform actual health check based on integration type
   */
  private async performHealthCheck(connection: any): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (connection.type) {
        case 'SLACK':
          result = await this.checkSlackHealth(connection);
          break;
        case 'ZENDESK':
          result = await this.checkZendeskHealth(connection);
          break;
        case 'INTERCOM':
          result = await this.checkIntercomHealth(connection);
          break;
        default:
          return {
            success: false,
            status: ConnectionStatus.INVALID_CONFIG,
            responseTime: Date.now() - startTime,
            error: `Unsupported integration type: ${connection.type}`
          };
      }

      return {
        success: true,
        status: ConnectionStatus.CONNECTED,
        responseTime: Date.now() - startTime,
        details: result
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Determine status based on error type
      let status = ConnectionStatus.ERROR;
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          status = ConnectionStatus.TOKEN_EXPIRED;
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          status = ConnectionStatus.RATE_LIMITED;
        }
      }

      return {
        success: false,
        status,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Slack integration health
   */
  private async checkSlackHealth(connection: any): Promise<any> {
    const provider = this.createSlackProvider();
    if (!provider) {
      throw new Error('Failed to create Slack provider');
    }

    // Test basic API access
    const teamInfo = await provider.getTeamInfo(connection.credentials);
    return {
      teamId: teamInfo.team?.id,
      teamName: teamInfo.team?.name,
      botUserId: connection.credentials.bot_user_id,
      scope: connection.credentials.scope
    };
  }

  /**
   * Check Zendesk integration health
   */
  private async checkZendeskHealth(connection: any): Promise<any> {
    const provider = this.createZendeskProvider(connection.config?.subdomain);
    if (!provider) {
      throw new Error('Failed to create Zendesk provider');
    }

    // Test basic API access - get current user
    const userInfo = await provider.getCurrentUser(connection.credentials);
    return {
      userId: userInfo.user?.id,
      userName: userInfo.user?.name,
      userEmail: userInfo.user?.email,
      subdomain: connection.config?.subdomain
    };
  }

  /**
   * Check Intercom integration health
   */
  private async checkIntercomHealth(connection: any): Promise<any> {
    const provider = this.createIntercomProvider();
    if (!provider) {
      throw new Error('Failed to create Intercom provider');
    }

    // Test basic API access - get app info
    const appInfo = await provider.getAppInfo(connection.credentials);
    return {
      appId: appInfo.app?.id_code,
      appName: appInfo.app?.name,
      region: appInfo.app?.region
    };
  }

  /**
   * Create provider instances
   */
  private createSlackProvider(): SlackOAuth2Provider | null {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }

    return new SlackOAuth2Provider(clientId, clientSecret, redirectUri);
  }

  private createZendeskProvider(subdomain: string): ZendeskOAuth2Provider | null {
    const clientId = process.env.ZENDESK_CLIENT_ID;
    const clientSecret = process.env.ZENDESK_CLIENT_SECRET;
    const redirectUri = process.env.ZENDESK_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri || !subdomain) {
      return null;
    }

    return new ZendeskOAuth2Provider(clientId, clientSecret, redirectUri, subdomain);
  }

  private createIntercomProvider(): IntercomOAuth2Provider | null {
    const clientId = process.env.INTERCOM_CLIENT_ID;
    const clientSecret = process.env.INTERCOM_CLIENT_SECRET;
    const redirectUri = process.env.INTERCOM_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return null;
    }

    return new IntercomOAuth2Provider(clientId, clientSecret, redirectUri);
  }

  /**
   * Extract metrics from integration metadata
   */
  private extractMetrics(metadata: any): {
    successCount: number;
    failureCount: number;
    recentErrors: string[];
    criticalErrorCount: number;
  } {
    return {
      successCount: metadata?.metrics?.successCount || 0,
      failureCount: metadata?.metrics?.failureCount || 0,
      recentErrors: metadata?.metrics?.recentErrors || [],
      criticalErrorCount: metadata?.metrics?.criticalErrorCount || 0
    };
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(healthCheck: HealthCheckResult, metrics: any): HealthStatus {
    if (!healthCheck.success) {
      if (healthCheck.status === ConnectionStatus.TOKEN_EXPIRED) {
        return HealthStatus.UNHEALTHY;
      }
      if (healthCheck.status === ConnectionStatus.RATE_LIMITED) {
        return HealthStatus.DEGRADED;
      }
      return HealthStatus.UNHEALTHY;
    }

    // Check success rate
    const totalEvents = metrics.successCount + metrics.failureCount;
    if (totalEvents > 0) {
      const successRate = metrics.successCount / totalEvents;
      if (successRate < 0.8) {
        return HealthStatus.UNHEALTHY;
      }
      if (successRate < 0.95) {
        return HealthStatus.DEGRADED;
      }
    }

    // Check recent errors
    if (metrics.criticalErrorCount > 5) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  /**
   * Validate integration configuration
   */
  private validateConfig(connection: any): boolean {
    if (!connection.credentials) return false;
    
    switch (connection.type) {
      case 'SLACK':
        return !!(connection.credentials.access_token && connection.credentials.bot_user_id);
      case 'ZENDESK':
        return !!(connection.credentials.access_token && connection.config?.subdomain);
      case 'INTERCOM':
        return !!(connection.credentials.access_token);
      default:
        return false;
    }
  }

  /**
   * Check webhook status (simplified - would need webhook registry in production)
   */
  private checkWebhookStatus(connection: any): boolean {
    // In production, this would check if webhooks are properly registered
    // For now, assume webhooks are active if credentials exist
    return !!connection.credentials?.access_token;
  }

  /**
   * Create unhealthy status for error cases
   */
  private createUnhealthyStatus(integration: any, error: string): IntegrationHealth {
    return {
      integrationId: integration.id,
      organizationId: integration.organizationId,
      type: integration.type,
      name: integration.name,
      status: HealthStatus.UNHEALTHY,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      lastCheckedAt: new Date(),
      metrics: {
        successCount: 0,
        failureCount: 1,
        totalEvents: 1,
        successRate: 0
      },
      errors: {
        recentErrors: [error],
        criticalErrorCount: 1,
        lastError: error
      },
      details: {
        configValid: false,
        webhookActive: false
      }
    };
  }

  /**
   * Update integration health metrics
   */
  async updateIntegrationMetrics(
    integrationId: string,
    organizationId: string,
    success: boolean,
    error?: string,
    responseTime?: number
  ): Promise<void> {
    try {
      const integration = await db.models.Integration.findOne({
        where: { id: integrationId, organizationId }
      });

      if (!integration) return;

      const currentMetrics = integration.metadata?.metrics || {
        successCount: 0,
        failureCount: 0,
        recentErrors: [],
        criticalErrorCount: 0
      };

      // Update counts
      if (success) {
        currentMetrics.successCount += 1;
      } else {
        currentMetrics.failureCount += 1;
        
        // Add to recent errors (keep last 10)
        if (error) {
          currentMetrics.recentErrors = [
            error,
            ...currentMetrics.recentErrors.slice(0, 9)
          ];
          
          // Increment critical error count if it's a serious error
          if (error.includes('401') || error.includes('403') || error.includes('token')) {
            currentMetrics.criticalErrorCount += 1;
          }
        }
      }

      // Update metadata
      const updatedMetadata = {
        ...integration.metadata,
        metrics: currentMetrics,
        lastSyncAt: new Date().toISOString(),
        ...(error && { lastError: error, lastErrorAt: new Date().toISOString() }),
        ...(responseTime && { lastResponseTime: responseTime })
      };

      await integration.update({ metadata: updatedMetadata });
    } catch (error) {
      console.error('Error updating integration metrics:', error);
    }
  }
}

export const healthMonitorService = new HealthMonitorService();