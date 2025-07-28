/**
 * Source Metrics Chart Component
 * Interactive horizontal bar chart showing feedback sources
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SourceMetricsChartProps {
  data: {
    source: string;
    count: number;
    percentage: number;
  }[];
  onSourceClick?: (source: string) => void;
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

const TotalCount = styled.div`
  font-size: 14px;
  color: ${Colors.grey500};
`;

// Source color mapping
const sourceColors: Record<string, string> = {
  dashboard: Colors.blue500,
  widget: Colors.green500,
  slack: Colors.purple500,
  zendesk: Colors.orange500,
  intercom: Colors.teal500,
  api: Colors.indigo500,
  csv: Colors.pink500,
  email: Colors.red500,
};

export const SourceMetricsChart: React.FC<SourceMetricsChartProps> = ({
  data,
  onSourceClick,
  height = 300
}) => {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const formatSourceLabel = (source: string) => {
    const formatted = source.charAt(0).toUpperCase() + source.slice(1);
    switch (formatted) {
      case 'Dashboard': return 'Dashboard';
      case 'Widget': return 'Feedback Widget';
      case 'Slack': return 'Slack';
      case 'Zendesk': return 'Zendesk';
      case 'Intercom': return 'Intercom';
      case 'Api': return 'API';
      case 'Csv': return 'CSV Import';
      case 'Email': return 'Email';
      default: return formatted;
    }
  };

  const chartData = {
    labels: data.map(item => formatSourceLabel(item.source)),
    datasets: [
      {
        label: 'Feedback Count',
        data: data.map(item => item.count),
        backgroundColor: data.map(item => sourceColors[item.source] || Colors.grey400),
        borderColor: data.map(item => sourceColors[item.source] || Colors.grey400),
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
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
            const source = context.label;
            const count = context.parsed.x;
            const sourceData = data.find(item => formatSourceLabel(item.source) === source);
            const percentage = sourceData ? sourceData.percentage : 0;
            return [`${source}`, `${count} items (${percentage}% of total)`];
          },
        }
      },
    },
    scales: {
      x: {
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
      y: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: Colors.grey600,
          font: {
            size: 12,
            weight: '500',
          },
          padding: 8,
        },
      },
    },
    onClick: (event: any, elements: any) => {
      if (elements.length > 0 && onSourceClick) {
        const index = elements[0].index;
        const source = data[index].source;
        onSourceClick(source);
      }
    },
    onHover: (event: any, elements: any) => {
      event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
    elements: {
      bar: {
        backgroundColor: (context: any) => {
          const index = context.dataIndex;
          const source = data[index]?.source;
          return sourceColors[source] || Colors.grey400;
        },
      },
    },
  };

  return (
    <ChartContainer height={height}>
      <ChartHeader>
        <ChartTitle>Feedback Sources</ChartTitle>
        <TotalCount>{totalCount} total items</TotalCount>
      </ChartHeader>
      <div style={{ height: height - 60 }}>
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};