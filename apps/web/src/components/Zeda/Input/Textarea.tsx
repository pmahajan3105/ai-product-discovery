// Textarea component based on Zeda's Input patterns
import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../../theme/colors';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Label for the textarea
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Helper text to display below textarea
   */
  helperText?: string;
  /**
   * Whether textarea is required
   */
  required?: boolean;
  /**
   * Full width
   */
  fullWidth?: boolean;
  /**
   * Custom width
   */
  width?: string | number;
  /**
   * Minimum height
   */
  minHeight?: number;
  /**
   * Resize behavior
   */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const TextareaContainer = styled.div<{ fullWidth?: boolean; width?: string | number }>`
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

const StyledTextarea = styled.textarea<{ 
  hasError?: boolean;
  minHeight?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}>`
  width: 100%;
  border: 1px solid ${({ hasError }) => hasError ? Colors.error300 : Colors.grey300};
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
  color: ${Colors.grey900};
  background-color: ${Colors.white};
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.15s ease-in-out;
  min-height: ${({ minHeight }) => minHeight ? `${minHeight}px` : '80px'};
  resize: ${({ resize }) => resize || 'vertical'};
  
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

const CharacterCount = styled.div`
  font-size: 12px;
  color: ${Colors.grey400};
  margin-top: 4px;
  text-align: right;
`;

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  required,
  fullWidth,
  width,
  minHeight,
  resize,
  maxLength,
  value,
  className,
  ...textareaProps
}) => {
  const hasError = !!error;
  const displayHelperText = error || helperText;
  const showCharacterCount = maxLength && typeof value === 'string';
  const characterCount = typeof value === 'string' ? value.length : 0;

  return (
    <TextareaContainer fullWidth={fullWidth} width={width} className={className}>
      {label && (
        <Label required={required}>
          {label}
        </Label>
      )}
      <StyledTextarea
        hasError={hasError}
        minHeight={minHeight}
        resize={resize}
        maxLength={maxLength}
        value={value}
        aria-invalid={hasError}
        aria-describedby={displayHelperText ? `${textareaProps.id}-helper` : undefined}
        {...textareaProps}
      />
      {displayHelperText && (
        <HelperText 
          id={`${textareaProps.id}-helper`} 
          hasError={hasError}
        >
          {error || helperText}
        </HelperText>
      )}
      {showCharacterCount && (
        <CharacterCount>
          {characterCount}/{maxLength}
        </CharacterCount>
      )}
    </TextareaContainer>
  );
};

export default Textarea;