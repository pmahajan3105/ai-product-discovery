// Simplified ValueComponent for FeedbackHub filters
// Based on Zeda's ValueComponent but simplified for feedback-specific needs

import React from 'react';
import styled from '@emotion/styled';
import Input from '../Zeda/Input/Input';
import Select from '../Zeda/Select/Select';
import { Colors } from '../../theme/colors';
import { 
  FilterFieldType, 
  FilterOperator,
  getFeedbackFieldOptions 
} from './filterHelpers';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ValueComponentProps {
  fieldType: FilterFieldType;
  fieldKey: string;
  fieldName: string;
  operator: FilterOperator;
  value: string | string[] | Date[] | null;
  options?: SelectOption[];
  onChange: (value: string | string[] | Date[] | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Container = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DateInput = styled(Input)`
  min-width: 140px;
`;

const TextInput = styled(Input)`
  min-width: 200px;
`;

const StyledSelect = styled(Select)`
  min-width: 160px;
`;

const MultiSelectContainer = styled.div`
  min-width: 200px;
`;

const MultiSelectChip = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: ${Colors.primary100};
  color: ${Colors.primary700};
  border-radius: 4px;
  padding: 4px 8px;
  margin: 2px;
  font-size: 12px;
  gap: 4px;
`;

const ChipRemove = styled.button`
  background: none;
  border: none;
  color: ${Colors.primary600};
  cursor: pointer;
  padding: 0;
  font-size: 14px;
  line-height: 1;
  
  &:hover {
    color: ${Colors.primary800};
  }
`;

const MultiSelectInput = styled.div`
  min-height: 42px;
  border: 1px solid ${Colors.grey300};
  border-radius: 6px;
  padding: 6px 12px;
  background-color: ${Colors.white};
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  
  &:hover {
    border-color: ${Colors.grey400};
  }
  
  &:focus-within {
    border-color: ${Colors.primary500};
    box-shadow: 0 0 0 3px ${Colors.primary100};
  }
`;

const MultiSelectOptions = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: ${Colors.white};
  border: 1px solid ${Colors.grey300};
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  display: ${({ isOpen }) => (isOpen ? 'block' : 'none')};
`;

const MultiSelectOption = styled.div<{ isSelected: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  background-color: ${({ isSelected }) => (isSelected ? Colors.primary50 : Colors.white)};
  color: ${({ isSelected }) => (isSelected ? Colors.primary700 : Colors.grey900)};
  
  &:hover {
    background-color: ${Colors.grey50};
  }
`;

const ValueComponent: React.FC<ValueComponentProps> = ({
  fieldType,
  fieldKey,
  fieldName,
  operator,
  value,
  options,
  onChange,
  disabled = false,
  placeholder,
}) => {
  const [isMultiSelectOpen, setIsMultiSelectOpen] = React.useState(false);

  // Get field options (use provided options or default feedback options)
  const fieldOptions = options || getFeedbackFieldOptions(fieldKey);

  // Handle different field types
  const renderValueInput = () => {
    switch (fieldType) {
      case FilterFieldType.Text:
        return (
          <TextInput
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${fieldName.toLowerCase()}`}
            disabled={disabled}
            size="sm"
          />
        );

      case FilterFieldType.Select:
        return (
          <StyledSelect
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            options={fieldOptions}
            placeholder={placeholder || `Select ${fieldName.toLowerCase()}`}
            disabled={disabled}
            size="sm"
          />
        );

      case FilterFieldType.MultiSelect:
        return (
          <MultiSelectField
            value={value as string[] || []}
            options={fieldOptions}
            onChange={onChange}
            placeholder={placeholder || `Select ${fieldName.toLowerCase()}`}
            disabled={disabled}
            isOpen={isMultiSelectOpen}
            setIsOpen={setIsMultiSelectOpen}
          />
        );

      case FilterFieldType.Date:
        return (
          <DateInput
            type="date"
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            size="sm"
          />
        );

      case FilterFieldType.DateRange: {
        // For date range, we expect an array of two dates
        const dateValues = (value as string[]) || ['', ''];
        
        if (operator === FilterOperator.BETWEEN) {
          return (
            <Container>
              <DateInput
                type="date"
                value={dateValues[0] || ''}
                onChange={(e) => {
                  const newValues = [e.target.value, dateValues[1] || ''];
                  onChange(newValues);
                }}
                disabled={disabled}
                size="sm"
                placeholder="Start date"
              />
              <span style={{ color: Colors.grey500 }}>to</span>
              <DateInput
                type="date"
                value={dateValues[1] || ''}
                onChange={(e) => {
                  const newValues = [dateValues[0] || '', e.target.value];
                  onChange(newValues);
                }}
                disabled={disabled}
                size="sm"
                placeholder="End date"
              />
            </Container>
          );
        } else {
          // For SINCE or BEFORE, just show one date input
          return (
            <DateInput
              type="date"
              value={dateValues[0] || ''}
              onChange={(e) => onChange([e.target.value])}
              disabled={disabled}
              size="sm"
            />
          );
        }
      }

      default:
        return (
          <TextInput
            value={value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Enter ${fieldName.toLowerCase()}`}
            disabled={disabled}
            size="sm"
          />
        );
    }
  };

  return <div>{renderValueInput()}</div>;
};

// Multi-select field component
interface MultiSelectFieldProps {
  value: string[];
  options: SelectOption[];
  onChange: (value: string[] | null) => void;
  placeholder: string;
  disabled: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  isOpen,
  setIsOpen,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const handleOptionClick = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    
    onChange(newValue.length > 0 ? newValue : null);
  };

  const handleChipRemove = (valueToRemove: string) => {
    const newValue = value.filter(v => v !== valueToRemove);
    onChange(newValue.length > 0 ? newValue : null);
  };

  return (
    <MultiSelectContainer ref={containerRef} style={{ position: 'relative' }}>
      <MultiSelectInput
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ opacity: disabled ? 0.6 : 1 }}
      >
        {value.length === 0 ? (
          <span style={{ color: Colors.grey400 }}>{placeholder}</span>
        ) : (
          value.map((val) => {
            const option = options.find(opt => opt.value === val);
            return (
              <MultiSelectChip key={val}>
                {option?.label || val}
                <ChipRemove
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChipRemove(val);
                  }}
                >
                  ×
                </ChipRemove>
              </MultiSelectChip>
            );
          })
        )}
      </MultiSelectInput>
      
      <MultiSelectOptions isOpen={isOpen && !disabled}>
        {options.map((option) => (
          <MultiSelectOption
            key={option.value}
            isSelected={value.includes(option.value)}
            onClick={() => handleOptionClick(option.value)}
          >
            {option.label}
          </MultiSelectOption>
        ))}
      </MultiSelectOptions>
    </MultiSelectContainer>
  );
};

export default ValueComponent;