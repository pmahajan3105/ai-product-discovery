import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  width?: string | number;
  error?: string;
  style?: React.CSSProperties;
}

const SelectWrapper = styled.div<{ 
  hasError?: boolean; 
  disabled?: boolean;
  width?: string | number;
}>`
  position: relative;
  display: inline-block;
  width: ${({ width }) => width ? (typeof width === 'number' ? `${width}px` : width) : '100%'};
`;

const SelectButton = styled.button<{ 
  hasError?: boolean; 
  disabled?: boolean;
  isOpen?: boolean;
}>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid ${({ hasError }) => hasError ? Colors.error300 : Colors.grey300};
  border-radius: 8px;
  background-color: ${({ disabled }) => disabled ? Colors.grey50 : Colors.white};
  color: ${Colors.grey900};
  font-family: inherit;
  font-size: 14px;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  text-align: left;

  &:focus {
    outline: none;
    border-color: ${({ hasError }) => hasError ? Colors.error500 : Colors.primary300};
    box-shadow: 0 0 0 4px ${({ hasError }) => hasError ? Colors.error100 : Colors.primary100};
  }

  &:hover:not(:disabled) {
    border-color: ${({ hasError }) => hasError ? Colors.error400 : Colors.grey400};
  }

  ${({ isOpen, hasError }) => isOpen && `
    border-color: ${hasError ? Colors.error500 : Colors.primary300};
    box-shadow: 0 0 0 4px ${hasError ? Colors.error100 : Colors.primary100};
  `}
`;

const SelectText = styled.span<{ isPlaceholder?: boolean }>`
  color: ${({ isPlaceholder }) => isPlaceholder ? Colors.grey500 : Colors.grey900};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChevronIcon = styled.span<{ isOpen?: boolean }>`
  margin-left: 8px;
  transform: ${({ isOpen }) => isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease-in-out;
  font-size: 12px;
  color: ${Colors.grey500};
`;

const DropdownMenu = styled.div<{ isOpen?: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: ${Colors.white};
  border: 1px solid ${Colors.grey200};
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 4px;
  display: ${({ isOpen }) => isOpen ? 'block' : 'none'};
`;

const DropdownOption = styled.div<{ isSelected?: boolean; disabled?: boolean }>`
  padding: 12px;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  background-color: ${({ isSelected }) => isSelected ? Colors.primary50 : 'transparent'};
  color: ${({ disabled }) => disabled ? Colors.grey400 : Colors.grey900};
  font-size: 14px;
  border-bottom: 1px solid ${Colors.grey100};

  &:last-child {
    border-bottom: none;
  }

  &:hover:not([disabled]) {
    background-color: ${({ isSelected }) => isSelected ? Colors.primary100 : Colors.grey50};
  }
`;

const ErrorText = styled.div`
  color: ${Colors.error600};
  font-size: 12px;
  margin-top: 4px;
`;

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className,
  width,
  error,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  return (
    <div style={style}>
      <SelectWrapper 
        ref={selectRef} 
        hasError={!!error} 
        disabled={disabled} 
        width={width}
        className={className}
      >
        <SelectButton
          hasError={!!error}
          disabled={disabled}
          isOpen={isOpen}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <SelectText isPlaceholder={!selectedOption}>
            {selectedOption ? selectedOption.label : placeholder}
          </SelectText>
          <ChevronIcon isOpen={isOpen}>▼</ChevronIcon>
        </SelectButton>
        
        <DropdownMenu isOpen={isOpen}>
          {options.map((option) => (
            <DropdownOption
              key={option.value}
              isSelected={option.value === value}
              disabled={option.disabled}
              onClick={() => !option.disabled && handleOptionClick(option.value)}
            >
              {option.label}
            </DropdownOption>
          ))}
        </DropdownMenu>
      </SelectWrapper>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
};

export default Select;