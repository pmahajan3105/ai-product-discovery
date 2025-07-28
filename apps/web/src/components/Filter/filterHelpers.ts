// Simplified filter helpers for FeedbackHub
// Extracted and simplified from Zeda's FilterContainer helper

export interface FilterCondition {
  key: string;
  operator: string;
  values: string | string[] | Date[] | null;
}

export interface FilterField {
  name: string;
  key: string;
  type: FilterFieldType;
}

export enum FilterFieldType {
  Text = 'text',
  Select = 'select',
  MultiSelect = 'multi_select',
  Date = 'date',
  DateRange = 'date_range',
}

export enum FilterOperator {
  IS = 'is',
  IS_NOT = 'is_not',
  CONTAINS = 'contains',
  DOES_NOT_CONTAIN = 'does_not_contain',
  BETWEEN = 'between',
  SINCE = 'since',
  BEFORE = 'before',
}

export const FilterOperatorLabels = {
  [FilterOperator.IS]: 'is',
  [FilterOperator.IS_NOT]: 'is not',
  [FilterOperator.CONTAINS]: 'contains',
  [FilterOperator.DOES_NOT_CONTAIN]: 'does not contain',
  [FilterOperator.BETWEEN]: 'between',
  [FilterOperator.SINCE]: 'since',
  [FilterOperator.BEFORE]: 'before',
} as const;

// Field-specific operators
export const TextOperators = [
  FilterOperator.CONTAINS,
  FilterOperator.DOES_NOT_CONTAIN,
];

export const SelectOperators = [
  FilterOperator.IS,
  FilterOperator.IS_NOT,
];

export const DateOperators = [
  FilterOperator.BETWEEN,
  FilterOperator.SINCE,
  FilterOperator.BEFORE,
];

// Get available operators for a field type
export const getOperatorsForFieldType = (fieldType: FilterFieldType) => {
  switch (fieldType) {
    case FilterFieldType.Text:
      return TextOperators;
    case FilterFieldType.Select:
    case FilterFieldType.MultiSelect:
      return SelectOperators;
    case FilterFieldType.Date:
    case FilterFieldType.DateRange:
      return DateOperators;
    default:
      return SelectOperators;
  }
};

// Convert operators to select options
export const getOperatorOptions = (fieldType: FilterFieldType) => {
  const operators = getOperatorsForFieldType(fieldType);
  return operators.map((operator) => ({
    value: operator,
    label: FilterOperatorLabels[operator],
  }));
};

// Default feedback-specific filter fields
export const getFeedbackFilterFields = (): FilterField[] => [
  {
    name: 'Status',
    key: 'status',
    type: FilterFieldType.Select,
  },
  {
    name: 'Source',
    key: 'source',
    type: FilterFieldType.Select,
  },
  {
    name: 'Priority',
    key: 'priority',
    type: FilterFieldType.Select,
  },
  {
    name: 'Assignee',
    key: 'assignee',
    type: FilterFieldType.Select,
  },
  {
    name: 'Tags',
    key: 'tags',
    type: FilterFieldType.MultiSelect,
  },
  {
    name: 'Title',
    key: 'title',
    type: FilterFieldType.Text,
  },
  {
    name: 'Content',
    key: 'content',
    type: FilterFieldType.Text,
  },
  {
    name: 'Created Date',
    key: 'createdAt',
    type: FilterFieldType.DateRange,
  },
  {
    name: 'Updated Date',
    key: 'updatedAt',
    type: FilterFieldType.DateRange,
  },
];

// Default field options for feedback-specific fields
export const getFeedbackFieldOptions = (fieldKey: string) => {
  switch (fieldKey) {
    case 'status':
      return [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'closed', label: 'Closed' },
        { value: 'resolved', label: 'Resolved' },
      ];
    case 'source':
      return [
        { value: 'web', label: 'Web App' },
        { value: 'mobile', label: 'Mobile App' },
        { value: 'email', label: 'Email' },
        { value: 'api', label: 'API' },
        { value: 'manual', label: 'Manual Entry' },
      ];
    case 'priority':
      return [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' },
      ];
    default:
      return [];
  }
};

// Validate a filter condition
export const isValidFilter = (filter: FilterCondition): boolean => {
  if (!filter.key || !filter.operator) {
    return false;
  }

  // Check if values exist and are not empty
  if (!filter.values) {
    return false;
  }

  if (Array.isArray(filter.values)) {
    return filter.values.length > 0;
  }

  return !!filter.values;
};

// Get default value for a field type
export const getDefaultValueForFieldType = (fieldType: FilterFieldType) => {
  switch (fieldType) {
    case FilterFieldType.Text:
      return '';
    case FilterFieldType.Select:
      return '';
    case FilterFieldType.MultiSelect:
      return [];
    case FilterFieldType.Date:
    case FilterFieldType.DateRange:
      return null;
    default:
      return '';
  }
};

// Create a new empty filter
export const createEmptyFilter = (): FilterCondition => ({
  key: '',
  operator: '',
  values: null,
});

// Get filter count
export const getFilterCount = (filters: FilterCondition[]): number => {
  return filters.filter(isValidFilter).length;
};

// Convert filters to a simple query object for API calls
export const filtersToQuery = (filters: FilterCondition[]) => {
  const validFilters = filters.filter(isValidFilter);
  return validFilters.reduce((query, filter) => {
    const { key, operator, values } = filter;
    
    // Convert values to string format for API
    let queryValue: string;
    if (Array.isArray(values)) {
      queryValue = values.join(',');
    } else {
      queryValue = String(values);
    }

    return {
      ...query,
      [`${key}_${operator}`]: queryValue,
    };
  }, {});
};

// Quick filter presets for common feedback scenarios
export interface QuickFilter {
  label: string;
  filters: FilterCondition[];
}

export const getQuickFilters = (): QuickFilter[] => [
  {
    label: 'Open Issues',
    filters: [
      {
        key: 'status',
        operator: FilterOperator.IS,
        values: ['open'],
      },
    ],
  },
  {
    label: 'High Priority',
    filters: [
      {
        key: 'priority',
        operator: FilterOperator.IS,
        values: ['high', 'urgent'],
      },
    ],
  },
  {
    label: 'Recent Feedback',
    filters: [
      {
        key: 'createdAt',
        operator: FilterOperator.SINCE,
        values: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]], // Last 7 days
      },
    ],
  },
  {
    label: 'Web App Issues',
    filters: [
      {
        key: 'source',
        operator: FilterOperator.IS,
        values: ['web'],
      },
    ],
  },
];