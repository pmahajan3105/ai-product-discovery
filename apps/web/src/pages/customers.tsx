import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { Table } from '../components/Zeda/Table/Table';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Zeda/Input/Input';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';
import styled from '@emotion/styled';
import { Colors } from '../theme/colors';
import Link from 'next/link';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
`;

const StatsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: ${Colors.white};
  padding: 20px;
  border-radius: 8px;
  border: 1px solid ${Colors.grey200};
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 600;
  color: ${Colors.grey900};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${Colors.grey600};
`;

const CustomerName = styled.div`
  font-weight: 500;
  color: ${Colors.grey900};
  margin-bottom: 4px;
`;

const CustomerEmail = styled.div`
  font-size: 14px;
  color: ${Colors.grey600};
`;

const CompanyName = styled.div`
  font-size: 14px;
  color: ${Colors.grey700};
  font-weight: 500;
`;

const SourceBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: ${Colors.info50};
  color: ${Colors.info700};
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-right: 4px;
`;

const FeedbackCount = styled.div`
  font-weight: 500;
  color: ${Colors.grey900};
`;

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50 });

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, [pagination.page, searchTerm]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      // Get current organization ID from user context or localStorage
      const organizationId = user?.currentOrganizationId || localStorage.getItem('currentOrganizationId');
      
      const response = await apiClient.get(`/api/organizations/${organizationId}/customers`, {
        params: {
          search: searchTerm,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: 'lastActivity',
          sortOrder: 'DESC'
        }
      });
      
      setCustomers(response.data.data || []);
      setPagination(prev => ({ 
        ...prev, 
        total: response.data.pagination?.total || 0 
      }));
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const organizationId = user?.currentOrganizationId || localStorage.getItem('currentOrganizationId');
      const response = await apiClient.get(`/api/organizations/${organizationId}/customers/stats`);
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to load customer stats:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      render: (customer: any) => (
        <Link href={`/customers/${customer.id}`}>
          <div style={{ cursor: 'pointer' }}>
            <CustomerName>{customer.name || 'Anonymous'}</CustomerName>
            <CustomerEmail>{customer.email || 'No email'}</CustomerEmail>
          </div>
        </Link>
      )
    },
    {
      key: 'company',
      label: 'Company',
      render: (customer: any) => (
        <CompanyName>{customer.company || '—'}</CompanyName>
      )
    },
    {
      key: 'sources',
      label: 'Sources',
      render: (customer: any) => (
        <div>
          {(customer.metadata?.sources || []).map((source: string) => (
            <SourceBadge key={source}>
              {source.replace('INTEGRATION_', '').toLowerCase()}
            </SourceBadge>
          ))}
        </div>
      )
    },
    {
      key: 'feedbackCount',
      label: 'Feedback',
      render: (customer: any) => (
        <FeedbackCount>{customer.feedbackCount || 0}</FeedbackCount>
      )
    },
    {
      key: 'lastSeenAt',
      label: 'Last Seen',
      render: (customer: any) => (
        <div style={{ fontSize: '14px', color: Colors.grey600 }}>
          {customer.lastSeenAt ? new Date(customer.lastSeenAt).toLocaleDateString() : '—'}
        </div>
      )
    }
  ];

  return (
    <DashboardLayout title="Customers" user={user}>
      <PageHeader>
        <h1>Customers</h1>
      </PageHeader>

      {stats && (
        <StatsContainer>
          <StatCard>
            <StatValue>{stats.total}</StatValue>
            <StatLabel>Total Customers</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.recentActivity}</StatValue>
            <StatLabel>Recent (30 days)</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.withEmail}</StatValue>
            <StatLabel>With Email</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{Object.keys(stats.topCompanies || {}).length}</StatValue>
            <StatLabel>Companies</StatLabel>
          </StatCard>
        </StatsContainer>
      )}

      <SearchContainer>
        <Input
          placeholder="Search customers by name, email, or company..."
          value={searchTerm}
          onChange={handleSearch}
          style={{ minWidth: '300px' }}
        />
      </SearchContainer>

      <Table
        columns={columns}
        data={customers}
        loading={loading}
        pagination={{
          current: pagination.page,
          total: pagination.total,
          pageSize: pagination.limit,
          onChange: (page: number) => setPagination(prev => ({ ...prev, page }))
        }}
        emptyState={{
          title: searchTerm ? 'No customers found' : 'No customers yet',
          description: searchTerm 
            ? 'Try adjusting your search terms'
            : 'Customers will appear here as they submit feedback through your integrations.'
        }}
      />
    </DashboardLayout>
  );
}