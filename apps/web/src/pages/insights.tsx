import React from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import styled from '@emotion/styled';
import { Colors } from '../theme/colors';

const PlaceholderCard = styled.div`
  background-color: ${Colors.white};
  padding: 48px;
  border-radius: 12px;
  border: 1px solid ${Colors.grey200};
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
`;

const PlaceholderTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin: 0 0 16px 0;
`;

const PlaceholderDescription = styled.p`
  font-size: 16px;
  color: ${Colors.grey600};
  line-height: 1.5;
  margin: 0;
`;

export default function Insights() {
  const mockUser = {
    name: 'John Doe',
    email: 'john@example.com'
  };

  return (
    <DashboardLayout title="Insights" user={mockUser}>
      <PlaceholderCard>
        <PlaceholderTitle>📊 Analytics & Insights</PlaceholderTitle>
        <PlaceholderDescription>
          This is where you'll view feedback analytics and insights. 
          Coming soon: sentiment analysis, trends, category breakdowns, and reporting.
        </PlaceholderDescription>
      </PlaceholderCard>
    </DashboardLayout>
  );
}