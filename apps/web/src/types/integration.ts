export enum IntegrationStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  ERROR = 'error',
  CONNECTING = 'connecting',
}

export enum IntegrationType {
  SLACK = 'SLACK',
  ZENDESK = 'ZENDESK',
  INTERCOM = 'INTERCOM',
}

export enum IntegrationAction {
  CREATE = 'CREATE',
  VALIDATE = 'VALIDATE',
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
  DELETE = 'DELETE',
  TEST_CONNECTION = 'TEST_CONNECTION',
}

export enum AuthType {
  OAUTH2 = 'oauth2',
  API_TOKEN = 'api_token',
  BASIC_AUTH = 'basic_auth',
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  description: string;
  icon: string;
  authType: AuthType;
  status: IntegrationStatus;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, any>;
  credentials?: Record<string, any>;
  healthCheck?: {
    lastChecked: string;
    isHealthy: boolean;
    errorMessage?: string;
  };
}

export interface IntegrationConnectionData {
  type: IntegrationType;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

export interface IntegrationResult {
  isSuccess: boolean;
  data?: any;
  error?: string;
  errorCode?: string;
}

export interface SlackCredentials {
  accessToken: string;
  teamId: string;
  teamName: string;
  userId: string;
  refreshToken?: string;
}

export interface SlackSettings {
  defaultChannel: string;
  notifyOnNewFeedback: boolean;
  notifyOnStatusChange: boolean;
  includeCustomerInfo: boolean;
}

export interface ZendeskCredentials {
  subdomain: string;
  apiToken: string;
  email: string;
}

export interface ZendeskSettings {
  defaultTicketType: string;
  defaultPriority: string;
  autoCreateTickets: boolean;
  syncComments: boolean;
}

export interface IntercomCredentials {
  accessToken: string;
  appId: string;
  region?: string;
}

export interface IntercomSettings {
  defaultTags: string[];
  syncToConversations: boolean;
  assignToTeam?: string;
}

export abstract class BaseIntegration {
  abstract key: IntegrationType;
  abstract name: string;
  abstract authType: AuthType;

  abstract performAction(action: IntegrationAction, input: any): Promise<IntegrationResult>;
  abstract validateCredentials(credentials: Record<string, any>): Promise<IntegrationResult>;
  abstract testConnection(config: IntegrationConfig): Promise<IntegrationResult>;
}

export interface IntegrationManager {
  getIntegration(key: IntegrationType): BaseIntegration | undefined;
  addIntegration(integration: BaseIntegration): void;
  getAllIntegrations(): BaseIntegration[];
  isIntegrationSupported(key: IntegrationType): boolean;
}