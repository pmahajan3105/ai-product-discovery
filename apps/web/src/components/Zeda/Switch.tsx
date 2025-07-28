import React from 'react';
import styled from '@emotion/styled';
import { Colors } from '../../theme/colors';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const switchSizes = {
  sm: { width: 36, height: 20, toggleSize: 16 },
  md: { width: 44, height: 24, toggleSize: 20 },
  lg: { width: 52, height: 28, toggleSize: 24 },
};

const SwitchContainer = styled.div<{ 
  checked: boolean; 
  disabled: boolean;
  size: 'sm' | 'md' | 'lg';
}>`
  position: relative;
  display: inline-block;
  width: ${({ size }) => switchSizes[size].width}px;
  height: ${({ size }) => switchSizes[size].height}px;
  background-color: ${({ checked, disabled }) => 
    disabled ? Colors.grey200 :
    checked ? Colors.primary600 : Colors.grey300};
  border-radius: ${({ size }) => switchSizes[size].height / 2}px;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  transition: background-color 0.2s ease-in-out;

  &:hover:not([disabled]) {
    background-color: ${({ checked }) => 
      checked ? Colors.primary700 : Colors.grey400};
  }

  &:focus-within {
    box-shadow: 0 0 0 4px ${({ checked }) => 
      checked ? Colors.primary100 : Colors.grey100};
  }
`;

const SwitchToggle = styled.div<{ 
  checked: boolean; 
  disabled: boolean;
  size: 'sm' | 'md' | 'lg';
}>`
  position: absolute;
  top: 2px;
  left: ${({ checked, size }) => 
    checked ? switchSizes[size].width - switchSizes[size].toggleSize - 2 : 2}px;
  width: ${({ size }) => switchSizes[size].toggleSize}px;
  height: ${({ size }) => switchSizes[size].toggleSize}px;
  background-color: ${Colors.white};
  border-radius: 50%;
  transition: left 0.2s ease-in-out;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: inherit;
`;

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  className,
  style,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange && !disabled) {
      onChange(event.target.checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onChange && !disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <SwitchContainer
      checked={checked}
      disabled={disabled}
      size={size}
      className={className}
      style={style}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <HiddenInput
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        tabIndex={-1}
      />
      <SwitchToggle
        checked={checked}
        disabled={disabled}
        size={size}
      />
    </SwitchContainer>
  );
};

export default Switch;