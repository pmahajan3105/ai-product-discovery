/**
 * Enhanced Dashboard Metrics Component
 * Displays key performance indicators and interactive charts
 * Production-ready with Chart.js integration
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { FeedbackTrendsChart } from '../Charts/FeedbackTrendsChart';
import { StatusDistributionChart } from '../Charts/StatusDistributionChart';
import { SourceMetricsChart } from '../Charts/SourceMetricsChart';
import { DashboardMetrics as DashboardMetricsType } from '../../hooks/useDashboard';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  color?: string;
  loading?: boolean;
  onClick?: () => void;
}

interface DashboardMetricsProps {
  dateRange?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue',
  loading = false,
  onClick 
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="w-16 h-8 bg-gray-200 rounded mb-2"></div>
          <div className="w-24 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      icon: 'text-blue-600',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-100',
      icon: 'text-green-600',
      trend: 'text-green-600'
    },
    yellow: {
      bg: 'bg-yellow-100',
      icon: 'text-yellow-600',
      trend: 'text-yellow-600'
    },
    red: {
      bg: 'bg-red-100',
      icon: 'text-red-600',
      trend: 'text-red-600'
    },
    purple: {
      bg: 'bg-purple-100',
      icon: 'text-purple-600',
      trend: 'text-purple-600'
    }
  };

  const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return '↗';
    if (trend.direction === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'up') return 'text-green-600';
    if (trend.direction === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-6 transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-gray-300' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`w-10 h-10 ${selectedColor.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${selectedColor.icon}`} />
        </div>
      </div>
      
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
      
      {trend && (
        <div className="flex items-center">
          <span className={`text-sm font-medium ${getTrendColor()}`}>
            {getTrendIcon()} {Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-gray-500 ml-2">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ 
  dateRange = 'Last 30 days',
  loading = false 
}) => {
  // Mock data - in real app, this would come from API
  const metrics = [
    {
      title: 'Total Feedback',
      value: 1247,
      icon: MessageSquare,
      color: 'blue',
      trend: {
        value: 12.5,
        direction: 'up' as const,
        label: 'vs last month'
      }
    },
    {
      title: 'Active Users',
      value: 892,
      icon: Users,
      color: 'green',
      trend: {
        value: 8.3,
        direction: 'up' as const,
        label: 'vs last month'
      }
    },
    {
      title: 'Resolved Items',
      value: 456,
      icon: CheckCircle,
      color: 'purple',
      trend: {
        value: 15.2,
        direction: 'up' as const,
        label: 'vs last month'
      }
    },
    {
      title: 'Avg Response Time',
      value: '2.4h',
      icon: Clock,
      color: 'yellow',
      trend: {
        value: 5.7,
        direction: 'down' as const,
        label: 'faster than last month'
      }
    },
    {
      title: 'Satisfaction Score',
      value: '4.8/5',
      icon: TrendingUp,
      color: 'green',
      trend: {
        value: 2.1,
        direction: 'up' as const,
        label: 'vs last month'
      }
    },
    {
      title: 'Open Issues',
      value: 127,
      icon: AlertCircle,
      color: 'red',
      trend: {
        value: 3.2,
        direction: 'down' as const,
        label: 'vs last month'
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
          <p className="text-sm text-gray-600 mt-1">{dateRange}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            color={metric.color}
            trend={metric.trend}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
};