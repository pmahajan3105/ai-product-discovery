import { integrationManager } from './IntegrationManager';
import { SlackIntegration } from './SlackIntegration';
import { ZendeskIntegration } from './ZendeskIntegration';
import { IntercomIntegration } from './IntercomIntegration';

/**
 * Initialize and register all available integrations
 * This follows Zeda's pattern of registering integrations at startup
 */
export function initializeIntegrations() {
  // Register Slack integration
  integrationManager.addIntegration(new SlackIntegration());
  
  // Register Zendesk integration
  integrationManager.addIntegration(new ZendeskIntegration());
  
  // Register Intercom integration
  integrationManager.addIntegration(new IntercomIntegration());

  // Log registered integrations in development
  if (process.env.NODE_ENV === 'development') {
    integrationManager.listRegisteredIntegrations();
  }
}

// Export for easy access
export { integrationManager };
export * from './SlackIntegration';
export * from './ZendeskIntegration'; 
export * from './IntercomIntegration';
export * from './IntegrationManager';