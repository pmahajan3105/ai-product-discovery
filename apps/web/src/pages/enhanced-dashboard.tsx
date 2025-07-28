/**
 * Enhanced Dashboard Page
 * Comprehensive dashboard with metrics, activity feeds, and quick actions
 * Based on Zeda's dashboard architecture patterns
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { DashboardMetrics } from '../components/Dashboard/DashboardMetrics';
import { ActivityFeed } from '../components/Dashboard/ActivityFeed';
import { QuickActions } from '../components/Dashboard/QuickActions';
import { RecentFeedback } from '../components/Dashboard/RecentFeedback';
import { authApi } from '../lib/api';
import { 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Settings
} from 'lucide-react';

export default function EnhancedDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [dateRange, setDateRange] = useState('Last 30 days');

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

  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange);
    setMetricsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setMetricsLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    setMetricsLoading(true);
    setTimeout(() => {
      setMetricsLoading(false);
    }, 1500);
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading..." user={user || { name: 'Loading...', email: '' }}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const dashboardActions = (
    <div className="flex items-center space-x-3">
      {/* Date Range Selector */}
      <div className="relative">
        <select
          value={dateRange}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="Last 7 days">Last 7 days</option>
          <option value="Last 30 days">Last 30 days</option>
          <option value="Last 90 days">Last 90 days</option>
          <option value="This year">This year</option>
          <option value="All time">All time</option>
        </select>
        <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* Action Buttons */}
      <button
        onClick={handleRefresh}
        disabled={metricsLoading}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
        Refresh
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

        {/* Key Metrics */}
        <DashboardMetrics 
          dateRange={dateRange}
          loading={metricsLoading}
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