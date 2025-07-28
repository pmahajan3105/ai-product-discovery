// FeedbackTable using extracted Zeda components
import React, { useState, useMemo } from 'react';
import styled from '@emotion/styled';
import { Colors, ColorFamily } from '../../theme/colors';
import { Feedback, FeedbackState, FeedbackSource, FeedbackPriority } from '@feedback-hub/types';
import FlexContainer from '../Container/FlexContainer';
import Button from '../Button/Button';
import { Plus, Search, Filter, Archive, Trash2, ArrowUp, X } from 'lucide-react';
import Table, { ColumnOption, CellProps } from '../Zeda/Table/Table';
import Tag, { TagType, TagVariant } from '../Zeda/Tag/Tag';
import { FilterContainer, FilterCondition } from '../Filter';

const TableContainer = styled.div`
  background-color: ${Colors.white};
  border-radius: 12px;
  border: 1px solid ${Colors.grey200};
  overflow: hidden;
  height: 100%;
`;

const TableHeader = styled(FlexContainer)`
  padding: 16px 20px;
  border-bottom: 1px solid ${Colors.grey200};
  background-color: ${Colors.grey50};
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid ${Colors.grey300};
  border-radius: 6px;
  font-size: 14px;
  background-color: ${Colors.white};
  
  &:focus {
    outline: none;
    border-color: ${Colors.primary500};
    box-shadow: 0 0 0 3px ${Colors.primary100};
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${Colors.grey500};
`;

const EmptyState = styled(FlexContainer)`
  padding: 80px 20px;
  text-align: center;
  color: ${Colors.grey500};
`;

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${Colors.grey700};
  margin: 0 0 8px 0;
`;

const EmptyDescription = styled.p`
  font-size: 14px;
  color: ${Colors.grey500};
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const BulkActionsBar = styled(FlexContainer)`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${Colors.grey800};
  color: ${Colors.white};
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
`;

const BulkText = styled.span`
  font-size: 14px;
  font-weight: 500;
  margin-right: 16px;
`;

const TitleCell = styled.div`
  .title {
    font-weight: 500;
    color: ${Colors.grey900};
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }
  
  .description {
    font-size: 12px;
    color: ${Colors.grey500};
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const CustomerCell = styled.div`
  .name {
    font-weight: 500;
    color: ${Colors.grey900};
    margin-bottom: 2px;
  }
  
  .email {
    font-size: 12px;
    color: ${Colors.grey500};
  }
`;

const UpvoteContainer = styled(FlexContainer)`
  align-items: center;
  gap: 4px;
  color: ${Colors.grey600};
  font-weight: 500;
