import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { EnhancedDashboardMetrics } from '../components/Dashboard/EnhancedDashboardMetrics';
import { ActivityFeed } from '../components/Dashboard/ActivityFeed';
import { QuickActions } from '../components/Dashboard/QuickActions';
import { RecentFeedback } from '../components/Dashboard/RecentFeedback';
import { authApi } from '../lib/api';
import { useDashboardData, useRealtimeDashboard } from '../hooks/useDashboard';
import { DashboardSkeleton } from '../components/Loading/SkeletonLoaders';
import { useDashboardUrlState, copyCurrentUrlToClipboard } from '../hooks/useUrlState';
import { 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Share2,
  Link
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  
  // URL state management for dashboard
  const { timeRange, search, filters, view, updateState } = useDashboardUrlState();
  
  // Mock organization ID - in real app, this comes from user context
  const organizationId = 'org_1';
  
  // Get dashboard data with React Query
  const { metrics, activity, isLoading: dashboardLoading, error, refetch } = useDashboardData(organizationId, timeRange);
  
  // Enable real-time updates
  useRealtimeDashboard(organizationId);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const authResponse = await authApi.getAuthStatus();
        if (!authResponse.success || !authResponse.data?.profile) {
          router.push('/auth');
          return;
        }

        const userProfile = authResponse.data.profile;
        setUser({
          id: userProfile.id || 'user-id',
          name: `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email,
          email: userProfile.email,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName
        });

      } catch (error) {
        console.error('Error loading user data:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleQuickAction = (actionId: string) => {
    console.log('Quick action:', actionId);
    
    switch (actionId) {
      case 'import-data':
        // Open import modal or navigate to import page
        break;
      case 'export-data':
        // Trigger export functionality
        break;
      case 'search':
        // Open search modal or focus search input
        break;
      case 'keyboard-shortcuts':
        // Show keyboard shortcuts modal
        break;
      case 'bulk-actions':
        // Show bulk actions panel
        break;
      case 'advanced-search':
        // Navigate to advanced search
        break;
      default:
        console.log('Unhandled action:', actionId);
    }
  };

  const handleTimeRangeChange = (newRange: string) => {
    updateState({ timeRange: newRange });
  };
  
  const handleSearchChange = (newSearch: string) => {
    updateState({ search: newSearch });
  };
  
  const handleFiltersChange = (newFilters: any[]) => {
    updateState({ filters: newFilters });
  };
  
  const handleViewChange = (newView: string) => {
    updateState({ view: newView });
  };
  
  const handleShareDashboard = async () => {
    setShareLoading(true);
    try {
      await copyCurrentUrlToClipboard();
      // Show success notification - for now just console log
      console.log('Dashboard URL copied to clipboard!');
      // In a real app, you'd show a toast notification here
    } catch (error) {
      console.error('Failed to copy URL:', error);
    } finally {
      setShareLoading(false);
    }
  };

  const handleMetricClick = (metric: string, value?: any) => {
    console.log('Metric clicked:', metric, value);
    
    switch (metric) {
      case 'total_feedback':
        router.push('/feedback');
        break;
      case 'new_feedback':
        router.push('/feedback?status=new');
        break;
      case 'resolved_feedback':
        router.push('/feedback?status=resolved');
        break;
      case 'status':
        router.push(`/feedback?status=${value}`);
        break;
      case 'source':
        router.push(`/feedback?source=${value}`);
        break;
      case 'trend':
        // Could open a detailed view for that specific date
        console.log('Trend data:', value);
        break;
      default:
        console.log('Unhandled metric click:', metric, value);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading..." user={user || { name: 'Loading...', email: '' }}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const dashboardActions = (
    <div className="flex items-center space-x-3">
      {/* Action Buttons */}
      <button
        onClick={handleRefresh}
        disabled={dashboardLoading}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${dashboardLoading ? 'animate-spin' : ''}`} />
        Refresh
      </button>
      
      <button
        onClick={handleShareDashboard}
        disabled={shareLoading}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        title="Copy shareable dashboard URL"
      >
        <Link className={`w-4 h-4 mr-2 ${shareLoading ? 'animate-pulse' : ''}`} />
        Share
      </button>

      <button
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => handleQuickAction('export-data')}
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </button>

      <button
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => router.push('/settings')}
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </button>
    </div>
  );

  return (
    <DashboardLayout 
      title="Dashboard" 
      user={user}
      actions={dashboardActions}
    >
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user.firstName || user.name}! 👋
          </h1>
          <p className="text-blue-100">
            Here's what's happening with your feedback management today.
          </p>
        </div>

        {/* Enhanced Interactive Metrics Dashboard with URL State */}
        <EnhancedDashboardMetrics
          metrics={metrics}
          isLoading={dashboardLoading}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
          onMetricClick={handleMetricClick}
          searchQuery={search}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          view={view}
          onViewChange={handleViewChange}
        />

        {/* Quick Actions */}
        <QuickActions onAction={handleQuickAction} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Feedback - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <RecentFeedback 
              onViewAll={() => router.push('/feedback')}
              maxItems={8}
            />
          </div>

          {/* Activity Feed - Takes up 1 column */}
          <div className="lg:col-span-1">
            <ActivityFeed maxItems={10} />
          </div>
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Integration Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Slack</span>
                </div>
                <span className="text-xs text-green-600 font-medium">Connected</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Zendesk</span>
                </div>
                <span className="text-xs text-yellow-600 font-medium">Syncing</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">Intercom</span>
                </div>
                <span className="text-xs text-gray-500 font-medium">Not connected</span>
              </div>
            </div>
            
            <button 
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
              onClick={() => router.push('/integrations')}
            >
              Manage Integrations
            </button>
          </div>

          {/* Team Activity Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Feedback processed today</span>
                <span className="text-lg font-semibold text-gray-900">23</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active team members</span>
                <span className="text-lg font-semibold text-gray-900">8</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg response time</span>
                <span className="text-lg font-semibold text-green-600">2.4h</span>
              </div>
              
              <div className="pt-2 border-t border-gray-100">
                <button 
                  className="w-full px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                  onClick={() => router.push('/insights')}
                >
                  View Detailed Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}