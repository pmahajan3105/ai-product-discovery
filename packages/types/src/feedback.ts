// Core feedback data types extracted and simplified from Zeda patterns

export enum FeedbackSource {
  DASHBOARD = 'DASHBOARD',
  WIDGET = 'WIDGET', 
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  ZENDESK = 'ZENDESK',
  INTERCOM = 'INTERCOM',
  CSV_IMPORT = 'CSV_IMPORT',
  API = 'API'
}

export enum FeedbackState {
  BACKLOG = 'BACKLOG',
  OPEN = 'OPEN', 
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED'
}

export enum FeedbackVisibility {
  INTERNAL = 'INTERNAL',
  INTERNAL_AND_EXTERNAL = 'INTERNAL_AND_EXTERNAL'
}

export enum FeedbackPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface FeedbackMetadata {
  [key: string]: any;
  originalSource?: string;
  integrationId?: string;
  externalId?: string;
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  category?: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  value: any;
  required?: boolean;
  options?: string[]; // For select/multiselect types
}

export interface Feedback {
  id: string;
  title: string;
  description: string;
  originalDescription?: string; // For AI-enhanced descriptions
  source: FeedbackSource;
  state: FeedbackState;
  visibility: FeedbackVisibility;
  priority?: FeedbackPriority;
  
  // User information
  createdBy?: string; // Internal user ID
  createdByExternalUser: boolean;
  customerName?: string;
  customerEmail?: string;
  
  // Associations
  workspaceId: string;
  customerId?: string; // Company/organization ID
  contactId?: string; // Individual contact ID
  assigneeId?: string; // Internal user assigned
  
  // Engagement metrics
  upvoteCount: number;
  commentCount: number;
  viewCount?: number;
  
  // Metadata and customization
  metadata: FeedbackMetadata;
  customFields: CustomField[];
  
  // Revenue impact (simplified from Zeda)
  revenueImpact?: number;
  customerValue?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  
  // Flags
  isArchived: boolean;
  isActive: boolean;
  isPinned?: boolean;
  
  // Generated content flags
  isDescriptionGenerated?: boolean;
  hasSimilarFeedback?: boolean;
  
  // Code for external reference
  feedbackCode: string; // Human-readable identifier
}

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  parentCommentId?: string; // For threaded comments
  
  text: string;
  mentions: string[]; // User IDs mentioned
  
  // Author information
  createdBy?: string; // Internal user ID
  createdByExternalUser: boolean;
  authorName?: string;
  authorEmail?: string;
  
  // Metadata
  isInternal: boolean; // Internal team comment vs customer-facing
  isPinned?: boolean;
  visibility: FeedbackVisibility;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Engagement
  reactions?: { [emoji: string]: number };
  
  workspaceId: string;
}

export interface FeedbackFilter {
  search?: string;
  sources?: FeedbackSource[];
  states?: FeedbackState[];
  priorities?: FeedbackPriority[];
  assigneeIds?: string[];
  customerIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  hasRevenue?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'upvotes' | 'revenue' | 'priority';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface FeedbackSummary {
  totalCount: number;
  byState: Record<FeedbackState, number>;
  bySource: Record<FeedbackSource, number>;
  byPriority: Record<FeedbackPriority, number>;
  totalRevenue: number;
  avgResolutionTime?: number; // in days
  topTags: Array<{ tag: string; count: number }>;
}

// Event types for feedback lifecycle
export enum FeedbackEventType {
  CREATED = 'FEEDBACK_CREATED',
  UPDATED = 'FEEDBACK_UPDATED', 
  STATE_CHANGED = 'FEEDBACK_STATE_CHANGED',
  ASSIGNED = 'FEEDBACK_ASSIGNED',
  COMMENTED = 'FEEDBACK_COMMENTED',
  UPVOTED = 'FEEDBACK_UPVOTED',
  ARCHIVED = 'FEEDBACK_ARCHIVED',
  DELETED = 'FEEDBACK_DELETED'
}

export interface FeedbackEvent {
  id: string;
  type: FeedbackEventType;
  feedbackId: string;
  userId?: string;
  metadata: Record<string, any>;
  createdAt: string;
  workspaceId: string;
}