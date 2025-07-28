/**
 * React Query hooks for dashboard data management
 * Provides real-time dashboard statistics and metrics
 */

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { feedbackApi } from '../lib/api/feedbackApi';
import { feedbackKeys } from './useFeedback';

export interface DashboardMetrics {
  totalFeedback: number;
  newFeedback: number;
  resolvedFeedback: number;
  avgResponseTime: number;
  customerSatisfaction: number;
  trendData: {
    period: string;
    feedback: number;
    resolved: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
  sourceDistribution: {
    source: string;
    count: number;
    percentage: number;
  }[];
  recentActivity: {
    id: string;
    type: 'feedback_created' | 'feedback_updated' | 'comment_added';
    title: string;
    timestamp: string;
    user: string;
  }[];
}

// Query Keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: (organizationId: string, timeRange: string) => 
    [...dashboardKeys.all, 'metrics', organizationId, timeRange] as const,
  activity: (organizationId: string, limit: number) => 
    [...dashboardKeys.all, 'activity', organizationId, limit] as const,
};

/**
 * Get dashboard metrics with time range
 */
export function useDashboardMetrics(organizationId: string, timeRange: string = '7d') {
  return useQuery({
    queryKey: dashboardKeys.metrics(organizationId, timeRange),
    queryFn: async () => {
      // Get feedback stats
      const statsResponse = await feedbackApi.getFeedbackStats(organizationId);
      
      // Transform into dashboard metrics format
      const stats = statsResponse.data;
      const total = stats.total || 0;
      const newCount = stats.byStatus?.['new'] || 0;
      const resolvedCount = stats.byStatus?.['resolved'] || 0;
      
      // Calculate trends (mock data for now - in real app, this comes from time-series API)
      const trendData = generateMockTrendData(timeRange);
      
      // Status distribution
      const statusDistribution = Object.entries(stats.byStatus || {}).map(([status, count]) => ({
        status,
        count: count as number,
        percentage: total > 0 ? Math.round((count as number / total) * 100) : 0,
      }));

      // Source distribution
      const sourceDistribution = Object.entries(stats.bySource || {}).map(([source, count]) => ({
        source,
        count: count as number,
        percentage: total > 0 ? Math.round((count as number / total) * 100) : 0,
      }));

      const metrics: DashboardMetrics = {
        totalFeedback: total,
        newFeedback: newCount,
        resolvedFeedback: resolvedCount,
        avgResponseTime: 2.3, // Mock data - calculate from actual response times
        customerSatisfaction: 4.2, // Mock data - calculate from sentiment analysis
        trendData,
        statusDistribution,
        sourceDistribution,
        recentActivity: [], // Will be populated by separate query
      };

      return { data: metrics };
    },
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

/**
 * Get recent activity feed
 */
export function useRecentActivity(organizationId: string, limit: number = 10) {
  return useQuery({
    queryKey: dashboardKeys.activity(organizationId, limit),
    queryFn: async () => {
      // Mock recent activity - in real app, this comes from activity log API
      const activities = [
        {
          id: '1',
          type: 'feedback_created' as const,
          title: 'New feedback: "Login issues on mobile"',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: 'John Doe',
        },
        {
          id: '2',
          type: 'feedback_updated' as const,
          title: 'Updated status to "In Progress"',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          user: 'Jane Smith',
        },
        {
          id: '3',
          type: 'comment_added' as const,
          title: 'Added comment to "Dashboard loading slowly"',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          user: 'Mike Johnson',
        },
      ];

      return { data: activities.slice(0, limit) };
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

/**
 * Combined dashboard data hook
 */
export function useDashboardData(organizationId: string, timeRange: string = '7d') {
  const metrics = useDashboardMetrics(organizationId, timeRange);
  const activity = useRecentActivity(organizationId);

  return {
    metrics: metrics.data?.data,
    activity: activity.data?.data || [],
    isLoading: metrics.isLoading || activity.isLoading,
    error: metrics.error || activity.error,
    refetch: () => {
      metrics.refetch();
      activity.refetch();
    },
  };
}

/**
 * Real-time dashboard updates
 */
export function useRealtimeDashboard(organizationId: string) {
  const queryClient = useQueryClient();

  // Listen for real-time updates (WebSocket, SSE, or polling)
  // For now, we'll use periodic invalidation
  React.useEffect(() => {
    if (!organizationId) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: feedbackKeys.stats(organizationId) });
    }, 30 * 1000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [organizationId, queryClient]);
}

// Helper function to generate mock trend data
function generateMockTrendData(timeRange: string) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
  const trendData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trendData.push({
      period: date.toISOString().split('T')[0],
      feedback: Math.floor(Math.random() * 20) + 5,
      resolved: Math.floor(Math.random() * 15) + 2,
    });
  }
  
  return trendData;
}