// Select component based on Zeda's patterns
import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../../theme/colors';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /**
   * Label for the select
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below select
   */
  helperText?: string;
  /**
   * Whether select is required
   */
  required?: boolean;
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Full width
   */
  fullWidth?: boolean;
  /**
   * Custom width
   */
  width?: string | number;
  /**
   * Options for the select
   */
  options: SelectOption[];
  /**
   * Placeholder option
   */
  placeholder?: string;
}

const SelectContainer = styled.div<{ fullWidth?: boolean; width?: string | number }>`
  display: flex;
  flex-direction: column;
  position: relative;
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  ${({ width }) => width && `width: ${typeof width === 'number' ? `${width}px` : width};`}
`;

const Label = styled.label<{ required?: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${Colors.grey700};
  margin-bottom: 6px;
  display: block;
  
  ${({ required }) => 
    required && 
    `&::after {
      content: ' *';
      color: ${Colors.error500};
    }`
  }
`;

const SelectWrapper = styled.div`
  position: relative;
`;

const StyledSelect = styled.select<{ 
  hasError?: boolean; 
  $size?: 'sm' | 'md' | 'lg';
}>`
  width: 100%;
  border: 1px solid ${({ hasError }) => hasError ? Colors.error300 : Colors.grey300};
  border-radius: 6px;
  font-size: 14px;
  color: ${Colors.grey900};
  background-color: ${Colors.white};
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  appearance: none;
  padding-right: 40px;
  
  ${({ $size = 'md' }) => {
    switch ($size) {
      case 'sm':
        return 'padding: 8px 12px; height: 36px;';
      case 'lg':
        return 'padding: 12px 16px; height: 48px;';
      case 'md':
      default:
        return 'padding: 10px 14px; height: 42px;';
    }
  }}
  
  &:focus {
    outline: none;
    border-color: ${({ hasError }) => hasError ? Colors.error500 : Colors.primary500};
    box-shadow: 0 0 0 3px ${({ hasError }) => hasError ? Colors.error100 : Colors.primary100};
  }
  
  &:disabled {
    background-color: ${Colors.grey50};
    color: ${Colors.grey400};
    cursor: not-allowed;
    border-color: ${Colors.grey200};
  }
  
  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ hasError }) => hasError ? Colors.error400 : Colors.grey400};
  }
  
  option {
    color: ${Colors.grey900};
    background-color: ${Colors.white};
    
    &:disabled {
      color: ${Colors.grey400};
    }
  }
`;

const ChevronIcon = styled(ChevronDown)<{ disabled?: boolean }>`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: ${({ disabled }) => disabled ? Colors.grey300 : Colors.grey500};
  pointer-events: none;
`;

const HelperText = styled.div<{ hasError?: boolean }>`
  font-size: 12px;
  color: ${({ hasError }) => hasError ? Colors.error600 : Colors.grey500};
  margin-top: 4px;
  line-height: 1.4;
`;

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  required,
  size = 'md',
  fullWidth,
  width,
  options,
  placeholder,
  className,
  disabled,
  ...selectProps
}) => {
  const hasError = !!error;
  const displayHelperText = error || helperText;

  return (
    <SelectContainer fullWidth={fullWidth} width={width} className={className}>
      {label && (
        <Label required={required}>
          {label}
        </Label>
      )}
      <SelectWrapper>
        <StyledSelect
          hasError={hasError}
          $size={size}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={displayHelperText ? `${selectProps.id}-helper` : undefined}
          {...selectProps}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </StyledSelect>
        <ChevronIcon disabled={disabled} />
      </SelectWrapper>
      {displayHelperText && (
        <HelperText 
          id={`${selectProps.id}-helper`} 
          hasError={hasError}
        >
          {error || helperText}
        </HelperText>
      )}
    </SelectContainer>
  );
};

export default Select;