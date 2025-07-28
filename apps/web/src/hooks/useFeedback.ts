/**
 * React Query hooks for feedback data management
 * Replaces mock data with real API integration and caching
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi } from '../lib/api/feedbackApi';
import { FilterCondition } from '../components/Filter/filterHelpers';

export interface FeedbackFilters {
  search?: string;
  status?: string[];
  category?: string[];
  assignedTo?: string[];
  customerId?: string[];
  priority?: string[];
  source?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface FeedbackListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: FeedbackFilters;
}

// Query Keys - centralized for consistency
export const feedbackKeys = {
  all: ['feedback'] as const,
  lists: () => [...feedbackKeys.all, 'list'] as const,
  list: (organizationId: string, options: FeedbackListOptions) => 
    [...feedbackKeys.lists(), organizationId, options] as const,
  details: () => [...feedbackKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedbackKeys.details(), id] as const,
  stats: (organizationId: string) => [...feedbackKeys.all, 'stats', organizationId] as const,
  filterOptions: (organizationId: string) => [...feedbackKeys.all, 'filter-options', organizationId] as const,
};

/**
 * Get paginated feedback list with filters
 */
export function useFeedbackList(organizationId: string, options: FeedbackListOptions = {}) {
  return useQuery({
    queryKey: feedbackKeys.list(organizationId, options),
    queryFn: () => feedbackApi.getFeedbackList(organizationId, options),
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

/**
 * Get single feedback item by ID
 */
export function useFeedbackDetail(feedbackId: string) {
  return useQuery({
    queryKey: feedbackKeys.detail(feedbackId),
    queryFn: () => feedbackApi.getFeedbackById(feedbackId),
    enabled: !!feedbackId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get feedback statistics for dashboard
 */
export function useFeedbackStats(organizationId: string) {
  return useQuery({
    queryKey: feedbackKeys.stats(organizationId),
    queryFn: () => feedbackApi.getFeedbackStats(organizationId),
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute for stats
  });
}

/**
 * Get filter options (categories, assignees, etc.)
 */
export function useFeedbackFilterOptions(organizationId: string) {
  return useQuery({
    queryKey: feedbackKeys.filterOptions(organizationId),
    queryFn: () => feedbackApi.getFilterOptions(organizationId),
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Create new feedback with optimistic updates
 */
export function useCreateFeedback(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => feedbackApi.createFeedback(organizationId, data),
    onMutate: async (newFeedback) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedbackKeys.lists() });

      // Snapshot previous value
      const previousFeedback = queryClient.getQueriesData({ queryKey: feedbackKeys.lists() });

      // Optimistically update cache
      queryClient.setQueriesData({ queryKey: feedbackKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          feedback: [{ ...newFeedback, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() }, ...old.feedback],
          pagination: { ...old.pagination, total: old.pagination.total + 1 }
        };
      });

      return { previousFeedback };
    },
    onError: (err, newFeedback, context) => {
      // Rollback on error
      if (context?.previousFeedback) {
        context.previousFeedback.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to get latest data
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.stats(organizationId) });
    },
  });
}

/**
 * Update feedback with optimistic updates
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feedbackId, data }: { feedbackId: string; data: any }) => 
      feedbackApi.updateFeedback(feedbackId, data),
    onMutate: async ({ feedbackId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedbackKeys.detail(feedbackId) });

      // Snapshot previous value
      const previousFeedback = queryClient.getQueryData(feedbackKeys.detail(feedbackId));

      // Optimistically update cache
      queryClient.setQueryData(feedbackKeys.detail(feedbackId), (old: any) => ({
        ...old,
        ...data,
        updatedAt: new Date().toISOString(),
      }));

      return { previousFeedback, feedbackId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFeedback && context?.feedbackId) {
        queryClient.setQueryData(feedbackKeys.detail(context.feedbackId), context.previousFeedback);
      }
    },
    onSettled: (data, error, { feedbackId }) => {
      // Refetch to get latest data
      queryClient.invalidateQueries({ queryKey: feedbackKeys.detail(feedbackId) });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
    },
  });
}

/**
 * Delete feedback with optimistic updates
 */
export function useDeleteFeedback(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedbackId: string) => feedbackApi.deleteFeedback(feedbackId),
    onMutate: async (feedbackId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: feedbackKeys.lists() });

      // Snapshot previous value
      const previousFeedback = queryClient.getQueriesData({ queryKey: feedbackKeys.lists() });

      // Optimistically remove from cache
      queryClient.setQueriesData({ queryKey: feedbackKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          feedback: old.feedback.filter((item: any) => item.id !== feedbackId),
          pagination: { ...old.pagination, total: Math.max(0, old.pagination.total - 1) }
        };
      });

      return { previousFeedback, feedbackId };
    },
    onError: (err, feedbackId, context) => {
      // Rollback on error
      if (context?.previousFeedback) {
        context.previousFeedback.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to get latest data
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.stats(organizationId) });
    },
  });
}

/**
 * Bulk operations with optimistic updates
 */
export function useBulkUpdateStatus(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ feedbackIds, status }: { feedbackIds: string[]; status: string }) => 
      feedbackApi.bulkUpdateStatus(organizationId, feedbackIds, status),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: feedbackKeys.lists() });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.stats(organizationId) });
    },
  });
}

/**
 * Custom hook for search with debouncing
 */
export function useDebouncedFeedbackSearch(
  organizationId: string, 
  searchTerm: string, 
  filters: FilterCondition[] = [],
  delay: number = 300
) {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState(searchTerm);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  const options: FeedbackListOptions = {
    filters: {
      search: debouncedSearchTerm,
      // Convert FilterCondition[] to FeedbackFilters
      // This is a simplified conversion - in production you'd want more sophisticated mapping
    }
  };

  return useFeedbackList(organizationId, options);
}