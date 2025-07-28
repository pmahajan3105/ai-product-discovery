'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { customerProfileApi, CustomerProfile, CustomerSource, CustomerSearchOptions, CustomerCompany } from '../../lib/api';
import { formatDate, formatRelativeTime } from '../../lib/utils/dateUtils';
import { Search, Filter, Users, Building, Mail, Calendar, MoreHorizontal, Eye } from 'lucide-react';

const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: #101828;
  margin: 0;
`;

const SearchAndFilters = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #EAECF0;
`;

const SearchInput = styled.div`
  position: relative;
  flex: 1;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #667085;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px 10px 40px;
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #5E72E4;
    box-shadow: 0 0 0 3px rgba(94, 114, 228, 0.1);
  }
`;

const FilterSelect = styled.select`
  padding: 10px 14px;
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #5E72E4;
  }
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid #D0D5DD;
  border-radius: 8px;
  background: white;
  color: #344054;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: #F9FAFB;
  }
`;

const CustomerTable = styled.div`
  background: white;
  border: 1px solid #EAECF0;
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 80px;
  gap: 16px;
  padding: 16px 20px;
  background: #F9FAFB;
  border-bottom: 1px solid #EAECF0;
  font-size: 12px;
  font-weight: 500;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 80px;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #EAECF0;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: #F9FAFB;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const CustomerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CustomerAvatar = styled.div<{ hasImage: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
  ${props => props.hasImage ? `
    background-image: url(${props.children});
    background-size: cover;
    background-position: center;
  ` : `
    background: linear-gradient(135deg, #5E72E4 0%, #A855F7 100%);
  `}
`;

const CustomerDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CustomerName = styled.div`
  font-weight: 500;
  color: #101828;
  font-size: 14px;
`;

const CustomerEmail = styled.div`
  color: #667085;
  font-size: 12px;
`;

const CompanyName = styled.div`
  color: #344054;
  font-size: 14px;
`;

const SourceBadge = styled.span<{ source: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
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
        return 'background: #FEF2F2; color: #B91C1C;';
      default:
        return 'background: #F3F4F6; color: #374151;';
    }
  }}
`;

const ActivityIndicator = styled.div<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${props => props.isActive ? '#059669' : '#667085'};
`;

