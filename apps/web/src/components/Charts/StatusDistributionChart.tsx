/**
 * Status Distribution Chart Component
 * Interactive doughnut chart showing feedback status distribution
 */

import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StatusDistributionChartProps {
  data: {
    status: string;
    count: number;
    percentage: number;
  }[];
  onStatusClick?: (status: string) => void;
  height?: number;
}

const ChartContainer = styled.div<{ height: number }>`
  height: ${props => props.height}px;
  position: relative;
  background: ${Colors.white};
  border-radius: 8px;
  padding: 16px;
  border: 1px solid ${Colors.grey200};
`;

const ChartHeader = styled.div`
  margin-bottom: 16px;
`;

const ChartTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const ChartContent = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  height: ${props => props.height - 60}px;
`;

const ChartWrapper = styled.div`
  flex: 1;
  position: relative;
  height: 100%;
`;

const LegendWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LegendItem = styled.div<{ clickable?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.clickable ? Colors.grey50 : 'transparent'};
  }
`;

const LegendLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LegendColor = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.color};
`;

const LegendLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
  text-transform: capitalize;
`;

const LegendStats = styled.div`
  text-align: right;
`;

const LegendCount = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const LegendPercentage = styled.div`
  font-size: 12px;
  color: ${Colors.grey500};
`;

const CenterStats = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
`;

const TotalCount = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${Colors.grey900};
  line-height: 1;
`;

const TotalLabel = styled.div`
  font-size: 12px;
  color: ${Colors.grey500};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
`;

// Status color mapping
const statusColors: Record<string, string> = {
  new: Colors.blue500,
  triaged: Colors.orange500,
  planned: Colors.purple500,
  in_progress: Colors.yellow500,
  resolved: Colors.success500,
  archived: Colors.grey400,
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  data,
  onStatusClick,
  height = 300
}) => {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = {
    labels: data.map(item => item.status),
    datasets: [
      {
        data: data.map(item => item.count),
        backgroundColor: data.map(item => statusColors[item.status] || Colors.grey400),
        borderColor: Colors.white,
        borderWidth: 2,
        hoverBackgroundColor: data.map(item => {
          const color = statusColors[item.status] || Colors.grey400;
          // Darken the color on hover
          return color.replace('500', '600');
        }),
        hoverBorderWidth: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      tooltip: {
        backgroundColor: Colors.grey800,
        titleColor: Colors.white,
        bodyColor: Colors.white,
        borderColor: Colors.grey600,
        borderWidth: 1,
        cornerRadius: 6,
        callbacks: {
          title: () => '',
          label: (context: any) => {
            const status = context.label;
            const count = context.parsed;
            const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
            return [`${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}`, `${count} items (${percentage}%)`];
          },
        }
      },
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0 && onStatusClick) {
        const index = elements[0].index;
        const status = data[index].status;
        onStatusClick(status);
      }
    },
    onHover: (event: any, elements: any) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };

  const formatStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  return (
    <ChartContainer height={height}>
      <ChartHeader>
        <ChartTitle>Status Distribution</ChartTitle>
      </ChartHeader>
      <ChartContent height={height}>
        <ChartWrapper>
          <Doughnut data={chartData} options={options} />
          <CenterStats>
            <TotalCount>{totalCount}</TotalCount>
            <TotalLabel>Total</TotalLabel>
          </CenterStats>
        </ChartWrapper>
        <LegendWrapper>
          {data.map((item, _index) => (
            <LegendItem
              key={item.status}
              clickable={!!onStatusClick}
              onClick={() => onStatusClick?.(item.status)}
            >
              <LegendLeft>
                <LegendColor color={statusColors[item.status] || Colors.grey400} />
                <LegendLabel>{formatStatusLabel(item.status)}</LegendLabel>
              </LegendLeft>
              <LegendStats>
                <LegendCount>{item.count}</LegendCount>
                <LegendPercentage>{item.percentage}%</LegendPercentage>
              </LegendStats>
            </LegendItem>
          ))}
        </LegendWrapper>
      </ChartContent>
    </ChartContainer>
  );
};