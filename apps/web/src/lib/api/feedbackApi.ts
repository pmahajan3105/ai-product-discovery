/**
 * Feedback API Service
 * Frontend service for feedback-related API operations
 * Connects to the backend feedback APIs
 */

import { apiClient, ApiResponse } from './apiClient';
import { Feedback, FeedbackComment, FeedbackState, FeedbackPriority } from '@feedback-hub/types';

export interface CreateFeedbackRequest {
  title: string;
  description: string;
  source: string;
  customerId?: string;
  integrationId?: string;
  category?: string;
  priority?: FeedbackPriority;
  assignedTo?: string;
  sourceMetadata?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateFeedbackRequest {
  title?: string;
  description?: string;
  status?: FeedbackState;
  category?: string;
  priority?: FeedbackPriority;
  assignedTo?: string;
  metadata?: Record<string, any>;
}

export interface FeedbackListParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'status' | 'upvoteCount';
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  status?: string; // comma-separated
  category?: string; // comma-separated
  assignedTo?: string; // comma-separated
  customerId?: string; // comma-separated
  integrationId?: string; // comma-separated
  priority?: string; // comma-separated
  source?: string; // comma-separated
  sentiment?: string; // comma-separated
  dateStart?: string; // ISO date
  dateEnd?: string; // ISO date
  hasCustomer?: boolean;
  isAssigned?: boolean;
}

export interface BulkUpdateStatusRequest {
  feedbackIds: string[];
  status: FeedbackState;
}

export interface BulkAssignRequest {
  feedbackIds: string[];
  assignedTo: string | null;
}

export interface AddCommentRequest {
  content: string;
  isInternal?: boolean;
}

export interface FeedbackStats {
  total: number;
  byStatus: Record<FeedbackState, number>;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  bySentiment: Record<string, number>;
}

export interface FilterOptions {
  categories: string[];
  sources: string[];
  assignees: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  customers: Array<{
    id: string;
    name: string;
    company?: string;
  }>;
  integrations: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  statuses: FeedbackState[];
  priorities: FeedbackPriority[];
  sentiments: string[];
}

export class FeedbackApiService {
  /**
   * Create new feedback
   */
  async createFeedback(organizationId: string, data: CreateFeedbackRequest): Promise<ApiResponse<Feedback>> {
    return apiClient.post(`/organizations/${organizationId}/feedback`, data);
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(feedbackId: string): Promise<ApiResponse<Feedback>> {
    return apiClient.get(`/feedback/${feedbackId}`);
  }

  /**
   * Update feedback
   */
  async updateFeedback(feedbackId: string, data: UpdateFeedbackRequest): Promise<ApiResponse<Feedback>> {
    return apiClient.put(`/feedback/${feedbackId}`, data);
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(feedbackId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/feedback/${feedbackId}`);
  }

  /**
   * Get paginated feedback list with filters
   */
  async getFeedbackList(organizationId: string, params: FeedbackListParams = {}): Promise<ApiResponse<Feedback[]>> {
    // Filter out undefined values to match apiClient expectations
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined)
    );
    return apiClient.get(`/organizations/${organizationId}/feedback`, cleanParams);
  }

  /**
   * Bulk update feedback status
   */
  async bulkUpdateStatus(organizationId: string, feedbackIds: string[], status: string): Promise<ApiResponse<{ updated: number; message: string }>> {
    return apiClient.put(`/organizations/${organizationId}/feedback/bulk/status`, { feedbackIds, status });
  }

  /**
   * Bulk assign feedback
   */
  async bulkAssign(organizationId: string, feedbackIds: string[], assignedTo: string | null): Promise<ApiResponse<{ updated: number; message: string }>> {
    return apiClient.put(`/organizations/${organizationId}/feedback/bulk/assign`, { feedbackIds, assignedTo });
  }

  /**
   * Add comment to feedback
   */
  async addComment(feedbackId: string, data: AddCommentRequest): Promise<ApiResponse<FeedbackComment>> {
    return apiClient.post(`/feedback/${feedbackId}/comments`, data);
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(organizationId: string): Promise<ApiResponse<FeedbackStats>> {
    return apiClient.get(`/organizations/${organizationId}/feedback/stats`);
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(organizationId: string): Promise<ApiResponse<FilterOptions>> {
    return apiClient.get(`/organizations/${organizationId}/feedback/filters`);
  }
}

// Export singleton instance
export const feedbackApi = new FeedbackApiService();