const ActivityDot = styled.div<{ isActive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.isActive ? '#10B981' : '#D1D5DB'};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: #667085;
  cursor: pointer;
  border-radius: 6px;
  
  &:hover {
    background: #F3F4F6;
    color: #344054;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 16px 20px;
  background: #F9FAFB;
  border-top: 1px solid #EAECF0;
`;

const PaginationInfo = styled.div`
  color: #667085;
  font-size: 14px;
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`;

const PaginationButton = styled.button<{ active?: boolean }>`
  padding: 8px 12px;
  border: 1px solid #D0D5DD;
  border-radius: 6px;
  background: ${props => props.active ? '#5E72E4' : 'white'};
  color: ${props => props.active ? 'white' : '#344054'};
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.active ? '#4C63D2' : '#F9FAFB'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: #667085;
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 500;
  color: #344054;
  margin: 0 0 8px 0;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #667085;
`;

interface CustomersListProps {
  organizationId: string;
  onCustomerClick?: (customerId: string) => void;
}

export const CustomersList: React.FC<CustomersListProps> = ({ 
  organizationId, 
  onCustomerClick 
}) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [companies, setCompanies] = useState<CustomerCompany[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 25,
    offset: 0,
    pages: 0
  });

  useEffect(() => {
    loadCompanies();
  }, [organizationId]);

  useEffect(() => {
    loadCustomers();
  }, [organizationId, searchTerm, selectedCompany, selectedSource, pagination.offset]);

  const loadCompanies = async () => {
    try {
      const companiesList = await customerProfileApi.getCustomerCompanies(organizationId);
      setCompanies(companiesList);
    } catch (err) {
      console.warn('Failed to load companies:', err);
    }
  };

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const searchOptions: CustomerSearchOptions = {
        search: searchTerm || undefined,
        companies: selectedCompany ? [selectedCompany] : undefined,
        sources: selectedSource ? [selectedSource as CustomerSource] : undefined,
        limit: pagination.limit,
        offset: pagination.offset,
        sortBy: 'lastActivity',
        sortOrder: 'DESC'
      };

      const result = await customerProfileApi.searchCustomers(organizationId, searchOptions);
      setCustomers(result.customers);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        pages: result.pagination.pages
      }));
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [organizationId, searchTerm, selectedCompany, selectedSource, pagination.offset, pagination.limit]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCompany(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSource(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      offset: newPage * prev.limit
    }));
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

  const isRecentlyActive = (lastSeenAt: string): boolean => {
    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const daysDiff = (now.getTime() - lastSeen.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 7; // Active within last 7 days
  };

  const getSourceDisplayName = (source: string): string => {
    const sourceMap: Record<string, string> = {
      'DASHBOARD_MANUAL': 'Manual',
      'FEEDBACK_CREATION': 'Feedback',
      'WIDGET_SUBMISSION': 'Widget',
      'CSV_IMPORT': 'CSV',
      'INTEGRATION_SLACK': 'Slack',
      'INTEGRATION_ZENDESK': 'Zendesk',
      'INTEGRATION_INTERCOM': 'Intercom'
    };
    return sourceMap[source] || source;
  };

  const currentPage = Math.floor(pagination.offset / pagination.limit);

  if (loading && customers.length === 0) {
    return (
      <Container>
        <LoadingSpinner>Loading customers...</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Customers</Title>
      </Header>

      <SearchAndFilters>
        <SearchInput>
          <SearchIcon>
            <Search size={16} />
          </SearchIcon>
          <Input
            type="text"
            placeholder="Search customers by name, email, or company..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </SearchInput>

        <FilterSelect value={selectedCompany} onChange={handleCompanyChange}>
          <option value="">All Companies</option>
          {companies.map(company => (
            <option key={company.name} value={company.name}>
              {company.name} ({company.customerCount})
            </option>
          ))}
        </FilterSelect>

        <FilterSelect value={selectedSource} onChange={handleSourceChange}>
          <option value="">All Sources</option>
          {Object.values(CustomerSource).map(source => (
            <option key={source} value={source}>
              {getSourceDisplayName(source)}
            </option>
          ))}
        </FilterSelect>
      </SearchAndFilters>

      <CustomerTable>
        <TableHeader>
          <div>Customer</div>
          <div>Company</div>
          <div>Source</div>
          <div>Last Activity</div>
          <div>Feedback</div>
          <div></div>
        </TableHeader>

        {customers.length > 0 ? (
          customers.map(customer => (
            <TableRow 
              key={customer.id} 
              onClick={() => onCustomerClick?.(customer.id)}
            >
              <CustomerInfo>
                <CustomerAvatar hasImage={!!customer.avatar}>
                  {customer.avatar ? customer.avatar : getInitials(customer.name)}
                </CustomerAvatar>
                <CustomerDetails>
                  <CustomerName>{customer.name || 'Anonymous'}</CustomerName>
                  {customer.email && <CustomerEmail>{customer.email}</CustomerEmail>}
                </CustomerDetails>
              </CustomerInfo>

              <CompanyName>{customer.company || '—'}</CompanyName>

              <SourceBadge source={customer.metadata?.source || 'UNKNOWN'}>
                {getSourceDisplayName(customer.metadata?.source || 'UNKNOWN')}
              </SourceBadge>

              <ActivityIndicator isActive={isRecentlyActive(customer.lastSeenAt)}>
                <ActivityDot isActive={isRecentlyActive(customer.lastSeenAt)} />
                {formatRelativeTime(customer.lastSeenAt)}
              </ActivityIndicator>

              <div>{customer.feedback?.length || 0}</div>

              <ActionButton onClick={(e) => {
                e.stopPropagation();
                onCustomerClick?.(customer.id);
              }}>
                <Eye size={16} />
              </ActionButton>
            </TableRow>
          ))
        ) : (
          <EmptyState>
            <Users size={48} color="#D1D5DB" />
            <EmptyTitle>No customers found</EmptyTitle>
            <p>Try adjusting your search terms or filters.</p>
          </EmptyState>
        )}

        {customers.length > 0 && (
          <Pagination>
            <PaginationInfo>
              Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} customers
            </PaginationInfo>
            
            <PaginationButtons>
              <PaginationButton
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                Previous
              </PaginationButton>
              
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const page = currentPage < 3 ? i : currentPage - 2 + i;
                if (page >= pagination.pages) return null;
                
                return (
                  <PaginationButton
                    key={page}
                    active={page === currentPage}
                    onClick={() => handlePageChange(page)}
                  >
                    {page + 1}
                  </PaginationButton>
                );
              })}
              
              <PaginationButton
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.pages - 1}
              >
                Next
              </PaginationButton>
            </PaginationButtons>
          </Pagination>
        )}
      </CustomerTable>
    </Container>
  );
};