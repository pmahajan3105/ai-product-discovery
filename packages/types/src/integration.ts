// Integration types for external systems (Slack, Zendesk, Intercom, etc.)

export enum IntegrationType {
  SLACK = 'SLACK',
  ZENDESK = 'ZENDESK', 
  INTERCOM = 'INTERCOM',
  JIRA = 'JIRA',
  LINEAR = 'LINEAR',
  HUBSPOT = 'HUBSPOT',
  SALESFORCE = 'SALESFORCE',
  WEBHOOK = 'WEBHOOK',
  EMAIL = 'EMAIL',
  CSV = 'CSV'
}

export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING',
  DISABLED = 'DISABLED'
}

export enum SyncDirection {
  IMPORT_ONLY = 'IMPORT_ONLY',
  EXPORT_ONLY = 'EXPORT_ONLY', 
  BIDIRECTIONAL = 'BIDIRECTIONAL'
}

export interface IntegrationConfig {
  // Authentication
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  webhookUrl?: string;
  
  // Sync settings
  syncDirection: SyncDirection;
  syncFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  autoSync: boolean;
  
  // Field mapping
  fieldMappings: Record<string, string>; // internal field -> external field
  
  // Filters
  importFilters?: {
    dateRange?: { start?: string; end?: string };
    tags?: string[];
    labels?: string[];
    status?: string[];
    priority?: string[];
  };
  
  // Type-specific configurations
  slack?: {
    channelId: string;
    channelName: string;
    botToken: string;
    userToken?: string;
    notifyOnNewFeedback: boolean;
    notifyOnStatusChange: boolean;
  };
  
  zendesk?: {
    subdomain: string;
    username: string;
    ticketFormId?: string;
    customFieldMappings: Record<string, string>;
    syncComments: boolean;
    syncAttachments: boolean;
  };
  
  intercom?: {
    appId: string;
    workspaceId: string;
    syncConversations: boolean;
    syncUsers: boolean;
    webhookSecret?: string;
  };
  
  webhook?: {
    url: string;
    secret?: string;
    headers?: Record<string, string>;
    events: string[]; // Which events to send
    retryAttempts: number;
    timeout: number;
  };
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  
  // Configuration
  config: IntegrationConfig;
  
  // Health monitoring
  lastSyncAt?: string;
  lastSuccessfulSyncAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  
  // Metrics
  totalSynced: number;
  syncErrors: number;
  avgSyncDuration?: number; // milliseconds
  
  // Status tracking
  isActive: boolean;
  isPaused: boolean;
  
  // Association
  workspaceId: string;
  createdBy: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationHealth {
  integrationId: string;
  
  // Current status
  isHealthy: boolean;
  status: IntegrationStatus;
  statusMessage?: string;
  
  // Recent performance
  recentSyncs: Array<{
    startedAt: string;
    completedAt?: string;
    status: 'success' | 'error' | 'in_progress';
    itemsProcessed: number;
    errorMessage?: string;
    duration?: number;
  }>;
  
  // Health metrics
  successRate: number; // Percentage over last 30 days
  avgResponseTime: number; // milliseconds
  uptime: number; // Percentage over last 30 days
  
  // Alerts
  hasRecentErrors: boolean;
  errorCount24h: number;
  warningThresholds: {
    maxErrorRate: number;
    maxResponseTime: number;
    minUptime: number;
  };
  
  lastCheckedAt: string;
}

export interface SyncJob {
  id: string;
  integrationId: string;
  type: 'import' | 'export' | 'full_sync';
  
  // Job details
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // Progress tracking
  totalItems?: number;
  processedItems: number;
  failedItems: number;
  successItems: number;
  
  // Results
  errors: Array<{
    item: any;
    error: string;
    timestamp: string;
  }>;
  
  // Metadata
  triggeredBy: 'manual' | 'scheduled' | 'webhook' | 'api';
  userId?: string;
  metadata: Record<string, any>;
  
  workspaceId: string;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'config_updated' | 'status_changed';
  
  data: Record<string, any>;
  timestamp: string;
  userId?: string;
  workspaceId: string;
}

// CSV Import specific types
export interface CsvImportMapping {
  csvColumn: string;
  internalField: string;
  isRequired: boolean;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'date' | 'number';
  defaultValue?: any;
}

export interface CsvImportJob {
  id: string;
  fileName: string;
  fileSize: number;
  
  // Mapping configuration
  mappings: CsvImportMapping[];
  hasHeader: boolean;
  delimiter: ',' | ';' | '\t' | '|';
  
  // Processing status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  
  // Results
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  
  // Error details
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Record<string, any>;
  }>;
  
  // Preview data (first few rows)
  preview?: Array<Record<string, any>>;
  
  // User and workspace
  uploadedBy: string;
  workspaceId: string;
}