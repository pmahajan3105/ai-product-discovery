/**
 * Feedback Trends Chart Component
 * Interactive line chart showing feedback trends over time with Chart.js
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FeedbackTrendsChartProps {
  data: {
    period: string;
    feedback: number;
    resolved: number;
  }[];
  timeRange: string;
  onDataPointClick?: (dataIndex: number, datasetIndex: number) => void;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ChartTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${Colors.grey900};
`;

const ChartLegend = styled.div`
  display: flex;
  gap: 16px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${Colors.grey600};
`;

const LegendColor = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background-color: ${props => props.color};
`;

export const FeedbackTrendsChart: React.FC<FeedbackTrendsChartProps> = ({
  data,
  timeRange,
  onDataPointClick,
  height = 300
}) => {
  const formatPeriod = (period: string) => {
    const date = new Date(period);
    if (timeRange === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else if (timeRange === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = {
    labels: data.map(item => formatPeriod(item.period)),
    datasets: [
      {
        label: 'New Feedback',
        data: data.map(item => item.feedback),
        borderColor: Colors.primary500,
        backgroundColor: Colors.primary100,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: Colors.primary500,
        pointBorderColor: Colors.white,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Resolved',
        data: data.map(item => item.resolved),
        borderColor: Colors.success500,
        backgroundColor: Colors.success100,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: Colors.success500,
        pointBorderColor: Colors.white,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
        displayColors: true,
        callbacks: {
          title: (context: any) => {
            const date = new Date(data[context[0].dataIndex].period);
            return date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value} ${label === 'New Feedback' ? 'items' : 'resolved'}`;
          },
          afterBody: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const feedback = data[dataIndex].feedback;
            const resolved = data[dataIndex].resolved;
            const resolutionRate = feedback > 0 ? Math.round((resolved / feedback) * 100) : 0;
            return [`Resolution Rate: ${resolutionRate}%`];
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: Colors.grey500,
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: Colors.grey200,
          borderDash: [2, 2],
        },
        border: {
          display: false,
        },
        ticks: {
          color: Colors.grey500,
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return Number.isInteger(value) ? value : '';
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0 && onDataPointClick) {
        const { datasetIndex, index } = elements[0];
        onDataPointClick(index, datasetIndex);
      }
    },
    onHover: (event: any, elements: any) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };

  return (
    <ChartContainer height={height}>
      <ChartHeader>
        <ChartTitle>Feedback Trends</ChartTitle>
        <ChartLegend>
          <LegendItem>
            <LegendColor color={Colors.primary500} />
            New Feedback
          </LegendItem>
          <LegendItem>
            <LegendColor color={Colors.success500} />
            Resolved
          </LegendItem>
        </ChartLegend>
      </ChartHeader>
      <div style={{ height: height - 60 }}>
        <Line data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};