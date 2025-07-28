'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { customerProfileApi, CustomerProfile, CustomerSource } from '../../lib/api';
import { formatDate, formatRelativeTime } from '../../lib/utils/dateUtils';
import { User, Mail, Building, Calendar, Activity, MessageCircle, ThumbsUp, TrendingUp } from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  border: 1px solid #EAECF0;
`;

const Avatar = styled.div<{ hasImage: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  color: white;
  ${props => props.hasImage ? `
    background-image: url(${props.children});
    background-size: cover;
    background-position: center;
  ` : `
    background: linear-gradient(135deg, #5E72E4 0%, #A855F7 100%);
  `}
`;

const CustomerInfo = styled.div`
  flex: 1;
`;

const CustomerName = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #101828;
  margin: 0 0 8px 0;
`;

const CustomerMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 14px;
`;

const SourceBadge = styled.span<{ source: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  
  ${props => {
    switch (props.source) {
      case 'FEEDBACK_CREATION':
        return 'background: #EEF2FF; color: #3538CD;';
      case 'DASHBOARD_MANUAL':
        return 'background: #F0FDF4; color: #166534;';
      case 'WIDGET_SUBMISSION':
        return 'background: #FFFBEB; color: #B45309;';
      case 'CSV_IMPORT':
        return 'background: #F3E8FF; color: #7C3AED;';
      case 'INTEGRATION_SLACK':
        return 'background: #FEF3F2; color: #B91C1C;';
      default:
        return 'background: #F3F4F6; color: #374151;';
    }
  }}
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: white;
  border: 1px solid #EAECF0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #101828;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #667085;
  margin-bottom: 8px;
`;

const StatIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  color: #5E72E4;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Section = styled.div`
  background: white;
  border: 1px solid #EAECF0;
  border-radius: 12px;
  padding: 24px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #101828;
  margin: 0 0 16px 0;
`;

const FeedbackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FeedbackItem = styled.div`
  padding: 16px;
  border: 1px solid #EAECF0;
  border-radius: 8px;
  transition: border-color 0.2s;
  
  &:hover {
    border-color: #5E72E4;
  }
`;

const FeedbackTitle = styled.div`
  font-weight: 500;
  color: #101828;
  margin-bottom: 8px;
`;

const FeedbackMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #667085;
`;

const ActivityTimeline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #F9FAFB;
`;

const ActivityIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #5E72E4;
  color: white;
  font-size: 12px;
  font-weight: 600;
`;

const ActivityDetails = styled.div`
  flex: 1;
`;

const ActivitySource = styled.div`
  font-weight: 500;
  color: #101828;
  font-size: 14px;
`;

const ActivityTime = styled.div`
  font-size: 12px;
  color: #667085;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #667085;
`;

const ErrorMessage = styled.div`
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 8px;
  padding: 16px;
  color: #DC2626;
  text-align: center;
`;

interface CustomerProfilePageProps {
  customerId: string;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({ customerId }) => {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomerProfile();
  }, [customerId]);

  const loadCustomerProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await customerProfileApi.getCustomerProfile(customerId);
      setCustomer(profile);
    } catch (err) {
      console.error('Failed to load customer profile:', err);
      setError('Failed to load customer profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSourceDisplayName = (source: string): string => {
    const sourceMap: Record<string, string> = {
      'DASHBOARD_MANUAL': 'Manual Entry',
      'FEEDBACK_CREATION': 'Feedback Form',
      'WIDGET_SUBMISSION': 'Feedback Widget',
      'CSV_IMPORT': 'CSV Import',
      'INTEGRATION_SLACK': 'Slack',
      'INTEGRATION_ZENDESK': 'Zendesk',
      'INTEGRATION_INTERCOM': 'Intercom'
    };
    return sourceMap[source] || source;
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading customer profile...</LoadingSpinner>
      </Container>
    );
  }

  if (error || !customer) {
    return (
      <Container>
        <ErrorMessage>
          {error || 'Customer not found'}
        </ErrorMessage>
      </Container>
    );
  }

  const stats = customer.stats || {};
  const primarySource = customer.metadata?.source || 'UNKNOWN';

  return (
    <Container>
      <Header>
        <Avatar hasImage={!!customer.avatar}>
          {customer.avatar ? customer.avatar : getInitials(customer.name)}
        </Avatar>
        
        <CustomerInfo>
          <CustomerName>{customer.name || 'Anonymous Customer'}</CustomerName>
          
          <CustomerMeta>
            {customer.email && (
              <MetaItem>
                <Mail size={16} />
                {customer.email}
              </MetaItem>
            )}
            
            {customer.company && (
              <MetaItem>
                <Building size={16} />
                {customer.company}
              </MetaItem>
            )}
            
            <MetaItem>
              <Calendar size={16} />
              Customer since {formatDate(customer.createdAt)}
            </MetaItem>
            
            <MetaItem>
              <Activity size={16} />
              Last seen {formatRelativeTime(customer.lastSeenAt)}
            </MetaItem>
          </CustomerMeta>
          
          <SourceBadge source={primarySource}>
            {getSourceDisplayName(primarySource)}
          </SourceBadge>
        </CustomerInfo>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatIcon><MessageCircle size={20} /></StatIcon>
          <StatValue>{stats.total || 0}</StatValue>
          <StatLabel>Total Feedback</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon><ThumbsUp size={20} /></StatIcon>
          <StatValue>{Math.round(stats.avgUpvotes || 0)}</StatValue>
          <StatLabel>Avg Upvotes</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon><TrendingUp size={20} /></StatIcon>
          <StatValue>{stats.positive || 0}</StatValue>
          <StatLabel>Positive Feedback</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatIcon><Activity size={20} /></StatIcon>
          <StatValue>{stats.totalActivities || 0}</StatValue>
          <StatLabel>Total Activities</StatLabel>
        </StatCard>
      </StatsGrid>

      <ContentGrid>
        <MainContent>
          <Section>
            <SectionTitle>Recent Feedback</SectionTitle>
            <FeedbackList>
              {customer.feedback && customer.feedback.length > 0 ? (
                customer.feedback.slice(0, 5).map(feedback => (
                  <FeedbackItem key={feedback.id}>
                    <FeedbackTitle>{feedback.title}</FeedbackTitle>
                    <FeedbackMeta>
                      <span>Status: {feedback.status}</span>
                      {feedback.sentiment && <span>Sentiment: {feedback.sentiment}</span>}
                      <span>{feedback.upvoteCount} upvotes</span>
                      <span>{formatDate(feedback.createdAt)}</span>
                    </FeedbackMeta>
                  </FeedbackItem>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#667085', padding: '32px' }}>
                  No feedback submitted yet
                </div>
              )}
            </FeedbackList>
          </Section>
        </MainContent>

        <Sidebar>
          <Section>
            <SectionTitle>Activity Timeline</SectionTitle>
            <ActivityTimeline>
              {customer.activityTimeline && customer.activityTimeline.length > 0 ? (
                customer.activityTimeline.slice(0, 5).map((activity, index) => (
                  <ActivityItem key={index}>
                    <ActivityIcon>
                      {activity.source.substring(0, 2).toUpperCase()}
                    </ActivityIcon>
                    <ActivityDetails>
                      <ActivitySource>{getSourceDisplayName(activity.source)}</ActivitySource>
                      <ActivityTime>
                        {activity.activityCount} activities • {formatRelativeTime(activity.lastActivity)}
                      </ActivityTime>
                    </ActivityDetails>
                  </ActivityItem>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#667085', padding: '16px' }}>
                  No recent activity
                </div>
              )}
            </ActivityTimeline>
          </Section>
        </Sidebar>
      </ContentGrid>
    </Container>
  );
};