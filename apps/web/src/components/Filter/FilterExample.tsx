// Example usage of FilterContainer for FeedbackHub
// This file demonstrates how to integrate the filter components

import React, { useState } from 'react';
import FilterContainer, { 
  FilterCondition, 
  filtersToQuery,
  getFilterCount 
} from './FilterContainer';

const FilterExample: React.FC = () => {
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: FilterCondition[]) => {
    setFilters(newFilters);
    
    // Convert to query format for API calls
    const queryParams = filtersToQuery(newFilters);
    console.log('Filter query params:', queryParams);
    
    // Example: Make API call with filters
    // fetchFeedback(queryParams);
  };

  // Custom field options (optional)
  const customFieldOptions = {
    assignee: [
      { value: 'user1', label: 'John Doe' },
      { value: 'user2', label: 'Jane Smith' },
      { value: 'user3', label: 'Bob Johnson' },
    ],
    tags: [
      { value: 'bug', label: 'Bug' },
      { value: 'feature', label: 'Feature Request' },
      { value: 'improvement', label: 'Improvement' },
      { value: 'ui', label: 'UI/UX' },
    ],
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Feedback Filters Example</h2>
      
      {/* Basic Filter Container */}
      <FilterContainer
        filters={filters}
        onFiltersChange={handleFiltersChange}
        fieldOptions={customFieldOptions}
      />

      {/* Display current filters */}
      {getFilterCount(filters) > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Current Filters ({getFilterCount(filters)}):</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {JSON.stringify(filters, null, 2)}
          </pre>
          
          <h3>Query Parameters:</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            {JSON.stringify(filtersToQuery(filters), null, 2)}
          </pre>
        </div>
      )}

      {/* Custom Trigger Example */}
      <div style={{ marginTop: '40px' }}>
        <h3>Custom Trigger Example:</h3>
        <FilterContainer
          filters={filters}
          onFiltersChange={handleFiltersChange}
          fieldOptions={customFieldOptions}
          showQuickFilters={false}
        >
          <button style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Custom Filter Button {getFilterCount(filters) > 0 && `(${getFilterCount(filters)})`}
          </button>
        </FilterContainer>
      </div>
    </div>
  );
};

export default FilterExample;