import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

export interface InputProps {
  value?: string | number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyPress?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  width?: string | number;
  height?: string | number;
  flex?: string;
  style?: React.CSSProperties;
}

const InputWrapper = styled.div<{ 
  hasError?: boolean; 
  disabled?: boolean;
  width?: string | number;
  height?: string | number;
  flex?: string;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  width: ${({ width }) => width ? (typeof width === 'number' ? `${width}px` : width) : '100%'};
  ${({ height }) => height && `height: ${typeof height === 'number' ? `${height}px` : height};`}
  ${({ flex }) => flex && `flex: ${flex};`}
  border: 1px solid ${({ hasError }) => hasError ? Colors.error300 : Colors.grey300};
  border-radius: 8px;
  background-color: ${({ disabled }) => disabled ? Colors.grey50 : Colors.white};
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:focus-within {
    border-color: ${({ hasError }) => hasError ? Colors.error500 : Colors.primary300};
    box-shadow: 0 0 0 4px ${({ hasError }) => hasError ? Colors.error100 : Colors.primary100};
  }

  &:hover:not(:focus-within) {
    border-color: ${({ hasError, disabled }) => 
      disabled ? Colors.grey300 : 
      hasError ? Colors.error400 : Colors.grey400};
  }
`;

const StyledInput = styled.input<{ hasPrefix?: boolean; hasSuffix?: boolean }>`
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  color: ${Colors.grey900};
  flex: 1;
  padding: 12px;
  ${({ hasPrefix }) => hasPrefix && 'padding-left: 0;'}
  ${({ hasSuffix }) => hasSuffix && 'padding-right: 0;'}

  &::placeholder {
    color: ${Colors.grey500};
  }

  &:disabled {
    color: ${Colors.grey500};
    cursor: not-allowed;
  }
`;

const PrefixSuffix = styled.div`
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: ${Colors.grey500};
  font-size: 14px;
`;

const ErrorText = styled.div`
  color: ${Colors.error600};
  font-size: 12px;
  margin-top: 4px;
`;

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  className,
  id,
  name,
  autoFocus,
  onFocus,
  onBlur,
  onKeyPress,
  error,
  prefix,
  suffix,
  width,
  height,
  flex,
  style,
}) => {
  return (
    <div style={style}>
      <InputWrapper
        hasError={!!error}
        disabled={disabled}
        className={className}
        width={width}
        height={height}
        flex={flex}
      >
        {prefix && <PrefixSuffix>{prefix}</PrefixSuffix>}
        <StyledInput
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          disabled={disabled}
          id={id}
          name={name}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyPress={onKeyPress}
          hasPrefix={!!prefix}
          hasSuffix={!!suffix}
        />
        {suffix && <PrefixSuffix>{suffix}</PrefixSuffix>}
      </InputWrapper>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
};

export default Input;