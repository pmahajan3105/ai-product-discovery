// Extracted and simplified from Zeda's Input component
import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../../theme/colors';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Label for the input
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below input
   */
  helperText?: string;
  /**
   * Whether input is required
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
   * Disabled state
   */
  disabled?: boolean;
}

const InputContainer = styled.div<{ fullWidth?: boolean; width?: string | number }>`
  display: flex;
  flex-direction: column;
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

const StyledInput = styled.input<{ 
  hasError?: boolean; 
  $size?: 'sm' | 'md' | 'lg';
}>`
  width: 100%;
  border: 1px solid ${({ hasError }) => hasError ? Colors.error300 : Colors.grey300};
  border-radius: 6px;
  font-size: 14px;
  color: ${Colors.grey900};
  background-color: ${Colors.white};
  transition: all 0.15s ease-in-out;
  
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
  
  &::placeholder {
    color: ${Colors.grey400};
  }
  
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
    
    &::placeholder {
      color: ${Colors.grey300};
    }
  }
  
  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ hasError }) => hasError ? Colors.error400 : Colors.grey400};
  }
`;

const HelperText = styled.div<{ hasError?: boolean }>`
  font-size: 12px;
  color: ${({ hasError }) => hasError ? Colors.error600 : Colors.grey500};
  margin-top: 4px;
  line-height: 1.4;
`;

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  required,
  size = 'md',
  fullWidth,
  width,
  className,
  ...inputProps
}) => {
  const hasError = !!error;
  const displayHelperText = error || helperText;

  return (
    <InputContainer fullWidth={fullWidth} width={width} className={className}>
      {label && (
        <Label required={required}>
          {label}
        </Label>
      )}
      <StyledInput
        hasError={hasError}
        $size={size}
        aria-invalid={hasError}
        aria-describedby={displayHelperText ? `${inputProps.id}-helper` : undefined}
        {...inputProps}
      />
      {displayHelperText && (
        <HelperText 
          id={`${inputProps.id}-helper`} 
          hasError={hasError}
        >
          {error || helperText}
        </HelperText>
      )}
    </InputContainer>
  );
};

export default Input;