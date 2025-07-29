import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '../../components/Layout/DashboardLayout';
import { Button } from '../../components/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../lib/apiClient';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import Link from 'next/link';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const BackButton = styled(Button)`
  background: transparent;
  color: ${Colors.grey600};
  border: none;
  padding: 8px 16px;
  
  &:hover {
    background: ${Colors.grey50};
    color: ${Colors.grey700};
  }
`;

const CustomerHeader = styled.div`
  background: ${Colors.white};
  padding: 24px;
  border-radius: 8px;
  border: 1px solid ${Colors.grey200};
  margin-bottom: 24px;
`;

const CustomerName = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin: 0 0 8px 0;
`;

const CustomerMeta = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
  margin-bottom: 16px;
`;

const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${Colors.grey500};
  text-transform: uppercase;
`;

const MetaValue = styled.span`
  font-size: 14px;
  color: ${Colors.grey900};
`;

const SourceBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: ${Colors.blue50};
  color: ${Colors.blue700};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 4px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: ${Colors.white};
  padding: 16px;
  border-radius: 8px;
  border: 1px solid ${Colors.grey200};
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: ${Colors.grey600};
`;

const FeedbackSection = styled.div`
  background: ${Colors.white};
  border-radius: 8px;
  border: 1px solid ${Colors.grey200};
`;

const SectionHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${Colors.grey200};
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: ${Colors.grey900};
  }
`;

const FeedbackList = styled.div`
  padding: 0;
`;

const FeedbackItem = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid ${Colors.grey100};
  
  &:last-child {
    border-bottom: none;
  }
`;

const FeedbackTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: ${Colors.grey900};
  
  a {
    color: inherit;
    text-decoration: none;
    
    &:hover {
      color: ${Colors.blue600};
    }
  }
`;

const FeedbackMeta = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 14px;
  color: ${Colors.grey600};
`;

const StatusBadge = styled.span<{ status: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.status) {
      case 'open':
        return `background: ${Colors.orange50}; color: ${Colors.orange700};`;
      case 'in_progress':
        return `background: ${Colors.blue50}; color: ${Colors.blue700};`;
      case 'resolved':
        return `background: ${Colors.success50}; color: ${Colors.green700};`;
      case 'closed':
        return `background: ${Colors.grey100}; color: ${Colors.grey700};`;
      default:
        return `background: ${Colors.grey100}; color: ${Colors.grey700};`;
    }
  }}
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: ${Colors.grey600};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px;
  color: ${Colors.grey600};
`;

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadCustomer(id);
    }
  }, [id]);

  const loadCustomer = async (customerId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/api/customers/${customerId}`);
      setCustomer(response.data.data);
    } catch (error: any) {
      console.error('Failed to load customer:', error);
      setError(error.response?.data?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Details" user={user}>
        <LoadingSpinner>Loading customer details...</LoadingSpinner>
      </DashboardLayout>
    );
  }

  if (error || !customer) {
    return (
      <DashboardLayout title="Customer Details" user={user}>
        <PageHeader>
          <BackButton onClick={() => router.push('/customers')}>
            ← Back to Customers
          </BackButton>
        </PageHeader>
        <EmptyState>
          <h3>Customer not found</h3>
          <p>{error || 'The customer you are looking for does not exist.'}</p>
        </EmptyState>
      </DashboardLayout>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSources = (sources: string[]) => {
    if (!sources || sources.length === 0) return [];
    return sources.map(source => 
      source.replace('INTEGRATION_', '').toLowerCase()
    );
  };

  return (
    <DashboardLayout title={`${customer.name || 'Anonymous'}`} user={user}>
      <PageHeader>
        <BackButton onClick={() => router.push('/customers')}>
          ← Back to Customers
        </BackButton>
      </PageHeader>

      <CustomerHeader>
        <CustomerName>{customer.name || 'Anonymous User'}</CustomerName>
        
        <CustomerMeta>
          <MetaItem>
            <MetaLabel>Email</MetaLabel>
            <MetaValue>{customer.email || 'No email provided'}</MetaValue>
          </MetaItem>
          
          <MetaItem>
            <MetaLabel>Company</MetaLabel>
            <MetaValue>{customer.company || '—'}</MetaValue>
          </MetaItem>
          
          <MetaItem>
            <MetaLabel>Last Seen</MetaLabel>
            <MetaValue>
              {customer.lastSeenAt ? formatDate(customer.lastSeenAt) : '—'}
            </MetaValue>
          </MetaItem>
          
          <MetaItem>
            <MetaLabel>Sources</MetaLabel>
            <MetaValue>
              {formatSources(customer.metadata?.sources || []).map((source: string) => (
                <SourceBadge key={source}>{source}</SourceBadge>
              ))}
            </MetaValue>
          </MetaItem>
        </CustomerMeta>
      </CustomerHeader>

      <StatsGrid>
        <StatCard>
          <StatValue>{customer.feedback?.length || 0}</StatValue>
          <StatLabel>Total Feedback</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>
            {customer.feedback?.filter((f: any) => f.status === 'resolved').length || 0}
          </StatValue>
          <StatLabel>Resolved</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>
            {customer.feedback?.filter((f: any) => f.status === 'open').length || 0}
          </StatValue>
          <StatLabel>Open</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatValue>
            {customer.createdAt ? formatDate(customer.createdAt) : '—'}
          </StatValue>
          <StatLabel>Customer Since</StatLabel>
        </StatCard>
      </StatsGrid>

      <FeedbackSection>
        <SectionHeader>
          <h2>Feedback History</h2>
        </SectionHeader>
        
        <FeedbackList>
          {customer.feedback && customer.feedback.length > 0 ? (
            customer.feedback.map((feedback: any) => (
              <FeedbackItem key={feedback.id}>
                <FeedbackTitle>
                  <Link href={`/feedback/${feedback.id}`}>
                    {feedback.title || 'Untitled Feedback'}
                  </Link>
                </FeedbackTitle>
                
                <FeedbackMeta>
                  <StatusBadge status={feedback.status}>
                    {feedback.status?.replace('_', ' ') || 'unknown'}
                  </StatusBadge>
                  
                  <span>
                    {formatDate(feedback.createdAt)}
                  </span>
                  
                  {feedback.source && (
                    <span>via {feedback.source.toLowerCase()}</span>
                  )}
                </FeedbackMeta>
              </FeedbackItem>
            ))
          ) : (
            <EmptyState>
              <h3>No feedback yet</h3>
              <p>This customer hasn't submitted any feedback through your channels.</p>
            </EmptyState>
          )}
        </FeedbackList>
      </FeedbackSection>
    </DashboardLayout>
  );
}