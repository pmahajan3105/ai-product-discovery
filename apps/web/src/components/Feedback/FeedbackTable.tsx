import React, { useState, useMemo, useEffect } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';
import { Feedback, FeedbackState, FeedbackPriority } from '@feedback-hub/types';
import FlexContainer from '../Container/FlexContainer';
import Button from '../Button/Button';
import { Plus, Search, Filter, Trash2, Archive } from 'lucide-react';
import { FeedbackRow } from './FeedbackRow';
import BulkOperations from './BulkOperations';
import AdvancedSearch from '../Search/AdvancedSearch';
import FilterContainer, { FilterCondition } from '../Filter/FilterContainer';
import { FeedbackTableSkeleton } from '../Loading/SkeletonLoaders';
import { useFeedbackTableUrlState } from '../../hooks/useUrlState';
import { NoFeedbackEmpty, NoSearchResultsEmpty, NoFilterResultsEmpty, LoadingFailedEmpty } from '../Empty/EmptyStates';
import { ErrorBoundary } from '../Error/ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';
// Badge components imported individually in FeedbackRow

const TableContainer = styled.div`
  background-color: ${Colors.white};
  border-radius: 12px;
  border: 1px solid ${Colors.grey200};
  overflow: hidden;
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: ${Colors.grey50};
  border-bottom: 1px solid ${Colors.grey200};
`;

const TableBody = styled.tbody``;

