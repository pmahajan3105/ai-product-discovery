/**
 * Theme Switcher Component
 * Allows users to switch between light, dark, and system themes
 */

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { useTheme, ThemeMode } from '../../theme/ThemeProvider';
import { Monitor, Moon, Sun, Check, ChevronDown } from 'lucide-react';

const SwitcherContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SwitcherButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-surface-secondary);
    border-color: var(--color-border-secondary);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-border-focus);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: var(--color-surface-primary);
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-4px)'};
  transition: all 0.2s ease;
`;

const MenuItem = styled.button<{ isActive?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background: var(--color-surface-secondary);
  }

  &:first-of-type {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  &:last-of-type {
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }

  .menu-item-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .check-icon {
    opacity: ${props => props.isActive ? 1 : 0};
    width: 16px;
    height: 16px;
    color: var(--color-interactive-primary);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid var(--color-border-primary);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-surface-secondary);
    border-color: var(--color-border-secondary);
    color: var(--color-text-primary);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-border-focus);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

interface ThemeSwitcherProps {
  variant?: 'dropdown' | 'toggle' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function ThemeSwitcher({ 
  variant = 'dropdown', 
  showLabel = true,
  className 
}: ThemeSwitcherProps) {
  const { mode, actualMode, setMode, toggleMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions: Array<{
    mode: ThemeMode;
    label: string;
    icon: React.ComponentType<any>;
    description: string;
  }> = [
    {
      mode: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light mode'
    },
    {
      mode: 'dark', 
      label: 'Dark',
      icon: Moon,
      description: 'Dark mode'
    },
    {
      mode: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference'
    }
  ];

  const currentOption = themeOptions.find(option => option.mode === mode) || themeOptions[2];
  const CurrentIcon = currentOption.icon;

  // Icon-only toggle variant
  if (variant === 'icon') {
    const IconComponent = actualMode === 'light' ? Sun : Moon;
    return (
      <IconButton 
        onClick={toggleMode}
        className={className}
        title={`Switch to ${actualMode === 'light' ? 'dark' : 'light'} mode`}
      >
        <IconComponent />
      </IconButton>
    );
  }

  // Simple toggle variant (switches between light/dark)
  if (variant === 'toggle') {
    const IconComponent = actualMode === 'light' ? Sun : Moon;
    return (
      <SwitcherButton 
        onClick={toggleMode}
        className={className}
      >
        <IconComponent />
        {showLabel && (actualMode === 'light' ? 'Light' : 'Dark')}
      </SwitcherButton>
    );
  }

  // Full dropdown variant
  return (
    <SwitcherContainer className={className}>
      <SwitcherButton 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <CurrentIcon />
        {showLabel && currentOption.label}
        <ChevronDown style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }} />
      </SwitcherButton>

      <DropdownMenu isOpen={isOpen} role="menu">
        {themeOptions.map((option) => {
          const OptionIcon = option.icon;
          const isActive = option.mode === mode;
          
          return (
            <MenuItem
              key={option.mode}
              isActive={isActive}
              onClick={() => {
                setMode(option.mode);
                setIsOpen(false);
              }}
              role="menuitem"
              title={option.description}
            >
              <div className="menu-item-content">
                <OptionIcon />
                {option.label}
              </div>
              <Check className="check-icon" />
            </MenuItem>
          );
        })}
      </DropdownMenu>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 'var(--z-docked)',
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </SwitcherContainer>
  );
}

export default ThemeSwitcher;