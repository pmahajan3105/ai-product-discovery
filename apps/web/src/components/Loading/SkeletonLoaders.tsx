/**
 * Component-specific skeleton loaders
 * Replaces generic spinners with exact component shapes for better UX
 */

import React from 'react';
import styled, { keyframes } from '@emotion/styled';
import { Colors } from '../../theme/colors';

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const SkeletonBase = styled.div`
  background: ${Colors.grey100};
  background-image: linear-gradient(
    90deg,
    ${Colors.grey100} 0px,
    ${Colors.grey200} 40px,
    ${Colors.grey100} 80px
  );
  background-size: 200px 100%;
  background-repeat: no-repeat;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: 4px;
`;

const SkeletonBox = styled(SkeletonBase)<{ 
  width?: string; 
  height?: string; 
  borderRadius?: string;
}>`
  width: ${props => props.width || '100%'};
  height: ${props => props.height || '20px'};
  border-radius: ${props => props.borderRadius || '4px'};
`;

// Feedback Table Skeleton
export const FeedbackTableSkeleton: React.FC = () => (
  <div style={{ background: Colors.white, borderRadius: '12px', border: `1px solid ${Colors.grey200}`, overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${Colors.grey200}`, background: Colors.grey50 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width="200px" height="16px" />
        <SkeletonBox width="120px" height="32px" borderRadius="6px" />
      </div>
    </div>
    
    {/* Table Rows */}
    {[...Array(8)].map((_, i) => (
      <div key={i} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '16px 20px', 
        borderBottom: `1px solid ${Colors.grey200}`,
        gap: '16px'
      }}>
        <SkeletonBox width="16px" height="16px" />
        <SkeletonBox width="24px" height="24px" borderRadius="50%" />
        <SkeletonBox width="300px" height="16px" />
        <SkeletonBox width="80px" height="24px" borderRadius="12px" />
        <SkeletonBox width="60px" height="24px" borderRadius="12px" />
        <SkeletonBox width="120px" height="16px" />
        <SkeletonBox width="40px" height="16px" />
        <SkeletonBox width="80px" height="16px" />
      </div>
    ))}
  </div>
);

// Metric Card Skeleton
export const MetricCardSkeleton: React.FC = () => (
  <div style={{ 
    background: Colors.white, 
    border: `1px solid ${Colors.grey200}`, 
    borderRadius: '12px', 
    padding: '24px' 
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <SkeletonBox width="48px" height="48px" borderRadius="10px" />
      <SkeletonBox width="100px" height="14px" />
    </div>
    <SkeletonBox width="80px" height="36px" style={{ marginBottom: '8px' }} />
    <SkeletonBox width="120px" height="14px" />
  </div>
);

// Chart Skeleton
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div style={{ 
    background: Colors.white, 
    border: `1px solid ${Colors.grey200}`, 
    borderRadius: '8px', 
    padding: '16px',
    height: `${height}px`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <SkeletonBox width="150px" height="16px" />
      <SkeletonBox width="200px" height="12px" />
    </div>
    <div style={{ height: `${height - 60}px`, position: 'relative' }}>
      <SkeletonBox width="100%" height="100%" borderRadius="4px" />
    </div>
  </div>
);

// Activity Feed Skeleton
export const ActivityFeedSkeleton: React.FC = () => (
  <div style={{ 
    background: Colors.white, 
    border: `1px solid ${Colors.grey200}`, 
    borderRadius: '8px', 
    padding: '20px' 
  }}>
    <SkeletonBox width="120px" height="20px" style={{ marginBottom: '20px' }} />
    
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px', 
        marginBottom: '16px' 
      }}>
        <SkeletonBox width="32px" height="32px" borderRadius="50%" />
        <div style={{ flex: 1 }}>
          <SkeletonBox width="80%" height="14px" style={{ marginBottom: '6px' }} />
          <SkeletonBox width="60px" height="12px" />
        </div>
      </div>
    ))}
  </div>
);

// Settings Page Skeleton
export const SettingsPageSkeleton: React.FC = () => (
  <div style={{ display: 'flex', gap: '24px', height: '100vh' }}>
    {/* Sidebar Skeleton */}
    <div style={{ 
      width: '280px', 
      background: Colors.white, 
      border: `1px solid ${Colors.grey200}`,
      borderRadius: '8px',
      padding: '16px'
    }}>
      <SkeletonBox width="150px" height="24px" style={{ marginBottom: '20px' }} />
      
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ marginBottom: '12px' }}>
          <SkeletonBox width="100%" height="40px" borderRadius="6px" />
        </div>
      ))}
    </div>
    
    {/* Content Skeleton */}
    <div style={{ flex: 1 }}>
      <div style={{ 
        background: Colors.white, 
        border: `1px solid ${Colors.grey200}`,
        borderRadius: '8px',
        padding: '24px'
      }}>
        <SkeletonBox width="200px" height="28px" style={{ marginBottom: '20px' }} />
        
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ marginBottom: '24px' }}>
            <SkeletonBox width="120px" height="16px" style={{ marginBottom: '8px' }} />
            <SkeletonBox width="100%" height="40px" borderRadius="6px" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Dashboard Skeleton
export const DashboardSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
    {/* Header */}
    <div style={{ 
      background: 'linear-gradient(90deg, #3B82F6, #8B5CF6)', 
      borderRadius: '8px', 
      padding: '24px' 
    }}>
      <SkeletonBox width="300px" height="32px" style={{ marginBottom: '8px' }} />
      <SkeletonBox width="400px" height="16px" />
    </div>
    
    {/* Metrics Grid */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
      gap: '20px' 
    }}>
      {[...Array(4)].map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
    
    {/* Charts Grid */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '2fr 1fr', 
      gridTemplateRows: 'auto auto', 
      gap: '24px' 
    }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <ChartSkeleton height={400} />
      </div>
      <ChartSkeleton height={400} />
      <ChartSkeleton height={300} />
    </div>
  </div>
);

// Modal Skeleton
export const ModalSkeleton: React.FC<{ title?: string }> = ({ title = "Loading..." }) => (
  <div style={{ padding: '24px', minWidth: '400px' }}>
    <SkeletonBox width="200px" height="24px" style={{ marginBottom: '20px' }} />
    
    {[...Array(4)].map((_, i) => (
      <div key={i} style={{ marginBottom: '20px' }}>
        <SkeletonBox width="80px" height="14px" style={{ marginBottom: '8px' }} />
        <SkeletonBox width="100%" height="40px" borderRadius="6px" />
      </div>
    ))}
    
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
      <SkeletonBox width="80px" height="36px" borderRadius="6px" />
      <SkeletonBox width="100px" height="36px" borderRadius="6px" />
    </div>
  </div>
);

// List Item Skeleton
export const ListItemSkeleton: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    padding: '12px 16px', 
    borderBottom: `1px solid ${Colors.grey200}`,
    gap: '12px'
  }}>
    <SkeletonBox width="40px" height="40px" borderRadius="50%" />
    <div style={{ flex: 1 }}>
      <SkeletonBox width="70%" height="16px" style={{ marginBottom: '6px' }} />
      <SkeletonBox width="50%" height="14px" />
    </div>
    <SkeletonBox width="60px" height="24px" borderRadius="12px" />
  </div>
);

// Navigation Skeleton
export const NavigationSkeleton: React.FC = () => (
  <div style={{ 
    width: '240px', 
    height: '100vh', 
    background: Colors.white, 
    borderRight: `1px solid ${Colors.grey200}`,
    padding: '16px'
  }}>
    <SkeletonBox width="160px" height="32px" style={{ marginBottom: '24px' }} />
    
    {[...Array(8)].map((_, i) => (
      <div key={i} style={{ marginBottom: '8px' }}>
        <SkeletonBox width="100%" height="44px" borderRadius="8px" />
      </div>
    ))}
  </div>
);