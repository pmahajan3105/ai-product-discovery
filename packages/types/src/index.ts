// Main export file for FeedbackHub types
// Simplified and extracted from Zeda patterns

// Core feedback management types
export * from './feedback';

// Customer and company management types  
export * from './customer';

// Integration and sync types
export * from './integration';

// Workspace and user management types
export * from './workspace';

// Common utility types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}

// Error handling types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

// File upload types
export interface FileUpload {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  workspaceId: string;
}

// Notification types
export enum NotificationType {
  NEW_FEEDBACK = 'NEW_FEEDBACK',
  FEEDBACK_UPDATED = 'FEEDBACK_UPDATED',
  FEEDBACK_ASSIGNED = 'FEEDBACK_ASSIGNED',
  FEEDBACK_COMMENTED = 'FEEDBACK_COMMENTED',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  WORKSPACE_LIMIT = 'WORKSPACE_LIMIT'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  userId: string;
  workspaceId: string;
  isRead: boolean;
  createdAt: string;
}