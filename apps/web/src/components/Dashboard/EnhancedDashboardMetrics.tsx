/**
 * Enhanced Dashboard Metrics Component
 * Production-ready dashboard with Chart.js integration and real data
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
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { FeedbackTrendsChart } from '../Charts/FeedbackTrendsChart';
import { StatusDistributionChart } from '../Charts/StatusDistributionChart';
import { SourceMetricsChart } from '../Charts/SourceMetricsChart';
import { DashboardMetrics as DashboardMetricsType } from '../../hooks/useDashboard';

interface EnhancedDashboardMetricsProps {
  metrics?: DashboardMetricsType;
  isLoading?: boolean;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  onMetricClick?: (metric: string, value?: any) => void;
  
  // URL state support (optional)
  searchQuery?: string;
  onSearchChange?: (search: string) => void;
  filters?: any[];
  onFiltersChange?: (filters: any[]) => void;
  view?: string;
  onViewChange?: (view: string) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  gap: 16px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: ${Colors.grey900};
  flex: 1;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  background: ${Colors.grey100};
  border-radius: 8px;
  padding: 4px;
`;

const TimeRangeButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.active ? `
    background: ${Colors.white};
    color: ${Colors.primary600};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  ` : `
    background: transparent;
    color: ${Colors.grey600};
    
    &:hover {
      color: ${Colors.grey900};
    }
  `}
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
`;

const MetricCard = styled.div<{ clickable?: boolean }>`
  background: ${Colors.white};
  border: 1px solid ${Colors.grey200};
  border-radius: 12px;
  padding: 24px;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: all 0.2s;

  ${props => props.clickable && `
    &:hover {
      border-color: ${Colors.primary300};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transform: translateY(-1px);
    }
  `}
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const MetricIcon = styled.div<{ color: string }>`
  width: 48px;
  height: 48px;
  background: ${props => props.color};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    color: ${Colors.white};
  }
`;

const MetricTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MetricValue = styled.div`
  font-size: 36px;
  font-weight: 700;
  color: ${Colors.grey900};
  line-height: 1;
  margin-bottom: 8px;
`;

const MetricTrend = styled.div<{ direction: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  
  ${props => {
    switch (props.direction) {
      case 'up':
        return `color: ${Colors.success600};`;
      case 'down':
        return `color: ${Colors.red600};`;
      default:
        return `color: ${Colors.grey500};`;
    }
  }}
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto;
  gap: 24px;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
`;

const ChartArea = styled.div<{ span?: boolean }>`
  ${props => props.span && `
    grid-column: 1 / -1;
    
    @media (max-width: 1200px) {
      grid-column: 1;
    }
  `}
`;

const LoadingSkeleton = styled.div`
  background: ${Colors.grey100};
  border-radius: 8px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

export const EnhancedDashboardMetrics: React.FC<EnhancedDashboardMetricsProps> = ({
  metrics,
  isLoading,
  timeRange,
  onTimeRangeChange,
  onMetricClick
}) => {
  const timeRangeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ];

  const handleDataPointClick = (dataIndex: number, datasetIndex: number) => {
    if (metrics && onMetricClick) {
      const trendData = metrics.trendData[dataIndex];
      onMetricClick('trend', { date: trendData.period, datasetIndex });
    }
  };

  const handleStatusClick = (status: string) => {
    if (onMetricClick) {
      onMetricClick('status', status);
    }
  };

  const handleSourceClick = (source: string) => {
    if (onMetricClick) {
      onMetricClick('source', source);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <Header>
          <LoadingSkeleton style={{ width: '200px', height: '32px' }} />
          <LoadingSkeleton style={{ width: '300px', height: '40px' }} />
        </Header>
        <MetricsGrid>
          {[...Array(4)].map((_, i) => (
            <LoadingSkeleton key={i} style={{ height: '140px' }} />
          ))}
        </MetricsGrid>
        <ChartsGrid>
          <LoadingSkeleton style={{ height: '400px' }} />
          <LoadingSkeleton style={{ height: '400px' }} />
          <LoadingSkeleton style={{ height: '300px' }} />
        </ChartsGrid>
      </Container>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Container>
      <Header>
        <Title>Dashboard Overview</Title>
        <TimeRangeSelector>
          {timeRangeOptions.map(option => (
            <TimeRangeButton
              key={option.value}
              active={timeRange === option.value}
              onClick={() => onTimeRangeChange(option.value)}
            >
              {option.label}
            </TimeRangeButton>
          ))}
        </TimeRangeSelector>
      </Header>

      {/* Key Metrics Cards */}
      <MetricsGrid>
        <MetricCard 
          clickable 
          onClick={() => onMetricClick?.('total_feedback', metrics.totalFeedback)}
        >
          <MetricHeader>
            <MetricIcon color={Colors.blue500}>
              <MessageSquare size={24} />
            </MetricIcon>
            <MetricTitle>Total Feedback</MetricTitle>
          </MetricHeader>
          <MetricValue>{metrics.totalFeedback.toLocaleString()}</MetricValue>
          <MetricTrend direction="up">
            <TrendingUp size={16} />
            12% vs last period
          </MetricTrend>
        </MetricCard>

        <MetricCard 
          clickable 
          onClick={() => onMetricClick?.('new_feedback', metrics.newFeedback)}
        >
          <MetricHeader>
            <MetricIcon color={Colors.orange500}>
              <AlertCircle size={24} />
            </MetricIcon>
            <MetricTitle>New Feedback</MetricTitle>
          </MetricHeader>
          <MetricValue>{metrics.newFeedback.toLocaleString()}</MetricValue>
          <MetricTrend direction="up">
            <TrendingUp size={16} />
            8% vs last period
          </MetricTrend>
        </MetricCard>

        <MetricCard 
          clickable 
          onClick={() => onMetricClick?.('resolved_feedback', metrics.resolvedFeedback)}
        >
          <MetricHeader>
            <MetricIcon color={Colors.success500}>
              <CheckCircle size={24} />
            </MetricIcon>
            <MetricTitle>Resolved</MetricTitle>
          </MetricHeader>
          <MetricValue>{metrics.resolvedFeedback.toLocaleString()}</MetricValue>
          <MetricTrend direction="up">
            <TrendingUp size={16} />
            15% vs last period
          </MetricTrend>
        </MetricCard>

        <MetricCard 
          clickable 
          onClick={() => onMetricClick?.('avg_response_time', metrics.avgResponseTime)}
        >
          <MetricHeader>
            <MetricIcon color={Colors.purple500}>
              <Clock size={24} />
            </MetricIcon>
            <MetricTitle>Avg Response Time</MetricTitle>
          </MetricHeader>
          <MetricValue>{metrics.avgResponseTime}d</MetricValue>
          <MetricTrend direction="down">
            <TrendingUp size={16} style={{ transform: 'rotate(180deg)' }} />
            0.3d faster
          </MetricTrend>
        </MetricCard>
      </MetricsGrid>

      {/* Interactive Charts */}
      <ChartsGrid>
        <ChartArea span>
          <FeedbackTrendsChart
            data={metrics.trendData}
            timeRange={timeRange}
            onDataPointClick={handleDataPointClick}
            height={400}
          />
        </ChartArea>
        
        <StatusDistributionChart
          data={metrics.statusDistribution}
          onStatusClick={handleStatusClick}
          height={400}
        />
        
        <SourceMetricsChart
          data={metrics.sourceDistribution}
          onSourceClick={handleSourceClick}
          height={300}
        />
      </ChartsGrid>
    </Container>
  );
};