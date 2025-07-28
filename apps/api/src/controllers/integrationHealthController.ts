/**
 * Integration Health Controller
 * API endpoints for integration health monitoring and status
 */

import { Request, Response } from 'express';
import { healthMonitorService } from '../services/integrations/healthMonitorService';
import { organizationService } from '../services/organizationService';

export class IntegrationHealthController {
  /**
   * Get health status for a specific integration
   */
  async getIntegrationHealth(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      const health = await healthMonitorService.checkIntegrationHealth(integrationId, organizationId);

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error getting integration health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get integration health'
      });
    }
  }

  /**
   * Get health status for all integrations in an organization
   */
  async getOrganizationHealth(req: Request, res: Response) {
    try {
      const userId = req.user_id!;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      const healthStatus = await healthMonitorService.checkOrganizationHealth(organizationId);

      // Calculate summary metrics
      const summary = {
        totalIntegrations: healthStatus.length,
        healthyCount: healthStatus.filter(h => h.status === 'HEALTHY').length,
        degradedCount: healthStatus.filter(h => h.status === 'DEGRADED').length,
        unhealthyCount: healthStatus.filter(h => h.status === 'UNHEALTHY').length,
        unknownCount: healthStatus.filter(h => h.status === 'UNKNOWN').length,
        overallSuccessRate: this.calculateOverallSuccessRate(healthStatus),
        criticalIssues: healthStatus.filter(h => h.errors.criticalErrorCount > 0).length
      };

      res.json({
        success: true,
        data: {
          summary,
          integrations: healthStatus
        }
      });
    } catch (error) {
      console.error('Error getting organization health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get organization health'
      });
    }
  }

  /**
   * Force refresh health check for an integration
   */
  async refreshIntegrationHealth(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;

      // Get user's organization and check permissions
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;
      const userRole = await organizationService.getUserRole(organizationId, userId);

      if (!['admin', 'member'].includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      // Force a fresh health check
      const health = await healthMonitorService.checkIntegrationHealth(integrationId, organizationId);

      res.json({
        success: true,
        data: health,
        message: 'Health check refreshed successfully'
      });
    } catch (error) {
      console.error('Error refreshing integration health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh integration health'
      });
    }
  }

  /**
   * Get integration health history and trends
   */
  async getHealthHistory(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const { days = 7 } = req.query;
      const userId = req.user_id!;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      // Get current health status
      const currentHealth = await healthMonitorService.checkIntegrationHealth(integrationId, organizationId);

      // In a production system, this would query historical data
      // For now, return current status with simulated historical data
      const historyData = this.generateHealthHistory(currentHealth, parseInt(days as string));

      res.json({
        success: true,
        data: {
          current: currentHealth,
          history: historyData,
          trends: {
            successRateTrend: this.calculateTrend(historyData.map(h => h.successRate)),
            errorRateTrend: this.calculateTrend(historyData.map(h => h.errorRate)),
            responseTimeTrend: this.calculateTrend(historyData.map(h => h.avgResponseTime))
          }
        }
      });
    } catch (error) {
      console.error('Error getting health history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get health history'
      });
    }
  }

  /**
   * Get health status summary for dashboard
   */
  async getHealthSummary(req: Request, res: Response) {
    try {
      const userId = req.user_id!;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      const healthStatus = await healthMonitorService.checkOrganizationHealth(organizationId);

      // Create dashboard summary
      const summary = {
        overview: {
          totalIntegrations: healthStatus.length,
          activeIntegrations: healthStatus.filter(h => h.connectionStatus === 'CONNECTED').length,
          healthyIntegrations: healthStatus.filter(h => h.status === 'HEALTHY').length,
          issuesCount: healthStatus.filter(h => ['DEGRADED', 'UNHEALTHY'].includes(h.status)).length
        },
        recentActivity: {
          totalEvents: healthStatus.reduce((sum, h) => sum + h.metrics.totalEvents, 0),
          successfulEvents: healthStatus.reduce((sum, h) => sum + h.metrics.successCount, 0),
          failedEvents: healthStatus.reduce((sum, h) => sum + h.metrics.failureCount, 0),
          overallSuccessRate: this.calculateOverallSuccessRate(healthStatus)
        },
        alerts: {
          tokenExpirations: healthStatus.filter(h => 
            h.details.tokenExpiresAt && 
            new Date(h.details.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days
          ).length,
          criticalErrors: healthStatus.filter(h => h.errors.criticalErrorCount > 0).length,
          rateLimited: healthStatus.filter(h => h.connectionStatus === 'RATE_LIMITED').length
        },
        integrationTypes: this.groupByType(healthStatus)
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting health summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get health summary'
      });
    }
  }

  /**
   * Helper methods
   */
  private calculateOverallSuccessRate(healthStatus: any[]): number {
    const totalEvents = healthStatus.reduce((sum, h) => sum + h.metrics.totalEvents, 0);
    const successfulEvents = healthStatus.reduce((sum, h) => sum + h.metrics.successCount, 0);
    
    return totalEvents > 0 ? Math.round((successfulEvents / totalEvents) * 100) : 100;
  }

  private generateHealthHistory(currentHealth: any, days: number): any[] {
    // In production, this would query actual historical data
    // For now, generate simulated history based on current status
    const history = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Add some randomness to simulate realistic data
      const baseSuccessRate = currentHealth.metrics.successRate;
      const variance = Math.random() * 10 - 5; // ±5% variance
      const successRate = Math.max(0, Math.min(100, baseSuccessRate + variance));
      
      history.push({
        date: date.toISOString().split('T')[0],
        successRate: Math.round(successRate),
        errorRate: Math.round(100 - successRate),
        avgResponseTime: Math.round((currentHealth.metrics.avgResponseTime || 500) + (Math.random() * 200 - 100)),
        totalEvents: Math.floor(Math.random() * 50) + 10,
        status: successRate > 95 ? 'HEALTHY' : successRate > 80 ? 'DEGRADED' : 'UNHEALTHY'
      });
    }

    return history;
  }

  private calculateTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, values.length - 3);
    
    const difference = recent - older;
    
    if (Math.abs(difference) < 2) return 'stable';
    return difference > 0 ? 'up' : 'down';
  }

  private groupByType(healthStatus: any[]): Record<string, any> {
    return healthStatus.reduce((acc, integration) => {
      const type = integration.type;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          healthy: 0,
          degraded: 0,
          unhealthy: 0,
          successRate: 0
        };
      }
      
      acc[type].total += 1;
      acc[type][integration.status.toLowerCase()] += 1;
      acc[type].successRate += integration.metrics.successRate;
      
      return acc;
    }, {});
  }
}

export const integrationHealthController = new IntegrationHealthController();