// Customer and company data types simplified from Zeda patterns

export enum CustomerSource {
  ORGANIC = 'ORGANIC',
  INVITED = 'INVITED',
  IMPORTED = 'IMPORTED',
  INTEGRATION = 'INTEGRATION'
}

export interface Customer {
  id: string;
  name: string;
  domain?: string;
  email?: string; // Primary contact email
  
  // Company information
  logo?: string;
  website?: string;
  industry?: string;
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  
  // Financial data
  revenue?: number;
  monthlyRecurringRevenue?: number;
  annualContractValue?: number;
  
  // Metadata
  source: CustomerSource;
  customFields: Array<{
    id: string;
    name: string;
    value: any;
    type: string;
  }>;
  metadata: Record<string, any>;
  
  // Relationship data
  workspaceId: string;
  assignedUserId?: string; // Account manager
  
  // Activity tracking
  lastActivityAt?: string;
  firstFeedbackAt?: string;
  
  // Counts and metrics
  feedbackCount: number;
  contactCount: number;
  totalUpvotes: number;
  
  // Status
  isActive: boolean;
  healthScore?: number; // 0-100
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  
  // Contact details
  title?: string;
  phone?: string;
  timezone?: string;
  
  // Association
  customerId?: string; // Can be individual or part of company
  workspaceId: string;
  
  // Activity
  source: CustomerSource;
  lastActivityAt?: string;
  lastFeedbackAt?: string;
  
  // Engagement metrics
  feedbackCount: number;
  commentCount: number;
  upvoteCount: number;
  
  // Custom fields
  customFields: Array<{
    id: string;
    name: string;
    value: any;
    type: string;
  }>;
  
  // Status
  isActive: boolean;
  isVerified?: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  
  // Segment criteria
  criteria: {
    revenue?: { min?: number; max?: number };
    feedbackCount?: { min?: number; max?: number };
    industry?: string[];
    size?: string[];
    customFields?: Array<{
      fieldId: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }>;
  };
  
  // Metadata
  color?: string;
  workspaceId: string;
  
  // Counts
  customerCount: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInsight {
  customerId: string;
  
  // Activity summary
  totalFeedback: number;
  recentFeedback: number; // Last 30 days
  avgResponseTime?: number; // Hours
  
  // Engagement patterns
  mostActivePeriod?: 'morning' | 'afternoon' | 'evening';
  preferredChannels: string[];
  
  // Feedback analysis
  sentimentTrend: Array<{
    period: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    count: number;
  }>;
  
  topCategories: Array<{
    category: string;
    count: number;
  }>;
  
  // Revenue correlation
  revenueImpact?: number;
  churnRisk?: 'low' | 'medium' | 'high';
  
  // Last updated
  updatedAt: string;
}

export interface CustomerFilter {
  search?: string;
  sources?: CustomerSource[];
  industries?: string[];
  sizes?: string[];
  segments?: string[];
  revenueRange?: { min?: number; max?: number };
  feedbackRange?: { min?: number; max?: number };
  healthScoreRange?: { min?: number; max?: number };
  isActive?: boolean;
  hasRecent?: boolean; // Activity in last 30 days
  sortBy?: 'name' | 'revenue' | 'feedbackCount' | 'lastActivity' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}