`;

const SourceContainer = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

// Cell renderer component
const CellRenderer: React.FC<CellProps & { onStatusChange?: (id: string, status: FeedbackState) => void }> = ({
  value,
  row,
  column,
  onStatusChange,
}) => {
  const feedback = row.original as Feedback;

  const getStatusColorFamily = (state: FeedbackState): ColorFamily => {
    switch (state) {
      case FeedbackState.BACKLOG:
        return ColorFamily.grey;
      case FeedbackState.OPEN:
        return ColorFamily.info;
      case FeedbackState.IN_PROGRESS:
        return ColorFamily.warning;
      case FeedbackState.RESOLVED:
        return ColorFamily.success;
      case FeedbackState.ARCHIVED:
        return ColorFamily.grey;
      default:
        return ColorFamily.grey;
    }
  };

  const getPriorityColorFamily = (priority: FeedbackPriority): ColorFamily => {
    switch (priority) {
      case FeedbackPriority.LOW:
        return ColorFamily.grey;
      case FeedbackPriority.MEDIUM:
        return ColorFamily.info;
      case FeedbackPriority.HIGH:
        return ColorFamily.orange;
      case FeedbackPriority.URGENT:
        return ColorFamily.error;
      default:
        return ColorFamily.grey;
    }
  };

  const getSourceIcon = (source: FeedbackSource) => {
    // Using emoji icons for now - will use iconProps when switching to Lucide icons
    
    switch (source) {
      case FeedbackSource.DASHBOARD:
        return <div style={{ color: Colors.primary600 }}>📝</div>;
      case FeedbackSource.EMAIL:
        return <div style={{ color: Colors.info600 }}>📧</div>;
      case FeedbackSource.SLACK:
        return <div style={{ color: '#4A154B' }}>💬</div>;
      case FeedbackSource.API:
        return <div style={{ color: Colors.purple600 }}>⚡</div>;
      default:
        return <div style={{ color: Colors.grey500 }}>📄</div>;
    }
  };

  switch (column.id) {
    case 'source':
      return (
        <SourceContainer>
          {getSourceIcon(feedback.source)}
        </SourceContainer>
      );

    case 'title':
      return (
        <TitleCell>
          <div className="title">{feedback.title}</div>
          {feedback.description && (
            <div className="description">
              {feedback.description.length > 100 
                ? feedback.description.substring(0, 100) + '...' 
                : feedback.description}
            </div>
          )}
        </TitleCell>
      );

    case 'state':
      return (
        <Tag
          type={TagType.tag}
          variant={TagVariant.sm}
          label={feedback.state.replace('_', ' ')}
          colorFamily={getStatusColorFamily(feedback.state)}
          onClick={() => onStatusChange?.(feedback.id, feedback.state)}
        />
      );

    case 'priority':
      return feedback.priority ? (
        <Tag
          type={TagType.tag}
          variant={TagVariant.sm}
          label={feedback.priority}
          colorFamily={getPriorityColorFamily(feedback.priority)}
        />
      ) : (
        <span style={{ color: Colors.grey400, fontSize: '12px' }}>—</span>
      );

    case 'customer':
      return (
        <CustomerCell>
          {feedback.customerName && (
            <div className="name">
              {feedback.customerName.length > 20 
                ? feedback.customerName.substring(0, 20) + '...' 
                : feedback.customerName}
            </div>
          )}
          {feedback.customerEmail && (
            <div className="email">
              {feedback.customerEmail.length > 25 
                ? feedback.customerEmail.substring(0, 25) + '...' 
                : feedback.customerEmail}
            </div>
          )}
          {!feedback.customerName && !feedback.customerEmail && (
            <span style={{ color: Colors.grey400, fontSize: '12px' }}>Unknown</span>
          )}
        </CustomerCell>
      );

    case 'upvotes':
      return (
        <UpvoteContainer>
          <ArrowUp size={14} />
          {feedback.upvoteCount}
        </UpvoteContainer>
      );

    case 'createdAt':
      return (
        <span style={{ color: Colors.grey600, fontSize: '12px' }}>
          {new Date(feedback.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: new Date(feedback.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          })}
        </span>
      );

    default:
      return <span>{value}</span>;
  }
};

interface ZedaFeedbackTableProps {
  feedbacks: Feedback[];
  loading?: boolean;
  onCreateFeedback?: () => void;
  onEditFeedback?: (feedback: Feedback) => void;
  onDeleteFeedback?: (feedbackIds: string[]) => void;
  onUpdateStatus?: (feedbackId: string, status: FeedbackState) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filters?: FilterCondition[];
  onFiltersChange?: (filters: FilterCondition[]) => void;
}

export function ZedaFeedbackTable({
  feedbacks,
  loading = false,
  onCreateFeedback,
  onEditFeedback,
  onDeleteFeedback,
  onUpdateStatus,
  searchQuery = '',
  onSearchChange,
  filters = [],
  onFiltersChange
}: ZedaFeedbackTableProps) {
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks;
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(feedback =>
        feedback.title.toLowerCase().includes(query) ||
        feedback.description.toLowerCase().includes(query) ||
        feedback.customerName?.toLowerCase().includes(query) ||
        feedback.customerEmail?.toLowerCase().includes(query)
      );
    }
    
    // Apply advanced filters
    if (filters.length > 0) {
      result = result.filter(feedback => {
        return filters.every(filter => {
          const value = (feedback as any)[filter.key];
          
          switch (filter.operator) {
            case 'is':
              return Array.isArray(filter.values) 
                ? filter.values.includes(value)
                : value === filter.values;
            
            case 'is_not':
              return Array.isArray(filter.values)
                ? !filter.values.includes(value)
                : value !== filter.values;
            
            case 'contains':
              return typeof value === 'string' && 
                     typeof filter.values === 'string' &&
                     value.toLowerCase().includes(filter.values.toLowerCase());
            
            case 'does_not_contain':
              return typeof value === 'string' && 
                     typeof filter.values === 'string' &&
                     !value.toLowerCase().includes(filter.values.toLowerCase());
            
            case 'between':
              if (Array.isArray(filter.values) && filter.values.length === 2) {
                const date = new Date(value);
                const startDate = new Date(filter.values[0]);
                const endDate = new Date(filter.values[1]);
                return date >= startDate && date <= endDate;
              }
              return false;
            
            case 'since':
              if (typeof filter.values === 'string') {
                const date = new Date(value);
                const sinceDate = new Date(filter.values);
                return date >= sinceDate;
              }
              return false;
            
            case 'before':
              if (typeof filter.values === 'string') {
                const date = new Date(value);
                const beforeDate = new Date(filter.values);
                return date <= beforeDate;
              }
              return false;
            
            default:
              return true;
          }
        });
      });
    }
    
    return result;
  }, [feedbacks, searchQuery, filters]);

  const columns: ColumnOption[] = [
    { id: 'source', accessor: 'source', Header: 'Source', width: '60px' },
    { id: 'title', accessor: 'title', Header: 'Title', width: '40%' },
    { id: 'state', accessor: 'state', Header: 'Status', width: '120px' },
    { id: 'priority', accessor: 'priority', Header: 'Priority', width: '100px' },
    { id: 'customer', accessor: 'customerName', Header: 'Customer', width: '150px' },
    { id: 'upvotes', accessor: 'upvoteCount', Header: 'Upvotes', width: '80px' },
    { id: 'createdAt', accessor: 'createdAt', Header: 'Created', width: '100px' },
  ];

  const handleBulkDelete = () => {
    if (onDeleteFeedback && selectedRows.length > 0) {
      onDeleteFeedback(selectedRows.map(row => row.id));
      setSelectedRows([]);
    }
  };

  if (loading) {
    return (
      <TableContainer>
        <EmptyState direction="column">
          <EmptyTitle>Loading feedback...</EmptyTitle>
        </EmptyState>
      </TableContainer>
    );
  }

  return (
    <>
      <TableContainer>
        {/* Header with search and actions */}
        <TableHeader justify="space-between" align="center">
          <SearchContainer>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </SearchContainer>
          
          <FlexContainer gap={8}>
            <FilterContainer
              filters={filters}
              onFiltersChange={onFiltersChange}
            >
              <Button 
                variant={filters.length > 0 ? "primary" : "secondary"} 
                size="sm"
              >
                <Filter size={16} />
                Filters {filters.length > 0 && `(${filters.length})`}
              </Button>
            </FilterContainer>
            {onCreateFeedback && (
              <Button variant="primary" size="sm" onClick={onCreateFeedback}>
                <Plus size={16} />
                New Feedback
              </Button>
            )}
          </FlexContainer>
        </TableHeader>

        {/* Active Filters */}
        {filters.length > 0 && (
          <FlexContainer 
            gap={8} 
            padding="12px 20px"
            style={{ borderBottom: `1px solid ${Colors.grey200}` }}
          >
            {filters.map((filter, index) => (
              <Tag
                key={`${filter.key}-${index}`}
                type={TagType.badge}
                variant={TagVariant.sm}
                colorFamily={ColorFamily.primary}
                label={`${filter.key}: ${filter.operator} ${Array.isArray(filter.values) ? filter.values.join(', ') : filter.values}`}
                onClick={() => {
                  const newFilters = filters.filter((_, i) => i !== index);
                  onFiltersChange?.(newFilters);
                }}
              />
            ))}
            {filters.length > 1 && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => onFiltersChange?.([])}
              >
                <X size={14} />
                Clear All
              </Button>
            )}
          </FlexContainer>
        )}

        {/* Table */}
        {filteredFeedbacks.length === 0 ? (
          <EmptyState direction="column">
            {searchQuery ? (
              <>
                <EmptyTitle>No feedback found</EmptyTitle>
                <EmptyDescription>
                  No feedback matches your search criteria. Try adjusting your search terms.
                </EmptyDescription>
              </>
            ) : (
              <>
                <EmptyTitle>No feedback yet</EmptyTitle>
                <EmptyDescription>
                  Get started by creating your first feedback item.
                </EmptyDescription>
                {onCreateFeedback && (
                  <Button variant="primary" onClick={onCreateFeedback}>
                    <Plus size={16} />
                    Create First Feedback
                  </Button>
                )}
              </>
            )}
          </EmptyState>
        ) : (
          <div style={{ height: 'calc(100% - 73px)' }}>
            <Table
              columns={columns}
              data={filteredFeedbacks}
              selectableRows={true}
              selectedRows={selectedRows}
              onRowSelect={setSelectedRows}
              onRowClick={(row) => onEditFeedback?.(row)}
              cell={CellRenderer}
              cellProps={{ onStatusChange: onUpdateStatus }}
              rowHeight={56}
            />
          </div>
        )}
      </TableContainer>

      {/* Bulk actions bar */}
      {selectedRows.length > 0 && (
        <BulkActionsBar align="center">
          <BulkText>{selectedRows.length} item{selectedRows.length > 1 ? 's' : ''} selected</BulkText>
          <FlexContainer gap={8}>
            <Button variant="secondary" size="sm">
              <Archive size={16} />
              Archive
            </Button>
            <Button variant="secondary" size="sm" onClick={handleBulkDelete}>
              <Trash2 size={16} />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedRows([])}>
              Cancel
            </Button>
          </FlexContainer>
        </BulkActionsBar>
      )}
    </>
  );
}

export default ZedaFeedbackTable;