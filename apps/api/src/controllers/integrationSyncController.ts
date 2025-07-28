/**
 * Integration Sync Configuration Controller
 * API endpoints for managing integration sync rules and configurations
 */

import { Request, Response } from 'express';
import { syncConfigService, SyncRule } from '../services/integrations/syncConfigService';
import { organizationService } from '../services/organizationService';

export class IntegrationSyncController {
  /**
   * Get sync configuration for an integration
   */
  async getSyncConfig(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      const config = await syncConfigService.getSyncConfig(integrationId, organizationId);
      if (!config) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting sync config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync configuration'
      });
    }
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfig(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;
      const updates = req.body;

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

      const updatedConfig = await syncConfigService.updateSyncConfig(
        integrationId,
        organizationId,
        updates
      );

      res.json({
        success: true,
        data: updatedConfig
      });
    } catch (error) {
      console.error('Error updating sync config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update sync configuration'
      });
    }
  }

  /**
   * Create or update a sync rule
   */
  async createSyncRule(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;
      const ruleData: SyncRule = req.body;

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

      // Validate the rule
      const validation = syncConfigService.validateSyncRule(ruleData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid sync rule',
          details: validation.errors
        });
      }

      // Get current config
      const currentConfig = await syncConfigService.getSyncConfig(integrationId, organizationId);
      if (!currentConfig) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Add or update rule
      const existingRuleIndex = currentConfig.rules.findIndex(r => r.id === ruleData.id);
      if (existingRuleIndex >= 0) {
        currentConfig.rules[existingRuleIndex] = ruleData;
      } else {
        // Generate ID if not provided
        ruleData.id = ruleData.id || `rule_${Date.now()}`; 
        currentConfig.rules.push(ruleData);
      }

      const updatedConfig = await syncConfigService.updateSyncConfig(
        integrationId,
        organizationId,
        { rules: currentConfig.rules }
      );

      res.json({
        success: true,
        data: {
          rule: ruleData,
          config: updatedConfig
        }
      });
    } catch (error) {
      console.error('Error creating sync rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create sync rule'
      });
    }
  }

  /**
   * Delete a sync rule
   */
  async deleteSyncRule(req: Request, res: Response) {
    try {
      const { integrationId, ruleId } = req.params;
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

      // Get current config
      const currentConfig = await syncConfigService.getSyncConfig(integrationId, organizationId);
      if (!currentConfig) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Remove rule
      const updatedRules = currentConfig.rules.filter(r => r.id !== ruleId);
      if (updatedRules.length === currentConfig.rules.length) {
        return res.status(404).json({ error: 'Sync rule not found' });
      }

      const updatedConfig = await syncConfigService.updateSyncConfig(
        integrationId,
        organizationId,
        { rules: updatedRules }
      );

      res.json({
        success: true,
        data: updatedConfig
      });
    } catch (error) {
      console.error('Error deleting sync rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete sync rule'
      });
    }
  }

  /**
   * Test a sync rule with sample data
   */
  async testSyncRule(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;
      const { rule, sampleData } = req.body;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      const testResult = await syncConfigService.testSyncRule(
        integrationId,
        organizationId,
        rule,
        sampleData
      );

      res.json({
        success: testResult.success,
        data: testResult.result,
        error: testResult.error
      });
    } catch (error) {
      console.error('Error testing sync rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test sync rule'
      });
    }
  }

  /**
   * Get sync statistics and health metrics
   */
  async getSyncStats(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;

      // Get user's organization
      const organizations = await organizationService.getUserOrganizations(userId);
      if (!organizations.length) {
        return res.status(403).json({ error: 'No organization access' });
      }

      const organizationId = organizations[0].id;

      const config = await syncConfigService.getSyncConfig(integrationId, organizationId);
      if (!config) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Calculate stats from metadata
      const stats = {
        totalRules: config.rules.length,
        activeRules: config.rules.filter(r => r.enabled).length,
        totalSyncedItems: config.metadata.totalSyncedItems,
        errorCount: config.metadata.errorCount,
        errorRate: config.metadata.totalSyncedItems > 0 
          ? (config.metadata.errorCount / config.metadata.totalSyncedItems * 100).toFixed(2)
          : '0.00',
        lastSyncAt: config.metadata.lastSyncAt,
        lastError: config.metadata.lastError,
        syncDirection: config.syncDirection,
        enabled: config.enabled,
        ruleBreakdown: config.rules.map(rule => ({
          id: rule.id,
          name: rule.name,
          enabled: rule.enabled,
          trigger: rule.trigger,
          direction: rule.direction,
          conditionCount: rule.conditions.length,
          actionCount: rule.actions.length
        }))
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting sync stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync statistics'
      });
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync(req: Request, res: Response) {
    try {
      const { integrationId } = req.params;
      const userId = req.user_id!;
      const { ruleIds, direction } = req.body;

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

      // In a production system, this would trigger a background job
      // For now, we'll simulate the process
      const config = await syncConfigService.getSyncConfig(integrationId, organizationId);
      if (!config) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      const applicableRules = config.rules.filter(rule => 
        rule.enabled && 
        (ruleIds ? ruleIds.includes(rule.id) : true) &&
        (direction ? rule.direction === direction || rule.direction === 'BIDIRECTIONAL' : true)
      );

      // Simulate sync job creation
      const syncJobId = `sync_${integrationId}_${Date.now()}`;
      
      res.json({
        success: true,
        data: {
          syncJobId,
          integrationId,
          organizationId,
          triggeredRules: applicableRules.length,
          rules: applicableRules.map(r => ({ id: r.id, name: r.name })),
          status: 'queued',
          triggeredAt: new Date().toISOString(),
          triggeredBy: userId
        }
      });

      // In production, queue the actual sync job here
      console.log(`Manual sync triggered for integration ${integrationId} by user ${userId}`);
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger manual sync'
      });
    }
  }
}

export const integrationSyncController = new IntegrationSyncController();