// Workspace and user management types

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export enum WorkspaceFeature {
  FEEDBACK_MANAGEMENT = 'FEEDBACK_MANAGEMENT',
  CUSTOMER_INSIGHTS = 'CUSTOMER_INSIGHTS',
  INTEGRATIONS = 'INTEGRATIONS',
  ANALYTICS = 'ANALYTICS',
  CUSTOM_FIELDS = 'CUSTOM_FIELDS',
  API_ACCESS = 'API_ACCESS',
  ADVANCED_SEARCH = 'ADVANCED_SEARCH',
  BULK_OPERATIONS = 'BULK_OPERATIONS',
  WHITE_LABEL = 'WHITE_LABEL'
}

export interface Workspace {
  id: string;
  name: string;
  slug: string; // Unique identifier for URLs
  description?: string;
  
  // Branding
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  
  // Settings
  timezone: string;
  currency: string;
  language: string;
  
  // Features and limits
  enabledFeatures: WorkspaceFeature[];
  limits: {
    maxUsers: number;
    maxFeedbackPerMonth: number;
    maxIntegrations: number;
    maxCustomFields: number;
    storageLimit: number; // MB
  };
  
  // Configuration
  settings: {
    allowPublicSubmissions: boolean;
    requireEmailVerification: boolean;
    autoAssignFeedback: boolean;
    defaultFeedbackVisibility: 'internal' | 'external';
    enableUpvoting: boolean;
    enableComments: boolean;
    enableFileUploads: boolean;
    maxFileSize: number; // MB
    allowedFileTypes: string[];
  };
  
  // Subscription and billing
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  billingEmail?: string;
  
  // Status
  isActive: boolean;
  isTrialActive: boolean;
  trialEndsAt?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceUser {
  id: string;
  userId: string;
  workspaceId: string;
  role: UserRole;
  
  // User details (cached from user service)
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  
  // Permissions
  permissions: string[];
  
  // Activity
  lastActiveAt?: string;
  joinedAt: string;
  invitedBy?: string;
  
  // Status
  isActive: boolean;
  isEmailVerified: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  
  // Invitation details
  invitedBy: string;
  token: string;
  expiresAt: string;
  
  // Status
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptedAt?: string;
  acceptedBy?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceUsage {
  workspaceId: string;
  
  // Current period usage
  periodStart: string;
  periodEnd: string;
  
  // Metrics
  feedbackCount: number;
  customerCount: number;
  integrationCount: number;
  storageUsed: number; // MB
  apiCallsCount: number;
  
  // Daily breakdown
  dailyBreakdown: Array<{
    date: string;
    feedbackCount: number;
    customerCount: number;
    apiCalls: number;
  }>;
  
  // Limits and warnings
  isOverLimit: boolean;
  warnings: Array<{
    type: 'approaching_limit' | 'over_limit';
    resource: 'feedback' | 'storage' | 'users' | 'integrations';
    current: number;
    limit: number;
    percentage: number;
  }>;
  
  lastUpdatedAt: string;
}

export interface WorkspaceSettings {
  workspaceId: string;
  
  // General settings
  general: {
    allowPublicSubmissions: boolean;
    requireEmailVerification: boolean;
    defaultAssignee?: string;
    autoArchiveAfterDays?: number;
  };
  
  // Email settings
  email: {
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    emailSignature?: string;
    notificationSettings: {
      newFeedback: boolean;
      statusChanges: boolean;
      comments: boolean;
      assignments: boolean;
    };
  };
  
  // Integration settings
  integrations: {
    allowedTypes: string[];
    webhookSecret?: string;
    rateLimits: Record<string, number>;
  };
  
  // Security settings
  security: {
    enforceSSO: boolean;
    allowedDomains: string[];
    sessionTimeout: number; // minutes
    requireTwoFactor: boolean;
  };
  
  // Custom fields configuration
  customFields: Array<{
    id: string;
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
    required: boolean;
    options?: string[];
    defaultValue?: any;
    description?: string;
    applicableToFeedback: boolean;
    applicableToCustomers: boolean;
  }>;
  
  updatedAt: string;
  updatedBy: string;
}

export interface WorkspaceAnalytics {
  workspaceId: string;
  
  // Overview metrics
  totalFeedback: number;
  totalCustomers: number;
  totalRevenue: number;
  
  // Growth metrics
  feedbackGrowth: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
  
  customerGrowth: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
  
  // Performance metrics
  avgResolutionTime: number; // days
  customerSatisfactionScore?: number; // 1-5
  teamProductivity: {
    avgFeedbackPerUser: number;
    avgResolutionTimePerUser: Record<string, number>;
  };
  
  // Top performers
  topCategories: Array<{
    category: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    feedbackCount: number;
    revenue: number;
  }>;
  
  // Trends
  feedbackTrends: Array<{
    date: string;
    count: number;
    resolved: number;
  }>;
  
  sentimentTrends: Array<{
    date: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
  
  generatedAt: string;
}