const HeaderCell = styled.th<{ width?: string }>`
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: ${Colors.grey600};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: ${({ width }) => width || 'auto'};
  white-space: nowrap;
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

interface FeedbackTableProps {
  feedbacks: Feedback[];
  loading?: boolean;
  onCreateFeedback?: () => void;
  onEditFeedback?: (feedback: Feedback) => void;
  onDeleteFeedback?: (feedbackIds: string[]) => void;
  onUpdateStatus?: (feedbackId: string, status: FeedbackState) => void;
  onUpdatePriority?: (feedbackId: string, priority: FeedbackPriority) => void;
  
  // Enhanced functionality
  onBulkStatusUpdate?: (feedbackIds: string[], status: string) => void;
  onBulkAssign?: (feedbackIds: string[], assigneeId: string | null) => void;
  onBulkArchive?: (feedbackIds: string[]) => void;
  onBulkExport?: (feedbackIds: string[], format: 'csv' | 'json' | 'xlsx') => void;
  
  // Saved presets
  savedPresets?: Array<{
    id: string;
    name: string;
    filters: FilterCondition[];
    isDefault: boolean;
    isShared: boolean;
  }>;
  onSavePreset?: (name: string, filters: FilterCondition[], isShared: boolean) => void;
  onLoadPreset?: (preset: { id: string; name: string; filters: FilterCondition[] }) => void;
  
  // Options for bulk operations
  assigneeOptions?: Array<{ value: string; label: string }>;
  statusOptions?: Array<{ value: string; label: string }>;
  
  // URL state management - parent component can provide or let table manage its own
  enableUrlState?: boolean;
  externalUrlState?: {
    search: string;
    status: string[];
    category: string[];
    assignedTo: string[];
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
    page: number;
    limit: number;
    onStateChange: (state: any) => void;
  };
}

export function FeedbackTable({
  feedbacks,
  loading = false,
  onCreateFeedback,
  onEditFeedback,
  onDeleteFeedback,
  onUpdateStatus,
  onUpdatePriority,
  onBulkStatusUpdate,
  onBulkAssign,
  onBulkArchive,
  onBulkExport,
  savedPresets = [],
  onSavePreset,
  onLoadPreset,
  assigneeOptions = [],
  statusOptions = [],
  enableUrlState = true,
  externalUrlState
}: FeedbackTableProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // URL state management - use either external state or internal URL state
  const urlState = useFeedbackTableUrlState();
  const {
    search: searchQuery,
    status: statusFilters,
    category: categoryFilters,
    assignedTo: assignedToFilters,
    sortBy,
    sortOrder,
    page,
    limit,
    updateState
  } = externalUrlState || (enableUrlState ? urlState : {
    search: '',
    status: [],
    category: [],
    assignedTo: [],
    sortBy: 'createdAt',
    sortOrder: 'DESC' as const,
    page: 1,
    limit: 25,
    updateState: () => {}
  });
  
  // Convert URL state filters to FilterCondition format
  const filters: FilterCondition[] = [
    ...statusFilters.map(status => ({ field: 'status', operator: 'equals' as const, value: status })),
    ...categoryFilters.map(category => ({ field: 'category', operator: 'equals' as const, value: category })),
    ...assignedToFilters.map(assignee => ({ field: 'assignedTo', operator: 'equals' as const, value: assignee }))
  ];

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(feedback =>
        feedback.title.toLowerCase().includes(query) ||
        feedback.description.toLowerCase().includes(query) ||
        feedback.customerName?.toLowerCase().includes(query) ||
        feedback.customerEmail?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filters
    if (statusFilters.length > 0) {
      result = result.filter(feedback => statusFilters.includes(feedback.status));
    }
    
    // Apply category filters
    if (categoryFilters.length > 0) {
      result = result.filter(feedback => categoryFilters.includes(feedback.category || ''));
    }
    
    // Apply assignee filters
    if (assignedToFilters.length > 0) {
      result = result.filter(feedback => assignedToFilters.includes(feedback.assignedTo || ''));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortBy as keyof Feedback];
      const bValue = b[sortBy as keyof Feedback];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortOrder === 'ASC' ? comparison : -comparison;
    });
    
    return result;
  }, [feedbacks, searchQuery, statusFilters, categoryFilters, assignedToFilters, sortBy, sortOrder]);

  const handleSelectItem = (feedbackId: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(feedbackId);
    } else {
      newSelected.delete(feedbackId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(filteredFeedbacks.map(f => f.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (onDeleteFeedback && selectedItems.size > 0) {
      onDeleteFeedback(Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const handleBulkArchive = () => {
    if (onBulkArchive && selectedItems.size > 0) {
      onBulkArchive(Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const handleBulkStatusUpdate = (status: string) => {
    if (onBulkStatusUpdate && selectedItems.size > 0) {
      onBulkStatusUpdate(Array.from(selectedItems), status);
      setSelectedItems(new Set());
    }
  };

  const handleBulkAssign = (assigneeId: string | null) => {
    if (onBulkAssign && selectedItems.size > 0) {
      onBulkAssign(Array.from(selectedItems), assigneeId);
      setSelectedItems(new Set());
    }
  };

  const handleBulkExport = (format: 'csv' | 'json' | 'xlsx') => {
    if (onBulkExport && selectedItems.size > 0) {
      onBulkExport(Array.from(selectedItems), format);
    }
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(filteredFeedbacks.map(f => f.id)));
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleSearchChange = (newSearch: string) => {
    if (externalUrlState) {
      externalUrlState.onStateChange({ search: newSearch });
    } else if (enableUrlState) {
      updateState({ search: newSearch, page: 1 }); // Reset to first page on search
    }
  };
  
  const handleFiltersChange = (newFilters: FilterCondition[]) => {
    // Convert FilterCondition[] back to URL state format
    const statusFilter = newFilters.filter(f => f.field === 'status').map(f => f.value);
    const categoryFilter = newFilters.filter(f => f.field === 'category').map(f => f.value);
    const assignedToFilter = newFilters.filter(f => f.field === 'assignedTo').map(f => f.value);
    
    if (externalUrlState) {
      externalUrlState.onStateChange({
        status: statusFilter,
        category: categoryFilter,
        assignedTo: assignedToFilter
      });
    } else if (enableUrlState) {
      updateState({
        status: statusFilter,
        category: categoryFilter,
        assignedTo: assignedToFilter,
        page: 1 // Reset to first page on filter change
      });
    }
  };
  
  const handleSortChange = (newSortBy: string, newSortOrder: 'ASC' | 'DESC') => {
    if (externalUrlState) {
      externalUrlState.onStateChange({
        sortBy: newSortBy,
        sortOrder: newSortOrder
      });
    } else if (enableUrlState) {
      updateState({
        sortBy: newSortBy,
        sortOrder: newSortOrder
      });
    }
  };
  
  const handlePageChange = (newPage: number) => {
    if (externalUrlState) {
      externalUrlState.onStateChange({ page: newPage });
    } else if (enableUrlState) {
      updateState({ page: newPage });
    }
  };
  
  const handleSearch = () => {
    console.log('Search triggered with query:', searchQuery, 'and filters:', filters);
  };

  const isAllSelected = filteredFeedbacks.length > 0 && selectedItems.size === filteredFeedbacks.length;
  const isPartiallySelected = selectedItems.size > 0 && selectedItems.size < filteredFeedbacks.length;

  if (loading) {
    return (
      <>
        <AdvancedSearch
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
        />
        <FeedbackTableSkeleton />
      </>
    );
  }

  return (
    <ErrorBoundary level="section" isolate>
      {/* Advanced Search Component */}
      <AdvancedSearch
        searchValue={searchQuery}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        savedPresets={savedPresets}
        onSavePreset={onSavePreset}
        onLoadPreset={onLoadPreset}
      />

      <TableContainer>
        {/* Header with actions */}
        <TableHeader justify="space-between" align="center">
          <div style={{ fontSize: '16px', fontWeight: '600', color: Colors.grey800 }}>
            Feedback ({filteredFeedbacks.length})
          </div>
          
          <FlexContainer gap={8}>
            {onCreateFeedback && (
              <Button variant="primary" size="sm" onClick={onCreateFeedback}>
                <Plus size={16} />
                New Feedback
              </Button>
            )}
          </FlexContainer>
        </TableHeader>

        {/* Table */}
        {filteredFeedbacks.length === 0 ? (
          <div>
            {searchQuery ? (
              <NoSearchResultsEmpty 
                searchQuery={searchQuery} 
                onClearSearch={() => handleSearchChange('')}
              />
            ) : statusFilters.length > 0 || categoryFilters.length > 0 || assignedToFilters.length > 0 ? (
              <NoFilterResultsEmpty 
                onClearFilters={() => updateState({
                  status: [],
                  category: [],
                  assignedTo: []
                })}
              />
            ) : (
              <NoFeedbackEmpty 
                onCreateFeedback={onCreateFeedback}
                onImportData={() => console.log('Import data')}
              />
            )}
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <HeaderCell width="40px">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isPartiallySelected;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </HeaderCell>
                <HeaderCell width="60px">Source</HeaderCell>
                <HeaderCell>Title</HeaderCell>
                <HeaderCell width="120px">Status</HeaderCell>
                <HeaderCell width="100px">Priority</HeaderCell>
                <HeaderCell width="150px">Customer</HeaderCell>
                <HeaderCell width="100px">Upvotes</HeaderCell>
                <HeaderCell width="120px">Created</HeaderCell>
                <HeaderCell width="60px">Actions</HeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {filteredFeedbacks.map((feedback) => (
                <FeedbackRow
                  key={feedback.id}
                  feedback={feedback}
                  selected={selectedItems.has(feedback.id)}
                  onSelect={(selected) => handleSelectItem(feedback.id, selected)}
                  onEdit={() => onEditFeedback?.(feedback)}
                  onUpdateStatus={(status) => onUpdateStatus?.(feedback.id, status)}
                  onUpdatePriority={(priority) => onUpdatePriority?.(feedback.id, priority)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Bulk Operations Component */}
      <BulkOperations
        selectedItems={Array.from(selectedItems)}
        totalItems={filteredFeedbacks.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkAssign={handleBulkAssign}
        onBulkArchive={handleBulkArchive}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleBulkExport}
        assigneeOptions={assigneeOptions}
        statusOptions={statusOptions}
        isLoading={loading}
      />
    </ErrorBoundary>
  );
}