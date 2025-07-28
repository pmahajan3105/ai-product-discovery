import { 
  BaseIntegration, 
  IntegrationType, 
  IntegrationManager as IIntegrationManager 
} from '../../types/integration';

/**
 * Singleton Integration Manager
 * Based on Zeda's IntegrationsManager pattern with TypeScript improvements
 */
export class IntegrationManager implements IIntegrationManager {
  private static _instance: IntegrationManager;
  private integrations: Map<IntegrationType, BaseIntegration>;

  private constructor() {
    this.integrations = new Map();
  }

  static getInstance(): IntegrationManager {
    if (!IntegrationManager._instance) {
      IntegrationManager._instance = new IntegrationManager();
    }
    return IntegrationManager._instance;
  }

  addIntegration(integration: BaseIntegration): void {
    this.integrations.set(integration.key, integration);
    console.log(`Integration registered: ${integration.key}`);
  }

  getIntegration(key: IntegrationType): BaseIntegration | undefined {
    return this.integrations.get(key);
  }

  getAllIntegrations(): BaseIntegration[] {
    return Array.from(this.integrations.values());
  }

  getSupportedIntegrations(): IntegrationType[] {
    return Array.from(this.integrations.keys());
  }

  isIntegrationSupported(key: IntegrationType): boolean {
    return this.integrations.has(key);
  }

  getIntegrationCount(): number {
    return this.integrations.size;
  }

  // Debug helper
  listRegisteredIntegrations(): void {
    console.log('Registered Integrations:');
    this.integrations.forEach((integration, key) => {
      console.log(`- ${key}: ${integration.name}`);
    });
  }
}

// Export singleton instance
export const integrationManager = IntegrationManager.getInstance();